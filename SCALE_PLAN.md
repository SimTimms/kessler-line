# Solar System Unified Scale — Implementation Plan

## Goal

A single constant `SOLAR_SYSTEM_SCALE` controls the physical size of the solar system.
Changing it from `4` → `10` (or any value) should automatically resize:
- Sun radius and gravity
- All planet orbital radii and display radii
- All planet gravity registrations (SOI, surfaceRadius, orbitAltitude)
- Station world positions (models stay same size, only positions move)
- Neptune no-fly zone trigger distance and visual ring
- Asteroid belt positions
- Autopilot distance thresholds

**What does NOT scale:**
- Ship physics (SHIP_RADIUS, THRUST, docking radii)
- Planet/station/ship model geometry sizes
- Camera and minimap (handled separately later)
- Orbital periods / spin speeds (time-based, not distance-based)
- EarthAsteroidRing (already auto-derives from planet radius — verify after implementation)

---

## Current State (SOLAR_SYSTEM_SCALE = 4)

All current world-space position values in `worldConfig.ts` were authored at scale = 4.
To find the scale-1 base: divide current value by 4.
Multiply by `SOLAR_SYSTEM_SCALE` to get any target scale.

---

## Step-by-Step Checklist

### STEP 1 — Create the single source of truth
**File to create:** `my-r3f-app/src/config/solarConfig.ts`

```typescript
// ── Solar System Scale ─────────────────────────────────────────────────────
// Change SOLAR_SYSTEM_SCALE to resize the entire solar system.
// Everything that moves in world space scales with this value.
// Ship models, station models, and ship physics do NOT scale.

export const SOLAR_SYSTEM_SCALE = 4;

export const SUN_RADIUS_BASE = 100;   // sun display radius at scale = 1
export const SUN_WORLD_RADIUS = SUN_RADIUS_BASE * SOLAR_SYSTEM_SCALE;
```

- [ ] File created at `src/config/solarConfig.ts`

---

### STEP 2 — Update `SolarSystem.tsx`
**File:** `my-r3f-app/src/components/SolarSystem.tsx`

- [ ] Import `SOLAR_SYSTEM_SCALE` and `SUN_RADIUS_BASE` from `../config/solarConfig`
- [ ] Remove (or replace) the local `SOLAR_SYSTEM_SCALE = 4` constant
- [ ] Remove (or replace) the local `SUN_RADIUS = 100` constant — rename to `SUN_RADIUS_BASE`
      so existing planet radius formulas (`Math.pow(realKm / 696_340, 0.2) * SUN_RADIUS_BASE`) still work
- [ ] Keep `export { SOLAR_SYSTEM_SCALE }` so that files already importing from `./SolarSystem`
      (NeptuneNoFlyRing, MiniMapScene) continue to work without changing their imports
- [ ] `<SolarSystem scale={4} />` is called in `Scene.tsx` — the prop is currently hardcoded.
      Update `Scene.tsx` line 316 to import and pass `SOLAR_SYSTEM_SCALE` from solarConfig:
      `<SolarSystem scale={SOLAR_SYSTEM_SCALE} />`

---

### STEP 3 — Update `SunGravity.tsx`
**File:** `my-r3f-app/src/components/SunGravity.tsx`

Three values are currently hardcoded that should derive from `SUN_WORLD_RADIUS`:

| Current hardcoded value | Fix |
|---|---|
| `surfaceRadius: 400` | `SUN_WORLD_RADIUS` (= SUN_RADIUS_BASE × scale) |
| `orbitAltitude: 1600` | `SUN_WORLD_RADIUS * 4` |
| `soiRadius: 200_000` | `50_000 * SOLAR_SYSTEM_SCALE` (= 200000 at scale=4) |

- [ ] Import `SOLAR_SYSTEM_SCALE` and `SUN_WORLD_RADIUS` from `../config/solarConfig`
- [ ] Replace `surfaceRadius: 400` → `surfaceRadius: SUN_WORLD_RADIUS`
- [ ] Replace `orbitAltitude: 1600` → `orbitAltitude: SUN_WORLD_RADIUS * 4`
- [ ] Replace `soiRadius: 200_000` → `soiRadius: 50_000 * SOLAR_SYSTEM_SCALE`

---

### STEP 4 — Update `worldConfig.ts`
**File:** `my-r3f-app/src/config/worldConfig.ts`

Station/object positions were authored at scale = 4. Normalise each to scale = 1
(divide by 4) then multiply by `SOLAR_SYSTEM_SCALE`.

- [ ] Import `SOLAR_SYSTEM_SCALE` from `./solarConfig`
- [ ] Define a helper at the top: `const S = SOLAR_SYSTEM_SCALE;`
- [ ] Update every hardcoded `position` array using the pattern:
      `position: [x/4 * S, y/4 * S, z/4 * S]` as `[number, number, number]`

Positions to update (current → base at scale=1):

| Object | Current position | Scale-1 base |
|---|---|---|
| ASTEROID_DOCK | [-8000, 0, 6000] | [-2000, 0, 1500] |
| SPACE_STATION | [0, 0, -1500] | [0, 0, -375] |
| FUEL_STATION (Sirix) | [6084, 0, -6584] | [1521, 0, -1646] |
| NEPTUNE | [0, 0, 0] | [0, 0, 0] ← no change |
| RED_PLANET | [3500, -5000, -12000] | [875, -1250, -3000] |
| EARTH | [800, 0, -1000] | [200, 0, -250] |
| GREEN_PLANET | [2000, -2000, -500] | [500, -500, -125] |
| MERCURY | [300, 0, -400] | [75, 0, -100] |
| VENUS | [600, 0, -700] | [150, 0, -175] |
| MARS | [3500, 0, -12000] | [875, 0, -3000] |
| JUPITER | [8000, 0, -5000] | [2000, 0, -1250] |
| SATURN | [-6000, 0, 4000] | [-1500, 0, 1000] |
| URANUS | [-4000, 0, -3000] | [-1000, 0, -750] |

- [ ] Update all 13 object positions above
- [ ] Update radio beacon fixed positions (beacons 0–9) using same ÷4 × S pattern
- [ ] Update orbital beacon radii:
      - Venus beacon: `radius: 420` → `radius: 105 * S`
      - Mercury beacon: `radius: 320` → `radius: 80 * S`
- [ ] Note: `MINIMAP_SCALE` is excluded from this task (handled separately)
- [ ] Note: `RADIO_BROADCAST_DEFS` reference `ASTEROID_DOCK_DEF.position` etc.
      directly — they will auto-update since they reference the object, not hardcode values.
      Verify this is the case for all three entries.

---

### STEP 5 — Update `CinematicController.tsx` (Neptune no-fly trigger)
**File:** `my-r3f-app/src/components/CinematicController.tsx`

```typescript
// Line 26 currently:
const NO_FLY_ZONE_DISTANCE = 20000;

// Should become:
const NO_FLY_ZONE_DISTANCE = 5000 * SOLAR_SYSTEM_SCALE; // = 20000 at scale=4
```

- [ ] Import `SOLAR_SYSTEM_SCALE` from `../config/solarConfig`
- [ ] Replace `NO_FLY_ZONE_DISTANCE = 20000` → `NO_FLY_ZONE_DISTANCE = 5000 * SOLAR_SYSTEM_SCALE`

---

### STEP 6 — Update `NeptuneNoFlyRing.tsx` (visual ring label offset)
**File:** `my-r3f-app/src/components/NeptuneNoFlyRing.tsx`

The ring radius itself already derives correctly from Neptune's radius × SOLAR_SYSTEM_SCALE (line 17).
One offset is hardcoded:

```tsx
// Line 48 currently:
<Html position={[0, 0, ringRadius + 220]} transform>

// The 220-unit label offset should scale:
<Html position={[0, 0, ringRadius + 55 * SOLAR_SYSTEM_SCALE]} transform>
// 55 * 4 = 220 at current scale
```

- [ ] Verify `SOLAR_SYSTEM_SCALE` import already exists (it does — line 6 imports from `./SolarSystem`)
- [ ] Replace the hardcoded `220` offset → `55 * SOLAR_SYSTEM_SCALE`

---

### STEP 7 — Update `AsteroidBelt.tsx`
**File:** `my-r3f-app/src/components/AsteroidBelt.tsx`

Belt endpoints `NEP_POS` and `RED_POS` are hardcoded world coordinates:

```typescript
// Current:
const NEP_POS = [6084, 0, -6084]
const RED_POS = [6084, 0, -3084]

// Fix — import S from solarConfig and normalise to scale=1:
const NEP_POS = [1521 * S, 0, -1521 * S]
const RED_POS = [1521 * S, 0, -771 * S]
```

Also check scatter radius bands (`radial: 200–1800 units`) — these should scale:
- Min scatter: `50 * S` (= 200 at scale=4)
- Max scatter: `450 * S` (= 1800 at scale=4)

- [ ] Import `SOLAR_SYSTEM_SCALE` from `../config/solarConfig` (as `S`)
- [ ] Replace `NEP_POS` and `RED_POS` with scale-relative values
- [ ] Replace hardcoded scatter radius bands with `× S` equivalents
- [ ] Check asteroid base sizes (10–65 units) — these are model sizes, leave unchanged

---

### STEP 8 — Update `src/autopilot/constants.ts`
**File:** `my-r3f-app/src/autopilot/constants.ts`

Scale the distance thresholds that govern how far the autopilot starts braking.
Leave speed/angle thresholds unchanged (they're not distance-based).

| Constant | Current | Action | Scale-1 base |
|---|---|---|---|
| `THRUST_DIST_FAR` | 10000 | Scale | `2500 * S` |
| `THRUST_DIST_MID` | 2000 | Scale | `500 * S` |
| `THRUST_DIST_NEAR` | 500 | Leave fixed | — |
| `ORBIT_INSERTION_PERIAPSIS` | 1000 | Scale | `250 * S` |
| `STATION_ARRIVAL_RADIUS` | 300 | Leave fixed | — |
| `RETROBURN_DONE_SPEED` | 5 | Leave fixed | — |
| Speed/angle thresholds | — | Leave fixed | — |

- [ ] Import `SOLAR_SYSTEM_SCALE` from `../config/solarConfig` (as `S`)
- [ ] Update `THRUST_DIST_FAR`, `THRUST_DIST_MID`, `ORBIT_INSERTION_PERIAPSIS` with `× S`

---

### STEP 9 — Verify `EarthAsteroidRing.tsx`
**File:** `my-r3f-app/src/components/EarthAsteroidRing.tsx`

Ring radii already derive from `earthWorldRadius` (which is computed from the planet radius formula).
This should auto-scale — but verify.

- [ ] Read the file and confirm `innerRadius` and `outerRadius` use a computed `earthWorldRadius`
      (not a hardcoded number)
- [ ] If any hardcoded distances exist, normalise them to scale=1 base × S

---

### STEP 10 — Smoke Test
After all changes, set `SOLAR_SYSTEM_SCALE` to `2` and `8` in `solarConfig.ts` and
run `npm run dev` from `my-r3f-app/`. Verify:

- [ ] `npm run build` passes (TypeScript strict mode — no unused vars, no type errors)
- [ ] At scale=2: sun is half as far, planets orbit closer, stations are proportionally closer
- [ ] At scale=8: solar system doubles in size from current (scale=4)
- [ ] Neptune no-fly zone triggers at appropriate distance for the new scale
- [ ] Visual no-fly ring around Neptune tracks Neptune position and is appropriately sized
- [ ] Asteroid belt spans correctly between the two endpoint positions
- [ ] Gravity still pulls ship toward sun and planets
- [ ] Docking still works (docking distances are fixed — station approaches should feel the same)
- [ ] Revert to scale=4 for production baseline

---

## File Change Summary

| File | Change Type | Priority |
|---|---|---|
| `src/config/solarConfig.ts` | **CREATE** | Must-do first |
| `src/components/SolarSystem.tsx` | Import from solarConfig, re-export | Must-do |
| `src/components/Scene.tsx` | Pass SOLAR_SYSTEM_SCALE to `<SolarSystem>` | Must-do |
| `src/components/SunGravity.tsx` | Fix 3 hardcoded values | Must-do |
| `src/config/worldConfig.ts` | Scale all 13 positions + beacon radii | Must-do |
| `src/components/CinematicController.tsx` | Scale NO_FLY_ZONE_DISTANCE | Must-do |
| `src/components/NeptuneNoFlyRing.tsx` | Scale label offset (220 → 55×S) | Small fix |
| `src/components/AsteroidBelt.tsx` | Scale endpoint coords + scatter radii | Must-do |
| `src/autopilot/constants.ts` | Scale 3 distance thresholds | Must-do |
| `src/components/EarthAsteroidRing.tsx` | Verify auto-scales (likely no change) | Verify only |

**Intentionally excluded from this task:**
- `MINIMAP_SCALE` in `worldConfig.ts` — handled separately
- Camera zoom / FOV — handled separately
- `StartZoneAsteroidCluster.tsx` — check if it has hardcoded world positions

---

## Notes for Pickup

- The current baseline is `SOLAR_SYSTEM_SCALE = 4`. All "scale-1 base" values in this doc
  were computed as `current ÷ 4`. Do not change the current positions in worldConfig.ts
  without applying the ÷4 normalisation first.
- `SOLAR_SYSTEM_SCALE` is currently exported from `SolarSystem.tsx`. After Step 2,
  it should be re-exported from there (sourced from solarConfig) so downstream imports
  from `./SolarSystem` don't break. Update those imports to solarConfig later if desired.
- `StartZoneAsteroidCluster.tsx` was not fully audited — check for hardcoded world-space
  positions before closing the task.
- Ship spawn position may also be hardcoded — search for initial ship position and verify.
