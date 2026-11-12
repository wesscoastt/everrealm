# Morality, alignment and world reputation

The owner's brief, word for word, as sent 2026-11-11 (docs/OWED.md 97).

EVERREALM — MORALITY, ALIGNMENT & WORLD REPUTATION SYSTEM
Implement a complete, persistent Morality, Alignment, and Reputation System throughout Everrealm. This system takes inspiration from the branching morality and Light Side/Dark Side mechanics of Star Wars: The Old Republic, but must be designed specifically for Everrealm's medieval fantasy setting.
This is a foundational RPG system, not an isolated quest feature. All future storylines, dialogue, NPC interactions, factions, companions, and world events must be capable of interacting with it.
IMPORTANT DEVELOPMENT REQUIREMENTS

* First inspect the existing Everrealm codebase and understand its architecture, quest system, dialogue system, NPC AI, save system, factions, and character data.
* Integrate with existing systems instead of creating duplicate or competing implementations.
* Preserve all existing gameplay, content, saves, and functionality.
* Do not replace working systems unnecessarily.
* Implement actual functionality, not just UI mockups or placeholder logic.
* Maintain multiplayer compatibility in the architecture, even if certain multiplayer features are not currently active.
* Test every implemented feature and fix regressions.

1. FIVE ALIGNMENT CATEGORIES
Create a character-specific alignment score ranging from -100 to +100.
Use these five classifications:

* EVIL: -100 to -76
* BAD: -75 to -26
* NEUTRAL: -25 to +25
* GOOD: +26 to +75
* HEROIC: +76 to +100

Alignment must be dynamic. Players can move between all five categories throughout their adventures.
Never permanently lock a character into an alignment.
A character who begins as heroic must be able to become evil. An evil character must be able to redeem themselves and become heroic.
Alignment changes should come from meaningful decisions, actions, and consequences rather than arbitrary gameplay activities.
2. DYNAMIC DIALOGUE CHOICES
Expand the existing dialogue and quest systems to support multiple moral approaches to conversations.
Important decisions should offer varied responses representing different intentions.
For example, a merchant asks the player to protect a caravan.
Possible responses:

* Heroic: Protect the caravan without requesting payment.
* Good: Agree to help in exchange for a reasonable favor.
* Neutral: Decline involvement.
* Bad: Demand excessive payment.
* Evil: Exploit the merchant's desperation for personal gain.

These are examples of intent, not rigid dialogue templates.
Requirements:

* Support multiple dialogue choices per conversation.
* Each choice can have an alignment impact.
* Choices can have hidden or visible consequences.
* Choices can unlock or close future dialogue options.
* NPCs remember important interactions.
* NPC responses should change based on previous player decisions.
* Support conditional dialogue based on alignment, reputation, quest history, and faction relationships.
* Do not force every conversation to offer five choices. Some situations should have fewer or more natural options.
* Not every decision needs an alignment change.

Avoid making dialogue sound artificial or overly theatrical. Write natural medieval fantasy conversations consistent with Everrealm's existing writing style.
3. ALIGNMENT IS NOT THE SAME AS REPUTATION
Implement separate reputation tracking.
Alignment represents the character's overall moral tendencies.
Reputation represents what particular people, settlements, kingdoms, organizations, and factions think of the player.
For example:

* A heroic player might be hated by a corrupt kingdom after exposing its ruler.
* An evil player might be celebrated by a criminal organization.
* A neutral player might be respected by merchants because of their reliability.
* A good player might have excellent relationships with one kingdom and terrible relationships with another.

Create individual reputation values for:

* Kingdoms.
* Towns and settlements.
* Guilds.
* Religious organizations.
* Military organizations.
* Criminal organizations.
* Individual NPCs where appropriate.

Reputation must be independently calculated and saved.
Do not make alignment automatically determine every faction relationship.
4. PERSONALITY TRAIT SYSTEM
In addition to alignment, track individual personality traits on a 0–100 scale.
Initial traits:

* Compassion
* Greed
* Honesty
* Cruelty
* Courage
* Loyalty
* Deception
* Generosity

Traits should evolve through relevant player behavior.
Examples:

* Repeatedly helping struggling NPCs increases compassion.
* Consistently demanding excessive payment increases greed.
* Keeping promises increases loyalty and honesty.
* Betraying allies increases deception and decreases loyalty.
* Taking dangerous risks to protect others increases courage.

Personality traits must be independent of alignment.
A player can be heroic but greedy, evil but loyal, neutral but honest, or good but cowardly.
Use these traits to influence dialogue, NPC reactions, companion interactions, and available opportunities where appropriate.
Avoid changing traits for every minor action. Only meaningful events should count.
5. NPC MEMORY AND REACTIONS
NPCs must be able to remember meaningful interactions with the player.
Examples:

* A merchant remembers being robbed.
* A villager remembers being rescued.
* A guard remembers the player attacking another guard.
* A noble remembers the player exposing corruption.
* A companion remembers being betrayed or protected.

NPC reactions should reflect:

* Alignment when relevant.
* Local reputation.
* Individual relationship values.
* Important remembered events.
* Personality traits when relevant.
* Current circumstances.

Do not make every NPC magically know everything the player has done.
Information should spread through believable channels:

* Witnesses.
* Rumors.
* Reports.
* Faction communications.
* Local gossip.
* Official announcements.

Implement an appropriate memory and information propagation system that does not create unnecessary performance overhead.
6. COMPANION AND ALLY REACTIONS
Prepare the system for future companion development.
Companions should have their own:

* Moral preferences.
* Personality traits.
* Relationship values.
* Memory of player decisions.

Companions may approve or disapprove of decisions.
Some companions might leave after repeated betrayals or cruel behavior. Others might appreciate ruthlessness.
Do not force all companions to share the same morality.
7. QUEST AND STORYLINE INTEGRATION
Make the alignment and reputation systems available to the existing quest framework.
Quest creators should be able to define:

* Alignment requirements.
* Minimum or maximum faction reputation.
* Personality trait requirements.
* Previous decision requirements.
* Conditional quest branches.
* Different quest outcomes.
* Alternative methods of completing objectives.
* Consequences that occur later in the world.

Most importantly, do not make alignment a quest-access prison.
A heroic character should still be able to participate in darker storylines. An evil character should still be able to help people.
Instead, provide different approaches, dialogue, consequences, and outcomes.
Support redemption, corruption, betrayal, political manipulation, forgiveness, revenge, and complicated moral decisions.
Future Everrealm storylines should be able to use these mechanics without requiring custom morality code for every quest.
8. WORLD CONSEQUENCES
Alignment and reputation should have meaningful effects throughout the world.
Examples:
Heroic:

* Villagers recognize and celebrate the player.
* Some nobles offer invitations.
* People may request assistance.
* Certain organizations may offer prestigious opportunities.

Good:

* Generally positive interactions.
* Increased trust from ordinary citizens.

Neutral:

* Ordinary treatment.
* Fewer assumptions about the player's intentions.

Bad:

* Some merchants become suspicious.
* Guards may watch the player more closely.
* Certain criminal groups may become interested.

Evil:

* Some settlements may fear the player.
* Criminal factions may offer opportunities.
* Authorities may investigate serious crimes.
* Witnesses may refuse to cooperate.

These must be context-sensitive.
A notorious criminal should not automatically be attacked by every NPC. Likewise, a heroic character should not automatically be loved by everyone.
Build this using existing NPC behavior and faction systems.
9. ALIGNMENT UI
Add a polished character alignment section to the existing character interface.
The interface should display:

* Current alignment category.
* Current numerical alignment score.
* Visual alignment scale.
* Personality traits.
* Major moral decisions.
* Reputation with known kingdoms and factions.
* Important historical events.

The alignment scale should visually communicate the five categories:
Evil → Bad → Neutral → Good → Heroic
Use Everrealm's existing visual identity and UI conventions.
The interface should feel like a natural part of the game rather than a disconnected web dashboard.
Make it readable, responsive, and consistent with existing character menus.
Do not expose every hidden calculation to the player. Keep some personality and reputation mechanics discoverable through gameplay.
10. PERSISTENCE AND SAVE COMPATIBILITY
This is critical.
All alignment information, personality traits, faction reputation, NPC memories, and major decision history must persist.
Requirements:

* Save and load alignment correctly.
* Preserve data through logout and relogging.
* Support existing character saves.
* Add safe defaults for older saves.
* Avoid resetting existing player progression.
* Ensure server-authoritative decisions where multiplayer functionality exists.
* Prevent clients from arbitrarily modifying alignment or reputation values.
* Ensure important decisions cannot accidentally be applied multiple times through duplicate events.

Create a clean and extensible data structure.
11. FUTURE STORYLINE AUTHORING SUPPORT
Create reusable APIs or helper functions that make these systems easy to use when developing future Everrealm quests.
Quest and dialogue authors should be able to define conditions and consequences without rewriting the underlying alignment system.
Provide examples of:

* A heroic-only optional dialogue response.
* A quest with five different moral approaches.
* A faction that recruits evil-aligned characters.
* A redemption quest for a previously evil character.
* An NPC who remembers a betrayal.
* A kingdom whose reputation changes based on a political decision.

Document how future storyline content should interact with these systems.
12. TESTING AND QUALITY CONTROL
Test the complete implementation.
Verify:

1. Alignment changes correctly in both directions.
2. All five categories work at their exact boundaries.
3. Personality traits evolve independently.
4. Faction reputation is independent of alignment.
5. NPC memories persist.
6. Dialogue conditions work correctly.
7. Quest branches respond to player decisions.
8. World reactions are context-sensitive.
9. Save/load works correctly.
10. Existing quests and systems remain functional.
11. Older character saves remain compatible.
12. No duplicate alignment changes occur from repeated events.

Fix bugs discovered during implementation.
Do not declare the feature complete while major functionality is missing.
FINAL DESIGN PHILOSOPHY
Everrealm should allow players to develop their own identity through gameplay.
There should be no predetermined good character, evil character, or permanent moral path.
A player might spend their first 50 hours protecting kingdoms, helping villagers, and becoming a legendary hero, only to betray their allies and become one of the most feared figures in the realm.
Another player might begin as a ruthless thief, build a criminal empire, eventually regret their actions, and spend the rest of their adventure seeking redemption.
Both stories should be possible.
The world should remember what players do, react to their decisions, and provide meaningful opportunities to change.
Build this as a permanent foundational RPG system for Everrealm that all existing and future content can use.
