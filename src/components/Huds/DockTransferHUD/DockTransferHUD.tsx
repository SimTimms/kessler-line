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
import {
  ContactsHudDialog,
  type SelectionItem,
} from '../../ContactsHUD/ContactsHudDialog/ContactsHudDialog';
import DockInteriorDialogue from '../../Station/StationDialogue';
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
  const [ui, setUi] = useState(getDockTransferUi);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [dockThreadId, setDockThreadId] = useState<string | null>(null);
  const [, bump] = useState(0);

  useEffect(() => {
    const onUi = () => {
      const next = getDockTransferUi();
      setUi(next);
      if (!next.partnerId || !next.panelOpen) {
        setContactsOpen(false);
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
  const dockInteriorItems: SelectionItem[] = [
    ...getDockContacts(partnerId).map((contact) => ({
      id: dockContactThreadId(partnerId, contact.id),
      label: contact.name,
      sublabel: DOCK_ROLE_LABELS[contact.role],
      avatarSrc: contact.portrait,
      avatarAlt: contact.name,
    })),
    ...getDockJobs(partnerId)
      .filter((job) => job.dialogue)
      .map((job) => ({
        id: dockJobThreadId(partnerId, job.id),
        label: job.title,
        sublabel: 'JOB BOARD',
      })),
  ];
  if (kinds.length === 0 && dockInteriorItems.length === 0) return null;

  const label = getDockablePartnerLabel(partnerId);
  const backgroundImage = getDock(partnerId)?.backgroundImage ?? DEFAULT_DOCK_BACKGROUND_IMAGE;
  const backgroundUrl = `url(${backgroundImage})`;
  const towable = ui.towable;

  return (
    <div className="dock-transfer-hud__background">
      <div className="dock-transfer-hud helmet-hud">
        <div
          className="dock-transfer-hud__header"
          style={{
            background: `${backgroundUrl} no-repeat center center`,
            backgroundSize: 'cover',
            padding: '30px 10px 30px 10px',
          }}
        >
          <span className="dock-transfer-hud__title">{label}</span>
        </div>
        <span className="dock-transfer-hud__subtitle">Transfer</span>

        {kinds.length > 0 ? (
          <>
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
        {dockInteriorItems.length > 0 ? (
          <>
            <div className="dock-transfer-hud__divider" />
            <div className="dock-transfer-hud__contacts-row">
              <span className="dock-transfer-hud__label">Contacts</span>
              <button
                type="button"
                className="dock-transfer-hud__btn dock-transfer-hud__btn--wide"
                onClick={() => setContactsOpen(true)}
                title={`Open ${label} contacts`}
              >
                OPEN
              </button>
            </div>
          </>
        ) : null}
        {contactsOpen ? (
          <ContactsHudDialog
            title={`${label} CONTACTS`}
            dockInteriorItems={dockInteriorItems}
            dockInteriorLabel={label}
            savedItems={[]}
            inRangeItems={[]}
            onSave={() => {}}
            onSelect={(id) => {
              setDockThreadId(id);
              setContactsOpen(false);
            }}
            onClose={() => setContactsOpen(false)}
          />
        ) : null}
        {dockThreadId
          ? (() => {
              const dockChat = resolveDockInteriorChat(dockThreadId);
              if (!dockChat) return null;
              return (
                <DockInteriorDialogue
                  threadId={dockThreadId}
                  contact={dockChat.contact}
                  dialogue={dockChat.dialogue}
                  onClose={() => setDockThreadId(null)}
                />
              );
            })()
          : null}
        <div className="dock-transfer-hud__footer">
          {towable ? (
            <button
              type="button"
              className="dock-transfer-hud__btn dock-transfer-hud__btn--wide"
              onClick={() => {
                setContactsOpen(false);
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
    </div>
  );
});

export default DockTransferHUD;
