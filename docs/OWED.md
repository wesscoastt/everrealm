# Owed: everything the owner has asked for that isn't finished

The working prompt for the build loop. Work top to bottom; tick an item (with its commit) when it ships,
and put anything new the owner asks for where they say, or at the end of section A if they don't.
Quality bar for all of it: ESO / GW2 / WoW at 9/10, writing to docs/NARRATIVE_STYLE.md (BioWare,
Witcher 3, no AI tropes, plain names), verified in game (headless shots, and live in the pane when the
owner is watching), `npm run balance`, `npm run quests` and `npm run sites` clean before each commit.

## A. Now, in order

1. DONE (this commit, tested in game) **Quest journal** (owner 2026-10-29: "add ability to abandon side quests, select quests, show on map, etc"):
   abandon side quests (main story can't be), Track / untrack (tracker and map), Focus one quest (first on
   the tracker, brighter on the map), Show on map, click a tracked quest to open its page. Built
   2026-10-29, verify and commit.
2. DONE (npm run boxes checks all 26) **Mailboxes** (owner 2026-10-29): in Hollin Ford, Bess stands on the mailbox. Put every post box in a
   sensible spot (beside the Post sign, against a wall, never where someone stands or walks), and check
   every Post town's.
3. DONE (tested in game) **Identifying items, Wynncraft / GW1 style** (owner 2026-10-29): unidentified gear drops (its rolls hidden
   until identified), identified by a scroll / at an identifier NPC for a fee, or by salvaging unseen;
   fits the existing rarity, enchantment and set systems.
4. **Every city hand-built, no copy-paste** (owner 2026-10-23 and 2026-10-29: "did you make sure all cities
   felt hand built"). Done: Ansbury's monuments and squares (b8341f4), seeded street kit everywhere
   (32700fd). Still to do, city by city with screenshots: **Gullmouth, Harrowgate Works, Northgate,
   Saltpenny Key, Callis, the Morrow towns (Branchley, Tenwells, Liftwick, Reedwater, Cala Roja, Conch
   Key, Cold Harbour), Kelderby, Hollin Ford**: each its own landmarks and set pieces, street character,
   no repeated house fronts side by side, no prop on a path or under a person.
5. **Gullmouth overhaul, the rest** (owner 2026-10-24: "lots of it is messed up or bare bones"): every
   street and lane detailed, castle interior, terraces dressed, warehouses, NPC life on the quays.
6. **Quests toward ~1000** (owner 2026-10-24), Witcher 3 / SWTOR / WoW / ESO / Wynncraft variety. 146 on
   2026-10-29. Every region densified; thinnest now: Inkholm, the Keys, Kell, Saltpenny, the Sunder,
   Hollow Fell, the Counties' outer towns. Play a sample of each batch in game, not only the walker.

## B. Owed from earlier, still open

7. **Ships**: walkable decks on moored ships everywhere, ship interiors (owner 2026-10-23).
8. **Naval warfare, next**: crews, cargo runs, ship upgrades, boarding (item 7 of the 2026-10-23 list).
9. **Morrow roads**: real roads to Cold Harbour and Cala, a cart way into Saltpenny (the Post sets you
   down at the sign there today).
10. **Businesses**: daily tasks at each trade, a cider orchard (owner 2026-10-24: "all kinds of unique
    businesses").
11. **Creatures**: hand-sculpt the rest in voxel (lizards, moths, rustbacks, and so on); audit every
    region's spawn table for variety (owner 2026-10-23: "a large variety of mobs, MMO-style").
12. **Sound**: ambience layers per region, footsteps by ground, combat and UI sounds (pass 1 done:
    surf).
13. **Combat gaps**: called foes and boss adds shared between players; the balance sim fights the new
    foe kinds.
14. **Lantern Wake**: GW2-style festival minigames (later).
15. **Ideas backlog the owner approved**: a 5v5 objective battleground; a card-collector side story for
    Quarters; the first raid (Under the Hill, with continent 3).
16. **Pacing**: rerun the economy and XP check after each big content batch (max level takes weeks).

## C. Waiting on the owner

17. **Continent 3** (docs/CONTINENT3.md, draft written; dragon awake from the start, Debatable Land 50+):
    build once the owner says go; the dragon at the centre of its story; Cyrodiil-style PvP region.
18. **Stripe**: the owner adds charge.refunded, charge.dispute.created and charge.dispute.closed to the
    webhook.
