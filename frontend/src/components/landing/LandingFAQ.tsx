import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '../../ui';
import { LandingTheme } from './LandingTypes';

interface LandingFAQProps {
  theme: LandingTheme;
}

export const LandingFAQ: React.FC<LandingFAQProps> = ({ theme }) => {
  const { t } = useTranslation(['landing', 'common']);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);

  const faqData = [
    {
      question: t('landing:faq.q1', 'Законно ли общаться приватно и использовать сквозное шифрование?'),
      simple: t('landing:faq.a1Simple', 'Абсолютно законно. Статья 12 Всеобщей декларации прав человека ООН прямо гарантирует каждому право на неприкосновенность частной жизни и тайну корреспонденции. Приватность — это базовое право свободного человека. Если кто-то пытается вмешаться в вашу переписку — Gossip технологически и математически защищает ваше личное пространство.'),
      geek: t('landing:faq.a1Geek', 'Правовой базис: ст. 12 Всеобщей декларации прав человека (ООН), европейские стандарты GDPR и принципы Privacy by Design. Использование сквозного шифрования (E2EE) для защиты собственных данных является общепринятым мировым стандартом информационной безопасности. Архитектура Zero-Knowledge гарантирует, что ключи никогда не покидают устройство владельца.')
    },
    {
      question: t('landing:faq.q2', 'Могут ли спецслужбы или администрация прочитать мою переписку?'),
      simple: t('landing:faq.a2Simple', 'Физически нет. Приватные чаты защищены сквозным шифрованием (E2EE). Закрытые ключи для расшифровки генерируются непосредственно на вашем устройстве и никогда не отправляются на наши серверы. У нас нет бэкдоров и технической возможности прочитать ваши данные.'),
      geek: t('landing:faq.a2Geek', 'Мы используем протокол MLS (Message Layer Security) с гибридным согласованием ключей на базе X25519 (современный стандарт ECDH) и выводом ключей через HKDF-SHA256. Архитектура уже зарезервирована под миграцию на постквантовый ML-KEM (Kyber) — сейчас в активной разработке. Данные на диске защищены базой SQLCipher (SQLite) с AES-256 постраничным шифрованием. Облачное хранилище ScyllaDB содержит только зашифрованные пакеты, ключи от которых хранятся исключительно на клиентах.')
    },
    {
      question: t('landing:faq.q3', 'Что произойдет, если серверы Gossip заблокируют или отключат?'),
      simple: t('landing:faq.a3Simple', 'Вы продолжите общаться. В Gossip встроена система маскировки трафика. Более того, исходный код полностью открыт, поэтому любой человек может запустить собственный независимый сервер-узел.'),
      geek: t('landing:faq.a3Geek', 'Для обхода DPI мы используем собственный протокол-обертку Fake TLS Proxy, маскирующий трафик под стандартные безопасные HTTPS соединения на порт 443. В случае полной изоляции центрального узла, архитектура поддерживает подключение к кастомным шлюзам (GatewayNode). Сессии синхронизируются через TDLib updates PTS-механизм, что позволяет накатывать историю сообщений без потерь после восстановления связи.')
    },
    {
      question: t('landing:faq.q4', 'Как Gossip монетизируется? Будут ли мои данные проданы?'),
      simple: t('landing:faq.a4Simple', 'Мы никогда не продаем ваши данные, контакты или историю переписки рекламодателям — у нас просто нет этих данных для продажи. Проект монетизируется через прозрачные премиум-функции (анимированные фоны, стикеры, кастомные темы) и добровольные пожертвования.'),
      geek: t('landing:faq.a4Geek', 'Модель данных полностью исключает сбор рекламных идентификаторов. Никаких Google Analytics или Facebook SDK в клиентах. Вся аналитика полностью локальная. Серверная инфраструктура содержится на доходы от Premium-подписок, которые обрабатываются через децентрализованные платежные крипто-шлюзы и традиционные фиатные процессоры с защитой приватности.')
    },
    {
      question: t('landing:faq.q5', 'Зачем нужен механизм Proof-of-Work перед авторизацией?'),
      simple: t('landing:faq.a5Simple', 'Это невидимая цифровая капча, защищающая мессенджер от ботов и хакеров, которые пытаются перегрузить наши серверы миллионами ложных запросов.'),
      geek: t('landing:faq.a5Geek', 'Для предотвращения спама при регистрации и аутентификации мы применяем Proof-of-Work. Перед отправкой запроса клиент должен решить математическую задачу (поиск хеша SHA-256 с заданным количеством ведущих нулей). Сервер быстро проверяет nonce за O(1), в то время как спамер вынужден тратить процессорное время на генерацию PoW, что делает DDoS-атаки экономически невыгодными.')
    },
    {
      question: t('landing:faq.q6', 'Как работает Офлайн-радар и Mesh-рация без интернета и сотовой связи?'),
      simple: t('landing:faq.a6Simple', 'Если вы оказались в глухом лесу, горах или в городе полностью отключили электричество и сотовую связь — Gossip переключается на встроенный радиомодуль Bluetooth (BLE Mesh). Мессенджер сканирует эфир на частоте 2.4 GHz, находит смартфоны рядом, показывает расстояние до них на интерактивном радаре и передает сообщения напрямую или по цепочке через соседей (Store & Forward), пока пакет не дойдет до адресата.'),
      geek: t('landing:faq.a6Geek', 'Работает нативный протокол BLE Mesh (GATT Service UUID 0xFA21, характеристики 0xFA22/0xFA23/0xFA24). Смартфоны выступают одновременно как радиопередатчики (Advertising) и сканеры (Scanning). Расстояние рассчитывается по модели Path Loss затухания сигнала RSSI. Пакеты шифруются E2EE-ключами и пересылаются методом Store-and-Forward с контролем Hop Count и TTL=7, исключая зацикливание и раскрытие данных транзитным узлам.')
    },
    {
      question: t('landing:faq.q7', 'Что такое Sovereign Economic Layer и ZK-Trust («Цифровой Юрист»)?'),
      simple: t('landing:faq.a7Simple', 'Это встроенная платформа для безопасных сделок без посредников, банков и риска мошенничества. Вы можете доказать контрагенту, что у вас есть средства для сделки, не показывая свой баланс и адрес кошелька (ZKP). А смарт-эскроу замораживает средства и переводит их продавцу только тогда, когда независимые оракулы (спутники, лаборатории качества SGS, накладные) подтвердят реальную доставку товара.'),
      geek: t('landing:faq.a7Geek', 'Протокол ZK-Trust Protocol (ZKTP) и смарт-контракты Delivery-versus-Payment (DvP) на базе блокчейна TON и Halo2 ZK-SNARK. Обеспечивает Proof of Solvency и Proof of Deposit Age, исключая Flash-loan атаки. Интеграция с физическим миром выполняется через 3-уровневую систему оракулов: спутники AIS (IMO/SOLAS), криптографические доказательства TLSNotary 2PC-TLS для государственных реестров и пороговый мультисиг (2 из 3).')
    },
    {
      question: t('landing:faq.q8', 'Открыт ли исходный код проекта и где его можно изучить?'),
      simple: t('landing:faq.a8Simple', 'Да, клиентский код Gossip открыт на GitHub (Open-Client Architecture, как у Signal и Proton). Любой человек или специалист по безопасности может проверить алгоритмы шифрования на устройстве и сверить SHA-256 подпись APK.'),
      geek: t('landing:faq.a8Geek', 'Публичный репозиторий github.com/up1t3/gossip-public содержит полный код клиентских приложений (React, TypeScript, Capacitor Android, Electron Desktop), криптографического ядра (X3DH, Double Ratchet, AES-256-GCM, ML-KEM-768), нативного BLE Mesh плагина и TON-интеграции. Релизы APK верифицируются по публичному SHA-256 отпечатку сертификата (EC:3E:02:AF...).')
    },
    {
      question: t('landing:faq.q9', 'Как восстановить доступ при утере телефона или атаке на SIM-карту (SIM-Swap)?'),
      simple: t('landing:faq.a9Simple', 'В обычных мессенджерах перехват SMS дает взломщику доступ ко всей вашей переписке. В Gossip при перехвате SIM-карты злоумышленник получит абсолютно пустой профиль: без вашей секретной фразы из 12 слов расшифровать историю переписки математически невозможно.'),
      geek: t('landing:faq.a9Geek', 'Zero-Knowledge Recovery на базе BIP-39 мнемоники (12 слов). Приватные ключи деривируются локально через PBKDF2/Argon2. Авторизация на сервере использует Secure Remote Password (SRP-6a) — пароль и сид-фраза никогда не передаются по сети. Данные в ScyllaDB зашифрованы и недоступны без локальных ключей.')
    }
  ];

  return (
    <section id="faq" className="space-y-6">
      <div className="border-b border-white/5 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold bg-white/5 text-slate-300 border border-white/10 mb-2">
          <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t('landing:faq.badge', 'ПРОЗРАЧНОСТЬ И БЕЗОПАСНОСТЬ')}</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100">
          {t('landing:faq.title', 'Честные ответы на неудобные вопросы')}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {t('landing:faq.subtitle', 'Мы общаемся с сообществом прямо и открыто, без корпоративного языка и ухода от тем')}
        </p>
      </div>

      <div className="space-y-4">
        {faqData.map((faq, index) => {
          const isOpen = activeFaqIndex === index;
          return (
            <GlassCard
              key={index}
              interactive
              onClick={() => setActiveFaqIndex(isOpen ? null : index)}
              className={`p-5 transition-all cursor-pointer ${
                isOpen 
                  ? (theme === 'light' ? 'bg-white border-slate-300 shadow-sm' : 'bg-white/[0.02] border-white/10') 
                  : (theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/[0.005] border-white/5')
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-slate-100 pr-4">
                  {faq.question}
                </h3>
                <span className={`text-xs shrink-0 select-none ${theme === 'light' ? 'text-slate-400' : (theme === 'coffee' ? 'text-amber-400' : 'text-emerald-400')}`}>
                  {isOpen ? '▲' : '▼'}
                </span>
              </div>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`overflow-hidden space-y-4 border-t pt-4 ${theme === 'light' ? 'border-slate-200' : 'border-white/5'}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'light' ? 'text-blue-700' : (theme === 'coffee' ? 'text-amber-400' : 'text-emerald-400')}`}>
                          {t('landing:faq.simpleLabel', 'Обычными словами:')}
                        </span>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">
                          {faq.simple}
                        </p>
                      </div>

                      <div className={`space-y-2 p-3 rounded-xl border transition-all ${
                        theme === 'light' 
                          ? 'bg-slate-50 border-slate-200 text-slate-100' 
                          : 'bg-neutral-950/40 border-white/5'
                      }`}>
                        <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                          theme === 'light' ? 'text-emerald-700' : 'text-emerald-500'
                        }`}>
                          <Terminal className="w-3 h-3" />
                          {t('landing:faq.geekLabel', 'Для гиков (технически):')}
                        </span>
                        <p className={`text-[11px] leading-relaxed font-mono ${theme === 'light' ? 'text-slate-700' : 'text-slate-400'}`}>
                          {faq.geek}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          );
        })}
      </div>
    </section>
  );
};
