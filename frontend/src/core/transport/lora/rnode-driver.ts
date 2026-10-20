// frontend/src/core/transport/lora/rnode-driver.ts
/**
 * Драйвер физического взаимодействия с радиомодемами LoRa (Heltec V3 / LilyGO / RNode).
 * 
 * Поддерживаемые интерфейсы подключения:
 * 1. Web Serial API (Desktop Electron / Chrome PWA) и USB-хост на скорости 115200 baud.
 * 2. BLE Nordic UART Service (UUID 6E400001-B5A3-F393-E0A9-E50E24DCCA9E).
 * 3. Mock / Loopback режим для автономного тестирования без физического оборудования.
 * 
 * Стандарт протокола: KISS-фрейминг RNode и прямой прозрачный поток байт.
 * Соблюдение Zero-Phantom: пинг каждые 30 с; при пропуске 2 heartbeat (60 с) статус активности сбрасывается.
 */

export const NORDIC_UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const NORDIC_UART_RX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Write
export const NORDIC_UART_TX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Notify

export const KISS_FEND = 0xc0;
export const KISS_FESC = 0xdb;
export const KISS_TFEND = 0xdc;
export const KISS_TFESC = 0xdd;
export const KISS_CMD_DATA = 0x00;
export const KISS_CMD_PING = 0x30;
export const KISS_CMD_PONG = 0x31;

export const RNODE_HEARTBEAT_INTERVAL_MS = 30000;
export const RNODE_HEARTBEAT_TIMEOUT_MS = 60000;

export type RNodeInterfaceType = 'serial' | 'ble' | 'mock' | 'none';

export interface RNodeRadioConfig {
  frequencyHz?: number; // e.g. 433000000 или 868000000
  bandwidthHz?: number; // e.g. 125000
  spreadingFactor?: number; // SF7..SF12
  codingRate?: number; // 5..8 (4/5..4/8)
  txPowerDbm?: number; // 2..20 dBm (default 10 dBm)
}

export interface RNodeStatus {
  isConnected: boolean;
  interfaceType: RNodeInterfaceType;
  portName?: string;
  deviceName?: string;
  rssi?: number;
  snr?: number;
  frequency?: number;
  lastHeartbeat: number;
  missedHeartbeats: number;
  error?: string;
}

export class RNodeDriver {
  private interfaceType: RNodeInterfaceType = 'none';
  private isConnected: boolean = false;
  private portName?: string;
  private deviceName?: string;

  private serialPort: any = null;
  private serialReader: any = null;
  private serialWriter: any = null;

  private bleDevice: any = null;
  private bleServer: any = null;
  private bleRxChar: any = null;
  private bleTxChar: any = null;

  private config: RNodeRadioConfig = {
    frequencyHz: 433175000,
    bandwidthHz: 125000,
    spreadingFactor: 9,
    codingRate: 7,
    txPowerDbm: 10, // 10 мВт LPD433
  };

  private lastHeartbeat: number = 0;
  private missedHeartbeats: number = 0;
  private heartbeatTimer: any = null;

  private lastRssi?: number;
  private lastSnr?: number;

  private readonly dataListeners = new Set<(data: Uint8Array) => void>();
  private readonly statusListeners = new Set<(status: RNodeStatus) => void>();
  private readonly errorListeners = new Set<(err: Error) => void>();

  // Внутренний буфер дефрейминга KISS
  private kissRxBuffer: number[] = [];
  private inEscape: boolean = false;

  constructor(initialConfig?: Partial<RNodeRadioConfig>) {
    if (initialConfig) {
      this.config = { ...this.config, ...initialConfig };
    }
  }

  /**
   * Подключение через Web Serial API (или переданный порт)
   */
  public async connectSerial(portOrOptions?: any, baudRate: number = 115200): Promise<boolean> {
    await this.disconnect();

    try {
      if (portOrOptions && typeof portOrOptions.open === 'function') {
        this.serialPort = portOrOptions;
        await this.serialPort.open({ baudRate });
      } else if (typeof navigator !== 'undefined' && (navigator as any).serial) {
        this.serialPort = await (navigator as any).serial.requestPort();
        await this.serialPort.open({ baudRate });
      } else {
        throw new Error('Web Serial API не поддерживается в данной среде');
      }

      this.portName = portOrOptions?.name || 'Serial Port (115200)';
      this.interfaceType = 'serial';
      this.isConnected = true;
      this.lastHeartbeat = Date.now();
      this.missedHeartbeats = 0;

      this.startSerialReadLoop();
      this.startHeartbeatTimer();
      this.notifyStatus();

      return true;
    } catch (err: any) {
      this.handleError(err);
      return false;
    }
  }

  /**
   * Подключение через Web Bluetooth API (Nordic UART Service)
   */
  public async connectBle(deviceOrOptions?: any): Promise<boolean> {
    await this.disconnect();

    try {
      if (deviceOrOptions && typeof deviceOrOptions.gatt?.connect === 'function') {
        this.bleDevice = deviceOrOptions;
      } else if (typeof navigator !== 'undefined' && (navigator as any).bluetooth) {
        this.bleDevice = await (navigator as any).bluetooth.requestDevice({
          filters: [{ services: [NORDIC_UART_SERVICE_UUID] }],
          optionalServices: [NORDIC_UART_SERVICE_UUID],
        });
      } else {
        throw new Error('Web Bluetooth API не поддерживается в данной среде');
      }

      this.bleServer = await this.bleDevice.gatt.connect();
      const service = await this.bleServer.getPrimaryService(NORDIC_UART_SERVICE_UUID);
      this.bleRxChar = await service.getCharacteristic(NORDIC_UART_RX_CHAR_UUID);
      this.bleTxChar = await service.getCharacteristic(NORDIC_UART_TX_CHAR_UUID);

      await this.bleTxChar.startNotifications();
      this.bleTxChar.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value;
        const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        this.handleRawIncomingBytes(bytes);
      });

      this.deviceName = this.bleDevice.name || 'RNode BLE';
      this.interfaceType = 'ble';
      this.isConnected = true;
      this.lastHeartbeat = Date.now();
      this.missedHeartbeats = 0;

      this.startHeartbeatTimer();
      this.notifyStatus();

      return true;
    } catch (err: any) {
      this.handleError(err);
      return false;
    }
  }

  /**
   * Подключение в режиме эмулятора / Mock
   */
  public async connectMock(mockName = 'Virtual Heltec V3'): Promise<boolean> {
    await this.disconnect();

    this.interfaceType = 'mock';
    this.deviceName = mockName;
    this.isConnected = true;
    this.lastHeartbeat = Date.now();
    this.missedHeartbeats = 0;

    this.startHeartbeatTimer();
    this.notifyStatus();

    return true;
  }

  /**
   * Отключение от радиомодема и сброс состояния
   */
  public async disconnect(): Promise<void> {
    this.stopHeartbeatTimer();

    if (this.serialReader) {
      try {
        await this.serialReader.cancel();
        this.serialReader.releaseLock();
      } catch {}
      this.serialReader = null;
    }

    if (this.serialWriter) {
      try {
        this.serialWriter.releaseLock();
      } catch {}
      this.serialWriter = null;
    }

    if (this.serialPort) {
      try {
        await this.serialPort.close();
      } catch {}
      this.serialPort = null;
    }

    if (this.bleDevice && this.bleDevice.gatt?.connected) {
      try {
        this.bleDevice.gatt.disconnect();
      } catch {}
      this.bleDevice = null;
      this.bleServer = null;
    }

    this.isConnected = false;
    this.interfaceType = 'none';
    this.kissRxBuffer = [];
    this.inEscape = false;

    this.notifyStatus();
  }

  /**
   * Отправка фрейма полезной нагрузки в радиоэфир (с KISS-инкапсуляцией)
   */
  public async sendFrame(payload: Uint8Array): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    const kissFrame = this.encodeKissFrame(KISS_CMD_DATA, payload);

    try {
      if (this.interfaceType === 'serial' && this.serialPort) {
        if (!this.serialWriter) {
          this.serialWriter = this.serialPort.writable.getWriter();
        }
        await this.serialWriter.write(kissFrame);
        this.serialWriter.releaseLock();
        this.serialWriter = null;
        return true;
      } else if (this.interfaceType === 'ble' && this.bleRxChar) {
        await this.bleRxChar.writeValue(kissFrame);
        return true;
      } else if (this.interfaceType === 'mock') {
        // В mock режиме успешно отправлено
        return true;
      }
      return false;
    } catch (err: any) {
      this.handleError(err);
      return false;
    }
  }

  /**
   * Отправка пинг-запроса RNode для проверки линка (Heartbeat)
   */
  public async ping(): Promise<boolean> {
    if (!this.isConnected) return false;

    const pingFrame = this.encodeKissFrame(KISS_CMD_PING, new Uint8Array([0x01]));
    try {
      if (this.interfaceType === 'mock') {
        this.handleHeartbeatResponse();
        return true;
      }
      if (this.interfaceType === 'serial' && this.serialPort) {
        const writer = this.serialPort.writable.getWriter();
        await writer.write(pingFrame);
        writer.releaseLock();
        return true;
      }
      if (this.interfaceType === 'ble' && this.bleRxChar) {
        await this.bleRxChar.writeValue(pingFrame);
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  }

  /**
   * Установка радиоконфигурации (частота, мощность, SF)
   */
  public setRadioConfig(newConfig: Partial<RNodeRadioConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getRadioConfig(): RNodeRadioConfig {
    return { ...this.config };
  }

  public getStatus(): RNodeStatus {
    return {
      isConnected: this.isConnected,
      interfaceType: this.interfaceType,
      portName: this.portName,
      deviceName: this.deviceName,
      rssi: this.lastRssi,
      snr: this.lastSnr,
      frequency: this.config.frequencyHz,
      lastHeartbeat: this.lastHeartbeat,
      missedHeartbeats: this.missedHeartbeats,
    };
  }

  public onData(handler: (data: Uint8Array) => void): () => void {
    this.dataListeners.add(handler);
    return () => this.dataListeners.delete(handler);
  }

  public onStatusChange(handler: (status: RNodeStatus) => void): () => void {
    this.statusListeners.add(handler);
    return () => this.statusListeners.delete(handler);
  }

  public onStatus(handler: (status: RNodeStatus) => void): () => void {
    return this.onStatusChange(handler);
  }

  public async sendPing(): Promise<boolean> {
    return this.ping();
  }

  public onError(handler: (err: Error) => void): () => void {
    this.errorListeners.add(handler);
    return () => this.errorListeners.delete(handler);
  }

  /**
   * Прямой проброс входящих байт (для тестов или внешних эмуляторов)
   */
  public injectIncomingBytes(bytes: Uint8Array): void {
    this.handleRawIncomingBytes(bytes);
  }

  /**
   * Прямой проброс декодированного фрейма (для тестов)
   */
  public injectDecodedFrame(payload: Uint8Array): void {
    this.lastHeartbeat = Date.now();
    this.missedHeartbeats = 0;
    this.dataListeners.forEach((h) => h(payload));
  }

  // ---------------------------------------------------------------------------
  // Внутренняя обработка KISS фрейминга
  // ---------------------------------------------------------------------------

  private encodeKissFrame(command: number, data: Uint8Array): Uint8Array {
    const output: number[] = [KISS_FEND, command];

    for (let i = 0; i < data.length; i++) {
      const b = data[i];
      if (b === KISS_FEND) {
        output.push(KISS_FESC, KISS_TFEND);
      } else if (b === KISS_FESC) {
        output.push(KISS_FESC, KISS_TFESC);
      } else {
        output.push(b);
      }
    }

    output.push(KISS_FEND);
    return new Uint8Array(output);
  }

  private handleRawIncomingBytes(bytes: Uint8Array): void {
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];

      if (byte === KISS_FEND) {
        if (this.kissRxBuffer.length > 0) {
          this.processCompletedKissFrame(new Uint8Array(this.kissRxBuffer));
          this.kissRxBuffer = [];
        }
        this.inEscape = false;
        continue;
      }

      if (this.inEscape) {
        if (byte === KISS_TFEND) {
          this.kissRxBuffer.push(KISS_FEND);
        } else if (byte === KISS_TFESC) {
          this.kissRxBuffer.push(KISS_FESC);
        } else {
          this.kissRxBuffer.push(byte);
        }
        this.inEscape = false;
      } else if (byte === KISS_FESC) {
        this.inEscape = true;
      } else {
        this.kissRxBuffer.push(byte);
      }
    }
  }

  private processCompletedKissFrame(frame: Uint8Array): void {
    if (frame.length === 0) return;

    const command = frame[0] & 0x0f;
    const payload = frame.slice(1);

    this.lastHeartbeat = Date.now();
    this.missedHeartbeats = 0;

    if (command === KISS_CMD_DATA) {
      this.dataListeners.forEach((h) => h(payload));
    } else if (command === KISS_CMD_PONG || command === KISS_CMD_PING) {
      this.handleHeartbeatResponse();
    }
  }

  private handleHeartbeatResponse(): void {
    this.lastHeartbeat = Date.now();
    this.missedHeartbeats = 0;
    this.notifyStatus();
  }

  private async startSerialReadLoop(): Promise<void> {
    while (this.isConnected && this.serialPort?.readable) {
      try {
        this.serialReader = this.serialPort.readable.getReader();
        while (true) {
          const { value, done } = await this.serialReader.read();
          if (done) break;
          if (value) {
            this.handleRawIncomingBytes(value);
          }
        }
      } catch (err: any) {
        if (this.isConnected) {
          this.handleError(err);
        }
        break;
      } finally {
        if (this.serialReader) {
          try {
            this.serialReader.releaseLock();
          } catch {}
          this.serialReader = null;
        }
      }
    }
  }

  private startHeartbeatTimer(): void {
    this.stopHeartbeatTimer();

    this.heartbeatTimer = setInterval(() => {
      if (!this.isConnected) return;

      const elapsed = Date.now() - this.lastHeartbeat;
      if (elapsed > RNODE_HEARTBEAT_TIMEOUT_MS) {
        // Zero-Phantom: пропущено 2 такта по 30 сек (60 сек) -> сброс связи
        this.missedHeartbeats++;
        if (this.missedHeartbeats >= 2) {
          this.isConnected = false;
          this.notifyStatus();
          return;
        }
      }

      this.ping().catch(() => {});
    }, RNODE_HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleError(err: any): void {
    const error = err instanceof Error ? err : new Error(String(err));
    this.errorListeners.forEach((h) => h(error));
    this.notifyStatus(error.message);
  }

  private notifyStatus(errorMessage?: string): void {
    const status = this.getStatus();
    if (errorMessage) {
      status.error = errorMessage;
    }
    this.statusListeners.forEach((h) => h(status));
  }
}
