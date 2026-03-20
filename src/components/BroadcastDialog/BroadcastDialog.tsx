import { useRef, useState } from 'react';
import * as THREE from 'three';
import type { RadioBroadcastDef } from '../../config/worldConfig';
import { navTargetPosRef, navTargetIdRef } from '../../context/NavTarget';
import './BroadcastDialog.css';
import { gravityBodies } from '../../context/GravityRegistry';

interface BroadcastDialogProps {
  broadcast: RadioBroadcastDef;
  onClose: () => void;
}

type DockingStatus = null | 'approved' | 'denied';

export function BroadcastDialog({ broadcast, onClose }: BroadcastDialogProps) {
  const [playing, setPlaying] = useState(false);
  const [dockingStatus, setDockingStatus] = useState<DockingStatus>(null);
  const [navSet, setNavSet] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleAudio = () => {
    if (!broadcast.audioFile) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(broadcast.audioFile);
      audioRef.current.addEventListener('ended', () => setPlaying(false));
    }
    if (playing) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    onClose();
  };

  const handleDockingRequest = () => {
    const approved = Math.random() < 0.8;
    setDockingStatus(approved ? 'approved' : 'denied');
  };

  const handleSetNav = () => {
    navTargetIdRef.current = broadcast.id;
    // If planet, use live center from gravityBodies
    const gravBody =
      gravityBodies.get(broadcast.id.charAt(0).toUpperCase() + broadcast.id.slice(1)) ||
      gravityBodies.get(broadcast.id);
    let pos;
    if (gravBody) {
      navTargetPosRef.current.copy(gravBody.position);
      pos = gravBody.position.clone();
    } else {
      navTargetPosRef.current.set(...broadcast.position);
      pos = new THREE.Vector3(...broadcast.position);
    }
    window.dispatchEvent(
      new CustomEvent('NavTargetSet', {
        detail: { id: broadcast.id, label: broadcast.label, position: pos },
      })
    );
    setNavSet(true);
  };

  return (
    <div className="bd-backdrop" onClick={handleClose}>
      <div className="bd-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="bd-title">{broadcast.label}</div>

        <div className="bd-dialogue">
          {broadcast.dialogue.map((line, i) => (
            <div key={i} className="bd-line">
              {line}
            </div>
          ))}
        </div>

        {broadcast.audioFile && (
          <button className="bd-audio-btn" onClick={handleAudio}>
            {playing ? '■ STOP AUDIO' : '▶ PLAY AUDIO'}
          </button>
        )}

        {broadcast.dockable && (
          <div className="bd-options">
            <div className="bd-options-label">OPTIONS</div>
            {dockingStatus === null && (
              <button className="bd-option-btn" onClick={handleDockingRequest}>
                REQUEST DOCKING
              </button>
            )}
            {dockingStatus === 'approved' && (
              <div className="bd-docking-response bd-docking-approved">
                <div>DOCKING REQUEST: APPROVED</div>
                <div>ASSIGNED BAY: {broadcast.dockingBay}</div>
                <button className="bd-nav-btn" onClick={handleSetNav} disabled={navSet}>
                  {navSet ? 'NAV COURSE SET' : 'SET NAV COURSE'}
                </button>
              </div>
            )}
            {dockingStatus === 'denied' && (
              <div className="bd-docking-response bd-docking-denied">DOCKING REQUEST: DENIED</div>
            )}
          </div>
        )}

        <button className="bd-close" onClick={handleClose}>
          ✕ CLOSE
        </button>
      </div>
    </div>
  );
}
