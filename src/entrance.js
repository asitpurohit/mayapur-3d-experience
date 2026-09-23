import * as THREE from 'three';
import { groundHeightAt, OUTDOOR_STAIR } from './terrain.js';

export const ENTRANCE = {
  doorX: 17.7,
  doorZ: 88.06,
  doorHalfW: 6.0,
  temple: {
    minX: -18.8,
    maxX: 54.2,
    minZ: 31.94,
    maxZ: 88.06,
    minY: 35.24,
    maxY: 80.36,
  },
  stairs: {
    x: 17.7,
    halfW: 6.5,
    zTop: 89.2,
    zBottom: 138.0,
    steps: 40,
  },
  interior: {
    stairsZBot: 84.0,
    stairsZTop: 70.0,
    stairsSteps: 14,
    stairsHalfW: 4.8,
    foyerY: 35.30,
    hallY: 38.50,
    hallMinZ: 31.94,
    hallMaxZ: 70.0,
    hallHalfW: 11.5,
    altarZ: 55.0,
  },
  pathHalfW: 3.8,
};

export function onApproach(x, z, pad = 0) {
  const s = ENTRANCE.stairs;
  const inX = Math.abs(x - ENTRANCE.doorX) < Math.max(s.halfW, ENTRANCE.pathHalfW) + pad + 1.2;
  const inZ = z > ENTRANCE.temple.minZ && z < s.zBottom + pad + 3.0;
  return inX && inZ;
}

export function entranceHeightAt(x, z) {
  const base = groundHeightAt(x, z);
  const s = ENTRANCE.stairs;
  const inM = ENTRANCE.interior;
  const dx = Math.abs(x - ENTRANCE.doorX);

  // 1. Interior Sanctum Hall: z from 36.0 to 70.0
  if (z >= inM.hallMinZ && z <= inM.hallMaxZ && dx <= inM.hallHalfW + 0.5) {
    return inM.hallY;
  }

  // 2. Interior Grand Staircase: z from 70.0 to 84.0 (rises from foyerY to hallY)
  if (z > inM.hallMaxZ && z <= inM.stairsZBot && dx <= inM.stairsHalfW + 0.5) {
    const rawIn = (inM.stairsZBot - z) / (inM.stairsZBot - inM.hallMaxZ);
    return inM.foyerY + (inM.hallY - inM.foyerY) * rawIn;
  }

  // 3. Entrance Foyer & Outdoor Terrace Landing: z from 84.0 to s.zTop (89.2)
  if (z > inM.stairsZBot && z <= s.zTop && dx <= s.halfW + 0.6) {
    return inM.foyerY;
  }

  // 4. Outdoor Grand Staircase: z from s.zTop to s.zBottom
  if (dx > s.halfW + 0.6) return base;

   const topY = OUTDOOR_STAIR.topY;
   const botY = OUTDOOR_STAIR.bottomY;

  // Bottom threshold apron:
  if (z > s.zBottom && z <= s.zBottom + 2.5) {
    return Math.max(base, botY);
  }

  if (z > s.zBottom || z < s.zTop) return base;

  const raw = (s.zBottom - z) / (s.zBottom - s.zTop);
  return botY + (topY - botY) * raw;
}

export function getTempleColliders() {
  const t = ENTRANCE.temple;
  const inM = ENTRANCE.interior;
  const doorL = ENTRANCE.doorX - ENTRANCE.doorHalfW;
  const doorR = ENTRANCE.doorX + ENTRANCE.doorHalfW;
  const wallTop = t.maxY;
  const thick = 1.1;
  const y0 = t.minY - 2;

  return [
    // Outer perimeter side walls
    { minX: t.minX, maxX: t.minX + thick, minY: y0, maxY: wallTop, minZ: t.minZ, maxZ: t.maxZ },
    { minX: t.maxX - thick, maxX: t.maxX, minY: y0, maxY: wallTop, minZ: t.minZ, maxZ: t.maxZ },
    // Back wall left and right of open back doorway (same size as front doorway)
    { minX: t.minX, maxX: doorL, minY: y0, maxY: wallTop, minZ: t.minZ, maxZ: t.minZ + thick },
    { minX: doorR, maxX: t.maxX, minY: y0, maxY: wallTop, minZ: t.minZ, maxZ: t.minZ + thick },
    // Front wall left and right of open doorway
    { minX: t.minX, maxX: doorL, minY: y0, maxY: wallTop, minZ: t.maxZ - thick, maxZ: t.maxZ },
    { minX: doorR, maxX: t.maxX, minY: y0, maxY: wallTop, minZ: t.maxZ - thick, maxZ: t.maxZ },
    // Interior hall side boundary walls
    { minX: ENTRANCE.doorX - inM.hallHalfW - thick, maxX: ENTRANCE.doorX - inM.hallHalfW, minY: inM.hallY - 1, maxY: wallTop, minZ: inM.hallMinZ, maxZ: inM.hallMaxZ },
    { minX: ENTRANCE.doorX + inM.hallHalfW, maxX: ENTRANCE.doorX + inM.hallHalfW + thick, minY: inM.hallY - 1, maxY: wallTop, minZ: inM.hallMinZ, maxZ: inM.hallMaxZ },
    // Sanctum deity altar table & throne collision
    { minX: ENTRANCE.doorX - 2.5, maxX: ENTRANCE.doorX + 2.5, minY: inM.hallY, maxY: inM.hallY + 6.0, minZ: inM.altarZ - 2.5, maxZ: inM.altarZ + 2.0 },
  ];
}

export function insideTempleFootprint(x, z, pad = 0) {
  const t = ENTRANCE.temple;
  return (
    x > t.minX - pad &&
    x < t.maxX + pad &&
    z > t.minZ - pad &&
    z < t.maxZ + pad
  );
}

function stoneMat(color = 0xc4b39a, roughness = 0.9, metalness = 0.03) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addBox(parent, w, h, d, x, y, z, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildStairs(group) {
  const s = ENTRANCE.stairs;
  const matStep = stoneMat(0xb5a48b, 0.88, 0.02);
  const matStepDark = stoneMat(0x9e8e76, 0.92, 0.03);
  const matNose = stoneMat(0x8a7a64, 0.85, 0.04);
  const matPost = stoneMat(0xa5957d, 0.85, 0.04);
  const matCap = stoneMat(0xb85c2e, 0.75, 0.08);

  const run = (s.zBottom - s.zTop) / s.steps;
  const topY = groundHeightAt(s.x, s.zTop);
  const botY = groundHeightAt(s.x, s.zBottom);
  const rise = (topY - botY) / s.steps;
  const w = s.halfW * 2;
  const curbW = 0.55;

  // 1. Steps with integrated stepped side parapets
  for (let i = 0; i < s.steps; i++) {
    const z = s.zBottom - (i + 0.5) * run;
    const top = botY + rise * (i + 1);
    const h = rise + 1.4;
    const stepMat = i % 2 === 0 ? matStep : matStepDark;

    addBox(group, w, h, run + 0.04, s.x, top - h / 2, z, stepMat);
    addBox(group, w + 0.02, 0.04, 0.10, s.x, top - 0.02, z + run / 2 - 0.05, matNose);

    const parapetH = h + 0.45;
    for (const sx of [-1, 1]) {
      const curbX = s.x + sx * (s.halfW + curbW / 2);
      addBox(group, curbW, parapetH, run + 0.04, curbX, top - h / 2 + 0.225, z, matStepDark);
      addBox(group, curbW + 0.06, 0.06, run + 0.04, curbX, top + 0.45, z, matCap);
    }

    if (i % 4 === 0 || i === s.steps - 1) {
      for (const sx of [-1, 1]) {
        const postX = s.x + sx * (s.halfW + curbW / 2);
        const postH = 0.85;
        addBox(group, curbW + 0.04, postH, 0.46, postX, top + postH / 2, z, matPost);
        addBox(group, curbW + 0.12, 0.12, 0.54, postX, top + postH + 0.06, z, matCap);
      }
    }
  }

  // 2. Wide greeting threshold step at base
  const apronZ = s.zBottom + 1.0;
  const apronW = w + curbW * 2 + 0.6;
  const apron = addBox(group, apronW, 0.35, 2.0, s.x, botY - 0.05, apronZ, matStep);
  apron.receiveShadow = true;
}

function buildInterior(group) {
  const t = ENTRANCE.temple;
  const s = ENTRANCE.stairs;
  const inM = ENTRANCE.interior;
  const x = ENTRANCE.doorX;
  const curbW = 0.55;

  const matFloor = stoneMat(0xc9bca5, 0.82, 0.03);
  const matStep = stoneMat(0xb5a48b, 0.88, 0.02);
  const matStepDark = stoneMat(0x9e8e76, 0.92, 0.03);
  const matNose = stoneMat(0x8a7a64, 0.85, 0.04);
  const matPillar = stoneMat(0xdfd3be, 0.80, 0.02);
  const matAccent = stoneMat(0xb85c2e, 0.75, 0.08);
  const matGold = new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.42, metalness: 0.7 });

  // 1. Entrance Doorway Portal Trim (sealing the cut opening in the temple facade)
  const zDoor = t.maxZ;
  const doorW = ENTRANCE.doorHalfW * 2;
  const doorH = 3.8; // little more than character height (1.78m)

  // Doorway stone jamb linings
  for (const sx of [-1, 1]) {
    const jx = x + sx * (ENTRANCE.doorHalfW + 0.3);
    addBox(group, 0.65, doorH, 1.4, jx, inM.foyerY + doorH / 2, zDoor, matPillar);
  }
  // Doorway stone lintel
  addBox(group, doorW + 1.5, 0.75, 1.5, x, inM.foyerY + doorH + 0.35, zDoor, matAccent);
  addBox(group, doorW + 2.0, 0.35, 1.7, x, inM.foyerY + doorH + 0.85, zDoor, matGold);

  // Back Doorway Portal Trim (matching front door size and grandeur)
  const zBack = t.minZ;
  for (const sx of [-1, 1]) {
    const jx = x + sx * (ENTRANCE.doorHalfW + 0.3);
    addBox(group, 0.65, doorH, 1.4, jx, inM.hallY + doorH / 2, zBack, matPillar);
  }
  addBox(group, doorW + 1.5, 0.75, 1.5, x, inM.hallY + doorH + 0.35, zBack, matAccent);
  addBox(group, doorW + 2.0, 0.35, 1.7, x, inM.hallY + doorH + 0.85, zBack, matGold);

  // Back outdoor terrace platform meeting the back doorway
  const backLanding = addBox(group, doorW + 3.0, 0.45, 4.0, x, inM.hallY - 0.22, zBack - 2.0, matFloor);
  backLanding.receiveShadow = true;

  // 2. Entrance Foyer / Vestibule Floor (connecting outdoor landing to interior stairs)
  const foyerDepth = zDoor - inM.stairsZBot; // from 88.06 to 84.0 (~4m)
  const foyerZ = (zDoor + inM.stairsZBot) / 2;
  const foyerW = s.halfW * 2 + curbW * 2;
  const foyer = addBox(group, foyerW, 0.45, foyerDepth + 0.2, x, inM.foyerY - 0.22, foyerZ, matFloor);
  foyer.receiveShadow = true;

  // 3. Grand Interior Staircase (ascending from foyerY=35.30 to hallY=38.50)
  const inSteps = inM.stairsSteps;
  const inRun = (inM.stairsZBot - inM.stairsZTop) / inSteps; // (84 - 70) / 14 = 1.0m
  const inRise = (inM.hallY - inM.foyerY) / inSteps; // 3.2m / 14 = 0.228m
  const inW = inM.stairsHalfW * 2; // 9.6m wide

  for (let i = 0; i < inSteps; i++) {
    const z = inM.stairsZBot - (i + 0.5) * inRun;
    const top = inM.foyerY + inRise * (i + 1);
    const h = inRise + 1.2;
    const stepMat = i % 2 === 0 ? matStep : matStepDark;

    // Step block
    addBox(group, inW, h, inRun + 0.04, x, top - h / 2, z, stepMat);
    // Step nose trim
    addBox(group, inW + 0.02, 0.04, 0.08, x, top - 0.02, z - inRun / 2 + 0.04, matNose);

    // Stepped interior parapet on both sides
    const parH = h + 0.45;
    for (const sx of [-1, 1]) {
      const px = x + sx * (inM.stairsHalfW + curbW / 2);
      addBox(group, curbW, parH, inRun + 0.04, px, top - h / 2 + 0.225, z, matStepDark);
      addBox(group, curbW + 0.06, 0.06, inRun + 0.04, px, top + 0.45, z, matAccent);
    }

    // Carved baluster pillars at intervals
    if (i % 4 === 0 || i === inSteps - 1) {
      for (const sx of [-1, 1]) {
        const postX = x + sx * (inM.stairsHalfW + curbW / 2);
        const postH = 0.85;
        addBox(group, curbW + 0.04, postH, 0.45, postX, top + postH / 2, z, matPillar);
        addBox(group, curbW + 0.10, 0.12, 0.52, postX, top + postH + 0.06, z, matGold);
      }
    }
  }

  // 4. Elevated Sanctum Hall Floor (from z = 70.0 to z = 36.0, width 23m)
  const hallDepth = inM.hallMaxZ - inM.hallMinZ; // 34m
  const hallZ = (inM.hallMaxZ + inM.hallMinZ) / 2; // 53.0
  const hallW = inM.hallHalfW * 2; // 23m
  const hall = addBox(group, hallW, 0.55, hallDepth, x, inM.hallY - 0.27, hallZ, matFloor);
  hall.receiveShadow = true;

  // Hall decorative border trim
  addBox(group, hallW + 0.1, 0.08, hallDepth + 0.1, x, inM.hallY + 0.02, hallZ, matAccent);

  // Hall perimeter parapets
  for (const sx of [-1, 1]) {
    const px = x + sx * (inM.hallHalfW - 0.25);
    addBox(group, 0.45, 0.95, hallDepth, px, inM.hallY + 0.45, hallZ, matPillar);
    addBox(group, 0.52, 0.10, hallDepth + 0.1, px, inM.hallY + 0.95, hallZ, matGold);
  }

  // 5. Grand Mandapa Pillars lining the interior hall
  const pillarZList = [78, 66, 54, 42];
  const colDistX = inM.stairsHalfW + 2.2; // 7.0m from center
  const colH = 10.5;

  for (const pz of pillarZList) {
    for (const sx of [-1, 1]) {
      const cx = x + sx * colDistX;
      const baseColY = pz > inM.hallMaxZ ? inM.foyerY : inM.hallY;

      // Base
      addBox(group, 1.1, 0.55, 1.1, cx, baseColY + 0.27, pz, matAccent);
      // Shaft
      addBox(group, 0.78, colH, 0.78, cx, baseColY + colH / 2 + 0.55, pz, matPillar);
      // Gold decorative rings
      addBox(group, 0.88, 0.15, 0.88, cx, baseColY + colH * 0.4, pz, matGold);
      addBox(group, 0.88, 0.15, 0.88, cx, baseColY + colH * 0.75, pz, matGold);
      // Capital
      addBox(group, 1.25, 0.65, 1.25, cx, baseColY + colH + 0.75, pz, matAccent);
      addBox(group, 1.45, 0.25, 1.45, cx, baseColY + colH + 1.1, pz, matGold);

      // Warm ghee lamp on pillar
      const lamp = new THREE.PointLight(0xffbe68, 20, 10, 1.8);
      lamp.position.set(cx - sx * 0.55, baseColY + 3.2, pz);
      group.add(lamp);
    }
  }

  // 6. Central Deity Altar & Pavilion (under the main dome at z = inM.altarZ)
  const altarZ = inM.altarZ;
  const aY = inM.hallY;

  // Tier 1 plinth
  addBox(group, 8.5, 0.45, 6.5, x, aY + 0.22, altarZ, matPillar);
  addBox(group, 8.7, 0.08, 6.7, x, aY + 0.46, altarZ, matGold);

  // Tier 2 plinth
  addBox(group, 6.5, 0.45, 5.0, x, aY + 0.67, altarZ, matAccent);
  addBox(group, 6.7, 0.08, 5.2, x, aY + 0.91, altarZ, matGold);

  // Tier 3 altar table
  addBox(group, 4.8, 0.55, 3.5, x, aY + 1.18, altarZ, stoneMat(0xf0ede4, 0.5, 0.1));
  addBox(group, 5.0, 0.10, 3.7, x, aY + 1.48, altarZ, matGold);

  // Altar backdrop / throne arch
  addBox(group, 5.2, 5.0, 0.45, x, aY + 3.8, altarZ - 1.6, matPillar);
  addBox(group, 5.5, 0.6, 0.65, x, aY + 6.4, altarZ - 1.6, matAccent);
  addBox(group, 5.7, 0.35, 0.75, x, aY + 6.8, altarZ - 1.6, matGold);

  // 7. Radiant Golden Sanctum Chandelier Light (gentle ambient dome glow)
  const chandelier = new THREE.PointLight(0xffdfa0, 35, 45, 1.6);
  chandelier.position.set(x, aY + 12.0, altarZ);
  group.add(chandelier);
}

function buildLanding(group) {
  const t = ENTRANCE.temple;
  const s = ENTRANCE.stairs;
  const matLanding = stoneMat(0xc4b39a, 0.88, 0.02);
  const matTrim = stoneMat(0x9e8e76, 0.90, 0.03);
  const matCap = stoneMat(0xb85c2e, 0.75, 0.08);
  const x = ENTRANCE.doorX;
  const y0 = t.minY;
  const curbW = 0.55;
  const totalW = s.halfW * 2 + curbW * 2 + 0.6;

  // Outdoor terrace landing platform meeting the top step and leading to the doorway
  const zStart = s.zTop;
  const zEnd = t.maxZ;
  const depth = zStart - zEnd;
  const midZ = (zStart + zEnd) / 2;

  const landing = addBox(group, totalW, 0.45, depth + 0.1, x, y0 + 0.05, midZ, matLanding);
  landing.receiveShadow = true;

  addBox(group, totalW + 0.1, 0.08, depth + 0.1, x, y0 + 0.08, midZ, matTrim);

  for (const sx of [-1, 1]) {
    const px = x + sx * (s.halfW + curbW / 2);
    addBox(group, curbW, 0.85, depth, px, y0 + 0.45, midZ, matTrim);
    addBox(group, curbW + 0.06, 0.08, depth, px, y0 + 0.90, midZ, matCap);
  }

  const light = new THREE.PointLight(0xffdfa0, 40, 18, 1.8);
  light.position.set(x, y0 + 3.0, t.maxZ + 0.5);
  group.add(light);
}

export function buildEntrance() {
  const group = new THREE.Group();
  group.name = 'temple-entrance';
  buildStairs(group);
  buildLanding(group);
  buildInterior(group);
  return group;
}

