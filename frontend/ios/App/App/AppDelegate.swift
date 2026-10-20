import UIKit
import Capacitor
import PushKit
import CallKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, PKPushRegistryDelegate, CXProviderDelegate {

    var window: UIWindow?
    var voipRegistry: PKPushRegistry?
    var provider: CXProvider?
    var callController = CXCallController()

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let configuration = CXProviderConfiguration(localizedName: "Boltalka")
        configuration.supportsVideo = true
        configuration.supportedHandleTypes = [.phoneNumber]
        provider = CXProvider(configuration: configuration)
        provider?.setDelegate(self, queue: nil)

        voipRegistry = PKPushRegistry(queue: DispatchQueue.main)
        voipRegistry?.delegate = self
        voipRegistry?.desiredPushTypes = [.voIP]

        return true
    }

    // MARK: - PKPushRegistryDelegate

    func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
        let token = pushCredentials.token.map { String(format: "%02.2hhx", $0) }.joined()
        print("[VoIP] PushKit token: \(token)")
    }

    func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
        print("[VoIP] Received VoIP push: \(payload.dictionaryPayload)")
        
        let callId = payload.dictionaryPayload["callId"] as? String ?? UUID().uuidString
        let callerName = payload.dictionaryPayload["callerName"] as? String ?? "Абонент"
        let chatId = payload.dictionaryPayload["chatId"] as? String ?? ""
        let mediaType = payload.dictionaryPayload["mediaType"] as? String ?? "video"

        VoIPNotificationPlugin.setPendingCall(callId: callId, chatId: chatId, callerName: callerName, mediaType: mediaType)

        reportNewIncomingCall(uuid: UUID(uuidString: callId) ?? UUID(), handle: callerName, hasVideo: mediaType == "video", completion: completion)
    }

    func reportNewIncomingCall(uuid: UUID, handle: String, hasVideo: Bool, completion: @escaping () -> Void) {
        let update = CXCallUpdate()
        update.remoteHandle = CXHandle(type: .phoneNumber, value: handle)
        update.hasVideo = hasVideo
        update.localizedCallerName = handle

        provider?.reportNewIncomingCall(with: uuid, update: update, completion: { error in
            if let error = error {
                print("[VoIP] CallKit error: \(error.localizedDescription)")
            } else {
                print("[VoIP] CallKit call reported successfully")
            }
            completion()
        })
    }

    // MARK: - CXProviderDelegate

    func providerDidReset(_ provider: CXProvider) {
        print("[VoIP] Provider did reset")
    }

    func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
        print("[VoIP] Provider performed CXAnswerCallAction")
        action.fulfill()
        
        VoIPNotificationPlugin.setWasAnswered(true)
        
        if let callId = VoIPNotificationPlugin.activeCallMetadata?["callId"] as? String,
           let chatId = VoIPNotificationPlugin.activeCallMetadata?["chatId"] as? String,
           let callerName = VoIPNotificationPlugin.activeCallMetadata?["callerName"] as? String,
           let mediaType = VoIPNotificationPlugin.activeCallMetadata?["mediaType"] as? String {
            VoIPNotificationPlugin.instance?.sendAnswerCall(callId: callId, chatId: chatId, callerName: callerName, mediaType: mediaType)
        }
    }

    func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
        print("[VoIP] Provider performed CXEndCallAction")
        action.fulfill()
        
        if let callId = VoIPNotificationPlugin.activeCallMetadata?["callId"] as? String {
            VoIPNotificationPlugin.instance?.sendEndCall(callId: callId)
        }
        VoIPNotificationPlugin.clearPendingCall()
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
