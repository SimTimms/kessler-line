import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Droplets, Wind, Zap, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { fuel, o2, power, shipCrew } from '../../../context/ShipState';
import { SHIP_CREW_CAPACITY, SHIP_RESOURCE_MAX } from '../../../config/dockTransferConfig';
import {
  DOCKABLE_PARTNER_CHANGED,
  getDockablePartnerLabel,
  hasDockablePartner,
  listPartnerResources,
  readPartnerAmount,
  readPartnerCapacity,
  transferDockableHold,
  transferDockableStep,
  type DockableResourceKind,
} from '../../../context/DockablePartnerStore';
import '../HelmetHUD/HelmetHUD.css';
import './DockTransferHUD.css';

const RESOURCE_META: Record<
  DockableResourceKind,
  { label: string; icon: LucideIcon; shipMax: number }
> = {
  fuel: { label: 'Fuel', icon: Droplets, shipMax: SHIP_RESOURCE_MAX },
  o2: { label: 'O2', icon: Wind, shipMax: SHIP_RESOURCE_MAX },
  power: { label: 'Pwr', icon: Zap, shipMax: SHIP_RESOURCE_MAX },
  crew: { label: 'Crew', icon: User, shipMax: SHIP_CREW_CAPACITY },
};

function shipValue(kind: DockableResourceKind): number {
  switch (kind) {
    case 'fuel':
      return fuel;
    case 'o2':
      return o2;
    case 'power':
      return power;
    case 'crew':
      return shipCrew;
  }
}

function canTransfer(
  partnerId: string,
  kind: DockableResourceKind,
  direction: 'toPartner' | 'toShip'
): boolean {
  const meta = RESOURCE_META[kind];
  const shipVal = shipValue(kind);
  const partnerVal = readPartnerAmount(partnerId, kind);
  const partnerCap = readPartnerCapacity(partnerId, kind);
  if (direction === 'toPartner') {
    return shipVal > 0 && partnerVal < partnerCap;
  }
  return partnerVal > 0 && shipVal < meta.shipMax;
}

interface TransferRowProps {
  partnerId: string;
  kind: DockableResourceKind;
}

function TransferRow({ partnerId, kind }: TransferRowProps) {
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
    (direction: 'toPartner' | 'toShip') => {
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
      <span className="dock-transfer-hud__label">
        <Icon size={11} strokeWidth={1.5} />
        {meta.label}
      </span>
      <div>
        <div className="dock-transfer-hud__amount">{shipVal}</div>
        <div className="dock-transfer-hud__amount dock-transfer-hud__amount--muted">
          / {meta.shipMax}
        </div>
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
          onPointerDown={(e) => {
            if (e.button !== 0 || !toPartnerOk) return;
            e.preventDefault();
            startHold('toPartner');
          }}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
        >
          ▶
        </button>
      </div>
      <div>
        <div className="dock-transfer-hud__amount">{Math.floor(partnerVal)}</div>
        <div className="dock-transfer-hud__amount dock-transfer-hud__amount--muted">
          / {Math.floor(partnerCap)}
        </div>
      </div>
    </div>
  );
}

const DockTransferHUD = memo(function DockTransferHUD() {
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [, bump] = useState(0);

  useEffect(() => {
    const onDocked = (e: Event) => {
      const id = (e as CustomEvent<{ stationId: string | null }>).detail?.stationId ?? null;
      setPartnerId(hasDockablePartner(id) ? id : null);
    };
    const onUndocked = () => setPartnerId(null);
    const onChanged = () => bump((n) => n + 1);

    window.addEventListener('ShipDocked', onDocked);
    window.addEventListener('ShipUndocked', onUndocked);
    window.addEventListener(DOCKABLE_PARTNER_CHANGED, onChanged);
    return () => {
      window.removeEventListener('ShipDocked', onDocked);
      window.removeEventListener('ShipUndocked', onUndocked);
      window.removeEventListener(DOCKABLE_PARTNER_CHANGED, onChanged);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      bump((n) => n + 1);
      raf = requestAnimationFrame(tick);
    };
    if (partnerId) raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [partnerId]);

  if (!partnerId) return null;

  const kinds = listPartnerResources(partnerId);
  if (kinds.length === 0) return null;

  const label = getDockablePartnerLabel(partnerId);

  return (
    <div className="dock-transfer-hud helmet-hud">
      <div className="dock-transfer-hud__header">
        <span className="dock-transfer-hud__title">{label}</span>
        <span className="dock-transfer-hud__subtitle">Transfer</span>
      </div>
      <div className="dock-transfer-hud__cols">
        <span>Ship</span>
        <span />
        <span>Dock</span>
      </div>
      {kinds.map((kind) => (
        <TransferRow key={kind} partnerId={partnerId} kind={kind} />
      ))}
    </div>
  );
});

export default DockTransferHUD;
