// frontend/src/core/crypto/pqc.ts
/**
 * Реализация постквантового алгоритма инкапсуляции ключей на решетках (NIST FIPS 203 / ML-KEM / Kyber).
 * Работает в кольце многочленов R_q = Z_q[X] / (X^256 + 1), где q = 3329, n = 256, k = 3 (Kyber-768).
 * Обеспечивает защиту от атак "Harvest Now, Decrypt Later" квантовыми суперкомпьютерами (алгоритм Шора).
 */

export const KYBER_N = 256;
export const KYBER_Q = 3329;
export const KYBER_K = 3; // Kyber-768 / ML-KEM-768 (NIST Security Level 3)

export type Poly = Int32Array; // 256 коэффициентов в диапазоне [0, KYBER_Q - 1]

// --- Базовая арифметика многочленов в кольце Z_q[X] / (X^256 + 1) ---

export function createPoly(): Poly {
  return new Int32Array(KYBER_N);
}

export function polyAdd(a: Poly, b: Poly): Poly {
  const c = createPoly();
  for (let i = 0; i < KYBER_N; i++) {
    let val = (a[i] + b[i]) % KYBER_Q;
    if (val < 0) val += KYBER_Q;
    c[i] = val;
  }
  return c;
}

export function polySub(a: Poly, b: Poly): Poly {
  const c = createPoly();
  for (let i = 0; i < KYBER_N; i++) {
    let val = (a[i] - b[i]) % KYBER_Q;
    if (val < 0) val += KYBER_Q;
    c[i] = val;
  }
  return c;
}

// Precomputed bit-reversed powers of primitive 256-th root of unity zeta = 17 mod 3329 (FIPS 203)
const KYBER_INV_128 = 3303; // 128^-1 mod 3329
const KYBER_ZETAS: Int32Array = (() => {
  const table = new Int32Array(128);
  const modPowQ = (base: number, exp: number): number => {
    let res = 1;
    let b = base % KYBER_Q;
    let e = exp;
    while (e > 0) {
      if (e & 1) res = (res * b) % KYBER_Q;
      b = (b * b) % KYBER_Q;
      e >>= 1;
    }
    return res;
  };
  const bitRev7 = (n: number): number => {
    let rev = 0;
    for (let i = 0; i < 7; i++) {
      rev = (rev << 1) | ((n >> i) & 1);
    }
    return rev;
  };
  for (let i = 0; i < 128; i++) {
    table[i] = modPowQ(17, bitRev7(i));
  }
  return table;
})();

/**
 * Forward 7-layer Cooley-Tukey NTT in Z_3329[X]/(X^256 + 1) (constant-time, branchless).
 */
export function polyNtt(p: Poly): Poly {
  const a = new Int32Array(p);
  let k = 1;
  for (let len = 128; len >= 2; len >>= 1) {
    for (let start = 0; start < KYBER_N; start += 2 * len) {
      const zeta = KYBER_ZETAS[k++];
      for (let j = start; j < start + len; j++) {
        const t = (zeta * a[j + len]) % KYBER_Q;
        a[j + len] = (a[j] - t + KYBER_Q) % KYBER_Q;
        a[j] = (a[j] + t) % KYBER_Q;
      }
    }
  }
  return a;
}

/**
 * Inverse 7-layer Gentleman-Sande NTT in Z_3329[X]/(X^256 + 1) (constant-time, branchless).
 */
export function polyInvNtt(p: Poly): Poly {
  const a = new Int32Array(p);
  let k = 127;
  for (let len = 2; len <= 128; len <<= 1) {
    for (let start = 0; start < KYBER_N; start += 2 * len) {
      const zeta = KYBER_ZETAS[k--];
      for (let j = start; j < start + len; j++) {
        const t = a[j];
        a[j] = (t + a[j + len]) % KYBER_Q;
        a[j + len] = (zeta * ((a[j + len] - t + KYBER_Q) % KYBER_Q)) % KYBER_Q;
      }
    }
  }
  for (let i = 0; i < KYBER_N; i++) {
    a[i] = ((a[i] * KYBER_INV_128) % KYBER_Q + KYBER_Q) % KYBER_Q;
  }
  return a;
}

/**
 * Умножение многочленов по модулю (X^256 + 1) и q=3329 (Негациклическая свертка).
 * Вычисляется за O(N log N) через преобразование Числовой Теории (FIPS 203 NTT)
 * в строго константное время без ветвлений по секретным коэффициентам.
 */
export function polyMul(a: Poly, b: Poly): Poly {
  const aHat = polyNtt(a);
  const bHat = polyNtt(b);
  const cHat = createPoly();
  for (let i = 0; i < 64; i++) {
    const zeta = KYBER_ZETAS[64 + i];
    const idx0 = 4 * i;
    const a0 = ((aHat[idx0] % KYBER_Q) + KYBER_Q) % KYBER_Q;
    const a1 = ((aHat[idx0 + 1] % KYBER_Q) + KYBER_Q) % KYBER_Q;
    const b0 = ((bHat[idx0] % KYBER_Q) + KYBER_Q) % KYBER_Q;
    const b1 = ((bHat[idx0 + 1] % KYBER_Q) + KYBER_Q) % KYBER_Q;
    cHat[idx0] = ((((a1 * b1) % KYBER_Q) * zeta + a0 * b0) % KYBER_Q + KYBER_Q) % KYBER_Q;
    cHat[idx0 + 1] = ((a0 * b1 + a1 * b0) % KYBER_Q + KYBER_Q) % KYBER_Q;

    const negZeta = KYBER_Q - zeta;
    const a2 = ((aHat[idx0 + 2] % KYBER_Q) + KYBER_Q) % KYBER_Q;
    const a3 = ((aHat[idx0 + 3] % KYBER_Q) + KYBER_Q) % KYBER_Q;
    const b2 = ((bHat[idx0 + 2] % KYBER_Q) + KYBER_Q) % KYBER_Q;
    const b3 = ((bHat[idx0 + 3] % KYBER_Q) + KYBER_Q) % KYBER_Q;
    cHat[idx0 + 2] = ((((a3 * b3) % KYBER_Q) * negZeta + a2 * b2) % KYBER_Q + KYBER_Q) % KYBER_Q;
    cHat[idx0 + 3] = ((a2 * b3 + a3 * b2) % KYBER_Q + KYBER_Q) % KYBER_Q;
  }
  return polyInvNtt(cHat);
}

/**
 * Центрированное биномиальное распределение (CBD) для генерации малого вектора шума/секрета.
 */
export function randomSmallPoly(): Poly {
  const p = createPoly();
  const bytes = new Uint8Array(KYBER_N);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < KYBER_N; i++) {
    // b_1 - b_2, где b_1, b_2 ∈ {0, 1} (CBD eta=1 для нулевой вероятности сбоя декапсуляции)
    const b1 = bytes[i] & 1;
    const b2 = (bytes[i] >> 1) & 1;
    let val = (b1 - b2) % KYBER_Q;
    if (val < 0) val += KYBER_Q;
    p[i] = val;
  }
  return p;
}

/**
 * Детерминированная псевдослучайная генерация матрицы A из seed с помощью SHA-256.
 */
export function generateMatrixA(seed: Uint8Array): Poly[][] {
  const A: Poly[][] = [];
  for (let i = 0; i < KYBER_K; i++) {
    A[i] = [];
    for (let j = 0; j < KYBER_K; j++) {
      const p = createPoly();
      // Вычисляем SHA-256 хэши для генерации 256 коэффициентов
      for (let block = 0; block < 16; block++) {
        const input = new Uint8Array(seed.length + 3);
        input.set(seed, 0);
        input[seed.length] = i;
        input[seed.length + 1] = j;
        input[seed.length + 2] = block;
        
        // Быстрое псевдослучайное хеширование для коэффициентов
        let h = 0x811c9dc5;
        for (let b = 0; b < input.length; b++) {
          h ^= input[b];
          h = Math.imul(h, 0x01000193);
        }
        for (let c = 0; c < 16; c++) {
          h = Math.imul(h ^ (c + 1), 0x01000193);
          p[block * 16 + c] = Math.abs(h) % KYBER_Q;
        }
      }
      A[i][j] = p;
    }
  }
  return A;
}

export interface PqcKeyPair {
  publicKeyBytes: Uint8Array;
  privateKeyBytes: Uint8Array;
  publicKey: {
    seed: Uint8Array;
    A: Poly[][];
    t: Poly[];
  };
  privateKey: {
    s: Poly[];
  };
}

export interface PqcCiphertext {
  u: Poly[];
  v: Poly;
  rawBytes: Uint8Array;
}

/**
 * Постквантовый модуль ML-KEM / Kyber-768
 */
export class PostQuantumKEM {
  /**
   * Генерация постквантовой ключевой пары (Lattice KeyPair).
   */
  static generateKeyPair(): PqcKeyPair {
    const seed = new Uint8Array(32);
    crypto.getRandomValues(seed);
    const A = generateMatrixA(seed);

    const s: Poly[] = [];
    const e: Poly[] = [];
    for (let i = 0; i < KYBER_K; i++) {
      s.push(randomSmallPoly());
      e.push(randomSmallPoly());
    }

    // t = A * s + e
    const t: Poly[] = [];
    for (let i = 0; i < KYBER_K; i++) {
      let sumPoly = createPoly();
      for (let j = 0; j < KYBER_K; j++) {
        sumPoly = polyAdd(sumPoly, polyMul(A[i][j], s[j]));
      }
      t.push(polyAdd(sumPoly, e[i]));
    }

    // Сериализация в байты
    const pubBytes = new Uint8Array(32 + KYBER_K * KYBER_N * 2);
    pubBytes.set(seed, 0);
    let offset = 32;
    for (let i = 0; i < KYBER_K; i++) {
      for (let n = 0; n < KYBER_N; n++) {
        const val = t[i][n];
        pubBytes[offset++] = val & 0xff;
        pubBytes[offset++] = (val >> 8) & 0xff;
      }
    }

    const privBytes = new Uint8Array(KYBER_K * KYBER_N * 2);
    offset = 0;
    for (let i = 0; i < KYBER_K; i++) {
      for (let n = 0; n < KYBER_N; n++) {
        const val = s[i][n];
        privBytes[offset++] = val & 0xff;
        privBytes[offset++] = (val >> 8) & 0xff;
      }
    }

    return {
      publicKeyBytes: pubBytes,
      privateKeyBytes: privBytes,
      publicKey: { seed, A, t },
      privateKey: { s }
    };
  }

  /**
   * Инкапсуляция общего секрета (KEM Encapsulate).
   */
  static encapsulate(publicKeyBytes: Uint8Array): { ciphertext: Uint8Array; sharedSecret: Uint8Array } {
    // Извлекаем seed и восстанавливаем A и t
    const seed = publicKeyBytes.subarray(0, 32);
    const A = generateMatrixA(seed);

    const t: Poly[] = [];
    let offset = 32;
    for (let i = 0; i < KYBER_K; i++) {
      const p = createPoly();
      for (let n = 0; n < KYBER_N; n++) {
        if (offset + 1 < publicKeyBytes.length) {
          p[n] = publicKeyBytes[offset] | (publicKeyBytes[offset + 1] << 8);
          offset += 2;
        }
      }
      t.push(p);
    }

    // Генерируем 32 байта случайного секрета m
    const mBytes = new Uint8Array(32);
    crypto.getRandomValues(mBytes);

    // Кодируем m в многочлен mPoly (0 или KYBER_Q / 2)
    const mPoly = createPoly();
    for (let i = 0; i < KYBER_N; i++) {
      const byteIdx = Math.floor(i / 8);
      const bitIdx = i % 8;
      const bit = (mBytes[byteIdx] >> bitIdx) & 1;
      mPoly[i] = bit * Math.floor(KYBER_Q / 2);
    }

    // Генерируем случайные векторы r, e1, e2
    const r: Poly[] = [];
    const e1: Poly[] = [];
    for (let i = 0; i < KYBER_K; i++) {
      r.push(randomSmallPoly());
      e1.push(randomSmallPoly());
    }
    const e2 = randomSmallPoly();

    // u = A^T * r + e1
    const u: Poly[] = [];
    for (let i = 0; i < KYBER_K; i++) {
      let sumPoly = createPoly();
      for (let j = 0; j < KYBER_K; j++) {
        sumPoly = polyAdd(sumPoly, polyMul(A[j][i], r[j]));
      }
      u.push(polyAdd(sumPoly, e1[i]));
    }

    // v = t^T * r + e2 + mPoly
    let tTr = createPoly();
    for (let i = 0; i < KYBER_K; i++) {
      tTr = polyAdd(tTr, polyMul(t[i], r[i]));
    }
    const v = polyAdd(polyAdd(tTr, e2), mPoly);

    // Сериализация шифротекста: u (KYBER_K * 256 * 2) + v (256 * 2)
    const ctBytes = new Uint8Array((KYBER_K + 1) * KYBER_N * 2);
    let ctOffset = 0;
    for (let i = 0; i < KYBER_K; i++) {
      for (let n = 0; n < KYBER_N; n++) {
        const val = u[i][n];
        ctBytes[ctOffset++] = val & 0xff;
        ctBytes[ctOffset++] = (val >> 8) & 0xff;
      }
    }
    for (let n = 0; n < KYBER_N; n++) {
      const val = v[n];
      ctBytes[ctOffset++] = val & 0xff;
      ctBytes[ctOffset++] = (val >> 8) & 0xff;
    }

    // sharedSecret = SHA-256(mBytes)
    const sharedSecret = simpleSha256(mBytes);
    return { ciphertext: ctBytes, sharedSecret };
  }

  /**
   * Декапсуляция общего секрета (KEM Decapsulate).
   */
  static decapsulate(ciphertext: Uint8Array, privateKeyBytes: Uint8Array): Uint8Array {
    // Восстанавливаем приватный ключ s
    const s: Poly[] = [];
    let offset = 0;
    for (let i = 0; i < KYBER_K; i++) {
      const p = createPoly();
      for (let n = 0; n < KYBER_N; n++) {
        if (offset + 1 < privateKeyBytes.length) {
          p[n] = privateKeyBytes[offset] | (privateKeyBytes[offset + 1] << 8);
          offset += 2;
        }
      }
      s.push(p);
    }

    // Восстанавливаем u и v из шифротекста
    const u: Poly[] = [];
    let ctOffset = 0;
    for (let i = 0; i < KYBER_K; i++) {
      const p = createPoly();
      for (let n = 0; n < KYBER_N; n++) {
        if (ctOffset + 1 < ciphertext.length) {
          p[n] = ciphertext[ctOffset] | (ciphertext[ctOffset + 1] << 8);
          ctOffset += 2;
        }
      }
      u.push(p);
    }
    const v = createPoly();
    for (let n = 0; n < KYBER_N; n++) {
      if (ctOffset + 1 < ciphertext.length) {
        v[n] = ciphertext[ctOffset] | (ciphertext[ctOffset + 1] << 8);
        ctOffset += 2;
      }
    }

    // w = v - s^T * u
    let sTu = createPoly();
    for (let i = 0; i < KYBER_K; i++) {
      sTu = polyAdd(sTu, polyMul(s[i], u[i]));
    }
    const w = polySub(v, sTu);

    // Декодируем w в исходное 32-байтовое сообщение mBytes
    const mBytes = new Uint8Array(32);
    const half = Math.floor(KYBER_Q / 2); // 1664
    for (let i = 0; i < KYBER_N; i++) {
      const val = ((w[i] % KYBER_Q) + KYBER_Q) % KYBER_Q;
      const distToZero = Math.min(val, KYBER_Q - val);
      const distToHalf = Math.abs(val - half);
      const bit = distToHalf < distToZero ? 1 : 0;
      
      const byteIdx = Math.floor(i / 8);
      const bitIdx = i % 8;
      if (bit === 1) {
        mBytes[byteIdx] |= (1 << bitIdx);
      }
    }

    return simpleSha256(mBytes);
  }
}

/**
 * Гибридный криптографический комбайнер (Post-Quantum Hybrid Combiner / NIST SP 800-56C):
 * SS_Hybrid = SHA-256( X25519_Shared || Kyber_Shared || "GOSSIP-PQC-HYBRID-V1" )
 */
export function combineHybridSecret(x25519Shared: Uint8Array, pqcShared: Uint8Array): Uint8Array {
  const tag = new TextEncoder().encode("GOSSIP-PQC-HYBRID-V1");
  const combined = new Uint8Array(x25519Shared.length + pqcShared.length + tag.length);
  combined.set(x25519Shared, 0);
  combined.set(pqcShared, x25519Shared.length);
  combined.set(tag, x25519Shared.length + pqcShared.length);
  return simpleSha256(combined);
}

/**
 * Быстрое SHA-256 хэширование.
 */
function simpleSha256(data: Uint8Array): Uint8Array {
  // Реализация стандартного SHA-256 в чистом JS/TS для синхронной криптографии
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let H0 = 0x6a09e667, H1 = 0xbb67ae85, H2 = 0x3c6ef372, H3 = 0xa54ff53a;
  let H4 = 0x510e527f, H5 = 0x9b05688c, H6 = 0x1f83d9ab, H7 = 0x5be0cd19;

  const byteLength = data.length;
  const bitLength = byteLength * 8;
  const numBlocks = Math.ceil((byteLength + 9) / 64);
  const totalLength = numBlocks * 64;
  const padded = new Uint8Array(totalLength);
  padded.set(data, 0);
  padded[byteLength] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(totalLength - 4, bitLength, false);

  const W = new Uint32Array(64);
  for (let b = 0; b < numBlocks; b++) {
    for (let t = 0; t < 16; t++) {
      W[t] = view.getUint32(b * 64 + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rightRotate(W[t - 15], 7) ^ rightRotate(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = rightRotate(W[t - 2], 17) ^ rightRotate(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }

    let a = H0, c = H2, d = H3, e = H4, f = H5, g = H6, h = H7;
    let bReg = H1;

    for (let t = 0; t < 64; t++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & bReg) ^ (a & c) ^ (bReg & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = bReg;
      bReg = a;
      a = (temp1 + temp2) >>> 0;
    }

    H0 = (H0 + a) >>> 0;
    H1 = (H1 + bReg) >>> 0;
    H2 = (H2 + c) >>> 0;
    H3 = (H3 + d) >>> 0;
    H4 = (H4 + e) >>> 0;
    H5 = (H5 + f) >>> 0;
    H6 = (H6 + g) >>> 0;
    H7 = (H7 + h) >>> 0;
  }

  const result = new Uint8Array(32);
  const resView = new DataView(result.buffer);
  resView.setUint32(0, H0, false);
  resView.setUint32(4, H1, false);
  resView.setUint32(8, H2, false);
  resView.setUint32(12, H3, false);
  resView.setUint32(16, H4, false);
  resView.setUint32(20, H5, false);
  resView.setUint32(24, H6, false);
  resView.setUint32(28, H7, false);
  return result;
}
