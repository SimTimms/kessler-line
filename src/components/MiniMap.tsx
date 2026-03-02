import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import MiniMapScene, { type HoverInfo } from './MiniMapScene';

// Renders inside the Canvas — keeps the orthographic frustum correct for any viewport size.
// top=25 shows world Z to -25 (past Neptune at -22), bottom=-4 shows Z to +4.
// left/right are computed to preserve the same pixels-per-unit as the vertical axis.
function CameraFrustum() {
  const { camera, size } = useThree();
  useEffect(() => {
    const orth = camera as THREE.OrthographicCamera;
    const hHalf = (size.width / size.height) * 14.5; // 14.5 = (25 + 4) / 2
    orth.top = 25;
    orth.bottom = -4;
    orth.left = -hHalf;
    orth.right = hHalf;
    orth.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

export default function MiniMap() {
  const [tooltip, setTooltip] = useState<HoverInfo | null>(null);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 8, 0.88)',
        zIndex: 10,
      }}
    >
      <Canvas
        orthographic
        camera={{ position: [0, 10, 0], up: [0, 0, -1], near: -100, far: 5000 }}
        gl={{ antialias: false }}
      >
        <CameraFrustum />
        <MiniMapScene onHover={(info) => setTooltip(info)} />
      </Canvas>

      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + 14,
            top: tooltip.y - 10,
            background: 'rgba(0, 0, 8, 0.9)',
            color: '#00ff88',
            fontFamily: 'monospace',
            fontSize: 13,
            padding: '4px 10px',
            borderRadius: 3,
            border: '1px solid rgba(0,255,136,0.5)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            letterSpacing: '0.05em',
          }}
        >
          {tooltip.label}
        </div>
      )}

      {/* Subtle corner label so the user knows M closes it */}
      <div
        style={{
          position: 'fixed',
          top: 16,
          right: 20,
          color: 'rgba(0,255,136,0.4)',
          fontFamily: 'monospace',
          fontSize: 12,
          letterSpacing: '0.1em',
          pointerEvents: 'none',
        }}
      >
        [M] CLOSE MAP
      </div>
    </div>
  );
}
