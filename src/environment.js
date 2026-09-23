import * as THREE from 'three';
import { valueNoise2 } from './noise.js';
import { ENTRANCE } from './entrance.js';

const SKY_TOP_DAWN = new THREE.Color(0x4f82be);
const SKY_TOP_DAY = new THREE.Color(0x5690cf);

const SKY_MID_DAWN = new THREE.Color(0xa2c3e5);
const SKY_MID_DAY = new THREE.Color(0xb0d5f2);

const SKY_HORIZON_DAWN = new THREE.Color(0xfde4c8);
const SKY_HORIZON_DAY = new THREE.Color(0xfbf0e2);

const SUN_COLOR_DAWN = new THREE.Color(0xffaa50);
const SUN_COLOR_DAY = new THREE.Color(0xfff6dd);

function makeSkyDome() {
  const geo = new THREE.SphereGeometry(900, 64, 32);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: SKY_TOP_DAWN.clone() },
      midColor: { value: SKY_MID_DAWN.clone() },
      horizonColor: { value: SKY_HORIZON_DAWN.clone() },
      sunPos: { value: new THREE.Vector3(-0.53, 0.16, -0.83).normalize() },
      sunColor: { value: SUN_COLOR_DAWN.clone() },
      lightningFlash: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vViewDir;
      void main() {
        vViewDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 horizonColor;
      uniform vec3 sunPos;
      uniform vec3 sunColor;
      uniform float lightningFlash;
      varying vec3 vViewDir;
      void main() {
        vec3 dir = normalize(vViewDir);
        float h = dir.y;
        float tMid = smoothstep(-0.06, 0.28, h);
        float tTop = smoothstep(0.20, 0.85, h);
        vec3 col = mix(horizonColor, midColor, tMid);
        col = mix(col, topColor, tTop);

        // Radiant sunrise atmospheric glow (centered exactly on the sun direction)
        float cosSun = max(0.0, dot(dir, normalize(sunPos)));
        float sunHalo = pow(cosSun, 6.0) * 0.32 + pow(cosSun, 24.0) * 0.40;
        col += sunColor * sunHalo * smoothstep(-0.08, 0.16, h);
        col += vec3(0.62, 0.72, 0.88) * lightningFlash;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.name = 'sky';
  return mesh;
}

function makeSunDisc() {
  const group = new THREE.Group();
  group.name = 'sun-disc-group';

  // Procedural canvas radial gradient corona texture
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.08, 'rgba(255, 245, 220, 0.98)');
  grad.addColorStop(0.20, 'rgba(255, 200, 110, 0.85)');
  grad.addColorStop(0.38, 'rgba(255, 135, 45, 0.52)');
  grad.addColorStop(0.62, 'rgba(255, 85, 20, 0.20)');
  grad.addColorStop(1.0, 'rgba(255, 50, 10, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, cx, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
  });

  const plane = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), mat);
  plane.frustumCulled = false;
  group.add(plane);
  group.userData.mesh = plane;
  return group;
}

function makeCloudPuffTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.45;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
  grad.addColorStop(0.00, 'rgba(255, 255, 255, 0.90)');
  grad.addColorStop(0.22, 'rgba(255, 255, 255, 0.74)');
  grad.addColorStop(0.48, 'rgba(255, 255, 255, 0.38)');
  grad.addColorStop(0.72, 'rgba(255, 255, 255, 0.12)');
  grad.addColorStop(0.90, 'rgba(255, 255, 255, 0.02)');
  grad.addColorStop(1.00, 'rgba(255, 255, 255, 0.00)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
  ctx.fill();

  // Subtle organic billowy lobes inside to create realistic cloud texture
  const lobes = [
    [-0.20, -0.12, 0.36],
    [0.22, -0.10, 0.38],
    [0.00, -0.22, 0.32],
    [-0.16, 0.16, 0.30],
    [0.16, 0.18, 0.32],
  ];
  for (const [lx, ly, lr] of lobes) {
    const px = cx + lx * maxR;
    const py = cy + ly * maxR;
    const pr = lr * maxR;
    const gLobe = ctx.createRadialGradient(px, py, 0, px, py, pr);
    gLobe.addColorStop(0.0, 'rgba(255, 255, 255, 0.25)');
    gLobe.addColorStop(0.6, 'rgba(255, 255, 255, 0.07)');
    gLobe.addColorStop(1.0, 'rgba(255, 255, 255, 0.00)');
    ctx.fillStyle = gLobe;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeStormClouds() {
  const group = new THREE.Group();
  group.name = 'approaching-storm-clouds';
  const material = new THREE.SpriteMaterial({
    map: makeCloudPuffTexture(),
    color: 0x596875,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: true,
  });
  const configs = [
    { x: -780, y: 150, z: -410, w: 300, h: 92 },
    { x: -620, y: 175, z: -250, w: 350, h: 112 },
    { x: -860, y: 205, z: -90, w: 320, h: 100 },
    { x: -710, y: 135, z: 100, w: 365, h: 108 },
    { x: -530, y: 190, z: 255, w: 330, h: 94 },
    { x: -940, y: 235, z: 315, w: 390, h: 118 },
  ];
  const puffs = [
    [0, 0, 1.0, 0.9], [-0.28, -0.08, 0.78, 0.78], [0.30, -0.10, 0.82, 0.8],
    [-0.13, 0.18, 0.66, 0.74], [0.16, 0.20, 0.64, 0.70],
  ];
  for (const cfg of configs) {
    const cluster = new THREE.Group();
    cluster.position.set(cfg.x, cfg.y, cfg.z);
    cluster.userData.startX = cfg.x;
    cluster.userData.baseY = cfg.y;
    cluster.userData.phase = Math.random() * Math.PI * 2;
    for (const [ox, oy, sw, sh] of puffs) {
      const puff = new THREE.Sprite(material);
      puff.position.set(ox * cfg.w, oy * cfg.h, 0);
      puff.scale.set(cfg.w * sw, cfg.h * sh * 1.7, 1);
      cluster.add(puff);
    }
    group.add(cluster);
  }
  group.userData.material = material;
  group.visible = false;
  return group;
}

function makeClouds() {
  const group = new THREE.Group();
  group.name = 'morning-clouds';

  const puffTex = makeCloudPuffTexture();
  const spriteMat = new THREE.SpriteMaterial({
    map: puffTex,
    color: 0xfff2e6,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
    fog: true,
  });

  const puffOffsets = [
    [0.00,  0.00,  0.00, 0.68, 0.68],
    [-0.30, -0.06, -0.05, 0.54, 0.54],
    [0.32,  -0.08,  0.05, 0.56, 0.56],
    [-0.14,  0.20,  0.03, 0.46, 0.46],
    [0.16,   0.22, -0.04, 0.45, 0.45],
    [-0.45, -0.12,  0.08, 0.40, 0.40],
    [0.46,  -0.10, -0.08, 0.42, 0.42],
    [0.02,   0.26,  0.00, 0.38, 0.38],
    [0.08,  -0.08,  0.10, 0.50, 0.50],
  ];

  const cloudConfigs = [
    { x: -350, y: 240, z: -280, w: 190, h: 62 },
    { x: -120, y: 265, z: -420, w: 230, h: 72 },
    { x: 180,  y: 235, z: -350, w: 200, h: 66 },
    { x: 420,  y: 270, z: -210, w: 220, h: 68 },
    { x: -480, y: 250, z: -80,  w: 240, h: 75 },
    { x: -260, y: 280, z: 120,  w: 210, h: 68 },
    { x: 30,   y: 260, z: 220,  w: 240, h: 74 },
    { x: 320,  y: 245, z: 160,  w: 185, h: 60 },
    { x: 540,  y: 275, z: 20,   w: 210, h: 66 },
    { x: -380, y: 290, z: 340,  w: 220, h: 70 },
    { x: -100, y: 270, z: 460,  w: 200, h: 64 },
    { x: 210,  y: 255, z: 390,  w: 235, h: 72 },
    { x: 480,  y: 285, z: 360,  w: 190, h: 62 },
    { x: -580, y: 260, z: -380, w: 240, h: 74 },
    { x: 80,   y: 310, z: -150, w: 260, h: 80 },
    { x: -220, y: 300, z: -190, w: 215, h: 68 },
  ];

  for (const cfg of cloudConfigs) {
    const cluster = new THREE.Group();
    cluster.position.set(cfg.x, cfg.y, cfg.z);
    cluster.userData.baseY = cfg.y;
    cluster.userData.drift = 1.0 + Math.random() * 0.7;
    cluster.userData.phase = Math.random() * Math.PI * 2;

    for (const [ox, oy, oz, sw, sh] of puffOffsets) {
      const puff = new THREE.Sprite(spriteMat);
      puff.position.set(ox * cfg.w, oy * cfg.h, oz * (cfg.w * 0.6));
      puff.scale.set(cfg.w * sw, cfg.h * sh * 1.8, 1);
      cluster.add(puff);
    }

    group.add(cluster);
  }

  group.userData.material = spriteMat;
  return group;
}

function makeBirdFlock() {
  const masterGroup = new THREE.Group();
  masterGroup.name = 'morning-bird-flocks';

  const birdMat = new THREE.MeshBasicMaterial({ color: 0x2c2522, side: THREE.DoubleSide });

  // 3D Bird Geometry shared across all flocks
  // Forward axis is along -X
  const wingShape = new THREE.Shape();
  wingShape.moveTo(-0.16, 0);
  wingShape.lineTo(-0.06, 1.25);
  wingShape.lineTo(0.18, 1.12);
  wingShape.lineTo(0.24, 0);
  wingShape.closePath();
  const wingGeo = new THREE.ShapeGeometry(wingShape);
  wingGeo.rotateX(-Math.PI / 2); // Rotate into XZ plane: span along +Z, chord along X

  const beakShape = new THREE.Shape();
  beakShape.moveTo(-0.16, 0);
  beakShape.lineTo(-0.54, 0.08);
  beakShape.lineTo(-0.42, 0);
  beakShape.lineTo(-0.54, -0.08);
  beakShape.closePath();
  const beakGeo = new THREE.ShapeGeometry(beakShape);
  beakGeo.rotateX(-Math.PI / 2);

  const tailShape = new THREE.Shape();
  tailShape.moveTo(0.2, 0);
  tailShape.lineTo(0.52, 0.14);
  tailShape.lineTo(0.42, 0);
  tailShape.lineTo(0.52, -0.14);
  tailShape.closePath();
  const tailGeo = new THREE.ShapeGeometry(tailShape);
  tailGeo.rotateX(-Math.PI / 2);

  const bodyGeo = new THREE.SphereGeometry(0.14, 7, 5);

  const birdGeos = { wing: wingGeo, beak: beakGeo, tail: tailGeo, body: bodyGeo };

  function buildFlock({ count, start, end, duration, timeOffset, scale = 1.0, spread = 1.0, name = 'flock' }) {
    const flock = new THREE.Group();
    flock.name = name;

    const D = end.clone().sub(start);
    const dir = D.clone().normalize();
    const heading = Math.atan2(dir.z, -dir.x);
    const pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
    flock.rotation.y = heading;
    flock.rotation.z = -pitch;

    const wings = [];

    for (let i = 0; i < count; i++) {
      const bird = new THREE.Group();
      let ox = 0, oy = 0, oz = 0;

      if (i === 0) {
        ox = 0; oy = 0; oz = 0;
      } else {
        const side = (i % 2 === 1) ? 1 : -1;
        const tier = Math.ceil(i / 2);
        if (i < count * 0.72) {
          // Main V formation
          ox = tier * 1.85 * spread + (Math.sin(i * 1.7) * 0.35);
          oz = side * (tier * 1.25 * spread + (Math.cos(i * 2.3) * 0.3));
          oy = Math.sin(i * 1.4) * 0.45;
        } else {
          // Trailing escort cluster
          const escortIndex = i - Math.floor(count * 0.72);
          ox = (tier * 1.35 + escortIndex * 1.2) * spread;
          oz = ((escortIndex % 2 === 0 ? 0.65 : -0.65) * tier * 0.8) * spread;
          oy = Math.sin(i * 2.7) * 0.6;
        }
      }

      bird.position.set(ox, oy, oz);
      const bScale = (i === 0 ? 1.2 : 0.82 + (i % 5) * 0.08) * scale;
      bird.scale.setScalar(bScale);

      // Body
      const body = new THREE.Mesh(birdGeos.body, birdMat);
      body.scale.set(1.8, 0.55, 0.55);
      bird.add(body);

      // Beak
      bird.add(new THREE.Mesh(birdGeos.beak, birdMat));

      // Tail
      bird.add(new THREE.Mesh(birdGeos.tail, birdMat));

      // Left wing
      const leftWing = new THREE.Mesh(birdGeos.wing, birdMat);
      leftWing.position.set(0, 0.02, 0.08);
      bird.add(leftWing);

      // Right wing
      const rightWing = new THREE.Mesh(birdGeos.wing, birdMat);
      rightWing.position.set(0, 0.02, -0.08);
      rightWing.scale.z = -1;
      bird.add(rightWing);

      flock.add(bird);
      wings.push({
        left: leftWing,
        right: rightWing,
        phase: i * 0.72 + (i % 3) * 0.5,
        rate: 8.0 + (i % 4) * 0.6,
        bird,
        baseY: oy,
      });
    }

    flock.userData = {
      start,
      end,
      duration,
      timeOffset,
      wings,
      update: (elapsed) => {
        const t = ((elapsed + timeOffset) % duration) / duration;
        flock.position.lerpVectors(start, end, t);

        for (let j = 0; j < wings.length; j++) {
          const w = wings[j];
          const flap = Math.sin(elapsed * w.rate + w.phase) * 0.52;
          w.left.rotation.x = flap;
          w.right.rotation.x = -flap;
          w.bird.position.y = w.baseY + Math.sin(elapsed * w.rate * 0.5 + w.phase) * 0.08;
        }
      },
    };

    return flock;
  }

  const flocks = [
    // 1. Temple Overflight (Dense 46-bird flock soaring directly over Mayapur Temple)
    buildFlock({
      name: 'temple-flock',
      count: 46,
      start: new THREE.Vector3(380, 106, 72),
      end: new THREE.Vector3(-380, 98, 48),
      duration: 32,
      timeOffset: 0,
      scale: 1.05,
      spread: 1.1,
    }),

    // 2. Ganges River & Ghat Patrol (40 birds skimming low over the river & bathing ghat)
    buildFlock({
      name: 'river-flock',
      count: 40,
      start: new THREE.Vector3(-550, 48, -330),
      end: new THREE.Vector3(550, 44, -370),
      duration: 36,
      timeOffset: 12,
      scale: 0.95,
      spread: 0.95,
    }),

    // 3. Sunrise Ridge Arc (42 birds sweeping from sunrise across Govardhan Hill)
    buildFlock({
      name: 'ridge-flock',
      count: 42,
      start: new THREE.Vector3(-360, 84, -180),
      end: new THREE.Vector3(360, 78, 220),
      duration: 30,
      timeOffset: 6,
      scale: 1.0,
      spread: 1.05,
    }),

    // 4. Village, Gurukul & Farm Crossers (36 birds over the huts, fields & gurukul)
    buildFlock({
      name: 'village-flock',
      count: 36,
      start: new THREE.Vector3(320, 58, 180),
      end: new THREE.Vector3(-340, 52, 20),
      duration: 27,
      timeOffset: 19,
      scale: 0.9,
      spread: 0.9,
    }),

    // 5. High Morning Thermals (32 birds soaring in the upper golden morning atmosphere)
    buildFlock({
      name: 'high-thermal-flock',
      count: 32,
      start: new THREE.Vector3(-460, 165, 140),
      end: new THREE.Vector3(460, 172, -90),
      duration: 42,
      timeOffset: 25,
      scale: 1.1,
      spread: 1.25,
    }),
  ];

  for (const f of flocks) {
    masterGroup.add(f);
  }

  masterGroup.userData.elapsed = 0;
  masterGroup.userData.update = (dt) => {
    masterGroup.userData.elapsed += dt;
    const elapsed = masterGroup.userData.elapsed;
    for (let k = 0; k < flocks.length; k++) {
      flocks[k].userData.update(elapsed);
    }
  };

  return masterGroup;
}

const RAIN = {
  count: 2400,
  area: 70,
  top: 62,
  bottom: -20,
  windX: 2.4,
  windZ: 1.1,
};

function makeRain() {
  const { count, area, top, bottom, windX, windZ } = RAIN;
  const positions = new Float32Array(count * 2 * 3);
  const colors = new Float32Array(count * 2 * 3);
  const drops = new Array(count);

  for (let i = 0; i < count; i++) {
    const speed = 26 + Math.random() * 22;
    drops[i] = {
      x: (Math.random() * 2 - 1) * area,
      y: bottom + Math.random() * (top - bottom),
      z: (Math.random() * 2 - 1) * area,
      speed,
      length: 0.045 * speed * (0.7 + Math.random() * 0.7),
    };

    const tint = 0.62 + Math.random() * 0.38;
    for (let end = 0; end < 2; end++) {
      const vi = (i * 2 + end) * 3;
      colors[vi] = 0.68 * tint;
      colors[vi + 1] = 0.77 * tint;
      colors[vi + 2] = 0.86 * tint;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    fog: true,
  });

  const lines = new THREE.LineSegments(geometry, material);
  lines.name = 'rain';
  lines.frustumCulled = false;
  lines.userData.drops = drops;
  lines.userData.wind = new THREE.Vector3(windX, 0, windZ);
  return lines;
}

function stepRain(rain, dt) {
  const { drops } = rain.userData;
  const { windX, windZ } = RAIN;
  const area = RAIN.area;
  const positions = rain.geometry.attributes.position.array;

  for (let i = 0; i < drops.length; i++) {
    const d = drops[i];
    d.x += windX * dt;
    d.y -= d.speed * dt;
    d.z += windZ * dt;

    if (d.y < RAIN.bottom) {
      d.y = RAIN.top - Math.random() * 4;
      d.x = (Math.random() * 2 - 1) * area;
      d.z = (Math.random() * 2 - 1) * area;
    }
    if (d.x > area) d.x -= area * 2;
    else if (d.x < -area) d.x += area * 2;
    if (d.z > area) d.z -= area * 2;
    else if (d.z < -area) d.z += area * 2;

    const slant = d.length / Math.max(1e-4, Math.hypot(windX, d.speed, windZ));
    const tailX = d.x - windX * slant;
    const tailY = d.y + d.speed * slant;
    const tailZ = d.z - windZ * slant;

    const head = i * 6;
    positions[head] = d.x;
    positions[head + 1] = d.y;
    positions[head + 2] = d.z;
    positions[head + 3] = tailX;
    positions[head + 4] = tailY;
    positions[head + 5] = tailZ;
  }

  rain.geometry.attributes.position.needsUpdate = true;
}

function makeGroundPlane() {
  const geo = new THREE.CircleGeometry(1200, 64);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x6f8a4a,
    roughness: 1,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = -3.7;
  mesh.receiveShadow = true;
  mesh.name = 'far-ground';
  return mesh;
}

function makeHelicopter() {
  const root = new THREE.Group();
  root.name = 'helicopter';

  const body = new THREE.Group();
  root.add(body);

  const paint = new THREE.MeshStandardMaterial({ color: 0x35566b, roughness: 0.45, metalness: 0.35 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xe8edf0, roughness: 0.5, metalness: 0.1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1e2b33, roughness: 0.7, metalness: 0.2 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0xa9d7ea,
    roughness: 0.12,
    metalness: 0.45,
    transparent: true,
    opacity: 0.72,
  });

  // Cabin and cockpit glass, nose pointing along +Z.
  const cabin = new THREE.Mesh(new THREE.CapsuleGeometry(1.45, 3.6, 6, 14), paint);
  cabin.rotation.x = Math.PI / 2;
  body.add(cabin);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 12), glass);
  canopy.position.set(0, 0.1, 2.5);
  canopy.scale.set(1, 0.9, 1.12);
  body.add(canopy);

  const belly = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.3, 5.2), trim);
  belly.position.set(0, -0.95, 0.2);
  body.add(belly);

  // Tail boom, stabilisers and tail rotor.
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 7.2, 10), paint);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 0.25, -6.6);
  body.add(boom);

  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.9, 1.5), paint);
  fin.position.set(0, 0.95, -10.1);
  body.add(fin);

  const tailPlane = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.14, 0.9), trim);
  tailPlane.position.set(0, 0.35, -9.6);
  body.add(tailPlane);

  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.32, 1.05, -10.2);
  tailRotor.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.0, 0.16), dark));
  tailRotor.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 2.0), dark));
  body.add(tailRotor);

  // Mast and four-blade main rotor.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.9, 8), dark);
  mast.position.set(0, 2.35, 0.1);
  body.add(mast);

  const mainRotor = new THREE.Group();
  mainRotor.position.set(0, 2.75, 0.1);
  mainRotor.add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10), dark));
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.07, 0.4), dark);
    blade.position.set(Math.cos(a) * 3.6, 0, -Math.sin(a) * 3.6);
    blade.rotation.y = a;
    mainRotor.add(blade);
  }
  body.add(mainRotor);

  // Landing skids.
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 5.4), dark);
    rail.position.set(side * 1.35, -2.25, 0.2);
    body.add(rail);
    for (const z of [-1.7, 1.7]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), dark);
      strut.position.set(side * 1.35, -1.75, z);
      strut.rotation.z = side * -0.18;
      body.add(strut);
    }
  }

  root.userData = {
    body,
    mainRotor,
    tailRotor,
    mode: 'waiting',
    timer: 10 + Math.random() * 20,
    progress: 0,
    speed: 0,
    distance: 1,
    start: new THREE.Vector3(),
    end: new THREE.Vector3(),
  };
  return root;
}

function updateHelicopter(helicopter, dt, elapsed) {
  const h = helicopter.userData;
  h.mainRotor.rotation.y += dt * 26;
  h.tailRotor.rotation.x += dt * 44;

  if (h.mode === 'waiting') {
    h.timer -= dt;
    if (h.timer > 0) return;

    // A random crossing: either direction, random altitude, lane and drift.
    const dir = Math.random() < 0.5 ? 1 : -1;
    const y = 92 + Math.random() * 58;
    const z = -260 + Math.random() * 440;
    h.start.set(-dir * 680, y, z);
    h.end.set(dir * 680, y + (Math.random() * 2 - 1) * 24, z + (Math.random() * 2 - 1) * 70);
    h.distance = Math.max(1, h.start.distanceTo(h.end));
    h.speed = 32 + Math.random() * 14;
    h.progress = 0;
    h.mode = 'flying';
    helicopter.position.copy(h.start);
    helicopter.lookAt(h.end);
    helicopter.visible = true;
    return;
  }

  h.progress += (h.speed * dt) / h.distance;
  if (h.progress >= 1) {
    h.mode = 'waiting';
    h.timer = 35 + Math.random() * 55;
    helicopter.visible = false;
    return;
  }

  helicopter.position.lerpVectors(h.start, h.end, h.progress);
  h.body.position.y = Math.sin(elapsed * 1.4) * 0.5;
  h.body.rotation.z = Math.sin(elapsed * 1.1) * 0.055;
  h.body.rotation.x = Math.sin(elapsed * 0.8 + 1.7) * 0.03;
}


const RIVER = {
  startX: -1300,
  endX: 1300,
  z: -355,
  halfWidth: 125,
  // Well clear of the far-ground plane (-3.7) so the water never z-fights.
  y: -3.42,
};

function smoothstepLocal(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

let thunderContext = null;
let rainAudio = null;
let lastRainAudioLevel = -1;

function armThunder() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!thunderContext) thunderContext = new AudioContext();
  if (thunderContext.state === 'suspended') thunderContext.resume().catch(() => {});
  return thunderContext;
}

function playThunder({ volume = 0.36, cutoff = 460, duration = 2.2, decay = 1.5, crack = 0.55 } = {}) {
  const audio = armThunder();
  if (!audio) return;
  const now = audio.currentTime;

  // Low rumble body.
  const buffer = audio.createBuffer(1, audio.sampleRate * duration, audio.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) {
    const t = i / audio.sampleRate;
    samples[i] = (Math.random() * 2 - 1) * Math.exp(-t * decay);
  }
  const noise = audio.createBufferSource();
  noise.buffer = buffer;
  const lowpass = audio.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(cutoff, now);
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  noise.connect(lowpass).connect(gain).connect(audio.destination);
  noise.start(now);
  noise.stop(now + duration + 0.05);

  // Sharp mid-frequency crack so thunder cuts through on small speakers.
  if (crack > 0) {
    const crackDuration = 0.55;
    const crackBuffer = audio.createBuffer(1, audio.sampleRate * crackDuration, audio.sampleRate);
    const crackSamples = crackBuffer.getChannelData(0);
    for (let i = 0; i < crackSamples.length; i++) {
      const t = i / audio.sampleRate;
      crackSamples[i] = (Math.random() * 2 - 1) * Math.exp(-t * 20);
    }
    const crackSource = audio.createBufferSource();
    crackSource.buffer = crackBuffer;
    const bandpass = audio.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1500, now);
    bandpass.Q.value = 0.7;
    const crackGain = audio.createGain();
    crackGain.gain.setValueAtTime(0.0001, now);
    crackGain.gain.exponentialRampToValueAtTime(volume * crack, now + 0.012);
    crackGain.gain.exponentialRampToValueAtTime(0.0001, now + crackDuration);
    crackSource.connect(bandpass).connect(crackGain).connect(audio.destination);
    crackSource.start(now);
    crackSource.stop(now + crackDuration);
  }
}

// Steady rain hiss: looping filtered noise whose gain follows the rain amount.
function makeRainLoop(audio) {
  const length = Math.floor(audio.sampleRate * 4);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const samples = buffer.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < length; i++) {
    brown = (brown + 0.04 * (Math.random() * 2 - 1)) / 1.04;
    samples[i] = brown * 3.4;
  }
  // Crossfade the tail into the head so the loop point is inaudible.
  const fade = Math.floor(audio.sampleRate * 0.05);
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    const tail = length - fade + i;
    samples[tail] = samples[tail] * (1 - t) + samples[i] * t;
  }

  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const highpass = audio.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 420;
  const lowpass = audio.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 5200;

  const gain = audio.createGain();
  gain.gain.value = 0;

  source.connect(highpass).connect(lowpass).connect(gain).connect(audio.destination);
  source.start();
  return { source, gain };
}

function armRainAudio() {
  const audio = armThunder();
  if (!audio || rainAudio) return;
  rainAudio = makeRainLoop(audio);
}

function setRainAudioLevel(amount) {
  if (!rainAudio) return;
  if (Math.abs(amount - lastRainAudioLevel) < 0.01) return;
  lastRainAudioLevel = amount;
  const gain = rainAudio.gain.gain;
  gain.setTargetAtTime(amount * 0.075, rainAudio.source.context.currentTime, 0.8);
}

// Centre line: dead straight, running left to right past the city.
function riverPath(t) {
  return { x: RIVER.startX + (RIVER.endX - RIVER.startX) * t, z: RIVER.z };
}

// Anchor on the near bank, facing the water - used to seat the ghat.
export function riverBankAnchor(t) {
  const c = riverPath(t);
  const c2 = riverPath(Math.min(1, t + 0.01));
  const tx = c2.x - c.x;
  const tz = c2.z - c.z;
  const len = Math.hypot(tx, tz) || 1;
  const nx = -tz / len;
  const nz = tx / len;
  const offset = RIVER.halfWidth + 12;
  return {
    x: c.x + nx * offset,
    z: c.z + nz * offset,
    yaw: Math.atan2(nx, nz),
    y: RIVER.y + 0.1,
  };
}

function buildRiverRibbon({ offset, halfWidth, y, segments = 72, crossSegments = 1 }) {
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const c = riverPath(t);
    const c2 = riverPath(Math.min(1, t + 1 / segments));
    const tx = c2.x - c.x;
    const tz = c2.z - c.z;
    const len = Math.hypot(tx, tz) || 1;
    const nx = -tz / len;
    const nz = tx / len;
    const cx = c.x + nx * offset;
    const cz = c.z + nz * offset;

    for (let j = 0; j <= crossSegments; j++) {
      const across = j / crossSegments;
      const side = halfWidth * (1 - 2 * across);
      positions.push(cx + nx * side, y, cz + nz * side);
      uvs.push(across, t * 7);
    }

    if (i < segments) {
      for (let j = 0; j < crossSegments; j++) {
        const a = i * (crossSegments + 1) + j;
        const b = a + crossSegments + 1;
        // Wound so the surface faces up.
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function makeWaterTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  const data = image.data;
  for (let i = 0; i < size * size; i++) {
    const x = i % size;
    const y = (i / size) | 0;
    const v = 104 + valueNoise2(x * 0.26, y * 0.26) * 96;
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeRiverBoat(length, width, woodColor, seatColor) {
  const boat = new THREE.Group();
  boat.name = 'wooden-river-boat';

  const hullShape = new THREE.Shape();
  hullShape.moveTo(-length * 0.52, 0);
  hullShape.quadraticCurveTo(-length * 0.42, -width * 0.48, -length * 0.15, -width * 0.5);
  hullShape.quadraticCurveTo(length * 0.18, -width * 0.42, length * 0.43, -width * 0.24);
  hullShape.lineTo(length * 0.52, 0);
  hullShape.quadraticCurveTo(length * 0.43, width * 0.24, length * 0.18, width * 0.42);
  hullShape.quadraticCurveTo(-length * 0.15, width * 0.5, -length * 0.42, width * 0.48);
  hullShape.closePath();

  const hullGeometry = new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.28,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.08,
    bevelThickness: 0.08,
  });
  hullGeometry.rotateX(Math.PI / 2);
  const hull = new THREE.Mesh(hullGeometry, new THREE.MeshStandardMaterial({
    color: woodColor,
    roughness: 0.72,
    metalness: 0.02,
  }));
  hull.position.y = 0;
  hull.castShadow = true;
  hull.receiveShadow = true;
  boat.add(hull);

  const interior = new THREE.Mesh(
    new THREE.BoxGeometry(length * 0.61, 0.08, width * 0.47),
    new THREE.MeshStandardMaterial({ color: 0x4a3023, roughness: 0.9 }),
  );
  interior.position.set(-length * 0.015, 0.06, 0);
  boat.add(interior);

  const seatMaterial = new THREE.MeshStandardMaterial({ color: seatColor, roughness: 0.8 });
  for (const x of [-length * 0.23, length * 0.02, length * 0.25]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(width * 0.68, 0.10, 0.14), seatMaterial);
    seat.position.set(x, 0.15, 0);
    seat.castShadow = true;
    boat.add(seat);
  }

  const oarMaterial = new THREE.MeshStandardMaterial({ color: 0x755239, roughness: 0.8 });
  for (const side of [-1, 1]) {
    const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, length * 0.36, 6), oarMaterial);
    oar.rotation.z = Math.PI / 2;
    oar.rotation.y = side * -0.42;
    oar.position.set(length * 0.06, 0.13, side * width * 0.72);
    boat.add(oar);
  }

  boat.userData.bobPhase = Math.random() * Math.PI * 2;
  boat.userData.length = length;
  return boat;
}

function makeCruiseShip() {
  const ship = new THREE.Group();
  ship.name = 'ganga-cruise-ship';

  const white = new THREE.MeshStandardMaterial({ color: 0xe8edf0, roughness: 0.55, metalness: 0.05 });
  const red = new THREE.MeshStandardMaterial({ color: 0xb63f35, roughness: 0.72 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x315c74, roughness: 0.18, metalness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x26343d, roughness: 0.78 });

  const addBox = (size, position, material, cast = true) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    ship.add(mesh);
    return mesh;
  };

  // Hull and red waterline, with a tall stepped hotel superstructure.
  addBox([118, 7, 24], [0, 3.5, 0], white);
  addBox([116, 1.5, 24.4], [0, 1.0, 0], red);
  const decks = [
    [98, 8.5, 20.5], [94, 17.5, 19.5], [90, 26.5, 18.5], [86, 35.5, 17.5],
    [80, 44.5, 16.5], [72, 53.5, 15.5], [62, 62.5, 14.5], [50, 71.5, 13.5],
  ];
  for (const [length, y, width] of decks) addBox([length, 8, width], [0, y, 0], white);
  addBox([39, 8, 12], [0, 80.5, 0], white);
  addBox([24, 7, 10], [4, 88, 0], glass);
  addBox([12, 5, 8], [10, 94, 0], white);
  addBox([8, 4, 6], [7, 96, 0], dark);

  // Continuous blue window bands make the ship read clearly at a distance.
  for (let deck = 0; deck < 8; deck++) {
    const y = 9 + deck * 9;
    const width = 20 - deck * 0.8;
    addBox([82 - deck * 5, 1.1, 0.18], [0, y, width / 2 + 0.12], glass, false);
    addBox([82 - deck * 5, 1.1, 0.18], [0, y, -width / 2 - 0.12], glass, false);
  }
  addBox([34, 1.2, 0.2], [0, 81, 6.2], glass, false);
  addBox([34, 1.2, 0.2], [0, 81, -6.2], glass, false);

  // Twin funnels and a small mast.
  for (const x of [-8, 7]) {
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 12, 12), red);
    funnel.position.set(x, 91, 0);
    funnel.castShadow = true;
    ship.add(funnel);
    addBox([3.2, 2.2, 4.2], [x, 97.5, 0], dark);
  }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 8, 8), dark);
  mast.position.set(16, 96, 0);
  mast.castShadow = true;
  ship.add(mast);

  // Half-size floating ISKCON MAYAPUR flag, attached to the ship itself.
  const flagCanvas = document.createElement('canvas');
  flagCanvas.width = 1024;
  flagCanvas.height = 256;
  const flagCtx = flagCanvas.getContext('2d');
  flagCtx.fillStyle = '#e2a33a';
  flagCtx.fillRect(0, 0, flagCanvas.width, flagCanvas.height);
  flagCtx.strokeStyle = '#7c2e22';
  flagCtx.lineWidth = 14;
  flagCtx.strokeRect(8, 8, flagCanvas.width - 16, flagCanvas.height - 16);
  flagCtx.fillStyle = '#6e241d';
  flagCtx.font = 'bold 82px Georgia, serif';
  flagCtx.textAlign = 'center';
  flagCtx.textBaseline = 'middle';
  flagCtx.fillText('ISKCON MAYAPUR', flagCanvas.width / 2, flagCanvas.height / 2 + 4);
  const flagTexture = new THREE.CanvasTexture(flagCanvas);
  flagTexture.colorSpace = THREE.SRGBColorSpace;
  const flagWidth = 42;
  const flagHeight = 12;
  const flagGeometry = new THREE.PlaneGeometry(flagWidth, flagHeight, 24, 8);
  const flagPositions = flagGeometry.attributes.position;
  const flagVertices = [];
  for (let i = 0; i < flagPositions.count; i++) {
    const x = flagPositions.getX(i) + flagWidth / 2;
    const y = flagPositions.getY(i);
    flagVertices.push({ x, y });
    flagPositions.setX(i, x);
  }
  const flag = new THREE.Mesh(
    flagGeometry,
    new THREE.MeshStandardMaterial({ map: flagTexture, side: THREE.DoubleSide, roughness: 0.8 }),
  );
  // The lower edge touches the ship's 100 m superstructure height.
  flag.position.set(-20, 100 + flagHeight / 2, 0);
  flag.castShadow = true;
  ship.add(flag);
  ship.userData.flag = { geometry: flagGeometry, positions: flagPositions, vertices: flagVertices, elapsed: 0 };

  ship.userData.bobPhase = Math.random() * Math.PI * 2;
  // Near Ganga lane, visually behind the temple.
  ship.userData.progress = 0.44;
  ship.userData.minProgress = 0.43;
  ship.userData.maxProgress = 0.57;
  ship.userData.direction = 1;
  ship.userData.speed = 25;
  ship.userData.laneZ = 104;
  return ship;
}

// The Ganga: a broad curving band of water with pale sand banks.
function makeRiver() {
  const group = new THREE.Group();
  group.name = 'river';

  const waterTex = makeWaterTexture();
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x47798d,
    roughness: 0.26,
    metalness: 0.08,
    bumpMap: waterTex,
    bumpScale: 0.34,
    clearcoat: 0.28,
    clearcoatRoughness: 0.24,
    fog: true,
  });

  const water = new THREE.Mesh(
    buildRiverRibbon({ offset: 0, halfWidth: RIVER.halfWidth, y: RIVER.y, segments: 260, crossSegments: 18 }),
    waterMat,
  );
  water.name = 'ganga-water-surface';
  water.receiveShadow = true;
  group.add(water);

  const bankMat = new THREE.MeshStandardMaterial({ color: 0xdcc79c, roughness: 1, metalness: 0 });
  for (const side of [-1, 1]) {
    const bank = new THREE.Mesh(
      buildRiverRibbon({
        offset: side * (RIVER.halfWidth + 14),
        halfWidth: 14,
        y: RIVER.y + 0.1,
      }),
      bankMat,
    );
    group.add(bank);
  }

  const boats = [
    // A slower passenger launch in the deep-water lane.
    { t: 0.24, speed: 1.15, z: -72, length: 40, width: 8.6, color: 0x6b432d, seat: 0xc29a63 },
    { t: 0.37, speed: 2.7, z: -28, length: 30, width: 6.6, color: 0x805537, seat: 0xb18a5c },
    { t: 0.52, speed: 2.1, z: 16, length: 26, width: 5.8, color: 0x64452f, seat: 0x9a7751 },
    { t: 0.68, speed: 3.0, z: 44, length: 28, width: 6.2, color: 0x8b6040, seat: 0xb18a5c },
  ].map((config) => {
    const boat = makeRiverBoat(config.length, config.width, config.color, config.seat);
    boat.userData.progress = config.t;
    boat.userData.speed = config.speed;
    boat.userData.laneZ = config.z;
    group.add(boat);
    return boat;
  });
  const cruiseShip = makeCruiseShip();
  group.add(cruiseShip);

  let elapsed = 0;
  group.userData.waterTex = waterTex;
  group.userData.water = water;
  group.userData.boats = boats;
  group.userData.update = (dt) => {
    elapsed += dt;
    waterTex.offset.x = (waterTex.offset.x + dt * 0.008) % 1;
    waterTex.offset.y = (waterTex.offset.y + dt * 0.0025) % 1;

    const positions = water.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const ripple = Math.sin(x * 0.032 + z * 0.018 + elapsed * 1.25) * 0.045
        + Math.sin(x * 0.014 - z * 0.037 - elapsed * 0.82) * 0.035;
      positions.setY(i, RIVER.y + ripple);
    }
    positions.needsUpdate = true;
    water.geometry.computeVertexNormals();

    for (const boat of boats) {
      boat.userData.progress += boat.userData.speed * dt / (RIVER.endX - RIVER.startX);
      if (boat.userData.progress > 1.04) boat.userData.progress = -0.04;
      const point = riverPath(boat.userData.progress);
      boat.position.set(point.x, RIVER.y + 0.12 + Math.sin(elapsed * 1.25 + boat.userData.bobPhase) * 0.035, point.z + boat.userData.laneZ);
      boat.rotation.y = Math.sin(elapsed * 0.42 + boat.userData.bobPhase) * 0.025;
    }
    cruiseShip.userData.progress += cruiseShip.userData.direction
      * cruiseShip.userData.speed * dt / (RIVER.endX - RIVER.startX);
    if (cruiseShip.userData.progress >= cruiseShip.userData.maxProgress) {
      cruiseShip.userData.progress = cruiseShip.userData.maxProgress;
      cruiseShip.userData.direction = -1;
    } else if (cruiseShip.userData.progress <= cruiseShip.userData.minProgress) {
      cruiseShip.userData.progress = cruiseShip.userData.minProgress;
      cruiseShip.userData.direction = 1;
    }
    const shipPoint = riverPath(cruiseShip.userData.progress);
    cruiseShip.position.set(
      shipPoint.x,
      RIVER.y + Math.sin(elapsed * 0.8 + cruiseShip.userData.bobPhase) * 0.04,
      shipPoint.z + cruiseShip.userData.laneZ,
    );
    cruiseShip.rotation.y = cruiseShip.userData.direction < 0 ? Math.PI : 0;
    cruiseShip.rotation.z = Math.sin(elapsed * 0.25 + cruiseShip.userData.bobPhase) * 0.012;
  };
  return group;
}

export function createEnvironment({ scene }) {
  // Bright morning atmosphere
  scene.background = SKY_HORIZON_DAWN.clone();
  scene.fog = new THREE.FogExp2(0xf4e8db, 0.00045);

  const sky = makeSkyDome();
  scene.add(sky);

  const sunDisc = makeSunDisc();
  scene.add(sunDisc);

  const clouds = makeClouds();
  scene.add(clouds);
  const cloudMat = clouds.userData.material || clouds.children[0]?.material;
  if (cloudMat) cloudMat.color.set(0xfff0e4);

  const stormClouds = makeStormClouds();
  scene.add(stormClouds);

  const birds = makeBirdFlock();
  scene.add(birds);

  const helicopter = makeHelicopter();
  helicopter.visible = false;
  scene.add(helicopter);

  const rain = makeRain();
  // Clear, peaceful morning sunrise: rain is invisible (clear sky dawn)
  rain.material.opacity = 0.0;
  scene.add(rain);

  const farGround = makeGroundPlane();
  scene.add(farGround);

  const river = makeRiver();
  scene.add(river);

  // Radiant Golden Morning Sun Light
  const sun = new THREE.DirectionalLight(0xffbe7a, 2.50);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  const half = 110;
  sun.shadow.camera.left = -half;
  sun.shadow.camera.right = half;
  sun.shadow.camera.top = half;
  sun.shadow.camera.bottom = -half;
  sun.shadow.camera.near = 15;
  sun.shadow.camera.far = 380;
  sun.shadow.camera.updateProjectionMatrix();
  sun.target.position.set(0, 10, 0);
  scene.add(sun, sun.target);

  // Bright morning ambient hemisphere light (sky blue + golden ground reflection)
  const hemi = new THREE.HemisphereLight(0xcde2f8, 0x998870, 1.20);
  scene.add(hemi);

  // Warm golden ground bounce light (placed on the right (+X) to fill shadows from the left sun)
  const bounce = new THREE.DirectionalLight(0xffdfb8, 0.65);
  bounce.position.set(70, 35, 40);
  scene.add(bounce);

  const lightningLight = new THREE.PointLight(0xcbdfff, 0, 320, 2);
  lightningLight.name = 'storm-lightning-flash';
  scene.add(lightningLight);

  // Sunrise state: starts at 9.0 deg (clear, bright morning sun visible on the LEFT)
  // Rises slowly over time: ~0.045 deg/sec (~2.7 deg/minute)
  let sunElapsed = 0;
  const startsStormy = Math.random() < 0.35;
  let weatherEnabled = false;
  let stormTarget = startsStormy ? 1 : 0;
  let stormLevel = stormTarget;
  let weatherPhaseElapsed = 0;
  let weatherPhaseDuration = startsStormy ? 26 + Math.random() * 14 : 28 + Math.random() * 10;
  let thunderPlayed = !startsStormy;
  let thunderTimer = 3 + Math.random() * 4;
  let stormDuck = 0;
  let lightningStartedAt = -Infinity;
  // Azimuth: 32 deg to the left of the forward view towards the temple (-Z)
  const azimuthRad = THREE.MathUtils.degToRad(32);
  const cosAz = Math.cos(azimuthRad);
  const sinAz = Math.sin(azimuthRad);

  const colDawn = new THREE.Color(0xffb266);
  const colGold = new THREE.Color(0xffd690);
  const colMorn = new THREE.Color(0xfffaea);
  const currentSunColor = new THREE.Color();

  const fogDawn = new THREE.Color(0xf4e8db);
  const fogDay = new THREE.Color(0xebf2f8);

  const hemiSkyDawn = new THREE.Color(0xcde2f8);
  const hemiSkyDay = new THREE.Color(0xdceeff);
  const hemiGndDawn = new THREE.Color(0x998870);
  const hemiGndDay = new THREE.Color(0x889872);

  const cloudDawn = new THREE.Color(0xfff0e4);
  const cloudDay = new THREE.Color(0xf4f8fc);
  const stormCloudTint = new THREE.Color(0x8995a0);
  const stormFog = new THREE.Color(0x9da7b0);
  const stormSkyTop = new THREE.Color(0x4e6b82);
  const stormSkyMid = new THREE.Color(0x8398a8);
  const stormSkyHorizon = new THREE.Color(0xb0b9bf);
  const stormCloudMat = stormClouds.userData.material;

  function activateWeather() {
    if (weatherEnabled) return;
    weatherEnabled = true;
    // Initialise audio during the Walk/Drone button gesture so thunder and
    // rain can play later when the automatic storm reaches the scene.
    armThunder();
    armRainAudio();
  }

  function update(dt, camera = null) {
    sunElapsed += dt;
    birds.userData.update(dt);
    updateHelicopter(helicopter, dt, sunElapsed);

    // Every session begins in either clear or wet weather. It then alternates
    // on a slightly random cadence: clear skies typically last about 30 sec.
    if (weatherEnabled) {
      weatherPhaseElapsed += dt;
      if (weatherPhaseElapsed >= weatherPhaseDuration) {
        weatherPhaseElapsed = 0;
        stormTarget = stormTarget ? 0 : 1;
        weatherPhaseDuration = stormTarget ? 26 + Math.random() * 16 : 28 + Math.random() * 10;
        if (stormTarget) {
          thunderPlayed = false;
          thunderTimer = 3 + Math.random() * 4;
          lightningStartedAt = -Infinity;
        }
      }
      stormLevel = THREE.MathUtils.damp(stormLevel, stormTarget, stormTarget ? 1.7 : 1.15, dt);
    }

    const stormCover = weatherEnabled ? stormLevel : 0;
    const cloudArrival = smoothstepLocal(0.06, 0.62, stormCover);
    const rainAmount = smoothstepLocal(0.48, 0.9, stormCover);
    // Ramps up early in the storm so the first thunder is not masked by music.
    stormDuck = cloudArrival;
    if (!thunderPlayed && stormTarget && weatherPhaseElapsed >= 0.8 && stormCover >= 0.5) {
      thunderPlayed = true;
      lightningStartedAt = sunElapsed;
      playThunder({ volume: 0.42, cutoff: 500, duration: 2.8, decay: 1.15, crack: 0.65 });
    }
    // Distant rumbles roll through for as long as the rain is falling.
    if (weatherEnabled && stormTarget && rainAmount > 0.3) {
      thunderTimer -= dt;
      if (thunderTimer <= 0) {
        thunderTimer = 4 + Math.random() * 9;
        const distance = Math.random(); // 0 = overhead, 1 = far away
        // Flash first, then the rumble arrives after a distance-based delay.
        lightningStartedAt = sunElapsed;
        window.setTimeout(() => {
          playThunder({
            volume: 0.38 - distance * 0.18,
            cutoff: 520 - distance * 200,
            duration: 1.9 + distance * 1.7,
            decay: 1.7 - distance * 0.55,
            crack: 0.6 - distance * 0.4,
          });
        }, 150 + distance * 1600);
      }
    }
    setRainAudioLevel(rainAmount);
    const lightningAge = sunElapsed - lightningStartedAt;
    const lightning = lightningAge >= 0 && lightningAge < 0.9
      ? Math.max(0, 1 - lightningAge / 0.9) * (lightningAge < 0.15 ? 1 : 0.42)
      : 0;

    // Sun altitude: starts at 9.0 deg and rises slowly up to 36.0 deg
    const altDeg = Math.min(36.0, 9.0 + sunElapsed * 0.045);
    const altRad = THREE.MathUtils.degToRad(altDeg);
    const prog = Math.min(1.0, Math.max(0.0, (altDeg - 9.0) / 25.0));

    // Sun direction unit vector (rising on the LEFT: -X, forward: -Z)
    const cosAlt = Math.cos(altRad);
    const sinAlt = Math.sin(altRad);
    const dirX = -cosAlt * sinAz; // negative X = LEFT side of view
    const dirY = sinAlt;
    const dirZ = -cosAlt * cosAz; // negative Z = towards temple

    // Update Directional Sun Light
    sun.position.set(dirX * 220, Math.max(25, dirY * 220), dirZ * 220);
    sun.target.position.set(0, 8, 0);

    // Color: warm golden peach -> brilliant morning gold -> crisp morning sun
    if (prog < 0.45) {
      currentSunColor.copy(colDawn).lerp(colGold, prog / 0.45);
    } else {
      currentSunColor.copy(colGold).lerp(colMorn, (prog - 0.45) / 0.55);
    }
    sun.color.copy(currentSunColor);
    // Keep enough sunlight for the temple, terrain and procession to stay clear.
    sun.intensity = (2.40 + prog * 0.70) * (1 - stormCover * 0.22);

    // Ambient Hemisphere Light
    hemi.color.copy(hemiSkyDawn).lerp(hemiSkyDay, prog);
    hemi.groundColor.copy(hemiGndDawn).lerp(hemiGndDay, prog);
    hemi.intensity = (1.20 + prog * 0.25) * (1 - stormCover * 0.15);

    // Ground bounce light
    bounce.intensity = (0.65 + prog * 0.15) * (1 - stormCover * 0.16);

    // Sky Dome Shader Uniforms
    const skyMat = sky.material;
    skyMat.uniforms.sunPos.value.set(dirX, dirY, dirZ);
    skyMat.uniforms.topColor.value.copy(SKY_TOP_DAWN).lerp(SKY_TOP_DAY, prog);
    skyMat.uniforms.midColor.value.copy(SKY_MID_DAWN).lerp(SKY_MID_DAY, prog);
    skyMat.uniforms.horizonColor.value.copy(SKY_HORIZON_DAWN).lerp(SKY_HORIZON_DAY, prog);
    skyMat.uniforms.topColor.value.lerp(stormSkyTop, stormCover * 0.58);
    skyMat.uniforms.midColor.value.lerp(stormSkyMid, stormCover * 0.48);
    skyMat.uniforms.horizonColor.value.lerp(stormSkyHorizon, stormCover * 0.32);
    skyMat.uniforms.sunColor.value.copy(SUN_COLOR_DAWN).lerp(SUN_COLOR_DAY, prog);
    skyMat.uniforms.sunColor.value.multiplyScalar(1 - stormCover * 0.82);
    skyMat.uniforms.lightningFlash.value = lightning * 0.55;

    // Atmosphere Fog & Background
    scene.fog.color.copy(fogDawn).lerp(fogDay, prog);
    scene.fog.color.lerp(stormFog, stormCover * 0.16);
    scene.fog.density = 0.00045 + stormCover * 0.00008;
    scene.background.copy(skyMat.uniforms.horizonColor.value);

    // Drifting morning clouds catching dawn underglow
    if (cloudMat) {
      cloudMat.color.copy(cloudDawn).lerp(cloudDay, prog).lerp(stormCloudTint, stormCover * 0.58);
      cloudMat.opacity = 0.68 + stormCover * 0.12;
    }
    stormClouds.visible = cloudArrival > 0.01;
    if (stormCloudMat) stormCloudMat.opacity = cloudArrival * 0.64;
    rain.material.opacity = rainAmount * 0.42;

    // Low, wind-driven ripples and gently drifting boats on the Ganga.
    river.userData.update(dt);

    for (const c of clouds.children) {
      c.position.x += c.userData.drift * dt * (1 + cloudArrival * 6);
      c.position.y = c.userData.baseY + Math.sin(sunElapsed * 0.25 + c.userData.phase) * 3.5;
      if (c.position.x > 850) c.position.x = -850;
      if (c.position.x < -850) c.position.x = 850;
    }

    for (const c of stormClouds.children) {
      c.position.x = c.userData.startX + cloudArrival * 660 + weatherPhaseElapsed * 3;
      c.position.y = c.userData.baseY + Math.sin(sunElapsed * 0.34 + c.userData.phase) * 4;
    }

    if (camera && rainAmount > 0) {
      rain.position.copy(camera.position);
      stepRain(rain, dt);
    }

    if (camera) {
      // Keep sky dome centered on viewer
      sky.position.copy(camera.position);

      // Position glowing Sun Disc on the horizon / sky along sun direction
      sunDisc.position.set(
        camera.position.x + dirX * 780,
        camera.position.y + dirY * 780,
        camera.position.z + dirZ * 780,
      );
      sunDisc.lookAt(camera.position);
      sunDisc.userData.mesh.material.opacity = 1.0;

      lightningLight.position.copy(camera.position);
      lightningLight.position.y += 44;
      lightningLight.intensity = lightning * 3.2;

      // Scale sun disc slightly based on elevation
      const sunScale = 1.35 - prog * 0.20;
      sunDisc.scale.set(sunScale, sunScale, sunScale);
      sunDisc.userData.mesh.material.opacity = 1 - stormCover * 0.78;
    }
  }

  return { sky, clouds, stormClouds, rain, birds, helicopter, river, sun, hemi, sunDisc, activateWeather, update, getStormDuck: () => stormDuck };
}
