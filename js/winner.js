class ConfettiSystem {
  constructor(colors) {
    this.canvas = document.getElementById('confetti-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.colors = colors;
    this.particles = [];
    this.rafId = null;
    window.addEventListener('resize', () => this._resize());
    this._resize();
  }

  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst() {
    this.stop();
    this.particles = [];

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.35;

    for (let i = 0; i < 140; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = Math.random() * 10 + 4;
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 60,
        y: cy,
        dx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
        dy: -(Math.random() * 14 + 6),
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        w: Math.random() * 10 + 5,
        h: Math.random() * 5 + 3,
        isCircle: Math.random() < 0.3,
        life: 1,
        decay: Math.random() * 0.006 + 0.004,
      });
    }

    this._animate();
  }

  _animate() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles = this.particles.filter(p => p.life > 0);

    for (const p of this.particles) {
      p.dy += 0.35;
      p.dx *= 0.99;
      p.x += p.dx;
      p.y += p.dy;
      p.rot += p.rotSpeed;
      p.life -= p.decay;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;

      if (p.isCircle) {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }

      ctx.restore();
    }

    if (this.particles.length > 0) {
      this.rafId = requestAnimationFrame(() => this._animate());
    } else {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.rafId = null;
    }
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles = [];
  }
}

class WinnerModal {
  constructor(onReset) {
    this.modal = document.getElementById('winner-modal');
    this.nameEl = document.getElementById('winner-name');
    this.closeBtn = document.getElementById('modal-close');
    this.closeBtn.addEventListener('click', () => {
      this.hide();
      onReset();
    });
  }

  show(name) {
    this.nameEl.textContent = name;
    this.modal.setAttribute('aria-hidden', 'false');
    this.modal.classList.add('visible');
    // Announce for screen readers
    document.getElementById('sr-announce').textContent = `El ganador es ${name}`;
  }

  hide() {
    this.modal.classList.remove('visible');
    this.modal.setAttribute('aria-hidden', 'true');
    document.getElementById('sr-announce').textContent = '';
  }
}
