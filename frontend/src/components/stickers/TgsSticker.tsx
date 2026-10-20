// E:\Boltalka\frontend\src\components\stickers\TgsSticker.tsx
import React, { useRef, useState, useEffect } from 'react';

interface TgsStickerProps {
  tgsUrl: string; // URL к файлу .tgs (gzip Lottie)
  width?: number;
  height?: number;
  autoPlay?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  rotation: number;
  vRotation: number;
}

/**
 * Вспомогательная функция для расчета плавности Безье во времени (Cubic Bezier)
 */
const getBezierProgress = (x1: number, y1: number, x2: number, y2: number, t: number): number => {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  
  let tParam = t;
  for (let i = 0; i < 4; i++) {
    const x = ((ax * tParam + bx) * tParam + cx) * tParam;
    const dx = (3 * ax * tParam + 2 * bx) * tParam + cx;
    if (Math.abs(dx) < 1e-6) break;
    tParam -= (x - t) / dx;
  }
  
  return ((ay * tParam + by) * tParam + cy) * tParam;
};

/**
 * Компонент TgsSticker для GPU-ускоренного рендеринга анимированных стикеров .tgs
 * с кэшированием кадров на Canvas и поддержкой плавности 120 FPS.
 */
export const TgsSticker: React.FC<TgsStickerProps> = React.memo(({
  tgsUrl,
  width = 150,
  height = 150,
  autoPlay = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationDataRef = useRef<any>(null);
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const cachedFramesRef = useRef<(HTMLCanvasElement | null)[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка и распаковка .tgs файла
  useEffect(() => {
    let active = true;
    cachedFramesRef.current = []; // сбрасываем кэш при смене URL

    const loadTgs = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(tgsUrl);
        if (!response.ok) {
          throw new Error(`Ошибка загрузки: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        if (!active) return;

        // Распаковка gzip с помощью нативного DecompressionStream
        const stream = new Response(arrayBuffer).body;
        if (!stream) throw new Error('Не удалось прочитать поток данных');

        const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
        const jsonText = await new Response(decompressedStream).text();

        if (active) {
          animationDataRef.current = JSON.parse(jsonText);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Ошибка при загрузке/распаковке TGS:', err);
        if (active) {
          setError((err as Error).message);
          setIsLoading(false);
        }
      }
    };

    loadTgs();

    return () => {
      active = false;
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [tgsUrl]);

  // Запуск цикла анимации
  useEffect(() => {
    if (isLoading || error || !animationDataRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const animation = animationDataRef.current;
    const totalFrames = Math.ceil(animation.op - animation.ip) || 1;
    const frameRate = animation.fr || 60;
    const duration = totalFrames / frameRate;

    // Инициализируем массив кэша кадров
    cachedFramesRef.current = new Array(totalFrames).fill(null);

    const render = (now: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = now;
      }

      const elapsed = (now - startTimeRef.current) / 1000;
      
      // Вычисляем текущий кадр Lottie
      let currentFrame = animation.ip;
      if (autoPlay && duration > 0) {
        currentFrame = animation.ip + ((elapsed * frameRate) % totalFrames);
      }

      const frameIndex = Math.floor(currentFrame - animation.ip) % totalFrames;

      // 1. Очищаем холст
      ctx.clearRect(0, 0, width, height);

      // 2. Рисуем кадр (из кэша или с созданием кэша)
      if (frameIndex >= 0 && frameIndex < totalFrames) {
        let cachedCanvas = cachedFramesRef.current[frameIndex];
        if (!cachedCanvas) {
          cachedCanvas = document.createElement('canvas');
          cachedCanvas.width = width * dpr;
          cachedCanvas.height = height * dpr;
          const cachedCtx = cachedCanvas.getContext('2d');
          if (cachedCtx) {
            cachedCtx.scale(dpr, dpr);
            renderLottieFrame(cachedCtx, animation, currentFrame);
          }
          cachedFramesRef.current[frameIndex] = cachedCanvas;
        }

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // сбрасываем scale, чтобы нарисовать 1-к-1
        ctx.drawImage(cachedCanvas, 0, 0);
        ctx.restore();
      }

      // 3. Обновляем и рисуем частицы (Particle Burst)
      updateAndDrawParticles(ctx);

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      startTimeRef.current = null;
    };
  }, [isLoading, error, width, height, autoPlay]);

  /**
   * Отрисовывает конкретный кадр Lottie на Canvas.
   */
  const renderLottieFrame = (ctx: CanvasRenderingContext2D, animation: any, frame: number) => {
    const layers = animation.layers || [];
    
    // Масштабируем содержимое под размеры холста
    const scaleX = width / (animation.w || 512);
    const scaleY = height / (animation.h || 512);

    ctx.save();
    ctx.scale(scaleX, scaleY);

    // Рисуем слои в обратном порядке (Lottie слои накладываются снизу вверх)
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (layer.ty === 4) { // Shape Layer
        renderShapeLayer(ctx, layer, frame);
      }
    }

    ctx.restore();
  };

  /**
   * Отрисовывает фигуру слоя.
   */
  const renderShapeLayer = (ctx: CanvasRenderingContext2D, layer: any, frame: number) => {
    const shapes = layer.shapes || [];
    shapes.forEach((shape: any) => {
      if (shape.ty === 'gr') { // Group
        renderGroup(ctx, shape, frame);
      }
    });
  };

  /**
   * Отрисовывает группу фигур с учетом трансформаций.
   */
  const renderGroup = (ctx: CanvasRenderingContext2D, group: any, frame: number) => {
    const items = group.it || [];
    let fillStyle = '#000000';
    let strokeStyle = '#000000';
    let hasFill = false;
    let hasStroke = false;
    let lineWidth = 1;
    let transform: any = null;

    // Находим параметры трансформации и стиля в группе
    items.forEach((item: any) => {
      if (item.ty === 'tr') {
        transform = item;
      } else if (item.ty === 'fl') { // Fill
        hasFill = true;
        const colorVal = getLottiePropValue(item.c, frame);
        if (Array.isArray(colorVal)) {
          const r = Math.round((colorVal[0] || 0) * 255);
          const g = Math.round((colorVal[1] || 0) * 255);
          const b = Math.round((colorVal[2] || 0) * 255);
          const a = getLottiePropValue(item.o, frame) / 100;
          fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
        }
      } else if (item.ty === 'st') { // Stroke
        hasStroke = true;
        const colorVal = getLottiePropValue(item.c, frame);
        if (Array.isArray(colorVal)) {
          const r = Math.round((colorVal[0] || 0) * 255);
          const g = Math.round((colorVal[1] || 0) * 255);
          const b = Math.round((colorVal[2] || 0) * 255);
          const a = getLottiePropValue(item.o, frame) / 100;
          strokeStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
        }
        lineWidth = getLottiePropValue(item.w, frame) || 1;
      }
    });

    ctx.save();

    // Применяем трансформацию группы
    if (transform) {
      const pos = getLottiePropValue(transform.p, frame) || [0, 0];
      const scale = getLottiePropValue(transform.s, frame) || [100, 100];
      const rotation = getLottiePropValue(transform.r, frame) || 0;
      const anchor = getLottiePropValue(transform.a, frame) || [0, 0];

      ctx.translate(pos[0], pos[1]);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale[0] / 100, scale[1] / 100);
      ctx.translate(-anchor[0], -anchor[1]);
    }

    // Рисуем пути в группе
    items.forEach((item: any) => {
      if (item.ty === 'sh') { // Shape Path
        let pathData = getLottiePropValue(item.ks, frame);
        if (pathData) {
          // Если значение свойства является массивом (обычный случай для анимированных путей Lottie),
          // берем первый элемент (сам объект пути)
          if (Array.isArray(pathData)) {
            pathData = pathData[0];
          }
          if (pathData && pathData.v) {
            drawLottiePath(ctx, pathData);
            if (hasFill) {
              ctx.fillStyle = fillStyle;
              ctx.fill();
            }
            if (hasStroke) {
              ctx.strokeStyle = strokeStyle;
              ctx.lineWidth = lineWidth;
              ctx.stroke();
            }
          }
        }
      }
    });

    ctx.restore();
  };

  /**
   * Извлекает значение свойства Lottie с учетом анимационных ключей.
   */
  const getLottiePropValue = (prop: any, frame: number): any => {
    if (!prop) return null;
    if (prop.k === undefined) return prop;
    
    // Если свойство не анимировано (просто значение)
    if (!Array.isArray(prop.k) || typeof prop.k[0] !== 'object') {
      return prop.k;
    }

    // Поиск текущего ключевого кадра
    const keyframes = prop.k;
    for (let i = 0; i < keyframes.length - 1; i++) {
      const start = keyframes[i];
      const end = keyframes[i + 1];
      if (frame >= start.t && frame <= end.t) {
        const progress = (frame - start.t) / (end.t - start.t);
        
        let timingProgress = progress;
        if (start.o && start.i) {
          const x1 = Array.isArray(start.o.x) ? start.o.x[0] : (start.o.x ?? 0.4);
          const y1 = Array.isArray(start.o.y) ? start.o.y[0] : (start.o.y ?? 0);
          const x2 = Array.isArray(start.i.x) ? start.i.x[0] : (start.i.x ?? 0.6);
          const y2 = Array.isArray(start.i.y) ? start.i.y[0] : (start.i.y ?? 1);
          timingProgress = getBezierProgress(x1, y1, x2, y2, progress);
        } else {
          // Fallback на плавный ease-in-out
          timingProgress = progress * progress * (3 - 2 * progress);
        }
        
        return interpolateValues(start.s, start.e || start.s, timingProgress);
      }
    }

    // Возврат крайних значений
    if (frame < keyframes[0].t) return keyframes[0].s;
    return keyframes[keyframes.length - 1].s;
  };

  /**
   * Линейная интерполяция чисел, массивов и векторных путей Безье Lottie.
   */
  const interpolateValues = (start: any, end: any, progress: number): any => {
    if (start === null || start === undefined) return end;
    if (end === null || end === undefined) return start;

    // 1. Числа
    if (typeof start === 'number') {
      return start + (end - start) * progress;
    }

    // 2. Пути Безье Lottie: { v, i, o, c }
    if (typeof start === 'object' && 'v' in start && 'v' in end) {
      const v = start.v.map((point: number[], idx: number) => {
        const endPoint = end.v[idx] || point;
        return [
          point[0] + (endPoint[0] - point[0]) * progress,
          point[1] + (endPoint[1] - point[1]) * progress
        ];
      });

      const iCoords = start.i.map((point: number[], idx: number) => {
        const endPoint = end.i[idx] || point;
        return [
          point[0] + (endPoint[0] - point[0]) * progress,
          point[1] + (endPoint[1] - point[1]) * progress
        ];
      });

      const oCoords = start.o.map((point: number[], idx: number) => {
        const endPoint = end.o[idx] || point;
        return [
          point[0] + (endPoint[0] - point[0]) * progress,
          point[1] + (endPoint[1] - point[1]) * progress
        ];
      });

      return {
        v,
        i: iCoords,
        o: oCoords,
        c: start.c
      };
    }

    // 3. Массивы (включая массивы чисел и массивы объектов путей Безье)
    if (Array.isArray(start) && Array.isArray(end)) {
      return start.map((val, idx) => {
        const endVal = end[idx];
        if (typeof val === 'number' && typeof endVal === 'number') {
          return val + (endVal - val) * progress;
        }
        return interpolateValues(val, endVal, progress);
      });
    }

    return start;
  };

  /**
   * Отрисовывает путь Безье Lottie на Canvas.
   */
  const drawLottiePath = (ctx: CanvasRenderingContext2D, pathData: any) => {
    const v = pathData.v; // Вершины
    const i = pathData.i; // Входящие касательные
    const o = pathData.o; // Исходящие касательные
    const closed = pathData.c;

    if (!v || v.length === 0) return;

    ctx.beginPath();
    ctx.moveTo(v[0][0], v[0][1]);

    for (let idx = 1; idx < v.length; idx++) {
      const cp1x = v[idx - 1][0] + o[idx - 1][0];
      const cp1y = v[idx - 1][1] + o[idx - 1][1];
      const cp2x = v[idx][0] + i[idx][0];
      const cp2y = v[idx][1] + i[idx][1];
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, v[idx][0], v[idx][1]);
    }

    if (closed) {
      const cp1x = v[v.length - 1][0] + o[v.length - 1][0];
      const cp1y = v[v.length - 1][1] + o[v.length - 1][1];
      const cp2x = v[0][0] + i[0][0];
      const cp2y = v[0][1] + i[0][1];
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, v[0][0], v[0][1]);
      ctx.closePath();
    }
  };

  /**
   * Создает эффект взрыва частиц (Particle Burst).
   */
  const handleStickerClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'];
    const particleCount = 40;
    const newParticles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      newParticles.push({
        x: clickX,
        y: clickY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2, // Начальный импульс вверх
        radius: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: 0.015 + Math.random() * 0.02,
        rotation: Math.random() * Math.PI * 2,
        vRotation: -0.1 + Math.random() * 0.2
      });
    }

    particlesRef.current = [...particlesRef.current, ...newParticles];
  };

  /**
   * Обновляет физику и отрисовывает частицы взрыва.
   */
  const updateAndDrawParticles = (ctx: CanvasRenderingContext2D) => {
    const particles = particlesRef.current;
    if (particles.length === 0) return;

    const gravity = 0.15;
    const friction = 0.98;

    particlesRef.current = particles
      .map((p) => {
        p.vx *= friction;
        p.vy *= friction;
        p.vy += gravity; // Гравитация
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay; // Затухание
        p.rotation += p.vRotation; // Вращение

        // Отрисовка частицы
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        
        // Рисуем звездочку или ромбик вместо обычного круга для эффектности
        ctx.beginPath();
        ctx.moveTo(0, -p.radius);
        ctx.lineTo(p.radius / 2, -p.radius / 2);
        ctx.lineTo(p.radius, 0);
        ctx.lineTo(p.radius / 2, p.radius / 2);
        ctx.lineTo(0, p.radius);
        ctx.lineTo(-p.radius / 2, p.radius / 2);
        ctx.lineTo(-p.radius, 0);
        ctx.lineTo(-p.radius / 2, -p.radius / 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        return p;
      })
      .filter((p) => p.alpha > 0); // Удаляем невидимые частицы
  };

  if (isLoading) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-center bg-neutral-900/10 border border-white/5 rounded-2xl animate-pulse"
      >
        <span className="text-xs text-neutral-400 font-medium">Загрузка стикера...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-center bg-red-950/20 border border-red-500/10 rounded-2xl p-2 text-center"
      >
        <span className="text-[10px] text-red-400 font-medium break-all">{error}</span>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      onClick={handleStickerClick}
      className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
    />
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.tgsUrl === nextProps.tgsUrl &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.autoPlay === nextProps.autoPlay
  );
});

export default TgsSticker;
