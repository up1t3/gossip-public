/**
 * Runtime Stress-Test Harness for i18next Configuration and Translation Resolution
 */
const path = require("path");
const fs = require("fs");

async function runRuntimeStressTest() {
  console.log("=".repeat(80));
  console.log("i18next RUNTIME ENGINE ADVERSARIAL STRESS-TEST");
  console.log("=".repeat(80));

  // Dynamic import of i18next from frontend/node_modules
  const i18next = require(path.resolve(__dirname, "../node_modules/i18next"));

  const LOCALES_DIR = path.resolve(__dirname, "../src/i18n/locales");
  const LANGUAGES = ["ru", "en", "es", "zh", "ar", "fa", "fr", "de"];
  const NAMESPACES = ["common", "auth", "chat", "wallet", "pulse", "settings", "landing", "calls"];

  const resources = {};
  for (const lang of LANGUAGES) {
    resources[lang] = {};
    for (const ns of NAMESPACES) {
      const p = path.join(LOCALES_DIR, lang, ns + ".json");
      resources[lang][ns] = JSON.parse(fs.readFileSync(p, "utf-8"));
    }
  }

  await i18next.init({
    resources,
    lng: "ru",
    fallbackLng: "en",
    ns: NAMESPACES,
    defaultNS: "common",
    interpolation: {
      escapeValue: false
    }
  });

  console.log("i18next initialized successfully.");

  let failures = 0;

  // Test 1: Standard key lookup across all languages in default NS (common)
  console.log("\n--- Test 1: Default Namespace (common) Lookup ---");
  for (const lang of LANGUAGES) {
    await i18next.changeLanguage(lang);
    const saveText = i18next.t("actions.save");
    const onlineText = i18next.t("status.online");
    if (!saveText || saveText === "actions.save") {
      console.error("FAIL: Missing translation for actions.save in " + lang);
      failures++;
    } else {
      console.log("  [" + lang + "] actions.save -> " + JSON.stringify(saveText) + ", status.online -> " + JSON.stringify(onlineText));
    }
  }

  // Test 2: Namespaced key lookup with interpolation
  console.log("\n--- Test 2: Namespaced Key Lookup with Interpolations ---");
  for (const lang of LANGUAGES) {
    await i18next.changeLanguage(lang);
    const sendBtn = i18next.t("wallet:send.sendButton", { amount: "100.50", symbol: "TON" });
    const powStatus = i18next.t("auth:register.powStatus", { difficulty: 16 });
    const tonBalance = i18next.t("wallet:overview.tonBalance", { amount: "123.45" });
    
    if (sendBtn.includes("{{amount}}") || sendBtn.includes("{{symbol}}")) {
      console.error("FAIL: Unresolved interpolation in wallet:send.sendButton for " + lang + ": " + sendBtn);
      failures++;
    }
    if (powStatus.includes("{{difficulty}}")) {
      console.error("FAIL: Unresolved interpolation in auth:register.powStatus for " + lang + ": " + powStatus);
      failures++;
    }
    console.log("  [" + lang + "] wallet:send.sendButton -> " + JSON.stringify(sendBtn));
    console.log("  [" + lang + "] auth:register.powStatus  -> " + JSON.stringify(powStatus));
  }

  // Test 3: Pluralization Stress Test across diverse count values
  console.log("\n--- Test 3: Pluralization Stress Test (CLDR Numbers: 0, 1, 2, 3, 5, 21, 100) ---");
  const testCounts = [0, 1, 2, 3, 5, 21, 100];

  for (const lang of LANGUAGES) {
    await i18next.changeLanguage(lang);
    console.log("  Language [" + lang + "]:");
    for (const count of testCounts) {
      const minutesAgo = i18next.t("time.minutesAgo", { count });
      const groupMembers = i18next.t("chat:header.groupMembers", { count });
      if (!minutesAgo || minutesAgo === "time.minutesAgo") {
        console.error("    FAIL: Plural resolution failed for count=" + count + " in " + lang);
        failures++;
      } else {
        console.log("    count=" + String(count).padStart(3, " ") + " -> minutesAgo: " + JSON.stringify(minutesAgo) + " | groupMembers: " + JSON.stringify(groupMembers));
      }
    }
  }

  // Test 4: RTL language set validation
  console.log("\n--- Test 4: RTL Language Set & Direction ---");
  const RTL_LANGUAGES = ["ar", "fa"];
  for (const lang of LANGUAGES) {
    const isRtl = RTL_LANGUAGES.includes(lang);
    const expectedDir = isRtl ? "rtl" : "ltr";
    console.log("  [" + lang + "] isRtl=" + isRtl + " -> direction=" + expectedDir);
  }

  // Test 5: Fallback behavior on non-existent key
  console.log("\n--- Test 5: Fallback on Missing Non-Existent Key ---");
  await i18next.changeLanguage("es");
  const nonExistent = i18next.t("common:some.fake.key", "Default Fallback String");
  if (nonExistent !== "Default Fallback String") {
    console.error("FAIL: Fallback string failed");
    failures++;
  } else {
    console.log("  PASS: Default fallback works as expected (" + nonExistent + ")");
  }

  console.log("\n" + "=".repeat(80));
  console.log("RUNTIME STRESS TEST VERDICT: " + (failures === 0 ? "APPROVE (ALL TESTS PASSED)" : "FAIL (" + failures + " errors)"));
  console.log("=".repeat(80));
  return failures === 0;
}

runRuntimeStressTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error("Runtime stress test crashed:", err);
  process.exit(1);
});
