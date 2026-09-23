import * as THREE from 'three';
import { makeRng } from './noise.js';
import { groundHeightAt, slopeAt, plainFactor, TERRAIN } from './terrain.js';
import { onApproach } from './entrance.js';
import { makeInstancedFromProto } from './instancing.js';

function hutMaterials() {
  return {
    plinth: new THREE.MeshStandardMaterial({ color: 0x8c7956, roughness: 0.96, flatShading: true }),
    wall: new THREE.MeshStandardMaterial({ color: 0xc19b6d, roughness: 0.94, flatShading: true }),
    roof: new THREE.MeshStandardMaterial({ color: 0x9d7c45, roughness: 0.95, flatShading: true }),
    trim: new THREE.MeshStandardMaterial({ color: 0x7c6136, roughness: 0.95, flatShading: true }),
    dark: new THREE.MeshStandardMaterial({ color: 0x5d4527, roughness: 0.95, flatShading: true }),
  };
}

// A round mud hut with a conical thatch roof: low plinth, tapering wall,
// overhanging straw cone and a dark doorway.
function buildHutPrototype(rng, { wide }) {
  const group = new THREE.Group();
  const mats = hutMaterials();

  const plinthR = wide ? 3.1 : 2.7;
  const wallR = wide ? 2.7 : 2.35;
  const wallH = wide ? 2.1 : 2.5;
  const roofR = wallR * 1.42;
  const roofH = wide ? 1.75 : 2.15;

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(plinthR, plinthR, 0.3, 9), mats.plinth);
  plinth.position.y = 0.15;
  group.add(plinth);

  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(wallR * 0.94, wallR, wallH, 9, 1),
    mats.wall,
  );
  wall.position.y = 0.3 + wallH / 2;
  group.add(wall);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(roofR, roofH, 9, 1), mats.roof);
  roof.position.y = 0.3 + wallH + roofH / 2 - 0.15;
  group.add(roof);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.5, 6), mats.trim);
  cap.position.y = 0.3 + wallH + roofH - 0.05;
  group.add(cap);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.55, 0.16), mats.dark);
  door.position.set(0, 0.3 + 0.78, wallR * 0.97);
  group.add(door);

  const window = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.14), mats.dark);
  const angle = 0.9 + rng() * 0.6;
  window.position.set(Math.sin(angle) * wallR * 0.95, 0.3 + wallH * 0.62, Math.cos(angle) * wallR * 0.95);
  window.rotation.y = angle;
  group.add(window);

  if (rng() > 0.55) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.9, 5), mats.trim);
    post.position.set(1.5, 0.3 + 0.95, 2.2);
    group.add(post);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.16, 0.5), mats.roof);
    beam.position.set(1.1, 0.3 + 1.75, 2.0);
    beam.rotation.y = 0.2;
    group.add(beam);
  }

  return group;
}

const PLACEMENT = {
  clusterCount: 9,
  minClusterGap: 58,
  hutsPerCluster: [3, 8],
  minHutGap: 17,
  clusterRadius: [7, 27],
  plainThreshold: 0.6,
  maxSlope: 0.32,
};

export function buildVillage() {
  const group = new THREE.Group();
  group.name = 'village';
  const rng = makeRng(7331);
  const half = TERRAIN.size * 0.44;

  const ok = (x, z) => {
    if (Math.abs(x) > half || Math.abs(z) > half) return false;
    if (plainFactor(x, z) < PLACEMENT.plainThreshold) return false;
    if (onApproach(x, z, 6)) return false;
    if (groundHeightAt(x, z) < 0.4) return false;
    return slopeAt(x, z, 1.4) <= PLACEMENT.maxSlope;
  };

  const clusters = [];
  for (let attempts = 0; attempts < 6000 && clusters.length < PLACEMENT.clusterCount; attempts++) {
    const x = (rng() * 2 - 1) * half;
    const z = (rng() * 2 - 1) * half;
    if (!ok(x, z)) continue;
    if (clusters.some((c) => Math.hypot(c.x - x, c.z - z) < PLACEMENT.minClusterGap)) continue;
    clusters.push({ x, z });
  }

  const points = [];
  for (const cluster of clusters) {
    const count = PLACEMENT.hutsPerCluster[0] +
      Math.floor(rng() * (PLACEMENT.hutsPerCluster[1] - PLACEMENT.hutsPerCluster[0] + 1));
    for (let i = 0; i < count; i++) {
      for (let tries = 0; tries < 40; tries++) {
        const angle = rng() * Math.PI * 2;
        const radius = PLACEMENT.clusterRadius[0] +
          rng() * (PLACEMENT.clusterRadius[1] - PLACEMENT.clusterRadius[0]);
        const x = cluster.x + Math.cos(angle) * radius;
        const z = cluster.z + Math.sin(angle) * radius;
        if (!ok(x, z)) continue;
        if (points.some((p) => Math.hypot(p.x - x, p.z - z) < PLACEMENT.minHutGap)) continue;
        points.push({
          x,
          y: groundHeightAt(x, z),
          z,
          rot: rng() * Math.PI * 2,
          scale: 0.85 + rng() * 0.45,
          shade: rng(),
        });
        break;
      }
    }
  }

  const round = points.filter((_, i) => i % 2 === 0);
  const wide = points.filter((_, i) => i % 2 === 1);

  const huts = new THREE.Group();
  huts.name = 'huts';
  if (round.length) {
    huts.add(makeInstancedFromProto(buildHutPrototype(makeRng(4242), { wide: false }), round, {
      colorJitter: 0.16,
    }));
  }
  if (wide.length) {
    huts.add(makeInstancedFromProto(buildHutPrototype(makeRng(9182), { wide: true }), wide, {
      colorJitter: 0.16,
    }));
  }
  group.add(huts);

  group.userData.counts = { huts: points.length, hamlets: clusters.length };
  group.userData.positions = points.map((p) => ({ x: p.x, z: p.z }));
  return group;
}
