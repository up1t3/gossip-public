import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Terminal,
  Play,
  Check,
  Cpu
} from 'lucide-react';
import { GlassButton, GlassCard, GlassInput } from '../../ui';
import { LandingTheme } from './LandingTypes';
import { useTranslation } from 'react-i18next';

interface LandingPlaygroundProps {
  theme: LandingTheme;
}

export const LandingPlayground: React.FC<LandingPlaygroundProps> = ({ theme }) => {
  const { t } = useTranslation(['landing', 'common']);
  const [playgroundText, setPlaygroundText] = useState<string>('Hello, Gossip!');
  const [playgroundStep, setPlaygroundStep] = useState<number>(0);
  const [powNonce, setPowNonce] = useState<string>('');
  const [powProgress, setPowProgress] = useState<number>(0);
  const [srpLog, setSrpLog] = useState<string[]>([]);
  const [encryptedBytes, setEncryptedBytes] = useState<string>('');
  const [wsPayload, setWsPayload] = useState<string>('');
  const [decryptedText, setDecryptedText] = useState<string>('');

  const getGlowColor = () => {
    if (theme === 'light') return 'rgba(0, 122, 255, 0.08)';
    if (theme === 'coffee') return 'rgba(188, 163, 116, 0.08)';
    return 'rgba(15, 157, 88, 0.08)';
  };

  const runSimulation = async () => {
    if (!playgroundText.trim()) return;
    setPlaygroundStep(1);
    setPowProgress(0);
    setPowNonce('');
    setSrpLog([]);
    setEncryptedBytes('');
    setWsPayload('');
    setDecryptedText('');

    // Шаг 1: Симуляция PoW
    const powInterval = setInterval(() => {
      setPowProgress((prev) => {
        if (prev >= 100) {
          clearInterval(powInterval);
          return 100;
        }
        const randomHex = Array.from({ length: 32 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join('');
        setPowNonce(randomHex);
        return prev + 25;
      });
    }, 150);

    await new Promise((r) => setTimeout(r, 800));
    setPowNonce('0000f89a9c' + Array.from({ length: 22 }, () => Math.floor(Math.random() * 16).toString(16)).join(''));
    setPlaygroundStep(2);

    // Шаг 2: Симуляция SRP-6a
    await new Promise((r) => setTimeout(r, 600));
    setSrpLog(prev => [...prev, t('landing:playground.srpLog1', 'Генерация эфемерных ключей: a, A = g^a mod N')]);
    await new Promise((r) => setTimeout(r, 500));
    setSrpLog(prev => [...prev, t('landing:playground.srpLog2', 'Получение соли s и открытого ключа сервера B')]);
    await new Promise((r) => setTimeout(r, 500));
    setSrpLog(prev => [...prev, t('landing:playground.srpLog3', 'Вычисление общего секрета S и доказательства M1')]);
    await new Promise((r) => setTimeout(r, 500));
    setSrpLog(prev => [...prev, t('landing:playground.srpLog4', 'Сессия подтверждена сервером (M2 проверен)')]);

    await new Promise((r) => setTimeout(r, 600));
    setPlaygroundStep(3);

    // Шаг 3: MLS + X25519
    await new Promise((r) => setTimeout(r, 800));
    const hex = Array.from(playgroundText)
      .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('');
    const encrypted = 'pq_kyber_' + hex.split('').reverse().map(char => (parseInt(char, 16) ^ 7).toString(16)).join('');
    setEncryptedBytes(encrypted);

    await new Promise((r) => setTimeout(r, 600));
    setPlaygroundStep(4);

    // Шаг 4: WebSocket
    const packet = JSON.stringify({
      update: 'newMessage',
      chat_id: '00000000-0000-0000-0000-000000000001',
      payload: {
        ciphertext: encrypted.substring(0, 36) + '...',
        mls_epoch: 4,
        pts: 1054
      }
    }, null, 2);
    setWsPayload(packet);

    await new Promise((r) => setTimeout(r, 1200));
    setPlaygroundStep(5);

    // Шаг 5: Расшифровка
    await new Promise((r) => setTimeout(r, 600));
    setDecryptedText(playgroundText);
  };

  return (
    <section id="playground" className="space-y-6">
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100">
          {t('landing:playground.title', 'Криптографическая песочница')}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {t('landing:playground.subtitle', 'Напишите любое сообщение и посмотрите в реальном времени, как мессенджер шифрует и отправляет его')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Ввод */}
        <div className="lg:col-span-5 space-y-4">
          <GlassCard className="p-5 space-y-4 bg-white/[0.01]">
            <h3 className="text-sm font-bold text-slate-200">{t('landing:playground.inputLabel', 'Отправка сообщения')}</h3>
            <div className="space-y-3">
              <GlassInput
                placeholder={t('landing:playground.inputPlaceholder', 'Напишите сообщение...')}
                value={playgroundText}
                onChange={(e) => setPlaygroundText(e.target.value)}
                disabled={playgroundStep > 0 && playgroundStep < 5}
                label={t('landing:playground.inputLabel', 'Ваше тестовое сообщение')}
              />
              <GlassButton
                variant="accent"
                fullWidth
                onClick={runSimulation}
                disabled={playgroundStep > 0 && playgroundStep < 5}
                className={`py-3 font-semibold ${
                  theme === 'light'
                    ? 'border-blue-300 text-blue-700 bg-blue-100 hover:bg-blue-200'
                    : 'border-emerald-500/20 text-emerald-200 bg-emerald-600/10 hover:bg-emerald-600/20'
                } active:scale-[0.98]`}
              >
                <Play className="w-4 h-4" />
                {t('landing:playground.runBtn', 'Запустить шифрование')}
              </GlassButton>
            </div>
          </GlassCard>

          <GlassCard className="p-5 text-xs text-slate-400 space-y-2 border-dashed">
            <h4 className="font-bold text-slate-300 flex items-center gap-1.5">
              <Cpu className={`w-4 h-4 ${theme === 'light' ? 'text-blue-600' : 'text-emerald-400'}`} />
              {t('landing:playground.badge', 'ИНТЕРАКТИВНЫЙ СТЕНД БЕЗОПАСНОСТИ')}
            </h4>
            <p className="leading-relaxed">
              {t('landing:playground.subtitle', 'Этот симулятор в реальном времени отображает то, что Gossip делает на вашем устройстве при каждом нажатии кнопки «Отправить».')}
            </p>
          </GlassCard>
        </div>

        {/* Визуализатор */}
        <div className="lg:col-span-7">
          <GlassCard
            glow
            glowColor={getGlowColor()}
            className={`p-6 min-h-[380px] flex flex-col justify-between transition-all ${
              theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-neutral-950/80 border-white/5'
            }`}
          >
            {/* Индикаторы шагов */}
            <div className={`flex items-center justify-between text-[10px] font-bold border-b pb-4 mb-4 ${
              theme === 'light' ? 'text-slate-400 border-slate-200' : 'text-slate-500 border-white/5'
            }`}>
              <div className={`flex flex-col items-center gap-1 ${playgroundStep >= 1 ? (theme === 'light' ? 'text-blue-600' : 'text-emerald-400') : ''}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center border ${playgroundStep >= 1 ? (theme === 'light' ? 'border-blue-500 bg-blue-100' : 'border-emerald-400 bg-emerald-500/10') : (theme === 'light' ? 'border-slate-200' : 'border-white/10')}`}>1</span>
                <span>PoW</span>
              </div>
              <div className={`h-[1px] flex-grow mx-2 mb-4 ${theme === 'light' ? 'bg-slate-200' : 'bg-white/5'}`} />
              <div className={`flex flex-col items-center gap-1 ${playgroundStep >= 2 ? (theme === 'light' ? 'text-blue-600' : 'text-emerald-400') : ''}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center border ${playgroundStep >= 2 ? (theme === 'light' ? 'border-blue-500 bg-blue-100' : 'border-emerald-400 bg-emerald-500/10') : (theme === 'light' ? 'border-slate-200' : 'border-white/10')}`}>2</span>
                <span>SRP-6a</span>
              </div>
              <div className={`h-[1px] flex-grow mx-2 mb-4 ${theme === 'light' ? 'bg-slate-200' : 'bg-white/5'}`} />
              <div className={`flex flex-col items-center gap-1 ${playgroundStep >= 3 ? (theme === 'light' ? 'text-blue-600' : 'text-emerald-400') : ''}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center border ${playgroundStep >= 3 ? (theme === 'light' ? 'border-blue-500 bg-blue-100' : 'border-emerald-400 bg-emerald-500/10') : (theme === 'light' ? 'border-slate-200' : 'border-white/10')}`}>3</span>
                <span>MLS + X25519</span>
              </div>
              <div className={`h-[1px] flex-grow mx-2 mb-4 ${theme === 'light' ? 'bg-slate-200' : 'bg-white/5'}`} />
              <div className={`flex flex-col items-center gap-1 ${playgroundStep >= 4 ? (theme === 'light' ? 'text-blue-600' : 'text-emerald-400') : ''}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center border ${playgroundStep >= 4 ? (theme === 'light' ? 'border-blue-500 bg-blue-100' : 'border-emerald-400 bg-emerald-500/10') : (theme === 'light' ? 'border-slate-200' : 'border-white/10')}`}>4</span>
                <span>WebSocket</span>
              </div>
            </div>

            {/* Табло симуляции */}
            <div className="flex-grow flex flex-col justify-center py-4">
              {playgroundStep === 0 && (
                <div className="text-center space-y-3 py-8">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mx-auto">
                    <Terminal className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    {t('landing:playground.subtitle', 'Запишите текст сообщения слева и нажмите «Запустить симуляцию» для визуального аудита.')}
                  </p>
                </div>
              )}

              {playgroundStep === 1 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-200">{t('landing:playground.step1Title', '1. Proof-of-Work (Анти-DDoS)')}</span>
                    <span className={`font-bold ${theme === 'light' ? 'text-blue-600' : 'text-emerald-400'}`}>{powProgress}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                    <motion.div
                      className={`h-full ${theme === 'light' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}
                      initial={{ width: '0%' }}
                      animate={{ width: `${powProgress}%` }}
                      transition={{ ease: 'easeInOut' }}
                    />
                  </div>
                  <div className={`rounded-xl p-3.5 border font-mono text-[10px] space-y-1.5 overflow-hidden ${
                    theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-neutral-900/90 border-white/5'
                  }`}>
                    <div className={`${theme === 'light' ? 'text-blue-600' : 'text-emerald-400'} font-bold`}>// {t('landing:playground.step1Desc', 'Вычисление хеша SHA-256 с заданной сложностью')}</div>
                    <div className="text-slate-400 break-all select-all">Nonce: {powNonce}</div>
                  </div>
                </div>
              )}

              {playgroundStep === 2 && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="text-xs font-bold text-slate-200">{t('landing:playground.step2Title', '2. SRP-6a Zero-Knowledge Auth')}</div>
                  <div className={`rounded-xl p-3.5 border font-mono text-[10px] space-y-2 overflow-y-auto max-h-[160px] ${
                    theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-neutral-900/90 border-white/5'
                  }`}>
                    {srpLog.map((log, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">✔</span>
                        <span className="text-slate-300">{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {playgroundStep === 3 && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="text-xs font-bold text-slate-200">{t('landing:playground.step3Title', '3. PQ-MLS (Kyber + X25519)')}</div>
                  <div className={`rounded-xl p-3.5 border space-y-2.5 ${
                    theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-neutral-900/90 border-white/5'
                  }`}>
                    <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500">
                      <span>PLAINTEXT</span>
                      <span className="text-red-500">OPEN</span>
                    </div>
                    <div className={`text-xs font-medium p-2 rounded border font-mono ${
                      theme === 'light'
                        ? 'text-slate-100 bg-slate-200/40 border-slate-200'
                        : 'text-slate-200 bg-white/5 border-white/5'
                    }`}>
                      {playgroundText}
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500">
                      <span>{t('landing:playground.step3Desc', 'Зашифрованный шифротекст')}</span>
                      <span className={theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}>E2EE PQ-MLS</span>
                    </div>
                    <div className={`text-xs font-mono p-2 rounded break-all select-all border ${
                      theme === 'light'
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-250'
                        : 'text-emerald-400 bg-emerald-950/20 border-emerald-950/40'
                    }`}>
                      {encryptedBytes}
                    </div>
                  </div>
                </div>
              )}

              {playgroundStep === 4 && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-200">{t('landing:playground.step4Title', '4. WebSocket Transport')}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full animate-ping ${theme === 'light' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                      <span className={`text-[10px] font-bold ${theme === 'light' ? 'text-blue-600' : 'text-emerald-400'}`}>TX/RX...</span>
                    </div>
                  </div>
                  <div className={`rounded-xl p-3.5 border font-mono text-[9px] overflow-x-auto select-all leading-relaxed whitespace-pre ${
                    theme === 'light'
                      ? 'bg-blue-50/50 border-blue-100 text-blue-700'
                      : 'bg-neutral-900/90 border-white/5 text-emerald-300'
                  }`}>
                    {wsPayload}
                  </div>
                </div>
              )}

              {playgroundStep === 5 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className={`flex items-center gap-2 p-3 border rounded-xl text-xs ${
                    theme === 'light'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}>
                    <Check className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="font-bold">{t('landing:playground.step5Title', '5. Расшифровка на устройстве получателя')}</p>
                      <p className="text-[10px] mt-0.5">SHA-256 HMAC Verified. Zero-Knowledge E2EE.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-3 border rounded-xl ${
                      theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.01] border-white/5'
                    }`}>
                      <span className="text-[9px] uppercase font-bold text-slate-500">Destination</span>
                      <p className="text-xs text-slate-100 mt-1 font-semibold break-all">{decryptedText}</p>
                    </div>
                    <div className={`p-3 border rounded-xl ${
                      theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.01] border-white/5'
                    }`}>
                      <span className="text-[9px] uppercase font-bold text-slate-500">Network Payload</span>
                      <p className="text-xs text-slate-500 mt-1 font-mono break-all">{encryptedBytes.substring(0, 16)}...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Подвал симуляции */}
            <div className={`text-[10px] text-slate-400 pt-3 border-t flex items-center justify-between ${
              theme === 'light' ? 'border-slate-200' : 'border-white/5'
            }`}>
              <span>
                {playgroundStep === 1 && t('landing:playground.status1', 'Вычисление криптографического nonce-хеша...')}
                {playgroundStep === 2 && t('landing:playground.status2', 'Установка безопасной сессии SRP 6a без отсылки пароля...')}
                {playgroundStep === 3 && t('landing:playground.status3', 'Шифрование через MLS на ключах X25519...')}
                {playgroundStep === 4 && t('landing:playground.status4', 'WebSocket трансляция зашифрованных битов по сети...')}
                {playgroundStep === 5 && t('landing:playground.status5', 'Расшифровка на принимающем устройстве.')}
                {playgroundStep === 0 && t('landing:playground.status0', 'Ожидание запуска...')}
              </span>

              {playgroundStep === 5 && (
                <button
                  type="button"
                  onClick={() => setPlaygroundStep(0)}
                  className={`font-bold transition-colors ${theme === 'light' ? 'text-blue-600 hover:text-blue-500' : 'text-emerald-400 hover:text-emerald-300'}`}
                >
                  {t('landing:playground.resetBtn', 'Сбросить')}
                </button>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
};
