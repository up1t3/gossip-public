package com.gossip.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import org.json.JSONObject;

public class GossipBackgroundService extends Service {
    private static final String TAG = "GossipBgService";
    private static final String BACKGROUND_CHANNEL_ID = "gossip_background_channel";
    private static final String MESSAGES_CHANNEL_ID = "gossip_messages";
    private static final int NOTIFICATION_ID = 2002;

    public static final String ACTION_STOP = "com.gossip.app.ACTION_STOP";

    private PowerManager.WakeLock wakeLock = null;
    private final Object wakeLockMutex = new Object();
    private volatile boolean isPollingActive = false;
    private Thread pollingThread = null;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "onStartCommand called");
        
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            Log.d(TAG, "Stopping service via ACTION_STOP");
            stopAllTasks();
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        createNotificationChannels();

        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification notification = new NotificationCompat.Builder(this, BACKGROUND_CHANNEL_ID)
            .setContentTitle("Gossip")
            .setContentText("Фоновое соединение активно")
            .setSmallIcon(getApplicationInfo().icon != 0 ? getApplicationInfo().icon : android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setVisibility(NotificationCompat.VISIBILITY_SECRET)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            // Android 14+ (UPSIDE_DOWN_CAKE) требует явного указания обоих типов FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE | FOREGROUND_SERVICE_TYPE_DATA_SYNC
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE | ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        Log.d(TAG, "Service started in foreground mode, initializing transient wake lock and starting push polling");
        initWakeLock();
        startPushPolling();

        return START_STICKY;
    }

    private void initWakeLock() {
        try {
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                synchronized (wakeLockMutex) {
                    if (wakeLock == null) {
                        wakeLock = powerManager.newWakeLock(
                            PowerManager.PARTIAL_WAKE_LOCK,
                            "Gossip::TransientPollWakeLock"
                        );
                        wakeLock.setReferenceCounted(false);
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error initializing WakeLock", e);
        }
    }

    private void acquireTransientWakeLock(long timeoutMs) {
        synchronized (wakeLockMutex) {
            if (wakeLock != null) {
                try {
                    wakeLock.acquire(timeoutMs);
                } catch (Exception e) {
                    Log.e(TAG, "Error acquiring transient WakeLock", e);
                }
            }
        }
    }

    private void releaseTransientWakeLock() {
        synchronized (wakeLockMutex) {
            if (wakeLock != null && wakeLock.isHeld()) {
                try {
                    wakeLock.release();
                } catch (Exception e) {
                    Log.e(TAG, "Error releasing transient WakeLock", e);
                }
            }
        }
    }

    /**
     * Фоновый сетевой поток для опроса сервера и автономной доставки сообщений/звонков в фоне
     */
    private void startPushPolling() {
        if (isPollingActive) return;
        isPollingActive = true;

        pollingThread = new Thread(new Runnable() {
            @Override
            public void run() {
                Log.d(TAG, "Push polling worker thread started (energy-optimized)");
                int consecutiveErrors = 0;
                int consecutiveEmptyResponses = 0;

                while (isPollingActive) {
                    try {
                        SharedPreferences prefs = getSharedPreferences("gossip_prefs", Context.MODE_PRIVATE);
                        String userId = prefs.getString("user_id", "");
                        String sessionToken = prefs.getString("session_token", "");
                        String backendUrl = prefs.getString("backend_url", "https://skuf-net.ru");

                        if (userId == null || userId.trim().isEmpty()) {
                            // Пользователь еще не вошел в систему, ждем 5 секунд
                            Thread.sleep(5000);
                            continue;
                        }

                        if (backendUrl == null || backendUrl.isEmpty()) {
                            backendUrl = "https://skuf-net.ru";
                        }
                        if (backendUrl.endsWith("/")) {
                            backendUrl = backendUrl.substring(0, backendUrl.length() - 1);
                        }

                        // Удерживаем WakeLock строго на время сетевой транзакции (макс. 10 секунд)
                        acquireTransientWakeLock(10000);
                        try {
                            String requestUrl = backendUrl + "/api/v1/devices/poll-push?user_id=" + userId;
                            URL url = new URL(requestUrl);
                            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                            conn.setRequestMethod("GET");
                            conn.setConnectTimeout(8000);
                            conn.setReadTimeout(12000);
                            if (sessionToken != null && !sessionToken.isEmpty()) {
                                conn.setRequestProperty("Authorization", "Bearer " + sessionToken);
                            }

                            int responseCode = conn.getResponseCode();
                            if (responseCode == 200) {
                                BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                                StringBuilder response = new StringBuilder();
                                String inputLine;
                                while ((inputLine = in.readLine()) != null) {
                                    response.append(inputLine);
                                }
                                in.close();

                                String jsonStr = response.toString().trim();
                                if (!jsonStr.isEmpty() && !jsonStr.equals("{}")) {
                                    Log.d(TAG, "Received pending push from backend poll: " + jsonStr);
                                    JSONObject pushData = new JSONObject(jsonStr);
                                    handlePendingPushPayload(pushData);
                                    consecutiveEmptyResponses = 0;
                                } else {
                                    consecutiveEmptyResponses++;
                                }
                                consecutiveErrors = 0;
                            } else {
                                consecutiveErrors++;
                            }
                        } finally {
                            releaseTransientWakeLock();
                        }

                        // Адаптивная пауза между проверками: процессор переходит в сон
                        long sleepDelayMs;
                        if (consecutiveErrors > 0) {
                            // Backoff при сетевых ошибках: 5s, 10s, ... до 60s
                            sleepDelayMs = Math.min(60000, 5000 + (consecutiveErrors * 5000));
                        } else if (consecutiveEmptyResponses > 5) {
                            // Энергосбережение при отсутствии трафика
                            sleepDelayMs = 10000;
                        } else {
                            sleepDelayMs = 5000;
                        }
                        Thread.sleep(sleepDelayMs);

                    } catch (InterruptedException e) {
                        break;
                    } catch (Exception e) {
                        consecutiveErrors++;
                        long backoffMs = Math.min(60000, 5000 + (consecutiveErrors * 5000));
                        try {
                            Thread.sleep(backoffMs);
                        } catch (InterruptedException ie) {
                            break;
                        }
                    }
                }
                Log.d(TAG, "Push polling worker thread finished");
            }
        }, "GossipPushPollingThread");
        pollingThread.start();
    }

    private void handlePendingPushPayload(JSONObject pushData) {
        try {
            String type = pushData.optString("type", "message");
            
            // 1. Входящий VoIP звонок
            if ("incoming_call".equals(type) || pushData.has("callId")) {
                String callId = pushData.optString("callId", "");
                String chatId = pushData.optString("chatId", "");
                String callerName = pushData.optString("callerName", "Абонент");
                String mediaType = pushData.optString("mediaType", "video");

                if (!callId.isEmpty()) {
                    Log.d(TAG, "Launching VoIPForegroundService from polling worker for callId: " + callId);
                    Intent serviceIntent = new Intent(this, VoIPForegroundService.class);
                    Bundle extras = new Bundle();
                    extras.putString("callId", callId);
                    extras.putString("chatId", chatId);
                    extras.putString("callerName", callerName);
                    extras.putString("mediaType", mediaType);
                    serviceIntent.putExtras(extras);

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(serviceIntent);
                    } else {
                        startService(serviceIntent);
                    }
                    return;
                }
            }

            // 2. Входящее сообщение в чате
            String chatId = pushData.optString("chat_id", pushData.optString("chatId", ""));
            String senderId = pushData.optString("senderId", pushData.optString("sender_id", ""));
            String senderName = pushData.optString("senderName", pushData.optString("title", "Gossip"));
            String text = pushData.optString("text", pushData.optString("body", "Новое сообщение"));

            if (senderName.isEmpty()) senderName = "Gossip";
            if (text.isEmpty()) text = "Новое сообщение";

            // Коррекция: если chatId совпадает с нашим ID, реальным чатом является отправитель senderId
            SharedPreferences prefs = getSharedPreferences("gossip_prefs", Context.MODE_PRIVATE);
            String myUserId = prefs.getString("user_id", "");
            if (myUserId != null && !myUserId.isEmpty() && myUserId.equals(chatId) && !senderId.isEmpty()) {
                chatId = senderId;
            }

            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager == null) return;

            Intent intent = new Intent(this, MainActivity.class);
            intent.setAction(Intent.ACTION_VIEW);
            intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            if (!chatId.isEmpty()) {
                intent.putExtra("chatId", chatId);
            }
            if (!senderId.isEmpty()) {
                intent.putExtra("senderId", senderId);
            }
            if (!senderName.isEmpty()) {
                intent.putExtra("senderName", senderName);
            }
            if (!text.isEmpty()) {
                intent.putExtra("messageText", text);
            }

            int notificationId = (!chatId.isEmpty()) 
                ? Math.abs(chatId.hashCode()) 
                : (int) (System.currentTimeMillis() % 100000);

            PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                notificationId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, MESSAGES_CHANNEL_ID)
                .setSmallIcon(getApplicationInfo().icon != 0 ? getApplicationInfo().icon : android.R.drawable.ic_dialog_info)
                .setContentTitle(senderName)
                .setContentText(text)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setDefaults(NotificationCompat.DEFAULT_ALL);

            notificationManager.notify(notificationId, builder.build());
            Log.d(TAG, "Notification successfully posted for chat " + chatId);
        } catch (Exception e) {
            Log.e(TAG, "Error handling pending push payload in service: ", e);
        }
    }

    private void stopAllTasks() {
        isPollingActive = false;

        if (pollingThread != null) {
            pollingThread.interrupt();
            pollingThread = null;
        }
        releaseTransientWakeLock();
        synchronized (wakeLockMutex) {
            wakeLock = null;
        }
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                // 1. Канал для служебного Foreground Service
                NotificationChannel bgChannel = new NotificationChannel(
                    BACKGROUND_CHANNEL_ID,
                    "Gossip Background Service",
                    NotificationManager.IMPORTANCE_MIN
                );
                bgChannel.setDescription("Системное фоновое соединение Gossip для получения сообщений");
                bgChannel.enableLights(false);
                bgChannel.enableVibration(false);
                bgChannel.setShowBadge(false);
                bgChannel.setLockscreenVisibility(Notification.VISIBILITY_SECRET);
                manager.createNotificationChannel(bgChannel);

                // 2. Канал для входящих сообщений
                NotificationChannel msgChannel = new NotificationChannel(
                    MESSAGES_CHANNEL_ID,
                    "Сообщения Gossip",
                    NotificationManager.IMPORTANCE_HIGH
                );
                msgChannel.setDescription("Уведомления о входящих личных и групповых сообщениях");
                msgChannel.enableLights(true);
                msgChannel.setLightColor(Color.parseColor("#10B981"));
                msgChannel.enableVibration(true);
                msgChannel.setShowBadge(true);
                msgChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                manager.createNotificationChannel(msgChannel);
            }
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "Service destroyed, stopping polling worker and releasing transient locks");
        stopAllTasks();
        super.onDestroy();
    }
}
