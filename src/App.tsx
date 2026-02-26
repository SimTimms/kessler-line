import { useState, useEffect, useRef } from 'react';
import './App.css';
import Scene from './components/Scene';
import PowerHUD from './components/PowerHUD';
import MiniMap from './components/MiniMap';
import { TimeProvider } from './context/TimeProvider';
import { spotlightOnRef } from './components/LaserRay';

function App() {
  const [spotlightOn, setSpotlightOn] = useState(true);
  const [magneticOn, setMagneticOn] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
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
      <PowerHUD />
      {showMinimap && <MiniMap />}

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
            background: spotlightOn ? 'rgba(0,200,255,0.15)' : 'rgba(60,60,60,0.5)',
            color: spotlightOn ? '#00cfff' : '#888',
            border: `1px solid ${spotlightOn ? '#00cfff' : '#555'}`,
            borderRadius: 4,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          SPOTLIGHT: {spotlightOn ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={() => {
            setMagneticOn((magneticOn) => !magneticOn);
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

      {/* Inject keyframe for the button pulse glow */}
      <style>{`
        @keyframes beaconPulse {
          0%, 100% { box-shadow: 0 0 6px rgba(0,255,136,0.4); }
          50%       { box-shadow: 0 0 18px rgba(0,255,136,0.9); }
        }
      `}</style>
    </div>
  );
}

export default App;
