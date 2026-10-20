import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Globe,
  Zap,
  Server,
  ShieldCheck,
  Radio,
  RadioTower,
  Coins,
  Handshake,
  ArrowRight,
  Database,
  Terminal,
  Sparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../../ui';
import { LandingTheme } from './LandingTypes';

interface LandingPillarsProps {
  theme: LandingTheme;
  scrollToSection: (id: string) => void;
}

export const LandingPillars: React.FC<LandingPillarsProps> = ({
  theme,
  scrollToSection,
}) => {
  const { t } = useTranslation(['landing', 'common']);
  const [geekMode, setGeekMode] = useState<boolean>(false);

  const getGlowColor = () => {
    if (theme === 'light') return 'rgba(0, 122, 255, 0.08)';
    if (theme === 'coffee') return 'rgba(188, 163, 116, 0.08)';
    return 'rgba(15, 157, 88, 0.08)';
  };

  const getBadgeClass = (cardType: 'privacy' | 'code' | 'money' | 'robust' | 'vault' | 'mesh') => {
    if (theme === 'light') {
      switch (cardType) {
        case 'privacy': return 'bg-blue-50 text-blue-700 border-blue-100';
        case 'code': return 'bg-sky-50 text-sky-700 border-sky-100';
        case 'money': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
        case 'robust': return 'bg-cyan-50 text-cyan-700 border-cyan-100';
        case 'vault': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        case 'mesh': return 'bg-purple-50 text-purple-700 border-purple-200';
      }
    }
    if (theme === 'coffee') {
      switch (cardType) {
        case 'privacy': return 'bg-amber-950/40 text-amber-300 border-amber-900/40';
        case 'code': return 'bg-yellow-950/40 text-yellow-300 border-yellow-900/40';
        case 'money': return 'bg-orange-950/30 text-orange-300 border-orange-900/30';
        case 'robust': return 'bg-amber-950/40 text-amber-200 border-amber-900/40';
        case 'vault': return 'bg-emerald-950/40 text-emerald-300 border-emerald-900/40';
        case 'mesh': return 'bg-purple-950/40 text-purple-300 border-purple-900/40';
      }
    }
    switch (cardType) {
      case 'privacy': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
      case 'code': return 'bg-teal-500/10 text-teal-300 border-teal-500/20';
      case 'money': return 'bg-green-500/10 text-green-300 border-green-500/20';
      case 'robust': return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20';
      case 'vault': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'mesh': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    }
  };

  return (
    <section id="features" className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100">
            {t('landing:pillars.title', 'Категории прозрачности и архитектура')}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {t('landing:pillars.subtitle', 'Выберите уровень глубины описания: простой и жизненный или детальный для инженеров')}
          </p>
        </div>

        <div className={`flex p-1 rounded-xl border shrink-0 w-full sm:w-auto self-start sm:self-auto ${
          theme === 'light' ? 'bg-slate-200/50 border-slate-200' : 'bg-white/5 border-white/5'
        }`}>
          <button
            type="button"
            onClick={() => setGeekMode(false)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 flex-1 sm:flex-none ${
              !geekMode
                ? (theme === 'light'
                    ? 'bg-blue-100 text-blue-700 border border-blue-300 shadow-glass-sm'
                    : 'bg-emerald-600/20 text-emerald-200 border border-emerald-500/30 shadow-glass-sm')
                : (theme === 'light'
                    ? 'text-slate-500 hover:text-slate-800'
                    : 'text-slate-400 hover:text-slate-200')
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {t('landing:pillars.simpleMode', 'Простыми словами')}
          </button>
          <button
            type="button"
            onClick={() => setGeekMode(true)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 flex-1 sm:flex-none ${
              geekMode
                ? (theme === 'light'
                    ? 'bg-blue-100 text-blue-700 border border-blue-300 shadow-glass-sm'
                    : 'bg-emerald-600/20 text-emerald-200 border border-emerald-500/30 shadow-glass-sm')
                : (theme === 'light'
                    ? 'text-slate-500 hover:text-slate-800'
                    : 'text-slate-400 hover:text-slate-200')
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            {t('landing:pillars.geekMode', 'Технический разбор')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <GlassCard glow glowColor={getGlowColor()} className="p-6 flex flex-col justify-between h-full min-h-[220px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className={`w-5 h-5 ${theme === 'light' ? 'text-blue-600' : 'text-emerald-400'}`} />
                <h3 className="text-base font-bold text-slate-100">
                  {t('landing:pillars.privacy.title', 'Приватность и Чтение данных')}
                </h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${getBadgeClass('privacy')}`}>
                {geekMode
                  ? t('landing:pillars.privacy.badgeGeek', 'PQ-MLS (ML-KEM + X25519)')
                  : t('landing:pillars.privacy.badgeSimple', 'Постквантовый щит')}
              </span>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={geekMode ? 'g-1' : 's-1'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-slate-400 leading-relaxed font-medium"
              >
                {!geekMode
                  ? t('landing:pillars.privacy.descSimple', 'Мы физически не можем прочитать ваши переписки или передать метаданные третьим лицам. В Gossip внедрена постквантовая защита: каждое сообщение кодируется гибридным ключом (ML-KEM Kyber + X25519) прямо на девайсе. Даже квантовые суперкомпьютеры будущего не смогут расшифровать перехваченный сегодня трафик.')
                  : t('landing:pillars.privacy.descGeek', 'Полноценное постквантовое сквозное шифрование PQ-MLS & PQXDH (NIST FIPS 203 ML-KEM-768 на решетках Z_q[X]/(X^256+1) + Curve25519). Защита от атак «Harvest Now, Decrypt Later». Вывод сессионных ключей через HKDF-SHA256 Combiner. Ключи никогда не покидают девайс.')}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className={`border-t pt-3 mt-4 text-[10px] font-semibold flex items-center gap-1.5 ${
            theme === 'light' ? 'border-slate-200/80 text-slate-400' : 'border-white/5 text-slate-500'
          }`}>
            <Database className="w-3.5 h-3.5" />
            <span>{t('landing:pillars.privacy.footer', 'Где хранятся ключи: Только на вашем девайсе (Zero-Knowledge)')}</span>
          </div>
        </GlassCard>

        <GlassCard glow glowColor={getGlowColor()} className="p-6 flex flex-col justify-between h-full min-h-[220px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className={`w-5 h-5 ${theme === 'light' ? 'text-sky-600' : 'text-teal-400'}`} />
                <h3 className="text-base font-bold text-slate-100">
                  {t('landing:pillars.openness.title', 'Открытость и Суверенитет')}
                </h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${getBadgeClass('code')}`}>
                {geekMode
                  ? t('landing:pillars.openness.badgeGeek', 'BSL 1.1 / Open-Core')
                  : t('landing:pillars.openness.badgeSimple', 'Проверяемо и защищено')}
              </span>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={geekMode ? 'g-2' : 's-2'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-slate-400 leading-relaxed font-medium"
              >
                {!geekMode
                  ? t('landing:pillars.openness.descSimple', 'Клиентский код Gossip на 100% открыт и доступен для аудита — любой специалист может убедиться в честности алгоритмов. При этом проект защищен авторской лицензией, чтобы IT-гиганты не смогли украсть технологию, закрыть её в черный ящик или перепродать ради наживы.')
                  : t('landing:pillars.openness.descGeek', 'Двухуровневая модель BSL 1.1 / Open-Core: 100% открытый клиентский код для независимого криптографического аудита и сборки Reproducible Builds. На сервере действует лицензионный барьер Air-Gapped Ed25519 и Attestation Guard, предотвращающий несанкционированную коммерческую перепродажу.')}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className={`border-t pt-3 mt-4 text-[10px] font-semibold flex items-center gap-1.5 ${
            theme === 'light' ? 'border-slate-200/80 text-slate-400' : 'border-white/5 text-slate-500'
          }`}>
            <Terminal className="w-3.5 h-3.5" />
            <a
              href="https://github.com/up1t3/gossip-public"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-emerald-400"
            >
              {t('landing:pillars.openness.footerPublic', 'GitHub Open-Client: github.com/up1t3/gossip-public')}
            </a>
          </div>
        </GlassCard>

        <GlassCard glow glowColor={getGlowColor()} className="p-6 flex flex-col justify-between h-full min-h-[220px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100">
                  {t('landing:pillars.monetization.title', 'Как мы зарабатываем')}
                </h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${getBadgeClass('money')}`}>
                {geekMode
                  ? t('landing:pillars.monetization.badgeGeek', 'Premium SaaS / Crypto')
                  : t('landing:pillars.monetization.badgeSimple', 'Без рекламы и сливов')}
              </span>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={geekMode ? 'g-3' : 's-3'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-slate-400 leading-relaxed font-medium"
              >
                {!geekMode
                  ? t('landing:pillars.monetization.descSimple', 'У нас нет спонсоров-олигархов и рекламодателей, ради которых нужно сливать переписки. Базовый мессенджер всегда бесплатен. Мы зарабатываем на премиум-подписке для тех, кто хочет поддержать проект и получить уникальные фоны, стикеры и темы.')
                  : t('landing:pillars.monetization.descGeek', 'Инфраструктура финансируется за счет продажи премиальных визуальных ресурсов и подписок. В платежную систему интегрированы анонимные крипто-процессинги (без принудительного KYC для мелких сумм) и стандартные фиатные Stripe-шлюзы для P2P-пожертвований.')}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className={`border-t pt-3 mt-4 text-[10px] font-semibold flex items-center gap-1.5 ${
            theme === 'light' ? 'border-slate-200/80 text-slate-400' : 'border-white/5 text-slate-500'
          }`}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('landing:pillars.monetization.footer', 'Честная подписка, без скрытых списаний')}</span>
          </div>
        </GlassCard>

        <GlassCard glow glowColor={getGlowColor()} className="p-6 flex flex-col justify-between h-full min-h-[220px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-slate-100">
                  {t('landing:pillars.resilience.title', 'Блокировки и устойчивость')}
                </h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${getBadgeClass('robust')}`}>
                {geekMode
                  ? t('landing:pillars.resilience.badgeGeek', 'Fake-TLS / VLESS / WebSocket')
                  : t('landing:pillars.resilience.badgeSimple', 'Работает везде')}
              </span>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={geekMode ? 'g-4' : 's-4'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-slate-400 leading-relaxed font-medium"
              >
                {!geekMode
                  ? t('landing:pillars.resilience.descSimple', 'Если провайдер или цензор попытается заблокировать Gossip — трафик автоматически маскируется под обычный защищенный просмотр веб-сайтов (Fake-TLS). Для любого сетевого фильтра трафик выглядит как безобидный серфинг в браузере.')
                  : t('landing:pillars.resilience.descGeek', 'Многоуровневая система обхода DPI: Fake-TLS с динамическим ALPN h2/http/1.1, WebSocket Transport, VLESS-подобная маскировка трафика под легитимные CDN-узлы и P2P-fallback при блокировке центральных доменов.')}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className={`border-t pt-3 mt-4 text-[10px] font-semibold flex items-center gap-1.5 ${
            theme === 'light' ? 'border-slate-200/80 text-slate-400' : 'border-white/5 text-slate-500'
          }`}>
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>{t('landing:pillars.resilience.footer', 'Авто-обход блокировок без сторонних VPN')}</span>
          </div>
        </GlassCard>

        <GlassCard glow glowColor={getGlowColor()} className="p-6 flex flex-col justify-between h-full min-h-[220px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-slate-100">
                  {t('landing:pillars.vault.title', 'Сейф-Контур 152-ФЗ')}
                </h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${getBadgeClass('vault')}`}>
                {geekMode
                  ? t('landing:pillars.vault.badgeGeek', 'SQLCipher + DLP Guard')
                  : t('landing:pillars.vault.badgeSimple', 'Личное отдельно, рабочее защищено')}
              </span>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={geekMode ? 'g-5' : 's-5'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-slate-400 leading-relaxed font-medium"
              >
                {!geekMode
                  ? t('landing:pillars.vault.descSimple', 'Разделяйте личные переписки и конфиденциальную работу. Назначайте отдельным папкам и чатам режим «Сейфа»: автоматическое удаление файлов через 7/30 дней, блокировка пересылок и утечек, полное отсутствие следов и защита коммерческой тайны.')
                  : t('landing:pillars.vault.descGeek', 'Изолированный Zero-Knowledge контур. Реализует концепцию Data Minimization и Privacy by Design: локальное хранилище данных, криптографическое уничтожение вложений по таймеру, DLP-блокировка экспорта наружу и выгрузка истории данных субъекта в 1 клик.')}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className={`border-t pt-3 mt-4 text-[10px] font-semibold flex items-center gap-1.5 ${
            theme === 'light' ? 'border-slate-200/80 text-slate-400' : 'border-white/5 text-slate-500'
          }`}>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('landing:pillars.vault.footer', 'Корпоративная безопасность: Личное отдельно, рабочее защищено')}</span>
          </div>
        </GlassCard>

        <GlassCard glow glowColor={getGlowColor()} className="p-6 flex flex-col justify-between h-full min-h-[220px] bg-gradient-to-r from-purple-950/20 via-transparent to-indigo-950/20 border-purple-500/20">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-slate-100">
                  {t('landing:pillars.mesh.title', 'BLE Mesh: Автономная рация & Офлайн-радар')}
                </h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${getBadgeClass('mesh')}`}>
                {geekMode
                  ? t('landing:pillars.mesh.badgeGeek', 'GATT 0xFA21 • Store & Forward')
                  : t('landing:pillars.mesh.badgeSimple', 'Работает без интернета')}
              </span>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={geekMode ? 'g-6' : 's-6'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-slate-400 leading-relaxed font-medium"
              >
                {!geekMode
                  ? t('landing:pillars.mesh.descSimple', 'Gossip продолжает работать в глухом лесу, горах или при тотальном отключении электричества и сотовой связи в городе. Смартфоны превращаются в защищенные рации, сканируют радиоэфир на 2.4 GHz, измеряют дистанцию до каждого человека на радаре и пересылают зашифрованные сообщения по цепочке через соседей без серверов и сим-карт.')
                  : t('landing:pillars.mesh.descGeek', 'Нативный протокол BLE Mesh (GATT Service UUID 0xFA21, характеристики 0xFA22/0xFA23/0xFA24). Одновременный BLE Advertising и Scanning на частоте 2.4 GHz. Расчет дистанции по модели Path Loss затухания RSSI. Сквозное E2EE-шифрование, цепочечная ретрансляция Store & Forward, предотвращение петель по Hops и TTL=7.')}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className={`border-t pt-3 mt-4 text-[10px] font-semibold flex items-center justify-between ${
            theme === 'light' ? 'border-slate-200/80 text-slate-400' : 'border-white/5 text-slate-500'
          }`}>
            <div className="flex items-center gap-1.5">
              <RadioTower className="w-3.5 h-3.5 text-purple-400" />
              <span>{t('landing:pillars.mesh.footer', 'Радиоэфир 2.4 GHz • До 30м на узел • Неубиваемая связь')}</span>
            </div>
            <button
              onClick={() => scrollToSection('mesh-radar')}
              className="text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer font-bold"
            >
              <span>{t('landing:pillars.mesh.moreBtn', 'Подробнее о рации')}</span>
              <ArrowRight className="w-3 h-3 rtl:rotate-180" />
            </button>
          </div>
        </GlassCard>

        {/* Карточка 7: Gossip Pulse & ZK-Trust Engine */}
        <GlassCard glow glowColor={getGlowColor()} className="p-6 flex flex-col justify-between h-full min-h-[220px] md:col-span-2 bg-gradient-to-r from-emerald-950/20 via-transparent to-teal-950/20 border-emerald-500/20">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-slate-100">
                  {t('landing:pillars.sel.title', 'Gossip Pulse: Суверенная экономика & ZK-Trust Engine')}
                </h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${getBadgeClass('vault')}`}>
                {geekMode
                  ? t('landing:pillars.sel.badgeGeek', 'Halo2 ZKP • TON DvP Escrow • O(1)')
                  : t('landing:pillars.sel.badgeSimple', 'Доверие без банков и KYC')}
              </span>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={geekMode ? 'g-7' : 's-7'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-slate-400 leading-relaxed font-medium"
              >
                {!geekMode
                  ? t('landing:pillars.sel.descSimple', 'Универсальная среда безопасных намерений: от розничного P2P-обмена наличных и скрытого хедхантинга до международных внешнеторговых поставок зерна и сырья. Доказывайте платежеспособность математически без раскрытия адреса кошелька, а смарт-эскроу выплачивает средства строго при подтверждении оракулов (спутники AIS, сертификаты SGS, TLS-пруфы).')
                  : t('landing:pillars.sel.descGeek', 'Универсальный контракт Universal Intent Schema со слепым сопоставлением O(1) через 128-bit SimHash/LSH и гео-гексагоны Uber H3 Res 8. Halo2 ZK-Аттестация (Proof of Solvency + Proof of Deposit Age) на Pasta Cycle. 4-фазный смарт-эскроу Delivery-versus-Payment в сети TON с залоговым слэшингом (S1–S5) и TLSNotary 2PC-TLS оракулами.')}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className={`border-t pt-3 mt-4 text-[10px] font-semibold flex items-center justify-between ${
            theme === 'light' ? 'border-slate-200/80 text-slate-400' : 'border-white/5 text-slate-500'
          }`}>
            <div className="flex items-center gap-1.5">
              <Handshake className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('landing:pillars.sel.footer', 'P2P-ликвидность • B2B-клиринг • Гражданские пороги • ВЭД Смарт-Эскроу')}</span>
            </div>
            <button
              onClick={() => scrollToSection('sovereign-economic-layer')}
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-bold"
            >
              <span>{t('landing:pillars.sel.moreBtn', 'Подробнее о ZK-Экономике')}</span>
              <ArrowRight className="w-3 h-3 rtl:rotate-180" />
            </button>
          </div>
        </GlassCard>

      </div>
    </section>
  );
};
