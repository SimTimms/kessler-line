import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  NORMAL_TRAVEL_INNER_RING_OPACITY,
  NORMAL_TRAVEL_OUTER_RING_OPACITY,
  NORMAL_TRAVEL_RING_COLOR,
  NORMAL_TRAVEL_RING_DASH_FRAC,
  NORMAL_TRAVEL_RING_GAP_FRAC,
  NORMAL_TRAVEL_RING_SEGMENTS,
} from '../../config/fastTravelConfig';
import {
  registerNormalTravelZone,
  unregisterNormalTravelZone,
  type NormalTravelZone,
} from '../../context/FastTravelZones';

export interface NormalTravelZoneRingProps {
  id: string;
  /** Simulation-space centre of the normal-travel pocket. */
  center: THREE.Vector3 | [number, number, number];
  /** Outer radius. Inner ring is drawn at half this distance. */
  radius: number;
  /** When false, only registers the zone (no dashed rings). Default true. */
  visible?: boolean;
}

function createDashedRing(radius: number, opacity: number): THREE.Line {
  const segments = NORMAL_TRAVEL_RING_SEGMENTS;
  const pts = new Float32Array((segments + 1) * 3);
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts[i * 3] = Math.cos(a) * radius;
    pts[i * 3 + 1] = 0;
    pts[i * 3 + 2] = Math.sin(a) * radius;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  const mat = new THREE.LineDashedMaterial({
    color: NORMAL_TRAVEL_RING_COLOR,
    dashSize: radius * NORMAL_TRAVEL_RING_DASH_FRAC,
    gapSize: radius * NORMAL_TRAVEL_RING_GAP_FRAC,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  line.frustumCulled = false;
  return line;
}

/**
 * Registers a normal-travel pocket and draws outer + inner (half-radius)
 * grey dashed rings. Outside the outer ring is full fast travel; between
 * rings is half FT thrust; inside the inner ring is normal travel.
 */
export default function NormalTravelZoneRing({
  id,
  center,
  radius,
  visible = true,
}: NormalTravelZoneRingProps) {
  const centerVec = useMemo(() => {
    if (Array.isArray(center)) return new THREE.Vector3(center[0], center[1], center[2]);
    return center.clone();
  }, [center]);

  useEffect(() => {
    const zone: NormalTravelZone = { id, center: centerVec, radius };
    registerNormalTravelZone(zone);
    return () => unregisterNormalTravelZone(id);
  }, [id, centerVec, radius]);

  const rings = useMemo(() => {
    if (!visible || radius <= 0) return null;
    const outer = createDashedRing(radius, NORMAL_TRAVEL_OUTER_RING_OPACITY);
    const inner = createDashedRing(radius * 0.5, NORMAL_TRAVEL_INNER_RING_OPACITY);
    const group = new THREE.Group();
    group.add(outer);
    group.add(inner);
    return group;
  }, [radius, visible]);

  useEffect(() => {
    return () => {
      if (!rings) return;
      rings.traverse((obj) => {
        if (!(obj instanceof THREE.Line)) return;
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      });
    };
  }, [rings]);

  if (!rings) return null;

  return <primitive object={rings} position={[centerVec.x, centerVec.y, centerVec.z]} />;
}
