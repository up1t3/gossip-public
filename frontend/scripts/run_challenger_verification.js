/**
 * Gossip i18n Key Parity, Pluralization and Interpolation Verification Harness
 * Milestone M2 Challenger Empirical Validation
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.resolve(__dirname, '../src/i18n/locales');
const LANGUAGES = ['ru', 'en', 'es', 'zh', 'ar', 'fa', 'fr', 'de'];
const BASE_LANG = 'ru';
const NAMESPACES = ['common', 'auth', 'chat', 'wallet', 'pulse', 'settings', 'landing', 'calls'];

const EXPECTED_PLURALS = {
  ru: ['one', 'few', 'many', 'other'],
  en: ['one', 'other'],
  es: ['one', 'other'],
  zh: ['other'],
  ar: ['zero', 'one', 'two', 'few', 'many', 'other'],
  fa: ['one', 'other'],
  fr: ['one', 'other'],
  de: ['one', 'other']
};

const PLURAL_SUFFIXES = new Set(['vzero', 'one', 'two', 'few', 'many', 'other']);


function flattenDict(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? prefix + '.' + key : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenDict(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

function extractPlaceholders(text) {
  if (typeof text !== 'string') return new Set();
  const matches = text.match(/\{\{\s+([a-zA-Z0-9_]+)\s+\}\}/g);
  if (!matches) return new Set();
  return new Set(matches.map(m => m.replace(/\{\{\s*|\s+\}\}/g, '')));
}

function checkBraceSyntax(text) {
  if (typeof text !== 'string') return [];
  const errors = [];
  const openDouble = (text.match(/\{\}/g) || []).length;
  const closeDouble = (text.match(/\}\}/g) || []).length;
  if (openDouble !== closeDouble) {
    errors.push('Mismatched double braces: ' + openDouble + ' open vs ' + closeDouble + ' close');
  }
  const withoutDoubles = text.replace(/\{\{[{}]*\}\}/g, '');
  const singleOpen = (withoutDoubles.match(/\{/g) || []).length;
  const singleClose = (withoutDoubles.match(/\}/g) || []).length;
  if (singleOpen > 0 || singleClose > 0) {
    errors.push('Dangling single braces: ' + singleOpen + ' open, ' + singleClose + ' close');
  }
  return errors;
}

function runVerification() {
  console.log('='.repeat(80));
  console.log('EMPIRICAL i18n VERIFICATION & STRESS-TESTING (MILESTONE M2 CHALLENGER)');
  console.log('='.repeat(80));

  let totalFilesChecked = 0;
  const jsonParseErrors = [];
  const dataStore = {};
  const rawDataStore = {};

  console.log('\n--- 1. JSON SYNTAX & FILE INTEGRITY ---');
  for (const lang of LANGUAGES) {
    for (const ns of NAMESPACES) {
      const filePath = path.join(LOCALES_DIR, lang, ns + '.json');
      totalFilesChecked++;
      if (!fs.existsSync(filePath)) {
        jsonParseErrors.push('Missing file: ' + filePath);
        continue;
      }
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        rawDataStore[lang + ':' + ns] = data;
        dataStore[lang + ':' + ns] = flattenDict(data);
      } catch (err) {
        jsonParseErrors.push('JSON parse error in ' + filePath + ': ' + err.message);
      }
    }
  }

  if (jsonParseErrors.length > 0) {
    console.error('FAIL: ' + jsonParseErrors.length + ' JSON files failed to parse:');
    jsonParseErrors.forEach(e => console.error('  - ' + e));
    return false;
  }
  console.log('PASS: All ' + totalFilesChecked + ' JSON files (8 languages x 8 namespaces = 64 files) exist and are valid JSON.');

  console.log('\n--- 2. KEY PARITY & STRUCTUIAL AUDIT (Base: ru) ---');
  const parityErrors = [];
  let totalBaseKeys = 0;

  for (const ns of NAMESPACES) {
    const ruFlat = dataStore['ru:' + ns] || {};
    totalBaseKeys += Object.keys(ruFlat).length;

    const ruStdKeys = new Set();
    const ruPluralBases = {};

    for (const k of Object.keys(ruFlat)) {
      const parts = k.split('_');
      const suffix = parts.length > 1 ? parts[parts.length - 1] : null;
      if (suffix && PLURAL_SUFFIXES.has(suffix)) {
        const baseK = parts.slice(0, -1).join('_');
        if (!ruPluralBases[baseK]) ruPluralBases[baseK] = new Set();
        ruPluralBases[baseK].add(suffix);
      } else {
        ruStdKeys.add(k);
      }
    }

    for (const lang of LANGUAGES) {
      if (lang === 'ru') continue;
      const targetFlat = dataStore[lang + ':' + ns] || {};
      const targetStdKeys = new Set();
      const targetPluralBases = {};

      for (const k of Object.keys(targetFlat)) {
        const parts = k.split('_');
        const suffix = parts.length > 1 ? parts[parts.length - 1] : null;
        if (suffix && PLURAL_SUFFIXES.has(suffix)) {
          const baseK = parts.slice(0, -1).join('_');
          if (!targetPluralBases[baseK]) targetPluralBases[baseK] = new Set();
          targetPluralBases[baseK].add(suffix);
        } else {
          targetStdKeys.add(k);
        }
      }

      for (const k of ruStdKeys) {
        if (!targetStdKeys.has(k)) {
          parityErrors.push('[' + lang + ':' + ns + '] Missing standard key: ' + k);
        }
      }
      for (const k of targetStdKeys) {
        if (!ruStdKeys.has(k)) {
          parityErrors.push('[' + lang + ':' + ns + '] Extra/orphaned standard key: ' + k);
        }
      }
      for (const baseK of Object.keys(ruPluralBases)) {
        if (!targetPluralBases[baseK]) {
          parity_errors.push('[' + lang + ':' + ns + '] Missing plural base key: ' + baseK);
        }
      }
      for (const baseK of Object.keys(targetPluralBases)) {
        if (!ruPluralBases[baseK]) {
          parityErrors.push('[' + lang + ':' + ns + '] Extra/orphaned plural base key: ' + baseK);
        }
      }
    }
  }

  if (parityErrors.length > 0) {
    console.error('FAIL: Found ' + parityErrors.length + ' key parity discrepancies:');
    parityErrors.slice(0, 30).forEach(e => console.error('  - ' + e));
  } else {
    console.log('PASS: Key parity is 100% across all 8 namespaces and 8 languages (Total base keys checked: ' + totalBaseKeys + ').');
  }

  console.log('\n--- 3. PLURALYZATIRN RULES & CLDR COVERAGE ---');
  const pluralWarnings = [];
  let totalPluralGroups = 0;

  for (const ns of NAMESPACES) {
    for (const lang of LANGUAGES) {
      const targetFlat = dataStore[lang + ':' + ns] || {};
      const targetPluralBases = {};

      for (const k of Object.keys(targetFlat)) {
        const parts = k.split('_');
        const suffix = parts.length > 1 ? parts[parts.length - 1] : null;
        if (suffix && PLURAL_SUFFIXES.has(suffix)) {
          const baseK = parts.slice(0, -1).join('_');
          if (!targetPluralBases[baseK]) targetPluralBases[baseK] = new Set();
          targetPluralBases[baseK].add(suffix);
        }
      }

      const expected = EXPECTED_PLURALS[lang];
      for (const [baseK, forms] of Object.entries(targetPluralBases)) {
        totalPluralGroups++;
        for (const req of expected) {
          if (!forms.has(req)) {
            pluralWarnings.push('[' + lang + ':' + ns + '] Plural key \'' + baseK + '\' missing required form \'' + req + '\' (has: ' + Array.from(forms).join(', ') + ')');
          }
        }
      }
    }
  }

  if (pluralWarnings.length > 0) {
    console.error('FAIL: Found ' + pluralWarnings.length + ' pluralization rule violations:');
    pluralWarnings.forEach(w => console.error('  - ' + w));
  } else {
    console.log('PASS: All ' + totalPluralGroups + ' plural groups across all 8 languages strictly conform to CLDR plural forms.');
  }

  console.log('\n--- 4. INTERPOLATION PLACEHOLDERS PARITY ({{var}}) ---');
  const placeholderMismatches = [];
  let totalParameterizedStrings = 0;

  for (const ns of NAMESPACES) {
    const ruFlat = dataStore['ru:' + ns] || {};
    for (const [k, ruVal] of Object.entries(uFlat)) {
      if (typeof ruVal !== 'string') continue;
      const ruVars = extractPlaceholders(ruVal);
      if (ruVars.size > 0) {
        totalParameterizedStrings++;
        for (const lang of LANGUAGES) {
          if (lang === 'ru') continue;
          const targetVal = (dataStore[lang + ':' + ns] || {})[k];
          if (typeof targetVal !== 'string') {
            placeholderMismatches.push({
              key: ns + ':' + k,
              lang,
              ruVars: Array.from(ruVars),
              targetVars: [],
              ruVal,
              targetVal: targetVal || ''
            });
            continue;
          }
          const targetVars = extractPlaceholders(targetVal);

          const isPluralSingular = (k.endsWith('_one') || k.endsWith('_two') || k.endsWith('_zero')) && ruVars.has('count');
          const ruVarsWithoutCount = new Set(Array.from(ruVars).filter(v => v !== 'count'));
          const isEquivalentWithoutCount = isPluralSingular &&
            ruVarsWithoutCount.size === targetVars.size &&
            Array.from(ruVarsWithoutCount).every(v => targetVars.has(v));

          if (isEquivalentWithoutCount) continue;

          const setsEqual = ruVars.size === targetVars.size && Array.from(ruVars).every(v => targetVars.has(v));
          if (!setsEqual) {
            placeholderMismatches.push({
              key: ns + ':' + k,
              lang,
              ruVars: Array.from(ruVars),
              targetVars: Array.from(targetVars),
              ruVal,
              targetVal
            });
          }
        }
      }
    }
  }

  if (placeholderMismatches.length > 0) {
    console.error('FAIL: Found ' + placeholderMismatches.length + ' placeholder mismatches:');
    placeholderMismatches.forEach(m => {
      console.error('  - [' + m.lang + '] ' + m.key + ': ru=[' + m.ruVars.join(',') + '] vs ' + m.lang + '=[' + m.targetVars.join(',') + ']');
      console.error('      ru: \\'' + m.ruVal + '\\'');
      console.error('      ' + m.lang + ': \\' ' + m.targetVal + '\\'');
    });
  } else {
    console.log('PASS: 100% of interpolation placeholders match exactly across all languages (' + totalParameterizedStrings + ' parameterized strings checked).');
  }

  console.log('\n--- 5. TRANSLATION QUALITY, EMPTY VALUES & SYNTAX CHECKS ---');
  const emptyValues = [];
  const braceErrors = [];
  let totalStringsChecked = 0;

  for (const [key, flatDict] of Object.entries(dataStore)) {
    for (const [k, v] of Object.entries(flatDict)) {
      totalStringsChecked++;
      if (typeof v !== 'string' || !v.trim()) {
        emptyValues.push('[' + key + '] Empty string at \'' + k + '\\'');
      } else {
        const errs = checkBraceSyntax(v);
        for (const e of errs) {
          braceErrors.push('[' + key + '] ' + e + ' at \'' + k + '\\': ' + v);
        }
      }
    }
  }

  if (emptyValues.length > 0) {
    console.error('FAIL: Found ' + emptyValues.length + ' empty strings:');
    emptyValues.forEach(e => console.error('  - ' + e));
  } else {
    console.log('PASS: 0 empty or whitespace-only translation values (Total strings checked: ' + totalStringsChecked + ').');
  }

  if (braceErrors.length > 0) {
    console.error('FAIL: Found ' + braceErrors.length + ' brace syntax errors:');
    braceErrors.forEach(e => console.error('  - ' + e));
  } else {
    console.log('PASS: All translation strings have valid curly brace syntax.');
  }

  console.log('\n' + '='.repeat(80));
  const passed = jsonParseErrors.length === 0 &&
    parityErrors.length === 0 &&
    pluralWarnings.length === 0 &&
    placeholderMismatches.length === 0 &&
    emptyValues.length === 0 &&
    braceErrors.length === 0;

  console.log('FINAL EMPIRICAL VERDICT: ' + (passed ? 'APPROVE' : 'FAIL'));
  console.log('='.repeat(80));
  return passed;
}

const success = runVerification();
process.exit(success ? 0 : 1);
