(function () {
  const cfg = window.RAFFLE_CONFIG;
  if (!cfg || !Array.isArray(cfg.participants) || cfg.participants.length < 2) {
    document.body.innerHTML =
      '<div style="color:#E94560;font:1.5rem monospace;padding:2rem">Error: config.js necesita al menos 2 participantes.</div>';
    return;
  }

  // ── State ────────────────────────────────────────────
  let participants = cfg.participants.map(p => ({ ...p }));

  // ── DOM refs ─────────────────────────────────────────
  const canvas      = document.getElementById('wheel-canvas');
  const spinBtn     = document.getElementById('spin-btn');
  const appTitle    = document.getElementById('app-title');
  const wheelWrapper = document.getElementById('wheel-wrapper');
  const listEl      = document.getElementById('participant-list');
  const nameInput   = document.getElementById('new-name-input');
  const addBtn      = document.getElementById('add-btn');
  const resetBtn    = document.getElementById('reset-btn');

  appTitle.textContent = cfg.title || 'Sorteo';

  // ── Wheel instances ───────────────────────────────────
  let wheel, spin, confetti, modal;

  function buildWheel() {
    const fakeCfg = { ...cfg, participants };
    wheel    = new Wheel(canvas, fakeCfg);
    spin     = new SpinController(wheel, cfg.sound !== false);
    confetti = new ConfettiSystem(cfg.colors);
    if (!modal) modal = new WinnerModal(onReset);
    wheel.loadImages(() => wheel.draw(0));
  }

  // ── Participant list UI ───────────────────────────────
  function colorFor(i) {
    return participants[i]?.color || cfg.colors[i % cfg.colors.length];
  }

  function renderList() {
    listEl.innerHTML = '';
    participants.forEach((p, i) => {
      const li = document.createElement('li');
      li.className = 'participant-item';
      li.innerHTML = `
        <span class="p-dot" style="background:${colorFor(i)}"></span>
        <span class="p-name">${p.name}</span>
        <button class="remove-btn" data-i="${i}" aria-label="Eliminar ${p.name}">×</button>
      `;
      listEl.appendChild(li);
    });
  }

  function addParticipant(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    participants.push({ name: trimmed });
    renderList();
    buildWheel();
  }

  function removeParticipant(i) {
    if (participants.length <= 2) return; // mínimo 2
    participants.splice(i, 1);
    renderList();
    buildWheel();
  }

  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-btn');
    if (btn) removeParticipant(Number(btn.dataset.i));
  });

  addBtn.addEventListener('click', () => {
    addParticipant(nameInput.value);
    nameInput.value = '';
    nameInput.focus();
  });

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addParticipant(nameInput.value);
      nameInput.value = '';
    }
  });

  resetBtn.addEventListener('click', () => {
    participants = cfg.participants.map(p => ({ ...p }));
    renderList();
    buildWheel();
  });

  // ── Spin ─────────────────────────────────────────────
  spinBtn.addEventListener('click', () => {
    if (!spin || spin.spinning || participants.length < 2) return;

    const winnerIndex = Math.floor(Math.random() * participants.length);
    const urlMs   = parseInt(new URLSearchParams(location.search).get('spinDuration'), 10);
    const duration = urlMs > 0 ? urlMs : Math.min(Math.max(cfg.spinDuration || 6000, 3000), 12000);

    spinBtn.disabled = true;
    spinBtn.textContent = 'GIRANDO…';
    wheelWrapper.classList.add('spinning');

    spin.start(
      winnerIndex,
      participants.length,
      duration,
      (t) => {
        if (t > 0.68) {
          const decel = (t - 0.68) / 0.32;
          wheelWrapper.style.setProperty('--glow-alpha', (1 - decel * 0.6).toFixed(2));
        }
      },
      () => {
        wheelWrapper.classList.remove('spinning');
        wheelWrapper.classList.add('winner-glow');
        setTimeout(() => {
          confetti.burst();
          modal.show(participants[winnerIndex].name);
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

  // ── Resize ────────────────────────────────────────────
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      wheel.resize();
      wheel.draw(spin.currentRotation);
    }, 100);
  });

  // ── Init ─────────────────────────────────────────────
  renderList();
  buildWheel();
})();
