// frontend/src/utils/__tests__/premiumSecurityAndVoice.test.ts
import {
  setDecoyPin,
  verifyDecoyPin,
  hasDecoyPin,
  getDecoyPinAction,
  clearDecoyPin,
  buildDecoyChats,
  isDecoyModeActive,
  setDecoyModeActive,
} from '../premiumSecurity';
import { VOICE_CHANGER_PRESETS, buildVoiceChangerGraph } from '../voiceChanger';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  };
}

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', { value: createMemoryStorage(), writable: true });
}
if (typeof globalThis.sessionStorage === 'undefined') {
  Object.defineProperty(globalThis, 'sessionStorage', { value: createMemoryStorage(), writable: true });
}

export async function runPremiumSecurityAndVoiceTests(): Promise<number> {
  let passed = 0;
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`Assertion failed: ${msg}`);
  };

  // 1. Decoy PIN salted SHA-256 verification
  localStorage.clear();
  sessionStorage.clear();
  const user = 'Agent_007';
  assert(hasDecoyPin(user) === false, 'Initially no decoy PIN');
  await setDecoyPin(user, '9988', 'wipe_local');
  assert(hasDecoyPin(user) === true, 'Decoy PIN must exist after setDecoyPin');
  assert(getDecoyPinAction(user) === 'wipe_local', 'Decoy PIN action must match');
  const storedRaw = localStorage.getItem('gossip_decoy_pin_hash_agent_007');
  assert(Boolean(storedRaw) && !storedRaw!.includes('9988') && storedRaw!.length === 64, 'Salted SHA-256 hex stored');
  assert((await verifyDecoyPin(user, '9988')) === true, 'Correct decoy PIN verifies');
  assert((await verifyDecoyPin(user, '1234')) === false, 'Wrong decoy PIN rejected');
  clearDecoyPin(user);
  assert(hasDecoyPin(user) === false, 'Decoy PIN cleared');
  passed += 1;

  // 2. Decoy Mode session state & harmless decoy chats
  localStorage.clear();
  sessionStorage.clear();
  assert(isDecoyModeActive() === false, 'Initially decoy mode inactive');
  setDecoyModeActive(true);
  assert(isDecoyModeActive() === true, 'Decoy mode active after set');
  const chats = buildDecoyChats();
  assert(chats.length >= 3 && chats[0].id === 'decoy_notes_shopping', 'Decoy chats generated');
  setDecoyModeActive(false);
  assert(isDecoyModeActive() === false, 'Decoy mode deactivated');
  passed += 1;

  // 3. Voice Changer DSP presets & graph
  const presetIds = VOICE_CHANGER_PRESETS.map((p) => p.id);
  assert(
    JSON.stringify(presetIds) === JSON.stringify(['original', 'deep', 'cyber', 'radio', 'helium']),
    '5 DSP presets exposed'
  );
  const original = VOICE_CHANGER_PRESETS.find((p) => p.id === 'original');
  assert(original?.isPremiumOnly === false, 'original preset is free');
  const proPresets = VOICE_CHANGER_PRESETS.filter((p) => p.id !== 'original');
  assert(proPresets.every((p) => p.isPremiumOnly), '4 modulation presets are PRO');
  const fakeStream = { getTracks: () => [] } as unknown as MediaStream;
  const graph = buildVoiceChangerGraph(fakeStream, 'deep');
  assert(Boolean(graph.recordingStream) && typeof graph.cleanup === 'function', 'VoiceChangerGraph built');
  graph.cleanup();
  passed += 1;

  return passed;
}

