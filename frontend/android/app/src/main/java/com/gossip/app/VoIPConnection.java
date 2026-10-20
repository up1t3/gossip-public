package com.gossip.app;

import android.content.Context;
import android.content.Intent;
import android.telecom.Connection;
import android.telecom.DisconnectCause;

public class VoIPConnection extends Connection {
    private final Context context;
    private final String callId;
    private final String chatId;
    private final String callerName;
    private final String mediaType;

    public VoIPConnection(Context context, String callId, String chatId, String callerName, String mediaType) {
        this.context = context;
        this.callId = callId;
        this.chatId = chatId;
        this.callerName = callerName;
        this.mediaType = mediaType;
    }

    private void stopVoIPService() {
        if (context != null) {
            Intent stopIntent = new Intent(context, VoIPForegroundService.class);
            stopIntent.setAction(VoIPForegroundService.ACTION_STOP_SERVICE);
            context.startService(stopIntent);
        }
    }

    @Override
    public void onAnswer() {
        super.onAnswer();
        setActive();
        if (callId != null && !callId.isEmpty()) {
            VoIPNotificationPlugin.setPendingCall(callId, chatId, callerName, mediaType);
        }
        VoIPNotificationPlugin.setWasAnswered(true);
        stopVoIPService();
        if (context != null) {
            try {
                Intent launchIntent = new Intent(context, Class.forName(context.getPackageName() + ".MainActivity"));
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                context.startActivity(launchIntent);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        VoIPNotificationPlugin plugin = VoIPNotificationPlugin.getInstance();
        if (plugin != null) {
            plugin.sendAnswerCall(callId, chatId, callerName, mediaType);
        }
    }

    @Override
    public void onReject() {
        super.onReject();
        setDisconnected(new DisconnectCause(DisconnectCause.REJECTED));
        stopVoIPService();
        VoIPNotificationPlugin.clearPendingCall();
        destroy();
        VoIPNotificationPlugin plugin = VoIPNotificationPlugin.getInstance();
        if (plugin != null) {
            plugin.sendEndCall(callId);
        }
    }

    @Override
    public void onDisconnect() {
        super.onDisconnect();
        setDisconnected(new DisconnectCause(DisconnectCause.LOCAL));
        stopVoIPService();
        destroy();
        VoIPNotificationPlugin plugin = VoIPNotificationPlugin.getInstance();
        if (plugin != null) {
            plugin.sendEndCall(callId);
        }
    }
}
