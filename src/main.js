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
import { createBoat } from './boat.js';
import { createArati } from './arati.js';
import { createBlessing } from './blessing.js';
import { createYouTubeMusic } from './youtube.js';
import { suspendAudio, resumeAudio, playCollect, playQuestComplete } from './audio.js';
import { createGame } from './game.js';
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
let boat = null;
let arati = null;
let blessing = null;
let boatNear = false;
let boatHintShown = false;
let tutorialOpen = false;
let tutorialDoneThisEntry = false;
let droneIntroWasActive = false;
let musicNeedsNewTrack = false;
let env = null;
let game = null;
let touchControls = null;
let animated = [];

const WALK_STATUS = '[WASD] walk · [Shift] run · [Space] jump · [Esc] pause';
const DRONE_STATUS = '[WASD] fly · [Space / Tab] rise · [Shift] descend · [Mouse] look · [Esc] pause';
const BOAT_STATUS = '[W/S] throttle · [A/D] turn · [F] leave boat · [Esc] pause';

function menuBody() {
  return `<p>Walk the sacred Mayapur Dham as Srila Prabhupada for darshan of Lord Narsimhadev, or take the drone up for an aerial tour of the grand temple.</p>
    <p class="note"><b>🎁 Gift Hunt — PLAY GAME:</b> 11 gifts are hidden across Mayapur Dham. Fly close to a gift, open it and answer a spiritual question to receive it. Find all 11 for a blessing.</p>`;
}

// The GLB's front entrance passage was cut open for the walkable route. Line
// the cut with sandstone walls that match the procedural staircase, hiding the
// broken pillar stubs and jagged cut edges so it reads as a real entrance.
// Cut region measured from the model: x 10.5..25.5, floor..y 43.6, z 68.5..82.6.
function buildEntrancePortalLining(scene) {
  const stone = new THREE.MeshStandardMaterial({ color: 0xc4b39a, roughness: 0.9, metalness: 0.03 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x9d8a6a, roughness: 0.9, metalness: 0.04 });

  const group = new THREE.Group();
  group.name = 'temple-entrance-lining';

  const addBox = (w, h, d, x, y, z, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  // Passage lining: jambs and ceiling sitting on the cut planes.
  const midZ = 75.55;
  const depth = 14.9;
  const jambH = 11.0;
  const jambY = 33.2 + jambH / 2;
  addBox(1.0, jambH, depth, 10.5, jambY, midZ, stone);
  addBox(1.0, jambH, depth, 25.5, jambY, midZ, stone);
  addBox(16.0, 1.0, depth, 18.0, 43.9, midZ, stone);

  // Trim frame around the staircase-side opening, masking the raw cut edge.
  const frameZ = 82.9;
  addBox(0.5, 11.2, 0.7, 11.1, 39.1, frameZ, trim);
  addBox(0.5, 11.2, 0.7, 24.9, 39.1, frameZ, trim);
  addBox(14.3, 0.5, 0.7, 18.0, 43.5, frameZ, trim);

  scene.add(group);
  return group;
}

// Large framed altar pictures on both hall side walls, each with a marble
// ledge beneath so they read as side altars.
function buildSideAltar(scene, { url, x, facing, z, width, height, ledgeLength, bottomY = 38.8 }) {
  const loader = new THREE.TextureLoader();
  loader.load(
    url,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;

      const group = new THREE.Group();
      group.name = 'temple-side-altar';

      const frameHeight = height + 0.31;
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.3, frameHeight, 0.14),
        new THREE.MeshStandardMaterial({ color: 0xb8860b, roughness: 0.4, metalness: 0.6 }),
      );
      frame.castShadow = true;
      frame.receiveShadow = true;

      const image = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({ map: texture }),
      );
      image.position.z = 0.08;

      group.add(frame, image);
      group.position.set(x, bottomY + frameHeight / 2, z);
      group.rotation.y = facing;
      scene.add(group);

      // Marble ledge under the picture, like a small side altar (optional).
      if (!ledgeLength) return;
      const dir = facing === Math.PI / 2 ? 1 : -1;
      const ledge = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.22, ledgeLength),
        new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.6, metalness: 0.05 }),
      );
      ledge.position.set(x + dir * 0.2, 38.62, z);
      ledge.castShadow = true;
      ledge.receiveShadow = true;
      scene.add(ledge);
    },
    undefined,
    () => {
      // Image missing: no side altar.
    },
  );
}

function hideSplash() {
  const splash = document.getElementById('splash');
  if (splash) splash.classList.add('hidden');
}

// The 16-word maha-mantra as 16 buttons: they must be chanted in order, one
// tap each, while the game loads. Loading always wins - the splash hides as
// soon as the models are ready.
const MANTRA_LINES = [
  ['Hare', 'Krishna', 'Hare', 'Krishna'],
  ['Krishna', 'Krishna', 'Hare', 'Hare'],
  ['Hare', 'Rama', 'Hare', 'Rama'],
  ['Rama', 'Rama', 'Hare', 'Hare'],
];
const MANTRA_WORDS = MANTRA_LINES.flat();
let mantraIndex = 0;
let mantraButtons = [];
let mantraHintTimer = null;

function flashMantraHint(text) {
  const hint = document.getElementById('mantra-hint');
  if (!hint) return;
  hint.textContent = text;
  hint.classList.add('flash');
  if (mantraHintTimer) clearTimeout(mantraHintTimer);
  mantraHintTimer = setTimeout(() => {
    hint.textContent = 'Tap each word in order to chant';
    hint.classList.remove('flash');
  }, 1300);
}

function tapMantraWord(button, index) {
  if (index !== mantraIndex) {
    // Out of order: shake and point to the next button.
    button.classList.remove('wrong');
    void button.offsetWidth;
    button.classList.add('wrong');
    flashMantraHint('Click next button');
    return;
  }

  button.classList.remove('next');
  button.classList.add('revealed');
  mantraIndex += 1;
  playCollect();

  if (mantraIndex >= MANTRA_WORDS.length) {
    const done = document.getElementById('mantra-done');
    if (done) done.classList.remove('hidden');
    playQuestComplete();
    return;
  }
  const next = mantraButtons[mantraIndex];
  if (next) next.classList.add('next');
}

function initMantra() {
  const wordsEl = document.getElementById('mantra-words');
  const done = document.getElementById('mantra-done');
  const hint = document.getElementById('mantra-hint');
  if (!wordsEl) return;

  wordsEl.innerHTML = '';
  mantraButtons = [];
  mantraIndex = 0;

  let flatIndex = 0;
  for (const line of MANTRA_LINES) {
    const row = document.createElement('div');
    row.className = 'mantra-line';
    for (const word of line) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mantra-word';
      button.textContent = word;
      const index = flatIndex;
      flatIndex += 1;

      let lastTrigger = 0;
      const trigger = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const now = Date.now();
        if (now - lastTrigger < 300) return;
        lastTrigger = now;
        tapMantraWord(button, index);
      };
      button.addEventListener('click', trigger);
      button.addEventListener('touchend', trigger);

      row.appendChild(button);
      mantraButtons.push(button);
    }
    wordsEl.appendChild(row);
  }

  if (mantraButtons[0]) mantraButtons[0].classList.add('next');
  if (done) done.classList.add('hidden');
  if (hint) {
    hint.textContent = 'Tap each word in order to chant';
    hint.classList.remove('flash');
  }
}

// Loading bar drawn over the cover art (no popup card while loading).
function setSplashProgress(percent, item) {
  const clamped = Math.max(0, Math.min(100, percent || 0));
  const bar = document.getElementById('splash-bar');
  const label = document.getElementById('splash-label');
  if (bar) bar.style.width = `${clamped}%`;
  if (label) {
    label.textContent = item
      ? `Loading ${item}… ${Math.round(clamped)}%`
      : `Loading Mayapur… ${Math.round(clamped)}%`;
  }
}

// Give every swaying devotee a small devotional placard on a 1 m stick to
// Every swaying devotee carries a small devotional placard on a 0.5 m stick.
// The figures are GLB models with their own scale (about 10x), so the placard
// is counter-scaled to stay life-sized and the stick starts exactly at the top
// of the figure (the image is optional).
function attachDancerPlacards(dancers) {
  const loader = new THREE.TextureLoader();
  loader.load(
    '/images/dancer-placard-mantra.webp',
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.7, metalness: 0.05 });
      const stickMaterial = new THREE.MeshStandardMaterial({ color: 0x6b4a26, roughness: 0.75 });
      const stickGeometry = new THREE.CylinderGeometry(0.06, 0.072, 1.0, 6);
      // Half the previous size (the maha-mantra poster).
      const boardGeometry = new THREE.BoxGeometry(1.89, 2.82, 0.12);
      const imageGeometry = new THREE.PlaneGeometry(1.71, 2.55);
      const imageMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });

      for (const dancer of dancers) {
        const object = dancer.object;
        const scale = object.scale.x || 1;
        const inv = 1 / scale;

        // Local y of the figure's top, so the stick can touch it.
        const box = new THREE.Box3().setFromObject(object);
        const localTop = (box.max.y - object.position.y) / scale;

        const placard = new THREE.Group();

        // 1 m stick whose bottom end rests on the top of the figure.
        const stick = new THREE.Mesh(stickGeometry, stickMaterial);
        stick.position.y = 0.5;
        placard.add(stick);

        // Board mounted on top of the stick.
        const board = new THREE.Mesh(boardGeometry, frameMaterial);
        board.position.y = 2.41;
        const image = new THREE.Mesh(imageGeometry, imageMaterial);
        image.position.set(0, 2.41, 0.08);
        placard.add(board, image);

        placard.scale.setScalar(inv);
        // The figure's front is its local +X: hold the board in front of the
        // devotee and turn its face the same way the devotee faces.
        placard.position.set(0.5 * inv, localTop, 0);
        placard.rotation.y = Math.PI / 2;
        object.add(placard);
        // Keep a handle so the animation loop can sync the swing with the dance.
        object.userData.placard = placard;
      }
    },
    undefined,
    () => {
      // No placard image yet - dancers keep dancing without one.
    },
  );
}

function makePathTracker(points) {
  const distances = [0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    distances.push(distances[i - 1] + Math.hypot(b.x - a.x, b.z - a.z));
  }
  const length = distances[distances.length - 1];

  const pointAt = (distance) => {
    const d = ((distance % length) + length) % length;
    let low = 0;
    let high = distances.length - 1;
    while (low + 1 < high) {
      const mid = (low + high) >> 1;
      if (distances[mid] <= d) low = mid;
      else high = mid;
    }
    const span = distances[low + 1] - distances[low] || 1;
    const t = (d - distances[low]) / span;
    const a = points[low];
    const b = points[low + 1];
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
  };

  return { pointAt, length };
}

function makeLoopPath(build) {
  const points = [];
  const appendLine = (x, z, step = 2) => {
    const start = points[points.length - 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(x - start.x, z - start.z) / step));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      points.push({ x: THREE.MathUtils.lerp(start.x, x, t), z: THREE.MathUtils.lerp(start.z, z, t) });
    }
  };
  const appendArc = (cx, cz, from, to, radius = 24) => {
    const steps = Math.max(8, Math.ceil((Math.abs(to - from) * radius) / 2));
    for (let i = 1; i <= steps; i++) {
      const angle = THREE.MathUtils.lerp(from, to, i / steps);
      points.push({ x: cx + Math.cos(angle) * radius, z: cz + Math.sin(angle) * radius });
    }
  };
  build({ points, appendLine, appendArc });
  return makePathTracker(points);
}

function makeCirclePath(cx, cz, radius, samples = 120) {
  const points = [];
  for (let i = 0; i < samples; i++) {
    const angle = (i / samples) * Math.PI * 2;
    points.push({ x: cx + Math.cos(angle) * radius, z: cz + Math.sin(angle) * radius });
  }
  points.push({ ...points[0] });
  return makePathTracker(points);
}

// Two-lane loop that stays entirely on a city asphalt street (city.js roads
// are 14 wide, so lanes sit 3.5 either side of the centre line).
function makeRoadLanePath(roadZ, x1, x2, lane = 3.5) {
  return makeLoopPath(({ points, appendLine, appendArc }) => {
    points.push({ x: x1, z: roadZ - lane });
    appendLine(x2, roadZ - lane);
    appendArc(x2, roadZ, -Math.PI / 2, Math.PI / 2, lane);
    appendLine(x1, roadZ + lane);
    appendArc(x1, roadZ, Math.PI / 2, Math.PI * 1.5, lane);
  });
}

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

// Wires whichever GLB models are present in `glbs` into the scene. Called
// once after the first (temple) load, then again for each group streamed in
// later, so missing models are simply skipped.
function wireGlbModels(scene, glbs) {
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
  // Extra copies of the swaying figure so pilgrims meet them in other places.
  const extraSpots = [
    { x: -388, z: -198, heading: Math.PI, phase: 1.2 },
    { x: 140, z: -20, heading: Math.PI / 2, phase: 2.7 },
    { x: -146, z: 26, heading: 0, phase: 4.3 },
  ];
  const extraDancers = extraSpots.map((spot, i) => {
    const figure = terrainFigure.clone(true);
    figure.name = `terrain-figure-${i}`;
    scene.add(figure);
    return { object: figure, ...spot };
  });
  attachDancerPlacards([...dancers, ...extraDancers]);
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

      // Keep the held placard swaying with the devotee but steadier, so it
      // reads as being carried in the hand.
      const placard = dancer.object.userData.placard;
      if (placard) {
        placard.rotation.x = -dancer.object.rotation.x * 0.6;
        placard.rotation.z = -dancer.object.rotation.z * 0.6;
      }
    }
    for (const dancer of extraDancers) {
      const rhythm = danceT * 1.65 + dancer.phase;
      const x = dancer.x + Math.sin(rhythm * 0.58) * 0.3;
      const z = dancer.z + Math.cos(rhythm * 0.58) * 0.3;

      dancer.object.position.set(
        x,
        groundHeightAt(x, z) + footOffset + Math.max(0, Math.sin(rhythm * 2.1)) * 0.14,
        z,
      );
      const turn = (1 - Math.cos(rhythm * 0.9)) / 2;
      dancer.object.rotation.y = dancer.heading + turn * 0.6;
      dancer.object.rotation.x = Math.sin(rhythm * 1.3) * 0.035;
      dancer.object.rotation.z = Math.sin(rhythm * 1.7) * 0.065;

      const placard = dancer.object.userData.placard;
      if (placard) {
        placard.rotation.x = -dancer.object.rotation.x * 0.6;
        placard.rotation.z = -dancer.object.rotation.z * 0.6;
      }
    }
  });
}

const terrainOrbit = glbs.find((o) => o.name === 'terrain-orbit');
const kirtanFollowers = glbs.find((o) => o.name === 'kirtan-followers');
if (terrainOrbit) {
  const orbitFootOffset = terrainOrbit.userData.footOffset || 0;
  // The GLB is high-poly; skip its dynamic shadow-map passes so it does not
  // make walking controls stutter while it moves.
  const skipDynamicShadows = (root) => {
    root.traverse((part) => {
      if (part.isMesh) {
        part.castShadow = false;
        part.receiveShadow = false;
      }
    });
  };
  skipDynamicShadows(terrainOrbit);
  if (kirtanFollowers) skipDynamicShadows(kirtanFollowers);
  const followerFootOffset = kirtanFollowers?.userData.footOffset || 0;

  // A two-lane, left-side temple route with broad U-turns at both ends:
  // from beside the temple down the slope, then smoothly back uphill.
  const templePath = makeLoopPath(({ points, appendLine, appendArc }) => {
    points.push({ x: -37, z: 106 });
    appendLine(-37, 170);
    appendArc(-61, 170, 0, Math.PI);
    appendLine(-85, 106);
    appendArc(-61, 106, Math.PI, Math.PI * 2);
  });

  // More roads where pilgrims meet the dancing devotees: the ghat
  // riverbank, around the east village hamlet, and along a black asphalt
  // street of the city (city.js roads sit at y = -3.60).
  const ghatPath = makeLoopPath(({ points, appendLine, appendArc }) => {
    points.push({ x: -460, z: -160 });
    appendLine(-310, -160);
    appendArc(-310, -174, Math.PI / 2, -Math.PI / 2, 14);
    appendLine(-460, -188);
    appendArc(-460, -174, -Math.PI / 2, -Math.PI * 1.5, 14);
  });
  const villagePath = makeCirclePath(128, -12, 46);
  const blackRoadPath = makeRoadLanePath(245, -260, 260);

  const processions = [
    { rath: terrainOrbit, followers: kirtanFollowers, path: templePath, speed: 5, gap: 60, distance: 0 },
  ];

  // The rath stays only on its temple route. Elsewhere we copy just the
  // dancing devotees, so pilgrims meet them moving along other roads.
  const dancingCrowds = [
    { name: 'ghat', path: ghatPath, speed: 4.2, offset: 0 },
    { name: 'village', path: villagePath, speed: 4.6, offset: 60 },
    { name: 'black-road-1', path: blackRoadPath, speed: 4.4, offset: 120, surfaceY: -3.6 },
  ];

  // Eight more dancing crowds far apart on the city's black asphalt streets.
  const extraBlackRoadSegments = [
    { z: -610, x1: -600, x2: -250 },
    { z: -610, x1: 250, x2: 600 },
    { z: -515, x1: -600, x2: -250 },
    { z: -515, x1: 250, x2: 600 },
    { z: 340, x1: -600, x2: -250 },
    { z: 340, x1: 250, x2: 600 },
    { z: 435, x1: -600, x2: -250 },
    { z: 435, x1: 250, x2: 600 },
  ];
  extraBlackRoadSegments.forEach((segment, i) => {
    dancingCrowds.push({
      name: `black-road-${i + 2}`,
      path: makeRoadLanePath(segment.z, segment.x1, segment.x2),
      speed: 4 + (i % 3) * 0.3,
      offset: (i * 95) % 480,
      surfaceY: -3.6,
    });
  });

  if (kirtanFollowers) {
    for (const crowd of dancingCrowds) {
      const followers = kirtanFollowers.clone(true);
      followers.name = `kirtan-followers-${crowd.name}`;
      scene.add(followers);
      processions.push({
        rath: null,
        followers,
        path: crowd.path,
        speed: crowd.speed,
        gap: 0,
        distance: crowd.offset,
        surfaceY: crowd.surfaceY,
      });
    }
  }

  animated.push((dt) => {
    for (const procession of processions) {
      procession.distance = (procession.distance + dt * procession.speed) % procession.path.length;
      const { x, z } = procession.path.pointAt(procession.distance);
      const next = procession.path.pointAt(procession.distance + 1);

      if (procession.rath) {
        procession.rath.position.set(x, groundHeightAt(x, z) + orbitFootOffset + 2, z);
        // This rath's forward axis is local +X, not Three.js's usual +Z.
        procession.rath.rotation.y = Math.atan2(next.x - x, next.z - z) - Math.PI / 2;
      }

      if (procession.followers) {
        const followerDistance = procession.distance + procession.gap;
        const follower = procession.path.pointAt(followerDistance);
        const followerAhead = procession.path.pointAt(followerDistance + 1);
        const dance = procession.distance * 0.9;
        const surface = procession.surfaceY != null
          ? procession.surfaceY
          : groundHeightAt(follower.x, follower.z);
        procession.followers.position.set(
          follower.x,
          surface + followerFootOffset + Math.max(0, Math.sin(dance)) * 0.12,
          follower.z,
        );
        // GLB crowd faces local +Z; keep them moving ahead of the rath.
        procession.followers.rotation.y = Math.atan2(followerAhead.x - follower.x, followerAhead.z - follower.z)
          - THREE.MathUtils.degToRad(60)
          + Math.sin(dance * 0.6) * 0.08;
        procession.followers.rotation.x = Math.sin(dance * 1.3) * 0.035;
        procession.followers.rotation.z = Math.sin(dance * 1.8) * 0.06;
      }
    }
  });
}

const avatar = glbs.find((o) => o.name === 'avatar');
if (avatar) {
  // The avatar may stream in after the walk has started - switch the camera
  // to third person as soon as it arrives.
  if (player) player.state.thirdPerson = true;
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

}

// Progressive loading: the temple loads first so play can start sooner, then
// the remaining models stream in behind the scenes (wired as they arrive).
// Set to false to load every model up front again.
const PROGRESSIVE_LOADING = true;

// Models loaded after the first paint, in priority order. terrain-orbit and
// kirtan-followers go together because the procession needs both.
const DEFERRED_MODEL_GROUPS = [
  ['avatar'],
  ['narshima'],
  ['standin-temple'],
  ['terrain-figure'],
  ['terrain-orbit', 'kirtan-followers'],
];

async function loadDeferredModels(scene, glbs) {
  for (const names of DEFERRED_MODEL_GROUPS) {
    try {
      const loaded = await loadGlbModels({
        scene,
        groundHeightAt,
        names,
        onLog: () => {},
        onProgress: () => {},
      });
      if (!loaded.length) continue;
      glbs.push(...loaded);
      wireGlbModels(scene, loaded);
      console.info('[glb] streamed', names.join(', '));
    } catch (err) {
      console.warn('[glb] deferred load failed:', names.join(', '), err);
    }
  }
}

async function boot() {
  // No popup while loading: the cover art stays visible with just a bar,
  // plus the maha-mantra the player can chant word by word.
  hud.showOverlay(false);
  hud.setButtonEnabled(false);
  setSplashProgress(0, null);
  initMantra();

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
        names: PROGRESSIVE_LOADING ? ['mayapur-temple'] : null,
        onLog: (msg) => glbNotes.push(msg),
        onProgress: ({ item, percent }) => {
          // Size and device-cache details stay silent; caching happens behind
          // the scenes and only the splash loading bar is updated.
          setSplashProgress(percent, item);
        },
      });
  if (liteMode) console.info('[glb] lite mode — model loading skipped');
  else if (glbNotes.length) console.info('[glb]', glbNotes.join('; '));
  else console.info('[glb]', glbHelpText());

  wireGlbModels(scene, glbs);
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
  boat = createBoat({ camera, touchControls });
  scene.add(boat.group);

  arati = createArati({ scene, hud, music: youtubeMusic });
  blessing = createBlessing({ scene, camera });

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
  window.__hill.boat = boat;

  const templeModel = glbs.find((o) => o.name === 'mayapur-temple') || glbs.find((o) => o.name === 'standin-temple');
  const templeBox = templeModel ? new THREE.Box3().setFromObject(templeModel) : null;
  const templeBounds = templeBox && !templeBox.isEmpty()
    ? {
        minX: templeBox.min.x,
        maxX: templeBox.max.x,
        minY: templeBox.min.y,
        minZ: templeBox.min.z,
        maxZ: templeBox.max.z,
        maxY: templeBox.max.y,
      }
    : undefined;

  // Dress the cut entrance passage so the broken edges look intentional.
  buildEntrancePortalLining(scene);
  // Pancha-tattva altar pictures on both hall side walls.
  buildSideAltar(scene, {
    url: '/images/temple-side-altar.webp',
    x: 6.85,
    facing: Math.PI / 2,
    z: 56,
    width: 7.5,
    height: 4.99,
    ledgeLength: 8.2,
  });
  // Portrait covering the concrete block ("tomb") wall by the entrance,
  // visible from the stairs. The block face is ~13.5 x 19.9 m.
  buildSideAltar(scene, {
    url: '/images/front-wall-picture.webp',
    x: 2.75,
    facing: 0,
    z: 77.05,
    width: 6.25,
    height: 12.4,
    bottomY: 35.8,
  });
  // Matching portrait on the right side of the staircase, same size.
  buildSideAltar(scene, {
    url: '/images/front-wall-picture-right.webp',
    x: 32.65,
    facing: 0,
    z: 77.05,
    width: 6.25,
    height: 12.4,
    bottomY: 35.8,
  });
  buildSideAltar(scene, {
    url: '/images/temple-side-altar-right.webp',
    x: 28.55,
    facing: -Math.PI / 2,
    z: 56,
    width: 11.8,
    height: 4.99,
    ledgeLength: 12.5,
  });

  game = createGame({
    scene,
    hud,
    helicopter: env.helicopter,
    drone,
    boat,
    villagePoints: village.userData.positions || [],
    farmPoints: farms.userData.counts ? farms.userData.counts.positions || [] : [],
    temple: templeBounds,
    onBlessing: () => {
      if (blessing) blessing.start();
    },
  });
  window.__hill.game = game;

  hud.setButtonEnabled(true);
  setSplashProgress(100, null);
  hideSplash();
  // The menu appears in forced landscape on phones (no rotate option).
  syncForcedLandscape();
  hud.showOverlay(
    true,
    'ISKCON Mayapur',
    menuBody(),
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
    const isForced = document.body.classList.contains('force-landscape');
    const width = isForced ? window.innerHeight : window.innerWidth;
    const height = isForced ? window.innerWidth : window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    needsRender = true;
  });
  // Size correctly right away, including the forced-landscape case.
  window.dispatchEvent(new Event('resize'));

  // Stream the remaining models in the background (menu/play is already up).
  if (!liteMode && PROGRESSIVE_LOADING) {
    loadDeferredModels(scene, glbs);
  }

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
  resumeAudio();
  env.activateWeather();
  hud.showOverlay(false);
  hud.showHud(true);
  phase = 'playing';

  if (kind === 'drone') {
    player.state.enabled = false;
    boat.pause();
    if (resume && drone.state.started) {
      drone.resume();
    } else {
      drone.activate(droneFlightPlan());
      // Fresh entry: the tutorial shows after the intro when nothing is found.
      tutorialDoneThisEntry = false;
      droneIntroWasActive = true;
    }
    hud.setStatus(DRONE_STATUS);
  } else if (kind === 'boat') {
    player.state.enabled = false;
    drone.pause();
    boat.enter();
    hud.setStatus(BOAT_STATUS);
  } else {
    drone.deactivate();
    boat.pause();
    player.state.enabled = true;
    hud.setStatus(WALK_STATUS);
  }

  if (touchControls) {
    touchControls.setMode(kind === 'boat' ? 'walk' : kind);
    touchControls.setVisible(true);
  }

  if (kind !== 'boat') requestPointerLock(canvas);
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
    duration: 4,
  };
}

function bindTouchClick(el, handler) {
  if (!el) return;
  let lastTime = 0;
  const trigger = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTime < 300) return;
    lastTime = now;
    handler(e);
  };
  el.addEventListener('click', trigger);
  el.addEventListener('touchend', trigger);
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
}

function pause() {
  if (phase !== 'playing') return;
  phase = 'paused';
  needsRender = true;
  player.state.enabled = false;
  // pause() keeps the drone's intro flight so it can continue after resume.
  drone.pause();
  boat.pause();
  if (touchControls) touchControls.setVisible(false);
  const body =
    mode === 'drone'
      ? '<p>The drone is hovering. Tap Resume to keep flying, or Exit to Entrance to change mode.</p>'
      : mode === 'boat'
        ? '<p>The boat waits on the Ganga. Tap Resume to keep riding, or Exit to Entrance to change mode.</p>'
        : '<p>The temple waits. Tap Resume to keep walking, or Exit to Entrance to change mode.</p>';
  hud.showOverlay(true, 'Paused', body, 'Resume', { modeChoice: true, droneButtonText: 'Exit to Entrance' });
}

function returnToEntrance() {
  phase = 'menu';
  needsRender = true;
  player.state.enabled = false;
  // A deliberate exit resets everything: the walk starts fresh from the
  // entrance stairs next time, the drone replays its intro and the boat
  // returns to the ghat.
  player.reset();
  drone.deactivate();
  boat.exit();
  boat.resetToSpawn();
  boatNear = false;
  boatHintShown = false;
  if (hud.showBoatPrompt) hud.showBoatPrompt(false);
  // A deliberate exit to the entrance wipes the gift hunt; pausing and
  // resuming (or switching tabs) keeps all progress.
  if (game) game.reset();
  if (arati) arati.stop();
  if (blessing) blessing.stop();
  // Leaving the game silences everything: kirtan pauses and the WebAudio
  // context is suspended so the rain/thunder ambience stops too.
  youtubeMusic.pause();
  suspendAudio();
  musicNeedsNewTrack = true;
  // On phones, exiting leaves the immersive landscape game mode.
  exitImmersiveMode();
  hud.showHud(false);
  hud.setButtonEnabled(true);
  hud.showOverlay(
    true,
    'ISKCON Mayapur',
    menuBody(),
    'Enter Temple',
    { modeChoice: true, droneButtonText: 'PLAY GAME' },
  );
}

function enterBoat() {
  if (!boat || mode !== 'drone' || phase !== 'playing') return;
  mode = 'boat';
  drone.state.enabled = false;
  boat.enter();
  boatNear = false;
  if (hud.showBoatPrompt) hud.showBoatPrompt(false);
  hud.setStatus(BOAT_STATUS);
  const found = game ? game.state().found : [];
  if (!found.includes('ganga-middle')) {
    hud.setGameHint('🎁 Gift Hunt during the boat ride — a gift floats in the middle of the Ganga, follow the golden light', 11000);
  }
  if (document.pointerLockElement) document.exitPointerLock();
}

function exitBoat() {
  if (mode !== 'boat' || phase !== 'playing') return;
  mode = 'drone';
  boat.exit();
  // The drone returns to exactly where it was parked when boarding, and the
  // boat goes back to its mooring at the ghat.
  boat.resetToSpawn();
  drone.state.velocity.set(0, 0, 0);
  drone.state.enabled = true;
  hud.setStatus(DRONE_STATUS);

  // Desktop: hand the mouse straight back to the camera. The F key press (or
  // button tap) is a user gesture, so the pointer lock request is allowed.
  const desktopPointer = window.matchMedia
    && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (desktopPointer && typeof drone.capturePointer === 'function') {
    const attempt = drone.capturePointer();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(() => {
        hud.setGameHint('Click anywhere to capture the cursor and keep flying', 4500);
      });
    }
  }
}

window.addEventListener('keydown', (e) => {
  if (e.repeat || e.code !== 'KeyF') return;
  if (phase !== 'playing') return;
  if (game && game.isInteracting()) return;
  if (mode === 'boat') {
    exitBoat();
  } else if (mode === 'drone' && boatNear) {
    enterBoat();
  } else if (mode === 'walk' && arati && arati.isNear()) {
    arati.start();
  }
});

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Escape') return;
  if (phase === 'playing' && mode === 'boat') pause();
});

async function enterLandscapeFullscreen() {
  const el = document.documentElement;
  const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
  if (fn && !document.fullscreenElement && !document.webkitFullscreenElement) {
    try {
      await fn.call(el);
    } catch {}
  }
  if (screen.orientation && typeof screen.orientation.lock === 'function') {
    try {
      await screen.orientation.lock('landscape');
    } catch {}
  }
}

function isTouchDevice() {
  return !!(touchControls && touchControls.isTouchDevice)
    || ('ontouchstart' in window)
    || (navigator.maxTouchPoints || 0) > 0;
}

// On phones the game is always landscape. When the device is physically in
// portrait (e.g. iOS has no orientation lock), the body is rotated with CSS so
// the experience stays landscape; rotating the phone removes the rotation.
// The splash stays upright while loading, then the menu appears landscape.
function syncForcedLandscape() {
  if (!isTouchDevice()) return;
  if (phase === 'loading') return;
  const portrait = window.innerHeight > window.innerWidth;
  const forced = document.body.classList.contains('force-landscape');
  if (portrait && !forced) {
    document.body.classList.add('force-landscape');
    setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
  } else if (!portrait && forced) {
    document.body.classList.remove('force-landscape');
    setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
  }
}

// Immersive mode: fullscreen + landscape lock. Phones also go fullscreen
// (the browser's "swipe from the top" toast is system UI and cannot be
// suppressed by the page), with the CSS landscape lock as a fallback for
// devices that refuse fullscreen or orientation lock.
async function enterImmersiveMode() {
  await enterLandscapeFullscreen();
  syncForcedLandscape();
}

function exitImmersiveMode() {
  if (!isTouchDevice()) return;
  const exitFn = document.exitFullscreen
    || document.webkitExitFullscreen
    || document.mozCancelFullScreen
    || document.msExitFullscreen;
  if (exitFn && (document.fullscreenElement || document.webkitFullscreenElement)) {
    try {
      const p = exitFn.call(document);
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {}
  }
  if (screen.orientation && typeof screen.orientation.unlock === 'function') {
    try { screen.orientation.unlock(); } catch {}
  }
  document.body.classList.remove('force-landscape');
  setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
}

function toggleFullscreenMode() {
  const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
  if (!isFull) {
    enterLandscapeFullscreen();
    if (fsBtn) fsBtn.textContent = '✕ Exit';
  } else {
    exitImmersiveMode();
    if (fsBtn) fsBtn.textContent = '⛶ Fullscreen';
  }
}

const fsBtn = document.getElementById('fullscreen-btn');
if (fsBtn) {
  bindTouchClick(fsBtn, () => {
    // On phones this button leaves the game and returns to the entrance
    // screen (fullscreen/landscape are managed automatically). On desktop it
    // keeps toggling fullscreen.
    if (isTouchDevice()) {
      if (phase === 'playing' || phase === 'paused') returnToEntrance();
      return;
    }
    toggleFullscreenMode();
  });
}

function updateFullscreenBtn() {
  if (!fsBtn) return;
  if (isTouchDevice()) {
    fsBtn.textContent = '✕ Exit';
    fsBtn.title = 'Exit to the entrance screen';
    return;
  }
  const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
  fsBtn.textContent = isFull ? '✕ Exit' : '⛶ Fullscreen';
}
document.addEventListener('fullscreenchange', updateFullscreenBtn);
document.addEventListener('webkitfullscreenchange', updateFullscreenBtn);
updateFullscreenBtn();

// Mobile: no rotate option - the experience is always landscape, in
// fullscreen when the browser allows it. Fullscreen needs a user gesture, so
// we keep retrying on proper activation events (click/touchend/pointerup)
// until it succeeds. (iPhone Safari does not support element fullscreen at
// all - there the CSS landscape lock is used.)
window.addEventListener('resize', syncForcedLandscape);
window.addEventListener('orientationchange', syncForcedLandscape);
if (isTouchDevice()) {
  let fullscreenDone = false;
  const activationEvents = ['click', 'touchend', 'pointerup'];
  const stopRetrying = () => {
    activationEvents.forEach((name) => window.removeEventListener(name, tryFullscreen, true));
  };
  const tryFullscreen = () => {
    if (fullscreenDone) return;
    enterLandscapeFullscreen().then(() => {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        fullscreenDone = true;
        stopRetrying();
      }
    });
  };
  activationEvents.forEach((name) => window.addEventListener(name, tryFullscreen, true));
  // Best effort at load; browsers will usually require the first tap.
  enterLandscapeFullscreen();
}

hud.onStart(() => {
  if (phase === 'menu' || phase === 'paused') {
    enterImmersiveMode();
    // After a deliberate exit, start a fresh random track.
    if (musicNeedsNewTrack) {
      musicNeedsNewTrack = false;
      youtubeMusic.requestNewTrack();
    }
    youtubeMusic.play();
    // Enter Temple always starts the walk from the menu; resuming a pause
    // keeps whatever mode was being played.
    startPlay(phase === 'paused' ? mode : 'walk', { resume: phase === 'paused' });
  }
});

hud.onDrone(() => {
  if (phase === 'paused') {
    returnToEntrance();
  } else if (phase === 'menu') {
    enterImmersiveMode();
    if (musicNeedsNewTrack) {
      musicNeedsNewTrack = false;
      youtubeMusic.requestNewTrack();
    }
    youtubeMusic.play();
    startPlay('drone');
  }
});

hud.onArati(() => {
  if (arati) arati.start();
});

hud.onBoatRide(() => {
  if (phase !== 'playing') return;
  if (mode === 'boat') {
    exitBoat();
  } else if (boatNear) {
    enterBoat();
  }
});

document.addEventListener('pointerlockchange', () => {
  if (touchControls && touchControls.isTouchDevice) return;
  // The boat uses a seated camera without pointer lock, so losing the lock
  // there is expected and must not pause the ride.
  if (mode === 'boat') return;
  // The gift hunt releases the cursor on purpose (prompt, question, blessing,
  // tutorial) so the player can click - do not treat that as an Esc pause.
  if (game && game.isInteracting()) return;
  if (tutorialOpen) return;
  if (document.pointerLockElement !== canvas && phase === 'playing') pause();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});

let last = performance.now();
let frameCount = 0;
let needsRender = true;

// One-time tutorial shown after the drone intro on a fresh hunt: point the
// player at the first gift above the temple, then leave them to search.
function showGameTutorial() {
  tutorialOpen = true;
  drone.state.enabled = false;
  drone.state.velocity.set(0, 0, 0);
  if (document.pointerLockElement) document.exitPointerLock();

  hud.showTutorial({
    title: '🎁 Gift Hunt',
    body: `<p>Your first gift floats <b>above the temple roof</b> — fly up, open it and answer the question.</p>
      <p class="note">Then search Mayapur on your own for the rest.</p>`,
    buttonText: 'Got it',
    onClose: () => {
      tutorialOpen = false;
      drone.state.enabled = true;
      const desktopPointer = window.matchMedia
        && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (desktopPointer && typeof drone.capturePointer === 'function') {
        const attempt = drone.capturePointer();
        if (attempt && typeof attempt.catch === 'function') {
          attempt.catch(() => {
            hud.setGameHint('Click anywhere to capture the cursor and keep flying', 4500);
          });
        }
      }
    },
  });
}

function stepSimulation(dt) {
  for (const fn of animated) fn(dt);
  if (env) youtubeMusic.setDuck(env.getStormDuck());

  const droneMode = mode === 'drone' && phase !== 'menu';
  const boatMode = mode === 'boat' && phase !== 'menu';

  if (game) {
    game.update(dt, {
      phase,
      mode,
      dronePos: drone.state.position,
      boatPos: boat ? boat.state.position : null,
    });
  }

  // Boat boarding prompt: only while flying the drone near the moored boat.
  if (boat && hud.showBoatPrompt) {
    if (boatMode) {
      hud.showBoatPrompt(phase === 'playing', 'Leave boat');
    } else {
      const distance = drone.state.position.distanceTo(boat.state.position);
      const near = phase === 'playing' && droneMode && distance < 14;
      boatNear = near;
      hud.showBoatPrompt(near && !(game && game.isInteracting()), 'Ride boat');

      // Announce the boat ride while approaching from the air.
      if (phase === 'playing' && droneMode) {
        if (distance < 80 && !boatHintShown) {
          boatHintShown = true;
          hud.setGameHint('⛵ Boat ride — fly closer and tap to ride the boat on the Ganga', 7000);
        } else if (distance > 110) {
          boatHintShown = false;
        }
      }
    }
  }

  if (arati) {
    arati.update(dt, { phase, mode, playerPos: player.state.position });
  }
  if (blessing) {
    blessing.update(dt);
  }

  if (phase === 'menu') player.state.camYaw += dt * 0.03;

  // The tutorial appears the moment the cinematic drone intro ends, but only
  // on a fresh hunt (no gifts found yet).
  const introActive = !!drone.state.intro;
  if (droneIntroWasActive && !introActive && !tutorialOpen && mode === 'drone' && phase === 'playing') {
    const found = game ? game.state().found : [];
    if (found.length === 0 && !tutorialDoneThisEntry) {
      tutorialDoneThisEntry = true;
      showGameTutorial();
    }
  }
  droneIntroWasActive = introActive;

  if (boatMode) {
    // While paused the boat holds its position on the water.
    if (phase === 'playing') boat.update(dt);
  } else if (droneMode) {
    // While paused the drone holds its hover, so the camera does not snap away.
    if (phase === 'playing') drone.update(dt);
  } else {
    player.update(dt);
  }

  if (shotCam) {
    world.camera.position.copy(shotCam.pos);
    world.camera.lookAt(shotCam.target);
  }
  hud.update(dt, {
    altitude: boatMode ? boat.state.position.y : droneMode ? drone.state.position.y : player.state.position.y,
    walked: droneMode || boatMode ? drone.state.travelled : player.state.walked,
  });
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  frameCount += 1;

  if (phase === 'playing') {
    // Only active play advances the world and draws.
    stepSimulation(dt);
    world.renderer.render(world.scene, world.camera);
  } else if (needsRender) {
    // Pause / entrance screens freeze everything: no updates, no animation.
    // One still frame is drawn so the frozen world stays visible.
    needsRender = false;
    stepSimulation(0);
    world.renderer.render(world.scene, world.camera);
  }

  requestAnimationFrame(frame);
}

boot().catch((err) => {
  console.error(err);
  hideSplash();
  hud.showOverlay(
    true,
    'Could not start',
    `<p>The scene failed to load. Check the console.</p><p class="note">${String(err && err.message ? err.message : err)}</p>`,
    'Reload',
  );
  hud.onStart(() => window.location.reload());
});
