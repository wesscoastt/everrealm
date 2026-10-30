# The Endless Tower (brief from the owner, 2026-10-29)

To do after the UI work (docs/OWED.md item 6c). Kept here word for word.

---

EVERREALM — THE ENDLESS TOWER
Complete MMORPG Feature Implementation

I want you to implement a complete, polished, highly replayable Endless Tower system in Everrealm, inspired by the tower challenge in Swordburst 2 on Roblox.

This must feel like a genuine MMORPG activity with meaningful progression, increasingly difficult encounters, valuable rewards, leaderboards, and reasons to return every day.

This is a permanent feature of Everrealm. It must integrate with the existing game world, combat, classes, equipment, inventory, party system, progression, economy, and UI.

Do not create a disconnected demonstration or a separate game inside the game.

1. THE TOWER

Create a massive ancient tower located in the existing world, accessible through a physical entrance in an appropriate major city or hub.

The tower should have:

* An impressive architectural identity.
* A recognizable entrance and interior.
* An NPC responsible for tower challenges.
* An entry area with party formation and leaderboard access.
* A visually distinct environment that feels like an important location in Everrealm.

Use the existing voxel art direction, materials, lighting, architecture, and world-building standards.

The tower should feel ancient, dangerous, mysterious, and prestigious.

2. INFINITE FLOOR PROGRESSION

The tower must support theoretically unlimited progression.

Implement a floor generation system that can continue beyond Floor 100, 200, 500, and 1,000 without requiring manually created content for every floor.

Divide progression into difficulty brackets:

* Floors 1–10: Introduction and basic enemies.
* Floors 11–25: Stronger enemies and elite variants.
* Floors 26–50: More difficult combinations and mechanics.
* Floors 51–100: Advanced encounters and dangerous bosses.
* Floors 101–200: Endgame difficulty.
* Floors 201–500: Extreme challenges.
* Floors 501+: Prestige-level endless progression.

Every 5 floors should introduce an elite encounter or special challenge.

Every 10 floors should feature a major boss encounter.

Bosses must have distinct attack patterns, abilities, animations, and mechanics. Do not simply increase their health.

3. FLOOR DESIGN AND VARIETY

Do not make every floor a copy of the previous one.

Create multiple encounter types:

* Enemy elimination.
* Multiple enemy waves.
* Elite enemy encounters.
* Boss encounters.
* Survival challenges.
* Special enemy combinations.
* Mini-boss encounters.
* Environmental hazards.
* Timed challenges.
* Floors with unusual combat modifiers.

Introduce different arena themes and visual variations.

Examples:

* Ancient stone chambers.
* Overgrown ruins.
* Frozen chambers.
* Volcanic arenas.
* Haunted halls.
* Underground crypts.
* Arcane chambers.
* Ancient royal halls.

Use randomized encounter combinations while maintaining carefully controlled difficulty.

Randomness should create variety, not unfair encounters.

4. ENEMY SCALING AND COMBAT

This feature must use Everrealm's existing combat system.

Do not create a separate combat implementation.

Enemies should become progressively more challenging through:

* Health and damage scaling.
* Improved enemy AI.
* More dangerous attack patterns.
* Elite modifiers.
* Different enemy combinations.
* Boss mechanics.
* Increasingly demanding encounters.

Make sure enemy scaling works with Everrealm's existing class system, including tanks, damage dealers, magical classes, stamina-based classes, and other supported builds.

Do not make one class mandatory.

Solo players must be able to progress.

Parties should also be supported, with appropriate scaling based on party size and player power.

Avoid simply multiplying enemy health by party size. Introduce additional enemies, mechanics, or encounter variations where appropriate.

5. CHECKPOINTS AND PROGRESSION

Players should have persistent tower progression.

Implement:

* Highest floor reached.
* Highest floor successfully cleared.
* Current run progress.
* Floor checkpoint system.
* Boss milestone records.
* Personal tower statistics.
* Individual and party records.

Players should be able to return to their highest unlocked checkpoint rather than replaying hundreds of floors every time.

Checkpoint rules must prevent players from skipping uncleared progression.

Make failed runs meaningful without making players lose all their progress.

6. EXCLUSIVE EQUIPMENT AND REWARDS

This is one of the most important parts of the system.

Create desirable rewards that give players a reason to keep climbing.

Tower-exclusive rewards should include:

Weapons

* Swords.
* Greatswords.
* Daggers.
* Bows.
* Staves.
* Other weapon types already supported by Everrealm.

Armor

* Complete themed armor sets.
* Individual rare equipment pieces.
* Unique visual appearances.
* High-floor prestige equipment.

Other rewards

* Rare pets and companions.
* Mounts.
* Weapon appearances.
* Armor appearances.
* Titles.
* Crafting materials.
* Tower currency.
* Decorative collectibles.

Create multiple rarity tiers using Everrealm's existing item rarity system.

Some items should be exceptionally rare.

Do not make every reward a simple statistical upgrade. Include items with interesting effects and desirable appearances.

Keep equipment balanced with the existing game economy and progression.

Tower-exclusive equipment must have genuine value without making open-world equipment irrelevant.

7. TOWER REWARD SYSTEM

Implement multiple reward sources:

* First-clear rewards.
* Boss rewards.
* Floor completion rewards.
* Milestone rewards.
* Rare enemy drops.
* Weekly challenge rewards.
* Tower currency.

Introduce milestone rewards at floors 10, 25, 50, 75, 100, 150, 200, and subsequent major milestones.

Give players guaranteed milestone rewards in addition to randomized loot.

Create a dedicated tower reward currency that can be spent at an NPC vendor.

The vendor should offer desirable equipment appearances, cosmetics, crafting materials, pets, and other collectibles.

Avoid excessive currency inflation or rewards that damage the existing economy.

8. DAILY AND WEEKLY TOWER CHALLENGES

Add repeatable daily and weekly objectives.

Daily examples:

* Clear 5 tower floors.
* Defeat 50 tower enemies.
* Defeat 2 tower bosses.
* Complete 5 floors with a party.
* Complete a floor without dying.

Weekly examples:

* Reach a new personal floor record.
* Clear 25 tower floors.
* Defeat 10 tower bosses.
* Complete a tower run with a guild party.
* Reach a designated milestone floor.

Rewards should include:

* Gold.
* Tower tokens.
* Crafting materials.
* XP where appropriate.
* Cosmetic rewards.
* Rare reward opportunities.

Use server-authoritative completion tracking and legitimate daily/weekly reset times.

Do not let players repeatedly claim the same reward through relogging, reconnecting, or manipulating local time.

9. LEADERBOARDS AND COMPETITION

Create leaderboards for:

* Highest individual floor.
* Fastest boss clears.
* Weekly tower progress.
* Guild tower records.
* Party achievements.

Display player names, character appearances where appropriate, floor records, and completion times.

Create a prestigious title system for players who reach major milestones.

Leaderboard records must be validated by the server.

Do not allow players to fabricate records through client-side values.

10. PARTY AND GUILD INTEGRATION

Support:

* Solo runs.
* Small parties.
* Full supported party sizes.
* Guild groups.

Allow party members to enter together.

Keep rewards fair and ensure each eligible player receives appropriate progression credit.

Add special guild milestones and optional guild competitions.

Do not make solo players feel punished for not having a group.

11. TOWER UI

Create a dedicated tower interface that fits Everrealm's existing MMO UI.

Include:

* Current floor.
* Current objective.
* Enemies remaining.
* Floor completion progress.
* Boss health bar.
* Personal highest floor.
* Available checkpoints.
* Current run rewards.
* Daily and weekly tower objectives.
* Leaderboards.
* Tower vendor.

The interface must be polished, readable, and consistent with the existing HUD.

Avoid cluttering the normal gameplay screen when players are outside the tower.

12. REPLAYABILITY AND LONG-TERM CONTENT

The tower should remain enjoyable after Floor 100.

Introduce:

* Increasing encounter complexity.
* New enemy combinations.
* Elite modifiers.
* Boss variations.
* Rare drop opportunities.
* Prestige milestones.
* Weekly rotating challenges.
* Special tower events.

Do not rely entirely on inflated enemy health and damage to create difficulty.

High floors should reward player skill, class knowledge, equipment optimization, and teamwork.

13. IMPORTANT TECHNICAL REQUIREMENTS

Before implementation, inspect Everrealm's existing codebase and identify:

* Combat architecture.
* Enemy spawning and AI.
* Class and character progression.
* Equipment and item systems.
* Inventory.
* Party and guild systems.
* Quest infrastructure.
* Economy and currencies.
* Persistence and save systems.
* UI architecture.
* Multiplayer and server authority.

Integrate the tower into these systems.

Do not replace existing systems unnecessarily.

Do not introduce duplicate inventory, combat, currency, quest, or progression systems.

All important rewards, floor completions, item drops, currency transactions, and leaderboard submissions must be validated server-side.

Prevent item duplication, reward exploits, checkpoint exploits, and unauthorized progression changes.

Optimize floor generation and enemy spawning for browser performance and multiplayer scalability.

Use instancing or isolated encounter spaces if supported by the current architecture.

If the existing architecture cannot support a particular feature, explain the limitation and implement the closest compatible solution rather than pretending it works.

14. IMPLEMENTATION AND TESTING

Work directly in the existing Everrealm project.

Do not stop after creating a design document or mockup.

Implement the actual functional systems.

Build the feature in stages if necessary, but keep all stages connected to one coherent system.

After implementation, test:

1. Entering the tower.
2. Starting a solo run.
3. Starting a party run.
4. Completing floors.
5. Elite encounters.
6. Boss encounters.
7. Enemy scaling.
8. Checkpoint persistence.
9. Reward distribution.
10. Equipment drops.
11. Daily and weekly challenges.
12. Leaderboard records.
13. Disconnecting and reconnecting.
14. Saving and loading progression.
15. Multiplayer reward validation.

Report what was implemented, what was tested, which files changed, and what remains unfinished.

FINAL DESIGN GOAL

I want the Endless Tower to become one of Everrealm's most addictive and rewarding permanent activities.

Players should constantly have another floor to conquer, another boss to defeat, another rare item to hunt, another milestone to reach, and another record to beat.

It should capture the satisfying progression and loot chase of Swordburst 2 while delivering the depth, combat quality, class variety, and long-term replayability expected from a serious MMORPG.

Preserve Everrealm's identity. Build this as a genuine part of the world, not a generic dungeon generator.
