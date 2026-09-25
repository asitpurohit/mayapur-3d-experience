/**
 * Dynamic Motion Graphic Experience for ISKCON Mayapur Treasure Hunt
 * 
 * Features:
 * 1. Dynamic Loading FX: Sacred golden particles, rotating mandala glow,
 *    smooth progress interpolation, and cycling spiritual lore/treasure hunt teasers.
 * 2. Motion Graphic Showcase: High-energy kinetic typography for "MAYAPUR TREASURE HUNT",
 *    dynamic feature chapter carousel (55 Gifts, 5 Levels, Drone Flight, Ganga Boat, Darshan),
 *    devotional music synchronization, audio visualizer, and seamless launch into the game.
 */

const LORE_TIPS = [
  '🎁 5 Levels · 55 Hidden Spiritual Treasures across Mayapur Dham',
  '🦅 Take flight in Drone Mode above the grand 110m TOVP Domes',
  '⛵ Navigate the holy waters of the sacred Bhagirathi Ganga',
  '🙏 Enter the sanctum for the auspicious Darshan of Lord Narsimhadeva',
  '📿 Answer sacred quiz questions to receive transcendental blessings',
  '🛕 Walk with Srila Prabhupada through the Vedic holy city',
];

const SCENES = [
  {
    icon: '🛕',
    tag: 'SACRED VEDIC DHAM',
    title: 'Enter Sri Mayapur Dham',
    desc: 'Immerse yourself in the holy land of golden pastimes, magnificent temple architecture, and tranquil gardens.',
  },
  {
    icon: '🎁',
    tag: '5 LEVELS · 55 GIFTS',
    title: 'The Great Treasure Hunt',
    desc: 'Seek out 55 hidden spiritual relics concealed on temple spires, river boats, dancing kirtan devotees, and sacred altars.',
  },
  {
    icon: '🦅',
    tag: 'AIR & WATER EXPEDITION',
    title: 'Soar High & Cruise the Ganga',
    desc: 'Take aerial drone control to fly over majestic golden domes, or pilot a wooden pilgrim boat along the sacred river.',
  },
  {
    icon: '🙏',
    tag: 'DIVINE PROTECTION & ARATI',
    title: 'Lord Narsimhadeva Darshan',
    desc: 'Step into the sanctum sanctorum to offer the sacred flame arati and receive blessings from Lord Narsimhadeva.',
  },
];

export function createMotionGraphic({ youtubeMusic, onStartGame }) {
  // DOM Elements
  const splashEl = document.getElementById('splash');
  const splashProgressEl = document.getElementById('splash-progress');
  const splashBarEl = document.getElementById('splash-bar');
  const splashLabelEl = document.getElementById('splash-label');
  const splashSublabelEl = document.getElementById('splash-sublabel');

  let mgOverlay = document.getElementById('motion-graphic');
  let mgCanvas = document.getElementById('mg-canvas');
  let mgStartBtn = document.getElementById('mg-start-btn');
  let mgSkipBtn = document.getElementById('mg-skip-btn');
  let mgSoundBtn = document.getElementById('mg-sound-btn');
  let mgSoundLabel = document.getElementById('mg-sound-label');
  let mgStreamingBox = document.getElementById('mg-streaming-status');
  let mgStreamBar = document.getElementById('mg-stream-bar');
  let mgStreamLabel = document.getElementById('mg-stream-label');
  let mgBtnLabel = document.getElementById('mg-btn-label');

  // Loading Particles Canvas
  let splashCanvas = document.getElementById('splash-particles');
  let splashCtx = null;
  let splashAnimId = null;
  let splashParticles = [];

  // Motion Graphic Canvas
  let mgCtx = null;
  let mgAnimId = null;
  let mgParticles = [];

  // State
  let targetProgress = 0;
  let currentProgress = 0;
  let loreTimer = null;
  let loreIndex = 0;
  let sceneIndex = 0;
  let sceneTimer = null;
  let isSoundActive = false;
  let onCompleteCallback = null;
  let isActive = true;
  let isGameReady = false;
  let userWantsToStart = false;
  let userWantsAutoStart = true;
  let listenersAttached = false;

  // --- Dynamic Loading FX (Phase 1) ---

  function initSplashCanvas() {
    splashCanvas = document.getElementById('splash-particles');
    if (!splashCanvas && splashEl) {
      splashCanvas = document.createElement('canvas');
      splashCanvas.id = 'splash-particles';
      splashCanvas.className = 'splash-fx-canvas';
      splashEl.appendChild(splashCanvas);
    }
    if (splashCanvas) {
      splashCtx = splashCanvas.getContext('2d');
      resizeSplashCanvas();
      window.addEventListener('resize', resizeSplashCanvas);
    }

    // Insert Dynamic Lore Ticker if not already in DOM
    if (splashProgressEl && !document.getElementById('splash-lore')) {
      const loreEl = document.createElement('div');
      loreEl.id = 'splash-lore';
      loreEl.className = 'splash-lore-ticker';
      loreEl.textContent = LORE_TIPS[0];
      splashProgressEl.insertBefore(loreEl, splashProgressEl.firstChild);
    }

    // Tap to play kirtan while waiting for large downloads
    if (splashEl) {
      splashEl.addEventListener(
        'pointerdown',
        () => {
          if (youtubeMusic && !isSoundActive) {
            triggerAudio();
            if (splashSublabelEl) {
              splashSublabelEl.textContent = '🔊 Devotional Kirtan playing · Loading 3D temple…';
            }
          }
        },
        { once: true },
      );
    }

    createSplashParticles();
    startSplashLoop();
    startLoreCycle();
  }

  function resizeSplashCanvas() {
    if (!splashCanvas) return;
    splashCanvas.width = window.innerWidth;
    splashCanvas.height = window.innerHeight;
  }

  function createSplashParticles() {
    splashParticles = [];
    const count = Math.min(65, Math.floor((window.innerWidth * window.innerHeight) / 18000));
    for (let i = 0; i < count; i++) {
      splashParticles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 2.8 + 0.8,
        speedY: Math.random() * 0.45 + 0.15,
        speedX: (Math.random() - 0.5) * 0.35,
        alpha: Math.random() * 0.65 + 0.25,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function startSplashLoop() {
    if (splashAnimId) return;

    let lastTime = performance.now();
    let mandalaAngle = 0;
    const loop = (now) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      // Smooth progress interpolation
      if (currentProgress < targetProgress) {
        currentProgress += (targetProgress - currentProgress) * Math.min(1, dt * 5);
        if (Math.abs(targetProgress - currentProgress) < 0.2) currentProgress = targetProgress;
        renderProgress();
      }

      if (splashCtx && splashCanvas && splashCanvas.width > 0) {
        splashCtx.clearRect(0, 0, splashCanvas.width, splashCanvas.height);

        // Draw soft ambient sacred rays from center-top
        const cx = splashCanvas.width * 0.5;
        const cy = splashCanvas.height * 0.35;
        const grad = splashCtx.createRadialGradient(cx, cy, 20, cx, cy, splashCanvas.height * 0.6);
        grad.addColorStop(0, 'rgba(255, 215, 0, 0.09)');
        grad.addColorStop(0.5, 'rgba(255, 170, 0, 0.03)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        splashCtx.fillStyle = grad;
        splashCtx.fillRect(0, 0, splashCanvas.width, splashCanvas.height);

        // Draw subtle rotating sacred geometry motif behind cover artwork
        mandalaAngle += 0.001;
        splashCtx.save();
        splashCtx.translate(cx, cy);
        splashCtx.rotate(mandalaAngle);
        splashCtx.strokeStyle = 'rgba(255, 215, 0, 0.08)';
        splashCtx.lineWidth = 1;
        splashCtx.beginPath();
        const rad = Math.min(cx, cy) * 0.55;
        splashCtx.arc(0, 0, rad, 0, Math.PI * 2);
        splashCtx.stroke();
        const rays = 8;
        for (let i = 0; i < rays; i++) {
          const a = (i * 2 * Math.PI) / rays;
          splashCtx.beginPath();
          splashCtx.moveTo(Math.cos(a) * (rad * 0.3), Math.sin(a) * (rad * 0.3));
          splashCtx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
          splashCtx.stroke();
        }
        splashCtx.restore();

        // Draw floating particles
        for (const p of splashParticles) {
          p.y -= p.speedY;
          p.x += Math.sin(now * 0.0015 + p.phase) * p.speedX;
          if (p.y < -10) {
            p.y = splashCanvas.height + 10;
            p.x = Math.random() * splashCanvas.width;
          }

          splashCtx.beginPath();
          splashCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          splashCtx.fillStyle = `rgba(255, 220, 130, ${p.alpha * (0.6 + 0.4 * Math.sin(now * 0.003 + p.phase))})`;
          splashCtx.shadowColor = '#ffd700';
          splashCtx.shadowBlur = 8;
          splashCtx.fill();
        }
        splashCtx.shadowBlur = 0;
      }

      splashAnimId = requestAnimationFrame(loop);
    };
    splashAnimId = requestAnimationFrame(loop);
  }

  function stopSplashLoop() {
    if (splashAnimId) {
      cancelAnimationFrame(splashAnimId);
      splashAnimId = null;
    }
    if (loreTimer) {
      clearInterval(loreTimer);
      loreTimer = null;
    }
  }

  function renderProgress() {
    const clamped = Math.max(0, Math.min(100, currentProgress));
    if (splashBarEl) splashBarEl.style.width = `${clamped}%`;
    if (splashLabelEl) {
      splashLabelEl.textContent = `Loading Mayapur… ${Math.round(clamped)}%`;
    }
    if (mgStreamBar) {
      mgStreamBar.style.width = `${clamped}%`;
    }
    if (mgStreamLabel && !isGameReady) {
      mgStreamLabel.textContent = `⚡ Streaming 3D Temple & Lord Narsimhadev… ${Math.round(clamped)}%`;
    }
    if (mgBtnLabel && !isGameReady && !userWantsToStart) {
      mgBtnLabel.textContent = `⏳ PREPARING DHAM… ${Math.round(clamped)}%`;
    }
  }

  function setProgress(percent, item, { fromCache = false } = {}) {
    targetProgress = Math.max(0, Math.min(100, percent || 0));
    if (fromCache) {
      if (splashSublabelEl) splashSublabelEl.textContent = '⚡ Loading from local cache… almost ready!';
      if (mgStreamLabel && !isGameReady) {
        mgStreamLabel.textContent = `⚡ Loading 3D Temple from cache… ${Math.round(targetProgress)}%`;
      }
    } else {
      if (splashSublabelEl) splashSublabelEl.textContent = '⚡ Streaming Temple & Lord Narsimhadev first… game starts soon!';
      if (mgStreamLabel && !isGameReady) {
        mgStreamLabel.textContent = `⚡ Streaming 3D Temple & Lord Narsimhadev… ${Math.round(targetProgress)}%`;
      }
    }
    renderProgress();
  }

  function startLoreCycle() {
    if (loreTimer) clearInterval(loreTimer);
    loreTimer = setInterval(() => {
      const loreEl = document.getElementById('splash-lore');
      if (!loreEl) return;
      loreIndex = (loreIndex + 1) % LORE_TIPS.length;
      loreEl.style.opacity = '0';
      loreEl.style.transform = 'translateY(4px)';
      setTimeout(() => {
        loreEl.textContent = LORE_TIPS[loreIndex];
        loreEl.style.opacity = '1';
        loreEl.style.transform = 'translateY(0)';
      }, 350);
    }, 4500);
  }

  // --- Motion Graphic Showcase (Phase 2) ---

  function initMotionGraphicElements() {
    mgOverlay = document.getElementById('motion-graphic');
    if (!mgOverlay) return;

    mgCanvas = document.getElementById('mg-canvas');
    mgStartBtn = document.getElementById('mg-start-btn');
    mgSkipBtn = document.getElementById('mg-skip-btn');
    mgSoundBtn = document.getElementById('mg-sound-btn');
    mgSoundLabel = document.getElementById('mg-sound-label');
    mgStreamingBox = document.getElementById('mg-streaming-status');
    mgStreamBar = document.getElementById('mg-stream-bar');
    mgStreamLabel = document.getElementById('mg-stream-label');
    mgBtnLabel = document.getElementById('mg-btn-label');

    if (mgCanvas) {
      mgCtx = mgCanvas.getContext('2d');
      resizeMgCanvas();
      window.addEventListener('resize', resizeMgCanvas);
    }

    if (isGameReady) {
      setReady();
    } else {
      renderProgress();
    }

    if (listenersAttached) return;
    listenersAttached = true;

    // Attach listeners
    if (mgStartBtn) {
      mgStartBtn.addEventListener('click', handleStart);
      mgStartBtn.addEventListener('touchend', handleStart, { passive: true });
    }
    if (mgSkipBtn) {
      mgSkipBtn.addEventListener('click', handleSkip);
      mgSkipBtn.addEventListener('touchend', handleSkip, { passive: true });
    }
    if (mgSoundBtn) {
      mgSoundBtn.addEventListener('click', toggleSound);
      mgSoundBtn.addEventListener('touchend', toggleSound, { passive: true });
    }

    // Scene indicator dots
    const dots = mgOverlay.querySelectorAll('.mg-dot');
    dots.forEach((dot) => {
      dot.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.getAttribute('data-index') || '0');
        showScene(idx);
        restartSceneTimer();
      });
    });

    // Tap anywhere to unlock audio if blocked by browser policy
    mgOverlay.addEventListener(
      'pointerdown',
      () => {
        if (!isSoundActive && youtubeMusic) {
          triggerAudio();
        }
      },
      { once: true },
    );
  }

  function resizeMgCanvas() {
    if (!mgCanvas) return;
    mgCanvas.width = window.innerWidth;
    mgCanvas.height = window.innerHeight;
  }

  function createMgParticles() {
    mgParticles = [];
    const count = Math.min(80, Math.floor((window.innerWidth * window.innerHeight) / 14000));
    for (let i = 0; i < count; i++) {
      mgParticles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 3 + 1,
        speedY: Math.random() * 0.6 + 0.25,
        speedX: (Math.random() - 0.5) * 0.5,
        alpha: Math.random() * 0.7 + 0.2,
        pulseSpeed: Math.random() * 0.003 + 0.001,
        phase: Math.random() * Math.PI * 2,
        color: Math.random() > 0.3 ? '#ffd700' : '#ff9900',
      });
    }
  }

  function startMgCanvasLoop() {
    if (mgAnimId) return;

    let angle = 0;
    let lastTime = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      // Smooth progress interpolation
      if (currentProgress < targetProgress) {
        currentProgress += (targetProgress - currentProgress) * Math.min(1, dt * 5);
        if (Math.abs(targetProgress - currentProgress) < 0.2) currentProgress = targetProgress;
        renderProgress();
      }

      if (!mgCtx || !mgCanvas) return;
      mgCtx.clearRect(0, 0, mgCanvas.width, mgCanvas.height);

      const cx = mgCanvas.width * 0.5;
      const cy = mgCanvas.height * 0.42;

      // 1. Dynamic Sacred Aura Background Glow
      const glowGrad = mgCtx.createRadialGradient(cx, cy, 30, cx, cy, Math.max(cx, cy) * 0.85);
      glowGrad.addColorStop(0, 'rgba(255, 195, 50, 0.16)');
      glowGrad.addColorStop(0.35, 'rgba(220, 120, 20, 0.08)');
      glowGrad.addColorStop(0.7, 'rgba(20, 12, 6, 0.03)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      mgCtx.fillStyle = glowGrad;
      mgCtx.fillRect(0, 0, mgCanvas.width, mgCanvas.height);

      // 2. Rotating Sacred Mandala Rings (Vedic Geometry Motif)
      angle += 0.002;
      mgCtx.save();
      mgCtx.translate(cx, cy);
      mgCtx.rotate(angle);
      mgCtx.strokeStyle = 'rgba(255, 215, 0, 0.12)';
      mgCtx.lineWidth = 1.2;

      // Inner ring
      mgCtx.beginPath();
      mgCtx.arc(0, 0, 110, 0, Math.PI * 2);
      mgCtx.stroke();

      // Outer petals/rays
      const petals = 12;
      for (let i = 0; i < petals; i++) {
        const theta = (i * 2 * Math.PI) / petals;
        const x1 = Math.cos(theta) * 110;
        const y1 = Math.sin(theta) * 110;
        const x2 = Math.cos(theta) * 165;
        const y2 = Math.sin(theta) * 165;
        mgCtx.beginPath();
        mgCtx.moveTo(x1, y1);
        mgCtx.lineTo(x2, y2);
        mgCtx.stroke();
      }
      mgCtx.restore();

      // 3. Floating Golden Dust Particles
      for (const p of mgParticles) {
        p.y -= p.speedY;
        p.x += Math.sin(now * 0.0012 + p.phase) * p.speedX;

        if (p.y < -20) {
          p.y = mgCanvas.height + 20;
          p.x = Math.random() * mgCanvas.width;
        }

        const pulse = 0.5 + 0.5 * Math.sin(now * p.pulseSpeed + p.phase);
        mgCtx.beginPath();
        mgCtx.arc(p.x, p.y, p.r * (0.8 + 0.4 * pulse), 0, Math.PI * 2);
        mgCtx.fillStyle = p.color;
        mgCtx.globalAlpha = p.alpha * pulse;
        mgCtx.shadowColor = '#ffd700';
        mgCtx.shadowBlur = 10;
        mgCtx.fill();
      }
      mgCtx.globalAlpha = 1.0;
      mgCtx.shadowBlur = 0;

      mgAnimId = requestAnimationFrame(loop);
    };

    mgAnimId = requestAnimationFrame(loop);
  }

  function stopMgCanvasLoop() {
    if (mgAnimId) {
      cancelAnimationFrame(mgAnimId);
      mgAnimId = null;
    }
  }

  function showScene(idx) {
    sceneIndex = (idx + SCENES.length) % SCENES.length;
    const scenes = mgOverlay ? mgOverlay.querySelectorAll('.mg-scene') : [];
    scenes.forEach((s, i) => {
      s.classList.toggle('active', i === sceneIndex);
    });

    const dots = mgOverlay ? mgOverlay.querySelectorAll('.mg-dot') : [];
    dots.forEach((d, i) => {
      d.classList.toggle('active', i === sceneIndex);
    });
  }

  function startSceneTimer() {
    if (sceneTimer) clearInterval(sceneTimer);
    sceneTimer = setInterval(() => {
      showScene(sceneIndex + 1);
    }, 4200);
  }

  function restartSceneTimer() {
    startSceneTimer();
  }

  function triggerAudio() {
    if (youtubeMusic) {
      try {
        youtubeMusic.play();
        isSoundActive = true;
        updateSoundUI(true);
      } catch (err) {
        console.warn('[motion-graphic] Audio play error:', err);
      }
    }
  }

  function toggleSound(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!youtubeMusic) return;

    if (isSoundActive) {
      youtubeMusic.pause();
      isSoundActive = false;
      updateSoundUI(false);
    } else {
      youtubeMusic.play();
      isSoundActive = true;
      updateSoundUI(true);
    }
  }

  function updateSoundUI(playing) {
    if (!mgSoundLabel || !mgSoundBtn) return;
    if (playing) {
      mgSoundLabel.textContent = 'Kirtan Playing';
      mgSoundBtn.classList.add('playing');
    } else {
      mgSoundLabel.textContent = 'Sound Muted';
      mgSoundBtn.classList.remove('playing');
    }

    const visualizer = document.querySelector('.mg-visualizer');
    if (visualizer) {
      visualizer.classList.toggle('active', playing);
    }
  }

  function setReady() {
    isGameReady = true;
    targetProgress = 100;
    currentProgress = 100;
    if (mgStreamBar) mgStreamBar.style.width = '100%';
    if (mgStreamLabel) {
      mgStreamLabel.textContent = '✨ 3D Temple & Lord Narsimhadev Ready!';
    }
    if (mgStreamingBox) {
      mgStreamingBox.classList.add('ready');
    }
    if (mgStartBtn) {
      mgStartBtn.classList.remove('waiting');
      mgStartBtn.classList.add('ready');
    }
    if (mgBtnLabel) {
      mgBtnLabel.textContent = '🎁 ENTER MAYAPUR DHAM';
    }

    if (userWantsToStart) {
      userWantsToStart = false;
      finishMotionGraphic({ autoStart: userWantsAutoStart });
    }
  }

  function handleStart(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!isGameReady) {
      userWantsToStart = true;
      userWantsAutoStart = true;
      if (mgBtnLabel) {
        mgBtnLabel.textContent = '⏳ Entering as soon as ready…';
      }
      return;
    }
    finishMotionGraphic({ autoStart: true });
  }

  function handleSkip(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!isGameReady) {
      userWantsToStart = true;
      userWantsAutoStart = false;
      if (mgBtnLabel) {
        mgBtnLabel.textContent = '⏳ Entering as soon as ready…';
      }
      return;
    }
    finishMotionGraphic({ autoStart: false });
  }

  function finishMotionGraphic({ autoStart = true } = {}) {
    if (!isActive) return;
    isActive = false;

    if (sceneTimer) {
      clearInterval(sceneTimer);
      sceneTimer = null;
    }
    stopMgCanvasLoop();

    if (mgOverlay) {
      mgOverlay.classList.add('fade-out');
      setTimeout(() => {
        mgOverlay.classList.add('hidden');
        mgOverlay.classList.remove('fade-out');
      }, 500);
    }

    if (typeof onCompleteCallback === 'function') {
      onCompleteCallback({ autoStart });
    }
  }

  // --- Public API ---

  function start({ onComplete } = {}) {
    isActive = true;
    onCompleteCallback = onComplete;
    userWantsToStart = false;

    // Ensure elements are ready
    initMotionGraphicElements();

    // Hide loading screen cleanly
    stopSplashLoop();
    if (splashEl) {
      splashEl.classList.add('hidden');
    }

    // Show motion graphic overlay
    if (mgOverlay) {
      mgOverlay.classList.remove('hidden');
      mgOverlay.classList.add('fade-in');
      setTimeout(() => mgOverlay.classList.remove('fade-in'), 600);
    }

    if (isGameReady) {
      setReady();
    }

    // Initialize scenes and particles
    showScene(0);
    startSceneTimer();
    createMgParticles();
    startMgCanvasLoop();

    // Attempt to start music
    triggerAudio();
  }

  // Initialize elements and start preview immediately
  initMotionGraphicElements();
  createMgParticles();
  startMgCanvasLoop();
  startSceneTimer();

  return {
    setProgress,
    setReady,
    isReady: () => isGameReady,
    start,
    isActive: () => isActive,
  };
}
