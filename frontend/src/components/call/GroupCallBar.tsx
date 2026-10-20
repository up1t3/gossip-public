import React from 'react';
import { Phone, Volume2 } from 'lucide-react';

export interface GroupCallBarProps {
  chatId: string;
  isActive: boolean;
  participantCount: number;
  participantAvatars?: string[];
  isInCall?: boolean;
  onJoinCall: () => void;
  onReturnToCall?: () => void;
}

export const GroupCallBar: React.FC<GroupCallBarProps> = ({
  chatId,
  isActive,
  participantCount,
  participantAvatars = [],
  isInCall = false,
  onJoinCall,
  onReturnToCall,
}) => {
  if (!isActive) return null;

  const handleAction = () => {
    if (isInCall && onReturnToCall) {
      onReturnToCall();
    } else {
      onJoinCall();
    }
  };

  return (
    <div
      data-testid="group-call-bar"
      className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-emerald-950/70 via-neutral-900/80 to-emerald-950/70 border-b border-emerald-500/20 backdrop-blur-xl text-white select-none transition-all duration-300"
    >
      {/* Левая часть: Индикатор активности и статус */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Анимированный зеленый пульсирующий индикатор */}
        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
          <Volume2 className="w-4 h-4 animate-pulse" />
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-neutral-950 animate-ping" />
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Групповой звонок
            </span>
            {isInCall && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                Вы участвуете
              </span>
            )}
          </div>
          <span
            data-testid="group-call-participants-count"
            className="text-xs text-neutral-300 truncate"
          >
            {participantCount > 0
              ? `${participantCount} ${participantCount === 1 ? 'участник' : participantCount < 5 ? 'участника' : 'участников'}`
              : 'Ожидание участников...'}
          </span>
        </div>
      </div>

      {/* Правая часть: Стек аватаров + Кнопка действия */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Стек аватаров */}
        {participantAvatars.length > 0 && (
          <div
            data-testid="group-call-avatar-stack"
            className="flex items-center -space-x-2 overflow-hidden hidden sm:flex"
          >
            {participantAvatars.slice(0, 4).map((avatar, idx) => (
              <div
                key={idx}
                className="w-6 h-6 rounded-full border border-neutral-900 bg-neutral-800 overflow-hidden flex items-center justify-center text-[10px] font-medium"
              >
                {avatar.startsWith('http') || avatar.startsWith('/') ? (
                  <img src={avatar} alt="Участник" className="w-full h-full object-cover" />
                ) : (
                  <span>{avatar || '👤'}</span>
                )}
              </div>
            ))}
            {participantCount > 4 && (
              <div className="w-6 h-6 rounded-full border border-neutral-900 bg-neutral-800 text-[10px] font-bold text-neutral-300 flex items-center justify-center">
                +{participantCount - 4}
              </div>
            )}
          </div>
        )}

        {/* Кнопка присоединиться / вернуться */}
        <button
          data-testid="group-call-join-btn"
          onClick={handleAction}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 shadow-md active:scale-95 ${
            isInCall
              ? 'bg-neutral-800 hover:bg-neutral-700 text-emerald-300 border border-emerald-500/30'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 hover:scale-102'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>{isInCall ? 'Вернуться в звонок' : 'Присоединиться'}</span>
        </button>
      </div>
    </div>
  );
};
