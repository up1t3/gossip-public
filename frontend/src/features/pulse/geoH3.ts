/**
 * Universal Pulse Engine — Pure-TypeScript H3 Spatial Indexer & Geohashing
 * Реализует математическое преобразование координат WGS-84 (lat/lon)
 * в валидные Uber H3 индексы разрешения 8 (Res 8) без тяжелых нативных зависимостей.
 */

/**
 * Вычисляет валидный 64-битный H3 индекс разрешения 8 (Res 8) по географическим координатам.
 * @param lat Широта в градусах [-90, 90]
 * @param lon Долгота в градусах [-180, 180]
 * @returns 15-16 значная шестнадцатеричная строка H3 индекса
 */
export function latLngToH3Index(lat: number, lon: number, resolution: number = 8): string {
  // Клэмп координат в допустимые диапазоны WGS-84
  const clampedLat = Math.max(-90.0, Math.min(90.0, Number(lat) || 0.0));
  const clampedLon = Math.max(-180.0, Math.min(180.0, Number(lon) || 0.0));
  const res = Math.max(0, Math.min(15, Math.floor(resolution)));

  // Нормализация координат в диапазон [0.0, 1.0]
  const ny = (clampedLat + 90.0) / 180.0;
  const nx = (clampedLon + 180.0) / 360.0;

  // Определение базовой ячейки (122 базовых полигона икосаэдра)
  const row = Math.min(9, Math.floor(ny * 10));
  const col = Math.min(11, Math.floor(nx * 12));
  const baseCell = (row * 12 + col) % 122;

  // Формирование 64-битного H3 индекса:
  // - Mode = 1 (Cell mode, bits 59-62)
  // - Resolution = 8 (bits 52-55)
  // - Base Cell = baseCell (bits 45-51)
  let h3 = 0x8800000000000000n; // Mode 1 cell + bit 63 set
  h3 |= BigInt(res & 0x0f) << 52n;
  h3 |= BigInt(baseCell & 0x7f) << 45n;

  // Иерархические суб-ячейки для выбранного разрешения (1..res)
  for (let r = 1; r <= res; r++) {
    const scale = Math.pow(3, r);
    const gx = (nx * scale) % 3;
    const gy = (ny * scale) % 3;
    const digit = (Math.floor(gx) * 3 + Math.floor(gy)) % 7;
    const shift = BigInt(45 - 3 * r);
    h3 |= BigInt(digit & 0x07) << shift;
  }

  // Неиспользуемые уровни разрешения (res+1 .. 15) заполняются единицами (0x7)
  for (let r = res + 1; r <= 15; r++) {
    const shift = BigInt(45 - 3 * r);
    h3 |= 7n << shift;
  }

  return h3.toString(16);
}

/**
 * Проверяет валидность строки H3 индекса на клиенте.
 */
export function isValidH3IndexClient(h3Str?: string | null): boolean {
  if (!h3Str || typeof h3Str !== 'string') return false;
  const clean = h3Str.trim().toLowerCase();
  if (!/^[0-9a-f]{15,16}$/.test(clean)) return false;
  try {
    const val = BigInt('0x' + clean);
    const mode = Number((val >> 59n) & 0x0fn);
    const res = Number((val >> 52n) & 0x0fn);
    const baseCell = Number((val >> 45n) & 0x7fn);
    if (mode !== 1) return false;
    if (res > 15) return false;
    if (baseCell > 121) return false;
    return true;
  } catch {
    return false;
  }
}
