import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export interface GlassCardProps extends HTMLMotionProps<'div'> {
  interactive?: boolean;
  glow?: boolean;
  glowColor?: string;
  children: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  interactive = false,
  glow = false,
  glowColor = 'rgba(168, 85, 247, 0.15)', // Пурпурный по умолчанию
  className = '',
  children,
  ...props
}) => {
  const baseStyle = 'relative overflow-hidden rounded-2xl border border-glass-border bg-obsidian-card backdrop-blur-xl shadow-glass-md';
  
  // Дополнительные стили для интерактивных карточек
  const interactiveStyles = interactive 
    ? 'hover:border-glass-border-focus transition-colors duration-300' 
    : '';

  return (
    <motion.div
      {...(interactive ? {
        whileHover: { y: -4, scale: 1.005 },
        transition: { type: 'spring', stiffness: 300, damping: 20 }
      } : {})}
      className={`${baseStyle} ${interactiveStyles} ${className}`}
      style={{
        boxShadow: glow ? `0 0 40px -10px ${glowColor}, 0 8px 32px 0 rgba(0, 0, 0, 0.3)` : undefined,
        ...props.style
      }}
      {...props}
    >
      {/* Декоративное свечение на бэкграунде для карточек со свечением */}
      {glow && (
        <div 
          className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: glowColor }}
        />
      )}
      <div className={`relative z-10 w-full h-full min-h-0 ${className.includes('flex-col') ? 'flex-1 flex flex-col' : ''}`}>
        {children}
      </div>
    </motion.div>
  );
};
