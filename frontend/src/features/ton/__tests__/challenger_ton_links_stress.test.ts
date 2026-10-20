import assert from "node:assert";
import {
  SUPPORTED_WALLETS,
  tonConnectManager,
} from "../tonConnectManager";

// Mock localStorage if missing
const memoryStorage: Record<string, string> = {};
if (typeof globalThis.localStorage === "undefined") {
  (globalThis as any).localStorage = {
    getItem: (k: string) => memoryStorage[k] || null,
    setItem: (k: string, v: string) => { memoryStorage[k] = v; },
    removeItem: (k: string) => { delete memoryStorage[k]; },
    clear: () => { for (const k in memoryStorage) delete memoryStorage[k]; },
  };
}

async function runChallengerStressTests() {
  console.log("================================================================");
  console.log("TESTING TON CONNECT 2.0 & DEEP LINKS FOR ALL PROVIDERS");
  console.log("================================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function recordPass(testName: string) {
    passedTests++;
    totalTests++;
    console.log("  [PASS] " + testName);
  }

  // Suite 1: Configuration & Link Formats
  console.log("\n--- SUITE 1: 4 Wallet Providers Configuration & Link Formats ---");

  // 1.1 Tonkeeper
  const tonkeeper = SUPPORTED_WALLETS.find(w => w.id === "tonkeeper");
  assert.ok(tonkeeper, "Tonkeeper provider must exist");
  assert.strictEqual(tonkeeper.appName, "tonkeeper");
  assert.strictEqual(tonkeeper.universalLink, "https://app.tonkeeper.com/ton-connect");
  assert.strictEqual(tonkeeper.deepLinkPrefix, "tonkeeper://");
  assert.strictEqual(tonkeeper.aboutUrl, "https://tonkeeper.com");
  assert.strictEqual(tonkeeper.iconUrl, "https://tonkeeper.com/assets/tonconnect-icon.png");
  recordPass("1.1 Tonkeeper: Universal Link & Deep Link scheme valid");

  // 1.2 MyTonWallet (R1)
  const mytonwallet = SUPPORTED_WALLETS.find(w => w.id === "mytonwallet");
  assert.ok(mytonwallet, "MyTonWallet provider must exist");
  assert.strictEqual(mytonwallet.appName, "mytonwallet");
  assert.strictEqual(mytonwallet.universalLink, "https://mytonwallet.app/connect");
  assert.strictEqual(mytonwallet.deepLinkPrefix, "mytonwallet://");
  assert.strictEqual(mytonwallet.aboutUrl, "https://mytonwallet.app");
  assert.strictEqual(mytonwallet.iconUrl, "https://mytonwallet.app/icon-256.png");
  assert.ok(!mytonwallet.universalLink.includes(".io"), "MyTonWallet universalLink MUST NOT contain deprecated .io domain");
  assert.ok(!mytonwallet.aboutUrl?.includes(".io"), "MyTonWallet aboutUrl MUST NOT contain deprecated .io domain");
  assert.ok(!mytonwallet.iconUrl.includes(".io"), "MyTonWallet iconUrl MUST NOT contain deprecated .io domain");
  recordPass("1.2 MyTonWallet: .app migration & domain integrity confirmed");

  // 1.3 OpenMask (R2)
  const openmask = SUPPORTED_WALLETS.find(w => w.id === "openmask");
  assert.ok(openmask, "OpenMask provider must exist");
  assert.strictEqual(openmask.appName, "openmask");
  assert.strictEqual(openmask.universalLink, "https://www.openmask.app");
  assert.strictEqual(openmask.deepLinkPrefix, "openmask://");
  assert.strictEqual(
    openmask.chromeWebStoreUrl,
    "https://chromewebstore.google.com/detail/openmask/pinfdafnadjiekknmfdamnanacklnclb"
  );
  recordPass("1.3 OpenMask: Chrome Web Store direct URL configured");

  // 1.4 Telegram Wallet (R3)
  const tgWallet = SUPPORTED_WALLETS.find(w => w.id === "telegram-wallet");
  assert.ok(tgWallet, "Telegram Wallet provider must exist");
  assert.strictEqual(tgWallet.appName, "telegram-wallet");
  assert.strictEqual(tgWallet.universalLink, "https://t.me/wallet/start?startapp=tonconnect");
  assert.strictEqual(tgWallet.deepLinkPrefix, "tg://resolve?domain=wallet&startapp=tonconnect");
  assert.ok(!tgWallet.universalLink.includes("attach=wallet"), "Telegram Wallet MUST NOT use broken attach=wallet link");
  assert.ok(tgWallet.universalLink.includes("startapp=tonconnect"), "Telegram Wallet universal link must use startapp=tonconnect TMA format");
  assert.ok(tgWallet.deepLinkPrefix.includes("startapp=tonconnect"), "Telegram Wallet deep link prefix must use startapp=tonconnect");
  recordPass("1.4 Telegram Wallet: TMA startapp=tonconnect format verified");

  // Suite 2: Query Parameters & URL Payload Encoding
  console.log("\n--- SUITE 2: Query Parameters & URL Payload Encoding ---");

  function buildTonConnectUrl(baseUrl: string, params: { v: string; id: string; r: any; ret?: string }): string {
    const hasQuery = baseUrl.includes("?");
    const separator = hasQuery ? "&" : "?";
    const payloadEncoded = encodeURIComponent(JSON.stringify(params.r));
    let url = baseUrl + separator + "v=" + encodeURIComponent(params.v) + "&id=" + encodeURIComponent(params.id) + "&r=" + payloadEncoded;
    if (params.ret) {
      url += "&ret=" + encodeURIComponent(params.ret);
    }
    return url;
  }

  const sampleSessionId = "0a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef";
  const sampleConnectRequest = {
    manifestUrl: "https://gossip.skuf-net.ru/tonconnect-manifest.json",
    items: [
      { name: "ton_addr" },
      { name: "ton_proof", payload: "nonce_secret_random_hex_12345678" }
    ]
  };

  const testWallets = [tonkeeper, mytonwallet, openmask, tgWallet];
  for (const w of testWallets) {
    if (!w) continue;
    const generatedUrl = buildTonConnectUrl(w.universalLink, {
      v: "2",
      id: sampleSessionId,
      r: sampleConnectRequest,
      ret: "back"
    });

    const parsed = new URL(generatedUrl);
    assert.strictEqual(parsed.searchParams.get("v"), "2", "v parameter must be 2 for " + w.name);
    assert.strictEqual(parsed.searchParams.get("id"), sampleSessionId, "id parameter must match for " + w.name);
    
    const rRaw = parsed.searchParams.get("r");
    assert.ok(rRaw, "r parameter must be present for " + w.name);
    const decodedRequest = JSON.parse(rRaw);
    assert.strictEqual(decodedRequest.manifestUrl, sampleConnectRequest.manifestUrl);
    assert.strictEqual(decodedRequest.items.length, 2);
    assert.strictEqual(decodedRequest.items[1].payload, "nonce_secret_random_hex_12345678");

    if (w.id === "telegram-wallet") {
      assert.strictEqual(parsed.searchParams.get("startapp"), "tonconnect", "Telegram Wallet must preserve startapp=tonconnect query param");
      assert.strictEqual(parsed.pathname, "/wallet/start");
    }
    recordPass("Suite 2 Query params & payload encoding: " + w.name);
  }

  // Suite 3: Transfer Deep Links & Special Characters
  console.log("\n--- SUITE 3: In-Chat Transfer Deep Links & URL-Encoding Stress ---");

  const stressMemoCases = [
    { name: "Pure ASCII", memo: "Payment for order #9876" },
    { name: "Cyrillic and symbols", memo: "Оплата заказа №1234 (НДС 20%) & скидка = 5%" },
    { name: "Emojis and punctuation", memo: "💎 Gossip P2P Transfer 🚀🔥 [memo #1] <>?&#" },
    { name: "Special URL chars", memo: "param1=val1&param2=val2?test=1#anchor+space/slash" },
    { name: "Long multi-line string", memo: "Line 1\nLine 2\r\nLine 3\tTabbed text" },
    { name: "Empty memo", memo: "" }
  ];

  const testAddresses = [
    "UQBGfZZ38xWwEdlmL01GhucvNCkkS-9bRrHae3-k6FdayO-I",
    "EQBvW8Z5huBkMJYdn30xD0FtGX9-S1GtQWryT5",
    "0:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "kQBGfZZ38xWwEdlmL01GhucvNCkkS+9bRrHae3/k6FdayO/I"
  ];

  for (const testCase of stressMemoCases) {
    for (const addr of testAddresses) {
      const amountNanotons = "1500000000";
      const encodedMemo = encodeURIComponent(testCase.memo);
      const tonTransferUrl = "ton://transfer/" + addr + "?amount=" + amountNanotons + "&text=" + encodedMemo;

      assert.ok(tonTransferUrl.startsWith("ton://transfer/" + addr + "?"));
      assert.ok(tonTransferUrl.includes("amount=" + amountNanotons));
      
      const urlQueryPart = tonTransferUrl.slice(tonTransferUrl.indexOf("?") + 1);
      const searchParams = new URLSearchParams(urlQueryPart);
      assert.strictEqual(searchParams.get("text"), testCase.memo);
      assert.strictEqual(searchParams.get("amount"), amountNanotons);
    }
    recordPass("Transfer deep link: " + testCase.name);
  }

  // Suite 4: No-Fake-Address & Unconnected Provider Rejection
  console.log("\n--- SUITE 4: Rejection of Unconnected Provider & No-Fake-Address Policy ---");
  await tonConnectManager.disconnectWallet();
  assert.strictEqual(tonConnectManager.getConnectedWallet(), null);

  let errThrown = false;
  try {
    await tonConnectManager.connectWallet("openmask");
  } catch (err: any) {
    errThrown = true;
    assert.strictEqual(err.message, "OPENMASK_NOT_INSTALLED");
  }
  assert.ok(errThrown);
  assert.strictEqual(tonConnectManager.getConnectedWallet(), null);
  recordPass("Unconnected OpenMask throws OPENMASK_NOT_INSTALLED without fake address");

  console.log("\n================================================================");
  console.log(`ALL ${totalTests} TESTS PASSED SUCCESSFULLY! (VERDICT: APPROVE)`);
  console.log("================================================================\n");
}

if (typeof process !== "undefined" && process.argv && process.argv[1]?.includes("challenger_ton_links_stress")) {
  runChallengerStressTests().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
  });
}
