import { useState, useEffect, useRef, useMemo } from 'react';
import {
  getThread,
  createThread,
  addChatMessage,
  setChatTurn,
  type ChatThread,
} from '../../context/ChatStore';
import { applyDialogueEffects } from '../../narrative/dialogueEffects';
import type {
  DockContact,
  DockDialogueTree,
  DockTradeTurnConfig,
  DockTradeResourceKind,
} from '../../config/dockConfig';
import { parseDockThreadId } from '../../config/dockConfig';
import { getInventoryItemDef } from '../../config/inventoryCatalog';
import { PLAYER_SALVAGED_BY } from '../../config/inventoryTypes';
import {
  fuel,
  o2,
  power,
  shipCrew,
  setFuel,
  setO2,
  setPower,
  setShipCrew,
} from '../../context/ShipState';
import { PLAYER_VESSEL_ID } from '../../context/PlayerShipState';
import { getDockInventoryOwner } from '../../context/DockablePartnerStore';
import { refreshPlayerCargoBinding } from '../../context/Inventory';
import {
  inventoryTaggedQtyMap,
  INVENTORY_CHANGED,
  type InventoryOwnerRef,
} from '../../context/InventoryStore';
import { SHIP_MIN_CREW_ONBOARD } from '../../config/dockTransferConfig';
import { speakNpcLine } from '../../sound/PiperTTS';
import { resolveNpcVoiceClipSrc } from '../../sound/npcVoiceClips';
import DialogueThread from '../CommsChat/DialogueThread';
import '../CommsChat/CommsChat.css';
import {
  type BarterDeal,
  clampBarterDeal,
  cloneBarterDeal,
  commitBarterDeal,
  commitSalvageClaimDeal,
  emptyBarterDeal,
  evaluateBarterDeal,
  evaluateSalvageClaimDeal,
  formatBarterDeal,
  inventoryQtyMap,
  isBarterDealEmpty,
  sumBarterSide,
} from '../../utils/barterDeal';

interface DockInteriorDialogueProps {
  /** ChatStore thread id — typically dockContactThreadId(dockId, contactId). */
  threadId: string;
  contact: DockContact;
  dialogue: DockDialogueTree;
  /** Render inside parent container instead of as a fixed overlay. */
  inline?: boolean;
  onClose: () => void;
}

type TradeOffer = Record<DockTradeResourceKind, number>;

interface PendingResourceTrade {
  kind: 'accepted' | 'counter';
  deal: TradeOffer;
}

interface PendingCargoTrade {
  kind: 'accepted' | 'counter';
  /** Contact has accepted this deal shape; player must still AGREE to transfer. */
  deal: BarterDeal;
  contactAgreed: true;
}

const EMPTY_TRADE_OFFER: TradeOffer = {
  fuel: 0,
  o2: 0,
  power: 0,
  crew: 0,
};

const DEFAULT_TRADE_WEIGHTS: Record<DockTradeResourceKind, number> = {
  fuel: 1,
  o2: 1,
  power: 1.1,
  crew: 18,
};

const TRADE_LEDGER = new Map<string, TradeOffer>();

function cloneOffer(offer: TradeOffer): TradeOffer {
  return {
    fuel: offer.fuel,
    o2: offer.o2,
    power: offer.power,
    crew: offer.crew,
  };
}

function formatOffer(offer: TradeOffer): string {
  return `F ${Math.round(offer.fuel)} · O ${Math.round(offer.o2)} · P ${Math.round(offer.power)} · C ${Math.round(offer.crew)}`;
}

function withOfferToken(template: string, offerText: string): string {
  return template.replaceAll('{offer}', offerText);
}

function withResourceOffer(template: string, offer: TradeOffer): string {
  return withOfferToken(template, formatOffer(offer));
}

function withCargoOffer(template: string, deal: BarterDeal): string {
  return withOfferToken(template, formatBarterDeal(deal));
}

function sumOffer(offer: TradeOffer): number {
  return offer.fuel + offer.o2 + offer.power + offer.crew;
}

function maxOfferFromShip(): TradeOffer {
  return {
    fuel: Math.max(0, Math.floor(fuel)),
    o2: Math.max(0, Math.floor(o2)),
    power: Math.max(0, Math.floor(power)),
    crew: Math.max(0, Math.floor(shipCrew - SHIP_MIN_CREW_ONBOARD)),
  };
}

function clampOffer(offer: TradeOffer, maxOffer: TradeOffer): TradeOffer {
  return {
    fuel: Math.max(0, Math.min(Math.round(offer.fuel), maxOffer.fuel)),
    o2: Math.max(0, Math.min(Math.round(offer.o2), maxOffer.o2)),
    power: Math.max(0, Math.min(Math.round(offer.power), maxOffer.power)),
    crew: Math.max(0, Math.min(Math.round(offer.crew), maxOffer.crew)),
  };
}

function scoreOffer(offer: TradeOffer, tradeConfig: DockTradeTurnConfig, stance: number): number {
  const weights = {
    ...DEFAULT_TRADE_WEIGHTS,
    ...(tradeConfig.weights ?? {}),
  };
  const baseScore =
    offer.fuel * weights.fuel +
    offer.o2 * weights.o2 +
    offer.power * weights.power +
    offer.crew * weights.crew;
  return baseScore + stance * 2.5;
}

function scaleOfferForCounter(
  offer: TradeOffer,
  tradeConfig: DockTradeTurnConfig,
  maxOffer: TradeOffer
): TradeOffer {
  const scaled = clampOffer(
    {
      fuel: Math.ceil(offer.fuel * tradeConfig.counterMultiplier),
      o2: Math.ceil(offer.o2 * tradeConfig.counterMultiplier),
      power: Math.ceil(offer.power * tradeConfig.counterMultiplier),
      crew: Math.ceil(offer.crew * tradeConfig.counterMultiplier),
    },
    maxOffer
  );

  if (sumOffer(scaled) <= sumOffer(offer)) {
    if (scaled.fuel < maxOffer.fuel) scaled.fuel += 1;
    else if (scaled.o2 < maxOffer.o2) scaled.o2 += 1;
    else if (scaled.power < maxOffer.power) scaled.power += 1;
    else if (scaled.crew < maxOffer.crew) scaled.crew += 1;
  }

  return scaled;
}

function commitOfferToShip(offer: TradeOffer): { ok: true } | { ok: false; reason: string } {
  if (offer.fuel > fuel) return { ok: false, reason: 'Insufficient fuel for transfer.' };
  if (offer.o2 > o2) return { ok: false, reason: 'Insufficient O2 for transfer.' };
  if (offer.power > power) return { ok: false, reason: 'Insufficient power reserve for transfer.' };
  if (offer.crew > shipCrew - SHIP_MIN_CREW_ONBOARD) {
    return { ok: false, reason: 'Cannot transfer crew below minimum safe complement.' };
  }

  setFuel(Math.max(0, fuel - offer.fuel));
  setO2(Math.max(0, o2 - offer.o2));
  setPower(Math.max(0, power - offer.power));
  setShipCrew(Math.max(SHIP_MIN_CREW_ONBOARD, shipCrew - offer.crew));
  return { ok: true };
}

function recordTradeDelivery(threadId: string, offer: TradeOffer) {
  const previous = TRADE_LEDGER.get(threadId) ?? EMPTY_TRADE_OFFER;
  TRADE_LEDGER.set(threadId, {
    fuel: previous.fuel + offer.fuel,
    o2: previous.o2 + offer.o2,
    power: previous.power + offer.power,
    crew: previous.crew + offer.crew,
  });
}

function cargoRowsFromMap(maxByItem: Record<string, number>, dealSide: Record<string, number>) {
  return Object.entries(maxByItem)
    .filter(([, max]) => max > 0)
    .map(([itemId, max]) => ({
      itemId,
      label: getInventoryItemDef(itemId)?.label ?? itemId,
      max,
      value: dealSide[itemId] ?? 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Interior comms conversation while docked. Uses the same DialogueThread UI as
 * ship-to-ship comms, driven by an inline dialogue tree from the dock config.
 */
export default function DockInteriorDialogue({
  threadId,
  contact,
  dialogue,
  inline = false,
  onClose,
}: DockInteriorDialogueProps) {
  const [thread, setThread] = useState<ChatThread | null>(() => {
    const existing = getThread(threadId);
    return existing ? { ...existing, messages: [...existing.messages] } : null;
  });
  const threadInitRef = useRef(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradeOffer, setTradeOffer] = useState<TradeOffer>(EMPTY_TRADE_OFFER);
  const [cargoDeal, setCargoDeal] = useState<BarterDeal>(emptyBarterDeal);
  const [tradeStatus, setTradeStatus] = useState('');
  const [tradeStance, setTradeStance] = useState(0);
  const [pendingResourceTrade, setPendingResourceTrade] = useState<PendingResourceTrade | null>(
    null
  );
  const [pendingCargoTrade, setPendingCargoTrade] = useState<PendingCargoTrade | null>(null);
  const [, bumpInventory] = useState(0);

  const playerOwner: InventoryOwnerRef = useMemo(
    () => ({ kind: 'vessel', vesselId: PLAYER_VESSEL_ID }),
    []
  );
  const contactOwner: InventoryOwnerRef | null = useMemo(() => {
    const parsed = parseDockThreadId(threadId);
    if (!parsed?.dockId || !parsed.contactId) return null;
    return { kind: 'contact', dockId: parsed.dockId, contactId: parsed.contactId };
  }, [threadId]);
  const depotOwner: InventoryOwnerRef | null = useMemo(() => {
    const parsed = parseDockThreadId(threadId);
    if (!parsed?.dockId) return null;
    return getDockInventoryOwner(parsed.dockId);
  }, [threadId]);

  useEffect(() => {
    const onUpdate = (e: Event) => {
      const { shipId: sid } = (e as CustomEvent<{ shipId: string }>).detail;
      if (sid === threadId) {
        const t = getThread(threadId);
        if (t) setThread({ ...t, messages: [...t.messages] });
      }
    };
    window.addEventListener('ChatUpdated', onUpdate);
    return () => window.removeEventListener('ChatUpdated', onUpdate);
  }, [threadId]);

  useEffect(() => {
    const onInv = () => bumpInventory((n) => n + 1);
    window.addEventListener(INVENTORY_CHANGED, onInv);
    return () => window.removeEventListener(INVENTORY_CHANGED, onInv);
  }, []);

  useEffect(() => {
    if (threadInitRef.current) return;
    threadInitRef.current = true;
    if (getThread(threadId)) return;

    createThread(threadId, contact.name, contact.name, dialogue.id, dialogue.openingTurnId);
    const firstTurn = dialogue.turns[dialogue.openingTurnId];
    if (!firstTurn) return;

    const delay = 700 + Math.random() * 900;
    const openingClipSrc = resolveNpcVoiceClipSrc(firstTurn.audio);
    setTimeout(() => {
      addChatMessage(threadId, {
        id: `npc-${threadId}-open`,
        role: 'npc',
        text: firstTurn.npcText,
        timestamp: Date.now(),
        audioSrc: openingClipSrc,
      });
      setChatTurn(threadId, dialogue.openingTurnId, false);
      if (!openingClipSrc) speakNpcLine(firstTurn.npcText, dialogue.id);
      if (firstTurn.trade) {
        setTradeOpen(true);
        setTradeStatus(firstTurn.trade.panelStatusOpen);
      }
    }, delay);
  }, [threadId, contact, dialogue]);

  useEffect(() => {
    setTradeOpen(false);
    setTradeOffer(EMPTY_TRADE_OFFER);
    setCargoDeal(emptyBarterDeal());
    setTradeStatus('');
    setTradeStance(0);
    setPendingResourceTrade(null);
    setPendingCargoTrade(null);
  }, [threadId]);

  const currentTurn = thread?.currentTurnId ? dialogue.turns[thread.currentTurnId] : null;
  const showOptions =
    !!thread &&
    !thread.awaitingNpc &&
    currentTurn !== null &&
    (currentTurn?.playerOptions.length ?? 0) > 0;
  const isEnded = !!thread && thread.currentTurnId === null && !thread.awaitingNpc;
  const activeTradeConfig = tradeOpen ? (currentTurn?.trade ?? null) : null;
  const useSalvageClaim = !!(activeTradeConfig?.salvageClaim && depotOwner);
  const useCargoBarter = !!(
    activeTradeConfig?.cargoBarter &&
    (useSalvageClaim || contactOwner)
  );

  const playerMax = useCargoBarter && !useSalvageClaim ? inventoryQtyMap(playerOwner) : {};
  const contactMax =
    useSalvageClaim && depotOwner
      ? inventoryTaggedQtyMap(depotOwner, PLAYER_SALVAGED_BY)
      : useCargoBarter && contactOwner
        ? inventoryQtyMap(contactOwner)
        : {};

  const handleTradeOfferChange = (kind: DockTradeResourceKind, value: number) => {
    const max = maxOfferFromShip();
    setTradeOffer((prev) => clampOffer({ ...prev, [kind]: value }, max));
  };

  const handleCargoOfferChange = (
    side: 'playerGives' | 'contactGives',
    itemId: string,
    value: number
  ) => {
    setCargoDeal((prev) =>
      clampBarterDeal(
        {
          ...prev,
          [side]: { ...prev[side], [itemId]: value },
        },
        playerMax,
        contactMax
      )
    );
  };

  const clearTradeOffer = () => {
    setTradeOffer(EMPTY_TRADE_OFFER);
    setCargoDeal(emptyBarterDeal());
    setPendingResourceTrade(null);
    setPendingCargoTrade(null);
    if (activeTradeConfig) {
      setTradeStatus(activeTradeConfig.panelStatusCleared);
    }
  };

  const submitCargoOffer = () => {
    if (!activeTradeConfig || !thread) return;
    if (!useSalvageClaim && !contactOwner) return;
    const deal = clampBarterDeal(cargoDeal, playerMax, contactMax);
    if (isBarterDealEmpty(deal)) {
      setTradeStatus(activeTradeConfig.panelStatusEmptyOffer);
      return;
    }

    // Asking for goods without putting anything up is never a free take unless
    // this turn explicitly allows mission-item handoff or is a salvage claim.
    if (
      !useSalvageClaim &&
      !activeTradeConfig.allowAskingWithoutOffer &&
      sumBarterSide(deal.playerGives) <= 0 &&
      sumBarterSide(deal.contactGives) > 0
    ) {
      setTradeStatus(activeTradeConfig.panelStatusEmptyOffer);
      addChatMessage(threadId, {
        id: `npc-${threadId}-trade-need-offer-${Date.now()}`,
        role: 'npc',
        text: 'Nothing for nothing. Put something on the table.',
        timestamp: Date.now(),
      });
      return;
    }

    setCargoDeal(deal);
    addChatMessage(threadId, {
      id: `player-${threadId}-trade-offer-${Date.now()}`,
      role: 'player',
      text: withCargoOffer(activeTradeConfig.playerOfferText, deal),
      timestamp: Date.now(),
    });

    const stanceAdjust = tradeStance * 0.04;
    const evalResult = useSalvageClaim
      ? evaluateSalvageClaimDeal(deal, depotOwner!, {
          playerShareRatio: activeTradeConfig.playerShareRatio,
          unscrupulous: contact.unscrupulous,
          tradeStance,
        })
      : activeTradeConfig.allowAskingWithoutOffer &&
          sumBarterSide(deal.playerGives) <= 0 &&
          sumBarterSide(deal.contactGives) > 0
        ? ({
            kind: 'accept',
            valueIn: 0,
            valueOut: 0,
            ratio: 0,
          } as const)
      : evaluateBarterDeal(deal, playerOwner, contactOwner!, {
          acceptRatio: (activeTradeConfig.acceptRatio ?? 1) - stanceAdjust,
          insultRatio: Math.max(
            0.15,
            (activeTradeConfig.insultRatio ?? 0.4) - Math.max(0, tradeStance) * 0.03
          ),
          counterTargetRatio: activeTradeConfig.counterTargetRatio ?? 1.15,
        });

    if (evalResult.kind === 'empty') {
      setTradeStatus(activeTradeConfig.panelStatusEmptyOffer);
      return;
    }

    if (evalResult.kind === 'insult') {
      setPendingCargoTrade(null);
      setTradeStance((prev) => prev - 1);
      setTradeStatus(activeTradeConfig.panelStatusInsult);
      addChatMessage(threadId, {
        id: `npc-${threadId}-trade-insult-${Date.now()}`,
        role: 'npc',
        text: activeTradeConfig.npcInsultText,
        timestamp: Date.now(),
      });
      return;
    }

    if (evalResult.kind === 'accept') {
      // Contact agrees — still wait for player AGREE before any transfer.
      setPendingCargoTrade({ kind: 'accepted', deal: cloneBarterDeal(deal), contactAgreed: true });
      setTradeStatus(activeTradeConfig.panelStatusAccepted);
      addChatMessage(threadId, {
        id: `npc-${threadId}-trade-accept-${Date.now()}`,
        role: 'npc',
        text: activeTradeConfig.npcAcceptText,
        timestamp: Date.now(),
      });
      return;
    }

    const counter = evalResult.deal;
    setPendingCargoTrade({ kind: 'counter', deal: counter, contactAgreed: true });
    setCargoDeal(cloneBarterDeal(counter));
    setTradeStatus(withCargoOffer(activeTradeConfig.panelStatusCounter, counter));
    addChatMessage(threadId, {
      id: `npc-${threadId}-trade-counter-${Date.now()}`,
      role: 'npc',
      text: withCargoOffer(activeTradeConfig.npcCounterText, counter),
      timestamp: Date.now(),
    });
  };

  const submitResourceOffer = () => {
    if (!activeTradeConfig || !thread) return;
    const max = maxOfferFromShip();
    const offer = clampOffer(tradeOffer, max);
    if (sumOffer(offer) <= 0) {
      setTradeStatus(activeTradeConfig.panelStatusEmptyOffer);
      return;
    }

    setTradeOffer(offer);
    addChatMessage(threadId, {
      id: `player-${threadId}-trade-offer-${Date.now()}`,
      role: 'player',
      text: withResourceOffer(activeTradeConfig.playerOfferText, offer),
      timestamp: Date.now(),
    });

    const score = scoreOffer(offer, activeTradeConfig, tradeStance);
    const acceptThreshold =
      activeTradeConfig.acceptThreshold +
      Math.max(0, -tradeStance) * activeTradeConfig.acceptPenaltyPerNegativeStance;
    const insultThreshold = Math.max(
      activeTradeConfig.minimumInsultThreshold,
      activeTradeConfig.insultThreshold +
        Math.max(0, -tradeStance) * activeTradeConfig.insultPenaltyPerNegativeStance -
        Math.max(0, tradeStance) * activeTradeConfig.insultReliefPerPositiveStance
    );

    if (score < insultThreshold) {
      setPendingResourceTrade(null);
      setTradeStance((prev) => prev - 1);
      setTradeStatus(activeTradeConfig.panelStatusInsult);
      addChatMessage(threadId, {
        id: `npc-${threadId}-trade-insult-${Date.now()}`,
        role: 'npc',
        text: activeTradeConfig.npcInsultText,
        timestamp: Date.now(),
      });
      return;
    }

    if (score >= acceptThreshold) {
      setPendingResourceTrade({ kind: 'accepted', deal: offer });
      setTradeStatus(activeTradeConfig.panelStatusAccepted);
      addChatMessage(threadId, {
        id: `npc-${threadId}-trade-accept-${Date.now()}`,
        role: 'npc',
        text: activeTradeConfig.npcAcceptText,
        timestamp: Date.now(),
      });
      return;
    }

    const counter = scaleOfferForCounter(offer, activeTradeConfig, max);
    setPendingResourceTrade({ kind: 'counter', deal: counter });
    setTradeStatus(withResourceOffer(activeTradeConfig.panelStatusCounter, counter));
    addChatMessage(threadId, {
      id: `npc-${threadId}-trade-counter-${Date.now()}`,
      role: 'npc',
      text: withResourceOffer(activeTradeConfig.npcCounterText, counter),
      timestamp: Date.now(),
    });
  };

  const submitTradeOffer = () => {
    if (useCargoBarter) submitCargoOffer();
    else submitResourceOffer();
  };

  const acceptPendingCargoTrade = () => {
    if (!pendingCargoTrade || !activeTradeConfig) return;
    if (!useSalvageClaim && !contactOwner) return;
    if (useSalvageClaim && !depotOwner) return;
    const tradeConfig = activeTradeConfig;
    const deal = cloneBarterDeal(pendingCargoTrade.deal);
    const commit = useSalvageClaim
      ? commitSalvageClaimDeal(deal, playerOwner, depotOwner!)
      : commitBarterDeal(deal, playerOwner, contactOwner!);
    if (!commit.ok) {
      setTradeStatus(commit.reason);
      addChatMessage(threadId, {
        id: `npc-${threadId}-trade-failed-${Date.now()}`,
        role: 'npc',
        text: commit.reason,
        timestamp: Date.now(),
      });
      return;
    }

    refreshPlayerCargoBinding();
    setPendingCargoTrade(null);
    setCargoDeal(emptyBarterDeal());
    setTradeStance((prev) => Math.min(3, prev + 1));
    setTradeStatus(withCargoOffer(tradeConfig.panelStatusSuccess, deal));

    addChatMessage(threadId, {
      id: `player-${threadId}-trade-confirm-${Date.now()}`,
      role: 'player',
      text:
        pendingCargoTrade.kind === 'counter'
          ? withCargoOffer(tradeConfig.playerCounterAcceptText, deal)
          : withCargoOffer(tradeConfig.playerAcceptText, deal),
      timestamp: Date.now(),
    });
    if (tradeConfig.npcCompleteText) {
      addChatMessage(threadId, {
        id: `npc-${threadId}-trade-complete-${Date.now()}`,
        role: 'npc',
        text: tradeConfig.npcCompleteText,
        timestamp: Date.now(),
      });
    }
  };

  const acceptPendingResourceTrade = () => {
    if (!pendingResourceTrade || !activeTradeConfig) return;
    const tradeConfig = activeTradeConfig;

    const deal = cloneOffer(pendingResourceTrade.deal);
    const commit = commitOfferToShip(deal);
    if (!commit.ok) {
      setTradeStatus(commit.reason);
      addChatMessage(threadId, {
        id: `npc-${threadId}-trade-failed-${Date.now()}`,
        role: 'npc',
        text: commit.reason,
        timestamp: Date.now(),
      });
      return;
    }

    recordTradeDelivery(threadId, deal);
    setPendingResourceTrade(null);
    setTradeOffer(EMPTY_TRADE_OFFER);
    setTradeStance((prev) => Math.min(3, prev + 1));
    setTradeStatus(withResourceOffer(tradeConfig.panelStatusSuccess, deal));

    addChatMessage(threadId, {
      id: `player-${threadId}-trade-confirm-${Date.now()}`,
      role: 'player',
      text:
        pendingResourceTrade.kind === 'counter'
          ? withResourceOffer(tradeConfig.playerCounterAcceptText, deal)
          : withResourceOffer(tradeConfig.playerAcceptText, deal),
      timestamp: Date.now(),
    });
    if (tradeConfig.npcCompleteText) {
      addChatMessage(threadId, {
        id: `npc-${threadId}-trade-complete-${Date.now()}`,
        role: 'npc',
        text: tradeConfig.npcCompleteText,
        timestamp: Date.now(),
      });
    }
  };

  const acceptPendingTrade = () => {
    if (useCargoBarter) acceptPendingCargoTrade();
    else acceptPendingResourceTrade();
  };

  const rejectPendingTrade = () => {
    if (!activeTradeConfig) return;
    const tradeConfig = activeTradeConfig;
    const wasCounter = useCargoBarter
      ? pendingCargoTrade?.kind === 'counter'
      : pendingResourceTrade?.kind === 'counter';
    setPendingResourceTrade(null);
    setPendingCargoTrade(null);
    setTradeStatus(tradeConfig.panelStatusCounterDeclined);
    addChatMessage(threadId, {
      id: `player-${threadId}-trade-reject-${Date.now()}`,
      role: 'player',
      text: tradeConfig.playerCounterDeclineText,
      timestamp: Date.now(),
    });
    if (wasCounter && tradeConfig.npcCounterDeclinedAckText) {
      addChatMessage(threadId, {
        id: `npc-${threadId}-trade-reject-ack-${Date.now()}`,
        role: 'npc',
        text: tradeConfig.npcCounterDeclinedAckText,
        timestamp: Date.now(),
      });
    }
  };

  const handleOption = (optionId: string) => {
    if (!thread) return;
    const activeTurn = thread.currentTurnId ? dialogue.turns[thread.currentTurnId] : null;
    if (!activeTurn) return;
    const option = activeTurn.playerOptions.find((o) => o.id === optionId);
    if (!option) return;

    addChatMessage(threadId, {
      id: `player-${threadId}-${optionId}-${Date.now()}`,
      role: 'player',
      text: option.text,
      timestamp: Date.now(),
    });
    setPendingResourceTrade(null);
    setPendingCargoTrade(null);
    setTradeOffer(EMPTY_TRADE_OFFER);
    setCargoDeal(emptyBarterDeal());
    setChatTurn(threadId, option.nextTurnId, true);

    const outcomes = applyDialogueEffects(option.effects).filter((o) => o.text);
    const nextTurn = option.nextTurnId ? dialogue.turns[option.nextTurnId] : null;
    const delay = 900 + Math.random() * 1100;

    setTimeout(() => {
      outcomes.forEach((o, i) => {
        addChatMessage(threadId, {
          id: `fx-${threadId}-${optionId}-${i}-${Date.now()}`,
          role: 'npc',
          text: `» ${o.text}`,
          timestamp: Date.now(),
        });
      });

      if (nextTurn) {
        const clipSrc = resolveNpcVoiceClipSrc(nextTurn.audio);
        addChatMessage(threadId, {
          id: `npc-${threadId}-${option.nextTurnId}-${Date.now()}`,
          role: 'npc',
          text: nextTurn.npcText,
          timestamp: Date.now(),
          audioSrc: clipSrc,
        });
        const isTerminal = nextTurn.playerOptions.length === 0;
        setChatTurn(threadId, isTerminal ? null : option.nextTurnId!, false);
        if (nextTurn.trade) {
          setTradeOpen(true);
          setTradeStatus(nextTurn.trade.panelStatusOpen);
        } else {
          setTradeOpen(false);
          setTradeStatus('');
        }
        if (!clipSrc) speakNpcLine(nextTurn.npcText, dialogue.id);
      } else {
        setChatTurn(threadId, null, false);
        setTradeOpen(false);
        setTradeStatus('');
      }
    }, delay);
  };

  const cargoCanSubmit =
    sumBarterSide(cargoDeal.playerGives) > 0 || sumBarterSide(cargoDeal.contactGives) > 0;

  return (
    <DialogueThread
      shipId={threadId}
      shipName={contact.name}
      inline={inline}
      character={contact}
      hideShipProfile
      commsPlatform={contact.platform ?? 'REACH'}
      effectiveHailStatus="accepted"
      isRadioActive
      showHailPrompt={false}
      thread={thread}
      playerOptions={currentTurn?.playerOptions ?? []}
      showOptions={showOptions}
      isEnded={isEnded}
      onOption={handleOption}
      tradePanel={
        activeTradeConfig
          ? useCargoBarter
            ? {
                visible: tradeOpen,
                mode: 'cargo',
                cargoDeal,
                playerCargoRows: cargoRowsFromMap(playerMax, cargoDeal.playerGives),
                contactCargoRows: cargoRowsFromMap(contactMax, cargoDeal.contactGives),
                statusLine: `${tradeStatus}  STANCE ${tradeStance >= 0 ? '+' : ''}${tradeStance}`,
                pendingCargoDeal: pendingCargoTrade?.deal ?? null,
                pendingCargoSummary: pendingCargoTrade
                  ? formatBarterDeal(pendingCargoTrade.deal)
                  : undefined,
                canSubmit: cargoCanSubmit,
                submitLabel: pendingCargoTrade ? 'SEND NEW OFFER' : 'SEND OFFER',
                onCargoOfferChange: handleCargoOfferChange,
                onSubmit: submitTradeOffer,
                onReset: clearTradeOffer,
                onAcceptPendingDeal: pendingCargoTrade ? acceptPendingTrade : undefined,
                onRejectPendingDeal: pendingCargoTrade ? rejectPendingTrade : undefined,
              }
            : {
                visible: tradeOpen,
                mode: 'resources',
                offer: tradeOffer,
                maxOffer: maxOfferFromShip(),
                statusLine: `${tradeStatus}  STANCE ${tradeStance >= 0 ? '+' : ''}${tradeStance}`,
                pendingDeal: pendingResourceTrade?.deal ?? null,
                canSubmit: sumOffer(tradeOffer) > 0,
                submitLabel: pendingResourceTrade ? 'SEND NEW OFFER' : 'SEND OFFER',
                onOfferChange: handleTradeOfferChange,
                onSubmit: submitTradeOffer,
                onReset: clearTradeOffer,
                onAcceptPendingDeal: pendingResourceTrade ? acceptPendingTrade : undefined,
                onRejectPendingDeal: pendingResourceTrade ? rejectPendingTrade : undefined,
              }
          : undefined
      }
      onClose={onClose}
    />
  );
}
