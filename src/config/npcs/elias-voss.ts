import type { DockContact } from '../dockConfig';

export const ELIAS_VOSS: DockContact = {
  id: 'elias-voss',
  name: 'Elias Voss',
  role: 'comms-officer',
  missionId: 'elias-voss-satellite-deployment',
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
            effects: [{ type: 'acceptMission', missionId: 'elias-voss-satellite-deployment' }],
          },
          {
            id: 'decline',
            label: 'Not now',
            text: `Sorry, I'm not for hire.`,
            nextTurnId: 'satellite-decline',
            effects: [{ type: 'declineMission', missionId: 'elias-voss-satellite-deployment' }],
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
          'Spectacular! The procedure is simple: dock with the marked container, tow it to a stable Mars orbit, then undock to release. Should be simple for somebody of your.... intelligence. ',
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
