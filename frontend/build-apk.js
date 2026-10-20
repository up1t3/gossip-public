import { execSync } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function deleteBuildArtifacts(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    try {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        deleteBuildArtifacts(filePath);
      } else {
        const lower = file.toLowerCase();
        if (lower.endsWith('.apk') || lower.endsWith('.exe')) {
          fs.unlinkSync(filePath);
          console.log(`[build-apk] Удален старый артефакт: ${filePath}`);
        }
      }
    } catch (e) {
      console.warn(`[build-apk] Не удалось обработать ${filePath}:`, e.message);
    }
  }
}

try {
  console.log('[build-apk] Очистка старых артефактов перед сборкой...');
  
  // Удаляем APK и EXE из public и dist перед сборкой
  const publicDir = path.join(__dirname, 'public');
  const distDir = path.join(__dirname, 'dist');
  
  deleteBuildArtifacts(publicDir);
  deleteBuildArtifacts(distDir);

  console.log('[build-apk] Запуск сборки фронтенда...');
  execSync('npm run build', { stdio: 'inherit', cwd: __dirname });

  console.log('[build-apk] Синхронизация Capacitor...');
  execSync('npx cap sync', { stdio: 'inherit', cwd: __dirname });

  console.log('[build-apk] Запуск Gradle сборки...');
  const isWindows = os.platform() === 'win32';
  const buildType = process.argv[2] === 'release' ? 'assembleRelease' : 'assembleDebug';
  const gradleCmd = isWindows ? `gradlew.bat clean ${buildType}` : `./gradlew clean ${buildType}`;
  
  execSync(gradleCmd, {
    stdio: 'inherit',
    cwd: path.join(__dirname, 'android')
  });

  console.log('[build-apk] Копирование APK...');
  execSync('node copy-apk.js', { stdio: 'inherit', cwd: __dirname });

  console.log('[build-apk] Сборка APK завершена успешно!');
} catch (err) {
  console.error('[build-apk] Произошла ошибка во время сборки APK:', err);
  process.exit(1);
}
