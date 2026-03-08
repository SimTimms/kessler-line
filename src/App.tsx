import { useState, useEffect, useRef } from 'react';
import './App.css';
import Scene from './components/Scene';
import PowerHUD from './components/PowerHUD';
import MiniMap from './components/MiniMap';
import DockingDialog from './components/DockingDialog';
import NPCContactDialog, { type NPCHailDetail } from './components/NPCContactDialog';
import { TimeProvider } from './context/TimeProvider';
import { playUiClick } from './context/SoundManager';
import { spotlightOnRef } from './components/LaserRay';
import { isRefueling, isTransferringO2, thrustMultiplier } from './components/Spaceship';
import { setCargo, clearCargo } from './context/Inventory';
import { magneticOnRef } from './context/MagneticScan';
import MagneticHUD from './components/MagneticHUD';
import { driveSignatureOnRef } from './context/DriveSignatureScan';
import DriveSignatureHUD from './components/DriveSignatureHUD';
import { proximityScanOnRef } from './context/ProximityScan';
import ProximityHUD from './components/ProximityHUD';
import { radioOnRef } from './context/RadioState';
import { RadioHUD } from './components/RadioHUD/RadioHUD';
import MobileControls from './components/MobileControls';
import { HUD } from './components/HUD/HUD';
import { NavHUD } from './components/NavHUD/NavHUD';
import { ShipDestroyedOverlay } from './components/ShipDestroyedOverlay';
import { GForceOverlay } from './GForceOverlay';
// Full-screen overlay that darkens the canvas to simulate G-force blackout.
// Sits above the canvas but below the HUD via DOM order (no z-index needed).
// Uses direct DOM mutation via RAF — no React re-renders.

function App() {
  const [thrustLevel, setThrustLevel] = useState(1);
  const [spotlightOn, setSpotlightOn] = useState(true);
  const [magneticOn, setMagneticOn] = useState(false);
  const [driveSignatureOn, setDriveSignatureOn] = useState(false);
  const [proximity, setProximity] = useState(false);
  const [radioOn, setRadioOn] = useState(false);
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

  // Global button click sound — fires for every <button> in the app
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element).closest('button')) playUiClick();
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
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
      <MobileControls />
      <PowerHUD />
      <MagneticHUD />
      <DriveSignatureHUD />
      <ProximityHUD />
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

      <HUD
        spotlightOn={spotlightOn}
        setSpotlightOn={setSpotlightOn}
        spotlightOnRef={spotlightOnRef}
        magneticOn={magneticOn}
        setMagneticOn={setMagneticOn}
        magneticOnRef={magneticOnRef}
        driveSignatureOn={driveSignatureOn}
        setDriveSignatureOn={setDriveSignatureOn}
        driveSignatureOnRef={driveSignatureOnRef}
        proximity={proximity}
        setProximity={setProximity}
        proximityScanOnRef={proximityScanOnRef}
        radioOn={radioOn}
        setRadioOn={setRadioOn}
        radioOnRef={radioOnRef}
      />
      <NavHUD />
      <RadioHUD />
      {/* Listen to Message — appears once the RadioBeacon has been hit */}
      {beaconActivated && (
        <button
          className="listen-btn"
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
            className="thrust-panel"
            style={{
              position: 'fixed',
              bottom: 8,
              right: '140px',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
              fontFamily: 'monospace',
              fontSize: 12,
              background: 'rgba(0,0,0,0.15)',
              backdropFilter: 'blur(10px)',
              padding: '8px 16px',
              border: `1px solid ${isDanger ? 'rgba(255,40,140,0.25)' : 'rgba(0,200,255,0.23)'}`,
              userSelect: 'none',
            }}
          >
            <div
              className="thrust-label-text"
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
              className="thrust-ticks"
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

      {/* Inject keyframe for the button pulse glow + mobile scaling */}
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
        .prox-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 200px;
          height: 6px;
          border-radius: 3px;
          background: linear-gradient(to right, rgba(68,255,204,0.8) var(--prox-pct, 23%), rgba(0,0,0,0.6) 0%);
          outline: none;
          cursor: pointer;
        }
        .prox-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #44ffcc;
          cursor: pointer;
          border: 2px solid rgba(255,255,255,0.25);
          box-shadow: 0 0 6px rgba(68,255,204,0.7);
        }
        .prox-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #44ffcc;
          cursor: pointer;
          border: 2px solid rgba(255,255,255,0.25);
          box-shadow: 0 0 6px rgba(68,255,204,0.7);
        }

        @media (pointer: coarse) {
          .hud-btn  { width: 68px !important; padding: 4px 6px !important; font-size: 10px !important; }
          .hud-row  { font-size: 10px !important; padding: 3px 6px !important; gap: 5px !important; }
          .power-hud { font-size: 10px !important; gap: 3px !important; }
          .thrust-panel { padding: 5px 10px !important; font-size: 10px !important; }
          .thrust-label-text { font-size: 10px !important; }
          .thrust-slider { width: 130px !important; }
          .thrust-ticks { width: 130px !important; font-size: 8px !important; }
          .prox-panel { padding: 4px 8px !important; font-size: 10px !important; }
          .prox-label { font-size: 10px !important; }
          .prox-slider { width: 130px !important; }
          .prox-ticks { width: 130px !important; font-size: 8px !important; }
          .listen-btn { font-size: 10px !important; padding: 4px 10px !important; }
          .mob-move { grid-template-columns: 36px 36px 36px !important; grid-template-rows: 36px 36px !important; gap: 5px !important; }
          .mob-move > div[style] { width: 36px !important; height: 36px !important; font-size: 13px !important; }
          .mob-rot  { gap: 5px !important; }
          .mob-rot  > div[style] { width: 36px !important; height: 36px !important; font-size: 13px !important; }
        }
      `}</style>
    </div>
  );
}

export default App;
