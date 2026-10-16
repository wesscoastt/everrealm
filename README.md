# Everrealm

A browser fantasy RPG that pairs voxel world geometry with storybook fantasy art direction. It's set on a streamed continent about 2.8 km across, ringed by sea, with six regions. You can play it alone in the browser, or online on a world server with an account that carries your characters between devices. The long-term target is a persistent MMORPG.

**Play it:** https://wesscoastt.github.io/everrealm/ (works on a PC, and on a phone or tablet with touch controls).

## Run it

```bash
npm install
npm run dev        # http://127.0.0.1:5188  (add ?debug for an fps/draw-call readout)
npm run build      # production build in dist/
npm run quests     # play every quest headlessly down every branch; fails on dead ends, broken links, style breaks
npm run quest-book -- greenwake   # review page for a region's side quests (after npm run quests)
npm run sites      # placement check: everyone and everything quests rely on stands on open ground; fences are solid
```

You need a browser with WebGL 2. Progress saves to `localStorage` in that browser: up to six characters, each with its own save.

### Playing online

```bash
npm run server     # world server on http and ws://127.0.0.1:8787 (set HOST=0.0.0.0 to accept other machines)
```

Then open the game with `?online` (for example http://127.0.0.1:5188/?online), or with `?server=ws://host:port` for another server. `?offline` forces offline play. A build made with `VITE_REALM=wss://…` connects to that realm by default (the hosted game does this once a realm is set up; see "Deploying"). Any other build stays offline and never opens a socket unless asked.

**Accounts.** On an online realm, the character screen's realm panel has *Sign in or create an account*. An account is a name (3 to 20 letters, digits or _) and a password (8 or more characters). The server stores the password as a salted scrypt hash, never in plain text.
- Signing in on another PC or a phone brings that account's characters down into the browser.
- Characters only that browser has go up to the account.
- Where both have a copy, the one played longer wins.
- While you play, the game sends your character up every 15 seconds and when the tab closes.
- Deleting a character deletes it from the account too.
- An account holds up to six characters.

Online, you see everyone else on the server moving about, with nameplates and dots on the map and minimap. Press **Enter** to chat. The server keeps a copy of your character in `server/data/characters/`: it receives a copy whenever the game saves (at most every 10 seconds) and when the tab closes. If the server's copy is further along than this browser's, the game loads it. A name belongs to the account that has it. For a player who never signed in, it belongs to the browser that first used it on that server, which keeps a secret token for it. Signing in claims that browser's characters for the account.

To hear the score without playing, open `/music-preview.html` on the dev server. It renders each theme offline and saves a WAV file to `previews/`.

## Controls

| Input | Action |
| --- | --- |
| WASD | Move, relative to the camera |
| Mouse drag | Turn the camera |
| Mouse wheel | Zoom |
| Shift | Sprint (uses energy) |
| Space | Jump |
| Click or 1 | Strike (three-hit combo) |
| 2 | Cleave |
| 3 | Second Wind |
| Q | Dodge roll (you can't be hit while rolling) |
| Tab | Target the nearest enemy |
| E | Talk, gather, use a station, take the Charter Post, or pull in a bite |
| F | Eat |
| B / I | Pack |
| K | Skills |
| J | Journal |
| M | Map |
| Esc | Close windows, or open the menu |
| Enter | Chat (when playing online) |

**Touch screens** (phones and tablets; the controls appear on the first touch):
- Put your left thumb down anywhere on the lower left of the screen to make a movement stick there.
- Drag anywhere else to turn the camera, and pinch with two fingers to zoom. A tap is a click.
- The buttons by your right thumb are **Jump** (hold it to swim up), **Use** (talk, gather, open), **Run** (on/off) and **Target**. **Dive** appears while you're swimming.
- Tap the action bar for abilities and panels, and the interaction prompt to use what it names.
- The world map pans with a finger and pinches to zoom; tap to set a waypoint, and tap it again to clear it.
- The layout fits a phone held either way, though sideways gives you more room.

## The world

The continent fills a square of 2816 × 2816 blocks, which is about 8 km² at 1 m per block. It runs from −384 to 2432 on each axis and is 96 blocks tall.
- **Coast:** a smooth, ragged shore with capes, bays, peninsulas and a south-east gulf, with sea all the way round.
- **Shore:** shelving beaches and cliffs, with a coastal range standing back from the sea.
- **Regions:** they blend into each other along warped borders, and the vale's roads run out through passes into the rest of the map.

| Region | Levels | Character | Places |
| --- | --- | --- | --- |
| Hollindale | 1–7 | Authored starting valley | Hollin Ford, Sallow Pit, Spill Falls, the Lantern, Gorse Mill, Haverwood |
| Turnpike | 5–12 | Rolling farmland and the trade road | **Ansbury**, the capital. The old walled town round its keep holds the Charter Hall, the Charter Market, the Toll Office, the Weighhouse and an inn. Round it is a much larger walled New Town of four wards:<ul><li>**Guild Ward:** guildhall, clock tower, fountain.</li><li>**Tilt Ward:** a tilt-yard.</li><li>**Minster Ward:** a cathedral-sized minster with a spire, on the Charter Green.</li><li>**The Shambles:** a covered market.</li></ul>Between them run streets of terraces, shops and inns, many of which you can walk into. Also Cotter's End and the Waystation. |
| Hagworm Wood | 10–16 | Giant-tree forest, the Wend's ravine, Peg's Water lake | The Hollow Oak, Ketley Arches, Fellers' Camp |
| Fleet Coast | 12–20 | Cliffs, beaches, sea stacks and open sea | **Gullmouth**, a harbour town with a high street, market cross, chapel and tower, quay warehouses, a fish market, a breakwater with its light, jetties and boats. Fleet Light, the Gannet's Wreck |
| Raddle Barrens | 16–24 | Terraced red mesas, canyons, the Rill | Harrowgate Works, with a palisade and a mine drift, and Company Row, its company town (cottages, a meeting hall, a smelter stack, slag heaps); Gallows Knap fortress |
| Scarth Highlands | 25–35 | Peaks to y 90, snow, basalt, star crystals | Scarth Watch observatory, Glass Kirk, the Weatherholms, Kelderby |

**Second visual pass:** the Hollow Oak is a flared, buttress-rooted trunk with letters pinned up its hollow, candles, offerings and ribbons; the Gannet's wreck has planked strakes, exposed ribs, a snapped mast with rigging, cargo up the shingle and gull rocks; Hale's Fold has a coped drystone fold with a creep hole, hay rack, hurdle gate, peat stack and field walls; the Weatherholms trail roots and carry a ring of columns, an arch and crystal. Nights are moonlit rather than black, and the nearest eight lamps, lanterns and fires cast real light (interiors included). Roofs have a closed attic, so there is no gap under the eaves. Swimming works like Guild Wars 2: front crawl and treading water, diving with C or by looking down, holding depth, underwater fog. Gear is horizontal (equal power budgets, regional sets, an armoury in the pack). The interface has its own night-blue and gilt theme; the minimap zooms and can turn with the camera; the world map (M) pans, zooms, has a legend and takes a waypoint.

The map also has about 50 scattered points of interest, plus regional ore seams, trees, fishing water and creatures: wayside shrines on stepped platforms, round ruined watchtowers you can walk into, stone rings with lintels, travellers' camps, drift mines cut into built-up hills with spoil heaps and tool sheds, ruined compounds, star-fall craters, and farmsteads with barns, fenced fields of wheat and haystacks. Sea stacks off the Fleet coast are wave-cut and tapering.

**How it runs.** The continent is stored and loaded in chunks:
- **Chunks.** Each chunk is 32 × 96 × 32 blocks. Generation and meshing happen in Web Workers. Chunks within the view distance (6 by default, adjustable from 4 to 10) are loaded; the rest are dropped.
- **Speed.** Measured in the worker: about 29 ms to generate a chunk and 5–9 ms to mesh one. A 650 m teleport becomes playable in about 4.5 s.
- **Far terrain.** Beyond the loaded area, a stepped low-resolution mesh of the whole continent fills in. Big landmarks have simple stand-ins until their chunks arrive.
- **Map.** The world map and minimap paint in as you explore, and the explored area is saved.
- **Code.** The terrain functions are in `src/world/terrain.ts`, the settlements in `src/world/sites.ts`, and the streaming in `src/game/ChunkManager.ts`.

## Out in the world

These are things to find and join while exploring, in the spirit of Guild Wars 2 and The Elder Scrolls Online. They show on the minimap and world map, and an event tracker appears while you're in one.
- **World events (12).** Dynamic events start when you're nearby: wolves on the Lantern ridge, a mire bloom in the Wetlings, wolves on the drove road, stalkers round the Fellers' Camp, crabs on the strand, and more. Each runs in waves against a timer and pays out a gold, silver or bronze medal by your share of the work.
- **World bosses (4).** Bramblemaw, the Tidewright, Cinderhorn and Rimeglass each rise in their own lair on a shared real-time clock:
  - Each rises every 30 minutes, staggered, with a 3-minute warning on the map and in chat.
  - A boss stays up for 10 minutes. It cracks the ground in a ring you have to leave, and calls in adds at two-thirds and one-third health.
  - Kills pay out regional gear.
- **Shardfalls.** Every six minutes a star shard comes down at one of six grounds in the south. You fight what crawls out of it in three waves for a crystal reward.
- **Public dungeons (2) and delves (6).** These are underground halls with packs of enemies, named champions and a chest that refills every half hour. The public dungeons, Mortlake Cellars and the Black Cut, are deep and wide. Delves, such as Badger Holt, Withy Culvert and the Cold Seep, are short.
- **Vistas (8).** Viewpoints on headlands and summits. Reach one and the camera sweeps round the view; the first visit pays out.
- **Townsfolk.** People walk the paved streets of every town, about thirty in Ansbury and a handful in a hamlet. They stop to look about, step aside for you, and sometimes say something as you pass. Most have gone indoors by night.
- **Wonders (6).** Places to stumble on: the Weeping Stair, the Kelpie Arch, the Stone King (a colossal crowned statue), the Drowned Bell-tower, the Kingfisher Steps and the Great Starfall crater.

## The score

The score is original orchestral music, synthesised live in Web Audio (`src/systems/music/`):
- **Instruments:** string ensemble, a choir built from vowel formants, horns, flute, harp, celesta, timpani and taiko, all in a convolution-reverb hall.
- **Themes:** title, Hollindale, Hollin Ford, Turnpike, Hagworm Wood, Fleet, Raddle, Scarth, night and underground. Each is a modal theme with long, quiet pads between melodic statements.
- **Adaptive behaviour:** the music crossfades as you change region or the time of day changes. A separate combat layer swells in when something is hunting you and ducks the exploration music under it.

## What's in this build

| Area | What works |
| --- | --- |
| Look | Authored roofs with upturned eaves, dark-trimmed fascias and barge boards, half-timbered gables with lit attic windows, dormers on the larger houses, and thatch laid in courses under a rolled ridge. Rounded-box characters with painted faces, swaying leaves and grass, flower drifts, stylised water with shore foam, falling water, day/night with stars and lit windows, and chimney smoke. Blocky clouds in two layers drift on a slowly veering wind and fade out at the edge of the sky instead of popping in. Hollin Ford is one cobbled street on both banks of the Wend, with six more houses, door paths and fenced kitchen gardens.<br>**Interiors:** every house can be walked into through an open door: plank floors, stairs to upper floors, and furniture laid out for what the building is (homes with a hearth, table, dresser and beds; inns with a bar, tables and guest beds; shops, offices, workshops and stores), lit by hanging lamps. Furniture is solid, and so are fences. Chimneys stand in the gable ends. The settlements have yards, carts, sheds, paddocks, gardens and stacks of logs and hay. |
| Menus | **Character select** is the main menu: up to six characters per browser, each shown with a face, origin, total level, region and play time. The selected character stands in Hollin Ford's square. Enter world, create, and delete (you type the name to confirm). A realm panel shows offline or the server you're connected to, checks whether it answers, and switches realm. Also What's new, Settings and Credits. Keyboard: arrows to choose, Enter to play. |
| Character | Full-screen **creator** with tabs for Origin, Face, Hair, Body and Outfit. You can drag to turn the model, switch between full-body and face views, and randomise. **Origins:** Cotter's End (+10 marks), Gullmouth (Fishing 5), Harrowgate Works (Mining 5) or Fellers' Camp (Woodcutting 5). **Appearance:** 8 skin tones, 5 hair styles in 10 colours, age, beard and lashes, build and height sliders, and outfit colours with headwear and shoulder pads. Name suggestions; names are checked for length, letters and duplicates. |
| Intro | A new character sees a 40-second letterboxed arrival: Spill Falls, down the Wend to Hollin Ford, the empty bell frame, Sallow Pit, then the square. The captions include a line from the character's origin. Space or Esc skips. Data in `src/data/intro.ts`. |
| Combat | Real-time three-hit combo, Cleave, Second Wind, and a dodge roll with i-frames: a dive, a tuck, one tumble over the shoulders and up through a crouch, kept in contact with the ground for every build and height. Enemy attacks are telegraphed (lunge, slam, charge), with hitstop, damage numbers, loot, death and respawn. |
| Enemies | There are fourteen kinds, with each region's creatures at its own level band. Hollindale has the vale wolf, Old Notch (elite), the mire jelly and the rustback. The other regions add the hedge boar, Turnpike wolf, thornback stalker, spore jelly, tide crab, brine jelly, dust wolf, redback, frost wolf and shard jelly. Settlements are kept clear of them. |
| Skills | Mining, Smithing, Fishing, Cooking, Woodcutting and Melee, levelling 1 to 100. Higher tiers come from the wider world: iron ore, star crystal, elder oak, mackerel, sea bass and frost char, plus iron tools and an iron longsword. |
| Main story | **The Charter's Debt**, six chapters:
<ul><li>Starts at the Charter notice by Ansbury's south gate.</li><li>Runs through Ketley and the Hollow Oak, the **Gallows Knap undercroft** (a two-level dungeon with the Rust Queen as its boss), Scarth Watch and the Glass Kirk.</li><li>At the Kirk, the ground lifts under you, and you fight Old Glass in the open cut.</li><li>Ends at a Charter hearing in Ansbury with three endings that change tolls, the lighthouse's oil and Sallow Pit.</li><li>Each chapter opens with a title card. Story conversations are letterboxed, story quest-givers wear a blue marker, and the journal lists the story first.</li></ul> |
| Side quests | **Hollindale: 20 side quests** (batch 1 of the side-quest program): two storylines (*The Third Item*, about the Pit lease and the failing bridge; *Three Winters*, about Old Notch), six quests with choices, and nine short jobs. Ten new villagers and a working notice board in Hollin Ford.<br>**Turnpike: 20 side quests** (batch 2): three storylines (*Tanners' Row*, three parts, about the Gisborne foundry; *The Company Cart*, three parts, about Davy Tannet's slate at the company store; *The Lamp Round*, two parts, about the drove-road shrine lamps and the old toll-keeper), five quests (a page cut from the gate book, Osric's granddaughter and the morning Post, the Michaelmas trial of the weights, Bess Tull's dropped post, the Askew barley) and seven short jobs, one of them hidden. Fourteen new people across Ansbury, Cotter's End, the Waystation and the farms, and a notice board on the Charter Market.<br>Content lives in `src/data/content/`, one module per region. |
| Story | **Hollindale:** **The Ford Bell**, a multi-stage quest with a ledger clue and four outcomes that change rewards, dialogue and the journal; **Sulking River**, a small side quest; two hidden finds. **Ansbury:** **Honest Weight** (two outcomes). **Gullmouth:** **The Gannet's Log** (three outcomes). **Harrowgate Works:** **Posted Rate** (three outcomes), which picks up the Ford Bell thread through Mr Pryce. **Fellers' Camp:** **Calling Timber** (three outcomes). **Kelderby:** **The High Pasture** (three outcomes). Twenty NPCs beyond Hollindale, seven shops with their own stock and buy rates, and documents to read in the world. |
| Online | An optional world server (`server/server.mjs`, Node and `ws`) with accounts, presence, chat and server-kept characters. See "Playing online" above. |
| Travel | The **Charter Post**: a cart between eight stops (Hollin Ford, Ansbury, the Waystation, Fellers' Camp, Gullmouth, Harrowgate Works, Kelderby, Glass Kirk). Each stop has a signpost. You can ride to any stop you've visited; fares run from 7 to 40 marks by distance, and the trip takes 1 to 8 in-game hours. Stops show on the world map. |
| UI | "Hearthwood" HUD built from the world's own materials (see [docs/ART_DIRECTION.md](docs/ART_DIRECTION.md)). |

Writing standards and canon are in [docs/NARRATIVE_STYLE.md](docs/NARRATIVE_STYLE.md) and [docs/LORE.md](docs/LORE.md).

## What was tested, in the running game

- **Streaming:** I visited Ansbury, Gullmouth, Harrowgate Works, the Weatherholms, the Hollow Oak and Hollindale's east pass. At each one I checked:
  - that chunks loaded
  - that the region was detected and its banner appeared
  - that the music theme switched
  - that the place was there and looked right, by screenshot
- **Draw calls:** 176–230 in the world, with 440k–560k triangles. These were measured in the small browser pane, not on a target machine.
- **Quest:** The Ford Bell, played end to end through all four outcomes.
- **Turnpike side quests:** every new person (including the ones who only appear after a choice) and every search spot was checked in the running game for its place on the ground. *Page One Hundred and Twelve* was played end to end. The quest walker plays all 53 quests down every branch with no errors.
- **Score:** every theme and the combat layer were rendered offline and checked for level and frequency balance: peaks 0.3–0.8 with no clipping, RMS between −19 and −27 dB.

## Not done yet

- **No mounts.** The Charter Post covers the settlements; between them, and for places off its roads, you walk.
- **Multiplayer is presence and chat only.** Other players are visible but nothing is shared: each player has their own ore nodes, enemies and quests, and you can't trade, group or fight together. The browser is still the authority for inventory, skills and quests. The server only checks a save's shape and size before storing it, so a modified client could send anything.
- **Accounts are simple.** There's no password reset or email, and a realm's accounts live in its own files (`server/data/`).
- **Events, bosses and dungeons are per player.** Other players are visible at them, but each browser runs its own copy of the fight.
- **Later milestones:** housing, guilds, the marketplace, banking, farming and herbalism aren't built.
- **Score quality:** the score is synthesised, not recorded. It has the shape of an orchestra but not the tone of real players.
- **Phones:** touch controls work, but heavy scenes, such as Ansbury's New Town at a long view distance, are slow on older phones. Lower the view distance and render scale in Settings.

## Deploying

The game is a static site, and the world server is a small Node process. They're hosted separately.

**The game, on GitHub Pages.** `.github/workflows/pages.yml` checks the sites, builds the game and publishes it to Pages on every push to `main`. It sets the build's base path to the repository's name. In the repository, *Settings > Pages > Source* must be *GitHub Actions*.

**The world server, on Render** (or any host that runs Node or containers and allows WebSockets).
1. On render.com, choose *New > Blueprint* and pick this repository. `render.yaml` sets up a web service that runs `node server/server.mjs`, with a health check on `/health`.
2. Choose a plan. The free plan sleeps after 15 idle minutes and takes about a minute to wake when someone connects. It also forgets its files on every restart, so accounts don't last. For a lasting realm, use the Starter plan, uncomment the disk in `render.yaml`, and set `EVERREALM_DATA` to a folder on it.
3. On GitHub, add a repository variable under *Settings > Secrets and variables > Actions > Variables*. Name it `VITE_REALM` and set it to `wss://<your-service>.onrender.com`.
4. Re-run the Pages workflow. The hosted game then connects to that realm by default.

The `Dockerfile` runs the same server on Fly.io, Railway or a VPS. Mount a volume at `/data`.

## Next milestone

**Milestone 2** has two strands:
- **People:** the side-quest program: about 250 to 300 side quests across the six regions, in region-sized batches, each checked by an automated quest walker.
- **Infrastructure:** move authority to the server, starting with inventory, skills and gathering nodes (the server decides what you mined, not the browser). Then accounts, shared enemies and nodes, trading and groups. Mounts for the open country between post stops.
