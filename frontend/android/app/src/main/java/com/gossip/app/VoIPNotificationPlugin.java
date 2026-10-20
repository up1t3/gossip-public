package com.gossip.app;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "VoIPNotificationPlugin")
public class VoIPNotificationPlugin extends Plugin {
    private static final String TAG = "VoIPNotificationPlugin";
    private static VoIPNotificationPlugin instance;
    private static JSObject pendingCall = null;
    private static JSObject activeCallMetadata = null;

    @Override
    public void load() {
        instance = this;
    }

    public static VoIPNotificationPlugin getInstance() {
        return instance;
    }

    public static void setPendingCall(String callId, String chatId, String callerName, String mediaType) {
        setPendingCall(callId, chatId, callerName, mediaType, null);
    }

    public static void setPendingCall(String callId, String chatId, String callerName, String mediaType, String callerAvatar) {
        JSObject call = new JSObject();
        call.put("callId", callId);
        call.put("chatId", chatId);
        call.put("callerName", callerName);
        call.put("callerAvatar", callerAvatar != null ? callerAvatar : "");
        call.put("mediaType", mediaType);
        call.put("wasAnswered", false);
        pendingCall = call;
        activeCallMetadata = call;
    }

    public static void setWasAnswered(boolean answered) {
        if (pendingCall != null) {
            pendingCall.put("wasAnswered", answered);
        }
        if (activeCallMetadata != null) {
            activeCallMetadata.put("wasAnswered", answered);
        }
    }

    public static JSObject getActiveCallMetadata() {
        return activeCallMetadata;
    }

    public static void clearPendingCall() {
        pendingCall = null;
        activeCallMetadata = null;
    }

    @PluginMethod
    public void getPendingCall(PluginCall call) {
        JSObject result = new JSObject();
        if (pendingCall != null) {
            result.put("pendingCall", pendingCall);
            pendingCall = null;
        } else {
            result.put("pendingCall", null);
        }
        call.resolve(result);
    }

    @PluginMethod
    public void showIncomingCall(PluginCall call) {
        try {
            String callId = call.getString("callId");
            String chatId = call.getString("chatId");
            String callerName = call.getString("callerName", "Абонент");
            String callerAvatar = call.getString("callerAvatar", "");
            String mediaType = call.getString("mediaType", "video");

            if (callId == null || chatId == null) {
                call.reject("callId and chatId are required");
                return;
            }

            Log.d(TAG, "showIncomingCall invoked: callId=" + callId + ", callerName=" + callerName);
            setPendingCall(callId, chatId, callerName, mediaType, callerAvatar);

            Context context = getContext();
            if (context != null) {
                Intent serviceIntent = new Intent(context, VoIPForegroundService.class);
                Bundle extras = new Bundle();
                extras.putString("callId", callId);
                extras.putString("chatId", chatId);
                extras.putString("callerName", callerName);
                extras.putString("callerAvatar", callerAvatar);
                extras.putString("mediaType", mediaType);
                serviceIntent.putExtras(extras);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
            }
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to show incoming call notification", e);
            call.reject("Failed to show incoming call: " + e.getMessage());
        }
    }

    @PluginMethod
    public void dismissNotification(PluginCall call) {
        try {
            Log.d(TAG, "dismissNotification invoked: dismissing foreground notification without clearing call state");
            Context context = getContext();
            if (context != null) {
                try {
                    context.stopService(new Intent(context, VoIPForegroundService.class));
                } catch (Exception ignored) {}
                android.app.NotificationManager notificationManager = (android.app.NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (notificationManager != null) {
                    notificationManager.cancel(1001);
                }
            }
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to dismiss notification", e);
            call.reject("Failed to dismiss notification: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancelIncomingCall(PluginCall call) {
        try {
            Log.d(TAG, "cancelIncomingCall invoked");
            clearPendingCall();

            Context context = getContext();
            if (context != null) {
                try {
                    context.stopService(new Intent(context, VoIPForegroundService.class));
                } catch (Exception ignored) {}
                android.app.NotificationManager notificationManager = (android.app.NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (notificationManager != null) {
                    notificationManager.cancel(1001);
                }
            }
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to cancel incoming call notification", e);
            call.reject("Failed to cancel incoming call: " + e.getMessage());
        }
    }

    public void sendAnswerCall(String callId, String chatId, String callerName, String mediaType) {
        sendAnswerCall(callId, chatId, callerName, mediaType, null);
    }

    public void sendAnswerCall(String callId, String chatId, String callerName, String mediaType, String callerAvatar) {
        setWasAnswered(true);
        JSObject data = new JSObject();
        data.put("callId", callId);
        data.put("chatId", chatId);
        data.put("callerName", callerName);
        data.put("callerAvatar", callerAvatar != null ? callerAvatar : "");
        data.put("mediaType", mediaType);
        notifyListeners("answerCall", data);
    }

    public void sendEndCall(String callId) {
        if (activeCallMetadata != null && Boolean.TRUE.equals(activeCallMetadata.getBool("wasAnswered"))) {
            Log.d(TAG, "sendEndCall ignored because call was already answered and active in UI");
            return;
        }
        JSObject data = new JSObject();
        data.put("callId", callId);
        notifyListeners("endCall", data);
    }
}
