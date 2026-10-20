#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(BoltalkaVoIP, "BoltalkaVoIP",
           CAP_PLUGIN_METHOD(initialize, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(createOffer, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(createAnswer, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(setRemoteDescription, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(addIceCandidate, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(setRemoteSubstream, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(endCall, CAPPluginReturnPromise);
)
