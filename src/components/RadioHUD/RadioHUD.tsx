import { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { radioOnRef, radioRangeRef } from '../../context/RadioState';
import { shipPosRef } from '../../context/ShipPos';
import {
  RADIO_BROADCAST_DEFS,
  RADIO_BEACON_DEFS,
  SPACE_STATION_DEF,
} from '../../config/worldConfig';
import type { RadioBroadcastDef } from '../../config/worldConfig';
import { solarPlanetPositions } from '../../context/SolarSystemMinimap';
import { SOLAR_SYSTEM_SCALE } from '../SolarSystem';
import { SelectionDialog } from '../SelectionDialog/SelectionDialog';
import { BroadcastDialog } from '../BroadcastDialog/BroadcastDialog';
import { getCollidables } from '../../context/CollisionRegistry';
import './RadioHUD.css';

export const RadioHUD = () => {
  const [radioIsOn, setRadioIsOn] = useState(false);
  const [inRangeBroadcasts, setInRangeBroadcasts] = useState<RadioBroadcastDef[]>([]);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [activeBroadcast, setActiveBroadcast] = useState<RadioBroadcastDef | null>(null);

  const prevOnRef = useRef(false);
  const prevSignatureRef = useRef('');

  useEffect(() => {
    let raf: number;
    const broadcastPos = new THREE.Vector3();
    const tick = () => {
      const on = radioOnRef.current;
      const elapsed = performance.now() / 1000;

      if (on !== prevOnRef.current) {
        prevOnRef.current = on;
        setRadioIsOn(on);
        if (!on) {
          prevSignatureRef.current = '';
          setInRangeBroadcasts([]);
        }
      }

      if (on) {
        const range = radioRangeRef.current;
        const { x, y, z } = shipPosRef.current;
        const stationCollidable = getCollidables().find((c) => c.id === 'space-station');
        if (stationCollidable) stationCollidable.getWorldPosition(broadcastPos);
        const stationBeacon: RadioBroadcastDef = {
          id: 'beacon-station',
          label: 'Station Beacon',
          position: stationCollidable
            ? [broadcastPos.x, broadcastPos.y, broadcastPos.z]
            : SPACE_STATION_DEF.position,
          dialogue: ['STATION BEACON ONLINE.'],
        };

        const beaconBroadcasts: RadioBroadcastDef[] = RADIO_BEACON_DEFS.map((def) => {
          if (def.orbit) {
            const planetPos = solarPlanetPositions[def.orbit.planetName];
            if (planetPos) {
              const angle = (def.orbit.phase ?? 0) + elapsed * def.orbit.speed;
              const orbitX = Math.cos(angle) * def.orbit.radius;
              const orbitZ = Math.sin(angle) * def.orbit.radius;
              return {
                id: def.id,
                label: def.label,
                position: [
                  planetPos.x * SOLAR_SYSTEM_SCALE + orbitX,
                  0,
                  planetPos.z * SOLAR_SYSTEM_SCALE + orbitZ,
                ],
                dialogue: ['AUTOMATED BEACON SIGNAL DETECTED.'],
              };
            }
          }
          return {
            id: def.id,
            label: def.label,
            position: def.position,
            dialogue: ['AUTOMATED BEACON SIGNAL DETECTED.'],
          };
        });

        const dynamicBroadcasts: RadioBroadcastDef[] = RADIO_BROADCAST_DEFS.map((def) => {
          const collidable = getCollidables().find((c) => c.id === def.id);
          if (collidable) {
            collidable.getWorldPosition(broadcastPos);
            return {
              ...def,
              position: [broadcastPos.x, broadcastPos.y, broadcastPos.z],
            };
          }
          return def;
        });

        const inRange = [...dynamicBroadcasts, stationBeacon, ...beaconBroadcasts].filter((def) => {
          const [bx, by, bz] = def.position;
          const dx = x - bx;
          const dy = y - by;
          const dz = z - bz;
          return Math.sqrt(dx * dx + dy * dy + dz * dz) <= range;
        });

        const signature = inRange
          .map((def) => def.id)
          .sort()
          .join('|');
        if (signature !== prevSignatureRef.current) {
          prevSignatureRef.current = signature;
          setInRangeBroadcasts(inRange);
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!radioIsOn) return null;

  const handleSelect = (id: string) => {
    const def = inRangeBroadcasts.find((b) => b.id === id);
    if (def) setActiveBroadcast(def);
  };

  return (
    <>
      <div className="radio-wrapper">
        <div className="radio-label">RADIO</div>
        {inRangeBroadcasts.length === 0 ? (
          <div className="radio-no-signal">NO SIGNAL</div>
        ) : (
          <button className="radio-signal-btn" onClick={() => setSelectionOpen(true)}>
            {inRangeBroadcasts.length} BROADCAST{inRangeBroadcasts.length !== 1 ? 'S' : ''} IN RANGE
          </button>
        )}
      </div>

      {selectionOpen && (
        <SelectionDialog
          title="SELECT BROADCAST"
          items={inRangeBroadcasts.map((b) => ({ id: b.id, label: b.label }))}
          onSelect={handleSelect}
          onClose={() => setSelectionOpen(false)}
        />
      )}

      {activeBroadcast && (
        <BroadcastDialog broadcast={activeBroadcast} onClose={() => setActiveBroadcast(null)} />
      )}
    </>
  );
};
