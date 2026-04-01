import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { selectTarget } from '../../context/TargetSelection';

// Set true by LaserRay each frame while the beam intersects this beacon.
export const radioBeaconHitRef: { current: boolean } = { current: false };

interface RadioBeaconProps {
  beaconGroupRef?: { current: THREE.Group | null };
  index?: number;
  audioFile?: string;
}

export default function RadioBeacon({ beaconGroupRef, index = 0, audioFile }: RadioBeaconProps) {
  const outerGlowRef = useRef<THREE.Mesh>(null!);
  const labelRef = useRef<HTMLDivElement>(null!);

  useFrame(({ clock }) => {
    // Breathing pulse on the outer glow — faster and brighter when hit.
    if (outerGlowRef.current) {
      const rate = radioBeaconHitRef.current ? 6 : 2;
      const scale = 1 + Math.sin(clock.getElapsedTime() * rate) * 0.2;
      outerGlowRef.current.scale.setScalar(scale);
    }

    // Show / hide the "RadioBeacon" HTML label imperatively (no React re-render).
    if (labelRef.current) {
      labelRef.current.style.display = radioBeaconHitRef.current ? 'block' : 'none';
    }
  });

  return (
    <group
      ref={(el) => {
        if (beaconGroupRef) beaconGroupRef.current = el;
      }}
      onClick={(e) => {
        e.stopPropagation();
        selectTarget(`Radio Beacon ${index + 1}`);
        if (audioFile) {
          window.dispatchEvent(new CustomEvent('RadioBeaconClicked', { detail: { audioFile } }));
        }
      }}
    >
      {/* Outer glow shell — large, very transparent */}
      <mesh ref={outerGlowRef}>
        <sphereGeometry args={[12, 32, 32]} />
        <meshBasicMaterial
          color="#00ff88"
          transparent
          opacity={0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Mid glow layer */}
      <mesh>
        <sphereGeometry args={[16, 32, 32]} />
        <meshBasicMaterial
          color="#00ff88"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner core — slightly more opaque, visible as a solid orb */}
      <mesh>
        <sphereGeometry args={[10, 32, 32]} />
        <meshBasicMaterial
          color="#88ffcc"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* HTML label — shown imperatively by useFrame when laser hits */}
      <Html center position={[0, 28, 0]}>
        <div
          ref={labelRef}
          style={{
            display: 'none',
            color: '#00ff88',
            background: 'rgba(0, 0, 0, 0.8)',
            padding: '5px 14px',
            borderRadius: '4px',
            fontSize: '13px',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            border: '1px solid rgba(0, 255, 136, 0.6)',
            letterSpacing: '0.08em',
            textShadow: '0 0 8px rgba(0, 255, 136, 0.8)',
          }}
        >
          RadioBeacon
        </div>
      </Html>
    </group>
  );
}
