import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ENTRANCE } from './entrance.js';

const ARATI = {
  x: ENTRANCE.doorX,
  z: ENTRANCE.interior.altarZ || 55,
  // Appears a few steps after stepping through the main entrance.
  radius: 24,
  minY: 35,
  duration: 45,
  flowers: 45,
  // Arati bhajan requested for the offering, starting 30 s in.
  videoId: 'cIKDGn9nANk',
  startSeconds: 30,
  floorY: 40.2,
  topY: 47,
  maxY: 47,
  circleCenterY: 41,
  circleRadius: 1.4,
  circleSpeed: 1.4,
};

// A small marigold-like flower head: six petals around a centre.
export function makeFlowerGeometry() {
  const petal = new THREE.SphereGeometry(0.1, 4, 3);
  const parts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const g = petal.clone();
    g.scale(0.72, 0.32, 1.0);
    g.translate(0, 0, 0.085);
    g.rotateX(-0.35);
    g.rotateY(angle);
    parts.push(g);
  }
  parts.push(new THREE.SphereGeometry(0.05, 5, 4));
  const merged = mergeGeometries(parts, false);
  petal.dispose();
  return merged;
}

function makeGlowSprite() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 195, 95, 0.85)');
  gradient.addColorStop(0.4, 'rgba(255, 150, 40, 0.32)');
  gradient.addColorStop(1, 'rgba(255, 120, 20, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  sprite.position.y = 0.4;
  sprite.scale.set(2.6, 2.6, 1);
  return sprite;
}

function makeAratiPlate() {
  const group = new THREE.Group();
  group.name = 'arati-plate';

  const brass = new THREE.MeshStandardMaterial({ color: 0xd9a92a, roughness: 0.3, metalness: 0.8 });
  const flameOuter = new THREE.MeshBasicMaterial({ color: 0xff9a2e });
  const flameInner = new THREE.MeshBasicMaterial({ color: 0xffe28a });

  // Shallow brass tray with a rolled rim.
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.46, 0.05, 24), brass);
  tray.castShadow = true;
  group.add(tray);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.028, 8, 24), brass);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.03;
  group.add(rim);

  // A small side handle.
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.028, 6, 14, Math.PI), brass);
  handle.position.set(0.62, 0.02, 0);
  handle.rotation.z = -Math.PI / 2;
  group.add(handle);

  const addDiya = (px, pz, scale) => {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.075 * scale, 0.1 * scale, 0.09 * scale, 10), brass);
    bowl.position.set(px, 0.07 * scale, pz);
    bowl.castShadow = true;
    group.add(bowl);

    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.05 * scale, 0.15 * scale, 7), flameOuter);
    outer.position.set(px, 0.19 * scale, pz);
    group.add(outer);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.025 * scale, 0.09 * scale, 6), flameInner);
    inner.position.set(px, 0.17 * scale, pz);
    group.add(inner);
  };

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    addDiya(Math.cos(angle) * 0.32, Math.sin(angle) * 0.32, 1);
  }
  addDiya(0, 0, 1.35);

  // Warm glow as a cheap additive sprite (a real light would force every
  // material in the scene to pay for an extra light).
  group.add(makeGlowSprite());

  group.position.set(ARATI.x, ARATI.circleCenterY + ARATI.circleRadius, ARATI.z + 2.2);
  return group;
}

export function createArati({ scene, hud, music = null }) {
  const flowerMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, metalness: 0 });
  const flowers = new THREE.InstancedMesh(makeFlowerGeometry(), flowerMaterial, ARATI.flowers);
  flowers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  flowers.frustumCulled = false;
  flowers.visible = false;
  scene.add(flowers);

  const palette = [
    new THREE.Color(0xffa22b),
    new THREE.Color(0xffd23f),
    new THREE.Color(0xfff2d8),
    new THREE.Color(0xffb3c1),
  ];

  const flowerState = [];
  for (let i = 0; i < ARATI.flowers; i++) {
    flowerState.push({
      x: ARATI.x,
      y: ARATI.floorY,
      z: ARATI.z,
      vy: 1.6,
      sway: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI * 2,
      spin: 1 + Math.random() * 2,
    });
    flowers.setColorAt(i, palette[i % palette.length]);
  }
  if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;

  const plate = makeAratiPlate();
  plate.visible = false;
  scene.add(plate);

  const dummy = new THREE.Object3D();
  let active = false;
  let elapsed = 0;
  let near = false;
  let promptShown = false;

  function spawnFlower(flower, initial) {
    flower.x = ARATI.x + (Math.random() * 2 - 1) * 2.2;
    flower.z = ARATI.z + (Math.random() * 2 - 1) * 2.2;
    flower.y = initial ? ARATI.topY - Math.random() * 6 : ARATI.topY - Math.random() * 1.2;
    flower.vy = 1.5 + Math.random() * 1.3;
    flower.sway = Math.random() * Math.PI * 2;
    flower.rot = Math.random() * Math.PI * 2;
    flower.spin = 1 + Math.random() * 2;
  }

  function start() {
    if (active) return;
    active = true;
    elapsed = 0;
    flowers.visible = true;
    plate.visible = true;
    for (const flower of flowerState) spawnFlower(flower, true);
    hud.showAratiPrompt(false);
    hud.setGameHint('🙏 Arati to Lord Narsimhadeva — flowers are offered', 6000);
    if (music && typeof music.playSpecialTrack === 'function') {
      music.playSpecialTrack(ARATI.videoId, ARATI.startSeconds);
    }
  }

  function stop() {
    active = false;
    elapsed = 0;
    flowers.visible = false;
    plate.visible = false;
    promptShown = false;
    hud.showAratiPrompt(false);
  }

  function update(dt, { phase, mode, playerPos }) {
    // Offered on foot at the altar, or by flying the drone into the hall
    // (the ceiling check keeps it from triggering above the roof).
    const canOffer = phase === 'playing' && (mode === 'walk' || mode === 'drone');
    near = false;
    if (canOffer && playerPos) {
      const dx = playerPos.x - ARATI.x;
      const dz = playerPos.z - ARATI.z;
      near = Math.hypot(dx, dz) < ARATI.radius
        && playerPos.y > ARATI.minY
        && playerPos.y < ARATI.maxY;
    }

    const shouldShow = near && !active;
    if (shouldShow !== promptShown) {
      promptShown = shouldShow;
      hud.showAratiPrompt(shouldShow);
    }

    if (!active) return;

    elapsed += dt;

    for (let i = 0; i < flowerState.length; i++) {
      const flower = flowerState[i];
      flower.y -= flower.vy * dt;
      flower.sway += dt * 1.6;
      flower.rot += dt * flower.spin;

      if (flower.y < ARATI.floorY) {
        if (elapsed < ARATI.duration) {
          spawnFlower(flower, false);
        } else {
          dummy.position.set(ARATI.x, -200, ARATI.z);
          dummy.scale.setScalar(0.0001);
          dummy.updateMatrix();
          flowers.setMatrixAt(i, dummy.matrix);
          continue;
        }
      }

      dummy.position.set(
        flower.x + Math.sin(flower.sway) * 0.25,
        flower.y,
        flower.z + Math.cos(flower.sway * 0.8) * 0.25,
      );
      dummy.rotation.set(0, flower.rot, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      flowers.setMatrixAt(i, dummy.matrix);
    }
    flowers.instanceMatrix.needsUpdate = true;

    // The lamp plate is waved in a clockwise circle in front of the deity
    // (from the devotee's view: top -> right -> bottom -> left).
    const angle = Math.PI / 2 - elapsed * ARATI.circleSpeed;
    plate.position.x = ARATI.x + Math.cos(angle) * ARATI.circleRadius;
    plate.position.y = ARATI.circleCenterY + Math.sin(angle) * ARATI.circleRadius;
    plate.rotation.y += dt * 1.2;

    if (elapsed >= ARATI.duration) {
      active = false;
      flowers.visible = false;
      plate.visible = false;
      if (near) {
        promptShown = true;
        hud.showAratiPrompt(true);
      }
    }
  }

  return { update, start, stop, isActive: () => active, isNear: () => near };
}
