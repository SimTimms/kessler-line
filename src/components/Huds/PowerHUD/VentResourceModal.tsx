import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyVentResource,
  getVentResourceAmount,
  getVentResourceCapacity,
  getVentableAmount,
  VENT_RESOURCE_META,
} from '../../../context/ventResource';
import type { VentResourceKind } from '../../../config/ventResourceConfig';
import { DOCK_TRANSFER_STEP } from '../../../config/dockTransferConfig';
import '../DockTransferHUD/DockTransferHUD.css';
import '../HelmetHUD/HelmetHUD.css';

interface VentResourceModalProps {
  kind: VentResourceKind;
  onClose: () => void;
}

export function VentResourceModal({ kind, onClose }: VentResourceModalProps) {
  const meta = VENT_RESOURCE_META[kind];
  const Icon = meta.icon;
  const [amountAtOpen, setAmountAtOpen] = useState(() => getVentResourceAmount(kind));
  const [maxVentableAtOpen, setMaxVentableAtOpen] = useState(() => getVentableAmount(kind));
  const [stagedVent, setStagedVent] = useState(0);
  const holdRef = useRef<number | null>(null);
  const lastTickRef = useRef(performance.now());

  useEffect(() => {
    setAmountAtOpen(getVentResourceAmount(kind));
    setMaxVentableAtOpen(getVentableAmount(kind));
    setStagedVent(0);
  }, [kind]);

  const stopHold = useCallback(() => {
    if (holdRef.current != null) {
      cancelAnimationFrame(holdRef.current);
      holdRef.current = null;
    }
  }, []);

  const clampStaged = useCallback(
    (value: number) => Math.max(0, Math.min(maxVentableAtOpen, Math.round(value))),
    [maxVentableAtOpen]
  );

  const stepStaged = useCallback(
    (delta: number) => {
      if (maxVentableAtOpen <= 0) return;
      setStagedVent((prev) => clampStaged(prev + delta));
    },
    [maxVentableAtOpen, clampStaged]
  );

  const startHold = useCallback(
    (delta: number) => {
      stopHold();
      lastTickRef.current = performance.now();
      const tick = (now: number) => {
        const dt = Math.min(0.1, (now - lastTickRef.current) / 1000);
        lastTickRef.current = now;
        if (dt > 0) {
          const rate = DOCK_TRANSFER_STEP * 2;
          setStagedVent((prev) => clampStaged(prev + delta * rate * dt));
        }
        holdRef.current = requestAnimationFrame(tick);
      };
      stepStaged(delta);
      holdRef.current = requestAnimationFrame(tick);
    },
    [clampStaged, stepStaged, stopHold]
  );

  useEffect(() => () => stopHold(), [stopHold]);

  const capacity = getVentResourceCapacity(kind);
  const shipRemaining = amountAtOpen - stagedVent;
  const canMoveToVent = maxVentableAtOpen > 0 && stagedVent < maxVentableAtOpen;
  const canMoveToShip = stagedVent > 0;
  const canConfirm = stagedVent > 0;

  const handleConfirm = () => {
    if (!canConfirm) return;
    applyVentResource(kind, stagedVent);
    onClose();
  };

  return (
    <div className="dock-transfer-hud helmet-hud" role="dialog" aria-modal="true" aria-labelledby="vent-resource-title">
      <div className="dock-transfer-hud__header">
        <span id="vent-resource-title" className="dock-transfer-hud__title">
          {meta.label}
        </span>
        <span className="dock-transfer-hud__subtitle">
          {kind === 'crew' ? 'Vent (captain stays)' : 'Vent'}
        </span>
      </div>
      <div className="dock-transfer-hud__cols">
        <span>Ship</span>
        <span />
        <span>Vent</span>
      </div>
      <div className="dock-transfer-hud__row">
        <span className="dock-transfer-hud__label">
          <Icon size={11} strokeWidth={1.5} />
          {meta.label}
        </span>
        <div>
          <div className="dock-transfer-hud__amount">{shipRemaining}</div>
          <div className="dock-transfer-hud__amount dock-transfer-hud__amount--muted">/ {capacity}</div>
        </div>
        <div className="dock-transfer-hud__controls">
          <button
            type="button"
            className="dock-transfer-hud__btn"
            title={`Return ${meta.label} to ship`}
            disabled={!canMoveToShip}
            onClick={() => stepStaged(-DOCK_TRANSFER_STEP)}
            onPointerDown={(e) => {
              if (e.button !== 0 || !canMoveToShip) return;
              e.preventDefault();
              startHold(-1);
            }}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onPointerCancel={stopHold}
          >
            ◀
          </button>
          <button
            type="button"
            className="dock-transfer-hud__btn"
            title={`Stage ${meta.label} to vent`}
            disabled={!canMoveToVent}
            onClick={() => stepStaged(DOCK_TRANSFER_STEP)}
            onPointerDown={(e) => {
              if (e.button !== 0 || !canMoveToVent) return;
              e.preventDefault();
              startHold(1);
            }}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onPointerCancel={stopHold}
          >
            ▶
          </button>
        </div>
        <div>
          <div className="dock-transfer-hud__amount">{stagedVent}</div>
          <div className="dock-transfer-hud__amount dock-transfer-hud__amount--muted">/ {maxVentableAtOpen}</div>
        </div>
      </div>
      <div className="dock-transfer-hud__footer">
        <button type="button" className="dock-transfer-hud__btn dock-transfer-hud__btn--wide" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="dock-transfer-hud__btn dock-transfer-hud__btn--wide"
          disabled={!canConfirm}
          onClick={handleConfirm}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
