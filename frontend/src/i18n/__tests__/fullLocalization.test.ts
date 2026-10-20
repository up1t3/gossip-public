import assert from 'node:assert';
import { SUPPORTED_LANGUAGES, resources } from '../config';
import { translateUiText, applyDomTranslations } from '../autoDomTranslator';

const NON_RU_LANGS = SUPPORTED_LANGUAGES.filter((l) => l !== 'ru');
const CYRILLIC_RE = /[А-Яа-яЁё]/;

function flattenKeys(obj: Record<string, any>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') {
      out[key] = v;
    } else if (v && typeof v === 'object') {
      Object.assign(out, flattenKeys(v, key));
    }
  }
  return out;
}

export function runFullLocalizationTests(): void {
  // 1. Verify transports namespace (NetworkShieldModal, TransportShieldSection, LoraPairingScreen, RadarCanvas)
  const ruTransportsFlat = flattenKeys(resources.ru.transports as Record<string, any>);
  const ruKeys = Object.keys(ruTransportsFlat);
  assert.ok(ruKeys.length > 150, 'Expected > 150 keys in transports namespace');

  assert.ok(ruTransportsFlat['shield.modal_title'], 'shield.modal_title must exist');
  assert.ok(ruTransportsFlat['shield.smart_shield_title'], 'shield.smart_shield_title must exist');
  assert.ok(ruTransportsFlat['shield.gw_official_name'], 'shield.gw_official_name must exist');
  assert.ok(ruTransportsFlat['shield.gw_fake_tls_name'], 'shield.gw_fake_tls_name must exist');
  assert.ok(ruTransportsFlat['shield.radar_you'], 'shield.radar_you must exist');
  assert.ok(ruTransportsFlat['transports.lora_radio_label'], 'transports.lora_radio_label must exist');
  assert.ok(ruTransportsFlat['transports.peer_node_prefix'], 'transports.peer_node_prefix must exist');

  for (const lang of NON_RU_LANGS) {
    const langFlat = flattenKeys(resources[lang].transports as Record<string, any>);
    for (const key of ruKeys) {
      assert.ok(langFlat[key] !== undefined, `Missing key ${key} in ${lang}/transports`);
      assert.ok(langFlat[key].trim().length > 0, `Empty key ${key} in ${lang}/transports`);
      assert.strictEqual(
        CYRILLIC_RE.test(langFlat[key]),
        false,
        `Untranslated Cyrillic in ${lang}/transports.${key}: "${langFlat[key]}"`
      );
    }
  }

  // 2. Verify all 9 core namespaces contain zero Cyrillic in non-RU languages
  const namespaces = ['common', 'auth', 'chat', 'wallet', 'pulse', 'settings', 'landing', 'calls', 'quest'] as const;
  for (const lang of NON_RU_LANGS) {
    for (const ns of namespaces) {
      const flat = flattenKeys((resources[lang] as any)[ns]);
      for (const [key, val] of Object.entries(flat)) {
        if (key === 'language.ru') continue;
        assert.strictEqual(
          CYRILLIC_RE.test(val),
          false,
          `Untranslated Cyrillic in ${lang}/${ns}:${key} -> "${val}"`
        );
      }
    }
  }

  // 3. Verify translateUiText across all 7 non-RU languages and Russian preservation
  const samples = [
    'Боты и Интеграции (Developer Hub)',
    'Спец-арсенал Gossip',
    'Участники (',
    'Администрация и участники (',
    '💎 Перевод криптовалюты: @alice',
    'Вебхук отвечает! Задержка: 42 мс',
    'Отправлено 5, не отправлено 1',
    '⏱️ Автосброс при неактивности установлен на 30 дн.',
    'ZK-Рейтинг: 98 (15 сделок)',
    '125 подписчиков',
    '14 участников',
    '25 января 2026 г.',
    'Камера не поддерживается в данной среде',
    'Проверка безопасности',
    '🛡️ Паспорт доверия ZK-Reputation',
  ];

  for (const sample of samples) {
    assert.strictEqual(translateUiText(sample, 'ru'), sample);
    for (const lang of NON_RU_LANGS) {
      const translated = translateUiText(sample, lang);
      assert.notStrictEqual(translated, sample, `Failed to translate "${sample}" to ${lang}`);
      assert.strictEqual(
        CYRILLIC_RE.test(translated),
        false,
        `Cyrillic remained when translating "${sample}" to ${lang}: "${translated}"`
      );
    }
  }

  // 4. Verify reversible DOM Text and attribute translation
  (globalThis as any).Node = { TEXT_NODE: 3, ELEMENT_NODE: 1 };
  (globalThis as any).NodeFilter = { SHOW_TEXT: 4, SHOW_ELEMENT: 1 };

  const textNode1: any = {
    nodeType: 3,
    nodeValue: 'Боты и Интеграции (Developer Hub)',
    parentElement: { tagName: 'H2', isContentEditable: false, closest: () => null },
  };
  const textNode2: any = {
    nodeType: 3,
    nodeValue: 'Участники (',
    parentElement: { tagName: 'P', isContentEditable: false, closest: () => null },
  };
  const attrs: Record<string, string> = {
    placeholder: 'Задайте вопрос...',
    title: 'Поиск в чате…',
    'aria-label': 'Закрыть окно',
  };
  const inputEl: any = {
    nodeType: 1,
    tagName: 'INPUT',
    getAttribute: (k: string) => (k in attrs ? attrs[k] : null),
    setAttribute: (k: string, v: string) => {
      attrs[k] = v;
    },
  };
  const container: any = {
    nodeType: 1,
    tagName: 'DIV',
    getAttribute: () => null,
    setAttribute: () => {},
  };

  const nodes = [textNode1, textNode2, inputEl];
  (globalThis as any).document = {
    createTreeWalker: () => {
      let idx = 0;
      return {
        nextNode: () => (idx < nodes.length ? nodes[idx++] : null),
      };
    },
  };

  for (const lang of NON_RU_LANGS) {
    applyDomTranslations(container, lang);
    assert.strictEqual(CYRILLIC_RE.test(textNode1.nodeValue), false);
    assert.strictEqual(CYRILLIC_RE.test(textNode2.nodeValue), false);
    assert.strictEqual(CYRILLIC_RE.test(attrs.placeholder), false);
    assert.strictEqual(CYRILLIC_RE.test(attrs.title), false);
    assert.strictEqual(CYRILLIC_RE.test(attrs['aria-label']), false);
  }

  applyDomTranslations(container, 'ru');
  assert.strictEqual(textNode1.nodeValue, 'Боты и Интеграции (Developer Hub)');
  assert.strictEqual(textNode2.nodeValue, 'Участники (');
  assert.strictEqual(attrs.placeholder, 'Задайте вопрос...');
  assert.strictEqual(attrs.title, 'Поиск в чате…');
  assert.strictEqual(attrs['aria-label'], 'Закрыть окно');
}

runFullLocalizationTests();
console.log('✓ Full 8-language localization suite passed!');
