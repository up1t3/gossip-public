package com.gossip.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class VoIPMessagingService extends FirebaseMessagingService {
    private static final String TAG = "VoIPMessagingService";
    private static final String MESSAGES_CHANNEL_ID = "gossip_messages";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "onMessageReceived called from: " + remoteMessage.getFrom());

        // 1. Проверка наличия данных в Push-уведомлении
        Map<String, String> data = remoteMessage.getData();
        if (data != null && !data.isEmpty()) {
            String type = data.get("type");
            String callId = data.get("callId");
            if (callId == null) callId = data.get("call_id");
            
            // Если вызов отменен звонящим или завершен -> НЕМЕДЛЕННО останавливаем службу и убираем уведомление
            if ("call_declined".equals(type) || "call_missed".equals(type) || "call_ended".equals(type) || "call_canceled".equals(type)) {
                Log.d(TAG, "VoIP push: Call was canceled/declined (type=" + type + ", callId=" + callId + "). Stopping VoIPForegroundService immediately.");
                VoIPNotificationPlugin.clearPendingCall();
                try {
                    stopService(new Intent(this, VoIPForegroundService.class));
                    NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                    if (notificationManager != null) {
                        notificationManager.cancel(1001);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error stopping service on call decline", e);
                }
                return;
            }

            // Если это входящий звонок -> передаем в службу VoIPForegroundService ТОЛЬКО если приложение свернуто/заблокировано
            if (callId != null && !callId.trim().isEmpty() && ("incoming_call".equals(type) || type == null)) {
                Log.d(TAG, "Incoming VoIP push for callId: " + callId + ", isAppInForeground: " + MainActivity.isAppInForeground());
                
                // Если приложение открыто перед пользователем, звонок приходит напрямую через WebSocket в React UI
                if (MainActivity.isAppInForeground()) {
                    Log.d(TAG, "App is active in foreground. Skipping duplicate system VoIP notification.");
                    return;
                }

                Intent serviceIntent = new Intent(this, VoIPForegroundService.class);
                Bundle extras = new Bundle();
                for (Map.Entry<String, String> entry : data.entrySet()) {
                    extras.putString(entry.getKey(), entry.getValue());
                }
                String chatId = data.get("chatId");
                if (chatId == null) chatId = data.get("chat_id");
                String callerName = data.get("callerName");
                if (callerName == null) callerName = data.get("caller_name");
                String callerAvatar = data.get("callerAvatar");
                if (callerAvatar == null) callerAvatar = data.get("caller_avatar");
                String mediaType = data.get("mediaType");
                if (mediaType == null) mediaType = data.get("media_type");

                extras.putString("callId", callId);
                if (chatId != null) extras.putString("chatId", chatId);
                if (callerName != null) extras.putString("callerName", callerName);
                if (callerAvatar != null) extras.putString("callerAvatar", callerAvatar);
                if (mediaType != null) extras.putString("mediaType", mediaType);
                serviceIntent.putExtras(extras);
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent);
                } else {
                    startService(serviceIntent);
                }
                return;
            }

            // Если это текстовое/медиа сообщение -> создаем системное уведомление в шторке
            handleIncomingChatMessage(data, remoteMessage.getNotification());
            return;
        }

        // Если пришло Notification-only сообщение без Data блока
        if (remoteMessage.getNotification() != null) {
            handleIncomingChatMessage(null, remoteMessage.getNotification());
        }
    }

    private void handleIncomingChatMessage(Map<String, String> data, RemoteMessage.Notification notification) {
        try {
            String chatId = null;
            String senderName = null;
            String text = null;

            String senderId = null;
            if (data != null) {
                chatId = data.get("chatId");
                if (chatId == null) chatId = data.get("chat_id");
                
                senderId = data.get("senderId");
                if (senderId == null) senderId = data.get("sender_id");

                senderName = data.get("senderName");
                if (senderName == null) senderName = data.get("title");
                
                text = data.get("text");
                if (text == null) text = data.get("body");
            }

            if (notification != null) {
                if (senderName == null || senderName.trim().isEmpty()) {
                    senderName = notification.getTitle();
                }
                if (text == null || text.trim().isEmpty()) {
                    text = notification.getBody();
                }
            }

            if (senderName == null || senderName.trim().isEmpty()) {
                senderName = "Gossip";
            }
            if (text == null || text.trim().isEmpty()) {
                text = "Новое сообщение";
            }

            // Коррекция: если chatId совпадает с нашим ID, реальным чатом является отправитель senderId
            SharedPreferences prefs = getSharedPreferences("gossip_prefs", Context.MODE_PRIVATE);
            String myUserId = prefs.getString("user_id", "");
            if (myUserId != null && !myUserId.isEmpty() && myUserId.equals(chatId) && senderId != null && !senderId.isEmpty()) {
                chatId = senderId;
            }

            Log.d(TAG, "Показ системного уведомления о сообщении: title=" + senderName + ", text=" + text + ", chatId=" + chatId + ", senderId=" + senderId);

            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager == null) return;

            // Создаем канал уведомлений gossip_messages на Android 8.0+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                    MESSAGES_CHANNEL_ID,
                    "Сообщения Gossip",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Уведомления о входящих сообщениях Gossip");
                channel.enableLights(true);
                channel.setLightColor(Color.parseColor("#10B981"));
                channel.enableVibration(true);
                channel.setShowBadge(true);
                channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
                notificationManager.createNotificationChannel(channel);
            }

            // Настройка PendingIntent для открытия MainActivity и перехода в чат
            Intent intent = new Intent(this, MainActivity.class);
            intent.setAction(Intent.ACTION_VIEW);
            intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            if (chatId != null && !chatId.trim().isEmpty()) {
                intent.putExtra("chatId", chatId);
            }
            if (senderId != null && !senderId.trim().isEmpty()) {
                intent.putExtra("senderId", senderId);
            }
            if (senderName != null && !senderName.trim().isEmpty()) {
                intent.putExtra("senderName", senderName);
            }
            if (text != null && !text.trim().isEmpty()) {
                intent.putExtra("messageText", text);
            }

            int notificationId = (chatId != null && !chatId.isEmpty()) 
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
        } catch (Exception e) {
            Log.e(TAG, "Ошибка при показе входящего уведомления о сообщении: ", e);
        }
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "Refreshed FCM token: " + token);
        try {
            SharedPreferences prefs = getSharedPreferences("gossip_prefs", Context.MODE_PRIVATE);
            prefs.edit().putString("fcm_token", token).apply();
        } catch (Exception e) {
            Log.e(TAG, "Ошибка сохранения refreshed FCM токена: ", e);
        }
    }
}
