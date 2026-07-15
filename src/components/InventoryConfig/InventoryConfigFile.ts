import { CANVAS_FAR, CANVAS_NEAR, TONE_MAPPING_EXPOSURE } from '../../config/visualConfig';

type Vec3 = [number, number, number];

/** Side length of the equilateral triangle formed by the three landing pads. */
const LANDING_PAD_SPACING = 600;

/** Circumradius of an equilateral triangle with side LANDING_PAD_SPACING. */
const TRIANGLE_RADIUS = LANDING_PAD_SPACING / Math.sqrt(3);

const triangleCenter: Vec3 = [0, -20, 0];

function equilateralPadPosition(index: 0 | 1 | 2): Vec3 {
  const [cx, cy, cz] = triangleCenter;
  // Vertex 0 at +Z; vertices 1/2 form the base along X at −Z/2.
  if (index === 0) return [cx, cy, cz + TRIANGLE_RADIUS];
  if (index === 1) return [cx - LANDING_PAD_SPACING / 2, cy, cz - TRIANGLE_RADIUS / 2];
  return [cx + LANDING_PAD_SPACING / 2, cy, cz - TRIANGLE_RADIUS / 2];
}

export const InventoryConfig = {
  cameraPosition: [0, 90, 120] as Vec3,
  cameraTarget: [0, 0, 0] as Vec3,
  gridSize: 1200,
  gridDivisions: 24,
  landingPadScale: 10,
  landingPadThreshold: 28,
  landingPadSpacing: LANDING_PAD_SPACING,
  triangleCenter,
  landingPads: [
    {
      id: 'inventory-pad-a',
      label: 'Inventory Pad A',
      position: equilateralPadPosition(0),
    },
    {
      id: 'inventory-pad-b',
      label: 'Inventory Pad B',
      position: equilateralPadPosition(1),
    },
    {
      id: 'inventory-pad-c',
      label: 'Inventory Pad C',
      position: equilateralPadPosition(2),
    },
  ] as const,
  scene: {
    fogColor: '#000000',
    canvasNear: CANVAS_NEAR,
    canvasFar: CANVAS_FAR,
    toneMappingExposure: TONE_MAPPING_EXPOSURE,
  },
  dustCloud: {
    radius: 5000,
    particleSize: 2500000,
    radialSpread: 9,
    yInitial: -1000,
  },
  /** Starter hold for the inventory authoring scene. */
  playerStarterCargo: [
    { name: 'reaction-mass', quantity: 8 },
    { name: 'organics', quantity: 4 },
    { name: 'spare-parts', quantity: 3 },
  ],
};
