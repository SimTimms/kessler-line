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
  role: 'entente-cordiale-liaison',
  age: 58,
  company: 'Entente Cordiale Government',
  portrait: '/profiles/bill-churchill.jpg',
  bio: 'Entente Cordiale liaison to Donington Station. Born in Maidstone in British Territory, Earth. ',
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
        npcText: `Splendid vessel you have there, your ship is it? I wonder if I might impose upon your good nature. I have a package of some delicacy that must be conveyed to Bakerfield Falls Station. Would you mind terribly delivering it for me?
It's all rather hush-hush if you gather my meaning. Depart at once and with the utmost discretion, and you'll find a… shall we say… pleasant consideration awaiting you at the other end.`,
        audio: 'bill-churchill.mp3',
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
            text: `I don't think so, but thank you kindly for the offer.`,
            nextTurnId: 'declineRun',
          },
        ],
      },
      declineRun: {
        id: 'decline-run',
        npcText: `Ah such a shame, It's not often I am wrong, but I appear to have misjudged your calibre. I will not trouble you further.  `,
        playerOptions: [
          {
            id: 'back',
            label: 'Back',
            text: 'Bye',
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
  role: 'comms-officer',
  age: 44,
  company: 'Donington Station Communications Chief',
  portrait: '/profiles/elias-voss.jpg',
  bio: 'Comms officer assigned to Donington traffic control and orbital deployment clearances.',
  platform: 'REACH',
  dialogue: {
    id: 'elias-voss-satellite-deployment',
    openingTurnId: 'intro',
    turns: {
      intro: {
        id: 'intro',
        npcText: `Communications Chief Elias Voss. We have an urgent matter requiring immediate attention. We would not ordinarily impose such a task on a civilian contractor. We have lost communication with our dear Mother Earth. We'd be incredibly grateful if you'd be so kind as to undertake the task of positioning an orbital communications satellite in the hopes that we can re-establish communication. A single cargo crate containing a communication satellite to be positioned in orbit around Mars.`,
        audio: 'elias-voss.mp3',
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
            text: `Sorry, I'm not for hire.`,
            nextTurnId: 'satellite-decline',
          },
        ],
      },
      satelliteDecline: {
        id: 'satellite-decline',
        npcText: `That's disappointing. I do hope that in the near future you don't require any assistance from Donington Station. Good day.`,
        playerOptions: [
          {
            id: 'back',
            label: 'Back',
            text: 'Bye',
            nextTurnId: null,
          },
        ],
      },
      brief: {
        id: 'brief',
        npcText:
          'Spectacular! The procedure is simple: dock with the marked container, tow it to a stable Mars orbit, then undock to release. Keep periapsis and apoapsis above the atmosphere and avoid high radial drift before separation.',
        playerOptions: [
          {
            id: 'ack',
            label: 'Acknowledge',
            text: 'Copy all. I will report once the satellite is deployed.',
            nextTurnId: null,
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
  hailAcceptanceChance: 1,
  dockRequestAcceptanceChance: 1,
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
