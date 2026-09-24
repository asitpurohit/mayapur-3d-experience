export function createHud() {
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('startBtn');
  const droneBtn = document.getElementById('droneBtn');
  const hud = document.getElementById('hud');
  const stats = document.getElementById('stats');
  const status = document.getElementById('status');

  const giftCounter = document.getElementById('gift-counter');
  const giftPrompt = document.getElementById('gift-prompt');
  const giftOpenBtn = document.getElementById('gift-open-btn');
  const giftHint = document.getElementById('gift-hint');
  const giftModal = document.getElementById('gift-modal');
  const giftQuestion = document.getElementById('gift-question');
  const giftOptions = document.getElementById('gift-options');
  const giftFeedback = document.getElementById('gift-feedback');
  const blessingModal = document.getElementById('blessing-modal');
  const blessingClose = document.getElementById('blessing-close');
  const tutorialModal = document.getElementById('tutorial-modal');
  const tutorialTitle = document.getElementById('tutorial-title');
  const tutorialBody = document.getElementById('tutorial-body');
  const tutorialBtn = document.getElementById('tutorial-btn');
  const boatPrompt = document.getElementById('boat-prompt');
  const boatRideBtn = document.getElementById('boat-ride-btn');
  const aratiPrompt = document.getElementById('arati-prompt');
  const aratiBtn = document.getElementById('arati-btn');

  let fpsAccum = 0;
  let fpsFrames = 0;
  let fpsValue = 0;
  let giftOpenHandler = null;
  let boatRideHandler = null;
  let aratiHandler = null;
  let blessingCloseHandler = null;
  let tutorialCloseHandler = null;
  let hintTimer = null;

  function showOverlay(visible, title, bodyHtml, buttonText, { modeChoice = false, droneButtonText = 'PLAY GAME' } = {}) {
    if (title) {
      const h = overlay.querySelector('h1');
      if (h) h.textContent = title;
    }
    if (bodyHtml != null) {
      const b = overlay.querySelector('.body');
      if (b) b.innerHTML = bodyHtml;
    }
    if (buttonText) startBtn.textContent = buttonText;
    if (droneBtn) {
      droneBtn.textContent = droneButtonText;
      droneBtn.classList.toggle('hidden', !modeChoice);
    }
    overlay.classList.toggle('hidden', !visible);
  }

  function showHud(visible) {
    hud.classList.toggle('hidden', !visible);
  }

  function bindTouchClick(el, fn) {
    if (!el) return;
    let lastTime = 0;
    const trigger = (e) => {
      e.stopPropagation();
      const now = Date.now();
      if (now - lastTime < 300) return;
      lastTime = now;
      fn(e);
    };
    el.addEventListener('click', trigger);
    el.addEventListener('touchend', trigger);
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  }

  function onStart(fn) {
    bindTouchClick(startBtn, fn);
  }

  function onDrone(fn) {
    bindTouchClick(droneBtn, fn);
  }

  function setButtonEnabled(on) {
    startBtn.disabled = !on;
    if (droneBtn) droneBtn.disabled = !on;
  }

  function update(dt, { altitude, walked }) {
    fpsAccum += dt;
    fpsFrames += 1;
    if (fpsAccum >= 0.5) {
      fpsValue = Math.round(fpsFrames / fpsAccum);
      fpsAccum = 0;
      fpsFrames = 0;
    }
    stats.textContent = `${fpsValue || '--'} fps · alt ${altitude.toFixed(0)} m · ${walked.toFixed(0)} m walked`;
  }

  function setStatus(text) {
    status.textContent = text;
  }

  function setGiftCounter(found, total, visible) {
    if (!giftCounter) return;
    const label = `${found}/${total}`;
    if (giftCounter.dataset.label !== label) {
      giftCounter.dataset.label = label;
      giftCounter.textContent = `🎁 ${label}`;
    }
    giftCounter.classList.toggle('hidden', !visible);
  }

  function onGiftOpen(fn) {
    giftOpenHandler = fn;
  }

  if (giftOpenBtn) {
    bindTouchClick(giftOpenBtn, () => {
      if (giftOpenHandler) giftOpenHandler();
    });
  }

  function showGiftPrompt(visible, label = '🎁 Open gift') {
    if (!giftPrompt) return;
    if (visible && giftOpenBtn) {
      if (giftOpenBtn.dataset.label !== label) {
        giftOpenBtn.dataset.label = label;
        giftOpenBtn.innerHTML = `${label} <span class="key">F</span>`;
      }
    }
    giftPrompt.classList.toggle('hidden', !visible);
  }

  function onBoatRide(fn) {
    boatRideHandler = fn;
  }

  if (boatRideBtn) {
    bindTouchClick(boatRideBtn, () => {
      if (boatRideHandler) boatRideHandler();
    });
  }

  function showBoatPrompt(visible, label = 'Ride boat') {
    if (!boatPrompt) return;
    if (visible && boatRideBtn) {
      const text = `${label} `;
      if (boatRideBtn.dataset.label !== label) {
        boatRideBtn.dataset.label = label;
        boatRideBtn.innerHTML = `${text}<span class="key">F</span>`;
      }
    }
    boatPrompt.classList.toggle('hidden', !visible);
  }

  function onArati(fn) {
    aratiHandler = fn;
  }

  if (aratiBtn) {
    bindTouchClick(aratiBtn, () => {
      if (aratiHandler) aratiHandler();
    });
  }

  function showAratiPrompt(visible) {
    if (!aratiPrompt) return;
    aratiPrompt.classList.toggle('hidden', !visible);
  }

  function setGameHint(text, duration = 9000) {
    if (!giftHint) return;
    if (hintTimer) {
      clearTimeout(hintTimer);
      hintTimer = null;
    }
    if (!text) {
      giftHint.classList.add('hidden');
      return;
    }
    giftHint.textContent = text;
    giftHint.classList.remove('hidden');
    hintTimer = setTimeout(() => giftHint.classList.add('hidden'), duration);
  }

  function closeQuestion() {
    if (!giftModal) return;
    giftModal.classList.add('hidden');
    if (giftFeedback) giftFeedback.textContent = '';
  }

  function openQuestion(question, options, onAnswer) {
    if (!giftModal || !giftQuestion || !giftOptions) return;
    giftQuestion.textContent = question;
    giftOptions.innerHTML = '';
    if (giftFeedback) giftFeedback.textContent = '';

    // Drop focus/hover left over from the button that opened the modal, and
    // ignore ghost taps from that same gesture (mobile click-through).
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    const openedAt = performance.now();

    options.forEach((label, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gift-option';
      button.textContent = label;
      bindTouchClick(button, () => {
        if (button.disabled) return;
        if (performance.now() - openedAt < 450) return;
        if (onAnswer(index)) {
          closeQuestion();
        } else {
          button.classList.add('wrong');
          button.disabled = true;
          if (giftFeedback) giftFeedback.textContent = 'Not quite — try another answer 🙏';
        }
      });
      giftOptions.appendChild(button);
    });

    giftModal.classList.remove('hidden');
  }

  function showBlessing({ onClose } = {}) {
    if (!blessingModal) return;
    blessingCloseHandler = onClose || null;
    blessingModal.classList.remove('hidden');
  }

  // One-time tutorial card (shown after the drone intro on a fresh hunt).
  function showTutorial({ title, body, buttonText = 'Got it', onClose } = {}) {
    if (!tutorialModal) return;
    if (title && tutorialTitle) tutorialTitle.textContent = title;
    if (body != null && tutorialBody) tutorialBody.innerHTML = body;
    if (buttonText && tutorialBtn) tutorialBtn.textContent = buttonText;
    tutorialCloseHandler = onClose || null;
    tutorialModal.classList.remove('hidden');
  }

  if (tutorialBtn) {
    bindTouchClick(tutorialBtn, () => {
      tutorialModal.classList.add('hidden');
      if (tutorialCloseHandler) {
        const fn = tutorialCloseHandler;
        tutorialCloseHandler = null;
        fn();
      }
    });
  }

  if (blessingClose) {
    bindTouchClick(blessingClose, () => {
      blessingModal.classList.add('hidden');
      if (blessingCloseHandler) {
        const fn = blessingCloseHandler;
        blessingCloseHandler = null;
        fn();
      }
    });
  }

  return {
    showOverlay,
    showHud,
    onStart,
    onDrone,
    setButtonEnabled,
    update,
    setStatus,
    setGiftCounter,
    onGiftOpen,
    showGiftPrompt,
    onBoatRide,
    showBoatPrompt,
    onArati,
    showAratiPrompt,
    setGameHint,
    openQuestion,
    closeQuestion,
    showBlessing,
    showTutorial,
  };
}
