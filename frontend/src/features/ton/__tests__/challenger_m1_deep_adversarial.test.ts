import {
  tonToNanotonsStr,
  nanotonsToTonStr,
  usdtToMicroUnitsStr,
  microUnitsToUsdtStr,
  formatFiatEquivalent,
  createJettonTransferPayloadBoc,
  SUPPORTED_WALLETS,
  tonConnectManager
} from '../tonConnectManager';

import {
  validateTonAddress,
  isValidTonAddress,
} from '../tonAddressValidator';

import {
  generatePaperWallet,
  TON_QUICK_PRESETS
} from '../paperWallet';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`FAIL: ${msg}`);
  }
}

let totalAssertions = 0;
function check(condition: boolean, msg: string) {
  totalAssertions++;
  assert(condition, msg);
}

async function runAllTests() {
  console.log('================================================================');
  console.log(' ⚔️ EMPIRICAL CHALLENGER: DEEP ADVERSARIAL STRESS SUITE (M1) ⚔️ ');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // 1. STRESS TESTING JETTON TRANSFER BOC SERIALIZER & DECODER
  // -------------------------------------------------------------
  console.log('[STAGE 1] Stress-testing Jetton Transfer BOC Serializer & Deserializer...');

  // Known valid mainnet address (TON Foundation Reserve)
  const testRecipient = 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N';
  const testRaw = '0:83dfd552e63729b472fcbcc8c45ebcc6691702558b68ec7527e1ba403a0f31a8';

  // 1.1 Test Various Amounts & Memos
  const testCases = [
    { amount: '1', memo: 'Hello World', fwd: 10_000_000n, qId: 12345n },
    { amount: '1000000', memo: 'Payment for #999', fwd: 50_000_000n, qId: 0n },
    { amount: '0', memo: '', fwd: 0n, qId: 0xffffffffffffffffn },
    { amount: '18446744073709551615', memo: 'Максимальный uint64 🎉', fwd: 10_000_000n, qId: 999999n },
    { amount: '999999999999999999999999999999', memo: '🔥🚀 TON & USDT 💎', fwd: 10_000_000n, qId: 1n },
  ];

  for (const tc of testCases) {
    const boc = createJettonTransferPayloadBoc({
      recipientAddress: testRecipient,
      amountMicroUnits: tc.amount,
      memo: tc.memo,
      forwardTonAmountNano: tc.fwd,
      queryId: tc.qId
    });

    check(Boolean(boc && typeof boc === 'string' && boc.length > 0), `BOC string generated for amount ${tc.amount}`);

    // Base64 decoding check
    const binStr = atob(boc);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);

    // 1. op::transfer (0x0f8a7cd5)
    check(bytes[0] === 0x0f && bytes[1] === 0x8a && bytes[2] === 0x7c && bytes[3] === 0xd5, 'BOC has correct op::transfer prefix (0x0f8a7cd5)');

    // 2. query_id (8 bytes)
    let qIdDecoded = 0n;
    for (let i = 0; i < 8; i++) {
      qIdDecoded = (qIdDecoded << 8n) | BigInt(bytes[4 + i]);
    }
    check(qIdDecoded === BigInt(tc.qId), `query_id matches: expected ${tc.qId}, got ${qIdDecoded}`);

    // 3. Amount length & bytes
    let offset = 12;
    const amountLen = bytes[offset++];
    let amountDecoded = 0n;
    for (let i = 0; i < amountLen; i++) {
      amountDecoded = (amountDecoded << 8n) | BigInt(bytes[offset++]);
    }
    check(amountDecoded === BigInt(tc.amount), `amount matches: expected ${tc.amount}, got ${amountDecoded}`);

    // 4. Recipient address (32 bytes)
    const addrBytes = bytes.subarray(offset, offset + 32);
    offset += 32;
    const addrHex = Array.from(addrBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    check(addrHex === testRaw.split(':')[1], `recipient hash matches: ${addrHex}`);

    // 5. Forward TON amount
    const fwdLen = bytes[offset++];
    let fwdDecoded = 0n;
    for (let i = 0; i < fwdLen; i++) {
      fwdDecoded = (fwdDecoded << 8n) | BigInt(bytes[offset++]);
    }
    check(fwdDecoded === BigInt(tc.fwd), `forward TON amount matches: expected ${tc.fwd}, got ${fwdDecoded}`);

    // 6. Forward memo payload
    if (tc.memo) {
      check(bytes[offset] === 0 && bytes[offset+1] === 0 && bytes[offset+2] === 0 && bytes[offset+3] === 0, 'Comment prefix 0x00000000');
      offset += 4;
      const memoBytes = bytes.subarray(offset);
      const decodedMemo = new TextDecoder().decode(memoBytes);
      check(decodedMemo === tc.memo, `memo decoded accurately: "${decodedMemo}" === "${tc.memo}"`);
    }
  }
  console.log('  -> PASS: Сериализация и десериализация Jetton BOC проверена со 100% точностью.\n');

  // -------------------------------------------------------------
  // 2. FIXED-POINT DECIMAL & NANO-UNIT SCALING HARNESS
  // -------------------------------------------------------------
  console.log('[STAGE 2] Testing Fixed-Point nanoTON & Micro-USDT Conversions and Roundtrips...');

  // 2.1 nanoTON conversions
  const nanoTONCases = [
    { ton: '0', nano: '0' },
    { ton: '1', nano: '1000000000' },
    { ton: '0.1', nano: '100000000' },
    { ton: '0.000000001', nano: '1' },
    { ton: '0.0000000001', nano: '0' }, // Truncation beyond 9 decimals
    { ton: '123.456789012', nano: '123456789012' },
    { ton: '5000000000', nano: '5000000000000000000' },
    { ton: '-2.5', nano: '-2500000000' },
  ];

  for (const tc of nanoTONCases) {
    const nano = tonToNanotonsStr(tc.ton);
    check(nano === tc.nano, `tonToNanotonsStr(${tc.ton}) === ${tc.nano} (got ${nano})`);
    if (!tc.ton.includes('-') && tc.ton !== '0.0000000001') {
      const back = nanotonsToTonStr(nano);
      const expectedTon = tc.ton.replace(/\.?0+$/, '') || '0';
      const cleanBack = back.replace(/\.?0+$/, '') || '0';
      check(cleanBack === expectedTon, `nanotonsToTonStr(${nano}) roundtrip === ${expectedTon} (got ${cleanBack})`);
    }
  }

  // 2.2 USDT Micro-unit conversions
  const usdtCases = [
    { usdt: '0', micro: '0' },
    { usdt: '1', micro: '1000000' },
    { usdt: '0.5', micro: '500000' },
    { usdt: '0.000001', micro: '1' },
    { usdt: '0.0000001', micro: '0' }, // Truncation beyond 6 decimals
    { usdt: '99.99', micro: '99990000' },
    { usdt: '1000000', micro: '1000000000000' },
    { usdt: '-10.25', micro: '-10250000' },
  ];

  for (const tc of usdtCases) {
    const micro = usdtToMicroUnitsStr(tc.usdt);
    check(micro === tc.micro, `usdtToMicroUnitsStr(${tc.usdt}) === ${tc.micro} (got ${micro})`);
    if (!tc.usdt.includes('-') && tc.usdt !== '0.0000001') {
      const back = microUnitsToUsdtStr(micro);
      const expectedUsdt = tc.usdt.replace(/\.?0+$/, '') || '0';
      const cleanBack = back.replace(/\.?0+$/, '') || '0';
      check(cleanBack === expectedUsdt, `microUnitsToUsdtStr(${micro}) roundtrip === ${expectedUsdt} (got ${cleanBack})`);
    }
  }

  // 2.3 Fiat calculations (formatFiatEquivalent)
  const fiatCases = [
    { amount: '10', rate: 6.80, frac: 2, expected: '68.00' },
    { amount: '1.5', rate: 6.80, frac: 2, expected: '10.20' },
    { amount: '0', rate: 6.80, frac: 2, expected: '0.00' },
    { amount: '100', rate: 615.40, frac: 0, expected: '61540' },
    { amount: '2.5', rate: 90.50, frac: 2, expected: '226.25' },
    { amount: '-5', rate: 10.0, frac: 2, expected: '-50.00' },
  ];

  for (const fc of fiatCases) {
    const res = formatFiatEquivalent(fc.amount, fc.rate, fc.frac);
    check(res === fc.expected, `formatFiatEquivalent(${fc.amount}, ${fc.rate}, ${fc.frac}) === ${fc.expected} (got ${res})`);
  }
  console.log('  -> PASS: Фиксированная арифметика и расчет фиата 100% точны.\n');

  // -------------------------------------------------------------
  // 3. ADVERSARIAL STRESS TESTING ADDRESS VALIDATOR & MUTATIONS
  // -------------------------------------------------------------
  console.log('[STAGE 3] Adversarial Stress Testing Address Validator...');

  // 3.1 Known valid presets
  for (const preset of TON_QUICK_PRESETS) {
    const val = validateTonAddress(preset.address);
    check(val.isValid === true, `Preset address ${preset.id} (${preset.address}) is valid`);
    check(Boolean(val.rawAddress), `Preset address ${preset.id} parsed rawAddress`);
    check(Boolean(val.bounceableAddress), `Preset address ${preset.id} generated bounceableAddress`);
    check(Boolean(val.nonBounceableAddress), `Preset address ${preset.id} generated nonBounceableAddress`);
  }

  // 3.2 Corrupted Base64 characters and illegal symbols
  const adversarialAddresses = [
    '',
    '   ',
    'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2', // 47 chars (too short)
    'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2NN', // 49 chars (too long)
    'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2=', // invalid padding
    'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2 ', // trailing space inside 48 chars
    'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2\0', // null byte
    '0:83dfd552e63729b472fcbcc8c45ebcc6691702558b68ec7527e1ba403a0f31a', // 63 hex (too short)
    '0:83dfd552e63729b472fcbcc8c45ebcc6691702558b68ec7527e1ba403a0f31a88', // 65 hex (too long)
    '1:83dfd552e63729b472fcbcc8c45ebcc6691702558b68ec7527e1ba403a0f31a8', // invalid workchain 1
    '-2:83dfd552e63729b472fcbcc8c45ebcc6691702558b68ec7527e1ba403a0f31a8', // invalid workchain -2
    '0:83dfd552e63729b472fcbcc8c45ebcc6691702558b68ec7527e1ba403a0f31ag', // non-hex character 'g'
  ];

  for (const adv of adversarialAddresses) {
    const val = validateTonAddress(adv);
    check(val.isValid === false, `Adversarial address rejected: "${adv.slice(0, 30)}..."`);
  }

  // 3.3 CRC16 Bit-Flip mutations
  const canonicalUf = 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N';
  const b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let rejectedMutations = 0;

  for (let i = 0; i < canonicalUf.length; i++) {
    const origChar = canonicalUf[i];
    for (let c = 0; c < 5; c++) {
      const repl = b64chars[(origChar.charCodeAt(0) + c * 13) % b64chars.length];
      if (repl === origChar) continue;
      const mutated = canonicalUf.slice(0, i) + repl + canonicalUf.slice(i + 1);
      const val = validateTonAddress(mutated);
      if (!val.isValid) rejectedMutations++;
      check(!val.isValid, `Bit-flip mutation at pos ${i} ('${origChar}' -> '${repl}') rejected`);
    }
  }
  console.log(`  -> PASS: 100% мутаций адресов (${rejectedMutations}) успешно отбракованы CRC16.\n`);

  // -------------------------------------------------------------
  // 4. TON CONNECT MANAGER LIFECYCLE & NO-FAKE-ADDRESS POLICY
  // -------------------------------------------------------------
  console.log('[STAGE 4] Stress-testing TonConnectManager & No-Fake-Address Policy...');

  // 4.1 Check supported wallets
  check(SUPPORTED_WALLETS.length >= 4, 'At least 4 wallet providers configured');
  const mtw = SUPPORTED_WALLETS.find(w => w.id === 'mytonwallet');
  check(Boolean(mtw && mtw.universalLink.includes('mytonwallet.app')), 'MyTonWallet uses mytonwallet.app');
  const om = SUPPORTED_WALLETS.find(w => w.id === 'openmask');
  check(Boolean(om && om.chromeWebStoreUrl?.includes('chromewebstore.google.com')), 'OpenMask has Chrome Web Store link');
  const tw = SUPPORTED_WALLETS.find(w => w.id === 'telegram-wallet');
  check(Boolean(tw && tw.universalLink.includes('startapp=tonconnect')), 'Telegram Wallet uses startapp=tonconnect');

  // 4.2 Connecting with custom address
  const customAddr = 'UQBGfZZ38xWwEdlmL01GhucvNCkkS-9bRrHae3-k6FdayO-I';
  const wallet = await tonConnectManager.connectWallet('custom-address', customAddr);
  check(wallet.address === customAddr, 'Custom address connected');
  check(wallet.name.includes('Ввод адреса') || wallet.appName === 'custom-address', 'Wallet metadata correct');

  // 4.3 Attempting to connect unconnected openmask without custom address
  (tonConnectManager as any).currentWallet = null;
  let caughtOpenmaskError = false;
  try {
    await tonConnectManager.connectWallet('openmask');
  } catch (err: any) {
    caughtOpenmaskError = true;
    check(err.message === 'OPENMASK_NOT_INSTALLED' || err.message.includes('не вернул адрес'), 'OpenMask correctly throws error without fake address');
  }
  check(caughtOpenmaskError, 'Openmask error thrown');

  // 4.4 Transaction parameter validation
  let caughtZeroTonError = false;
  try {
    await tonConnectManager.sendTonTransaction({
      recipientAddress: customAddr,
      amountTon: '0',
      memo: 'test'
    });
  } catch (err: any) {
    caughtZeroTonError = true;
    check(err.message.includes('больше 0'), '0 TON transfer rejected');
  }
  check(caughtZeroTonError, 'Zero TON transfer thrown');

  let caughtZeroUsdtError = false;
  try {
    await tonConnectManager.sendUsdtJettonTransaction({
      recipientAddress: customAddr,
      amountUsdt: '0',
      memo: 'test'
    });
  } catch (err: any) {
    caughtZeroUsdtError = true;
    check(err.message.includes('больше 0'), '0 USDT transfer rejected');
  }
  check(caughtZeroUsdtError, 'Zero USDT transfer thrown');

  console.log('  -> PASS: Жизненный цикл TonConnectManager и запрет фейковых адресов подтверждены.\n');

  // -------------------------------------------------------------
  // 5. PAPER WALLET GENERATOR & ENTROPY INVARIANTS
  // -------------------------------------------------------------
  console.log('[STAGE 5] Stress-testing Paper Wallet Generator (50 instances)...');

  const generatedAddresses = new Set<string>();
  for (let i = 0; i < 50; i++) {
    const pw = await generatePaperWallet();
    check(Boolean(pw.address && pw.mnemonic && pw.rawAddress && pw.publicKeyHex), `Paper wallet #${i} generated`);
    check(pw.words.length === 12 || pw.words.length === 24, `Paper wallet #${i} has 12/24 BIP-39 mnemonic words`);
    check(isValidTonAddress(pw.address), `Paper wallet #${i} has valid TON address`);
    check(!generatedAddresses.has(pw.address), `Paper wallet #${i} address is unique (no collision)`);
    generatedAddresses.add(pw.address);

    const val = validateTonAddress(pw.address);
    check(val.isValid === true, `Paper wallet #${i} validation matches`);
  }
  console.log('  -> PASS: 50 Paper Wallets сгенерированы и проверены на 100% энтропию и валидность.\n');

  console.log('================================================================');
  console.log(` 🏆 ВСЕ СТРЕСС-ТЕСТЫ УСПЕШНО ПРОЙДЕНЫ! (${totalAssertions} assertions) 🏆 `);
  console.log('================================================================');
}

runAllTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
