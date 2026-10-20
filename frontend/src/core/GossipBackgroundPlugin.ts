import { registerPlugin } from '@capacitor/core';

export interface GossipBackgroundPluginInterface {
  configure(options: { userId: string; sessionToken?: string; backendUrl?: string }): Promise<void>;
  getInitialChatId(): Promise<{
    chatId?: string | null;
    senderId?: string | null;
    senderName?: string | null;
    messageText?: string | null;
  }>;
  startService(): Promise<void>;
  stopService(): Promise<void>;
}

export const GossipBackgroundPlugin = registerPlugin<GossipBackgroundPluginInterface>('GossipBackground');
export default GossipBackgroundPlugin;
