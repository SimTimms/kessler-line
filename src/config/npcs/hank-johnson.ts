import type { DockContact, DockTradeTurnConfig } from '../dockConfig';

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

export const HANK_JOHNSON: DockContact = {
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
