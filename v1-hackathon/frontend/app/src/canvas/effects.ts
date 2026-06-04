/**
 * Effects Canvas — 60fps animated layer
 * 
 * Renders continuously via requestAnimationFrame:
 * - Shooting stars (max 2 active, spawn every 3-8s)
 * - 50 twinkling stars (sinusoidal opacity)
 * - 20 cosmic dust particles (slow drift)
 */

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  length: number;
  brightness: number;
}

interface TwinkleStar {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
  baseAlpha: number;
}

interface DustParticle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  hue: number;
}

export class EffectsRenderer {
  private shootingStars: ShootingStar[] = [];
  private twinkleStars: TwinkleStar[] = [];
  private dustParticles: DustParticle[] = [];
  private lastShootingStarTime = 0;
  private nextSpawnDelay = 3000;
  private animFrameId = 0;
  private width = 0;
  private height = 0;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private startTime = 0;

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.startTime = performance.now();
    this.lastShootingStarTime = this.startTime;
    this.nextSpawnDelay = 3000 + Math.random() * 5000;

    // Init 50 twinkling stars
    this.twinkleStars = [];
    for (let i = 0; i < 50; i++) {
      this.twinkleStars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        r: 0.5 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 2,
        baseAlpha: 0.3 + Math.random() * 0.5,
      });
    }

    // Init 20 cosmic dust particles
    this.dustParticles = [];
    for (let i = 0; i < 20; i++) {
      this.dustParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        r: 0.8 + Math.random() * 2,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.1,
        alpha: 0.05 + Math.random() * 0.1,
        hue: 200 + Math.random() * 120,
      });
    }
  }

  start() {
    const loop = (now: number) => {
      this.render(now);
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }

  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    if (this.canvas) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  private render(now: number) {
    const ctx = this.ctx;
    if (!ctx) return;

    const elapsed = (now - this.startTime) / 1000; // seconds

    // Clear
    ctx.clearRect(0, 0, this.width, this.height);

    // Shooting stars
    this.updateShootingStars(now);
    this.drawShootingStars(ctx);

    // Twinkling stars
    this.drawTwinkleStars(ctx, elapsed);

    // Cosmic dust
    this.updateDust();
    this.drawDust(ctx);
  }

  private updateShootingStars(now: number) {
    // Spawn new shooting star
    if (this.shootingStars.length < 2 && now - this.lastShootingStarTime > this.nextSpawnDelay) {
      const startEdge = Math.random();
      let x: number, y: number;
      if (startEdge < 0.5) {
        x = Math.random() * this.width;
        y = -10;
      } else {
        x = this.width + 10;
        y = Math.random() * this.height * 0.5;
      }

      const angle = Math.PI * 0.6 + Math.random() * 0.4;
      const speed = 4 + Math.random() * 6;

      this.shootingStars.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 40 + Math.random() * 40,
        length: 30 + Math.random() * 60,
        brightness: 0.5 + Math.random() * 0.5,
      });

      this.lastShootingStarTime = now;
      this.nextSpawnDelay = 3000 + Math.random() * 5000;
    }

    // Update positions
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const s = this.shootingStars[i];
      s.x += s.vx;
      s.y += s.vy;
      s.life++;

      if (s.life > s.maxLife || s.x < -100 || s.x > this.width + 100 || s.y > this.height + 100) {
        this.shootingStars.splice(i, 1);
      }
    }
  }

  private drawShootingStars(ctx: CanvasRenderingContext2D) {
    for (const s of this.shootingStars) {
      const progress = s.life / s.maxLife;
      const fadeIn = Math.min(1, progress * 5);
      const fadeOut = Math.max(0, 1 - (progress - 0.7) / 0.3);
      const alpha = s.brightness * fadeIn * fadeOut;

      const tailX = s.x - (s.vx / Math.sqrt(s.vx * s.vx + s.vy * s.vy)) * s.length;
      const tailY = s.y - (s.vy / Math.sqrt(s.vx * s.vx + s.vy * s.vy)) * s.length;

      const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
      grad.addColorStop(0, `rgba(255, 255, 255, 0)`);
      grad.addColorStop(0.6, `rgba(200, 220, 255, ${alpha * 0.3})`);
      grad.addColorStop(1, `rgba(255, 255, 255, ${alpha})`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();

      // Head glow
      ctx.globalAlpha = alpha * 0.6;
      const headGlow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 4);
      headGlow.addColorStop(0, "rgba(255, 255, 255, 0.8)");
      headGlow.addColorStop(1, "transparent");
      ctx.fillStyle = headGlow;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private drawTwinkleStars(ctx: CanvasRenderingContext2D, elapsed: number) {
    for (const star of this.twinkleStars) {
      const twinkle = Math.sin(elapsed * star.speed + star.phase);
      const alpha = star.baseAlpha + twinkle * 0.3;

      ctx.globalAlpha = Math.max(0.05, alpha);
      ctx.fillStyle = "#f4ebd9";
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();

      // Subtle halo on bright phase
      if (alpha > 0.6) {
        ctx.globalAlpha = (alpha - 0.6) * 0.5;
        const halo = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.r * 4);
        halo.addColorStop(0, "rgba(244, 235, 217, 0.5)");
        halo.addColorStop(1, "transparent");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private updateDust() {
    for (const p of this.dustParticles) {
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around
      if (p.x < -10) p.x = this.width + 10;
      if (p.x > this.width + 10) p.x = -10;
      if (p.y < -10) p.y = this.height + 10;
      if (p.y > this.height + 10) p.y = -10;
    }
  }

  private drawDust(ctx: CanvasRenderingContext2D) {
    for (const p of this.dustParticles) {
      ctx.globalAlpha = p.alpha;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      grad.addColorStop(0, `hsla(${p.hue}, 30%, 70%, 0.5)`);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
