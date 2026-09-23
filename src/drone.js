import * as THREE from 'three';

const SETTINGS = {
  accel: 18,
  friction: 5.5,
  maxSpeed: 26,
  keyboardBoost: 2.7,
  verticalSpeed: 14,
  mouseSensitivity: 0.0022,
  bounds: 750,
  minClearance: 2.2,
  maxAltitude: 450,
};

export function createDrone({ camera, domElement, groundHeight, touchControls = null }) {
  const state = {
    position: new THREE.Vector3(0, 40, 150),
    velocity: new THREE.Vector3(),
    yaw: 0,
    pitch: -0.25,
    enabled: false,
    travelled: 0,
    intro: null,
    started: false,
  };

  const keys = new Set();
  let pointerLocked = false;

  const _dir = new THREE.Vector3();
  const _wish = new THREE.Vector3();
  const _right = new THREE.Vector3();
  const _forward = new THREE.Vector3();
  const _step = new THREE.Vector3();
  const _lookStart = new THREE.Vector3();
  const _lookEnd = new THREE.Vector3();
  const _lookNow = new THREE.Vector3();

  function registerInput() {
    window.addEventListener('keydown', (e) => {
      if (state.enabled && ['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.repeat) return;
      keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      keys.delete(e.code);
      if (state.enabled && ['Space', 'Tab'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('blur', () => keys.clear());

    domElement.addEventListener('click', () => {
      if (state.enabled && !pointerLocked) domElement.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      pointerLocked = document.pointerLockElement === domElement;
    });
    document.addEventListener('mousemove', (e) => {
      if (!pointerLocked || !state.enabled || state.intro) return;
      state.yaw -= e.movementX * SETTINGS.mouseSensitivity;
      state.pitch = THREE.MathUtils.clamp(
        state.pitch - e.movementY * SETTINGS.mouseSensitivity,
        -1.35,
        1.35,
      );
    });
  }

  function lookDirection(out = _dir) {
    const cp = Math.cos(state.pitch);
    return out.set(-Math.sin(state.yaw) * cp, Math.sin(state.pitch), -Math.cos(state.yaw) * cp);
  }

  function applyCamera() {
    camera.position.copy(state.position);
    const dir = lookDirection();
    camera.lookAt(state.position.x + dir.x, state.position.y + dir.y, state.position.z + dir.z);
  }

  function directionToLook(from, look) {
    return _lookEnd.subVectors(look, from).normalize().clone();
  }

  // Fly along a cinematic path (e.g. from Altar out through the temple to lookout),
  // then hand over control to the user.
  function activate({
    from = null,
    to = null,
    look = null,
    path = null,
    lookPath = null,
    duration = 8.5,
  } = {}) {
    state.enabled = true;
    state.started = true;
    state.velocity.set(0, 0, 0);

    if (path && lookPath && path.length > 1) {
      const posCurve = new THREE.CatmullRomCurve3(path, false, 'centripetal');
      const targetCurve = new THREE.CatmullRomCurve3(lookPath, false, 'centripetal');
      state.position.copy(path[0]);

      const initialDir = _dir.subVectors(lookPath[0], path[0]).normalize();
      state.yaw = Math.atan2(-initialDir.x, -initialDir.z);
      state.pitch = Math.asin(THREE.MathUtils.clamp(initialDir.y, -1, 1));

      state.intro = {
        t: 0,
        duration,
        posCurve,
        targetCurve,
      };
    } else if (to && look) {
      if (from) state.position.copy(from);
      state.intro = {
        t: 0,
        duration,
        from: state.position.clone(),
        to: to.clone(),
        lookStart: lookDirection().clone(),
        lookEnd: directionToLook(to, look),
      };
    } else {
      if (from) state.position.copy(from);
      state.intro = null;
    }
    applyCamera();
  }

  // Hold position while the game is paused. Unlike deactivate(), the intro
  // flight (if one is playing) is kept so it can continue after resume.
  function pause() {
    state.enabled = false;
  }

  // Return from a pause without replaying the intro flight.
  function resume() {
    state.enabled = true;
    applyCamera();
  }

  function deactivate() {
    state.enabled = false;
    state.intro = null;
  }

  // Re-capture the mouse for camera control. Must be called from a user
  // gesture (click / key press). Returns a promise that rejects when the
  // browser refuses (e.g. too soon after an exit).
  function capturePointer() {
    if (document.pointerLockElement === domElement) return Promise.resolve();
    const request = domElement.requestPointerLock
      || domElement.mozRequestPointerLock
      || domElement.webkitRequestPointerLock;
    if (typeof request !== 'function') return Promise.reject(new Error('pointer lock unsupported'));
    try {
      const result = request.call(domElement);
      return result && typeof result.then === 'function' ? result : Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function update(dt) {
    if (state.intro) {
      const intro = state.intro;
      intro.t = Math.min(1, intro.t + dt / intro.duration);
      const ease = intro.t * intro.t * (3 - 2 * intro.t);

      if (intro.posCurve && intro.targetCurve) {
        intro.posCurve.getPoint(ease, state.position);
        intro.targetCurve.getPoint(ease, _lookNow);
        _dir.subVectors(_lookNow, state.position).normalize();
        state.yaw = Math.atan2(-_dir.x, -_dir.z);
        state.pitch = Math.asin(THREE.MathUtils.clamp(_dir.y, -1, 1));
      } else {
        state.position.lerpVectors(intro.from, intro.to, ease);
        _lookNow.lerpVectors(intro.lookStart, intro.lookEnd, ease).normalize();
        state.yaw = Math.atan2(-_lookNow.x, -_lookNow.z);
        state.pitch = Math.asin(THREE.MathUtils.clamp(_lookNow.y, -1, 1));
      }

      if (intro.t >= 1) state.intro = null;
      applyCamera();
      return;
    }

    if (touchControls && state.enabled) {
      const { dx, dy } = touchControls.consumeLookDeltas();
      if (dx !== 0 || dy !== 0) {
        state.yaw -= dx * SETTINGS.mouseSensitivity * 1.35;
        state.pitch = THREE.MathUtils.clamp(
          state.pitch - dy * SETTINGS.mouseSensitivity * 1.35,
          -1.35,
          1.35,
        );
      }
    }

    _forward.set(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
    _right.set(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
    _wish.set(0, 0, 0);

    // Keyboard pilots fly a little faster than the touch joystick.
    let keyboardInput = false;

    if (state.enabled) {
      if (keys.has('KeyW') || keys.has('ArrowUp')) { _wish.add(_forward); keyboardInput = true; }
      if (keys.has('KeyS') || keys.has('ArrowDown')) { _wish.sub(_forward); keyboardInput = true; }
      if (keys.has('KeyD') || keys.has('ArrowRight')) { _wish.add(_right); keyboardInput = true; }
      if (keys.has('KeyA') || keys.has('ArrowLeft')) { _wish.sub(_right); keyboardInput = true; }
      if (keys.has('Space') || keys.has('Tab') || keys.has('KeyE')) _wish.y += 1;
      if (keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('KeyQ')) _wish.y -= 1;

      if (touchControls) {
        const ts = touchControls.state;
        if (ts.moveX !== 0 || ts.moveY !== 0) {
          _wish.addScaledVector(_forward, ts.moveY);
          _wish.addScaledVector(_right, ts.moveX);
        }
        if (ts.up) _wish.y += 1;
        if (ts.down) _wish.y -= 1;
      }
    }

    const maxSpeed = keyboardInput ? SETTINGS.maxSpeed * SETTINGS.keyboardBoost : SETTINGS.maxSpeed;

    const input = _wish.length();
    if (input > 0) _wish.divideScalar(input);

    const targetX = _wish.x * maxSpeed;
    const targetY = _wish.y * SETTINGS.verticalSpeed;
    const targetZ = _wish.z * maxSpeed;
    const accel = input > 0 ? SETTINGS.accel : SETTINGS.friction;
    const damp = Math.exp(-accel * dt);

    state.velocity.x = targetX + (state.velocity.x - targetX) * damp;
    state.velocity.y = targetY + (state.velocity.y - targetY) * damp;
    state.velocity.z = targetZ + (state.velocity.z - targetZ) * damp;

    _step.copy(state.velocity).multiplyScalar(dt);
    state.position.add(_step);
    state.travelled += _step.length();

    state.position.x = THREE.MathUtils.clamp(state.position.x, -SETTINGS.bounds, SETTINGS.bounds);
    state.position.z = THREE.MathUtils.clamp(state.position.z, -SETTINGS.bounds, SETTINGS.bounds);

    const floor = groundHeight(state.position.x, state.position.z, state.position.y) + SETTINGS.minClearance;
    if (state.position.y < floor) {
      state.position.y = floor;
      if (state.velocity.y < 0) state.velocity.y = 0;
    }
    if (state.position.y > SETTINGS.maxAltitude) {
      state.position.y = SETTINGS.maxAltitude;
      if (state.velocity.y > 0) state.velocity.y = 0;
    }

    applyCamera();
  }

  registerInput();

  return { state, activate, resume, pause, deactivate, capturePointer, update, SETTINGS, keys };
}
