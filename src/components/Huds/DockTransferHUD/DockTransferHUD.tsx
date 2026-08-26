import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Droplets, Wind, Zap, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { fuel, o2, power, shipCrew } from '../../../context/ShipState';
import { SHIP_CREW_CAPACITY, SHIP_RESOURCE_MAX } from '../../../config/dockTransferConfig';
import {
  DOCKABLE_PARTNER_CHANGED,
  getDock,
  getDockablePartnerLabel,
  getDockContact,
  getDockContacts,
  getDockJob,
  getDockJobs,
  listPartnerResources,
  readPartnerAmount,
  readPartnerCapacity,
  transferDockableHold,
  transferDockableStep,
  type DockableResourceKind,
} from '../../../context/DockablePartnerStore';
import { EVENT_REQUEST_UNDOCK } from '../../../config/keybindings';
import {
  DEFAULT_DOCK_BACKGROUND_IMAGE,
  DOCK_ROLE_LABELS,
  dockContactThreadId,
  dockJobThreadId,
  parseDockThreadId,
  type DockContact,
  type DockDialogueTree,
} from '../../../config/dockConfig';
import {
  DOCK_TRANSFER_UI_CHANGED,
  getDockTransferUi,
  minimizeDockTransferPanel,
} from '../../../context/DockTransferUi';
import DockInteriorDialogue from '../../Station/StationDialogue';
import ShipCargoSummary from './ShipCargoSummary';
import {
  activeMissionRef,
  completedMissionsRef,
  declinedMissionsRef,
} from '../../../context/MissionState';
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

interface DirectoryContactItem {
  threadId: string;
  name: string;
  role: string;
  portrait?: string;
  missionFlag?: string;
}

const DockTransferHUD = memo(function DockTransferHUD() {
  const [ui, setUi] = useState(getDockTransferUi);
  const [dockThreadId, setDockThreadId] = useState<string | null>(null);
  const [, bump] = useState(0);

  useEffect(() => {
    const onUi = () => {
      const next = getDockTransferUi();
      setUi(next);
      if (!next.partnerId || !next.panelOpen) {
        setDockThreadId(null);
      }
    };
    const onChanged = () => bump((n) => n + 1);

    window.addEventListener(DOCK_TRANSFER_UI_CHANGED, onUi);
    window.addEventListener(DOCKABLE_PARTNER_CHANGED, onChanged);
    return () => {
      window.removeEventListener(DOCK_TRANSFER_UI_CHANGED, onUi);
      window.removeEventListener(DOCKABLE_PARTNER_CHANGED, onChanged);
    };
  }, []);

  const partnerId = ui.partnerId;
  const panelOpen = ui.panelOpen;

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      bump((n) => n + 1);
      raf = requestAnimationFrame(tick);
    };
    if (partnerId && panelOpen) raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [partnerId, panelOpen]);

  function resolveDockInteriorChat(
    threadId: string
  ): { contact: DockContact; dialogue: DockDialogueTree } | null {
    const parsed = parseDockThreadId(threadId);
    if (!parsed) return null;

    if (parsed.jobId) {
      const job = getDockJob(parsed.dockId, parsed.jobId);
      if (!job?.dialogue) return null;
      return {
        contact: {
          id: parsed.jobId,
          name: job.title,
          role: 'official',
          portrait: '/Image_0.jpg',
          bio: job.summary,
          platform: 'HERALD',
          dialogue: job.dialogue,
        },
        dialogue: job.dialogue,
      };
    }

    if (parsed.contactId) {
      const contact = getDockContact(parsed.dockId, parsed.contactId);
      if (!contact) return null;
      return { contact, dialogue: contact.dialogue };
    }

    return null;
  }

  if (!partnerId || !panelOpen) return null;

  const kinds = listPartnerResources(partnerId);
  const contacts: DirectoryContactItem[] = getDockContacts(partnerId).map((c) => {
    const mid = c.missionId;
    const missionAvailable =
      mid != null &&
      !declinedMissionsRef.current.includes(mid) &&
      !completedMissionsRef.current.includes(mid) &&
      !activeMissionRef.current.includes(mid);
    return {
      threadId: dockContactThreadId(partnerId, c.id),
      name: c.name,
      role: DOCK_ROLE_LABELS[c.role],
      portrait: c.portrait,
      missionFlag: missionAvailable ? 'AVAILABLE MISSION' : undefined,
    };
  });
  const jobs: DirectoryContactItem[] = getDockJobs(partnerId)
    .filter((j) => j.dialogue)
    .map((j) => ({
      threadId: dockJobThreadId(partnerId, j.id),
      name: j.title,
      role: 'JOB BOARD',
    }));
  const directoryItems = [...contacts, ...jobs];

  if (kinds.length === 0 && directoryItems.length === 0) return null;

  const label = getDockablePartnerLabel(partnerId);
  const backgroundImage = getDock(partnerId)?.backgroundImage ?? DEFAULT_DOCK_BACKGROUND_IMAGE;
  const towable = ui.towable;

  const activeDockChat = dockThreadId ? resolveDockInteriorChat(dockThreadId) : null;

  return (
    <div className="dock-transfer-hud__background">
      <div className="dock-station-panel helmet-hud">
        {/* ── Left column: station info + transfers + actions ── */}
        <div className="dock-station-panel__left">
          <div
            className="dock-station-panel__hero"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          >
            <span className="dock-station-panel__hero-title">{label}</span>
          </div>

          <div className="dock-station-panel__transfers">
            {kinds.length > 0 ? (
              <>
                <div className="dock-station-panel__section-label">Transfer</div>
                <div className="dock-transfer-hud__cols">
                  <span>Ship</span>
                  <span />
                  <span>Dock</span>
                </div>
                {kinds.map((kind) => (
                  <TransferRow key={kind} partnerId={partnerId} kind={kind} />
                ))}
              </>
            ) : null}
          </div>

          <div className="dock-transfer-hud__divider" />
          <div className="dock-station-panel__cargo-summary">
            <ShipCargoSummary />
          </div>

          <div className="dock-station-panel__left-footer">
            {towable ? (
              <button
                type="button"
                className="dock-transfer-hud__btn dock-transfer-hud__btn--wide"
                onClick={() => {
                  setDockThreadId(null);
                  minimizeDockTransferPanel();
                }}
                title="Minimize transfer panel"
              >
                MINIMIZE
              </button>
            ) : null}
            <button
              type="button"
              className="dock-transfer-hud__btn dock-transfer-hud__btn--wide"
              onClick={() => window.dispatchEvent(new CustomEvent(EVENT_REQUEST_UNDOCK))}
              title="Undock from current bay"
            >
              UNDOCK
            </button>
          </div>
        </div>

        {/* ── Right column: contacts directory / dialogue ── */}
        <div className="dock-station-panel__right">
          <div className="dock-station-panel__right-header">
            {dockThreadId && activeDockChat ? (
              <>
                <span className="dock-station-panel__right-title">COMMS OPEN</span>
              </>
            ) : (
              <span className="dock-station-panel__right-title">STATION DIRECTORY</span>
            )}
          </div>

          {dockThreadId && activeDockChat ? (
            <div className="dock-station-panel__dialogue-wrapper">
              <DockInteriorDialogue
                threadId={dockThreadId}
                contact={activeDockChat.contact}
                dialogue={activeDockChat.dialogue}
                inline
                onClose={() => setDockThreadId(null)}
              />
            </div>
          ) : directoryItems.length > 0 ? (
            <div className="dock-station-panel__directory">
              {directoryItems.map((item) => (
                <button
                  key={item.threadId}
                  type="button"
                  className="dock-station-panel__contact-item"
                  onClick={() => setDockThreadId(item.threadId)}
                >
                  {item.portrait ? (
                    <img
                      className="dock-station-panel__contact-portrait"
                      src={item.portrait}
                      alt={item.name}
                    />
                  ) : null}
                  <div className="dock-station-panel__contact-info">
                    <div className="dock-station-panel__contact-name">{item.name}</div>
                    <div className="dock-station-panel__contact-role">{item.role}</div>
                  </div>
                  {item.missionFlag && (
                    <span className="dock-station-panel__mission-flag">{item.missionFlag}</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="dock-station-panel__empty">NO CONTACTS AVAILABLE</div>
          )}
        </div>
      </div>
    </div>
  );
});

export default DockTransferHUD;
