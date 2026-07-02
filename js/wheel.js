class Wheel {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.participants = config.participants;
    this.colors = config.colors;
    this.rotation = 0;
    this.images = [];
    this.resize();
  }

  resize() {
    const size = Math.min(
      window.innerWidth * 0.85,
      window.innerHeight * 0.55,
      560
    );
    this.canvas.width = size;
    this.canvas.height = size;
  }

  loadImages(callback) {
    const withImg = this.participants.filter(p => p.image);
    if (withImg.length === 0) { callback(); return; }

    // Generate canvas avatars immediately so file:// always shows something.
    // If a real image loads (HTTP server), it replaces the generated one.
    withImg.forEach((p, _) => {
      const i = this.participants.indexOf(p);
      this.images[i] = this._generateAvatar(p.name, this.getColor(i));
    });

    // data: URIs are same-origin and always safe to load.
    // External file paths on file:// are blocked by Chrome CORS — use generated avatar instead.
    const toFetch = withImg.filter(p => p.image.startsWith('data:') || location.protocol !== 'file:');
    if (toFetch.length === 0) { callback(); return; }

    let pending = toFetch.length;
    toFetch.forEach((p) => {
      const i = this.participants.indexOf(p);
      const img = new Image();
      img.onload  = () => { this.images[i] = img; if (--pending === 0) callback(); };
      img.onerror = () => {                        if (--pending === 0) callback(); };
      img.src = p.image;
    });
  }

  _generateAvatar(name, bgColor) {
    const size = 200;
    const cx   = size / 2;
    const oc   = document.createElement('canvas');
    oc.width   = oc.height = size;
    const ctx  = oc.getContext('2d');

    // No clip here — main canvas clips to circle; avoid offscreen-clip + drawImage quirks

    // Gradient background (fill whole square; main canvas clips to circle)
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, bgColor);
    grad.addColorStop(1, this._darken(bgColor, 0.40));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Shoulders
    ctx.beginPath();
    ctx.arc(cx, size * 0.80, size * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.90)';
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(cx, size * 0.36, size * 0.20, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();

    // Initial letter inside head
    const initial = (name || '?').charAt(0).toUpperCase();
    ctx.font      = `bold ${Math.round(size * 0.22)}px Arial, sans-serif`;
    ctx.fillStyle = bgColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, cx, size * 0.36);

    return oc;
  }

  _darken(hex, amount) {
    if (!hex.startsWith('#')) return hex;
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 0xff) * (1 - amount));
    const g = Math.round(((n >>  8) & 0xff) * (1 - amount));
    const b = Math.round(( n        & 0xff) * (1 - amount));
    return `rgb(${r},${g},${b})`;
  }

  getColor(index) {
    return this.participants[index].color ||
      this.colors[index % this.colors.length];
  }

  _fontSize(radius, n) {
    // Purely proportional: scales with radius AND segment count
    return Math.max(8, Math.min(20, radius * 1.1 / n));
  }

  _truncate(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) {
      t = t.slice(0, -1);
    }
    return t + '…';
  }

  draw(rotation) {
    this.rotation = rotation;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy) - 12;
    const n = this.participants.length;
    const segAngle = (2 * Math.PI) / n;

    ctx.clearRect(0, 0, w, h);

    // Background shadow glow
    ctx.save();
    ctx.shadowColor = 'rgba(233,69,96,0.25)';
    ctx.shadowBlur  = 30;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#1A1A2E';
    ctx.fill();
    ctx.restore();

    // Segments
    for (let i = 0; i < n; i++) {
      const start = rotation + i * segAngle;
      const end   = start + segAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle   = this.getColor(i);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }

    // Photos — circular, clipped to segment area
    // imgDist + imgR must stay < textX - maxWidth to avoid overlap
    const hasAnyImage = this.images.some(Boolean);
    if (hasAnyImage) {
      const imgR    = Math.max(16, Math.min(radius * 0.18, 40));
      const imgDist = radius * 0.42;  // photo outer edge = 0.42+0.18 = 0.60, text starts at 0.62

      for (let i = 0; i < n; i++) {
        if (!this.images[i]) continue;
        const mid = rotation + i * segAngle + segAngle / 2;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(mid);
        ctx.beginPath();
        ctx.arc(imgDist, 0, imgR, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(this.images[i],
          imgDist - imgR, -imgR,
          imgR * 2, imgR * 2
        );
        ctx.restore();

        // Photo border ring
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(mid);
        ctx.beginPath();
        ctx.arc(imgDist, 0, imgR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth   = 2;
        ctx.stroke();
        ctx.restore();
      }
    }

    // Text — all sizes and positions proportional to radius
    const fontSize = this._fontSize(radius, n);
    ctx.font          = `600 ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign     = 'right';
    ctx.textBaseline  = 'middle';

    for (let i = 0; i < n; i++) {
      const mid    = rotation + i * segAngle + segAngle / 2;
      const hasImg = Boolean(this.images[i]);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(mid);
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur  = 4;
      ctx.fillStyle   = '#ffffff';

      const textX    = radius * 0.93;
      // With image: text zone is 0.62→0.93 (clear of photo outer edge 0.60)
      const maxWidth = hasImg ? radius * 0.31 : radius * 0.82;

      const text = this._truncate(ctx, this.participants[i].name, maxWidth);
      ctx.fillText(text, textX, 0);
      ctx.restore();
    }

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(42,42,74,0.9)';
    ctx.lineWidth   = 10;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius - 5, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth   = 2;
    ctx.stroke();

    // Center cap
    const capR = Math.max(radius * 0.07, 8);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, capR);
    grad.addColorStop(0, '#5A5A8A');
    grad.addColorStop(1, '#1A1A2E');
    ctx.beginPath();
    ctx.arc(cx, cy, capR, 0, 2 * Math.PI);
    ctx.fillStyle   = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth   = 2;
    ctx.stroke();
  }
}
