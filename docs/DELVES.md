# Deeper delves, dungeons and a raid (design, owed item 4h)

The owner, 2026-10-29: "take ideas from wynncraft for delves and dungeon ideas even raids maybe, right now
they feel shallow."

## Where they stand (survey, 2026-10-29)

- **Group dungeons** (`data/dungeons.ts`, `game/Dungeons.ts`; halls built in `world/sites.ts`): the Old
  Man's Workings (10), Under the Kettle (30), the Escapement (40), Kingsbarrow (95). One continuous cave
  each: trash packs in order, three bosses with adds, a ground circle and one to three moves, a final
  chest. Veteran is the only harder mode. Group Finder, henchmen, Lamp key pledges.
- **Delves** (`buildUnderworks`, `game/Activities.ts`): a gatehouse, a stair and three rooms of
  monsters that respawn every 150 s, a champion, and a chest that refills every half hour.
- **Nothing underground** has levers, plates, keys, locked rooms, timers or anything to do between fights.
  That's the shallowness: every run is walk, fight, walk, fight, chest.

## What Wynncraft does that we want

1. **Rooms that each ask something different.** A Wynncraft dungeon is a string of rooms, and the fun
   is that the next room isn't another corridor of the same mobs: a puzzle, a parkour stretch, a wave
   arena, a timed escort, a mini-boss, each sealed until it's done.
2. **Keys made from the world.** Fragments drop from the region's own creatures; you assemble a key to
   go in. It ties the dungeon to the country around it.
3. **Corrupted versions.** The same halls harder, with twists (less light, more adds, a boss with a new
   phase), their own key, their own loot.
4. **Raids.** Four players, challenge rooms built for teamwork (carry things between people, hold plates
   apart from each other, split up and meet), a buff to choose between rooms, a boss in phases, raid
   rewards you can't get anywhere else.

## The design

### Rooms (new: `data/rooms.ts`, `game/Rooms.ts`)

A dungeon or delve gets a list of rooms, each a box in its halls with a gate in and a gate out (barrier
blocks and a portcullis prop, set and cleared by the room), an objective, a short line when it starts and
when it's done, and a room chest. The gate shuts behind you when the room starts and opens when the
objective is met. Group runs pass room start and room done through the dungeon's existing event relay
(`dEv`), so every member's gates move together.

Room kinds (each uses something the game already has):

| Kind | What you do | Built on |
| --- | --- | --- |
| **levers** | Pull the levers in the order a clue on the wall gives; a wrong pull wakes the room's guard pack | `data/puzzles.ts` press sequences |
| **plates** | Hold down plates. Solo: each plate stays down for a few seconds after you step off, so it's a timed run between them; in a group, stand on them together | world things + a timer |
| **waves** | Hold the room through three waves before the timer; medals for speed | Activities events (waves, medals) |
| **carry** | Carry a lit lamp (or a stone, a heart) from one end to the other; you can't use skills with it in your hands, and a heavy blow knocks it out of them | a held prop and a world thing |
| **gauntlet** | Cross a hall of vents, falling rock and bog to the lever at the far end | `game/Hazards.ts` |
| **keeper** | A pack with one marked keeper; kill it to drop the gate key | quest spawns, `questTag` |
| **guardian** | A mini-boss who keeps the room: one signature move, one add call | `BossPlan`, smaller |

Every dungeon gets three or four rooms between its bosses, chosen to fit its story (the Old Man's
Workings: the lamp room's levers, a flooded gallery to carry a lamp through, the pump room's plates). Each
delve gets one room before its champion, and its champion gets one signature move of its own.

### Keys and fragments

- Each dungeon has a **key** made from four **fragments** that its region's creatures drop (the Old Man's
  Workings: tally tags off the pit's foes; the Kettle: shepherds' tokens; the Escapement: brass teeth;
  Kingsbarrow: grave-coins). Fragments go in the pack; the key is made at any anvil.
- Normal runs stay free (no key): nobody is locked out of the story or the Group Finder. A key opens the
  **corrupted** run.

### Corrupted runs (a third difficulty, above veteran)

- Same halls, a **corrupted key** (four fragments and a corrupted shard from any veteran chest).
- Each room gets a twist (less light, the waves come faster, plates hold for less time), every boss gets
  one extra move and its adds come a phase early, creature numbers as veteran plus a tenth.
- Loot: the dungeon's set in a **corrupted** finish (its own colour and glow), corrupted-only weapons
  with a named effect, a title for the first clear, and the room chests pay corrupted shards.

### The first raid

**The Kiln's Heart**, under Kell's volcano, beyond the Escapement (level 60, four players; henchmen can't
fill it). Three challenge rooms and the boss:

1. **The Vents** (split up): four valves in four galleries must be turned within ten seconds of each
   other; each galley has its own pack.
2. **The Governor's Floor** (carry): two brass weights carried across the moving gear floor and set on
   the Governor's arms at once; the carriers can't fight, the others keep them alive.
3. **The Mainspring** (plates and waves): two hold plates while two keep the waves off them; swap.
4. **The Heart**, a slag giant in three phases: walls of fire it pushes across the floor, a lava rise you
   climb away from on the gear terraces, and an enrage where the room's vents open one by one.

Between rooms the party picks one of three **boons** (more damage, more healing, a shield at the start of
each fight) for the rest of the run. Rewards: the raid's own set and weapons, raid tokens for a vendor at
the Lamp & Spanner, a mount (a brass strider in Kell's colours) at a small chance, titles.

### What changes for each existing place

| Place | Rooms | Signature |
| --- | --- | --- |
| The Old Man's Workings | lamp-room levers, flooded gallery carry, pump-room plates, the night shift's keeper | — |
| Under the Kettle | the fold gates (keeper), the star-rock gauntlet, the drowned stair waves | — |
| The Escapement | the escapement teeth (levers in time with the beat), the vent gauntlet, the governor's guardian | — |
| Kingsbarrow | the Long Barrow's niches (levers), the Hall of the Kneeling (waves of the risen), the Black Stair carry | — |
| Each delve | one room fitting its story (smugglers: the tide-gate plates; the culvert: a carry through the flood) | the champion's own move |

## Order of building

1. `game/Rooms.ts` and the room kinds, proved in the Old Man's Workings (all four rooms), tested solo and
   with henchmen, then on a local realm with two players.
2. The other three dungeons' rooms.
3. Keys, fragments and corrupted runs.
4. One room and a signature move for every delve.
5. The Kiln's Heart.
