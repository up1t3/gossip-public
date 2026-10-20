#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(AudioSessionPlugin, "AudioSessionPlugin",
           CAP_PLUGIN_METHOD(setCommunicationMode, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(setNormalMode, CAPPluginReturnPromise);
)
