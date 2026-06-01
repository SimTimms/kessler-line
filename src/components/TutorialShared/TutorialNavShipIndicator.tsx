import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  NAV_SHIP_INDICATOR_SCREEN_PX,
  NAV_SHIP_THRUSTER_SCREEN_PX,
} from '../../config/visualConfig';
import {
  NAV_INDICATOR_LOCAL_Y,
  NAV_THRUSTER_MARKER_DEFS,
  type NavThrusterMarkerId,
} from '../../config/tutorialNavIndicatorConfig';
import {
  effectiveThrustFwd,
  effectiveThrustRev,
  effectiveThrustStrL,
  effectiveThrustStrR,
  effectiveYawLeft,
  effectiveYawRight,
  mainEngineDisabled,
  shipDestroyed,
} from '../../context/ShipState';
import { tutorialNavViewModeRef } from './TutorialFollowCamera';

const INDICATOR_COLOR = 0x9fdfff;
const THRUSTER_IDLE_COLOR = 0x4a6a7a;
const THRUSTER_ACTIVE_COLOR = 0xffcc66;
const THRUSTER_IDLE_OPACITY = 0.22;
const THRUSTER_ACTIVE_OPACITY = 0.95;
const INDICATOR_MESH_SPAN = 20;
const THRUSTER_DOT_RADIUS = 1.35;

const _shipPos = new THREE.Vector3();
const _shipQuat = new THREE.Quaternion();

function isThrusterActive(id: NavThrusterMarkerId): boolean {
  switch (id) {
    case 'forward':
      return effectiveThrustFwd.current;
    case 'yaw-left':
      return effectiveYawLeft.current;
    case 'yaw-right':
      return effectiveYawRight.current;
    case 'strafe-left':
      return effectiveThrustStrL.current;
    case 'strafe-right':
      return effectiveThrustStrR.current;
    case 'main-a':
      return effectiveThrustRev.current && !mainEngineDisabled.reverseA.current;
    case 'main-b':
      return effectiveThrustRev.current && !mainEngineDisabled.reverseB.current;
  }
}

function constantScreenScale(
  camera: THREE.Camera,
  distance: number,
  viewportHeight: number,
  targetPx: number,
  meshSpan: number
): number {
  if (!(camera instanceof THREE.PerspectiveCamera) || viewportHeight <= 0) {
    return (distance * 0.04 * targetPx) / meshSpan;
  }
  const worldHeightAtDist = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5) * distance;
  const worldPerPixel = worldHeightAtDist / viewportHeight;
  return (targetPx * worldPerPixel) / meshSpan;
}

interface Props {
  shipGroupRef: RefObject<THREE.Group | null>;
}

/** Nav-view ship heading + thruster firing dots (ship-local, constant screen size). */
export default function TutorialNavShipIndicator({ shipGroupRef }: Props) {
  const rootRef = useRef<THREE.Group>(null);
  const thrusterMeshRefs = useRef<(THREE.Mesh | null)[]>([]);

  const noseGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array([
      0,
      NAV_INDICATOR_LOCAL_Y,
      14,
      -9,
      NAV_INDICATOR_LOCAL_Y,
      -5,
      9,
      NAV_INDICATOR_LOCAL_Y,
      -5,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex([0, 1, 2]);
    geo.computeVertexNormals();
    return geo;
  }, []);

  const thrusterGeometry = useMemo(() => new THREE.CircleGeometry(THRUSTER_DOT_RADIUS, 12), []);

  const thrusterMaterials = useMemo(
    () =>
      NAV_THRUSTER_MARKER_DEFS.map(
        () =>
          new THREE.MeshBasicMaterial({
            color: THRUSTER_IDLE_COLOR,
            transparent: true,
            opacity: THRUSTER_IDLE_OPACITY,
            depthTest: false,
            depthWrite: false,
            side: THREE.DoubleSide,
          })
      ),
    []
  );

  useEffect(() => {
    return () => {
      noseGeometry.dispose();
      thrusterGeometry.dispose();
      thrusterMaterials.forEach((m) => m.dispose());
    };
  }, [noseGeometry, thrusterGeometry, thrusterMaterials]);

  useFrame(({ camera, size }) => {
    const ship = shipGroupRef.current;
    const root = rootRef.current;
    if (!ship || !root) return;

    const show = tutorialNavViewModeRef.current && !shipDestroyed.current;
    root.visible = show;
    if (!show) return;

    ship.getWorldPosition(_shipPos);
    ship.getWorldQuaternion(_shipQuat);
    root.position.copy(_shipPos);
    root.quaternion.copy(_shipQuat);

    const dist = Math.max(camera.position.distanceTo(_shipPos), 1);
    const rootScale = constantScreenScale(
      camera,
      dist,
      size.height,
      NAV_SHIP_INDICATOR_SCREEN_PX,
      INDICATOR_MESH_SPAN
    );
    root.scale.setScalar(rootScale);

    const thrusterChildScale =
      constantScreenScale(
        camera,
        dist,
        size.height,
        NAV_SHIP_THRUSTER_SCREEN_PX,
        THRUSTER_DOT_RADIUS * 2
      ) / rootScale;

    NAV_THRUSTER_MARKER_DEFS.forEach((def, i) => {
      const active = isThrusterActive(def.id);
      const mat = thrusterMaterials[i]!;
      mat.color.setHex(active ? THRUSTER_ACTIVE_COLOR : THRUSTER_IDLE_COLOR);
      mat.opacity = active ? THRUSTER_ACTIVE_OPACITY : THRUSTER_IDLE_OPACITY;
      const mesh = thrusterMeshRefs.current[i];
      if (mesh) mesh.scale.setScalar(thrusterChildScale);
    });
  });

  return (
    <group ref={rootRef} visible={false}>
      <mesh geometry={noseGeometry} renderOrder={9999} frustumCulled={false}>
        <meshBasicMaterial
          color={INDICATOR_COLOR}
          transparent
          opacity={0.88}
          depthTest={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {NAV_THRUSTER_MARKER_DEFS.map((def, i) => (
        <mesh
          key={def.id}
          ref={(el) => {
            thrusterMeshRefs.current[i] = el;
          }}
          geometry={thrusterGeometry}
          material={thrusterMaterials[i]}
          position={[def.position[0] * 5, NAV_INDICATOR_LOCAL_Y, def.position[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={10000}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}
