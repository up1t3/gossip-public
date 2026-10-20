// frontend/src/features/reputation/FeedbackModal.tsx
import React, { useState } from 'react';
import { Star, ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';
import { GlassModal, GlassButton } from '../../ui';
import { reputationService } from './reputationService';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  interactionId: string;
  targetAlias: string;
  onSuccess?: () => void;
  onToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AVAILABLE_TAGS = [
  'Быстрый перевод',
  'Честный курс',
  'Пунктуальность',
  'Отличная связь',
  'Качество SGS',
  'Надежный продавец',
  'Безопасная сделка',
  'Вежливость'
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  interactionId,
  targetAlias,
  onSuccess,
  onToast,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Честный курс', 'Безопасная сделка']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag].slice(0, 4)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await reputationService.submitDualBlindFeedback({
        interactionId,
        targetAlias,
        score: rating,
        tags: selectedTags,
      });

      setIsDone(true);
      if (onToast) {
        onToast('Отзыв успешно запечатан и отправлен в ZK-Reputation протокол!', 'success');
      }
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
        setIsDone(false);
      }, 1500);
    } catch (err: any) {
      if (onToast) {
        onToast(err.message || 'Ошибка отправки отзыва', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="⭐ Оценка контрагента (ZK Dual-Blind)"
      size="sm"
    >
      <div className="space-y-4 text-xs text-slate-200 py-2">
        {isDone ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">Отзыв успешно принят!</h3>
            <p className="text-xs text-slate-400">
              Ваша оценка анонимизирована через ZK-Nullifier и учтена в рейтинге контрагента.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/30 via-indigo-950/20 to-blue-950/30 border border-purple-500/30 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-mono">Контрагент сделки</span>
                <span className="text-sm font-bold text-white">{targetAlias}</span>
              </div>
            </div>

            {/* Выбор звезд 1-5 */}
            <div className="flex flex-col items-center gap-2 py-1">
              <span className="text-xs text-slate-300 font-medium">Ваша оценка взаимодействия:</span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1.5 transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= (hoverRating || rating)
                          ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                          : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-[11px] font-bold text-amber-300">
                {rating === 5 ? 'Отлично (5 из 5)' :
                 rating === 4 ? 'Хорошо (4 из 5)' :
                 rating === 3 ? 'Удовлетворительно (3 из 5)' :
                 rating === 2 ? 'Плохо (2 из 5)' : 'Ужасно (1 из 5)'}
              </span>
            </div>

            {/* Выбор тегов */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 block font-medium">Выберите теги (до 4):</span>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-500/20 text-purple-200 border border-purple-400/40 shadow-glass-sm'
                          : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Инфо о Dual-Blind ZK защите */}
            <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 text-[10px] text-slate-400 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <b>Dual-Blind Commit</b>: ваша оценка запечатана хэшем и раскроется одновременно со второй стороной. Месть или зеркальный шантаж исключены.
              </span>
            </div>

            <GlassButton
              type="submit"
              variant="accent"
              fullWidth
              disabled={isSubmitting}
              className="py-3 font-bold text-xs bg-purple-600 hover:bg-purple-500 text-white"
            >
              {isSubmitting ? 'Генерация ZK-Nullifier...' : 'Подтвердить и отправить отзыв'}
            </GlassButton>
          </form>
        )}
      </div>
    </GlassModal>
  );
};

export default FeedbackModal;
