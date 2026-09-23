import * as THREE from 'three';
import { makeRng, valueNoise2 } from './noise.js';
import { makeInstancedFromProto, UNIT_BOX } from './instancing.js';

const FLOOR_HEIGHT = 3.3;
const LOBBY_HEIGHT = 4.4;
const BAY_WIDTH = 3.1;

const STYLES = {
  concrete: {
    facade: 0xbcb2a0,
    trim: 0x8d8574,
    glassTop: 0x596a76,
    glassBottom: 0x91a6b2,
    litChance: 0.1,
  },
  glass: {
    facade: 0x7c8a97,
    trim: 0x636d78,
    glassTop: 0x4c6373,
    glassBottom: 0x8aa6b6,
    litChance: 0.14,
  },
  brick: {
    facade: 0x9b6851,
    trim: 0x714c3c,
    glassTop: 0x54656f,
    glassBottom: 0x8d9fa9,
    litChance: 0.12,
  },
  sandstone: {
    facade: 0xc6b48d,
    trim: 0x998764,
    glassTop: 0x5d6e79,
    glassBottom: 0x96a8b1,
    litChance: 0.09,
  },
  residential: {
    facade: 0xb2a68f,
    trim: 0x827768,
    glassTop: 0x566670,
    glassBottom: 0x8d9ea7,
    litChance: 0.18,
  },
};

function canvasTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

// One floor tall, four bays wide. Repeated per building so window rows line up
// with real storeys instead of smearing across the box.
function makeFacadeTexture(styleName, variant) {
  const style = STYLES[styleName];
  const bays = 4;
  const bw = 64;
  const bh = 128;
  const canvas = document.createElement('canvas');
  canvas.width = bays * bw;
  canvas.height = bh;
  const ctx = canvas.getContext('2d');
  const rng = makeRng(1000 + variant * 37);

  const facade = new THREE.Color(style.facade).offsetHSL(0, 0, (rng() - 0.5) * 0.05);
  ctx.fillStyle = `#${facade.getHexString()}`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Soft vertical grime/shading so flat walls read as real surfaces.
  const grime = ctx.createLinearGradient(0, 0, 0, bh);
  grime.addColorStop(0, 'rgba(255,255,255,0.12)');
  grime.addColorStop(1, 'rgba(0,0,0,0.09)');
  ctx.fillStyle = grime;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const isGlass = styleName === 'glass';
  const winW = isGlass ? bw - 8 : 40;
  const winH = isGlass ? bh - 14 : 66;
  const winX = (bw - winW) / 2;
  const winY = isGlass ? 8 : 28;
  const hasBalcony = styleName === 'residential';

  for (let b = 0; b < bays; b++) {
    const x = b * bw + winX;
    const lit = rng() < style.litChance;
    const shade = 0.82 + rng() * 0.36;

    const glass = ctx.createLinearGradient(0, winY, 0, winY + winH);
    const top = new THREE.Color(style.glassTop).multiplyScalar(shade);
    const bottom = new THREE.Color(style.glassBottom).multiplyScalar(shade);
    if (lit) {
      glass.addColorStop(0, '#8a7448');
      glass.addColorStop(1, '#f0cf8f');
    } else {
      glass.addColorStop(0, `#${top.getHexString()}`);
      glass.addColorStop(1, `#${bottom.getHexString()}`);
    }
    ctx.fillStyle = glass;
    ctx.fillRect(x, winY, winW, winH);

    // Frame + mullion.
    ctx.strokeStyle = `#${new THREE.Color(style.trim).multiplyScalar(0.95).getHexString()}`;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, winY + 1, winW - 2, winH - 2);
    ctx.beginPath();
    ctx.moveTo(x + winW / 2, winY + 2);
    ctx.lineTo(x + winW / 2, winY + winH - 2);
    ctx.stroke();

    if (hasBalcony) {
      ctx.fillStyle = `#${new THREE.Color(style.trim).multiplyScalar(0.92).getHexString()}`;
      ctx.fillRect(x - 4, winY + winH - 6, winW + 8, 7);
    }

    // Sill shadow under each opening.
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.fillRect(x - 2, winY + winH, winW + 4, 3);
  }

  // Floor slab band.
  ctx.fillStyle = `#${new THREE.Color(style.trim).multiplyScalar(1.05).getHexString()}`;
  ctx.fillRect(0, bh - 8, canvas.width, 8);
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(0, bh - 3, canvas.width, 3);

  return canvasTexture(canvas);
}

function makeLobbyTexture(styleName, variant) {
  const style = STYLES[styleName];
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const rng = makeRng(5000 + variant * 17);

  ctx.fillStyle = `#${new THREE.Color(style.trim).multiplyScalar(0.8).getHexString()}`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Storefront glazing with a warm entrance.
  for (let i = 0; i < 5; i++) {
    const x = 8 + i * 50;
    const lit = rng() < 0.45;
    const grad = ctx.createLinearGradient(0, 18, 0, 108);
    grad.addColorStop(0, lit ? '#4d4130' : '#33404a');
    grad.addColorStop(1, lit ? '#d8b378' : '#5f7482');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 18, 38, 90);
    ctx.strokeStyle = '#2f3238';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, 18, 38, 90);
  }

  ctx.fillStyle = '#20242a';
  ctx.fillRect(0, 108, canvas.width, 20);
  return canvasTexture(canvas);
}

function makeRoofTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#b3b0a6';
  ctx.fillRect(0, 0, 64, 64);
  const rng = makeRng(99);
  for (let i = 0; i < 240; i++) {
    const v = Math.floor(150 + rng() * 60);
    ctx.fillStyle = `rgba(${v},${v},${v - 6},0.5)`;
    ctx.fillRect(rng() * 64, rng() * 64, 3 + rng() * 6, 3 + rng() * 5);
  }
  return canvasTexture(canvas);
}

let roofMaterialCache = null;

function roofMaterial() {
  if (!roofMaterialCache) {
    roofMaterialCache = new THREE.MeshStandardMaterial({
      map: makeRoofTexture(),
      color: 0xb6b2a7,
      roughness: 0.95,
      metalness: 0.05,
    });
  }
  return roofMaterialCache;
}

function facadeMaterial(styleName, variant, bays, floors) {
  const tex = makeFacadeTexture(styleName, variant);
  tex.repeat.set(bays, Math.max(1, floors));
  return new THREE.MeshStandardMaterial({
    map: tex,
    roughness: styleName === 'glass' ? 0.42 : 0.82,
    metalness: styleName === 'glass' ? 0.32 : 0.05,
  });
}

function lobbyMaterial(styleName, variant) {
  const tex = makeLobbyTexture(styleName, variant);
  tex.repeat.set(2, 1);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.12 });
}

let pavingMaterialCache = null;

function pavingMaterial() {
  if (!pavingMaterialCache) {
    pavingMaterialCache = new THREE.MeshStandardMaterial({
      color: 0x6f6d68,
      roughness: 0.95,
      metalness: 0.03,
    });
  }
  return pavingMaterialCache;
}

function addBox(parent, material, w, h, d, x, y, z) {
  const mesh = new THREE.Mesh(UNIT_BOX, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, d);
  parent.add(mesh);
  return mesh;
}

// Parapet ring, stair bulkhead, water tank and a slim antenna for tall towers.
function addRoofDetails(parent, w, d, roofY, floors, rng) {
  const roof = roofMaterial();
  const capH = 0.55;
  const t = 0.45;
  addBox(parent, roof, w + 0.4, capH, t, 0, roofY + capH / 2, d / 2 + 0.2);
  addBox(parent, roof, w + 0.4, capH, t, 0, roofY + capH / 2, -d / 2 - 0.2);
  addBox(parent, roof, t, capH, d, w / 2 + 0.2, roofY + capH / 2, 0);
  addBox(parent, roof, t, capH, d, -w / 2 - 0.2, roofY + capH / 2, 0);

  const bulkW = Math.min(w * 0.4, 6);
  const bulkD = Math.min(d * 0.4, 5);
  addBox(parent, roof, bulkW, 2.6, bulkD, w * 0.18, roofY + 1.3, -d * 0.16);

  if (rng() > 0.45) {
    const tankR = 1.1 + rng() * 0.7;
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(tankR, tankR, 2.2, 10),
      roof,
    );
    tank.position.set(-w * 0.22, roofY + 1.1, d * 0.18);
    parent.add(tank);
  }

  if (floors >= 9 && rng() > 0.35) {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 7 + rng() * 5, 6), roof);
    mast.position.set(w * 0.24, roofY + 4, d * 0.24);
    parent.add(mast);
  }
}

function buildBuildingPrototype(rng, { floors, styleName }) {
  const group = new THREE.Group();
  const w = 9 + rng() * 9;
  const d = 9 + rng() * 9;
  const variant = Math.floor(rng() * 1000);

  const baysW = Math.max(2, Math.round(w / BAY_WIDTH));
  const baysD = Math.max(2, Math.round(d / BAY_WIDTH));

  const sideX = facadeMaterial(styleName, variant, baysD, floors - 1);
  const sideZ = facadeMaterial(styleName, variant, baysW, floors - 1);
  const lobby = lobbyMaterial(styleName, variant + 7);

  // Paved plot so towers do not appear to grow straight out of the grass.
  addBox(group, pavingMaterial(), w + 12, 0.3, d + 12, 0, -0.15, 0);

  // Ground floor lobby, slightly proud of the tower above it.
  addBox(group, lobby, w + 0.7, LOBBY_HEIGHT, d + 0.7, 0, LOBBY_HEIGHT / 2, 0);

  const towerH = (floors - 1) * FLOOR_HEIGHT;
  const towerY = LOBBY_HEIGHT;
  const tower = new THREE.Mesh(UNIT_BOX, [sideX, sideX, roofMaterial(), roofMaterial(), sideZ, sideZ]);
  tower.position.set(0, towerY + towerH / 2, 0);
  tower.scale.set(w, towerH, d);
  group.add(tower);

  addRoofDetails(group, w, d, towerY + towerH, floors, rng);

  // Taller blocks get a stepped upper mass for a more realistic skyline.
  if (floors >= 8 && rng() > 0.4) {
    const uw = w * (0.55 + rng() * 0.15);
    const ud = d * (0.55 + rng() * 0.15);
    const uFloors = 2 + Math.floor(rng() * 3);
    const uH = uFloors * FLOOR_HEIGHT;
    const uY = towerY + towerH + 0.55;
    const uStyle = styleName === 'glass' ? 'glass' : styleName;
    const upX = facadeMaterial(uStyle, variant + 3, Math.max(2, Math.round(ud / BAY_WIDTH)), uFloors);
    const upZ = facadeMaterial(uStyle, variant + 3, Math.max(2, Math.round(uw / BAY_WIDTH)), uFloors);
    const upper = new THREE.Mesh(UNIT_BOX, [upX, upX, roofMaterial(), roofMaterial(), upZ, upZ]);
    upper.position.set(0, uY + uH / 2, 0);
    upper.scale.set(uw, uH, ud);
    group.add(upper);
    addRoofDetails(group, uw, ud, uY + uH, uFloors, rng);
  }

  return group;
}

// Push blocks toward warm terracotta and cool slate so the skyline has depth.
function buildingTint(p) {
  const warm = p.shade;
  return {
    r: 0.9 + warm * 0.24,
    g: 0.93 + warm * 0.11,
    b: 0.99 - warm * 0.16,
  };
}

function prototypeFloors(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}


function makeSandTreePrototype(rng) {
  const group = new THREE.Group();
  const trunkH = 2.3 + rng() * 1.7;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.2, trunkH, 6, 2),
    new THREE.MeshStandardMaterial({ color: 0x6b563c, roughness: 0.95, flatShading: true }),
  );
  trunk.position.y = trunkH / 2;
  group.add(trunk);

  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x7a8a45,
    roughness: 0.95,
    metalness: 0,
    flatShading: true,
  });
  const leafGeo = new THREE.IcosahedronGeometry(1, 0);
  const blobs = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < blobs; i++) {
    const angle = rng() * Math.PI * 2;
    const r = 0.5 + rng() * 0.5;
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(
      Math.cos(angle) * r * 0.9,
      trunkH * 0.9 + rng() * 0.9,
      Math.sin(angle) * r * 0.9,
    );
    leaf.scale.set(0.9 + rng() * 0.8, 0.5 + rng() * 0.4, 0.9 + rng() * 0.8);
    leaf.rotation.y = rng() * Math.PI;
    group.add(leaf);
  }
  return group;
}

// Dry-country trees dotted through the sand around the city blocks.
function buildSandTrees(placed, rng, exclude = []) {
  const group = new THREE.Group();
  group.name = 'sand-trees';
  const points = [];
  let attempts = 0;
  while (points.length < 1400 && attempts < 1400 * 60) {
    attempts++;
    const angle = rng() * Math.PI * 2;
    const radius = 215 + rng() * 400;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(x) < 220 && Math.abs(z) < 220) continue;
    if (z < -215 && z > -495) continue;
    if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < 13)) continue;
    if (exclude.some((e) => Math.hypot(e.x - x, e.z - z) < (e.radius || 44))) continue;
    if (onRoad(x, z)) continue;
    points.push({
      x,
      y: -3.7,
      z,
      rot: rng() * Math.PI * 2,
      scale: 0.7 + rng() * 0.75,
      shade: rng(),
    });
  }

  const half = points.filter((_, i) => i % 2 === 0);
  const rest = points.filter((_, i) => i % 2 === 1);
  if (half.length) {
    group.add(makeInstancedFromProto(makeSandTreePrototype(makeRng(5150)), half, {
      colorJitter: 0.24,
      castShadow: false,
    }));
  }
  if (rest.length) {
    group.add(makeInstancedFromProto(makeSandTreePrototype(makeRng(6260)), rest, {
      colorJitter: 0.24,
      castShadow: false,
    }));
  }
  group.userData.count = points.length;
  return group;
}


function buildSandBushes(rng, exclude = []) {
  const group = new THREE.Group();
  group.name = 'sand-bushes';
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x8a8f4f,
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  const points = [];
  let attempts = 0;
  while (points.length < 1500 && attempts < 1500 * 50) {
    attempts++;
    const angle = rng() * Math.PI * 2;
    const radius = 214 + rng() * 420;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(x) < 220 && Math.abs(z) < 220) continue;
    if (z < -215 && z > -495) continue;
    if (exclude.some((e) => Math.hypot(e.x - x, e.z - z) < (e.radius || 36))) continue;
    if (onRoad(x, z)) continue;
    points.push({ x, y: -3.7, z, rot: rng() * Math.PI * 2, scale: 0.5 + rng() * 0.9, shade: rng() });
  }
  const im = new THREE.InstancedMesh(geo, mat, points.length);
  im.castShadow = false;
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    pos.set(p.x, p.y + 0.35 * p.scale, p.z);
    quat.setFromEuler(new THREE.Euler(0, p.rot, 0));
    scl.set(p.scale * 1.5, p.scale * 0.75, p.scale * 1.5);
    matrix.compose(pos, quat, scl);
    im.setMatrixAt(i, matrix);
  }
  im.instanceMatrix.needsUpdate = true;
  group.add(im);
  group.userData.count = points.length;
  return group;
}


const ROAD = {
  step: 95,
  halfWidth: 7,
  span: 640,
  minFromHill: 232,
  riverNear: -215,
  riverFar: -495,
};

function roadLines() {
  const vertical = [];
  const horizontal = [];
  for (let v = -610; v <= 610; v += ROAD.step) {
    if (Math.abs(v) < ROAD.minFromHill) continue;
    vertical.push(v);
    if (v < ROAD.riverNear && v > ROAD.riverFar) continue;
    horizontal.push(v);
  }
  return { vertical, horizontal };
}

const ROADS = roadLines();

function onRoad(x, z, pad = ROAD.halfWidth + 1.5) {
  for (const x0 of ROADS.vertical) {
    if (Math.abs(x - x0) > pad) continue;
    if (z <= ROAD.riverNear && z >= ROAD.riverFar) continue;
    return true;
  }
  for (const z0 of ROADS.horizontal) {
    if (Math.abs(z - z0) > pad) continue;
    return true;
  }
  return false;
}

// Asphalt streets laid over the flats, split around the river.
function buildRoads() {
  const group = new THREE.Group();
  group.name = 'city-roads';
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x46464a, roughness: 0.96, metalness: 0.02 });
  const width = ROAD.halfWidth * 2;
  const y = -3.66;

  const addStrip = (w, d, px, pz) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), asphalt);
    mesh.position.set(px, y, pz);
    mesh.receiveShadow = true;
    group.add(mesh);
  };

  for (const x0 of ROADS.vertical) {
    const nearLen = ROAD.span - Math.abs(ROAD.riverNear);
    addStrip(width, nearLen, x0, (ROAD.span + ROAD.riverNear) / 2);
    const farLen = ROAD.span - Math.abs(ROAD.riverFar);
    addStrip(width, farLen, x0, -(ROAD.span + Math.abs(ROAD.riverFar)) / 2);
  }
  for (const z0 of ROADS.horizontal) {
    addStrip(ROAD.span * 2, width, 0, z0);
  }

  group.userData.count = ROADS.vertical.length * 2 + ROADS.horizontal.length;
  return group;
}

// Lamp posts along the streets.
function buildStreetLights() {
  const group = new THREE.Group();
  group.name = 'street-lights';
  const poleGeo = new THREE.BoxGeometry(0.2, 6.4, 0.2);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x3f4247, roughness: 0.7, metalness: 0.3 });
  const lampGeo = new THREE.BoxGeometry(0.62, 0.2, 0.3);
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xffe6b8,
    emissive: 0xffb457,
    emissiveIntensity: 1.1,
    roughness: 0.5,
  });

  const points = [];
  const spacing = 58;
  for (const x0 of ROADS.vertical) {
    for (let z = -600; z <= ROAD.span; z += spacing) {
      if (z < ROAD.riverNear && z > ROAD.riverFar) continue;
      if (Math.abs(x0) > ROAD.span || Math.abs(z) > ROAD.span) continue;
      points.push({ x: x0 + ROAD.halfWidth + 1.6, z, rot: 0 });
    }
  }
  for (const z0 of ROADS.horizontal) {
    for (let x = -ROAD.span; x <= ROAD.span; x += spacing) {
      points.push({ x, z: z0 + ROAD.halfWidth + 1.6, rot: Math.PI / 2 });
    }
  }

  const y = -3.7;
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, points.length);
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, points.length);
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3(1, 1, 1);

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    pos.set(p.x, y + 3.2, p.z);
    quat.setFromEuler(new THREE.Euler(0, p.rot, 0));
    matrix.compose(pos, quat, scl);
    poles.setMatrixAt(i, matrix);

    const dir = p.rot === 0 ? -1 : 1;
    pos.set(p.x + (p.rot === 0 ? -0.75 : 0), y + 6.35, p.z + (p.rot === 0 ? 0 : -0.75 * dir));
    matrix.compose(pos, quat, scl);
    lamps.setMatrixAt(i, matrix);
  }
  poles.instanceMatrix.needsUpdate = true;
  lamps.instanceMatrix.needsUpdate = true;
  group.add(poles, lamps);
  group.userData.count = points.length;
  return group;
}

// Grass tufts and ground cover through the city blocks.
function buildCityGrass(rng, exclude = []) {
  const group = new THREE.Group();
  group.name = 'city-grass';
  const geo = new THREE.ConeGeometry(0.18, 1, 4, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x6c8f3f,
    emissive: 0x0d1a09,
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });

  const points = [];
  let attempts = 0;
  while (points.length < 5200 && attempts < 5200 * 40) {
    attempts++;
    const angle = rng() * Math.PI * 2;
    const radius = 214 + rng() * 430;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(x) < 220 && Math.abs(z) < 220) continue;
    if (z < ROAD.riverNear && z > ROAD.riverFar) continue;
    if (exclude.some((e) => Math.hypot(e.x - x, e.z - z) < (e.radius || 36))) continue;
    if (onRoad(x, z, ROAD.halfWidth + 1)) continue;
    points.push({ x, y: -3.7, z, rot: rng() * Math.PI * 2, scale: 0.6 + rng() * 0.8, shade: rng() });
  }

  const im = new THREE.InstancedMesh(geo, mat, points.length);
  im.castShadow = false;
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const h = 0.5 + p.shade * 0.5;
    pos.set(p.x, p.y + h * 0.5, p.z);
    quat.setFromEuler(new THREE.Euler(0, p.rot, 0));
    scl.set(p.scale, h, p.scale);
    matrix.compose(pos, quat, scl);
    im.setMatrixAt(i, matrix);
  }
  im.instanceMatrix.needsUpdate = true;
  group.add(im);
  group.userData.count = points.length;
  return group;
}

export function buildCity({ exclude = [] } = {}) {
  const group = new THREE.Group();
  group.name = 'city-backdrop';
  const rng = makeRng(2024);

  const styleNames = Object.keys(STYLES);
  const prototypes = [];

  // Two prototype pools per band so nearer rings stay low and distant ones rise.
  const bands = [
    { min: 4, max: 6, count: 4 },
    { min: 5, max: 8, count: 4 },
    { min: 6, max: 10, count: 5 },
  ];

  for (const band of bands) {
    const pool = [];
    for (let i = 0; i < band.count; i++) {
      const floors = prototypeFloors(rng, band.min, band.max);
      const styleName = styleNames[Math.floor(rng() * styleNames.length)];
      pool.push(buildBuildingPrototype(rng, { floors, styleName }));
    }
    prototypes.push({ band, pool });
  }

  const placedPoints = [];
  const rings = [
    { r0: 224, r1: 300, count: 460, band: 0, scale: [0.9, 1.15] },
    { r0: 305, r1: 380, count: 620, band: 1, scale: [0.95, 1.25] },
    { r0: 380, r1: 470, count: 760, band: 2, scale: [1.0, 1.35] },
    { r0: 470, r1: 600, count: 560, band: 2, scale: [1.0, 1.3] },
  ];

  for (const ring of rings) {
    const { pool } = prototypes[ring.band];
    const placements = pool.map(() => []);
    let placed = 0;

    for (let i = 0; i < ring.count; i++) {
      const ang = rng() * Math.PI * 2;
      const rad = ring.r0 + rng() * (ring.r1 - ring.r0);
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad;
      const n = valueNoise2(x * 0.01, z * 0.01);
      if (n < 0.16) continue;
      if (exclude.some((e) => Math.hypot(e.x - x, e.z - z) < 125)) continue;
      // Keep off the hill mesh and out of the river.
      if (Math.abs(x) < 218 && Math.abs(z) < 218) continue;
      if (z < -215 && z > -495) continue;
      if (onRoad(x, z, ROAD.halfWidth + 6)) continue;

      const protoIndex = Math.floor(rng() * pool.length);
      placedPoints.push({ x, z });
      placements[protoIndex].push({
        x,
        y: -3.64,
        z,
        rot: Math.round(rng() * 8) * (Math.PI / 4) + (rng() - 0.5) * 0.12,
        scale: ring.scale[0] + rng() * (ring.scale[1] - ring.scale[0]),
        shade: rng(),
      });
      placed += 1;
    }

    for (let i = 0; i < pool.length; i++) {
      if (!placements[i].length) continue;
      const instanced = makeInstancedFromProto(pool[i], placements[i], {
        colorJitter: 0.2,
        castShadow: false,
        tintFn: buildingTint,
      });
      group.add(instanced);
    }

    group.userData.buildings = (group.userData.buildings || 0) + placed;
  }

  const sandTrees = buildSandTrees(placedPoints, rng, exclude);
  group.add(sandTrees);
  group.userData.sandTrees = sandTrees.userData.count;

  const sandBushes = buildSandBushes(rng, exclude);
  group.add(sandBushes);
  group.userData.sandBushes = sandBushes.userData.count;

  const roads = buildRoads();
  group.add(roads);
  group.userData.roads = roads.userData.count;

  const lights = buildStreetLights();
  group.add(lights);
  group.userData.streetLights = lights.userData.count;

  const cityGrass = buildCityGrass(rng, exclude);
  group.add(cityGrass);
  group.userData.cityGrass = cityGrass.userData.count;

  return group;
}
