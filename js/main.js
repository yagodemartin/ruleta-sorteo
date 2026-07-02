(function () {
  const cfg = window.RAFFLE_CONFIG;
  if (!cfg || !Array.isArray(cfg.participants) || cfg.participants.length < 2) {
    document.body.innerHTML =
      '<div style="color:#E94560;font:1.5rem monospace;padding:2rem">Error: config.js necesita al menos 2 participantes.</div>';
    return;
  }

  // ── DOM refs ─────────────────────────────────────────
  const canvas = document.getElementById('wheel-canvas');
  const spinBtn = document.getElementById('spin-btn');
  const appTitle = document.getElementById('app-title');
  const wheelWrapper = document.querySelector('.wheel-wrapper');

  appTitle.textContent = cfg.title || 'Sorteo';

  // ── Init modules ─────────────────────────────────────
  const wheel = new Wheel(canvas, cfg);
  const spin = new SpinController(wheel, cfg.sound !== false);
  const confetti = new ConfettiSystem(cfg.colors);
  const modal = new WinnerModal(onReset);

  // Load participant photos then draw
  wheel.loadImages(() => wheel.draw(0));

  // ── Spin button ──────────────────────────────────────
  spinBtn.addEventListener('click', () => {
    if (spin.spinning) return;

    const winnerIndex = Math.floor(Math.random() * cfg.participants.length);
    // ?spinDuration=N URL param overrides config (used by automated tests)
    const urlMs   = parseInt(new URLSearchParams(location.search).get('spinDuration'), 10);
    const duration = urlMs > 0 ? urlMs : Math.min(Math.max(cfg.spinDuration || 6000, 3000), 12000);

    spinBtn.disabled = true;
    spinBtn.textContent = 'GIRANDO…';
    wheelWrapper.classList.add('spinning');

    spin.start(
      winnerIndex,
      cfg.participants.length,
      duration,
      (t) => {
        // Pulse glow intensity based on spin phase
        if (t > 0.72) {
          const decel = (t - 0.72) / 0.28;
          wheelWrapper.style.setProperty('--glow-alpha', (1 - decel * 0.6).toFixed(2));
        }
      },
      () => {
        wheelWrapper.classList.remove('spinning');
        wheelWrapper.classList.add('winner-glow');

        setTimeout(() => {
          confetti.burst();
          modal.show(cfg.participants[winnerIndex].name);
        }, 350);
      }
    );
  });

  function onReset() {
    wheelWrapper.classList.remove('winner-glow');
    confetti.stop();
    spin.reset();
    wheel.draw(0);
    spinBtn.disabled = false;
    spinBtn.textContent = 'GIRAR';
  }

  // ── Resize ───────────────────────────────────────────
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      wheel.resize();
      wheel.draw(spin.currentRotation);
    }, 100);
  });
})();
