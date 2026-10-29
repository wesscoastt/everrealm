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
| D | Callings and weapons: weapon-family skills, the Mender, the Gravecaller, the Warden's support tree | **Part done**: the Mender and the Gravecaller (below) |
| E | Builds: saved bars, effects table and cleanses | Planned |
| F | Enemies: casters, menders, guards, summoners in every region; boss phases and stagger bars | **Done** (below) |
| G | Interface: resource bars, costs, effect icons, cast bars | With each stage |
| H | Testing and balance: the sim learns costs, blocks and interrupts; headless runs of each calling | With each stage; the sim pays costs (below) |

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

### Stage D, the Gravecaller (2026-10-29)

Built: the seventh calling, **the Gravecaller** (magicka, and health for its blood skills; dungeon role
damage). Siphon, Wither, Raise the Fallen; utilities Bone Ward, Grave Grip, Grave Rot; the **Lifeblood**
gauge, a store of life up to 30% of your health. Wither (up to three deep) eats at a foe and stores
life as it ticks, a foe dying withered gives up more, and Siphon stores whatever it heals past full.
Three talent trees (the Blood, the Rot, the Fallen), two morphs for each skill, six icons, and a master,
Elias Jewell, by the market cross in Scarrow Tor.
- **Blood prices** (`Pool` 'health' in `data/combat.ts`, n in percent of health): Bone Ward 8, Grave
  Rot 6, Raise the Fallen 12. Lifeblood pays first, then health; a price that would take your last
  health is refused ("Not enough health for that.").
- **The raised** are henchman bodies (`entities/Ally`) the kit drives: each walks to the nearest foe
  within eighteen blocks of you, strikes on its own timer, keeps up with you (back out of the ground
  beside you if left thirty blocks behind), and lies down when its twenty seconds are up. Foes don't
  aim at them yet.
- **Bone Ward** withers whatever strikes it; **Grave Grip** is a stun, so it breaks a wind-up.
- **Balance**: the first draft was 19% over the average (too much single-target damage and sustain),
  so Siphon, Bone Ward, Wither's tick and the raised were trimmed. The sim casts Grave Rot only on a pack,
  as a player would; Grave Grip holds two seconds; the Rot tree's Feed heals for each foe Rot strikes.

Verified headless (`.walker/scen-grave.js` against a built bundle): three Withers built it three deep
and three seconds of it took 113 off the wolf and Lifeblood 3.0% to 8.4%; Siphon at full health stored
10% (8.4% to 18.4%), at half healed 122 to 146 of 244; Bone Ward took its 8% out of Lifeblood (20.2% to
12.2%, health untouched) for a 49 shield, which soaked a 30 blow whole and withered the striker; with
Lifeblood spent the price came out of health; at 5 health it was refused; Raise the Fallen raised two
for 12% of Lifeblood, which walked onto the wolf and took 287 off it in five seconds, and lay down when
their time was up; Grave Grip on a wind-up interrupted it, exposed the wolf 3 s, held it 2 s; Grave Rot
withered all three foes near the target two deep for 3% of Lifeblood and 7 health. Balance: every
calling, tree, bar and morph within its limit.

Not yet: foes taking aim at the raised dead, and a bonier look for them (they read as pale folk in old
clothes); two clients in one group.

### Stage H, the sim pays its way (2026-10-29)

`npm run balance` now keeps stamina and magicka the way the game does (100 each; back at 12 and 9 a second
in a fight), prices every skill as `Game.skillCost` does (`SKILL_COST`, else the calling's pool at the
slot price), charges the weapon skill (the sim's cleave) 12 stamina, and won't cast what it can't pay for.
It prints how many seconds a minute each calling had a skill ready and no means to pay.

The first run found the casters starved: Firebolt, Frostbolt, Lantern Light and Wither come round every
1.6 seconds and cost the utility price of 14, which is 8.8 magicka a second against 9 coming back, so
nothing else could be cast (the Mender held back 15 seconds a minute and fell 10% under the average). At
range those four stand in for the free swing, so they now cost 6. With that, no calling runs dry in the
sim and every calling, tree, bar and morph is within its limit; cooldowns stay the pace, as designed.

Not yet in the sim: the dodge's and the guard's stamina (it neither dodges nor blocks), so the stamina
callings' pool is freer there than in play; interrupts.

### Stage F, the enemies (2026-10-29)

Built (`src/data/foeKinds.ts`, `src/entities/Enemy.ts` FOE_RULES, `src/game/Game.ts` foeDid/callUp, the HUD):
- **Casters** (`attack: 'cast'`): a bolt gathered in the hand over a gold ring at the caster's feet, then
  flown at you wherever you are. Roll as it comes, block it, or stun the caster to break it.
- **Menders** (`role: 'mend'`): every seven seconds the most hurt friend within fourteen blocks under
  three quarters gets a quarter of its health back, after 1.4 s gathering in a green ring (a stun breaks it).
- **Guards** (`role: 'guard'`): a shield on the arm takes three quarters of any blow from within about
  sixty degrees of its front ("Guarded"); it turns slowly, so you can get round it, and it's open while it
  swings, stunned or exposed.
- **Summoners** (`role: 'summon'`): call two or three of the region's beasts as they come in and again
  below half health (1.6 s, a stun breaks it). The called stay forty-five seconds, give no loot, and go
  when their caller falls.
- **One of each region's twenty spawn tables** gets a new kind, five of each: Wolf-wife, Turnpike bully,
  Herb-wife, Lamp wrecker, Hired claim guard, Shard-seeker, Eyrie bonesetter, Adder-wife, Stannary
  bailiff, Grey sister, Mite-keeper, Drowned keener, Wreck bosun, Glade hermit, Resin-burner, Quarry
  foreman, Rift houndsman, Reaver glassblower, Grave-warden, Wight-priest. Short tables are filled out
  first, so the new kind is about one spawn in six. Each **bandit fort** has a sawbones (a mender) among
  the gang, and the chief's lieutenants carry shields.
- **Boss stagger bars**: control fills it (about three stuns); full, the boss reels three seconds,
  exposed for four, losing whatever it was gathering, and can't be staggered again for twelve. This
  replaces the old flat half-second flinch and eight seconds' grace.
- **Boss phases** (`phases` on the def): nine bosses have their own (the Rust Queen, the Bramblemaw,
  Blind Jenny, Old Clinker, Abbot Wystan, the Lantern Man, the Glassmother, Grey Meg, the old king): calls
  of their kin, a self-mend, storms. Every other boss gathers a **storm** below 60%: a three-second red
  ring nine blocks or more across, then a blow of 1.8; only filling its stagger bar breaks it.
- **The HUD**: the target frame and the boss bar show a cast bar (gold, "stun to break", when a stun
  would), and the boss bar its stagger bar (grey while it can't be staggered).

Verified headless (`.walker/scen-foesF.js`, built bundle): a cast's bolt took 19 of 100; rolled through, 0;
a stun mid-cast interrupted it and exposed the caster 2.9 s; a mender healed a wolf at 14 of 45 to 25; a
100 blow on a guard landed 25 from in front and 100 from behind, and half a second after turning its back
it was still 128 degrees off you; a summoner called two wolves, gone when it fell; a boss's stagger bar
went 0.36, 0.70, full, staggered and locked; at 55% it gathered a Storm (not breakable by a stun) and it
took 29 of 85.

Not yet: called foes and boss adds aren't shared between players (each sees their own); the balance sim
doesn't fight the new kinds.

### The raised dead, finished (2026-10-29)

- **Foes turn on them**: a foe a raised one strikes goes for it for five seconds after each blow (a boss
  only a third of the time), through `ClassKit.drawnTo` and Game's `raisedCtx`; their blows land on the
  raised (`ClassKit.hurtRaised`), which crumble when beaten down.
- **Bone**: `Appearance.bones` gives a skull (dark sockets with a light in them, the nose's hole, teeth)
  and an open chest (ribs and a spine over the dark), and the raised wear it in grave rags.

Verified headless (`.walker/scen-raise.js`): two raised; a wolf turned on one of them 0.3 s after it was
struck, and in four seconds took that one 349 to 345 while you took nothing.

### The brief's skills, first part: the weapon in your hand (2026-10-29)

The owner asked where the brief's skills were. The answer was that the calling skills existed but the
weapon skills didn't: key 3 was chosen by the weapon's speed alone (three skills for fourteen
families). Key 3 now follows the **kind of weapon in hand** (`WEAPON_SKILLS` and `weaponKit` in
`data/classes.ts`), each with its own icon, two morphs and a stamina price:

| In hand | Key 3 | What it does |
| --- | --- | --- |
| sword, longsword, falchion | Riposte | the next blow in a second is turned aside and answered |
| sabre, dagger | Flurry | four quick cuts |
| greatsword, cleaver | Sunder | a heavy blow where you aim, knocking them down |
| axe | **Hack** | a hard chop and a six-second bleed |
| great axe | **Whirl** | struck all round you, twice |
| mace, war hammer | **Bell Ringer** | a blow to the head: stunned 1.4 s, a wind-up lost |
| spear | **Long Thrust** | everything in a line six blocks long |
| bow | **Hobbling Shot** | a solid arrow, and the target slowed four seconds |
| staff | **Staff Sweep** | everything near struck, knocked back and off its feet |

Still to come from the brief, in order: key 2 by weapon kind too (Cleave stays for now); a bigger
pool of utilities and elites per calling to choose among; saved builds; the effects table and
cleanses; the Rogue, attunements for the elemental callings, and the Pathfinder's beasts.

Verified headless (`.walker/scen-group2.js`, built bundle): each weapon in hand chose its own key 3 and it
landed on a post (Flurry 157, Sunder 294, Hack 142, Whirl 212, Bell Ringer 156, Long Thrust 146, Hobbling
Shot 107 and slowed, Staff Sweep 66; Riposte only answers a blow). **Two players in one group** over a
local realm (a second player run by `.walker/bot.mjs`): a Mender's Mend reached the other for +300 (30% of
their 1000) and Lamp Ward laid a 100 ward on them for eight seconds, both passed by the realm as `gAid`;
their group frame went 300 to 600 of 1000.

### The brief's skills, second part: more to choose from (2026-10-29)

Each calling's utilities grow from three to five (you still carry two beside the signature), so a bar
is a choice and not a default. `npm run balance` now plays every pair from a calling's pool and holds
each within 10% of the average.
- **Warden**: **Challenge** (every foe within six blocks cowed, its blows 15% softer for six seconds,
  and two Resolve) and **Cover** (a ward of an eighth of their health on everyone of yours within eight
  blocks, a little less on you).
- **Reaver**: **Finishing Cut** (a solid blow, two and a half times that on a foe under a third of its
  health; a kill with it mends you) and **Blood Up** (a sixteenth of your health, paid in blood, for
  60 Fury, and for eight seconds your blows give a little health back).
- Tuning to keep every pair within its limit: Restoration's heal 10% to 9%; the Embers tree's Searing
  4% to 2%.
