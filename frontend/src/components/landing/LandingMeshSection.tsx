import React, { useState } from 'react';
import {
  Radio,
  Trees,
  ZapOff,
  ShieldAlert,
  Globe,
  Activity,
  Send,
  Check,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import packageJson from '../../../package.json';
import { GlassButton, GlassCard } from '../../ui';
import { LandingTheme } from './LandingTypes';

interface LandingMeshSectionProps {
  theme: LandingTheme;
  liveVersion?: string;
}

const SCENARIO_NODES: Record<
  'forest' | 'blackout' | 'disaster' | 'censorship',
  Array<{ icon: string; title: string; desc: string; status: string }>
> = {
  forest: [
    {
      icon: '01',
      title: 'Узел-Источник (Вы в походе)',
      desc: 'Голосовая заметка + GPS-точка. Шифрование E2EE (TTL=7).',
      status: 'Старт пакета',
    },
    {
      icon: '02',
      title: 'Ретранслятор 1 (Турист на тропе)',
      desc: 'BLE 2.4 GHz GATT 0xFA21. Авто-ретрансляция соседу.',
      status: 'Пересылка +1 (TTL=6)',
    },
    {
      icon: '03',
      title: 'Ретранслятор 2 (Базовый лагерь)',
      desc: 'Хранение в SQLite-буфере и передача (Store & Forward).',
      status: 'Транзит пакета',
    },
    {
      icon: '04',
      title: 'Узел-Получатель (Группа)',
      desc: 'Пакет доставлен, расшифрован, отправлен Radio-ACK ✓✓.',
      status: 'Доставлено ✓✓',
    },
  ],
  blackout: [
    {
      icon: '01',
      title: 'Квартира (0% сотовой сети)',
      desc: 'Выключено электричество и базовые станции. Отправка в чат.',
      status: 'В эфире 2.4 GHz',
    },
    {
      icon: '02',
      title: 'Сосед за стеной (BLE Relay)',
      desc: 'Прием сквозь перекрытия (L2 фрагментация 180B + CRC16).',
      status: 'Хоп через стену',
    },
    {
      icon: '03',
      title: 'Узел во дворе / подъезде',
      desc: 'Эстафета пакета по цепочке смартфонов дома.',
      status: 'Ретрансляция двора',
    },
    {
      icon: '04',
      title: 'Близкие в соседнем доме',
      desc: 'Мгновенная расшифровка и обратная квитанция Radio-ACK.',
      status: 'Связь установлена ✓✓',
    },
  ],
  disaster: [
    {
      icon: '01',
      title: 'Экстренный маяк (Вы)',
      desc: 'Координаты GPS + голосовая сводка (до 24 КБ сжатого аудио).',
      status: 'SOS импульс',
    },
    {
      icon: '02',
      title: 'Узел волонтера поблизости',
      desc: 'Прием пакета на радар RSSI и ретрансляция с защитой от коллизий.',
      status: 'Принят волонтером',
    },
    {
      icon: '03',
      title: 'Полевой штаб поиска',
      desc: 'Агрегация пакетов без участия сотовых операторов.',
      status: 'Координаты в штабе',
    },
    {
      icon: '04',
      title: 'Спасательная группа',
      desc: 'Точная геометка открыта на офлайн-карте, отправлен ACK.',
      status: 'Помощь в пути ✓✓',
    },
  ],
  censorship: [
    {
      icon: '01',
      title: 'Ваш смартфон (Шатдаун)',
      desc: 'Мобильный интернет отключен. Однократное E2EE-шифрование.',
      status: 'Обход шатдауна',
    },
    {
      icon: '02',
      title: 'Сосед по BLE 2.4 GHz',
      desc: 'Не может прочитать шифротекст, передает конверт дальше.',
      status: 'Слепой транзит',
    },
    {
      icon: '03',
      title: 'Gateway Bridge (Узел с сетью)',
      desc: 'Смартфон у окна с 3G/Wi-Fi сбрасывает пакет в /api/v1/mesh/relay.',
      status: 'Прорыв в облако',
    },
    {
      icon: '04',
      title: 'Адресат в другом городе',
      desc: 'Получает сообщение и видит ваш статус через цепочку соседей.',
      status: 'Доставлено в облако ✓✓',
    },
  ],
};

export const LandingMeshSection: React.FC<LandingMeshSectionProps> = ({ liveVersion }) => {
  const { t } = useTranslation(['landing', 'common']);
  const displayVersion = liveVersion || packageJson.version;
  const [meshDemoScenario, setMeshDemoScenario] = useState<'forest' | 'blackout' | 'disaster' | 'censorship'>('forest');
  const [meshHopStep, setMeshHopStep] = useState<number>(0);
  const [isMeshHopping, setIsMeshHopping] = useState<boolean>(false);

  const handleSelectScenario = (scenario: 'forest' | 'blackout' | 'disaster' | 'censorship') => {
    setMeshDemoScenario(scenario);
    if (!isMeshHopping) {
      setMeshHopStep(0);
    }
  };

  const runMeshSimulation = async () => {
    if (isMeshHopping) return;
    setIsMeshHopping(true);
    setMeshHopStep(1);
    await new Promise((r) => setTimeout(r, 700));
    setMeshHopStep(2);
    await new Promise((r) => setTimeout(r, 800));
    setMeshHopStep(3);
    await new Promise((r) => setTimeout(r, 850));
    setMeshHopStep(4);
    await new Promise((r) => setTimeout(r, 700));
    setIsMeshHopping(false);
  };

  const defaultNodes = SCENARIO_NODES[meshDemoScenario];
  const activeNodes = defaultNodes.map((node, idx) => ({
    icon: node.icon,
    title: t(`landing:meshSection.nodes.${meshDemoScenario}.${idx}.title`, node.title),
    desc: t(`landing:meshSection.nodes.${meshDemoScenario}.${idx}.desc`, node.desc),
    status: t(`landing:meshSection.nodes.${meshDemoScenario}.${idx}.status`, node.status),
  }));

  return (
    <section id="mesh-radar" className="space-y-8 pt-4">
      <div className="border-b border-white/5 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30 mb-3">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>{t('landing:meshSection.badge', 'АВТОНОМНЫЙ L2 РАДИО-КОНТУР • РАБОТАЕТ БЕЗ ИНТЕРНЕТА И СИМ-КАРТ')}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
          {t('landing:meshSection.title', 'Автономная сеть Gossip Mesh: Связь, когда выключили весь мир')}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-3xl leading-relaxed">
          {t('landing:meshSection.subtitle', 'Когда сотовые вышки обесточены, магистральные оптоволоконные кабели перерезаны, а в тайге нет ни единого деления связи — Gossip превращает обычные смартфоны в защищенную распределенную радиосеть прямого диапазона 2.4 GHz.')}
        </p>
      </div>

      {/* 4 Жизненных Сценария */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Сценарий 1: Лес и Походы */}
        <div
          onClick={() => handleSelectScenario('forest')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between ${
            meshDemoScenario === 'forest'
              ? 'bg-emerald-950/30 border-emerald-500/50 shadow-glass-sm ring-1 ring-emerald-500/30'
              : 'bg-white/3 border-white/5 hover:border-white/15'
          }`}
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Trees className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">{t('landing:meshSection.scenarioForestTitle', '1. Походы и Экспедиции')}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('landing:meshSection.scenarioForestDesc', 'В горах и тайге, где нет вышек сотовой связи. Держите связь в группе туристов на расстоянии прямой видимости и ретрансляции.')}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-emerald-400 font-mono font-semibold">
            {t('landing:meshSection.scenarioForestFooter', 'P2P 2.4 GHz • Голос + GPS')}
          </div>
        </div>

        {/* Сценарий 2: Блэкаут */}
        <div
          onClick={() => handleSelectScenario('blackout')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between ${
            meshDemoScenario === 'blackout'
              ? 'bg-amber-950/30 border-amber-500/50 shadow-glass-sm ring-1 ring-amber-500/30'
              : 'bg-white/3 border-white/5 hover:border-white/15'
          }`}
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ZapOff className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">{t('landing:meshSection.scenarioBlackoutTitle', '2. Городские Блэкауты')}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('landing:meshSection.scenarioBlackoutDesc', 'При масштабном отключении электричества, авариях на подстанциях и падении сетей сотовых операторов.')}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-amber-400 font-mono font-semibold">
            {t('landing:meshSection.scenarioBlackoutFooter', 'Store & Forward (TTL 7 сут)')}
          </div>
        </div>

        {/* Сценарий 3: ЧС и Катаклизмы */}
        <div
          onClick={() => handleSelectScenario('disaster')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between ${
            meshDemoScenario === 'disaster'
              ? 'bg-red-950/30 border-red-500/50 shadow-glass-sm ring-1 ring-red-500/30'
              : 'bg-white/3 border-white/5 hover:border-white/15'
          }`}
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">{t('landing:meshSection.scenarioDisasterTitle', '3. Стихийные бедствия')}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('landing:meshSection.scenarioDisasterDesc', 'Координация помощи при наводнениях и завалах. Экстренный маяк передает SOS и координаты спасателям.')}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-red-400 font-mono font-semibold">
            {t('landing:meshSection.scenarioDisasterFooter', 'SOS Beacon + Radio-ACK')}
          </div>
        </div>

        {/* Сценарий 4: Блокировки и Шатдауны */}
        <div
          onClick={() => handleSelectScenario('censorship')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between ${
            meshDemoScenario === 'censorship'
              ? 'bg-purple-950/30 border-purple-500/50 shadow-glass-sm ring-1 ring-purple-500/30'
              : 'bg-white/3 border-white/5 hover:border-white/15'
          }`}
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">{t('landing:meshSection.scenarioCensorshipTitle', '4. Блокировки и Шатдауны')}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('landing:meshSection.scenarioCensorshipDesc', 'При отключении интернета («Internet Shutdown») и блокировке базовых станций. Сообщения передаются через соседей к узлу-мосту.')}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-purple-400 font-mono font-semibold">
            {t('landing:meshSection.scenarioCensorshipFooter', 'Mesh Relay + Gateway Bridge')}
          </div>
        </div>
      </div>

      {/* Интерактивный симулятор прыжков (Store & Forward) */}
      <GlassCard glow className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              {t('landing:meshSection.simBadge', 'ИНТЕРАКТИВНЫЙ РАДАР & СИМУЛЯТОР МАРШРУТИЗАЦИИ (Store & Forward)')}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {t('landing:meshSection.simDesc', 'Выберите сценарий выше и нажмите кнопку, чтобы проследить путь зашифрованного пакета сквозь промежуточные офлайн-узлы:')}
            </p>
          </div>
          <GlassButton
            variant="accent"
            size="sm"
            onClick={runMeshSimulation}
            disabled={isMeshHopping}
            className="flex items-center gap-2 shrink-0 text-xs font-bold"
          >
            <Send className={`w-3.5 h-3.5 ${isMeshHopping ? 'animate-bounce' : ''}`} />
            {isMeshHopping ? t('landing:meshSection.simRunning', 'Ретрансляция радиопакетов...') : t('landing:meshSection.simBtn', 'Запустить радиоимпульс')}
          </GlassButton>
        </div>

        {/* Схема 4 узлов */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
          {activeNodes.map((node, index) => {
            const stepNum = index + 1;
            const isReached = meshHopStep >= stepNum;
            const isFinal = stepNum === 4;
            return (
              <div
                key={stepNum}
                className={`p-4 rounded-2xl border transition-all ${
                  isReached
                    ? isFinal
                      ? 'bg-emerald-600/25 border-emerald-500/50 shadow-glass-sm'
                      : 'bg-purple-600/25 border-purple-500/50 shadow-glass-sm'
                    : 'bg-white/2 border-white/5'
                }`}
              >
                <div
                  className={`w-9 h-8 rounded-xl mx-auto flex items-center justify-center text-xs font-bold mb-2 ${
                    isFinal
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-purple-500/20 text-purple-300'
                  }`}
                >
                  {node.icon}
                </div>
                <h4 className="text-xs font-bold text-slate-100">{node.title}</h4>
                <p className="text-[10px] text-slate-400 mt-1">{node.desc}</p>
                {isReached && (
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full inline-block mt-2 font-mono ${
                      isFinal
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-purple-500/20 text-purple-300'
                    }`}
                  >
                    {node.status}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Прогресс-бар */}
        <div className="space-y-2 pt-2">
          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-emerald-400 h-full transition-all duration-500"
              style={{ width: `${(meshHopStep / 4) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>BLE 2.4 GHz (GATT 0xFA21)</span>
            <span>
              {meshHopStep === 0 && t('landing:meshSection.simReady', 'Готов к передаче пакета')}
              {meshHopStep === 1 && t('landing:meshSection.simStep1Status', '1. Однократное E2EE-шифрование (X3DH + Double Ratchet)')}
              {meshHopStep === 2 && t('landing:meshSection.simStep2Status', '2. L2-фрагментация (180B + CRC16) • Ретрансляция +1')}
              {meshHopStep === 3 && t('landing:meshSection.simStep3Status', '3. Store & Forward / Gateway Bridge')}
              {meshHopStep === 4 && t('landing:meshSection.simStep4Done', '4. Расшифровано • Отправлен Radio-ACK ✓✓')}
            </span>
            <span>100%</span>
          </div>
        </div>
      </GlassCard>

      {/* Сравнительная таблица */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 font-semibold">
              <th className="py-3 px-4">{t('landing:meshSection.tableColScenario', 'Сценарий / Возможность')}</th>
              <th className="py-3 px-4 text-center">{t('landing:meshSection.tableColOthers', 'Telegram / WhatsApp')}</th>
              <th className="py-3 px-4 text-center text-purple-400 font-bold bg-purple-500/10 rounded-t-xl">
                {t('landing:meshSection.tableColGossip', { version: displayVersion, defaultValue: `Gossip BLE Mesh (v${displayVersion})` })}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300">
            {([1, 2, 6, 7, 8, 3, 4, 5] as const).map((rowNum) => (
              <tr key={rowNum}>
                <td className="py-3 px-4 font-medium">
                  {t(`landing:meshSection.tableRow${rowNum}Name`)}
                </td>
                <td className="py-3 px-4 text-center text-rose-400 font-mono">
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <X className="w-3.5 h-3.5 shrink-0 text-rose-400/80" />
                    <span>{t(`landing:meshSection.tableRow${rowNum}Others`)}</span>
                  </span>
                </td>
                <td className="py-3 px-4 text-center text-emerald-400 font-bold font-mono bg-purple-500/5">
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span>{t(`landing:meshSection.tableRow${rowNum}Gossip`)}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
