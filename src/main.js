import * as THREE from 'three';
import { buildTerrain, groundHeightAt, findRidgeTop } from './terrain.js';
import { createEnvironment, riverBankAnchor } from './environment.js';
import { buildGhat } from './ghat.js';
import { createPlayer } from './player.js';
import { buildVegetation } from './vegetation.js';
import { buildTemple } from './temple.js';
import { buildCity } from './city.js';
import { buildVillage } from './village.js';
import { buildFarms } from './farms.js';
import { buildGurukul, GURUKUL } from './gurukul.js';
import { buildTempleGarden } from './temple-garden.js';
import { buildPath } from './path.js';
import { createHud } from './hud.js';
import { createDrone } from './drone.js';
import { createYouTubeMusic } from './youtube.js';
import { createTouchControls } from './touch-controls.js';
import { loadGlbModels, glbHelpText } from './glb.js';
import { buildEntrance, entranceHeightAt, getTempleColliders, ENTRANCE, insideTempleFootprint } from './entrance.js';
import { prepareWalkableMeshes, sampleWalkFloor } from './walkable.js';

const canvas = document.getElementById('scene');
const hud = createHud();
const youtubeMusic = createYouTubeMusic();

let phase = 'loading';
let mode = 'walk';
let world = null;
let player = null;
let drone = null;
let env = null;
let touchControls = null;
let animated = [];

const WALK_STATUS = '[WASD] walk · [Shift] run · [Space] jump · [Esc] pause';
const DRONE_STATUS = '[WASD] fly · [Space / Tab] rise · [Shift] descend · [Mouse] look · [Esc] pause';

function createTempleFlag(scene, templeRoot) {
  if (!templeRoot) return null;
  const bounds = new THREE.Box3().setFromObject(templeRoot);
  if (!Number.isFinite(bounds.max.y)) return null;
  const center = bounds.getCenter(new THREE.Vector3());
  const group = new THREE.Group();
  group.name = 'iskcon-mayapur-flag';
  group.position.set(center.x, 0, center.z);

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e2a33a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#7c2e22';
  ctx.lineWidth = 14;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.fillStyle = '#6e241d';
  ctx.font = 'bold 82px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ISKCON MAYAPUR', canvas.width / 2, canvas.height / 2 + 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const flagWidth = 84;
  const flagHeight = 24;
  const flagGeometry = new THREE.PlaneGeometry(flagWidth, flagHeight, 36, 12);
  const flagPositions = flagGeometry.attributes.position;
  const baseVertices = [];
  for (let i = 0; i < flagPositions.count; i++) {
    const x = flagPositions.getX(i) + flagWidth / 2;
    const y = flagPositions.getY(i);
    baseVertices.push({ x, y });
    flagPositions.setX(i, x);
  }
  const flagMaterial = new THREE.MeshStandardMaterial({
    map: texture,
    side: THREE.DoubleSide,
    roughness: 0.8,
    metalness: 0.02,
  });
  const flag = new THREE.Mesh(flagGeometry, flagMaterial);
  // Lower edge meets the temple's highest dome point.
  flag.position.set(0, bounds.max.y + flagHeight / 2, 0);
  flag.castShadow = true;
  flag.receiveShadow = true;
  group.add(flag);
  scene.add(group);

  let elapsed = 0;
  return (dt) => {
    elapsed += dt;
    for (let i = 0; i < flagPositions.count; i++) {
      const vertex = baseVertices[i];
      const normalizedX = vertex.x / flagWidth;
      const wave = Math.sin(elapsed * 3.4 + normalizedX * 7.5 + vertex.y * 0.35)
        * 2.7 * normalizedX;
      flagPositions.setXYZ(i, vertex.x, vertex.y, wave);
    }
    flagPositions.needsUpdate = true;
    flagGeometry.computeVertexNormals();
  };
}

function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  return renderer;
}

function createCamera() {
  const camera = new THREE.PerspectiveCamera(66, window.innerWidth / window.innerHeight, 0.1, 1200);
  camera.position.set(0, 20, 170);
  return camera;
}

async function boot() {
  hud.showOverlay(
    true,
    'ISKCON Mayapur',
    '<p>Entering Mayapur Dham…</p>',
    'Please wait',
  );
  hud.setButtonEnabled(false);

  const renderer = createRenderer();
  const scene = new THREE.Scene();
  const camera = createCamera();

  env = createEnvironment({ scene });

  await new Promise((r) => setTimeout(r, 20));

  const terrain = buildTerrain();
  scene.add(terrain);

  const shrine = buildTemple();
  scene.add(shrine.group);

  const path = buildPath();
  scene.add(path);

  const entrance = buildEntrance();
  scene.add(entrance);

  const templeGarden = buildTempleGarden();
  scene.add(templeGarden);
  animated.push((dt) => templeGarden.userData.update(dt));

  const vegetation = buildVegetation();
  scene.add(vegetation);

  const village = buildVillage();
  scene.add(village);

  const farms = buildFarms({ avoid: village.userData.positions || [] });
  scene.add(farms);

  const ghatAnchor = riverBankAnchor(0.35);
  const ghat = buildGhat(ghatAnchor);
  scene.add(ghat);

  const gurukul = buildGurukul();
  scene.add(gurukul);

  const city = buildCity({ exclude: [ghatAnchor, GURUKUL] });
  scene.add(city);

  const liteMode = new URLSearchParams(window.location.search).has('lite');
  const glbNotes = [];
  const glbs = liteMode
    ? []
    : await loadGlbModels({
        scene,
        groundHeightAt,
        onLog: (msg) => glbNotes.push(msg),
      });
  if (liteMode) console.info('[glb] lite mode — model loading skipped');
  else if (glbNotes.length) console.info('[glb]', glbNotes.join('; '));
  else console.info('[glb]', glbHelpText());

  const krishna = glbs.find((o) => o.name === 'standin-temple');
  if (krishna) {
    const baseY = krishna.position.y;
    let animT = Math.random() * 10;
    animated.push((dt) => {
      animT += dt;
      krishna.rotation.y += dt * 0.9;
      const hop = Math.max(0, Math.sin(animT * 2.4)) ** 2 * 0.45;
      krishna.position.y = baseY + hop;
    });
  }

  const terrainFigure = glbs.find((o) => o.name === 'terrain-figure');
  if (terrainFigure) {
    const templeBounds = ENTRANCE.temple;
    const templeCenter = {
      x: (templeBounds.minX + templeBounds.maxX) / 2,
      z: (templeBounds.minZ + templeBounds.maxZ) / 2,
    };
    const size = new THREE.Box3().setFromObject(terrainFigure).getSize(new THREE.Vector3());
    // The imported figure faces inward, so its local depth becomes its side-to-side footprint.
    const priorHeightRatio = 7 / 5;
    const sideDistance = ENTRANCE.stairs.halfW + (size.z * priorHeightRatio) / 2 + 1.2 + 5;
    const requestedDanceZ = ENTRANCE.stairs.zTop + 4 - 5;
    const danceZ = Math.max(requestedDanceZ, templeBounds.maxZ + (size.x * priorHeightRatio) / 2 + 0.6) + 4;
    const leftFigure = terrainFigure.clone(true);
    leftFigure.name = 'terrain-figure-west';
    scene.add(leftFigure);
    const dancers = [
      { object: leftFigure, side: -1, phase: 0 },
      { object: terrainFigure, side: 1, phase: 0 },
    ];
    const footOffset = terrainFigure.userData.footOffset || 0;
    let danceT = 0;
    animated.push((dt) => {
      danceT += dt;
      for (const dancer of dancers) {
        const rhythm = danceT * 1.65 + dancer.phase;
        const baseX = templeCenter.x + dancer.side * sideDistance;
        const x = baseX + Math.sin(rhythm * 0.58) * 0.32;
        const z = danceZ + Math.cos(rhythm * 0.58) * 0.32;

        dancer.object.position.set(
          x,
          groundHeightAt(x, z) + footOffset + Math.max(0, Math.sin(rhythm * 2.1)) * 0.14,
          z,
        );
        const turn = (1 - Math.cos(rhythm * 0.9)) / 2;
        const leftwardOffset = dancer.side > 0 ? THREE.MathUtils.degToRad(40) : 0;
        dancer.object.rotation.y = -Math.PI / 2 + turn * (Math.PI / 2) - leftwardOffset;
        dancer.object.rotation.x = Math.sin(rhythm * 1.3) * 0.035;
        dancer.object.rotation.z = Math.sin(rhythm * 1.7) * 0.065;
      }
    });
  }

  const terrainOrbit = glbs.find((o) => o.name === 'terrain-orbit');
  const kirtanFollowers = glbs.find((o) => o.name === 'kirtan-followers');
  if (terrainOrbit) {
    const orbitFootOffset = terrainOrbit.userData.footOffset || 0;
    // The GLB is high-poly; skip its dynamic shadow-map passes so it does not
    // make walking controls stutter while it moves.
    terrainOrbit.traverse((part) => {
      if (part.isMesh) {
        part.castShadow = false;
        part.receiveShadow = false;
      }
    });
    if (kirtanFollowers) {
      kirtanFollowers.traverse((part) => {
        if (part.isMesh) {
          part.castShadow = false;
          part.receiveShadow = false;
        }
      });
    }
    const followerFootOffset = kirtanFollowers?.userData.footOffset || 0;

    // A two-lane, left-side temple route with broad U-turns at both ends:
    // from beside the temple down the slope, then smoothly back uphill.
    const rathPath = [{ x: -37, z: 106 }];
    const appendLine = (x, z, step = 2) => {
      const start = rathPath[rathPath.length - 1];
      const steps = Math.max(1, Math.ceil(Math.hypot(x - start.x, z - start.z) / step));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        rathPath.push({ x: THREE.MathUtils.lerp(start.x, x, t), z: THREE.MathUtils.lerp(start.z, z, t) });
      }
    };
    const appendArc = (cx, cz, from, to, radius = 24) => {
      const steps = Math.max(8, Math.ceil(Math.abs(to - from) * radius / 2));
      for (let i = 1; i <= steps; i++) {
        const angle = THREE.MathUtils.lerp(from, to, i / steps);
        rathPath.push({ x: cx + Math.cos(angle) * radius, z: cz + Math.sin(angle) * radius });
      }
    };
    // Temple-side lane goes downhill; the lower arc turns onto the outer lane.
    appendLine(-37, 170);
    appendArc(-61, 170, 0, Math.PI);
    appendLine(-85, 106);
    // Upper arc makes a broad turn back toward the temple-side lane.
    appendArc(-61, 106, Math.PI, Math.PI * 2);
    const pathDistances = [0];
    for (let i = 1; i < rathPath.length; i++) {
      const a = rathPath[i - 1];
      const b = rathPath[i];
      pathDistances.push(pathDistances[i - 1] + Math.hypot(b.x - a.x, b.z - a.z));
    }
    const pathLength = pathDistances[pathDistances.length - 1];
    const pointOnPath = (distance) => {
      const d = ((distance % pathLength) + pathLength) % pathLength;
      let low = 0;
      let high = pathDistances.length - 1;
      while (low + 1 < high) {
        const mid = (low + high) >> 1;
        if (pathDistances[mid] <= d) low = mid;
        else high = mid;
      }
      const span = pathDistances[low + 1] - pathDistances[low] || 1;
      const t = (d - pathDistances[low]) / span;
      const a = rathPath[low];
      const b = rathPath[low + 1];
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    };
    let travelDistance = 0;
    animated.push((dt) => {
      travelDistance = (travelDistance + dt * 5) % pathLength;
      const { x, z } = pointOnPath(travelDistance);
      const { x: nextX, z: nextZ } = pointOnPath(travelDistance + 1);

      terrainOrbit.position.set(
        x,
        groundHeightAt(x, z) + orbitFootOffset + 2,
        z,
      );
      // This rath's forward axis is local +X, not Three.js's usual +Z.
      terrainOrbit.rotation.y = Math.atan2(nextX - x, nextZ - z) - Math.PI / 2;

      if (kirtanFollowers) {
        const followerDistance = travelDistance + 60;
        const follower = pointOnPath(followerDistance);
        const followerAhead = pointOnPath(followerDistance + 1);
        const dance = travelDistance * 0.9;
        kirtanFollowers.position.set(
          follower.x,
          groundHeightAt(follower.x, follower.z) + followerFootOffset + Math.max(0, Math.sin(dance)) * 0.12,
          follower.z,
        );
        // GLB crowd faces local +Z; keep them moving ahead of the rath.
        kirtanFollowers.rotation.y = Math.atan2(followerAhead.x - follower.x, followerAhead.z - follower.z)
          - THREE.MathUtils.degToRad(60)
          + Math.sin(dance * 0.6) * 0.08;
        kirtanFollowers.rotation.x = Math.sin(dance * 1.3) * 0.035;
        kirtanFollowers.rotation.z = Math.sin(dance * 1.8) * 0.06;
      }
    });
  }

  const avatar = glbs.find((o) => o.name === 'avatar');
  if (avatar) {
    avatar.rotation.y = Math.PI;
    const faceFill = new THREE.PointLight(0xffd6a0, 1.35, 4.8, 2);
    faceFill.name = 'character-face-fill';
    faceFill.position.set(0, 1.55, 0.62);
    avatar.add(faceFill);
    const footOff = avatar.userData.footOffset || 0;
    let gaitT = 0;
    animated.push((dt) => {
      const p = player.state;
      avatar.position.set(p.position.x, p.position.y - footOff, p.position.z);
      avatar.rotation.y = p.heading + Math.PI;

      const moving = p.speed > 0.35 && p.grounded;
      if (moving) gaitT += dt * (4.5 + p.speed * 1.6);
      const s = Math.min(1, p.speed / 4.2);

      const bob = moving ? Math.abs(Math.sin(gaitT * 2)) * 0.04 * s : 0;
      const roll = moving ? Math.sin(gaitT) * 0.045 * s : 0;
      const lean = moving ? 0.05 * s : 0;

      avatar.position.y += bob;
      avatar.rotation.z = roll;
      avatar.rotation.x = lean;
    });
  }

  const templeRoot = glbs.find((o) => o.name === 'mayapur-temple');
  const walkMeshes = prepareWalkableMeshes(templeRoot);
  console.info(`[walkable] ${walkMeshes.length} temple mesh(es) with BVH`);

  const groundHeight = (x, z, feetY = ENTRANCE.temple.minY) => {
    const base = entranceHeightAt(x, z);
    if (!insideTempleFootprint(x, z, 1.5)) return base;
    const meshY = sampleWalkFloor(x, z, feetY, walkMeshes);
    if (meshY == null) return base;
    if (meshY > feetY + 1.05) return base;
    if (meshY < feetY - 5) return base;
    return meshY > base ? meshY : base;
  };

  touchControls = createTouchControls({ onPause: () => pause() });

  const spawnY = groundHeight(ENTRANCE.doorX, ENTRANCE.stairs.zBottom + 8, ENTRANCE.temple.minY);
  player = createPlayer({
    camera,
    domElement: canvas,
    spawn: { x: ENTRANCE.doorX, y: spawnY, z: ENTRANCE.stairs.zBottom + 8, heading: 0 },
    groundHeight,
    colliders: getTempleColliders(),
    thirdPerson: !!avatar,
    touchControls,
  });
  player.state.position.y = spawnY;
  player.state.camYaw = 0;
  player.state.camPitch = 0.05;

  drone = createDrone({ camera, domElement: canvas, groundHeight, touchControls });

  const top = findRidgeTop();

  world = { renderer, scene, camera, terrain, shrine, path, entrance, vegetation, city, glbs };
  animated.push((dt) => env.update(dt, camera));

  window.__hill = {
    scene,
    camera,
    renderer,
    player,
    phase: () => phase,
    mode: () => mode,
    step: stepSimulation,
    frames: () => frameCount,
    top,
    glbs,
    avatar: avatar || null,
  };
  window.__hill.drone = drone;

  const isTouch = touchControls.isTouchDevice;
  const controlsHtml = isTouch
    ? `<ul class="controls"><li><b>Left Thumb</b> &mdash; virtual joystick to move / fly</li><li><b>Right Thumb</b> &mdash; drag to look around</li><li><b>Buttons</b> &mdash; ⤒ jump / ⚡ sprint &middot; ▲ up / ▼ down</li><li><b>⏸ Pause</b> &mdash; pause button at top-left</li></ul>`
    : `<ul class="controls"><li><b>Walk</b> &mdash; W A S D walk &middot; Shift run &middot; Space jump</li><li><b>Drone</b> &mdash; W A S D fly &middot; Space / Tab rise &middot; Shift descend</li><li><b>Mouse</b> look &middot; click to capture cursor &middot; Esc pauses</li></ul>`;

  hud.setButtonEnabled(true);
  hud.showOverlay(
    true,
    'ISKCON Mayapur',
    `<p>Walk the sacred Mayapur Dham as Srila Prabhupada for darshan of Lord Narsimhadev, or take the drone up for an aerial tour of the grand temple.</p>${controlsHtml}<p class="note">${avatar ? 'Third-person camera — walk with Srila Prabhupada.' : 'Mayapur Dham 3D'}</p>`,
    'Enter Temple',
    { modeChoice: true },
  );
  phase = 'menu';

  const tx = ENTRANCE.doorX;
  const tz = ENTRANCE.doorZ;
  player.state.camYaw = Math.atan2(-(tx - player.state.position.x), -(tz - player.state.position.z));
  player.state.camPitch = 0.08;

  applyShotParams();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  requestAnimationFrame(frame);
}

let shotCam = null;

function applyShotParams() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('shot')) return;

  const num = (key) => {
    const raw = params.get(key);
    if (raw == null || raw === '') return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  };

  const px = num('x');
  const pz = num('z');
  if (px != null) player.state.position.x = px;
  if (pz != null) player.state.position.z = pz;
  if (px != null || pz != null) {
    player.state.position.y = groundHeightAt(player.state.position.x, player.state.position.z);
    player.state.velocity.set(0, 0, 0);
  }

  const yaw = num('yaw');
  const pitch = num('pitch');
  if (yaw != null) player.state.camYaw = yaw;
  if (pitch != null) player.state.camPitch = pitch;

  const freecam = params.get('freecam');
  if (freecam) {
    const pos = freecam.split(',').map(Number);
    const look = (params.get('look') || '').split(',').map(Number);
    if (pos.length === 3 && pos.every(Number.isFinite)) {
      shotCam = {
        pos: new THREE.Vector3(pos[0], pos[1], pos[2]),
        target: look.length === 3 && look.every(Number.isFinite)
          ? new THREE.Vector3(look[0], look[1], look[2])
          : new THREE.Vector3(pos[0], pos[1] - 6, pos[2] - 40),
      };
    }
  }

  if (params.get('mode') === 'drone') {
    startPlay('drone');
    hud.showHud(false);
  } else {
    player.state.enabled = false;
    hud.showOverlay(false);
    hud.showHud(false);
    phase = 'playing';
  }
}

function startPlay(kind, { resume = false } = {}) {
  mode = kind;
  env.activateWeather();
  hud.showOverlay(false);
  hud.showHud(true);
  phase = 'playing';

  if (kind === 'drone') {
    player.state.enabled = false;
    if (resume && drone.state.started) drone.resume();
    else drone.activate(droneFlightPlan());
    hud.setStatus(DRONE_STATUS);
  } else {
    drone.deactivate();
    player.state.enabled = true;
    hud.setStatus(WALK_STATUS);
  }

  if (touchControls) {
    touchControls.setMode(kind);
    touchControls.setVisible(true);
  }

  requestPointerLock(canvas);
}

function requestPointerLock(element) {
  if (touchControls && touchControls.isTouchDevice) return;
  const result = element.requestPointerLock();
  if (result && typeof result.catch === 'function') result.catch(() => {});
}

// Cinematic drone intro flight: starts right in front of Lord Narsimhadev inside the sanctum,
// and smoothly dollies straight backward down the aisle, out through the doorway,
// and rises above the grand steps while continuously looking at Lord Narsimhadev (no camera flipping).
function droneFlightPlan() {
  const doorX = ENTRANCE.doorX;
  const maxZ = ENTRANCE.temple.maxZ;

  const path = [
    new THREE.Vector3(doorX, 40.5, 59.5),           // 1. In front of Lord Narsimhadev altar
    new THREE.Vector3(doorX, 40.2, 68.0),           // 2. Gliding back down sanctum aisle
    new THREE.Vector3(doorX, 38.2, 78.5),           // 3. Gliding back down interior stairs
    new THREE.Vector3(doorX, 37.4, 88.5),           // 4. Gliding back through the open doorway
    new THREE.Vector3(doorX + 8, 43.0, 115.0),      // 5. Emerging backward over outdoor stairs
    new THREE.Vector3(doorX + 28, 60.0, maxZ + 68), // 6. Final aerial lookout position
  ];

  // Keep camera sightline focused continuously on Lord Narsimhadev & sanctum
  // (strictly behind the camera so _dir.z is always negative — zero flips or 180° turns)
  const lookPath = [
    new THREE.Vector3(doorX, 41.2, 54.5),           // 1. Lord Narsimhadev on altar
    new THREE.Vector3(doorX, 41.4, 54.6),           // 2. Sanctum shrine
    new THREE.Vector3(doorX, 41.7, 54.7),           // 3. Sanctum shrine from stairs
    new THREE.Vector3(doorX, 42.2, 54.8),           // 4. Sanctum seen through grand doorway
    new THREE.Vector3(doorX, 43.0, 55.0),           // 5. Grand entrance & sanctum
    new THREE.Vector3(doorX, 44.5, 55.2),           // 6. Temple facade & sanctum from aerial lookout
  ];

  return {
    path,
    lookPath,
    duration: 8.5,
  };
}

function pause() {
  if (phase !== 'playing') return;
  phase = 'paused';
  player.state.enabled = false;
  drone.deactivate();
  if (touchControls) touchControls.setVisible(false);
  const body =
    mode === 'drone'
      ? '<p>The drone is hovering. Press Resume to keep flying.</p>'
      : '<p>The temple waits. Press Resume to keep walking.</p>';
  hud.showOverlay(true, 'Paused', body, 'Resume');
}

async function requestLandscapeOrientation() {
  try {
    if (screen.orientation && typeof screen.orientation.lock === 'function') {
      await screen.orientation.lock('landscape');
    }
  } catch {
    // Expected on iOS Safari / browsers that do not permit locking outside full screen
  }
}

function requestFullscreenMode() {
  const el = document.documentElement;
  const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
  if (fn && !document.fullscreenElement && !document.webkitFullscreenElement) {
    try {
      const p = fn.call(el);
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {}
  }
}

function toggleFullscreenMode() {
  const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
  if (!isFull) {
    requestFullscreenMode();
  } else {
    const exitFn = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    if (exitFn) {
      try {
        const p = exitFn.call(document);
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {}
    }
  }
}

const fsBtn = document.getElementById('fullscreen-btn');
if (fsBtn) {
  fsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFullscreenMode();
  });
}

function updateFullscreenBtn() {
  const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
  if (fsBtn) {
    fsBtn.textContent = isFull ? '🗗 Exit' : '⛶ Fullscreen';
  }
}
document.addEventListener('fullscreenchange', updateFullscreenBtn);
document.addEventListener('webkitfullscreenchange', updateFullscreenBtn);

hud.onStart(() => {
  if (phase === 'menu' || phase === 'paused') {
    requestLandscapeOrientation();
    requestFullscreenMode();
    youtubeMusic.play();
    startPlay(mode, { resume: phase === 'paused' });
  }
});

hud.onDrone(() => {
  if (phase === 'menu' || phase === 'paused') {
    requestLandscapeOrientation();
    requestFullscreenMode();
    youtubeMusic.play();
    startPlay('drone', { resume: phase === 'paused' && mode === 'drone' });
  }
});

document.addEventListener('pointerlockchange', () => {
  if (touchControls && touchControls.isTouchDevice) return;
  if (document.pointerLockElement !== canvas && phase === 'playing') pause();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});

let last = performance.now();
let frameCount = 0;

function stepSimulation(dt) {
  for (const fn of animated) fn(dt);
  if (phase === 'menu') player.state.camYaw += dt * 0.03;

  const droneMode = mode === 'drone' && phase !== 'menu';
  if (droneMode) {
    // While paused the drone holds its hover, so the camera does not snap away.
    if (phase === 'playing') drone.update(dt);
  } else {
    player.update(dt);
  }
  const flying = droneMode;

  if (shotCam) {
    world.camera.position.copy(shotCam.pos);
    world.camera.lookAt(shotCam.target);
  }
  hud.update(dt, {
    altitude: flying ? drone.state.position.y : player.state.position.y,
    walked: flying ? drone.state.travelled : player.state.walked,
  });
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  frameCount += 1;
  stepSimulation(dt);
  world.renderer.render(world.scene, world.camera);
  requestAnimationFrame(frame);
}

boot().catch((err) => {
  console.error(err);
  hud.showOverlay(
    true,
    'Could not start',
    `<p>The scene failed to load. Check the console.</p><p class="note">${String(err && err.message ? err.message : err)}</p>`,
    'Reload',
  );
  hud.onStart(() => window.location.reload());
});
