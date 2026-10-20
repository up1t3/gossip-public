import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Возможные пути к скомпилированному APK
const possiblePaths = [
  path.join(__dirname, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'),
  path.join(__dirname, 'android', 'app', 'build', 'intermediates', 'apk', 'release', 'app-release.apk'),
  path.join(__dirname, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release-signed.apk'),
  path.join(__dirname, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release-unsigned.apk'),
  path.join(__dirname, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
  path.join(__dirname, 'android', 'app', 'build', 'intermediates', 'apk', 'debug', 'app-debug.apk')
];

// Целевой путь для копирования
const targetDir = path.join(__dirname, '..', 'backend', 'message-api', 'static', 'media');
const targetApk = path.join(targetDir, 'gossip.apk');

try {
  // Создание папки назначения, если её не существует
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`[copy-apk] Создана директория назначения: ${targetDir}`);
  }

  let sourceApk = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      sourceApk = p;
      break;
    }
  }

  if (!sourceApk) {
    console.error(`[copy-apk] Ошибка: Ни один из файлов APK не найден в возможных путях:`);
    possiblePaths.forEach(p => console.error(`  - ${p}`));
    process.exit(1);
  }

  fs.copyFileSync(sourceApk, targetApk);
  console.log(`[copy-apk] Успешно скопировано: ${sourceApk} -> ${targetApk}`);

  // Копирование в public/ и dist/ для раздачи пользователям
  const publicDir = path.join(__dirname, 'public');
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  const publicApk = path.join(publicDir, 'gossip.apk');
  const distApk = path.join(distDir, 'gossip.apk');
  
  fs.copyFileSync(sourceApk, publicApk);
  console.log(`[copy-apk] Успешно скопировано: ${sourceApk} -> ${publicApk}`);
  
  fs.copyFileSync(sourceApk, distApk);
  console.log(`[copy-apk] Успешно скопировано: ${sourceApk} -> ${distApk}`);
} catch (err) {
  console.error('[copy-apk] Ошибка при копировании APK:', err);
  process.exit(1);
}
