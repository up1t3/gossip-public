package com.gossip.app;

import android.telecom.Connection;
import android.telecom.ConnectionRequest;
import android.telecom.ConnectionService;
import android.telecom.PhoneAccountHandle;
import android.telecom.TelecomManager;
import android.telecom.VideoProfile;
import android.net.Uri;
import android.os.Bundle;

public class VoIPConnectionService extends ConnectionService {
    public static VoIPConnection currentConnection = null;

    @Override
    public Connection onCreateIncomingConnection(PhoneAccountHandle connectionManagerPhoneAccount, ConnectionRequest request) {
        Bundle extras = request.getExtras();
        String callId = extras.getString("callId");
        String chatId = extras.getString("chatId");
        String callerName = extras.getString("callerName");
        String mediaType = extras.getString("mediaType", "video");

        // Передаем Context (this) в конструктор VoIPConnection
        VoIPConnection connection = new VoIPConnection(this, callId, chatId, callerName, mediaType);
        connection.setAddress(Uri.fromParts("tel", callerName != null ? callerName : "Unknown", null), TelecomManager.PRESENTATION_ALLOWED);
        connection.setCallerDisplayName(callerName != null ? callerName : "Unknown", TelecomManager.PRESENTATION_ALLOWED);
        
        if ("video".equals(mediaType)) {
            connection.setConnectionProperties(Connection.PROPERTY_SELF_MANAGED);
            connection.setVideoState(VideoProfile.STATE_BIDIRECTIONAL);
        } else {
            connection.setConnectionProperties(Connection.PROPERTY_SELF_MANAGED);
        }
        
        connection.setInitializing();
        currentConnection = connection;
        return connection;
    }

    @Override
    public Connection onCreateOutgoingConnection(PhoneAccountHandle connectionManagerPhoneAccount, ConnectionRequest request) {
        Bundle extras = request.getExtras();
        String callId = extras.getString("callId");
        String chatId = extras.getString("chatId");
        String callerName = extras.getString("callerName");
        String mediaType = extras.getString("mediaType", "video");

        // Передаем Context (this) в конструктор VoIPConnection
        VoIPConnection connection = new VoIPConnection(this, callId, chatId, callerName, mediaType);
        connection.setAddress(Uri.fromParts("tel", callerName != null ? callerName : "Unknown", null), TelecomManager.PRESENTATION_ALLOWED);
        connection.setCallerDisplayName(callerName != null ? callerName : "Unknown", TelecomManager.PRESENTATION_ALLOWED);
        connection.setDialing();
        currentConnection = connection;
        return connection;
    }
}
