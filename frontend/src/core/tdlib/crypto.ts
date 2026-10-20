// E:\Boltalka\frontend\src\core\tdlib\crypto.ts

export const SRP_N_HEX =
  "eeaf0ab9adb38dd69c33f80afa8fc5e86072618775ff3c0b9ea2314c9c256576d674df7496ea81d3383b4813d692c6e0e0d5d8e250b98be48e495c1d6089dad15dc7d7b46154d6b6ce8ef4ad69b15d4982559b297bcf1885c529f345aec71aee7977f3e1f577b2c1b9c37130267445973b2799d55a1de173631e959000f4108d";
export const SRP_N = BigInt("0x" + SRP_N_HEX);
export const SRP_G = 2n;

export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data as any);
  return new Uint8Array(hashBuffer);
}

export function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let res = 1n;
  base = base % mod;
  while (exp > 0n) {
    if (exp % 2n === 1n) {
      res = (res * base) % mod;
    }
    exp = exp / 2n;
    base = (base * base) % mod;
  }
  return res;
}

const SBOX = new Uint8Array([
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
  0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
  0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
  0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
  0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
  0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
  0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
  0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
  0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
  0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
  0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
  0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
  0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
  0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
  0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
]);

const INV_SBOX = new Uint8Array([
  0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e, 0x81, 0xf3, 0xd7, 0xfb,
  0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87, 0x34, 0x8e, 0x43, 0x44, 0xc4, 0xde, 0xe9, 0xcb,
  0x54, 0x7b, 0x94, 0x32, 0xa6, 0xc2, 0x23, 0x3d, 0xee, 0x4c, 0x95, 0x0b, 0x42, 0xfa, 0xc3, 0x4e,
  0x08, 0x2e, 0xa1, 0x66, 0x28, 0xd9, 0x24, 0xb2, 0x76, 0x5b, 0xa2, 0x49, 0x6d, 0x8b, 0xd1, 0x25,
  0x72, 0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16, 0xd4, 0xa4, 0x5c, 0xcc, 0x5d, 0x65, 0xb6, 0x92,
  0x6c, 0x70, 0x48, 0x50, 0xfd, 0xed, 0xb9, 0xda, 0x5e, 0x15, 0x46, 0x57, 0xa7, 0x8d, 0x9d, 0x84,
  0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a, 0xf7, 0xe4, 0x58, 0x05, 0xb8, 0xb3, 0x45, 0x06,
  0xd0, 0x2c, 0x1e, 0x8f, 0xca, 0x3f, 0x0f, 0x02, 0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b,
  0x3a, 0x91, 0x11, 0x41, 0x4f, 0x67, 0xdc, 0xea, 0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6, 0x73,
  0x96, 0xac, 0x74, 0x22, 0xe7, 0xad, 0x35, 0x85, 0xe2, 0xf9, 0x37, 0xe8, 0x1c, 0x75, 0xdf, 0x6e,
  0x47, 0xf1, 0x1a, 0x71, 0x1d, 0x29, 0xc5, 0x89, 0x6f, 0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b,
  0xfc, 0x56, 0x3e, 0x4b, 0xc6, 0xd2, 0x79, 0x20, 0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4,
  0x1f, 0xdd, 0xa8, 0x33, 0x88, 0x07, 0xc7, 0x31, 0xb1, 0x12, 0x10, 0x59, 0x27, 0x80, 0xec, 0x5f,
  0x60, 0x51, 0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d, 0x2d, 0xe5, 0x7a, 0x9f, 0x93, 0xc9, 0x9c, 0xef,
  0xa0, 0xe0, 0x3b, 0x4d, 0xae, 0x2a, 0xf5, 0xb0, 0xc8, 0xeb, 0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61,
  0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6, 0x26, 0xe1, 0x69, 0x14, 0x63, 0x55, 0x21, 0x0c, 0x7d
]);

const RCON = new Uint32Array([
  0x00000000, 0x01000000, 0x02000000, 0x04000000, 0x08000000,
  0x10000000, 0x20000000, 0x40000000, 0x80000000, 0x1b000000,
  0x36000000
]);

function subWord(w: number): number {
  return (SBOX[(w >> 24) & 0xff] << 24) |
         (SBOX[(w >> 16) & 0xff] << 16) |
         (SBOX[(w >> 8) & 0xff] << 8) |
         (SBOX[w & 0xff]);
}

function rotWord(w: number): number {
  return (w << 8) | (w >>> 24);
}

export function expandKey(key: Uint8Array): Uint32Array {
  const w = new Uint32Array(60);
  for (let i = 0; i < 8; i++) {
    w[i] = (key[i * 4] << 24) | (key[i * 4 + 1] << 16) | (key[i * 4 + 2] << 8) | key[i * 4 + 3];
  }
  for (let i = 8; i < 60; i++) {
    let temp = w[i - 1];
    if (i % 8 === 0) {
      temp = subWord(rotWord(temp)) ^ RCON[Math.floor(i / 8)];
    } else if (i % 8 === 4) {
      temp = subWord(temp);
    }
    w[i] = w[i - 8] ^ temp;
  }
  return w;
}

function addRoundKey(state: Uint8Array, roundKey: Uint32Array, offset: number) {
  for (let i = 0; i < 4; i++) {
    const k = roundKey[offset + i];
    state[i * 4] ^= (k >> 24) & 0xff;
    state[i * 4 + 1] ^= (k >> 16) & 0xff;
    state[i * 4 + 2] ^= (k >> 8) & 0xff;
    state[i * 4 + 3] ^= k & 0xff;
  }
}

function subBytes(state: Uint8Array) {
  for (let i = 0; i < 16; i++) {
    state[i] = SBOX[state[i]];
  }
}

function invSubBytes(state: Uint8Array) {
  for (let i = 0; i < 16; i++) {
    state[i] = INV_SBOX[state[i]];
  }
}

function shiftRows(state: Uint8Array) {
  const t = new Uint8Array(state);
  state[1] = t[5]; state[5] = t[9]; state[9] = t[13]; state[13] = t[1];
  state[2] = t[10]; state[10] = t[2]; state[6] = t[14]; state[14] = t[6];
  state[3] = t[15]; state[15] = t[11]; state[11] = t[7]; state[7] = t[3];
}

function invShiftRows(state: Uint8Array) {
  const t = new Uint8Array(state);
  state[1] = t[13]; state[5] = t[1]; state[9] = t[5]; state[13] = t[9];
  state[2] = t[10]; state[10] = t[2]; state[6] = t[14]; state[14] = t[6];
  state[3] = t[7]; state[7] = t[11]; state[11] = t[15]; state[15] = t[3];
}

function xtime(x: number): number {
  return ((x << 1) ^ (((x >> 7) & 1) * 0x1b)) & 0xff;
}

function mixColumns(state: Uint8Array) {
  for (let i = 0; i < 4; i++) {
    const o = i * 4;
    const s0 = state[o], s1 = state[o + 1], s2 = state[o + 2], s3 = state[o + 3];
    const h = s0 ^ s1 ^ s2 ^ s3;
    state[o]     = s0 ^ h ^ xtime(s0 ^ s1);
    state[o + 1] = s1 ^ h ^ xtime(s1 ^ s2);
    state[o + 2] = s2 ^ h ^ xtime(s2 ^ s3);
    state[o + 3] = s3 ^ h ^ xtime(s3 ^ s0);
  }
}

function mul(a: number, b: number): number {
  let p = 0;
  let tempA = a;
  let tempB = b;
  for (let i = 0; i < 8; i++) {
    if (tempB & 1) p ^= tempA;
    const hi = tempA & 0x80;
    tempA <<= 1;
    if (hi) tempA ^= 0x1b;
    tempA &= 0xff;
    tempB >>= 1;
  }
  return p;
}

function invMixColumns(state: Uint8Array) {
  for (let i = 0; i < 4; i++) {
    const o = i * 4;
    const s0 = state[o], s1 = state[o + 1], s2 = state[o + 2], s3 = state[o + 3];
    state[o]     = mul(s0, 0x0e) ^ mul(s1, 0x0b) ^ mul(s2, 0x0d) ^ mul(s3, 0x09);
    state[o + 1] = mul(s0, 0x09) ^ mul(s1, 0x0e) ^ mul(s2, 0x0b) ^ mul(s3, 0x0d);
    state[o + 2] = mul(s0, 0x0d) ^ mul(s1, 0x09) ^ mul(s2, 0x0e) ^ mul(s3, 0x0b);
    state[o + 3] = mul(s0, 0x0b) ^ mul(s1, 0x0d) ^ mul(s2, 0x09) ^ mul(s3, 0x0e);
  }
}

export function aes256_ecb_encrypt(block: Uint8Array, expandedKey: Uint32Array): Uint8Array {
  const state = new Uint8Array(block);
  addRoundKey(state, expandedKey, 0);

  for (let round = 1; round < 14; round++) {
    subBytes(state);
    shiftRows(state);
    mixColumns(state);
    addRoundKey(state, expandedKey, round * 4);
  }

  subBytes(state);
  shiftRows(state);
  addRoundKey(state, expandedKey, 14 * 4);

  return state;
}

export function aes256_ecb_decrypt(block: Uint8Array, expandedKey: Uint32Array): Uint8Array {
  const state = new Uint8Array(block);
  addRoundKey(state, expandedKey, 14 * 4);

  for (let round = 13; round > 0; round--) {
    invShiftRows(state);
    invSubBytes(state);
    addRoundKey(state, expandedKey, round * 4);
    invMixColumns(state);
  }

  invShiftRows(state);
  invSubBytes(state);
  addRoundKey(state, expandedKey, 0);

  return state;
}

export function encrypt_ige(data: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array {
  if (data.length % 16 !== 0) throw new Error("Data length must be a multiple of 16");
  if (iv.length !== 32) throw new Error("IV length must be exactly 32 bytes");
  const expandedKey = expandKey(key);
  const blocksCount = data.length / 16;
  let pPrev = iv.slice(0, 16);
  let cPrev = iv.slice(16, 32);
  const out = new Uint8Array(data.length);

  for (let i = 0; i < blocksCount; i++) {
    const offset = i * 16;
    const pI = data.slice(offset, offset + 16);
    const x = new Uint8Array(16);
    for (let j = 0; j < 16; j++) x[j] = pI[j] ^ cPrev[j];
    
    const encX = aes256_ecb_encrypt(x, expandedKey);
    
    const cI = new Uint8Array(16);
    for (let j = 0; j < 16; j++) cI[j] = encX[j] ^ pPrev[j];
    
    out.set(cI, offset);
    pPrev = pI;
    cPrev = cI;
  }
  return out;
}

export function decrypt_ige(data: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array {
  if (data.length % 16 !== 0) throw new Error("Data length must be a multiple of 16");
  if (iv.length !== 32) throw new Error("IV length must be exactly 32 bytes");
  const expandedKey = expandKey(key);
  const blocksCount = data.length / 16;
  let pPrev = iv.slice(0, 16);
  let cPrev = iv.slice(16, 32);
  const out = new Uint8Array(data.length);

  for (let i = 0; i < blocksCount; i++) {
    const offset = i * 16;
    const cI = data.slice(offset, offset + 16);
    const y = new Uint8Array(16);
    for (let j = 0; j < 16; j++) y[j] = cI[j] ^ pPrev[j];
    
    const decY = aes256_ecb_decrypt(y, expandedKey);
    
    const pI = new Uint8Array(16);
    for (let j = 0; j < 16; j++) pI[j] = decY[j] ^ cPrev[j];
    
    out.set(pI, offset);
    pPrev = pI;
    cPrev = cI;
  }
  return out;
}

export async function calc_client_keys(authKey: Uint8Array, msgKey: Uint8Array): Promise<[Uint8Array, Uint8Array]> {
  const bufA = new Uint8Array(msgKey.length + 36);
  bufA.set(msgKey, 0);
  bufA.set(authKey.subarray(0, 36), msgKey.length);
  const sha256_a = await sha256(bufA);

  const bufB = new Uint8Array(36 + msgKey.length);
  bufB.set(authKey.subarray(40, 76), 0);
  bufB.set(msgKey, 36);
  const sha256_b = await sha256(bufB);

  const key = new Uint8Array(32);
  key.set(sha256_a.subarray(0, 8), 0);
  key.set(sha256_b.subarray(8, 24), 8);
  key.set(sha256_a.subarray(24, 32), 24);

  const iv = new Uint8Array(32);
  iv.set(sha256_b.subarray(0, 8), 0);
  iv.set(sha256_a.subarray(8, 24), 8);
  iv.set(sha256_b.subarray(24, 32), 24);

  return [key, iv];
}

export async function calc_server_keys(authKey: Uint8Array, msgKey: Uint8Array): Promise<[Uint8Array, Uint8Array]> {
  const bufA = new Uint8Array(msgKey.length + 36);
  bufA.set(msgKey, 0);
  bufA.set(authKey.subarray(8, 44), msgKey.length);
  const sha256_a = await sha256(bufA);

  const bufB = new Uint8Array(36 + msgKey.length);
  bufB.set(authKey.subarray(48, 84), 0);
  bufB.set(msgKey, 36);
  const sha256_b = await sha256(bufB);

  const key = new Uint8Array(32);
  key.set(sha256_a.subarray(0, 8), 0);
  key.set(sha256_b.subarray(8, 24), 8);
  key.set(sha256_a.subarray(24, 32), 24);

  const iv = new Uint8Array(32);
  iv.set(sha256_b.subarray(0, 8), 0);
  iv.set(sha256_a.subarray(8, 24), 8);
  iv.set(sha256_b.subarray(24, 32), 24);

  return [key, iv];
}

// Вспомогательные функции кодирования/декодирования шестнадцатеричных строк
export function hexToBytes(hex: string): Uint8Array {
  const len = hex.length / 2;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}
