// frontend/src/components/GliderQuest.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  X,
  Volume2,
  VolumeX,
  BookOpen,
  Terminal,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  ShieldCheck,
  Globe2,
  AlertTriangle,
  Lock,
  ArrowRight,
  KeyRound,
  Pause,
  Play,
  RotateCcw,
  ArrowDown
} from 'lucide-react';
import { GliderIcon } from '../ui/GliderIcon';
import { GlassButton, GlassCard, GlassInput } from '../ui';
import { AudioSynth } from './quest/AudioSynth';
import { storageManager } from '../core/storage/storage-manager';
import './quest/quest.css';

// Статические импорты фотохроник 6 эпох
import gutenbergImg from '../assets/chronicles/gutenberg.jpg';
import zengerImg from '../assets/chronicles/zenger.jpg';
import samizdatImg from '../assets/chronicles/samizdat.jpg';
import cryptoWarsImg from '../assets/chronicles/crypto_wars.jpg';
import digitalMeshImg from '../assets/chronicles/digital_mesh.jpg';
import futureImg from '../assets/chronicles/future_knowledge.jpg';

interface GliderQuestProps {
  onClose: () => void;
  theme?: 'dark' | 'light' | 'coffee';
}

interface EpochData {
  id: string;
  year: string;
  short: string;
  location: string;
  title: string;
  subtitle: string;
  image: string;
  threat: string;
  courage: string;
  legacy: string;
  quote: string;
  author: string;
  tags: string[];
}

const EPOCH_IMAGES: Record<string, string> = {
  gutenberg: gutenbergImg,
  zenger: zengerImg,
  samizdat: samizdatImg,
  crypto_wars: cryptoWarsImg,
  digital_mesh: digitalMeshImg,
  future: futureImg
};

const EPOCH_IDS = ['gutenberg', 'zenger', 'samizdat', 'crypto_wars', 'digital_mesh', 'future'];

export const GliderQuest: React.FC<GliderQuestProps> = ({
  onClose,
  theme = 'dark'
}) => {
  const { t, i18n } = useTranslation(['quest', 'common', 'landing']);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [currentEpochIdx, setCurrentEpochIdx] = useState<number>(0);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  // Предзагрузка всех 6 фотохроник при открытии квеста
  useEffect(() => {
    EPOCH_IDS.forEach(id => {
      const img = new Image();
      img.src = EPOCH_IMAGES[id];
      img.onload = () => {
        setLoadedImages(prev => ({ ...prev, [id]: true }));
      };
    });
  }, []);

  // Динамические эпохи на основе текущего языка
  const epochs: EpochData[] = useMemo(() => {
    return EPOCH_IDS.map(id => {
      const rawTags = (t as any)(`quest:epochs.${id}.tags`, { returnObjects: true, defaultValue: [] });
      const tags = Array.isArray(rawTags) ? (rawTags as string[]) : [];
      return {
        id,
        year: t(`quest:epochs.${id}.year`, { defaultValue: '' }),
        short: t(`quest:epochs.${id}.short`, { defaultValue: id }),
        location: t(`quest:epochs.${id}.location`, { defaultValue: '' }),
        title: t(`quest:epochs.${id}.title`, { defaultValue: '' }),
        subtitle: t(`quest:epochs.${id}.subtitle`, { defaultValue: '' }),
        image: EPOCH_IMAGES[id] || futureImg,
        threat: t(`quest:epochs.${id}.threat`, { defaultValue: '' }),
        courage: t(`quest:epochs.${id}.courage`, { defaultValue: '' }),
        legacy: t(`quest:epochs.${id}.legacy`, { defaultValue: '' }),
        quote: t(`quest:epochs.${id}.quote`, { defaultValue: '' }),
        author: t(`quest:epochs.${id}.author`, { defaultValue: '' }),
        tags
      };
    });
  }, [t, i18n.language]);

  // Строки манифеста
  const manifestLines: string[] = useMemo(() => {
    const raw = (t as any)('quest:manifestView.lines', { returnObjects: true, defaultValue: [] });
    return Array.isArray(raw) && raw.length > 0 ? (raw as string[]) : [];
  }, [t, i18n.language]);

  // Стейты телетайпа
  const [typedLogs, setTypedLogs] = useState<string[]>([]);
  const [currentLineIdx, setCurrentLineIdx] = useState<number>(0);
  const [isTypingActive, setIsTypingActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [typingSpeed, setTypingSpeed] = useState<'normal' | 'fast' | 'ultra' | 'instant'>('normal');
  const [isUserScrolledUp, setIsUserScrolledUp] = useState<boolean>(false);
  const [copiedManifest, setCopiedManifest] = useState<boolean>(false);

  // Сброс логов телетайпа при смене языка
  useEffect(() => {
    setTypedLogs([]);
    setCurrentLineIdx(0);
  }, [i18n.language]);

  // Стейты генератора Глайдер-ключа
  const [nickName, setNickName] = useState<string>('');
  const [generatedKey, setGeneratedKey] = useState<boolean[][] | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isJoined, setIsJoined] = useState<boolean>(false);

  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const audioSynthRef = useRef<AudioSynth | null>(null);
  const lifeIntervalRef = useRef<any>(null);

  const colors = useMemo(() => {
    if (theme === 'coffee') {
      return {
        text: '#FFB000',
        glow: 'rgba(255, 176, 0, 0.25)',
        border: 'rgba(255, 176, 0, 0.2)',
        bgCard: 'bg-stone-950/95',
        badge: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
        accentBtn: 'border-amber-500/30 text-amber-300 bg-amber-600/10 hover:bg-amber-600/25'
      };
    }
    if (theme === 'light') {
      return {
        text: '#4F46E5',
        glow: 'rgba(79, 70, 229, 0.25)',
        border: 'rgba(79, 70, 229, 0.15)',
        bgCard: 'bg-white/95',
        badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        accentBtn: 'border-indigo-300 text-indigo-700 bg-indigo-100 hover:bg-indigo-200'
      };
    }
    return {
      text: '#10E7B2',
      glow: 'rgba(16, 231, 178, 0.25)',
      border: 'rgba(16, 231, 178, 0.2)',
      bgCard: 'bg-[#08090E]/95',
      badge: 'bg-[#10E7B2]/10 text-[#10E7B2] border-[#10E7B2]/25',
      accentBtn: 'border-[#10E7B2]/30 text-[#10E7B2] bg-[#10E7B2]/10 hover:bg-[#10E7B2]/20'
    };
  }, [theme]);

  const initAudio = () => {
    if (!audioSynthRef.current) {
      audioSynthRef.current = new AudioSynth();
    }
  };

  const playClick = () => {
    if (!isSoundEnabled) return;
    initAudio();
    audioSynthRef.current?.playClickSound();
  };

  const playType = () => {
    if (!isSoundEnabled) return;
    initAudio();
    audioSynthRef.current?.playTypeSound();
  };

  const playPower = () => {
    if (!isSoundEnabled) return;
    initAudio();
    audioSynthRef.current?.playPowerOnSound();
  };

  useEffect(() => {
    return () => {
      if (lifeIntervalRef.current) clearInterval(lifeIntervalRef.current);
      if (audioSynthRef.current) audioSynthRef.current.destroy();
    };
  }, []);

  // Телетайп
  useEffect(() => {
    if (activeTab !== 1 || isPaused || manifestLines.length === 0) return;

    if (typingSpeed === 'instant') {
      setTypedLogs(manifestLines);
      setCurrentLineIdx(manifestLines.length);
      setIsTypingActive(false);
      return;
    }

    let timer: any;
    if (currentLineIdx < manifestLines.length) {
      setIsTypingActive(true);
      const delay = typingSpeed === 'ultra' ? 35 : typingSpeed === 'fast' ? 75 : 170;
      timer = setTimeout(() => {
        setTypedLogs(prev => [...prev, manifestLines[currentLineIdx]]);
        setCurrentLineIdx(prev => prev + 1);
        playType();
      }, delay);
    } else {
      setIsTypingActive(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [activeTab, currentLineIdx, typingSpeed, isPaused, manifestLines]);

  const handleTerminalScroll = () => {
    if (!terminalContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 45;
    setIsUserScrolledUp(!isAtBottom);
  };

  useEffect(() => {
    if (activeTab === 1 && !isUserScrolledUp && terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [typedLogs, activeTab, isUserScrolledUp]);

  const scrollToTerminalBottom = () => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTo({
        top: terminalContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
      setIsUserScrolledUp(false);
    }
  };

  const handleCopyFullManifest = () => {
    playClick();
    navigator.clipboard.writeText(manifestLines.join('\n'));
    setCopiedManifest(true);
    setTimeout(() => setCopiedManifest(false), 2000);
  };

  const handleNextEpoch = () => {
    playClick();
    setCurrentEpochIdx((prev) => (prev + 1) % epochs.length);
  };

  const handlePrevEpoch = () => {
    playClick();
    setCurrentEpochIdx((prev) => (prev - 1 + epochs.length) % epochs.length);
  };

  const generateSymmetricMatrix = (name: string): boolean[][] => {
    let hash = 0;
    let salt = '';
    let activeCount = 0;
    let grid: boolean[][] = [];

    while (true) {
      const currentName = name + salt;
      hash = 0;
      for (let i = 0; i < currentName.length; i++) {
        hash = currentName.charCodeAt(i) + ((hash << 5) - hash);
      }

      grid = [];
      activeCount = 0;
      for (let r = 0; r < 5; r++) {
        grid[r] = [];
        for (let c = 0; c < 3; c++) {
          const bitIndex = r * 3 + c;
          const isON = ((hash >> bitIndex) & 1) === 1;
          grid[r][c] = isON;
        }
        grid[r][3] = grid[r][1];
        grid[r][4] = grid[r][0];

        for (let c = 0; c < 5; c++) {
          if (grid[r][c]) activeCount++;
        }
      }

      if (activeCount >= 8 && activeCount <= 16) break;
      salt += '_gossip_liberty';
    }

    return grid;
  };

  const handleGenerateKey = () => {
    if (!nickName.trim()) return;
    setIsGenerating(true);
    setCopied(false);
    setGeneratedKey(null);
    playClick();

    if (lifeIntervalRef.current) {
      clearInterval(lifeIntervalRef.current);
      lifeIntervalRef.current = null;
    }

    setTimeout(() => {
      const matrix = generateSymmetricMatrix(nickName);
      setGeneratedKey(matrix);
      setIsGenerating(false);
      playPower();
      startLifeSimulation(matrix);
    }, 1200);
  };

  const startLifeSimulation = (startMatrix: boolean[][]) => {
    lifeIntervalRef.current = setInterval(() => {
      setGeneratedKey(prev => {
        if (!prev) return null;
        const nextGrid: boolean[][] = [];
        for (let r = 0; r < 5; r++) {
          nextGrid[r] = [];
          for (let c = 0; c < 5; c++) {
            let neighbors = 0;
            for (let i = -1; i <= 1; i++) {
              for (let j = -1; j <= 1; j++) {
                if (i === 0 && j === 0) continue;
                const nr = (r + i + 5) % 5;
                const nc = (c + j + 5) % 5;
                if (prev[nr][nc]) neighbors++;
              }
            }
            if (prev[r][c]) {
              nextGrid[r][c] = neighbors === 2 || neighbors === 3;
            } else {
              nextGrid[r][c] = neighbors === 3;
            }
          }
        }

        const isDead = nextGrid.every(row => row.every(cell => !cell));
        const isStable = prev.every((row, r) => row.every((cell, c) => cell === nextGrid[r][c]));
        if (isDead || isStable) return startMatrix;
        return nextGrid;
      });
    }, 500);
  };

  const getGliderTextArt = () => {
    if (!generatedKey) return '';
    return generatedKey.map(row =>
      row.map(cell => cell ? '██' : '  ').join('')
    ).join('\n');
  };

  const copyToClipboard = () => {
    const art = getGliderTextArt();
    const manifest = `[GOSSIP PROTOCOL // FREEDOM OF INFORMATION]\n${t('quest:gliderView.nodeLabel', 'NODE:')} ${nickName.toUpperCase()}\n\n${art}\n\n[${t('quest:gliderView.statusFull', 'STATUS: FULL DIGITAL SOVEREIGNTY')}]`;
    navigator.clipboard.writeText(manifest);
    setCopied(true);
    playType();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinGossip = async () => {
    if (!generatedKey || isJoined) return;
    setIsJoined(true);
    playPower();

    const art = getGliderTextArt();
    const myId = localStorage.getItem("my_id") || "gossip_free_node";

    localStorage.setItem("profile_avatar_url", art);
    localStorage.setItem("username", nickName);

    try {
      await storageManager.execute(`
        INSERT OR REPLACE INTO users (id, name, avatar, online)
        VALUES (?, ?, ?, 1);
      `, [myId, nickName, art]);

      const existingSystemChat = await storageManager.query<any>(`
        SELECT id FROM chats WHERE id = 'system_chat' OR name = 'System' OR name = 'Система' LIMIT 1;
      `);

      let systemChatId = 'system_chat';
      if (existingSystemChat && existingSystemChat.length > 0) {
        systemChatId = existingSystemChat[0].id;
      } else {
        await storageManager.execute(`
          INSERT INTO chats (id, name, avatar, lastMessage, time, unread, isGroup, online, pts)
          VALUES ('system_chat', 'System', '🕊️', 'Freedom node activated: ' || ?, ?, 0, 0, 1, 0);
        `, [nickName, new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })]);
      }

      const msgId = `msg-liberty-${Date.now()}`;
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await storageManager.execute(`
        INSERT INTO messages (id, chatId, sender, senderName, text, time, pts, timestamp, type)
        VALUES (?, ?, 'system', 'System', ?, ?, 0, ?, 'text');
      `, [msgId, systemChatId, `Information sovereignty node registered: ${nickName}`, timeStr, Date.now()]);
    } catch (err) {
      console.error("Error saving profile to SQLite:", err);
    }
  };

  const currentEpoch = epochs[currentEpochIdx] || epochs[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center backdrop-blur-md p-0 sm:p-3 md:p-4 selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* Линии развертки ЭЛТ-монитора */}
      <div 
        className="absolute inset-0 pointer-events-none z-10 opacity-[0.05]"
        style={{
          background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.45) 50%)',
          backgroundSize: '100% 4px'
        }}
      />

      <GlassCard 
        glow 
        glowColor={colors.glow}
        className={`w-full max-w-4xl h-[100dvh] sm:h-[90vh] sm:max-h-[800px] ${colors.bgCard} border-white/10 flex flex-col justify-between overflow-hidden relative shadow-2xl rounded-none sm:rounded-2xl`}
      >
        {/* Шапка модуля */}
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5 sm:px-4 sm:py-3 bg-black/60 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="p-1 rounded-md bg-white/5 border border-white/10 relative flex-shrink-0">
              <GliderIcon className="w-5 h-5" theme={theme} pulsing={false} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[11px] sm:text-xs font-mono font-bold tracking-wider text-slate-200 truncate">
                  {t('quest:header.title', 'GOSSIP_CHRONICLES // FREEDOM CHRONICLES')}
                </span>
                <span className={`px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-mono font-bold uppercase rounded-full border flex-shrink-0 ${colors.badge}`}>
                  {t('quest:header.years', '1450 — 2026+')}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block truncate">
                {t('quest:header.subtitle', 'Why freedom of thought and open dialogue shape the future of humanity')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ml-2">
            <button
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title={isSoundEnabled ? t('quest:header.soundOff', 'Mute sound') : t('quest:header.soundOn', 'Unmute sound')}
            >
              {isSoundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Навигация по 3 чистым табам */}
        <div className="flex items-center border-b border-white/10 px-2 sm:px-4 py-2 bg-black/40 gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            onClick={() => { playClick(); setActiveTab(0); }}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === 0
                ? 'bg-white/15 text-white shadow-sm border border-white/20 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{t('quest:tabs.epochs', '1. Chronicle of Epochs')}</span>
          </button>

          <button
            onClick={() => { playClick(); setActiveTab(1); }}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === 1
                ? 'bg-white/15 text-white shadow-sm border border-white/20 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Terminal className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{t('quest:tabs.manifest', '2. Teletype Manifesto')}</span>
          </button>

          <button
            onClick={() => { playClick(); setActiveTab(2); }}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === 2
                ? 'bg-white/15 text-white shadow-sm border border-white/20 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span>{t('quest:tabs.gliderKey', '3. Glider Key')}</span>
          </button>
        </div>

        {/* Контент активного таба */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 md:p-5 relative flex flex-col">
          
          {/* ================= ТАБ 0: ФОТОХРОНИКА ЭПОХ ================= */}
          {activeTab === 0 && currentEpoch && (
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 sm:gap-1.5 bg-black/40 p-1.5 rounded-xl border border-white/5">
                {epochs.map((ep, idx) => (
                  <button
                    key={ep.id}
                    onClick={() => { playClick(); setCurrentEpochIdx(idx); }}
                    className={`flex flex-col items-center p-1 sm:p-1.5 rounded-lg text-center transition-all ${
                      currentEpochIdx === idx
                        ? 'bg-white/15 border border-white/20 shadow-md text-white font-bold'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-[11px] sm:text-xs font-mono font-bold">{ep.year}</span>
                    <span className="text-[8px] sm:text-[9px] truncate max-w-full opacity-80">{ep.short}</span>
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentEpoch.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-5 items-start"
                >
                  <div className="md:col-span-5 space-y-2.5 sm:space-y-3">
                    <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/60 shadow-xl group w-full min-h-[190px] h-48 sm:h-56 md:h-64 aspect-[16/9] md:aspect-[4/3] flex items-center justify-center">
                      {/* Скелетон-лоадер до декодирования */}
                      {!loadedImages[currentEpoch.id] && (
                        <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse flex items-center justify-center">
                          <div className="flex flex-col items-center gap-2 text-slate-500">
                            <Sparkles className="w-6 h-6 animate-spin text-amber-400/60" />
                            <span className="text-[10px] font-mono">{t('quest:epochsView.loading', 'Loading chronicle...')}</span>
                          </div>
                        </div>
                      )}
                      
                      <img 
                        src={currentEpoch.image} 
                        alt={currentEpoch.title}
                        loading="eager"
                        decoding="async"
                        // @ts-ignore
                        fetchpriority="high"
                        onLoad={() => setLoadedImages(prev => ({ ...prev, [currentEpoch.id]: true }))}
                        className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 filter brightness-95 contrast-105 ${
                          loadedImages[currentEpoch.id] ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />
                      
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/10 text-[9px] sm:text-[10px] font-mono text-amber-300">
                        {t('quest:epochsView.reporterChronicle', 'REPORTER CHRONICLE // {{year}}', { year: currentEpoch.year })}
                      </div>

                      <div className="absolute bottom-2 left-2 right-2 text-[9px] sm:text-[10px] font-mono text-slate-300 backdrop-blur-sm bg-black/40 p-1 sm:p-1.5 rounded border border-white/5 truncate">
                        📍 {currentEpoch.location}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 sm:gap-1.5">
                      {currentEpoch.tags.map((tTag, i) => (
                        <span key={i} className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                          #{tTag}
                        </span>
                      ))}
                    </div>

                    <div className="p-2.5 sm:p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] sm:text-xs text-amber-200/90 italic space-y-1">
                      <p>{currentEpoch.quote}</p>
                      <p className="text-[9px] sm:text-[10px] font-mono font-normal text-amber-400 text-right">— {currentEpoch.author}</p>
                    </div>
                  </div>

                  <div className="md:col-span-7 space-y-3 sm:space-y-4">
                    <div>
                      <div className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                        {t('quest:epochsView.epochCount', 'Epoch {{current}} of {{total}}', { current: currentEpochIdx + 1, total: epochs.length })}
                      </div>
                      <h3 className="text-sm sm:text-base md:text-lg font-bold text-white leading-tight mt-0.5">
                        {currentEpoch.title}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                        {currentEpoch.subtitle}
                      </p>
                    </div>

                    <div className="space-y-2 sm:space-y-2.5 text-xs">
                      <div className="p-2.5 sm:p-3 rounded-xl bg-red-500/10 border border-red-500/20 space-y-0.5 sm:space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-red-300 text-[10px] sm:text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                          {t('quest:epochsView.threatLabel', 'What they sought to ban and destroy:')}
                        </div>
                        <p className="text-slate-300 leading-relaxed text-[10px] sm:text-xs">
                          {currentEpoch.threat}
                        </p>
                      </div>

                      <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-0.5 sm:space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-300 text-[10px] sm:text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          {t('quest:epochsView.courageLabel', 'How people defended the right to know:')}
                        </div>
                        <p className="text-slate-300 leading-relaxed text-[10px] sm:text-xs">
                          {currentEpoch.courage}
                        </p>
                      </div>

                      <div className="p-2.5 sm:p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 space-y-0.5 sm:space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-sky-300 text-[10px] sm:text-[11px]">
                          <Globe2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                          {t('quest:epochsView.legacyLabel', 'Where freedom of speech led humanity:')}
                        </div>
                        <p className="text-slate-300 leading-relaxed text-[10px] sm:text-xs">
                          {currentEpoch.legacy}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <GlassButton
                        variant="secondary"
                        size="sm"
                        onClick={handlePrevEpoch}
                        className="flex items-center gap-1 text-[11px] sm:text-xs"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> {t('common:actions.back', 'Back')}
                      </GlassButton>

                      <div className="text-[10px] sm:text-[11px] font-mono text-slate-400">
                        {currentEpochIdx + 1} / {epochs.length}
                      </div>

                      {currentEpochIdx < epochs.length - 1 ? (
                        <GlassButton
                          variant="primary"
                          size="sm"
                          onClick={handleNextEpoch}
                          className="flex items-center gap-1 text-[11px] sm:text-xs font-bold"
                        >
                          {t('quest:epochsView.nextEpoch', 'Next epoch')} <ChevronRight className="w-3.5 h-3.5" />
                        </GlassButton>
                      ) : (
                        <GlassButton
                          variant="primary"
                          size="sm"
                          onClick={() => { playClick(); setActiveTab(1); }}
                          className={`flex items-center gap-1 text-[11px] sm:text-xs font-bold ${colors.accentBtn}`}
                        >
                          {t('quest:epochsView.readManifest', 'Read Manifesto')} <ArrowRight className="w-3.5 h-3.5" />
                        </GlassButton>
                      )}
                    </div>

                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* ================= ТАБ 1: ТЕЛЕТАЙП-МАНИФЕСТ ================= */}
          {activeTab === 1 && (
            <div className="flex-1 min-h-0 flex flex-col space-y-2 sm:space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 bg-black/50 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-white/10 text-xs font-mono flex-shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'}`} />
                  <span className="text-slate-200 text-[10px] sm:text-[11px] font-bold">
                    {isPaused ? t('quest:manifestView.paused', 'TELETYPE: PAUSED') : t('quest:manifestView.active', 'TELETYPE OF FREE THOUGHT')}
                  </span>
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                  <button
                    onClick={() => {
                      playClick();
                      setIsPaused(!isPaused);
                    }}
                    className={`flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-bold transition-all border ${
                      isPaused 
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
                    {isPaused ? t('quest:manifestView.resume', 'Resume') : t('quest:manifestView.pause', 'Pause')}
                  </button>

                  <span className="text-slate-500 text-[9px] sm:text-[10px] hidden xs:inline ml-0.5">{t('quest:manifestView.speed', 'Speed:')}</span>
                  <button
                    onClick={() => { playClick(); setTypingSpeed('normal'); setIsPaused(false); }}
                    className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold transition-all ${typingSpeed === 'normal' ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    1x
                  </button>
                  <button
                    onClick={() => { playClick(); setTypingSpeed('fast'); setIsPaused(false); }}
                    className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold transition-all ${typingSpeed === 'fast' ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    2x
                  </button>
                  <button
                    onClick={() => { playClick(); setTypingSpeed('ultra'); setIsPaused(false); }}
                    className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold transition-all ${typingSpeed === 'ultra' ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    5x
                  </button>
                  <button
                    onClick={() => { playClick(); setTypingSpeed('instant'); setIsPaused(false); }}
                    className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold transition-all ${typingSpeed === 'instant' ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    {t('quest:manifestView.all', 'All')}
                  </button>

                  <button
                    onClick={handleCopyFullManifest}
                    className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 ml-0.5 sm:ml-1 transition-all"
                    title={t('quest:manifestView.copy', 'Copy')}
                  >
                    {copiedManifest ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span className="hidden xs:inline">{copiedManifest ? t('quest:manifestView.copied', 'Copied!') : t('quest:manifestView.copy', 'Copy')}</span>
                  </button>
                </div>
              </div>

              <div className="relative flex-1 min-h-[260px] sm:min-h-[320px] max-h-[50vh] sm:max-h-[480px]">
                <div 
                  ref={terminalContainerRef}
                  onScroll={handleTerminalScroll}
                  className="w-full h-full p-3 sm:p-5 rounded-xl border border-white/10 bg-black/70 font-mono text-[11px] sm:text-[13px] leading-relaxed overflow-y-auto terminal-scrollbar space-y-1 sm:space-y-1.5 shadow-inner"
                  style={{ 
                    color: colors.text,
                    textShadow: `0 0 2px ${colors.text}40`
                  }}
                >
                  {typedLogs.map((log, index) => {
                    const isHeader = log.startsWith('===') || log.startsWith('---') || log.startsWith('1.') || log.startsWith('2.') || log.startsWith('3.') || log.startsWith('4.') || log.startsWith('۱.') || log.startsWith('۲.') || log.startsWith('۳.') || log.startsWith('۴.');
                    const isAlert = log.includes('[!]');
                    const isSuccess = log.includes('[+]') || log.includes('[СТАТУС]') || log.includes('[АКСИОМА]') || log.includes('[ИТОГ]') || log.includes('[STATUS]') || log.includes('[AXIOM]') || log.includes('[CONCLUSION]') || log.includes('[ESTADO]') || log.includes('[AXIOMA]') || log.includes('[CONCLUSIÓN]') || log.includes('[状态]') || log.includes('[公理]') || log.includes('[总结]') || log.includes('[الحالة]') || log.includes('[بديهية]') || log.includes('[الخلاصة]') || log.includes('[وضعیت]') || log.includes('[اصل]') || log.includes('[نتیجه]') || log.includes('[STATUT]') || log.includes('[FAZIT]');
                    const isQuote = log.startsWith('«') || log.startsWith('“') || log.startsWith('”') || log.startsWith('„') || log.startsWith('«');

                    return (
                      <div 
                        key={index} 
                        className={`whitespace-pre-wrap ${
                          isHeader ? 'font-bold text-white mt-2 pb-0.5' :
                          isAlert ? 'text-red-300 font-semibold' :
                          isSuccess ? 'text-emerald-300 font-semibold' :
                          isQuote ? 'italic text-amber-200 py-1' : ''
                        }`}
                      >
                        {log}
                      </div>
                    );
                  })}

                  {isTypingActive && !isPaused && (
                    <span className="inline-block w-2.5 h-4 bg-emerald-400 animate-pulse align-middle ml-1" />
                  )}
                </div>

                <AnimatePresence>
                  {isUserScrolledUp && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      onClick={scrollToTerminalBottom}
                      className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-emerald-600/90 text-white font-mono text-[10px] sm:text-[11px] shadow-2xl backdrop-blur-md hover:bg-emerald-500 transition-all border border-emerald-400/40"
                    >
                      <ArrowDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-bounce" />
                      <span>{t('quest:manifestView.scrollToBottom', 'Down to latest lines')}</span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between pt-1 flex-shrink-0">
                <button
                  onClick={() => {
                    playClick();
                    setTypedLogs([]);
                    setCurrentLineIdx(0);
                    setIsPaused(false);
                    setTypingSpeed('normal');
                  }}
                  className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-400 hover:text-white underline font-mono"
                >
                  <RotateCcw className="w-3 h-3" /> {t('quest:manifestView.restart', 'Restart from beginning')}
                </button>

                <GlassButton
                  variant="primary"
                  size="sm"
                  onClick={() => { playClick(); setActiveTab(2); }}
                  className={`text-[11px] sm:text-xs font-bold ${colors.accentBtn}`}
                >
                  {t('quest:manifestView.createGliderKey', 'Create Glider Key')} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </GlassButton>
              </div>
            </div>
          )}

          {/* ================= ТАБ 2: ГЛАЙДЕР-КЛЮЧ СОЛИДАРНОСТИ ================= */}
          {activeTab === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-center h-full">
              <div className="md:col-span-5 space-y-3 sm:space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                      {t('quest:gliderView.title', 'Glider of Sovereignty')}
                    </h3>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">
                    {t('quest:gliderView.desc', 'Generate a unique mathematical Conway Glider based on your identity — a digital emblem of your right to private thought.')}
                  </p>
                </div>

                <div className="space-y-2.5 sm:space-y-3">
                  <GlassInput
                    placeholder={t('quest:gliderView.inputPlaceholder', 'Enter your node name or handle...')}
                    value={nickName}
                    onChange={(e) => setNickName(e.target.value)}
                    disabled={isGenerating}
                    label={t('quest:gliderView.inputLabel', 'Sovereign node moniker')}
                  />

                  <GlassButton
                    variant="primary"
                    fullWidth
                    onClick={handleGenerateKey}
                    disabled={isGenerating || !nickName.trim()}
                    className="py-2 sm:py-2.5 font-bold text-[11px] sm:text-xs"
                  >
                    {isGenerating ? t('quest:gliderView.generating', 'Computing automaton matrix...') : t('quest:gliderView.generateBtn', 'Generate Digital Emblem')}
                  </GlassButton>
                </div>

                <div className="p-2.5 sm:p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[10px] sm:text-[11px] text-purple-200 space-y-0.5 sm:space-y-1">
                  <div className="font-bold flex items-center gap-1 text-purple-300">
                    <Lock className="w-3 h-3" /> {t('quest:gliderView.principleTitle', 'Sovereign Principle:')}
                  </div>
                  <div>
                    {t('quest:gliderView.principleDesc', 'Your emblem and keys are calculated locally on your processor and stored in encrypted local SQLite on your device.')}
                  </div>
                </div>
              </div>

              <div className="md:col-span-7 flex flex-col items-center justify-center">
                {generatedKey ? (
                  <div className="space-y-3 sm:space-y-4 flex flex-col items-center w-full max-w-sm">
                    <div 
                      className="grid grid-cols-5 gap-1.5 sm:gap-2 p-3 sm:p-4 bg-black/60 border border-white/10 rounded-2xl shadow-2xl"
                      style={{ filter: `drop-shadow(0 0 10px ${colors.glow})` }}
                    >
                      {generatedKey.map((row, r) =>
                        row.map((active, c) => (
                          <div
                            key={`${r}-${c}`}
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-md transition-all duration-300 flex items-center justify-center"
                            style={{
                              backgroundColor: active ? colors.text : 'rgba(255,255,255,0.03)',
                              boxShadow: active ? `0 0 8px ${colors.text}` : 'none'
                            }}
                          >
                            {active && <span className="w-1.5 h-1.5 rounded-full bg-white/60" />}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="text-center">
                      <div className="text-[11px] sm:text-xs font-mono font-bold text-white">
                        {t('quest:gliderView.nodeLabel', 'NODE:')} {nickName.toUpperCase()}
                      </div>
                      <div className="text-[9px] sm:text-[10px] font-mono text-emerald-400">
                        {t('quest:gliderView.statusFull', 'STATUS: FULL DIGITAL SOVEREIGNTY')}
                      </div>
                    </div>

                    <div className="flex gap-2 w-full">
                      <GlassButton
                        variant="secondary"
                        size="sm"
                        fullWidth
                        onClick={copyToClipboard}
                        className="flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px]"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            {t('quest:gliderView.manifestCopied', 'Manifesto copied!')}
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            {t('quest:gliderView.copyManifest', 'Manifesto')}
                          </>
                        )}
                      </GlassButton>

                      <GlassButton
                        variant="primary"
                        size="sm"
                        fullWidth
                        onClick={handleJoinGossip}
                        disabled={isJoined}
                        className={`text-[10px] sm:text-[11px] font-bold uppercase ${colors.accentBtn}`}
                      >
                        {isJoined ? t('quest:gliderView.activated', 'Activated ✓') : t('quest:gliderView.toProfile', 'Save to Profile')}
                      </GlassButton>
                    </div>

                  </div>
                ) : (
                  <div className="h-44 sm:h-56 flex flex-col items-center justify-center text-[11px] sm:text-xs text-slate-500 font-mono border border-dashed border-white/10 rounded-2xl w-full p-4 sm:p-6 text-center space-y-2">
                    <GliderIcon className="w-8 h-8 opacity-40" theme={theme} pulsing={false} />
                    <div>{t('quest:gliderView.waitingInput', 'Awaiting node name to compute cellular automaton...')}</div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Футер модуля */}
        <div className="border-t border-white/10 px-3 py-1.5 sm:px-4 sm:py-2 bg-black/40 flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-slate-500 flex-shrink-0">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {t('quest:footer.article', 'FREEDOM_OF_INFORMATION // ARTICLE_12_UN')}
          </span>
          <span className="hidden xs:inline">{t('quest:footer.copyright', '© 2026 GOSSIP NETWORK INFRASTRUCTURE')}</span>
        </div>

      </GlassCard>
    </div>
  );
};
