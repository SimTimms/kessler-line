# Kessler — Game Narrative

---

## The Story (Top-Level Arc)

The player is a courier pilot on a routine run in the outer solar system.

Mid-run, something happens on Earth. Communications fragment, then go silent. The solar system colonies — already fragile, interdependent, stretched thin — begin to fracture. Authorities lock down corridors. Factions form. Old alliances break. What was a routine job becomes a survival situation.

The pilot's driving goal: **find out what happened to Earth, and get home.**

The journey back is not a straight line. The inner system is increasingly lawless and hostile. Every stop reveals another piece of what happened — through radio chatter, intercepted transmissions, messages that stopped arriving, people who know more than they say. The pilot is piecing together the truth in fragments, the way everyone else is.

Eventually the pilot makes it back to Earth.

**The ending:** There is no way in. The cascade — a runaway chain-reaction of orbital debris — has sealed Earth behind an impenetrable shell. No ship can reach the surface. No ship can escape it. The thing the pilot crossed the solar system to return to is still there, visible, but permanently out of reach.

---

## Tone

Grounded, hard-ish sci-fi. Radio chatter is clipped and professional — military/freight vernacular. Not melodramatic. The tragedy is implied, never explained at length. The cascade is not a villain; there is no one to blame. It's an infrastructure failure at civilizational scale.

---

## World & Lore

**Year:** Unspecified near-future. Humanity has colonized the outer solar system but thinly — depots, relay stations, freight lanes. Earth is still the centre of gravity politically and economically. The colonies need Earth; Earth barely notices the colonies.

**The political situation:** Two major factions — not yet named — are in open competition, both on Earth and across the solar system. The conflict has been escalating for years: military build-up in orbit, contested freight lanes, proxy disputes at outer system depots. Low Earth orbit has become dangerously congested with military hardware, surveillance platforms, and counter-measures. Everyone in the system knows it is unstable. No one stops.

**The Cascade:** An accident. During a skirmish or targeted strike between faction assets, several incidental satellites were shot down in low Earth orbit. The debris from those collisions struck other objects. Those struck more. The chain reaction was not intended — it was the inevitable consequence of treating orbit as a battlefield. Within hours, LEO became an impenetrable shell of high-velocity debris. No ship can reach the surface. No ship can escape. Earth is sealed.

Nobody started the cascade on purpose. That is almost worse.

**The debris ring** is visualized in-game via `EarthAsteroidRing.tsx`: 1,400-instance asteroid field orbiting Earth with continuous impact flashes and explosions.

---

## Narrative Phases

### Phase 0 — The Run (pre-cascade)
Normal life. The player is on a courier job, outer system. Radio chatter is routine depot traffic. A message arrives from home — the last one.

### Phase 1 — The Event (cascade onset)
Something goes wrong on Earth. Comms degrade. Traffic authorities issue holds. Other pilots start asking questions on open frequencies. The player doesn't know what happened yet — only that Earth has gone quiet and corridors are closing.

### Phase 2 — The Collapse (post-cascade, outer system)
It becomes clear Earth is unreachable. The solar system starts coming apart: authorities overstep, factions emerge, supply lines break. The player must navigate an increasingly hostile environment while trying to get back toward the inner system. Information is scarce and contradictory.

### Phase 3 — The Journey In
The player fights or negotiates their way through the collapsing outer and mid system. Each region has its own political situation — some are militarized, some have gone dark, some are desperate. The courier job and the sealed parcel (MX-7734) may be entangled with whatever caused or exploited the cascade.

### Phase 4 — Earth
The player arrives at Earth. The debris ring is visible. There is no approach window. There never will be. The family message sits in the inbox, unanswered.

---

## Characters

| Name / Handle | Role | Notes |
|---|---|---|
| **Player** | Courier pilot | No name given. Trying to get home. |
| **Mara Voss** | Routing Coordinator, Outer Lanes Ltd. | Sends the first job dispatch; what does she know about MX-7734? |
| **M** | Family member on Earth | Last message before the cascade; mentions Oksana. Never replies again. |
| **Oksana** | Child on Earth | Mentioned by M. Asking about the player. |
| **FREIGHTER-12** | Unknown pilot, outer system | Voice throughout the cascade; relatable everyman; could become recurring |
| **NEPTUNE TRAFFIC** | Neptune ATC | Official voice; loses authority as the system collapses |
| **BEACON** | Automated relay/depot system | Increasingly garbled and offline as infrastructure fails |
| **DISPATCH** | Player's employer, identity unknown | "This is not a request." — knows more than they say; potentially antagonistic |

---

## Factions (to be named)

Two major factions are in conflict. Both have a presence across the solar system — military assets, commercial fronts, political influence at depots and stations. The player will encounter both during the journey inward. Neither is straightforwardly good.

- **Faction A** — [to be named] — Earth-centric, established power, controls most of the inner system infrastructure
- **Faction B** — [to be named] — outer-system aligned, newer, more aggressive, challenging A's dominance

The cascade has decapitated both factions' command structures on Earth. What remains in the solar system are armed wings with no clear orders, acting on ideology and self-interest. This is why the solar system is hostile — not a unified enemy, but a fractured one.

---

## Open Threads & Questions

- **The sealed parcel (MX-7734):** "Handle with care. Signature not required." Destination: Sirix Station. Military component? Intelligence payload? Is Outer Lanes Ltd. a faction front, and did the player unknowingly carry something that mattered?
- **Sirix Station:** Automated check-in missed *before* the cascade. Was the station a faction asset? Was it destroyed early in the conflict?
- **DISPATCH:** Knew the corridor was closing before Neptune Traffic announced it. Faction-aligned? Which one?
- **Which faction fired first?** The player may piece this together through logs, intercepts, and survivor accounts across the journey. The answer probably doesn't change anything — the cascade happened either way.
- **The factions after the cascade:** Without Earth, both lose their centre of gravity. Do they keep fighting? Splinter? The outer system in Phase 2–3 should reflect this disintegration.

---

## Narrative Event Timeline (as implemented)

### 1. Start Screen
- **File:** `src/components/App/StartOverlay.tsx`
- Title card: **"Kessler"** with animated asteroid field in background
- Auto-dismisses at 9.5s or on "Start Game" button

### 2. Game Load — Phase 0 begins
- **File:** `src/components/CinematicController.tsx`
- Cascade phase: `'pre'`
- Cinematic autopilot fires (10s retro-burn)
- Radio chatter: `RADIO_CHATTER_LINES` (normal depot traffic)

### 3. +3s — Dispatch Job Message
- **Inbox:** `MSG_DISPATCH_INTRO`
- From: *Outer Lanes Ltd. — Routing (Mara Voss)*
- Subject: *Job #OL-4471* — Delivery to Sirix Station, Neptune vicinity. Parcel MX-7734.

### 4. +14s — Last Message from Home
- **Inbox:** `MSG_FAMILY_EARTH`
- From: *Home — Earth, Sector 9*
- Subject: *Still here*
- Power stable, feeds patchy, Oksana's growing. "Come back when you can. — M"
- This is the last message ever received from Earth.

### 5. Neptune Proximity — Phase 1 begins (cascade onset)
- **Trigger:** Ship within 20,000 units of Neptune
- Cascade phase: `'during'`
- HUD: `NEPTUNE NO-FLY ZONE` + `AUTOPILOT: RETRO-BURN IMMEDIATELY`
- Radio chatter switches to `RADIO_CHATTER_CASCADE_LINES`
- **Inbox:** `MSG_NEPTUNE_CONTROL` — corridor closed, reverse thrust
- **+8s:** `MSG_EMPLOYER_RECALL` — abort approach, return to Asteroid Dock, "This is not a request."

---

## Radio Chatter Lines (by phase)

### Phase `pre` — Normal depot traffic
```
BEACON: Cargo manifests synced. Neptune depot ETA stable.
FREIGHTER-12: Offloading isotopes at the fuel depot, no delays expected.
NEPTUNE TRAFFIC: Docking queues are heavy. Hold short of the outer ring.
BEACON: Depot confirms refuel window in 20 minutes. Stand by.
FREIGHTER-12: Requesting clearance for cargo drop. Awaiting response.
BEACON: Sirix Station — automated check-in missed. Status unknown.
UNKNOWN: Picking up fragmented relay from inner-system direction. Relay quality poor.
```

### Phase `during` — The cascade event
```
FREIGHTER-12: What is going on? My feeds just cut — Earth has gone dark.
NEPTUNE TRAFFIC: All vessels stand by — we are receiving conflicting data from Earth relays.
UNKNOWN: Debris field tracking from inner system — is anyone monitoring this?
FREIGHTER-12: I cannot get a signal through. Earth comms are dead.
UNKNOWN VESSEL: Someone tell me what is happening. My family is down there.
BEACON: ...relay offline... signal lost... standing by...
NEPTUNE TRAFFIC: Unconfirmed — collision cascade in low Earth orbit. Inner system corridor suspended.
UNKNOWN: I am showing debris on every track. These are not natural orbits.
FREIGHTER-12: Anyone reading? I am turning back for the depot.
DISPATCH: All inbound traffic — hold position. Do not approach inner system.
```
> Note: "These are not natural orbits" is the one line that hints at the faction conflict without naming it — the debris patterns reveal this was a weapons exchange, not a natural event. Keep this ambiguity.

### Phase `post` — Collapse sets in (defined, not yet triggered in-game)
```
FREIGHTER-12: Still no signal from Earth. Day six.
BEACON: Inner system corridor — closed indefinitely.
NEPTUNE TRAFFIC: Maintain current orbit. No approach windows scheduled.
UNKNOWN: They are saying the debris layer is stable now. That is supposed to be good news.
FREIGHTER-12: Depot is at capacity. Nowhere left to go.
UNKNOWN VESSEL: I keep trying the old frequencies. Nothing.
BEACON: Cascade density confirmed. No re-entry possible.
NEPTUNE TRAFFIC: All vessels — file updated manifests. You are here for the long haul.
```

---

## Inbox Messages (all implemented)

| ID | From | Subject | Trigger |
|---|---|---|---|
| `dispatch-intro-1` | Outer Lanes Ltd. — Routing | Job #OL-4471 | +3s on load |
| `family-earth-1` | Home — Earth, Sector 9 | Still here | +14s on load |
| `neptune-control-1` | Neptune Control — Traffic Authority | Approach Corridor Closed | Neptune proximity |
| `employer-recall-1` | — DISPATCH | ⚠ PRIORITY-1 — ABORT APPROACH | +8s after Neptune proximity |

---

## Key Files

| Purpose | File |
|---|---|
| Start screen | `src/components/App/StartOverlay.tsx` |
| Narrative event sequencing | `src/components/CinematicController.tsx` |
| Cascade phase + cinematic state | `src/context/CinematicState.ts` |
| Cinematic overlay UI | `src/components/CinematicOverlay.tsx` |
| Radio chatter lines (all phases) | `src/narrative/radioChatter.ts` |
| Inbox message templates | `src/narrative/inboxMessages.ts` |
| Message store (inbox) | `src/context/MessageStore.ts` |
| Earth debris ring | `src/components/EarthAsteroidRing.tsx` |
