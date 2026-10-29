# Combat: audit and the unified design

The owner's brief (2026-10-28): one coherent MMO combat system drawing on Guild Wars 2 (action combat,
weapon skills, dodging, professions), the Elder Scrolls Online (stamina and magicka, blocking,
interrupts, roles) and Guild Wars 1 (a small, chosen bar; builds and synergies). Everything original to
Everrealm. Built in verified stages over the game that exists, not beside it.

This file is the audit (stage A), the design (stage B) and the record of what each stage has done.

## A. What exists (audited 2026-10-28)

Traced from character creation through combat, levelling, gear and skills, by reading the code and
running the balance simulator and the game headless. Verified means run; inspected means read only.

| System | Where | State |
| --- | --- | --- |
| **Callings** (classes): Warden (tank: Resolve), Reaver (melee burst: Fury), Kindler (ranged fire: Kindling), Pathfinder (bow: Mark), Wizard (frost control: Chill) | `data/classes.ts`, `game/ClassKit.ts` | Working, verified. Chosen at creation, for life. Each has a mechanic, a heal, a signature and three more utilities (two chosen), an elite. |
| **The bar**: 1 Strike, 2 Cleave, 3 a weapon skill by the weapon's speed (Riposte, Flurry, Sunder); 4 heal; 5 signature; 6-7 chosen utilities; 8 elite; Q dodge; F eat | `data/classes.ts` WEAPON_SKILLS, `game/Game.ts` useAbility | Working. GW-style limited bar already. Weapon skills depend only on speed (three lines), not on the weapon family. |
| **Talents**: three trees per calling, six tiers, capstones | `data/talents.ts` | Working, verified by `npm run balance`. |
| **Skill points, ranks, morphs** (ESO-style: use ranks a skill I-IV, a point morphs it) | `data/skillpoints.ts` | Working. |
| **Mastery** past 100 | `data/mastery.ts` | Working. |
| **Weapons**: 14 families on one point budget (damage, speed, reach, crit, leech) | `data/weapons.ts` | Working. Families change numbers and the speed line, not the skills. |
| **Armour weights**: light (skill haste), medium (crit, cheaper dodge), heavy (vigor, defence) | `data/armour.ts`, Game `armour` | Working. |
| **Stamina** (`energy`, 100): sprint, the dodge (25, less in medium) | Game | Working. Nothing else spends it. "Winded" at empty. |
| **Magicka** | none | **Missing.** Every skill is cooldown only; there is no resource choice. |
| **Blocking** | none | **Missing.** Riposte is a one-off parry skill; there is no held block. |
| **Interrupts** | none | **Missing.** Enemy wind-ups can be dodged, never broken. |
| **Crowd control**: stuns (Shield Bash), knockdown (Sunder), chill-freeze (Wizard), stagger | ClassKit | Working on ordinary foes; bosses resist. No diminishing returns: chain-stunning is possible in a group. |
| **Status effects**: bleeds, burning rings, chill, marks, wards, the meal buffs | ClassKit, Game buffs | Working, but each lives in its own code; no shared stacking rules, no cleanse. |
| **Enemies**: four attack kinds (lunge, slam, charge, throw) with ground telegraphs that fill as they charge; elites; bosses with a signature circle and an enrage | `data/gameplay.ts` ENEMIES, `entities/Enemy.ts` | Working, verified. **No casters, healers, defenders or summoners**: every foe is a melee or a thrower. |
| **Scaling**: everything meets you at your level (ESO One Tamriel) | `data/scaling.ts` | Working. |
| **Groups**: shared creatures, relayed blows, kill credit for everyone who hit (GW2) | `game/SharedMobs.ts`, server `mHit` | Working, verified with a local server. **Client-authoritative**: the server relays damage shares, it does not compute them. |
| **Support play** | none | **Missing.** No calling heals or wards anyone but itself. |
| **Balance** | `scripts/classbalance.ts` (`npm run balance`) | Working: callings, trees, bars and morphs within 7-10% in the simulator. |

Conflicts and gaps, in order of how much they hold the game back:

1. **No resource decisions.** Cooldowns alone pace every skill; stamina only pays for running and
   rolling. ESO's stamina/magicka split is the brief's spine and the game has half of it.
2. **No active defence beyond the dodge.** No block, no interrupt: tanks and careful players have
   nothing to do when a big hit comes but roll.
3. **No group roles but tank and damage.** Nobody heals or protects anyone else, so group content
   can't ask for a healer and a support build doesn't exist.
4. **Enemies all fight the same way.** Without casters or healers there's nothing to interrupt and
   no target priority.
5. **Effects don't share rules.** Each burn, bleed and chill stacks in its own way; nothing cleanses.
6. **Weapons change numbers, not play.** A spear and a sabre on the same speed line share skills.
7. **Combat is client-authoritative.** Fine for co-operative play; a gap the day there's PvP (the
   Debatable Land). Called out, not hidden.

Kept as they are: the callings and their mechanics, the GW-style bar and its size, talents, ranks and
morphs, weapon families, armour weights, scaling, telegraphs, shared creatures and the balance sim.

## B. The unified design

### The loop
Pick a fight (tab-target or the nearest in reach), open with a skill, keep the auto-swing going, spend
stamina or magicka on skills between cooldowns, watch the ground for telegraphs: dodge the circles,
**block** the heavy blows, **interrupt** the casts. Heal, or be healed. Bosses ask for all of it.

### Resources
- **Health.** As now.
- **Stamina** (100, more with heavy and medium armour): the dodge (25), sprinting, **blocking** (each
  blocked blow costs stamina; empty, the guard breaks), and **physical skills** (Warden, Reaver,
  Pathfinder, the weapon skills), most 8 to 20.
- **Magicka** (new: 100, more with light armour; regenerates faster out of a fight and with light
  armour): **spells** (Kindler, Wizard, heals and wards, the support calling), most 10 to 30.
- Every skill costs one or the other, never both, plus its cooldown. Cooldowns shorten a little to
  make room. Elites have long cooldowns and a big cost. Running dry slows you; it never locks you out
  of the auto-swing or the dodge's cheaper form (a stumble-step at no cost, half the distance).

### Active defence
- **Dodge** (Q): as now.
- **Block** (hold V; a button on touch): 50% less damage from the front (65% with a shield in the
  off-hand), stamina per blocked blow, walking pace, no swinging. A block within a quarter second of a
  blow landing is a **perfect block**: no damage, the attacker is **staggered** for a second and takes
  more from the next hit. Heavy blows (charges, slams) break a guard that's out of stamina.
- **Interrupts**: some enemy wind-ups are **casts** (marked by a gold ring that pulses, and a cast bar
  over the caster). Any skill with the **interrupt** tag (Shield Bash, Shield Throw, Sunder, Frost Nova,
  a new **bash**: tap attack while blocking, stamina) breaks the cast: the caster is staggered for two
  seconds and the spell is lost.
- **Crowd control** keeps its kinds (stun, knockdown, root, slow, chill-freeze). New: a short
  **immunity** after any hard control on a foe (four seconds), so nothing can be locked down forever;
  bosses take control as **stagger** (a sliver of their action bar) rather than ignoring it, and say so.

### Effects
One effects table (`data/effects.ts`): each effect a kind (harm or help), how it stacks (intensity up
to a cap, or duration), what it does a tick, and whether it can be cleansed. Burning, Bleeding,
Poison, Chill, Weakness (less damage dealt), Vulnerability (more taken), Regeneration, Protection,
Ward (barrier), Haste. Cleanses remove harms, newest first.

### Roles
- **Tank**: Warden (and Reaver's defensive tree): block, Resolve, taunt (Shield Throw draws the foe),
  interrupts, wards on others.
- **Healer and support**: a **new calling, the Mender** (magicka): direct heals, heals over time,
  wards on allies, cleanses, a resurrect; mechanic **Grace** (healing others builds it; spent, it doubles
  the next heal or ward and spreads it). A support tree for the Warden as well.
- **Damage**: Reaver (melee burst), Kindler (fire at range, damage over time), Pathfinder (bow, marks),
  Wizard (frost control), and a **new calling, the Gravecaller** (necromancer: life force, curses, the
  raised dead; mechanic **Lifeblood**, some skills paid in health instead of magicka).
- Hybrids by talents and the masters' cross-taught utilities, at the cost of specialisation. Open-world
  play stays solo-friendly: every calling can heal itself and finish an ordinary fight alone.

### Bar and builds
Keep the eight-slot bar (it fits a phone, and GW1's lesson is a small bar): 1-3 weapon, 4 heal, 5
signature, 6-7 chosen utilities, 8 elite; Q dodge, V block, F eat. Weapon skill 3 moves from the speed
line to the **weapon family** (a spear sweeps, a dagger backstabs, a hammer quakes, a staff channels):
the weapon in your hand changes how you fight. **Saved builds**: three bars per character, swapped out
of combat for nothing.

### Damage pipeline (one function, `data/combat.ts`)
`dealt = base (weapon power or spell power) × skill coefficient × rank × talent tunes × crit
× (1 + vulnerability − weakness) × level difference × (1 − armour mitigation) × block × ward`
Physical skills scale with weapon power, spells with spell power (from the weapon's budget spent on
**magic** in staves and foci, and light armour). No uncontrolled multipliers: every term is capped and
the balance sim reads the same function the game uses.

### Enemies
New kinds alongside lunge, slam, charge and throw: **cast** (a caster's bolt or a storm, interruptible),
**mend** (a healer that heals its friends: kill or interrupt it first), **guard** (a defender that blocks
from the front: flank it or break its guard), **summon** (calls lesser foes). Bosses get a phase list
(at health thresholds) that uses all of them, and a stagger bar for control.

### Multiplayer and validation
Today the browser is the authority and the realm relays shares (true for the whole game, not only
combat). Staged: (1) the realm checks what it can cheaply: skill cooldowns and costs per message, damage
shares within what a level-L character can deal in the time since the last, kills only of creatures
that exist; (2) authoritative combat when PvP arrives. Until then, nothing is called anti-cheat that
isn't.

### Interface
Health, stamina and magicka bars together; skill costs on the icons (a blue or green pip) and greyed
when you can't pay; the calling mechanic's gauge as now; effect icons with stacks and time; the
target's frame with its effects and a cast bar; a pulsing gold ring for interruptible casts; tooltips
that give the real numbers.

## C. Stages and their state

| Stage | What | State |
| --- | --- | --- |
| A | Audit | **Done** (above) |
| B | Design | **Done** (above) |
| C | Core: magicka, skill costs, block and perfect block, interrupts and the cast kind, control immunity, the damage pipeline in one place | **Part done** (below) |
| D | Callings and weapons: weapon-family skills, the Mender, the Gravecaller, the Warden's support tree | **Part done**: the Mender (below) |
| E | Builds: saved bars, effects table and cleanses | Planned |
| F | Enemies: casters, menders, guards, summoners in every region; boss phases and stagger bars | Planned |
| G | Interface: resource bars, costs, effect icons, cast bars | With each stage |
| H | Testing and balance: the sim learns costs, blocks and interrupts; headless runs of each calling | With each stage |

### Stage C, first part (2026-10-28)

Built (`src/data/combat.ts`, `src/game/Game.ts`, `src/entities/Enemy.ts`, the HUD):
- **Magicka**: a second pool (100, more in light armour), back at 9 a second in a fight and 20 out of
  one. Kindler and Wizard skills are paid in it; Warden, Reaver and Pathfinder skills and the weapon
  skills in stamina. A skill you can't pay for is greyed on the bar and says so if pressed.
- **The guard**: hold V (a Block button on touch). From the front it takes half a blow (65% for the
  Warden's shield) for 9 stamina a blow; empty, it breaks. Raised within a quarter second of a blow
  landing it's a **perfect block**: nothing through, and the attacker reels for 1.2 seconds.
- **Interrupts**: any stun or knockdown landed on a wind-up breaks it ("Interrupted!") and leaves the
  foe **exposed** for three seconds (a fifth more damage). Wind-ups that can be broken have a gold rim;
  a boss's signature keeps its red one and can't be.
- **Control grace**: once a stun wears off, a foe shrugs off more for four seconds ("Resisted"); a
  boss only staggers, half a second, and shrugs control off for eight.

Verified headless (`.walker/scen-combatC.js`): a bash refused at 4 stamina and paid at 100; a Wizard
spell refused at 3 magicka and paid at 100, magicka full again three seconds after; a held guard took
14 of a 39 blow for 9 stamina; a perfect block took 0 and staggered the wolf 1.2 s; a stun on a
wind-up interrupted it and exposed the wolf for 3 s; a second stun inside the grace was resisted.

Not yet: the balance sim doesn't spend the pools (it still plays on cooldowns alone), the **cast** and
other new enemy kinds (stage F), the damage pipeline gathered into one function, cost pips on the icons.

### Stage D, the Mender (2026-10-29)

Built: the sixth calling, **the Mender** (magicka; dungeon role healer). Mend, Lantern Light, Sanctuary;
utilities Lamp Ward, Rebuke, Restoration; the **Grace** gauge (two for a Mend, one for a Restoration;
full at five, the next Mend heals double and reaches everyone within twelve blocks). Three talent trees
(the Lamp, the Shelter, the Rebuke), two morphs for each skill, six icons, and a master, Joan Abney, in
the Minster's east transept.
- **Friends** (`Friend` in `game/ClassKit.ts`, `friendsNear` in `game/Game.ts`): you, a dungeon run's
  henchmen still standing, and online groupmates within forty blocks. Henchmen take wards
  (`Ally.ward`, soaked in `hurt`).
- **Group aid** (`gAid`): a heal or ward for a groupmate goes by the realm, which checks the group,
  the land and 60 blocks, at most eight a second, and caps the numbers; the one receiving it caps the
  heal at 60% of their health and the ward at half, twelve seconds at most.
- **Solo balance**: alone, every heal is your own, and a healer that out-heals everything scores too
  well on survival. So the Mender heals itself for a third of what it gives others, and Grace
  comes only from Mend and Restoration (from Lantern Light too it was always full). The sim plays the
  Mender at range and in close, like the other spellcasters.

Verified headless (`.walker/scen-mender.js`, `.walker/scen-rebuke.js`, a real henchman from the
dungeons' list): Mend healed the henchman 30.1% and the Mender 10.7% for 18 magicka; at full Grace 59.9%
and 20.9%, Grace back to 0; Restoration ticked the henchman 215 to 251 over six seconds; Lamp Ward gave the
Mender a 24 shield and the henchman a 35 ward, which soaked a blow of half that whole; on Sanctuary a 40 blow
took 36 and a foe standing on it burned 120 to 42 in three seconds; Rebuke on a wind-up interrupted it,
exposed the foe 3 s and dazed it 1.3 s; a groupmate's aid healed the rest of the way and warded 122
("Warded by ..."). Balance: every calling, tree, bar and morph within its limit.

Not yet: two clients in one group trading heals over the realm (only the receiving end is tested),
henchmen healers knowing to leave the healing to a Mender, the Gravecaller.
