// frontend/src/components/ui/AvatarCropModal.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCw, RotateCcw, Check, Sparkles, RefreshCw, ImagePlus, AlertCircle, Loader2 } from 'lucide-react';
import { GlassButton } from '../../ui';
import { loadImageForCropping } from '../../utils/imageOptimizer';

export interface AvatarCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob, previewUrl: string) => void;
  onImageChange?: (newImageSrc: string) => void;
  title?: string;
  theme?: 'dark' | 'light' | 'coffee';
}

const VIEWPORT_SIZE = 280; // Размер видимой области кадрирования в пикселях

/**
 * Telegram-Style Avatar Cropper & Editor Modal (Пиксельно точный и отказоустойчивый)
 * - Круглая маска кадрирования 1:1
 * - Перетаскивание (Pan / Drag) пальцем или мышью
 * - Масштабирование (Zoom slider, колесико мыши, pinch-to-zoom двумя пальцами)
 * - Поворот на 90° по и против часовой стрелки
 * - Быстрая смена фото прямо из кроппера («Выбрать другое фото»)
 * - Автоматический CORS-fallback и защита от черного экрана
 * - Экспорт в оптимизированный JPEG 512x512 px с гарантированным совпадением превью
 * - Полная поддержка тем оформления: Dark, Light, Coffee
 */
export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  onImageChange,
  title = 'Редактирование аватара',
  theme = 'dark',
}) => {
  // Параметры трансформации изображения
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(imageSrc);

  // Исходные и базовые размеры изображения
  const [imgDimensions, setImgDimensions] = useState<{
    naturalWidth: number;
    naturalHeight: number;
    baseWidth: number;
    baseHeight: number;
  } | null>(null);

  // Ссылки на DOM и жесты
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1);

  // Синхронизация внешнего imageSrc
  useEffect(() => {
    setCurrentSrc(imageSrc);
  }, [imageSrc]);

  // Загрузка и расчет пропорций изображения с отказоустойчивым CORS-fallback
  useEffect(() => {
    if (!isOpen || !currentSrc) {
      setImgDimensions(null);
      setIsImageLoading(false);
      return;
    }

    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
    setIsImageLoading(true);
    setLoadError(false);

    let isMounted = true;

    const setupDimensions = (nw: number, nh: number) => {
      if (!isMounted) return;
      const validW = nw > 0 ? nw : VIEWPORT_SIZE;
      const validH = nh > 0 ? nh : VIEWPORT_SIZE;
      const baseScale = Math.max(VIEWPORT_SIZE / validW, VIEWPORT_SIZE / validH);
      const baseWidth = Math.round(validW * baseScale);
      const baseHeight = Math.round(validH * baseScale);

      setImgDimensions({
        naturalWidth: validW,
        naturalHeight: validH,
        baseWidth,
        baseHeight,
      });
      setIsImageLoading(false);
      setLoadError(false);
    };

    // Предзагрузка через Image API
    const isDataOrBlob = currentSrc.startsWith('data:') || currentSrc.startsWith('blob:');
    const img = new Image();
    if (!isDataOrBlob) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      setupDimensions(img.naturalWidth, img.naturalHeight);
    };

    img.onerror = () => {
      // Fallback без crossOrigin
      if (!isDataOrBlob) {
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          setupDimensions(fallbackImg.naturalWidth, fallbackImg.naturalHeight);
        };
        fallbackImg.onerror = () => {
          if (!isMounted) return;
          console.warn('[AvatarCropModal] Не удалось загрузить изображение через fallback:', currentSrc);
          setIsImageLoading(false);
          setLoadError(true);
        };
        fallbackImg.src = currentSrc;
      } else {
        if (!isMounted) return;
        setIsImageLoading(false);
        setLoadError(true);
      }
    };

    img.src = currentSrc;

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentSrc]);

  // Обработчик события onLoad у DOM элемента img
  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth || 1;
    const nh = img.naturalHeight || 1;
    const baseScale = Math.max(VIEWPORT_SIZE / nw, VIEWPORT_SIZE / nh);
    const baseWidth = Math.round(nw * baseScale);
    const baseHeight = Math.round(nh * baseScale);

    setImgDimensions({
      naturalWidth: nw,
      naturalHeight: nh,
      baseWidth,
      baseHeight,
    });
    setIsImageLoading(false);
    setLoadError(false);
  };

  const handleImageError = () => {
    if (!imgDimensions) {
      setLoadError(true);
      setIsImageLoading(false);
    }
  };

  // Выбор нового файла прямо из модалки
  const handleTriggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImageLoading(true);
      const dataUrl = await loadImageForCropping(file);
      setCurrentSrc(dataUrl);
      if (onImageChange) {
        onImageChange(dataUrl);
      }
    } catch (err) {
      console.error('[AvatarCropModal] Ошибка чтения выбранного файла:', err);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Расчет расстояния между пальцами для Pinch-zoom
  const getTouchesDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Обработчики сенсорных жестов (Touch)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      pinchStartDistanceRef.current = getTouchesDistance(e.touches);
      pinchStartScaleRef.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1 && isDragging) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && pinchStartDistanceRef.current !== null) {
      const currentDist = getTouchesDistance(e.touches);
      if (currentDist > 0 && pinchStartDistanceRef.current > 0) {
        const factor = currentDist / pinchStartDistanceRef.current;
        const newScale = Math.min(Math.max(0.5, pinchStartScaleRef.current * factor), 4.0);
        setScale(newScale);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    pinchStartDistanceRef.current = null;
  };

  // Обработчики мыши (Pointer)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' || !isDragging) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    setIsDragging(false);
  };

  // Масштабирование колесиком мыши
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => Math.min(Math.max(0.5, Number((prev + delta).toFixed(2))), 4.0));
  };

  // Поворот на 90 градусов
  const handleRotate = (direction: 'cw' | 'ccw' = 'cw') => {
    setRotation((prev) => (direction === 'cw' ? (prev + 90) % 360 : (prev - 90 + 360) % 360));
  };

  // Сброс к исходному положению
  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  // Завершение кадрирования и генерация Blob с точным математическим соответствием
  const handleConfirmCrop = useCallback(async () => {
    if (!currentSrc) return;
    setIsProcessing(true);

    try {
      const cropSize = 512; // Итоговое высокое разрешение аватара 512x512
      const canvas = document.createElement('canvas');
      canvas.width = cropSize;
      canvas.height = cropSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Не удалось инициализировать 2D контекст Canvas');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Коэффициент пересчета координат видоискателя (280px) в Canvas (512px)
      const R = cropSize / VIEWPORT_SIZE;

      // 1. Смещаем центр холста
      ctx.translate(cropSize / 2, cropSize / 2);

      // 2. Применяем сдвиг пользователя с пересчетом масштаба
      ctx.translate(position.x * R, position.y * R);

      // 3. Применяем поворот вокруг центра
      ctx.rotate((rotation * Math.PI) / 180);

      // 4. Применяем масштаб зума
      ctx.scale(scale, scale);

      // Отрисовываем изображение
      const baseW = imgDimensions ? imgDimensions.baseWidth : VIEWPORT_SIZE;
      const baseH = imgDimensions ? imgDimensions.baseHeight : VIEWPORT_SIZE;
      const drawW = baseW * R;
      const drawH = baseH * R;

      const imgToDraw = imageRef.current || new Image();
      if (!imageRef.current) {
        imgToDraw.src = currentSrc;
      }

      ctx.drawImage(
        imgToDraw,
        -drawW / 2,
        -drawH / 2,
        drawW,
        drawH
      );

      // Экспортируем в оптимизированный JPEG
      try {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const previewUrl = URL.createObjectURL(blob);
              onCropComplete(blob, previewUrl);
              setIsProcessing(false);
              onClose();
            } else {
              throw new Error('Ошибка генерации Blob из Canvas');
            }
          },
          'image/jpeg',
          0.92
        );
      } catch (canvasExportErr) {
        console.warn('[AvatarCropModal] Прямой экспорт canvas вызвал ошибку (tainted), используем fallback:', canvasExportErr);
        // Fallback: загрузка исходного блоба
        const res = await fetch(currentSrc);
        const fallbackBlob = await res.blob();
        const previewUrl = URL.createObjectURL(fallbackBlob);
        onCropComplete(fallbackBlob, previewUrl);
        setIsProcessing(false);
        onClose();
      }
    } catch (err) {
      console.error('[AvatarCropModal] Ошибка кадрирования:', err);
      setIsProcessing(false);
    }
  }, [currentSrc, imgDimensions, onCropComplete, onClose, position, scale, rotation]);

  // Цветовые токены для тем оформления
  const isLight = theme === 'light';
  const isCoffee = theme === 'coffee';

  const modalBgClass = isLight
    ? 'bg-white/95 border border-slate-200 text-slate-900 shadow-2xl backdrop-blur-2xl'
    : isCoffee
      ? 'bg-[#1C140E]/95 border border-[#D5CEA3]/25 text-[#E5E5CB] shadow-2xl backdrop-blur-2xl'
      : 'bg-[#0F111A]/95 border border-white/10 text-slate-100 shadow-2xl backdrop-blur-2xl';

  const maskBorderClass = isLight
    ? 'border-blue-600 shadow-[0_0_0_9999px_rgba(255,255,255,0.7)]'
    : isCoffee
      ? 'border-[#D5CEA3] shadow-[0_0_0_9999px_rgba(28,20,14,0.75)]'
      : 'border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.75)]';

  const iconAccentClass = isLight ? 'text-blue-600' : isCoffee ? 'text-[#D5CEA3]' : 'text-emerald-400';
  const sliderAccentClass = isLight ? 'accent-blue-600' : isCoffee ? 'accent-[#D5CEA3]' : 'accent-emerald-500';

  if (!isOpen || !currentSrc) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
        {/* Скрытый инпут для выбора другого файла */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept="image/*,image/heic,image/heif"
          className="hidden"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className={`w-full max-w-md rounded-3xl overflow-hidden flex flex-col ${modalBgClass}`}
        >
          {/* Шапка модалки */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Sparkles className={`w-4 h-4 ${iconAccentClass}`} />
              <h3 className="text-sm font-bold tracking-wide">{title}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Интерактивная область кадрирования с круглой маской */}
          <div className="p-6 flex flex-col items-center justify-center">
            <div
              ref={containerRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onWheel={handleWheel}
              style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
              className="relative rounded-full overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing touch-none bg-black/40 shadow-inner"
            >
              {/* Индикатор загрузки */}
              {isImageLoading && !imgDimensions && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 z-20">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                  <span className="text-xs text-slate-300">Загрузка фото...</span>
                </div>
              )}

              {/* Сообщение об ошибке загрузки */}
              {loadError && !imgDimensions && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 gap-3 bg-black/70 z-20 text-center">
                  <AlertCircle className="w-8 h-8 text-amber-400" />
                  <span className="text-xs text-slate-200">Не удалось загрузить фото</span>
                  <button
                    type="button"
                    onClick={handleTriggerFileInput}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg active:scale-95"
                  >
                    <ImagePlus className="w-4 h-4" />
                    <span>Выбрать из галереи</span>
                  </button>
                </div>
              )}

              {/* Фоновое перемещаемое и масштабируемое изображение */}
              <div
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                  transition: isDragging ? 'none' : 'transform 0.08s ease-out',
                }}
                className="pointer-events-none flex items-center justify-center flex-shrink-0"
              >
                <img
                  ref={imageRef}
                  src={currentSrc}
                  alt="Avatar to crop"
                  onLoad={handleImageLoaded}
                  onError={handleImageError}
                  draggable={false}
                  crossOrigin={currentSrc.startsWith('data:') || currentSrc.startsWith('blob:') ? undefined : 'anonymous'}
                  style={
                    imgDimensions
                      ? {
                          width: `${imgDimensions.baseWidth}px`,
                          height: `${imgDimensions.baseHeight}px`,
                          maxWidth: 'none',
                          maxHeight: 'none',
                          opacity: 1,
                        }
                      : { maxWidth: `${VIEWPORT_SIZE}px`, maxHeight: `${VIEWPORT_SIZE}px`, opacity: imgDimensions ? 1 : 0.8 }
                  }
                  className="select-none pointer-events-none"
                />
              </div>

              {/* Круглая маска и контур видоискателя */}
              <div
                className={`absolute inset-0 rounded-full border-2 pointer-events-none ${maskBorderClass}`}
              />

              {/* Сетка третей для идеальной центровки лица */}
              <div className="absolute inset-0 rounded-full pointer-events-none opacity-20 grid grid-cols-3 grid-rows-3">
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-white" />
                <div className="border-r border-white" />
                <div />
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-3 text-center">
              Перетаскивайте фото и настраивайте масштаб
            </p>
          </div>

          {/* Панель инструментов: Масштаб, Поворот, Выбрать другое фото, Сброс */}
          <div className="px-6 py-3 bg-white/2 border-t border-white/5 flex flex-col gap-3">
            {/* Ползунок масштабирования (Zoom Slider) */}
            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={() => setScale((prev) => Math.max(0.5, Number((prev - 0.2).toFixed(2))))}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                title="Уменьшить"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0.5"
                max="3.5"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className={`flex-grow h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer ${sliderAccentClass}`}
              />
              <button
                type="button"
                onClick={() => setScale((prev) => Math.min(3.5, Number((prev + 0.2).toFixed(2))))}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                title="Увеличить"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-slate-400 w-9 text-right">
                {Math.round(scale * 100)}%
              </span>
            </div>

            {/* Кнопки поворота, выбора другого фото и сброса */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRotate('ccw')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 transition-all active:scale-95 border border-white/5"
                  title="Повернуть против часовой стрелки"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>-90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRotate('cw')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 transition-all active:scale-95 border border-white/5"
                  title="Повернуть по часовой стрелке"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>+90°</span>
                </button>

                <button
                  type="button"
                  onClick={handleTriggerFileInput}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-emerald-400 transition-all active:scale-95 border border-emerald-500/20"
                  title="Выбрать другое фото из галереи"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span>Выбрать другое</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-white/5 text-xs text-slate-400 hover:text-slate-200 transition-all"
                title="Сбросить все параметры"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Сброс</span>
              </button>
            </div>
          </div>

          {/* Подвал с кнопками Отмена / Сохранить */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5 bg-black/20">
            <GlassButton
              variant="secondary"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-medium"
            >
              Отмена
            </GlassButton>
            <GlassButton
              variant="primary"
              onClick={handleConfirmCrop}
              disabled={isProcessing}
              className="px-5 py-2 text-xs font-medium flex items-center gap-1.5 shadow-glass-sm"
            >
              {isProcessing ? (
                <span>Сохранение...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Применить</span>
                </>
              )}
            </GlassButton>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
