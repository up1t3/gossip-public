// frontend/src/i18n/__tests__/m3_ui_and_rtl.test.ts
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SUPPORTED_LANGUAGES,
  RTL_LANGUAGES,
  LANGUAGES_META,
  isRtlLanguage,
  getLanguageMeta,
  SupportedLanguage
} from '../languages';
import {
  normalizeLanguage,
  applyLanguage
} from '../config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localesDir = path.resolve(__dirname, '../locales');

export async function runM3UiAndRtlTests() {
  console.log('================================================================');
  console.log('  MILESTONE M3: СВИТА ТЕСТОВ UI СЕЛЕКТОРОВ И RTL АДАПТАЦИИ');
  console.log('================================================================\n');

  // ТЕСТ 1: Проверка набора из 8 суверенных локалей
  console.log('1. Проверка списка поддерживаемых языков (8 локалей)...');
  const expectedLanguages: SupportedLanguage[] = ['ru', 'en', 'es', 'zh', 'ar', 'fa', 'fr', 'de'];
  assert.strictEqual(SUPPORTED_LANGUAGES.length, 8, 'Должно быть ровно 8 поддерживаемых локалей');
  for (const lang of expectedLanguages) {
    assert.ok(SUPPORTED_LANGUAGES.includes(lang), `Язык ${lang} должен присутствовать в SUPPORTED_LANGUAGES`);
  }
  console.log('-> SUPPORTED_LANGUAGES: УСПЕШНО (8 языков)\n');

  // ТЕСТ 2: Проверка RTL списка и предикатов
  console.log('2. Проверка RTL языков (Арабский, Персидский/Фарси)...');
  assert.deepStrictEqual([...RTL_LANGUAGES].sort(), ['ar', 'fa'].sort(), 'RTL языками должны быть ar и fa');
  assert.strictEqual(isRtlLanguage('ar'), true, 'ar должен быть RTL');
  assert.strictEqual(isRtlLanguage('fa'), true, 'fa должен быть RTL');
  assert.strictEqual(isRtlLanguage('ru'), false, 'ru НЕ должен быть RTL');
  assert.strictEqual(isRtlLanguage('en'), false, 'en НЕ должен быть RTL');
  assert.strictEqual(isRtlLanguage('zh'), false, 'zh НЕ должен быть RTL');
  assert.strictEqual(isRtlLanguage('es'), false, 'es НЕ должен быть RTL');
  assert.strictEqual(isRtlLanguage('fr'), false, 'fr НЕ должен быть RTL');
  assert.strictEqual(isRtlLanguage('de'), false, 'de НЕ должен быть RTL');
  console.log('-> RTL Предикаты: УСПЕШНО\n');

  // ТЕСТ 3: Проверка полноты метаданных LANGUAGES_META
  console.log('3. Проверка метаданных LANGUAGES_META (флаги, автохтонные имена, форматы)...');
  for (const lang of SUPPORTED_LANGUAGES) {
    const meta = getLanguageMeta(lang);
    const directMeta = LANGUAGES_META[lang];
    assert.deepStrictEqual(meta, directMeta, `getLanguageMeta(${lang}) должен совпадать с LANGUAGES_META[${lang}]`);
    assert.ok(meta, `Метаданные для ${lang} должны существовать`);
    assert.strictEqual(meta.code, lang, `meta.code должен совпадать с ${lang}`);
    assert.ok(meta.name && meta.name.length > 0, `meta.name для ${lang} не должен быть пустым`);
    assert.ok(meta.nativeName && meta.nativeName.length > 0, `meta.nativeName для ${lang} не должен быть пустым`);
    assert.ok(meta.flag && meta.flag.length > 0, `meta.flag для ${lang} не должен быть пустым`);
    assert.ok(meta.dir === 'ltr' || meta.dir === 'rtl', `meta.dir для ${lang} должен быть ltr или rtl`);
    if (lang === 'ar' || lang === 'fa') {
      assert.strictEqual(meta.dir, 'rtl', `${lang} должен иметь meta.dir = "rtl"`);
    } else {
      assert.strictEqual(meta.dir, 'ltr', `${lang} должен иметь meta.dir = "ltr"`);
    }
  }
  console.log('-> LANGUAGES_META: УСПЕШНО\n');

  // ТЕСТ 4: Проверка нормализации языковых кодов
  console.log('4. Проверка normalizeLanguage (обработка диалектов, регистров, fallback)...');
  assert.strictEqual(normalizeLanguage('ru'), 'ru');
  assert.strictEqual(normalizeLanguage('ru-RU'), 'ru');
  assert.strictEqual(normalizeLanguage('RU_ru'), 'ru');
  assert.strictEqual(normalizeLanguage('en-US'), 'en');
  assert.strictEqual(normalizeLanguage('en-GB'), 'en');
  assert.strictEqual(normalizeLanguage('zh-CN'), 'zh');
  assert.strictEqual(normalizeLanguage('zh-TW'), 'zh');
  assert.strictEqual(normalizeLanguage('ar-EG'), 'ar');
  assert.strictEqual(normalizeLanguage('ar-SA'), 'ar');
  assert.strictEqual(normalizeLanguage('fa-IR'), 'fa');
  assert.strictEqual(normalizeLanguage('es-ES'), 'es');
  assert.strictEqual(normalizeLanguage('fr-FR'), 'fr');
  assert.strictEqual(normalizeLanguage('de-DE'), 'de');
  // Fallback для неизвестных локалей -> en
  assert.strictEqual(normalizeLanguage('xx-YY'), 'en');
  assert.strictEqual(normalizeLanguage(''), 'ru');
  assert.strictEqual(normalizeLanguage(null as any), 'ru');
  console.log('-> normalizeLanguage: УСПЕШНО\n');

  // ТЕСТ 5: Проверка наличия и валидности файлов локализации (все 8 языков × 8 неймспейсов)
  console.log('5. Проверка файлов локализации в locales/ (8 языков x 8 неймспейсов)...');
  const namespaces = ['common', 'auth', 'chat', 'wallet', 'pulse', 'settings', 'landing', 'calls'];
  for (const lang of SUPPORTED_LANGUAGES) {
    const langPath = path.join(localesDir, lang);
    assert.ok(fs.existsSync(langPath), `Директория локали ${langPath} должна существовать`);

    for (const ns of namespaces) {
      const nsFile = path.join(langPath, `${ns}.json`);
      assert.ok(fs.existsSync(nsFile), `Файл ${nsFile} должен существовать`);
      const raw = fs.readFileSync(nsFile, 'utf-8');
      let parsed: any;
      assert.doesNotThrow(() => {
        parsed = JSON.parse(raw);
      }, `Файл ${nsFile} должен быть валидным JSON`);

      assert.ok(typeof parsed === 'object' && parsed !== null, `Содержимое ${nsFile} должно быть объектом`);
    }
  }
  console.log('-> Проверка файлов локализации: УСПЕШНО (64 JSON файла)\n');

  // ТЕСТ 6: Проверка обязательных ключей для M3 (UI селекторы, настройки, лендинг)
  console.log('6. Проверка наличия обязательных ключей локализации для M3 UI...');
  for (const lang of SUPPORTED_LANGUAGES) {
    const settingsFile = path.join(localesDir, lang, 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));

    assert.ok(settings.system?.language, `В ${lang}/settings.json должен присутствовать system.language`);
    assert.ok(settings.system?.languageDesc, `В ${lang}/settings.json должен присутствовать system.languageDesc`);
    assert.ok(settings.languageModal?.title, `В ${lang}/settings.json должен присутствовать languageModal.title`);
    assert.ok(settings.languageModal?.searchPlaceholder, `В ${lang}/settings.json должен присутствовать languageModal.searchPlaceholder`);
    assert.ok(settings.languageModal?.currentLanguage, `В ${lang}/settings.json должен присутствовать languageModal.currentLanguage`);
    assert.ok(settings.languageModal?.rtlBadge, `В ${lang}/settings.json должен присутствовать languageModal.rtlBadge`);

    const landingFile = path.join(localesDir, lang, 'landing.json');
    const landing = JSON.parse(fs.readFileSync(landingFile, 'utf-8'));
    assert.ok(landing.hero, `В ${lang}/landing.json должен быть блок hero`);
    assert.ok(landing.footer, `В ${lang}/landing.json должен быть блок footer`);
  }
  console.log('-> Обязательные ключи M3: УСПЕШНО\n');

  // ТЕСТ 7: Проверка applyLanguage (обновление атрибутов документа в браузере/DOM)
  console.log('7. Проверка applyLanguage и RTL переключения без перезагрузки...');
  // Эмулируем минимальный DOM для Node.js среды
  const mockDocument: any = {
    documentElement: {
      lang: 'ru',
      dir: 'ltr',
      classList: {
        classes: new Set<string>(),
        add(cls: string) { this.classes.add(cls); },
        remove(cls: string) { this.classes.delete(cls); },
        contains(cls: string) { return this.classes.has(cls); }
      },
      setAttribute(name: string, val: string) {
        if (name === 'lang') this.lang = val;
        if (name === 'dir') this.dir = val;
      }
    }
  };
  const mockStorage: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (k: string) => mockStorage[k] || null,
    setItem: (k: string, v: string) => { mockStorage[k] = v; }
  };

  (globalThis as any).document = mockDocument;
  (globalThis as any).localStorage = mockLocalStorage;

  // Проверяем переключение на арабский (RTL)
  applyLanguage('ar');
  assert.strictEqual(mockDocument.documentElement.lang, 'ar', 'document.lang должен быть ar');
  assert.strictEqual(mockDocument.documentElement.dir, 'rtl', 'document.dir должен быть rtl');
  assert.strictEqual(mockDocument.documentElement.classList.contains('rtl'), true, 'Класс rtl должен быть добавлен');
  assert.strictEqual(mockLocalStorage.getItem('i18nextLng'), 'ar', 'i18nextLng в localStorage должен быть ar');

  // Проверяем переключение на персидский (RTL)
  applyLanguage('fa');
  assert.strictEqual(mockDocument.documentElement.lang, 'fa', 'document.lang должен быть fa');
  assert.strictEqual(mockDocument.documentElement.dir, 'rtl', 'document.dir должен быть rtl');
  assert.strictEqual(mockDocument.documentElement.classList.contains('rtl'), true, 'Класс rtl должен быть сохранен');

  // Проверяем переключение на английский (LTR)
  applyLanguage('en');
  assert.strictEqual(mockDocument.documentElement.lang, 'en', 'document.lang должен быть en');
  assert.strictEqual(mockDocument.documentElement.dir, 'ltr', 'document.dir должен быть ltr');
  assert.strictEqual(mockDocument.documentElement.classList.contains('rtl'), false, 'Класс rtl должен быть удален');
  assert.strictEqual(mockLocalStorage.getItem('i18nextLng'), 'en', 'i18nextLng в localStorage должен быть en');
  console.log('-> applyLanguage (DOM & RTL/LTR): УСПЕШНО\n');

  console.log('================================================================');
  console.log('  ВСЕ ТЕСТЫ ВЕХИ M3 УСПЕШНО ПРОЙДЕНЫ (EXIT 0)');
  console.log('================================================================\n');
}

// Запуск при прямом вызове
if (process.argv[1] && process.argv[1].endsWith('m3_ui_and_rtl.test.ts')) {
  runM3UiAndRtlTests().catch((err) => {
    console.error('ОШИБКА ТЕСТА M3:', err);
    process.exit(1);
  });
}
