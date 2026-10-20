import Foundation
import Capacitor
import WebRTC

@objc(BoltalkaVoIP)
public class BoltalkaVoIP: CAPPlugin {
    private var currentCallId: String?
    private var mediaType: String = "video"
    
    private var factory: RTCPeerConnectionFactory?
    private var peerConnection: RTCPeerConnection?
    private var localAudioTrack: RTCAudioTrack?

    @objc func initialize(_ call: CAPPluginCall) {
        guard let callId = call.getString("callId") else {
            call.reject("callId is required")
            return
        }
        self.currentCallId = callId
        self.mediaType = call.getString("mediaType") ?? "video"
        
        let iceServersJson = call.getArray("iceServers") ?? []
        var iceServers = [RTCIceServer]()

        for server in iceServersJson {
            if let serverDict = server as? [String: Any] {
                let urls: [String]
                if let urlStr = serverDict["url"] as? String {
                    urls = [urlStr]
                } else if let urlsArr = serverDict["urls"] as? [String] {
                    urls = urlsArr
                } else {
                    continue
                }
                let username = serverDict["username"] as? String
                let credential = serverDict["credential"] as? String
                
                let iceServer = RTCIceServer(urlStrings: urls, username: username, credential: credential)
                iceServers.append(iceServer)
            }
        }

        if iceServers.isEmpty {
            iceServers.append(RTCIceServer(urlStrings: ["stun:stun.l.google.com:19302"]))
        }

        // Инициализация WebRTC
        if factory == nil {
            RTCInitializeSSL()
            let videoEncoderFactory = RTCDefaultVideoEncoderFactory()
            let videoDecoderFactory = RTCDefaultVideoDecoderFactory()
            factory = RTCPeerConnectionFactory(encoderFactory: videoEncoderFactory, decoderFactory: videoDecoderFactory)
        }

        let configuration = RTCConfiguration()
        configuration.iceServers = iceServers
        configuration.sdpSemantics = .unifiedPlan

        let constraints = RTCMediaConstraints(mandatoryConstraints: nil, optionalConstraints: nil)
        
        peerConnection = factory?.peerConnection(with: configuration, constraints: constraints, delegate: self)
        
        // Создание и подключение аудио-трека
        let audioSource = factory?.audioSource(with: nil)
        localAudioTrack = factory?.audioTrack(with: audioSource!, trackId: "ARDAMSa0")
        localAudioTrack?.isEnabled = true
        
        if let audioTrack = localAudioTrack {
            peerConnection?.add(audioTrack, streamIds: ["stream_id"])
        }

        call.resolve()
    }

    @objc func createOffer(_ call: CAPPluginCall) {
        guard let callId = call.getString("callId"), callId == currentCallId, let pc = peerConnection else {
            call.reject("Invalid state or callId")
            return
        }

        let mandatoryConstraints = [
            "OfferToReceiveAudio": "true",
            "OfferToReceiveVideo": "true"
        ]
        let sdpConstraints = RTCMediaConstraints(mandatoryConstraints: mandatoryConstraints, optionalConstraints: nil)

        pc.offer(for: sdpConstraints, completionHandler: { [weak self] (sdp, error) in
            guard let self = self else { return }
            if let error = error {
                call.reject("CreateOffer failed: \(error.localizedDescription)")
                return
            }
            guard let sdp = sdp else {
                call.reject("SDP is nil")
                return
            }

            self.peerConnection?.setLocalDescription(sdp, completionHandler: { (error) in
                if let error = error {
                    call.reject("SetLocalDescription failed: \(error.localizedDescription)")
                    return
                }
                call.resolve(["sdp": sdp.sdpDescription])
            })
        })
    }

    @objc func setRemoteDescription(_ call: CAPPluginCall) {
        guard let callId = call.getString("callId"), callId == currentCallId, let pc = peerConnection else {
            call.reject("Invalid state or callId")
            return
        }
        guard let sdpString = call.getString("sdp") else {
            call.reject("sdp is required")
            return
        }

        let sessionDescription = RTCSessionDescription(type: .answer, sdp: sdpString)
        pc.setRemoteDescription(sessionDescription, completionHandler: { (error) in
            if let error = error {
                call.reject("SetRemoteDescription failed: \(error.localizedDescription)")
                return
            }
            call.resolve()
        })
    }

    @objc func addIceCandidate(_ call: CAPPluginCall) {
        guard let callId = call.getString("callId"), callId == currentCallId, let pc = peerConnection else {
            call.reject("Invalid state or callId")
            return
        }
        guard let candidateDict = call.getObject("candidate"),
              let sdp = candidateDict["candidate"] as? String,
              let sdpMid = candidateDict["sdpMid"] as? String,
              let sdpMLineIndex = candidateDict["sdpMLineIndex"] as? Int32 else {
            call.reject("Invalid candidate properties")
            return
        }

        let candidate = RTCIceCandidate(sdp: sdp, sdpMLineIndex: sdpMLineIndex, sdpMid: sdpMid)
        pc.add(candidate)
        call.resolve()
    }

    @objc func setRemoteSubstream(_ call: CAPPluginCall) {
        call.resolve()
    }

    @objc func endCall(_ call: CAPPluginCall) {
        peerConnection?.close()
        peerConnection = nil
        localAudioTrack = nil
        self.currentCallId = nil
        call.resolve()
    }
}

// MARK: - RTCPeerConnectionDelegate
extension BoltalkaVoIP: RTCPeerConnectionDelegate {
    public func peerConnection(_ peerConnection: RTCPeerConnection, didChange stateChanged: RTCSignalingState) {}
    public func peerConnection(_ peerConnection: RTCPeerConnection, didAdd stream: RTCMediaStream) {}
    public func peerConnection(_ peerConnection: RTCPeerConnection, didRemove stream: RTCMediaStream) {}
    public func peerConnectionShouldTriggerRenegotiation(_ peerConnection: RTCPeerConnection) {}
    
    public func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceConnectionState) {
        print("[VoIP] ICE Connection State: \(newState.rawValue)")
    }
    
    public func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceGatheringState) {}
    
    public func peerConnection(_ peerConnection: RTCPeerConnection, didGenerate candidate: RTCIceCandidate) {
        let result: [String: Any] = [
            "candidate": [
                "candidate": candidate.sdp,
                "sdpMid": candidate.sdpMid ?? "0",
                "sdpMLineIndex": candidate.sdpMLineIndex
            ]
        ]
        notifyListeners("iceCandidate", data: result)
    }
    
    public func peerConnection(_ peerConnection: RTCPeerConnection, didRemove candidates: [RTCIceCandidate]) {}
    public func peerConnection(_ peerConnection: RTCPeerConnection, didOpen dataChannel: RTCDataChannel) {}
    
    public func peerConnection(_ peerConnection: RTCPeerConnection, didAdd receiver: RTCRtpReceiver, streams: [RTCMediaStream]) {
        let result: [String: Any] = [
            "trackId": receiver.track?.trackId ?? "",
            "mediaType": receiver.track?.kind ?? ""
        ]
        notifyListeners("track", data: result)
    }
}
