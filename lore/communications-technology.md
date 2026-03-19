# Communications Technology — SOLNET

The interplanetary relay network is called **SOLNET**. It is not a single technology — it is a patchwork of nodes, protocols, and operators that evolved over decades of colonial expansion. Nobody designed it as a whole. It grew the way infrastructure always does: one depot, one relay, one corridor at a time, each built to solve a local problem, loosely stitched together into something that almost works.

---

## The Physics (Unavoidable)

Communication across the solar system travels at the speed of light. This delay is not a technical problem waiting to be solved. It is a fact of physics.

| Route | One-way delay |
|---|---|
| Earth → Mars | 3–22 min (orbital variation) |
| Earth → Jupiter | 35–52 min |
| Earth → Saturn | 1.2–1.6 hrs |
| Earth → Neptune | ~4 hrs |

Real-time conversation is impossible beyond Mars. People in the outer system do not *call* someone on Earth. They *send* to them. They wait. They receive. The culture adapted: relationships are built in message threads, not conversations. A reply that arrives in three days is not a slow reply — it is the only kind of reply there is.

Planets and the Sun occlude signals. When Earth and Neptune are in solar conjunction — the Sun between them — direct relay contact is blocked for days to weeks. Infrastructure exists to route around this, but routing adds hops, and hops add delay.

Signal power drops by the square of the distance. A transmission reaching Neptune from Earth arrives roughly 900 times weaker than it does at Mars. Outer-system receivers compensate with large antenna arrays, aggressive compression, and error-correction protocols. Messages are not streams — they are packets, checksummed, re-requested if corrupted, reassembled at the destination.

---

## The Infrastructure

SOLNET has three layers, built at different times by different interests, running on incompatible protocols held together by translation middleware nobody fully understands.

---

### Layer 1 — The Trunk

High-bandwidth laser links between major hubs. Earth orbital relay → Mars orbital hub → Belt depot cluster → Jupiter hub → Saturn hub → outer system terminus.

Trunk lines are fast — near light-speed transit, minimal queue delay. They require precise pointing and clear line-of-sight. They are expensive to maintain and expensive to use. The Trunk is owned and operated by the **Terran Concordat**, who built most of it, charge a premium for access, and consider it a strategic asset.

Priority messages travel the Trunk. So does Concordat military traffic. So does the kind of commercial intelligence that makes the difference between a profitable run and an empty hold.

---

### Layer 2 — BEACON

The automated store-and-forward backbone. Lower bandwidth, tolerant of delay and interruption. Messages are compressed into packets, queued at each node, and relayed hop-by-hop across the beacon chain toward their destination.

BEACON is slower than the Trunk and significantly cheaper. It is what most independent operators use for everything: cargo manifests, personal messages, employment contracts, dispute filings. It is also what the player hears in radio chatter — the automated relay voice that confirms depot ETAs, flags missed check-ins, and issues queue confirmations.

BEACON nodes run on local power and operate autonomously. They do not know what a message contains. They only know the destination address, the priority tier, and whether the next hop is reachable. If the next hop is down, the message sits in queue and waits. If the next hop never comes back, the message sits in queue forever.

---

### Layer 3 — Short-Range Broadcast

Direct radio. Real-time within a region. No relay, no queue, no encryption by default.

NEPTUNE TRAFFIC, FREIGHTER-12, DISPATCH on open frequencies — this is Layer 3. Fast, limited range, and anyone in range is listening. Most working pilots live on Layer 3. Most sensitive communications avoid it.

---

## Message Priority Tiers

Every message sent on SOLNET is tagged with a priority tier at point of origin. The tier determines routing, cost, and speed.

| Tier | Name | Route | Transit | Cost | Typical use |
|---|---|---|---|---|---|
| P0 | **PRIORITY** | Trunk, pre-empts queue | Hours | Very high | Military, Concordat ops, distress |
| P1 | **STANDARD** | Trunk, secondary queue | Hours to days | Moderate | Commercial, legal, professional |
| P2 | **RELAY** | BEACON chain | Days to weeks | Low | Independent operators, personal |
| P3 | **ECONOMY** | BEACON bulk queue | Weeks to months | Minimal | Bulk manifests, personal mail |

P0 access requires a Concordat-issued credential or emergency declaration. Most independent pilots never send anything higher than P2.

The family message the player received is P2 relay. It spent days in transit. It arrived. No reply was sent before the cascade. No reply has been received since.

---

## The Addressing System

A functioning SOLNET message carries a full address in this format:

```
SOL · [REGION] · [NODE] · [ACCOUNT ID]

e.g.  SOL · E9 · 0047 · M-VOSS-K
      (Earth, Sector 9, relay node 0047, recipient M. Voss-K)
```

The region and node identifiers are routing labels — they tell the relay chain *where* to send the packet. The account ID handles final delivery at the destination node. The privacy model depends entirely on that destination node being alive and holding current account mappings.

**P0 and P1** messages are encrypted to a credential. The address is a routing label; the content is sealed. Even if intercepted in transit, the message is unreadable without the recipient's key.

**P2** messages are addressed but not encrypted by default. Privacy comes from infrastructure — the destination node only surfaces the message to the registered account holder. If the node is intact, only the right person receives it.

**P3** messages were never designed with strong privacy guarantees. P3 is addressed to a relay zone, not a specific recipient. The region and node identify where to deliver; the account ID is a soft label for final-hop sorting. Final delivery assumes the destination node is alive and knows who's registered in its zone. P3 is cheap because the security model is minimal. This is documented in the terms of service. Nobody reads the terms of service.

---

## What the Cascade Broke

The Kessler cascade destroyed Earth's **orbital relay ring** — a constellation of communication satellites in low Earth orbit that formed the Trunk's inner terminus and the primary gateway for all surface-to-orbit traffic. Without it:

- No signal can reach Earth's surface from orbit, and nothing from the surface can get out
- The inner Trunk is severed at its origin point — the Mars hub is degraded, routing through damaged secondary nodes
- P0 and P1 traffic from the inner system has collapsed; Concordat assets in the outer system are operating on cached orders and local authority
- BEACON nodes in the outer system are still running on local power — they have nowhere to forward inbound traffic anymore, but outbound messages already in queue keep propagating outward

---

## The Late Mail — P3 Broadcast Fallback

When the cascade takes out inner system nodes, two things happen to P3 traffic still in queue:

**1. Destination nodes are unreachable.** The message reaches the last functioning hop and has nowhere to forward. The node holds it in queue and retries. Eventually point-to-point attempts time out and the node falls back to **broadcast mode** — flooding the message across its local transmission band, hoping any receiver in range can carry it onward or identify the recipient. This is documented P3 fallback behavior. It exists because, in the early days of outer system colonisation, reliable point-to-point delivery couldn't be guaranteed. The fallback was designed for infrastructure gaps, not infrastructure collapse.

**2. Routing tables are stale.** Outer nodes no longer hold current account mappings for the inner system. They cannot verify who an account ID belongs to. In broadcast fallback, the recipient label is just a name on an envelope, read aloud in a crowded room.

A ship receiver set to a specific account ID will, under normal conditions, surface only messages addressed to that account. In broadcast fallback with stale routing tables, the matching is loose. Messages bleed through. The player receives P3 traffic that was never meant for them — not because they intercepted anything, but because the system is failing gracefully, doing the last thing it knows how to do.

The late mail header reads:

```
RELAY EPSILON · BROADCAST FALLBACK · P3 ECONOMY
ORIGIN: [address]    DESTINATION: [unresolvable]
ACCOUNT: [name]      VERIFIED: NO
```

The player is overhearing, not receiving. The late mail was never meant for them. That's worse.

---

## Narrative Implications

- **DISPATCH had P0 access.** They knew the Neptune corridor was closing before Neptune Traffic announced it. Priority tier access implies Concordat alignment — or a relationship with someone who has it.
- **The family message is P2.** Addressed to the player specifically. It arrived. It is sitting in the inbox unanswered. There is no longer a functioning return route.
- **Sirix Station stopped accepting relay traffic.** A station that goes dark due to damage looks different from one that actively closes its relay port. Sirix's silence is a configuration choice.
- **BEACON's degradation is structural.** As inner-system nodes lose power or get seized, the backbone becomes less reliable. Messages take longer, arrive corrupted, or don't arrive at all. This is slow, procedural collapse — not a dramatic event.
- **The Archivist (Background #20) broadcasts on Layer 3.** No relay. No queue. Real-time, limited range, moving. Anyone close enough hears her. She does not know who that is.
- **The hidden BEACON messages (Background #29)** exploit the store-and-forward architecture — data embedded in P3 cargo sync packets, relayed automatically by nodes that never inspect contents. The relay does not read the mail. It just delivers it.
- **DISPATCH's early warning** was P0 Trunk intelligence. The player's employer had access to information the outer system's public infrastructure didn't carry yet. This is not coincidental.
