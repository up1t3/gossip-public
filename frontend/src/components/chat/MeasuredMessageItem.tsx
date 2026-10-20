import React, { useEffect, useRef } from 'react';

interface MeasuredMessageItemProps {
  id: string | number;
  onResize: (id: string | number, height: number) => void;
  children: React.ReactNode;
}

/**
 * Компонент-обертка для измерения высоты элемента сообщения с помощью ResizeObserver.
 */
export const MeasuredMessageItem: React.FC<MeasuredMessageItemProps> = React.memo(({ id, onResize, children }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        if (height > 0) {
          onResize(id, height);
        }
      }
    });

    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [id, onResize]);

  return <div ref={ref}>{children}</div>;
});
