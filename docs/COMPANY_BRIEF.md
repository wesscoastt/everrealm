# The Counting House, the infirmaries, and a stake in the trades

The owner, 2026-10-30: "add something like the trading company from skyrim into the game, hospitals like
in gw2, businesses etc". This is the design; OWED 6e builds it in the order at the end. Canon is
docs/LORE.md, the writing docs/NARRATIVE_STYLE.md.

## 1. The Counting House (the trading company)

**What it is.** The Charter's own sea trade, chartered by the Speaker forty years ago to carry the
Counties' wool, tin and salt fish out and bring wine, silk and timber back, and to collect the harbour
dues while it's at it. Everyone calls it the Counting House, after the office it keeps on every quay
in the Counties but Gullmouth's (LORE: the Merchants' Hall). Its people are factors; its ships fly the
Charter's blue with a white tally-stick. It is the East Empire Company's place in this world: rich,
lawful, slow, a little rotten, and the only employer on the coast that pays on the day it says.

**Where.** A counting house (office, bonded warehouse, crane, a clerk's window onto the quay) in:
- **Saltwind's Holme Staithe** and **Inkholm's Gillsby Staithe**, small ones;
- **Ansbury**, the head office: the Counting House on the river wharf, the Governor's room upstairs;
- **Gullmouth**, where it has no house and wants one: a hired loft over a chandler's on the quay,
  which the Merchants' Hall resents in public;
- **Callis**, in Morrow, by Assembly licence, in a warehouse it rents from the Assembly at a rent
  the Assembly raises every year;
- **Brasswick** on Kell, a shared office with Harrowgate & Daughters' iron agent.
Each has a **factor** (its keeper, a shop of Company goods: imported wine, silk, timber, spice, the
things the realm doesn't make), a **clerk** with a contract board, and a warehouse you can walk into,
stacked with crates, bales and casks.

**Joining and rising.** A faction like the Waits (data/factions.ts): `company`, ranks Clerk,
Supercargo, Factor, Chief Factor, and the title **Factor of the Counting House**. The storyline is
the spine; contracts are the daily bread.

**Contracts** (the clerk's board, three a day per house, repeatable, paying marks and Company scrip):
- *Carry*: a sealed cargo by road or ferry to another house, before the bell (timed, can be robbed
  by footpads on the road in the last third);
- *Tally*: count a warehouse against its book; find what's short (a hidden-object search in the
  warehouse);
- *Collect*: a debt from a named trader; pay it, talk them round, or take goods in kind;
- *Escort*: a wagon or a boat along a stretch with Brethren or footpads about;
- *Salvage*: a cargo washed up from a wreck, before the wreckers get it.
**Scrip** buys the Company's stock (a supercargo's coat, a factor's hat, a sea chest for the home, the
Company's banner, a ship figurehead, imported dyes) and pays your way on the ferries.

**The storyline: "Short Weight"** (six chapters, BioWare beats; each raises your rank):
1. *The Clerk's Window* (Ansbury). Join; your first contract goes wrong because the cargo you carried
   weighs less at the far end than it did at the near one. Somebody is skimming.
2. *Dues* (Gullmouth). The Charter galleon anchors off to dodge the dues the Company collects; its
   captain is paid by the Company to do it. You learn the Company cheats its own Charter.
3. *The Black Hen's Other Owner* (the Mewstones, Saltpenny). The Brethren ship that sinks Company
   hulls is insured by a Company factor, who buys the wrecks' cargo back cheap. A choice: report it to
   the Governor, sell it to the Merchants' Hall, or keep it for leverage.
4. *Saltpenny Keeps No Book* (Morrow). Follow the skimmed cargo to Saltpenny, where the Brethren sell
   it on. A wrong turn: the factor you trusted in chapter 1 is the one who sent you, to find out how
   much you'd found.
5. *Bonded* (Callis). The warehouse fire: the Company burns its own Callis stock for the insurance
   and blames the Assembly. Someone you've worked with since chapter 1 dies in it. You can save the
   ledgers or the people on the second floor, not both.
6. *The Reckoning* (Ansbury, the Governor's room). Put it in front of the Governor, the Speaker's
   Ushers or the Merchants' Hall. Each ending changes who runs the Gullmouth house afterwards and
   what its factor says to you for the rest of the game.

## 2. Infirmaries

GW2 has no hospital as such; this takes its hospitals of the Krytan kind (the Shaemoor and Divinity's
Reach infirmaries in the personal story) and what the owner asked for: a place in each city where the
hurt are looked after, with its own people, work and stories.

**Where.** **The Spital** on Tanners' Row, Ansbury (LORE has a physician there already); the
**Seamen's Sick-House** on Gullmouth's terraces; **the Works' sick bay** at Harrowgate (the company
doctor, and the Rules of the Works on the wall: half pay for a fall of roof); **the Assembly's
Hospital** in Callis. Each a building of its own: a long ward of beds with patients in them, screens,
a physician's room with a desk and jars, a still-room, a yard with washing on lines, a chapel corner.

**What it does for you.**
- *Treatment*: the physician cures every harm on you (data/effects.ts) and heals you to full, for a few
  marks; free when you're poor (under 20 marks) because the Charter pays.
- *Your bed here*: choose the infirmary as where you come back when you fall (like an inn's bind), and
  come back with a short ward against harms instead of the usual weakness.
- *Remedies*: a still-room shop (draughts, poultices that cure one harm, splints, bandages).
- *Rounds*: three repeatable jobs a day (fetch herbs for the still-room, carry water, sit with a
  patient and listen, which can start a side quest of theirs; take a dose to someone in the town).
- *A quest line each*: the Spital's physician and the Collegium arguing over crystal fever; the
  Sick-House and the pressed crews of the Margery; the Works' sick bay and the hands Pryce won't pay
  half; the Assembly's hospital and a patient who was at the Callis fire (ties to the Counting House).

## 3. A stake in the trades

The nine country trades in data/businesses.ts stay as they are. Two things on top, so "businesses" is
something you own a piece of, as in Skyrim's investing:
- **Investing**: put marks into a business (500, 1500 or 4000) at its keeper; it pays a share of its
  takings every real day (a modest return, recovered in about four weeks), gives you a better price in
  its shop, and its keeper treats you as a partner (new lines; a quest when the business is in trouble).
- **Town businesses**: new ones in the towns and cities, each its own place and keeper: a chandlery
  (Gullmouth), a bookbinder's (Ansbury), a cooper's (Saltpenny Key), a ropemaker's is already Rook's,
  a pie shop, a printer's, a clockmaker's (Brasswick). Each investable too.
- The Counting House sells **shares in ventures**: a ship's voyage you buy into that comes back in a
  few real hours with your money and a profit, or doesn't (the Brethren); the risk shown honestly.

Pacing (memory: max level takes weeks): investments return slowly and are capped per character, so
they are a pleasure, not a way past the economy. `npm run balance` gets a check that no stake pays
back faster than three weeks.

## Build order

1. The Counting House in Ansbury and Gullmouth (buildings, factor, clerk, warehouse, contracts, scrip
   stock), then the other houses.
2. The Spital in Ansbury (building, ward, physician, treatment, bind, remedies, rounds), then the other
   three.
3. Investing in the nine country trades; then shares in ventures.
4. "Short Weight" chapters 1 to 3, then 4 to 6.
5. The town businesses, one a pass.
6. The infirmaries' quest lines.
Each step tested in game with screenshots, `npm run sites`, `standing`, `balance`, `quests` clean.
