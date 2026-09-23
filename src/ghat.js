import * as THREE from 'three';

// A Har Ki Pauri style ghat: raised stone terrace, wide bathing steps down to
// the water, flanking domed pavilions and lamp towers.
export function buildGhat({ x, y, z, yaw = 0 }) {
  const group = new THREE.Group();
  group.name = 'ghat';
  group.position.set(x, y, z);
  group.rotation.y = yaw;

  const stone = new THREE.MeshStandardMaterial({ color: 0xcbb894, roughness: 0.9, metalness: 0.03 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x9d8a6a, roughness: 0.9, metalness: 0.04 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xb0592f, roughness: 0.78, metalness: 0.06 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.45, metalness: 0.65 });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xffd9a0,
    emissive: 0xff9a3c,
    emissiveIntensity: 1.4,
    roughness: 0.6,
  });

  const box = (w, h, d, px, py, pz, mat) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(px, py, pz);
    group.add(mesh);
    return mesh;
  };

  const platformW = 104;
  const platformD = 24;

  // Raised terrace. Local -Z faces the water.
  box(platformW, 2.4, platformD, 0, 0.4, 0, stone);
  box(platformW + 1.2, 0.22, platformD + 1.2, 0, 1.6, 0, trim);

  // Wide bathing steps descending into the river.
  const stepCount = 7;
  for (let i = 0; i < stepCount; i++) {
    const top = 1.45 - i * 0.24;
    const z = -platformD / 2 - (i + 0.5) * 1.5;
    box(platformW, 0.5, 1.5, 0, top - 0.25, z, i % 2 === 0 ? stone : trim);
  }

  // Side walls framing the steps.
  for (const sx of [-1, 1]) {
    box(3.2, 3.2, platformD + stepCount * 1.5, sx * (platformW / 2 - 1.6), 0.6, -9, trim);
  }

  // Flanking domed pavilions.
  for (const px of [-40, 40]) {
    for (const dx of [-3.4, 3.4]) {
      for (const dz of [-3.4, 3.4]) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 9, 8), stone);
        pillar.position.set(px + dx, 1.7 + 4.5, 2 + dz);
        group.add(pillar);
      }
    }
    box(11, 0.8, 11, px, 1.7 + 9.2, 2, trim);
    box(12, 0.5, 12, px, 1.7 + 9.7, 2, accent);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(4.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), stone);
    dome.position.set(px, 1.7 + 9.95, 2);
    group.add(dome);
    const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 1.8, 6), gold);
    finial.position.set(px, 1.7 + 14.6, 2);
    group.add(finial);
  }

  // Lamp towers along the terrace edge.
  for (const px of [-22, 0, 22]) {
    box(1.5, 6.2, 1.5, px, 1.7 + 3.1, -9.5, stone);
    box(2.2, 0.5, 2.2, px, 1.7 + 6.4, -9.5, accent);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.72, 10, 8), lampMat);
    lamp.position.set(px, 1.7 + 6.9, -9.5);
    group.add(lamp);
  }

  // Low parapet along the back of the terrace.
  box(platformW, 1.0, 0.7, 0, 2.1, platformD / 2 - 0.4, trim);

  return group;
}
