import type { DockContact, DockTradeTurnConfig } from '../dockConfig';

const BILL_PARCEL_HANDOFF_TRADE: DockTradeTurnConfig = {
  cargoBarter: true,
  allowAskingWithoutOffer: true,
  contactOffersAll: true,
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

export const BILL_CHURCHILL: DockContact = {
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
            label: 'Accept Parcel',
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
        playerOptions: [],
      },
    },
  },
};
