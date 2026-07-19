import { useCallback, useEffect, useRef, useState } from 'react';
import { Droplets, Wind, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  beginDroneMining,
  commandLaunchAtSelection,
  commandRecall,
  EVENT_DRONE_UI_CHANGED,
  getDroneUi,
  resolveLaunchTargetFromSelection,
  setDronePanelOpen,
  stopDroneMining,
  type DroneUiState,
} from '../../../context/DroneStore';
import {
  DOCKABLE_PARTNER_CHANGED,
  transferDockableHold,
  transferDockableStep,
  type DockableResourceKind,
} from '../../../context/DockablePartnerStore';
import { DRONE_MINING_CYCLE_SECONDS, MINING_DRONE_ID } from '../../../config/droneConfig';
import { MINING_ORE_ITEM_ID } from '../../../config/miningConfig';
import { fuel, o2, power } from '../../../context/ShipState';
import { SHIP_RESOURCE_MAX } from '../../../config/dockTransferConfig';
import { PLAYER_VESSEL_ID } from '../../../context/PlayerShipState';
import { transferCargoStack } from '../PowerHUD/Cargo/cargoHoldHelpers';
import { power as shipPower } from '../../../context/ShipState';
import {
  EVENT_SHIP_POWER_DEPLETED,
  EVENT_SHIP_POWER_RESTORED,
} from '../../../context/shipPowerSystems';
import './DroneHUD.css';

const PROGRESS_SEGMENTS = 20;

const RESOURCE_META: Record<
  Exclude<DockableResourceKind, 'crew'>,
  { label: string; icon: LucideIcon; shipMax: number }
> = {
  fuel: { label: 'Fuel', icon: Droplets, shipMax: SHIP_RESOURCE_MAX },
  o2: { label: 'O2', icon: Wind, shipMax: SHIP_RESOURCE_MAX },
  power: { label: 'Pwr', icon: Zap, shipMax: SHIP_RESOURCE_MAX },
};

const TRANSFER_KINDS = ['fuel', 'o2', 'power'] as const;

function shipValue(kind: (typeof TRANSFER_KINDS)[number]): number {
  switch (kind) {
    case 'fuel':
      return fuel;
    case 'o2':
      return o2;
    case 'power':
      return power;
  }
}

function TransferRow({
  partnerId,
  kind,
  partnerAmount,
}: {
  partnerId: string;
  kind: (typeof TRANSFER_KINDS)[number];
  partnerAmount: number;
}) {
  const meta = RESOURCE_META[kind];
  const Icon = meta.icon;
  const holdRef = useRef<number | null>(null);

  const stopHold = useCallback(() => {
    if (holdRef.current != null) {
      cancelAnimationFrame(holdRef.current);
      holdRef.current = null;
    }
  }, []);

  const startHold = useCallback(
    (direction: 'toPartner' | 'toShip') => {
      stopHold();
      let last = performance.now();
      const tick = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        transferDockableHold(partnerId, kind, direction, dt);
        holdRef.current = requestAnimationFrame(tick);
      };
      transferDockableStep(partnerId, kind, direction);
      holdRef.current = requestAnimationFrame(tick);
    },
    [kind, partnerId, stopHold]
  );

  useEffect(() => () => stopHold(), [stopHold]);

  return (
    <div className="drone-hud__transfer-row">
      <Icon size={12} aria-hidden />
      <span>
        {Math.round(partnerAmount)} / {meta.label} · ship {Math.round(shipValue(kind))}
      </span>
      <button
        type="button"
        className="drone-hud__xfer"
        aria-label={`Transfer ${meta.label} to drone`}
        onPointerDown={() => startHold('toPartner')}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
      >
        ◀
      </button>
      <button
        type="button"
        className="drone-hud__xfer"
        aria-label={`Transfer ${meta.label} to ship`}
        onPointerDown={() => startHold('toShip')}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
      >
        ▶
      </button>
    </div>
  );
}

export default function DroneHUD() {
  const [ui, setUi] = useState<DroneUiState>(() => getDroneUi());
  const [powerOnline, setPowerOnline] = useState(() => shipPower > 0);

  useEffect(() => {
    const refresh = () => setUi(getDroneUi());
    const onDepleted = () => setPowerOnline(false);
    const onRestored = () => setPowerOnline(true);
    window.addEventListener(EVENT_DRONE_UI_CHANGED, refresh);
    window.addEventListener(DOCKABLE_PARTNER_CHANGED, refresh);
    window.addEventListener('SelectedTargetChanged', refresh);
    window.addEventListener(EVENT_SHIP_POWER_DEPLETED, onDepleted);
    window.addEventListener(EVENT_SHIP_POWER_RESTORED, onRestored);
    return () => {
      window.removeEventListener(EVENT_DRONE_UI_CHANGED, refresh);
      window.removeEventListener(DOCKABLE_PARTNER_CHANGED, refresh);
      window.removeEventListener('SelectedTargetChanged', refresh);
      window.removeEventListener(EVENT_SHIP_POWER_DEPLETED, onDepleted);
      window.removeEventListener(EVENT_SHIP_POWER_RESTORED, onRestored);
    };
  }, []);

  if (!powerOnline) {
    return (
      <div className="drone-hud drone-hud--minimized" aria-label="Drone HUD offline">
        <span className="drone-hud__status">NO PWR</span>
      </div>
    );
  }

  if (!ui.panelOpen) {
    return (
      <div className="drone-hud drone-hud--minimized" aria-label="Drone HUD minimized">
        <button type="button" className="drone-hud__minimize" onClick={() => setDronePanelOpen(true)}>
          Drone
        </button>
      </div>
    );
  }

  const launchTarget = resolveLaunchTargetFromSelection();
  const canLaunch = ui.mode === 'stowed' && ui.hull > 0 && ui.fuel > 0 && launchTarget != null;
  const canRecall =
    ui.mode === 'approaching' || ui.mode === 'docked' || ui.mode === 'mining';
  const canBeginMine = ui.mode === 'docked' && ui.droneType === 'mining' && !ui.mining;
  const litCount = Math.round(ui.miningProgress * PROGRESS_SEGMENTS);
  const secondsLeft = Math.max(
    0,
    Math.ceil((1 - ui.miningProgress) * DRONE_MINING_CYCLE_SECONDS)
  );

  return (
    <div className="drone-hud" aria-label="Drone control">
      <div className="drone-hud__header">
        <span className="drone-hud__title">{ui.label}</span>
        <span className="drone-hud__status">{ui.mode}</span>
        <button type="button" className="drone-hud__minimize" onClick={() => setDronePanelOpen(false)}>
          —
        </button>
      </div>

      <div className="drone-hud__status-line">{ui.statusLine}</div>

      <div className="drone-hud__vitals">
        <div>
          Hull
          <strong>{Math.round(ui.hull)}%</strong>
        </div>
        <div>
          Fuel
          <strong>{Math.round(ui.fuel)}</strong>
        </div>
        <div>
          Ore
          <strong>{ui.oreCount}</strong>
        </div>
        <div>
          Target
          <strong style={{ fontSize: 9 }}>{ui.targetLabel ?? launchTarget?.label ?? '—'}</strong>
        </div>
      </div>

      <div className="drone-hud__actions">
        <button
          type="button"
          className="drone-hud__btn"
          disabled={!canLaunch}
          onClick={() => commandLaunchAtSelection()}
        >
          Launch drone
        </button>
        {canBeginMine ? (
          <button type="button" className="drone-hud__btn" onClick={() => beginDroneMining()}>
            Begin mining
          </button>
        ) : null}
        {ui.mining ? (
          <button type="button" className="drone-hud__btn" onClick={() => stopDroneMining()}>
            Stop mining
          </button>
        ) : null}
        <button
          type="button"
          className="drone-hud__btn drone-hud__btn--danger"
          disabled={!canRecall || ui.mode === 'recalling'}
          onClick={() => commandRecall()}
        >
          {ui.mode === 'recalling' ? 'Returning…' : 'Recall'}
        </button>
        {ui.oreCount > 0 ? (
          <button
            type="button"
            className="drone-hud__btn"
            onClick={() => {
              transferCargoStack(
                { kind: 'dock', dockId: MINING_DRONE_ID },
                { kind: 'vessel', vesselId: PLAYER_VESSEL_ID },
                MINING_ORE_ITEM_ID,
                ui.oreCount
              );
              setUi(getDroneUi());
            }}
          >
            Unload ore to ship
          </button>
        ) : null}
      </div>

      {ui.mining ? (
        <>
          <div
            className="drone-hud__progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(ui.miningProgress * 100)}
          >
            {Array.from({ length: PROGRESS_SEGMENTS }, (_, i) => (
              <span
                key={i}
                className={`drone-hud__seg${i < litCount ? ' drone-hud__seg--lit' : ''}`}
              />
            ))}
          </div>
          <div className="drone-hud__status-line">Ore cycle · {secondsLeft}s</div>
        </>
      ) : null}

      {ui.mode !== 'destroyed' ? (
        <div className="drone-hud__transfers">
          {TRANSFER_KINDS.map((kind) => (
            <TransferRow
              key={kind}
              partnerId={MINING_DRONE_ID}
              kind={kind}
              partnerAmount={
                kind === 'fuel' ? ui.fuel : kind === 'o2' ? ui.o2 : ui.power
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
