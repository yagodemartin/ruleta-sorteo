class SpinController {
  constructor(wheel, soundEnabled) {
    this.wheel = wheel;
    this.spinning = false;
    this.currentRotation = 0;
    this.tick = soundEnabled ? this._buildTick() : null;
    this._lastTickSegment = -1;
  }

  _buildTick() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      const actx = new Ctx();
      return () => {
        if (actx.state === 'suspended') actx.resume();
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.08, actx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.04);
        osc.start(actx.currentTime);
        osc.stop(actx.currentTime + 0.05);
      };
    } catch (_) {
      return null;
    }
  }

  _easeProgress(t) {
    // Velocity profile: cosine ramp-up → plateau → cosine ramp-down
    // v(t) is C1-continuous at all transitions — no velocity jumps
    const a = 0.18;          // ramp-up ends
    const b = 0.68;          // ramp-down starts
    const total = 0.5*a + (b - a) + 0.5*(1 - b);  // normalizer

    let pos;
    if (t <= a) {
      pos = 0.5 * (t - (a / Math.PI) * Math.sin(Math.PI * t / a));
    } else if (t <= b) {
      pos = 0.5 * a + (t - a);
    } else {
      const c  = 1 - b;
      const tb = t - b;
      pos = (0.5 * a + (b - a)) + 0.5 * (tb + (c / Math.PI) * Math.sin(Math.PI * tb / c));
    }

    return pos / total;
  }

  _computeTargetRotation(winnerIndex, n) {
    const segAngle = (2 * Math.PI) / n;
    // Pointer at top = angle -π/2 in canvas coords
    // Segment i center = currentRot + i*seg + seg/2
    // We need: finalRot + i*seg + seg/2 ≡ -π/2 (mod 2π)
    // finalRot ≡ -π/2 - i*seg - seg/2
    let target = -Math.PI / 2 - winnerIndex * segAngle - segAngle / 2;
    target = ((target % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

    const currentNorm = ((this.currentRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    let diff = target - currentNorm;
    if (diff < 0) diff += 2 * Math.PI;

    return this.currentRotation + 5 * 2 * Math.PI + diff;
  }

  _checkTick(rotation, n) {
    if (!this.tick) return;
    const segAngle = (2 * Math.PI) / n;
    const normalized = ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const currentSeg = Math.floor(normalized / segAngle) % n;
    if (currentSeg !== this._lastTickSegment) {
      this._lastTickSegment = currentSeg;
      this.tick();
    }
  }

  start(winnerIndex, n, duration, onTick, onComplete) {
    if (this.spinning) return;
    this.spinning = true;

    const startRotation = this.currentRotation;
    const endRotation = this._computeTargetRotation(winnerIndex, n);
    const totalRotation = endRotation - startRotation;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const progress = this._easeProgress(t);

      this.currentRotation = startRotation + totalRotation * progress;
      this.wheel.draw(this.currentRotation);
      this._checkTick(this.currentRotation, n);
      onTick(t);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.spinning = false;
        this.currentRotation = endRotation;
        onComplete();
      }
    };

    requestAnimationFrame(animate);
  }

  reset() {
    this.currentRotation = 0;
    this.spinning = false;
    this._lastTickSegment = -1;
  }
}
