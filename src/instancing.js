import * as THREE from 'three';

export const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

export function collectMeshes(obj, out = []) {
  if (obj.isMesh) out.push(obj);
  for (const c of obj.children) collectMeshes(c, out);
  return out;
}

/**
 * Turn a prototype group into instanced meshes, one per geometry/material pair.
 * Points are { x, y, z, rot, scale, shade, tiltX, tiltZ }.
 */
export function makeInstancedFromProto(
  proto,
  points,
  { colorJitter = 0.15, castShadow = true, tintFn = null } = {},
) {
  const meshes = collectMeshes(proto);
  const group = new THREE.Group();
  const color = new THREE.Color();
  const base = new THREE.Matrix4();
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();

  proto.updateMatrixWorld(true);

  const batches = new Map();
  for (const src of meshes) {
    const materialKey = Array.isArray(src.material)
      ? src.material.map((m) => m.uuid).join(',')
      : src.material.uuid;
    const key = `${src.geometry.uuid}:${materialKey}`;
    if (!batches.has(key)) {
      batches.set(key, { geometry: src.geometry, material: src.material, transforms: [] });
    }
    batches.get(key).transforms.push(src.matrixWorld.clone());
  }

  for (const batch of batches.values()) {
    const partCount = batch.transforms.length;
    const im = new THREE.InstancedMesh(batch.geometry, batch.material, points.length * partCount);
    im.castShadow = castShadow;
    im.receiveShadow = true;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      pos.set(p.x, p.y, p.z);
      quat.setFromEuler(new THREE.Euler(p.tiltX || 0, p.rot, p.tiltZ || 0));
      scl.setScalar(p.scale);
      base.compose(pos, quat, scl);
      const j = 1 - colorJitter / 2 + p.shade * colorJitter;
      color.setRGB(j, j * (0.95 + p.shade * 0.1), j * 0.9);
      if (tintFn) {
        const tint = tintFn(p);
        color.r *= tint.r;
        color.g *= tint.g;
        color.b *= tint.b;
      }
      for (let part = 0; part < partCount; part++) {
        matrix.multiplyMatrices(base, batch.transforms[part]);
        const instance = i * partCount + part;
        im.setMatrixAt(instance, matrix);
        im.setColorAt(instance, color);
      }
    }

    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    group.add(im);
  }
  return group;
}
