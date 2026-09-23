import * as THREE from 'three';
import { groundHeightAt, slopeAt } from './terrain.js';

const SETTINGS = {
  walkSpeed: 4.2,
  runSpeed: 8.0,
  acceleration: 12,
  friction: 10,
  gravity: 22,
  jumpVelocity: 7.5,
  eyeHeight: 1.7,
  playerRadius: 0.35,
  maxSlope: THREE.MathUtils.degToRad(50),
  mouseSensitivity: 0.0022,
  bounds: 205,
};

function shortestAngle(from, to) {
  let diff = (to - from) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

export function createPlayer({
  camera,
  domElement,
  spawn = { x: 0, z: 170, heading: Math.PI },
  groundHeight = groundHeightAt,
  colliders = [],
  thirdPerson = false,
}) {
  const cam = {
    dist: 3.6,
    height: 2.2,
    pitchOffset: -0.12,
    lookAhead: 0.65,
    smooth: 12,
  };

  const state = {
    position: new THREE.Vector3(spawn.x, groundHeight(spawn.x, spawn.z, spawn.y ?? 0), spawn.z),
    velocity: new THREE.Vector3(),
    grounded: true,
    speed: 0,
    heading: spawn.heading,
    camYaw: spawn.heading,
    camPitch: -0.05,
    enabled: false,
    walked: 0,
    thirdPerson,
  };

  const keys = new Set();
  let pointerLocked = false;
  const _camTarget = new THREE.Vector3();
  const _camPos = new THREE.Vector3();
  const _smoothedLookTarget = new THREE.Vector3();
  let _camInitialized = false;

  function registerInput() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => keys.delete(e.code));
    window.addEventListener('blur', () => keys.clear());

    domElement.addEventListener('click', () => {
      if (state.enabled && !pointerLocked) domElement.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      pointerLocked = document.pointerLockElement === domElement;
    });
    document.addEventListener('mousemove', (e) => {
      if (!pointerLocked || !state.enabled) return;
      state.camYaw -= e.movementX * SETTINGS.mouseSensitivity;
      state.camPitch = THREE.MathUtils.clamp(
        state.camPitch - e.movementY * SETTINGS.mouseSensitivity,
        -1.35,
        1.35,
      );
    });
  }

  function update(dt) {
    const forward = new THREE.Vector3(-Math.sin(state.camYaw), 0, -Math.cos(state.camYaw));
    const right = new THREE.Vector3(Math.cos(state.camYaw), 0, -Math.sin(state.camYaw));

    let wishX = 0;
    let wishZ = 0;
    if (state.enabled) {
      if (keys.has('KeyW') || keys.has('ArrowUp')) {
        wishX += forward.x;
        wishZ += forward.z;
      }
      if (keys.has('KeyS') || keys.has('ArrowDown')) {
        wishX -= forward.x;
        wishZ -= forward.z;
      }
      if (keys.has('KeyD') || keys.has('ArrowRight')) {
        wishX += right.x;
        wishZ += right.z;
      }
      if (keys.has('KeyA') || keys.has('ArrowLeft')) {
        wishX -= right.x;
        wishZ -= right.z;
      }
      if (keys.has('Space') && state.grounded) {
        state.velocity.y = SETTINGS.jumpVelocity;
        state.grounded = false;
      }
    }

    const len = Math.hypot(wishX, wishZ);
    if (len > 0) {
      wishX /= len;
      wishZ /= len;
      const targetHeading = Math.atan2(-wishX, -wishZ);
      state.heading += shortestAngle(state.heading, targetHeading) * Math.min(1, dt * 10);
    }

    const running = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const targetSpeed = len > 0 ? (running ? SETTINGS.runSpeed : SETTINGS.walkSpeed) : 0;

    const velX = state.velocity.x;
    const velZ = state.velocity.z;
    const accel = len > 0 ? SETTINGS.acceleration : SETTINGS.friction;
    const damp = Math.exp(-accel * dt);
    let nx = wishX * targetSpeed + (velX - wishX * targetSpeed) * damp;
    let nz = wishZ * targetSpeed + (velZ - wishZ * targetSpeed) * damp;

    if (targetSpeed === 0) {
      nx = velX * Math.exp(-SETTINGS.friction * dt);
      nz = velZ * Math.exp(-SETTINGS.friction * dt);
    }

    state.velocity.x = nx;
    state.velocity.z = nz;
    state.speed = Math.hypot(state.velocity.x, state.velocity.z);

    const nextX = state.position.x + state.velocity.x * dt;
    const nextZ = state.position.z + state.velocity.z * dt;

    const clampedX = THREE.MathUtils.clamp(nextX, -SETTINGS.bounds, SETTINGS.bounds);
    const clampedZ = THREE.MathUtils.clamp(nextZ, -SETTINGS.bounds, SETTINGS.bounds);

    const feetY = state.position.y;
    const hNow = groundHeight(state.position.x, state.position.z, feetY);
    const hNext = groundHeight(clampedX, clampedZ, feetY);
    const rise = hNext - hNow;
    const stepUp = hNext - feetY;
    const dist = Math.hypot(clampedX - state.position.x, clampedZ - state.position.z) || 1e-5;
    const slopeAngle = Math.atan2(Math.max(0, rise), dist);
    const localSlope = slopeAt(clampedX, clampedZ);

    const blocked =
      localSlope > SETTINGS.maxSlope + THREE.MathUtils.degToRad(8) ||
      (state.grounded && stepUp > 1.05 && slopeAngle > THREE.MathUtils.degToRad(55));

    if (!blocked) {
      state.position.x = clampedX;
      state.position.z = clampedZ;
      state.walked += dist;
    } else {
      const slideX = state.position.x + state.velocity.x * dt * 0.15;
      const slideZ = state.position.z + state.velocity.z * dt * 0.15;
      const hSlide = groundHeight(slideX, slideZ, feetY);
      if (slopeAt(slideX, slideZ) <= SETTINGS.maxSlope && hSlide - feetY < 0.6) {
        state.position.x = slideX;
        state.position.z = slideZ;
      }
      state.velocity.x *= 0.2;
      state.velocity.z *= 0.2;
    }

    const groundY = groundHeight(state.position.x, state.position.z, state.position.y);

    const r = SETTINGS.playerRadius;
    for (const c of colliders) {
      if (state.position.y > c.maxY - 0.2) continue;
      const closestX = Math.max(c.minX, Math.min(state.position.x, c.maxX));
      const closestZ = Math.max(c.minZ, Math.min(state.position.z, c.maxZ));
      let dx = state.position.x - closestX;
      let dz = state.position.z - closestZ;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        state.position.x = closestX + (dx / d) * r;
        state.position.z = closestZ + (dz / d) * r;
      } else {
        const penL = state.position.x - c.minX;
        const penR = c.maxX - state.position.x;
        const penB = state.position.z - c.minZ;
        const penF = c.maxZ - state.position.z;
        const m = Math.min(penL, penR, penB, penF);
        if (m === penL) state.position.x = c.minX - r;
        else if (m === penR) state.position.x = c.maxX + r;
        else if (m === penB) state.position.z = c.minZ - r;
        else state.position.z = c.maxZ + r;
      }
      state.velocity.x *= 0.2;
      state.velocity.z *= 0.2;
    }

    if (state.grounded) {
      if (groundY >= state.position.y - 0.45) {
        state.position.y = groundY;
        state.velocity.y = 0;
      } else {
        state.grounded = false;
      }
    }

    if (!state.grounded) {
      state.velocity.y -= SETTINGS.gravity * dt;
      state.position.y += state.velocity.y * dt;
      if (state.position.y <= groundY) {
        state.position.y = groundY;
        state.velocity.y = 0;
        state.grounded = true;
      }
    }

    if (state.position.y < groundY - 0.5) {
      state.position.y = groundY;
      state.velocity.y = 0;
      state.grounded = true;
    }

    if (state.thirdPerson) {
      const pitch = THREE.MathUtils.clamp(state.camPitch + cam.pitchOffset, -1.2, 1.1);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const dirX = -Math.sin(state.camYaw) * cp;
      const dirY = sp;
      const dirZ = -Math.cos(state.camYaw) * cp;

      _camTarget.set(
        state.position.x,
        state.position.y + 1.35,
        state.position.z,
      );
      _camPos.set(
        _camTarget.x - dirX * cam.dist,
        _camTarget.y - dirY * cam.dist + cam.height * 0.35,
        _camTarget.z - dirZ * cam.dist,
      );

      const groundAtCam = groundHeight(_camPos.x, _camPos.z, _camPos.y);
      const minY = groundAtCam + 0.6;
      if (_camPos.y < minY) _camPos.y = minY;

      if (!_camInitialized) {
        camera.position.copy(_camPos);
        _smoothedLookTarget.copy(_camTarget);
        _camInitialized = true;
      }

      const k = 1 - Math.exp(-cam.smooth * dt);
      camera.position.lerp(_camPos, k);
      _smoothedLookTarget.lerp(_camTarget, k);

      camera.lookAt(
        _smoothedLookTarget.x + dirX * cam.lookAhead,
        _smoothedLookTarget.y + dirY * cam.lookAhead,
        _smoothedLookTarget.z + dirZ * cam.lookAhead,
      );
      return;
    }

    camera.position.set(
      state.position.x,
      state.position.y + SETTINGS.eyeHeight,
      state.position.z,
    );

    const look = new THREE.Vector3(
      -Math.sin(state.camYaw) * Math.cos(state.camPitch),
      Math.sin(state.camPitch),
      -Math.cos(state.camYaw) * Math.cos(state.camPitch),
    );
    camera.lookAt(camera.position.clone().add(look));
  }

  function reset() {
    state.position.set(spawn.x, groundHeight(spawn.x, spawn.z, spawn.y ?? 0), spawn.z);
    state.velocity.set(0, 0, 0);
    state.grounded = true;
    state.speed = 0;
    state.heading = spawn.heading;
    state.camYaw = spawn.heading;
    state.camPitch = -0.05;
    state.walked = 0;
    keys.clear();
    _camInitialized = false;
  }

  registerInput();

  return { state, update, reset, camera, SETTINGS, keys };
}
