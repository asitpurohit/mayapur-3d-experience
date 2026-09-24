import * as THREE from 'three';
import { makeFlowerGeometry } from './arati.js';

const DURATION = 12;
const FLOWER_COUNT = 130;
const RAIN_COUNT = 110;

// A shower of flowers and rain around the viewer for the final blessing.
export function createBlessing({ scene, camera }) {
  const flowerMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, metalness: 0 });
  const flowers = new THREE.InstancedMesh(makeFlowerGeometry(), flowerMaterial, FLOWER_COUNT);
  flowers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  flowers.frustumCulled = false;
  flowers.visible = false;
  scene.add(flowers);

  const palette = [
    new THREE.Color(0xffa22b),
    new THREE.Color(0xffd23f),
    new THREE.Color(0xfff2d8),
    new THREE.Color(0xffb3c1),
    new THREE.Color(0xff8f5a),
  ];
  const flowerState = [];
  for (let i = 0; i < FLOWER_COUNT; i++) {
    flowerState.push({
      x: 0, y: 0, z: 0,
      vy: 2.2 + Math.random() * 1.8,
      sway: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI * 2,
      spin: 1 + Math.random() * 2,
    });
    flowers.setColorAt(i, palette[i % palette.length]);
  }
  if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;

  const rainMaterial = new THREE.MeshBasicMaterial({
    color: 0xd6e8ff,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 0.75, 0.035), rainMaterial, RAIN_COUNT);
  rain.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  rain.frustumCulled = false;
  rain.visible = false;
  scene.add(rain);

  const rainState = [];
  for (let i = 0; i < RAIN_COUNT; i++) {
    rainState.push({ x: 0, y: 0, z: 0, vy: 17 + Math.random() * 9 });
  }

  const dummy = new THREE.Object3D();
  let active = false;
  let elapsed = 0;

  function cameraAnchor() {
    if (camera && camera.position) return camera.position;
    return { x: 0, y: 40, z: 0 };
  }

  function spawnFlower(flower, initial) {
    const anchor = cameraAnchor();
    flower.x = anchor.x + (Math.random() * 2 - 1) * 24;
    flower.z = anchor.z + (Math.random() * 2 - 1) * 24;
    flower.y = anchor.y + (initial ? Math.random() * 16 : 10 + Math.random() * 10);
    flower.vy = 2.2 + Math.random() * 1.8;
    flower.sway = Math.random() * Math.PI * 2;
    flower.rot = Math.random() * Math.PI * 2;
  }

  function spawnRain(drop, initial) {
    const anchor = cameraAnchor();
    drop.x = anchor.x + (Math.random() * 2 - 1) * 26;
    drop.z = anchor.z + (Math.random() * 2 - 1) * 26;
    drop.y = anchor.y + (initial ? Math.random() * 20 : 12 + Math.random() * 10);
    drop.vy = 17 + Math.random() * 9;
  }

  function start() {
    active = true;
    elapsed = 0;
    flowers.visible = true;
    rain.visible = true;
    for (const flower of flowerState) spawnFlower(flower, true);
    for (const drop of rainState) spawnRain(drop, true);
  }

  function stop() {
    active = false;
    elapsed = 0;
    flowers.visible = false;
    rain.visible = false;
  }

  function update(dt) {
    if (!active) return;
    elapsed += dt;
    const anchor = cameraAnchor();

    for (let i = 0; i < flowerState.length; i++) {
      const flower = flowerState[i];
      flower.y -= flower.vy * dt;
      flower.sway += dt * 1.6;
      flower.rot += dt * flower.spin;
      if (flower.y < anchor.y - 12 || elapsed > DURATION) spawnFlower(flower, false);
      dummy.position.set(
        flower.x + Math.sin(flower.sway) * 0.3,
        flower.y,
        flower.z + Math.cos(flower.sway * 0.8) * 0.3,
      );
      dummy.rotation.set(0, flower.rot, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      flowers.setMatrixAt(i, dummy.matrix);
    }
    flowers.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < rainState.length; i++) {
      const drop = rainState[i];
      drop.y -= drop.vy * dt;
      if (drop.y < anchor.y - 14 || elapsed > DURATION) spawnRain(drop, false);
      dummy.position.set(drop.x, drop.y, drop.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      rain.setMatrixAt(i, dummy.matrix);
    }
    rain.instanceMatrix.needsUpdate = true;

    if (elapsed > DURATION + 4) stop();
  }

  return { start, stop, update, isActive: () => active };
}
