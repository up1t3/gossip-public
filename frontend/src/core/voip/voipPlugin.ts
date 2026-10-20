import { registerPlugin, PluginListenerHandle } from '@capacitor/core';

export interface BoltalkaVoIPPlugin {
  initialize(options: { callId: string; mediaType: 'audio' | 'video'; iceServers?: any[] }): Promise<void>;
  createOffer(options: { callId: string }): Promise<{ sdp: string }>;
  createAnswer(options: { callId: string; sdp: string }): Promise<{ sdp: string }>;
  setRemoteDescription(options: { callId: string; sdp: string }): Promise<void>;
  addIceCandidate(options: { callId: string; candidate: any }): Promise<void>;
  setRemoteSubstream(options: { substream: 0 | 1 | 2 }): Promise<void>;
  endCall(options: { callId: string }): Promise<void>;
  
  addListener(
    eventName: 'iceCandidate',
    listenerFunc: (data: { candidate: any }) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
  
  addListener(
    eventName: 'track',
    listenerFunc: (data: { trackId: string; mediaType: string }) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
}

export const BoltalkaVoIP = registerPlugin<BoltalkaVoIPPlugin>('BoltalkaVoIP');
export default BoltalkaVoIP;
