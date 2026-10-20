package com.gossip.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.telecom.PhoneAccount;
import android.telecom.PhoneAccountHandle;
import android.telecom.TelecomManager;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import androidx.core.app.NotificationCompat;

public class VoIPForegroundService extends Service {
    private static final String TAG = "VoIPForeground";
    private static final String CHANNEL_ID = "voip_call_channel";
    private static final int NOTIFICATION_ID = 1001;

    public static final String ACTION_STOP_SERVICE = "com.gossip.app.ACTION_STOP_SERVICE";

    private final Handler timeoutHandler = new Handler(Looper.getMainLooper());
    private final Runnable timeoutRunnable = new Runnable() {
        @Override
        public void run() {
            Log.d(TAG, "VoIP call ringing timeout reached (45s). Stopping service.");
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.cancel(NOTIFICATION_ID);
            }
            VoIPNotificationPlugin.clearPendingCall();
            try {
                stopForeground(true);
            } catch (Exception e) {}
            stopSelf();
        }
    };

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "onStartCommand action=" + (intent != null ? intent.getAction() : "null"));
        
        createNotificationChannel();

        if (intent != null && ACTION_STOP_SERVICE.equals(intent.getAction())) {
            Log.d(TAG, "Stopping foreground service via ACTION_STOP_SERVICE");
            timeoutHandler.removeCallbacks(timeoutRunnable);
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.cancel(NOTIFICATION_ID);
            }
            try {
                Notification stopNotification = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.sym_call_missed)
                    .setContentTitle("Вызов завершен")
                    .setPriority(NotificationCompat.PRIORITY_MIN)
                    .build();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    startForeground(NOTIFICATION_ID, stopNotification, ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL);
                } else {
                    startForeground(NOTIFICATION_ID, stopNotification);
                }
            } catch (Exception ignored) {}

            try {
                stopForeground(true);
            } catch (Exception ignored) {}
            stopSelf();
            return START_NOT_STICKY;
        }

        // Сбрасываем и перезапускаем таймер авто-отбоя звонка (45 сек)
        timeoutHandler.removeCallbacks(timeoutRunnable);
        timeoutHandler.postDelayed(timeoutRunnable, 45000);

        createNotificationChannel();

        Bundle extras = intent != null ? intent.getExtras() : null;
        String callId = extras != null ? extras.getString("callId") : "";
        String chatId = extras != null ? extras.getString("chatId") : "";
        String callerName = extras != null && extras.getString("callerName") != null ? extras.getString("callerName") : "Абонент";
        String callerAvatar = extras != null ? extras.getString("callerAvatar") : null;
        String mediaType = extras != null && extras.getString("mediaType") != null ? extras.getString("mediaType") : "video";

        if (callId != null && !callId.isEmpty()) {
            Log.d(TAG, "Установка pendingCall в VoIPNotificationPlugin для callId=" + callId);
            VoIPNotificationPlugin.setPendingCall(callId, chatId, callerName, mediaType, callerAvatar);
        }

        Intent openAppIntent = new Intent(this, MainActivity.class);
        if (extras != null) openAppIntent.putExtras(extras);
        openAppIntent.putExtra("callId", callId);
        openAppIntent.putExtra("chatId", chatId);
        openAppIntent.putExtra("callerName", callerName);
        openAppIntent.putExtra("callerAvatar", callerAvatar);
        openAppIntent.putExtra("mediaType", mediaType);
        openAppIntent.putExtra("wasAnswered", false);
        openAppIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        
        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
            this, 0, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.sym_call_incoming)
            .setContentTitle("Входящий вызов")
            .setContentText(callerName + ("video".equals(mediaType) ? " (Видеозвонок)" : " (Аудиозвонок)"))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setContentIntent(fullScreenPendingIntent)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setAutoCancel(true)
            .setOngoing(true)
            .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        return START_NOT_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "VoIP Calls",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifications for incoming VoIP calls");
            channel.enableLights(true);
            channel.setLightColor(Color.GREEN);
            channel.enableVibration(true);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void registerCallInTelecomManager(String callId, String chatId, String callerName, String mediaType) {
        try {
            TelecomManager telecomManager = (TelecomManager) getSystemService(Context.TELECOM_SERVICE);
            if (telecomManager != null) {
                ComponentName componentName = new ComponentName(this, VoIPConnectionService.class);
                PhoneAccountHandle phoneAccountHandle = new PhoneAccountHandle(componentName, "BoltalkaVoIPAccount");
                
                PhoneAccount phoneAccount = PhoneAccount.builder(phoneAccountHandle, "Boltalka VoIP")
                    .setCapabilities(PhoneAccount.CAPABILITY_SELF_MANAGED)
                    .build();
                telecomManager.registerPhoneAccount(phoneAccount);

                Bundle extras = new Bundle();
                extras.putString("callId", callId);
                extras.putString("chatId", chatId);
                extras.putString("callerName", callerName);
                extras.putString("mediaType", mediaType);

                Bundle telecomExtras = new Bundle();
                telecomExtras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, phoneAccountHandle);
                telecomExtras.putBundle(TelecomManager.EXTRA_INCOMING_CALL_EXTRAS, extras);

                VoIPNotificationPlugin.setPendingCall(callId, chatId, callerName, mediaType);

                telecomManager.addNewIncomingCall(phoneAccountHandle, telecomExtras);
                Log.d(TAG, "Call successfully registered in TelecomManager");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error registering call in TelecomManager: " + e.getMessage());
        }
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "onDestroy called, stopping foreground service");
        try {
            timeoutHandler.removeCallbacks(timeoutRunnable);
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.cancel(NOTIFICATION_ID);
            }
            stopForeground(true);
        } catch (Exception e) {}
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
