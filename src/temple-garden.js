import * as THREE from 'three';
import { makeRng } from './noise.js';
import { groundHeightAt } from './terrain.js';
import { ENTRANCE } from './entrance.js';
import { makeInstancedFromProto } from './instancing.js';

const GARDEN = {
  centerOffset: 19,
  width: 13.6,
  startZ: 93,
  endZ: 136,
  fountainZ: 114.5,
  flowerSpacing: 0.74,
};

function addBox(parent, material, w, h, d, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function flowerPrototype(petalColor, centerColor) {
  const group = new THREE.Group();
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x426b37, roughness: 0.92, flatShading: true });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x598044, roughness: 0.94, flatShading: true });
  const petalMat = new THREE.MeshStandardMaterial({ color: petalColor, roughness: 0.78, flatShading: true });
  const centerMat = new THREE.MeshStandardMaterial({ color: centerColor, roughness: 0.75, flatShading: true });

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.045, 0.58, 5), stemMat);
  stem.position.y = 0.29;
  group.add(stem);

  const leafGeo = new THREE.SphereGeometry(0.15, 7, 5);
  for (const side of [-1, 1]) {
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(side * 0.105, 0.24 + (side > 0 ? 0.09 : 0), 0.02);
    leaf.scale.set(1.0, 0.27, 0.48);
    leaf.rotation.z = side * -0.48;
    group.add(leaf);
  }

  const petalGeo = new THREE.SphereGeometry(0.12, 7, 5);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const petal = new THREE.Mesh(petalGeo, petalMat);
    petal.position.set(Math.cos(a) * 0.105, 0.65, Math.sin(a) * 0.105);
    petal.scale.set(1.15, 0.48, 0.78);
    group.add(petal);
  }
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 5), centerMat);
  center.position.y = 0.67;
  group.add(center);
  return group;
}

function makeBedSoil(cx, zMid, material) {
  const depth = GARDEN.endZ - GARDEN.startZ;
  const geo = new THREE.PlaneGeometry(GARDEN.width, depth, 8, 28);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = cx + pos.getX(i);
    const z = zMid + pos.getZ(i);
    pos.setY(i, groundHeightAt(x, z) + 0.045);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  return mesh;
}

function edgeCurb(parent, cx, x, material) {
  const step = 3.5;
  for (let z = GARDEN.startZ + step / 2; z < GARDEN.endZ; z += step) {
    const startY = groundHeightAt(x, z - step / 2);
    const endY = groundHeightAt(x, z + step / 2);
    const segment = new THREE.Group();
    segment.position.set(x, (startY + endY) / 2 + 0.18, z);
    segment.rotation.x = Math.atan2(startY - endY, step);
    addBox(segment, material, 0.34, 0.36, step + 0.06, 0, 0, 0);
    parent.add(segment);
  }
}

function makeHedgeInstances(parent, x, side, material) {
  const geo = new THREE.IcosahedronGeometry(0.54, 1);
  const points = [];
  const rng = makeRng(side < 0 ? 631 : 842);
  for (let z = GARDEN.startZ + 0.7; z < GARDEN.endZ - 0.3; z += 1.15) {
    points.push({
      x,
      y: groundHeightAt(x, z) + 0.43,
      z,
      rot: rng() * Math.PI * 2,
      scale: 1.05 + rng() * 0.18,
      shade: rng(),
    });
  }
  const hedgeProto = new THREE.Group();
  const mesh = new THREE.Mesh(geo, material);
  mesh.scale.set(1.7, 0.8, 2.4);
  hedgeProto.add(mesh);
  const instanced = makeInstancedFromProto(hedgeProto, points, { colorJitter: 0.13, castShadow: true });
  instanced.name = side < 0 ? 'temple-garden-hedge-left' : 'temple-garden-hedge-right';
  parent.add(instanced);
}

function makeFountain(x, z, stone, trim, water, waterJet) {
  const group = new THREE.Group();
  group.name = 'temple-side-fountain';
  const baseY = groundHeightAt(x, z);
  group.position.set(x, baseY, z);

  const pad = new THREE.Mesh(new THREE.CircleGeometry(4.5, 40), trim);
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.045;
  pad.receiveShadow = true;
  group.add(pad);

  const basinFloor = new THREE.Mesh(new THREE.CircleGeometry(2.58, 36), stone);
  basinFloor.rotation.x = -Math.PI / 2;
  basinFloor.position.y = 0.12;
  basinFloor.receiveShadow = true;
  group.add(basinFloor);

  const basinWall = new THREE.Mesh(
    new THREE.CylinderGeometry(2.66, 2.82, 0.58, 36, 1, true),
    stone,
  );
  basinWall.position.y = 0.34;
  basinWall.castShadow = true;
  group.add(basinWall);

  const waterSurface = new THREE.Mesh(new THREE.CircleGeometry(2.54, 36), water);
  waterSurface.rotation.x = -Math.PI / 2;
  waterSurface.position.y = 0.43;
  group.add(waterSurface);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.67, 0.16, 8, 36), trim);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.64;
  rim.castShadow = true;
  group.add(rim);

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.76, 0.65, 12), stone);
  pedestal.position.y = 0.76;
  pedestal.castShadow = true;
  group.add(pedestal);

  const lowerBowl = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.48, 0.42, 20, 1, true), stone);
  lowerBowl.position.y = 1.24;
  lowerBowl.castShadow = true;
  group.add(lowerBowl);
  const lowerWater = new THREE.Mesh(new THREE.CircleGeometry(0.91, 20), water);
  lowerWater.rotation.x = -Math.PI / 2;
  lowerWater.position.y = 1.43;
  group.add(lowerWater);

  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, 0.72, 10), trim);
  column.position.y = 1.76;
  group.add(column);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), trim);
  crown.position.y = 2.14;
  group.add(crown);

  const ripples = [];
  for (let i = 0; i < 3; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xd5f7fa,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 5, 28), material);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(Math.cos(i * 2.1) * 1.45, 0.455 + i * 0.002, Math.sin(i * 2.1) * 1.45);
    ring.userData.phase = i / 3;
    ring.userData.baseX = ring.position.x;
    ring.userData.baseZ = ring.position.z;
    group.add(ring);
    ripples.push(ring);
  }

  const jets = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    const points = [
      new THREE.Vector3(dx * 0.12, 2.08, dz * 0.12),
      new THREE.Vector3(dx * 0.58, 2.45, dz * 0.58),
      new THREE.Vector3(dx * 1.15, 2.15, dz * 1.15),
      new THREE.Vector3(dx * 1.72, 1.42, dz * 1.72),
    ];
    const curve = new THREE.CatmullRomCurve3(points);
    const stream = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.035, 5, false), waterJet);
    jets.add(stream);
  }
  group.add(jets);
  group.userData.ripples = ripples;
  return group;
}

export function buildTempleGarden() {
  const group = new THREE.Group();
  group.name = 'temple-formal-gardens';

  const soil = new THREE.MeshStandardMaterial({ color: 0x493a2b, roughness: 1, flatShading: true });
  const stone = new THREE.MeshStandardMaterial({ color: 0xb4a184, roughness: 0.88, metalness: 0.025, flatShading: true });
  const curb = new THREE.MeshStandardMaterial({ color: 0x88785f, roughness: 0.92, flatShading: true });
  const hedge = new THREE.MeshStandardMaterial({ color: 0x47763d, roughness: 0.96, flatShading: true });
  const water = new THREE.MeshStandardMaterial({
    color: 0x55a8b3,
    roughness: 0.24,
    metalness: 0.12,
    transparent: true,
    opacity: 0.82,
  });
  const waterJet = new THREE.MeshStandardMaterial({
    color: 0xc4f2f4,
    emissive: 0x397f89,
    emissiveIntensity: 0.12,
    roughness: 0.18,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });

  const zMid = (GARDEN.startZ + GARDEN.endZ) / 2;
  const centers = [];
  for (const side of [-1, 1]) {
    const centerX = ENTRANCE.stairs.x + side * GARDEN.centerOffset;
    centers.push({ x: centerX, z: GARDEN.fountainZ });
    group.add(makeBedSoil(centerX, zMid, soil));

    const innerX = centerX - side * (GARDEN.width / 2 - 0.15);
    const outerX = centerX + side * (GARDEN.width / 2 - 0.15);
    edgeCurb(group, centerX, innerX, curb);
    edgeCurb(group, centerX, outerX, curb);
    makeHedgeInstances(group, innerX + side * 0.58, side, hedge);
    makeHedgeInstances(group, outerX - side * 0.58, side, hedge);

    const fountain = makeFountain(centerX, GARDEN.fountainZ, stone, curb, water, waterJet);
    fountain.name = side < 0 ? 'left-stair-fountain' : 'right-stair-fountain';
    group.add(fountain);
  }

  const flowerColors = [
    [0xd9688c, 0xf5d06a],
    [0xf2eee0, 0xe6aa45],
    [0xe99b43, 0x733a28],
    [0xb95d91, 0xf3d877],
  ];
  const prototypes = flowerColors.map(([petal, center]) => flowerPrototype(petal, center));
  const flowerPoints = prototypes.map(() => []);
  const rng = makeRng(41863);
  const rowOffsets = [-5.1, -3.45, 3.45, 5.1];

  for (const side of [-1, 1]) {
    const centerX = ENTRANCE.stairs.x + side * GARDEN.centerOffset;
    for (let row = 0; row < rowOffsets.length; row++) {
      const x = centerX + rowOffsets[row];
      let index = 0;
      for (let z = GARDEN.startZ + 1.1 + (row % 2) * 0.34; z < GARDEN.endZ - 0.8; z += GARDEN.flowerSpacing) {
        const fountainDistance = Math.hypot(x - centerX, z - GARDEN.fountainZ);
        if (fountainDistance < 4.75) continue;
        const type = (row + Math.floor(index / 8) + (side < 0 ? 0 : 2)) % prototypes.length;
        flowerPoints[type].push({
          x,
          y: groundHeightAt(x, z) + 0.05,
          z,
          rot: rng() * Math.PI * 2,
          scale: 0.82 + rng() * 0.5,
          shade: rng(),
          tiltX: (rng() - 0.5) * 0.08,
          tiltZ: (rng() - 0.5) * 0.08,
        });
        index++;
      }
    }
  }

  for (let i = 0; i < prototypes.length; i++) {
    const flowers = makeInstancedFromProto(prototypes[i], flowerPoints[i], {
      colorJitter: 0.09,
      castShadow: true,
    });
    flowers.name = `temple-garden-flowers-${i + 1}`;
    group.add(flowers);
  }

  group.userData.update = (dt) => {
    const elapsed = (group.userData.elapsed || 0) + dt;
    group.userData.elapsed = elapsed;
    for (const fountain of group.children.filter((child) => child.name.includes('stair-fountain'))) {
      for (const ring of fountain.userData.ripples) {
        const phase = (elapsed * 0.58 + ring.userData.phase) % 1;
        const scale = 0.55 + phase * 2.3;
        ring.scale.setScalar(scale);
        ring.position.x = ring.userData.baseX + Math.sin(elapsed * 1.7 + ring.userData.phase * 7) * 0.08;
        ring.position.z = ring.userData.baseZ + Math.cos(elapsed * 1.4 + ring.userData.phase * 5) * 0.08;
        ring.material.opacity = 0.36 * (1 - phase);
      }
    }
  };
  group.userData.counts = {
    fountains: centers.length,
    flowers: flowerPoints.reduce((total, points) => total + points.length, 0),
  };
  return group;
}
