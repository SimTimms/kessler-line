import type { DockConfig, DockContact, DockTradeTurnConfig } from '../dockConfig';

const BILL_PARCEL_HANDOFF_TRADE: DockTradeTurnConfig = {
  cargoBarter: true,
  allowAskingWithoutOffer: true,
  acceptThreshold: 0,
  insultThreshold: 0,
  counterMultiplier: 1,
  acceptPenaltyPerNegativeStance: 0,
  insultPenaltyPerNegativeStance: 0,
  insultReliefPerPositiveStance: 0,
  minimumInsultThreshold: 0,
  panelStatusOpen: 'Select Sealed Parcel under contact cargo, then send offer.',
  panelStatusCleared: 'Offer cleared.',
  panelStatusEmptyOffer: 'Select the Sealed Parcel to accept it into your hold.',
  panelStatusInsult: 'Transfer refused.',
  panelStatusAccepted: 'Transfer approved. Press AGREE to receive the parcel.',
  panelStatusCounter: 'Transfer counter: {offer}',
  panelStatusSuccess: 'Parcel transfer complete: {offer}',
  panelStatusCounterDeclined: 'Counter declined.',
  npcInsultText: 'No transfer.',
  npcAcceptText: 'Confirmed. Press AGREE and I will release the parcel.',
  npcCounterText: 'Use this transfer: {offer}',
  npcCompleteText: 'Good. Fly it to Bakerfield Falls and hand it to Hank Johnson.',
  npcCounterDeclinedAckText: 'Then no transfer.',
  playerOfferText: 'I am accepting: {offer}',
  playerAcceptText: 'Accepted. Transferring: {offer}',
  playerCounterAcceptText: 'Counter accepted. Transferring: {offer}',
  playerCounterDeclineText: 'Counter declined.',
};

const HANK_PARCEL_DELIVERY_TRADE: DockTradeTurnConfig = {
  cargoBarter: true,
  acceptThreshold: 0,
  insultThreshold: 0,
  counterMultiplier: 1,
  acceptPenaltyPerNegativeStance: 0,
  insultPenaltyPerNegativeStance: 0,
  insultReliefPerPositiveStance: 0,
  minimumInsultThreshold: 0,
  panelStatusOpen: 'Select Sealed Parcel under your cargo, then send offer.',
  panelStatusCleared: 'Offer cleared.',
  panelStatusEmptyOffer: 'Offer the Sealed Parcel from your hold to complete delivery.',
  panelStatusInsult: 'Delivery terms rejected.',
  panelStatusAccepted: 'Delivery accepted. Press AGREE to hand over the parcel.',
  panelStatusCounter: 'Counter on delivery: {offer}',
  panelStatusSuccess: 'Delivery complete: {offer}',
  panelStatusCounterDeclined: 'Counter declined.',
  npcInsultText: 'No parcel, no handover.',
  npcAcceptText: 'That is the right transfer. Confirm it.',
  npcCounterText: 'Need this transfer: {offer}',
  npcCompleteText: 'Received. Bill said you would come through. Thank you, pilot.',
  npcCounterDeclinedAckText: 'Then we are not done.',
  playerOfferText: 'Delivering: {offer}',
  playerAcceptText: 'Confirmed. Handing over: {offer}',
  playerCounterAcceptText: 'Counter accepted. Handing over: {offer}',
  playerCounterDeclineText: 'Counter declined.',
};

const BILL_CHURCHILL: DockContact = {
  id: 'bill-churchill',
  name: 'Bill Churchill',
  role: 'dockmaster',
  age: 58,
  company: 'Donington Salvage Operations',
  portrait: '/profiles/scab-captain.png',
  bio: 'Dockmaster at Donington Station. Keeps the berth moving and dispatches short-haul contracts.',
  platform: 'REACH',
  inventory: {
    label: 'Bill Churchill',
    slots: [{ itemId: 'churchill-parcel', quantity: 1, capacity: 1, supply: 0.9, demand: 0.1 }],
  },
  dialogue: {
    id: 'bill-churchill-parcel-run',
    openingTurnId: 'intro',
    turns: {
      intro: {
        id: 'intro',
        npcText:
          'You are docked at Donington Station. I need one parcel flown to Bakerfield Falls around Mars. Hank Johnson will receive it. Can you take it?',
        playerOptions: [
          {
            id: 'accept-run',
            label: 'Accept parcel run',
            text: 'I can take it. Transfer the parcel to my hold.',
            nextTurnId: 'handoff',
          },
          {
            id: 'decline-run',
            label: 'Decline',
            text: 'Negative. Not taking that run right now.',
            nextTurnId: null,
          },
        ],
      },
      handoff: {
        id: 'handoff',
        npcText:
          'Open the cargo transfer panel and take the Sealed Parcel. Fly it to Bakerfield Falls and hand it directly to Hank Johnson.',
        trade: BILL_PARCEL_HANDOFF_TRADE,
        playerOptions: [
          {
            id: 'back',
            label: 'Back',
            text: 'Understood. Stand by.',
            nextTurnId: 'intro',
          },
        ],
      },
    },
  },
};

const ELIAS_VOSS: DockContact = {
  id: 'elias-voss',
  name: 'Elias Voss',
  role: 'official',
  age: 44,
  company: 'Mars Transit Authority',
  portrait: '/profiles/scab-captain.png',
  bio: 'Comms officer assigned to Donington traffic control and orbital deployment clearances.',
  platform: 'REACH',
  dialogue: {
    id: 'elias-voss-satellite-deployment',
    openingTurnId: 'intro',
    turns: {
      intro: {
        id: 'intro',
        npcText:
          'Comms Officer Elias Voss, Mars Transit Authority. We need an orbital survey satellite deployed today. One cargo container outside Bay A1 is tagged "Orbital Survey Satellite."',
        playerOptions: [
          {
            id: 'accept',
            label: 'Accept deployment task',
            text: 'Understood. I will tow the satellite container and deploy it into Mars orbit.',
            nextTurnId: 'brief',
          },
          {
            id: 'decline',
            label: 'Not now',
            text: 'Negative. I am not ready to run that deployment yet.',
            nextTurnId: null,
          },
        ],
      },
      brief: {
        id: 'brief',
        npcText:
          'Procedure is simple: dock with the marked container, tow it to a stable Mars orbit, then undock to release. Keep periapsis and apoapsis above the atmosphere and avoid high radial drift before separation.',
        playerOptions: [
          {
            id: 'ack',
            label: 'Acknowledge',
            text: 'Copy all. I will report once the satellite is deployed.',
            nextTurnId: null,
          },
          {
            id: 'repeat',
            label: 'Repeat procedure',
            text: 'Repeat the deployment checklist.',
            nextTurnId: 'brief',
          },
        ],
      },
    },
  },
};

const HANK_JOHNSON: DockContact = {
  id: 'hank-johnson',
  name: 'Hank Johnson',
  role: 'dockmaster',
  age: 47,
  company: 'Bakerfield Falls Operations',
  portrait: '/profiles/scab-captain.png',
  bio: 'Dockmaster at Bakerfield Falls. Receiving lead for incoming station parcels.',
  platform: 'REACH',
  inventory: {
    label: 'Hank Johnson',
    slots: [],
  },
  dialogue: {
    id: 'hank-johnson-delivery',
    openingTurnId: 'intro',
    turns: {
      intro: {
        id: 'intro',
        npcText:
          'Hank Johnson, Bakerfield Falls dockmaster. Bill Churchill said you were bringing a parcel from Donington Station.',
        playerOptions: [
          {
            id: 'deliver-parcel',
            label: 'Deliver parcel',
            text: 'Confirmed. I have the parcel from Bill Churchill and I am ready to transfer it.',
            nextTurnId: 'delivery',
          },
          {
            id: 'not-yet',
            label: 'Not yet',
            text: 'Not yet. I will return when I have the parcel.',
            nextTurnId: null,
          },
        ],
      },
      delivery: {
        id: 'delivery',
        npcText:
          'Use the trade panel and transfer the Sealed Parcel from your cargo hold. Once I receive it, this handoff is complete.',
        trade: HANK_PARCEL_DELIVERY_TRADE,
        playerOptions: [
          {
            id: 'back',
            label: 'Back',
            text: 'Stand by.',
            nextTurnId: 'intro',
          },
        ],
      },
    },
  },
};

export const DONINGTON_STATION_DOCK_CONFIG: DockConfig = {
  label: 'Donington Station',
  backgroundImage: '/station.jpg',
  fuel: { amount: 40, capacity: 100 },
  o2: { amount: 55, capacity: 100 },
  power: { amount: 70, capacity: 100 },
  crew: { amount: 0, capacity: 4 },
  inventory: {
    label: 'Donington Depot',
    slots: [
      { itemId: 'spare-parts', quantity: 6, capacity: 30, supply: 0.6, demand: 0.2 },
      { itemId: 'iron-slag', quantity: 12, capacity: 45, supply: 0.75, demand: 0.15 },
      { itemId: 'reaction-mass', quantity: 4, capacity: 30, supply: 0.25, demand: 0.5 },
    ],
  },
  contacts: [BILL_CHURCHILL, ELIAS_VOSS],
  jobBoard: [],
};

export const BAKERFIELD_FALLS_DOCK_CONFIG: DockConfig = {
  label: 'Bakerfield Falls',
  backgroundImage: '/station.jpg',
  fuel: { amount: 45, capacity: 100 },
  o2: { amount: 50, capacity: 100 },
  power: { amount: 72, capacity: 100 },
  crew: { amount: 0, capacity: 4 },
  inventory: {
    label: 'Bakerfield Falls Depot',
    slots: [
      { itemId: 'o2-cells', quantity: 10, capacity: 30, supply: 0.55, demand: 0.25 },
      { itemId: 'organics', quantity: 8, capacity: 20, supply: 0.45, demand: 0.35 },
      { itemId: 'power-cells', quantity: 5, capacity: 20, supply: 0.35, demand: 0.45 },
    ],
  },
  contacts: [HANK_JOHNSON],
  jobBoard: [],
};
