import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Perf } from 'r3f-perf';
import Spaceship from '../Ship/Spaceship';
import SharedInteractionSceneTools from '../SharedInteractionSceneTools';
import DustCloud from '../DustCloud/DustCloud';
import { minimapShipPosition } from '../../context/MinimapShipPosition';
import { shipPosRef } from '../../context/ShipPos';
import { sceneCamera } from '../../context/CameraRef';
import { gravityBodies } from '../../context/GravityRegistry';
import { registerCollidable, unregisterCollidable } from '../../context/CollisionRegistry';
import { registerMagnetic, unregisterMagnetic } from '../../context/MagneticRegistry';
import { registerDriveSignature, unregisterDriveSignature } from '../../context/DriveSignatureRegistry';
import { CANVAS_FOV, CANVAS_NEAR, CANVAS_FAR, TONE_MAPPING_EXPOSURE } from '../../config/visualConfig';

const NAV_SCENE_FOG = '#000000';
const NAV_PLANET_ID = 'nav-config-planet';
const NAV_PLANET_RADIUS = 900;
const NAV_PLANET_POSITION: [number, number, number] = [4800, 0, -7600];
const NAV_PLANET_MU = 18_000_000;
const NAV_PLANET_SOI = 9000;
const NAV_PLANET_ORBIT_ALT = 1600;

function CameraCapture() {
  const { camera } = useThree();
  useEffect(() => {
    sceneCamera.current = camera;
    return () => {
      sceneCamera.current = null;
    };
  }, [camera]);
  return null;
}

function GravityTestPlanet() {
  const groupRef = useRef<THREE.Group>(null);
  const planetPos = useMemo(
    () => new THREE.Vector3(NAV_PLANET_POSITION[0], NAV_PLANET_POSITION[1], NAV_PLANET_POSITION[2]),
    []
  );

  useEffect(() => {
    gravityBodies.set(NAV_PLANET_ID, {
      position: planetPos,
      velocity: new THREE.Vector3(0, 0, 0),
      mu: NAV_PLANET_MU,
      soiRadius: NAV_PLANET_SOI,
      surfaceRadius: NAV_PLANET_RADIUS,
      orbitAltitude: NAV_PLANET_ORBIT_ALT,
    });

    registerCollidable({
      id: NAV_PLANET_ID,
      label: 'Navigation Test Planet',
      getWorldPosition: (target) => target.copy(planetPos),
      shape: { type: 'sphere', radius: NAV_PLANET_RADIUS },
      planetSurfaceImpact: true,
      getObject3D: () => groupRef.current,
    });

    registerMagnetic({
      id: NAV_PLANET_ID,
      label: 'Navigation Test Planet',
      getPosition: (target) => target.copy(planetPos),
    });

    return () => {
      gravityBodies.delete(NAV_PLANET_ID);
      unregisterCollidable(NAV_PLANET_ID);
      unregisterMagnetic(NAV_PLANET_ID);
    };
  }, [planetPos]);

  return (
    <group ref={groupRef} position={NAV_PLANET_POSITION}>
      <mesh>
        <sphereGeometry args={[NAV_PLANET_RADIUS, 64, 64]} />
        <meshStandardMaterial color="#4466ff" emissive="#112244" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function NavTargetProbe({
  id,
  label,
  position,
  color,
}: {
  id: string;
  label: string;
  position: [number, number, number];
  color: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const probePos = useMemo(() => new THREE.Vector3(position[0], position[1], position[2]), [position]);

  useEffect(() => {
    registerCollidable({
      id,
      label,
      getWorldPosition: (target) => target.copy(probePos),
      shape: { type: 'sphere', radius: 120 },
      getObject3D: () => groupRef.current,
    });
    registerMagnetic({
      id,
      label,
      getPosition: (target) => target.copy(probePos),
    });
    registerDriveSignature({
      id,
      label,
      getPosition: (target) => target.copy(probePos),
      getVelocity: (target) => target.set(0, 0, 0),
    });

    return () => {
      unregisterCollidable(id);
      unregisterMagnetic(id);
      unregisterDriveSignature(id);
    };
  }, [id, label, probePos]);

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <icosahedronGeometry args={[90, 1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.75} />
      </mesh>
    </group>
  );
}

interface ShipNavigationConfigSceneProps {
  gravityEnabled?: boolean;
}

export default function ShipNavigationConfigScene({
  gravityEnabled = true,
}: ShipNavigationConfigSceneProps) {
  useEffect(() => {
    shipPosRef.current.set(0, 0, 0);
    minimapShipPosition.set(0, 0, 0);
  }, []);

  return (
    <Canvas
      dpr={[1, 2]}
      style={{
        width: '100vw',
        height: '100vh',
        background: NAV_SCENE_FOG,
        touchAction: 'none',
      }}
      camera={{ fov: CANVAS_FOV, position: [0, 120, 280], near: CANVAS_NEAR, far: CANVAS_FAR }}
      gl={{
        logarithmicDepthBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: TONE_MAPPING_EXPOSURE,
      }}
      shadows
    >
      <CameraCapture />
      <Perf position="top-left" />
      <fogExp2 attach="fog" args={[NAV_SCENE_FOG, 0.0000007]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[220, 120, 160]} intensity={8} color="#dde7ff" />
      <gridHelper args={[12000, 80, '#2b6a8a', '#17394d']} />
      <axesHelper args={[200]} />

      <Suspense fallback={null}>
        <Spaceship
          url="/shuttle-low-british.glb"
          initialPosition={[0, 0, 0]}
          initialRotation={[0, 0, 0]}
          scale={1}
          initialVelocity={[0, 0, 0]}
          shipParticleCloudProps={{
            count: 80,
            enableSpeedGate: true,
            speedGateMin: 100000,
            speedGateMax: 100000,
          }}
          physicsOptions={{
            enabled: true,
            inputEnabled: true,
            thrusterPhysicsEnabled: true,
            orbitalPhysicsEnabled: true,
            dockingPhysicsEnabled: true,
          }}
        />
        {gravityEnabled ? <GravityTestPlanet /> : null}
        <NavTargetProbe
          id="nav-config-probe-alpha"
          label="Nav Probe Alpha"
          position={[2400, 0, -1600]}
          color="#00d1ff"
        />
        <NavTargetProbe
          id="nav-config-probe-beta"
          label="Nav Probe Beta"
          position={[-1800, 0, 3200]}
          color="#ffbb33"
        />
        <NavTargetProbe
          id="nav-config-probe-gamma"
          label="Nav Probe Gamma"
          position={[5200, 0, -2200]}
          color="#66ff99"
        />
      </Suspense>

      <SharedInteractionSceneTools />
      <OrbitControls makeDefault target={[0, 0, 0]} enablePan enableZoom enableRotate />
      <DustCloud radius={5000} particleSize={450} radialSpread={9} yInitial={-900} />
    </Canvas>
  );
}
