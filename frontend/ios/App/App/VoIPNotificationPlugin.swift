import Foundation
import Capacitor

@objc(VoIPNotificationPlugin)
public class VoIPNotificationPlugin: CAPPlugin {
    public static var instance: VoIPNotificationPlugin?
    public static var pendingCall: [String: Any]?
    public static var activeCallMetadata: [String: Any]?

    override public func load() {
        VoIPNotificationPlugin.instance = self
    }

    public static func setPendingCall(callId: String, chatId: String, callerName: String, mediaType: String) {
        let callData: [String: Any] = [
            "callId": callId,
            "chatId": chatId,
            "callerName": callerName,
            "mediaType": mediaType,
            "wasAnswered": false
        ]
        pendingCall = callData
        activeCallMetadata = callData
    }

    public static func setWasAnswered(_ answered: Bool) {
        if pendingCall != nil {
            pendingCall?["wasAnswered"] = answered
        }
        if activeCallMetadata != nil {
            activeCallMetadata?["wasAnswered"] = answered
        }
    }

    public static func clearPendingCall() {
        pendingCall = nil
        activeCallMetadata = nil
    }

    @objc func getPendingCall(_ call: CAPPluginCall) {
        var result = [String: Any]()
        if let callData = VoIPNotificationPlugin.pendingCall {
            result["pendingCall"] = callData
            VoIPNotificationPlugin.pendingCall = nil
        } else {
            result["pendingCall"] = NSNull()
        }
        call.resolve(result)
    }

    public func sendAnswerCall(callId: String, chatId: String, callerName: String, mediaType: String) {
        let data: [String: Any] = [
            "callId": callId,
            "chatId": chatId,
            "callerName": callerName,
            "mediaType": mediaType
        ]
        notifyListeners("answerCall", data: data)
    }

    public func sendEndCall(callId: String) {
        let data: [String: Any] = [
            "callId": callId
        ]
        notifyListeners("endCall", data: data)
    }
}
