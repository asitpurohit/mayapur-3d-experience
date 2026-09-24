import * as THREE from 'three';
import { makeRiverBoat } from './environment.js';

const SETTINGS = {
  maxSpeed: 60,
  reverseSpeed: 22,
  accel: 2.1,
  turnRate: 1.5,
  waterY: -3.42,
  // The rideable boat floats high so its deck stays clearly above the water.
  floatOffset: 0.55,
  spawn: { x: -390, z: -248, heading: -Math.PI / 2 },
  // The Ganga ribbon spans z -480..-230 and x -1300..1300; the hull must stay
  // fully inside it, so the drivable area is inset by the hull footprint.
  water: { minX: -1290, maxX: 1290, minZ: -478, maxZ: -232 },
  hullHalfLength: 12.5,
  hullHalfWidth: 3.8,
};

export function createBoat({ camera, touchControls = null, spawn = SETTINGS.spawn } = {}) {
  const group = makeRiverBoat(24, 7, 0x7a4b2c, 0xd8b06a);
  group.name = 'rideable-boat';

  // A small mast and pennant so the boat is easy to spot from the air.
  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.7 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 7, 6), poleMaterial);
  pole.position.set(-8, 3.5, 0);
  group.add(pole);

  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 1.3),
    new THREE.MeshStandardMaterial({ color: 0xff8c3a, roughness: 0.8, side: THREE.DoubleSide }),
  );
  flag.position.set(-6.6, 6.1, 0);
  group.add(flag);

  // Floating "BOAT RIDE" sign so players understand the boat is rideable.
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512;
  signCanvas.height = 128;
  const signCtx = signCanvas.getContext('2d');
  signCtx.fillStyle = 'rgba(10, 18, 28, 0.85)';
  if (typeof signCtx.roundRect === 'function') {
    signCtx.beginPath();
    signCtx.roundRect(8, 8, 496, 112, 28);
    signCtx.fill();
    signCtx.strokeStyle = 'rgba(255, 215, 0, 0.9)';
    signCtx.lineWidth = 6;
    signCtx.stroke();
  } else {
    signCtx.fillRect(8, 8, 496, 112);
    signCtx.strokeStyle = 'rgba(255, 215, 0, 0.9)';
    signCtx.lineWidth = 6;
    signCtx.strokeRect(8, 8, 496, 112);
  }
  signCtx.font = 'bold 62px system-ui, sans-serif';
  signCtx.textAlign = 'center';
  signCtx.textBaseline = 'middle';
  signCtx.fillStyle = '#ffe9a8';
  signCtx.fillText('BOAT RIDE', 256, 68);

  const signTexture = new THREE.CanvasTexture(signCanvas);
  signTexture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Sprite(new THREE.SpriteMaterial({
    map: signTexture,
    transparent: true,
    depthWrite: false,
  }));
  sign.position.set(0, 11, 0);
  sign.scale.set(8, 2, 1);
  sign.name = 'boat-ride-sign';
  group.add(sign);

  const state = {
    position: new THREE.Vector3(spawn.x, SETTINGS.waterY + SETTINGS.floatOffset, spawn.z),
    speed: 0,
    heading: spawn.heading,
    enabled: false,
  };

  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  function enter() {
    state.enabled = true;
  }

  // Hold position while paused; the rider stays aboard.
  function pause() {
    state.enabled = false;
  }

  function exit() {
    state.enabled = false;
    state.speed = 0;
    keys.clear();
  }

  // Return the boat to its mooring at the ghat so it is always waiting there.
  function resetToSpawn() {
    state.position.set(spawn.x, SETTINGS.waterY + SETTINGS.floatOffset, spawn.z);
    state.speed = 0;
    state.heading = spawn.heading;
    group.position.copy(state.position);
    group.rotation.y = -state.heading;
  }

  let elapsed = 0;

  function update(dt) {
    elapsed += dt;

    let input = 0;
    let turn = 0;
    if (state.enabled) {
      if (keys.has('KeyW') || keys.has('ArrowUp')) input += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) input -= 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) turn -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) turn += 1;

      if (touchControls) {
        const ts = touchControls.state;
        input += ts.moveY;
        turn += ts.moveX;
      }
    }
    input = THREE.MathUtils.clamp(input, -1, 1);
    turn = THREE.MathUtils.clamp(turn, -1, 1);

    const target = input > 0 ? SETTINGS.maxSpeed : input < 0 ? -SETTINGS.reverseSpeed : 0;
    state.speed += (target - state.speed) * (1 - Math.exp(-SETTINGS.accel * dt));

    // The rudder only bites while the boat is moving. Steering keeps the same
    // A=left / D=right feel whether going ahead or astern.
    const steer = Math.min(1, Math.abs(state.speed) / 10);
    state.heading += turn * SETTINGS.turnRate * steer * dt;

    let nx = state.position.x + Math.cos(state.heading) * state.speed * dt;
    let nz = state.position.z + Math.sin(state.heading) * state.speed * dt;

    // Keep the whole hull on the water: the allowed box shrinks with the
    // boat's footprint for its current heading.
    const cos = Math.cos(state.heading);
    const sin = Math.sin(state.heading);
    const extentX = Math.abs(cos) * SETTINGS.hullHalfLength + Math.abs(sin) * SETTINGS.hullHalfWidth;
    const extentZ = Math.abs(sin) * SETTINGS.hullHalfLength + Math.abs(cos) * SETTINGS.hullHalfWidth;
    const minX = SETTINGS.water.minX + extentX;
    const maxX = SETTINGS.water.maxX - extentX;
    const minZ = SETTINGS.water.minZ + extentZ;
    const maxZ = SETTINGS.water.maxZ - extentZ;

    let blocked = false;
    if (nx < minX) {
      nx = minX;
      blocked = true;
    } else if (nx > maxX) {
      nx = maxX;
      blocked = true;
    }
    if (nz < minZ) {
      nz = minZ;
      blocked = true;
    } else if (nz > maxZ) {
      nz = maxZ;
      blocked = true;
    }
    if (blocked) state.speed *= 0.25;

    state.position.set(nx, SETTINGS.waterY + SETTINGS.floatOffset, nz);

    group.position.set(
      state.position.x,
      state.position.y + Math.sin(elapsed * 1.5) * 0.06,
      state.position.z,
    );
    group.rotation.y = -state.heading;
    group.rotation.z = Math.sin(elapsed * 1.1) * 0.02 - turn * 0.05 * steer;
    group.rotation.x = Math.sin(elapsed * 0.9) * 0.015;

    // Seated view: the camera sits at the stern, level with the horizon, so
    // the boat's deck and bow are visible straight ahead (no chase camera).
    const seatBack = 6.5;
    const camX = state.position.x - Math.cos(state.heading) * seatBack;
    const camZ = state.position.z - Math.sin(state.heading) * seatBack;
    const camY = state.position.y + 3.4;
    camera.position.set(camX, camY, camZ);
    camera.lookAt(
      state.position.x + Math.cos(state.heading) * 40,
      camY,
      state.position.z + Math.sin(state.heading) * 40,
    );
  }

  group.position.copy(state.position);
  group.rotation.y = -state.heading;

  return { group, state, keys, enter, pause, exit, resetToSpawn, update, SETTINGS };
}
