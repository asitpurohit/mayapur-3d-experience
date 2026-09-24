import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

const STEP_UP = 1.05;
const MAX_DROP = 5.0;

const _ray = new THREE.Raycaster();
const _down = new THREE.Vector3(0, -1, 0);
const _origin = new THREE.Vector3();

export function prepareWalkableMeshes(root) {
  const meshes = [];
  if (!root) return meshes;
  root.updateWorldMatrix(true, true);
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry) return;
    if (!obj.geometry.boundsTree) {
      obj.geometry.computeBoundsTree({ maxLeafTris: 12 });
    }
    meshes.push(obj);
  });
  return meshes;
}

// Same as above but yields to the event loop every few meshes, so building
// collision for a huge streamed temple never freezes the page on phones.
export async function prepareWalkableMeshesAsync(root, { yieldEvery = 8 } = {}) {
  const out = [];
  if (!root) return out;
  root.updateWorldMatrix(true, true);
  const meshes = [];
  root.traverse((obj) => {
    if (obj.isMesh && obj.geometry) meshes.push(obj);
  });
  for (let i = 0; i < meshes.length; i++) {
    const obj = meshes[i];
    if (!obj.geometry.boundsTree) {
      obj.geometry.computeBoundsTree({ maxLeafTris: 12 });
    }
    out.push(obj);
    if (i % yieldEvery === yieldEvery - 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  return out;
}

export function sampleWalkFloor(x, z, feetY, meshes) {
  if (!meshes || !meshes.length) return null;

  const originY = feetY + STEP_UP + 0.15;
  _origin.set(x, originY, z);
  _ray.set(_origin, _down);
  _ray.near = 0;
  _ray.far = STEP_UP + MAX_DROP + 0.5;
  _ray.firstHitOnly = true;

  let best = null;
  const hits = _ray.intersectObjects(meshes, false);
  for (const hit of hits) {
    const y = hit.point.y;
    if (y > feetY + STEP_UP) continue;
    if (y < feetY - MAX_DROP) continue;
    if (best === null || y > best) best = y;
  }
  return best;
}
