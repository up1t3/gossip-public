// frontend/src/components/ui/PremiumSecurityModal.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShieldAlert,
  KeyRound,
  Timer,
  Flame,
  AudioWaveform,
  Copy,
  Check,
  Trash2,
  Crown,
  ExternalLink,
  Plus,
  Loader2,
  Lock,
  Sparkles,
} from 'lucide-react';
import {
  VOICE_CHANGER_PRESETS,
  type VoiceChangerPreset,
} from '../../utils/voiceChanger';
import {
  setDecoyPin,
  hasDecoyPin,
  getDecoyPinAction,
  clearDecoyPin,
  fetchPremiumSecurityStatus,
  updateDeadMansSwitch,
  createBurnerLink,
  burnRoomImmediately,
  type DecoyPinAction,
  type BurnerLinkItem,
} from '../../utils/premiumSecurity';

export interface PremiumSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPremium: boolean;
  username: string;
  voicePreset: VoiceChangerPreset;
  onSelectVoicePreset: (preset: VoiceChangerPreset) => void;
  onOpenPremiumPaywall: () => void;
  onOpenBurnerChat?: (burner: BurnerLinkItem) => void;
  onToast?: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export const PremiumSecurityModal: React.FC<PremiumSecurityModalProps> = ({
  isOpen,
  onClose,
  isPremium,
  username,
  voicePreset,
  onSelectVoicePreset,
  onOpenPremiumPaywall,
  onOpenBurnerChat,
  onToast,
}) => {
  const [activeSection, setActiveSection] = useState<'decoy' | 'voice' | 'dms' | 'burner'>('decoy');

  // 1. Decoy PIN state
  const [decoyConfigured, setDecoyConfigured] = useState(false);
  const [decoyPinInput, setDecoyPinInput] = useState('');
  const [decoyAction, setDecoyAction] = useState<DecoyPinAction>('decoy_chats');

  // 2. Dead Man's Switch state
  const [dmsDays, setDmsDays] = useState<number>(0);
  const [dmsAction, setDmsAction] = useState<'wipe_all' | 'wipe_messages'>('wipe_all');
  const [dmsNote, setDmsNote] = useState('');
  const [dmsExpiresAt, setDmsExpiresAt] = useState<string | null>(null);
  const [isSavingDms, setIsSavingDms] = useState(false);

  // 3. Burner Links state
  const [burnerTitle, setBurnerTitle] = useState('Секретный контакт');
  const [burnerTtl, setBurnerTtl] = useState<number>(60);
  const [burnerSingleUse, setBurnerSingleUse] = useState<boolean>(true);
  const [burnerLinks, setBurnerLinks] = useState<BurnerLinkItem[]>([]);
  const [isCreatingBurner, setIsCreatingBurner] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [isLoadingServer, setIsLoadingServer] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const cleanUser = (username || localStorage.getItem('username') || 'default').toLowerCase().trim();
    setDecoyConfigured(hasDecoyPin(cleanUser));
    setDecoyAction(getDecoyPinAction(cleanUser));

    setIsLoadingServer(true);
    fetchPremiumSecurityStatus()
      .then((status) => {
        if (status.dead_mans_switch) {
          setDmsDays(status.dead_mans_switch.inactivity_days || 0);
          setDmsAction(status.dead_mans_switch.action || 'wipe_all');
          setDmsNote(status.dead_mans_switch.farewell_note || '');
          setDmsExpiresAt(status.dead_mans_switch.expires_at || null);
        }
        if (Array.isArray(status.burner_links)) {
          setBurnerLinks(status.burner_links);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingServer(false));
  }, [isOpen, username]);

  if (!isOpen) return null;

  const cleanUser = (username || localStorage.getItem('username') || 'default').toLowerCase().trim();

  const handleSaveDecoyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPremium) {
      onOpenPremiumPaywall();
      return;
    }
    if (decoyPinInput.trim().length < 4) {
      onToast?.('Ложный PIN должен содержать от 4 до 8 цифр', 'error');
      return;
    }
    const currentRealPin = sessionStorage.getItem(`db_local_pin_${cleanUser}`);
    if (currentRealPin && currentRealPin === decoyPinInput.trim()) {
      onToast?.('Ложный PIN не должен совпадать с вашим основным PIN-кодом!', 'error');
      return;
    }
    try {
      await setDecoyPin(cleanUser, decoyPinInput.trim(), decoyAction);
      setDecoyConfigured(true);
      setDecoyPinInput('');
      onToast?.('🕵️ Ложный PIN (Двойное дно) активирован!', 'success');
    } catch (err: any) {
      onToast?.(err.message || 'Ошибка сохранения ложного PIN', 'error');
    }
  };

  const handleDisableDecoyPin = () => {
    clearDecoyPin(cleanUser);
    setDecoyConfigured(false);
    setDecoyPinInput('');
    onToast?.('Ложный PIN отключен', 'info');
  };

  const handleSaveDms = async () => {
    if (!isPremium && dmsDays > 0) {
      onOpenPremiumPaywall();
      return;
    }
    setIsSavingDms(true);
    try {
      const updated = await updateDeadMansSwitch({
        inactivity_days: dmsDays,
        action: dmsAction,
        farewell_note: dmsNote,
      });
      setDmsExpiresAt(updated.expires_at);
      onToast?.(
        dmsDays > 0
          ? `⏱️ Автосброс при неактивности установлен на ${dmsDays} дн.`
          : 'Автосброс при неактивности отключен',
        'success'
      );
    } catch (err: any) {
      onToast?.(err.message || 'Не удалось сохранить настройки автосброса', 'error');
    } finally {
      setIsSavingDms(false);
    }
  };

  const buildInviteUrl = (token: string): string => {
    const origin =
      typeof window !== 'undefined' &&
      window.location.origin &&
      !window.location.origin.startsWith('capacitor://') &&
      !window.location.origin.includes('localhost')
        ? window.location.origin
        : 'https://skuf-net.ru';
    return `${origin}/?burner=${encodeURIComponent(token)}`;
  };

  const handleCreateBurner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPremium) {
      onOpenPremiumPaywall();
      return;
    }
    setIsCreatingBurner(true);
    try {
      const created = await createBurnerLink({
        title: burnerTitle.trim() || 'Секретный контакт',
        ttl_minutes: burnerTtl,
        single_use: burnerSingleUse,
        max_participants: 2,
      });
      setBurnerLinks((prev) => [created, ...prev]);
      const url = buildInviteUrl(created.token);
      await navigator.clipboard.writeText(url).catch(() => {});
      setCopiedToken(created.token);
      setTimeout(() => setCopiedToken(null), 3000);
      onToast?.('🔥 Одноразовая Burner-ссылка создана и скопирована!', 'success');
    } catch (err: any) {
      onToast?.(err.message || 'Не удалось создать Burner-ссылку', 'error');
    } finally {
      setIsCreatingBurner(false);
    }
  };

  const handleBurnNow = async (item: BurnerLinkItem) => {
    try {
      await burnRoomImmediately(item.token);
      setBurnerLinks((prev) => prev.filter((b) => b.token !== item.token));
      onToast?.('🔥 Комната и ключи безвозвратно уничтожены', 'info');
    } catch (err: any) {
      onToast?.(err.message || 'Ошибка уничтожения комнаты', 'error');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-purple-500/30 bg-[#0d0b14]/95 text-white shadow-2xl p-5 sm:p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500/30 to-amber-500/20 border border-purple-400/40 flex items-center justify-center shadow-lg">
                <ShieldAlert className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                    Спец-арсенал Gossip
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Crown className="w-3 h-3" /> PRO
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Анти-форензика, двойное дно, модуляция голоса и одноразовые E2EE-комнаты
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!isPremium && (
            <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-indigo-500/15 border border-amber-500/30 flex items-center justify-between gap-3">
              <div className="text-xs text-amber-100">
                <span className="font-bold text-amber-300">Эксклюзивно в Gossip Premium:</span> активируйте подписку, чтобы разблокировать все спец-инструменты.
              </div>
              <button
                type="button"
                onClick={onOpenPremiumPaywall}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Подключить
              </button>
            </div>
          )}

          {/* Navigation Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-4">
            <button
              type="button"
              onClick={() => setActiveSection('decoy')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeSection === 'decoy'
                  ? 'bg-purple-600/25 border-purple-400/50 text-purple-200 shadow-lg'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-4 h-4 text-purple-400" />
              <span>Ложный PIN</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('voice')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeSection === 'voice'
                  ? 'bg-emerald-600/25 border-emerald-400/50 text-emerald-200 shadow-lg'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              <AudioWaveform className="w-4 h-4 text-emerald-400" />
              <span>Голос (DSP)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('dms')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeSection === 'dms'
                  ? 'bg-amber-600/25 border-amber-400/50 text-amber-200 shadow-lg'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Timer className="w-4 h-4 text-amber-400" />
              <span>Автосброс</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('burner')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeSection === 'burner'
                  ? 'bg-rose-600/25 border-rose-400/50 text-rose-200 shadow-lg'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-4 h-4 text-rose-400" />
              <span>Burner-ссылки</span>
            </button>
          </div>

          {/* 1. DECOY PIN (Двойное дно) */}
          {activeSection === 'decoy' && (
            <div className="space-y-4 bg-white/[0.02] border border-white/10 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <span>🕵️ Ложный PIN-код («Двойное дно»)</span>
                    {decoyConfigured && (
                      <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Активен
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Если вас принуждают разблокировать мессенджер, введите ложный PIN-код на экране входа. Вместо реальных чатов откроется безобидная витрина заметок (или выполнится экстренная зачистка локальных ключей).
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveDecoyPin} className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Режим срабатывания при вводе ложного PIN:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDecoyAction('decoy_chats')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        decoyAction === 'decoy_chats'
                          ? 'bg-purple-500/20 border-purple-400/50 text-slate-100'
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      <div className="text-xs font-bold">🎭 Чаты-приманки (Скрытие)</div>
                      <div className="text-[11px] opacity-80 mt-0.5">
                        Реальная база остается зашифрованной. Показываются бытовые заметки и покупки.
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecoyAction('wipe_local')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        decoyAction === 'wipe_local'
                          ? 'bg-rose-500/20 border-rose-400/50 text-rose-100'
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      <div className="text-xs font-bold">💥 Выжженная земля (Wipe)</div>
                      <div className="text-[11px] opacity-80 mt-0.5">
                        Мгновенно уничтожить файл локальной БД OPFS/IndexedDB и открыть чистый профиль.
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    {decoyConfigured ? 'Задать новый ложный PIN-код:' : 'Придумайте ложный PIN-код (4–8 цифр):'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={8}
                      placeholder="Например: 9999"
                      value={decoyPinInput}
                      onChange={(e) => setDecoyPinInput(e.target.value.replace(/\D/g, ''))}
                      className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Сохранить</span>
                    </button>
                  </div>
                </div>

                {decoyConfigured && (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleDisableDecoyPin}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Отключить ложный PIN
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* 2. VOICE CHANGER (Модулятор голоса) */}
          {activeSection === 'voice' && (
            <div className="space-y-3 bg-white/[0.02] border border-white/10 rounded-2xl p-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  🎙️ Аппаратный DSP-модулятор голоса (Web Audio API)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Обработка голоса происходит локально на вашем устройстве до шифрования AES-GCM-256. На сервере и у получателя не остается исходной дорожки.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-1">
                {VOICE_CHANGER_PRESETS.map((preset) => {
                  const isSelected = voicePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        if (preset.isPremiumOnly && !isPremium) {
                          onOpenPremiumPaywall();
                          return;
                        }
                        onSelectVoicePreset(preset.id);
                        onToast?.(`Выбран тембр голоса: ${preset.label}`, 'info');
                      }}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-white'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{preset.icon}</span>
                        <div>
                          <div className="text-xs font-bold flex items-center gap-2">
                            <span>{preset.label}</span>
                            {preset.isPremiumOnly && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                PRO
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {preset.description}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-emerald-400 bg-emerald-500 text-slate-950'
                            : 'border-white/20'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. DEAD MAN'S SWITCH (Автосброс при неактивности) */}
          {activeSection === 'dms' && (
            <div className="space-y-4 bg-white/[0.02] border border-white/10 rounded-2xl p-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>⏱️ Система «Периметр» (Автосброс при неактивности)</span>
                  {dmsDays > 0 && (
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {dmsDays} дн.
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Если вы не открываете Gossip дольше выбранного срока, сервер автоматически уничтожит ваш облачный сейф ключей, пре-ключи X3DH/Kyber и связки чатов.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Таймер неактивности:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { days: 0, label: 'Выкл' },
                    { days: 7, label: '7 дней' },
                    { days: 14, label: '14 дней' },
                    { days: 30, label: '30 дней' },
                    { days: 90, label: '90 дней' },
                    { days: 180, label: '180 дней' },
                  ].map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setDmsDays(opt.days)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        dmsDays === opt.days
                          ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Протокол уничтожения:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDmsAction('wipe_all')}
                    className={`p-3 rounded-xl border text-left cursor-pointer ${
                      dmsAction === 'wipe_all'
                        ? 'bg-amber-500/20 border-amber-400/50 text-white'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">Полная зачистка профиля</div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      Удаление облачного сейфа ключей, X3DH прекеев, всех чатов и обнуление аватара.
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDmsAction('wipe_messages')}
                    className={`p-3 rounded-xl border text-left cursor-pointer ${
                      dmsAction === 'wipe_messages'
                        ? 'bg-amber-500/20 border-amber-400/50 text-white'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">Сброс переписки и ключей</div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      Уничтожение связей чатов и крипто-сейфа при сохранении учетной записи.
                    </div>
                  </button>
                </div>
              </div>

              {dmsExpiresAt && dmsDays > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200">
                  Расчетная дата срабатывания без входа в сеть:{' '}
                  <span className="font-mono font-bold">
                    {new Date(dmsExpiresAt).toLocaleString('ru-RU')}
                  </span>
                </div>
              )}

              <button
                type="button"
                disabled={isSavingDms}
                onClick={handleSaveDms}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSavingDms ? <Loader2 className="w-4 h-4 animate-spin" /> : <Timer className="w-4 h-4" />}
                <span>Сохранить настройки «Периметра»</span>
              </button>
            </div>
          )}

          {/* 4. BURNER LINKS (Одноразовые ссылки) */}
          {activeSection === 'burner' && (
            <div className="space-y-4 bg-white/[0.02] border border-white/10 rounded-2xl p-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  🔥 Одноразовые Burner-ссылки (Самоуничтожающиеся комнаты)
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Создайте ссылку для приватного разговора. Собеседник сможет войти даже из обычного браузера без регистрации. После завершения беседы нажмите «Сжечь», и комната исчезнет навсегда.
                </p>
              </div>

              <form onSubmit={handleCreateBurner} className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Кодовое название комнаты:
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      value={burnerTitle}
                      onChange={(e) => setBurnerTitle(e.target.value)}
                      placeholder="Например: Переговоры #1"
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Время жизни (авто-уничтожение):
                    </label>
                    <select
                      value={burnerTtl}
                      onChange={(e) => setBurnerTtl(Number(e.target.value))}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
                    >
                      <option value={15}>15 минут</option>
                      <option value={60}>1 час</option>
                      <option value={360}>6 часов</option>
                      <option value={1440}>24 часа</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={burnerSingleUse}
                    onChange={(e) => setBurnerSingleUse(e.target.checked)}
                    className="rounded border-white/20 text-rose-500 focus:ring-rose-500"
                  />
                  <span>Строго одноразовый вход (ссылка блокируется сразу после подключения гостя)</span>
                </label>

                <button
                  type="submit"
                  disabled={isCreatingBurner}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isCreatingBurner ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>Создать одноразовую Burner-ссылку</span>
                </button>
              </form>

              {/* Active Burner Rooms List */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Активные Burner-комнаты ({burnerLinks.length})</span>
                  {isLoadingServer && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                </div>

                {burnerLinks.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-500">
                    Нет активных одноразовых комнат
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {burnerLinks.map((b) => {
                      const inviteUrl = buildInviteUrl(b.token);
                      const isCopied = copiedToken === b.token;
                      return (
                        <div
                          key={b.token}
                          className="p-3 rounded-xl bg-black/40 border border-rose-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
                              <span>🔥 {b.title}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-300 font-mono">
                                {b.participants_count}/{b.max_participants} уч.
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                              {inviteUrl}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(inviteUrl).catch(() => {});
                                setCopiedToken(b.token);
                                setTimeout(() => setCopiedToken(null), 2000);
                                onToast?.('Ссылка скопирована в буфер обмена', 'success');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-200 flex items-center gap-1 cursor-pointer"
                              title="Скопировать ссылку"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{isCopied ? 'Скопировано' : 'Ссылка'}</span>
                            </button>

                            {onOpenBurnerChat && (
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenBurnerChat(b);
                                  onClose();
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/30 text-xs text-purple-200 flex items-center gap-1 cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Войти</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleBurnNow(b)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-1 cursor-pointer"
                              title="Мгновенно уничтожить комнату"
                            >
                              <Flame className="w-3.5 h-3.5 text-rose-400" />
                              <span>Сжечь</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
