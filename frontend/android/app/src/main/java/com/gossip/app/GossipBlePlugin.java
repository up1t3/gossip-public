package com.gossip.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattServer;
import android.bluetooth.BluetoothGattServerCallback;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanFilter;
import android.bluetooth.le.ScanRecord;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelUuid;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONObject;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@CapacitorPlugin(
    name = "GossipBle",
    permissions = {
        @Permission(
            strings = {
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_ADVERTISE,
                Manifest.permission.BLUETOOTH_CONNECT
            },
            alias = "bluetooth"
        ),
        @Permission(
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            },
            alias = "location"
        )
    }
)
@android.annotation.SuppressLint("MissingPermission")
public class GossipBlePlugin extends Plugin {
    private static final String TAG = "GossipBlePlugin";

    // UUID Сервиса Gossip BLE Mesh и его характеристик
    public static final UUID GOSSIP_SERVICE_UUID = UUID.fromString("0000fa21-0000-1000-8000-00805f9b34fb");
    public static final UUID CHARACTERISTIC_PEER_INFO = UUID.fromString("0000fa22-0000-1000-8000-00805f9b34fb");
    public static final UUID CHARACTERISTIC_ENVELOPE_RX = UUID.fromString("0000fa23-0000-1000-8000-00805f9b34fb");
    public static final UUID CHARACTERISTIC_ENVELOPE_SYNC = UUID.fromString("0000fa24-0000-1000-8000-00805f9b34fb");

    // Идентификатор производителя Gossip для аппаратных фильтров (Manufacturer ID)
    public static final int GOSSIP_MANUFACTURER_ID = 0x0909;

    // Спецификация Gossip L2 Binary Framing Protocol
    private static final short L2_MAGIC = (short) 0xFA21;
    private static final byte L2_VERSION = 0x01;
    private static final byte L2_TYPE_DATA = 0x01;
    private static final int L2_HEADER_SIZE = 12;
    private static final long REASSEMBLY_TIMEOUT_MS = 5000;
    private static final int MAX_ENVELOPE_SIZE = 60 * 1024; // 60 КБ лимит размера конверта (RFC-2026-004)
    private static final int MAX_REASSEMBLY_SESSIONS = 32; // глобальный лимит одновременных сессий сборки (DoS-защита)
    private static final int MAX_REASSEMBLY_SESSIONS_PER_DEVICE = 4; // лимит сессий сборки на один пир (DoS-защита)

    private final AtomicInteger packetIdGenerator = new AtomicInteger(1);

    public static class ReassemblySession {
        final short packetId;
        final int totalFragments;
        final byte[][] fragments;
        final long createdAt;
        int receivedCount;

        ReassemblySession(short packetId, int totalFragments) {
            this.packetId = packetId;
            this.totalFragments = totalFragments;
            this.fragments = new byte[totalFragments][];
            this.receivedCount = 0;
            this.createdAt = System.currentTimeMillis();
        }

        boolean isComplete() {
            return receivedCount == totalFragments;
        }

        byte[] assemble() {
            int totalLen = 0;
            for (byte[] f : fragments) {
                if (f != null) totalLen += f.length;
            }
            byte[] full = new byte[totalLen];
            int offset = 0;
            for (byte[] f : fragments) {
                if (f != null) {
                    System.arraycopy(f, 0, full, offset, f.length);
                    offset += f.length;
                }
            }
            return full;
        }
    }

    private final ConcurrentHashMap<String, ReassemblySession> reassemblySessions = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<BluetoothGatt, Runnable> activeGatts = new ConcurrentHashMap<>();

    private static short calculateCRC16(byte[] data, int offset, int length) {
        int crc = 0xFFFF;
        for (int i = offset; i < offset + length; i++) {
            crc = ((crc >>> 8) | (crc << 8)) & 0xFFFF;
            crc ^= (data[i] & 0xFF);
            crc ^= ((crc & 0xFF) >> 4);
            crc ^= ((crc << 12) & 0xFFFF);
            crc ^= (((crc & 0xFF) << 5) & 0xFFFF);
        }
        return (short) (crc & 0xFFFF);
    }

    // ===== Стабильная идентификация узлов в радиоэфире =====
    // Рекламный пакет несет первые 8 байт SHA-256(nodeId) — 16 hex-символов.
    // Точное совпадение хеша исключает ложное срабатывание self-фильтра (эвристики
    // вида endsWith по коротким суффиксам прятали реальных пиров) и слияние двух
    // разных устройств в одну запись пира по совпадению 4-символьного префикса.

    private static byte[] sha256Prefix(String value, int bytes) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest((value == null ? "" : value).getBytes(StandardCharsets.UTF_8));
            byte[] out = new byte[bytes];
            System.arraycopy(digest, 0, out, 0, Math.min(bytes, digest.length));
            return out;
        } catch (Exception e) {
            return new byte[bytes];
        }
    }

    private static String bytesToHex(byte[] data, int limit) {
        StringBuilder sb = new StringBuilder();
        int n = Math.min(limit, data.length);
        for (int i = 0; i < n; i++) {
            sb.append(String.format("%02x", data[i]));
        }
        return sb.toString();
    }

    private static byte[] hexToBytes(String hex) {
        if (hex == null || hex.isEmpty()) return new byte[0];
        // Толерантность к префиксу 0x и нечётной длине
        String h = hex.startsWith("0x") ? hex.substring(2) : hex;
        if (h.length() % 2 != 0) h = "0" + h;
        byte[] out = new byte[h.length() / 2];
        for (int i = 0; i < out.length; i++) {
            out[i] = (byte) ((Character.digit(h.charAt(i * 2), 16) << 4) | Character.digit(h.charAt(i * 2 + 1), 16));
        }
        return out;
    }

    private static String bytesToB64(byte[] data) {
        return android.util.Base64.encodeToString(data, android.util.Base64.NO_WRAP);
    }

    private static String b64ToHex(String b64) {
        if (b64 == null || b64.isEmpty()) return "";
        try {
            return bytesToHex(android.util.Base64.decode(b64, android.util.Base64.NO_WRAP), Integer.MAX_VALUE);
        } catch (Exception e) {
            return b64;
        }
    }

    /** Новый формат: 8 байт SHA-256(nodeId) в hex (16 символов). */
    private static String deriveMeshShortId(String nodeId) {
        return bytesToHex(sha256Prefix(nodeId == null ? "" : nodeId, 8), 8);
    }

    /** Зеркальная деривация рекламного идентификатора старого формата (до 8-байтового хеша). */
    private static String deriveLegacyShortId(String nodeId) {
        String nodeKey = nodeId != null ? nodeId : "";
        if (nodeKey.contains("-") && nodeKey.length() >= 32) {
            nodeKey = nodeKey.substring(nodeKey.length() - 4);
        } else if (nodeKey.startsWith("node-") && nodeKey.length() > 5) {
            nodeKey = nodeKey.substring(5);
        }
        byte[] raw = nodeKey.getBytes(StandardCharsets.UTF_8);
        int n = Math.min(4, raw.length);
        return new String(raw, 0, n, StandardCharsets.UTF_8);
    }

    /**
     * Радио-идентичность узла: per-device, а не per-account. Используется в рекламном пакете,
     * self-фильтре сканера и стабильном ключе пира. Fallback на localNodeId — совместимость
     * со старыми JS-мостами, не передающими deviceId.
     */
    private String getRadioIdentity() {
        return (localDeviceId != null && !localDeviceId.isEmpty()) ? localDeviceId : localNodeId;
    }

    /**
     * Стабильный per-device идентификатор установки: генерируется один раз и переживает
     * перезапуски процесса (SharedPreferences). Не связан с аккаунтом — переустановка
     * приложения даёт новый, выход/вход аккаунта сохраняет тот же.
     */
    private String getOrCreateDeviceId() {
        if (localDeviceId != null && !localDeviceId.isEmpty()) return localDeviceId;
        try {
            android.content.SharedPreferences prefs =
                getContext().getSharedPreferences("gossip_mesh", android.content.Context.MODE_PRIVATE);
            String stored = prefs.getString("device_id", null);
            if (stored == null || stored.isEmpty()) {
                stored = "dev-" + UUID.randomUUID().toString();
                prefs.edit().putString("device_id", stored).apply();
            }
            localDeviceId = stored;
        } catch (Exception e) {
            localDeviceId = "dev-" + UUID.randomUUID().toString() + "-" + (System.currentTimeMillis() % 100000);
        }
        return localDeviceId;
    }

    /** На Android 6–11 результаты BLE-сканирования отдаются только при включенной системной геолокации. */
    private boolean isLocationServicesEnabled() {
        try {
            LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
            return lm != null && (lm.isProviderEnabled(LocationManager.GPS_PROVIDER)
                || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER));
        } catch (Exception e) {
            return true;
        }
    }

    private List<byte[]> createL2Fragments(short packetId, byte[] fullPayload, int negotiatedMtu) {
        int effectiveMtu = (negotiatedMtu > 23) ? negotiatedMtu : 23;
        // Значение ATT-атрибута не может превышать 512 байт: BluetoothGatt.writeCharacteristic
        // на Android 13+ кидает IllegalArgumentException при превышении (подтверждено logcat:
        // "value should not be longer than max length of an attribute value"). Поэтому весь кадр L2
        // (заголовок + данные) укладываем в 512 байт с учетом 3 байт ATT-оверхеда.
        int maxChunkPayload = Math.max(1, Math.min(effectiveMtu - 3, 512) - L2_HEADER_SIZE);
        int totalFragments = (int) Math.ceil((double) fullPayload.length / maxChunkPayload);
        if (totalFragments <= 0) totalFragments = 1;
        if (totalFragments > 255) {
            Log.e(TAG, "L2 Фрагментация: totalFragments=" + totalFragments + " превышает лимит протокола 255 для MTU=" + effectiveMtu);
            return Collections.emptyList();
        }
        List<byte[]> chunks = new ArrayList<>(totalFragments);
        for (int i = 0; i < totalFragments; i++) {
            int offset = i * maxChunkPayload;
            int length = Math.min(maxChunkPayload, fullPayload.length - offset);
            byte[] frame = new byte[L2_HEADER_SIZE + length];
            ByteBuffer buf = ByteBuffer.wrap(frame);
            buf.order(ByteOrder.BIG_ENDIAN);
            buf.putShort(L2_MAGIC);
            buf.put(L2_VERSION);
            buf.put(L2_TYPE_DATA);
            buf.putShort(packetId);
            buf.put((byte) totalFragments);
            buf.put((byte) i);
            buf.putShort((short) length);
            buf.putShort(calculateCRC16(fullPayload, offset, length));
            buf.put(fullPayload, offset, length);
            chunks.add(frame);
        }
        return chunks;
    }

    private void safeCloseGatt(BluetoothGatt gatt) {
        if (gatt == null) return;
        Runnable watchdog = activeGatts.remove(gatt);
        if (watchdog != null) {
            mainHandler.removeCallbacks(watchdog);
        }
        try {
            gatt.disconnect();
        } catch (Exception ignored) {}
        try {
            gatt.close();
        } catch (Exception ignored) {}
        Log.d(TAG, "GATT соединение закрыто, дескриптор освобожден");
    }

    private BluetoothAdapter bluetoothAdapter;
    private BluetoothLeAdvertiser advertiser;
    private BluetoothLeScanner scanner;
    private BluetoothGattServer gattServer;

    private boolean isMeshActive = false;
    private boolean isAdvertising = false;
    private boolean isScanning = false;
    private boolean isRelayMode = true;

    // Отдельный колбэк минимального fallback-рекламщика — обязан останавливаться вместе с основным,
    // иначе после смены профиля энергопотребления копятся неостановленные рекламные сессии.
    private final AdvertiseCallback fallbackAdvertiseCallback = new AdvertiseCallback() {
        @Override
        public void onStartSuccess(AdvertiseSettings settingsInEffect) {
            super.onStartSuccess(settingsInEffect);
            if (!isMeshActive) {
                Log.d(TAG, "Fallback Advertising запустился после stopMesh, немедленная остановка");
                try {
                    if (advertiser != null) advertiser.stopAdvertising(this);
                } catch (Exception ignored) {}
                isAdvertising = false;
                return;
            }
            isAdvertising = true;
            Log.d(TAG, "BLE Minimal Advertising Fallback успешно активен!");
        }

        @Override
        public void onStartFailure(int errorCode) {
            super.onStartFailure(errorCode);
            Log.e(TAG, "BLE Minimal Advertising Fallback ошибка (" + errorCode + ")");
            isAdvertising = isMeshActive && (errorCode == AdvertiseCallback.ADVERTISE_FAILED_ALREADY_STARTED);
        }
    };

    // Профиль энергопотребления: "high" (радар активен), "balanced" (чат/приложение), "low_power" (фоновый режим/сон)
    private String currentPowerProfile = "balanced";

    // Dual Identity Standard: localNodeId — идентичность аккаунта (UUID пользователя; PEER_INFO id,
    // ключи prekey-бандлов, маршрутизация чатов), localDeviceId — идентичность физической установки
    // для радиоэфира (рекламный хеш, self-фильтр сканера, стабильный ключ пира). До разделения
    // радио несло хеш аккаунта: два устройства одного аккаунта рекламировали одинаковый хеш и
    // взаимно фильтровали друг друга как «самих себя» (0 пиров, вечный «Поиск пиров...»).
    private String localNodeId = "node-" + System.currentTimeMillis() % 10000;
    private String localDeviceId = null;
    private String localAlias = "Gossip Node";

    // ===== Устойчивость сканирования (гигиена BLE-стека) =====
    // OEM-стеки (Unisoc/MTK) выделяют ограниченное число слотов scan-клиентов; безусловный retry
    // каждые 5 с после APPLICATION_REGISTRATION_FAILED(2) забивает стек зомби-регистрациями
    // вплоть до перманентной слепоты до перезапуска Bluetooth. Лечится экспоненциальным
    // бэкоффом, полным stopScan каждой выданной колбэк-инстанции и периодическим полным
    // перезапуском радио (scan + advertising + GATT-клиенты).
    private int scanFailureStreak = 0;
    private long scanBackoffUntil = 0;
    private String lastScanError = null;
    private boolean scanRegistrationConfirmed = false;
    private Runnable scanConfirmRunnable = null;
    /** Активная инстанция скан-колбэка: пересоздается на каждую регистрацию (гигиена стека) */
    private ScanCallback activeScanCallback = null;

    // Поколение рекламных рестартов: отложенные postDelayed-перезапуски лестницы fallback
    // обязаны умирать при stopAdvertising/startAdvertising, иначе реклама оживает после stopMesh.
    private int advertisingGeneration = 0;

    // Хранилище обнаруженных пиров
    private final ConcurrentHashMap<String, DiscoveredPeer> discoveredPeers = new ConcurrentHashMap<>();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private Runnable cleanupTask;

    // Адреса пиров, подключённых к нашему GATT-серверу в настоящий момент.
    // Набор номера пиру из этого множества создает встречное соединение между одной парой
    // устройств — на стеках Android это зависание GATT-операций обеих сторон без колбэков.
    private final Set<String> inboundConnectedAddresses = Collections.newSetFromMap(new ConcurrentHashMap<String, Boolean>());
    private String localPrekeyBundle = null;

    // ===== Сериализация исходящих GATT-соединений =====
    // Параллельные connectGatt к нескольким пирам исчерпывают клиентские слоты OEM-стеков
    // (Unisoc/MTK) — следом отказывает и регистрация сканера. Очередь гарантирует максимум
    // одно активное соединение; задачи выполняются в порядке поступления с главной очереди.
    private static class QueuedSendTask {
        final PluginCall call;
        final Runnable task;
        QueuedSendTask(PluginCall call, Runnable task) {
            this.call = call;
            this.task = task;
        }
    }

    private final java.util.LinkedList<QueuedSendTask> pendingSendQueue = new java.util.LinkedList<>();
    private boolean sendInFlight = false;
    private BroadcastReceiver bluetoothStateReceiver = null;

    // Внутренний класс описания найденного пира
    public static class DiscoveredPeer {
        public String id;
        public String nodeId = null; // настоящий идентификатор узла (UUID пользователя) из PEER_INFO
        public String address;
        public String name;
        public String deviceType; // "android", "ios", "desktop", "embedded"
        public int rssi;
        public double distanceMeters;
        public boolean isRelay;
        public int angleDeg;
        public long lastSeen;
        public JSONObject prekeyBundle = null;

        public JSObject toJSObject() {
            JSObject obj = new JSObject();
            obj.put("id", id);
            if (nodeId != null) obj.put("nodeId", nodeId);
            obj.put("address", address);
            obj.put("name", name);
            obj.put("deviceType", deviceType);
            obj.put("rssi", rssi);
            obj.put("distanceMeters", distanceMeters);
            obj.put("isRelay", isRelay);
            obj.put("angleDeg", angleDeg);
            obj.put("lastSeen", lastSeen);
            if (prekeyBundle != null) {
                try {
                    obj.put("prekeyBundle", JSObject.fromJSONObject(prekeyBundle));
                } catch (Exception ignored) {}
            }
            return obj;
        }
    }

    // PowerManager WakeLock для удержания активного состояния процессора при передаче и дефрагментации L2 (M2)
    private PowerManager.WakeLock meshWakeLock = null;
    private final Object wakeLockMutex = new Object();

    private void initMeshWakeLock() {
        try {
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                synchronized (wakeLockMutex) {
                    if (meshWakeLock == null) {
                        meshWakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Gossip:GossipMeshWakeLock");
                        meshWakeLock.setReferenceCounted(false);
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Ошибка инициализации meshWakeLock: ", e);
        }
    }

    private void acquireMeshWakeLock(long timeoutMs) {
        try {
            synchronized (wakeLockMutex) {
                if (meshWakeLock == null) {
                    initMeshWakeLock();
                }
                if (meshWakeLock != null) {
                    meshWakeLock.acquire(timeoutMs);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Ошибка захвата meshWakeLock: " + e.getMessage());
        }
    }

    private void releaseMeshWakeLock() {
        try {
            synchronized (wakeLockMutex) {
                if (meshWakeLock != null && meshWakeLock.isHeld()) {
                    meshWakeLock.release();
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Ошибка освобождения meshWakeLock: " + e.getMessage());
        }
    }

    private void registerBluetoothStateReceiver() {
        if (bluetoothStateReceiver != null) return;
        bluetoothStateReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent == null || !BluetoothAdapter.ACTION_STATE_CHANGED.equals(intent.getAction())) {
                    return;
                }
                int state = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR);
                if (state == BluetoothAdapter.STATE_OFF || state == BluetoothAdapter.STATE_TURNING_OFF) {
                    Log.d(TAG, "Bluetooth выключен: полный сброс радио-состояния BLE Mesh");
                    mainHandler.post(() -> handleBluetoothStateOff());
                } else if (state == BluetoothAdapter.STATE_ON) {
                    Log.d(TAG, "Bluetooth включен: восстановление BLE Mesh");
                    mainHandler.post(() -> handleBluetoothStateOn());
                }
            }
        };
        try {
            IntentFilter filter = new IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED);
            Context ctx = getContext();
            if (ctx != null) {
                ContextCompat.registerReceiver(ctx, bluetoothStateReceiver, filter, ContextCompat.RECEIVER_EXPORTED);
            }
        } catch (Exception e) {
            Log.w(TAG, "Ошибка регистрации bluetoothStateReceiver: " + e.getMessage());
        }
    }

    private void unregisterBluetoothStateReceiver() {
        if (bluetoothStateReceiver != null) {
            try {
                Context ctx = getContext();
                if (ctx != null) {
                    ctx.unregisterReceiver(bluetoothStateReceiver);
                }
            } catch (Exception ignored) {}
            bluetoothStateReceiver = null;
        }
    }

    private void handleBluetoothStateOff() {
        stopScanningInternal();
        isScanning = false;
        stopAdvertisingInternal();
        isAdvertising = false;
        stopGattServer();
        for (BluetoothGatt gatt : new ArrayList<>(activeGatts.keySet())) {
            safeCloseGatt(gatt);
        }
        activeGatts.clear();
        releaseMeshWakeLock();

        // Сброс штрафных бэкоффов: после включения Bluetooth адаптер чист
        scanFailureStreak = 0;
        scanBackoffUntil = 0;
        scanDowngradeLevel = 0;
        lastScanError = "Bluetooth disabled";

        notifyMeshDiagnostics();
    }

    private void handleBluetoothStateOn() {
        try {
            Context ctx = getContext();
            if (ctx != null) {
                BluetoothManager bm = (BluetoothManager) ctx.getSystemService(Context.BLUETOOTH_SERVICE);
                if (bm != null) {
                    bluetoothAdapter = bm.getAdapter();
                }
            }
        } catch (Exception ignored) {}

        // Сброс штрафных бэкоффов перед восстановлением
        scanFailureStreak = 0;
        scanBackoffUntil = 0;
        scanDowngradeLevel = 0;
        lastScanError = null;

        if (isMeshActive && bluetoothAdapter != null && bluetoothAdapter.isEnabled() && hasBluetoothPermissions()) {
            Log.d(TAG, "Восстановление BLE Mesh после включения Bluetooth...");
            startGattServer();
            startAdvertisingInternal();
            startScanningInternal();
        }
        notifyMeshDiagnostics();
    }

    @Override
    public void load() {
        super.load();
        try {
            BluetoothManager bluetoothManager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
            if (bluetoothManager != null) {
                bluetoothAdapter = bluetoothManager.getAdapter();
            }
            initMeshWakeLock();
            startPeriodicCleanup();
            registerBluetoothStateReceiver();
            Log.d(TAG, "GossipBlePlugin успешно инициализирован");
        } catch (Exception e) {
            Log.e(TAG, "Ошибка инициализации Bluetooth Manager: ", e);
        }
    }

    private void startPeriodicCleanup() {
        cleanupTask = new Runnable() {
            @Override
            public void run() {
                try {
                    long now = System.currentTimeMillis();
                    boolean changed = false;
                    for (Map.Entry<String, DiscoveredPeer> entry : discoveredPeers.entrySet()) {
                        // Если устройство не подавало сигнал более 40 секунд — удаляем из активных пиров (RFC-2026-004)
                        if (now - entry.getValue().lastSeen > 40000) {
                            discoveredPeers.remove(entry.getKey());
                            changed = true;
                        }
                    }
                    if (changed) {
                        notifyPeersUpdated();
                    }

                    // Очистка устаревших сессий дефрагментации L2 (> 5000 мс)
                    for (Map.Entry<String, ReassemblySession> sessionEntry : reassemblySessions.entrySet()) {
                        if (now - sessionEntry.getValue().createdAt > REASSEMBLY_TIMEOUT_MS) {
                            reassemblySessions.remove(sessionEntry.getKey());
                        }
                    }

                    // Watchdog: автоматическое восстановление Advertising и Scanning при случайном сбросе стека
                    if (isMeshActive && bluetoothAdapter != null && bluetoothAdapter.isEnabled() && hasBluetoothPermissions()) {
                        if (!isAdvertising) {
                            Log.d(TAG, "Watchdog: Восстановление BLE Advertising...");
                            startAdvertisingInternal();
                        }
                        if (!isScanning) {
                            Log.d(TAG, "Watchdog: Восстановление BLE Scanning...");
                            startScanningInternal();
                        }
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Ошибка очистки пиров: " + e.getMessage());
                }
                mainHandler.postDelayed(this, 5000);
            }
        };
        mainHandler.postDelayed(cleanupTask, 5000);
    }

    private boolean hasBluetoothPermissions() {
        Context ctx = getContext();
        if (ctx == null) return false;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return ContextCompat.checkSelfPermission(ctx, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED &&
                   ContextCompat.checkSelfPermission(ctx, Manifest.permission.BLUETOOTH_ADVERTISE) == PackageManager.PERMISSION_GRANTED &&
                   ContextCompat.checkSelfPermission(ctx, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
        } else {
            // Android 6–11: результаты сканирования отдаются только при ACCESS_FINE_LOCATION.
            // COARSE формально пермишен дает, но скан молча возвращает 0 результатов (Huawei/EMUI, MIUI).
            return ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        }
    }

    @PluginMethod
    public void checkMeshPermissions(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasBluetoothPermissions());
        ret.put("bluetoothEnabled", bluetoothAdapter != null && bluetoothAdapter.isEnabled());
        ret.put("locationServicesEnabled", isLocationServicesEnabled());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestMeshPermissions(PluginCall call) {
        if (hasBluetoothPermissions()) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            ret.put("bluetoothEnabled", bluetoothAdapter != null && bluetoothAdapter.isEnabled());
            ret.put("locationServicesEnabled", isLocationServicesEnabled());
            call.resolve(ret);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            requestPermissionForAlias("bluetooth", call, "bluetoothPermsCallback");
        } else {
            requestPermissionForAlias("location", call, "bluetoothPermsCallback");
        }
    }

    @PermissionCallback
    private void bluetoothPermsCallback(PluginCall call) {
        JSObject ret = new JSObject();
        boolean granted = hasBluetoothPermissions();
        ret.put("granted", granted);
        ret.put("bluetoothEnabled", bluetoothAdapter != null && bluetoothAdapter.isEnabled());
        ret.put("locationServicesEnabled", isLocationServicesEnabled());
        call.resolve(ret);
    }

    @PluginMethod
    public void startMesh(PluginCall call) {
        try {
            String nodeId = call.getString("nodeId");
            if (nodeId != null && !nodeId.isEmpty()) {
                this.localNodeId = nodeId;
            }
            // Dual Identity: radio-слой всегда идентифицируется per-device (см. getRadioIdentity)
            String deviceId = call.getString("deviceId");
            if (deviceId != null && !deviceId.isEmpty()) {
                this.localDeviceId = deviceId;
            } else {
                getOrCreateDeviceId();
            }
            String alias = call.getString("alias");
            if (alias != null && !alias.isEmpty()) {
                this.localAlias = alias;
            }
            Boolean relay = call.getBoolean("isRelay");
            if (relay != null) {
                this.isRelayMode = relay;
            }
            String prekeyBundle = call.getString("prekeyBundle");
            if (prekeyBundle != null && !prekeyBundle.isEmpty()) {
                this.localPrekeyBundle = prekeyBundle;
            }

            // Запоминаем целевое состояние до проверки адаптера: если Bluetooth сейчас выключен,
            // handleBluetoothStateOn() автоматически поднимет GATT + Advertising + Scan сразу после включения BT.
            isMeshActive = true;

            if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
                lastScanError = "Bluetooth disabled";
                notifyMeshDiagnostics();
                call.reject("Bluetooth выключен или недоступен на данном устройстве");
                return;
            }

            if (!hasBluetoothPermissions()) {
                lastScanError = "Missing Bluetooth permissions";
                notifyMeshDiagnostics();
                call.reject("Отсутствуют необходимые разрешения Bluetooth/Геолокации");
                return;
            }

            // Явный старт mesh пользователем/мостом снимает штрафной бэкофф сканера:
            // окружение могло измениться (перезапуск BT, выдача разрешений)
            scanFailureStreak = 0;
            scanBackoffUntil = 0;
            lastScanError = null;

            // 1. Запуск GATT-сервера для приема входящих пакетов
            startGattServer();

            // 2. Запуск BLE Advertising (широковещание)
            startAdvertisingInternal();

            // 3. Запуск BLE Scanning (универсальное сканирование)
            startScanningInternal();

            Log.d(TAG, "Gossip BLE Mesh успешно запущен! NodeId: " + localNodeId);

            JSObject res = new JSObject();
            res.put("success", true);
            res.put("isMeshActive", true);
            res.put("isAdvertising", isAdvertising);
            res.put("isScanning", isScanning);
            res.put("locationServicesEnabled", isLocationServicesEnabled());
            call.resolve(res);
        } catch (SecurityException se) {
            Log.e(TAG, "SecurityException при запуске Mesh", se);
            call.reject("Ошибка доступа Bluetooth (SecurityException): " + se.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Ошибка при запуске Mesh", e);
            call.reject("Не удалось запустить Mesh: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopMesh(PluginCall call) {
        try {
            isMeshActive = false;
            stopScanningInternal();
            stopAdvertisingInternal();
            stopGattServer();
            for (BluetoothGatt gatt : new ArrayList<>(activeGatts.keySet())) {
                safeCloseGatt(gatt);
            }
            activeGatts.clear();
            synchronized (pendingSendQueue) {
                while (!pendingSendQueue.isEmpty()) {
                    QueuedSendTask queued = pendingSendQueue.poll();
                    if (queued != null && queued.call != null) {
                        try {
                            queued.call.reject("mesh_stopped");
                        } catch (Exception ignored) {}
                    }
                }
                sendInFlight = false;
            }
            releaseMeshWakeLock();
            Log.d(TAG, "Gossip BLE Mesh остановлен");

            JSObject res = new JSObject();
            res.put("success", true);
            res.put("isMeshActive", false);
            if (call != null) {
                call.resolve(res);
            }
        } catch (Exception e) {
            Log.e(TAG, "Ошибка остановки Mesh", e);
            if (call != null) {
                call.reject("Ошибка остановки: " + e.getMessage());
            }
        }
    }

    @PluginMethod
    public void setPowerProfile(PluginCall call) {
        String profile = call.getString("profile", "balanced");
        this.currentPowerProfile = profile;
        Log.d(TAG, "Переключение профиля энергопотребления BLE Mesh на: " + profile);

        if (isMeshActive) {
            // Перезапуск с новым профилем сканирования и передачи
            stopScanningInternal();
            startScanningInternal();
            stopAdvertisingInternal();
            startAdvertisingInternal();
        }

        JSObject res = new JSObject();
        res.put("success", true);
        res.put("powerProfile", currentPowerProfile);
        call.resolve(res);
    }

    @PluginMethod
    public void startScanning(PluginCall call) {
        try {
            if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
                lastScanError = "Bluetooth disabled";
                notifyMeshDiagnostics();
                call.reject("Bluetooth выключен");
                return;
            }
            if (isMeshActive && hasBluetoothPermissions()) {
                if (gattServer == null) {
                    startGattServer();
                }
                if (!isAdvertising) {
                    startAdvertisingInternal();
                }
            }
            if (!isScanning) {
                startScanningInternal();
            }
            JSObject res = new JSObject();
            res.put("success", true);
            res.put("isScanning", isScanning);
            res.put("isAdvertising", isAdvertising);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Не удалось начать сканирование: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopScanning(PluginCall call) {
        try {
            stopScanningInternal();
            JSObject res = new JSObject();
            res.put("success", true);
            res.put("isScanning", isScanning);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Ошибка остановки сканирования: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getDiscoveredPeers(PluginCall call) {
        JSArray peersArray = new JSArray();
        for (DiscoveredPeer peer : discoveredPeers.values()) {
            peersArray.put(peer.toJSObject());
        }
        JSObject res = new JSObject();
        res.put("peers", peersArray);
        res.put("count", discoveredPeers.size());
        res.put("isScanning", isScanning);
        res.put("isAdvertising", isAdvertising);
        res.put("powerProfile", currentPowerProfile);
        call.resolve(res);
    }

    @PluginMethod
    public void setRelayMode(PluginCall call) {
        Boolean relay = call.getBoolean("isRelay", true);
        this.isRelayMode = relay != null && relay;
        JSObject res = new JSObject();
        res.put("isRelayMode", this.isRelayMode);
        call.resolve(res);
    }

    @PluginMethod
    public void isLocationServicesEnabled(PluginCall call) {
        JSObject ret = new JSObject();
        boolean enabled = isLocationServicesEnabled();
        ret.put("enabled", enabled);
        ret.put("locationServicesEnabled", enabled);
        call.resolve(ret);
    }

    @PluginMethod
    public void openLocationSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Не удалось открыть настройки геолокации", e);
            call.reject("Не удалось открыть настройки геолокации: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openBluetoothSettings(PluginCall call) {
        try {
            try {
                Intent enableIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
                enableIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(enableIntent);
            } catch (Exception enableErr) {
                Intent settingsIntent = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS);
                settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(settingsIntent);
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Не удалось открыть настройки Bluetooth", e);
            call.reject("Не удалось открыть настройки Bluetooth: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getMeshState(PluginCall call) {
        JSObject res = new JSObject();
        res.put("isMeshActive", isMeshActive);
        res.put("isAdvertising", isAdvertising);
        res.put("isScanning", isScanning);
        res.put("isRelayMode", isRelayMode);
        res.put("bluetoothEnabled", bluetoothAdapter != null && bluetoothAdapter.isEnabled());
        res.put("locationServicesEnabled", isLocationServicesEnabled());
        res.put("localNodeId", localNodeId);
        res.put("localDeviceId", getRadioIdentity());
        res.put("peersCount", discoveredPeers.size());
        res.put("powerProfile", currentPowerProfile);
        res.put("scanFailureStreak", scanFailureStreak);
        res.put("scanBackoffMs", Math.max(0, scanBackoffUntil - System.currentTimeMillis()));
        res.put("lastScanError", lastScanError == null ? "" : lastScanError);
        call.resolve(res);
    }

    /**
     * Телеметрия радио-слоя в JS: реальные причины слепоты сканера вместо
     * фантомного «Поиск пиров...» (Zero-Phantom-Mesh Rule, RFC-2026-004).
     */
    private void notifyMeshDiagnostics() {
        try {
            JSObject ev = new JSObject();
            ev.put("isScanning", isScanning);
            ev.put("isAdvertising", isAdvertising);
            ev.put("bluetoothEnabled", bluetoothAdapter != null && bluetoothAdapter.isEnabled());
            ev.put("scanFailureStreak", scanFailureStreak);
            ev.put("scanBackoffMs", Math.max(0, scanBackoffUntil - System.currentTimeMillis()));
            ev.put("lastScanError", lastScanError == null ? "" : lastScanError);
            notifyListeners("onMeshDiagnostics", ev);
        } catch (Exception ignored) {}
    }

    // Регистрация входящего пира при GATT-подключении (двусторонняя симметричная видимость)
    private void registerGattPeer(BluetoothDevice device) {
        if (device == null) return;
        try {
            String address = device.getAddress();
            if (address == null) return;

            String peerName = null;
            try {
                peerName = device.getName();
            } catch (SecurityException ignored) {}

            // Слияние по адресу: если сканер уже держит этого пира под стабильным ключом
            // (mesh-<id>), GATT-регистрация лишь обновляет lastSeen, а не создает дубликат
            // peer-<mac> на радаре.
            for (Map.Entry<String, DiscoveredPeer> entry : discoveredPeers.entrySet()) {
                DiscoveredPeer existing = entry.getValue();
                if (address.equals(existing.address)) {
                    existing.lastSeen = System.currentTimeMillis();
                    if (peerName != null && !peerName.isEmpty() && !existing.name.startsWith("Gossip Node (")) {
                        existing.name = peerName;
                    }
                    return;
                }
            }

            String stableKey = "peer-" + address.replace(":", "").toLowerCase();
            DiscoveredPeer peer = new DiscoveredPeer();
            peer.id = stableKey;
            peer.address = address;
            peer.name = (peerName != null && !peerName.isEmpty()) ? peerName : "Gossip Node (" + address.substring(Math.max(0, address.length() - 5)) + ")";
            peer.deviceType = "android";
            peer.rssi = -60;
            peer.distanceMeters = 1.0;
            peer.isRelay = true;
            peer.angleDeg = Math.abs(stableKey.hashCode()) % 360;
            peer.lastSeen = System.currentTimeMillis();
            discoveredPeers.put(stableKey, peer);
            notifyPeersUpdated();
            Log.d(TAG, "GATT Server: Обнаружен и зарегистрирован входящий пир " + address + " (" + peer.name + ")");
        } catch (Exception e) {
            Log.w(TAG, "Ошибка регистрации GATT пира: " + e.getMessage());
        }
    }

    // ===== Входящие конверты =====
    // Нативный слой НЕ показывает уведомления на приёме радиопакета: оповещение рождается
    // только в JS-конвейере (App.tsx) ПОСЛЕ записи сообщения в чат — после дедупа
    // (SeenPacketCache), echo-фильтра и расшифровки. Уведомление до доставки = ложный
    // сигнал пользователю (F-1: «уведомления ≠ доставка»), повторные перекачки конверта
    // породили бы шторм системных уведомлений.

    // Кольцевой буфер конвертов на случай смерти JS-слоя (убийство WebView при живом
    // процессе): разгружается drainPendingEnvelopes при следующем старте mesh. Повторная
    // обработка уже доставленных конвертов безопасна — JS-дедуп (SeenPacketCache) идемпотентен.
    private static final int PENDING_ENVELOPES_LIMIT = 50;
    private static final long PENDING_ENVELOPES_TTL_MS = 10 * 60 * 1000;
    private final ArrayDeque<JSONObject> pendingWebViewEnvelopes = new ArrayDeque<>();

    private void bufferPendingEnvelope(String senderAddress, String envelopeJson) {
        try {
            JSONObject entry = new JSONObject();
            entry.put("senderAddress", senderAddress == null ? "" : senderAddress);
            entry.put("envelopeJson", envelopeJson);
            entry.put("receivedAt", System.currentTimeMillis());
            synchronized (pendingWebViewEnvelopes) {
                while (pendingWebViewEnvelopes.size() >= PENDING_ENVELOPES_LIMIT) {
                    pendingWebViewEnvelopes.pollFirst();
                }
                pendingWebViewEnvelopes.addLast(entry);
            }
        } catch (Exception e) {
            Log.w(TAG, "Ошибка буферизации конверта для WebView: " + e.getMessage());
        }
    }

    @PluginMethod
    public void drainPendingEnvelopes(PluginCall call) {
        JSArray arr = new JSArray();
        long now = System.currentTimeMillis();
        synchronized (pendingWebViewEnvelopes) {
            while (!pendingWebViewEnvelopes.isEmpty()) {
                JSONObject entry = pendingWebViewEnvelopes.pollFirst();
                if (entry == null) break;
                try {
                    long receivedAt = entry.getLong("receivedAt");
                    if (now - receivedAt > PENDING_ENVELOPES_TTL_MS) {
                        continue;
                    }
                    arr.put(entry);
                } catch (Exception e) {
                    Log.w(TAG, "Повреждённая запись в буфере недоставленных конвертов: " + e.getMessage());
                }
            }
        }
        JSObject ret = new JSObject();
        ret.put("envelopes", arr);
        try {
            ret.put("count", arr.length());
        } catch (Exception ignored) {}
        call.resolve(ret);
    }

    // Вспомогательный метод: запуск GATT сервера
    private void startGattServer() {
        if (gattServer != null) return;
        try {
            BluetoothManager bluetoothManager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
            if (bluetoothManager == null) return;

            gattServer = bluetoothManager.openGattServer(getContext(), new BluetoothGattServerCallback() {
                @Override
                public void onConnectionStateChange(BluetoothDevice device, int status, int newState) {
                    super.onConnectionStateChange(device, status, newState);
                    Log.d(TAG, "GATT Server onConnectionStateChange: " + (device != null ? device.getAddress() : "null") + ", state: " + newState);
                    if (newState == BluetoothProfile.STATE_CONNECTED && device != null) {
                        inboundConnectedAddresses.add(device.getAddress());
                        registerGattPeer(device);
                    } else if (newState == BluetoothProfile.STATE_DISCONNECTED && device != null) {
                        inboundConnectedAddresses.remove(device.getAddress());
                    }
                }

                @Override
                public void onServiceAdded(int status, BluetoothGattService service) {
                    super.onServiceAdded(status, service);
                    Log.d(TAG, "GATT Server onServiceAdded: " + (service != null ? service.getUuid() : "null") + " (status=" + status + ")");
                }

                @Override
                public void onCharacteristicReadRequest(BluetoothDevice device, int requestId, int offset, BluetoothGattCharacteristic characteristic) {
                    super.onCharacteristicReadRequest(device, requestId, offset, characteristic);
                    if (device != null) {
                        registerGattPeer(device);
                    }
                    if (CHARACTERISTIC_PEER_INFO.equals(characteristic.getUuid())) {
                        try {
                            JSONObject info = new JSONObject();
                            info.put("id", localNodeId);
                            // Dual Identity: радио-идентичность установки — приёмник строит по ней
                            // стабильный ключ пира mesh-<hash(did)>, не сливающий устройства
                            // одного аккаунта в одну запись радара
                            info.put("did", getRadioIdentity());
                            if (localAlias != null && !localAlias.isEmpty()) {
                                info.put("a", localAlias);
                            }
                            info.put("r", isRelayMode ? 1 : 0);
                            info.put("type", "android");
                            // Prekey-бандл пакуется в base64 внутри объекта pk: hex-кодирование
                            // раздувало JSON за 512 байт (ATT-лимит одного чтения — Android-клиент
                            // не умеет дочитывать длинные атрибуты), аппаратный срез рвал JSON-парсинг.
                            if (localPrekeyBundle != null && !localPrekeyBundle.isEmpty()) {
                                try {
                                    JSONObject pb = new JSONObject(localPrekeyBundle);
                                    JSONObject pk = new JSONObject();
                                    pk.put("enc", "b64");
                                    String ik = pb.optString("identityKey", pb.optString("ik", ""));
                                    if (!ik.isEmpty()) pk.put("ik", bytesToB64(hexToBytes(ik)));
                                    JSONObject spkObj = pb.optJSONObject("signedPrekey");
                                    String spk = "", sig = "";
                                    if (spkObj != null) {
                                        spk = spkObj.optString("key", "");
                                        sig = spkObj.optString("signature", "");
                                    } else {
                                        spk = pb.optString("spk", "");
                                        sig = pb.optString("sig", "");
                                    }
                                    if (!spk.isEmpty()) pk.put("spk", bytesToB64(hexToBytes(spk)));
                                    if (!sig.isEmpty()) pk.put("sig", bytesToB64(hexToBytes(sig)));
                                    JSONObject opkObj = pb.optJSONObject("oneTimePrekey");
                                    String opk = "";
                                    int opkId = 0;
                                    if (opkObj != null) {
                                        opk = opkObj.optString("key", "");
                                        opkId = opkObj.optInt("id", 0);
                                    } else {
                                        opk = pb.optString("opk", "");
                                        opkId = pb.optInt("opkId", pb.optInt("oi", 0));
                                    }
                                    if (!opk.isEmpty()) pk.put("opk", bytesToB64(hexToBytes(opk)));
                                    pk.put("oi", opkId);
                                    info.put("pk", pk);
                                } catch (Exception e) {
                                    Log.w(TAG, "Ошибка упаковки prekey-бандла в b64: " + e.getMessage());
                                }
                            }
                            byte[] data = info.toString().getBytes(StandardCharsets.UTF_8);
                            // ATT-атрибут влезает в 512 байт: при превышении жертвуем prekey-бандлом
                            // (идентичность id/did/a/r обязана дойти валидным JSON — иначе пир
                            // навсегда останется неопознанной заглушкой peer-<mac>)
                            if (data.length > 512 && info.has("pk")) {
                                Log.w(TAG, "PEER_INFO " + data.length + " байт > 512: prekey-бандл вырезан, идентичность сохранена");
                                info.remove("pk");
                                data = info.toString().getBytes(StandardCharsets.UTF_8);
                            }
                            Log.d(TAG, "PEER_INFO отдан (" + data.length + " байт, offset " + offset + ") пиру " + (device != null ? device.getAddress() : "?"));
                            if (data.length > 512) {
                                Log.e(TAG, "PEER_INFO превышает 512-байтовый лимит ATT-атрибута (" + data.length + " байт) — клиент получит обрезанный JSON!");
                            }
                            if (gattServer != null && device != null) {
                                if (offset < 0 || offset > data.length) {
                                    gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_INVALID_OFFSET, offset, new byte[0]);
                                } else if (offset == data.length) {
                                    gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, new byte[0]);
                                } else {
                                    byte[] slice = Arrays.copyOfRange(data, offset, data.length);
                                    gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, slice);
                                }
                            }
                            return;
                        } catch (Exception e) {
                            Log.e(TAG, "Ошибка формирования PEER_INFO", e);
                        }
                    }
                    if (gattServer != null && device != null) {
                        gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, new byte[0]);
                    }
                }

                @Override
                public void onCharacteristicWriteRequest(BluetoothDevice device, int requestId, BluetoothGattCharacteristic characteristic, boolean preparedWrite, boolean responseNeeded, int offset, byte[] value) {
                    super.onCharacteristicWriteRequest(device, requestId, characteristic, preparedWrite, responseNeeded, offset, value);
                    if (device != null) {
                        registerGattPeer(device);
                    }
                    if (CHARACTERISTIC_ENVELOPE_RX.equals(characteristic.getUuid()) && value != null && value.length > 0) {
                        acquireMeshWakeLock(10000);
                        try {
                            // Проверяем наличие L2 бинарного заголовка (MAGIC 0xFA21)
                            if (value.length >= L2_HEADER_SIZE && value[0] == (byte) 0xFA && value[1] == (byte) 0x21) {
                                ByteBuffer buf = ByteBuffer.wrap(value);
                                buf.order(ByteOrder.BIG_ENDIAN);
                                short magic = buf.getShort();
                                byte version = buf.get();
                                byte type = buf.get();
                                short packetId = buf.getShort();
                                int totalFrags = buf.get() & 0xFF;
                                int fragIndex = buf.get() & 0xFF;
                                int payloadLen = buf.getShort() & 0xFFFF;
                                short expectedCrc = buf.getShort();

                                if (payloadLen <= value.length - L2_HEADER_SIZE) {
                                    short actualCrc = calculateCRC16(value, L2_HEADER_SIZE, payloadLen);
                                    if (actualCrc == expectedCrc) {
                                        byte[] chunkPayload = new byte[payloadLen];
                                        System.arraycopy(value, L2_HEADER_SIZE, chunkPayload, 0, payloadLen);

                                        if (totalFrags <= 1) {
                                            String envelopeJson = new String(chunkPayload, StandardCharsets.UTF_8);
                                            Log.d(TAG, "Получен полный L2 single-chunk конверт от " + device.getAddress() + " (размер " + payloadLen + " байт)");
                                            JSObject eventData = new JSObject();
                                            eventData.put("senderAddress", device.getAddress());
                                            eventData.put("envelopeJson", envelopeJson);
                                            eventData.put("receivedAt", System.currentTimeMillis());
                                            notifyListeners("onEnvelopeReceived", eventData);
                                            bufferPendingEnvelope(device.getAddress(), envelopeJson);
                                        } else {
                                            if (totalFrags > 255 || fragIndex >= totalFrags) {
                                                Log.w(TAG, "Некорректный L2 фрагмент " + fragIndex + "/" + totalFrags + " от " + device.getAddress());
                                                return;
                                            }
                                            String sessionKey = device.getAddress() + ":" + packetId;
                                            long now = System.currentTimeMillis();

                                            ReassemblySession session = reassemblySessions.get(sessionKey);
                                            if (session != null && (now - session.createdAt > REASSEMBLY_TIMEOUT_MS)) {
                                                reassemblySessions.remove(sessionKey);
                                                session = null;
                                            }

                                            if (session == null) {
                                                // Проверка лимитов на одновременные сессии дефрагментации (защита от DoS-флуда)
                                                int perDeviceCount = 0;
                                                String oldestKey = null;
                                                long oldestTime = Long.MAX_VALUE;

                                                for (Map.Entry<String, ReassemblySession> entry : reassemblySessions.entrySet()) {
                                                    ReassemblySession s = entry.getValue();
                                                    if (now - s.createdAt > REASSEMBLY_TIMEOUT_MS) {
                                                        reassemblySessions.remove(entry.getKey());
                                                        continue;
                                                    }
                                                    if (entry.getKey().startsWith(device.getAddress() + ":")) {
                                                        perDeviceCount++;
                                                    }
                                                    if (s.createdAt < oldestTime) {
                                                        oldestTime = s.createdAt;
                                                        oldestKey = entry.getKey();
                                                    }
                                                }

                                                if (perDeviceCount >= MAX_REASSEMBLY_SESSIONS_PER_DEVICE) {
                                                    Log.w(TAG, "Превышен лимит сессий сборки (" + MAX_REASSEMBLY_SESSIONS_PER_DEVICE + ") для пира " + device.getAddress() + ", фрагмент отброшен");
                                                    return;
                                                }

                                                if (reassemblySessions.size() >= MAX_REASSEMBLY_SESSIONS && oldestKey != null) {
                                                    Log.w(TAG, "Пул сессий сборки переполнен (" + MAX_REASSEMBLY_SESSIONS + "), вытеснение старой сессии: " + oldestKey);
                                                    reassemblySessions.remove(oldestKey);
                                                }

                                                session = new ReassemblySession(packetId, totalFrags);
                                                ReassemblySession prev = reassemblySessions.putIfAbsent(sessionKey, session);
                                                if (prev != null) {
                                                    session = prev;
                                                }
                                            }

                                            synchronized (session) {
                                                if (fragIndex < session.totalFragments && session.fragments[fragIndex] == null) {
                                                    session.fragments[fragIndex] = chunkPayload;
                                                    session.receivedCount++;
                                                }
                                                if (session.isComplete()) {
                                                    reassemblySessions.remove(sessionKey);
                                                    byte[] fullPayload = session.assemble();
                                                    String envelopeJson = new String(fullPayload, StandardCharsets.UTF_8);
                                                    Log.d(TAG, "L2 Пакет успешно дефрагментирован (" + fullPayload.length + " байт, " + session.totalFragments + " фрагментов) от " + device.getAddress());
                                                    
                                                    JSObject eventData = new JSObject();
                                                    eventData.put("senderAddress", device.getAddress());
                                                    eventData.put("envelopeJson", envelopeJson);
                                                    eventData.put("receivedAt", System.currentTimeMillis());
                                                    notifyListeners("onEnvelopeReceived", eventData);
                                                    bufferPendingEnvelope(device.getAddress(), envelopeJson);
                                                }
                                            }
                                        }
                                    } else {
                                        Log.w(TAG, "CRC16 mismatch для L2 фрагмента " + fragIndex + "/" + totalFrags + " от " + device.getAddress());
                                    }
                                }
                            } else {
                                // Fallback для совместимости с прямым UTF-8 JSON
                                String envelopeJson = new String(value, StandardCharsets.UTF_8);
                                Log.d(TAG, "Получен входящий BLE Mesh конверт (fallback) от " + device.getAddress() + ": " + envelopeJson);
                                
                                JSObject eventData = new JSObject();
                                eventData.put("senderAddress", device.getAddress());
                                eventData.put("envelopeJson", envelopeJson);
                                eventData.put("receivedAt", System.currentTimeMillis());
                                notifyListeners("onEnvelopeReceived", eventData);
                                bufferPendingEnvelope(device.getAddress(), envelopeJson);
                            }
                        } catch (Exception e) {
                            Log.e(TAG, "Ошибка разбора входящего конверта", e);
                        }
                    }

                    if (responseNeeded && gattServer != null) {
                        gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, null);
                    }
                }
            });

            if (gattServer != null) {
                BluetoothGattService service = new BluetoothGattService(GOSSIP_SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY);

                BluetoothGattCharacteristic peerInfoChar = new BluetoothGattCharacteristic(
                    CHARACTERISTIC_PEER_INFO,
                    BluetoothGattCharacteristic.PROPERTY_READ | BluetoothGattCharacteristic.PROPERTY_NOTIFY,
                    BluetoothGattCharacteristic.PERMISSION_READ
                );

                BluetoothGattCharacteristic envelopeRxChar = new BluetoothGattCharacteristic(
                    CHARACTERISTIC_ENVELOPE_RX,
                    BluetoothGattCharacteristic.PROPERTY_WRITE | BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE,
                    BluetoothGattCharacteristic.PERMISSION_WRITE
                );

                BluetoothGattCharacteristic envelopeSyncChar = new BluetoothGattCharacteristic(
                    CHARACTERISTIC_ENVELOPE_SYNC,
                    BluetoothGattCharacteristic.PROPERTY_READ | BluetoothGattCharacteristic.PROPERTY_WRITE,
                    BluetoothGattCharacteristic.PERMISSION_READ | BluetoothGattCharacteristic.PERMISSION_WRITE
                );

                service.addCharacteristic(peerInfoChar);
                service.addCharacteristic(envelopeRxChar);
                service.addCharacteristic(envelopeSyncChar);

                gattServer.addService(service);
                Log.d(TAG, "GATT Server успешно запущен с сервисом " + GOSSIP_SERVICE_UUID);
            }
        } catch (SecurityException se) {
            Log.e(TAG, "SecurityException при старте GATT Server", se);
        } catch (Exception e) {
            Log.e(TAG, "Ошибка запуска GATT Server", e);
        }
    }

    private void stopGattServer() {
        inboundConnectedAddresses.clear();
        if (gattServer != null) {
            try {
                gattServer.close();
            } catch (Exception e) {
                Log.w(TAG, "Ошибка закрытия GATT Server", e);
            }
            gattServer = null;
        }
    }

    // Запуск BLE Advertising по лестнице совместимости:
    // Ступень 1: primary PDU (16-бит UUID + 8-байтовый ID узла) + scan response (алиас в Service Data).
    // Ступень 2: primary PDU с ID узла БЕЗ scan response — часть новых стеков (Android 15+/отдельные чипсеты)
    //            отвергает комбинацию connectable + scan response кодом FEATURE_UNSUPPORTED.
    // Ступень 3: минимальный пакет (только UUID) — крайний fallback, пир опознается по MAC.
    private void startAdvertisingInternal() {
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
            isAdvertising = false;
            return;
        }
        if (isAdvertising) return;
        advertisingGeneration++; // новый цикл рекламы обесценивает чужие отложенные рестарты
        try {
            advertiser = bluetoothAdapter.getBluetoothLeAdvertiser();
            if (advertiser == null) {
                Log.w(TAG, "BluetoothLeAdvertiser не поддерживается на данном устройстве");
                return;
            }

            int advMode = AdvertiseSettings.ADVERTISE_MODE_BALANCED;
            int txPower = AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM;

            if ("high".equals(currentPowerProfile)) {
                // TDM Duty Cycle (M2): Сбалансированный режим рекламы сохраняет RX-окна для GATT-сервера
                advMode = AdvertiseSettings.ADVERTISE_MODE_BALANCED;
                txPower = AdvertiseSettings.ADVERTISE_TX_POWER_HIGH;
            } else if ("low_power".equals(currentPowerProfile)) {
                advMode = AdvertiseSettings.ADVERTISE_MODE_LOW_POWER;
                txPower = AdvertiseSettings.ADVERTISE_TX_POWER_LOW;
            }

            AdvertiseSettings settings = new AdvertiseSettings.Builder()
                .setAdvertiseMode(advMode)
                .setTxPowerLevel(txPower)
                .setConnectable(true)
                .setTimeout(0)
                .build();

            // Primary PDU: Flags (3) + 16-бит Service UUID (4) + Manufacturer Data (2+2+8) = 19 байт <= 31.
            // Manufacturer Data несет хеш РАДИО-идентичности (per-device), а не аккаунта:
            // аккаунт-хеш коллидировал у устройств одного аккаунта (Dual Identity Standard).
            AdvertiseData advertiseData = new AdvertiseData.Builder()
                .setIncludeTxPowerLevel(false)
                .setIncludeDeviceName(false)
                .addServiceUuid(new ParcelUuid(GOSSIP_SERVICE_UUID))
                .addManufacturerData(GOSSIP_MANUFACTURER_ID, sha256Prefix(getRadioIdentity(), 8))
                .build();

            // Scan response: короткий алиас в Service Data
            String safeAlias = (localAlias != null && !localAlias.isEmpty()) ? localAlias : "Gossip";
            if (safeAlias.length() > 8) {
                safeAlias = safeAlias.substring(0, 8);
            }
            AdvertiseData scanResponseData = new AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .setIncludeTxPowerLevel(false)
                .addServiceData(new ParcelUuid(GOSSIP_SERVICE_UUID), safeAlias.getBytes(StandardCharsets.UTF_8))
                .build();

            advertiser.startAdvertising(settings, advertiseData, scanResponseData, advertiseCallback);
            Log.d(TAG, "BLE Advertising запущен (ступень 1: full, профиль: " + currentPowerProfile + ", nodeId: " + localNodeId + ", radioId: " + getRadioIdentity() + ")");
        } catch (SecurityException se) {
            Log.e(TAG, "SecurityException при запуске Advertising", se);
        } catch (Exception e) {
            Log.e(TAG, "Ошибка запуска Advertising", e);
        }
    }

    // Ступень 2: primary с ID узла, без scan response
    private void startPrimaryOnlyAdvertising() {
        if (advertiser == null || bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
            startMinimalAdvertisingFallback();
            return;
        }
        try {
            AdvertiseSettings settings = new AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_BALANCED)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
                .setConnectable(true)
                .setTimeout(0)
                .build();

            AdvertiseData advertiseData = new AdvertiseData.Builder()
                .setIncludeTxPowerLevel(false)
                .setIncludeDeviceName(false)
                .addServiceUuid(new ParcelUuid(GOSSIP_SERVICE_UUID))
                .addManufacturerData(GOSSIP_MANUFACTURER_ID, sha256Prefix(getRadioIdentity(), 8))
                .build();

            advertiser.startAdvertising(settings, advertiseData, null, primaryOnlyAdvertiseCallback);
            Log.d(TAG, "BLE Advertising запущен (ступень 2: primary-only, nodeId: " + localNodeId + ")");
        } catch (Exception e) {
            Log.e(TAG, "Ошибка Primary-Only Advertising: ", e);
            startMinimalAdvertisingFallback();
        }
    }

    private final AdvertiseCallback primaryOnlyAdvertiseCallback = new AdvertiseCallback() {
        @Override
        public void onStartSuccess(AdvertiseSettings settingsInEffect) {
            super.onStartSuccess(settingsInEffect);
            if (!isMeshActive) {
                Log.d(TAG, "Primary-Only Advertising запустился после stopMesh, немедленная остановка");
                try {
                    if (advertiser != null) advertiser.stopAdvertising(this);
                } catch (Exception ignored) {}
                isAdvertising = false;
                return;
            }
            isAdvertising = true;
            Log.d(TAG, "BLE Primary-Only Advertising активен (ID узла сохранен в эфире)");
        }

        @Override
        public void onStartFailure(int errorCode) {
            super.onStartFailure(errorCode);
            Log.e(TAG, "BLE Primary-Only Advertising ошибка (" + errorCode + "), переход к минимальному fallback");
            isAdvertising = isMeshActive && (errorCode == AdvertiseCallback.ADVERTISE_FAILED_ALREADY_STARTED);
            if (!isAdvertising && isMeshActive) {
                final int gen = advertisingGeneration;
                mainHandler.postDelayed(() -> {
                    if (gen == advertisingGeneration && isMeshActive) {
                        startMinimalAdvertisingFallback();
                    }
                }, 300);
            }
        }
    };

    private void startMinimalAdvertisingFallback() {
        if (advertiser == null || bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) return;
        try {
            AdvertiseSettings settings = new AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_BALANCED)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
                .setConnectable(true)
                .setTimeout(0)
                .build();

            AdvertiseData advertiseData = new AdvertiseData.Builder()
                .setIncludeTxPowerLevel(false)
                .setIncludeDeviceName(false)
                .addServiceUuid(new ParcelUuid(GOSSIP_SERVICE_UUID))
                .build();

            advertiser.startAdvertising(settings, advertiseData, null, fallbackAdvertiseCallback);
        } catch (Exception e) {
            Log.e(TAG, "Ошибка Minimal Advertising Fallback: ", e);
        }
    }

    private void stopAdvertisingInternal() {
        // Гасим поколение ВСЕГДА (даже если реклама не активна): отложенные рестарты
        // лестницы fallback обязаны умереть при любом stop/start/смене профиля
        advertisingGeneration++;
        if (advertiser != null) {
            try {
                advertiser.stopAdvertising(advertiseCallback);
            } catch (Exception e) {
                Log.w(TAG, "Ошибка остановки Advertising", e);
            }
            try {
                advertiser.stopAdvertising(primaryOnlyAdvertiseCallback);
            } catch (Exception e) {
                Log.w(TAG, "Ошибка остановки Primary-Only Advertising", e);
            }
            try {
                advertiser.stopAdvertising(fallbackAdvertiseCallback);
            } catch (Exception e) {
                Log.w(TAG, "Ошибка остановки Fallback Advertising", e);
            }
        }
        isAdvertising = false;
    }

    private final AdvertiseCallback advertiseCallback = new AdvertiseCallback() {
        @Override
        public void onStartSuccess(AdvertiseSettings settingsInEffect) {
            super.onStartSuccess(settingsInEffect);
            if (!isMeshActive) {
                Log.d(TAG, "Advertising запустился после stopMesh, немедленная остановка");
                try {
                    if (advertiser != null) advertiser.stopAdvertising(this);
                } catch (Exception ignored) {}
                isAdvertising = false;
                return;
            }
            Log.d(TAG, "AdvertiseCallback: Advertising активен");
            isAdvertising = true;
        }

        @Override
        public void onStartFailure(int errorCode) {
            super.onStartFailure(errorCode);
            Log.e(TAG, "AdvertiseCallback: Ошибка запуска (" + errorCode + ")");
            if (errorCode == AdvertiseCallback.ADVERTISE_FAILED_ALREADY_STARTED && isMeshActive) {
                isAdvertising = true;
            } else {
                isAdvertising = false;
                if (isMeshActive) {
                    // Ступень 2 сохраняет ID узла в primary PDU — пир остается опознаваемым
                    // даже на стеках, отвергающих scan response (FEATURE_UNSUPPORTED = 3).
                    // Поколение фиксируется ДО выдержки: stopMesh/смена профиля инкрементирует
                    // его и гасит отложенный рестарт, не давая рекламе ожить после остановки.
                    final int gen = advertisingGeneration;
                    mainHandler.postDelayed(() -> {
                        if (gen == advertisingGeneration && isMeshActive) {
                            startPrimaryOnlyAdvertising();
                        }
                    }, 300);
                }
            }
        }
    };

    // Запуск BLE Сканирования с учетом поколения стека:
    // Android 12+ (S): открытый скан без фильтров + агрессивный hardware offload (проверено на Android 16/REVVL).
    // Android < 12 (legacy Kirin/EMUI/MTK): offload-опции (MATCH_NUM_ONE_ADVERTISEMENT,
    // MATCH_MODE_AGGRESSIVE) не поддерживаются и дают тихий ноль результатов или onScanFailed —
    // используем аппаратный фильтр по нашему service UUID с простыми настройками.
    private int scanDowngradeLevel = 0;

    private void startScanningInternal() {
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
            isScanning = false;
            return;
        }
        if (isScanning) return;
        // Штрафной бэкофф после сбоев регистрации: немедленный retry каждые 5 с забивает
        // OEM-стек зомби-клиентами и переводит отказ в перманентный (до рестарта Bluetooth)
        long now = System.currentTimeMillis();
        if (now < scanBackoffUntil) {
            return;
        }
        try {
            // Свежий дескриптор сканера на каждый цикл: часть стеков кэширует умерший клиент
            scanner = bluetoothAdapter.getBluetoothLeScanner();
            if (scanner == null) {
                Log.w(TAG, "BluetoothLeScanner недоступен");
                return;
            }

            ScanSettings.Builder settingsBuilder = new ScanSettings.Builder();

            if ("high".equals(currentPowerProfile) || "balanced".equals(currentPowerProfile)) {
                // TDM Duty Cycle (M2 / RFC-2026-004 § 4.1): Сбалансированный режим SCAN_MODE_BALANCED
                // предоставляет окнам GATT Server радиоресурс 2.4 ГГц для приема входящих CONNECT_IND,
                // предотвращая монопольный RF Starvation режим SCAN_MODE_LOW_LATENCY.
                settingsBuilder.setScanMode(ScanSettings.SCAN_MODE_BALANCED);
            } else if ("low_power".equals(currentPowerProfile)) {
                settingsBuilder.setScanMode(ScanSettings.SCAN_MODE_LOW_POWER);
            } else {
                settingsBuilder.setScanMode(ScanSettings.SCAN_MODE_BALANCED);
            }

            // reportDelay = 0 гарантирует мгновенную доставку пакетов в onScanResult
            settingsBuilder.setReportDelay(0);

            List<ScanFilter> filters = null;
            boolean legacyStack = Build.VERSION.SDK_INT < Build.VERSION_CODES.S;

            if (!legacyStack && scanDowngradeLevel == 0) {
                // Современные стеки: открытый скан исключает сбои hardware filter offload на Qualcomm/Poco
                settingsBuilder.setMatchMode(ScanSettings.MATCH_MODE_AGGRESSIVE);
                settingsBuilder.setNumOfMatches(ScanSettings.MATCH_NUM_ONE_ADVERTISEMENT);
                settingsBuilder.setCallbackType(ScanSettings.CALLBACK_TYPE_ALL_MATCHES);
            } else {
                // Legacy-стек или даунгрейд после сбоя: фильтр по нашему UUID + простые настройки
                filters = new ArrayList<>();
                filters.add(new ScanFilter.Builder()
                    .setServiceUuid(new ParcelUuid(GOSSIP_SERVICE_UUID))
                    .build());
                if (legacyStack) {
                    Log.d(TAG, "Pre-S стек (SDK " + Build.VERSION.SDK_INT + "): фильтрованный совместимый скан");
                } else {
                    Log.d(TAG, "Скан в режиме даунгрейда (уровень " + scanDowngradeLevel + "): фильтрованный совместимый скан");
                }
            }

            ScanSettings settings = settingsBuilder.build();
            // Свежая инстанция колбэка на каждую регистрацию: повторная регистрация того же
            // объекта после onScanFailed отклоняется частью стеков как дубликат клиента
            ScanCallback cb = createScanCallback();
            activeScanCallback = cb;
            scanner.startScan(filters, settings, cb);
            isScanning = true;
            scanRegistrationConfirmed = false;
            if (scanConfirmRunnable != null) {
                mainHandler.removeCallbacks(scanConfirmRunnable);
            }
            scanConfirmRunnable = () -> {
                // onScanFailed не пришёл за 5 с — стек принял регистрацию
                if (isScanning && !scanRegistrationConfirmed) {
                    scanRegistrationConfirmed = true;
                    if (scanFailureStreak > 0) {
                        Log.i(TAG, "Сканирование восстановлено после " + scanFailureStreak + " сбоев");
                        scanFailureStreak = 0;
                        notifyMeshDiagnostics();
                    }
                }
            };
            mainHandler.postDelayed(scanConfirmRunnable, 5000);
            Log.d(TAG, "BLE Scanner запущен (" + (filters == null ? "открытый" : "фильтрованный") + " режим, профиль: " + currentPowerProfile + ")");
        } catch (SecurityException se) {
            Log.e(TAG, "SecurityException при запуске Scanner", se);
        } catch (Exception e) {
            Log.e(TAG, "Ошибка запуска Scanner", e);
        }
    }

    private ScanCallback createScanCallback() {
        return new ScanCallback() {
            @Override
            public void onScanResult(int callbackType, ScanResult result) {
                super.onScanResult(callbackType, result);
                // Живой результат = регистрация подтверждена фактически
                if (!scanRegistrationConfirmed) {
                    scanRegistrationConfirmed = true;
                    if (scanFailureStreak > 0) {
                        scanFailureStreak = 0;
                        notifyMeshDiagnostics();
                    }
                }
                handleScanResult(result);
            }

            @Override
            public void onBatchScanResults(List<ScanResult> results) {
                super.onBatchScanResults(results);
                for (ScanResult r : results) {
                    handleScanResult(r);
                }
            }

            @Override
            public void onScanFailed(int errorCode) {
                super.onScanFailed(errorCode);
                handleScanFailed(errorCode);
            }
        };
    }

    /**
     * Обработка отказа регистрации сканера: полный teardown неудачной попытки,
     * экспоненциальный бэкофф и — при серии сбоев — полный перезапуск радио
     * (scan + advertising + GATT-клиенты) для высвобождения ресурсов исчерпанного стека.
     */
    private void handleScanFailed(int errorCode) {
        if (errorCode == 1 /* SCAN_FAILED_ALREADY_STARTED */) {
            // Скан фактически уже работает под прежней регистрацией
            isScanning = true;
            Log.w(TAG, "ScanCallback: скан уже запущен (код 1) — переиспользуем активную сессию");
            return;
        }
        Log.e(TAG, "ScanCallback: Ошибка сканирования (" + errorCode + "), серия " + (scanFailureStreak + 1));
        isScanning = false;
        scanRegistrationConfirmed = false;
        scanFailureStreak++;
        lastScanError = "код " + errorCode;

        // Полный stopScan неудачной (возможно полузарегистрированной) инстанции —
        // иначе OEM-стек держит зомби-слот до перезапуска Bluetooth
        if (scanner != null && activeScanCallback != null) {
            try {
                scanner.stopScan(activeScanCallback);
            } catch (Exception ignored) {}
        }
        activeScanCallback = null;

        // Даунгрейд на фильтрованный режим со следующей попытки (если еще не включен)
        if (scanDowngradeLevel == 0) {
            scanDowngradeLevel = 1;
        }

        long backoffMs;
        if (scanFailureStreak == 1) {
            backoffMs = 15000;
        } else if (scanFailureStreak == 2) {
            backoffMs = 45000;
        } else if (scanFailureStreak == 3) {
            backoffMs = 120000;
        } else {
            backoffMs = 300000;
        }
        backoffMs += (long) (Math.random() * 5000);
        scanBackoffUntil = System.currentTimeMillis() + backoffMs;
        Log.w(TAG, "Скан: бэкофф " + (backoffMs / 1000) + " с до следующей попытки (серия " + scanFailureStreak + ")");

        // Серия сбоев = исчерпание стека: полный перезапуск радио после бэкоффа,
        // чтобы освободить GATT/рекламные ресурсы и дать скану шанс зарегистрироваться
        if (scanFailureStreak >= 3 && isMeshActive) {
            final long delay = backoffMs;
            mainHandler.postDelayed(() -> {
                if (!isMeshActive) return;
                Log.w(TAG, "Радио-рестарт: полный сброс scan/advertising/GATT-клиентов исчерпанного стека");
                stopScanningInternal();
                stopAdvertisingInternal();
                for (BluetoothGatt gatt : new ArrayList<>(activeGatts.keySet())) {
                    safeCloseGatt(gatt);
                }
                activeGatts.clear();
                startAdvertisingInternal();
                startScanningInternal();
            }, delay);
        }
        notifyMeshDiagnostics();
    }

    private void stopScanningInternal() {
        if (scanConfirmRunnable != null) {
            mainHandler.removeCallbacks(scanConfirmRunnable);
            scanConfirmRunnable = null;
        }
        // stopScan выполняем даже при isScanning=false: гасим возможные полузарегистрированные
        // инстанции после onScanFailed (зомби-слоты OEM-стека)
        if (scanner != null && activeScanCallback != null) {
            try {
                scanner.stopScan(activeScanCallback);
            } catch (Exception e) {
                Log.w(TAG, "Ошибка остановки Scanner", e);
            }
        }
        activeScanCallback = null;
        isScanning = false;
    }

    // Программный универсальный парсинг пакетов (100% совместимость со всеми вендорами)
    private void handleScanResult(ScanResult result) {
        try {
            BluetoothDevice device = result.getDevice();
            if (device == null) return;

            String address = device.getAddress();
            if (address == null) return;

            ScanRecord record = result.getScanRecord();
            if (record == null) return;

            boolean isGossipPeer = false;
            String peerName = null;
            try {
                peerName = device.getName();
            } catch (SecurityException ignored) {}

            if (peerName == null) {
                peerName = record.getDeviceName();
            }

            // 1. Проверка по 128-бит и 16-бит Service UUIDs
            List<ParcelUuid> serviceUuids = record.getServiceUuids();
            if (serviceUuids != null) {
                for (ParcelUuid puuid : serviceUuids) {
                    if (puuid == null || puuid.getUuid() == null) continue;
                    String uStr = puuid.getUuid().toString().toLowerCase();
                    if (uStr.contains("fa21") || GOSSIP_SERVICE_UUID.equals(puuid.getUuid())) {
                        isGossipPeer = true;
                        break;
                    }
                }
            }

            // 2. Проверка по Service Data
            byte[] serviceDataBytes = null;
            Map<ParcelUuid, byte[]> serviceData = record.getServiceData();
            if (serviceData != null) {
                for (Map.Entry<ParcelUuid, byte[]> entry : serviceData.entrySet()) {
                    if (entry.getKey() == null || entry.getKey().getUuid() == null) continue;
                    String uStr = entry.getKey().getUuid().toString().toLowerCase();
                    if (uStr.contains("fa21") || GOSSIP_SERVICE_UUID.equals(entry.getKey().getUuid())) {
                        isGossipPeer = true;
                        serviceDataBytes = entry.getValue();
                        break;
                    }
                }
            }

            // 3. Проверка по Manufacturer Data (0x0909 Gossip ID)
            byte[] mData = record.getManufacturerSpecificData(GOSSIP_MANUFACTURER_ID);
            if (mData != null) {
                isGossipPeer = true;
            }

            // 4. Проверка по Device Name (Gossip / Node / Skuf / Boltalka)
            if (!isGossipPeer && peerName != null) {
                String lowerName = peerName.toLowerCase();
                if (lowerName.startsWith("gossip") || lowerName.startsWith("skuf") || lowerName.startsWith("boltalka")) {
                    isGossipPeer = true;
                }
            }

            // Если пакет не относится к Gossip Mesh сети — отбрасываем
            if (!isGossipPeer) {
                return;
            }

            // Извлекаем стабильный идентификатор узла (Node ID):
            // новый формат — 8 байт SHA-256-хеша (16 hex символов), legacy — до 4 байт текстового nodeKey
            String stableNodeId = null;
            if (mData != null && mData.length >= 8) {
                stableNodeId = bytesToHex(mData, 8);
            } else if (mData != null && mData.length > 0) {
                stableNodeId = new String(mData, StandardCharsets.UTF_8).trim();
            } else if (serviceDataBytes != null && serviceDataBytes.length > 0) {
                stableNodeId = new String(serviceDataBytes, StandardCharsets.UTF_8).trim();
            }

            // Фильтрация собственного устройства: ТОЛЬКО точное совпадение дериваций своей
            // РАДИО-идентичности (per-device, Dual Identity Standard). Сравнение с аккаунт-хешем
            // (localNodeId) убрано намеренно: до v1.7.10 реклама несла аккаунт-хеш, и два
            // устройства одного аккаунта взаимно отбрасывали друг друга как «самих себя».
            // Android не доставляет сканеру собственную рекламу устройства, поэтому эвристики
            // вида endsMatch/endsWith по коротким суффиксам избыточны и прячут реальных пиров.
            if (stableNodeId != null && !stableNodeId.isEmpty()) {
                String ownRadioId = getRadioIdentity();
                String ownMeshId = deriveMeshShortId(ownRadioId);
                String ownLegacyId = deriveLegacyShortId(ownRadioId);
                if (stableNodeId.equalsIgnoreCase(ownMeshId) || stableNodeId.equals(ownLegacyId)) {
                    return;
                }
            }

            String stableKey;
            if (stableNodeId != null && !stableNodeId.isEmpty()) {
                stableKey = "mesh-" + stableNodeId.toLowerCase();
            } else if (peerName != null && peerName.toLowerCase().startsWith("gossip")) {
                stableKey = "mesh-" + peerName.toLowerCase().replace(" ", "-");
            } else {
                stableKey = "peer-" + address.replace(":", "").toLowerCase();
            }

            // Поиск существующего пира по стабильному ключу или по совпадению адреса/имени
            DiscoveredPeer peer = discoveredPeers.get(stableKey);
            if (peer == null) {
                for (Map.Entry<String, DiscoveredPeer> entry : discoveredPeers.entrySet()) {
                    DiscoveredPeer existing = entry.getValue();
                    if (address.equals(existing.address) || 
                        (stableNodeId != null && stableNodeId.equalsIgnoreCase(existing.id.replace("mesh-", "")))) {
                        peer = existing;
                        discoveredPeers.remove(entry.getKey());
                        break;
                    }
                }
            }

            int rssi = result.getRssi();

            if (peerName == null || peerName.trim().isEmpty()) {
                peerName = "Gossip Node (" + address.substring(Math.max(0, address.length() - 5)) + ")";
            }

            // Расчет дистанции по формуле Path Loss
            int txPower = -59;
            if (record.getTxPowerLevel() != Integer.MIN_VALUE) {
                txPower = record.getTxPowerLevel();
            }
            double distance = Math.pow(10.0, ((double) txPower - rssi) / (10.0 * 2.2));
            distance = Math.round(distance * 10.0) / 10.0;
            if (distance < 0.3) distance = 0.3;

            // Стабильный угол на радаре на основе хеша стабильного ключа
            int angleDeg = Math.abs(stableKey.hashCode()) % 360;

            if (peer == null) {
                peer = new DiscoveredPeer();
                peer.id = stableKey;
                peer.address = address;
                peer.name = peerName;
                peer.deviceType = "android";
                peer.isRelay = true;
                peer.angleDeg = angleDeg;
                peer.rssi = rssi;
                Log.d(TAG, "Скан: обнаружен новый Gossip-пир " + stableKey + " (" + address + ", RSSI " + rssi + ")");
                probePeerInfo(device);
            } else {
                // Бесшовно обновляем динамический MAC-адрес без создания дубликата
                peer.address = address;
                // Плавное экспоненциальное сглаживание RSSI
                peer.rssi = (peer.rssi == 0) ? rssi : (int) (peer.rssi * 0.4 + rssi * 0.6);
            }

            peer.distanceMeters = distance;
            peer.lastSeen = System.currentTimeMillis();
            if (peerName != null && !peerName.startsWith("Gossip Node (")) {
                peer.name = peerName;
            }

            discoveredPeers.put(stableKey, peer);
            notifyPeersUpdated();
        } catch (Exception e) {
            Log.e(TAG, "Ошибка обработки ScanResult: " + e.getMessage());
        }
    }

    private final Set<String> probedAddresses = Collections.newSetFromMap(new ConcurrentHashMap<String, Boolean>());

    private void probePeerInfo(BluetoothDevice device) {
        if (device == null || !isMeshActive) return;
        String address = device.getAddress();
        if (address == null || probedAddresses.contains(address) || inboundConnectedAddresses.contains(address)) {
            return;
        }
        probedAddresses.add(address);
        mainHandler.postDelayed(() -> probedAddresses.remove(address), 45000);

        mainHandler.postDelayed(() -> {
            try {
                if (!isMeshActive || bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) return;
                Log.d(TAG, "Фоновое зондирование PEER_INFO для пира: " + address);

                BluetoothGattCallback probeCallback = new BluetoothGattCallback() {
                    private boolean handled = false;

                    @Override
                    public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {
                        super.onConnectionStateChange(gatt, status, newState);
                        if (newState == BluetoothProfile.STATE_CONNECTED && gatt != null) {
                            try {
                                gatt.requestConnectionPriority(BluetoothGatt.CONNECTION_PRIORITY_HIGH);
                            } catch (Exception ignored) {}
                            refreshDeviceCache(gatt);
                            gatt.discoverServices();
                        } else if (newState == BluetoothProfile.STATE_DISCONNECTED && gatt != null) {
                            try { gatt.close(); } catch (Exception ignored) {}
                        }
                    }

                    @Override
                    public void onServicesDiscovered(BluetoothGatt gatt, int status) {
                        super.onServicesDiscovered(gatt, status);
                        if (status == BluetoothGatt.GATT_SUCCESS && gatt != null) {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                                try {
                                    gatt.requestMtu(512);
                                    mainHandler.postDelayed(() -> {
                                        if (gatt != null && !handled) {
                                            readPeerInfoDirect(gatt);
                                        }
                                    }, 1200);
                                    return;
                                } catch (Exception e) {
                                    Log.w(TAG, "Ошибка запроса MTU в probePeerInfo: " + e.getMessage());
                                }
                            }
                            readPeerInfoDirect(gatt);
                        } else {
                            try { if (gatt != null) { gatt.disconnect(); gatt.close(); } } catch (Exception ignored) {}
                        }
                    }

                    @Override
                    public void onMtuChanged(BluetoothGatt gatt, int mtu, int status) {
                        super.onMtuChanged(gatt, mtu, status);
                        readPeerInfoDirect(gatt);
                    }

                    private void readPeerInfoDirect(BluetoothGatt gatt) {
                        if (handled || gatt == null) return;
                        BluetoothGattService svc = gatt.getService(GOSSIP_SERVICE_UUID);
                        if (svc == null) {
                            for (BluetoothGattService s : gatt.getServices()) {
                                if (s != null && s.getUuid() != null && s.getUuid().toString().toLowerCase().contains("fa21")) {
                                    svc = s;
                                    break;
                                }
                            }
                        }
                        if (svc != null) {
                            BluetoothGattCharacteristic peerInfoChar = svc.getCharacteristic(CHARACTERISTIC_PEER_INFO);
                            if (peerInfoChar == null) {
                                for (BluetoothGattCharacteristic c : svc.getCharacteristics()) {
                                    if (c != null && c.getUuid() != null && c.getUuid().toString().toLowerCase().contains("fa22")) {
                                        peerInfoChar = c;
                                        break;
                                    }
                                }
                            }
                            if (peerInfoChar != null) {
                                gatt.readCharacteristic(peerInfoChar);
                                return;
                            }
                        }
                        try { gatt.disconnect(); gatt.close(); } catch (Exception ignored) {}
                    }

                    @Override
                    public void onCharacteristicRead(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, int status) {
                        super.onCharacteristicRead(gatt, characteristic, status);
                        if (handled) return;
                        handled = true;
                        processPeerInfoPayload(address, characteristic.getValue());
                        try { gatt.disconnect(); gatt.close(); } catch (Exception ignored) {}
                    }

                    @Override
                    public void onCharacteristicRead(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, byte[] value, int status) {
                        super.onCharacteristicRead(gatt, characteristic, value, status);
                        if (handled) return;
                        handled = true;
                        processPeerInfoPayload(address, value);
                        try { gatt.disconnect(); gatt.close(); } catch (Exception ignored) {}
                    }
                };

                BluetoothGatt gatt;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    gatt = device.connectGatt(getContext(), false, probeCallback, BluetoothDevice.TRANSPORT_LE, BluetoothDevice.PHY_LE_1M_MASK);
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    gatt = device.connectGatt(getContext(), false, probeCallback, BluetoothDevice.TRANSPORT_LE);
                } else {
                    gatt = device.connectGatt(getContext(), false, probeCallback);
                }

                mainHandler.postDelayed(() -> {
                    if (gatt != null) {
                        try { gatt.disconnect(); gatt.close(); } catch (Exception ignored) {}
                    }
                }, 4000);

            } catch (Exception e) {
                Log.w(TAG, "Ошибка probePeerInfo: " + e.getMessage());
            }
        }, 400);
    }

    private void processPeerInfoPayload(String deviceAddress, byte[] value) {
        if (value == null || value.length == 0 || deviceAddress == null) return;
        try {
            JSONObject info = new JSONObject(new String(value, StandardCharsets.UTF_8));
            String remoteNodeId = info.optString("id", "");
            // Dual Identity: стабильный ключ строится из per-device идентичности пира (did),
            // аккаунт-хеш (id) сливал бы устройства одного аккаунта в одну запись радара.
            // Отсутствие did = старая версия пира: fallback на аккаунт-ключ как раньше.
            String remoteDeviceId = info.optString("did", "");
            String remoteAlias = info.has("alias") ? info.optString("alias", "") : info.optString("a", "");
            boolean remoteRelay = info.has("relay") ? info.optBoolean("relay", true) : (info.optInt("r", 1) == 1);
            if (!remoteNodeId.isEmpty()) {
                String stableKey = "mesh-" + deriveMeshShortId(!remoteDeviceId.isEmpty() ? remoteDeviceId : remoteNodeId);
                DiscoveredPeer peer = null;
                for (Map.Entry<String, DiscoveredPeer> entry : discoveredPeers.entrySet()) {
                    if (deviceAddress.equals(entry.getValue().address)) {
                        peer = entry.getValue();
                        discoveredPeers.remove(entry.getKey());
                        break;
                    }
                }
                if (peer == null) {
                    peer = new DiscoveredPeer();
                    peer.address = deviceAddress;
                    peer.deviceType = "android";
                    peer.rssi = -60;
                    peer.distanceMeters = 1.0;
                    peer.angleDeg = Math.abs(stableKey.hashCode()) % 360;
                }
                peer.id = stableKey;
                peer.nodeId = remoteNodeId;
                peer.isRelay = remoteRelay;
                if (!remoteAlias.isEmpty()) {
                    peer.name = remoteAlias;
                }
                JSONObject remotePrekeyBundle = info.optJSONObject("prekeyBundle");
                if (remotePrekeyBundle == null && info.has("pk")) {
                    JSONObject pk = info.optJSONObject("pk");
                    if (pk != null) {
                        boolean isB64 = "b64".equals(pk.optString("enc", ""));
                        String ik = pk.optString("ik", "");
                        if (isB64) ik = b64ToHex(ik);
                        String spk = pk.optString("spk", "");
                        String sig = pk.optString("sig", "");
                        if (isB64) {
                            spk = b64ToHex(spk);
                            sig = b64ToHex(sig);
                        }
                        remotePrekeyBundle = new JSONObject();
                        remotePrekeyBundle.put("identityKey", ik);
                        JSONObject spkObj = new JSONObject();
                        spkObj.put("key", spk);
                        spkObj.put("signature", sig);
                        remotePrekeyBundle.put("signedPrekey", spkObj);
                        if (pk.has("opk")) {
                            String opk = pk.optString("opk", "");
                            if (isB64) opk = b64ToHex(opk);
                            JSONObject opkObj = new JSONObject();
                            opkObj.put("key", opk);
                            opkObj.put("id", pk.optInt("opkId", pk.optInt("oi", 0)));
                            remotePrekeyBundle.put("oneTimePrekey", opkObj);
                        }
                    }
                } else if (remotePrekeyBundle == null && info.has("ik")) {
                    remotePrekeyBundle = new JSONObject();
                    remotePrekeyBundle.put("identityKey", info.optString("ik", ""));
                    JSONObject spkObj = new JSONObject();
                    spkObj.put("key", info.optString("spk", ""));
                    spkObj.put("signature", info.optString("sig", ""));
                    remotePrekeyBundle.put("signedPrekey", spkObj);
                    if (info.has("opk")) {
                        JSONObject opkObj = new JSONObject();
                        opkObj.put("key", info.optString("opk", ""));
                        opkObj.put("id", info.optInt("opkId", info.optInt("oi", 0)));
                        remotePrekeyBundle.put("oneTimePrekey", opkObj);
                    }
                }
                if (remotePrekeyBundle != null) {
                    peer.prekeyBundle = remotePrekeyBundle;
                }
                peer.lastSeen = System.currentTimeMillis();
                discoveredPeers.put(stableKey, peer);
                notifyPeersUpdated();
                Log.d(TAG, "PEER_INFO: пир " + deviceAddress + " идентифицирован как " + remoteAlias + " (ключ " + stableKey + ")");
            }
        } catch (Exception e) {
            Log.w(TAG, "Ошибка разбора PEER_INFO payload: " + e.getMessage());
        }
    }

    private void notifyPeersUpdated() {
        JSArray peersArray = new JSArray();
        for (DiscoveredPeer peer : discoveredPeers.values()) {
            peersArray.put(peer.toJSObject());
        }
        JSObject event = new JSObject();
        event.put("peers", peersArray);
        event.put("count", discoveredPeers.size());
        notifyListeners("onPeersUpdated", event);
    }

    @PluginMethod
    public void sendEnvelope(PluginCall call) {
        String targetAddress = call.getString("targetAddress");
        String envelopeJson = call.getString("envelopeJson");

        if (targetAddress == null || envelopeJson == null) {
            call.reject("Параметры targetAddress и envelopeJson обязательны");
            return;
        }

        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth отключен");
            return;
        }

        try {
            BluetoothDevice targetDevice = null;
            if (BluetoothAdapter.checkBluetoothAddress(targetAddress)) {
                targetDevice = bluetoothAdapter.getRemoteDevice(targetAddress);
            } else {
                DiscoveredPeer peer = discoveredPeers.get(targetAddress);
                if (peer != null && peer.address != null && BluetoothAdapter.checkBluetoothAddress(peer.address)) {
                    targetDevice = bluetoothAdapter.getRemoteDevice(peer.address);
                }
            }

            if (targetDevice == null) {
                call.reject("Устройство не найдено: " + targetAddress);
                return;
            }

            final byte[] fullPayload = envelopeJson.getBytes(StandardCharsets.UTF_8);
            if (fullPayload.length > MAX_ENVELOPE_SIZE) {
                call.reject("Размер конверта (" + fullPayload.length + " байт) превышает максимально допустимый лимит (" + MAX_ENVELOPE_SIZE + " байт)");
                return;
            }
            final short packetId = (short) (packetIdGenerator.getAndIncrement() & 0xFFFF);

            final BluetoothDevice finalTargetDevice = targetDevice;
            mainHandler.post(() -> {
                enqueueSendTask(call, () -> {
                    EnvelopeSendTask task = new EnvelopeSendTask(call, finalTargetDevice, fullPayload, packetId);
                    task.connect();
                });
            });
        } catch (SecurityException se) {
            call.reject("Ошибка доступа Bluetooth: " + se.getMessage());
        } catch (Exception e) {
            call.reject("Ошибка отправки пакета: " + e.getMessage());
        }
    }

    /** Одна активная GATT-задача за раз; остальные ждут в FIFO-очереди (гигиена стека). */
    private void enqueueSendTask(PluginCall call, Runnable task) {
        synchronized (pendingSendQueue) {
            if (sendInFlight) {
                if (pendingSendQueue.size() >= 30) {
                    // Защита от неограниченного роста: JS-прокачка ограничена попытками,
                    // но при неожиданном фонтане задач старые отбрасываем — дедуп на приёмнике
                    Log.w(TAG, "Очередь отправки переполнена (" + pendingSendQueue.size() + "), задача отброшена");
                    if (call != null) {
                        call.reject("send_queue_overflow");
                    }
                    return;
                }
                pendingSendQueue.add(new QueuedSendTask(call, task));
                return;
            }
            sendInFlight = true;
        }
        task.run();
    }

    /** Вызывается задачей при завершении (успех/провал) — запускает следующую из очереди. */
    private void onSendTaskFinished() {
        QueuedSendTask next = null;
        synchronized (pendingSendQueue) {
            if (pendingSendQueue.isEmpty()) {
                sendInFlight = false;
                return;
            }
            next = pendingSendQueue.poll();
        }
        if (next != null && next.task != null) {
            mainHandler.post(next.task);
        }
    }

    /**
     * Задача гарантированной доставки одного конверта по GATT.
     *
     * Последовательность: connect -> discoverServices (немедленно после коннекта) ->
     * requestMtu (после обнаружения сервисов, с fallback-таймером на случай молчаливого
     * игнорирования MTU-запроса старыми стеками) -> фрагментированная передача L2.
     *
     * Прежняя схема вызывала discoverServices ТОЛЬКО из onMtuChanged: на стеках Huawei /
     * старых Broadcom MTU-запрос до обнаружения сервисов молча игнорируется, коннект
     * зависал до watchdog и сообщение не доставлялось. Watchdog теперь масштабируется
     * от числа фрагментов: при дефолтном MTU 23 большой конверт передается дольше 4.5 c.
     */
    private static boolean refreshDeviceCache(BluetoothGatt gatt) {
        if (gatt == null) return false;
        try {
            java.lang.reflect.Method refreshMethod = gatt.getClass().getMethod("refresh");
            if (refreshMethod != null) {
                return (Boolean) refreshMethod.invoke(gatt);
            }
        } catch (Exception e) {
            Log.w(TAG, "Ошибка вызова refresh(): " + e.getMessage());
        }
        return false;
    }

    private class EnvelopeSendTask {
        private static final int MAX_CONNECT_ATTEMPTS = 3;
        private static final long MTU_FALLBACK_TIMEOUT_MS = 1200;
        private static final long BASE_WATCHDOG_MS = 8000;
        private static final long CHUNK_PACING_MS = 30;
        private static final int[] MTU_LADDER = new int[] { 512, 247, 185, 23 };

        private final PluginCall call;
        private final BluetoothDevice device;
        private final byte[] fullPayload;
        private final short packetId;

        private BluetoothGatt gatt;
        private BluetoothGattCharacteristic rxChar;
        private int negotiatedMtu = 23;
        private int mtuLadderIndex = 0;
        private Runnable mtuTimeoutRunnable = null;
        private List<byte[]> outgoingChunks = null;
        private int currentChunkIndex = 0;
        private int chunkRetryCount = 0;
        private int connectAttempt = 0;
        private int deferCount = 0;
        private boolean peerInfoHandled = false;
        private boolean sendingStarted = false;
        private boolean finished = false;
        private Runnable watchdog;

        EnvelopeSendTask(PluginCall call, BluetoothDevice device, byte[] fullPayload, short packetId) {
            this.call = call;
            this.device = device;
            this.fullPayload = fullPayload;
            this.packetId = packetId;
        }

        private final BluetoothGattCallback gattCallback = new BluetoothGattCallback() {
            @Override
            public void onConnectionStateChange(BluetoothGatt g, int status, int newState) {
                super.onConnectionStateChange(g, status, newState);
                if (newState == BluetoothProfile.STATE_CONNECTED && status == BluetoothGatt.GATT_SUCCESS) {
                    Log.d(TAG, "Подключено к GATT пира " + device.getAddress() + ", установка CONNECTION_PRIORITY_HIGH и запуск discoverServices...");
                    try {
                        g.requestConnectionPriority(BluetoothGatt.CONNECTION_PRIORITY_HIGH);
                    } catch (Exception e) {
                        Log.w(TAG, "Ошибка requestConnectionPriority: " + e.getMessage());
                    }
                    refreshDeviceCache(g);
                    mainHandler.postDelayed(() -> {
                        if (gatt == g && !finished) {
                            try {
                                g.discoverServices();
                            } catch (SecurityException se) {
                                Log.e(TAG, "SecurityException при discoverServices", se);
                            }
                        }
                    }, 100);
                } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    Log.d(TAG, "Отключено от GATT пира " + device.getAddress() + " (status=" + status + ", state=" + newState + ")");
                    safeCloseGatt(g);
                    if (!finished && !sendingStarted) {
                        scheduleReconnect();
                    }
                }
            }

            @Override
            public void onServicesDiscovered(BluetoothGatt g, int status) {
                super.onServicesDiscovered(g, status);
                if (finished) return;
                if (status != BluetoothGatt.GATT_SUCCESS) {
                    Log.w(TAG, "discoverServices завершился с ошибкой " + status + " у пира " + device.getAddress());
                    safeCloseGatt(g);
                    scheduleReconnect();
                    return;
                }
                BluetoothGattService svc = g.getService(GOSSIP_SERVICE_UUID);
                if (svc == null) {
                    for (BluetoothGattService s : g.getServices()) {
                        if (s != null && s.getUuid() != null) {
                            String uStr = s.getUuid().toString().toLowerCase();
                            if (uStr.contains("fa21") || GOSSIP_SERVICE_UUID.equals(s.getUuid())) {
                                svc = s;
                                break;
                            }
                        }
                    }
                }
                if (svc != null) {
                    rxChar = svc.getCharacteristic(CHARACTERISTIC_ENVELOPE_RX);
                    if (rxChar == null) {
                        for (BluetoothGattCharacteristic c : svc.getCharacteristics()) {
                            if (c != null && c.getUuid() != null) {
                                String cStr = c.getUuid().toString().toLowerCase();
                                if (cStr.contains("fa23") || CHARACTERISTIC_ENVELOPE_RX.equals(c.getUuid())) {
                                    rxChar = c;
                                    break;
                                }
                            }
                        }
                    }
                }
                if (svc == null || rxChar == null) {
                    Log.w(TAG, "Не найден сервис GossipBle или rxChar у пира " + device.getAddress() + " (всего сервисов: " + g.getServices().size() + ")");
                    safeCloseGatt(g);
                    scheduleReconnect();
                    return;
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    // Адаптивная лестница MTU (M2 / RFC-2026-004 § 4.3): 512 -> 247 -> 185 -> 23 ДО чтения PEER_INFO
                    mtuLadderIndex = 0;
                    tryRequestMtuStep(g);
                } else {
                    readPeerInfoAndStartSending(g);
                }
            }

            @Override
            public void onCharacteristicRead(BluetoothGatt g, BluetoothGattCharacteristic characteristic, int status) {
                super.onCharacteristicRead(g, characteristic, status);
                // Перегрузка для API < 33
                handlePeerInfoRead(g, characteristic, status, characteristic.getValue());
            }

            @Override
            public void onCharacteristicRead(BluetoothGatt g, BluetoothGattCharacteristic characteristic, byte[] value, int status) {
                super.onCharacteristicRead(g, characteristic, value, status);
                // Перегрузка для API 33+ (стек вызывает только ее)
                handlePeerInfoRead(g, characteristic, status, value);
            }

            @Override
            public void onMtuChanged(BluetoothGatt g, int mtu, int status) {
                super.onMtuChanged(g, mtu, status);
                cancelMtuTimeout();
                if (status == BluetoothGatt.GATT_SUCCESS && mtu > negotiatedMtu) {
                    negotiatedMtu = mtu;
                    Log.d(TAG, "GATT MTU успешно согласован: " + mtu + " (status=" + status + ") для пира " + device.getAddress());
                    readPeerInfoAndStartSending(g);
                } else {
                    Log.w(TAG, "onMtuChanged статус " + status + " для MTU " + mtu + ", переход к следующей ступени лестницы");
                    mtuLadderIndex++;
                    tryRequestMtuStep(g);
                }
            }
        };

        private void cancelMtuTimeout() {
            if (mtuTimeoutRunnable != null) {
                mainHandler.removeCallbacks(mtuTimeoutRunnable);
                mtuTimeoutRunnable = null;
            }
        }

        private void tryRequestMtuStep(BluetoothGatt g) {
            if (finished || sendingStarted || gatt == null || gatt != g) return;
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP || mtuLadderIndex >= MTU_LADDER.length) {
                readPeerInfoAndStartSending(g);
                return;
            }
            int targetMtu = MTU_LADDER[mtuLadderIndex];
            if (targetMtu <= 23) {
                Log.d(TAG, "Достигнут базовый MTU 23 в лестнице согласования для " + device.getAddress());
                negotiatedMtu = 23;
                readPeerInfoAndStartSending(g);
                return;
            }
            Log.d(TAG, "Запрос MTU " + targetMtu + " (ступень " + (mtuLadderIndex + 1) + "/" + MTU_LADDER.length + ") для " + device.getAddress());
            try {
                boolean requested = g.requestMtu(targetMtu);
                if (!requested) {
                    Log.w(TAG, "requestMtu(" + targetMtu + ") вернул false, переход к следующей ступени лестницы");
                    mtuLadderIndex++;
                    mainHandler.postDelayed(() -> tryRequestMtuStep(g), 50);
                    return;
                }
            } catch (Exception e) {
                Log.w(TAG, "Ошибка requestMtu(" + targetMtu + "): " + e.getMessage() + ", переход к следующей ступени");
                mtuLadderIndex++;
                mainHandler.postDelayed(() -> tryRequestMtuStep(g), 50);
                return;
            }

            cancelMtuTimeout();
            mtuTimeoutRunnable = () -> {
                if (!finished && !sendingStarted && gatt != null && gatt == g && !peerInfoHandled) {
                    Log.w(TAG, "Таймаут согласования MTU " + targetMtu + " от " + device.getAddress() + " (" + MTU_FALLBACK_TIMEOUT_MS + "мс), переход к следующей ступени");
                    mtuLadderIndex++;
                    tryRequestMtuStep(g);
                }
            };
            mainHandler.postDelayed(mtuTimeoutRunnable, MTU_FALLBACK_TIMEOUT_MS);
        }

        private void readPeerInfoAndStartSending(BluetoothGatt g) {
            if (finished || sendingStarted || gatt == null || gatt != g) {
                return;
            }
            if (peerInfoHandled) {
                startSending();
                return;
            }
            try {
                BluetoothGattService svc = g.getService(GOSSIP_SERVICE_UUID);
                if (svc == null) {
                    for (BluetoothGattService s : g.getServices()) {
                        if (s != null && s.getUuid() != null && s.getUuid().toString().toLowerCase().contains("fa21")) {
                            svc = s;
                            break;
                        }
                    }
                }
                BluetoothGattCharacteristic peerInfoChar = (svc != null) ? svc.getCharacteristic(CHARACTERISTIC_PEER_INFO) : null;
                if (peerInfoChar == null && svc != null) {
                    for (BluetoothGattCharacteristic c : svc.getCharacteristics()) {
                        if (c != null && c.getUuid() != null) {
                            String cStr = c.getUuid().toString().toLowerCase();
                            if (cStr.contains("fa22") || CHARACTERISTIC_PEER_INFO.equals(c.getUuid())) {
                                peerInfoChar = c;
                                break;
                            }
                        }
                    }
                }
                if (peerInfoChar != null) {
                    boolean readSuccess = g.readCharacteristic(peerInfoChar);
                    if (!readSuccess) {
                        Log.w(TAG, "readCharacteristic вернул false, сразу стартуем отправку");
                        startSending();
                    }
                } else {
                    startSending();
                }
            } catch (Exception e) {
                Log.w(TAG, "Ошибка чтения PEER_INFO: " + e.getMessage() + ", сразу стартуем отправку");
                startSending();
            }
        }

        void connect() {
            if (!isMeshActive) {
                finishFail("mesh_inactive");
                return;
            }
            // Антиколлизия: если этот пир уже подключен к нашему GATT-серверу как клиент,
            // встречное соединение той же пары зависает на стеках Android без колбэков.
            // Не отказываем сразу: входящая линия обычно закрывается за 1-2 секунды —
            // откладываем набор (до 4 раз по 1.5 с), чтобы попытка не сжигалась зря.
            if (inboundConnectedAddresses.contains(device.getAddress())) {
                if (deferCount < 4) {
                    deferCount++;
                    Log.d(TAG, "Антиколлизия: входящая линия от " + device.getAddress() + " активна, набор отложен (" + deferCount + "/4)");
                    mainHandler.postDelayed(() -> {
                        if (isMeshActive) {
                            connect();
                        } else {
                            finishFail("mesh_inactive");
                        }
                    }, 1500);
                    return;
                }
                finishFail("inbound_busy");
                return;
            }
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    gatt = device.connectGatt(getContext(), false, gattCallback, BluetoothDevice.TRANSPORT_LE, BluetoothDevice.PHY_LE_1M_MASK);
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    gatt = device.connectGatt(getContext(), false, gattCallback, BluetoothDevice.TRANSPORT_LE);
                } else {
                    gatt = device.connectGatt(getContext(), false, gattCallback);
                }
                if (gatt != null) {
                    scheduleWatchdog(BASE_WATCHDOG_MS);
                } else {
                    scheduleReconnect();
                }
            } catch (SecurityException se) {
                Log.e(TAG, "SecurityException при connectGatt", se);
                finishFail("security");
            } catch (Exception e) {
                Log.e(TAG, "Ошибка при connectGatt", e);
                scheduleReconnect();
            }
        }

        /**
         * Идентификация пира по характеристике PEER_INFO: полный nodeId и алиас.
         * Перекладывает запись пира с адресного ключа (peer-/по MAC) на стабильный
         * mesh-<hash(nodeId)> — иммунитет к ротации MAC, плюс человекочитаемое имя
         * вместо заглушки "Gossip Node (XXXX)".
         */
        private void handlePeerInfoRead(BluetoothGatt g, BluetoothGattCharacteristic characteristic, int status, byte[] value) {
            if (!CHARACTERISTIC_PEER_INFO.equals(characteristic != null ? characteristic.getUuid() : null)) {
                return;
            }
            if (peerInfoHandled) {
                // Android 13+ вызывает обе перегрузки onCharacteristicRead — второе выполнение
                // отправило бы повторный requestMtu и застопорило бы writeCharacteristic.
                return;
            }
            peerInfoHandled = true;
            if (status == BluetoothGatt.GATT_SUCCESS && value != null && value.length > 0) {
                processPeerInfoPayload(device.getAddress(), value);
            }
            // После идентификации стартуем передачу L2 фрагментов
            if (!finished && !sendingStarted && gatt != null && gatt == g) {
                startSending();
            }
        }

        private void scheduleReconnect() {
            cleanupGatt();
            if (!isMeshActive) {
                finishFail("mesh_inactive");
                return;
            }
            connectAttempt++;
            if (connectAttempt >= MAX_CONNECT_ATTEMPTS) {
                finishFail("connect_failed");
                return;
            }
            long backoffMs;
            if (connectAttempt == 1) {
                backoffMs = 1500 + (long) (Math.random() * 500);
            } else if (connectAttempt == 2) {
                backoffMs = 4000 + (long) (Math.random() * 1000);
            } else {
                backoffMs = 8000 + (long) (Math.random() * 1000);
            }
            Log.d(TAG, "GATT реконнект к " + device.getAddress() + " (попытка " + connectAttempt + "/" + MAX_CONNECT_ATTEMPTS + ") через " + backoffMs + " мс");
            mainHandler.postDelayed(() -> {
                if (isMeshActive) {
                    connect();
                } else {
                    finishFail("mesh_inactive");
                }
            }, backoffMs);
        }

        private void startSending() {
            if (finished || sendingStarted || rxChar == null || gatt == null) return;
            if (!isMeshActive) {
                finishFail("mesh_inactive");
                return;
            }
            sendingStarted = true;
            acquireMeshWakeLock(15000);
            try {
                gatt.requestConnectionPriority(BluetoothGatt.CONNECTION_PRIORITY_HIGH);
            } catch (Exception ignored) {}
            outgoingChunks = createL2Fragments(packetId, fullPayload, negotiatedMtu);
            if (outgoingChunks == null || outgoingChunks.isEmpty()) {
                Log.e(TAG, "Не удалось создать L2-фрагменты для отправки пакета (превышен лимит фрагментов >255)");
                finishFail("payload_too_large_for_mtu");
                return;
            }
            Log.d(TAG, "Отправка L2 пакета (" + fullPayload.length + " байт, " + outgoingChunks.size()
                + " фрагментов, MTU=" + negotiatedMtu + ") пиру " + device.getAddress());
            scheduleWatchdog(outgoingChunks.size() * 45L + 6000L);
            sendNextChunk();
        }

        private long calculateChunkBackoff(int retry) {
            // Exponential Backoff: 25..350 ms with randomized Jitter (до 10 попыток) (M2 / RFC-2026-004 § 4.3)
            long base = (long) (25.0 * Math.pow(1.4, Math.min(retry, 8)));
            long jitter = (long) (Math.random() * 20.0);
            return Math.min(350L, Math.max(25L, base + jitter));
        }

        private void sendNextChunk() {
            if (finished || gatt == null) return;
            if (outgoingChunks == null || currentChunkIndex >= outgoingChunks.size()) {
                Log.d(TAG, "Все L2 фрагменты (" + (outgoingChunks != null ? outgoingChunks.size() : 0) + ") переданы пиру " + device.getAddress());
                finishSuccess();
                BluetoothGatt g = gatt;
                gatt = null;
                mainHandler.postDelayed(() -> safeCloseGatt(g), 150);
                return;
            }
            byte[] chunk = outgoingChunks.get(currentChunkIndex);
            try {
                boolean accepted = false;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    int writeStatus = gatt.writeCharacteristic(rxChar, chunk, BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE);
                    accepted = (writeStatus == BluetoothGatt.GATT_SUCCESS);
                    if (!accepted) {
                        Log.w(TAG, "writeCharacteristic вернул статус " + writeStatus + " (GATT BUSY / 201) для фрагмента " + (currentChunkIndex + 1) + "/" + outgoingChunks.size() + " к " + device.getAddress());
                    }
                } else {
                    rxChar.setValue(chunk);
                    rxChar.setWriteType(BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE);
                    accepted = gatt.writeCharacteristic(rxChar);
                    if (!accepted) {
                        Log.w(TAG, "writeCharacteristic не принят стеком (GATT BUSY) для фрагмента " + (currentChunkIndex + 1) + " к " + device.getAddress());
                    }
                }
                if (accepted) {
                    chunkRetryCount = 0;
                    currentChunkIndex++;
                    mainHandler.postDelayed(this::sendNextChunk, CHUNK_PACING_MS);
                } else {
                    chunkRetryCount++;
                    if (chunkRetryCount > 10) {
                        Log.e(TAG, "Превышен лимит ретраев фрагмента " + (currentChunkIndex + 1) + " для " + device.getAddress());
                        finishFail("write_busy_limit");
                        return;
                    }
                    long backoffDelay = calculateChunkBackoff(chunkRetryCount);
                    Log.d(TAG, "Flow Control Backoff: повтор фрагмента " + (currentChunkIndex + 1) + " (попытка " + chunkRetryCount + "/10) через " + backoffDelay + " мс");
                    mainHandler.postDelayed(this::sendNextChunk, backoffDelay);
                }
            } catch (SecurityException se) {
                Log.e(TAG, "SecurityException при записи характеристики", se);
                finishFail("write_security");
                return;
            } catch (Exception e) {
                Log.e(TAG, "Ошибка записи фрагмента L2", e);
                finishFail("write_error");
                return;
            }
        }

        private void scheduleWatchdog(long timeoutMs) {
            cancelWatchdog();
            watchdog = () -> {
                Log.w(TAG, "GATT Watchdog Timeout (" + timeoutMs + "ms) для " + device.getAddress());
                if (!finished) {
                    if (!sendingStarted) {
                        scheduleReconnect();
                    } else {
                        finishFail("watchdog");
                    }
                }
            };
            if (gatt != null) {
                activeGatts.put(gatt, watchdog);
                mainHandler.postDelayed(watchdog, timeoutMs);
            }
        }

        private void cancelWatchdog() {
            if (watchdog != null) {
                mainHandler.removeCallbacks(watchdog);
                if (gatt != null) {
                    activeGatts.remove(gatt);
                }
                watchdog = null;
            }
        }

        private void finishSuccess() {
            if (finished) return;
            finished = true;
            cancelMtuTimeout();
            cancelWatchdog();
            releaseMeshWakeLock();
            onSendTaskFinished();
            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        }

        private void finishFail(String reason) {
            if (finished) return;
            finished = true;
            cancelMtuTimeout();
            cancelWatchdog();
            cleanupGatt();
            releaseMeshWakeLock();
            onSendTaskFinished();
            JSObject res = new JSObject();
            res.put("success", false);
            res.put("error", reason);
            call.resolve(res);
        }

        private void cleanupGatt() {
            if (gatt != null) {
                safeCloseGatt(gatt);
                gatt = null;
            }
        }
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        unregisterBluetoothStateReceiver();
        if (cleanupTask != null) {
            mainHandler.removeCallbacks(cleanupTask);
        }
        for (BluetoothGatt gatt : new ArrayList<>(activeGatts.keySet())) {
            safeCloseGatt(gatt);
        }
        activeGatts.clear();
        reassemblySessions.clear();
        stopMesh(null);
    }
}
