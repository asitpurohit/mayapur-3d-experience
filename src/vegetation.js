import * as THREE from 'three';
import { makeRng, fbm2, valueNoise2 } from './noise.js';
import { groundHeightAt, slopeAt, plainFactor, TERRAIN, TEMPLE_PLATEAU } from './terrain.js';
import { ENTRANCE, onApproach } from './entrance.js';
import { makeInstancedFromProto } from './instancing.js';

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function outsidePlateau(x, z, pad = 6) {
  if (onApproach(x, z, pad)) return false;
  const d = Math.hypot(x - TEMPLE_PLATEAU.x, z - TEMPLE_PLATEAU.z);
  return d > TEMPLE_PLATEAU.radius + pad;
}

function makeTrunkMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0x5a4330, roughness: 0.95, metalness: 0 });
}

function makeLeafMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x5c8f3a,
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  });
}

function makeFlowerMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xf0a0b7,
    roughness: 0.86,
    metalness: 0,
    flatShading: true,
  });
}

function makeGrassMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x5d8239,
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
}

function makeRockMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x6a655c,
    roughness: 1,
    metalness: 0.02,
    flatShading: true,
  });
}

function buildTreePrototype(rng) {
  const group = new THREE.Group();

  const trunkH = 2.4 + rng() * 1.7;
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.27, trunkH, 8, 4);
  const trunkPos = trunkGeo.attributes.position;
  for (let i = 0; i < trunkPos.count; i++) {
    const t = trunkPos.getY(i) / trunkH + 0.5;
    trunkPos.setX(i, trunkPos.getX(i) + Math.sin(t * 2.2) * 0.08 * t);
  }
  trunkGeo.computeVertexNormals();
  const trunk = new THREE.Mesh(
    trunkGeo,
    makeTrunkMaterial(),
  );
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  group.add(trunk);

  const branchGeo = new THREE.CylinderGeometry(0.035, 0.09, 1, 6, 1);
  const branchMat = makeTrunkMaterial();
  const up = new THREE.Vector3(0, 1, 0);
  const start = new THREE.Vector3();
  const end = new THREE.Vector3();
  const direction = new THREE.Vector3();
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + rng() * 0.5;
    const y = trunkH * (0.52 + rng() * 0.23);
    const length = 0.9 + rng() * 0.5;
    start.set(Math.sin(angle) * 0.05, y, Math.cos(angle) * 0.05);
    end.set(Math.sin(angle) * length, y + length * (0.62 + rng() * 0.25), Math.cos(angle) * length);
    direction.subVectors(end, start);

    const branch = new THREE.Mesh(branchGeo, branchMat);
    branch.position.copy(start).add(end).multiplyScalar(0.5);
    branch.quaternion.setFromUnitVectors(up, direction.clone().normalize());
    branch.scale.y = direction.length();
    branch.castShadow = true;
    group.add(branch);
  }

  const canopy = new THREE.Group();
  canopy.position.y = trunkH * 0.67;
  const leafGeo = new THREE.IcosahedronGeometry(1, 1);
  const leafPos = leafGeo.attributes.position;
  for (let i = 0; i < leafPos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(leafPos, i);
    const wobble = 1 + Math.sin(v.x * 8 + v.z * 5) * 0.045 + Math.cos(v.y * 7 - v.x * 3) * 0.035;
    leafPos.setXYZ(i, v.x * wobble, v.y * wobble, v.z * wobble);
  }
  leafGeo.computeVertexNormals();
  const leafMat = makeLeafMaterial();
  const tiers = [
    { count: 6, radius: 0.92, spread: 0.88, height: 0.08, yScale: 0.78 },
    { count: 5, radius: 0.8, spread: 0.66, height: 0.72, yScale: 0.9 },
    { count: 4, radius: 0.69, spread: 0.42, height: 1.28, yScale: 1.05 },
  ];
  for (const tier of tiers) {
    const phase = rng() * Math.PI * 2;
    for (let i = 0; i < tier.count; i++) {
      const angle = phase + (i / tier.count) * Math.PI * 2;
      const r = tier.radius * (0.86 + rng() * 0.28);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(
        Math.cos(angle) * tier.spread + (rng() - 0.5) * 0.18,
        tier.height + (rng() - 0.5) * 0.24,
        Math.sin(angle) * tier.spread + (rng() - 0.5) * 0.18,
      );
      leaf.scale.set(r * (0.9 + rng() * 0.25), r * tier.yScale, r * (0.9 + rng() * 0.25));
      leaf.rotation.y = rng() * Math.PI;
      leaf.castShadow = true;
      canopy.add(leaf);
    }
  }
  const crown = new THREE.Mesh(leafGeo, leafMat);
  crown.position.y = 1.72;
  crown.scale.set(0.62, 0.92, 0.62);
  crown.castShadow = true;
  canopy.add(crown);
  group.add(canopy);
  return group;
}

function buildColumnarTreePrototype(rng) {
  const group = new THREE.Group();
  const trunkH = 3.0 + rng() * 1.1;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.2, trunkH, 7, 3),
    makeTrunkMaterial(),
  );
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  group.add(trunk);

  const leafGeo = new THREE.IcosahedronGeometry(1, 1);
  const leafPos = leafGeo.attributes.position;
  for (let i = 0; i < leafPos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(leafPos, i);
    const wobble = 1 + Math.sin(v.x * 9 - v.y * 4) * 0.05 + Math.cos(v.y * 6 + v.z * 3) * 0.04;
    leafPos.setXYZ(i, v.x * wobble, v.y * wobble, v.z * wobble);
  }
  leafGeo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x466a2f,
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
  });
  const tiers = [
    { y: 0.5, r: 0.68 },
    { y: 1.22, r: 0.54 },
    { y: 1.9, r: 0.4 },
  ];
  for (const tier of tiers) {
    for (let i = 0; i < 3; i++) {
      const angle = rng() * Math.PI * 2;
      const leaf = new THREE.Mesh(leafGeo, mat);
      leaf.position.set(Math.cos(angle) * 0.26, trunkH * 0.62 + tier.y, Math.sin(angle) * 0.26);
      const r = tier.r * (0.85 + rng() * 0.3);
      leaf.scale.set(r * 0.85, r * 1.25, r * 0.85);
      leaf.rotation.y = rng() * Math.PI;
      leaf.castShadow = true;
      group.add(leaf);
    }
  }
  const crown = new THREE.Mesh(leafGeo, mat);
  crown.position.y = trunkH * 0.62 + 2.4;
  crown.scale.set(0.44, 0.95, 0.44);
  crown.castShadow = true;
  group.add(crown);
  return group;
}

function buildFlowerTreePrototype(rng) {
  const group = new THREE.Group();
  const trunkH = 2.1 + rng() * 0.8;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.22, trunkH, 7, 3),
    makeTrunkMaterial(),
  );
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  group.add(trunk);

  const branchGeo = new THREE.CylinderGeometry(0.025, 0.065, 1, 6, 1);
  const branchMat = makeTrunkMaterial();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI * 0.5 + rng() * 0.4;
    const start = new THREE.Vector3(0, trunkH * (0.55 + rng() * 0.18), 0);
    const end = new THREE.Vector3(Math.cos(angle) * 0.75, start.y + 0.52 + rng() * 0.35, Math.sin(angle) * 0.75);
    const direction = end.clone().sub(start);
    const branch = new THREE.Mesh(branchGeo, branchMat);
    branch.position.copy(start).add(end).multiplyScalar(0.5);
    branch.quaternion.setFromUnitVectors(up, direction.normalize());
    branch.scale.y = start.distanceTo(end);
    branch.castShadow = true;
    group.add(branch);
  }

  const leafGeo = new THREE.IcosahedronGeometry(1, 1);
  const green = makeLeafMaterial();
  const flower = makeFlowerMaterial();
  const crown = new THREE.Group();
  crown.position.y = trunkH * 0.72;
  const clusters = [
    [-0.62, 0.18, 0.05, 0.72],
    [0.62, 0.14, 0.02, 0.76],
    [0, 0.48, 0.12, 0.7],
    [0, 0.05, 0.58, 0.74],
    [0, 0.12, -0.58, 0.7],
  ];
  for (const [x, y, z, scale] of clusters) {
    const leaves = new THREE.Mesh(leafGeo, green);
    leaves.position.set(x, y, z);
    leaves.scale.set(scale, scale * 0.8, scale);
    leaves.rotation.y = rng() * Math.PI;
    leaves.castShadow = true;
    crown.add(leaves);
  }

  const blossomGeo = new THREE.IcosahedronGeometry(0.24, 1);
  for (let i = 0; i < 12; i++) {
    const blossom = new THREE.Mesh(blossomGeo, flower);
    const angle = rng() * Math.PI * 2;
    const radius = 0.4 + rng() * 0.7;
    blossom.position.set(
      Math.cos(angle) * radius,
      0.25 + rng() * 1.05,
      Math.sin(angle) * radius,
    );
    blossom.scale.set(0.7 + rng() * 0.5, 0.8 + rng() * 0.5, 0.7 + rng() * 0.5);
    blossom.castShadow = true;
    crown.add(blossom);
  }
  group.add(crown);
  return group;
}

function scatterPoints({
  count,
  seed,
  minSlope = 0,
  maxSlope = 1.05,
  minHeight = -1e9,
  maxHeight = 1e9,
  densityThreshold = 0.3,
  densityFn = null,
  scaleRange = [0.85, 1.65],
  predicate = null,
}) {
  const rng = makeRng(seed);
  const pts = [];
  const half = TERRAIN.size * 0.46;
  let attempts = 0;
  const maxAttempts = count * 90;
  while (pts.length < count && attempts < maxAttempts) {
    attempts++;
    const x = (rng() * 2 - 1) * half;
    const z = (rng() * 2 - 1) * half;

    if (densityFn) {
      if (rng() > densityFn(x, z)) continue;
    } else {
      const density = fbm2(x * 0.02 + 50, z * 0.02 - 20, 3);
      if (density < densityThreshold) continue;
    }

    const y = groundHeightAt(x, z);
    if (y < minHeight || y > maxHeight) continue;
    const s = slopeAt(x, z, 1.2);
    if (s < minSlope || s > maxSlope) continue;
    if (predicate && !predicate(x, z, y, s, rng)) continue;
    pts.push({
      x,
      y,
      z,
      rot: rng() * Math.PI * 2,
      scale: scaleRange[0] + rng() * (scaleRange[1] - scaleRange[0]),
      shade: rng(),
      tiltX: (rng() - 0.5) * 0.07,
      tiltZ: (rng() - 0.5) * 0.07,
    });
  }
  return pts;
}

function scatterTerraceGardenPoints(count, seed) {
  const rng = makeRng(seed);
  const points = [];
  const t = ENTRANCE.temple;
  let attempts = 0;
  while (points.length < count && attempts < count * 80) {
    attempts++;
    const side = rng() > 0.5 ? 1 : -1;
    const x = side < 0
      ? t.minX - 2.2 - rng() * 10.5
      : t.maxX + 2.2 + rng() * 10.5;
    const z = 39 + rng() * 45;
    const y = groundHeightAt(x, z);
    const slope = slopeAt(x, z, 1.0);
    if (slope > 0.72 || onApproach(x, z, 4)) continue;
    const patch = fbm2(x * 0.045 + 7, z * 0.045 - 19, 2);
    if (patch < 0.32) continue;
    points.push({
      x,
      y,
      z,
      rot: rng() * Math.PI * 2,
      scale: 0.7 + rng() * 0.52,
      shade: rng(),
    });
  }
  return points;
}

function clearOfTemple(x, z, pad = 2) {
  const t = ENTRANCE.temple;
  return x < t.minX - pad || x > t.maxX + pad || z < t.minZ - pad || z > t.maxZ + pad;
}

// fbm2 on this terrain spans roughly 0.06..0.40 (median ~0.22), so the
// thresholds below are tuned to that band rather than a naive 0..1 range.
// The flats are sand, so only a few lone trees survive out there.
function groveDensity(x, z) {
  const broad = fbm2(x * 0.0125 + 3, z * 0.0125 + 9, 3);
  const medium = fbm2(x * 0.032 - 8, z * 0.032 + 21, 3);
  const singles = fbm2(x * 0.045 - 14, z * 0.045 + 26, 2);
  const cluster = Math.pow(smoothstep(0.2, 0.32, broad), 1.3);
  const patches = Math.pow(smoothstep(0.2, 0.34, medium), 1.4);
  const base = Math.min(1, cluster * 0.75 + patches * 0.45 + smoothstep(0.3, 0.4, singles) * 0.08);
  return base * (1 - plainFactor(x, z) * 0.22);
}

// Grass grows in soft clumps, thin on ridges and bare rock.
function grassDensity(x, z) {
  const clump = fbm2(x * 0.075 + 5, z * 0.075 - 11, 3);
  const base = Math.min(1, 0.25 + smoothstep(0.14, 0.38, clump) * 0.85);
  return base * (1 - plainFactor(x, z) * 0.22);
}

// Wildflowers only in a few meadow pockets.
function flowerDensity(x, z) {
  const meadow = fbm2(x * 0.036 + 9, z * 0.036 - 33, 3);
  const base = Math.min(1, Math.pow(smoothstep(0.3, 0.42, meadow), 1.6) * 1.1);
  return base * (1 - plainFactor(x, z) * 0.45);
}

function bushDensity(x, z) {
  const clump = fbm2(x * 0.03 - 41, z * 0.03 + 17, 3);
  const base = Math.min(1, 0.16 + Math.pow(smoothstep(0.2, 0.34, clump), 1.2) * 0.9);
  return base * (1 - plainFactor(x, z) * 0.3);
}

function scatterOpenTerrain(count, seed, options = {}) {
  return scatterPoints({
    count,
    seed,
    minSlope: 0,
    maxSlope: 1.0,
    minHeight: 0.5,
    predicate: (x, z, y, slope, rng) =>
      clearOfTemple(x, z, 2) && !onApproach(x, z, 2) && rng() > 0.08,
    ...options,
  });
}

function inTempleGardenBeds(x, z) {
  const centerOffset = 19;
  const halfWidth = 13.6 / 2;
  for (const side of [-1, 1]) {
    const centerX = ENTRANCE.stairs.x + side * centerOffset;
    if (
      Math.abs(x - centerX) < halfWidth + 1.2 &&
      z > 91 &&
      z < 138
    ) return true;
  }
  return false;
}

function scatterTempleMeadowFlowers() {
  const rng = makeRng(19642);
  const centers = [];
  const t = TEMPLE_PLATEAU;
  for (let attempts = 0; attempts < 18000 && centers.length < 112; attempts++) {
    const angle = rng() * Math.PI * 2;
    const radius = 54 + rng() * 76;
    const x = t.x + Math.cos(angle) * radius;
    const z = t.z + Math.sin(angle) * radius;
    if (Math.abs(x) > TERRAIN.size * 0.47 || Math.abs(z) > TERRAIN.size * 0.47) continue;
    if (plainFactor(x, z) > 0.48 || slopeAt(x, z, 1.5) > 0.75) continue;
    if (!clearOfTemple(x, z, 7) || onApproach(x, z, 3) || inTempleGardenBeds(x, z)) continue;
    if (centers.some((p) => Math.hypot(p.x - x, p.z - z) < 10)) continue;
    centers.push({ x, z });
  }

  const points = [];
  for (const center of centers) {
    const target = 64 + Math.floor(rng() * 37);
    let placed = 0;
    for (let attempt = 0; attempt < target * 8 && placed < target; attempt++) {
      const angle = rng() * Math.PI * 2;
      const radius = Math.sqrt(rng()) * (3.8 + rng() * 2.1);
      const x = center.x + Math.cos(angle) * radius;
      const z = center.z + Math.sin(angle) * radius;
      if (Math.abs(x) > TERRAIN.size * 0.48 || Math.abs(z) > TERRAIN.size * 0.48) continue;
      if (plainFactor(x, z) > 0.52 || slopeAt(x, z, 1.2) > 0.98) continue;
      if (!clearOfTemple(x, z, 5) || onApproach(x, z, 2) || inTempleGardenBeds(x, z)) continue;
      const y = groundHeightAt(x, z);
      if (y < 0.5) continue;
      points.push({
        x,
        y,
        z,
        rot: rng() * Math.PI * 2,
        scale: 0.98 + rng() * 0.62,
        shade: rng(),
        tiltX: (rng() - 0.5) * 0.14,
        tiltZ: (rng() - 0.5) * 0.14,
      });
      placed++;
    }
  }
  return points;
}

function makeGroundInstances(geometry, material, points, getTransform) {
  const im = new THREE.InstancedMesh(geometry, material, points.length);
  im.castShadow = true;
  im.receiveShadow = true;
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3();

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    getTransform(p, pos, quat, scale);
    matrix.compose(pos, quat, scale);
    im.setMatrixAt(i, matrix);
  }
  im.instanceMatrix.needsUpdate = true;
  return im;
}

// A tuft of leaning blades reads far more like grass than a single cone.
// A little emissive lift keeps thin blades from rendering as black spikes.
function makeBladeMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: 0x0d1a09,
    emissiveIntensity: 1,
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
}

function buildGrassTuftPrototype(rng) {
  const group = new THREE.Group();
  const bladeGeo = new THREE.ConeGeometry(0.042, 1, 4, 1);
  const light = makeBladeMaterial(0x6d9440);
  const dark = makeBladeMaterial(0x557a33);
  const bladeCount = 5;
  for (let i = 0; i < bladeCount; i++) {
    const height = 0.26 + rng() * 0.34;
    const angle = (i / bladeCount) * Math.PI * 2 + rng() * 0.7;
    const lean = 0.2 + rng() * 0.4;
    const blade = new THREE.Mesh(bladeGeo, i % 2 === 0 ? light : dark);
    blade.position.set(Math.cos(angle) * 0.13, height / 2, Math.sin(angle) * 0.13);
    blade.rotation.set(Math.cos(angle) * lean, rng() * Math.PI, Math.sin(angle) * lean);
    blade.scale.set(0.85 + rng() * 0.5, height, 0.85 + rng() * 0.5);
    group.add(blade);
  }
  return group;
}

// Match the dry/green patch noise used by the terrain so grass blends in.
function grassTint(p) {
  const patch = fbm2(p.x * 0.041 - 23, p.z * 0.041 + 11, 3);
  const dry = smoothstep(0.26, 0.38, patch);
  return {
    r: 1 + dry * 0.24,
    g: 1 + dry * 0.08,
    b: 1 - dry * 0.3,
  };
}

function buildGrass() {
  const points = scatterOpenTerrain(32000, 6621, {
    densityFn: grassDensity,
    scaleRange: [0.9, 1.5],
    maxSlope: 1.15,
  });
  const proto = buildGrassTuftPrototype(makeRng(6623));
  return makeInstancedFromProto(proto, points, {
    colorJitter: 0.3,
    castShadow: false,
    tintFn: grassTint,
  });
}

function buildWildflowers() {
  const points = scatterOpenTerrain(1500, 7341, {
    densityFn: flowerDensity,
    scaleRange: [0.7, 1.25],
  });
  const meadowPoints = scatterTempleMeadowFlowers();
  points.push(...meadowPoints);

  const stemGeo = new THREE.ConeGeometry(0.02, 0.24, 4, 1);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x587a37, roughness: 1, flatShading: true });
  const petals = [
    new THREE.MeshStandardMaterial({ color: 0xe8679a, roughness: 0.86, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0xf0c744, roughness: 0.86, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0xf3edde, roughness: 0.88, flatShading: true }),
  ];
  const petalGeo = new THREE.IcosahedronGeometry(0.16, 0);

  const stems = makeGroundInstances(stemGeo, stemMat, points, (p, pos, quat, scale) => {
    pos.set(p.x, p.y + 0.11 * p.scale, p.z);
    quat.setFromEuler(new THREE.Euler((p.tiltX || 0) * 2, p.rot, (p.tiltZ || 0) * 2));
    scale.set(1, p.scale, 1);
  });

  const group = new THREE.Group();
  group.add(stems);

  for (let i = 0; i < petals.length; i++) {
    const bucket = points.filter((_, index) => index % petals.length === i);
    group.add(
      makeGroundInstances(petalGeo, petals[i], bucket, (p, pos, quat, scale) => {
        pos.set(p.x, p.y + 0.23 * p.scale, p.z);
        quat.setFromEuler(new THREE.Euler((p.tiltX || 0) * 2, p.rot * 1.7, (p.tiltZ || 0) * 2));
        const size = (0.9 + p.shade * 0.42) * p.scale;
        scale.set(size, size * (0.68 + p.shade * 0.35), size);
      }),
    );
  }
  group.userData.counts = { general: points.length - meadowPoints.length, templeMeadow: meadowPoints.length };
  return group;
}


function buildRocks() {
  const rng = makeRng(77);
  const points = scatterPoints({
    count: 420,
    seed: 909,
    minSlope: 0.15,
    maxSlope: 1.35,
    minHeight: 3,
    densityThreshold: 0.25,
    predicate: (x, z) => outsidePlateau(x, z) && rng() > 0.2,
  });

  const geo = new THREE.DodecahedronGeometry(0.55, 0);
  const mat = makeRockMaterial();
  const im = new THREE.InstancedMesh(geo, mat, points.length);
  im.castShadow = true;
  im.receiveShadow = true;

  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const color = new THREE.Color();
  const eul = new THREE.Euler();

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    pos.set(p.x, p.y - 0.12 * p.scale, p.z);
    eul.set(rng() * 0.6, p.rot, rng() * 0.6);
    quat.setFromEuler(eul);
    const b = 0.4 + p.shade * 1.6;
    scl.set(b * (0.8 + rng() * 0.5), b * (0.5 + rng() * 0.4), b * (0.8 + rng() * 0.5));
    matrix.compose(pos, quat, scl);
    im.setMatrixAt(i, matrix);
    const t = 0.7 + p.shade * 0.5;
    color.setRGB(t, t * 0.98, t * 0.9);
    im.setColorAt(i, color);
  }
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  return im;
}

// Bushes are clusters of lobes rather than one squashed ball, which is what
// made them read as green boulders before.
function buildBushPrototype(rng) {
  const group = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x628a3a,
    emissive: 0x090f05,
    roughness: 0.96,
    metalness: 0,
    flatShading: true,
  });
  const lobes = 3 + Math.floor(rng() * 2);
  for (let i = 0; i < lobes; i++) {
    const lobe = new THREE.Mesh(geo, mat);
    const angle = (i / lobes) * Math.PI * 2 + rng() * 0.8;
    const r = 0.3 + rng() * 0.24;
    lobe.position.set(Math.cos(angle) * 0.3, 0.46 + rng() * 0.3, Math.sin(angle) * 0.3);
    lobe.scale.set(r * (1 + rng() * 0.3), r * (0.8 + rng() * 0.4), r * (1 + rng() * 0.3));
    lobe.rotation.y = rng() * Math.PI;
    lobe.castShadow = true;
    group.add(lobe);
  }
  return group;
}

function buildShrubs() {
  const points = scatterPoints({
    count: 700,
    seed: 4242,
    minSlope: 0.0,
    maxSlope: 1.2,
    minHeight: 1,
    densityFn: bushDensity,
    scaleRange: [0.5, 1.2],
    predicate: (x, z) => outsidePlateau(x, z),
  });

  const proto = buildBushPrototype(makeRng(31));
  const shrubs = makeInstancedFromProto(proto, points, { colorJitter: 0.3 });
  shrubs.count = points.length;
  return shrubs;
}

export function buildVegetation() {
  const group = new THREE.Group();
  group.name = 'vegetation';

  const broadleaf = buildTreePrototype(makeRng(5));
  const treePoints = scatterPoints({
    count: 520,
    seed: 1234,
    minSlope: 0.0,
    maxSlope: 1.1,
    minHeight: 0.5,
    densityFn: groveDensity,
    scaleRange: [0.75, 1.85],
    predicate: (x, z) => outsidePlateau(x, z),
  });

  const trees = makeInstancedFromProto(broadleaf, treePoints, { colorJitter: 0.26 });
  trees.name = 'trees';
  group.add(trees);

  const columnar = buildColumnarTreePrototype(makeRng(99));
  const columnarPoints = scatterPoints({
    count: 230,
    seed: 5678,
    minSlope: 0.0,
    maxSlope: 1.15,
    minHeight: 0.5,
    densityFn: (x, z) => groveDensity(x + 40, z - 25),
    scaleRange: [0.7, 1.6],
    predicate: (x, z) => outsidePlateau(x, z),
  });

  const columnarTrees = makeInstancedFromProto(columnar, columnarPoints, { colorJitter: 0.24 });
  columnarTrees.name = 'columnar-trees';
  group.add(columnarTrees);

  const flowerProto = buildFlowerTreePrototype(makeRng(812));
  const flowerPoints = scatterTerraceGardenPoints(34, 2718);
  const floweringTrees = makeInstancedFromProto(flowerProto, flowerPoints, { colorJitter: 0 });
  floweringTrees.name = 'terrace-flowering-trees';
  group.add(floweringTrees);

  const rocks = buildRocks();
  rocks.name = 'rocks';
  group.add(rocks);

  const shrubs = buildShrubs();
  shrubs.name = 'shrubs';
  group.add(shrubs);

  const grass = buildGrass();
  grass.name = 'grass';
  group.add(grass);

  const wildflowers = buildWildflowers();
  wildflowers.name = 'wildflowers';
  group.add(wildflowers);

  group.userData.counts = {
    trees: treePoints.length,
    columnarTrees: columnarPoints.length,
    floweringTrees: flowerPoints.length,
    rocks: rocks.count,
    shrubs: shrubs.count,
    grass: grass.children.reduce((sum, mesh) => sum + mesh.count, 0),
    wildflowers: wildflowers.children.reduce((sum, mesh) => sum + mesh.count, 0),
  };

  return group;
}
