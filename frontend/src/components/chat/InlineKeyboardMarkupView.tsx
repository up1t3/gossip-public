// frontend/src/components/chat/InlineKeyboardMarkupView.tsx
import React, { useState } from 'react';
import { ExternalLink, Sparkles, Coins, Loader2, Zap } from 'lucide-react';
import { InlineKeyboardMarkup, InlineKeyboardButton } from '../../features/bots/types';
import { getBackendUrl } from '../../utils/url';
import { isSafeUrl } from './RichText';

export interface InlineKeyboardMarkupViewProps {
  chatId: string;
  messageId: string;
  replyMarkup?: InlineKeyboardMarkup | null;
  onCallbackQuery?: (button: InlineKeyboardButton, messageId: string) => Promise<void>;
  onOpenUrl?: (url: string) => void;
  onPayInvoice?: (invoiceId?: string) => void;
  onOpenWebApp?: (url: string) => void;
  theme?: 'dark' | 'light' | 'coffee';
  disabled?: boolean;
}

export const InlineKeyboardMarkupView: React.FC<InlineKeyboardMarkupViewProps> = ({
  chatId,
  messageId,
  replyMarkup,
  onCallbackQuery,
  onOpenUrl,
  onPayInvoice,
  onOpenWebApp,
  theme = 'dark',
  disabled = false,
}) => {
  const [loadingBtnKey, setLoadingBtnKey] = useState<string | null>(null);

  if (!replyMarkup || !replyMarkup.inline_keyboard || !Array.isArray(replyMarkup.inline_keyboard) || replyMarkup.inline_keyboard.length === 0) {
    return null;
  }

  const handleButtonClick = async (button: InlineKeyboardButton, rowIdx: number, colIdx: number) => {
    const btnKey = button.id || `${messageId}_${rowIdx}_${colIdx}`;
    if (disabled || loadingBtnKey) return;

    if (button.pay || button.invoice_id) {
      if (onPayInvoice) {
        onPayInvoice(button.invoice_id);
      }
      return;
    }

    if (button.web_app?.url) {
      if (onOpenWebApp) {
        onOpenWebApp(button.web_app.url);
      } else if (isSafeUrl(button.web_app.url)) {
        window.open(button.web_app.url, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    if (button.url) {
      if (onOpenUrl) {
        onOpenUrl(button.url);
      } else if (isSafeUrl(button.url)) {
        window.open(button.url, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    if (button.callback_data !== undefined) {
      try {
        setLoadingBtnKey(btnKey);
        if (onCallbackQuery) {
          await onCallbackQuery(button, messageId);
        } else {
          // Fallback на прямой вызов API
          const token = localStorage.getItem('session_token') || '';
          await fetch(getBackendUrl('/api/v1/messages/callback-query'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              callback_data: button.callback_data,
            }),
          });
        }
      } catch (err) {
        console.error('[InlineKeyboardMarkupView] Ошибка отправки callback_query:', err);
      } finally {
        setLoadingBtnKey(null);
      }
    }
  };

  return (
    <div
      className="flex flex-col gap-1.5 mt-2 w-full select-none"
      data-testid="inline-keyboard"
      onClick={(e) => e.stopPropagation()}
    >
      {replyMarkup.inline_keyboard.map((row, rowIdx) => {
        if (!Array.isArray(row) || row.length === 0) return null;
        return (
          <div key={rowIdx} className="flex gap-1.5 w-full">
            {row.map((btn, colIdx) => {
              const btnKey = btn.id || `${messageId}_${rowIdx}_${colIdx}`;
              const isLoading = loadingBtnKey === btnKey;

              const isPay = Boolean(btn.pay || btn.invoice_id);
              const isUrl = Boolean(btn.url);
              const isWebApp = Boolean(btn.web_app?.url);
              const isAction = Boolean(btn.callback_data !== undefined);

              let styleClasses = '';
              if (isPay) {
                styleClasses = 'bg-gradient-to-r from-blue-600/30 to-purple-600/30 border-purple-400/40 text-purple-200 hover:from-blue-600/40 hover:to-purple-600/40 shadow-purple-500/10';
              } else if (btn.style === 'danger') {
                styleClasses = 'bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/30 text-rose-200';
              } else if (btn.style === 'success') {
                styleClasses = 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30 text-emerald-200';
              } else if (btn.style === 'primary') {
                styleClasses = 'bg-purple-600/25 hover:bg-purple-600/35 border-purple-500/35 text-purple-200';
              } else if (theme === 'light') {
                styleClasses = 'bg-black/5 hover:bg-black/10 active:bg-black/15 text-slate-800 border-black/10';
              } else if (theme === 'coffee') {
                styleClasses = 'bg-[#D5CEA3]/15 hover:bg-[#D5CEA3]/25 active:bg-[#D5CEA3]/30 text-[#E5E5CB] border-[#D5CEA3]/25';
              } else {
                styleClasses = 'bg-white/5 hover:bg-white/10 active:bg-white/15 text-slate-200 border-white/10';
              }

              return (
                <button
                  key={colIdx}
                  type="button"
                  disabled={disabled || isLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleButtonClick(btn, rowIdx, colIdx);
                  }}
                  className={`
                    flex-1 min-h-[36px] py-2 px-3 rounded-xl text-xs font-medium transition-all duration-150
                    flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer
                    border backdrop-blur-md shadow-sm outline-none focus:ring-1 focus:ring-purple-500/40
                    ${styleClasses}
                    ${isLoading ? 'opacity-70 cursor-wait' : ''}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400 shrink-0" />
                  ) : isPay ? (
                    <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : isWebApp ? (
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  ) : isUrl ? (
                    <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                  ) : isAction ? (
                    <Zap className="w-3 h-3 text-purple-400/80 shrink-0" />
                  ) : null}
                  <span className="truncate max-w-[200px]">{btn.text}</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
