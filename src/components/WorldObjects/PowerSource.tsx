import { useRef, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Module-level scratch objects — avoid per-frame allocations.
const _colorRed = new THREE.Color('#ff0000');
const _colorBlue = new THREE.Color('#0055ff');
const _sphereWorldPos = new THREE.Vector3();

interface PowerSourceProps {
  scale?: number;
}

export default function PowerSource({ scale: _scale = 1 }: PowerSourceProps) {
  const powerMeshRef = useRef<THREE.Mesh>(null!);
  const powerMatRef = useRef<THREE.MeshBasicMaterial>(null!);
  const powerLabelRef = useRef<HTMLDivElement>(null!);
  const isPoweredRef = useRef(false);

  // Listen for laser hits dispatched by LaserRay. Check if the hit point landed
  // on the power source sphere; if so, permanently activate it.
  useEffect(() => {
    const onHit = (e: Event) => {
      if ((e as CustomEvent<{ objectName: string }>).detail.objectName !== 'power-source') {
        return;
      }

      if (isPoweredRef.current || !powerMeshRef.current) return;
      const { point } = (e as CustomEvent<{ point: THREE.Vector3; objectName: string }>).detail;
      powerMeshRef.current.getWorldPosition(_sphereWorldPos);
      if (point.distanceTo(_sphereWorldPos) < 705) {
        isPoweredRef.current = true;
        if (powerLabelRef.current) powerLabelRef.current.style.display = 'block';
      }
    };
    window.addEventListener('SpaceStationModelHit', onHit);
    return () => window.removeEventListener('SpaceStationModelHit', onHit);
  }, []);

  useFrame(() => {
    if (!isPoweredRef.current || !powerMatRef.current) return;
    const t = (Math.sin(Date.now() * 0.004) + 1) * 0.5;
    powerMatRef.current.color.lerpColors(_colorRed, _colorBlue, t);
    powerMatRef.current.opacity = 0.7 + Math.sin(Date.now() * 0.007) * 0.25;
  });

  return (
    <>
      <group rotation={[0, Math.PI, 0]}>
        {/* Power source — invisible until the laser hits it, then pulses red/blue permanently. */}
        <mesh ref={powerMeshRef} position={[0, 0, 0]} name="power-source">
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial
            ref={powerMatRef}
            color="#ff0000"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        <Html position={[0, 18, 0]}>
          <div
            ref={powerLabelRef}
            style={{
              display: 'none',
              color: '#ff6666',
              background: 'rgba(0, 0, 0, 0.75)',
              padding: '3px 10px',
              borderRadius: '4px',
              fontSize: '13px',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              border: '1px solid rgba(255, 80, 80, 0.6)',
              letterSpacing: '0.03em',
            }}
          >
            Power Source
          </div>
        </Html>
      </group>
    </>
  );
}
