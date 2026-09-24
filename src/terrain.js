import * as THREE from 'three';
import { fbm2, ridgeNoise2, valueNoise2 } from './noise.js';

export const TERRAIN = {
  size: 420,
  segments: 360,
  ridgeHeight: 34,
  ridgeWidth: 46,
  ridgeLength: 360,
};

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export const TEMPLE_PLATEAU = {
  x: 17.7,
  z: 60,
  halfX: 38,
  halfZ: 29,
  radius: 40,
  blend: 45,
};

// Keep the outdoor stair flight aligned with the temple landing and lower apron.
export const OUTDOOR_STAIR = {
  topY: 35.3,
  bottomY: 28.55,
};

function distanceToSpine(x, z) {
  const bend = Math.sin(z * 0.008) * 18 + Math.sin(z * 0.0035 + 1.7) * 10;
  const dx = x - bend;
  const dz = Math.max(0, Math.abs(z) - TERRAIN.ridgeLength * 0.5);
  return Math.hypot(dx, dz);
}

export function distanceToRidgeSpine(x, z) {
  return distanceToSpine(x, z);
}

// 0 on the green hill, 1 on the flat sand plains either side of the ridge.
export function plainFactor(x, z) {
  const fromRidge = smoothstep(42, 86, distanceToSpine(x, z));
  const pastEnds = smoothstep(TERRAIN.ridgeLength * 0.42, TERRAIN.ridgeLength * 0.58, Math.abs(z));
  return Math.max(fromRidge, pastEnds);
}

function rawGroundHeight(x, z) {
  const d = distanceToSpine(x, z);
  const profile = Math.exp(-(d * d) / (2 * TERRAIN.ridgeWidth * TERRAIN.ridgeWidth));
  const endFade = 1 - smoothstep(TERRAIN.ridgeLength * 0.42, TERRAIN.ridgeLength * 0.58, Math.abs(z));

  const large = fbm2(x * 0.012, z * 0.012, 4) * 2 - 1;
  const shoulder = fbm2(x * 0.026 + 18, z * 0.026 - 7, 3) * 2 - 1;
  const rocky = ridgeNoise2(x * 0.05, z * 0.05, 4) * 2 - 1;
  const bumps = fbm2(x * 0.055 + 31, z * 0.055 - 13, 3) * 2 - 1;
  const micro = valueNoise2(x * 0.28, z * 0.28) * 2 - 1;

  // Keep the temple plateau untouched so the landing and stairs stay aligned.
  const bumpFade = smoothstep(26, 80, distToTemplePlateau(x, z));

  let h = 1.2 + large * 1.6;
  h += profile * TERRAIN.ridgeHeight * endFade;
  h += profile * endFade * (rocky * 7.0 + large * 4.5 + shoulder * 2.3);
  h += bumpFade * (0.35 + profile * 0.65) * bumps * 1.7;
  h += (0.25 + profile * 0.75) * micro * 0.85;

  // Fall away toward the map edge so the mesh meets the far ground plane
  // cleanly at y = -3.7 (matching the city flats, streets, and far-ground plane).
  const dFar = Math.hypot(x, z);
  if (dFar >= 210) return -3.7;
  if (dFar > 150) {
    const t = smoothstep(150, 210, dFar);
    return h * (1 - t) + -3.7 * t;
  }

  return h;
}

const PLATEAU_Y = rawGroundHeight(TEMPLE_PLATEAU.x, TEMPLE_PLATEAU.z);

function distToTemplePlateau(x, z) {
  const dx = Math.max(0, Math.abs(x - TEMPLE_PLATEAU.x) - TEMPLE_PLATEAU.halfX);
  const dz = Math.max(0, Math.abs(z - TEMPLE_PLATEAU.z) - TEMPLE_PLATEAU.halfZ);
  return Math.hypot(dx, dz);
}

export function groundHeightAt(x, z) {
  const h = rawGroundHeight(x, z);
  const d = distToTemplePlateau(x, z);
  let base = h;
  if (d < TEMPLE_PLATEAU.blend) {
    const t = smoothstep(0, TEMPLE_PLATEAU.blend, d);
    base = PLATEAU_Y * (1 - t) + h * t;
  }

  // Smoothly grade the ground along the grand temple staircase
  const stairX = 17.7;
  const stairZTop = 89.2;
  const stairZBot = 138.0;
  const stairHalfW = 6.8;
  const stairBlendW = 3.5;

  if (z >= stairZTop && z <= stairZBot) {
    const dx = Math.abs(x - stairX);
    if (dx < stairHalfW + stairBlendW) {
       const topY = OUTDOOR_STAIR.topY;
       const botY = OUTDOOR_STAIR.bottomY;
       const stairT = (stairZBot - z) / (stairZBot - stairZTop);
       const stairGrade = botY + (topY - botY) * stairT;
      const tX = smoothstep(stairHalfW + stairBlendW, stairHalfW, dx);
      return base * (1 - tX) + stairGrade * tX;
    }
  }

  // Blend the lower end into the natural terrain instead of leaving a drop
  // where the stair flight meets the approach apron.
  if (z > stairZBot && z <= stairZBot + 2.5) {
    const dx = Math.abs(x - stairX);
    if (dx < stairHalfW + stairBlendW) {
      const tZ = smoothstep(stairZBot, stairZBot + 2.5, z);
      const tX = smoothstep(stairHalfW + stairBlendW, stairHalfW, dx);
      const apronGrade = OUTDOOR_STAIR.bottomY * (1 - tZ) + base * tZ;
      return base * (1 - tX) + apronGrade * tX;
    }
  }

  return base;
}

export function groundNormalAt(x, z, eps = 0.6) {
  const hL = groundHeightAt(x - eps, z);
  const hR = groundHeightAt(x + eps, z);
  const hD = groundHeightAt(x, z - eps);
  const hU = groundHeightAt(x, z + eps);
  const n = new THREE.Vector3(hL - hR, 2 * eps, hD - hU);
  return n.normalize();
}

export function slopeAt(x, z, eps = 0.8) {
  const n = groundNormalAt(x, z, eps);
  return Math.acos(Math.min(1, Math.max(-1, n.y)));
}

function mixColor(out, a, b, t) {
  out.r = a.r + (b.r - a.r) * t;
  out.g = a.g + (b.g - a.g) * t;
  out.b = a.b + (b.b - a.b) * t;
}

// Fine-grain detail texture. Vertex colors alone are too coarse (one vertex per
// ~1.2 m), which is what made the ground read as flat painted green.
function makeGroundDetailTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  const data = image.data;

  const raw = new Float32Array(size * size);
  for (let i = 0; i < raw.length; i++) {
    const x = i % size;
    const y = (i / size) | 0;
    const a = valueNoise2(x * 0.7, y * 0.7);
    const b = valueNoise2(x * 0.23 + 17, y * 0.23 - 9);
    raw[i] = a * 0.55 + b * 0.45;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      let sum = 0;
      let weight = 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const sx = (x + ox + size) % size;
          const sy = (y + oy + size) % size;
          const w = ox === 0 && oy === 0 ? 3 : 1;
          sum += raw[sy * size + sx] * w;
          weight += w;
        }
      }
      const grain = sum / weight;
      const blades = Math.pow(0.5 + 0.5 * Math.sin(x * 2.1 + y * 1.3), 3) * 0.08;
      const level = 0.79 + grain * 0.38 + blades;
      data[i * 4] = Math.max(0, Math.min(255, level * 246));
      data[i * 4 + 1] = Math.max(0, Math.min(255, level * 255));
      data[i * 4 + 2] = Math.max(0, Math.min(255, level * 232));
      data[i * 4 + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(84, 84);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function makeTerrainMaterial() {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: makeGroundDetailTexture(),
    roughness: 0.97,
    metalness: 0.02,
    flatShading: false,
  });
}

const C_GRASS_DEEP = new THREE.Color(0x496b39);
const C_GRASS = new THREE.Color(0x5f7c44);
const C_GRASS_PALE = new THREE.Color(0x879055);
const C_GRASS_DRY = new THREE.Color(0xa89c66);
const C_SOIL = new THREE.Color(0x7b6448);
const C_ROCK_DARK = new THREE.Color(0x55524a);
const C_ROCK = new THREE.Color(0x7b7264);
const C_ROCK_LIGHT = new THREE.Color(0xa2967f);
const C_SAND = new THREE.Color(0xc9ad80);
const C_SAND_DARK = new THREE.Color(0xa98d61);
const C_SAND_DIRT = new THREE.Color(0x93764f);

function colorForPoint(x, z, y, slope, out) {
  // Large biome mix: green hollows, dry gold shoulders.
  const biome = fbm2(x * 0.011 + 10, z * 0.011 - 4, 4);
  const patch = fbm2(x * 0.041 - 23, z * 0.041 + 11, 3);
  const worn = fbm2(x * 0.09 + 63, z * 0.09 - 27, 2);
  const speckle = valueNoise2(x * 0.17 + 4, z * 0.17 - 9);

  mixColor(out, C_GRASS_DEEP, C_GRASS, smoothstep(0.3, 0.62, biome));
  mixColor(out, out, C_GRASS_PALE, smoothstep(0.48, 0.76, biome));
  mixColor(out, out, C_GRASS_DRY, smoothstep(0.5, 0.8, patch) * 0.85);

  // Mostly grass out on the flats, with sand showing through in patches.
  const plain = plainFactor(x, z);
  if (plain > 0.001) {
    const sandN = fbm2(x * 0.021 + 71, z * 0.021 - 33, 3);
    const sandMask = smoothstep(0.24, 0.33, sandN);
    if (sandMask > 0.001) {
      const toneN = fbm2(x * 0.052 + 17, z * 0.052 + 41, 2);
      const sandCol = new THREE.Color();
      mixColor(sandCol, C_SAND_DARK, C_SAND, smoothstep(0.24, 0.5, toneN));
      mixColor(sandCol, sandCol, C_SAND_DIRT, smoothstep(0.46, 0.2, toneN) * 0.5);
      mixColor(out, out, sandCol, plain * sandMask * 0.92);
    }
  }

  const cliff = smoothstep(0.3, 0.95, slope);
  const exposedHeight = smoothstep(20, 40, y);
  const rockiness = cliff * 0.72 + exposedHeight * 0.22 + smoothstep(0.7, 0.92, worn) * 0.3;
  const rockMix = Math.min(1, Math.max(0, rockiness + (speckle - 0.5) * 0.3));

  const rockT = smoothstep(0.2, 0.8, biome * 0.6 + worn * 0.4);
  const rockCol = new THREE.Color();
  if (rockT < 0.5) mixColor(rockCol, C_ROCK_DARK, C_ROCK, rockT * 2);
  else mixColor(rockCol, C_ROCK, C_ROCK_LIGHT, (rockT - 0.5) * 2);
  mixColor(out, out, rockCol, rockMix);

  // Exposed earth where the cover is thin: ridges, worn tracks, steep spots.
  const soilMix = (1 - rockMix) * smoothstep(0.74, 0.36, biome) * smoothstep(0.42, 0.85, worn) * 0.6;
  mixColor(out, out, C_SOIL, soilMix);

  const grassOnRock = rockMix * smoothstep(0.62, 0.2, slope) * smoothstep(0.3, 0.62, patch);
  mixColor(out, out, C_GRASS, grassOnRock * 0.5);

  const strata = 0.5 + 0.5 * Math.sin(y * 0.6 + fbm2(x * 0.03, z * 0.03, 2) * 4.5);
  const rockStrata = rockMix * (1 - cliff * 0.5) * (strata - 0.5) * 0.12;
  out.r = Math.min(1, Math.max(0, out.r + rockStrata));
  out.g = Math.min(1, Math.max(0, out.g + rockStrata * 0.9));
  out.b = Math.min(1, Math.max(0, out.b + rockStrata * 0.74));

  // Hue drift keeps neighbouring patches from matching exactly.
  const hueShift = (patch - 0.5) * 0.05 + (biome - 0.5) * 0.04;
  out.r = Math.min(1, Math.max(0, out.r + hueShift));
  out.b = Math.min(1, Math.max(0, out.b - hueShift * 0.6));

  const brightness = 0.94 + (patch - 0.5) * 0.13 + (speckle - 0.5) * 0.07;
  out.multiplyScalar(brightness);
}

export function buildTerrain() {
  const { size, segments } = TERRAIN;
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = groundHeightAt(x, z);
    pos.setY(i, y);

    const slope = slopeAt(x, z, 1.0);
    colorForPoint(x, z, y, slope, c);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, makeTerrainMaterial());
  mesh.name = 'terrain';
  mesh.receiveShadow = true;
  mesh.castShadow = false;

  return mesh;
}

export function findRidgeTop() {
  let best = { x: 0, z: 0, y: -Infinity };
  for (let z = -80; z <= 80; z += 4) {
    const bend = Math.sin(z * 0.008) * 18 + Math.sin(z * 0.0035 + 1.7) * 10;
    for (let dx = -12; dx <= 12; dx += 3) {
      const x = bend + dx;
      const y = groundHeightAt(x, z);
      if (y > best.y) best = { x, z, y };
    }
  }
  return best;
}
