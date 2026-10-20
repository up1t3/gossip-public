import Foundation
import Capacitor
import AVFoundation

@objc(AudioSessionPlugin)
public class AudioSessionPlugin: CAPPlugin {
    
    @objc func setCommunicationMode(_ call: CAPPluginCall) {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.allowBluetooth, .defaultToSpeaker])
            try session.setPreferredSampleRate(48000.0)
            try session.setPreferredIOBufferDuration(0.02)
            try session.setActive(true)
            call.resolve()
        } catch {
            call.reject("Failed to configure audio session: \(error.localizedDescription)")
        }
    }
    
    @objc func setNormalMode(_ call: CAPPluginCall) {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setActive(false, options: .notifyOthersOnDeactivation)
            try session.setCategory(.soloAmbient, mode: .default)
            call.resolve()
        } catch {
            call.reject("Failed to deactivate audio session: \(error.localizedDescription)")
        }
    }
}
