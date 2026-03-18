import { useState, useRef, useEffect } from 'react';
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
  const apsesRef = useRef<HTMLSpanElement>(null!);
  const autopilotBtnRef = useRef<HTMLButtonElement>(null!);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      if (coordsRef.current) {
        const { x, z } = shipPosRef.current;
        coordsRef.current.textContent = `${Math.round(x)}, ${Math.round(z)}`;
      }
      if (orbitRef.current) {
        const { bodyId, isOrbiting } = orbitStatusRef.current;
        const label = bodyId ? (ORBIT_LABELS.get(bodyId) ?? bodyId) : '—';
        orbitRef.current.textContent = isOrbiting ? `ORBITING: ${label}` : `SOI: ${label}`;
      }
      if (apsesRef.current) {
        const { bodyId, periapsis, apoapsis } = orbitStatusRef.current;
        if (bodyId && periapsis > 0) {
          apsesRef.current.textContent = `PERI: ${Math.round(periapsis)}  APO: ${apoapsis > 0 ? Math.round(apoapsis) : '—'}`;
        } else {
          apsesRef.current.textContent = 'PERI: —  APO: —';
        }
      }
      if (autopilotBtnRef.current) {
        const active = autopilotActive.current;
        autopilotBtnRef.current.textContent = active
          ? autopilotStatus.current
          : 'AUTOPILOT';
        autopilotBtnRef.current.className = `nav-target-btn autopilot-btn${active ? ' autopilot-active' : ''}`;
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
    // If planet, use live center from gravityBodies
    const gravBody =
      gravityBodies.get(id.charAt(0).toUpperCase() + id.slice(1)) || gravityBodies.get(id);
    if (gravBody) {
      navTargetPosRef.current.copy(gravBody.position);
    } else {
      navTargetPosRef.current.set(...def.position);
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
      <div className="hud-bar nav-bar">
        <div className="hud-metrics nav-metrics">
          <div className="hud-metric">
            <div className="hud-label">Position</div>
            <span ref={coordsRef} className="hud-value nav-coords" />
          </div>
          <div className="hud-divider" />
          <div className="hud-metric">
            <div className="hud-label">Orbit</div>
            <span ref={orbitRef} className="hud-value nav-orbit" />
          </div>
          <div className="hud-divider" />
          <div className="hud-metric">
            <div className="hud-label">Apsis</div>
            <span ref={apsesRef} className="hud-value nav-apses" />
          </div>
        </div>
        <div className="nav-target-group">
          <div className="nav-target-label">Nav Target</div>
          <button className="nav-target-btn" onClick={() => setDialogOpen(true)}>
            {displayLabel}
          </button>
        </div>
        <div className="nav-target-group">
          <div className="nav-target-label">Autopilot</div>
          <button
            ref={autopilotBtnRef}
            className="nav-target-btn autopilot-btn"
            onClick={handleAutopilot}
          >
            AUTOPILOT
          </button>
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
