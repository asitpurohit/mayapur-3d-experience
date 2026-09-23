import * as THREE from 'three';
import { makeRng } from './noise.js';
import { makeInstancedFromProto } from './instancing.js';

// Landmark placement is just beyond the hill, among the first city blocks.
export const GURUKUL = { x: -242, z: 47, radius: 38 };

function box(parent, material, w, h, d, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function ribbon(parent, points, width, y, material, name) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const segments = 48;
  const positions = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const center = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x);
    positions.push(
      center.x - side.x * width / 2, y, center.z - side.z * width / 2,
      center.x + side.x * width / 2, y, center.z + side.z * width / 2,
    );
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCourtyardAndLane(group, materials) {
  const { concrete, paver, gravel } = materials;
  const court = box(group, concrete, 34, 0.12, 12, 0, -0.1, 32.7);
  court.name = 'gurukul-stone-courtyard';
  court.receiveShadow = true;

  const tileGeo = new THREE.BoxGeometry(1.62, 0.055, 1.42);
  const tiles = new THREE.InstancedMesh(tileGeo, paver, 18 * 7);
  tiles.name = 'gurukul-courtyard-pavers';
  tiles.castShadow = true;
  tiles.receiveShadow = true;
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const color = new THREE.Color();
  const rng = makeRng(6011);
  let index = 0;
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 18; col++) {
      position.set(-16.2 + col * 1.9, -0.035, 27.8 + row * 1.62);
      rotation.setFromEuler(new THREE.Euler(0, (rng() - 0.5) * 0.035, 0));
      matrix.compose(position, rotation, scale);
      tiles.setMatrixAt(index, matrix);
      color.setHSL(0.12, 0.14 + rng() * 0.08, 0.56 + rng() * 0.11);
      tiles.setColorAt(index, color);
      index++;
    }
  }
  tiles.instanceMatrix.needsUpdate = true;
  if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
  group.add(tiles);

  const road = [[0, 38.3], [0, 45], [0.7, 55], [1.6, 68], [0.8, 82]];
  ribbon(group, road, 4.8, -0.035, concrete, 'gurukul-concrete-access-lane');
  ribbon(group, road.map(([x, z]) => [x - 3, z]), 1.15, -0.095, gravel, 'gurukul-lane-left-shoulder');
  ribbon(group, road.map(([x, z]) => [x + 3, z]), 1.15, -0.095, gravel, 'gurukul-lane-right-shoulder');
}

function isPavedArea(x, z) {
  if (Math.abs(x) < 18 && z > 25 && z < 40) return true;
  if (z < 36 || z > 85) return false;
  const laneX = z < 55 ? 0 : z < 68 ? ((z - 55) / 13) * 1.6 : 1.6 - ((z - 68) / 14) * 0.8;
  return Math.abs(x - laneX) < 4.8;
}

function addNaturalGround(group, materials) {
  const rng = makeRng(80917);
  const patches = [];
  for (let attempts = 0; attempts < 2000 && patches.length < 56; attempts++) {
    const angle = rng() * Math.PI * 2;
    const radius = 32 + rng() * 34;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const patchRadius = 2.6 + rng() * 4.0;
    if (Math.abs(x) < 28 && Math.abs(z) < 23) continue;
    if (isPavedArea(x, z) || patches.some((p) => Math.hypot(p.x - x, p.z - z) < 7.5)) continue;
    patches.push({ x, z, radius: patchRadius, tone: rng() });
  }

  const soils = [materials.earth, materials.dryGrass];
  for (const patch of patches) {
    const shape = new THREE.Shape();
    const vertices = 9;
    for (let i = 0; i < vertices; i++) {
      const angle = (i / vertices) * Math.PI * 2;
      const wobble = 0.72 + rng() * 0.56;
      const x = Math.cos(angle) * patch.radius * wobble;
      const z = Math.sin(angle) * patch.radius * wobble;
      if (i === 0) shape.moveTo(x, z);
      else shape.lineTo(x, z);
    }
    shape.closePath();
    const geometry = new THREE.ShapeGeometry(shape, 1);
    geometry.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, soils[patch.tone > 0.62 ? 1 : 0]);
    mesh.position.set(patch.x, -0.078, patch.z);
    mesh.rotation.y = rng() * Math.PI * 2;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  const grassProto = new THREE.Group();
  const bladeGeo = new THREE.ConeGeometry(0.075, 0.56, 4, 1);
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + rng() * 0.5;
    const height = 0.72 + rng() * 0.46;
    const blade = new THREE.Mesh(bladeGeo, i % 2 ? materials.grassDark : materials.grass);
    blade.position.set(Math.cos(angle) * 0.13, height * 0.28, Math.sin(angle) * 0.13);
    blade.scale.set(0.8 + rng() * 0.4, height, 0.8 + rng() * 0.4);
    blade.rotation.set(Math.cos(angle) * 0.28, rng() * Math.PI, Math.sin(angle) * 0.28);
    grassProto.add(blade);
  }

  const grassPoints = [];
  for (let attempts = 0; attempts < 16000 && grassPoints.length < 2100; attempts++) {
    const angle = rng() * Math.PI * 2;
    const radius = 29 + rng() * 43;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(x) < 27 && Math.abs(z) < 22) continue;
    if (isPavedArea(x, z)) continue;
    grassPoints.push({
      x,
      y: -0.095,
      z,
      rot: rng() * Math.PI * 2,
      scale: 0.65 + rng() * 0.8,
      shade: rng(),
    });
  }
  const grass = makeInstancedFromProto(grassProto, grassPoints, { colorJitter: 0.24, castShadow: false });
  grass.name = 'gurukul-natural-grass';
  group.add(grass);
}

function column(parent, wood, stone, x, z, bottom, top, radius = 0.3) {
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.65, radius * 1.8, 0.62, 6), stone);
  plinth.position.set(x, bottom + 0.31, z);
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  parent.add(plinth);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.9, radius * 1.12, top - bottom - 0.7, 8), wood);
  post.position.set(x, (bottom + top) / 2 + 0.35, z);
  post.castShadow = true;
  post.receiveShadow = true;
  parent.add(post);

  const capital = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.5, radius * 1.1, 0.32, 6), wood);
  capital.position.set(x, top - 0.16, z);
  capital.castShadow = true;
  parent.add(capital);
}

function roof(parent, wood, thatch, x, z, eaveY, width, depth, height) {
  // Eight broad facets give the layered roofs a hand-built, thatched silhouette.
  const bottomRadius = (width / Math.SQRT2) * 1.08;
  const topRadius = width * 0.035;
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(topRadius, bottomRadius, height, 8, 1),
    thatch,
  );
  mesh.position.set(x, eaveY + height / 2, z);
  mesh.scale.z = depth / width;
  mesh.rotation.y = Math.PI / 8;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);

  // Dark timber fascia under the deep thatch overhang.
  box(parent, wood, width + 0.7, 0.48, 0.55, x, eaveY - 0.12, z + depth / 2 - 0.15);
  box(parent, wood, width + 0.7, 0.48, 0.55, x, eaveY - 0.12, z - depth / 2 + 0.15);
  box(parent, wood, 0.55, 0.48, depth, x + width / 2 - 0.15, eaveY - 0.12, z);
  box(parent, wood, 0.55, 0.48, depth, x - width / 2 + 0.15, eaveY - 0.12, z);

  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.25, 6), wood);
  finial.position.set(x, eaveY + height + 0.45, z);
  finial.castShadow = true;
  parent.add(finial);
}

function addMainHall(group, mats) {
  const { wood, stone, thatch, wall, dark } = mats;
  const bottom = 0.8;
  const top = 10.8;
  const xs = [-11.3, 0, 11.3];
  const zs = [-8.2, 8.2];

  for (const x of xs) {
    for (const z of zs) column(group, wood, stone, x, z, bottom, top, 0.34);
  }
  for (const x of [-11.3, 11.3]) {
    for (const z of [-3.6, 3.6]) column(group, wood, stone, x, z, bottom, top, 0.28);
  }
  for (const z of [-8.2, 8.2]) {
    box(group, wood, 23.4, 0.48, 0.5, 0, top - 0.08, z);
  }
  for (const x of [-11.3, 11.3]) {
    box(group, wood, 0.5, 0.48, 16.7, x, top - 0.08, 0);
  }

  // A shaded teaching room at the back of the open assembly hall.
  box(group, wall, 13.5, 5.4, 0.45, 0, 4.45, -7.45);
  box(group, dark, 2.0, 3.6, 0.12, 0, 3.45, -7.18);
  for (const x of [-5.2, 5.2]) {
    box(group, wood, 0.22, 4.5, 0.18, x, 4.75, -7.13);
    box(group, wood, 2.5, 0.2, 0.18, x, 5.1, -7.13);
  }

  roof(group, wood, thatch, 0, 0, top, 31.5, 25.2, 9.0);
}

function addUpperPavilion(group, mats) {
  const { wood, stone, thatch, wall } = mats;
  const bottom = 19.0;
  const top = 25.6;
  for (const x of [-4.6, 4.6]) {
    for (const z of [-4.2, 4.2]) column(group, wood, stone, x, z, bottom, top, 0.25);
  }

  // Low woven half-walls and railings give the crown room the open-gallery look.
  box(group, wall, 7.8, 2.0, 0.28, 0, 21.2, -4.0);
  box(group, wood, 8.8, 0.22, 0.25, 0, 21.0, 4.1);
  for (const x of [-4.2, 4.2]) {
    box(group, wood, 0.2, 1.0, 8.2, x, 21.4, 0);
  }
  for (let i = -3; i <= 3; i++) {
    box(group, wood, 0.1, 1.4, 0.12, i * 1.05, 21.25, -3.8);
  }

  // Narrow upper floor sits over the main roof peak, matching the reference silhouette.
  box(group, stone, 10.2, 0.45, 9.3, 0, 18.8, 0);
  roof(group, wood, thatch, 0, 0, top, 16.5, 14.7, 7.1);
}

function addSidePavilions(group, mats) {
  const { wood, stone, thatch } = mats;
  for (const x of [-18.2, 18.2]) {
    const bottom = 0.8;
    const top = 7.7;
    for (const sx of [-4.1, 4.1]) {
      for (const z of [-3.5, 3.5]) column(group, wood, stone, x + sx, z, bottom, top, 0.23);
    }
    roof(group, wood, thatch, x, 0, top, 12.4, 11.1, 6.0);
  }
}

export function buildGurukul() {
  const group = new THREE.Group();
  group.name = 'gurukul';
  group.position.set(GURUKUL.x, -3.58, GURUKUL.z);
  // The entry faces inward toward the hill and the city centre.
  group.rotation.y = Math.PI / 2;
  group.userData.anchor = { x: GURUKUL.x, z: GURUKUL.z, radius: GURUKUL.radius };

  const mats = {
    stone: new THREE.MeshStandardMaterial({ color: 0x9d8a68, roughness: 0.96, flatShading: true }),
    wall: new THREE.MeshStandardMaterial({ color: 0xb9905f, roughness: 0.95, flatShading: true }),
    wood: new THREE.MeshStandardMaterial({ color: 0x654426, roughness: 0.9, flatShading: true }),
    dark: new THREE.MeshStandardMaterial({ color: 0x30251b, roughness: 1 }),
    thatch: new THREE.MeshStandardMaterial({
      color: 0x9a7137,
      roughness: 1,
      flatShading: true,
      side: THREE.DoubleSide,
    }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x8d8a80, roughness: 0.94, flatShading: true }),
    paver: new THREE.MeshStandardMaterial({ color: 0xaaa18c, roughness: 0.9, flatShading: true }),
    gravel: new THREE.MeshStandardMaterial({ color: 0x847454, roughness: 1, flatShading: true }),
    earth: new THREE.MeshStandardMaterial({ color: 0x78634a, roughness: 1, flatShading: true }),
    dryGrass: new THREE.MeshStandardMaterial({ color: 0x99905f, roughness: 1, flatShading: true }),
    grass: new THREE.MeshStandardMaterial({ color: 0x6c913f, roughness: 1, flatShading: true }),
    grassDark: new THREE.MeshStandardMaterial({ color: 0x4e7435, roughness: 1, flatShading: true }),
  };

  // Raised stone sabha platform and a broad stepped approach.
  box(group, mats.stone, 48, 1.15, 39, 0, 0.1, 0);
  box(group, mats.wood, 49, 0.22, 39.8, 0, 0.78, 0);
  box(group, mats.stone, 32, 0.32, 3.2, 0, 0.0, 20.3);
  for (let i = 0; i < 5; i++) {
    const h = 0.22;
    box(group, mats.stone, 32, h, 1.2, 0, 0.68 - (i + 0.5) * h, 21.6 + i * 1.12);
  }

  addMainHall(group, mats);
  addSidePavilions(group, mats);
  addUpperPavilion(group, mats);
  addCourtyardAndLane(group, mats);
  addNaturalGround(group, mats);

  // Small oil-lamp niches along the stair cheek walls.
  for (const x of [-17.2, 17.2]) {
    box(group, mats.stone, 1.1, 1.0, 1.0, x, 0.4, 19.5);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 6),
      new THREE.MeshStandardMaterial({
        color: 0xffc46b,
        emissive: 0xe88424,
        emissiveIntensity: 0.65,
        roughness: 0.7,
      }),
    );
    lamp.position.set(x, 1.05, 19.5);
    group.add(lamp);
  }

  return group;
}
