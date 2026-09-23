import * as THREE from 'three';
import { groundHeightAt, TERRAIN } from './terrain.js';

export function buildPath() {
  const group = new THREE.Group();
  group.name = 'ridge-path';

  const samples = 220;
  const halfWidth = 1.6;
  const positions = [];
  const uvs = [];
  const indices = [];

  const points = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const z = (t - 0.5) * TERRAIN.ridgeLength * 0.9;
    const bend = Math.sin(z * 0.008) * 18 + Math.sin(z * 0.0035 + 1.7) * 10;
    const x = bend + Math.sin(z * 0.05) * 2.2;
    points.push(new THREE.Vector3(x, 0, z));
  }

  for (let i = 0; i <= samples; i++) {
    const p = points[i];
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(samples, i + 1)];
    const dir = new THREE.Vector3().subVectors(next, prev).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

    for (const s of [-1, 1]) {
      const x = p.x + side.x * halfWidth * s;
      const z = p.z + side.z * halfWidth * s;
      const y = groundHeightAt(x, z) + 0.06;
      positions.push(x, y, z);
      uvs.push(s < 0 ? 0 : 1, i / samples * 24);
    }
  }

  for (let i = 0; i < samples; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, b, c, b, d, c);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x8a7a5e,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  group.add(mesh);

  return group;
}
