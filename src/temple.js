import * as THREE from 'three';
import { groundHeightAt, findRidgeTop, slopeAt } from './terrain.js';

function stoneMaterial(color = 0xc4b39a) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.03 });
}

function plasterMaterial(color = 0xe8dcc4) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02 });
}

function accentMaterial(color = 0xb85c2e) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05 });
}

function domeMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.45, metalness: 0.7 });
}

function addBox(parent, { size, pos, mat, cast = true, receive = true }) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), mat);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, { rTop, rBot, h, seg, pos, mat }) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function buildTemple() {
  const spot = findRidgeTop();
  const groundY = groundHeightAt(spot.x, spot.z);

  const group = new THREE.Group();
  group.name = 'shrine';
  group.position.set(spot.x, groundY, spot.z);
  group.rotation.y = Math.atan2(spot.x, spot.z) + Math.PI;

  const stone = stoneMaterial();
  const stoneDark = stoneMaterial(0x9e8f78);
  const plaster = plasterMaterial();
  const accent = accentMaterial();
  const gold = domeMaterial();

  const baseHalf = 3.6;
  addBox(group, {
    size: [baseHalf * 2, 2.4, baseHalf * 2],
    pos: [0, -0.5, 0],
    mat: stoneDark,
  });
  addBox(group, {
    size: [baseHalf * 2 - 0.5, 0.35, baseHalf * 2 - 0.5],
    pos: [0, 0.87, 0],
    mat: stone,
  });

  const floorY = 1.05;
  const hallW = 5.2;
  const hallD = 5.2;
  const hallH = 3.2;

  addBox(group, {
    size: [hallW, hallH, hallD],
    pos: [0, floorY + hallH / 2, 0],
    mat: plaster,
  });

  const doorW = 1.5;
  const doorH = 2.3;
  addBox(group, {
    size: [doorW, doorH, 0.35],
    pos: [0, floorY + doorH / 2, hallD / 2 + 0.05],
    mat: new THREE.MeshStandardMaterial({ color: 0x2a2119, roughness: 0.9 }),
    cast: false,
  });
  addBox(group, {
    size: [doorW + 0.7, 0.3, 0.5],
    pos: [0, floorY + doorH + 0.15, hallD / 2 + 0.1],
    mat: accent,
  });

  for (const sx of [-1, 1]) {
    addBox(group, {
      size: [0.4, doorH + 0.5, 0.4],
      pos: [sx * (doorW / 2 + 0.35), floorY + (doorH + 0.5) / 2, hallD / 2 + 0.1],
      mat: stone,
    });
  }

  const corniceY = floorY + hallH;
  addBox(group, {
    size: [hallW + 0.6, 0.35, hallD + 0.6],
    pos: [0, corniceY + 0.17, 0],
    mat: accent,
  });

  const towerBaseY = corniceY + 0.35;
  const tiers = 6;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const w = 3.6 * (1 - t * 0.72);
    const h = 0.72;
    addBox(group, {
      size: [w, h, w],
      pos: [0, towerBaseY + i * h + h / 2, 0],
      mat: i % 2 === 0 ? plaster : accent,
    });
  }

  const topY = towerBaseY + tiers * 0.72;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.85, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), gold);
  dome.position.set(0, topY, 0);
  dome.castShadow = true;
  group.add(dome);

  addCylinder(group, { rTop: 0.05, rBot: 0.08, h: 1.1, seg: 8, pos: [0, topY + 1.2, 0], mat: gold });
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xe24b1a, roughness: 0.8, side: THREE.DoubleSide }),
  );
  flag.position.set(0.45, topY + 1.55, 0);
  flag.castShadow = true;
  group.add(flag);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(group, {
        size: [0.5, 1.1, 0.5],
        pos: [sx * (hallW / 2 - 0.35), floorY + hallH + 0.9, sz * (hallD / 2 - 0.35)],
        mat: stone,
      });
    }
  }

  const plateauR = 9;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = plateauR + (i % 3) * 0.5;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const localGround = groundHeightAt(spot.x + x, spot.z + z) - groundY;
    const h = 0.55;
    addBox(group, {
      size: [1.3, h, 1.3],
      pos: [x, localGround + h * 0.35, z],
      mat: stoneDark,
    });
  }

  return { group, spot, groundY };
}
