import * as THREE from 'three';
import { makeRng } from './noise.js';
import { groundHeightAt, slopeAt, plainFactor, TERRAIN } from './terrain.js';
import { onApproach } from './entrance.js';

const SOIL_ROWS = 12;

function soilMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x6d543a,
    roughness: 0.98,
    metalness: 0,
    flatShading: true,
  });
}

function cropMaterial(color, accent) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: accent,
    emissiveIntensity: 1,
    roughness: 0.95,
    metalness: 0,
    flatShading: true,
  });
}

// A tilled plot that follows the ground it sits on.
function makeFieldMesh(cx, cz, w, d, yaw, material) {
  const geo = new THREE.PlaneGeometry(w, d, 10, 10);
  geo.rotateX(-Math.PI / 2);
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const lz = pos.getZ(i);
    const wx = cx + lx * cos + lz * sin;
    const wz = cz - lx * sin + lz * cos;
    pos.setY(i, groundHeightAt(wx, wz) + 0.05);
  }
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(cx, 0, cz);
  mesh.rotation.y = yaw;
  mesh.receiveShadow = true;
  return mesh;
}

export function buildFarms({ avoid = [] } = {}) {
  const group = new THREE.Group();
  group.name = 'farms';
  const rng = makeRng(4821);
  const half = TERRAIN.size * 0.42;

  // Needs to be flat over the whole plot, not just at its centre.
  const flatEnough = (x, z, w, d) => {
    let min = Infinity;
    let max = -Infinity;
    for (let sx = -1; sx <= 1; sx++) {
      for (let sz = -1; sz <= 1; sz++) {
        const h = groundHeightAt(x + (sx * w) / 2, z + (sz * d) / 2);
        min = Math.min(min, h);
        max = Math.max(max, h);
      }
    }
    return max - min < 1.1;
  };

  const clear = (x, z, w, d) => {
    if (Math.abs(x) > half || Math.abs(z) > half) return false;
    if (plainFactor(x, z) < 0.32) return false;
    if (onApproach(x, z, 8)) return false;
    if (slopeAt(x, z, 2.5) > 0.16) return false;
    if (!flatEnough(x, z, w, d)) return false;
    if (avoid.some((p) => Math.hypot(p.x - x, p.z - z) < 24)) return false;
    return true;
  };

  const fields = [];
  for (let attempts = 0; attempts < 12000 && fields.length < 9; attempts++) {
    const w = 34 + rng() * 46;
    const d = 26 + rng() * 34;
    const x = (rng() * 2 - 1) * half;
    const z = (rng() * 2 - 1) * half;
    if (!clear(x, z, w, d)) continue;
    if (fields.some((f) => Math.hypot(f.x - x, f.z - z) < 62)) continue;
    fields.push({
      x,
      z,
      w,
      d,
      yaw: (rng() - 0.5) * 0.5,
      golden: rng() > 0.5,
    });
  }

  const soil = soilMaterial();
  const paddyMat = cropMaterial(0x6f9243, 0x0c1a08);
  const wheatMat = cropMaterial(0xad9f56, 0x1a1607);

  const paddyPoints = [];
  const wheatPoints = [];

  for (const field of fields) {
    group.add(makeFieldMesh(field.x, field.z, field.w, field.d, field.yaw, soil));

    const cos = Math.cos(field.yaw);
    const sin = Math.sin(field.yaw);
    const rows = Math.max(5, Math.round(field.d / 2.1));
    const perRow = Math.max(5, Math.round(field.w / 1.15));
    const target = field.golden ? wheatPoints : paddyPoints;

    for (let r = 0; r < rows; r++) {
      const lz = -field.d / 2 + ((r + 0.5) / rows) * field.d;
      for (let c = 0; c < perRow; c++) {
        const lx = -field.w / 2 + ((c + 0.5) / perRow) * field.w;
        const x = field.x + lx * cos + lz * sin;
        const z = field.z - lx * sin + lz * cos;
        target.push({
          x,
          y: groundHeightAt(x, z) + 0.12,
          z,
          rot: field.yaw,
          scale: 0.8 + rng() * 0.55,
          shade: rng(),
        });
      }
    }
  }

  const cropGeo = new THREE.ConeGeometry(0.34, 1.05, 4, 1);
  const addCrops = (geometry, material, points) => {
    if (!points.length) return;
    const im = new THREE.InstancedMesh(geometry, material, points.length);
    im.castShadow = false;
    im.receiveShadow = true;
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const h = 0.7 + p.shade * 0.6;
      pos.set(p.x, p.y + h * 0.45, p.z);
      quat.setFromEuler(new THREE.Euler(0, p.rot, 0));
      scl.set(p.scale, h * p.scale, p.scale);
      matrix.compose(pos, quat, scl);
      im.setMatrixAt(i, matrix);
    }
    im.instanceMatrix.needsUpdate = true;
    group.add(im);
  };

  addCrops(cropGeo, paddyMat, paddyPoints);
  addCrops(cropGeo, wheatMat, wheatPoints);

  group.userData.counts = {
    fields: fields.length,
    crops: paddyPoints.length + wheatPoints.length,
    positions: fields.map((f) => ({ x: f.x, z: f.z })),
  };
  void SOIL_ROWS;
  return group;
}
