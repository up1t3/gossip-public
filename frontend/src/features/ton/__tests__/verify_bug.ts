import assert from 'node:assert';
import { validateTonAddress, decodeBase64OrUrl } from '../tonAddressValidator';

console.log('--- EMOJI VALIDATION TEST ---');
const emojiStr = '💎'.repeat(24);
console.log('Input length:', emojiStr.length);
const emojiRes = validateTonAddress(emojiStr);
console.log('Emoji result isValid:', emojiRes.isValid);
console.log('Emoji decoded bytes:', decodeBase64OrUrl(emojiStr));
assert.strictEqual(emojiRes.isValid, false, 'Emoji string must be invalid');
assert.strictEqual(decodeBase64OrUrl(emojiStr), null, 'Emoji string must decode to null');

console.log('\n--- CYRILLIC VALIDATION TEST ---');
const cyrStr = 'я'.repeat(48);
console.log('Input length:', cyrStr.length);
const cyrRes = validateTonAddress(cyrStr);
console.log('Cyrillic result isValid:', cyrRes.isValid);
console.log('Cyrillic decoded bytes:', decodeBase64OrUrl(cyrStr));
assert.strictEqual(cyrRes.isValid, false, 'Cyrillic string must be invalid');
assert.strictEqual(decodeBase64OrUrl(cyrStr), null, 'Cyrillic string must decode to null');

console.log('\n✓ VERIFY BUG TEST: PASSED (Vulnerability successfully patched)');
