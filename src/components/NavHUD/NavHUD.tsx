import { useState, useRef, useEffect, use } from 'react';
import { NAV_TARGET_DEFS } from '../../config/worldConfig';
import { navTargetPosRef, navTargetIdRef } from '../../context/NavTarget';
import { gravityBodies } from '../../context/GravityRegistry';
import { shipPosRef } from '../../context/ShipPos';
import { orbitStatusRef } from '../../context/ShipState';
import { SelectionDialog } from '../SelectionDialog/SelectionDialog';
import {
  autopilotActive,
  autopilotPhase,
  autopilotStatus,
  enableAutopilot,
  disableAutopilot,
} from '../../context/AutopilotState';
import './NavHUD.css';

const NAV_TARGETS = NAV_TARGET_DEFS;
const ORBIT_LABELS = new Map(NAV_TARGET_DEFS.map((p) => [p.id, p.label]));

export const NavHUD = () => {
  const [targetId, setTargetId] = useState(navTargetIdRef.current);
  const [targetLabel, setTargetLabel] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Coords display — mutated directly to avoid re-renders
  const coordsRef = useRef<HTMLSpanElement>(null!);
  const orbitRef = useRef<HTMLSpanElement>(null!);
  const altRef = useRef<HTMLSpanElement>(null!);
  const periapsisRef = useRef<HTMLSpanElement>(null!);
  const apoapsisRef = useRef<HTMLSpanElement>(null!);
  const apsesTargetRef = useRef<HTMLSpanElement>(null!);
  const approachRef = useRef<HTMLSpanElement>(null!);
  const autopilotBtnRef = useRef<HTMLButtonElement>(null!);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      if (coordsRef.current) {
        const { x, z } = shipPosRef.current;
        coordsRef.current.textContent = `${Math.round(x)}, ${Math.round(z)}`;
      }
      if (orbitRef.current) {
        const { bodyId } = orbitStatusRef.current;
        const label = bodyId ? (ORBIT_LABELS.get(bodyId) ?? bodyId) : '—';
        orbitRef.current.textContent = label;
      }
      if (altRef.current) {
        const { bodyId, surfaceRadius } = orbitStatusRef.current;
        if (bodyId) {
          const body = gravityBodies.get(bodyId);
          if (body) {
            const dx = shipPosRef.current.x - body.position.x;
            const dy = shipPosRef.current.y - body.position.y;
            const dz = shipPosRef.current.z - body.position.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const alt = Math.max(0, dist - surfaceRadius);
            altRef.current.textContent = `${Math.round(alt)}`;
          }
        } else {
          altRef.current.textContent = '—';
        }
      }
      if (periapsisRef.current) {
        const { bodyId, periapsis, surfaceRadius } = orbitStatusRef.current;
        if (bodyId && periapsis > 0) {
          const periAlt = Math.max(0, periapsis - surfaceRadius);
          periapsisRef.current.textContent = `${Math.round(periAlt)}`;
        } else {
          periapsisRef.current.textContent = '—';
        }
      }
      if (apoapsisRef.current) {
        const { bodyId, apoapsis, surfaceRadius } = orbitStatusRef.current;
        if (bodyId && apoapsis > 0) {
          const apoAlt = Math.max(0, apoapsis - surfaceRadius);
          apoapsisRef.current.textContent = `${Math.round(apoAlt)}`;
        } else {
          apoapsisRef.current.textContent = '—';
        }
      }
      if (apsesTargetRef.current) {
        const { bodyId } = orbitStatusRef.current;
        if (bodyId) {
          const idealAlt = gravityBodies.get(bodyId)?.orbitAltitude;
          apsesTargetRef.current.textContent = idealAlt != null ? `[${Math.round(idealAlt)}]` : '—';
        } else {
          apsesTargetRef.current.textContent = '—';
        }
      }
      if (approachRef.current) {
        const { bodyId, periapsis, apoapsis, surfaceRadius, radialVelocity } =
          orbitStatusRef.current;
        if (bodyId && periapsis > 0) {
          const body = gravityBodies.get(bodyId);
          if (body) {
            const dx = shipPosRef.current.x - body.position.x;
            const dy = shipPosRef.current.y - body.position.y;
            const dz = shipPosRef.current.z - body.position.z;
            const currentAlt = Math.max(0, Math.sqrt(dx * dx + dy * dy + dz * dz) - surfaceRadius);
            if (radialVelocity >= 0 && apoapsis > 0) {
              const apoAlt = Math.max(0, apoapsis - surfaceRadius);
              approachRef.current.textContent = `APO +${Math.round(apoAlt - currentAlt)}`;
            } else {
              const periAlt = Math.max(0, periapsis - surfaceRadius);
              approachRef.current.textContent = `PERI -${Math.round(currentAlt - periAlt)}`;
            }
          }
        } else {
          approachRef.current.textContent = '—';
        }
      }
      if (autopilotBtnRef.current) {
        const active = autopilotActive.current;
        autopilotBtnRef.current.textContent = active ? autopilotStatus.current : 'DISENGAGED';
        autopilotBtnRef.current.className = `autopilot-btn ${active ? ' autopilot-active' : ''}`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Listen for nav target set by external systems (e.g. docking request approval)
  useEffect(() => {
    const onNavTargetSet = (e: Event) => {
      const { id, label } = (e as CustomEvent<{ id: string; label: string }>).detail;
      setTargetId(id);
      setTargetLabel(label);
    };
    window.addEventListener('NavTargetSet', onNavTargetSet);
    return () => window.removeEventListener('NavTargetSet', onNavTargetSet);
  }, []);

  const currentTarget = NAV_TARGETS.find((t) => t.id === targetId);
  const displayLabel = currentTarget?.label ?? (targetLabel || '—');

  const handleSelect = (id: string) => {
    const def = NAV_TARGETS.find((t) => t.id === id);
    if (!def) return;
    setTargetId(id);
    setTargetLabel('');
    navTargetIdRef.current = id;
    if (def.orbit) {
      // Moon/satellite — navigate to the live position of the parent planet
      const parentBody = gravityBodies.get(def.orbit.planetName);
      if (parentBody) {
        navTargetPosRef.current.copy(parentBody.position);
      } else {
        navTargetPosRef.current.set(...def.position);
      }
    } else {
      // If planet, use live center from gravityBodies
      const gravBody =
        gravityBodies.get(id.charAt(0).toUpperCase() + id.slice(1)) || gravityBodies.get(id);
      if (gravBody) {
        navTargetPosRef.current.copy(gravBody.position);
      } else {
        navTargetPosRef.current.set(...def.position);
      }
    }
    // Re-align to new target if autopilot is already active
    if (autopilotActive.current) {
      autopilotPhase.current = 'align';
    }
  };

  const handleAutopilot = () => {
    if (autopilotActive.current) {
      disableAutopilot();
      window.dispatchEvent(new CustomEvent('AutopilotChanged', { detail: { active: false } }));
    } else {
      enableAutopilot();
      window.dispatchEvent(new CustomEvent('AutopilotChanged', { detail: { active: true } }));
    }
  };

  return (
    <>
      <div className="hud-bar-wrapper ">
        <div className="hud-bar">
          {/*
        <div className="hud-metrics nav-metrics">
          <div className="hud-metric">
            <div className="hud-label">X | Z</div>
            <span ref={coordsRef} className="hud-value nav-coords" />
          </div>
        </div>
        */}
          <div className="nav-target-group">
            <div className="nav-target-label">Nav Target</div>
            <button className="nav-target-btn" onClick={() => setDialogOpen(true)}>
              {displayLabel}
            </button>
          </div>
          <div className="nav-target-group">
            <div className="nav-target-label">Autopilot</div>
            <button ref={autopilotBtnRef} className="autopilot-btn" onClick={handleAutopilot}>
              AUTOPILOT
            </button>
          </div>
          <div className="hud-divider" />

          <div className="hud-metrics nav-metrics">
            <div className="hud-metric">
              <div className="hud-label">
                {orbitStatusRef.current.isOrbiting === true ? 'ORBIT' : 'SOI'}
              </div>
              <span ref={orbitRef} className="hud-value nav-orbit" />
            </div>
            <div className="hud-divider" />
            <div className="hud-metric" style={{ minWidth: '50px' }}>
              <div className="hud-label">Altitude</div>
              <span ref={altRef} className="hud-value nav-alt" />
              <span ref={apsesTargetRef} className="hud-value nav-apses-target" />
            </div>
            <div className="hud-divider" />
            <div className="hud-metric">
              <div className="hud-label">Apsis</div>
              <div className="hud-metric-inline">
                <div className="hud-label">Per</div>
                <span ref={periapsisRef} className="hud-value nav-periapsis" />
              </div>
              <div className="hud-metric-inline">
                <div className="hud-label">Apo</div>
                <span ref={apoapsisRef} className="hud-value nav-apoapsis" />
              </div>
            </div>

            <div className="hud-divider" />
            <div className="hud-metric">
              <div className="hud-label">Approach</div>
              <span ref={approachRef} className="hud-value nav-approach" />
            </div>
          </div>
        </div>
      </div>

      {dialogOpen && (
        <SelectionDialog
          title="SELECT NAV TARGET"
          items={NAV_TARGETS.map((t) => ({ id: t.id, label: t.label }))}
          selectedId={targetId}
          onSelect={handleSelect}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </>
  );
};
