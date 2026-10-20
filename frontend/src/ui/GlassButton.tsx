import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

// Определение вариантов оформления кнопки
export type GlassButtonVariant = 'primary' | 'secondary' | 'accent' | 'danger';

export interface GlassButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: GlassButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children?: React.ReactNode;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}) => {
  const { disabled, ...motionProps } = props;

  // Базовые стили стеклянного эффекта
  const baseStyle = 'relative overflow-hidden rounded-xl border font-medium flex items-center justify-center gap-2 transition-colors duration-200 outline-none focus:ring-2 focus:ring-purple-500/50 backdrop-blur-md';

  // Стили для вариантов кнопок
  const variantStyles: Record<GlassButtonVariant, string> = {
    primary: 'bg-glass-bg-hover hover:bg-glass-bg-active active:bg-glass-bg border-glass-border text-slate-100 shadow-glass-sm',
    secondary: 'bg-glass-bg hover:bg-glass-bg-hover active:bg-glass-bg-active border-glass-border text-slate-300',
    accent: 'bg-accent-emerald/20 hover:bg-accent-emerald/30 active:bg-accent-emerald/40 border-accent-emerald/30 text-accent-emerald shadow-glass-sm',
    danger: 'bg-red-600/20 hover:bg-red-600/30 active:bg-red-600/40 border-red-500/30 text-red-200 shadow-glass-sm',
  };

  // Стили для размеров
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const widthStyle = fullWidth ? 'w-full' : '';
  const disabledStyle = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';

  return (
    <motion.button
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${disabledStyle} ${className}`}
      {...motionProps}
    >
      {/* Эффект блика при наведении с помощью абсолютного позиционирования и opacity */}
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
      {children}
    </motion.button>
  );
};
