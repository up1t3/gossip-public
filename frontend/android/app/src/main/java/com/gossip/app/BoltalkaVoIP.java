package com.gossip.app;

import android.content.Intent;
import android.util.Log;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;
import org.webrtc.*;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "BoltalkaVoIP")
public class BoltalkaVoIP extends Plugin {
    private static final String TAG = "BoltalkaVoIP";
    
    private String currentCallId = null;
    private String mediaType = "video";
    
    private PeerConnectionFactory factory;
    private PeerConnection peerConnection;
    private AudioSource audioSource;
    private AudioTrack localAudioTrack;

    @PluginMethod
    public void initialize(PluginCall call) {
        String callId = call.getString("callId");
        String mediaType = call.getString("mediaType", "video");
        JSArray iceServersJson = call.getArray("iceServers");

        if (callId == null) {
            call.reject("callId is required");
            return;
        }

        this.currentCallId = callId;
        this.mediaType = mediaType;

        try {
            // 1. Парсинг ICE-серверов из TS
            List<PeerConnection.IceServer> iceServers = new ArrayList<>();
            if (iceServersJson != null) {
                for (int i = 0; i < iceServersJson.length(); i++) {
                    JSONObject server = iceServersJson.getJSONObject(i);
                    org.json.JSONArray urlsArray = server.optJSONArray("urls");
                    List<String> urls = new ArrayList<>();
                    if (urlsArray != null) {
                        for (int j = 0; j < urlsArray.length(); j++) {
                            urls.add(urlsArray.getString(j));
                        }
                    } else if (server.has("url")) {
                        urls.add(server.getString("url"));
                    }
                    
                    String username = server.optString("username", "");
                    String credential = server.optString("credential", "");

                    for (String url : urls) {
                        PeerConnection.IceServer.Builder builder = PeerConnection.IceServer.builder(url);
                        if (!username.isEmpty()) builder.setUsername(username);
                        if (!credential.isEmpty()) builder.setPassword(credential);
                        iceServers.add(builder.createIceServer());
                    }
                }
            }

            if (iceServers.isEmpty()) {
                iceServers.add(PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer());
            }

            // 2. Инициализация PeerConnectionFactory
            if (factory == null) {
                PeerConnectionFactory.InitializationOptions initializationOptions =
                        PeerConnectionFactory.InitializationOptions.builder(getContext())
                                .createInitializationOptions();
                PeerConnectionFactory.initialize(initializationOptions);
                PeerConnectionFactory.Options options = new PeerConnectionFactory.Options();
                factory = PeerConnectionFactory.builder()
                        .setOptions(options)
                        .createPeerConnectionFactory();
            }

            // 3. Конфигурация PeerConnection
            PeerConnection.RTCConfiguration rtcConfig = new PeerConnection.RTCConfiguration(iceServers);
            rtcConfig.sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN;

            peerConnection = factory.createPeerConnection(rtcConfig, new PeerConnection.Observer() {
                @Override
                public void onSignalingChange(PeerConnection.SignalingState signalingState) {}

                @Override
                public void onIceConnectionChange(PeerConnection.IceConnectionState newState) {
                    Log.d(TAG, "ICE Connection State: " + newState);
                }

                @Override
                public void onIceConnectionReceivingChange(boolean receiving) {}

                @Override
                public void onIceGatheringChange(PeerConnection.IceGatheringState newState) {}

                @Override
                public void onIceCandidate(IceCandidate candidate) {
                    // Передаем реальный сгенерированный ICE-кандидат на фронтенд
                    JSObject result = new JSObject();
                    JSObject candObj = new JSObject();
                    candObj.put("candidate", candidate.sdp);
                    candObj.put("sdpMid", candidate.sdpMid);
                    candObj.put("sdpMLineIndex", candidate.sdpMLineIndex);
                    result.put("candidate", candObj);
                    notifyListeners("iceCandidate", result);
                }

                @Override
                public void onIceCandidatesRemoved(IceCandidate[] candidates) {}

                @Override
                public void onAddStream(MediaStream stream) {}

                @Override
                public void onRemoveStream(MediaStream stream) {}

                @Override
                public void onDataChannel(DataChannel dataChannel) {}

                @Override
                public void onRenegotiationNeeded() {}

                @Override
                public void onAddTrack(RtpReceiver receiver, MediaStream[] mediaStreams) {
                    JSObject result = new JSObject();
                    result.put("trackId", receiver.track().id());
                    result.put("mediaType", receiver.track().kind());
                    notifyListeners("track", result);
                }
            });

            // 4. Захват аудио-потока
            audioSource = factory.createAudioSource(new MediaConstraints());
            localAudioTrack = factory.createAudioTrack("ARDAMSa0", audioSource);
            localAudioTrack.setEnabled(true);
            peerConnection.addTrack(localAudioTrack, Collections.singletonList("stream_id"));

            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Initialization failed", e);
            call.reject("Initialization failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void createOffer(PluginCall call) {
        String callId = call.getString("callId");
        if (callId == null || !callId.equals(currentCallId) || peerConnection == null) {
            call.reject("Invalid state or callId");
            return;
        }

        MediaConstraints constraints = new MediaConstraints();
        constraints.mandatory.add(new MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"));
        constraints.mandatory.add(new MediaConstraints.KeyValuePair("OfferToReceiveVideo", "true"));

        peerConnection.createOffer(new SdpObserver() {
            @Override
            public void onCreateSuccess(SessionDescription desc) {
                peerConnection.setLocalDescription(new SdpObserver() {
                    @Override
                    public void onCreateSuccess(SessionDescription s) {}
                    @Override
                    public void onSetSuccess() {
                        JSObject result = new JSObject();
                        result.put("sdp", desc.description);
                        call.resolve(result);
                    }
                    @Override
                    public void onCreateFailure(String s) {
                        call.reject("SetLocalDescription failed: " + s);
                    }
                    @Override
                    public void onSetFailure(String s) {
                        call.reject("SetLocalDescription failed: " + s);
                    }
                }, desc);
            }

            @Override
            public void onSetSuccess() {}
            @Override
            public void onCreateFailure(String s) {
                call.reject("CreateOffer failed: " + s);
            }
            @Override
            public void onSetFailure(String s) {
                call.reject("CreateOffer failed: " + s);
            }
        }, constraints);
    }

    @PluginMethod
    public void createAnswer(PluginCall call) {
        String callId = call.getString("callId");
        if (callId == null || !callId.equals(currentCallId) || peerConnection == null) {
            call.reject("Invalid state or callId");
            return;
        }

        MediaConstraints constraints = new MediaConstraints();
        peerConnection.createAnswer(new SdpObserver() {
            @Override
            public void onCreateSuccess(SessionDescription desc) {
                peerConnection.setLocalDescription(new SdpObserver() {
                    @Override
                    public void onCreateSuccess(SessionDescription s) {}
                    @Override
                    public void onSetSuccess() {
                        JSObject result = new JSObject();
                        result.put("sdp", desc.description);
                        call.resolve(result);
                    }
                    @Override
                    public void onCreateFailure(String s) {
                        call.reject("SetLocalDescription failed: " + s);
                    }
                    @Override
                    public void onSetFailure(String s) {
                        call.reject("SetLocalDescription failed: " + s);
                    }
                }, desc);
            }

            @Override
            public void onSetSuccess() {}
            @Override
            public void onCreateFailure(String s) {
                call.reject("CreateAnswer failed: " + s);
            }
            @Override
            public void onSetFailure(String s) {
                call.reject("CreateAnswer failed: " + s);
            }
        }, constraints);
    }

    @PluginMethod
    public void setRemoteDescription(PluginCall call) {
        String callId = call.getString("callId");
        String sdp = call.getString("sdp");

        if (callId == null || !callId.equals(currentCallId) || peerConnection == null) {
            call.reject("Invalid state or callId");
            return;
        }

        SessionDescription desc = new SessionDescription(SessionDescription.Type.ANSWER, sdp);
        peerConnection.setRemoteDescription(new SdpObserver() {
            @Override
            public void onCreateSuccess(SessionDescription s) {}
            @Override
            public void onSetSuccess() {
                call.resolve();
            }
            @Override
            public void onCreateFailure(String s) {}
            @Override
            public void onSetFailure(String s) {
                call.reject("SetRemoteDescription failed: " + s);
            }
        }, desc);
    }

    @PluginMethod
    public void addIceCandidate(PluginCall call) {
        String callId = call.getString("callId");
        JSObject candidateObj = call.getObject("candidate");

        if (callId == null || !callId.equals(currentCallId) || peerConnection == null) {
            call.reject("Invalid state or callId");
            return;
        }

        try {
            String sdp = candidateObj.getString("candidate");
            String sdpMid = candidateObj.getString("sdpMid");
            int sdpMLineIndex = candidateObj.getInt("sdpMLineIndex");
            IceCandidate candidate = new IceCandidate(sdpMid, sdpMLineIndex, sdp);
            peerConnection.addIceCandidate(candidate);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to add ICE candidate: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setRemoteSubstream(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void endCall(PluginCall call) {
        if (peerConnection != null) {
            peerConnection.close();
            peerConnection = null;
        }
        if (localAudioTrack != null) {
            localAudioTrack.setEnabled(false);
            localAudioTrack.dispose();
            localAudioTrack = null;
        }
        if (audioSource != null) {
            audioSource.dispose();
            audioSource = null;
        }
        
        this.currentCallId = null;

        if (VoIPConnectionService.currentConnection != null) {
            VoIPConnectionService.currentConnection.onDisconnect();
            VoIPConnectionService.currentConnection = null;
        } else {
            try {
                Intent stopIntent = new Intent(getContext(), VoIPForegroundService.class);
                stopIntent.setAction(VoIPForegroundService.ACTION_STOP_SERVICE);
                getContext().startService(stopIntent);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        call.resolve();
    }
}
