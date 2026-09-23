/**
 * Mobile Touch Controls for 3D First-Person & Drone navigation.
 * Provides:
 *  - Left-thumb virtual dynamic joystick (movement / WASD)
 *  - Right-thumb swipe surface (camera look / pitch & yaw)
 *  - On-screen Jump & Sprint buttons for Walk mode
 *  - On-screen Up & Down vertical thrusters for Drone mode
 *  - On-screen Pause button (replaces Esc key on mobile)
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
    <div id="touch-joystick-zone">
      <div id="touch-joystick-base">
        <div id="touch-joystick-stick"></div>
      </div>
    </div>
    <div id="touch-look-zone"></div>
    <div id="touch-buttons-walk" class="touch-button-group">
      <button id="touch-btn-sprint" class="touch-btn" aria-label="Sprint">⚡</button>
      <button id="touch-btn-jump" class="touch-btn" aria-label="Jump">⤒</button>
    </div>
    <div id="touch-buttons-drone" class="touch-button-group touch-hidden">
      <button id="touch-btn-up" class="touch-btn" aria-label="Ascend">▲</button>
      <button id="touch-btn-down" class="touch-btn" aria-label="Descend">▼</button>
    </div>
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
  let joyOriginX = 0;
  let joyOriginY = 0;
  const maxRadius = 45; // maximum joystick radius in px

  let lookTouchId = null;
  let lookLastX = 0;
  let lookLastY = 0;

  // Joystick touch handlers
  function handleJoyStart(e) {
    if (joyTouchId !== null) return;
    const touch = e.changedTouches[0];
    joyTouchId = touch.identifier;
    joyOriginX = touch.clientX;
    joyOriginY = touch.clientY;

    joyBase.style.left = `${joyOriginX}px`;
    joyBase.style.top = `${joyOriginY}px`;
    joyBase.style.opacity = '1';
    joyStick.style.transform = `translate(0px, 0px)`;

    state.moveX = 0;
    state.moveY = 0;
  }

  function handleJoyMove(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joyTouchId) {
        const dx = touch.clientX - joyOriginX;
        const dy = touch.clientY - joyOriginY;
        const dist = Math.hypot(dx, dy);
        const clampedDist = Math.min(dist, maxRadius);
        const angle = Math.atan2(dy, dx);

        const stickX = Math.cos(angle) * clampedDist;
        const stickY = Math.sin(angle) * clampedDist;
        joyStick.style.transform = `translate(${stickX}px, ${stickY}px)`;

        // Normalize axes: moveX (-1 to +1), moveY (-1 to +1 where up is forward +1)
        state.moveX = stickX / maxRadius;
        state.moveY = -stickY / maxRadius; // inverted so dragging up = forward
        break;
      }
    }
  }

  function handleJoyEnd(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyTouchId) {
        joyTouchId = null;
        joyBase.style.opacity = '0.35';
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

  // Camera look touch handlers (swipe on right half)
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

  // Button helper to bind press and release
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

  // Consume accumulated look deltas and reset
  function consumeLookDeltas() {
    const dx = state.lookDeltaX;
    const dy = state.lookDeltaY;
    state.lookDeltaX = 0;
    state.lookDeltaY = 0;
    return { dx, dy };
  }

  return {
    state,
    isTouchDevice,
    setMode,
    setVisible,
    consumeLookDeltas,
  };
}
