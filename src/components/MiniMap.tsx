import { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import MiniMapScene, { type HoverInfo } from './MiniMapScene';
import { waypointPromptDef } from '../context/WaypointPrompt';
import { navTargetPosRef, navTargetIdRef } from '../context/NavTarget';
import { gravityBodies } from '../context/GravityRegistry';
import type { WorldObjectDef } from '../config/worldConfig';

// HALF_H_DEFAULT shows the full solar system (Neptune orbit ≈ 4 583 minimap units).
// HALF_H_MAX allows a small zoom-out beyond the default. HALF_H_MIN allows close-up.
const HALF_H_MIN = 5;
const HALF_H_MAX = 6500;
const HALF_H_DEFAULT = 5200;

// Pan clamp — keeps the view within a reasonable area around the solar system.
const PAN_LIMIT = 8000;

// Manages both the orthographic frustum and the camera pan position each frame.
function CameraController({
  halfHRef,
  panOffsetRef,
}: {
  halfHRef: React.RefObject<number>;
  panOffsetRef: React.RefObject<{ x: number; z: number }>;
}) {
  const { camera, size } = useThree();

  useFrame(() => {
    const orth = camera as THREE.OrthographicCamera;
    const h = halfHRef.current ?? HALF_H_DEFAULT;
    const hHalf = (size.width / size.height) * h;
    orth.top = h;
    orth.bottom = -h;
    orth.left = -hHalf;
    orth.right = hHalf;
    orth.updateProjectionMatrix();

    const pan = panOffsetRef.current ?? { x: 0, z: 0 };
    camera.position.x = pan.x;
    camera.position.z = pan.z;
  });

  return null;
}

export default function MiniMap() {
  const [tooltip, setTooltip] = useState<HoverInfo | null>(null);
  const [waypointPrompt, setWaypointPrompt] = useState<WorldObjectDef | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const halfHRef = useRef<number>(HALF_H_DEFAULT);
  const panOffsetRef = useRef({ x: 0, z: 0 });

  // Poll waypointPromptDef so clicks on dots surface as a React panel
  useEffect(() => {
    const poll = window.setInterval(() => {
      if (waypointPromptDef.current) {
        setWaypointPrompt(waypointPromptDef.current);
        waypointPromptDef.current = null;
      }
    }, 100);
    return () => window.clearInterval(poll);
  }, []);

  function confirmWaypoint() {
    if (!waypointPrompt) return;
    navTargetIdRef.current = waypointPrompt.id;
    const gravBody =
      gravityBodies.get(waypointPrompt.id.charAt(0).toUpperCase() + waypointPrompt.id.slice(1)) ||
      gravityBodies.get(waypointPrompt.id);
    if (gravBody) {
      navTargetPosRef.current.copy(gravBody.position);
    } else {
      navTargetPosRef.current.set(...waypointPrompt.position);
    }
    setWaypointPrompt(null);
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    halfHRef.current = Math.max(HALF_H_MIN, Math.min(HALF_H_MAX, halfHRef.current * factor));
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button === 0) {
      setIsDragging(true);
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging) return;
    // Convert screen pixels → minimap units using the current vertical frustum size.
    const scale = (2 * (halfHRef.current ?? HALF_H_DEFAULT)) / window.innerHeight;
    panOffsetRef.current.x = Math.max(
      -PAN_LIMIT,
      Math.min(PAN_LIMIT, panOffsetRef.current.x - e.movementX * scale)
    );
    panOffsetRef.current.z = Math.max(
      -PAN_LIMIT,
      Math.min(PAN_LIMIT, panOffsetRef.current.z - e.movementY * scale)
    );
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 8, 0.88)',
        backdropFilter: 'blur(5px)',
        zIndex: 10,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <Canvas
        orthographic
        camera={{ position: [0, 10, 0], up: [0, 0, -1], near: -100, far: 10000 }}
        gl={{ antialias: false }}
      >
        <CameraController halfHRef={halfHRef} panOffsetRef={panOffsetRef} />
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

      {waypointPrompt && (
        <div
          style={{
            position: 'fixed',
            bottom: 48,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 8, 0.95)',
            border: '1px solid rgba(255,153,0,0.6)',
            borderRadius: 4,
            padding: '16px 24px',
            fontFamily: 'monospace',
            color: '#ff9900',
            letterSpacing: '0.08em',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            zIndex: 11,
          }}
        >
          <div style={{ fontSize: 11, color: 'rgba(255,153,0,0.6)' }}>NAV COMPUTER</div>
          <div style={{ fontSize: 14 }}>PLOT WAYPOINT: {waypointPrompt.label.toUpperCase()}</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={confirmWaypoint}
              style={{
                background: 'rgba(255,153,0,0.15)',
                border: '1px solid rgba(255,153,0,0.7)',
                color: '#ff9900',
                fontFamily: 'monospace',
                fontSize: 12,
                letterSpacing: '0.1em',
                padding: '6px 18px',
                cursor: 'pointer',
              }}
            >
              CONFIRM
            </button>
            <button
              onClick={() => setWaypointPrompt(null)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'rgba(255,255,255,0.4)',
                fontFamily: 'monospace',
                fontSize: 12,
                letterSpacing: '0.1em',
                padding: '6px 18px',
                cursor: 'pointer',
              }}
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* Title */}
      <div
        style={{
          position: 'fixed',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(0,255,136,0.55)',
          fontFamily: 'monospace',
          fontSize: 11,
          letterSpacing: '0.18em',
          pointerEvents: 'none',
        }}
      >
        SOLAR SYSTEM — NAV CHART
      </div>

      {/* Legend */}
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: 20,
          color: 'rgba(255,255,255,0.3)',
          fontFamily: 'monospace',
          fontSize: 10,
          letterSpacing: '0.08em',
          pointerEvents: 'none',
          lineHeight: 1.8,
        }}
      >
        <div>
          <span style={{ color: '#ffffff' }}>▲</span> HEADING&nbsp;&nbsp;
          <span style={{ color: '#44ff88' }}>—</span> VELOCITY&nbsp;&nbsp;
          <span style={{ color: '#ff9900' }}>—</span> WAYPOINT&nbsp;&nbsp;
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>DRAG</span> PAN&nbsp;&nbsp;
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>SCROLL</span> ZOOM
        </div>
        <div style={{ marginTop: 4 }}>
          <span style={{ color: '#cc4400' }}>■</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.45)' }}>TERRAN CONCORDAT</span>
          &nbsp;&nbsp;&nbsp;
          <span style={{ color: '#888888' }}>■</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>CONTESTED</span>
          &nbsp;&nbsp;&nbsp;
          <span style={{ color: '#0088ff' }}>■</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.45)' }}>PERIPHERY LEAGUE</span>
        </div>
      </div>

      {/* Close hint */}
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
