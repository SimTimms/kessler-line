import { useCallback, useEffect, useRef } from 'react';
import {
  transferDockableHold,
  transferDockableStep,
  readPartnerAmount,
  readPartnerCapacity,
  type DockableResourceKind,
} from '../../../context/DockablePartnerStore';
import { RESOURCE_META, canTransfer, shipValue } from './helpers/resourceMeta';
import type { TransferDirection } from './helpers/dockTransferTypes';

interface TransferRowProps {
  partnerId: string;
  kind: DockableResourceKind;
}

export default function TransferRow({ partnerId, kind }: TransferRowProps) {
  const meta = RESOURCE_META[kind];
  const Icon = meta.icon;
  const holdRef = useRef<number | null>(null);
  const lastTickRef = useRef(performance.now());

  const stopHold = useCallback(() => {
    if (holdRef.current != null) {
      cancelAnimationFrame(holdRef.current);
      holdRef.current = null;
    }
  }, []);

  const startHold = useCallback(
    (direction: TransferDirection) => {
      stopHold();
      lastTickRef.current = performance.now();
      const tick = (now: number) => {
        const dt = Math.min(0.1, (now - lastTickRef.current) / 1000);
        lastTickRef.current = now;
        if (dt > 0) {
          transferDockableHold(partnerId, kind, direction, dt);
        }
        holdRef.current = requestAnimationFrame(tick);
      };
      transferDockableStep(partnerId, kind, direction);
      holdRef.current = requestAnimationFrame(tick);
    },
    [partnerId, kind, stopHold]
  );

  useEffect(() => () => stopHold(), [stopHold]);

  const partnerVal = readPartnerAmount(partnerId, kind);
  const partnerCap = readPartnerCapacity(partnerId, kind);
  const shipVal = Math.floor(shipValue(kind));
  const toPartnerOk = canTransfer(partnerId, kind, 'toPartner');
  const toShipOk = canTransfer(partnerId, kind, 'toShip');

  return (
    <div className="dock-transfer-hud__row">
      <span className="event-log-text resource-label">
        <Icon size={11} strokeWidth={1.5} />
        {meta.label}
      </span>
      <div className="dock-transfer-wrapper">
        <div className="resource-bar-val" style={{ width: 60 }}>
          {shipVal} / {meta.shipMax}
        </div>
        <div className="dock-transfer-hud__controls">
          <button
            type="button"
            className="dock-transfer-hud__btn"
            title={`Take ${meta.label} from dock`}
            disabled={!toShipOk}
            onClick={() => transferDockableStep(partnerId, kind, 'toShip')}
            onPointerDown={(e) => {
              if (e.button !== 0 || !toShipOk) return;
              e.preventDefault();
              startHold('toShip');
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
            title={`Send ${meta.label} to dock`}
            disabled={!toPartnerOk}
            onClick={() => transferDockableStep(partnerId, kind, 'toPartner')}
          >
            ▶
          </button>
        </div>
        <div>
          <div className="resource-bar-val" style={{ width: 60 }}>
            {Math.floor(partnerVal)} / {Math.floor(partnerCap)}
          </div>
        </div>
      </div>
    </div>
  );
}
