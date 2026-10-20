import { registerPlugin, PluginListenerHandle } from '@capacitor/core';

export interface PendingCall {
  callId: string;
  chatId: string;
  callerName: string;
  callerAvatar?: string;
  mediaType: 'audio' | 'video';
  wasAnswered?: boolean;
}

export interface VoIPNotificationPluginInterface {
  getPendingCall(): Promise<{ pendingCall: PendingCall | null }>;
  showIncomingCall(options: {
    callId: string;
    chatId: string;
    callerName: string;
    callerAvatar?: string;
    mediaType?: 'audio' | 'video';
  }): Promise<void>;
  cancelIncomingCall(options?: { callId?: string }): Promise<void>;
  dismissNotification(options?: { callId?: string }): Promise<void>;
  addListener(
    eventName: 'answerCall',
    listenerFunc: (data: PendingCall) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
  
  addListener(
    eventName: 'endCall',
    listenerFunc: (data: { callId: string }) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
}

export const VoIPNotificationPlugin = registerPlugin<VoIPNotificationPluginInterface>('VoIPNotificationPlugin');
export default VoIPNotificationPlugin;
