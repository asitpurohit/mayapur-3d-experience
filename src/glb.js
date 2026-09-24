import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { ENTRANCE } from './entrance.js';

const BASE = '/models';


function groundObject(root) {
  const box = new THREE.Box3().setFromObject(root);
  if (!isFinite(box.min.y)) return 0;
  const lift = -box.min.y;
  root.position.y += lift;
  return lift;
}

function centerOnXZ(root) {
  const box = new THREE.Box3().setFromObject(root);
  if (!isFinite(box.min.x)) return;
  const cx = (box.min.x + box.max.x) / 2;
  const cz = (box.min.z + box.max.z) / 2;
  root.position.x -= cx;
  root.position.z -= cz;
}

function maxDimOf(box) {
  if (!isFinite(box.min.x)) return 0;
  return Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z);
}

function applyScale(root, slot) {
  if (slot.scale != null) {
    root.scale.setScalar(slot.scale);
    return slot.scale;
  }
  const box = new THREE.Box3().setFromObject(root);
  const height = box.max.y - box.min.y;
  if (slot.targetHeight != null && height > 0.001) {
    const s = slot.targetHeight / height;
    root.scale.setScalar(s);
    return s;
  }
  const dim = maxDimOf(box);
  if (slot.targetSize != null && dim > 0.001) {
    const s = slot.targetSize / dim;
    root.scale.setScalar(s);
    return s;
  }
  if (dim > 60) {
    const s = 42 / dim;
    root.scale.setScalar(s);
    return s;
  }
  return 1;
}

function putKrishnaOnPodium(scene, glbs, groundHeightAt, onLog = () => {}) {
  const k = glbs.find((o) => o.name === 'standin-temple');
  if (!k) return;

  // Remove the old bulky standalone podium from earlier tests
  const oldPodium = scene.getObjectByName('krishna-podium');
  if (oldPodium) scene.remove(oldPodium);

  // Position little Krishna on the sanctum altar podium alongside Lord Narsimhadeva
  // In entrance.js: Altar is centered at doorX (17.74), z=55.0.
  // Tier 2 plinth top: hallY (38.50) + 0.91 = 39.41
  // We place little Krishna on a beautiful tiered lotus pedestal on the altar Tier 2 plinth
  const cx = ENTRANCE.doorX;
  const cz = ENTRANCE.interior.altarZ || 55.0;
  const tier2Y = ENTRANCE.interior.hallY + 0.91; // 39.41

  // Place him on the right side of the altar (from devotee's viewpoint facing the altar),
  // a little ahead of Lord Narsimhadeva so he stands clear at the front of the altar.
  const kx = cx + 1.85;
  const kz = cz + 1.45;
  const pedH = 0.22;

  let pedestal = scene.getObjectByName('krishna-altar-pedestal');
  if (!pedestal) {
    pedestal = new THREE.Group();
    pedestal.name = 'krishna-altar-pedestal';
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.85, pedH, 24),
      new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.35, metalness: 0.65 })
    );
    base.position.y = pedH / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    pedestal.add(base);

    const lotus = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.74, 0.08, 24),
      new THREE.MeshStandardMaterial({ color: 0xf3d69b, roughness: 0.45, metalness: 0.2 })
    );
    lotus.position.y = pedH + 0.04;
    lotus.castShadow = true;
    lotus.receiveShadow = true;
    pedestal.add(lotus);

    scene.add(pedestal);
  }
  pedestal.position.set(kx, tier2Y, kz);

  k.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(k);
  if (!isFinite(box.min.x)) return;

  k.position.x += kx - (box.min.x + box.max.x) / 2;
  k.position.z += kz - (box.min.z + box.max.z) / 2;
  k.position.y += (tier2Y + pedH + 0.08) - box.min.y;

  onLog(`little krishna placed on sanctum altar at (${kx.toFixed(1)}, ${kz.toFixed(1)}, y=${(tier2Y + pedH).toFixed(2)})`);
}

function seatNarshimaOnTemple(scene, glbs, groundHeightAt, onLog = () => {}) {
  const nar = glbs.find((o) => o.name === 'narshima');
  if (!nar) return;

  // Clean up any twin left clone and outdoor side platforms/lights from previous sessions
  const oldLeft = scene.getObjectByName('narshima-left');
  if (oldLeft) {
    scene.remove(oldLeft);
    const idx = glbs.indexOf(oldLeft);
    if (idx >= 0) glbs.splice(idx, 1);
  }
  for (const name of ['narshima-platform-right', 'narshima-platform-left', 'narshima-platform']) {
    const p = scene.getObjectByName(name);
    if (p) scene.remove(p);
  }
  for (const name of [
    'narshima-light-right', 'narshima-light-left',
    'narshima-light-right-target', 'narshima-light-left-target',
    'narshima-light-right-fill', 'narshima-light-left-fill',
    'narshima-light', 'narshima-light-target', 'narshima-fill'
  ]) {
    const l = scene.getObjectByName(name);
    if (l) scene.remove(l);
  }

  // Exact altar podium dimensions and positioning
  // In entrance.js: Altar is at doorX (17.74), z=55.0.
  // Tier 3 table surface is at hallY (38.50) + 1.53 = 40.03
  const targetH = 4.3; // majestic height proportioned to the 5.0m throne arch
  nar.rotation.set(0, -Math.PI / 2, 0); // rotated 90 degrees left to face front (+Z) directly toward devotees

  const nbox0 = new THREE.Box3().setFromObject(nar);
  const h0 = isFinite(nbox0.min.y) ? nbox0.max.y - nbox0.min.y : 0;
  if (h0 > 0.001) nar.scale.setScalar(nar.scale.x * (targetH / h0));

  nar.updateWorldMatrix(true, true);
  const nbox = new THREE.Box3().setFromObject(nar);

  const cx = ENTRANCE.doorX;
  const cz = ENTRANCE.interior.altarZ || 55.0;
  const altarTableTopY = ENTRANCE.interior.hallY + 1.53; // 40.03

  nar.position.x += cx - (nbox.min.x + nbox.max.x) / 2;
  nar.position.z += cz - (nbox.min.z + nbox.max.z) / 2;
  nar.position.y += altarTableTopY - nbox.min.y;

  // Gentle, soft warm illumination directly focusing on Lord Narsimhadeva on the altar (no harsh glare)
  const lightName = 'sanctum-narshima-spot';
  let key = scene.getObjectByName(lightName);
  if (!key) {
    key = new THREE.SpotLight(0xfff3da, 55, 26, Math.PI / 4, 0.85, 1.4);
    key.name = lightName;
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0003;
    const target = new THREE.Object3D();
    target.name = `${lightName}-target`;
    scene.add(target);
    key.target = target;
    scene.add(key);

    const fill = new THREE.PointLight(0xffe2b4, 8, 14, 1.8);
    fill.name = `${lightName}-fill`;
    scene.add(fill);
  }
  key.intensity = 55;
  key.penumbra = 0.85;
  key.position.set(cx, altarTableTopY + targetH + 4.5, cz + 5.0);
  const tgt = scene.getObjectByName(`${lightName}-target`);
  if (tgt) tgt.position.set(cx, altarTableTopY + targetH * 0.55, cz);
  const fill = scene.getObjectByName(`${lightName}-fill`);
  if (fill) {
    fill.intensity = 8;
    fill.position.set(cx, altarTableTopY + targetH * 0.65, cz + 2.5);
  }

  onLog(`narshima seated on interior sanctum podium at (${cx.toFixed(1)}, ${cz.toFixed(1)}, y=${altarTableTopY.toFixed(2)})`);
}

// The scanned guru-and-devotees row sits at the very front of the tier 3 altar
// table, directly in front of Lord Narsimhadeva. It is scaled to fit the clear
// strip on the podium so nothing overhangs the table edge.
function placeGuruOnAltar(scene, glbs, onLog = () => {}) {
  const guru = glbs.find((o) => o.name === 'guru');
  if (!guru) return;

  guru.updateWorldMatrix(true, true);
  let box = new THREE.Box3().setFromObject(guru);
  if (!isFinite(box.min.x)) return;

  const targetWidth = 1.7;
  const width = box.max.x - box.min.x;
  if (width > 0.001) guru.scale.multiplyScalar(targetWidth / width);

  guru.updateWorldMatrix(true, true);
  box = new THREE.Box3().setFromObject(guru);

  const cx = ENTRANCE.doorX;
  const cz = ENTRANCE.interior.altarZ || 55.0;
  const tableTopY = ENTRANCE.interior.hallY + 1.53;

  // Front strip of the table, clear of Lord Narsimhadeva's feet.
  const gz = cz + 1.63;
  guru.position.x += cx - (box.min.x + box.max.x) / 2;
  guru.position.z += gz - (box.min.z + box.max.z) / 2;
  guru.position.y += tableTopY - box.min.y;

  onLog(`guru seated in front of narshima on the altar at (${cx.toFixed(1)}, ${gz.toFixed(1)}, y=${tableTopY.toFixed(2)})`);
}

const CACHE_NAME = 'mayapur-3d-cache-v1';

async function fetchBlobWithCache(url, onProgress) {
  // 1. Check persistent Cache Storage
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(CACHE_NAME);
      const matched = await cache.match(url, { ignoreSearch: true });
      if (matched) {
        const blob = await matched.blob();
        onProgress?.({ loaded: blob.size, total: blob.size, cached: true });
        return { blob, cached: true };
      }
    } catch (e) {
      console.warn('[cache] Read error:', e);
    }
  }

  // 2. Fetch from network
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }

  const contentLength = Number(res.headers.get('content-length')) || 0;
  let blob = null;

  if (!res.body || !contentLength) {
    blob = await res.blob();
    onProgress?.({ loaded: blob.size, total: blob.size, cached: false });
  } else {
    const reader = res.body.getReader();
    const chunks = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      onProgress?.({ loaded, total: contentLength, cached: false });
    }
    blob = new Blob(chunks, { type: 'model/gltf-binary' });
  }

  // 3. Store completed file into Cache Storage for instant repeat visits
  if (typeof caches !== 'undefined' && blob) {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(
        url,
        new Response(blob, {
          headers: {
            'Content-Type': 'model/gltf-binary',
            'Content-Length': String(blob.size),
          },
        })
      );
    } catch (e) {
      console.warn('[cache] Put error:', e);
    }
  }

  return { blob, cached: false };
}

/**
 * Load GLB drop-ins from /public/models with persistent device caching and concurrent downloads.
 * Manifest can be a JSON array of { file, x, z, rotY, scale, targetSize } or bare filenames.
 */
export async function loadGlbModels({ scene, groundHeightAt, onLog = () => {}, onProgress = () => {}, names = null }) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const added = [];

  let manifest = [];
  try {
    const res = await fetch(`${BASE}/manifest.json`);
    if (res.ok) manifest = await res.json();
  } catch {
    // no manifest — try well-known slots
  }

  const slots = [];
  if (Array.isArray(manifest) && manifest.length) {
    for (const entry of manifest) {
      if (typeof entry === 'string') slots.push({ file: entry });
      else if (entry && entry.file) slots.push(entry);
    }
  } else {
    for (const name of ['temple', 'shrine', 'rock', 'boulder', 'tree', 'house']) {
      slots.push({ file: `${name}.glb` });
    }
  }

  if (names) {
    const wanted = new Set(names);
    const keep = (slot) => wanted.has(slot.name || String(slot.file).replace(/\.glb$/i, ''));
    slots.splice(0, slots.length, ...slots.filter(keep));
  }

  const slotProgress = new Map();
  let allFromCache = true;

  function reportProgress(activeName) {
    let totalLoaded = 0;
    let totalExpected = 0;
    for (const p of slotProgress.values()) {
      totalLoaded += p.loaded;
      totalExpected += p.total;
    }
    const percent = totalExpected > 0 ? Math.min(100, Math.round((totalLoaded / totalExpected) * 100)) : 0;
    onProgress({
      item: activeName,
      percent,
      fromCache: allFromCache,
      loadedBytes: totalLoaded,
      totalBytes: totalExpected,
    });
  }

  // Pre-fetch all models concurrently to saturate bandwidth
  const fetchedSlots = await Promise.all(
    slots.map(async (slot) => {
      const file = String(slot.file).replace(/^\/+/, '');
      const url = file.startsWith('http') ? file : `${BASE}/${file}`;
      const name = slot.name || file.replace(/\.glb$/i, '');
      try {
        const { blob, cached } = await fetchBlobWithCache(url, ({ loaded, total, cached: isCached }) => {
          slotProgress.set(file, { loaded, total: total || loaded });
          if (!isCached) allFromCache = false;
          reportProgress(name);
        });
        if (!cached) allFromCache = false;
        return { slot, file, url, name, blob, cached };
      } catch (err) {
        console.warn(`[glb] Failed to download ${url}:`, err);
        return { slot, file, url, name, blob: null, err };
      }
    })
  );

  // Parse each loaded model sequentially to maintain stable memory on mobile
  for (const item of fetchedSlots) {
    if (!item.blob) {
      onLog(`failed ${item.file}`);
      continue;
    }
    const { slot, file, name, blob } = item;
    const blobUrl = URL.createObjectURL(blob);
    try {
      const gltf = await loader.loadAsync(blobUrl);
      URL.revokeObjectURL(blobUrl);

      const root = gltf.scene;
      root.name = name;

      const isAvatar = slot.role === 'avatar';
      applyScale(root, slot);
      if (slot.rotY != null) root.rotation.y = slot.rotY;

      centerOnXZ(root);
      root.position.x += slot.x ?? 0;
      root.position.z += slot.z ?? 0;

      if (!isAvatar) {
        const groundY = groundHeightAt(root.position.x, root.position.z);
        root.position.y = groundY + (slot.y ?? 0);
        if (slot.autoGround !== false) {
          groundObject(root);
          const box = new THREE.Box3().setFromObject(root);
          if (isFinite(box.min.y)) root.position.y += groundY - box.min.y;
        }
        // Preserve offset between GLB origin and grounded feet
        root.userData.footOffset = root.position.y - groundY;
      } else {
        root.position.y = 0;
        const box = new THREE.Box3().setFromObject(root);
        root.userData.footOffset = isFinite(box.min.y) ? box.min.y - root.position.y : 0;
        root.position.y = 0;
      }

      root.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
          if (root.name === 'mayapur-temple' && obj.material) {
            obj.material.side = THREE.DoubleSide;
          }
        }
      });

      scene.add(root);
      added.push(root);
      const box = new THREE.Box3().setFromObject(root);
      onLog(`loaded ${root.name} dim=${maxDimOf(box).toFixed(1)}`);
    } catch (err) {
      URL.revokeObjectURL(blobUrl);
      console.warn(`[glb] Parse error on ${file}:`, err);
      onLog(`failed ${file}`);
    }
  }

  putKrishnaOnPodium(scene, added, groundHeightAt, onLog);
  seatNarshimaOnTemple(scene, added, groundHeightAt, onLog);
  placeGuruOnAltar(scene, added, onLog);

  return added;
}

export function glbHelpText() {
  return 'Drop .glb into public/models/ (+ optional manifest.json)';
}
