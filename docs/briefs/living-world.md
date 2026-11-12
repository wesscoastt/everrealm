# Everrealm: Living World and Player Immersion Framework

The owner's brief, word for word, as sent 2026-11-12. ("Do this prompt last since it's refining existing systems and adding to a lot of them." And the owner's note: treat it as a master specification, not permission to implement everything at once; start with Milestone 1.)

EVERREALM — LIVING WORLD & PLAYER IMMERSION FRAMEWORK
Major RPG Systems Development Initiative
I want to significantly expand Everrealm's world simulation, NPC intelligence, player interaction, environmental immersion, social systems, and world persistence.
The goal is to make Everrealm feel like a living medieval fantasy world rather than a traditional RPG map populated by NPCs who exist solely to provide quests.
Take inspiration from the world simulation and immersion found in games such as:

* The Elder Scrolls V: Skyrim
* The Elder Scrolls Online
* Kingdom Come: Deliverance
* Star Wars: The Old Republic
* Red Dead Redemption 2
* The Sims series
* Guild Wars 2

However, do not copy their implementations or content. Develop original systems specifically for Everrealm.
This is intended to become a foundational framework supporting the existing game and all future expansions, regions, settlements, quests, and NPCs.
DEVELOPMENT RULES
Before implementation:

1. Thoroughly inspect the existing Everrealm codebase.
2. Identify existing NPC, quest, dialogue, economy, inventory, crafting, housing, faction, world-event, and save systems.
3. Determine which requested features already exist.
4. Identify opportunities to extend existing systems instead of duplicating them.
5. Document the architecture and implementation plan.
6. Identify potential performance problems before development.

IMPORTANT:

* Do not rebuild working systems unnecessarily.
* Do not remove existing content or functionality.
* Do not introduce placeholder implementations disguised as finished features.
* Do not create massive amounts of unnecessary NPC simulation.
* Maintain compatibility with existing character saves.
* Keep the architecture extensible for future multiplayer development.
* Use server-authoritative logic wherever multiplayer functionality exists.
* Maintain the existing voxel world and art direction.
* Test features individually and together.
* Implement in manageable stages, not one enormous rewrite.

SYSTEM 1 — LIVING LIVES: NPC SIMULATION
Develop an NPC life simulation system.
NPCs should have identities and lives independent of the player.
Each important NPC should support:

* Unique identity and background.
* Occupation.
* Home location.
* Daily schedule.
* Family relationships.
* Friends and acquaintances.
* Personal preferences.
* Personality traits.
* Economic circumstances.
* Social relationships.
* Important memories.
* Current activities.
* Long-term goals.

NPCs should move between appropriate locations throughout their schedules.
Examples:

* Shopkeepers travel to their businesses in the morning.
* Blacksmiths work during business hours.
* Farmers tend their fields.
* Guards patrol settlements and surrounding roads.
* Merchants travel between trade locations.
* Citizens visit taverns, markets, homes, and gathering areas.
* NPCs return home to rest.

NPCs should not simply teleport between locations unless an off-screen simulation requires it.
Create believable transitions between activities.
NPC Relationships
Allow NPCs to develop relationships with other NPCs.
Support:

* Friendships.
* Family relationships.
* Rivalries.
* Romantic relationships where appropriate.
* Professional relationships.
* Business partnerships.
* Feuds.
* Mentorship.

NPC relationships should influence dialogue, schedules, activities, and world events.
NPC Life Events
Allow important NPCs to experience events independently of the player.
Examples:

* Marriage.
* Births.
* Deaths.
* Relocation.
* Career changes.
* Business ownership changes.
* Financial hardship.
* Rivalries.
* Family disputes.
* Promotions.

Do not simulate every citizen with expensive individual AI. Implement importance tiers and lightweight off-screen simulation.
SYSTEM 2 — WORLD MEMORY
Create a persistent world memory system.
The world should remember meaningful player actions and important world events.
Examples:

* Saving a settlement from an attack.
* Helping an NPC recover stolen property.
* Betraying an ally.
* Assisting a noble.
* Completing an important regional quest.
* Establishing a trade route.
* Defeating a notorious enemy.

Memories should be associated with relevant NPCs, factions, settlements, and world locations.
Information Propagation
NPCs should only know things they could reasonably learn.
Information spreads through:

* Witnesses.
* Rumors.
* Merchants.
* Travelers.
* Guards.
* Letters.
* Faction communications.
* Public announcements.

A crime committed in a remote forest should not instantly become common knowledge in a distant kingdom.
Create a believable information propagation system.
Integrate this with the existing alignment and reputation framework.
SYSTEM 3 — REGIONAL CULTURE
Create a regional identity framework.
Each major settlement and region should support its own:

* Customs.
* Traditions.
* Social expectations.
* Festivals.
* Clothing preferences.
* Architecture references.
* Food and drink preferences.
* Economic specializations.
* Political structure.
* Religious and cultural practices where established by the lore.

Regional culture should influence NPC dialogue, interactions, events, and reputation.
For example, Verandah should feel like a wealthy maritime trading city with a distinct identity, rather than a generic medieval settlement.
Support region-specific content without hardcoding behavior into individual NPC scripts.
SYSTEM 4 — PERSONAL LEGACY
Create a player legacy and character identity system.
Record meaningful accomplishments throughout a character's adventures.
Support earned titles such as:

* Master Artisan.
* Friend of the Commonfolk.
* Slayer of Kings.
* Explorer of the Forgotten Lands.
* Defender of Verandah.
* Master Cartographer.
* Renowned Merchant.

Titles must be earned through actual gameplay conditions.
Allow titles to influence NPC recognition and dialogue where appropriate.
Maintain a persistent character history containing important accomplishments, decisions, and discoveries.
Avoid making titles purely cosmetic.
SYSTEM 5 — SOCIAL RELATIONSHIPS
Expand interactions between players and NPCs.
Support:

* Friendship.
* Trust.
* Rivalry.
* Loyalty.
* Professional respect.
* Mentorship.
* Personal favors.
* Invitations.
* Recurring personal interactions.

NPC relationships should develop gradually through meaningful interactions.
Examples:

* A merchant who trusts the player offers special inventory.
* A guard who considers the player a friend shares local information.
* A former enemy might eventually become an ally.
* A betrayed NPC might refuse future assistance.

Not every NPC relationship needs romance.
Prioritize believable friendships, rivalries, trust, and personal connections.
SYSTEM 6 — ADVENTURER IMMERSION
Expand everyday player interactions with the world.
Support:

* Sitting in chairs and on benches.
* Sitting around campfires.
* Eating and drinking.
* Renting rooms at inns.
* Sleeping and resting.
* Reading books and letters.
* Playing musical instruments.
* Interacting with tavern activities.
* Using appropriate environmental objects.
* Participating in regional celebrations.

These should be functional interactions, not merely animations.
Possible gameplay benefits:

* Rested bonuses.
* Nourishment effects.
* Local rumors.
* Temporary buffs.
* Access to private storage through rented rooms.
* Discoverable information.
* Social opportunities.

Interactions should use existing inventory, status-effect, and character systems where possible.
SYSTEM 7 — DYNAMIC CONVERSATIONS
Create a framework for NPC-to-NPC conversations and player participation.
NPCs should be able to:

* Talk to one another.
* Discuss recent events.
* Exchange information.
* Argue.
* Gossip.
* Discuss business.
* Discuss regional politics.
* React to nearby activities.

Players should be able to:

* Approach conversations.
* Listen.
* Interact.
* Interrupt where appropriate.
* Ask follow-up questions.
* Use information they overheard.

Conversations can reveal:

* Hidden locations.
* Side quests.
* Rumors.
* Political conflicts.
* Rare merchants.
* Criminal activity.
* World events.

Avoid generating meaningless repetitive dialogue. Use contextual dialogue pools and event-driven conversations.
SYSTEM 8 — REGIONAL EVENTS
Create a dynamic regional event framework.
Settlements should experience events independent of the player's active quests.
Examples:

* Festivals.
* Trading caravans.
* Bandit attacks.
* Royal tournaments.
* Merchant disputes.
* Noble weddings.
* Supply shortages.
* Seasonal celebrations.
* Military patrols.
* Traveling performers.
* Livestock diseases.
* Road closures.

Events should have:

* Start conditions.
* Duration.
* Location.
* NPC participants.
* Player participation opportunities.
* Rewards where appropriate.
* Possible outcomes.
* Persistent consequences.

Some events should be scheduled, while others should emerge from simulated world conditions.
SYSTEM 9 — CRIME AND WITNESS SYSTEM
Create a contextual crime framework.
Support:

* Theft.
* Pickpocketing.
* Trespassing.
* Assault.
* Murder.
* Property destruction.
* Breaking and entering.
* Bribery.

Crime detection should depend on:

* Witnesses.
* Visibility.
* Guard proximity.
* Evidence.
* Location.
* Victim identity.
* Existing local reputation.

Support:

* Witness reporting.
* Investigations.
* Wanted status.
* Fines.
* Arrests.
* Prison or custody mechanics where appropriate.
* Escaping custody.
* Bribery.
* Forgiveness and reputation recovery.

Criminal behavior should have regional consequences rather than automatically making the entire world hostile.
Integrate with alignment, NPC memory, and faction reputation.
SYSTEM 10 — SUPPLY AND DEMAND ECONOMY
Create a connected regional economy.
Settlements should have economic identities and resource requirements.
Examples:

* Port cities import timber and export fish.
* Mining towns produce metals.
* Agricultural villages supply food.
* Trading cities distribute manufactured goods.
* Blacksmiths require metal and fuel.
* Taverns require food and drink.

Economic conditions should respond to:

* Resource availability.
* Trade routes.
* Population demand.
* Regional events.
* Bandit activity.
* Merchant activity.
* Production.

Prices should fluctuate within reasonable limits.
Players should be able to influence regional economies through gathering, crafting, trade, businesses, and caravan activities.
Integrate with existing gathering, crafting, and marketplace systems.
SYSTEM 11 — PLAYER-OWNED BUSINESSES
Expand player economic participation.
Support businesses such as:

* Taverns.
* Blacksmith shops.
* General stores.
* Tailoring shops.
* Farms.
* Inns.
* Stables.
* Fishing operations.

Businesses should support:

* Ownership.
* Inventory.
* Employees.
* Operating expenses.
* Stock management.
* Reputation.
* Upgrades.
* Customer activity.
* Regional demand.

Businesses should create ongoing gameplay rather than functioning as passive money generators.
Consider how ownership works within the existing player housing, guild, and economy architecture.
SYSTEM 12 — ARTISAN IDENTITY
Give crafting a social identity.
Crafted equipment should be able to preserve:

* Original creator.
* Materials.
* Crafting quality.
* Special attributes.
* Crafting history.
* Previous ownership where appropriate.

Exceptional artisans should earn recognition.
Players should be able to develop reputations as respected blacksmiths, tailors, alchemists, cooks, and other professionals.
Support discoverable craftsmanship and player-to-player economic relationships.
SYSTEM 13 — DISCOVERER'S JOURNAL
Create an exploration journal.
Track:

* Discovered locations.
* Historical sites.
* Ruins.
* Regional legends.
* Wildlife.
* Resources.
* Important NPCs.
* Books.
* Manuscripts.
* Discoverable mysteries.

Entries should progressively update as players explore.
Allow rumors to appear before locations are discovered.
Players should be able to develop their own understanding of Everrealm's history through exploration.
Integrate with the existing map and exploration systems.
SYSTEM 14 — ENVIRONMENTAL STORYTELLING
Create a framework for environmental discoveries.
Locations should communicate stories through objects, architecture, and world details.
Examples:

* Abandoned homes.
* Destroyed caravans.
* Forgotten camps.
* Ancient ruins.
* Hidden rooms.
* Battlefields.
* Old letters.
* Personal belongings.
* Environmental clues.

Some discoveries can create quests, while others should simply reward curiosity.
Support reusable environmental storytelling content so future world builders can create discoveries without custom scripting every time.
SYSTEM 15 — WEATHER AND SEASONAL CONSEQUENCES
Expand the existing weather and environmental systems.
Weather should affect:

* NPC schedules.
* Settlement activities.
* Farming.
* Fishing.
* Travel.
* Visibility.
* Wildlife.
* Certain gathering activities.

Support seasonal changes where the existing world architecture permits them.
Examples:

* Rain creates muddy roads.
* Snow affects mountain travel.
* Fog reduces visibility.
* Storms disrupt maritime activities.
* Severe weather causes citizens to seek shelter.

Weather should have gameplay consequences without becoming an unnecessary inconvenience.
SYSTEM 16 — POLITICAL INFLUENCE
Create a framework for player influence over regional politics.
Players should be able to:

* Build relationships with nobles.
* Support political factions.
* Expose corruption.
* Negotiate agreements.
* Influence local disputes.
* Assist rulers.
* Participate in political storylines.

Allow important story decisions to change political relationships and regional conditions.
Do not make every player a ruler.
Influence should be earned through relationships, accomplishments, reputation, and decisions.
SYSTEM 17 — FAMILY AND GENERATIONAL SIMULATION
Create an extensible family system for important NPCs.
Support:

* Family relationships.
* Parents and children.
* Siblings.
* Marriage.
* Inheritance.
* Family businesses.
* Noble lineages.
* Family rivalries.
* Generational history.

Important NPC families should be able to influence regional storylines.
Do not create unnecessary complexity by fully simulating every citizen's descendants.
Prioritize important families and settlements.
SYSTEM 18 — EXPEDITION SYSTEM
Create a structured expedition framework.
Players should be able to organize expeditions into dangerous and unexplored territory.
Support:

* Recruiting appropriate NPC specialists.
* Purchasing supplies.
* Preparing equipment.
* Establishing temporary camps.
* Discovering locations.
* Encountering random events.
* Recovering artifacts.
* Returning with resources and discoveries.

Expeditions should encourage exploration, preparation, cooperation, and meaningful risk.
SYSTEM 19 — REALM CHRONICLE
Create a persistent historical record of Everrealm.
Record important events such as:

* Major regional battles.
* Important quest outcomes.
* Political changes.
* Settlement developments.
* Guild accomplishments.
* World discoveries.
* Significant player achievements.
* Major regional events.

Allow players to browse historical records through an in-world chronicle interface.
The chronicle should distinguish between officially known events, rumors, and historical accounts.
SYSTEM 20 — WORLD REQUESTS
Create an organic request generation system.
NPCs and settlements should generate requests based on actual needs.
Examples:

* A blacksmith needs iron.
* A village needs timber.
* A merchant needs an escort.
* A settlement needs food.
* A guard captain needs reinforcements.
* A traveler needs help finding a missing companion.

Requests should be generated from world conditions and NPC circumstances.
Avoid repetitive generic fetch quests.
Requests should have appropriate rewards and consequences.
SYSTEM 21 — MOUNT BONDING
Expand mount interactions.
Mounts should support:

* Individual temperaments.
* Trust.
* Stamina.
* Feeding.
* Grooming.
* Training.
* Bonding.
* Different reactions to danger.
* Different preferences and behaviors.

Mount care should be meaningful but not tedious.
Integrate with the existing mount and inventory systems.
SYSTEM 22 — WORLD SIMULATION ARCHITECTURE
This is a critical architectural requirement.
The world must feel alive without requiring every NPC to run expensive AI continuously.
Create three simulation tiers:
Tier 1: Active Simulation
Nearby NPCs receive full simulation:

* Movement.
* Schedules.
* Navigation.
* Interactions.
* Conversations.
* Relationships.
* Environmental reactions.

Tier 2: Background Simulation
Distant NPCs receive lightweight simulation:

* Schedule progression.
* Important relationship changes.
* Business activity.
* Relevant life events.
* Important world interactions.

Tier 3: Settlement Simulation
Off-screen settlements receive aggregate simulation:

* Population changes.
* Resource production.
* Supply and demand.
* Trade activity.
* Regional events.
* Important NPC changes.

Use event-driven updates, efficient persistence, and appropriate simulation intervals.
Avoid unnecessary continuous updates and expensive pathfinding for NPCs the player cannot see.
The system must scale as Everrealm's world expands.
USER INTERFACE REQUIREMENTS
Integrate new interfaces into Everrealm's existing UI.
Potential additions:

* NPC relationship information.
* Character legacy and accomplishments.
* Discoverer's journal.
* Realm chronicle.
* Regional information.
* Business management.
* Expedition management.
* Regional event notifications.
* Political influence information.

Do not overwhelm the player with dozens of new menus.
Keep interfaces organized and discoverable.
Maintain the existing visual identity of Everrealm.
IMPLEMENTATION STRATEGY
Do not implement all 22 systems simultaneously.
First produce a technical assessment of the current codebase.
Then divide development into milestones.
Suggested milestones:
MILESTONE 1:
NPC schedules, relationships, life simulation, and world memory.
MILESTONE 2:
Dynamic conversations, regional culture, and regional events.
MILESTONE 3:
Player legacy, social interactions, crime, and everyday immersion.
MILESTONE 4:
Supply and demand, businesses, and artisan identity.
MILESTONE 5:
Exploration journal, environmental storytelling, and weather consequences.
MILESTONE 6:
Political influence, family simulation, expeditions, and realm chronicle.
MILESTONE 7:
World requests, mount bonding, optimization, and full integration.
For every milestone:

1. Inspect existing implementation.
2. Define technical requirements.
3. Implement the system.
4. Integrate it with existing features.
5. Test functionality.
6. Test performance.
7. Fix discovered bugs.
8. Document the new architecture.
9. Move to the next milestone only when the current one is stable.

FINAL VISION
Everrealm should feel like a world with its own inhabitants, history, economy, politics, cultures, relationships, and ongoing events.
Players should be able to spend an entire evening doing things other than fighting monsters or completing quests.
They could:

* Run a business.
* Become a respected artisan.
* Explore forgotten ruins.
* Develop relationships.
* Participate in regional festivals.
* Influence politics.
* Become notorious criminals.
* Help struggling settlements.
* Organize expeditions.
* Become recognized figures in the history of the realm.

The world should respond to what players do.
NPCs should remember meaningful interactions.
Settlements should have identities and economic needs.
Player decisions should create consequences that persist.
Most importantly, Everrealm should provide emergent stories that players experience naturally, alongside its handcrafted main storyline and questlines.
The ultimate goal is to make Everrealm feel like a medieval fantasy world worth living in, not simply a world worth completing.
