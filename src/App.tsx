import { useState, useEffect, useRef } from 'react';
import './App.css';
import Scene from './components/Scene';
import PowerHUD from './components/PowerHUD';
import MiniMap from './components/MiniMap';
import DockingDialog from './components/DockingDialog';
import NPCContactDialog, { type NPCHailDetail } from './components/NPCContactDialog';
import { TimeProvider } from './context/TimeProvider';
import { spotlightOnRef } from './components/LaserRay';
import {
  isRefueling,
  isTransferringO2,
  thrustMultiplier,
  shipAcceleration,
  THRUST,
} from './components/Spaceship';
import { setCargo, clearCargo } from './context/Inventory';
import { magneticOnRef } from './context/MagneticScan';
import MagneticHUD from './components/MagneticHUD';
import { driveSignatureOnRef } from './context/DriveSignatureScan';
import DriveSignatureHUD from './components/DriveSignatureHUD';

// Full-screen overlay that darkens the canvas to simulate G-force blackout.
// Sits above the canvas but below the HUD via DOM order (no z-index needed).
// Uses direct DOM mutation via RAF — no React re-renders.
function GForceOverlay() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const gForceRef = useRef(0);

  useEffect(() => {
    let rafId: number;
    let lastTime = performance.now();

    const update = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Normalise: max acceleration = THRUST × 50× multiplier
      const normalizedAccel = Math.min(shipAcceleration.current / (THRUST * 50), 1);
      // Builds quickly, dissipates slowly — like a real g-force blackout
      const rate = normalizedAccel > gForceRef.current ? 3.0 : 0.8;
      gForceRef.current += (normalizedAccel - gForceRef.current) * delta * rate;

      if (overlayRef.current) {
        overlayRef.current.style.opacity = String(gForceRef.current * 0.95);
      }

      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        opacity: 0,
        pointerEvents: 'none',
      }}
    />
  );
}

function ShipDestroyedOverlay() {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDestroyed = () => {
      if (overlayRef.current) overlayRef.current.style.display = 'flex';
    };
    window.addEventListener('ShipDestroyed', onDestroyed);
    return () => window.removeEventListener('ShipDestroyed', onDestroyed);
  }, []);

  return (
    <div
      ref={overlayRef}
      style={{
        display: 'none',
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
        pointerEvents: 'none',
        zIndex: 200,
      }}
    >
      <div
        style={{
          color: '#ff2222',
          fontSize: 52,
          fontFamily: 'monospace',
          fontWeight: 'bold',
          letterSpacing: '0.08em',
        }}
      >
        HULL BREACH
      </div>
      <div
        style={{ color: '#ff7777', fontSize: 22, fontFamily: 'monospace', letterSpacing: '0.12em' }}
      >
        SHIP DESTROYED
      </div>
    </div>
  );
}

function App() {
  const [thrustLevel, setThrustLevel] = useState(1);
  const [spotlightOn, setSpotlightOn] = useState(true);
  const [magneticOn, setMagneticOn] = useState(false);
  const [driveSignatureOn, setDriveSignatureOn] = useState(false);
  const [docked, setDocked] = useState(false);
  const [dockedStation, setDockedStation] = useState<string | null>(null);
  const [activeMission, setActiveMission] = useState<'kronos4' | 'mars' | 'neptune' | null>(null);
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);
  const [refueling, setRefueling] = useState(false);
  const [transferringO2, setTransferringO2] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  const [npcHail, setNpcHail] = useState<NPCHailDetail | null>(null);
  const [beaconActivated, setBeaconActivated] = useState(false);
  const [listeningToMessage, setListeningToMessage] = useState(false);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') setShowMinimap((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onDocked = (e: Event) => {
      const detail = (e as CustomEvent<{ stationId: string | null }>).detail;
      setDocked(true);
      setDockedStation(detail?.stationId ?? null);
    };
    const onUndocked = () => {
      setDocked(false);
      setDockedStation(null);
      setRefueling(false);
      setTransferringO2(false);
      isRefueling.current = false;
      isTransferringO2.current = false;
    };
    window.addEventListener('ShipDocked', onDocked);
    window.addEventListener('ShipUndocked', onUndocked);
    return () => {
      window.removeEventListener('ShipDocked', onDocked);
      window.removeEventListener('ShipUndocked', onUndocked);
    };
  }, []);

  useEffect(() => {
    const onNPCHail = (e: Event) => {
      const detail = (e as CustomEvent<NPCHailDetail>).detail;
      // Don't interrupt a docking dialog already in progress
      if (!docked) setNpcHail(detail);
    };
    window.addEventListener('NPCHail', onNPCHail);
    return () => window.removeEventListener('NPCHail', onNPCHail);
  }, [docked]);

  useEffect(() => {
    const onBeaconClicked = (e: Event) => {
      const { audioFile } = (e as CustomEvent<{ audioFile: string }>).detail;

      // Stop whatever is currently playing.
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      }

      // Lazily create an Audio element for each unique file.
      if (!audioMapRef.current.has(audioFile)) {
        const audio = new Audio(audioFile);
        audio.loop = false;
        audio.addEventListener('ended', () => setListeningToMessage(false));
        audioMapRef.current.set(audioFile, audio);
      }

      activeAudioRef.current = audioMapRef.current.get(audioFile)!;
      setBeaconActivated(true);
      setListeningToMessage(false);
    };

    window.addEventListener('RadioBeaconClicked', onBeaconClicked);
    return () => {
      window.removeEventListener('RadioBeaconClicked', onBeaconClicked);
      activeAudioRef.current?.pause();
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <TimeProvider>
        <Scene />
      </TimeProvider>
      <GForceOverlay />
      <ShipDestroyedOverlay />
      <PowerHUD />
      <MagneticHUD />
      <DriveSignatureHUD />
      {showMinimap && <MiniMap />}

      {npcHail && !docked && (
        <NPCContactDialog detail={npcHail} onDismiss={() => setNpcHail(null)} />
      )}

      {docked && (
        <DockingDialog
          stationId={dockedStation}
          activeMission={activeMission}
          completedMissions={completedMissions}
          refueling={refueling}
          transferringO2={transferringO2}
          onRefuel={() => {
            const next = !refueling;
            setRefueling(next);
            isRefueling.current = next;
          }}
          onTransferO2={() => {
            const next = !transferringO2;
            setTransferringO2(next);
            isTransferringO2.current = next;
          }}
          onMissionSelect={(mission) => {
            if (mission === 'mars') {
              setCargo([{ name: 'Food', quantity: 20 }]);
              setActiveMission('mars');
            } else if (mission === 'neptune') {
              setCargo([{ name: 'Data Cores', quantity: 15 }]);
              setActiveMission('neptune');
            } else if (mission === 'kronos4') {
              setCargo([{ name: 'Emergency Data Recorder', quantity: 1 }]);
              setActiveMission('kronos4');
            }
          }}
          onMissionComplete={() => {
            clearCargo();
            setActiveMission(null);
            setCompletedMissions((prev) => [...prev, 'kronos4']);
          }}
        />
      )}

      {/* Spotlight toggle */}
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          fontFamily: 'monospace',
          fontSize: 14,
          padding: '6px 14px',
          display: 'flex',
          gap: 10,
        }}
      >
        <button
          onClick={() => {
            const next = !spotlightOnRef.current;
            spotlightOnRef.current = next;
            setSpotlightOn(next);
          }}
          style={{
            padding: '6px 14px',
            background: spotlightOn ? 'rgba(0,200,255,0.05)' : 'rgba(60,60,60,0.1)',
            color: spotlightOn ? '#00cfff' : '#888',
            borderRadius: 0,
            cursor: 'pointer',
            userSelect: 'none',
            outline: 'none',
            width: '150px',
          }}
        >
          SPOTLIGHT
        </button>
        <button
          onClick={() => {
            setMagneticOn((prev) => {
              const next = !prev;
              magneticOnRef.current = next;
              return next;
            });
          }}
          style={{
            padding: '6px 14px',
            background: magneticOn ? 'rgba(0,200,255,0.15)' : 'rgba(60,60,60,0.5)',
            color: magneticOn ? '#00cfff' : '#888',
            border: `1px solid ${magneticOn ? '#00cfff' : '#555'}`,
            borderRadius: 4,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          MAGNETIC: {magneticOn ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={() => {
            setDriveSignatureOn((prev) => {
              const next = !prev;
              driveSignatureOnRef.current = next;
              return next;
            });
          }}
          style={{
            padding: '6px 14px',
            background: driveSignatureOn ? 'rgba(255,68,68,0.15)' : 'rgba(60,60,60,0.5)',
            color: driveSignatureOn ? '#ff4444' : '#888',
            border: `1px solid ${driveSignatureOn ? '#ff4444' : '#555'}`,
            borderRadius: 4,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          DRIVE SIG: {driveSignatureOn ? 'ON' : 'OFF'}
        </button>
      </div>
      {/* Listen to Message — appears once the RadioBeacon has been hit */}
      {beaconActivated && (
        <button
          onClick={() => {
            setListeningToMessage((v) => {
              const next = !v;
              if (next) {
                activeAudioRef.current?.play();
              } else {
                activeAudioRef.current?.pause();
                if (activeAudioRef.current) activeAudioRef.current.currentTime = 0;
              }
              return next;
            });
          }}
          style={{
            position: 'fixed',
            bottom: 16,
            left: 160,
            fontFamily: 'monospace',
            fontSize: 14,
            padding: '6px 14px',
            background: listeningToMessage ? 'rgba(0,255,136,0.2)' : 'rgba(0,255,136,0.07)',
            color: '#00ff88',
            border: '1px solid rgba(0,255,136,0.7)',
            borderRadius: 4,
            cursor: 'pointer',
            userSelect: 'none',
            animation: listeningToMessage ? 'none' : 'beaconPulse 1.4s ease-in-out infinite',
          }}
        >
          {listeningToMessage ? 'RECEIVING...' : 'LISTEN TO MESSAGE'}
        </button>
      )}

      {/* Thrust multiplier slider */}
      {(() => {
        const isDanger = thrustLevel >= 2;
        return (
          <div
            style={{
              position: 'fixed',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
              fontFamily: 'monospace',
              fontSize: 12,
              background: 'rgba(0,0,0,0.55)',
              padding: '8px 16px',
              borderRadius: 6,
              border: `1px solid ${isDanger ? 'rgba(255,40,140,0.85)' : 'rgba(0,200,255,0.3)'}`,
              userSelect: 'none',
            }}
          >
            <div
              style={{
                color: isDanger ? 'rgba(255,40,140,0.85)' : '#00cfff',
                letterSpacing: 1,
                fontWeight: 'bold',
              }}
            >
              THRUST: {thrustLevel.toFixed(1)}x{isDanger ? '  ⚠ DANGER' : ''}
            </div>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.5}
              value={thrustLevel}
              className={isDanger ? 'thrust-slider danger' : 'thrust-slider'}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setThrustLevel(v);
                thrustMultiplier.current = v;
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: 200,
                color: '#666',
                fontSize: 10,
              }}
            >
              <span>0.5×</span>
              <span>3×</span>
            </div>
          </div>
        );
      })()}

      {/* Inject keyframe for the button pulse glow */}
      <style>{`
        @keyframes beaconPulse {
          0%, 100% { box-shadow: 0 0 6px rgba(0,255,136,0.4); }
          50%       { box-shadow: 0 0 18px rgba(0,255,136,0.9); }
        }
        .thrust-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 200px;
          height: 6px;
          border-radius: 3px;
          background: linear-gradient(to right, rgba(0,200,255,0.8) 60.49%, rgba(0,0,0,0.8) 60.5%, rgba(255,40,140,0.85) 63%);
          outline: none;
          cursor: pointer;
        }
        .thrust-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #00cfff;
          cursor: pointer;
          border: 2px solid rgba(255,255,255,0.25);
        }
        .thrust-slider.danger::-webkit-slider-thumb {
          background: rgba(255,40,140,0.85);
          box-shadow: 0 0 7px rgba(255,50,50,0.9);
        }
        .thrust-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #00cfff;
          cursor: pointer;
          border: 2px solid rgba(255,255,255,0.25);
        }
        .thrust-slider.danger::-moz-range-thumb {
          background: rgba(255,40,140,0.85);
          box-shadow: 0 0 7px rgba(255,40,140,0.85);
        }
      `}</style>
    </div>
  );
}

export default App;
