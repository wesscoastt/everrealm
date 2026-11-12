# Companions overhauled

The owner's brief, word for word, as sent 2026-11-11 (docs/OWED.md 97).

EVERREALM — COMPLETE COMPANION SYSTEM OVERHAUL
Implement a fully developed medieval fantasy companion system inspired by the strongest mechanics of Elder Scrolls Online and Star Wars: The Old Republic. Do not simply copy either game. Create an original system that fits Everrealm's existing world, lore, economy, professions, combat, NPC schedules, and sandbox gameplay.
1. COMPANION IDENTITY AND PERSONALITY
Companions must feel like actual inhabitants of Everrealm rather than ordinary followers.
Every recruitable companion should have:

* A unique name, appearance, personality, background, and history.
* Individual dialogue and conversational responses.
* Personal motivations, ambitions, preferences, and dislikes.
* A relationship with the player that develops naturally.
* Individual companion quests and storylines.
* Reactions to important player decisions and world events.
* Daily routines and activities when not accompanying the player.

Companions should remember important interactions and occasionally initiate conversations.
2. COMPANION LEVELING AND PROGRESSION
Give every companion their own independent progression system.

* Companions earn XP through combat, defeating enemies, completing quests, and participating in adventures.
* Companions level independently of the player.
* Unlock new abilities, passive bonuses, and combat improvements as they progress.
* Allow companions to develop specialized combat builds.
* Their progression must remain persistent when dismissed or reassigned.
* Balance XP gain so progression feels rewarding without excessive grinding.

Companion levels must not simply mirror the player's level.
3. RELATIONSHIP AND INFLUENCE SYSTEM
Implement a relationship system inspired by ESO's Rapport and SWTOR's Influence systems.
Each companion has an individual relationship value.
Relationship progression comes from:

* Completing their personal quests.
* Helping people they care about.
* Making decisions they agree with.
* Exploring locations they find interesting.
* Participating in their preferred activities.
* Giving appropriate gifts.
* Completing meaningful shared adventures.

Relationships should also be capable of declining.
Add multiple relationship milestones:

* Stranger
* Acquaintance
* Friend
* Trusted Ally
* Loyal Companion

These are starting examples. Create a balanced progression system.
Higher relationships unlock:

* Additional dialogue.
* Personal quests.
* Unique abilities or passive bonuses.
* Special interactions.
* Companion assistance.
* Deeper character development.

Avoid making relationship progression a repetitive gift-giving grind.
4. COMBAT AND SPECIALIZATIONS
Companions must actively participate in combat.
Support:

* Tank
* Damage Dealer
* Healer
* Support

Each companion should have their own abilities, cooldowns, combat behavior, and preferred fighting style.
Implement:

* Automatic combat AI.
* Target selection.
* Enemy awareness.
* Defensive behavior.
* Healing and support behavior.
* Ability rotations.
* Equipment-dependent statistics.

Allow players to choose combat roles and customize companion ability loadouts.
Companions should intelligently respond to dangerous situations rather than standing around or attacking randomly.
5. EQUIPMENT AND CUSTOMIZATION
Allow players to equip companions with:

* Weapons.
* Armor.
* Shields.
* Jewelry.
* Accessories.

Equipment must affect their combat statistics and appearance.
Support visual equipment changes wherever the existing rendering system allows.
Provide a dedicated companion equipment interface.
6. PROFESSIONS AND ASSIGNMENTS
Take inspiration from SWTOR's crew skills and expand it into Everrealm's medieval economy.
Companions can be assigned to:

* Mining.
* Woodcutting.
* Fishing.
* Hunting.
* Farming.
* Blacksmithing.
* Cooking.
* Alchemy.
* Enchanting.
* Tailoring.
* Crafting.

Each companion should have individual strengths and weaknesses.
Assignments should take actual in-game time and produce resources or completed goods.
Higher companion proficiency should improve production efficiency and occasionally unlock special results.
Do not allow assignments to generate unlimited resources instantly. Integrate them with Everrealm's existing economy and resource systems.
7. COMPANION HOME AND MANAGEMENT
Create a dedicated companion management interface.
Players should be able to:

* View recruited companions.
* Inspect levels and relationships.
* Review skills and equipment.
* Select active companions.
* Dismiss companions.
* Assign companions to professions.
* View completed assignments.
* Start personal quests.
* Review companion histories.

Allow companions to exist in the world when not actively following the player.
They should return to appropriate locations, settlements, homes, workplaces, or assigned positions.
8. WORLD BEHAVIOR AND IMMERSION
Companions should interact with the existing world.
Examples:

* A warrior companion occasionally spars with guards.
* A blacksmith companion visits smithies.
* A fisherman visits docks and fishing locations.
* A hunter explores wilderness areas.
* A merchant companion visits marketplaces.
* A religious companion may visit temples.

Implement schedules and contextual interactions.
Companions should not constantly teleport around the player or remain frozen when dismissed.
9. PERSONAL COMPANION QUESTLINES
Every major recruitable companion should have a personal storyline.
Include:

* Recruitment quests.
* Personal conflicts.
* Character development.
* Meaningful choices.
* Relationship milestones.
* Unique rewards.
* Story conclusions.

Some quests should require traveling to different parts of Everrealm.
Make these quests feel like genuine medieval fantasy adventures rather than generic fetch quests.
10. PLAYER INTERACTION
Allow players to interact with companions through a dialogue interface.
Include:

* Talk.
* Ask about their history.
* Discuss current events.
* Ask about their opinions.
* Request assistance.
* Change combat roles.
* Assign tasks.
* Discuss completed quests.

Dialogue should reflect relationship levels, current circumstances, and companion personality.
11. TECHNICAL REQUIREMENTS
Before implementation, inspect Everrealm's existing:

* NPC architecture.
* Combat system.
* XP and leveling system.
* Quest framework.
* Inventory and equipment systems.
* Crafting and professions.
* Time and scheduling systems.
* Dialogue framework.
* Save/load architecture.

Integrate the companion system into existing architecture instead of creating disconnected duplicate systems.
Requirements:

* Persistent companion progression.
* Persistent relationship values.
* Persistent equipment and assignments.
* Reliable companion AI.
* Proper pathfinding and collision.
* No floating companions or NPCs.
* No companions becoming stuck.
* No duplicated companion entities.
* No broken save data.
* No unnecessary performance overhead.

Use modular, maintainable code.
12. IMPLEMENTATION APPROACH
Do not attempt to create superficial placeholder versions of every feature.
First audit the existing game and determine which systems can be reused.
Then implement the companion framework in stages:

1. Companion data, recruitment, persistence, and management.
2. Independent XP, levels, and progression.
3. Combat AI, roles, abilities, and equipment.
4. Relationship and influence mechanics.
5. Professions and assignments.
6. World schedules and interactions.
7. Dialogue and personal questlines.
8. UI polish, balancing, and testing.

Test each stage before moving forward.
Preserve all existing Everrealm functionality. Do not remove or replace existing systems just to make implementation easier.
FINAL DESIGN GOAL:
Everrealm companions should feel like real adventuring partners and independent inhabitants of a living medieval world.
The player should be able to develop friendships, travel together, fight together, build an economic relationship, assign meaningful work, and experience individual companion stories.
The ultimate inspiration is ESO's companion progression combined with SWTOR's companion depth, expanded into Everrealm's persistent medieval sandbox world.
