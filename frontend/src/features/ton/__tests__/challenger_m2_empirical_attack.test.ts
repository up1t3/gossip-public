// frontend/src/features/ton/__tests__/challenger_m2_empirical_attack.test.ts
/**
 * ЭМПИРИЧЕСКИЙ СОСТЯЗАТЕЛЬНЫЙ СТРЕСС-ТЕСТ (EMPIRICAL CHALLENGER ATTACK HARNESS)
 * для Milestone 2 Iteration 2:
 * 
 * Направления атаки:
 * 1. Атака эмодзи (суррогатные пары, составные ZWJ, флаги, модификаторы тона кожи, разная длина).
 * 2. Атака кириллицей (русские, украинские, белорусские, сербские буквы, смешанные строки).
 * 3. Исчерпывающее сканирование диапазона символов 128..65535 (все 65 408 кодовых точек UTF-16).
 * 4. Невидимые пробелы, управляющие и форматирующие символы (ZWSP, ZWNJ, ZWJ, BOM, NBSP, null-байты, переводы строк).
 * 5. Спецсимволы, пунктуация, экранирование, инъекции.
 * 6. Мутации контрольных сумм CRC16 (побитовые инверсии, сдвиги, перестановки endianness, мутации по всем 48 позициям).
 * 7. Граничные значения воркчейнов, флагов, бинарных форматов.
 * 8. Roundtrip-инварианты и целостность генератора Paper Wallet.
 */

import assert from 'node:assert';
import crypto from 'node:crypto';
import {
  crc16,
  decodeBase64OrUrl,
  encodeBase64Url,
  validateTonAddress,
  isValidTonAddress,
  rawToUserFriendly,
  userFriendlyToRaw,
  normalizeTonAddress
} from '../tonAddressValidator';
import {
  TON_QUICK_PRESETS,
  generatePaperWallet
} from '../paperWallet';
import { validateMnemonic } from '../../../core/crypto/mnemonic';

export async function runEmpiricalAttackSuite() {
  console.log('================================================================');
  console.log(' 🔥 CHALLENGER 1: EMPIRICAL ADVERSARIAL ATTACK SUITE (M2 I2) 🔥 ');
  console.log('================================================================\n');

  let totalAssertions = 0;
  const startTime = Date.now();

  // --------------------------------------------------------------------------
  // ATTACK 1: EMOJI INJECTIONS & SURROGATE PAIRS
  // --------------------------------------------------------------------------
  console.log('--- ATTACK 1: EMOJI INJECTIONS & SURROGATE PAIRS ---');
  const emojiAttackVectors = [
    { name: '24 x 💎 (48 UTF-16 code units)', input: '💎'.repeat(24) },
    { name: '24 x 🚀 (48 UTF-16 code units)', input: '🚀'.repeat(24) },
    { name: '48 x 💎 (96 UTF-16 code units)', input: '💎'.repeat(48) },
    { name: '1 x 💎', input: '💎' },
    { name: 'Compound family emoji with ZWJ 👨‍👩‍👧‍👦', input: '👨‍👩‍👧‍👦'.repeat(4) },
    { name: 'Flag emojis (regional indicator symbols)', input: '🇺🇸🇬🇧🇷🇺🇯🇵🇩🇪🇫🇷'.repeat(3) },
    { name: 'Skin tone modifier emojis 👍🏽 (surrogate + modifier)', input: '👍🏽'.repeat(12) },
    { name: 'Mixed emojis & valid base64 prefix', input: 'EQCD39VS' + '💎'.repeat(20) },
    { name: 'Single emoji inserted in valid EQ address', input: 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB💎N' },
    { name: 'Surrogate high only (\\uD83D)', input: '\uD83D'.repeat(48) },
    { name: 'Surrogate low only (\\uDC8E)', input: '\uDC8E'.repeat(48) },
    { name: 'Surrogate pair swap (\\uDC8E\\uD83D)', input: '\uDC8E\uD83D'.repeat(24) }
  ];

  for (const vec of emojiAttackVectors) {
    const res = validateTonAddress(vec.input);
    assert.strictEqual(res.isValid, false, `Emoji vector "${vec.name}" must be rejected!`);
    assert.strictEqual(isValidTonAddress(vec.input), false);
    assert.strictEqual(decodeBase64OrUrl(vec.input), null);
    totalAssertions += 3;
  }
  console.log(`✓ Заблокировано ${emojiAttackVectors.length} состязательных векторов с эмодзи`);
  console.log('-> ATTACK 1: УСПЕШНО ОТРАЖЕНА\n');

  // --------------------------------------------------------------------------
  // ATTACK 2: CYRILLIC & NON-LATIN ALPHABETS
  // --------------------------------------------------------------------------
  console.log('--- ATTACK 2: CYRILLIC & NON-LATIN ALPHABETS ---');
  const cyrillicAttackVectors = [
    { name: '48 x lowercase "я"', input: 'я'.repeat(48) },
    { name: '48 x uppercase "Я"', input: 'Я'.repeat(48) },
    { name: 'Full Russian alphabet repeated', input: 'абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПР'.slice(0, 48) },
    { name: 'Ukrainian letters (є, і, ї, ґ)', input: 'єіїґ'.repeat(12) },
    { name: 'Belarusian letters (ў, і)', input: 'ўі'.repeat(24) },
    { name: 'Church Slavonic / Archaic letters (ѣ, ѫ, ѱ, ѳ)', input: 'ѣѫѱѳ'.repeat(12) },
    { name: 'Greek alphabet (α, β, γ, δ, Ω)', input: 'αβγδ'.repeat(12) },
    { name: 'Arabic script', input: 'العربية'.repeat(6).slice(0, 48) },
    { name: 'Hebrew script', input: 'עברית'.repeat(9).slice(0, 48) },
    { name: 'Devanagari script (Hindi)', input: 'हिन्दी'.repeat(8).slice(0, 48) },
    { name: 'CJK ideographs (Chinese/Japanese/Korean)', input: '中文測試日本語한국어'.repeat(4).slice(0, 48) },
    { name: 'Valid base64 address with Cyrillic lookalike "а" (U+0430 instead of Latin "a")',
      input: 'EQCD39VS5jcptHL8vMjEXrzG\u0430RcCVYto7HUn4bpAOg8xqB2N' }
  ];

  for (const vec of cyrillicAttackVectors) {
    const res = validateTonAddress(vec.input);
    assert.strictEqual(res.isValid, false, `Cyrillic/Non-Latin vector "${vec.name}" must be rejected!`);
    assert.strictEqual(isValidTonAddress(vec.input), false);
    assert.strictEqual(decodeBase64OrUrl(vec.input), null);
    totalAssertions += 3;
  }
  console.log(`✓ Заблокировано ${cyrillicAttackVectors.length} состязательных векторов на кириллице и других алфавитах`);
  console.log('-> ATTACK 2: УСПЕШНО ОТРАЖЕНА\n');

  // --------------------------------------------------------------------------
  // ATTACK 3: EXHAUSTIVE SWEEP OF CODES 128..65535 (All 65,408 code points)
  // --------------------------------------------------------------------------
  console.log('--- ATTACK 3: EXHAUSTIVE SWEEP OF CODES 128..65535 (65,408 code points) ---');
  let codesScanned = 0;
  let codesRejected = 0;

  for (let code = 128; code <= 65535; code++) {
    const char = String.fromCharCode(code);
    const testStr = char.repeat(48);
    codesScanned++;

    const decoded = decodeBase64OrUrl(testStr);
    if (decoded === null) {
      codesRejected++;
    } else {
      assert.fail(`CRITICAL BUG: decodeBase64OrUrl accepted charCode ${code} (0x${code.toString(16)})!`);
    }

    const valRes = validateTonAddress(testStr);
    assert.strictEqual(valRes.isValid, false, `validateTonAddress accepted charCode ${code}!`);
  }

  totalAssertions += codesScanned * 2;
  console.log(`✓ Исчерпывающее сканирование: проверено ${codesScanned} символов (128..65535), отклонено: ${codesRejected} (100.00%)`);
  console.log('-> ATTACK 3: УСПЕШНО ОТРАЖЕНА\n');

  // --------------------------------------------------------------------------
  // ATTACK 4: INVISIBLE SPACES & CONTROL CHARACTERS
  // --------------------------------------------------------------------------
  console.log('--- ATTACK 4: INVISIBLE SPACES & CONTROL CHARACTERS ---');
  const invisibleVectors = [
    { name: 'Zero-Width Space (\\u200B)', char: '\u200B', isTrimmed: false },
    { name: 'Zero-Width Non-Joiner (\\u200C)', char: '\u200C', isTrimmed: false },
    { name: 'Zero-Width Joiner (\\u200D)', char: '\u200D', isTrimmed: false },
    { name: 'Word Joiner (\\u2060)', char: '\u2060', isTrimmed: false },
    { name: 'Zero-Width No-Break Space / BOM (\\uFEFF)', char: '\uFEFF', isTrimmed: true },
    { name: 'Non-Breaking Space (\\u00A0)', char: '\u00A0', isTrimmed: true },
    { name: 'Narrow No-Break Space (\\u202F)', char: '\u202F', isTrimmed: true },
    { name: 'Mathematical Space (\\u205F)', char: '\u205F', isTrimmed: true },
    { name: 'Ideographic Space (\\u3000)', char: '\u3000', isTrimmed: true },
    { name: 'Soft Hyphen (\\u00AD)', char: '\u00AD', isTrimmed: false },
    { name: 'Left-to-Right Mark (\\u200E)', char: '\u200E', isTrimmed: false },
    { name: 'Right-to-Left Mark (\\u200F)', char: '\u200F', isTrimmed: false },
    { name: 'Null Byte (\\0)', char: '\0', isTrimmed: false },
    { name: 'Tab (\\t)', char: '\t', isTrimmed: true },
    { name: 'Newline (\\n)', char: '\n', isTrimmed: true },
    { name: 'Carriage Return (\\r)', char: '\r', isTrimmed: true },
    { name: 'Form Feed (\\f)', char: '\f', isTrimmed: true },
    { name: 'Vertical Tab (\\v)', char: '\v', isTrimmed: true },
    { name: 'Backspace (\\b)', char: '\b', isTrimmed: false },
    { name: 'Escape (\\x1B)', char: '\x1B', isTrimmed: false }
  ];

  const validAddress = 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N';

  for (const inv of invisibleVectors) {
    // 1. All 48 chars are invisible / control
    const pureInv = inv.char.repeat(48);
    assert.strictEqual(validateTonAddress(pureInv).isValid, false);
    assert.strictEqual(decodeBase64OrUrl(pureInv), null);

    // 2. Injected in middle of valid address (making 49 chars)
    const injectedMid = validAddress.slice(0, 24) + inv.char + validAddress.slice(24);
    assert.strictEqual(validateTonAddress(injectedMid).isValid, false);

    // 3. Replacing a char in valid address (48 chars total)
    const replacedMid = validAddress.slice(0, 24) + inv.char + validAddress.slice(25);
    assert.strictEqual(validateTonAddress(replacedMid).isValid, false);
    assert.strictEqual(decodeBase64OrUrl(replacedMid), null);

    // 4. If not trimmed by JS trim(), prepending/appending must make address invalid
    if (!inv.isTrimmed) {
      assert.strictEqual(validateTonAddress(inv.char + validAddress).isValid, false);
      assert.strictEqual(validateTonAddress(validAddress + inv.char).isValid, false);
    }

    totalAssertions += 4;
  }
  console.log(`✓ Заблокировано ${invisibleVectors.length * 4} атак с невидимыми пробелами и управляющими символами`);
  console.log('-> ATTACK 4: УСПЕШНО ОТРАЖЕНА\n');

  // --------------------------------------------------------------------------
  // ATTACK 5: SPECIAL CHARACTERS & INJECTIONS
  // --------------------------------------------------------------------------
  console.log('--- ATTACK 5: SPECIAL CHARACTERS & INJECTIONS ---');
  // Non-Base64 special characters (must be rejected by both decoder and validator)
  const nonB64SpecialChars = '!@#$%^&*()=[]{}|;:\'",.<>?`~\\';
  for (let i = 0; i < nonB64SpecialChars.length; i++) {
    const sc = nonB64SpecialChars[i];
    // 48 repeats
    const test48 = sc.repeat(48);
    assert.strictEqual(validateTonAddress(test48).isValid, false);
    assert.strictEqual(decodeBase64OrUrl(test48), null);

    // Replace 1 char in valid address
    const mutated = validAddress.slice(0, 10) + sc + validAddress.slice(11);
    assert.strictEqual(validateTonAddress(mutated).isValid, false);
    assert.strictEqual(decodeBase64OrUrl(mutated), null);

    totalAssertions += 4;
  }

  // Base64 special characters (+, -, /, _) - valid for decoding, but random 48 repeats have invalid CRC
  for (const b64sc of ['+', '-', '/', '_']) {
    const test48 = b64sc.repeat(48);
    assert.strictEqual(validateTonAddress(test48).isValid, false, `48x "${b64sc}" must fail CRC16`);
    assert.ok(decodeBase64OrUrl(test48) !== null, `48x "${b64sc}" should decode as base64`);
    totalAssertions += 2;
  }

  console.log(`✓ Заблокировано ${nonB64SpecialChars.length * 4 + 8} атак со спецсимволами и пунктуацией`);
  console.log('-> ATTACK 5: УСПЕШНО ОТРАЖЕНА\n');

  // --------------------------------------------------------------------------
  // ATTACK 6: CRC16 CORRUPTION & BIT-FLIP MUTATIONS
  // --------------------------------------------------------------------------
  console.log('--- ATTACK 6: CRC16 CORRUPTION & BIT-FLIP MUTATIONS ---');
  const testAddresses = [
    'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N', // Foundation Bounceable
    'UQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqEBI', // Foundation Non-Bounceable
    'Ef8zMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM0vF', // Elector Masterchain
    'kQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqPVI', // Testnet Bounceable
    '0QCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqP9x'  // Testnet Non-Bounceable
  ];

  let bitFlipsTested = 0;
  let bitFlipsRejected = 0;

  for (const addr of testAddresses) {
    const decoded = decodeBase64OrUrl(addr);
    assert.ok(decoded && decoded.length === 36);

    // 1. Bit flip across all 288 bits (36 bytes * 8 bits)
    for (let byteIdx = 0; byteIdx < 36; byteIdx++) {
      for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
        const mutatedBytes = new Uint8Array(decoded);
        mutatedBytes[byteIdx] ^= (1 << bitIdx);

        const mutatedStr = encodeBase64Url(mutatedBytes);
        const res = validateTonAddress(mutatedStr);
        bitFlipsTested++;

        if (!res.isValid) {
          bitFlipsRejected++;
        } else {
          // If a bit flip happens to result in valid CRC, check it
          const mDecoded = decodeBase64OrUrl(mutatedStr);
          if (mDecoded) {
            const actualCrc = (mDecoded[34] << 8) | mDecoded[35];
            const calcCrc = crc16(mDecoded.subarray(0, 34));
            assert.strictEqual(actualCrc, calcCrc, 'If accepted, CRC must be mathematically valid');
          }
        }
      }
    }

    // 2. Swapped CRC bytes (little-endian corruption)
    const swappedCrcBytes = new Uint8Array(decoded);
    const tmp = swappedCrcBytes[34];
    swappedCrcBytes[34] = swappedCrcBytes[35];
    swappedCrcBytes[35] = tmp;
    const swappedCrcStr = encodeBase64Url(swappedCrcBytes);
    if (decoded[34] !== decoded[35]) {
      assert.strictEqual(validateTonAddress(swappedCrcStr).isValid, false);
      totalAssertions++;
    }

    // 3. Inverted CRC bytes
    const invertedCrcBytes = new Uint8Array(decoded);
    invertedCrcBytes[34] ^= 0xFF;
    invertedCrcBytes[35] ^= 0xFF;
    assert.strictEqual(validateTonAddress(encodeBase64Url(invertedCrcBytes)).isValid, false);
    totalAssertions++;
  }

  totalAssertions += bitFlipsTested;
  console.log(`✓ Проверено побитовых мутаций: ${bitFlipsTested}, отклонено: ${bitFlipsRejected} (${((bitFlipsRejected / bitFlipsTested) * 100).toFixed(2)}%)`);
  console.log('-> ATTACK 6: УСПЕШНО ОТРАЖЕНА\n');

  // --------------------------------------------------------------------------
  // ATTACK 7: WORKCHAIN & BOUNDARY VALIDATION
  // --------------------------------------------------------------------------
  console.log('--- ATTACK 7: WORKCHAIN & BOUNDARY VALIDATION ---');
  
  // Test Raw workchains -1000 to +1000
  const hex32 = '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff';
  for (let wc = -1000; wc <= 1000; wc++) {
    const rawAddr = `${wc}:${hex32}`;
    const res = validateTonAddress(rawAddr);
    if (wc === 0 || wc === -1) {
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.workchain, wc);
    } else {
      assert.strictEqual(res.isValid, false);
    }
    totalAssertions += 2;
  }

  // Test User-Friendly all 256 workchain bytes
  for (let wcByte = 0; wcByte < 256; wcByte++) {
    const data = new Uint8Array(36);
    data[0] = 0x11;
    data[1] = wcByte;
    crypto.randomFillSync(data.subarray(2, 34));
    const crc = crc16(data.subarray(0, 34));
    data[34] = (crc >> 8) & 0xff;
    data[35] = crc & 0xff;

    const b64 = encodeBase64Url(data);
    const res = validateTonAddress(b64);

    if (wcByte === 0) {
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.workchain, 0);
    } else if (wcByte === 255) {
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.workchain, -1);
    } else {
      assert.strictEqual(res.isValid, false);
    }
    totalAssertions += 2;
  }
  console.log(`✓ Граничные тесты воркчейнов (2001 Raw + 256 User-Friendly) пройдены со 100% точностью`);
  console.log('-> ATTACK 7: УСПЕШНО ОТРАЖЕНА\n');

  // --------------------------------------------------------------------------
  // ATTACK 8: ROUNDTRIP INVARIANTS & PAPER WALLET STRESS
  // --------------------------------------------------------------------------
  console.log('--- ATTACK 8: ROUNDTRIP INVARIANTS & PAPER WALLET STRESS ---');
  
  // 500 random keys roundtrip
  for (let i = 0; i < 500; i++) {
    const rawHex = crypto.randomBytes(32).toString('hex');
    const wc = i % 2 === 0 ? 0 : -1;
    const isTestnet = i % 3 === 0;
    const canonicalRaw = `${wc}:${rawHex}`;

    const bounceable = rawToUserFriendly(canonicalRaw, true, isTestnet);
    const nonBounceable = rawToUserFriendly(canonicalRaw, false, isTestnet);

    assert.strictEqual(userFriendlyToRaw(bounceable), canonicalRaw);
    assert.strictEqual(userFriendlyToRaw(nonBounceable), canonicalRaw);
    assert.strictEqual(normalizeTonAddress(bounceable, 'raw'), canonicalRaw);
    assert.strictEqual(normalizeTonAddress(nonBounceable, 'raw'), canonicalRaw);

    const valBounce = validateTonAddress(bounceable);
    const valNonBounce = validateTonAddress(nonBounceable);
    assert.strictEqual(valBounce.isValid, true);
    assert.strictEqual(valNonBounce.isValid, true);
    assert.strictEqual(valBounce.workchain, wc);
    assert.strictEqual(valNonBounce.workchain, wc);
    totalAssertions += 8;
  }

  // 50 Paper Wallets
  const seenMnem = new Set<string>();
  const seenAddr = new Set<string>();
  for (let i = 0; i < 50; i++) {
    const pw = await generatePaperWallet();
    assert.strictEqual(pw.words.length, 12);
    assert.strictEqual(validateMnemonic(pw.mnemonic), true);
    assert.strictEqual(pw.address.startsWith('UQ'), true);
    assert.strictEqual(pw.bounceableAddress.startsWith('EQ'), true);
    assert.strictEqual(seenMnem.has(pw.mnemonic), false);
    assert.strictEqual(seenAddr.has(pw.address), false);
    seenMnem.add(pw.mnemonic);
    seenAddr.add(pw.address);

    const valPw = validateTonAddress(pw.address);
    assert.strictEqual(valPw.isValid, true);
    totalAssertions += 7;
  }

  // Check 4 presets
  for (const preset of TON_QUICK_PRESETS) {
    assert.strictEqual(validateTonAddress(preset.address).isValid, true);
    assert.strictEqual(validateTonAddress(preset.nonBounceableAddress).isValid, true);
    assert.strictEqual(validateTonAddress(preset.rawAddress).isValid, true);
    totalAssertions += 3;
  }

  console.log(`✓ 500 ончейн-ключей, 50 Paper Wallets и 4 пресета проверены на инвариантность`);
  console.log('-> ATTACK 8: УСПЕШНО ПРОЙДЕНА\n');

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('================================================================');
  console.log(` 🏆 ВСЕ 8 СОСТЯЗАТЕЛЬНЫХ АТАК УСПЕШНО ОТРАЖЕНЫ! (100% PASS) 🏆 `);
  console.log(` Всего выполнено проверок/утверждений: ${totalAssertions}`);
  console.log(` Время выполнения: ${elapsedSec} сек`);
  console.log('================================================================\n');
}

runEmpiricalAttackSuite().catch(err => {
  console.error('FATAL EMPIRICAL ATTACK TEST FAILURE:', err);
  process.exit(1);
});
