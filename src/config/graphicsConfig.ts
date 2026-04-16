// ── Graphics Quality Presets ──────────────────────────────────────────────────
// Controls per-frame workload across all heavy rendering systems.
// Quality change takes effect on remount of heavy environment components.

export type GraphicsQuality = 'low' | 'medium' | 'high';

export interface GraphicsSettings {
  quality: GraphicsQuality;
  // Starfield (SpaceParticles)
  starfieldCount: number;
  // Nebula
  nebulaEnabled: boolean;
  nebulaCount: number;
  // Asteroid belt (between Neptune and the Red Planet)
  asteroidBeltCountPerType: number;
  asteroidBeltSkipFrames: number; // skip N frames between rotation updates (0 = every frame)
  // Earth debris ring
  earthRingCount: number;
  earthRingExplosionCount: number;
  earthRingImpactCount: number;
  earthRingSkipFrames: number;
  // Sky sphere background texture
  skyTextureWidth: number;
  skyTextureHeight: number;
  skyStarCount: number;
  // Post-processing (EffectComposer)
  postProcessingEnabled: boolean;
  bloomEnabled: boolean;
}

export const QUALITY_PRESETS: Record<GraphicsQuality, GraphicsSettings> = {
  low: {
    quality: 'low',
    // Starfield: 300 particles instead of 1200
    starfieldCount: 300,
    // Nebula: off entirely (saves 90 draw calls)
    nebulaEnabled: false,
    nebulaCount: 0,
    // Asteroid belt: 80/type (240 total) vs 520/type (1560 total); update every 4th frame
    asteroidBeltCountPerType: 80,
    asteroidBeltSkipFrames: 3,
    // Earth ring: 150 asteroids, no explosions/impacts, update every 4th frame
    earthRingCount: 150,
    earthRingExplosionCount: 0,
    earthRingImpactCount: 0,
    earthRingSkipFrames: 3,
    // Sky: small texture
    skyTextureWidth: 1024,
    skyTextureHeight: 512,
    skyStarCount: 2000,
    // No post-processing (biggest GPU win on low-end devices)
    postProcessingEnabled: false,
    bloomEnabled: false,
  },
  medium: {
    quality: 'medium',
    starfieldCount: 700,
    nebulaEnabled: true,
    nebulaCount: 40,
    // ~48% of high; update every 2nd frame
    asteroidBeltCountPerType: 250,
    asteroidBeltSkipFrames: 1,
    // ~36% of high; small explosions, no near-impacts, update every 2nd frame
    earthRingCount: 500,
    earthRingExplosionCount: 8,
    earthRingImpactCount: 0,
    earthRingSkipFrames: 1,
    skyTextureWidth: 2048,
    skyTextureHeight: 1024,
    skyStarCount: 5000,
    // Post-processing on but without Bloom (most expensive pass)
    postProcessingEnabled: true,
    bloomEnabled: false,
  },
  high: {
    quality: 'high',
    // Original values — full fidelity
    starfieldCount: 1200,
    nebulaEnabled: true,
    nebulaCount: 90,
    asteroidBeltCountPerType: 520,
    asteroidBeltSkipFrames: 0,
    earthRingCount: 1400,
    earthRingExplosionCount: 24,
    earthRingImpactCount: 80,
    earthRingSkipFrames: 0,
    skyTextureWidth: 4096,
    skyTextureHeight: 2048,
    skyStarCount: 8000,
    postProcessingEnabled: true,
    bloomEnabled: true,
  },
};
