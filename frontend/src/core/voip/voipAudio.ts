// E:\Boltalka\frontend\src\core\voip\voipAudio.ts

/**
 * Класс для управления звуковыми сигналами VoIP (гудки вызова и рингтон)
 * с использованием Web Audio API. Не требует внешних медиафайлов.
 */
class VoIPAudioService {
  private ringbackCtx: AudioContext | null = null;
  private ringbackInterval: any = null;
  private currentRingbackOsc: OscillatorNode | null = null;

  private ringtoneCtx: AudioContext | null = null;
  private ringtoneInterval: any = null;
  private activeRingtoneTimers: any[] = [];

  /**
   * Запускает проигрывание гудков вызова (ringback tone) у вызывающего абонента.
   * Стандартный европейский сигнал: частота 425 Гц, 1 сек звук, 3 сек тишина.
   */
  public startRingback() {
    if (this.ringbackInterval) return;

    console.log("[VoIPAudio] Запуск гудков вызова...");
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ringbackCtx = new AudioContextClass();
    } catch (e) {
      console.error("[VoIPAudio] Ошибка инициализации AudioContext для гудков:", e);
      return;
    }

    const playTone = () => {
      if (!this.ringbackCtx || !this.ringbackInterval) return;
      
      // Разблокировка контекста при необходимости
      if (this.ringbackCtx.state === 'suspended') {
        this.ringbackCtx.resume().catch(() => {});
      }

      try {
        const ctx = this.ringbackCtx;
        if (ctx.state === 'closed') return;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(425, ctx.currentTime);

        // Плавное нарастание и затухание громкости
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.12, ctx.currentTime + 0.95);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        this.currentRingbackOsc = osc;
        osc.start();
        osc.stop(ctx.currentTime + 1.0);
      } catch (err) {
        console.warn("[VoIPAudio] Ошибка воспроизведения гудка:", err);
      }
    };

    // Первый гудок сразу
    playTone();
    // Повторение каждые 4 секунды (1 сек гудок + 3 сек тишина)
    this.ringbackInterval = setInterval(playTone, 4000);
  }

  /**
   * Останавливает гудки вызова.
   */
  public stopRingback() {
    if (this.ringbackInterval) {
      console.log("[VoIPAudio] Остановка гудков вызова.");
      clearInterval(this.ringbackInterval);
      this.ringbackInterval = null;
    }

    if (this.currentRingbackOsc) {
      try {
        this.currentRingbackOsc.stop();
      } catch (e) {}
      this.currentRingbackOsc = null;
    }

    if (this.ringbackCtx) {
      this.ringbackCtx.close().catch(() => {});
      this.ringbackCtx = null;
    }
  }

  /**
   * Запускает проигрывание рингтона (звонка) у вызываемого абонента.
   * Генерирует приятную мелодию на базе мажорного септаккорда C-Major 7th.
   */
  public startRingtone() {
    if (this.ringtoneInterval) return;

    console.log("[VoIPAudio] Запуск рингтона входящего вызова...");
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ringtoneCtx = new AudioContextClass();
    } catch (e) {
      console.error("[VoIPAudio] Ошибка инициализации AudioContext для рингтона:", e);
      return;
    }

    // Частоты нот: C5 (523.25), E5 (659.25), G5 (783.99), B5 (987.77)
    const melody = [523.25, 659.25, 783.99, 987.77, 783.99, 659.25];
    const noteDuration = 0.15; // 150мс на ноту

    const playMelodyCycle = () => {
      if (!this.ringtoneCtx || !this.ringtoneInterval) return;

      if (this.ringtoneCtx.state === 'suspended') {
        this.ringtoneCtx.resume().catch(() => {});
      }

      const ctx = this.ringtoneCtx;
      if (ctx.state === 'closed') return;
      
      // Играем последовательность нот
      melody.forEach((freq, index) => {
        const timer = setTimeout(() => {
          if (!this.ringtoneCtx || ctx.state === 'closed' || !this.ringtoneInterval) return;
          
          try {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.type = 'triangle'; // Более мягкий звук, чем sine
            osc.frequency.setValueAtTime(freq, ctx.currentTime);

            // Плавная огибающая звука (Attack-Decay)
            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + noteDuration - 0.02);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + noteDuration);
          } catch (err) {
            // Игнорируем ошибки, если контекст закрылся в процессе
          }
        }, index * noteDuration * 1000);

        this.activeRingtoneTimers.push(timer);
      });
    };

    // Воспроизводим цикл мелодии каждые 3 секунды (мелодия длится ~0.9 сек + пауза)
    playMelodyCycle();
    this.ringtoneInterval = setInterval(playMelodyCycle, 3000);
  }

  /**
   * Останавливает рингтон входящего вызова.
   */
  public stopRingtone() {
    if (this.ringtoneInterval) {
      console.log("[VoIPAudio] Остановка рингтона.");
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }

    this.activeRingtoneTimers.forEach(timer => clearTimeout(timer));
    this.activeRingtoneTimers = [];

    if (this.ringtoneCtx) {
      this.ringtoneCtx.close().catch(() => {});
      this.ringtoneCtx = null;
    }
  }

  /**
   * Принудительно глушит все аудио сигналы вызова.
   */
  public stopAll() {
    this.stopRingback();
    this.stopRingtone();
  }
}

export const voipAudio = new VoIPAudioService();
