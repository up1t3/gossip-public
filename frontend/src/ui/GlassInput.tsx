import React, { useState } from 'react';
import { motion } from 'framer-motion';

export interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
}

export const GlassInput: React.FC<GlassInputProps> = ({
  label,
  icon,
  className = '',
  id,
  value,
  onChange,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && value.toString().length > 0;

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  return (
    <div className={`relative flex flex-col w-full ${className}`}>
      <div
        className={`
          relative flex items-center w-full rounded-xl border transition-all duration-300 backdrop-blur-md
          ${isFocused 
            ? 'border-accent-emerald/50 bg-glass-bg-hover shadow-[0_0_15px_var(--focus-glow-color)]' 
            : 'border-glass-border bg-glass-bg hover:bg-glass-bg-hover'
          }
        `}
      >
        {icon && (
          <div className="pl-3.5 text-slate-400 flex items-center justify-center pointer-events-none">
            {icon}
          </div>
        )}

        <div className="relative flex-grow h-11">
          {/* Интерактивный анимированный плейсхолдер */}
          {label && (
            <motion.label
              htmlFor={id}
              initial={false}
              animate={{
                y: (isFocused || hasValue) ? -8 : 0,
                scale: (isFocused || hasValue) ? 0.75 : 1,
                x: (isFocused || hasValue) ? (icon ? -8 : -4) : 0,
                color: isFocused ? 'var(--accent-color)' : 'var(--text-slate-400)'
              }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`absolute left-0 top-3 pointer-events-none origin-left text-sm ${icon ? 'pl-2' : 'pl-3.5'}`}
            >
              {label}
            </motion.label>
          )}

          <input
            id={id}
            value={value}
            onChange={onChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={`
              w-full bg-transparent border-none outline-none text-slate-100 text-sm px-3.5
              placeholder-transparent focus:ring-0
              ${label ? 'absolute bottom-1 h-6 pt-0.5' : 'h-full'}
              ${icon ? 'pl-2' : ''}
            `}
            {...props}
          />
        </div>
      </div>
    </div>
  );
};
