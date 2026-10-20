// frontend/src/core/crypto/srp.ts
import { SRP_N_HEX, SRP_N, SRP_G, sha256, modPow, hexToBytes, bytesToHex } from "../tdlib/crypto";

// SRP_K = sha256(N_bytes + [2])
let srpKPromise: Promise<bigint> | null = null;

export async function getSrpK(): Promise<bigint> {
  if (srpKPromise) return srpKPromise;
  
  const N_bytes = hexToBytes(SRP_N_HEX);
  const data = new Uint8Array(N_bytes.length + 1);
  data.set(N_bytes, 0);
  data[N_bytes.length] = 2; // b'\x02'
  
  srpKPromise = sha256(data).then(hash => {
    let k = 0n;
    for (let i = 0; i < hash.length; i++) {
      k = (k << 8n) + BigInt(hash[i]);
    }
    return k;
  });
  
  return srpKPromise;
}

export function padBigint(val: bigint, sizeBytes: number = 128): Uint8Array {
  const hex = val.toString(16).padStart(sizeBytes * 2, "0");
  return hexToBytes(hex);
}

export async function srpCalculateX(saltHex: string, username: string, password: string): Promise<bigint> {
  const encoder = new TextEncoder();
  const upHash = await sha256(encoder.encode(`${username}:${password}`));
  const saltBytes = hexToBytes(saltHex);
  const data = new Uint8Array(saltBytes.length + upHash.length);
  data.set(saltBytes, 0);
  data.set(upHash, saltBytes.length);
  
  const hash = await sha256(data);
  let x = 0n;
  for (let i = 0; i < hash.length; i++) {
    x = (x << 8n) + BigInt(hash[i]);
  }
  return x;
}

export async function srpGenerateVerifier(saltHex: string, username: string, password: string): Promise<string> {
  const x = await srpCalculateX(saltHex, username, password);
  const v = modPow(SRP_G, x, SRP_N);
  return v.toString(16);
}

export function srpGenerateEphemeral(): { a: bigint, A: bigint } {
  // Генерация случайного секретного a (32 байта)
  const aBytes = new Uint8Array(32);
  crypto.getRandomValues(aBytes);
  
  let a = 0n;
  for (let i = 0; i < aBytes.length; i++) {
    a = (a << 8n) + BigInt(aBytes[i]);
  }
  
  a = (a % (SRP_N - 1n)) + 1n;
  const A = modPow(SRP_G, a, SRP_N);
  
  return { a, A };
}

export async function srpCalculateU(A: bigint, B: bigint): Promise<bigint> {
  const ABuf = padBigint(A);
  const BBuf = padBigint(B);
  const data = new Uint8Array(ABuf.length + BBuf.length);
  data.set(ABuf, 0);
  data.set(BBuf, ABuf.length);
  
  const hash = await sha256(data);
  let u = 0n;
  for (let i = 0; i < hash.length; i++) {
    u = (u << 8n) + BigInt(hash[i]);
  }
  return u;
}

export async function srpCalculateClientS(
  a: bigint,
  _A: bigint,
  B: bigint,
  x: bigint,
  u: bigint
): Promise<bigint> {
  const k = await getSrpK();
  
  // S = (B - k * g^x) ^ (a + u * x) mod N
  const gX = modPow(SRP_G, x, SRP_N);
  const kGx = (k * gX) % SRP_N;
  
  let base = (B - kGx) % SRP_N;
  if (base < 0n) {
    base += SRP_N;
  }
  
  const exp = a + u * x;
  return modPow(base, exp, SRP_N);
}

export async function srpCalculateM1(A: bigint, B: bigint, S: bigint): Promise<string> {
  const ABuf = padBigint(A);
  const BBuf = padBigint(B);
  const SBuf = padBigint(S);
  
  const data = new Uint8Array(ABuf.length + BBuf.length + SBuf.length);
  data.set(ABuf, 0);
  data.set(BBuf, ABuf.length);
  data.set(SBuf, ABuf.length + BBuf.length);
  
  const hash = await sha256(data);
  return bytesToHex(hash);
}

export async function srpCalculateM2(A: bigint, M1Hex: string, S: bigint): Promise<string> {
  const ABuf = padBigint(A);
  const M1Buf = hexToBytes(M1Hex);
  const SBuf = padBigint(S);
  
  const data = new Uint8Array(ABuf.length + M1Buf.length + SBuf.length);
  data.set(ABuf, 0);
  data.set(M1Buf, ABuf.length);
  data.set(SBuf, ABuf.length + M1Buf.length);
  
  const hash = await sha256(data);
  return bytesToHex(hash);
}
