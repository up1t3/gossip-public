import React, { useState } from 'react';

export interface WalletBrandedIconProps {
  id?: string;
  name?: string;
  iconUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const WalletBrandedIcon: React.FC<WalletBrandedIconProps> = ({
  id = '',
  name = '',
  iconUrl,
  size = 'md',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  const cleanId = (id || name || '').toLowerCase();

  const sizeClasses = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  }[size];

  // Рендер встроенных векторных SVG для гарантированной отрисовки без внешних зависимостей
  const renderBrandedSvg = () => {
    // 1. Tonkeeper
    if (cleanId.includes('tonkeeper')) {
      return (
        <div className={`rounded-xl bg-[#0088CC] flex items-center justify-center p-1.5 shadow-sm text-white ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.8l7.5 3.75L12 12.3 4.5 8.55 12 4.8zm-8 5.4l7 3.5v7.4l-7-3.5v-7.4zm9 10.9v-7.4l7-3.5v7.4l-7 3.5z" />
          </svg>
        </div>
      );
    }

    // 2. MyTonWallet
    if (cleanId.includes('myton') || cleanId.includes('mytonwallet')) {
      return (
        <div className={`rounded-xl bg-gradient-to-tr from-[#1E5BF8] to-[#4378FF] flex items-center justify-center p-1.5 shadow-sm text-white ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
            <polygon points="6 3 18 3 22 9 12 22 2 9" />
            <line x1="12" y1="22" x2="12" y2="9" />
            <line x1="2" y1="9" x2="22" y2="9" />
          </svg>
        </div>
      );
    }

    // 3. OpenMask
    if (cleanId.includes('openmask')) {
      return (
        <div className={`rounded-xl bg-gradient-to-tr from-[#F6851B] to-[#E2761B] flex items-center justify-center p-1.5 shadow-sm text-white ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M12 3L4 9l2 11 6 2 6-2 2-11-8-6zm-3.5 8.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5S7 13.83 7 13s.67-1.5 1.5-1.5zm7 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z" />
          </svg>
        </div>
      );
    }

    // 4. Telegram Wallet (@wallet)
    if (cleanId.includes('telegram') || cleanId.includes('wallet.tg') || cleanId.includes('@wallet')) {
      return (
        <div className={`rounded-xl bg-[#24A1DE] flex items-center justify-center p-1.5 shadow-sm text-white ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.37.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
          </svg>
        </div>
      );
    }

    // 5. STON.fi DEX
    if (cleanId.includes('ston') || cleanId.includes('stonfi')) {
      return (
        <div className={`rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-700 flex items-center justify-center p-1.5 shadow-sm text-white ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
      );
    }

    // 6. USDT Tether
    if (cleanId.includes('usdt') || cleanId.includes('tether')) {
      return (
        <div className={`rounded-xl bg-[#26A17B] flex items-center justify-center p-1.5 shadow-sm text-white font-bold font-mono ${sizeClasses} ${className}`}>
          <span className="leading-none select-none">₮</span>
        </div>
      );
    }

    // 7. Дефолтный TON Diamond / Crystal
    return (
      <div className={`rounded-xl bg-gradient-to-br from-[#0098EA] to-[#0077B5] flex items-center justify-center p-1.5 shadow-sm text-white ${sizeClasses} ${className}`}>
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
          <path d="M12 2L4 7v10l8 5 8-5V7L12 2zm0 3.2L17.5 8 12 11.2 6.5 8 12 5.2zM6 10l5 3v6.5l-5-3.5V10zm12 6l-5 3.5V13l5-3v6z" />
        </svg>
      </div>
    );
  };

  if (hasError || !iconUrl) {
    return renderBrandedSvg();
  }

  return (
    <div className={`rounded-xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center p-1 relative flex-shrink-0 ${sizeClasses} ${className}`}>
      <img
        src={iconUrl}
        alt={name || 'Кошелек'}
        className="w-full h-full object-contain rounded-lg transition-transform"
        onError={() => setHasError(true)}
      />
    </div>
  );
};
