// NPC dialogue trees for drive-signature ships in radio range.
// Each tree is assigned to a ship ID once per session and not re-used.

import type { ShipClass, ShipFaction, ShipAgenda, ShipRegion, ShipRecord } from './shipRegistry';
import { getPlayerRegion } from './shipRegistry';

export interface PlayerOption {
  id: string;
  label: string; // short button label
  text: string; // full player message text
  nextTurnId: string | null; // null = end of tree
}

export interface DialogueTurn {
  id: string;
  npcText: string;
  playerOptions: PlayerOption[];
}

/** Conditions that determine which ships this dialogue tree is appropriate for. */
export interface DialogueConditions {
  shipClasses?: ShipClass[];
  factions?: ShipFaction[];
  agendas?: ShipAgenda[];
  destinations?: ShipRegion[];
  /** Player must be in one of these regions for the tree to be selectable. */
  playerRegions?: ShipRegion[];
}

export interface DialogueTree {
  id: string;
  captainName: string;
  vesselName: string;
  openingTurnId: string;
  /** If set, plays this audio file for the opening NPC message instead of TTS. */
  audioFile?: string;
  /** If set, this tree is only matched to ships whose profile aligns with these conditions. */
  conditions?: DialogueConditions;
  turns: Record<string, DialogueTurn>;
}

export const CAPTAIN_NAMES = [
  'Yeva Sorn',
  'Brek Nahul',
  'Emra Tolse',
  'Oram Vesk',
  'Lira Kestrel',
  'Dax Harrow',
  'Mira Solen',
  'Renn Voss',
  'Talia Drayke',
  'Jarek Venn',
  'Soren Valis',
  'Kael Roran',
  'Vera Lorne',
  'Dorian Kade',
  'Lena Voss',
  'Riven Sol',
  'Nia Varek',
  'Galen Thorne',
  'Aria Voss',
  'Kade Roran',
];

export const DIALOGUE_TREES: DialogueTree[] = [
  // ── Tree 1: Cargo hauler in transit ───────────────────────────────────────
  {
    id: 'cargo-runner',
    captainName: 'Cpt. Yeva Sorn',
    vesselName: 'KARAK DRIFT',
    openingTurnId: 'intro',
    conditions: {
      shipClasses: ['cargo-hauler', 'independent-trader'],
      agendas: ['transiting'],
    },
    turns: {
      intro: {
        id: 'intro',
        npcText:
          "Outer Lanes? What are you running out this far? We came through {{currentRegion}} — took the back route to avoid the contested corridor. What's the situation ahead near {{destination}}?",
        playerOptions: [
          {
            id: 'intro-safe',
            label: 'ROUTE IS CLEAR',
            text: "Corridor looks clean from where I'm sitting. {{destination}} traffic looks clear on my end. Should be fine.",
            nextTurnId: 'safe',
          },
          {
            id: 'intro-warn',
            label: 'ADVISE CAUTION',
            text: "I'd stay wide of the approach lane into {{destination}}. Picked up debris on my last scan. Nothing catastrophic but worth the detour.",
            nextTurnId: 'warn',
          },
          {
            id: 'intro-trade',
            label: 'WHAT ARE YOU HAULING',
            text: "I appreciate the contact but I'm more interested in your manifest. What are you running?",
            nextTurnId: 'trade',
          },
        ],
      },
      safe: {
        id: 'safe',
        npcText:
          "Good to hear. We've got a full load and I'm not keen to sit in a holding pattern if {{destination}} Control gets backed up. We'll take the standard approach. Thanks for the intel.",
        playerOptions: [
          {
            id: 'safe-ack',
            label: 'SAFE HAUL',
            text: 'Safe haul. Mind the beacon scatter on the far side.',
            nextTurnId: 'close',
          },
        ],
      },
      warn: {
        id: 'warn',
        npcText:
          "Got it — I'll pull the chart. We're slow enough that a detour won't cost much. Better than a hull scrape this close to {{destination}}. Any other contact out here today?",
        playerOptions: [
          {
            id: 'warn-few',
            label: 'FEW OTHER SIGS',
            text: 'A couple drive signatures. Nothing that hailed.',
            nextTurnId: 'close',
          },
          {
            id: 'warn-quiet',
            label: 'ALL QUIET',
            text: 'Quiet stretch. Just you.',
            nextTurnId: 'close',
          },
        ],
      },
      trade: {
        id: 'trade',
        npcText:
          "Contracted cargo run — not glamorous but it pays. You looking to arrange something? We're not set up for on-the-fly transfers out here but I can flag our layover at {{destination}}.",
        playerOptions: [
          {
            id: 'trade-yes',
            label: 'SEND LAYOVER DATA',
            text: "Do that. I'll check with dispatch.",
            nextTurnId: 'trade-close',
          },
          {
            id: 'trade-no',
            label: 'JUST ASKING',
            text: "No, just curious. Good to know who's operating out here.",
            nextTurnId: 'close',
          },
        ],
      },
      'trade-close': {
        id: 'trade-close',
        npcText:
          "Layover data transmitted to your nav. We'll be docked at {{destination}} shortly after arrival — put the vessel name to your dock contacts.",
        playerOptions: [
          {
            id: 'trade-close-ack',
            label: 'RECEIVED',
            text: 'Received. Appreciate it.',
            nextTurnId: null,
          },
        ],
      },
      close: {
        id: 'close',
        npcText:
          "Appreciate it. We'll clear the channel — full load to maneuver. Stay safe out there. Karak Drift out.",
        playerOptions: [
          {
            id: 'close-ack',
            label: 'CLEAR',
            text: 'Clear. Good luck on the approach.',
            nextTurnId: null,
          },
        ],
      },
    },
  },

  // ── Tree 2: Independent ore miner, gruff ─────────────────────────────────
  {
    id: 'ore-miner',
    captainName: 'Cpt. Brek Nahul',
    vesselName: 'STONN IV',
    openingTurnId: 'intro',
    audioFile: 'https://kessler-audio.s3.eu-west-2.amazonaws.com/ore-miner.mp3',
    conditions: {
      shipClasses: ['ore-miner', 'salvager'],
      agendas: ['mining', 'salvaging', 'drifting'],
      factions: ['Independent', 'Periphery League', 'The Drift'],
    },
    turns: {
      intro: {
        id: 'intro',
        npcText: "What do you want. We're busy.",
        playerOptions: [
          {
            id: 'intro-trade',
            label: 'LOOKING TO TRADE',
            text: 'Looking to see if you have anything worth trading. Running short on refined material.',
            nextTurnId: 'trade',
          },
          {
            id: 'intro-info',
            label: 'SECTOR INTEL',
            text: "Don't need anything. Just checking who's operating in this sector.",
            nextTurnId: 'info',
          },
          {
            id: 'intro-help',
            label: 'TECHNICAL QUESTION',
            text: "I could use a second opinion. Got a nav discrepancy I can't account for.",
            nextTurnId: 'help',
          },
        ],
      },
      trade: {
        id: 'trade',
        npcText:
          "We've got silicate aggregate and a partial nickel-iron load. Nothing fancy. For numbers you'll have to get your dock to contact ours. We don't do spot deals in open space.",
        playerOptions: [
          {
            id: 'trade-dock',
            label: 'WHERE ARE YOU DOCKED',
            text: 'Fair enough. Where are you docked normally?',
            nextTurnId: 'trade-dock',
          },
          {
            id: 'trade-no',
            label: 'NOT WORTH IT',
            text: 'Not worth the logistics. Forget it.',
            nextTurnId: 'close',
          },
        ],
      },
      'trade-dock': {
        id: 'trade-dock',
        npcText:
          "Meridian Platform, sector four. Ask for Nahul. They'll know. Now if that's all — we've got drilling to get back to.",
        playerOptions: [
          {
            id: 'trade-dock-ack',
            label: 'NOTED. OUT.',
            text: "Got it. I'll pass it along. Sorry to interrupt.",
            nextTurnId: null,
          },
        ],
      },
      info: {
        id: 'info',
        npcText:
          "We've been on this deposit three weeks. Registered claim, all legit. If you're with a surveyor outfit here to challenge that, go through our licensing agent.",
        playerOptions: [
          {
            id: 'info-no',
            label: 'NOT CHALLENGING',
            text: 'Not a surveyor. Just passing through.',
            nextTurnId: 'info-close',
          },
        ],
      },
      'info-close': {
        id: 'info-close',
        npcText:
          "Fine. Sector's clear enough. No unusual traffic other than you. Stay clear of the drilling perimeter — 800 metres, it's on the standard chart.",
        playerOptions: [
          {
            id: 'info-close-ack',
            label: 'UNDERSTOOD',
            text: "Understood. Won't crowd you.",
            nextTurnId: null,
          },
        ],
      },
      help: {
        id: 'help',
        npcText:
          "Nav discrepancy. What kind — positional or timing? We've had beacon drift issues out here. The secondary array covering {{currentRegion}} has been intermittent.",
        playerOptions: [
          {
            id: 'help-timing',
            label: 'TIMING SYNC',
            text: 'Timing. My clock sync keeps slipping about four seconds against the Neptune reference.',
            nextTurnId: 'help-timing',
          },
          {
            id: 'help-position',
            label: 'POSITIONAL DRIFT',
            text: "Position. I'm showing a half-unit offset from chart data.",
            nextTurnId: 'help-position',
          },
        ],
      },
      'help-timing': {
        id: 'help-timing',
        npcText:
          'Four seconds is within drift tolerance out here. The light delay alone makes your sync unreliable. Use local dead reckoning and resync within 50 Mm of Triton. Standard practice.',
        playerOptions: [
          {
            id: 'help-timing-ack',
            label: 'MAKES SENSE',
            text: "That makes sense. Thanks — I'll stop chasing it.",
            nextTurnId: null,
          },
        ],
      },
      'help-position': {
        id: 'help-position',
        npcText:
          "Half a unit is the regional array. We flagged it with {{currentRegion}} Control two weeks ago. No fix timeline. You're not broken, the grid is. Adjust manually.",
        playerOptions: [
          {
            id: 'help-position-ack',
            label: 'GOOD TO KNOW',
            text: "Good to know. I'll log it too.",
            nextTurnId: null,
          },
        ],
      },
      close: {
        id: 'close',
        npcText: "Right. We're done here.",
        playerOptions: [
          {
            id: 'close-ack',
            label: 'OUT.',
            text: 'Out.',
            nextTurnId: null,
          },
        ],
      },
    },
  },

  // ── Tree 3: Scientific survey vessel ─────────────────────────────────────
  {
    id: 'survey-vessel',
    captainName: 'Dr. Emra Tolse',
    vesselName: 'WESTERMARK',
    openingTurnId: 'intro',
    conditions: {
      shipClasses: ['survey'],
      agendas: ['surveying', 'transiting'],
    },
    turns: {
      intro: {
        id: 'intro',
        npcText:
          "Hello — Westermark here, deep survey division, Consolidated Sciences. We weren't expecting traffic this far out. Are you local to {{currentRegion}} or just passing through?",
        playerOptions: [
          {
            id: 'intro-local',
            label: 'LOCAL OPERATOR',
            text: 'Local. Running cargo for Outer Lanes, based out of Triton.',
            nextTurnId: 'local',
          },
          {
            id: 'intro-transit',
            label: 'TRANSITING',
            text: 'Transiting. Came around from the Jupiter corridor. Long haul.',
            nextTurnId: 'transit',
          },
        ],
      },
      local: {
        id: 'local',
        npcText:
          "Outer Lanes — I know them. We're contracted to survey viable relay points through this region. Any local knowledge you'd share? Sensor blind spots, traffic patterns, that sort of thing.",
        playerOptions: [
          {
            id: 'local-share',
            label: 'SHARE INTEL',
            text: 'Sure. The sector between marker six and the ice shelf runs hot for magnetic interference. Your sensors will drift if you hold that zone too long.',
            nextTurnId: 'local-share',
          },
          {
            id: 'local-nda',
            label: 'PROPRIETARY DATA',
            text: "Anything I know is covered by an operator NDA. Can't share it unofficially.",
            nextTurnId: 'local-nda',
          },
        ],
      },
      'local-share': {
        id: 'local-share',
        npcText:
          'Magnetic interference between six and the ice shelf — noted for the calibration runs. Is it consistent or variable by approach vector?',
        playerOptions: [
          {
            id: 'local-share-consistent',
            label: 'CONSISTENT',
            text: 'Consistent. Structural, not temporal. Same every pass.',
            nextTurnId: 'local-close',
          },
          {
            id: 'local-share-variable',
            label: 'VARIABLE',
            text: "Variable. Worse on certain approach vectors. I can't give you an exact pattern.",
            nextTurnId: 'local-close',
          },
        ],
      },
      'local-nda': {
        id: 'local-nda',
        npcText:
          "Of course — I understand. We'll go through official channels. We appreciate even the conversation. It's quiet out here.",
        playerOptions: [
          {
            id: 'local-nda-ack',
            label: 'GOOD LUCK',
            text: 'Good luck with the survey.',
            nextTurnId: null,
          },
        ],
      },
      'local-close': {
        id: 'local-close',
        npcText:
          "Understood. We'll approach from the far side and run a calibration pass before committing the array. Thank you — genuinely useful. Safe travels, Outer Lanes.",
        playerOptions: [
          {
            id: 'local-close-ack',
            label: 'SAFE SURVEY',
            text: 'Safe survey. Westermark out.',
            nextTurnId: null,
          },
        ],
      },
      transit: {
        id: 'transit',
        npcText:
          "Long haul. How are conditions between here and the inner system? We've been running survey ops in {{currentRegion}} for three months — our nav charts are getting stale.",
        playerOptions: [
          {
            id: 'transit-fine',
            label: 'LANES ARE CLEAR',
            text: 'Clear when I came through. Some traffic congestion at the main waypoints but nothing that stopped me.',
            nextTurnId: 'transit-close',
          },
          {
            id: 'transit-trouble',
            label: 'SOME DISRUPTION',
            text: 'Routing disruption near the Ceres relay when I passed. Not hostile — should be resolved by now.',
            nextTurnId: 'transit-close',
          },
        ],
      },
      'transit-close': {
        id: 'transit-close',
        npcText:
          "Good to know. We'll update our charts before we leave {{currentRegion}}. Three months of dead reckoning tends to stack up. Appreciate the update.",
        playerOptions: [
          {
            id: 'transit-close-ack',
            label: 'SAFE RETURN',
            text: 'Safe return. Westermark out.',
            nextTurnId: null,
          },
        ],
      },
    },
  },

  // ── Tree 4: Neptune Corridor Force patrol ─────────────────────────────────
  {
    id: 'patrol-vessel',
    captainName: 'Lt. Oram Vesk',
    vesselName: 'NCF ARDENT',
    openingTurnId: 'intro',
    conditions: {
      shipClasses: ['patrol'],
      agendas: ['patrolling', 'transiting'],
      factions: ['Terran Concordat', 'Periphery League'],
      playerRegions: ['Neptune System', 'Triton', 'Deep Space'],
    },
    turns: {
      intro: {
        id: 'intro',
        npcText:
          'This is NCF Ardent, Neptune Corridor Force. Identify your vessel, operator registry, and current cargo manifest.',
        playerOptions: [
          {
            id: 'intro-comply',
            label: 'COMPLY',
            text: 'Outer Lanes Ltd., registry OL-7743-N. Running processed equipment under manifest 4419. All documentation current.',
            nextTurnId: 'comply',
          },
          {
            id: 'intro-question',
            label: 'REASON FOR CHECK',
            text: "Happy to comply — can I ask the reason for the check? I'm current on all my filings.",
            nextTurnId: 'question',
          },
        ],
      },
      comply: {
        id: 'comply',
        npcText:
          "OL-7743-N confirmed. Manifest 4419 checks against our records. You're clear to proceed. Be advised — we have a rolling patrol pattern in this sector. Any vessel deviating from registered route without contact will be flagged.",
        playerOptions: [
          {
            id: 'comply-ack',
            label: 'UNDERSTOOD',
            text: "Understood. I'll stay on logged heading.",
            nextTurnId: 'close',
          },
          {
            id: 'comply-ask',
            label: "WHAT'S THE PATROL FOR",
            text: "Understood. Mind if I ask what's prompting the patrol pattern?",
            nextTurnId: 'patrol-reason',
          },
        ],
      },
      question: {
        id: 'question',
        npcText:
          "Routine sector sweep. Increased {{currentRegion}} traffic has prompted additional verification checks. Your registry is fine — we're screening for vessels outside declared parameters.",
        playerOptions: [
          {
            id: 'question-ack',
            label: 'UNDERSTOOD',
            text: 'Understood. OL-7743-N, filings current, manifest 4419.',
            nextTurnId: 'comply',
          },
        ],
      },
      'patrol-reason': {
        id: 'patrol-reason',
        npcText:
          'Undeclared cargo incidents near the outer belt junction. Nothing I can detail openly. Stay on registered headings, maintain transponder visibility, report anything running dark to this frequency.',
        playerOptions: [
          {
            id: 'patrol-reason-ack',
            label: 'WILL DO',
            text: "Will do. Haven't seen anything running dark. I'll log it.",
            nextTurnId: 'close',
          },
        ],
      },
      close: {
        id: 'close',
        npcText: 'Ardent out.',
        playerOptions: [
          {
            id: 'close-ack',
            label: 'CLEAR.',
            text: 'Clear.',
            nextTurnId: null,
          },
        ],
      },
    },
  },
  {
    id: 'merchant-convoy',
    captainName: 'Cpt. Ralen Doss',
    vesselName: 'HINTERLIGHT',
    openingTurnId: 'intro',
    conditions: {
      shipClasses: ['merchant', 'cargo-hauler'],
      agendas: ['trading', 'transiting'],
    },
    turns: {
      intro: {
        id: 'intro',
        npcText:
          'Hinterlight convoy checking in. You look like a local operator — any updates from Earth? Our buyers are getting nervous.',
        playerOptions: [
          {
            id: 'intro-none',
            label: 'NO NEWS',
            text: 'No signals. No relays. Nothing from SolNet.',
            nextTurnId: 'none',
          },
          {
            id: 'intro-rumors',
            label: 'RUMORS',
            text: 'Only rumors. Nothing verified.',
            nextTurnId: 'rumors',
          },
          {
            id: 'intro-cargo',
            label: 'WHAT ARE YOU MOVING',
            text: 'What’s your convoy carrying?',
            nextTurnId: 'cargo',
          },
        ],
      },

      none: {
        id: 'none',
        npcText:
          "That's bad for us. Half our contracts depend on Earth-side buyers. If they're offline… we're hauling dead weight.",
        playerOptions: [
          {
            id: 'none-ack',
            label: 'HOLD POSITION',
            text: 'Hold until you get a verified relay. No point rushing.',
            nextTurnId: 'close',
          },
        ],
      },

      rumors: {
        id: 'rumors',
        npcText:
          "We've heard everything from solar storms to political shutdowns. Nobody knows. Nobody's saying anything official.",
        playerOptions: [
          {
            id: 'rumors-belief',
            label: 'WHAT DO YOU THINK',
            text: 'What do you believe happened?',
            nextTurnId: 'rumors-belief',
          },
        ],
      },

      'rumors-belief': {
        id: 'rumors-belief',
        npcText:
          "Honestly? I think something broke. Something big. Systems don't just go dark like that.",
        playerOptions: [
          {
            id: 'rumors-belief-ack',
            label: 'UNDERSTOOD',
            text: 'Understood. Stay alert.',
            nextTurnId: 'close',
          },
        ],
      },

      cargo: {
        id: 'cargo',
        npcText:
          "Mixed goods. Processed metals, med supplies, electronics. If Earth stays dark, the market's going to swing hard.",
        playerOptions: [
          {
            id: 'cargo-trade',
            label: 'INTERESTED',
            text: "If you're looking to offload, I might be interested.",
            nextTurnId: 'cargo-trade',
          },
          {
            id: 'cargo-no',
            label: 'NOT NOW',
            text: 'Not looking to trade right now.',
            nextTurnId: 'close',
          },
        ],
      },

      'cargo-trade': {
        id: 'cargo-trade',
        npcText:
          "We can arrange something at our next dock. Not out here. But I'll flag your vessel ID.",
        playerOptions: [
          {
            id: 'cargo-trade-ack',
            label: 'APPRECIATED',
            text: 'Appreciated.',
            nextTurnId: null,
          },
        ],
      },

      close: {
        id: 'close',
        npcText: 'Copy. Hinterlight out.',
        playerOptions: [
          {
            id: 'close-ack',
            label: 'CLEAR',
            text: 'Clear.',
            nextTurnId: null,
          },
        ],
      },
    },
  },
  {
    id: 'drifter',
    captainName: 'Unknown Operator',
    vesselName: 'UNREGISTERED',
    openingTurnId: 'intro',
    conditions: {
      shipClasses: ['unknown', 'drifter', 'salvager'],
      agendas: ['drifting', 'loitering'],
    },
    turns: {
      intro: {
        id: 'intro',
        npcText: "…You're broadcasting too loud. Keep it down. You trying to get flagged out here?",
        playerOptions: [
          {
            id: 'intro-earth',
            label: 'ASK ABOUT EARTH',
            text: "Relax. I'm trying to find out if anyone's heard from Earth.",
            nextTurnId: 'earth',
          },
          {
            id: 'intro-rumors',
            label: 'HEARD ANYTHING',
            text: 'Picked up anything strange on long-band?',
            nextTurnId: 'rumors',
          },
          {
            id: 'intro-business',
            label: 'WHY ARE YOU OUT HERE',
            text: "You're far off any lane. What's your business?",
            nextTurnId: 'business',
          },
        ],
      },

      earth: {
        id: 'earth',
        npcText:
          "Earth? Nobody's heard a damn thing. Not for days. Anyone who says otherwise is lying or selling something.",
        playerOptions: [
          {
            id: 'earth-theory',
            label: 'ANY THEORIES',
            text: 'You got a theory?',
            nextTurnId: 'earth-theory',
          },
        ],
      },

      'earth-theory': {
        id: 'earth-theory',
        npcText:
          'Plenty. None good. Best case is a system-wide blackout. Worst case… you don’t want to hear it.',
        playerOptions: [
          {
            id: 'earth-dark',
            label: 'TELL ME',
            text: 'Try me.',
            nextTurnId: 'earth-dark',
          },
          {
            id: 'earth-leave',
            label: 'NEVER MIND',
            text: 'Forget it. Stay safe.',
            nextTurnId: 'close',
          },
        ],
      },

      'earth-dark': {
        id: 'earth-dark',
        npcText:
          'Fine. Word is something hit the SolNet trunk. Hard. Sabotage, accident, intentional shutdown — take your pick. None of it helps us out here.',
        playerOptions: [
          {
            id: 'earth-dark-ack',
            label: 'COPY',
            text: "Copy. I'll keep an ear out.",
            nextTurnId: 'close',
          },
        ],
      },

      rumors: {
        id: 'rumors',
        npcText:
          'Ghost signals. Half-packets. A corrupted distress loop from somewhere near the Belt. Could be real. Could be nothing.',
        playerOptions: [
          {
            id: 'rumors-distress',
            label: 'DISTRESS CALL?',
            text: 'What kind of distress call?',
            nextTurnId: 'rumors-distress',
          },
        ],
      },

      'rumors-distress': {
        id: 'rumors-distress',
        npcText:
          "Can't tell. Fragmented. Could be a ship. Could be a relay. Could be a joke. But something's wrong. Everyone feels it.",
        playerOptions: [
          {
            id: 'rumors-distress-ack',
            label: 'UNDERSTOOD',
            text: 'Understood.',
            nextTurnId: 'close',
          },
        ],
      },

      business: {
        id: 'business',
        npcText: 'My business is staying alive. And that means staying quiet. You should try it.',
        playerOptions: [
          {
            id: 'business-ack',
            label: 'FAIR',
            text: 'Fair enough.',
            nextTurnId: 'close',
          },
        ],
      },

      close: {
        id: 'close',
        npcText: "I'm gone. Don't follow.",
        playerOptions: [
          {
            id: 'close-ack',
            label: 'CLEAR',
            text: 'Clear.',
            nextTurnId: null,
          },
        ],
      },
    },
  },
  {
    id: 'courier-runner',
    captainName: 'Cpt. Lira Vance',
    vesselName: 'SKYWARD TRACE',
    openingTurnId: 'intro',
    conditions: {
      shipClasses: ['courier', 'fast-runner'],
      agendas: ['transiting', 'urgent-delivery'],
    },
    turns: {
      intro: {
        id: 'intro',
        npcText:
          "Skyward Trace hailing. You're the first voice I've caught in hours. Any confirmed traffic from Earth-side relays? My long-band's been silent.",
        playerOptions: [
          {
            id: 'intro-no-contact',
            label: 'NO CONTACT',
            text: "Nothing from Earth. All channels dark. You're not alone.",
            nextTurnId: 'no-contact',
          },
          {
            id: 'intro-rumor',
            label: 'RUMORS ONLY',
            text: 'No official signals. Just rumors drifting through the lanes.',
            nextTurnId: 'rumor',
          },
          {
            id: 'intro-cargo',
            label: 'WHAT ARE YOU CARRYING',
            text: "You sound tense. What's your cargo?",
            nextTurnId: 'cargo',
          },
        ],
      },
      'no-contact': {
        id: 'no-contact',
        npcText:
          "Damn. I was hoping it was just my array. I've got priority packets stamped for Earth Gov — time-sensitive. If the relays are down, I'm running blind.",
        playerOptions: [
          {
            id: 'no-contact-ack',
            label: 'HOLD POSITION',
            text: 'Sit tight until you get a verified relay. No point burning fuel into a blackout.',
            nextTurnId: 'close',
          },
        ],
      },

      rumor: {
        id: 'rumor',
        npcText:
          'Same here. A patrol near the Belt said the SolNet trunk went dark without warning. No distress. No system pings. Just silence.',
        playerOptions: [
          {
            id: 'rumor-more',
            label: 'ANY OTHER RUMORS',
            text: 'Anything else circulating?',
            nextTurnId: 'rumor-more',
          },
          {
            id: 'rumor-close',
            label: 'STAY SHARP',
            text: "Keep your sensors warm. Something's off.",
            nextTurnId: 'close',
          },
        ],
      },

      'rumor-more': {
        id: 'rumor-more',
        npcText:
          "Only whispers. Some say Earth Gov shut the trunk intentionally. Others say it was hit. Nobody knows. Nobody's admitting anything.",
        playerOptions: [
          {
            id: 'rumor-more-ack',
            label: 'UNDERSTOOD',
            text: 'Understood. Keep your head down.',
            nextTurnId: 'close',
          },
        ],
      },

      cargo: {
        id: 'cargo',
        npcText:
          "Encrypted diplomatic packets. I don't read them — I just run them. But if Earth isn't answering… I don't know where any of this is supposed to go.",
        playerOptions: [
          {
            id: 'cargo-redirect',
            label: 'REDIRECT',
            text: "Route them to the nearest Concordat office. They'll sort it.",
            nextTurnId: 'close',
          },
        ],
      },

      close: {
        id: 'close',
        npcText: "Copy. I'll adjust course and wait for a verified relay. Skyward Trace out.",
        playerOptions: [
          {
            id: 'close-ack',
            label: 'CLEAR',
            text: 'Clear skies.',
            nextTurnId: null,
          },
        ],
      },
    },
  },
  {
    id: 'maintenance-tug',
    captainName: 'Chief Rollo Brann',
    vesselName: 'TUG-77 “GRUMBLE”',
    openingTurnId: 'intro',
    conditions: {
      shipClasses: ['maintenance', 'tug', 'utility'],
      agendas: ['repairing', 'drifting', 'transiting'],
    },
    audioFile: '',
    turns: {
      intro: {
        id: 'intro',
        npcText:
          "Tug-77 Grumble here. If you're calling to complain about the smell, it's not me — it's the coolant leak. Or the food printer. Hard to tell these days.",
        playerOptions: [
          {
            id: 'intro-greet',
            label: 'JUST SAYING HELLO',
            text: 'Relax, Chief. Just saying hello.',
            nextTurnId: 'greet',
          },
          {
            id: 'intro-earth',
            label: 'ASK ABOUT EARTH',
            text: "Actually, I'm checking if you've heard anything from Earth.",
            nextTurnId: 'earth',
          },
          {
            id: 'intro-why',
            label: 'WHY DO YOU SMELL LIKE COOLANT',
            text: 'Why *do* you smell like coolant?',
            nextTurnId: 'why',
          },
        ],
      },

      greet: {
        id: 'greet',
        npcText:
          "Hello? Out here? That's suspicious behaviour. Nobody says hello in deep space unless they want something or they're lonely. Which one are you?",
        playerOptions: [
          {
            id: 'greet-lonely',
            label: 'LONELY',
            text: "Lonely. It's quiet out here.",
            nextTurnId: 'greet-lonely',
          },
          {
            id: 'greet-nothing',
            label: 'NOTHING',
            text: 'Nothing. Just being polite.',
            nextTurnId: 'close',
          },
        ],
      },

      'greet-lonely': {
        id: 'greet-lonely',
        npcText:
          "Lonely? Try being stuck in a tug with a food printer that only makes 'nutrient loaf'. I haven't chewed anything in three weeks.",
        playerOptions: [
          {
            id: 'greet-lonely-ack',
            label: 'GOOD LUCK',
            text: 'Good luck with the loaf.',
            nextTurnId: null,
          },
        ],
      },

      earth: {
        id: 'earth',
        npcText:
          "Earth? Nope. Nothing. Nada. Zip. My long-band's quieter than my ex after I forgot her birthday. And that was *very* quiet.",
        playerOptions: [
          {
            id: 'earth-rumors',
            label: 'ANY RUMORS',
            text: 'Heard any rumors at least?',
            nextTurnId: 'earth-rumors',
          },
          {
            id: 'earth-close',
            label: 'THANKS',
            text: 'Alright. Thanks anyway.',
            nextTurnId: 'close',
          },
        ],
      },

      'earth-rumors': {
        id: 'earth-rumors',
        npcText:
          'Rumors? Sure. One crew swears Earth Gov shut everything down on purpose. Another says the SolNet trunk fried itself. My favourite theory? Space whales. Giant ones. Very angry.',
        playerOptions: [
          {
            id: 'earth-rumors-ack',
            label: 'SPACE WHALES?',
            text: 'Space whales?',
            nextTurnId: 'earth-whales',
          },
        ],
      },

      'earth-whales': {
        id: 'earth-whales',
        npcText:
          "Yeah. Massive. Elegant. Majestic. And apparently very into chewing on communication relays. Look, I'm not saying it's true, I'm just saying it's the only theory that makes me smile.",
        playerOptions: [
          {
            id: 'earth-whales-ack',
            label: 'RIGHT…',
            text: "Right… I'll log that under 'unlikely'.",
            nextTurnId: 'close',
          },
        ],
      },

      why: {
        id: 'why',
        npcText:
          'Why do I smell like coolant? Because the coolant smells like *victory*. And also because the leak is right next to the air recycler.',
        playerOptions: [
          {
            id: 'why-ack',
            label: 'GOOD LUCK WITH THAT',
            text: 'Good luck with that leak.',
            nextTurnId: 'close',
          },
        ],
      },

      close: {
        id: 'close',
        npcText:
          "Alright, I've got a pipe to hit with a wrench until it stops making that noise. Grumble out.",
        playerOptions: [
          {
            id: 'close-ack',
            label: 'CLEAR',
            text: 'Clear.',
            nextTurnId: null,
          },
        ],
      },
    },
  },
];

// ── Session-local tree assignment ─────────────────────────────────────────────
// When a ShipRecord is provided, the best-matching tree is selected by scoring
// conditions against the ship's profile. Without a record, falls back to
// sequential round-robin. Assignment is cached per shipId.

const _shipAssignments = new Map<string, string>();
let _nextTreeIndex = 0;

function scoreTree(tree: DialogueTree, record: ShipRecord): number {
  const c = tree.conditions;
  if (!c) return 1; // unconditioned trees rank above zero but below any real match

  // Hard-exclude if the player is outside all allowed regions (within 50 000 units
  // of the region anchor, approximated by the orbital-zone detector).
  if (c.playerRegions && !c.playerRegions.includes(getPlayerRegion())) return -1;

  let score = 0;
  if (c.shipClasses?.includes(record.shipClass)) score += 4;
  if (c.agendas?.includes(record.agenda)) score += 3;
  if (c.factions?.includes(record.faction)) score += 2;
  if (record.destination !== 'none' && c.destinations?.includes(record.destination as ShipRegion))
    score += 1;
  return score;
}

export function getOrAssignDialogueTree(shipId: string, record?: ShipRecord): DialogueTree {
  if (_shipAssignments.has(shipId)) {
    const treeId = _shipAssignments.get(shipId)!;
    return DIALOGUE_TREES.find((t) => t.id === treeId) ?? DIALOGUE_TREES[0];
  }

  let tree: DialogueTree;

  if (record) {
    // Score every tree; negative scores are hard-excluded (e.g. playerRegions mismatch)
    const scored = DIALOGUE_TREES.map((t) => ({ t, s: scoreTree(t, record) })).filter(
      (x) => x.s >= 0
    );
    const eligible = scored.length > 0 ? scored : DIALOGUE_TREES.map((t) => ({ t, s: 1 }));
    const best = Math.max(...eligible.map((x) => x.s));
    const candidates = eligible.filter((x) => x.s === best).map((x) => x.t);
    tree = candidates[Math.floor(Math.random() * candidates.length)];
  } else {
    tree = DIALOGUE_TREES[_nextTreeIndex % DIALOGUE_TREES.length];
    _nextTreeIndex++;
  }

  _shipAssignments.set(shipId, tree.id);
  return tree;
}

// ── Session-local captain name assignment ──────────────────────────────────────
// Each ship gets one randomly assigned captain name for the session.
// Names are shuffled at module load and assigned sequentially to avoid repeats.

const _TITLES = ['Cpt.', 'Lt.', 'Cmdr.', 'Dr.'];
const _shuffledNames = [...CAPTAIN_NAMES].sort(() => Math.random() - 0.5);
const _captainAssignments = new Map<string, string>();
let _nextNameIndex = 0;

export function getOrAssignCaptainName(shipId: string): string {
  if (_captainAssignments.has(shipId)) {
    return _captainAssignments.get(shipId)!;
  }
  const name = _shuffledNames[_nextNameIndex % _shuffledNames.length];
  const title = _TITLES[Math.floor(Math.random() * _TITLES.length)];
  _nextNameIndex++;
  const fullName = `${title} ${name}`;
  _captainAssignments.set(shipId, fullName);
  return fullName;
}

// ── Dialogue text resolution ────────────────────────────────────────────────────
// Replaces {{tokens}} in dialogue strings with values from the ship's profile.
// Call this before storing or speaking any NPC or player message text.

export function resolveDialogueText(text: string, record: ShipRecord): string {
  const dest = record.destination !== 'none' ? record.destination : 'open space';
  return text
    .replace(/\{\{destination\}\}/g, dest)
    .replace(/\{\{currentRegion\}\}/g, record.currentRegion)
    .replace(/\{\{faction\}\}/g, record.faction);
}
