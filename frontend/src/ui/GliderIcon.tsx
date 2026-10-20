import React from 'react';
import { motion } from 'framer-motion';

interface GliderIconProps {
  className?: string;
  theme?: 'dark' | 'light' | 'coffee';
  pulsing?: boolean;
}

export const GliderIcon: React.FC<GliderIconProps> = ({
  className = '',
  theme = 'dark',
  pulsing = true
}) => {
  // Определение основного цвета в зависимости от темы (Cyber Mint & Cyan для темной темы)
  const getBaseColor = () => {
    if (theme === 'light') return '#4F46E5'; // Глубокий индиго
    if (theme === 'coffee') return '#FFB000'; // Янтарный люминофор
    return '#10E7B2'; // Cyber Mint (Linear / Modern Cypherpunk)
  };

  const baseColor = getBaseColor();

  // 3x3 сетка глайдера Конвея
  // 0 1 0
  // 0 0 1
  // 1 1 1
  const gliderGrid = [
    [false, true, false],
    [false, false, true],
    [true, true, true]
  ];

  const renderGliderSVG = (color: string, glow: boolean = false) => {
    return (
      <svg
        viewBox="0 0 16 16"
        className="w-full h-full"
        style={{
          filter: glow ? `drop-shadow(0 0 4px ${color})` : undefined
        }}
      >
        {gliderGrid.map((row, rIdx) =>
          row.map((active, cIdx) => {
            if (!active) return null;
            return (
              <rect
                key={`${rIdx}-${cIdx}`}
                x={cIdx * 5 + 1}
                y={rIdx * 5 + 1}
                width={4}
                height={4}
                rx={0.6}
                fill={color}
              />
            );
          })
        )}
      </svg>
    );
  };

  return (
    <div
      className={`relative select-none flex items-center justify-center ${className}`}
      style={{
        width: '36px',
        height: '36px'
      }}
    >
      {/* Изящная плавная пульсация (мягкие кольца свечения Cyber Mint) */}
      {pulsing && (
        <>
          <motion.div
            className="absolute -inset-1.5 rounded-xl pointer-events-none"
            style={{ border: `1.5px solid ${baseColor}` }}
            animate={{
              scale: [1, 1.35, 1.6],
              opacity: [0.6, 0.2, 0]
            }}
            transition={{
              repeat: Infinity,
              duration: 3,
              ease: 'easeInOut'
            }}
          />
          <motion.div
            className="absolute -inset-1.5 rounded-xl pointer-events-none"
            style={{ border: `1.5px solid ${baseColor}` }}
            animate={{
              scale: [1, 1.35, 1.6],
              opacity: [0.6, 0.2, 0]
            }}
            transition={{
              repeat: Infinity,
              duration: 3,
              ease: 'easeInOut',
              delay: 1.5
            }}
          />
          {/* Мягкое дыхание неонового ореола */}
          <motion.div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              boxShadow: `0 0 16px 2px ${baseColor}40`
            }}
            animate={{
              opacity: [0.35, 0.75, 0.35]
            }}
            transition={{
              repeat: Infinity,
              duration: 2.8,
              ease: 'easeInOut'
            }}
          />
        </>
      )}

      {/* Контейнер иконки */}
      <motion.div
        animate={pulsing ? { scale: [1, 1.04, 1] } : { scale: 1 }}
        transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
        whileHover={{ scale: 1.12 }}
        className="w-full h-full relative overflow-hidden rounded-lg border border-white/10 bg-[#0B0D14]/80 flex items-center justify-center p-1.5 shadow-lg backdrop-blur-sm"
      >
        <div className="w-full h-full flex items-center justify-center">
          {renderGliderSVG(baseColor, true)}
        </div>
      </motion.div>
    </div>
  );
};
