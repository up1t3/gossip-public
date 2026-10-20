// frontend/src/core/crypto/pow.ts
import { sha256 } from "../tdlib/crypto";

function checkZeroBits(buf: Uint8Array, difficulty: number): boolean {
  let remaining = difficulty;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    if (remaining >= 8) {
      if (byte !== 0) return false;
      remaining -= 8;
    } else {
      if (remaining > 0) {
        const mask = (0xff00 >> remaining) & 0xff;
        if ((byte & mask) !== 0) return false;
      }
      break;
    }
  }
  return true;
}

// Синхронный/Асинхронный fallback прямого вычисления
export async function solvePoWDirect(challengeHex: string, difficulty: number): Promise<string> {
  const encoder = new TextEncoder();
  let counter = 0n;
  
  while (true) {
    const nonceHex = counter.toString(16).padStart(16, "0");
    const dataStr = challengeHex + nonceHex;
    const hashData = encoder.encode(dataStr);
    const hash = await sha256(hashData);
    
    if (checkZeroBits(hash, difficulty)) {
      return nonceHex;
    }
    
    counter++;
    if (counter > 1000000n) {
      throw new Error("PoW fallback timeout");
    }
  }
}

export function solvePoW(challengeHex: string, difficulty: number): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Инициализируем воркер через стандартный URL-синтаксис Vite
      const worker = new Worker(
        new URL("./pow.worker.ts", import.meta.url),
        { type: "module" }
      );
      
      worker.onmessage = (e: MessageEvent) => {
        const { success, nonceHex, error } = e.data;
        worker.terminate();
        if (success) {
          resolve(nonceHex);
        } else {
          reject(new Error(error || "Неизвестная ошибка PoW воркера"));
        }
      };
      
      worker.onerror = (err) => {
        console.warn("[PoW] Ошибка запуска Web Worker. Переход на прямой расчет.", err);
        worker.terminate();
        solvePoWDirect(challengeHex, difficulty).then(resolve).catch(reject);
      };
      
      worker.postMessage({ challengeHex, difficulty });
    } catch (e) {
      console.warn("[PoW] Исключение при создании Web Worker. Переход на прямой расчет.", e);
      solvePoWDirect(challengeHex, difficulty).then(resolve).catch(reject);
    }
  });
}
