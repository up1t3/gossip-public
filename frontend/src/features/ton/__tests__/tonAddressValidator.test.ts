// frontend/src/features/ton/__tests__/tonAddressValidator.test.ts
import assert from 'node:assert';
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

export async function runTonAddressValidatorTests() {
  console.log('=== ТЕСТИРОВАНИЕ СТРОГОГО ВАЛИДАТОРА АДРЕСОВ TON И PAPER WALLETS (M2) ===\n');

  // 1. Тестирование алгоритма CRC16-CCITT (XMODEM, полином 0x1021)
  console.log('1. Проверка алгоритма CRC16-CCITT (XMODEM)...');
  const zeroBytes = new Uint8Array(34);
  const zeroCrc = crc16(zeroBytes);
  assert.strictEqual(zeroCrc, 0, 'CRC16 от 34 нулевых байт должен быть 0x0000');

  // Известный вектор: "123456789" -> 0x31C3 (XMODEM)
  const testVec = new TextEncoder().encode('123456789');
  const vecCrc = crc16(testVec);
  assert.strictEqual(vecCrc, 0x31c3, 'CRC16-XMODEM от "123456789" должен быть 0x31C3');
  console.log('-> CRC16-CCITT: УСПЕШНО\n');

  // 2. Тестирование кодирования и декодирования Base64 / Base64URL
  console.log('2. Проверка кодирования/декодирования Base64 и Base64URL...');
  const sampleData = new Uint8Array([0x11, 0x00, 0x83, 0xdf, 0xd5, 0x52, 0xff, 0xaa]);
  const b64Url = encodeBase64Url(sampleData);
  const decoded = decodeBase64OrUrl(b64Url);
  assert.ok(decoded !== null, 'Декодирование Base64URL должно вернуть массив байт');
  assert.deepStrictEqual(decoded, sampleData, 'Данные после roundtrip должны полностью совпадать');
  console.log('-> Base64 / Base64URL: УСПЕШНО\n');

  // 3. Тестирование реальных Mainnet контрактов (EQ... / UQ...)
  console.log('3. Проверка реальных Mainnet контрактов сети TON...');
  
  // 3.1. TON Foundation Reserve
  const foundationBounceable = 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N';
  const foundationNonBounceable = 'UQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqEBI';
  const foundationRaw = '0:83dfd552e63729b472fcbcc8c45ebcc6691702558b68ec7527e1ba403a0f31a8';

  const resFound1 = validateTonAddress(foundationBounceable);
  assert.strictEqual(resFound1.isValid, true, 'TON Foundation (EQ) обязан быть валидным');
  assert.strictEqual(resFound1.type, 'user-friendly');
  assert.strictEqual(resFound1.workchain, 0);
  assert.strictEqual(resFound1.isBounceable, true);
  assert.strictEqual(resFound1.isTestnet, false);
  assert.strictEqual(resFound1.rawAddress, foundationRaw);
  assert.strictEqual(resFound1.nonBounceableAddress, foundationNonBounceable);

  const resFound2 = validateTonAddress(foundationNonBounceable);
  assert.strictEqual(resFound2.isValid, true, 'TON Foundation (UQ) обязан быть валидным');
  assert.strictEqual(resFound2.isBounceable, false);
  assert.strictEqual(resFound2.bounceableAddress, foundationBounceable);
  assert.strictEqual(resFound2.rawAddress, foundationRaw);

  // 3.2. STON.fi DEX Router
  const stonfiRouterEQ = 'EQB3ncgFE42VAORJxSkefxJziPVdbUxAAA91qjVnz7KFg5UC';
  const stonfiRouterUQ = 'UQB3ncgFE42VAORJxSkefxJziPVdbUxAAA91qjVnz7KFg8jH';
  const stonfiRouterRaw = '0:779dc805138d9500e449c5291e7f127388f55d6d4c40000f75aa3567cfb28583';

  const resSton1 = validateTonAddress(stonfiRouterEQ);
  assert.strictEqual(resSton1.isValid, true);
  assert.strictEqual(resSton1.workchain, 0);
  assert.strictEqual(resSton1.rawAddress, stonfiRouterRaw);
  assert.strictEqual(resSton1.nonBounceableAddress, stonfiRouterUQ);

  // 3.3. STON.fi TON/USDT Liquidity Pool
  const stonfiUsdtEQ = 'EQAARF7GOjVioDP2cqWnVdPmmklpAW4yY8N5KWqXFgPG9tK1';
  const stonfiUsdtUQ = 'UQAARF7GOjVioDP2cqWnVdPmmklpAW4yY8N5KWqXFgPG9o9w';
  const stonfiUsdtRaw = '0:00445ec63a3562a033f672a5a755d3e69a4969016e3263c379296a971603c6f6';

  const resUsdt1 = validateTonAddress(stonfiUsdtEQ);
  assert.strictEqual(resUsdt1.isValid, true);
  assert.strictEqual(resUsdt1.rawAddress, stonfiUsdtRaw);
  assert.strictEqual(resUsdt1.nonBounceableAddress, stonfiUsdtUQ);

  console.log('-> Mainnet EQ / UQ контракты: УСПЕШНО\n');

  // 4. Тестирование Masterchain контрактов (workchain -1, Ef... / Uf...)
  console.log('4. Проверка Masterchain контрактов (workchain -1, Ef... / Uf...)...');
  const electorEf = 'Ef8zMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM0vF';
  const electorUf = 'Uf8zMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMxYA';
  const electorRaw = '-1:3333333333333333333333333333333333333333333333333333333333333333';

  const resElector1 = validateTonAddress(electorEf);
  assert.strictEqual(resElector1.isValid, true, 'TON Elector (Ef) обязан быть валидным');
  assert.strictEqual(resElector1.workchain, -1, 'Workchain для Elector должен быть -1');
  assert.strictEqual(resElector1.isBounceable, true);
  assert.strictEqual(resElector1.rawAddress, electorRaw);
  assert.strictEqual(resElector1.nonBounceableAddress, electorUf);

  const resElector2 = validateTonAddress(electorUf);
  assert.strictEqual(resElector2.isValid, true, 'TON Elector (Uf) обязан быть валидным');
  assert.strictEqual(resElector2.workchain, -1);
  assert.strictEqual(resElector2.isBounceable, false);
  assert.strictEqual(resElector2.rawAddress, electorRaw);

  console.log('-> Masterchain Ef / Uf контракты: УСПЕШНО\n');

  // 5. Тестирование адресов Testnet (kQ... / 0Q...)
  console.log('5. Проверка Testnet адресов (kQ... bounceable, 0Q... non-bounceable)...');
  const testnetBounceable = rawToUserFriendly(foundationRaw, true, true);
  assert.ok(testnetBounceable.startsWith('kQ'), `Testnet bounceable адрес должен начинаться на kQ, получено: ${testnetBounceable}`);
  const resTest1 = validateTonAddress(testnetBounceable);
  assert.strictEqual(resTest1.isValid, true);
  assert.strictEqual(resTest1.isTestnet, true);
  assert.strictEqual(resTest1.isBounceable, true);
  assert.strictEqual(resTest1.rawAddress, foundationRaw);

  const testnetNonBounceable = rawToUserFriendly(foundationRaw, false, true);
  assert.ok(testnetNonBounceable.startsWith('0Q'), `Testnet non-bounceable адрес должен начинаться на 0Q, получено: ${testnetNonBounceable}`);
  const resTest2 = validateTonAddress(testnetNonBounceable);
  assert.strictEqual(resTest2.isValid, true);
  assert.strictEqual(resTest2.isTestnet, true);
  assert.strictEqual(resTest2.isBounceable, false);
  assert.strictEqual(resTest2.rawAddress, foundationRaw);

  console.log('-> Testnet kQ / 0Q адреса: УСПЕШНО\n');

  // 6. Тестирование формата Raw Hex
  console.log('6. Проверка формата Raw Hex (0:... и -1:...)...');
  const resRaw1 = validateTonAddress(foundationRaw);
  assert.strictEqual(resRaw1.isValid, true);
  assert.strictEqual(resRaw1.type, 'raw');
  assert.strictEqual(resRaw1.workchain, 0);
  assert.strictEqual(resRaw1.bounceableAddress, foundationBounceable);
  assert.strictEqual(resRaw1.nonBounceableAddress, foundationNonBounceable);

  const resRaw2 = validateTonAddress(electorRaw);
  assert.strictEqual(resRaw2.isValid, true);
  assert.strictEqual(resRaw2.type, 'raw');
  assert.strictEqual(resRaw2.workchain, -1);
  assert.strictEqual(resRaw2.bounceableAddress, electorEf);
  assert.strictEqual(resRaw2.nonBounceableAddress, electorUf);

  console.log('-> Raw Hex адреса: УСПЕШНО\n');

  // 7. Тестирование отбраковки невалидных и поврежденных адресов
  console.log('7. Проверка отбраковки невалидных и поврежденных адресов...');
  
  // 7.1. Поврежденная контрольная сумма CRC16
  const brokenCrcAddr = foundationBounceable.slice(0, 47) + (foundationBounceable[47] === 'A' ? 'B' : 'A');
  const resBrokenCrc = validateTonAddress(brokenCrcAddr);
  assert.strictEqual(resBrokenCrc.isValid, false, 'Адрес с измененным символом обязан быть невалидным');
  assert.ok(resBrokenCrc.errorMessage?.includes('CRC16'), 'Сообщение об ошибке должно указывать на сбой CRC16');

  // 7.2. Неверная длина
  assert.strictEqual(validateTonAddress('EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2').isValid, false); // 47 символов
  assert.strictEqual(validateTonAddress('EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2NA').isValid, false); // 49 символов
  assert.strictEqual(validateTonAddress('UQ123').isValid, false);

  // 7.3. Пустые строки и спецсимволы
  assert.strictEqual(validateTonAddress('').isValid, false);
  assert.strictEqual(validateTonAddress('   ').isValid, false);
  assert.strictEqual(validateTonAddress('EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB!@').isValid, false);

  // 7.4. Недопустимый workchain ID
  assert.strictEqual(validateTonAddress('1:83dfd552e63729b472fcbcc8c45ebcc6691702558b68ec7527e1ba403a0f31a8').isValid, false);
  assert.strictEqual(validateTonAddress('-2:83dfd552e63729b472fcbcc8c45ebcc6691702558b68ec7527e1ba403a0f31a8').isValid, false);

  // 7.5. Строгая защита от Unicode Bypass (кириллица, эмодзи, не-ASCII, zero-width space)
  const unicodeTestCases = [
    { name: '48 символов кириллицы "я"', input: 'я'.repeat(48) },
    { name: '24 суррогатных эмодзи 💎', input: '💎'.repeat(24) },
    { name: '24 эмодзи ракет 🚀', input: '🚀'.repeat(24) },
    { name: 'Смешанные эмодзи (48 UTF-16 code units)', input: '💎🔥⚡🎉'.repeat(6) },
    { name: '48 иероглифов CJK (китайский)', input: '中'.repeat(48) },
    { name: '48 символов хираганы (японский)', input: 'あ'.repeat(48) },
    { name: '48 символов арабской вязи', input: 'ع'.repeat(48) },
    { name: 'Префикс Base64 + суффикс кириллицы (48 символов)', input: 'EQCD39VS' + 'я'.repeat(40) },
    { name: 'Валидный адрес + zero-width space (\\u200B)', input: 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2\u200B' },
    { name: 'Неразрывный пробел (\\u00A0) внутри адреса', input: 'EQCD39VS\u00A05jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2' }
  ];

  for (const tc of unicodeTestCases) {
    const valRes = validateTonAddress(tc.input);
    assert.strictEqual(valRes.isValid, false, `Unicode-строка "${tc.name}" обязана быть отклонена валидатором!`);
    assert.strictEqual(isValidTonAddress(tc.input), false, `isValidTonAddress обязан вернуть false для "${tc.name}"`);
    assert.strictEqual(decodeBase64OrUrl(tc.input), null, `decodeBase64OrUrl обязан вернуть null для "${tc.name}"`);
  }

  console.log('-> Отбраковка невалидных адресов и Unicode Bypass: УСПЕШНО\n');

  // 8. Тестирование функций конвертации и нормализации
  console.log('8. Проверка конвертеров и normalizeTonAddress...');
  assert.strictEqual(userFriendlyToRaw(foundationBounceable), foundationRaw);
  assert.strictEqual(userFriendlyToRaw(foundationNonBounceable), foundationRaw);
  assert.strictEqual(rawToUserFriendly(foundationRaw, true, false), foundationBounceable);
  assert.strictEqual(rawToUserFriendly(foundationRaw, false, false), foundationNonBounceable);

  assert.strictEqual(normalizeTonAddress(foundationBounceable, 'nonBounceable'), foundationNonBounceable);
  assert.strictEqual(normalizeTonAddress(foundationNonBounceable, 'bounceable'), foundationBounceable);
  assert.strictEqual(normalizeTonAddress(foundationBounceable, 'raw'), foundationRaw);
  assert.strictEqual(isValidTonAddress(foundationBounceable), true);
  assert.strictEqual(isValidTonAddress('invalid_addr'), false);

  console.log('-> Конвертеры и нормализация: УСПЕШНО\n');

  // 9. Тестирование каталога пресетов TON_QUICK_PRESETS
  console.log('9. Проверка каталога быстрых пресетов TON_QUICK_PRESETS...');
  assert.strictEqual(TON_QUICK_PRESETS.length, 4, 'Должно быть ровно 4 пресета');
  for (const preset of TON_QUICK_PRESETS) {
    const valBounce = validateTonAddress(preset.address);
    assert.strictEqual(valBounce.isValid, true, `Bounceable адрес пресета ${preset.name} должен быть валиден`);
    assert.strictEqual(valBounce.isBounceable, true);

    const valNonBounce = validateTonAddress(preset.nonBounceableAddress);
    assert.strictEqual(valNonBounce.isValid, true, `Non-bounceable адрес пресета ${preset.name} должен быть валиден`);
    assert.strictEqual(valNonBounce.isBounceable, false);

    const valRaw = validateTonAddress(preset.rawAddress);
    assert.strictEqual(valRaw.isValid, true, `Raw адрес пресета ${preset.name} должен быть валиден`);
  }
  console.log('-> Каталог пресетов: УСПЕШНО\n');

  // 10. Тестирование генератора Paper Wallet
  console.log('10. Проверка генератора Paper Wallet (generatePaperWallet)...');
  const paper1 = await generatePaperWallet();
  assert.ok(paper1.words.length === 12, 'Должно быть ровно 12 слов мнемоники');
  assert.ok(validateMnemonic(paper1.mnemonic), 'Мнемоника обязана быть валидной BIP-39');
  assert.ok(paper1.address.startsWith('UQ'), `Адрес Paper Wallet должен быть Non-bounceable UQ..., получено: ${paper1.address}`);
  assert.ok(paper1.bounceableAddress.startsWith('EQ'), `Bounceable адрес Paper Wallet должен быть EQ..., получено: ${paper1.bounceableAddress}`);
  assert.ok(paper1.rawAddress.startsWith('0:'), `Raw адрес Paper Wallet должен быть 0:..., получено: ${paper1.rawAddress}`);
  
  const valPaper = validateTonAddress(paper1.address);
  assert.strictEqual(valPaper.isValid, true, 'Сгенерированный адрес Paper Wallet обязан проходить строгую валидацию');
  assert.strictEqual(valPaper.workchain, 0);
  assert.strictEqual(valPaper.rawAddress, paper1.rawAddress);
  assert.strictEqual(valPaper.bounceableAddress, paper1.bounceableAddress);

  // Проверка уникальности двух сгенерированных кошельков
  const paper2 = await generatePaperWallet();
  assert.notStrictEqual(paper1.address, paper2.address, 'Два сгенерированных адреса должны быть уникальными');
  assert.notStrictEqual(paper1.mnemonic, paper2.mnemonic, 'Две мнемоники должны быть уникальными');
  console.log('-> Генератор Paper Wallet: УСПЕШНО\n');

  console.log('=== ВСЕ ТЕСТЫ ВАЛИДАТОРА АДРЕСОВ И PAPER WALLETS (M2) ПРОЙДЕНЫ УСПЕШНО! ===');
}

// Запуск тестов при прямом вызове
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('tonAddressValidator.test.ts')) {
  runTonAddressValidatorTests().catch((err) => {
    console.error('ТЕСТОВЫЙ СБОЙ:', err);
    process.exit(1);
  });
}

