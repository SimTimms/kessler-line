import type { RefObject } from 'react';
import type * as THREE from 'three';

export type ViewportSize = { width: number; height: number };

/** Refs for the two HTML labels that follow the arrows on screen. */
export type IndicatorLabels = {
  /** Invisible group past the velocity arrow tip. */
  speedAnchorRef: RefObject<THREE.Group>;
  speedRootRef: RefObject<HTMLDivElement | null>;
  /** Invisible group past the orbit direction arrow tip. */
  orbitReqAnchorRef: RefObject<THREE.Group>;
  orbitReqRootRef: RefObject<HTMLDivElement | null>;
  /** The element whose text shows the circular orbit speed. */
  orbitReqTextRef: RefObject<HTMLDivElement | null>;
};
