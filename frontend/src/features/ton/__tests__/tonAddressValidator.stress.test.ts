// frontend/src/features/ton/__tests__/tonAddressValidator.stress.test.ts
/**
 * Комплексный состязательный стресс-тест (Adversarial Stress Test Harness)
 * для валидатора TON-адресов (tonAddressValidator.ts) и Paper Wallets (paperWallet.ts).
 * 
 * Выполняет 7 состязательных измерений:
 * 1. Исчерпывающее тестирование опечаток в 1 символ (Single-Character Mutation) по всем 48 позициям.
 * 2. Граничное тестирование воркчейнов (все 256 значений байта воркчейна и крайние значения Raw).
 * 3. Тестирование всех комбинаций флагов (Mainnet/Testnet, Bounceable/Non-bounceable).
 * 4. Фаззинг (10 000 случайных строк, мусорных байт, SQL/XSS/Unicode инъекций, malformed hex/base64).
 * 5. Массовая проверка двусторонней конвертации (Roundtrip Invariants) на 1000 случайных ключах (12 000 утверждений).
 * 6. Тестирование гибридного Base64/Base64URL декодера на граничные случаи паддинга и спецсимволов.
 * 7. Стресс-тестирование генератора Paper Wallet на коллизии и энтропию.
 */

import assert from 'node:assert';
import crypto from 'node:crypto';
import {
  crc16,
  decodeBase64OrUrl,
  encodeBase64Url,
  validateTonAddress,
  rawToUserFriendly,
  userFriendlyToRaw,
  normalizeTonAddress
} from '../tonAddressValidator';
import {
  generatePaperWallet
} from '../paperWallet';
import { validateMnemonic } from '../../../core/crypto/mnemonic';

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

async function runAdversarialStressTests() {
  console.log('================================================================');
  console.log('  CHALLENGER 1 (M2): ADVERSARIAL STRESS TEST HARNESS FOR TON    ');
  console.log('================================================================\n');

  let totalAssertions = 0;
  const startTime = Date.now();

  // --------------------------------------------------------------------------
  // DIMENSION 1: SINGLE-CHARACTER MUTATIONS (1-char typos) across 48 positions
  // --------------------------------------------------------------------------
  console.log('--- DIMENSION 1: 1-Character Mutation / Typo Detection ---');
  const baseAddresses = [
    'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N', // TON Foundation Bounceable
    'UQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqEBI', // TON Foundation Non-Bounceable
    'Ef8zMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM0vF', // TON Elector Masterchain Bounceable
    'kQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqPVI'  // Testnet Bounceable
  ];

  let totalTyposTested = 0;
  let typosRejected = 0;
  let accidentalCollisions = 0;

  for (const baseAddr of baseAddresses) {
    for (let pos = 0; pos < baseAddr.length; pos++) {
      const origChar = baseAddr[pos];
      for (let c = 0; c < B64_CHARS.length; c++) {
        const altChar = B64_CHARS[c];
        if (altChar === origChar) continue;

        const mutated = baseAddr.slice(0, pos) + altChar + baseAddr.slice(pos + 1);
        totalTyposTested++;

        const res = validateTonAddress(mutated);
        if (!res.isValid) {
          typosRejected++;
        } else {
          // If a single typo happens to hit a valid CRC16 by astronomical coincidence (1 in 65536),
          // check if it is indeed a mathematically valid CRC collision
          const decoded = decodeBase64OrUrl(mutated);
          if (decoded && decoded.length === 36) {
            const payload = decoded.subarray(0, 34);
            const expectedCrc = (decoded[34] << 8) | decoded[35];
            const actualCrc = crc16(payload);
            if (expectedCrc === actualCrc) {
              accidentalCollisions++;
            } else {
              assert.fail(`CRITICAL BUG: validateTonAddress marked mutated address ${mutated} as valid despite CRC mismatch!`);
            }
          }
        }
      }
    }
  }

  totalAssertions += totalTyposTested;
  console.log(`✓ Проверено одиночных опечаток: ${totalTyposTested}`);
  console.log(`✓ Отклонено невалидных: ${typosRejected} (${((typosRejected / totalTyposTested) * 100).toFixed(2)}%)`);
  console.log(`✓ Математических коллизий CRC16 при 1-символьной замене: ${accidentalCollisions}`);
  assert.ok(typosRejected >= totalTyposTested - 5, 'Подавляющее большинство (99.9%+) 1-символьных опечаток обязано отбраковываться');
  console.log('-> DIMENSION 1: УСПЕШНО ПРОЙДЕН\n');

  // --------------------------------------------------------------------------
  // DIMENSION 2: EXHAUSTIVE WORKCHAIN BOUNDARY TESTING
  // --------------------------------------------------------------------------
  console.log('--- DIMENSION 2: Exhaustive Workchain Boundary Testing ---');
  
  // 2.1. Raw format workchain boundary checks (-500 to +500)
  const dummyHex = '00'.repeat(32);
  let rawWcTested = 0;
  for (let wc = -500; wc <= 500; wc++) {
    const rawAddr = `${wc}:${dummyHex}`;
    const res = validateTonAddress(rawAddr);
    rawWcTested++;
    if (wc === 0 || wc === -1) {
      assert.strictEqual(res.isValid, true, `Workchain ${wc} обязан быть валидным в Raw формате`);
      assert.strictEqual(res.workchain, wc);
    } else {
      assert.strictEqual(res.isValid, false, `Workchain ${wc} обязан быть ОТКЛОНЕН`);
      assert.ok(res.errorMessage?.includes('workchain ID'), `Сообщение об ошибке должно содержать информацию о workchain, получено: ${res.errorMessage}`);
    }
  }
  totalAssertions += rawWcTested;
  console.log(`✓ Проверено Raw workchains (-500 .. +500): ${rawWcTested} тестов`);

  // 2.2. User-Friendly format workchain byte testing (all 256 values with genuine CRC16)
  let ufWcTested = 0;
  for (let wcByte = 0; wcByte < 256; wcByte++) {
    const data = new Uint8Array(36);
    data[0] = 0x11; // Bounceable Mainnet flag
    data[1] = wcByte;
    crypto.randomFillSync(data.subarray(2, 34)); // Random 32-byte account hash
    const crc = crc16(data.subarray(0, 34));
    data[34] = (crc >> 8) & 0xff;
    data[35] = crc & 0xff;

    const b64 = encodeBase64Url(data);
    const res = validateTonAddress(b64);
    ufWcTested++;

    if (wcByte === 0x00) {
      // Workchain 0
      assert.strictEqual(res.isValid, true, 'User-Friendly wc 0x00 должен быть валиден');
      assert.strictEqual(res.workchain, 0);
    } else if (wcByte === 0xFF) {
      // Workchain -1
      assert.strictEqual(res.isValid, true, 'User-Friendly wc 0xFF должен быть валиден (-1)');
      assert.strictEqual(res.workchain, -1);
    } else {
      // Any other workchain byte (0x01 .. 0xFE)
      assert.strictEqual(res.isValid, false, `User-Friendly wcByte 0x${wcByte.toString(16)} обязан быть ОТКЛОНЕН`);
      assert.ok(res.errorMessage?.includes('workchain ID'), `Ошибка должна упоминать workchain, получено: ${res.errorMessage}`);
    }
  }
  totalAssertions += ufWcTested;
  console.log(`✓ Проверено всех 256 бинарных значений воркчейна в User-Friendly формате: ${ufWcTested} тестов`);
  console.log('-> DIMENSION 2: УСПЕШНО ПРОЙДЕН\n');

  // --------------------------------------------------------------------------
  // DIMENSION 3: FLAG COMBINATIONS (MAINNET/TESTNET, BOUNCEABLE/NON-BOUNCEABLE)
  // --------------------------------------------------------------------------
  console.log('--- DIMENSION 3: Flag Combinations & Tag Parsing ---');
  const flagConfigs = [
    { flags: 0x11, expectedBounceable: true, expectedTestnet: false, desc: 'Mainnet Bounceable (EQ / Ef)' },
    { flags: 0x51, expectedBounceable: false, expectedTestnet: false, desc: 'Mainnet Non-Bounceable (UQ / Uf)' },
    { flags: 0x91, expectedBounceable: true, expectedTestnet: true, desc: 'Testnet Bounceable (kQ / kf)' },
    { flags: 0xD1, expectedBounceable: false, expectedTestnet: true, desc: 'Testnet Non-Bounceable (0Q / 0f)' }
  ];

  for (const cfg of flagConfigs) {
    for (const wc of [0, 255]) {
      const data = new Uint8Array(36);
      data[0] = cfg.flags;
      data[1] = wc;
      data.fill(0x77, 2, 34);
      const crc = crc16(data.subarray(0, 34));
      data[34] = (crc >> 8) & 0xff;
      data[35] = crc & 0xff;

      const addr = encodeBase64Url(data);
      const res = validateTonAddress(addr);

      assert.strictEqual(res.isValid, true, `Флаг 0x${cfg.flags.toString(16)} должен быть валидным (${cfg.desc})`);
      assert.strictEqual(res.isBounceable, cfg.expectedBounceable);
      assert.strictEqual(res.isTestnet, cfg.expectedTestnet);
      assert.strictEqual(res.workchain, wc === 255 ? -1 : 0);
      totalAssertions += 4;
    }
  }
  console.log(`✓ Проверены все 4 канонических флаговых комбинации для обоих воркчейнов (8 вариантов)`);
  console.log('-> DIMENSION 3: УСПЕШНО ПРОЙДЕН\n');

  // --------------------------------------------------------------------------
  // DIMENSION 4: FUZZING & ADVERSARIAL INJECTIONS (10,000 cases)
  // --------------------------------------------------------------------------
  console.log('--- DIMENSION 4: Fuzzing & Malformed Injections (10,000 samples) ---');
  let fuzzPassedRejections = 0;

  // 4.1. Edge strings & Injection Payloads
  const injectionVectors = [
    '',
    ' ',
    '   \t\n  ',
    'null',
    'undefined',
    '[object Object]',
    'NaN',
    'Infinity',
    '-Infinity',
    '<script>alert("XSS")</script>',
    '0:DROP TABLE users;--',
    'SELECT * FROM accounts WHERE id = 1',
    'javascript:void(0)',
    'ton://transfer/EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N',
    'https://ton.org',
    'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N\0hidden',
    'EQCD39VS\r\n5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N', // перенос строки внутри
    'EQCD39VS 5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N', // пробел внутри
    '0:'.padEnd(66, 'g'), // invalid hex 'g'
    '0:'.padEnd(65, 'a'), // odd length hex (63 chars)
    '0:'.padEnd(67, 'a'), // too long hex (65 chars)
    ':83dfd552e63729b472fcbcc8c45ebcc6691702558b68ec7527e1ba403a0f31a8',
    '0::83dfd552e63729b472fcbcc8c45ebcc6691702558b68ec7527e1ba403a0f31a8',
    '0:83dfd552e63729b472fcbcc8c45ebcc6691702558b68ec7527e1ba403a0f31a8:0',
    '+0:83dfd552e63729b472fcbcc8c45ebcc6691702558b68ec7527e1ba403a0f31a8',
    '--1:83dfd552e63729b472fcbcc8c45ebcc6691702558b68ec7527e1ba403a0f31a8',
    '0x0:83dfd552e63729b472fcbcc8c45ebcc6691702558b68ec7527e1ba403a0f31a8',
    'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2=',
    'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xq===',
    'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8x=B2N',
    'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N=='
  ];

  for (const vec of injectionVectors) {
    const res = validateTonAddress(vec as any);
    assert.strictEqual(res.isValid, false, `Инъекционный вектор "${vec}" обязан быть отклонен!`);
    fuzzPassedRejections++;
  }

  // 4.1b. Тестирование обнаруженной уязвимости Unicode Bypass (code > 255)
  console.log('  [CRITICAL VULNERABILITY CHECK]: Тестирование Unicode Bypass в Base64 декодере...');
  const unicodeVectors = [
    { input: '💎'.repeat(24), desc: '24 emojis (48 UTF-16 code units)' },
    { input: 'я'.repeat(48), desc: '48 Cyrillic characters (code 0x044F > 255)' },
    { input: 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2\u200B', desc: '47 base64 chars + zero-width space' }
  ];

  let unicodeBypassDetected = 0;
  for (const uv of unicodeVectors) {
    const res = validateTonAddress(uv.input);
    if (res.isValid) {
      unicodeBypassDetected++;
      console.log(`  ⚠️ ОБНАРУЖЕН БАГ ВАЛИДАЦИИ: Вектор "${uv.desc}" ошибочно признан ВАЛИДНЫМ! (rawAddress: ${res.rawAddress})`);
    } else {
      assert.strictEqual(res.isValid, false, `Вектор "${uv.desc}" обязан быть отклонен`);
      assert.strictEqual(decodeBase64OrUrl(uv.input), null, `decodeBase64OrUrl обязан возвращать null для "${uv.desc}"`);
      fuzzPassedRejections++;
    }
  }
  assert.strictEqual(unicodeBypassDetected, 0, 'Ни один не-ASCII/Unicode вектор не должен проходить валидацию!');
  console.log(`  ✓ Успешно заблокированы все ${unicodeVectors.length} Unicode/эмодзи векторов обхода (Unicode Bypass = 0)`);

  // 4.2. 10,000 Random Byte / String / Structure Variations
  for (let i = 0; i < 10000; i++) {
    let candidate = '';
    const mode = i % 5;

    if (mode === 0) {
      // Random length (0 to 100) Base64 string
      const len = Math.floor(Math.random() * 100);
      let s = '';
      for (let j = 0; j < len; j++) s += B64_CHARS[Math.floor(Math.random() * B64_CHARS.length)];
      candidate = s;
    } else if (mode === 1) {
      // 48-char random Base64 string (almost surely invalid CRC16)
      let s = '';
      for (let j = 0; j < 48; j++) s += B64_CHARS[Math.floor(Math.random() * B64_CHARS.length)];
      candidate = s;
    } else if (mode === 2) {
      // Random Raw string format with random workchain and random hex length
      const wc = Math.floor(Math.random() * 20) - 10;
      const hexLen = Math.floor(Math.random() * 70);
      const hex = crypto.randomBytes(Math.ceil(hexLen / 2)).toString('hex').slice(0, hexLen);
      candidate = `${wc}:${hex}`;
    } else if (mode === 3) {
      // 48-char string with invalid characters (!, @, #, $, %, ^, &, *, etc.)
      let s = 'EQ';
      for (let j = 2; j < 48; j++) {
        s += Math.random() < 0.1 ? '!@#$%^&*()[];<>,.?/'[Math.floor(Math.random() * 19)] : B64_CHARS[Math.floor(Math.random() * B64_CHARS.length)];
      }
      candidate = s;
    } else {
      // Random buffer converted to Base64 with corrupted CRC
      const buf = crypto.randomBytes(36);
      buf[0] = 0x11;
      buf[1] = 0x00;
      // Intentionally don't calculate correct CRC
      candidate = encodeBase64Url(buf);
    }

    const res = validateTonAddress(candidate);
    if (!res.isValid) {
      fuzzPassedRejections++;
    } else {
      // If by chance a random 48-char string has a valid CRC16 and valid workchain, verify it genuinely does
      const decoded = decodeBase64OrUrl(candidate);
      if (decoded && decoded.length === 36) {
        const payload = decoded.subarray(0, 34);
        const crc = (decoded[34] << 8) | decoded[35];
        assert.strictEqual(crc16(payload), crc, 'Any address accepted during fuzzing MUST have genuinely valid CRC16');
      }
    }
  }

  totalAssertions += fuzzPassedRejections;
  console.log(`✓ Проверено фаззинг-выборок: ${10000 + injectionVectors.length}, отклонено невалидных: ${fuzzPassedRejections}`);
  console.log('-> DIMENSION 4: УСПЕШНО ПРОЙДЕН\n');

  // --------------------------------------------------------------------------
  // DIMENSION 5: MASSIVE BIDIRECTIONAL ROUNDTRIP CONVERSION (1,000 Keys)
  // --------------------------------------------------------------------------
  console.log('--- DIMENSION 5: Bidirectional Roundtrip Invariants (1,000 Keys, 12,000 assertions) ---');
  let roundtripsVerified = 0;

  for (let i = 0; i < 1000; i++) {
    const rawAccountHash = crypto.randomBytes(32).toString('hex');
    const wc = i % 2 === 0 ? 0 : -1;
    const isTestnet = i % 3 === 0;
    const rawCanonical = `${wc}:${rawAccountHash}`;

    // 1. Raw -> User-Friendly Bounceable
    const bounceable = rawToUserFriendly(rawCanonical, true, isTestnet);
    assert.strictEqual(bounceable.length, 48, 'User-Friendly bounceable должен быть 48 символов');

    // 2. Raw -> User-Friendly Non-Bounceable
    const nonBounceable = rawToUserFriendly(rawCanonical, false, isTestnet);
    assert.strictEqual(nonBounceable.length, 48, 'User-Friendly non-bounceable должен быть 48 символов');

    // 3. UF Bounceable -> Raw
    const recoveredRaw1 = userFriendlyToRaw(bounceable);
    assert.strictEqual(recoveredRaw1, rawCanonical, 'userFriendlyToRaw(bounceable) должен восстанавливать исходный Raw');

    // 4. UF Non-Bounceable -> Raw
    const recoveredRaw2 = userFriendlyToRaw(nonBounceable);
    assert.strictEqual(recoveredRaw2, rawCanonical, 'userFriendlyToRaw(nonBounceable) должен восстанавливать исходный Raw');

    // 5. Validation of Bounceable
    const valBounce = validateTonAddress(bounceable);
    assert.strictEqual(valBounce.isValid, true);
    assert.strictEqual(valBounce.rawAddress, rawCanonical);
    assert.strictEqual(valBounce.workchain, wc);
    assert.strictEqual(valBounce.isBounceable, true);
    assert.strictEqual(valBounce.isTestnet, isTestnet);
    assert.strictEqual(valBounce.nonBounceableAddress, nonBounceable);

    // 6. Validation of Non-Bounceable
    const valNonBounce = validateTonAddress(nonBounceable);
    assert.strictEqual(valNonBounce.isValid, true);
    assert.strictEqual(valNonBounce.rawAddress, rawCanonical);
    assert.strictEqual(valNonBounce.workchain, wc);
    assert.strictEqual(valNonBounce.isBounceable, false);
    assert.strictEqual(valNonBounce.isTestnet, isTestnet);
    assert.strictEqual(valNonBounce.bounceableAddress, bounceable);

    // 7. Normalization invariants for User-Friendly addresses (preserving testnet context)
    assert.strictEqual(normalizeTonAddress(bounceable, 'raw'), rawCanonical);
    assert.strictEqual(normalizeTonAddress(nonBounceable, 'raw'), rawCanonical);
    assert.strictEqual(normalizeTonAddress(bounceable, 'nonBounceable'), nonBounceable);
    assert.strictEqual(normalizeTonAddress(nonBounceable, 'bounceable'), bounceable);

    // 8. Normalization invariants for Raw addresses (defaults to Mainnet if no network tag in raw)
    const expectedMainnetBounceable = rawToUserFriendly(rawCanonical, true, false);
    const expectedMainnetNonBounceable = rawToUserFriendly(rawCanonical, false, false);
    assert.strictEqual(normalizeTonAddress(rawCanonical, 'bounceable'), expectedMainnetBounceable);
    assert.strictEqual(normalizeTonAddress(rawCanonical, 'nonBounceable'), expectedMainnetNonBounceable);
    assert.strictEqual(normalizeTonAddress(rawCanonical, 'raw'), rawCanonical);

    roundtripsVerified += 13;
  }

  totalAssertions += roundtripsVerified;
  console.log(`✓ Проверено 1 000 случайных ончейн-ключей (${roundtripsVerified} утверждений инвариантности)`);
  console.log('-> DIMENSION 5: УСПЕШНО ПРОЙДЕН\n');

  // --------------------------------------------------------------------------
  // DIMENSION 6: BASE64 / BASE64URL PADDING & STANDARD CHARACTERS
  // --------------------------------------------------------------------------
  console.log('--- DIMENSION 6: Base64 / Base64URL Standard and URL-Safe Interchangeability ---');
  
  // Test address containing '-' and '_' vs '+' and '/'
  const testBytes = new Uint8Array(36);
  testBytes[0] = 0x11;
  testBytes[1] = 0x00;
  // Fill with bytes that produce + and / in standard base64 (e.g. 0xFB, 0xFF, 0xBF)
  for (let i = 2; i < 34; i++) testBytes[i] = (i % 2 === 0) ? 0xfb : 0xff;
  const crcSpecial = crc16(testBytes.subarray(0, 34));
  testBytes[34] = (crcSpecial >> 8) & 0xff;
  testBytes[35] = crcSpecial & 0xff;

  const urlSafeStr = encodeBase64Url(testBytes);
  // Create standard Base64 string with '+' and '/'
  const stdB64Str = urlSafeStr.replace(/-/g, '+').replace(/_/g, '/');

  const valUrlSafe = validateTonAddress(urlSafeStr);
  const valStd = validateTonAddress(stdB64Str);

  assert.strictEqual(valUrlSafe.isValid, true, 'Base64URL формат обязан быть валиден');
  assert.strictEqual(valStd.isValid, true, 'Стандартный Base64 (+ /) формат обязан быть валиден');
  assert.strictEqual(valUrlSafe.rawAddress, valStd.rawAddress, 'Raw адреса из Base64 и Base64URL обязаны совпадать');
  
  totalAssertions += 3;
  console.log(`✓ Проверена взаимозаменяемость стандартного Base64 (+, /) и Base64URL (-, _)`);
  console.log('-> DIMENSION 6: УСПЕШНО ПРОЙДЕН\n');

  // --------------------------------------------------------------------------
  // DIMENSION 7: PAPER WALLET GENERATOR STRESS & ENTROPY TEST (100 Wallets)
  // --------------------------------------------------------------------------
  console.log('--- DIMENSION 7: Paper Wallet Generator Stress & Entropy (100 Wallets) ---');
  const seenMnemonics = new Set<string>();
  const seenAddresses = new Set<string>();
  const seenPubKeys = new Set<string>();

  for (let i = 0; i < 100; i++) {
    const pw = await generatePaperWallet();

    assert.strictEqual(pw.words.length, 12, 'Paper wallet должен содержать ровно 12 слов');
    assert.strictEqual(validateMnemonic(pw.mnemonic), true, 'Мнемоника обязана быть валидной BIP-39');
    assert.strictEqual(pw.address.startsWith('UQ'), true, 'Канонический адрес Paper Wallet должен быть UQ...');
    assert.strictEqual(pw.bounceableAddress.startsWith('EQ'), true, 'Bounceable адрес Paper Wallet должен быть EQ...');
    assert.strictEqual(pw.publicKeyHex.length, 64, 'Публичный ключ должен быть 64 hex символа (32 байта)');
    assert.strictEqual(pw.privateKeyHex.length, 64, 'Приватный ключ должен быть 64 hex символа (32 байта)');

    const val = validateTonAddress(pw.address);
    assert.strictEqual(val.isValid, true);
    assert.strictEqual(val.workchain, 0);
    assert.strictEqual(val.rawAddress, pw.rawAddress);

    // Collision check
    assert.strictEqual(seenMnemonics.has(pw.mnemonic), false, 'Коллизия мнемоники недопустима!');
    assert.strictEqual(seenAddresses.has(pw.address), false, 'Коллизия адресов недопустима!');
    assert.strictEqual(seenPubKeys.has(pw.publicKeyHex), false, 'Коллизия публичных ключей недопустима!');

    seenMnemonics.add(pw.mnemonic);
    seenAddresses.add(pw.address);
    seenPubKeys.add(pw.publicKeyHex);

    totalAssertions += 9;
  }

  console.log(`✓ Сгенерировано 100 независимых Paper Wallets: 0 коллизий, 100% валидность по BIP-39 и CRC16`);
  console.log('-> DIMENSION 7: УСПЕШНО ПРОЙДЕН\n');

  const elapsedMs = Date.now() - startTime;
  console.log('================================================================');
  console.log(`  РЕЗУЛЬТАТ: ВСЕ 7 ИЗМЕРЕНИЙ СТРЕСС-ТЕСТИРОВАНИЯ УСПЕШНО ПРОЙДЕНЫ!`);
  console.log(`  Всего выполнено проверок/утверждений: ${totalAssertions}`);
  console.log(`  Время выполнения: ${(elapsedMs / 1000).toFixed(2)} сек`);
  console.log('================================================================\n');
}

runAdversarialStressTests().catch(err => {
  console.error('FATAL STRESS TEST FAILURE:', err);
  process.exit(1);
});
