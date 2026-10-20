interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

let globalCanvas: HTMLCanvasElement | null = null;
let globalCtx: CanvasRenderingContext2D | null = null;
let globalParticles: Particle[] = [];
let animationFrameId: number | null = null;

const initCanvas = () => {
  if (globalCanvas) return;
  
  globalCanvas = document.createElement('canvas');
  globalCanvas.style.position = 'fixed';
  globalCanvas.style.top = '0';
  globalCanvas.style.left = '0';
  globalCanvas.style.width = '100vw';
  globalCanvas.style.height = '100vh';
  globalCanvas.style.pointerEvents = 'none';
  globalCanvas.style.zIndex = '9999';
  document.body.appendChild(globalCanvas);

  globalCtx = globalCanvas.getContext('2d');

  const resizeCanvas = () => {
    if (globalCanvas) {
      globalCanvas.width = window.innerWidth;
      globalCanvas.height = window.innerHeight;
    }
  };
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
};

const updateAndRender = () => {
  if (!globalCanvas || !globalCtx) return;

  globalCtx.clearRect(0, 0, globalCanvas.width, globalCanvas.height);
  let active = false;

  globalParticles.forEach((p) => {
    if (p.opacity <= 0) return;
    active = true;

    // Физика: гравитация и сопротивление воздуха
    p.vy += 0.25; // гравитация
    p.vx *= 0.98; // сопротивление воздуха
    p.vy *= 0.98;

    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.rotationSpeed;
    p.opacity -= 0.015; // постепенное угасание

    if (p.opacity > 0 && globalCtx) {
      globalCtx.save();
      globalCtx.translate(p.x, p.y);
      globalCtx.rotate(p.rotation);
      globalCtx.fillStyle = p.color;
      globalCtx.globalAlpha = p.opacity;

      // Рисуем прямоугольник конфетти
      globalCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size / 2);
      globalCtx.restore();
    }
  });

  // Отфильтруем уже неактивные частицы, чтобы не забивать массив
  globalParticles = globalParticles.filter(p => p.opacity > 0);

  if (active) {
    animationFrameId = requestAnimationFrame(updateAndRender);
  } else {
    animationFrameId = null;
    if (globalCanvas && globalCtx) {
      globalCtx.clearRect(0, 0, globalCanvas.width, globalCanvas.height);
    }
  }
};

export const launchConfetti = (startX: number, startY: number) => {
  initCanvas();

  const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  // Создаем 60 частиц для красивого взрыва и добавляем их в общий массив
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 8 + 4;
    globalParticles.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - Math.random() * 3, // немного вверх
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 6,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      opacity: 1
    });
  }

  // Запускаем цикл анимации, если он еще не запущен
  if (!animationFrameId) {
    animationFrameId = requestAnimationFrame(updateAndRender);
  }
};

