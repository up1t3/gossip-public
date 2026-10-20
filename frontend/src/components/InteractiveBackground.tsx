import React, { useEffect, useRef } from 'react';

interface InteractiveBackgroundProps {
  theme: 'dark' | 'light' | 'coffee';
}

export const InteractiveBackground: React.FC<InteractiveBackgroundProps> = React.memo(({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
    }> = [];

    const resizeCanvas = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const getColors = () => {
      switch (theme) {
        case 'light':
          return {
            particleColors: ['rgba(0, 122, 255, 0.35)', 'rgba(255, 149, 0, 0.35)', 'rgba(0, 188, 212, 0.35)'],
            lineColor: 'rgba(0, 122, 255, 0.04)',
            mouseLineColor: 'rgba(255, 149, 0, 0.12)',
          };
        case 'coffee':
          return {
            particleColors: ['rgba(213, 206, 163, 0.4)', 'rgba(188, 163, 116, 0.4)', 'rgba(229, 229, 203, 0.4)'],
            lineColor: 'rgba(213, 206, 163, 0.05)',
            mouseLineColor: 'rgba(188, 163, 116, 0.15)',
          };
        case 'dark':
        default:
          return {
            particleColors: ['rgba(15, 157, 88, 0.35)', 'rgba(168, 85, 247, 0.35)', 'rgba(0, 245, 255, 0.35)'],
            lineColor: 'rgba(15, 157, 88, 0.05)',
            mouseLineColor: 'rgba(168, 85, 247, 0.14)',
          };
      }
    };

    const initParticles = () => {
      if (!canvas) return;
      particles = [];
      const colors = getColors().particleColors;
      const count = Math.min(Math.floor((canvas.width * canvas.height) / 35000), 40);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          radius: Math.random() * 1.8 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    const animate = () => {
      if (!canvas || !ctx) return;
      const colors = getColors();
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        
        p1.x += p1.vx;
        p1.y += p1.vy;

        if (p1.x < 0 || p1.x > canvas.width) p1.vx *= -1;
        if (p1.y < 0 || p1.y > canvas.height) p1.vy *= -1;

        if (mouseRef.current.active) {
          const dx = mouseRef.current.x - p1.x;
          const dy = mouseRef.current.y - p1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 200;
          if (dist < maxDist) {
            const force = (maxDist - dist) / maxDist;
            // Легкое притяжение к курсору
            p1.x += (dx / dist) * force * 0.25;
            p1.y += (dy / dist) * force * 0.25;
            
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
            ctx.strokeStyle = colors.mouseLineColor;
            ctx.lineWidth = force * 0.8;
            ctx.stroke();
          }
        }

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = colors.lineColor;
            ctx.lineWidth = ((130 - dist) / 130) * 0.6;
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = p1.color;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-80"
    />
  );
});
