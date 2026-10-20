// frontend/src/features/ton/__tests__/tonConnectManager.adversarial.test.ts
import assert from "node:assert";
import {
  tonToNanotonsStr,
  nanotonsToTonStr,
  usdtToMicroUnitsStr,
  microUnitsToUsdtStr,
  createCommentPayloadBoc,
  tonConnectManager,
  SUPPORTED_WALLETS,
  openDeepLink,
  openCryptoDeepLink,
  isOpenMaskInstalled,
  isWalletExtensionInstalled,
} from "../tonConnectManager";

const testStorage: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => testStorage[key] || null,
  setItem: (key: string, value: string) => { testStorage[key] = value; },
  removeItem: (key: string) => { delete testStorage[key]; },
  clear: () => { for (const k in testStorage) delete testStorage[k]; },
};

export async function runAdversarialTonTests() {
  console.log("=== EMPIRICAL CHALLENGER: ADVERSARIAL STRESS TEST SUITE (M1) ===\n");

  // 1. Поддерживаемые кошельки
  console.log("[CHALLENGE 1] Проверка конфигурации кошельков и миграции доменов...");
  const mtw = SUPPORTED_WALLETS.find(w => w.id === "mytonwallet");
  assert.ok(mtw, "MyTonWallet должен быть зарегистрирован");
  assert.strictEqual(mtw.universalLink, "https://mytonwallet.app/connect");
  assert.strictEqual(mtw.aboutUrl, "https://mytonwallet.app");
  assert.strictEqual(mtw.iconUrl, "https://mytonwallet.app/icon-256.png");
  assert.strictEqual(mtw.deepLinkPrefix, "mytonwallet://");
  assert.ok(!JSON.stringify(mtw).includes("mytonwallet.io"), "Запрещено наличие устаревшего домена mytonwallet.io");

  const openmask = SUPPORTED_WALLETS.find(w => w.id === "openmask");
  assert.ok(openmask, "OpenMask должен быть зарегистрирован");
  assert.strictEqual(
    openmask.chromeWebStoreUrl,
    "https://chromewebstore.google.com/detail/openmask/pinfdafnadjiekknmfdamnanacklnclb"
  );

  const tgWallet = SUPPORTED_WALLETS.find(w => w.id === "telegram-wallet");
  assert.ok(tgWallet, "Telegram Wallet должен быть зарегистрирован");
  assert.strictEqual(tgWallet.universalLink, "https://t.me/wallet/start?startapp=tonconnect");
  assert.strictEqual(tgWallet.deepLinkPrefix, "tg://resolve?domain=wallet&startapp=tonconnect");
  assert.ok(!JSON.stringify(tgWallet).includes("attach=wallet"), "Запрещено использование устаревшего attach=wallet");
  console.log("  -> PASS: Конфигурации MyTonWallet, OpenMask и Telegram Wallet строго соответствуют R1-R3.\n");

  // 2. Детектирование расширений
  console.log("[CHALLENGE 2] Стресс-тестирование логики детектирования расширений...");
  delete (globalThis as any).window;
  assert.strictEqual(isOpenMaskInstalled(), false);
  assert.strictEqual(isWalletExtensionInstalled("openmask"), false);
  assert.strictEqual(isWalletExtensionInstalled("tonkeeper"), false);
  assert.strictEqual(isWalletExtensionInstalled("mytonwallet"), false);

  (globalThis as any).window = {};
  assert.strictEqual(isOpenMaskInstalled(), false);
  assert.strictEqual(isWalletExtensionInstalled("openmask"), false);

  (globalThis as any).window = { openmask: { tonconnect: { isTonConnect: true } } };
  assert.strictEqual(isOpenMaskInstalled(), true);
  assert.strictEqual(isWalletExtensionInstalled("openmask"), true);

  (globalThis as any).window = { openmask: { ton: {} } };
  assert.strictEqual(isOpenMaskInstalled(), true);
  assert.strictEqual(isWalletExtensionInstalled("openmask"), true);

  (globalThis as any).window = { ton: { appName: "openmask" } };
  assert.strictEqual(isOpenMaskInstalled(), true);
  assert.strictEqual(isWalletExtensionInstalled("openmask"), true);

  (globalThis as any).window = { ton: { name: "OpenMask" } };
  assert.strictEqual(isOpenMaskInstalled(), true);
  assert.strictEqual(isWalletExtensionInstalled("openmask"), true);

  (globalThis as any).window = { tonkeeper: { tonconnect: true }, ton: { name: "Tonkeeper", isTonConnect: true } };
  assert.strictEqual(isOpenMaskInstalled(), false);
  assert.strictEqual(isWalletExtensionInstalled("tonkeeper"), true);
  assert.strictEqual(isWalletExtensionInstalled("openmask"), false);
  assert.strictEqual(isWalletExtensionInstalled("mytonwallet"), false);

  delete (globalThis as any).window;
  console.log("  -> PASS: Детектирование расширений изолировано и устойчиво.\n");

  // 3. Запрет фиктивных адресов
  console.log("[CHALLENGE 3] Проверка категорического запрета создания фиктивных адресов...");
  await tonConnectManager.disconnectWallet();
  assert.strictEqual(tonConnectManager.getConnectedWallet(), null);

  let openmaskError: Error | null = null;
  try {
    await tonConnectManager.connectWallet("openmask");
  } catch (err: any) {
    openmaskError = err;
  }
  assert.ok(openmaskError !== null);
  assert.strictEqual(openmaskError?.message, "OPENMASK_NOT_INSTALLED");
  assert.strictEqual(tonConnectManager.getConnectedWallet(), null);

  let tonkeeperError: Error | null = null;
  try {
    await tonConnectManager.connectWallet("tonkeeper");
  } catch (err: any) {
    tonkeeperError = err;
  }
  assert.ok(tonkeeperError !== null);
  assert.ok(tonkeeperError?.message.includes("не вернул адрес авторизации"));
  assert.strictEqual(tonConnectManager.getConnectedWallet(), null);

  let mytonwalletError: Error | null = null;
  try {
    await tonConnectManager.connectWallet("mytonwallet");
  } catch (err: any) {
    mytonwalletError = err;
  }
  assert.ok(mytonwalletError !== null);
  assert.ok(mytonwalletError?.message.includes("не вернул адрес авторизации"));
  assert.strictEqual(tonConnectManager.getConnectedWallet(), null);

  let tgError: Error | null = null;
  try {
    await tonConnectManager.connectWallet("telegram-wallet");
  } catch (err: any) {
    tgError = err;
  }
  assert.ok(tgError !== null);
  assert.ok(tgError?.message.includes("не вернул адрес авторизации"));
  assert.strictEqual(tonConnectManager.getConnectedWallet(), null);

  let customError: Error | null = null;
  try {
    await tonConnectManager.connectWallet("custom-address", "   ");
  } catch (err: any) {
    customError = err;
  }
  assert.ok(customError !== null);
  assert.strictEqual(tonConnectManager.getConnectedWallet(), null);
  console.log("  -> PASS: Фиктивные адреса исключены на 100%. Ошибки выбрасываются детерминированно.\n");

  // 4. Подключение с валидными адресами
  console.log("[CHALLENGE 4] Проверка подключения с валидным адресом...");
  const realTonAddress = "EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N";
  const connectedWallet = await tonConnectManager.connectWallet("mytonwallet", realTonAddress);
  
  assert.strictEqual(connectedWallet.address, realTonAddress);
  assert.strictEqual(connectedWallet.appName, "mytonwallet");
  assert.strictEqual(connectedWallet.network, "-239");
  assert.ok(connectedWallet.rawAddress && connectedWallet.rawAddress.startsWith('0:'), 'rawAddress должен начинаться на 0:');
  assert.strictEqual(connectedWallet.rawAddress?.length, 66, 'Канонический rawAddress должен иметь длину 66 символов (0:<64hex>)');
  assert.strictEqual(tonConnectManager.getConnectedWallet()?.address, realTonAddress);

  let listenerCalledWith: any = null;
  const unsub = tonConnectManager.onStatusChange((w) => {
    listenerCalledWith = w;
  });
  assert.strictEqual(listenerCalledWith?.address, realTonAddress);

  await tonConnectManager.disconnectWallet();
  assert.strictEqual(tonConnectManager.getConnectedWallet(), null);
  assert.strictEqual(listenerCalledWith, null);
  unsub();
  console.log("  -> PASS: Жизненный цикл сессии и подписки listeners работают штатно.\n");

  // 5. Вычисления фиксированной точки
  console.log("[CHALLENGE 5] Стресс-тестирование математики фиксированной точки...");
  assert.strictEqual(tonToNanotonsStr("0"), "0");
  assert.strictEqual(tonToNanotonsStr("0.000000000"), "0");
  assert.strictEqual(tonToNanotonsStr("0.000000001"), "1");
  assert.strictEqual(tonToNanotonsStr("0.0000000001"), "0");
  assert.strictEqual(tonToNanotonsStr("1"), "1000000000");
  assert.strictEqual(tonToNanotonsStr("1.5"), "1500000000");
  assert.strictEqual(tonToNanotonsStr("123456789.987654321"), "123456789987654321");
  assert.strictEqual(tonToNanotonsStr("  10.0  "), "10000000000");
  assert.strictEqual(tonToNanotonsStr("-5.25"), "-5250000000");

  assert.strictEqual(nanotonsToTonStr("0"), "0");
  assert.strictEqual(nanotonsToTonStr("1"), "0.000000001");
  assert.strictEqual(nanotonsToTonStr("1000000000"), "1");
  assert.strictEqual(nanotonsToTonStr("1500000000"), "1.5");
  assert.strictEqual(nanotonsToTonStr("-5250000000"), "-5.25");
  assert.strictEqual(nanotonsToTonStr(123456789987654321n), "123456789.987654321");

  assert.strictEqual(usdtToMicroUnitsStr("0"), "0");
  assert.strictEqual(usdtToMicroUnitsStr("0.000001"), "1");
  assert.strictEqual(usdtToMicroUnitsStr("0.0000001"), "0");
  assert.strictEqual(usdtToMicroUnitsStr("100.5"), "100500000");
  assert.strictEqual(usdtToMicroUnitsStr("1000000"), "1000000000000");
  assert.strictEqual(usdtToMicroUnitsStr("-10.25"), "-10250000");

  assert.strictEqual(microUnitsToUsdtStr("0"), "0");
  assert.strictEqual(microUnitsToUsdtStr("1"), "0.000001");
  assert.strictEqual(microUnitsToUsdtStr("100500000"), "100.5");
  assert.strictEqual(microUnitsToUsdtStr("1000000000000"), "1000000");
  assert.strictEqual(microUnitsToUsdtStr("-10250000"), "-10.25");
  console.log("  -> PASS: Все расчеты фиксированной точки TON (10^9) и USDT (10^6) 100% точны.\n");

  // 6. Кодирование комментариев в BOC
  console.log("[CHALLENGE 6] Тестирование BOC ячеек для текстовых комментариев TON...");
  assert.strictEqual(createCommentPayloadBoc(""), "");
  
  const cyrillicText = "Оплата заказа №14582 в Gossip";
  const cyrillicBoc = createCommentPayloadBoc(cyrillicText);
  assert.ok(cyrillicBoc.length > 0);
  const binStr = atob(cyrillicBoc);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
  assert.strictEqual(bytes[0], 0);
  assert.strictEqual(bytes[1], 0);
  assert.strictEqual(bytes[2], 0);
  assert.strictEqual(bytes[3], 0);
  const decodedText = new TextDecoder().decode(bytes.slice(4));
  assert.strictEqual(decodedText, cyrillicText);

  const emojiText = "💎 TON Transfer 🚀✨";
  const emojiBoc = createCommentPayloadBoc(emojiText);
  const emojiBin = atob(emojiBoc);
  const emojiBytes = new Uint8Array(emojiBin.length);
  for (let i = 0; i < emojiBin.length; i++) emojiBytes[i] = emojiBin.charCodeAt(i);
  const decodedEmoji = new TextDecoder().decode(emojiBytes.slice(4));
  assert.strictEqual(decodedEmoji, emojiText);
  console.log("  -> PASS: BOC ячейки комментариев с префиксом 0x00000000 кодируют кириллицу и emoji без искажений.\n");

  // 7. Параметры транзакций
  console.log("[CHALLENGE 7] Проверка валидации параметров отправки транзакций...");
  let noRecipientError: Error | null = null;
  try {
    await tonConnectManager.sendTonTransaction({ recipientAddress: "", amountTon: "1.0" });
  } catch (e: any) {
    noRecipientError = e;
  }
  assert.ok(noRecipientError !== null);
  assert.strictEqual(noRecipientError?.message, "Адрес получателя не указан");

  let zeroAmountError: Error | null = null;
  try {
    await tonConnectManager.sendTonTransaction({ recipientAddress: "EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N", amountTon: "0" });
  } catch (e: any) {
    zeroAmountError = e;
  }
  assert.ok(zeroAmountError !== null);
  assert.strictEqual(zeroAmountError?.message, "Сумма перевода обязана быть больше 0 TON");

  let noUsdtRecipientError: Error | null = null;
  try {
    await tonConnectManager.sendUsdtJettonTransaction({ recipientAddress: "   ", amountUsdt: "1.0" });
  } catch (e: any) {
    noUsdtRecipientError = e;
  }
  assert.ok(noUsdtRecipientError !== null);
  assert.strictEqual(noUsdtRecipientError?.message, "Адрес получателя не указан");

  let zeroUsdtAmountError: Error | null = null;
  try {
    await tonConnectManager.sendUsdtJettonTransaction({ recipientAddress: "EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N", amountUsdt: "0" });
  } catch (e: any) {
    zeroUsdtAmountError = e;
  }
  assert.ok(zeroUsdtAmountError !== null);
  assert.strictEqual(zeroUsdtAmountError?.message, "Сумма перевода обязана быть больше 0 USDT");
  console.log("  -> PASS: Валидация параметров транзакций блокирует любые некорректные переводы.\n");

  // 8. Open Deep Link
  console.log("[CHALLENGE 8] Проверка обработки всех схем Deep Link и Universal Link...");
  (globalThis as any).window = {
    location: { href: "" },
    open: (url: string) => url,
  };

  assert.strictEqual(await openDeepLink(""), false);
  assert.strictEqual(await openDeepLink("   "), false);
  assert.strictEqual(await openDeepLink("tg://resolve?domain=wallet&startapp=tonconnect"), true);
  assert.strictEqual(await openDeepLink("https://t.me/wallet/start?startapp=tonconnect"), true);
  assert.strictEqual(await openDeepLink("https://mytonwallet.app/connect"), true);
  assert.strictEqual(await openDeepLink("mytonwallet://connect"), true);
  assert.strictEqual(await openDeepLink("https://app.tonkeeper.com/ton-connect"), true);
  assert.strictEqual(await openDeepLink("tonkeeper://transfer/EQ..."), true);
  assert.strictEqual(await openDeepLink("openmask://connect"), true);
  assert.strictEqual(await openDeepLink("ton://transfer/EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N?amount=1000000000"), true);
  assert.strictEqual(await openCryptoDeepLink("tc://?v=2&id=123"), true);
  console.log("  -> PASS: Все схемы URL и Deep Link отрабатывают корректно.\n");

  console.log("=== ВСЕ 8 АДВЕРСАРИАЛЬНЫХ ЧЕЛЛЕНДЖЕЙ УСПЕШНО ПРОЙДЕНЫ! ===");
}

if (typeof process !== "undefined" && process.argv && process.argv[1]?.includes("adversarial")) {
  runAdversarialTonTests().catch((err) => {
    console.error("❌ КРИТИЧЕСКИЙ СБОЙ В АДВЕРСАРИАЛЬНЫХ ТЕСТАХ:", err);
    process.exit(1);
  });
}
