# Ship building and naval combat (the owner's brief: docs/briefs/ship-building.md)

Starfield's ship builder, for sailing ships: a keel and a part in every slot, every part with its weight, price and
effect, the sum a ship that sails and fights the way it was built. It sits on the sailing and broadsides that exist
(data/naval.ts, game/Sailing.ts, server/naval.mjs) and replaces the three fixed hulls with designs.

## Designs (src/data/shipParts.ts) [built]

- **Keels**: the cutter, the brig and the frigate, as before. A keel sets her hull, length, gun decks (guns a side on
  each: cutter 2; brig 2 + 2; frigate 3 + 2 + 2), hold slots (1, 2, 3), crew and cargo, and **capacity**: the weight
  she carries well. Past it she wallows (speed and handiness fall away); under it she is a little livelier.
- **Slots**: bow, stern, rig, sailcloth, planking, each gun deck, each hold.
  - Bow: plain stem; carved figurehead (crew load faster); bronze ram (run a ship down at speed); bow chaser.
  - Stern: open transom; sterncastle (hull, crew, slower to turn); stern chaser; great cabin (cargo, carpenter's stores).
  - Rig: fore-and-aft (closer to the wind, slower before it); square (fastest before the wind, poor up it); brigantine.
  - Sailcloth: canvas; heavy duck (rigging stands up to shot); Callis silk (fast, tears easily).
  - Planking: oak; pine (light, fast, weak); copper-sheathed oak (faster); iron-banded oak (tough, heavy, slower).
  - Gun decks: open (cargo); light guns (fast reload); long guns (range); carronades (heaviest, short); chain shot
    (cuts rigging: a ship with her sails in rags can be caught).
  - Holds: cargo; crew berths (more hands, faster loading); powder magazine (faster loading); carpenter's walk
    (repairs as she sails); iron ballast (stiff, sluggish, tougher).
- **Crew**: every gun wants two hands; short-handed, the guns load slower; berths and a sterncastle add hands.
- **Cost**: the keel's price as before, plus every part's marks and materials (bronze for a ram, iron bar for banding
  and long guns, copper for sheathing).
- A design travels as a short string ("brig:bow=ram,stern=castle,...") so other captains see the ship you built.
- The plain design of each keel matches the old fixed hull within a few per cent, so ships already built keep sailing
  the same.

## The shipyard (next)

At any shipwright, "Design a ship": the ship stands at the yard's berth as you build her, and changes as you change
her parts (as Starfield's builder shows the ship in the hangar). A list of slots, each cycled through its parts, beside
her figures: hull, speed, handiness, how close she points, broadside weight a side, range, loading time, crew, cargo,
weight against capacity, and the cost. Designs can be saved and named, and a ship of yours can be **refitted** to a
new design at the yard for the difference.

## Naval combat to fit (next)

- Each gun deck fires its own guns with its own loading time; Q and E fire every loaded deck on that side.
- R fires the chasers (bow ahead, stern astern).
- Long guns carry farthest, carronades hit hardest close in, chain shot strikes the rigging.
- Rigging takes damage from shot that hits high (chain shot above all): torn sails, a slower ship, until mended.
- A ram does damage by her speed when her bow strikes another ship's side.
- The carpenter's walk and the great cabin mend the hull a little each second once the guns have been quiet a while.
- Raiders get designs of their own (Brethren carronade brigs, revenue cutters with chasers), so the lanes have
  ships worth fitting out against.
- The realm passes the design string with each ship, and its hit limits rise to fit carronades.
