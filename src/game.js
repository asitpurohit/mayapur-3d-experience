import * as THREE from 'three';
import { groundHeightAt, TERRAIN } from './terrain.js';
import { ENTRANCE } from './entrance.js';
import { GURUKUL } from './gurukul.js';
import { playQuestComplete, playYatraComplete, startHelicopterLoop } from './audio.js';

const STORAGE_KEY = 'mayapur-gifts-v1';
const GIFT_TOTAL = 11;
const OPEN_RADIUS = 12;

const RIVER = { z: -355, halfWidth: 125, y: -3.42 };

const QUESTIONS = [
  {
    question: 'Who is the founder-acharya of ISKCON?',
    options: [
      'Srila A. C. Bhaktivedanta Swami Prabhupada',
      'Srila Bhaktivinoda Thakura',
      'Srila Narottama Dasa Thakura',
    ],
    answer: 0,
  },
  {
    question: 'Which sacred river flows beside Mayapur?',
    options: ['Yamuna', 'Ganga', 'Saraswati'],
    answer: 1,
  },
  {
    question: 'Who appeared in Mayapur in the year 1486?',
    options: ['Lord Rama', 'Sri Chaitanya Mahaprabhu', 'Lord Shiva'],
    answer: 1,
  },
  {
    question: 'What is the maha-mantra?',
    options: [
      'Hare Krishna Hare Krishna, Krishna Krishna Hare Hare…',
      'Om Namah Shivaya',
      'Gayatri Mantra',
    ],
    answer: 0,
  },
  {
    question: 'What does "prasadam" mean?',
    options: ['A temple bell', 'Food offered to the Lord and blessed', 'A pilgrim\u2019s walking stick'],
    answer: 1,
  },
  {
    question: 'What is "parikrama"?',
    options: ['Walking around a sacred place', 'A festival of lights', 'A morning bath in the river'],
    answer: 0,
  },
  {
    question: 'Which deity is worshipped on the sanctum altar of the Mayapur temple?',
    options: ['Lord Ganesha', 'Lord Narsimhadeva', 'Lord Hanuman'],
    answer: 1,
  },
  {
    question: 'What is "kirtan"?',
    options: ['Devotional singing of the Lord\u2019s names', 'A kind of rice offering', 'Silent meditation'],
    answer: 0,
  },
  {
    question: 'What does "darshan" mean?',
    options: ['Seeing the deity with devotion', 'A donation to the temple', 'A pilgrimage by boat'],
    answer: 0,
  },
  {
    question: 'What is a "ghat"?',
    options: ['A stone lamp', 'Steps leading down to a river', 'A temple garden'],
    answer: 1,
  },
  {
    question: 'What is the name of Mayapur\u2019s grand temple, the Temple of the Vedic Planetarium?',
    options: ['Chandodaya Mandir', 'Govindaji Mandir', 'Madan Mohan Mandir'],
    answer: 0,
  },
];

const DROP_ZONES = [
  { x: 330, z: -300, label: 'the city by the Ganga' },
  { x: -320, z: -430, label: 'the far riverbank' },
  { x: 300, z: 330, label: 'the northern fields' },
  { x: -330, z: 270, label: 'the western fields' },
  { x: 540, z: 40, label: 'the eastern city' },
  { x: -120, z: 420, label: 'the open plains' },
];

function buildSpots(villagePoints, farmPoints, temple) {
  const village = (index, dx, dz) => {
    const p = villagePoints[index] || { x: 120, z: 0 };
    return { x: p.x + dx, z: p.z + dz };
  };
  const farm = (index, dx, dz) => {
    const p = farmPoints[index] || { x: -130, z: 0 };
    return { x: p.x + dx, z: p.z + dz };
  };

  return [
    { id: 'temple-back', x: (temple.minX + temple.maxX) / 2, z: temple.minZ - 8, lift: 1 },
    { id: 'temple-roof', x: temple.maxX - 4, z: temple.minZ + 10, y: temple.maxY + 2.5 },
    { id: 'gurukul-back', x: GURUKUL.x - 40, z: GURUKUL.z - 18, lift: 1 },
    {
      id: 'ganga-middle',
      x: -120,
      z: RIVER.z,
      y: RIVER.y + 1.0,
      boatOnly: true,
      beacon: true,
    },
    {
      id: 'ganga-boat',
      mount: 'ganga-cruise-ship',
      local: { x: 0, y: 92.2, z: 0 },
      fallback: { x: -120, z: RIVER.z, y: RIVER.y + 1.0 },
    },
    { id: 'ghat-water', x: -402, z: -232, y: RIVER.y + 1.4 },
    { ...village(3, 7, -6), id: 'village-east', lift: 0.9 },
    { ...village(0, 6, 6), id: 'village-south', lift: 0.9 },
    { ...farm(4, 8, 8), id: 'farm-field', lift: 1 },
    { id: 'hillside-grass', x: 2.3 - 28, z: 32 - 22, lift: 0.9 },
  ];
}

function makeGiftPrototype() {
  const group = new THREE.Group();

  const wood = new THREE.MeshStandardMaterial({ color: 0x9c6b33, roughness: 0.65, metalness: 0.08 });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xf0c14b,
    roughness: 0.3,
    metalness: 0.7,
    emissive: 0x5a3d00,
    emissiveIntensity: 0.6,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.7, 0.85), wood);
  base.position.y = 0.35;
  base.castShadow = true;

  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.26, 0.92), gold);
  lid.position.y = 0.83;
  lid.castShadow = true;

  const strap = new THREE.Mesh(new THREE.BoxGeometry(1.19, 0.72, 0.2), gold);
  strap.position.y = 0.36;

  const glint = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.16),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.85 }),
  );
  glint.position.y = 1.4;

  group.add(base, lid, strap, glint);
  group.userData.glint = glint;
  return group;
}

function makeParachute() {
  const chute = new THREE.Group();

  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(2.4, 1.7, 12),
    new THREE.MeshStandardMaterial({ color: 0xfff2d0, roughness: 0.85, side: THREE.DoubleSide }),
  );
  canopy.position.y = 0.85;
  chute.add(canopy);

  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x8a7a5a, transparent: true, opacity: 0.8 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.cos(a) * 2.1, 0.2, Math.sin(a) * 2.1),
      new THREE.Vector3(0, -4.4, 0),
    ]);
    chute.add(new THREE.Line(geometry, lineMaterial));
  }

  chute.position.y = 5;
  return chute;
}

function makeBeacon() {
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.5, 46, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffd97a,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false,
    }),
  );
  beacon.position.y = 23;
  return beacon;
}

// Rising puffs of red smoke that mark where the big gift landed.
function makeSmokeSignal() {
  const group = new THREE.Group();
  group.name = 'gift-smoke-signal';
  const geometry = new THREE.SphereGeometry(1, 8, 6);
  const puffs = [];
  for (let i = 0; i < 10; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xd93025,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
    puffs.push({
      mesh,
      phase: i / 10,
      speed: 0.5 + Math.random() * 0.35,
      drift: Math.random() * Math.PI * 2,
    });
  }
  group.userData.puffs = puffs;
  return group;
}

function updateSmokeSignal(smoke, dt) {
  for (const puff of smoke.userData.puffs) {
    puff.phase += dt * puff.speed * 0.32;
    if (puff.phase > 1) puff.phase -= 1;
    const t = puff.phase;
    const spread = 0.7 + t * 3.4;
    puff.mesh.position.set(
      Math.cos(puff.drift + t * 2.4) * spread,
      t * 26,
      Math.sin(puff.drift + t * 2.4) * spread,
    );
    puff.mesh.scale.setScalar(0.9 + t * 2.8);
    puff.mesh.material.opacity = (1 - t) * 0.5 * Math.min(1, t * 6);
  }
}

function isDescendantOf(object, ancestor) {
  let node = object;
  while (node) {
    if (node === ancestor) return true;
    node = node.parent;
  }
  return false;
}

function loadFound() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed && parsed.found)
      ? parsed.found.filter((id) => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}

function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

function releasePointerLock() {
  const locked = document.pointerLockElement || document.webkitPointerLockElement;
  if (!locked) return;
  const exit = document.exitPointerLock || document.webkitExitPointerLock;
  if (typeof exit === 'function') {
    try {
      exit.call(document);
    } catch {
      // Browser refused to release the pointer - the modal is still usable via keyboard.
    }
  }
}

export function createGame({ scene, hud, helicopter, drone, boat = null, villagePoints = [], farmPoints = [], temple }) {
  const found = loadFound();
  const templeBounds = temple || {
    minX: ENTRANCE.temple.minX,
    maxX: ENTRANCE.temple.maxX,
    minZ: ENTRANCE.temple.minZ,
    maxZ: ENTRANCE.temple.maxZ,
    maxY: ENTRANCE.temple.maxY,
  };
  const spots = buildSpots(villagePoints, farmPoints, templeBounds);
  const _giftWorld = new THREE.Vector3();

  const gifts = spots.map((spot, index) => {
    const group = makeGiftPrototype();
    const gift = {
      id: spot.id,
      question: index,
      group,
      collected: found.includes(spot.id),
      phase: index * 1.1,
      boatOnly: !!spot.boatOnly,
    };

    // A mounted gift rides on a moving object (the Ganga cruise ship), so the
    // player has to chase it down with the drone.
    if (spot.mount) {
      const mount = scene.getObjectByName(spot.mount);
      if (mount) {
        gift.mount = mount;
        gift.localOffset = new THREE.Vector3(spot.local.x, spot.local.y, spot.local.z);
        group.position.copy(gift.localOffset);
        group.visible = !gift.collected;
        mount.add(group);
        group.getWorldPosition(_giftWorld);
        gift.x = _giftWorld.x;
        gift.y = _giftWorld.y;
        gift.z = _giftWorld.z;
        return gift;
      }
      const fallback = spot.fallback;
      group.position.set(fallback.x, fallback.y, fallback.z);
      group.visible = !gift.collected;
      scene.add(group);
      gift.x = fallback.x;
      gift.y = fallback.y;
      gift.z = fallback.z;
      return gift;
    }

    const y = spot.y != null ? spot.y : groundHeightAt(spot.x, spot.z) + (spot.lift != null ? spot.lift : 1);
    group.position.set(spot.x, y, spot.z);
    group.visible = !gift.collected;
    // A few gifts get a light column so they can be spotted from afar.
    if (spot.beacon) {
      const beacon = makeBeacon();
      group.add(beacon);
      gift.beacon = beacon;
    }
    scene.add(group);
    gift.x = spot.x;
    gift.y = y;
    gift.z = spot.z;
    return gift;
  });

  const heavenly = {
    id: 'heavenly',
    question: QUESTIONS.length - 1,
    group: null,
    collected: found.includes('heavenly'),
    x: 0,
    y: 0,
    z: 0,
  };

  let delivery = { state: 'idle' };
  let activeGift = null;
  let modalOpen = false;
  let celebrating = false;
  let currentMode = 'drone';
  let elapsed = 0;
  let helicopterAudio = null;

  function stopHelicopterSound() {
    if (helicopterAudio) {
      helicopterAudio.stop();
      helicopterAudio = null;
    }
  }

  // The final gift settles on the first thing it touches. Raycasting is done
  // against a curated list of solid groups (not the whole scene) because the
  // terrain mesh is far too heavy to brute-force raycast.
  const _dropRay = new THREE.Raycaster();
  const _dropOrigin = new THREE.Vector3();
  const _down = new THREE.Vector3(0, -1, 0);
  let dropProbeDistance = 0;
  const dropSurfaces = [
    'city-backdrop',
    'city-roads',
    'village',
    'farms',
    'shrine',
    'temple-entrance',
    'ridge-path',
    'far-ground',
    'ghat',
    'gurukul',
  ]
    .map((name) => scene.getObjectByName(name))
    .filter(Boolean);

  function isOverRiver(x, z) {
    return Math.abs(z - RIVER.z) <= RIVER.halfWidth && Math.abs(x) <= 1300;
  }

  // The terrain mesh only covers the central plateau; outside it the visible
  // ground is the flat far-ground plane.
  const TERRAIN_HALF = TERRAIN.size * 0.5;
  function terrainSurfaceY(x, z) {
    return Math.abs(x) <= TERRAIN_HALF && Math.abs(z) <= TERRAIN_HALF ? groundHeightAt(x, z) : -Infinity;
  }

  function activeVehicle() {
    return currentMode === 'boat' && boat ? boat : drone;
  }

  function stopVehicle(vehicle) {
    if (vehicle.state.velocity && typeof vehicle.state.velocity.set === 'function') {
      vehicle.state.velocity.set(0, 0, 0);
    }
    if (typeof vehicle.state.speed === 'number') vehicle.state.speed = 0;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ found }));
    } catch {
      // Storage unavailable - progress simply will not persist.
    }
  }

  function refreshCounter(visible) {
    hud.setGiftCounter(found.length, GIFT_TOTAL, visible);
  }

  function startDelivery() {
    if (delivery.state !== 'idle' || heavenly.collected) return;
    const zone = DROP_ZONES[Math.floor(Math.random() * DROP_ZONES.length)];
    const drop = {
      x: zone.x,
      z: zone.z,
      y: groundHeightAt(zone.x, zone.z) + 1,
      label: zone.label,
    };
    delivery = { state: 'incoming', drop };

    const h = helicopter.userData;
    h.mode = 'flying';
    h.progress = 0;
    h.start.set(drop.x - 620, 150, drop.z - 260);
    h.end.set(drop.x + 160, 125, drop.z + 90);
    h.distance = Math.max(1, h.start.distanceTo(h.end));
    h.speed = 44;
    helicopter.position.copy(h.start);
    helicopter.lookAt(h.end);
    helicopter.visible = true;

    // Rotor chop that fades in as the helicopter gets closer to the player.
    if (!helicopterAudio) helicopterAudio = startHelicopterLoop();
    hud.setGameHint('🎁 The final gift is arriving by helicopter…', 12000);
  }

  function landHeavenly(y) {
    // Floating gifts stay on the water surface instead of sinking below it.
    if (isOverRiver(heavenly.x, heavenly.z)) {
      y = Math.max(y, RIVER.y + 0.15);
    }
    heavenly.y = y;
    heavenly.group.position.set(heavenly.x, heavenly.y, heavenly.z);

    const chute = heavenly.group.userData.chute;
    if (chute) heavenly.group.remove(chute);
    heavenly.group.userData.chute = null;

    const beacon = makeBeacon();
    heavenly.group.add(beacon);
    heavenly.group.userData.beacon = beacon;

    const smoke = makeSmokeSignal();
    smoke.position.set(heavenly.x, heavenly.y, heavenly.z);
    scene.add(smoke);
    heavenly.smoke = smoke;

    delivery.state = 'landed';
    hud.setGameHint(`🎁 The big gift landed near ${delivery.drop.label} — follow the red smoke!`, 12000);
  }

  function releaseHeavenly() {
    heavenly.x = delivery.drop.x;
    heavenly.z = delivery.drop.z;
    heavenly.y = helicopter.position.y - 8;

    const group = makeGiftPrototype();
    // The final gift is a big one.
    group.scale.setScalar(2.4);
    const chute = makeParachute();
    group.add(chute);
    group.userData.chute = chute;
    group.position.set(heavenly.x, heavenly.y, heavenly.z);
    scene.add(group);

    heavenly.group = group;
    heavenly.smoke = null;
    dropProbeDistance = 0;
    delivery.state = 'falling';
    stopHelicopterSound();
    hud.setGameHint(`🎁 The big gift dropped near ${delivery.drop.label} — watch where it falls!`, 12000);
  }

  function updateDelivery(dt, listenerPos) {
    if (delivery.state === 'idle') {
      if (!heavenly.collected && found.length === GIFT_TOTAL - 1) startDelivery();
      return;
    }

    if (delivery.state === 'incoming') {
      const hp = helicopter.position;
      if (helicopterAudio && listenerPos) {
        const distance = Math.hypot(hp.x - listenerPos.x, hp.y - listenerPos.y, hp.z - listenerPos.z);
        helicopterAudio.setVolume(Math.max(0, 1 - distance / 420) * 0.2);
      }
      if (Math.hypot(hp.x - delivery.drop.x, hp.z - delivery.drop.z) < 70) releaseHeavenly();
      return;
    }

    stopHelicopterSound();

    if (delivery.state === 'falling') {
      const step = 13 * dt;
      heavenly.y -= step;
      dropProbeDistance += step;
      heavenly.group.position.set(heavenly.x, heavenly.y, heavenly.z);
      heavenly.group.rotation.y += dt * 0.5;

      // Probe downward and settle on the first thing the gift touches:
      // rooftops, roads, the riverbank - whatever comes first.
      if (dropProbeDistance >= 2) {
        _dropOrigin.set(heavenly.x, heavenly.y - 0.5, heavenly.z);
        _dropRay.set(_dropOrigin, _down);
        _dropRay.far = dropProbeDistance + 2.5;
        const hits = _dropRay.intersectObjects(dropSurfaces, true);
        const hit = hits.find((h) => !isDescendantOf(h.object, heavenly.group));
        dropProbeDistance = 0;
        if (hit) {
          const landY = Math.max(hit.point.y, terrainSurfaceY(heavenly.x, heavenly.z));
          landHeavenly(landY + 0.05);
          return;
        }
      }

      const terrainY = terrainSurfaceY(heavenly.x, heavenly.z);
      if (terrainY > -Infinity && heavenly.y <= terrainY + 0.2) {
        landHeavenly(terrainY + 0.2);
      } else if (heavenly.y <= -3.5) {
        // Safety net for open ground or water outside the terrain mesh.
        landHeavenly(Math.max(terrainY, -3.65) + 0.05);
      }
      return;
    }

    if (delivery.state === 'landed' && heavenly.group) {
      const beacon = heavenly.group.userData.beacon;
      if (beacon) beacon.material.opacity = 0.14 + Math.sin(elapsed * 2.2) * 0.07;
      heavenly.group.rotation.y += dt * 0.5;
      if (heavenly.smoke) updateSmokeSignal(heavenly.smoke, dt);
    }
  }

  function setPrompt(gift) {
    if (gift === activeGift) return;
    activeGift = gift;
    hud.showGiftPrompt(!!gift);
    // Free the cursor as soon as a gift is in reach so the player can click
    // "Open gift" (and later the answers) on desktop.
    if (gift) releasePointerLock();
  }

  function collectGift(gift) {
    if (gift.collected) return;
    gift.collected = true;
    if (gift.group) gift.group.visible = false;
    if (gift.smoke) {
      scene.remove(gift.smoke);
      gift.smoke = null;
    }
    if (!found.includes(gift.id)) found.push(gift.id);
    save();
    playQuestComplete();
    refreshCounter(true);
    activeGift = null;
    hud.showGiftPrompt(false);

    if (found.length >= GIFT_TOTAL) {
      const vehicle = activeVehicle();
      celebrating = true;
      playYatraComplete();
      vehicle.state.enabled = false;
      stopVehicle(vehicle);
      releasePointerLock();
      setTimeout(() => {
        hud.showBlessing({
          onClose: () => {
            celebrating = false;
            vehicle.state.enabled = true;
          },
        });
      }, 700);
    } else if (found.length === GIFT_TOTAL - 1) {
      startDelivery();
    }
  }

  function recapturePointer() {
    const desktopPointer = window.matchMedia
      && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!desktopPointer || typeof drone.capturePointer !== 'function') return;
    const attempt = drone.capturePointer();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(() => {
        hud.setGameHint('Click anywhere to capture the cursor and keep flying', 4500);
      });
    }
  }

  function openGift(gift) {
    if (!gift || gift.collected || modalOpen) return;
    modalOpen = true;

    const vehicle = activeVehicle();
    const restoreEnabled = vehicle.state.enabled;
    vehicle.state.enabled = false;
    stopVehicle(vehicle);
    releasePointerLock();

    const entry = QUESTIONS[gift.question];
    hud.openQuestion(entry.question, entry.options, (choice) => {
      if (choice !== entry.answer) return false;
      modalOpen = false;
      vehicle.state.enabled = restoreEnabled;
      collectGift(gift);
      // The answer click is a user gesture: hand the mouse straight back to
      // the camera. Only if the browser refuses, fall back to a hint.
      if (!celebrating && currentMode !== 'boat') recapturePointer();
      return true;
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.repeat || e.code !== 'KeyF') return;
    if (activeGift && !modalOpen) openGift(activeGift);
  });

  hud.onGiftOpen(() => {
    if (activeGift && !modalOpen) openGift(activeGift);
  });

  function update(dt, ctx) {
    elapsed += dt;
    currentMode = ctx.mode;

    for (const gift of gifts) {
      if (gift.collected) continue;
      const glint = gift.group.userData.glint;

      if (gift.mount) {
        gift.group.position.y = gift.localOffset.y + Math.sin(elapsed * 1.7 + gift.phase) * 0.12;
        gift.group.rotation.y = elapsed * 0.5 + gift.phase;
        if (glint) glint.rotation.y = elapsed * 2.2;
        gift.group.getWorldPosition(_giftWorld);
        gift.x = _giftWorld.x;
        gift.y = _giftWorld.y;
        gift.z = _giftWorld.z;
        continue;
      }

      gift.group.position.y = gift.y + Math.sin(elapsed * 1.7 + gift.phase) * 0.12;
      gift.group.rotation.y = elapsed * 0.5 + gift.phase;
      if (glint) glint.rotation.y = elapsed * 2.2;
      if (gift.beacon) gift.beacon.material.opacity = 0.16 + Math.sin(elapsed * 2.1) * 0.09;
    }

    const inVehicle = ctx.mode === 'drone' || ctx.mode === 'boat';
    const playing = ctx.phase === 'playing' && inVehicle;
    refreshCounter(playing);
    if (!playing) {
      setPrompt(null);
      return;
    }

    // Never let the active vehicle's controls fight the question modal.
    if (modalOpen) {
      const vehicle = activeVehicle();
      vehicle.state.enabled = false;
      stopVehicle(vehicle);
    }

    const activePos = ctx.mode === 'boat' && ctx.boatPos ? ctx.boatPos : ctx.dronePos;
    updateDelivery(dt, activePos);

    let nearest = null;
    let nearestD2 = OPEN_RADIUS * OPEN_RADIUS;
    for (const gift of gifts) {
      if (gift.collected) continue;
      // Some gifts can only be reached by boat, never by drone.
      if (gift.boatOnly && ctx.mode !== 'boat') continue;
      const d2 = distanceSquared(activePos, gift);
      if (d2 < nearestD2) {
        nearest = gift;
        nearestD2 = d2;
      }
    }

    if (delivery.state === 'landed' && !heavenly.collected) {
      const d2 = distanceSquared(activePos, heavenly);
      if (d2 < nearestD2) nearest = heavenly;
    }

    setPrompt(nearest);
  }

  // Wipe the journey: used only when the player deliberately exits to the
  // entrance. Pausing and resuming keeps all progress.
  function reset() {
    found.length = 0;
    save();

    for (const gift of gifts) {
      gift.collected = false;
      gift.group.visible = true;
    }

    if (heavenly.smoke) {
      scene.remove(heavenly.smoke);
      heavenly.smoke = null;
    }
    if (heavenly.group) {
      scene.remove(heavenly.group);
      heavenly.group = null;
    }
    heavenly.collected = false;
    stopHelicopterSound();
    delivery = { state: 'idle' };
    activeGift = null;
    modalOpen = false;
    celebrating = false;
    hud.showGiftPrompt(false);
    refreshCounter(false);
  }

  return {
    update,
    reset,
    isInteracting: () => modalOpen || celebrating || activeGift != null,
    state: () => ({ found: [...found], delivery: delivery.state }),
    // Debug helper: current world positions of every gift.
    gifts: () => gifts.map((g) => ({
      id: g.id,
      x: Math.round(g.x * 10) / 10,
      y: Math.round(g.y * 10) / 10,
      z: Math.round(g.z * 10) / 10,
      collected: g.collected,
      boatOnly: !!g.boatOnly,
    })),
    // Debug helper: only the gifts still waiting to be found.
    remaining: () => {
      const list = gifts
        .filter((g) => !g.collected)
        .map((g) => ({
          id: g.id,
          x: Math.round(g.x),
          y: Math.round(g.y),
          z: Math.round(g.z),
          boatOnly: !!g.boatOnly,
        }));
      if (!heavenly.collected) {
        list.push({ id: 'heavenly', note: 'helicopter drop - follow the red smoke' });
      }
      return list;
    },
  };
}
