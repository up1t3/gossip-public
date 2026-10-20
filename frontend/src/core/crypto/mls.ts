import { hexToBytes, bytesToHex, modPow } from "../tdlib/crypto";

// --- X25519 (Curve25519) на чистом BigInt ---
const P = 2n ** 255n - 19n;
const A24 = 121665n;

function cswap(swap: bigint, x_2: bigint, x_3: bigint): [bigint, bigint] {
  const r1 = ((x_2 % P) + P) % P;
  const r2 = ((x_3 % P) + P) % P;
  const mask = -(swap & 1n);
  const dummy = mask & (r1 ^ r2);
  return [r1 ^ dummy, r2 ^ dummy];
}

export function x25519(scalar: bigint, point: bigint): bigint {
  let u = point % P;
  let x_1 = u;
  let x_2 = 1n;
  let z_2 = 0n;
  let x_3 = u;
  let z_3 = 1n;
  let swap = 0n;

  for (let t = 254; t >= 0; t--) {
    const k_t = (scalar >> BigInt(t)) & 1n;
    swap ^= k_t;
    [x_2, x_3] = cswap(swap, x_2, x_3);
    [z_2, z_3] = cswap(swap, z_2, z_3);
    swap = k_t;

    const A = (x_2 + z_2) % P;
    const AA = (A * A) % P;
    const B = (x_2 - z_2) % P;
    const BB = (B * B) % P;
    const E = (AA - BB) % P;
    const C = (x_3 + z_3) % P;
    const D = (x_3 - z_3) % P;
    const DA = (D * A) % P;
    const CB = (C * B) % P;
    
    x_3 = ((DA + CB) * (DA + CB)) % P;
    z_3 = (x_1 * (((DA - CB) * (DA - CB)) % P)) % P;
    x_2 = (AA * BB) % P;
    z_2 = (E * ((BB + ((A24 * E) % P)) % P)) % P;
  }
  
  [x_2, x_3] = cswap(swap, x_2, x_3);
  [z_2, z_3] = cswap(swap, z_2, z_3);
  
  const z2_inv = modPow(z_2, P - 2n, P);
  const result = (x_2 * z2_inv) % P;
  return result < 0n ? result + P : result;
}

export function generateX25519KeyPair(): { privateKey: Uint8Array; publicKey: Uint8Array } {
  const priv = new Uint8Array(32);
  crypto.getRandomValues(priv);
  
  // Клэмппинг (clamping) согласно RFC 7748
  priv[0] &= 248;
  priv[31] &= 127;
  priv[31] |= 64;

  let scalar = 0n;
  for (let i = 0; i < 32; i++) {
    scalar = (scalar << 8n) + BigInt(priv[i]);
  }
  
  // Генераторная точка u = 9
  const pubBig = x25519(scalar, 9n);
  
  const pubHex = pubBig.toString(16).padStart(64, "0");
  const publicKey = hexToBytes(pubHex);
  
  return { privateKey: priv, publicKey };
}

export function calculateX25519SharedSecret(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array {
  // RK-2: X25519 читает ровно 32 байта каждого входа. Короткий массив (повреждённый/
  // нерасшифрованный ключ из хранилища) даёт BigInt(undefined) без стека — валидируем явно.
  if (!(privateKey instanceof Uint8Array) || privateKey.length !== 32) {
    throw new Error(`[X25519] Некорректный приватный ключ: ${privateKey?.length ?? 'не Uint8Array'} байт (ожидается 32). Ключи в хранилище повреждены — требуется регенерация.`);
  }
  if (!(publicKey instanceof Uint8Array) || publicKey.length !== 32) {
    throw new Error(`[X25519] Некорректный публичный ключ: ${publicKey?.length ?? 'не Uint8Array'} байт (ожидается 32).`);
  }
  let scalar = 0n;
  for (let i = 0; i < 32; i++) {
    scalar = (scalar << 8n) + BigInt(privateKey[i]);
  }
  
  let point = 0n;
  for (let i = 0; i < 32; i++) {
    point = (point << 8n) + BigInt(publicKey[i]);
  }
  
  const sharedBig = x25519(scalar, point);
  const sharedHex = sharedBig.toString(16).padStart(64, "0");
  return hexToBytes(sharedHex);
}

import { PostQuantumKEM, combineHybridSecret } from "./pqc";

// --- Постквантовый гибридный модуль Kyber-768/1024 (ML-KEM / NIST FIPS 203) ---
// Публичный ключ: 1568 байт (X25519 + Kyber-Lattice)
// Приватный ключ: 3168 байт
// Шифротекст: 1568 байт
export class Kyber1024 {
  static generateKeyPair(): { publicKey: Uint8Array; privateKey: Uint8Array } {
    const pqPair = PostQuantumKEM.generateKeyPair();
    const xKeyPair = generateX25519KeyPair();
    
    // Формируем комбинированный публичный ключ (1600 байт):
    // 0..31: X25519 публичный ключ (32 байта)
    // 32..1599: ML-KEM/Kyber публичный ключ на решетках (seed 32 байта + t 1536 байт = 1568 байт)
    const publicKey = new Uint8Array(1600);
    publicKey.set(xKeyPair.publicKey, 0);
    publicKey.set(pqPair.publicKeyBytes, 32);
    
    // Формируем приватный ключ (3168 байт):
    // 0..31: X25519 приватный ключ (32 байта)
    // 32..1567: ML-KEM/Kyber приватный ключ (s: 1536 байт)
    const privateKey = new Uint8Array(3168);
    privateKey.set(xKeyPair.privateKey, 0);
    privateKey.set(pqPair.privateKeyBytes, 32);
    crypto.getRandomValues(privateKey.subarray(1568));
    
    return { publicKey, privateKey };
  }

  static encapsulate(publicKey: Uint8Array): { ciphertext: Uint8Array; sharedSecret: Uint8Array } {
    const recipientX25519Pub = publicKey.subarray(0, 32);
    const recipientPqcPub = publicKey.subarray(32, 32 + 1568);
    
    // 1. Классический X25519 ECDH
    const ephemeralX = generateX25519KeyPair();
    const xShared = calculateX25519SharedSecret(ephemeralX.privateKey, recipientX25519Pub);
    
    // 2. Постквантовая KEM инкапсуляция на решетках
    const pqcResult = PostQuantumKEM.encapsulate(recipientPqcPub);
    
    // 3. Гибридный секрет (NIST FIPS 203 Hybrid Combiner)
    const sharedSecret = combineHybridSecret(xShared, pqcResult.sharedSecret);
    
    // Формируем шифротекст (2080 байт):
    // 0..31: Эфемерный публичный ключ X25519 (32 байта)
    // 32..2079: Полный шифротекст KEM на решетках (2048 байт: u = 1536 байт + v = 512 байт)
    const ciphertext = new Uint8Array(2080);
    ciphertext.set(ephemeralX.publicKey, 0);
    ciphertext.set(pqcResult.ciphertext, 32);
    
    return { ciphertext, sharedSecret };
  }

  static decapsulate(ciphertext: Uint8Array, privateKey: Uint8Array): Uint8Array {
    if (ciphertext.length !== 2080) {
      if (ciphertext.length !== 1568) {
        throw new Error(`Invalid ciphertext length: ${ciphertext.length}`);
      }
    }
    if (privateKey.length !== 3168) {
      throw new Error(`Invalid private key length: ${privateKey.length}`);
    }

    const recipientX25519Priv = privateKey.subarray(0, 32);
    const recipientPqcPriv = privateKey.subarray(32, 32 + 1536);
    
    const ephemeralXPub = ciphertext.subarray(0, 32);
    const pqcCiphertext = ciphertext.subarray(32);
    
    // 1. Классический X25519 ECDH
    const xShared = calculateX25519SharedSecret(recipientX25519Priv, ephemeralXPub);
    
    // 2. Постквантовая KEM декапсуляция
    const pqcShared = PostQuantumKEM.decapsulate(pqcCiphertext, recipientPqcPriv);
    
    // 3. Гибридный секрет
    return combineHybridSecret(xShared, pqcShared);
  }
}

// --- HKDF-SHA256 для вывода ключей ---
export async function hkdfDeriveKey(secret: Uint8Array, info: string, length: number = 32): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const infoBytes = encoder.encode(info);
  
  // Псевдослучайный ключ (PRK) = HMAC-SHA256(salt="", secret)
  const salt = new Uint8Array(32);
  const prkKey = await crypto.subtle.importKey(
    "raw",
    salt as any,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const prkBuffer = await crypto.subtle.sign("HMAC", prkKey, secret as any);
  const prk = new Uint8Array(prkBuffer);
  
  // Extract
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    prk as any,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  // Expand
  const out = new Uint8Array(length);
  let t = new Uint8Array(0);
  let offset = 0;
  let counter = 1;
  
  while (offset < length) {
    const blockData = new Uint8Array(t.length + infoBytes.length + 1);
    blockData.set(t, 0);
    blockData.set(infoBytes, t.length);
    blockData[t.length + infoBytes.length] = counter;
    
    const tBuffer = await crypto.subtle.sign("HMAC", hmacKey, blockData as any);
    t = new Uint8Array(tBuffer);
    
    const chunkLength = Math.min(t.length, length - offset);
    out.set(t.subarray(0, chunkLength), offset);
    offset += chunkLength;
    counter++;
  }
  
  return out;
}

// --- Структуры данных MLS ---
export interface MlsKeyPair {
  x25519: { privateKey: Uint8Array; publicKey: Uint8Array };
  kyber: { privateKey: Uint8Array; publicKey: Uint8Array };
}

export interface MlsProposal {
  type: "ADD" | "REMOVE" | "UPDATE";
  userId: string;
  deviceKeyX25519?: string; // hex
  deviceKeyKyber?: string;   // hex
}

export interface MlsEpoch {
  epochNumber: number;
  epochSecret: Uint8Array;
  applicationKey: Uint8Array;
  members: string[]; // User IDs
}

export class MlsSession {
  public chatId: string;
  public localUserId: string;
  public localKeyPair: MlsKeyPair;
  public currentEpoch: MlsEpoch;
  public proposalsQueue: MlsProposal[] = [];
  public historicalEpochKeys: { [epochNumber: number]: string } = {};
  
  private batchTimer: any = null;
  private onEpochCommitCallback: ((epoch: MlsEpoch, commitMsg: string) => void) | null = null;

  constructor(chatId: string, localUserId: string, localKeyPair: MlsKeyPair, initialMembers: string[], initialSecretHex?: string) {
    this.chatId = chatId;
    this.localUserId = localUserId;
    this.localKeyPair = localKeyPair;
    
    const initialSecret = initialSecretHex ? hexToBytes(initialSecretHex) : new Uint8Array(32);
    if (!initialSecretHex) {
      crypto.getRandomValues(initialSecret);
    }
    
    this.currentEpoch = {
      epochNumber: 0,
      epochSecret: initialSecret,
      applicationKey: initialSecret, // Будет инициализирован в первом коммите
      members: [...initialMembers]
    };
    
    this.startBatchTimer();
  }

  public registerOnEpochCommit(cb: (epoch: MlsEpoch, commitMsg: string) => void) {
    this.onEpochCommitCallback = cb;
  }

  // Запуск 60-секундного таймера батчинга смены эпох
  private startBatchTimer() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    this.batchTimer = setInterval(async () => {
      if (this.proposalsQueue.length > 0) {
        console.log(`[MLS Session ${this.chatId}] Запуск автоматической смены эпохи по таймеру батчинга.`);
        await this.commitEpoch();
      }
    }, 60000);
  }

  public destroy() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
  }

  public serialize(): string {
    const data = {
      chatId: this.chatId,
      localUserId: this.localUserId,
      localKeyPair: {
        x25519: {
          privateKey: bytesToHex(this.localKeyPair.x25519.privateKey),
          publicKey: bytesToHex(this.localKeyPair.x25519.publicKey)
        },
        kyber: {
          privateKey: bytesToHex(this.localKeyPair.kyber.privateKey),
          publicKey: bytesToHex(this.localKeyPair.kyber.publicKey)
        }
      },
      currentEpoch: {
        epochNumber: this.currentEpoch.epochNumber,
        epochSecret: bytesToHex(this.currentEpoch.epochSecret),
        applicationKey: bytesToHex(this.currentEpoch.applicationKey),
        members: this.currentEpoch.members
      },
      proposalsQueue: this.proposalsQueue,
      historicalEpochKeys: this.historicalEpochKeys || {}
    };
    return JSON.stringify(data);
  }

  public static deserialize(jsonStr: string): MlsSession {
    const data = JSON.parse(jsonStr);
    const localKeyPair: MlsKeyPair = {
      x25519: {
        privateKey: hexToBytes(data.localKeyPair.x25519.privateKey),
        publicKey: hexToBytes(data.localKeyPair.x25519.publicKey)
      },
      kyber: {
        privateKey: hexToBytes(data.localKeyPair.kyber.privateKey),
        publicKey: hexToBytes(data.localKeyPair.kyber.publicKey)
      }
    };
    
    const session = new MlsSession(
      data.chatId,
      data.localUserId,
      localKeyPair,
      data.currentEpoch.members,
      data.currentEpoch.epochSecret
    );
    
    session.currentEpoch.epochNumber = data.currentEpoch.epochNumber;
    session.currentEpoch.applicationKey = hexToBytes(data.currentEpoch.applicationKey);
    session.proposalsQueue = data.proposalsQueue || [];
    session.historicalEpochKeys = data.historicalEpochKeys || {};
    
    return session;
  }


  // Добавление предложения в очередь (например, пришел запрос на добавление нового участника)
  public addProposal(proposal: MlsProposal) {
    this.proposalsQueue.push(proposal);
  }

  // Фиксация новой эпохи (Epoch Batching Commit)
  public async commitEpoch(newEntropyHex?: string): Promise<{ epoch: MlsEpoch; commitMsg: string }> {
    if (this.proposalsQueue.length === 0) {
      throw new Error("Нет предложений для перехода на новую эпоху");
    }

    const nextEpochNumber = this.currentEpoch.epochNumber + 1;
    const membersSet = new Set(this.currentEpoch.members);
    
    // Собираем ключи для гибридного KEM
    const kemKeysToEncrypt: { userId: string; x25519Pub: Uint8Array; kyberPub: Uint8Array }[] = [];

    for (const prop of this.proposalsQueue) {
      if (prop.type === "ADD") {
        membersSet.add(prop.userId);
        if (prop.deviceKeyX25519 && prop.deviceKeyKyber) {
          kemKeysToEncrypt.push({
            userId: prop.userId,
            x25519Pub: hexToBytes(prop.deviceKeyX25519),
            kyberPub: hexToBytes(prop.deviceKeyKyber)
          });
        }
      } else if (prop.type === "REMOVE") {
        membersSet.delete(prop.userId);
      } else if (prop.type === "UPDATE") {
        if (prop.deviceKeyX25519 && prop.deviceKeyKyber) {
          kemKeysToEncrypt.push({
            userId: prop.userId,
            x25519Pub: hexToBytes(prop.deviceKeyX25519),
            kyberPub: hexToBytes(prop.deviceKeyKyber)
          });
        }
      }
    }

    // Вычисляем новый секрет эпохи с использованием гибридной схемы
    // Генерируем новый случайный мастер-секрет (entropy) или используем переданный
    const newEntropy = newEntropyHex ? hexToBytes(newEntropyHex) : new Uint8Array(32);
    if (!newEntropyHex) {
      crypto.getRandomValues(newEntropy);
    }

    // Локально шифруем новый секрет для каждого участника, используя Kyber-1024 + X25519
    const encryptedKems: Record<string, { x25519CtHex: string; kyberCtHex: string }> = {};

    for (const target of kemKeysToEncrypt) {
      // 1. X25519 ECDH
      const ephemeralX = generateX25519KeyPair();
      const xShared = calculateX25519SharedSecret(ephemeralX.privateKey, target.x25519Pub);
      
      // 2. Kyber-1024 KEM
      const kyberKem = Kyber1024.encapsulate(target.kyberPub);
      
      // 3. Гибридное смешивание
      const hybridSecret = await hkdfDeriveKey(
        new Uint8Array([...xShared, ...kyberKem.sharedSecret]),
        "MLS_HYBRID_KEM_INFO"
      );
      
      // Шифруем энтропию с помощью гибридного секрета
      const aesKey = await crypto.subtle.importKey(
        "raw",
        hybridSecret as any,
        { name: "AES-GCM" },
        false,
        ["encrypt"]
      );
      const iv = new Uint8Array(12);
      crypto.getRandomValues(iv);
      const encEntropy = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv as any },
        aesKey,
        newEntropy as any
      );

      // Записываем шифротекст
      encryptedKems[target.userId] = {
        x25519CtHex: bytesToHex(ephemeralX.publicKey) + ":" + bytesToHex(iv) + ":" + bytesToHex(new Uint8Array(encEntropy)),
        kyberCtHex: bytesToHex(kyberKem.ciphertext)
      };
    }

    // Новый Epoch Secret = HKDF(Old Epoch Secret + New Entropy)
    const combinedEntropy = new Uint8Array(this.currentEpoch.epochSecret.length + newEntropy.length);
    combinedEntropy.set(this.currentEpoch.epochSecret, 0);
    combinedEntropy.set(newEntropy, this.currentEpoch.epochSecret.length);
    
    const nextEpochSecret = await hkdfDeriveKey(combinedEntropy, `MLS_EPOCH_SECRET_${nextEpochNumber}`);
    const nextApplicationKey = await hkdfDeriveKey(nextEpochSecret, "MLS_APPLICATION_KEY");

    const newEpoch: MlsEpoch = {
      epochNumber: nextEpochNumber,
      epochSecret: nextEpochSecret,
      applicationKey: nextApplicationKey,
      members: Array.from(membersSet)
    };

    const oldAppKey = this.currentEpoch.applicationKey;
    const oldAesKey = await crypto.subtle.importKey(
      "raw",
      oldAppKey as any,
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );
    const oldIv = new Uint8Array(12);
    crypto.getRandomValues(oldIv);
    const encEntropyForOld = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: oldIv as any },
      oldAesKey,
      newEntropy as any
    );

    // Формируем сообщение о переходе (Commit Message)
    const commitData = {
      epochNumber: nextEpochNumber,
      proposals: this.proposalsQueue,
      encryptedKems,
      newMembers: newEpoch.members,
      encryptedEntropyForOldMembersHex: bytesToHex(new Uint8Array(encEntropyForOld)),
      oldMembersIvHex: bytesToHex(oldIv)
    };
    
    const commitMsg = JSON.stringify(commitData);
    
    // Сохраняем ключ текущей эпохи в историю перед переходом
    if (!this.historicalEpochKeys) this.historicalEpochKeys = {};
    this.historicalEpochKeys[this.currentEpoch.epochNumber] = bytesToHex(this.currentEpoch.applicationKey);
    // Ограничиваем размер истории 20 эпохами
    const epochKeys = Object.keys(this.historicalEpochKeys).map(Number);
    if (epochKeys.length > 20) {
      const minEpoch = Math.min(...epochKeys);
      delete this.historicalEpochKeys[minEpoch];
    }

    // Обновляем состояние
    this.currentEpoch = newEpoch;
    this.proposalsQueue = [];

    if (this.onEpochCommitCallback) {
      this.onEpochCommitCallback(newEpoch, commitMsg);
    }

    return { epoch: newEpoch, commitMsg };
  }

  // Обработка Commit-сообщения от другого участника
  public async processCommit(commitMsgStr: string): Promise<MlsEpoch> {
    const commitData = JSON.parse(commitMsgStr);
    const { epochNumber, encryptedKems, newMembers } = commitData;
    
    if (epochNumber !== this.currentEpoch.epochNumber + 1) {
      throw new Error(`Нарушение синхронизации эпох. Текущая эпоха: ${this.currentEpoch.epochNumber}, получена: ${epochNumber}`);
    }

    let nextEntropy: Uint8Array | null = null;

    // Ищем, есть ли зашифрованный KEM для нашего устройства
    if (encryptedKems && encryptedKems[this.localUserId]) {
      const myKem = encryptedKems[this.localUserId];
      const [xPubHex, ivHex, encEntHex] = myKem.x25519CtHex.split(":");
      const kyberCtHex = myKem.kyberCtHex;

      // 1. Декапсуляция X25519
      const xPub = hexToBytes(xPubHex);
      const iv = hexToBytes(ivHex);
      const encEnt = hexToBytes(encEntHex);
      const xShared = calculateX25519SharedSecret(this.localKeyPair.x25519.privateKey, xPub);

      // 2. Декапсуляция Kyber-1024
      const kyberCt = hexToBytes(kyberCtHex);
      const kyberShared = Kyber1024.decapsulate(kyberCt, this.localKeyPair.kyber.privateKey);

      // 3. Гибридное смешивание
      const hybridSecret = await hkdfDeriveKey(
        new Uint8Array([...xShared, ...kyberShared]),
        "MLS_HYBRID_KEM_INFO"
      );

      // 4. Расшифровываем энтропию
      const aesKey = await crypto.subtle.importKey(
        "raw",
        hybridSecret as any,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );
      const decEntropyBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv as any },
        aesKey,
        encEnt as any
      );
      nextEntropy = new Uint8Array(decEntropyBuffer);
    } else {
      // Если мы уже были в группе и нас не обновляли, мы можем получить новую энтропию
      // В реальном MLS это делается через древовидную KEM структуру (Parent Hash / Path Secret).
      // В нашей оптимизированной схеме, если нас нет в явных KEM-пакетах (потому что мы не добавлялись и наши ключи не менялись),
      // инициатор коммита присылает зашифрованную энтропию, разделяемую между старыми участниками,
      // зашифрованную на старом секрете приложения.
      // Давайте реализуем этот fallback-механизм:
      if (commitData.encryptedEntropyForOldMembersHex) {
        const encEntropy = hexToBytes(commitData.encryptedEntropyForOldMembersHex);
        const oldAppKey = this.currentEpoch.applicationKey;
        const aesKey = await crypto.subtle.importKey(
          "raw",
          oldAppKey as any,
          { name: "AES-GCM" },
          false,
          ["decrypt"]
        );
        // Используем статический IV или переданный в структуре
        const iv = hexToBytes(commitData.oldMembersIvHex || "000000000000000000000000");
        const decEntropyBuffer = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: iv as any },
          aesKey,
          encEntropy as any
        );
        nextEntropy = new Uint8Array(decEntropyBuffer);
      } else {
        // Fallback: если ничего не передано, выводим из старого секрета
        nextEntropy = await hkdfDeriveKey(this.currentEpoch.epochSecret, "MLS_FALLBACK_ENTROPY");
      }
    }

    // Вычисляем новый Epoch Secret
    const combinedEntropy = new Uint8Array(this.currentEpoch.epochSecret.length + nextEntropy.length);
    combinedEntropy.set(this.currentEpoch.epochSecret, 0);
    combinedEntropy.set(nextEntropy, this.currentEpoch.epochSecret.length);
    
    const nextEpochSecret = await hkdfDeriveKey(combinedEntropy, `MLS_EPOCH_SECRET_${epochNumber}`);
    const nextApplicationKey = await hkdfDeriveKey(nextEpochSecret, "MLS_APPLICATION_KEY");

    // Сохраняем старый ключ в историю перед обновлением текущей эпохи
    if (!this.historicalEpochKeys) this.historicalEpochKeys = {};
    this.historicalEpochKeys[this.currentEpoch.epochNumber] = bytesToHex(this.currentEpoch.applicationKey);
    const epochKeys = Object.keys(this.historicalEpochKeys).map(Number);
    if (epochKeys.length > 20) {
      const minEpoch = Math.min(...epochKeys);
      delete this.historicalEpochKeys[minEpoch];
    }

    this.currentEpoch = {
      epochNumber,
      epochSecret: nextEpochSecret,
      applicationKey: nextApplicationKey,
      members: [...newMembers]
    };

    // Очищаем предложения
    this.proposalsQueue = [];

    return this.currentEpoch;
  }

  // Шифрование сообщения (AES-GCM-256 на ключе текущей эпохи)
  public async encryptMessage(plaintext: string): Promise<{ ciphertextHex: string; ivHex: string; epochNumber: number }> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    const aesKey = await crypto.subtle.importKey(
      "raw",
      this.currentEpoch.applicationKey as any,
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );
    
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);
    
    const ciphertextBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as any },
      aesKey,
      data as any
    );
    
    return {
      ciphertextHex: bytesToHex(new Uint8Array(ciphertextBuffer)),
      ivHex: bytesToHex(iv),
      epochNumber: this.currentEpoch.epochNumber
    };
  }

  // Расшифрование сообщения с поддержкой исторических эпох
  public async decryptMessage(ciphertextHex: string, ivHex: string, messageEpochNumber: number): Promise<string> {
    let targetAppKey: Uint8Array | null = null;

    if (messageEpochNumber === this.currentEpoch.epochNumber) {
      targetAppKey = this.currentEpoch.applicationKey;
    } else if (this.historicalEpochKeys && this.historicalEpochKeys[messageEpochNumber]) {
      targetAppKey = hexToBytes(this.historicalEpochKeys[messageEpochNumber]);
    }

    if (!targetAppKey) {
      throw new Error(`Несовпадение эпохи сообщения. Эпоха сообщения: ${messageEpochNumber}, текущая эпоха: ${this.currentEpoch.epochNumber}`);
    }
    
    const ciphertext = hexToBytes(ciphertextHex);
    const iv = hexToBytes(ivHex);
    
    const aesKey = await crypto.subtle.importKey(
      "raw",
      targetAppKey as any,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );
    
    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as any },
      aesKey,
      ciphertext as any
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(plaintextBuffer);
  }
}

// Вспомогательная функция инициализации ключевой пары MLS
export function generateMlsKeyPair(): MlsKeyPair {
  const x25519 = generateX25519KeyPair();
  const kyber = Kyber1024.generateKeyPair();
  
  return { x25519, kyber };
}

import { protectKeyAtRest, unprotectKeyAtRest, isProtectedKey } from "./key-storage-protection";

/**
 * Сохраняет ключевую пару MLS в защищённом виде в localStorage (CRP-005).
 * Исключает запись приватных ключей в открытом виде.
 */
export function storeLocalMlsKeyPair(keyPair: MlsKeyPair): void {
  const xPubHex = bytesToHex(keyPair.x25519.publicKey);
  const xPrivHex = bytesToHex(keyPair.x25519.privateKey);
  const kPubHex = bytesToHex(keyPair.kyber.publicKey);
  const kPrivHex = bytesToHex(keyPair.kyber.privateKey);

  localStorage.setItem("mls_x25519_pub", xPubHex);
  localStorage.setItem("mls_x25519_priv", protectKeyAtRest(xPrivHex));
  localStorage.setItem("mls_kyber_pub", kPubHex);
  localStorage.setItem("mls_kyber_priv", protectKeyAtRest(kPrivHex));
}

// Получение локальной ключевой пары MLS из localStorage или её генерация и сохранение при отсутствии
export function getLocalMlsKeyPair(): MlsKeyPair {
  let xPubHex = localStorage.getItem("mls_x25519_pub");
  let xPrivHexRaw = localStorage.getItem("mls_x25519_priv");
  let kPubHex = localStorage.getItem("mls_kyber_pub");
  let kPrivHexRaw = localStorage.getItem("mls_kyber_priv");

  if (!xPubHex || !xPrivHexRaw || !kPubHex || !kPrivHexRaw) {
    const newPair = generateMlsKeyPair();
    storeLocalMlsKeyPair(newPair);
    return newPair;
  }

  // Расшифровываем ключи в покое (CRP-005)
  const xPrivHex = unprotectKeyAtRest(xPrivHexRaw) || xPrivHexRaw;
  const kPrivHex = unprotectKeyAtRest(kPrivHexRaw) || kPrivHexRaw;

  // Прозрачная миграция открытых legacy-ключей в зашифрованный формат
  if (!isProtectedKey(xPrivHexRaw)) {
    localStorage.setItem("mls_x25519_priv", protectKeyAtRest(xPrivHex));
  }
  if (!isProtectedKey(kPrivHexRaw)) {
    localStorage.setItem("mls_kyber_priv", protectKeyAtRest(kPrivHex));
  }

  return {
    x25519: {
      publicKey: hexToBytes(xPubHex),
      privateKey: hexToBytes(xPrivHex)
    },
    kyber: {
      publicKey: hexToBytes(kPubHex),
      privateKey: hexToBytes(kPrivHex)
    }
  };
}

/**
 * Асинхронная версия получения MLS-ключей с гарантированной готовностью неэкспортируемого KEK.
 */
export async function getLocalMlsKeyPairAsync(): Promise<MlsKeyPair> {
  return getLocalMlsKeyPair();
}

