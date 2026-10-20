// frontend/src/components/network/RadarCanvas.tsx

import React, { useEffect, useRef } from 'react';
import i18n from '../../i18n/config';
import { MeshPeer } from '../../core/mesh/offline-mesh-manager';

interface RadarCanvasProps {
  peers: MeshPeer[];
  isScanning: boolean;
  selectedPeerId?: string | null;
  onSelectPeer?: (peer: MeshPeer) => void;
  className?: string;
  localNodeId?: string;
  theme?: 'dark' | 'light' | 'coffee';
}

export const RadarCanvas: React.FC<RadarCanvasProps> = ({
  peers,
  isScanning,
  selectedPeerId,
  onSelectPeer,
  className = '',
  localNodeId = 'me',
  theme = 'dark',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const angleRef = useRef<number>(0);
  const pulseRadiusRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isMounted = true;

    const render = () => {
      if (!isMounted) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      if (width === 0 || height === 0) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.max(10, Math.min(centerX, centerY) - 18);

      // 1. Очистка фона
      ctx.clearRect(0, 0, width, height);

      // Фон радара с глубоким радиальным градиентом в зависимости от темы
      const bgGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
      if (theme === 'coffee') {
        bgGrad.addColorStop(0, 'rgba(213, 206, 163, 0.12)');
        bgGrad.addColorStop(0.5, 'rgba(160, 120, 70, 0.05)');
        bgGrad.addColorStop(1, 'rgba(26, 18, 11, 0.95)');
      } else if (theme === 'light') {
        bgGrad.addColorStop(0, 'rgba(37, 99, 235, 0.08)');
        bgGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.03)');
        bgGrad.addColorStop(1, 'rgba(248, 250, 252, 0.95)');
      } else {
        bgGrad.addColorStop(0, 'rgba(147, 51, 234, 0.08)');
        bgGrad.addColorStop(0.5, 'rgba(79, 70, 229, 0.04)');
        bgGrad.addColorStop(1, 'rgba(5, 5, 12, 0.85)');
      }
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Концентрические кольца радара с разметкой дистанции
      const ringSteps = [0.25, 0.5, 0.75, 1.0];
      const maxMeters = 15;

      const outerRingColor = 
        theme === 'coffee' 
          ? 'rgba(213, 206, 163, 0.45)' 
          : theme === 'light' 
          ? 'rgba(37, 99, 235, 0.4)' 
          : 'rgba(168, 85, 247, 0.4)';

      ringSteps.forEach((step, idx) => {
        const r = maxRadius * step;
        ctx.strokeStyle = idx === 3 ? outerRingColor : (theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.07)');
        ctx.lineWidth = idx === 3 ? 1.5 : 1;
        ctx.setLineDash(idx === 3 ? [] : [3, 4]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();

        // Подписи расстояния (например, ~3.8м, ~7.5м, ~11.2м, 15м)
        if (idx >= 0) {
          ctx.fillStyle = theme === 'light' ? 'rgba(100, 116, 139, 0.75)' : (theme === 'coffee' ? 'rgba(213, 206, 163, 0.65)' : 'rgba(148, 163, 184, 0.55)');
          ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
          const label = `${(step * maxMeters).toFixed(0)}m`;
          ctx.fillText(label, centerX + 5, centerY - r + 10);
        }
      });
      ctx.setLineDash([]);

      // 3. Перекрестие осей радара с засечками
      ctx.strokeStyle = theme === 'light' ? 'rgba(0, 0, 0, 0.07)' : 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX - maxRadius, centerY);
      ctx.lineTo(centerX + maxRadius, centerY);
      ctx.moveTo(centerX, centerY - maxRadius);
      ctx.lineTo(centerX, centerY + maxRadius);
      ctx.stroke();

      // Угловые засечки (45, 135, 225, 315 градусов)
      ctx.strokeStyle = theme === 'coffee' ? 'rgba(213, 206, 163, 0.25)' : (theme === 'light' ? 'rgba(37, 99, 235, 0.18)' : 'rgba(168, 85, 247, 0.15)');
      const diagR = maxRadius * 0.95;
      const angles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
      angles.forEach((a) => {
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(a) * (diagR - 8), centerY + Math.sin(a) * (diagR - 8));
        ctx.lineTo(centerX + Math.cos(a) * diagR, centerY + Math.sin(a) * diagR);
        ctx.stroke();
      });

      // 4. Пульсирующая волна при сканировании эфира
      if (isScanning) {
        pulseRadiusRef.current = (pulseRadiusRef.current + 1.4) % maxRadius;
        const pulseAlpha = Math.max(0, 1 - pulseRadiusRef.current / maxRadius) * 0.5;
        ctx.strokeStyle = 
          theme === 'coffee' 
            ? `rgba(213, 206, 163, ${pulseAlpha})` 
            : theme === 'light' 
            ? `rgba(37, 99, 235, ${pulseAlpha})` 
            : `rgba(168, 85, 247, ${pulseAlpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadiusRef.current, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 5. Вращающийся секторный луч сканера
      angleRef.current = (angleRef.current + (isScanning ? 0.035 : 0.018)) % (Math.PI * 2);
      const sweepAngle = angleRef.current;

      const sweepGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
      if (theme === 'coffee') {
        sweepGrad.addColorStop(0, 'rgba(213, 206, 163, 0.32)');
        sweepGrad.addColorStop(1, 'rgba(180, 140, 80, 0.0)');
      } else if (theme === 'light') {
        sweepGrad.addColorStop(0, 'rgba(37, 99, 235, 0.28)');
        sweepGrad.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
      } else {
        sweepGrad.addColorStop(0, 'rgba(168, 85, 247, 0.28)');
        sweepGrad.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
      }

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, maxRadius, sweepAngle - 0.45, sweepAngle);
      ctx.closePath();
      ctx.fillStyle = sweepGrad;
      ctx.fill();

      // Линия фронта луча
      ctx.strokeStyle = 
        theme === 'coffee' 
          ? 'rgba(229, 224, 194, 0.95)' 
          : theme === 'light' 
          ? 'rgba(37, 99, 235, 0.9)' 
          : 'rgba(192, 132, 252, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(sweepAngle) * maxRadius, centerY + Math.sin(sweepAngle) * maxRadius);
      ctx.stroke();
      ctx.restore();

      // 6. Отрисовка обнаруженных устройств (Peers)
      peers.forEach((peer) => {
        const isSelected = selectedPeerId === peer.id;
        // Нормализация дистанции от 0.15 (вплотную) до 1.0 (край диапазона 15м)
        const normalizedDist = Math.min(0.96, Math.max(0.18, peer.distanceMeters / maxMeters));
        const peerR = normalizedDist * maxRadius;
        const rad = (peer.angleDeg * Math.PI) / 180;
        const px = centerX + Math.cos(rad) * peerR;
        const py = centerY + Math.sin(rad) * peerR;

        // Цвет в зависимости от мощности сигнала (RSSI)
        let mainColor = '#10b981'; // Зеленый (отличный сигнал > -60 dBm)
        let glowColor = 'rgba(16, 185, 129, ';
        if (peer.rssi < -78) {
          mainColor = theme === 'coffee' ? '#D5CEA3' : (theme === 'light' ? '#2563eb' : '#a855f7');
          glowColor = theme === 'coffee' ? 'rgba(213, 206, 163, ' : (theme === 'light' ? 'rgba(37, 99, 235, ' : 'rgba(168, 85, 247, ');
        } else if (peer.rssi < -65) {
          mainColor = '#38bdf8'; // Синий/голубой (средний сигнал)
          glowColor = 'rgba(56, 189, 248, ';
        }

        // Если выбран — рисуем прицельную рамку
        if (isSelected) {
          ctx.strokeStyle = theme === 'coffee' ? '#E5E0C2' : (theme === 'light' ? '#1d4ed8' : '#c084fc');
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px, py, 11, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(px - 14, py);
          ctx.lineTo(px - 9, py);
          ctx.moveTo(px + 9, py);
          ctx.lineTo(px + 14, py);
          ctx.moveTo(px, py - 14);
          ctx.lineTo(px, py - 9);
          ctx.moveTo(px, py + 9);
          ctx.lineTo(px, py + 14);
          ctx.stroke();
        }

        // Свечение пира
        const glowGrad = ctx.createRadialGradient(px, py, 0, px, py, 14);
        glowGrad.addColorStop(0, glowColor + '0.9)');
        glowGrad.addColorStop(0.5, glowColor + '0.25)');
        glowGrad.addColorStop(1, glowColor + '0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.fill();

        // Точка пира
        ctx.fillStyle = isSelected ? '#ffffff' : mainColor;
        ctx.beginPath();
        ctx.arc(px, py, isSelected ? 4.5 : 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Подпись имени и дистанции
        ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(241, 245, 249, 0.95)';
        ctx.font = 'bold 9.5px system-ui, -apple-system, sans-serif';
        const displayName = peer.name.length > 18 ? peer.name.substring(0, 16) + '…' : peer.name;
        ctx.fillText(displayName, px + 8, py - 2);

        ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
        ctx.font = '8px system-ui, -apple-system, sans-serif';
        const unitM = i18n.t('transports:shield.unit_m', 'м');
        ctx.fillText(`~${peer.distanceMeters.toFixed(1)}${unitM} • ${peer.rssi}dBm`, px + 8, py + 8);
      });

      // 7. Центральный маяк ("Вы / Локальный узел")
      const centerGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 12);
      centerGlow.addColorStop(0, 'rgba(168, 85, 247, 1)');
      centerGlow.addColorStop(0.5, 'rgba(147, 51, 234, 0.4)');
      centerGlow.addColorStop(1, 'rgba(147, 51, 234, 0)');
      ctx.fillStyle = centerGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(192, 132, 252, 0.85)';
      ctx.font = 'bold 8.5px ui-monospace, SFMono-Regular, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(i18n.t('transports:shield.radar_you', 'ВЫ'), centerX, centerY + 14);
      ctx.textAlign = 'start';

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [peers, isScanning, selectedPeerId, localNodeId]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSelectPeer || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const maxRadius = Math.max(10, Math.min(centerX, centerY) - 18);
    const maxMeters = 15;

    for (const peer of peers) {
      const normalizedDist = Math.min(0.96, Math.max(0.18, peer.distanceMeters / maxMeters));
      const peerR = normalizedDist * maxRadius;
      const rad = (peer.angleDeg * Math.PI) / 180;
      const px = centerX + Math.cos(rad) * peerR;
      const py = centerY + Math.sin(rad) * peerR;

      const dist = Math.hypot(clickX - px, clickY - py);
      if (dist < 22) {
        onSelectPeer(peer);
        return;
      }
    }
  };

  return (
    <div className={`relative w-full aspect-square max-w-[300px] sm:max-w-[340px] mx-auto rounded-3xl overflow-hidden shadow-glass-inner border border-white/10 bg-black/40 backdrop-blur-xl ${className}`}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full cursor-crosshair block"
      />
    </div>
  );
};
