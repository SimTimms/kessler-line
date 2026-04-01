# Refactoring Recommendations

Code analysis for the `my-r3f-app` space game project.
Generated: 2026-03-26

---

## 1. Dead Code to Remove

### Confirmed unused components

| File                                         | Reason                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/components/BinocularCamera.tsx`         | Not imported anywhere. `OrbitCamera` in `Camera.tsx` is the active camera.           |
| `src/components/Ship/RailgunImpactVents.tsx` | No imports found. Likely superseded by `RailgunOxygenVents.tsx`. Verify and delete.  |
| `src/components/CollisionDebug.tsx`          | Only appears commented out in `Scene.tsx`. Keep only if actively used for debugging. |

### Already removed (git-deleted, safe to ignore)

- `src/components/NPCContactDialog.tsx`
- `src/hooks/useNpcHail.ts`

---

## 2. Create New Config Files

The following config files don't exist yet but should. Values to move are listed under each.

### `src/config/debugConfig.ts`

All debug flags are currently scattered and hardcoded as `const` booleans inside components. Move to one place:

```typescript
// src/config/debugConfig.ts
export const DEBUG = {
  DISABLE_GRAVITY: false,
  FREEZE_COLLISIONS: false,
  RAILGUN_ENGINE_HITS: true,
  ENGINE_DISABLE_CHANGES: true,
  THRUSTER_HITBOXES: false,
  RAILGUN_WARNING: true,
  RAILGUN_HIT_SCALE: 10,
  DEV_JUPITER_TEST: false,
  DEV_MARS_TEST: false,
};
```

**Sources to clean up:**

- `Scene.tsx` — `DEV_JUPITER_TEST`, `DEV_MARS_TEST`
- `Spaceship.tsx` — `DEBUG_THRUSTER_HITBOXES`
- `useShipPhysics.ts` — `DEBUG_DISABLE_GRAVITY`, `DEBUG_FREEZE_COLLISIONS`, `DEBUG_RAILGUN_ENGINE_HITS`, `DEBUG_ENGINE_DISABLE_CHANGES`
- `RailgunWarning.tsx` — `DEBUG_RAILGUN`, `DEBUG_HIT_SCALE`

---

### `src/config/visualConfig.ts`

Rendering and camera parameters:

```typescript
export const CAMERA = {
  INITIAL_SPHERICAL: { radius: 50, phi: Math.PI / 4, theta: 0 },
  FOV_MIN: 10,
  FOV_MAX: 50,
  WHEEL_SENSITIVITY: 0.001,
  MOUSE_SENSITIVITY: 0.005,
  PITCH_CLAMP: Math.PI / 2 - 0.1,
  SHAKE_AMPLITUDE_MAX: 1.0,
  SHAKE_FREQUENCIES: [23.7, 11.3, 17.9, 8.1], // Hz
};

export const RENDERING = {
  FOG_COLOR: 0x000000,
  FOG_DENSITY: 0.00004,
  TONE_MAPPING_EXPOSURE: 0.9,
  CANVAS_NEAR: 0.01,
  CANVAS_FAR: 100_000_000,
};
```

**Sources:** `Camera.tsx`, `BinocularCamera.tsx`, `Scene.tsx`

---

### `src/config/particleConfig.ts`

Particle counts, spreads, and nebula colors:

```typescript
export const STARFIELD = {
  COUNT: 1200,
  HALF_SIZE: 2500, // wrapping cube half-extent
};

export const NEBULA = {
  COUNT: 90,
  SPREAD: 6000,
  LARGE_COUNT: 30,
  SMALL_COUNT: 60,
  HUE_MIN: 0.7,
  HUE_MAX: 0.84,
};

export const ASTEROID_BELT = {
  COUNT_PER_TYPE: 520,
  SIZE_MIN: 10,
  SIZE_MAX: 55,
  COLLIDER_Y_HALF: 100,
};

export const SPACESHIP_PARTICLES = {
  COUNT: 660,
  // speed gates etc.
};
```

**Sources:** `SpaceParticles.tsx`, `NebulaClouds.tsx`, `AsteroidBelt.tsx`, `Scene.tsx`

---

### `src/config/sunConfig.ts`

Sun lighting and lens flare parameters:

```typescript
export const SUN = {
  LIGHT_INTENSITY_BASE: 1_000_000,
  LIGHT_DISTANCE_BASE: 1_000_000,
  CORONA_OPACITY: 0.28,
};

export const LENS_FLARE = {
  // Array of { distance, scale, color } for each ghost element
  GHOSTS: [
    { distance: 0.0, scale: 1.0, color: '#fffacc' },
    { distance: 0.2, scale: 0.3, color: '#ffeeaa' },
    { distance: 0.45, scale: 0.15, color: '#ffcc88' },
    { distance: 0.7, scale: 0.08, color: '#ff9944' },
    { distance: 0.9, scale: 0.2, color: '#cc6622' },
    { distance: 1.1, scale: 0.05, color: '#994411' },
  ],
};
```

**Sources:** `Sun.tsx`, `SunLensFlare.tsx`

---

### `src/config/spawnConfig.ts`

World spawn positions and distances:

```typescript
export const SPAWN = {
  START_DISTANCE_FROM_PLANET: 80_200,
  DOCKING_BAY_ORIGIN: [1000, 0, 100] as const,
  START_ZONE_ASTEROID_CENTER: [76000, -3000, -129376] as const,
};
```

**Sources:** `Scene.tsx`

---

### `src/config/shipConfig.ts`

Ship physics constants currently in `src/context/ShipState.ts` and `useShipPhysics.ts`. These are not state — they are constants and belong in config:

```typescript
export const SHIP = {
  THRUST: 2.2, // units/s²
  YAW_THRUST: 1.0, // rad/s²
  RADIUS: 3,
  RESTITUTION: 0.4,
  MAX_THRUST_MULTIPLIER: 3,
  IMPACT_PULSE_MS: 1200,
  DOCKING_PORT_RADIUS: 2,
  DOCKING_PORT_LOCAL_Z: 11,
  ENGINE_TORQUE_SCALE: 0.15,
  DOCKING_PORT_LIGHT_COLOR: '#88ccff',
  DOCKING_PORT_LIGHT_POSITION: [0, 0, -14] as const,
  DOCKING_PORT_LIGHT_INTENSITY: 0,
  DOCKING_PORT_LIGHT_DISTANCE: 40,
  DOCKING_PORT_LIGHT_DECAY: 2,
};
```

**Sources:** `src/context/ShipState.ts`, `useShipPhysics.ts`, `Spaceship.tsx`

---

### `src/config/combatConfig.ts`

Railgun and laser visual/geometry config, separate from damage values already in `damageConfig.ts`:

```typescript
export const RAILGUN_VISUALS = {
  BEAM_OUTER_RADIUS: 0.03,
  BEAM_INNER_RADIUS: 0.012,
  BEAM_COLOR: '#ff2a00',
  BEAM_CORE_COLOR: '#fff6cc',
};

export const LASER = {
  // spotlight parameters
};
```

**Sources:** `RailgunWarning.tsx`, `LaserRay.tsx`

---

## 3. Fix Existing Import Path Bug

`RadioHUD.tsx` imports `SOLAR_SYSTEM_SCALE` from the component file, not the config:

```typescript
// WRONG — importing a config value from a component
import { SOLAR_SYSTEM_SCALE } from '../SolarSystem';

// CORRECT
import { SOLAR_SYSTEM_SCALE } from '../../config/solarConfig';
```

`SOLAR_SYSTEM_SCALE` should only ever come from `src/config/solarConfig.ts`.

---

## 4. Component Folder Reorganization

Several components sit loose in `src/components/` without a subfolder. Grouping them makes the folder navigable:

| New Folder                 | Move These Files                                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `components/Rendering/`    | `SkySphere.tsx`, `SunLensFlare.tsx`, `SunBackground.tsx`, `SpaceParticles.tsx`, `NebulaClouds.tsx`, `AsteroidBelt.tsx` |
| `components/Radio/`        | `RadioBeacon.tsx`, `RadioChatterStream.tsx`                                                                            |
| `components/Combat/`       | `RailgunWarning.tsx`, `LaserRay.tsx`                                                                                   |
| `components/WorldObjects/` | `SpaceDebris.tsx`, `EjectedCargo.tsx`, `LandingPad.tsx`, `DockingBay.tsx`, `PowerSource.tsx`                           |
| `components/Autopilot/`    | `AutopilotController.tsx` (keep `src/autopilot/` for the logic modules)                                                |

After moving, update all import paths (can do with a global find-replace per file).

---

## 5. Context Folder Organization

31 context files are all at the same level with no grouping. Suggest grouping by domain:

```
src/context/
├── ship/          ShipState.ts, ShipPos.ts, MinimapShipPosition.ts, EjectEvent.ts
├── gravity/       GravityRegistry.ts, SunGravity.ts, DriveSignatureRegistry.ts
├── scanning/      DriveSignatureScan.ts, MagneticScan.ts, ProximityScan.ts, RadioState.ts
├── autopilot/     AutopilotState.ts, NavTarget.ts, WaypointPrompt.ts
├── cinematic/     CinematicState.ts
├── ui/            HudShake.ts, TargetSelection.ts, MessageStore.ts, SolarSystemMinimap.ts
├── save/          SaveStore.ts, SaveManager.ts, Inventory.ts, ActivePlatform.ts
└── misc/          CameraRef.ts, CollisionRegistry.ts
```

This is lower priority than the config changes but significantly helps navigation.

---

## 6. Summary: Priority Order

### Do first (high impact, low risk)

1. Create `src/config/debugConfig.ts` and update all scattered debug flags
2. Create `src/config/shipConfig.ts` and move constants out of `ShipState.ts`
3. Fix the `RadioHUD.tsx` import path bug
4. Delete `BinocularCamera.tsx` (confirmed unused)

### Do next (improves configurability)

5. Create `src/config/visualConfig.ts` (camera, rendering)
6. Create `src/config/particleConfig.ts` (starfield, nebula, asteroids)
7. Create `src/config/spawnConfig.ts` (spawn positions)
8. Create `src/config/sunConfig.ts` + `combatConfig.ts`

### Do last (folder cleanup, biggest diffs)

9. Reorganize `src/components/` with new subfolders
10. Reorganize `src/context/` by domain

---

## Existing Config Files (Good — Keep As-Is)

| File                  | What it covers                                           |
| --------------------- | -------------------------------------------------------- |
| `solarConfig.ts`      | Solar system scale multiplier, planet sizing             |
| `worldConfig.ts`      | Planet/station/beacon definitions, audio asset paths     |
| `scanRanges.ts`       | Sensor ranges for all scanner types                      |
| `damageConfig.ts`     | Collision damage, railgun min/max, O2 drain, fuel refill |
| `neptuneConfig.ts`    | No-fly zone, railgun cooldown and strike distances       |
| `commsConfig.ts`      | Speed-of-light comms delay simulation                    |
| `ghostFleetConfig.ts` | NPC ship names, fleet spawn radius                       |
