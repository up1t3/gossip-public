// frontend/src/features/pulse/__tests__/geoH3.test.ts
import assert from 'node:assert';
import { latLngToH3Index, isValidH3IndexClient } from '../geoH3';

export async function runGeoH3Tests() {
  console.log('=== UNIVERSAL PULSE ENGINE: GEO H3 INDEXER TESTS ===\n');

  console.log('[TEST 1] Проверка валидации H3 Res 8 для различных городов мира...');
  const testCoords = [
    { city: 'Москва', lat: 55.7558, lon: 37.6173 },
    { city: 'Нью-Йорк', lat: 40.7128, lon: -74.006 },
    { city: 'Токио', lat: 35.6762, lon: 139.6503 },
    { city: 'Сидней', lat: -33.8688, lon: 151.2093 },
    { city: 'Лондон', lat: 51.5074, lon: -0.1278 },
    { city: 'Экватор / Нулевой меридиан', lat: 0.0, lon: 0.0 },
    { city: 'Северный полюс', lat: 89.9, lon: 0.0 },
    { city: 'Южный полюс', lat: -89.9, lon: 0.0 },
  ];

  for (const item of testCoords) {
    const h3 = latLngToH3Index(item.lat, item.lon, 8);
    assert.ok(h3 && h3.length >= 15, `H3 индекс для ${item.city} должен быть валидной строкой`);
    const isValid = isValidH3IndexClient(h3);
    assert.strictEqual(isValid, true, `H3 индекс ${h3} для ${item.city} должен быть валидным`);
    console.log(`  -> ${item.city} [${item.lat}, ${item.lon}] => H3: ${h3} (valid: ${isValid})`);
  }

  console.log('\n[TEST 2] Проверка детерминированности преобразования координат...');
  const h3_1 = latLngToH3Index(55.75, 37.61, 8);
  const h3_2 = latLngToH3Index(55.75, 37.61, 8);
  assert.strictEqual(h3_1, h3_2, 'Одинаковые координаты должны давать идентичный H3 индекс');

  console.log('\n[TEST 3] Проверка отсечения некорректных H3 строк...');
  assert.strictEqual(isValidH3IndexClient(''), false);
  assert.strictEqual(isValidH3IndexClient(null as any), false);
  assert.strictEqual(isValidH3IndexClient('not_a_hex'), false);
  assert.strictEqual(isValidH3IndexClient('12345'), false);

  console.log('\n=== ВСЕ ТЕСТЫ GEO H3 УСПЕШНО ПРОЙДЕНЫ (EXIT CODE 0) ===\n');
}

runGeoH3Tests().catch((err) => {
  console.error('ТЕСТ GEO H3 УПАЛ С ОШИБКОЙ:', err);
  process.exit(1);
});
