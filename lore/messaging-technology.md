# Messaging Technology — Software & Brands

SOLNET is infrastructure. Messaging software is what runs on top of it — the applications pilots and colonists actually use to send and receive. Like the relay network beneath them, messaging apps are not standardised. There is no single platform. There are competing products with different owners, different feature sets, different politics, and different levels of survival after the cascade.

The player's ship HUD runs a messaging client as a plug-in. It can be swapped, in theory. In practice, most pilots stick with what came installed.

---

## The Ecosystem

Four major messaging platforms serve the solar system. Each targets a different market segment, runs on different infrastructure, and has a different relationship to the Terran Concordat.

---

### REACH — *"Wherever the signal goes."*

**Type:** Independent commercial
**Founded:** ~15 years pre-cascade, Vesta, Asteroid Belt
**Infrastructure:** BEACON-native (Layer 2)
**Market:** Independent freight operators, outer system colonists, small traders

**Brand:**
- **Color:** `#00C8C8` — a clean, utilitarian cyan. Readable in low-light cockpit conditions. No glow, no flourish.
- **Logo:** A single arc — not a full circle, not a broadcast fan. Just one clean curve suggesting reach without claiming arrival. Text mark: `REACH` in spaced monospace caps.
- **Tagline:** *Wherever the signal goes.*

**Company:**
REACH was founded by a Belt logistics cooperative that was tired of paying Concordat licensing fees for HERALD and getting outer-system support that was clearly an afterthought. The founding team built REACH from the BEACON protocol up — meaning it was designed for store-and-forward from the start, not adapted to it. Messages queue gracefully when relay contact is lost, deliver when it restores, and flag their transit time clearly so the recipient knows how old the information is. This was not a feature Concordat products offered for P2/P3 traffic. It made REACH indispensable in the outer system.

REACH has no Concordat affiliation and has declined acquisition offers three times. The Periphery League uses it but does not own it. It is genuinely independent, which in the current political climate makes it trusted by almost everyone and controlled by no one.

**Features (as of game start):**
- Full SOLNET P2/P3 message send and receive
- Contact book with relay address storage
- Message threading (conversation view by sender)
- Offline queue — messages composed without relay contact are held and delivered on reconnect
- Delivery receipt (confirms relay node accepted the packet; does not confirm recipient read)
- Transit time display on received messages (how long the message was in queue)
- HUD plug-in mode: compact inbox button, unread badge, message list, full message view
- Interoperability bridge: receives messages from HERALD, OPENLINE, and MERIDIAN (send interop varies)

**Post-cascade status:** Fully operational. BEACON nodes in the outer system are intact. REACH's inner-system relay partners are degraded but outer and mid-system coverage is unaffected. Some P2 messages addressed to inner-system recipients are queueing indefinitely — REACH surfaces these as `DELIVERY UNCERTAIN` rather than failing silently.

**Known issue:** Broadcast fallback P3 traffic from degraded relay zones is now surfacing in user inboxes. REACH has issued a notice acknowledging the behaviour and advising users that these are not addressed to them. No fix is available — the fallback is a BEACON protocol behaviour, not a REACH software bug.

---

### HERALD — *"The voice of the inner system."*

**Type:** Concordat enterprise
**Founded:** ~40 years pre-cascade, Earth, Geneva orbital hub
**Infrastructure:** Trunk-primary (Layer 1), with BEACON fallback
**Market:** Concordat officials, military assets, inner system commercial operators, wealthy independent contractors

**Brand:**
- **Color:** `#CC8822` — amber-gold. Authoritative. Designed to feel official.
- **Logo:** A stylised herald's horn viewed from the bell end — concentric rings suggesting broadcast, contained within a formal circle border. Text mark: `HERALD` in serif caps with thin-stroke letterforms.
- **Tagline:** *Authorised. Encrypted. Delivered.*

**Company:**
HERALD is not a software company in the ordinary sense — it is a communications division of Concordat's infrastructure arm. It was built when the Trunk was built, and its premium features (P0 priority routing, credential-verified sender authentication, end-to-end encryption, read receipts with timestamp verification) all depend on Trunk access. HERALD's business model is subscription licensing: ships, stations, and corporate entities pay an annual fee for a HERALD terminal credential, which is what unlocks P0/P1 routing and verified sender status.

HERALD was the preferred system for anything official: government correspondence, military orders, legal contracts, high-value commercial negotiations. In the inner system before the cascade, if you received a message on HERALD from a verified sender, it carried weight. It meant the person had paid for authentication and the Concordat infrastructure had validated it.

**Post-cascade status:** Severely degraded. The inner Trunk is severed. P0 routing is offline. Verified sender authentication is failing because the Concordat certificate servers that validate credentials are unreachable. HERALD terminals in the outer system still function as basic messaging clients but without Trunk access they are effectively running as expensive P2 relay clients. The HERALD app displays a persistent status banner: `TRUNK ACCESS — SUSPENDED`. Many Concordat assets in the outer system have switched to REACH for operational traffic while HERALD degradation persists.

**Notable:** DISPATCH sends on HERALD with a verified sender credential. The verification currently fails (the cert server is unreachable) but the credential ID is still embedded in the message header. Someone with the right tools could read it.

---

### OPENLINE — *"The network is yours."*

**Type:** Community/open-source cooperative
**Founded:** ~8 years pre-cascade, distributed (no fixed headquarters)
**Infrastructure:** BEACON + mesh (Layer 2 + peer-to-peer between ships)
**Market:** Periphery League operators, fringe communities, The Drift, privacy-focused users, anyone who won't pay for HERALD

**Brand:**
- **Color:** `#FF5500` — an aggressive, warm orange. Not corporate. Not refined. Chosen by community vote.
- **Logo:** An open circuit — a ring that doesn't close, with nodes at irregular intervals. Suggests network, suggests incompleteness, suggests that the network is whatever the users make it. Text mark: `OPENLINE` in condensed sans-serif, all caps, slightly irregular kerning (intentional — different contributors built different parts of the wordmark).
- **Tagline:** *The network is yours.*

**Company:**
OPENLINE is a cooperative software project with no central authority and no fixed address. It was started by Periphery League engineers who needed messaging that didn't require a Concordat license, couldn't be surveilled by Concordat, and worked in the outer system's patchy relay coverage. The key innovation was mesh networking: OPENLINE clients on nearby ships relay messages for each other, extending coverage beyond the BEACON chain. This makes OPENLINE unusually reliable in dense shipping corridors and completely unreliable in empty stretches of space where there are no ships to form the mesh.

OPENLINE is encrypted by default — all messages are end-to-end encrypted with keys the user holds. Even relay nodes can't read the content. This makes it the preferred system for anyone with something to hide, which includes a significant portion of the outer system's population.

**Features:**
- Default end-to-end encryption
- Mesh relay between nearby ships
- Anonymous messaging (no verified sender identity)
- Group channels (used by The Drift, Shepherd Council, and others for community broadcast)
- No read receipts (by design — sender doesn't know if you read it)
- Rough UI — functional, not polished

**Post-cascade status:** Thriving. OPENLINE's decentralised architecture means there was no single point of failure. The mesh is denser than it has ever been as ships cluster at outer system stations and depots. The Periphery League has adopted it as a quasi-official communications channel. Some Concordat operators are quietly installing it.

---

### MERIDIAN — by AresNav

**Type:** Commercial add-on (navigation software company)
**Founded:** ~20 years pre-cascade, Mars, Ares-3 colony
**Infrastructure:** BEACON (Layer 2)
**Market:** Freight pilots who already use AresNav navigation software

**Brand:**
- **Color:** `#33BB66` — a navigational green. Matches AresNav's nav display aesthetic.
- **Logo:** A compass rose with a message envelope at the centre. Slightly awkward — the messaging feature was bolted onto a navigation product and the logo shows it. Text mark: `MERIDIAN` in clean sans-serif below the AresNav compass mark.
- **Tagline:** *Navigate. Communicate. Arrive.*

**Company:**
AresNav makes navigation software. Their route-planning, trajectory calculation, and waypoint management tools are standard across outer system freight. About six years before the cascade, enough pilots were asking for integrated messaging that AresNav built MERIDIAN as a module add-on. It works, it integrates cleanly with navigation waypoints (a message can contain a location that opens directly in AresNav), and it costs nothing if you're already an AresNav subscriber.

MERIDIAN is not the best messaging software. It is the most convenient messaging software if you're already living in the AresNav ecosystem, which a lot of freight pilots are.

**Post-cascade status:** Operational. AresNav itself is thriving post-cascade — route planning in a collapsing system is more valuable than ever, and MERIDIAN rides that. One notable feature: MERIDIAN now shows a small marker on the nav map when a message references a location. As stations go dark and routes change, this has become unexpectedly useful. Messages from Concordat operators about closed corridors appear on the MERIDIAN map in real time.

---

## Interoperability

The four platforms send and receive across each other, mostly. SOLNET itself is protocol-agnostic — a message is a packet, and a packet has a destination address regardless of which app generated it.

In practice:

- **REACH** receives from all platforms. Sends to all platforms. Strips sender verification metadata it can't authenticate (which currently means all HERALD verified-sender data is shown as `UNVERIFIED`).
- **HERALD** receives only from verified HERALD senders or whitelisted external addresses. With cert servers down, the whitelist is stale and some legitimate messages are being silently dropped.
- **OPENLINE** sends anonymised by default. Receiving OPENLINE messages on REACH or HERALD shows the sender as `OPENLINE USER · [mesh node ID]` with no name.
- **MERIDIAN** is fully interoperable. The nav integration doesn't care what platform the sender uses.

---

## Message Header Format by Platform

Each platform stamps its messages with a characteristic header. These appear in the player's inbox above the message body.

**REACH** (player's app):
```
REACH · P2 RELAY · DELIVERED
FROM:    [sender name]
RELAY:   [last node ID]    TRANSIT: [duration]
```

**Late mail / broadcast fallback:**
```
REACH · P3 ECONOMY · BROADCAST FALLBACK
FROM:    [account label — UNVERIFIED]
RELAY:   RELAY EPSILON    TRANSIT: [duration]
ACCOUNT: [name]           DESTINATION: UNRESOLVABLE
```

**HERALD:**
```
HERALD · P0 PRIORITY · TRUNK ACCESS SUSPENDED
FROM:    [sender] — CREDENTIAL: [ID] — STATUS: UNVERIFIED
```

**OPENLINE:**
```
OPENLINE · ENCRYPTED · MESH RELAY
FROM:    OPENLINE USER · [node ID]
```

**MERIDIAN:**
```
MERIDIAN / ARESNAV · P2 RELAY
FROM:    [sender]    WAYPOINT: [linked / none]
```

---

## Contacts & Message History

REACH stores contacts as relay addresses in the ship's local memory — not on a central server, which means contacts survive infrastructure collapse. Each contact entry holds:

- Display name (user-set)
- SOLNET relay address (`SOL · REGION · NODE · ACCOUNT ID`)
- Platform (REACH / HERALD / OPENLINE / MERIDIAN)
- Last message timestamp
- Notes (free text field, user-maintained)

Message history is stored locally per contact. The ship's message log holds the last 500 messages before archiving to long-term storage (if long-term storage is installed — not all ships have it). On older freight ships, the inbox is the only history.

**Key limitation:** REACH can receive messages from anyone on SOLNET. It can only send to addresses in the contact book or to addresses explicitly typed as a relay address. This is intentional — unsolicited outbound to unknown addresses costs relay fees and is a common vector for spam and misinformation. You can receive from DISPATCH. You cannot reply unless you have their relay address.

This is the current situation with the player. Received messages from: Outer Lanes Ltd. (Mara Voss), Home (M), Neptune Control, DISPATCH. Relay address stored for: Mara Voss only. The others are inbound-only. You have no way to reach them.

---

## Post-Cascade Status Summary

| Platform | Status | Notes |
|---|---|---|
| REACH | Fully operational | Broadcast fallback P3 bleeding into inboxes |
| HERALD | Degraded | Trunk suspended, cert auth offline, P0 unavailable |
| OPENLINE | Thriving | Decentralised architecture unaffected; mesh growing |
| MERIDIAN | Operational | Nav integration increasingly valuable for route intelligence |
