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
4b. DONE v1 (this commit, tested in game: two rings, neck, ear; 10 pieces; anvil recipes; elite and boss drops; Ansbury jeweller's tray. Still to do: shown on the character, and rolled/unidentified like other gear) **Jewellery** (owner 2026-10-29: "add jewelry into game too"): rings, necklaces and earrings as their own gear slots (two rings, a neck, an ear), with their own stats and leanings, rolled and unidentified like other gear, named and set pieces among them, made by a new jewellery craft at a jeweller's bench from ore, gems and the shards, sold by jewellers in the cities, worn on the character (a glint at the neck and fingers), and shown on the character screen.
4c. DONE (this commit) Ships in Gullmouth's quay stones (owner 2026-10-29: "ships still in the cobble at that port"): every hull berthed off the quay face, a planner pass floats any grounded hull to clear water, npm run ships checks all 28. Gulls animated (owner 2026-10-29): perched gulls look about, preen, stretch, and fly off and circle when you come close (game/Gulls.ts).
4d. **UI overhaul, polished AAA MMO** (owner 2026-10-29: "overhaul the ui, think polished triple a mmo, things like bag need work"): the bag first (a proper grid with slot frames, rarity borders and glow, stack counts, item-kind filter tabs, search, sort, a gold and weight footer, drag between bag and bank, tooltips with comparison to what you wear), then the character panel, the action bar and frames, the map, the journal and the shops, one visual language throughout (ESO/WoW/GW2 standard). Verify with screenshots at each step.
4f. PART DONE 2026-10-30 (weapons, shields and other held things are drawn from their own 3D model on the diagonal; armour on a plain mannequin framed on the part it covers; gloves stay painted; fifteen new painted shapes: book, scroll, map, bottle, jar, berries, egg, pie, vegetable, sheaf, gem, key, cloak, chair, stone block, picked by name where an item had a stand-in. Still: horses (58 halters share one shoe), trophies, tools and dyes their own shapes) **Every item its own icon** (owner 2026-10-29: "rings need to look like rings, nothing needs placeholder shapes, everything needs their own looks for each item type, set type etc, lots of fantasy and medieval variety"): today 33 painted shapes serve hundreds of items. Gear (weapons, armour by slot and set, jewellery) gets icons rendered from its own 3D model, lit and framed, cached; food, materials, tools, quest items and collectibles get many more painted shapes, one per kind of thing. Jewellery shapes (ring, pendant, earring, hoops, studs) done first, 2026-10-29.
4m. DONE 2026-10-29 The Packhorse's front door (owner: "the packhorse door is blocked"): the ground outside was a block above the taproom floor. An inn's floor is now never lower than its doorstep (data/lodgings.ts lodgeBase); the other four inns were already level.
4k. DONE 2026-10-29 Charter Post carts no longer turn round (owner: "the driver seemed confused and turned around a lot"): roadNet.route drops any point the way doubles back on (36 U-turns in 26 of 152 rides, now 0). Also npm run standing: nobody stands in a waymark, post box or prop (Wenna Hale was in the Waystation waymark; 11 others moved).
4g. Travellers' board at Hollin Ford (owner 2026-10-29: "add a sign in spawn with names of players in order who have played, exclude me"): by the Post, every player by their first played character in the order they came, the owner's accounts (DEV_ACCOUNTS) left off; server GET /api/travellers. Needs the server deployed.
4i0. (in progress) see 4i; the owner added: about 10 new songs with variation, drawing on Soule's GW1/Oblivion and GW2 (Divinity's Reach strings and horn calls, Norn fiddles and hand drums, Sylvari choir and harp, Lion's Arch shanty swing, Asura bells).
4j. PART DONE 2026-10-29 (skills: every skill a school with its own cast sound, data/skillSchools.ts + Audio.skillCast; dropping, unequipping, crafting start, revive and respawn, skill changes now sound). Still: footsteps per surface audit, foes' attacks per kind, UI panels and tabs, world beds. **Silent game sounds** (owner 2026-10-29: "lots of game sounds are still dead silent"): audit every action and event for a sound (UI open/close/tabs, bag moves, equip, crafting each station, gathering each kind, doors, chests, mounts mount/dismount and hooves, swimming, footsteps per surface, levelling, quest steps, skills and their hits, harms, foes' attacks and deaths per kind, the world: forges, mills, crowds, birds) with a script that lists every action without one; then give each its own synthesized sound.
4i. **Music with Soule's variety** (owner 2026-10-29: "make sure the music also has different sounds like jeremy soules music, in guild wars and elder scrolls it can be peaceful but not always the same drawn out sounds"): new voices in the orchestra (harp and lute plucks, pizzicato strings, staccato strings, oboe, clarinet, piano, timpani, frame drum, bells, glockenspiel) and arrangements that change texture section by section (arpeggios, ostinatos, a solo line over a light bed, rhythmic pulses, call and answer, swells), so a piece stays peaceful but never one long held pad. Render clips before and after for the owner.
4h. PART DONE 2026-10-29 (rooms in all four group dungeons, data/rooms.ts + game/Rooms.ts: levers in three styles, plates, keepers, waves; portcullis, brass, hurdle and ice gates; a chest each; shared in group runs. Still: a carry room and a gauntlet, one room per delve and a signature move per champion, keys and fragments, corrupted runs, the Kiln's Heart raid) **Deeper delves, dungeons and raids, Wynncraft-inspired** (owner 2026-10-29: "take ideas from wynncraft for delves and dungeon ideas even raids maybe, right now they feel shallow"): study what each delve and dungeon is today, then give each its own rooms with their own mechanics (puzzles, levers and plates, timed objectives, waves, parkour, a carried thing, an arena), mini-bosses, a room chest each, and a boss with phases; entry keys made from fragments found in the region; a corrupted (hard) version of each dungeon with its own key and better loot; dungeon-only gear; and the first raid (four players, challenge rooms with team objectives, a buff chosen between rooms, a phased final boss, raid-only rewards). Design doc first (docs/DELVES.md), then build dungeon by dungeon.
4l. (PLAN WRITTEN 2026-10-29: docs/STORY_PLAN.md. ACT I DONE 2026-10-29: five new chapters, A Witness, The Surveyor's Girl, Forty Feet, The Toll Riders, First Camp, in content/actOne.ts; story set pieces (game/SetPieces.ts); the name clashes renamed. ACT II DONE 2026-10-30: Ilse's Log, The Nine's Way, Second Camp in content/actTwo.ts. ACT III DONE 2026-10-30: Half a Purse (Tam joins) and Third Camp in content/actThree.ts; dialogue lines can now be spoken by someone else in the scene (DNode.as). ACT IV DONE 2026-10-30: Who Tam Writes To, Ursel, Fourth Camp (the Speaker's hand on the first page) in content/actFour.ts. Acts I to IV now 35 chapters. ACT V FIRST HALF 2026-10-30: The Ones Who Walked, A.P. Again, The Gatekeepers' Rolls, Callis Lends the Black (XXXVI to XXXIX) in content/actFive.ts. Next: Act V's second half (Wat joins, the fells at night, the postern and Ursel, the siege, the kneeling rise, Fifth Camp)) **The main story at GW2 / WoW / ESO length, with real weight** (owner 2026-10-29: "okay i like the main story, lets aim for gw2 / wow main story length even eso could be used for length lets make it have emotion, companions you grow to love, wrong turns, unexpected losses, etc. bioware / cd projekt red triple a writing"). Today: 22 chapters over three acts (Hollin Ford to the Drowned Parish). Target: around 100 to 120 chapters over eight to ten acts, the length of GW2's personal story or a WoW expansion's campaign, carried across both continents and into continent 3. Plan first, in docs/STORY_PLAN.md, for the owner to read before the writing: the whole arc act by act; the companions who travel with you (each with their own want, their own quest line, approval that changes how they speak to you, and a scene that pays it off); the wrong turns (the party trusts the wrong person, a choice made in good faith makes things worse, a victory that costs more than it saves); the losses (a companion who dies and stays dead, a town that doesn't get saved, a mentor who turns out to be wrong); choices that change later chapters; and the cutscene beats. Then write and build it act by act, each act tested in game end to end, in the voice of docs/NARRATIVE_STYLE.md and canon in docs/LORE.md. Order: the plan right after the Old Man's Workings rooms (4h, first slice), then one act at a time alongside the list.
4e. Sea sound rebuilt (owner 2026-10-29 "enhance sounds near the ocean, less static sounding"): this round; owner to listen to sea-old/sea-new.
5. **Gullmouth overhaul, the rest** (set pieces on the quay done: the Jawbones, the Drowned Board, the fog bell, the Boat Stone, Ansel's bench) (owner 2026-10-24: "lots of it is messed up or bare bones"): every
   street and lane detailed, castle interior, terraces dressed, warehouses, NPC life on the quays.
6. **Quests toward ~1000** (owner 2026-10-24), Witcher 3 / SWTOR / WoW / ESO / Wynncraft variety. 146 on
   2026-10-29. Every region densified; thinnest now: Inkholm, the Keys, Kell, Saltpenny, the Sunder,
   Hollow Fell, the Counties' outer towns. Play a sample of each batch in game, not only the walker.

6b. **HUD refinement brief** (owner 2026-10-29, for after the list above): docs/UI_BRIEF.md, word for word. Chat and combat log panel, XP bar and level badge, quest tracker hierarchy, hotbar states and cooldowns, minimap and frames; a refinement, not a redesign; test every piece in game (bright day, night, rain) and report honestly. This is the HUD half of 4d; 4d keeps the bag and the windows.

6c. **The Endless Tower** (owner 2026-10-29, "do this after ui"): docs/TOWER_BRIEF.md, word for word. A Swordburst 2-style tower in a major city: endless generated floors in brackets, elites every 5, bosses with real mechanics every 10, arena themes, encounter types, checkpoints, tower-only gear and cosmetics, a token vendor, milestones, dailies and weeklies, server-validated records and leaderboards, party and guild runs, its own HUD; built into the existing combat, items, party and save systems; tested on a local realm and reported honestly.

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
