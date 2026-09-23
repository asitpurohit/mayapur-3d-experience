/**
 * Mobile Touch Controls for 3D First-Person & Drone navigation.
 * 
 * Conflict-Free Dual-Zone Architecture:
 *  - Dedicated bottom-left thumb pad (130x130px) for Movement Joystick
 *  - Universal background surface (remaining ~85% of screen) for Camera Swipe
 *  - Action buttons with stopPropagation so they never conflict
 *  - Smooth exponential lerp filter for silky camera rotation
 */

export function createTouchControls({ onPause = () => {} } = {}) {
  const isTouchDevice =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches;

  // Touch state consumed by player & drone each frame
  const state = {
    isTouchDevice,
    active: false,
    mode: 'walk', // 'walk' | 'drone'
    moveX: 0,     // -1 (left) to +1 (right)
    moveY: 0,     // -1 (backward) to +1 (forward)
    lookDeltaX: 0,
    lookDeltaY: 0,
    jump: false,
    sprint: false,
    up: false,
    down: false,
  };

  // Create DOM elements
  const container = document.createElement('div');
  container.id = 'touch-controls';
  container.className = 'touch-hidden';

  container.innerHTML = `
    <!-- Universal Camera Look Zone (Covers whole screen behind buttons & joystick) -->
    <div id="touch-look-zone"></div>

    <!-- Dedicated Bottom-Left Movement Joystick Pad -->
    <div id="touch-joystick-zone">
      <div id="touch-joystick-base">
        <div id="touch-joystick-stick"></div>
      </div>
    </div>

    <!-- Action Buttons for Walk Mode -->
    <div id="touch-buttons-walk" class="touch-button-group">
      <button id="touch-btn-sprint" class="touch-btn" aria-label="Sprint">⚡</button>
      <button id="touch-btn-jump" class="touch-btn" aria-label="Jump">⤒</button>
    </div>

    <!-- Action Buttons for Drone Mode -->
    <div id="touch-buttons-drone" class="touch-button-group touch-hidden">
      <button id="touch-btn-up" class="touch-btn" aria-label="Ascend">▲</button>
      <button id="touch-btn-down" class="touch-btn" aria-label="Descend">▼</button>
    </div>

    <!-- Mobile Pause Button -->
    <button id="touch-btn-pause" class="touch-btn-pause" aria-label="Pause">⏸</button>
  `;

  document.body.appendChild(container);

  const joyZone = container.querySelector('#touch-joystick-zone');
  const joyBase = container.querySelector('#touch-joystick-base');
  const joyStick = container.querySelector('#touch-joystick-stick');
  const lookZone = container.querySelector('#touch-look-zone');
  const walkButtons = container.querySelector('#touch-buttons-walk');
  const droneButtons = container.querySelector('#touch-buttons-drone');
  const pauseBtn = container.querySelector('#touch-btn-pause');

  const btnJump = container.querySelector('#touch-btn-jump');
  const btnSprint = container.querySelector('#touch-btn-sprint');
  const btnUp = container.querySelector('#touch-btn-up');
  const btnDown = container.querySelector('#touch-btn-down');

  // Multi-touch tracking
  let joyTouchId = null;
  let joyCenterX = 0;
  let joyCenterY = 0;
  const maxRadius = 45; // maximum joystick radius in px
  const deadZone = 4;   // deadzone in px to prevent accidental drift

  let lookTouchId = null;
  let lookLastX = 0;
  let lookLastY = 0;
  let smoothDx = 0;
  let smoothDy = 0;

  // 1. Dedicated Joystick Handlers (Isolated to bottom-left pad)
  function handleJoyStart(e) {
    if (joyTouchId !== null) return;
    e.preventDefault();
    e.stopPropagation(); // Never trigger camera rotation!

    const touch = e.changedTouches[0];
    joyTouchId = touch.identifier;

    const rect = joyZone.getBoundingClientRect();
    joyCenterX = rect.left + rect.width / 2;
    joyCenterY = rect.top + rect.height / 2;

    joyBase.classList.add('active');
    updateStick(touch.clientX, touch.clientY);
  }

  function handleJoyMove(e) {
    e.preventDefault();
    e.stopPropagation();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joyTouchId) {
        updateStick(touch.clientX, touch.clientY);
        break;
      }
    }
  }

  function updateStick(clientX, clientY) {
    const dx = clientX - joyCenterX;
    const dy = clientY - joyCenterY;
    const dist = Math.hypot(dx, dy);

    if (dist < deadZone) {
      joyStick.style.transform = `translate(0px, 0px)`;
      state.moveX = 0;
      state.moveY = 0;
      return;
    }

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const stickX = Math.cos(angle) * clampedDist;
    const stickY = Math.sin(angle) * clampedDist;

    joyStick.style.transform = `translate(${stickX}px, ${stickY}px)`;

    // Normalize axes: moveX (-1 to +1), moveY (-1 to +1 where up is forward +1)
    state.moveX = stickX / maxRadius;
    state.moveY = -stickY / maxRadius; // invert Y so pushing up = forward
  }

  function handleJoyEnd(e) {
    e.preventDefault();
    e.stopPropagation();

    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyTouchId) {
        joyTouchId = null;
        joyBase.classList.remove('active');
        joyStick.style.transform = `translate(0px, 0px)`;
        state.moveX = 0;
        state.moveY = 0;
        break;
      }
    }
  }

  joyZone.addEventListener('touchstart', handleJoyStart, { passive: false });
  joyZone.addEventListener('touchmove', handleJoyMove, { passive: false });
  joyZone.addEventListener('touchend', handleJoyEnd, { passive: false });
  joyZone.addEventListener('touchcancel', handleJoyEnd, { passive: false });

  // 2. Camera Look Handlers (Universal swipe everywhere outside joystick)
  function handleLookStart(e) {
    if (lookTouchId !== null) return;
    const touch = e.changedTouches[0];
    lookTouchId = touch.identifier;
    lookLastX = touch.clientX;
    lookLastY = touch.clientY;
  }

  function handleLookMove(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchId) {
        const dx = touch.clientX - lookLastX;
        const dy = touch.clientY - lookLastY;
        lookLastX = touch.clientX;
        lookLastY = touch.clientY;

        // Accumulate look deltas
        state.lookDeltaX += dx;
        state.lookDeltaY += dy;
        break;
      }
    }
  }

  function handleLookEnd(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId) {
        lookTouchId = null;
        break;
      }
    }
  }

  lookZone.addEventListener('touchstart', handleLookStart, { passive: false });
  lookZone.addEventListener('touchmove', handleLookMove, { passive: false });
  lookZone.addEventListener('touchend', handleLookEnd, { passive: false });
  lookZone.addEventListener('touchcancel', handleLookEnd, { passive: false });

  // 3. Button Bindings (Stop propagation to prevent look swipe)
  function bindButton(btn, onDown, onUp) {
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.add('active');
      onDown();
    }, { passive: false });

    const handleUp = (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.remove('active');
      onUp();
    };

    btn.addEventListener('touchend', handleUp, { passive: false });
    btn.addEventListener('touchcancel', handleUp, { passive: false });
  }

  bindButton(btnJump, () => { state.jump = true; }, () => { state.jump = false; });
  bindButton(btnSprint, () => { state.sprint = true; }, () => { state.sprint = false; });
  bindButton(btnUp, () => { state.up = true; }, () => { state.up = false; });
  bindButton(btnDown, () => { state.down = true; }, () => { state.down = false; });

  pauseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onPause();
  });
  pauseBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onPause();
  }, { passive: false });

  function setMode(newMode) {
    state.mode = newMode;
    if (newMode === 'drone') {
      walkButtons.classList.add('touch-hidden');
      droneButtons.classList.remove('touch-hidden');
    } else {
      walkButtons.classList.remove('touch-hidden');
      droneButtons.classList.add('touch-hidden');
    }
  }

  function setVisible(show) {
    state.active = show;
    if (show && isTouchDevice) {
      container.classList.remove('touch-hidden');
    } else {
      container.classList.add('touch-hidden');
    }
  }

  // Consume accumulated look deltas with exponential smoothing
  function consumeLookDeltas() {
    const rawX = state.lookDeltaX;
    const rawY = state.lookDeltaY;
    state.lookDeltaX = 0;
    state.lookDeltaY = 0;

    // Exponential smoothing for buttery camera motion
    smoothDx = smoothDx * 0.35 + rawX * 0.65;
    smoothDy = smoothDy * 0.35 + rawY * 0.65;

    // Zero out tiny residual values
    if (Math.abs(smoothDx) < 0.01) smoothDx = 0;
    if (Math.abs(smoothDy) < 0.01) smoothDy = 0;

    return { dx: smoothDx, dy: smoothDy };
  }

  return {
    state,
    isTouchDevice,
    setMode,
    setVisible,
    consumeLookDeltas,
  };
}
