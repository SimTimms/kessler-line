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

## Factions

Two major factions are in conflict. Both have a presence across the solar system — military assets, commercial fronts, political influence at depots and stations. The player will encounter both during the journey inward. Neither is straightforwardly good.

### Terran Concordat (TC)
Earth-centric corporate-state. Controlled most inner system infrastructure — freight lanes, relay networks, port authority. Bureaucratic, authoritarian, well-funded. Their legitimacy derived entirely from Earth as political and economic centre. Without Earth, Concordat assets in the solar system have no clear command chain — local commanders are acting on ideology and standing orders that no longer make sense. TC callsigns: formal, rank-based, Latinate vessel names.

### Periphery League (PL)
Outer-system aligned. Grew from trade unions and independent operators who resented Concordat control of freight pricing, docking fees, and corridor access. More working-class in character — depots, mining cooperatives, outer system colonies. More aggressive militarily (had to be — they were the challenger). Post-cascade, the League has more surviving infrastructure because it was never Earth-dependent. TC callsigns: informal, alphanumeric, names often drawn from mythology or place names.

### Independents / Free Operators
Unaligned. Couriers, freelancers, small traders, scientists. The player is one of these. Respected by neither faction; exploited by both; occasionally protected by the Periphery when it serves their interests.

### Minor / Emerging Factions (post-cascade)
- **The Drift** — unregistered habitat collective, outer belt; no allegiance; growing
- **Church of the Return** — religious movement; believes the cascade can be reversed; politically volatile
- **Martian Citizens' Front** — Martian-born independents trying to keep both major factions off Mars

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

## Communications Lore — SOLNET

> Full documentation: `lore/communications-technology.md`

The interplanetary relay network (**SOLNET**) has three layers — the Trunk (Concordat-owned laser links), BEACON (automated store-and-forward backbone), and short-range broadcast. Messages are tagged P0–P3 by priority, which determines routing cost and speed. The family message is P2 relay. The late mail is P3 economy — still forwarding from outer nodes via broadcast fallback, long after its destinations ceased to exist.

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
| Background narratives | `NARRATIVE.md` — see *Background Narratives* section |

---

## Background Narratives — The 30 Stories

These are parallel storylines unfolding across the solar system, independent of the player's main arc. They surface as interceptable radio chatter, relay fragments, and background comms. The player never has to engage with any of them; they exist to make the world feel populated and in motion. Each has a *Status* (how far along the story has progressed when the player first encounters it) and suggested *Radio IDs* (callsigns that appear in chatter).

---

### Outer System

---

**1. REFUGEE CONVOY R-7**
*Location: Asteroid Belt → Mars*
*Factions: Unaligned vs. Terran Concordat*

A freighter carrying 340 refugees from Ceres is trying to reach Mars. Their transit papers are Earth-issued; Concordat checkpoints won't accept them now that the issuing authority no longer exists. The ship is 18 days from Mars and running low on water recycler parts. The captain, a woman named Petra Lund, is broadcasting politely and persistently — the same request, every 6 hours, to every Concordat checkpoint in range.
- *Radio IDs:* `CONVOY-R7`, `TC CHECKPOINT CERES-2`
- *Status:* Ongoing at cascade onset. Outcome unresolved.
- *Story beat:* Checkpoint eventually denies them. R-7 diverts to the Drift. Lund starts doing mercy runs.

---

**2. STATION MINERVA — THE BLOCKADE**
*Location: Jupiter L4*
*Factions: Periphery League vs. Terran Concordat*

Periphery League resupply station Minerva has been blockaded by a single Concordat patrol vessel for 14 days. The patrol captain, Lt. Orin Haas, is acting on pre-cascade standing orders he can no longer get confirmation on. The station commander, Dag Reyes, is trying to negotiate. Neither man has clear authority. The blockade is a standoff by inertia. Station is running short on CO2 scrubber chemicals.
- *Radio IDs:* `STATION MINERVA`, `TC PATROL CETUS-3`
- *Status:* Day 14 when cascade hits. Blockade holds for 9 more days, then breaks when Haas's crew mutinies.
- *Story beat:* Haas's crew demands he stand down or they'll take the ship home. He complies. Calls it "redeployment."

---

**3. RESEARCH VESSEL YANTARA**
*Location: Io orbit, Jupiter system*
*Factions: Concordat civilian contractor vs. crew*

A Concordat-contracted science ship studying Io's volcanic activity. Post-cascade, the Concordat liaison aboard attempted to redirect the vessel toward military surveillance work. The science crew has locked him in a forward cabin and is requesting Periphery League asylum while continuing their research. Their transmissions have an almost defiant normality — volcanic event logs, atmospheric data, filing schedules — next to urgent asylum requests.
- *Radio IDs:* `VESSEL YANTARA`, `LIAISON CHANNEL 4-ALPHA`
- *Status:* Asylum request unacknowledged. Periphery is deliberating.
- *Story beat:* Periphery eventually grants asylum and sends an escort. The liaison is released at Minerva Station with a formal diplomatic letter of complaint he has no one left to send it to.

---

**4. TRITON CORRECTIONAL FACILITY**
*Location: Triton surface*
*Factions: Concordat (administration) vs. prisoners*

A Concordat detention facility on Triton has lost its command chain. The warden, Commandant Vera Shulk, is maintaining order through sheer procedural stubbornness. The most influential prisoner, a Periphery operator named Cole, is proposing a formal power-sharing arrangement: prisoners maintain order, Shulk maintains life support, nobody does anything stupid. Shulk hasn't answered. The guards have noticed the ratio is 30:1.
- *Radio IDs:* `TRITON-CF ADMIN`, fragments on guard frequencies
- *Status:* Negotiation in progress.
- *Story beat:* Agreement is reached. It holds, mostly. Three months later Triton-CF is an informal Periphery waypoint.

---

**5. FREIGHTER ACHERON-2 — CARGO INTERCEPT**
*Location: Ganymede → Mars corridor*
*Factions: Independent vs. Periphery raider*

Acheron-2, an independent freighter carrying Ganymede's last hydroponic harvest, has been intercepted by a Periphery raider demanding half the cargo. Pilot Tomás Greer is broadcasting in the clear. The cargo is what a Mars colony needs to survive winter. The raider captain knows this; she's asking anyway.
- *Radio IDs:* `FREIGHTER ACHERON-2`, `PL RAIDER SABLE-WING`
- *Status:* Standoff ongoing.
- *Story beat:* A Periphery League patrol ship overhears the broadcast, orders the raider to stand down. Internal Periphery argument about what the League is supposed to stand for. Greer gets through.

---

**6. ERIN'S DEPOT — TITAN FUEL STATION**
*Location: Titan orbit*
*Factions: Independent operator playing TC vs. PL*

Erin Brask runs the only private fuel depot in the Saturn system. Both factions want it as a resupply base. She's negotiating with both simultaneously, extracting maintenance parts, food, and personnel out of each while committing to neither. Her daughter Lise is trying to get her to pick a side before one faction decides to just take it. Erin's radio voice is famously warm and utterly unreliable.
- *Radio IDs:* `ERIN'S DEPOT`, `BRASK-ACTUAL`
- *Status:* Ongoing. Erin has been doing this for three months.
- *Story beat:* Concordat eventually grows impatient. Erin cuts a deal with the Periphery and lets Concordat ships dock only for emergencies at double price.

---

**7. MARS — DARIO LENZ AND THE DECLARATION**
*Location: Mars Colony Ares-3*
*Factions: Martian independents vs. both major factions*

Ares-3, Mars' largest colony, has issued a declaration of independence from both factions. Dario Lenz, a civil engineer with no political background, has become the face of the movement — not because he wanted to but because he gave one clear speech in a council meeting that someone broadcast. Now he's the figurehead for every Martian who wants a third option. He sounds tired on the radio.
- *Radio IDs:* `ARES-3 CIVIC CHANNEL`, `LENZ-DIRECT`
- *Status:* Declaration issued. Neither faction has responded formally.
- *Story beat:* Both factions are waiting to see if the colony can hold together before bothering to suppress it. It's doing better than expected. This is the embryo of something.

---

**8. PATROL SHIP IKORA — THE DISAGREEMENT**
*Location: Outer system, Saturn corridor*
*Factions: Terran Concordat (internal conflict)*

Concordat patrol vessel Ikora has lost command chain access. Captain Leena Vogt wants to hold position and wait for orders. Executive officer Commander Pravin Mehta believes standing orders clearly require them to seize Periphery assets in their patrol zone. The crew is watching two competent people in a quiet, professional disagreement that may end in a mutiny.
- *Radio IDs:* `TC PATROL IKORA`
- *Status:* Day 7 of disagreement.
- *Story beat:* Mehta wins the argument when a Periphery supply ship enters their zone. Ikora seizes it. Vogt logs her formal objection and complies. The seized ship has 80 displaced civilians aboard.

---

**9. COLONY SHIP STELLAROSA — FLOATING CAMP**
*Location: Ganymede orbit*
*Factions: Unaligned*

A colony transport was mid-transit from Earth to Ganymede when the cascade hit. 1,200 civilians aboard. They've arrived at Ganymede — but the colony is overwhelmed and won't authorize docking for more than 40 people per week. Stellarosa has been in orbit for 23 days. They are rationing. There are families aboard who now know they will never hear from Earth again. The ship's social director, Henrik Mak, continues to run activities and a daily radio newsletter. It is one of the braver things happening in the solar system.
- *Radio IDs:* `COLONY SHIP STELLAROSA`, `GANYMEDE DOCK AUTHORITY`
- *Status:* Ongoing. Orbit authorized for 6 more weeks before fuel expires.
- *Story beat:* Periphery League eventually provides a temporary habitat module. Mak keeps broadcasting.

---

**10. MINING CLAIM 7734 — THE CAVITY**
*Location: C-type asteroid, inner belt*
*Factions: Independent*

Two independent miners, Chen Dae-jung and Sable Voss (no confirmed relation to Mara Voss), have been working a C-type asteroid for 11 months. Three weeks before the cascade they stopped broadcasting claim reports. They struck something in the rock — a metallic cavity with internal geometry that doesn't look natural. They haven't reported it. They're still there. The silence has a quality of deliberation.
- *Radio IDs:* `CLAIM 7734`, silence
- *Status:* Total silence for 3 weeks.
- *Story beat:* The cavity is an old survey cache — pre-colonial, origin unclear. The data inside rewrites the timeline of who was in the belt and when. Chen and Voss are sitting on it, trying to decide what it means and who (if anyone) to tell.

---

**11. CHURCH OF THE RETURN — THE FLYBY**
*Location: Inner system approach*
*Factions: Church vs. Terran Concordat*

A religious movement on Ceres believes the Kessler cascade is not permanent — that collective intent, proximity, and what they call "witness" can begin a process of healing. They've chartered a ship for a symbolic flyby of Earth. Concordat has denied the flight plan three times. They are departing anyway. Their leader broadcasts in a calm, almost gentle register that makes the Concordat dispatches sound hysterical by comparison.
- *Radio IDs:* `VESSEL WITNESS`, `CERES RETURN CHAPTER`
- *Status:* Departing Ceres.
- *Story beat:* Concordat intercepts them at the inner system boundary. Standoff. They are eventually permitted to view Earth from 0.2 AU and return. The leader broadcasts the view — the debris ring, the blue beneath it, the silence. Many ships in the solar system receive this. Nobody says much for a while.

---

### Mid System

---

**12. GANYMEDE MUNICIPAL HOSPITAL — THE CALL**
*Location: Ganymede*
*Factions: Unaligned*

The hospital is overwhelmed with cascading mental health crises — people who have lost Earth contact, people who know their families are unreachable. They've put out a formal medical resupply request: specific medications, specific volumes, registered under emergency protocols. The request is dignified, clinical, and completely unanswered. They repeat it every 48 hours.
- *Radio IDs:* `GANYMEDE MED-ADMIN`
- *Status:* Request 7 of an ongoing series.
- *Story beat:* A Periphery supply ship diverts to deliver partial supplies. The hospital director's thank-you transmission is 8 seconds long and says everything.

---

**13. RELAY BEACON RB-9 — THE SIGNAL**
*Location: Saturn–Jupiter corridor*
*Factions: Unknown, possibly faction intelligence*

A Concordat relay beacon between Saturn and Jupiter has gone silent. Two independent salvagers found it intact and functional — but broadcasting on a looping pre-cascade military frequency. Not distress. Not data. A specific frequency, running clean. Someone wants something using this relay as a node. The salvagers are deciding whether to broadcast what they found, or sell the information to someone.
- *Radio IDs:* `SALVAGER PAIR-9`, `RB-9 GHOST SIGNAL`
- *Status:* Active mystery. Neither faction is publicly acknowledging the frequency.
- *Story beat:* The frequency is a Concordat dead-drop system — automatic, nobody actively running it. It's been running since before the cascade. Its data is irrelevant now. But someone sent a real message through it 4 days ago.

---

**14. URANUS STATION — THE THREE**
*Location: Uranus atmospheric research platform*
*Factions: One TC, one PL, one unaligned*

The most remote inhabited outpost. Three researchers. Ship fuel depleted; resupply not coming. They cannot leave. One is Concordat, one Periphery — they were placed here on the same project before the factions openly broke. Now they're stuck. Their radio transmissions have become oddly domestic. They argue about rationing protocol and synthesizer recipes and who has jurisdiction over the airlock schedule. It sounds almost warm.
- *Radio IDs:* `URANUS STATION ECHO`
- *Status:* Day 40 of involuntary extended stay.
- *Story beat:* By day 90 they've stopped using faction identifiers. They've started calling themselves "the three." Resupply eventually comes — Periphery — and has to explain to the two faction members that the world changed while they were making soup.

---

**15. FREIGHTER MAREK JANUS — THE LOCKED CREW**
*Location: Jupiter–Saturn corridor (drifting)*
*Factions: Concordat (contracted) — possible intelligence dimension*

Marek Janus, a Concordat supply vessel, went dark 18 days ago. A Periphery scout found it drifting. The crew of 9 are alive but sealed in the forward compartment — locked from the outside. The cargo hold is empty. The ship's computer logs show the cargo offloaded at a position that corresponds to no registered station or depot. The scout captain is asking Periphery command what to do. She has also privately told her crew: the captain of Marek Janus has a Concordat intelligence officer's clearance code embedded in his employment file.
- *Radio IDs:* `PL SCOUT FENRIS`, fragments from recovered Marek Janus logs`
- *Status:* Drifting. Crew alive.
- *Story beat:* The cargo was Concordat classified hardware. Someone in TC intelligence removed it before the cascade, anticipating what was coming. The crew were locked in to stop them radioing where the handoff happened. The trail leads somewhere uncomfortable.

---

**16. NEPTUNE TRAFFIC AUTHORITY — YUN TAKAHARA**
*Location: Neptune Traffic Hub (player encounters this voice)*
*Factions: Internal — independence vs. Periphery pressure*

Chief controller Yun Takahara is refusing to declare Periphery allegiance despite pressure from a faction inside the station. Her argument: traffic control that serves only one faction is useless to everyone, including that faction. She is correct and outvoted. She is broadcasting, quietly, that she needs a few more people to agree with her before the next vote.
- *Radio IDs:* `NEPTUNE TRAFFIC` (the player already hears this voice)
- *Status:* Vote scheduled in 6 days.
- *Story beat:* Takahara loses the vote. The station declares Periphery affiliation. Three weeks later, a Concordat freighter in distress is denied approach clearance and its crew dies. Takahara resigns. The station reverses its declaration. It's complicated.

---

**17. SIRIX STATION — THE SILENCE**
*Location: Neptune vicinity*
*Factions: Unknown (possibly intelligence/faction black site)*

Total radio silence. Automated telemetry shows Sirix Station still in orbit and structurally intact. Four ships have approached and turned back without explanation — their captains, interviewed later, give different and contradictory reasons. What's unusual: two of those captains have Concordat intelligence flags in their manifests. The silence at Sirix is not equipment failure. It is a choice.
- *Radio IDs:* nothing — absence is the signal
- *Status:* Silent before cascade. Still silent.
- *Story beat:* Sirix received parcel MX-7734 and went dark 6 hours later. The connection is real. What the parcel contained determined what Sirix became.

---

**18. SATURN RING SHEPHERDS — THE COUNCIL**
*Location: Saturn inner ring system*
*Factions: Periphery-aligned independents*

A collective of independent ring miners has formed an impromptu mutual aid council post-cascade. They argue extensively and vote on everything. Their radio traffic has the quality of a community meeting — passionate, disorganised, ultimately functional. They're trying to build a supply chain with the Drift and the Triton-CF arrangement. They call themselves "the Shepherds" unironically.
- *Radio IDs:* `SHEPHERD COUNCIL`, individual miner callsigns
- *Status:* Council in session (ongoing).
- *Story beat:* The Shepherds become the backbone of the outer system independent network. By end-game they're the most functional governance structure outside of Mars. They still argue about everything.

---

**19. MILITARY TRANSPORT HELIX-7 — THE REQUEST**
*Location: Concordat troop transport, outer system*
*Factions: Terran Concordat*

800 soldiers aboard a Concordat troop transport know Earth is gone. Some have family there. The captain has formally requested a course change to pass within observation distance of Earth — not approach, just sight it. Command has denied this as "operationally non-essential." The captain has asked again. The denial was firmer. The crew knows about both requests.
- *Radio IDs:* `TC TRANSPORT HELIX-7`, `TC COMMAND RELAY`
- *Status:* Third request filed.
- *Story beat:* Command approves a modified route that doesn't take them past Earth but does take them past the inner system boundary where the debris ring is visible at distance. The captain doesn't explain why the route changed. The soldiers watch in silence. Nobody talks about it.

---

**20. THE ARCHIVIST**
*Location: Unknown — outer system, moving*
*Factions: Unaligned*

An unregistered ship with no callsign, broadcasting on historical frequencies. Earth news from before the cascade. Old music. Sports results. Weather reports. Architecture photography described in words. The signal is clean and continuous. Nobody knows who it is or why. Some people think it's automated. The Archivist doesn't respond to contact attempts. Listening to their broadcasts is like a wound.
- *Radio IDs:* no callsign — appears as `UNREGISTERED SIGNAL`
- *Status:* Broadcasting for 3 weeks.
- *Story beat:* The Archivist is a single person: an Earth cultural historian who was off-planet for fieldwork when the cascade hit. She has every archive she brought with her and no plan except to keep broadcasting until someone stops her or she runs out of power.

---

**21. EUROPA OCEAN STATION — DR. OSEI'S BROADCAST**
*Location: Europa, Jupiter system*
*Factions: Science vs. Concordat directive*

Dr. Amara Osei's team is 14 years into a 15-year subsurface biology project at Europa. Concordat has ordered the facility redirected to military surveillance. Osei is broadcasting her findings to anyone who will receive them — data packets, research logs, paper-quality transmissions sent out on every available frequency. If Concordat locks this down, 14 years of data dies with the station's independence. Her transmissions are calm and scientific and sound like someone saying goodbye.
- *Radio IDs:* `EUROPA STATION OSEI`, `TC OVERSIGHT RELAY`
- *Status:* Concordat takeover notice received 4 days ago.
- *Story beat:* An academic vessel — unaffiliated — arrives and starts downloading everything. Concordat's override isn't complete yet. There's a three-day race. Osei finishes transmitting on the last day. Concordat arrives. The data is already distributed across 11 receiver ships.

---

**22. FREIGHTER HESTIA — NICO SALDANA'S RUNS**
*Location: Moving, outer-mid system*
*Factions: Independent (covert Periphery arrangement)*

Nico Saldana is an independent captain on his fourth consecutive mercy run — carrying displaced people between overwhelmed stations for nothing. His ship is somehow always fuelled and his crew always fed. The Periphery is paying him in-kind for small undisclosed jobs run alongside the mercy work. His passengers don't know this. Neither does he think of himself as Periphery-aligned. The Periphery thinks of him differently.
- *Radio IDs:* `FREIGHTER HESTIA`, `SALDANA-DIRECT`
- *Status:* Ongoing runs.
- *Story beat:* One of his undisclosed jobs turns out to have consequences he didn't anticipate. Saldana has to decide whether the mercy work justifies continuing to work with people he doesn't fully understand.

---

### Inner System

---

**23. THE MINER'S CAUCUS — CERES**
*Location: Ceres docking hub*
*Factions: Independent workers' faction*

The largest docking hub on Ceres has been taken over by a workers' caucus that turned political post-cascade. They control fuel allocation. Concordat ships: denied. Periphery: reduced rates. Independents: fair price and a meal. The caucus leader, a broad-shouldered ore hauler named Bull Reyes (no known relation to Dag Reyes of Minerva Station), broadcasts a daily operational update that is also, subtly, a political manifesto. He is very good at this.
- *Radio IDs:* `CERES CAUCUS CHANNEL`, `BULL-ACTUAL`
- *Status:* Operating.
- *Story beat:* Concordat eventually tries a forced docking. The caucus has been quietly arming for three weeks. The attempt fails. The Caucus sends Concordat the fuel invoice anyway.

---

**24. PATROL CORVETTE SABLE-4 — THE CAPSULE**
*Location: Asteroid Belt*
*Factions: Periphery League*

PL fast-attack ship Sable-4 intercepted a Concordat supply run and found, amid routine cargo, a single encrypted data capsule about the size of a thermos. Small enough to have been the contents of a delivery parcel. Sable-4 captain Reyna Okoro is asking Periphery Command what to do with it. Periphery Command isn't responding. The capsule is not transmitting, not dangerous (that they can tell), and Okoro is increasingly certain it's the most important thing in the outer system.
- *Radio IDs:* `PL SABLE-4`, encrypted relay fragments
- *Status:* Capsule in Sable-4 possession.
- *Story beat:* The capsule contains the most complete account of who fired first — which faction, which commander, which moment triggered the cascade. It was being smuggled out of the inner system before the chaos. By whom and to whom is unclear. This is the evidence the player may eventually find.

---

**25. THE DRIFT**
*Location: Outer belt, moving slowly*
*Factions: No allegiance*

200 people in welded-together habitat modules drifting through the outer belt. They've always been here, fringe and ignored. Post-cascade they're seeing an influx — people who want to belong to nothing. The Drift's informal council (called "the mess" because they meet in the mess hall) debates everything including whether to have debates. They're building a water recycler from salvage. Their radio traffic sounds like a town.
- *Radio IDs:* `THE DRIFT`, `DRIFT MESS`
- *Status:* Population now 340 and growing.
- *Story beat:* By end-game the Drift is 900 people, the most genuinely self-governing community in the solar system, and a minor geopolitical actor both factions wish they could control.

---

**26. NEPTUNE FUEL DEPOT ECHO-9 — THE AUDIT**
*Location: Neptune system (player-adjacent)*
*Factions: Concordat auditing independents*

A Concordat compliance inspector arrived at Echo-9 post-cascade and is auditing all manifests for evidence of "unauthorized Periphery dealings." Three workers have been detained in administrative holds. The remaining staff give short, careful answers on open frequencies. If you listen closely, their word choices form a pattern — they're calling for help without calling for help.
- *Radio IDs:* `ECHO-9 OPS`, `TC INSPECTOR RELAY`
- *Status:* Audit day 5.
- *Story beat:* Two of the detained workers are released after their manifests clear. One isn't. A Periphery ship demands his release. Concordat refuses. Echo-9 is now technically a dispute flashpoint. The inspector is asking for backup that isn't coming.

---

**27. THE LATE MAIL — RELAY EPSILON**
*Location: Outer system relay, distributed*
*Factions: Unaligned — automated infrastructure*

The automated mail relay is still running. Letters written before the cascade are still being delivered — messages queued for transit that took weeks to arrive. Across the solar system, people are receiving Earth messages from people who are now unreachable. "Call me when you get this." "I forgot to tell you." "Happy birthday, I can't believe you're out there." "I love you, stay safe." The messages are mundane. The relay delivers them with the same flat automated header it always uses.
- *Radio IDs:* `RELAY EPSILON DELIVERY`, `AUTOMATED`
- *Status:* Ongoing. Will run until the relay power fails.
- *Story beat:* Not a story with an end. Just a system doing its job, long after the job became something else.

---

**28. MARS — THE THREE-WAY STANDOFF**
*Location: Mars orbital infrastructure*
*Factions: TC vs. PL vs. Martian Citizens' Front*

Mars has no central government. Concordat held operational control of the orbital platform; Periphery had deep roots in the working colonies. Now both are making open plays for the orbital infrastructure while the Martian Citizens' Front — led, ironically, by an orbital traffic controller named Priya Bhat — is trying to run a governance process that excludes both. All three parties are talking, occasionally at the same time, on overlapping frequencies.
- *Radio IDs:* `TC MARS COMMAND`, `PL MARS LIAISON`, `CITIZENS' CHANNEL BHAT`
- *Status:* Standoff week 3.
- *Story beat:* Bhat brokers a temporary shared-operations agreement. It lasts six weeks — longer than anyone expected. Dario Lenz from Ares-3 endorses it publicly. The Citizens' Front and Lenz movement start talking.

---

**29. BEACON GHOST — THE HIDDEN MESSAGES**
*Location: Distributed across relay chain*
*Factions: Unknown — intelligence operation*

The BEACON automated relay system (the voice the player already hears in normal chatter) is misbehaving in a specific way: cargo sync packets occasionally contain fragments of non-standard human message data. Compressed, embedded in metadata fields, invisible unless you know to look. Someone is using BEACON's relay chain as a covert messaging system. Who? The fragments, when assembled, reference a location, a timeline, and a phrase: *the parcel was never the point.*
- *Radio IDs:* `BEACON` — embedded in normal traffic
- *Status:* Running for months, undetected.
- *Story beat:* The hidden messages are Concordat intelligence — someone in TC using the pre-existing relay chain to coordinate without Periphery interception. The phrase "the parcel was never the point" refers specifically to MX-7734. The parcel was a cover delivery. The real payload was information that arrived via BEACON three hours earlier.

---

**30. TRITON SURFACE STATION — THE LONG WAIT**
*Location: Triton surface*
*Factions: Unaligned (science)*

Three researchers on Triton's surface. Their surface vehicle broke down six weeks before the cascade. They were waiting on a replacement part that never came. Now the supply chain has collapsed and they don't know when anything is coming. They're rationing food, water, and heating power with methodical care. Their daily check-in broadcasts are a model of controlled calm. They talk about their research. They make small jokes. They count the days.
- *Radio IDs:* `TRITON SURFACE-3`
- *Status:* Day 47 since vehicle breakdown.
- *Story beat:* Resupply comes at day 89 — an independent freighter that diverted on a rumour. The researchers' first transmission post-resupply is 3 words: *"Thank you. Out."* One of them cried. You can hear it.
