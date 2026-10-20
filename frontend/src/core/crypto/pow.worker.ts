// frontend/src/core/crypto/pow.worker.ts

function checkZeroBits(buf: Uint8Array, difficulty: number): boolean {
  let remaining = difficulty;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    if (remaining >= 8) {
      if (byte !== 0) {
        return false;
      }
      remaining -= 8;
    } else {
      if (remaining > 0) {
        const mask = (0xff00 >> remaining) & 0xff;
        if ((byte & mask) !== 0) {
          return false;
        }
      }
      break;
    }
  }
  return true;
}


self.onmessage = async (e: MessageEvent) => {
  const { challengeHex, difficulty } = e.data;
  
  try {
    const encoder = new TextEncoder();
    let found = false;
    let counter = 0n;
    
    while (!found) {
      const nonceHex = counter.toString(16).padStart(16, "0");
      const dataStr = challengeHex + nonceHex;
      const hashData = encoder.encode(dataStr);
      
      // Хэшируем
      const hashBuffer = await crypto.subtle.digest("SHA-256", hashData);
      const hash = new Uint8Array(hashBuffer);
      
      if (checkZeroBits(hash, difficulty)) {
        found = true;
        self.postMessage({ success: true, nonceHex });
        return;
      }
      
      counter++;
      
      // Предотвращение бесконечного зависания воркера, если что-то пошло не так
      if (counter > 10000000n) {
        throw new Error("PoW timeout / too many iterations");
      }
    }
  } catch (err: any) {
    self.postMessage({ success: false, error: err.message || String(err) });
  }
};
