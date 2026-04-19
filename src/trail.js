/**
 * trail.js — v3: Bright Colorful Mouse Trail
 * 
 * Vệt sáng colorful theo chuột, rõ ràng hơn.
 */

let canvas = null;
let ctx = null;
let particles = [];
let mouseX = 0;
let mouseY = 0;
let lastX = 0;
let lastY = 0;

const TRAIL_CONFIG = {
  maxParticles: 25,
  particleLife: 35,
  baseSize: 4,
  spawnRate: 2,        // Spawn nhiều hơn mỗi frame khi di chuyển
  colors: [
    [168, 85, 247],    // tím
    [236, 72, 153],    // hồng
    [99, 102, 241],    // indigo
    [6, 182, 212],     // cyan
    [251, 146, 60],    // cam
    [52, 211, 153],    // emerald
  ]
};

let frameCount = 0;

function initTrail() {
  canvas = document.getElementById('trail-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY;
    }
  }, { passive: true });
}

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function spawnParticles(x, y, count) {
  for (let s = 0; s < count; s++) {
    if (particles.length >= TRAIL_CONFIG.maxParticles) {
      particles.shift();
    }
    const color = TRAIL_CONFIG.colors[Math.floor(Math.random() * TRAIL_CONFIG.colors.length)];
    particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2 - 0.8,
      size: TRAIL_CONFIG.baseSize + Math.random() * 3,
      life: TRAIL_CONFIG.particleLife,
      maxLife: TRAIL_CONFIG.particleLife,
      r: color[0], g: color[1], b: color[2]
    });
  }
}

function updateTrail() {
  if (!ctx || !canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Spawn khi chuột di chuyển
  const dx = mouseX - lastX;
  const dy = mouseY - lastY;
  const speed = Math.sqrt(dx * dx + dy * dy);

  if (speed > 2) {
    const count = Math.min(Math.floor(speed / 8), TRAIL_CONFIG.spawnRate);
    spawnParticles(mouseX, mouseY, Math.max(count, 1));
  }

  lastX = mouseX;
  lastY = mouseY;

  // Update & draw
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    p.vx *= 0.96;
    p.vy *= 0.96;

    if (p.life <= 0) { particles.splice(i, 1); continue; }

    const progress = p.life / p.maxLife;
    const alpha = progress * 0.7;
    const size = p.size * progress;

    // Outer glow
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 3);
    gradient.addColorStop(0, `rgba(${p.r},${p.g},${p.b},${alpha * 0.4})`);
    gradient.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
    ctx.beginPath();
    ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Core
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
    ctx.fill();

    // Bright center
    ctx.beginPath();
    ctx.arc(p.x, p.y, size * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.6})`;
    ctx.fill();
  }
}

export { initTrail, updateTrail };
