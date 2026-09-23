# ISKCON Mayapur 3D Experience

An interactive 3D darshan and aerial tour of ISKCON Mayapur built in Three.js and Vite.
Walk the sacred temple grounds as Srila Prabhupada for direct darshan of Lord Narsimhadev inside the sanctum, or take the drone up for an aerial tour over the temple spires, lush gardens, and surrounding village.

## Run

```bash
npm install
npm run dev
```

Open the printed URL (default `http://localhost:5173`).

```bash
npm run build
npm run preview
```

## Modes

The intro screen offers two modes:

- **Walk the hill** — first/third-person walk as Srila Prabhupada (the original experience)
- **Drone view** — lifts off, glides to a lookout above the temple, then hands over control so you can fly anywhere

## Controls

| Input | Walk mode | Drone mode |
| --- | --- | --- |
| `W A S D` | walk | fly (forward / back / strafe) |
| `Shift` | run | descend |
| `Space` | jump | rise |
| Mouse | look (click canvas to capture cursor) | look |
| `Esc` | release cursor / pause | release cursor / pause |

## What’s in the scene

- **Ridge terrain** — elongated gaussian spine + FBM/ridge noise (`src/terrain.js`), green grass/rock on the hill blending out to dry sand plains, with a tiling grain texture for close-up detail
- **First-person player** — gravity, jump, slope limit (`src/player.js`)
- **Drone camera** — smooth fly controls, terrain clearance, intro flight over the temple (`src/drone.js`)
- **Sky / fog / rain** — gradient dome, flat drifting cloud layer, streak rain with wind slant (`src/environment.js`)
- **Vegetation** — instanced tree groves (two species), bushes, grass tufts, cluster flowers and rocks scattered by noise masks (`src/vegetation.js`)
- **Temple garden** — flowering trees along the terrace sides (`src/vegetation.js`)
- **Village** — thatched round huts in hamlets on the flats, with a few lone trees (`src/village.js`)
- **Farms** — tilled plots with paddy and wheat rows on the flat land (`src/farms.js`)
- **Path** — ribbon draped on the ridge spine (`src/path.js`)
- **Shrine** — small tiered temple + plateau stones on the ridge top (`src/temple.js`)
- **Ganga** — wide shimmering river with sand banks beyond the far city ring (`src/environment.js`)
- **City backdrop** — 4–12 storey towers with tiled window facades, ground-floor lobbies, paved plots, parapets, water tanks and masts, instanced per prototype (`src/city.js`)

## Tuning

| What | Where |
| --- | --- |
| Ridge size / height / width | `TERRAIN` in `src/terrain.js` |
| Walk / run / gravity / slope max | `SETTINGS` in `src/player.js` |
| Fog, sun, sky colors | `src/environment.js` |
| Tree / rock counts | `buildVegetation()` in `src/vegetation.js` |
| Shrine shape | `src/temple.js` |
| City rings | `src/city.js` |
| GLB placement | `public/models/manifest.json` |

## Debug hook

`window.__hill` exposes `{ scene, camera, renderer, player, phase(), step(dt), frames(), top }` for headless checks.

Screenshot / inspection URL parameters (used for automated captures):

| Param | Effect |
| --- | --- |
| `?shot=1` | skip the menu, hide HUD, start the scene immediately |
| `&mode=drone` | start directly in drone mode (with its intro flight) |
| `&lite=1` | skip the heavy GLB models for fast terrain-only views |
| `&freecam=x,y,z` | place the camera at an exact world position |
| `&look=x,y,z` | point that free camera at a world position |
| `&x=` / `&z=` / `&yaw=` / `&pitch=` | reposition the player instead |
