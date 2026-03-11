import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { drainPower } from './Ship/Spaceship';
import { radioBeaconHitRef } from './RadioBeacon';

interface LaserRayProps {
  shipGroupRef: { current: THREE.Group | null };
  stationGroupRef: { current: THREE.Group | null };
  beaconGroupRef?: { current: THREE.Group | null };
}

// Cylinder geometry is along the Y axis — we rotate it to align with the beam direction.
const Y_AXIS = new THREE.Vector3(0, 1, 0);

export const spotlightOnRef = { current: true };
// Module-level scratch objects to avoid per-frame allocations.
const _camRaycaster = new THREE.Raycaster();
const _shipRaycaster = new THREE.Raycaster();
const _worldPos = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _target = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _q = new THREE.Quaternion();

export default function LaserRay({ shipGroupRef, stationGroupRef, beaconGroupRef }: LaserRayProps) {
  const { camera } = useThree();

  const mouseNDC = useRef(new THREE.Vector2());
  const coreRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  // Group owns the world position; sphere and label live inside it.
  const impactGroupRef = useRef<THREE.Group>(null!);
  const impactSphereRef = useRef<THREE.Mesh>(null!);
  // Plain DOM ref — text and visibility updated imperatively to avoid per-frame React re-renders.
  const labelRef = useRef<HTMLDivElement>(null!);

  // Spotlight + its target object (must live in the scene graph for Three.js direction calc).
  const spotLightRef = useRef<THREE.SpotLight>(null!);
  const spotTargetRef = useRef<THREE.Group>(null!);

  const wasHit = useRef(false);
  const wasBeaconHit = useRef(false);
  const isMouseDown = useRef(false);

  // Track mouse cursor in NDC and mouse button state.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseNDC.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseNDC.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    const onDown = () => {
      isMouseDown.current = true;
    };
    const onUp = () => {
      isMouseDown.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // Wire the spotlight target after both refs are mounted.
  // Three.js needs the target to be a scene object for direction to compute correctly.
  useEffect(() => {
    spotLightRef.current.target = spotTargetRef.current;
  }, []);

  useFrame((_, delta) => {
    const ship = shipGroupRef.current;
    if (
      !ship ||
      !coreRef.current ||
      !glowRef.current ||
      !impactGroupRef.current ||
      !spotLightRef.current ||
      !spotTargetRef.current
    )
      return;

    // Hide everything and bail when the mouse button is not held.
    /*
    if (!isMouseDown.current) {
      coreRef.current.visible = false;
      glowRef.current.visible = false;
      impactSphereRef.current.visible = false;
      if (labelRef.current) labelRef.current.style.display = 'none';
      wasHit.current = false;
    return;
    }
    */
    coreRef.current.visible = false;
    glowRef.current.visible = true;

    // Drain 2 power per second while laser is firing.
    if (isMouseDown.current) {
      coreRef.current.visible = true;
      drainPower(2 * delta);
    }

    // Laser origin: ship world position offset 3 units along the ship's forward direction.
    // Forward is computed the same way Spaceship.tsx computes thrust direction.
    ship.getWorldPosition(_worldPos);
    _forward.set(0, 0, -1).applyQuaternion(ship.quaternion);
    _origin.copy(_worldPos).addScaledVector(_forward, 3);

    // Target: project camera ray through mouse cursor 1000 units into world space.
    _camRaycaster.setFromCamera(mouseNDC.current, camera);
    _target.copy(_camRaycaster.ray.origin).addScaledVector(_camRaycaster.ray.direction, 1000);

    // Spotlight origin mirrors the laser origin.
    spotLightRef.current.position.copy(_origin);
    // Default spotlight target = mouse cursor point; overridden below if beam hits something.
    spotTargetRef.current.position.copy(_target);

    // Beam direction and length.
    _dir.subVectors(_target, _origin);
    const len = _dir.length();
    if (len < 0.001) return;
    _dir.divideScalar(len); // normalise in place

    // Orient/position/scale both beam meshes (cylinder height=1 scaled to len along Y).
    _mid.copy(_origin).addScaledVector(_dir, len * 0.5);
    _q.setFromUnitVectors(Y_AXIS, _dir);

    coreRef.current.position.copy(_mid);
    coreRef.current.scale.set(1, len, 1);
    coreRef.current.quaternion.copy(_q);

    glowRef.current.position.copy(_mid);
    glowRef.current.scale.set(1, len, 1);
    glowRef.current.quaternion.copy(_q);

    // Raycast from ship origin toward target — detect station intersection.
    const station = stationGroupRef.current;
    if (station) {
      _shipRaycaster.set(_origin, _dir);
      _shipRaycaster.far = len;
      const hits = _shipRaycaster.intersectObject(station, true);
      const isHit = hits.length > 0;

      if (isHit) {
        // Fire event only on the rising edge (first frame of intersection).
        if (!wasHit.current) {
          window.dispatchEvent(
            new CustomEvent('SpaceStationModelHit', {
              detail: { point: hits[0].point.clone(), objectName: hits[0].object.name },
            })
          );
        }

        // Snap spotlight target to exact impact point (overrides mouse cursor default).
        spotTargetRef.current.position.copy(hits[0].point);

        // Move the impact group to the hit point.
        impactGroupRef.current.position.copy(hits[0].point);

        // Pulse the sphere.
        impactSphereRef.current.visible = true;
        impactSphereRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.008) * 0.4);

        // Update the HTML label directly — no React re-render needed.
        if (labelRef.current) {
          const dist = _origin.distanceTo(hits[0].point);
          labelRef.current.textContent = `${dist.toFixed(1)} units`;
          labelRef.current.style.display = 'block';
        }
      } else {
        impactSphereRef.current.visible = false;
        if (labelRef.current) labelRef.current.style.display = 'none';
      }

      wasHit.current = isHit;
    }

    // Raycast against the RadioBeacon sphere.
    const beacon = beaconGroupRef?.current;
    if (beacon) {
      _shipRaycaster.set(_origin, _dir);
      _shipRaycaster.far = len;
      const beaconHits = _shipRaycaster.intersectObject(beacon, true);
      const isBeaconHit = beaconHits.length > 0;

      radioBeaconHitRef.current = isBeaconHit;

      // Dispatch event only on the rising edge.
      if (isBeaconHit && !wasBeaconHit.current) {
        window.dispatchEvent(new CustomEvent('RadioBeaconHit'));
      }

      wasBeaconHit.current = isBeaconHit;
    } else {
      radioBeaconHitRef.current = false;
    }
  });

  return (
    <>
      {/* Bright cyan laser core */}
      <mesh ref={coreRef} frustumCulled={false}>
        <cylinderGeometry args={[0.08, 0.08, 1, 8]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Soft glow halo around the core */}
      <mesh ref={glowRef} frustumCulled={false}>
        <cylinderGeometry args={[0.4, 0.4, 1, 8]} />
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0.0005}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Impact group — sphere + HTML distance label, both anchored at the hit point */}
      <group ref={impactGroupRef} frustumCulled={false}>
        {/* Pulsing orange sphere at the hit surface */}
        <mesh ref={impactSphereRef} visible={false}>
          <sphereGeometry args={[2, 16, 16]} />
          <meshBasicMaterial
            color="#ff8800"
            transparent
            opacity={0.7}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* HTML label floated above the impact point */}
        <Html center position={[0, 8, 0]}>
          <div
            ref={labelRef}
            style={{
              display: 'none',
              color: '#ffffff',
              background: 'rgba(0, 0, 0, 0.7)',
              padding: '3px 10px',
              borderRadius: '4px',
              fontSize: '13px',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              border: '1px solid rgba(0, 255, 255, 0.5)',
              letterSpacing: '0.03em',
            }}
          />
        </Html>
      </group>

      {/*
        Cyan spotlight — originates at the laser source, aimed at the cursor (or impact point).
        decay={0}: constant intensity regardless of distance (needed for a 500-unit range scene).
        angle/penumbra: controls the cone shape and soft edge.
      */}
      <spotLight
        ref={spotLightRef}
        color="#fff"
        intensity={4}
        angle={0.58}
        penumbra={0.85}
        decay={0.2}
        distance={500}
        castShadow={false}
      />

      {/* Scene-graph target object — Three.js reads its world position to compute light direction. */}
      <group ref={spotTargetRef} />
    </>
  );
}
