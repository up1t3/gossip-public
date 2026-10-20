#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(VoIPNotificationPlugin, "VoIPNotificationPlugin",
           CAP_PLUGIN_METHOD(getPendingCall, CAPPluginReturnPromise);
)
