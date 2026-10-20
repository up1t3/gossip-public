// frontend/src/features/reputation/ReputationBadgeView.tsx
import React, { useState, useEffect } from 'react';
import { Star, ShieldCheck, Award, Lock } from 'lucide-react';
import { GlassModal } from '../../ui';
import { ReputationScore, ReviewItem } from './types';
import { reputationService } from './reputationService';

interface ReputationBadgeViewProps {
  userAlias: string;
  size?: 'sm' | 'md' | 'lg';
  showDetailsOnClick?: boolean;
}

export const ReputationBadgeView: React.FC<ReputationBadgeViewProps> = ({
  userAlias,
  size = 'md',
  showDetailsOnClick = true,
}) => {
  const [rep, setRep] = useState<ReputationScore | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    reputationService.getUserReputation(userAlias).then((data) => {
      if (isMounted) setRep(data);
    });
    return () => {
      isMounted = false;
    };
  }, [userAlias]);

  const handleOpenDetails = async () => {
    if (!showDetailsOnClick) return;
    setIsModalOpen(true);
    setIsLoading(true);
    try {
      const revs = await reputationService.getRecentReviews(userAlias);
      setReviews(revs);
    } finally {
      setIsLoading(false);
    }
  };

  if (!rep) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-slate-400 font-mono">
        <Star className="w-3 h-3 text-slate-500" />
        <span>...</span>
      </span>
    );
  }

  // Стили по уровню доверия
  const getBadgeStyle = () => {
    switch (rep.trust_level) {
      case 'elite':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-glass-sm';
      case 'high':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-glass-sm';
      case 'medium':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/40';
      default:
        return 'bg-white/5 text-slate-400 border-white/10';
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpenDetails}
        className={`inline-flex items-center gap-1.5 rounded-xl border transition-all cursor-pointer group ${getBadgeStyle()} ${
          size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' :
          size === 'lg' ? 'px-3 py-1.5 text-xs font-bold' : 'px-2 py-1 text-[11px] font-semibold'
        }`}
        title={`ZK-Рейтинг: ${rep.score} (${rep.verified_deals_count} сделок)`}
      >
        <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
        <span className="font-bold">{rep.score > 0 ? rep.score.toFixed(1) : 'New'}</span>
        {rep.verified_deals_count > 0 && (
          <span className="opacity-75 text-[9px] font-mono">({rep.verified_deals_count})</span>
        )}
        {rep.trust_level === 'elite' && (
          <span title="Master Trader ZK-Elite">
            <Award className="w-3 h-3 text-amber-400 shrink-0" />
          </span>
        )}
        {rep.trust_level === 'high' && (
          <span title="Verified Merchant">
            <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
          </span>
        )}
      </button>

      {/* Модалка с подробностями рейтинга */}
      {showDetailsOnClick && (
        <GlassModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="🛡️ Паспорт доверия ZK-Reputation"
          size="md"
        >
          <div className="space-y-4 text-xs text-slate-200 py-2">
            {/* Верхняя плашка */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 via-purple-950/20 to-emerald-950/30 border border-white/10 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Профиль надежности</span>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{rep.user_alias}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${getBadgeStyle()}`}>
                    {rep.zk_badge}
                  </span>
                </h3>
              </div>

              <div className="text-right">
                <div className="text-2xl font-black text-amber-400 flex items-center gap-1 justify-end">
                  <Star className="w-5 h-5 fill-amber-400" />
                  <span>{rep.score > 0 ? rep.score.toFixed(2) : '0.0'}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Trust Index: {rep.trust_percentage}%</span>
              </div>
            </div>

            {/* Метрики логарифмического скоринга */}
            <div className="grid grid-cols-3 gap-2.5 text-center font-mono">
              <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-0.5">
                <span className="text-[9px] text-slate-400 uppercase block">Сделок DvP / P2P</span>
                <span className="text-emerald-400 font-bold text-sm">{rep.verified_deals_count}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-0.5">
                <span className="text-[9px] text-slate-400 uppercase block">Объем в TON</span>
                <span className="text-amber-300 font-bold text-sm">{rep.total_volume_ton.toLocaleString()} TON</span>
              </div>
              <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-0.5">
                <span className="text-[9px] text-slate-400 uppercase block">Статус защиты</span>
                <span className="text-purple-300 font-bold text-xs">Anti-Sybil ✓</span>
              </div>
            </div>

            {/* Топ тегов */}
            {rep.top_tags.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 block font-medium">Отмеченные качества:</span>
                <div className="flex flex-wrap gap-1.5">
                  {rep.top_tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-xl text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                    >
                      ✓ {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Список последних анонимных отзывов */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <span className="text-[11px] text-slate-300 font-bold block">
                Последние подтвержденные отзывы ({reviews.length}):
              </span>

              {isLoading ? (
                <div className="text-center py-4 text-slate-500 text-xs animate-pulse">
                  Загрузка ончейн-истории отзывов...
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-xs">
                  Подтвержденных отзывов пока нет
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {reviews.map((rev, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <div className="flex text-amber-400">
                            {Array.from({ length: rev.score }).map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-amber-400" />
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(rev.timestamp).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                        {rev.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 text-[9px] text-slate-300">
                            {rev.tags.map((t) => (
                              <span key={t} className="px-1.5 py-0.2 rounded bg-black/40">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="text-right font-mono text-[10px]">
                        <span className="text-emerald-400 block font-bold">+{rev.volume_ton} TON</span>
                        <span className="text-slate-500 text-[8px]">Nullifier: {rev.nullifier_hash}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Подвал с ZK-гарантией */}
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[10px] text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero-Knowledge Unlinkability & Personalized EigenTrust</span>
              </div>
              <span className="font-mono text-purple-300">Halo2-Verified</span>
            </div>
          </div>
        </GlassModal>
      )}
    </>
  );
};

export default ReputationBadgeView;
