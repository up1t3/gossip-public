import { registerPlugin } from '@capacitor/core';

export interface AudioSessionPluginInterface {
  setCommunicationMode(): Promise<void>;
  setNormalMode(): Promise<void>;
}

export const AudioSessionPlugin = registerPlugin<AudioSessionPluginInterface>('AudioSessionPlugin');
export default AudioSessionPlugin;
