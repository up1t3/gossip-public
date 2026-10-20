// frontend/src/features/pulse/__tests__/geoH3.challenger.adversarial.ts
/**
 * EMPIRICAL CHALLENGER STRESS HARNESS — Milestone 2
 * Deep adversarial testing of Pure-TypeScript H3 Spatial Indexer (geoH3.ts)
 */

import { latLngToH3Index, isValidH3IndexClient } from '../geoH3';

console.log('================================================================');
console.log('   CHALLENGER 1: EMPIRICAL STRESS HARNESS — H3 SPATIAL INDEXER  ');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function check(desc: string, condition: boolean, details?: string) {
  totalTests++;
  if (!condition) {
    throw new Error(`Assertion failed: ${desc} ${details ? `(${details})` : ''}`);
  }
  passedTests++;
}

// -----------------------------------------------------------------------------
// HARNESS 1: Full-Globe Coordinate Grid Sweep (5,329 Points)
// -----------------------------------------------------------------------------
console.log('[HARNESS 1] Full-Globe Coordinate Grid Sweep (5,329 WGS-84 Points)...');
let gridCount = 0;
for (let lat = -90; lat <= 90; lat += 2.5) {
  for (let lon = -180; lon <= 180; lon += 5) {
    gridCount++;
    const h3 = latLngToH3Index(lat, lon, 8);
    check(
      `Grid point [${lat}, ${lon}] produces valid H3`,
      isValidH3IndexClient(h3),
      `lat=${lat}, lon=${lon}, h3=${h3}`
    );
    
    // Проверка структуры битов 64-битного H3
    const val = BigInt('0x' + h3);
    const mode = Number((val >> 59n) & 0x0fn);
    const res = Number((val >> 52n) & 0x0fn);
    const baseCell = Number((val >> 45n) & 0x7fn);
    
    check(`Mode must be 1 for [${lat}, ${lon}]`, mode === 1, `got mode=${mode}`);
    check(`Res must be 8 for [${lat}, ${lon}]`, res === 8, `got res=${res}`);
    check(`BaseCell must be in [0, 121] for [${lat}, ${lon}]`, baseCell >= 0 && baseCell <= 121, `got baseCell=${baseCell}`);
    
    // Проверка заполнения неиспользуемых бит 9..15 единицами (0x7)
    for (let r = 9; r <= 15; r++) {
      const shift = BigInt(45 - 3 * r);
      const digit = Number((val >> shift) & 7n);
      check(`Unused resolution level ${r} must be 7`, digit === 7, `got digit=${digit} at res ${r}`);
    }
  }
}
console.log(`  -> Checked ${gridCount} global grid coordinates. All 100% PASS.\n`);

// -----------------------------------------------------------------------------
// HARNESS 2: All Resolutions 0..15 & Out-of-Bound Resolution Clamping
// -----------------------------------------------------------------------------
console.log('[HARNESS 2] Resolution Sweep (Res 0..15 + Clamping)...');
for (let r = 0; r <= 15; r++) {
  const h3 = latLngToH3Index(55.7558, 37.6173, r);
  check(`Res ${r} produces valid H3`, isValidH3IndexClient(h3), `res=${r}, h3=${h3}`);
  const val = BigInt('0x' + h3);
  const parsedRes = Number((val >> 52n) & 0x0fn);
  check(`Extracted res must equal ${r}`, parsedRes === r, `got parsedRes=${parsedRes}`);
}

// Out-of-bound resolutions should be clamped safely [0, 15]
const h3_neg = latLngToH3Index(55.75, 37.61, -5);
const val_neg = BigInt('0x' + h3_neg);
check(`Negative resolution clamped to 0`, Number((val_neg >> 52n) & 0x0fn) === 0);

const h3_overflow = latLngToH3Index(55.75, 37.61, 999);
const val_overflow = BigInt('0x' + h3_overflow);
check(`Overflow resolution clamped to 15`, Number((val_overflow >> 52n) & 0x0fn) === 15);
console.log('  -> Resolution clamping and bit-layout 100% PASS.\n');

// -----------------------------------------------------------------------------
// HARNESS 3: Boundary Coordinates & Clamping (Poles, Antimeridian, Infinite/NaN)
// -----------------------------------------------------------------------------
console.log('[HARNESS 3] Boundary Coordinates & Extreme Inputs...');
const extremeCoords = [
  { desc: 'North Pole exact', lat: 90.0, lon: 0.0 },
  { desc: 'South Pole exact', lat: -90.0, lon: 0.0 },
  { desc: 'Prime Meridian Equator', lat: 0.0, lon: 0.0 },
  { desc: 'Antimeridian +180', lat: 0.0, lon: 180.0 },
  { desc: 'Antimeridian -180', lat: 0.0, lon: -180.0 },
  { desc: 'North-East limit', lat: 89.999999, lon: 179.999999 },
  { desc: 'South-West limit', lat: -89.999999, lon: -179.999999 },
  { desc: 'Latitude overshoot +500', lat: 500.0, lon: 37.6 },
  { desc: 'Latitude undershoot -500', lat: -500.0, lon: 37.6 },
  { desc: 'Longitude overshoot +1000', lat: 55.7, lon: 1000.0 },
  { desc: 'Longitude undershoot -1000', lat: 55.7, lon: -1000.0 },
  { desc: 'NaN latitude', lat: NaN, lon: 37.6 },
  { desc: 'Infinity longitude', lat: 55.7, lon: Infinity },
];

for (const ec of extremeCoords) {
  const h3 = latLngToH3Index(ec.lat, ec.lon, 8);
  check(`Extreme coord "${ec.desc}" produces valid H3`, isValidH3IndexClient(h3), `h3=${h3}`);
}
console.log('  -> Boundary coordinates and clamping 100% PASS.\n');

// -----------------------------------------------------------------------------
// HARNESS 4: Adversarial H3 Validator Fuzzing (Bit-mutation & Corrupted strings)...
// -----------------------------------------------------------------------------
console.log('[HARNESS 4] Adversarial H3 Validator Fuzzing (Bit-mutation & Corrupted strings)...');
const invalidTokens = [
  '',
  '   ',
  null as any,
  undefined as any,
  12345 as any,
  {},
  '888cf4340e5fff',       // 14 chars (too short)
  '888cf4340e5ffffff0',   // 18 chars (too long)
  '888cf4340e5ffffg',     // 'g' invalid hex
  'zzzzzzzzzzzzzzzz',
  '0000000000000000',     // mode = 0
  '008cf4340e5fffff',     // mode = 0
  '108cf4340e5fffff',     // mode = 2 (not cell mode)
  '208cf4340e5fffff',     // mode = 4
  '888cf4340e5fffff'.toUpperCase(), // valid hex check with uppercase (must pass if case-insensitive)
];

for (const tok of invalidTokens) {
  if (typeof tok === 'string' && tok.toUpperCase() === '888CF4340E5FFFFF') {
    check('Uppercase valid hex should be accepted', isValidH3IndexClient(tok) === true);
    continue;
  }
  check(`Invalid token "${tok}" correctly rejected`, isValidH3IndexClient(tok) === false, `tok=${tok}`);
}

// Bit mutation: baseCell >= 122 (bits 45-51)
for (let badBase = 122; badBase <= 127; badBase++) {
  let val = 0x8800000000000000n; // Mode 1
  val |= 8n << 52n; // Res 8
  val |= BigInt(badBase & 0x7f) << 45n;
  for (let r = 9; r <= 15; r++) {
    val |= 7n << BigInt(45 - 3 * r);
  }
  const hex = val.toString(16);
  check(`BaseCell ${badBase} > 121 must be rejected`, isValidH3IndexClient(hex) === false, `hex=${hex}`);
}

console.log('  -> Adversarial H3 Validator Fuzzing 100% PASS.\n');

console.log('================================================================');
console.log(`   ALL CHALLENGER HARNESSES PASSED: ${passedTests} checks executed  `);
console.log('================================================================\n');
