# Everrealm lore record

This is the canon reference. Anything written into the game must agree with it. When the game establishes a new fact, add it here.

Status markers: **[in game]** means the fact is visible or playable in the current build. **[planned]** means it's reserved for later and nothing in the game contradicts it yet.

## Names changed 2026-10-29

Four Wennas and two Mauds were too many. The companion keeps **Wenna Hale**. The Kelderby shepherd is **Tressa Hale**, Wenna Rowse of Gillsby Staithe is **Kerra Rowse**, Wenna Kitto of the Tinners' Arms is **Senara Kitto**, and Northgate's Gatekeeper is **Ursel Hale**. Save flags and ids are unchanged.

On 2026-10-30 every first name shared by three or more people was thinned to two at most, and the main cast's names made their own: Lewin Feld (the company store, was Tam), Lorne Rush, Bridget Abney, Isot Pike, Andreu Sabater, Noll Bracken, Pasco Polgrain, Jabez Thackery, Matthias Garrow, Caleb Hollis (the old toll tower, was Wat), Jenkin Kemp, Barnaby Coombe, Ewan Skene, Perran Truscott, Thomasina Penhale, Keziah Mardle, Philippa Pruett, Rosina Treloar, Hulda Strake, Cyprian Vosper, Brenna Carse, Prue Fettle, Tristram Kitto, Enoch Brock, Damaris Corlett, Barty Rudd and Jethro Wren. Wenna's father is Elwyn Hale. `node .walker/_names.mjs` (scripts/_names.ts) lists any first name shared again.

## The wider world

- **The Charter Counties.** A set of regions bound to the city of **Ansbury** by trade charters rather than conquest. Each county keeps its own reeves and customs. Ansbury collects tolls on the Turnpike and settles disputes nobody else wants. When a city office fails, the Charter can put it out to tender, and Harrowgate & Daughters bids on everything. [in game]
- **Money.** The coin is the **mark**: a small copper-silver disc stamped with a road sign. Prices in Hollindale are quoted in marks. [in game]
- **The Charter Post.** Carts licensed by the Charter run between the settlements on its roads, stopping at a signpost marked CHARTER POST. Fares are set by the Charter: a mark to get on and a mark for every stretch of road. The cart goes at a carter's pace along the roads and through each town by its streets, and you ride the whole way, the country going by; it's slow and it's cheap, where a waymark is quick and dear (two marks and one for every eighty blocks, about five times the Post). Get off whenever you like. The island stops are by ferry (`src/game/PostRide.ts`, the roads and town legs in `src/world/roadNet.ts` and `src/data/postLegs.ts`, from `scripts/postlegs.ts`). Stops: Hollin Ford, Ansbury (outside the south gate), the Waystation, Fellers' Camp, Gullmouth, Harrowgate Works, Kelderby, and a pilgrims' stop at the Glass Kirk. The Post is why the Lantern's beacon line was given up. It does not run to Scarth Watch, the Hollow Oak or anywhere off the roads. [in game]
- **The Post's yards.** Every stop on the roads (but Hollin Ford, where the cart still stops by the old sign, and Conch, where there's no room) is a coaching yard beside its board: a stable block for the Post's horses with its doors to the road, a paved yard where the cart waits with its carter and a pair tied at the rail, hay, a trough and a lantern. In Morrow the Assembly runs the same carts from the same kind of yard (`src/data/postStations.ts`, placed by `scripts/poststations.ts`; `src/game/PostStations.ts`). The cart has benches for four behind the carter: you pay for your seat, and anyone can climb up beside you for nothing, so a cart going by often has company in it. Everyone sees the cart pass with whoever's riding (it travels as a mount, `postcart`). [in game]
- **The ferries.** Ships on a timetable that you walk aboard, each from jetties of her own, calling at every stop on her route there and back and lying alongside each for most of a minute; a bell when she comes in and again before she goes ("All aboard for Kell!"), and a board at every jetty with her timetable. Free: the Charter pays for them out of the harbour dues. **The Plover** runs north from Gullmouth to Kell and the Sickle; **the Wren** south to Skua Rock and Inkholm; in Morrow, **the Kittiwake** runs from Saltpenny Key to Callis and up the coast to Cold Harbour, and her mate won't carry anyone to Saltpenny or Cold Harbour without the Assembly's pass. The Mewstones ferry still runs her loop from Gullmouth's south jetty. From a Post stop not on a ferry's route, the Post takes you to her home port. Where she is comes from the realm clock, so everyone aboard sails together (`src/data/ferries.ts`, jetties and courses from `scripts/ferries.ts`; `src/world/Ferry.ts`). [in game]
- **Letters by the Post.** The carts carry the mail as well as passengers. A post box painted the Post's blue, with a brass slot and the Post's horn on its face, stands beside every Post sign; the clerks empty them at every stop, and any box will hand you what has come for you. Postage is a mark a letter and a mark for every parcel sent with it, up to six. A letter waits at the Post for thirty days; after that the Post sends back whatever was in it. A reader may send a letter back unopened, parcels and all, and the Post will carry it home free. `src/game/Mail.ts`, `server/mail.mjs`. [in game]
- **Mercy Haddow**, packwoman, has walked the same round of the Charter roads for eleven years with a pony and a second pack: a day each at Ansbury's south gate, the Waystation, Gullmouth and Kelderby (by the Post signs), on the realm's day. She buys treasure maps for a mark off people who won't dig and sells them for sixty, and will sell the pony that carries her second pack. `src/data/content/packwoman.ts`. [in game]
- **Pedlars on the long roads.** Six licensed pedlars walk the Charter roads with a pack pony each, town to town and back, and stop for anyone who wants to deal. What is in each pack changes from day to day. `src/data/content/pedlars.ts`. [in game]
  - **Ned Callow**, tinker, Ansbury to Gullmouth: picks, hatchets, rods, metal, and lockpicks always. Pays well for tools, metal and ore.
  - **Sabine Orrell**, spicer and draper, Hollin Ford to Kelderby: coast spice, wild garlic, chanterelles, Ansbury linen, rugs and candles.
  - **Jory Penhallow**, chapman, Harrowgate Works to Gullmouth: treasure maps from every region, instruments, now and then a hurdy-gurdy or a piece of star crystal. Once traded a harp for a goat outside Harrowgate.
  - **Abel Stott**, drover, the Waystation road west: ham, pies and beer for the road. Pays well for pelts and hides. Sells one beast only, his black fell pony, to anyone with five hundred and twenty marks.
  - **Gwen Tresize**, cider-seller, Kelderby to the Glass Kirk: cider, ale, pasties and tarts for the pilgrims, who drink water going up and anything coming down.
  - **Tobias Venn**, fur trader, out to Holme Staithe on the Wrath Levels: pays near full worth for pelts, hides, shells and trophies. The Ansbury furriers pay him less than he pays you.
- **Regions.** All six are in the streamed world: Hollindale, Turnpike, Hagworm Wood, Fleet Coast, Raddle Barrens and Scarth Highlands. Every region has people and at least one quest [in game]: Hollindale (Hollin Ford), Turnpike (Ansbury), Fleet (Gullmouth), Raddle (Harrowgate Works), Hagworm Wood (Fellers' Camp) and Scarth (Kelderby and Scarth Watch). Each region has its own work, food and grudges. There is no world-ending prophecy, and none should be added.

## Hollindale [in game]

A farming valley that feeds Ansbury. The River **Wend** comes out of the western hills over **Spill Falls**, pools in **the Spill**, then runs south-east through the village of Hollin Ford and on into the low fields.

### Places

| Place | Facts |
| --- | --- |
| **Hollin Ford** | The village where the old road crosses the Wend. A stone bridge replaced the ford forty-one years ago, but the name stayed. A cobbled street runs through it on both banks, with kitchen gardens behind the houses. Market days are every fourth day. |
| **The Ford Bell** | Hangs in a timber frame at the middle of the bridge. It gets rung when the Wend rises so the low-field farmers can move livestock. It cracked during the spring thaw and was taken down for recasting. |
| **The Low Water** | The inn. Named for the summer the river dropped so far you could walk across without wetting your knees. The hearth is open to anyone who wants to cook. |
| **Tolley's smithy** | Open-sided forge by the square. Furnace, anvil, quench barrel, and a workbench where Bram keeps his ledger. Bram casts every bronze bar to the even pound and stamps it with a hammer over a wave; Ansbury uses Tolley bars as a check weight. |
| **The Moot Oak** | The big oak in the square. Village meetings happen under it because the reeve's house is too small. The benches around it are where people wake up after a bad night. |
| **Sallow Pit** | Copper-and-tin mine in the hill north-east of the village. It was worked out in Maud's grandmother's time and **reopened this spring** by **Harrowgate & Daughters**, a mining partnership from the Raddle Barrens. Runoff stains the stream below it orange. |
| **The Spill and Spill Falls** | The pool under the waterfall. Good pike water. There's a dry hollow behind the falls that most villagers don't know about, with a thin silver vein and an eel pool. |
| **The Lantern** | A broken signal tower on the south-west ridge. It was built to pass beacon signals to Ansbury and was abandoned once the Turnpike got a courier post. Nothing dramatic happened there. Teenagers use it now, and lately so does a scarred wolf the farmers call Old Notch. |
| **The Wetlings** | Low fields south of the village that flood when the Wend rises. Mire jellies breed in the ditches. Farmers salt the ditch mouths every autumn. |
| **Gorse Mill** | The windmill on the western hill. Grinds for the whole valley. |
| **Haverwood** | The oak and birch wood east of the village. Wolves come down into it in lean years. Blasting at the Pit has driven more of them down this year. |

### Landmarks of the Ford [in game]

- **The old ford**, upstream of the bridge: stepping stones across the Wend, older than the bridge and the village, which is named for them. A notched black oak post on the west bank: when the water is over the third notch, ring the bell and wait.
- **The flood stone** at the bridge's west end: lines cut where the water came to, the highest THE BIG WATER. THE BELL RANG ALL NIGHT, the newest LAST SPRING, with a chalk mark above it and a question mark.
- **The moot stone** at the edge of the moot oak's shade, worn hollow where reeves stand to call the moot, every reeve's name cut round it; the last is MAUD ASHBY.
- **The village pump** by the square: BOIL IT. The Pit's runoff has been in the well since spring. M.A. Under it, in a child's capitals: TASTES OF PENNIES.

### Creatures

| Creature | Facts |
| --- | --- |
| **Vale wolf** | Grey-brown, lean. Hunts in pairs. Lunges after a short crouch. |
| **Old Notch** | A big wolf with a torn ear who dens near the Lantern. Elite. |
| **Mire jelly** | A clear, green, ditch-water creature. Hops, then slams down. Harmless unless you stand in the splash. Farmers hate them because they foul water troughs. |
| **Rustback** | A dog-sized beetle that lives in old workings and chews metal for the copper salts. It isn't hunting people; it bites when cornered and charges anything carrying fresh metal. Miners hate rustbacks because they ruin lamps, pumps and tools. |
| **Wildlife** | Deer and rabbits in the open country, sheep and chickens in the village. All of them flee. |

### People

| Name | Role | Wants | Won't admit |
| --- | --- | --- | --- |
| **Maud Ashby** | Reeve of Hollin Ford, fifties | The bell back up before the autumn rains | She signed the Pit lease without calling a moot |
| **Bram Tolley** | Smith, forties | To keep the forge | He sold the cracked bell's bronze to the Pit's buyer to cover his rent |
| **Nance Tolley** | Bram's niece and apprentice, fifteen | To be trusted with the anvil | She knows about the sale and is angry about it |
| **Pell Garrow** | Fisherman, seventies. Older brother of Sefton Garrow at Fellers' Camp | The river the way it was | His eyesight is part of why his catch is down |
| **Hesketh "Hesk" Dunmore** | Harrowgate & Daughters foreman at the Pit. Brother of Corrie Dunmore at Harrowgate Works; writes to her mostly about pumps | Rustbacks out of the upper gallery before they eat another pump | He thinks the village is right about the runoff |
| **Tamsin Pargeter** | Trader at the market stall, from Ansbury | A good margin and a dry stall | She's quietly buying Pit copper cheap |

### More of Hollin Ford and the vale (side quests) [in game]

Content is in `src/data/content/greenwake/`.

| Name | Role | Wants | Won't admit |
| --- | --- | --- | --- |
| **Ivy Marsh** | Eighty-three, the oldest in the vale. Her father ran the rope ford for thirty years before the bridge | To be asked | She has waited forty years to call a moot |
| **Ruth Ashcroft** | Runs the Ashcroft farm. Aunt to Dilly and Kit. Has fifteen ewes again, give or take | Old Notch dead | J.W. + R.A. is cut inside a heart at the top of the Lantern |
| **Gil Saxby** | Pit hand from the village. Spends fourthday's wages by fifthday. His wife Mag locks the door at midnight | A bench | He paid his debt to Tamsin in the Pit's copper |
| **Agnes Pole** | Keeps the Low Water. Her father opened it the autumn the Wend went low | Thirty plates on fourthday | — |
| **Cass Pudney** | Charcoal burner in Haverwood. Harrowgate buys her whole burn for the smelter on the Rill at twice Bram's price | Her rent | — |
| **Dunstan Hay** | Miller at Gorse Mill. Talks in weather | A brake pin | — |
| **Noll Bracken** | Keeps the Wetlings ditches. "Six is cows" | The ditch mouths salted | — |
| **Tobin Wether** | Joss's son, fourteen | To win a bet | — |
| **Elspeth Cole** | Shepherd, thirty sheep. A long, polite rivalry with Ruth | To count to thirty | She counts Ruth's strays as well |
| **Bess Tull** | Drives the Charter Post | — | Her horse won't do the Pit road |

**Facts the quests establish:**

- **The Pit lease.** Maud signed it on Lady Day without a moot: "Matter of urgency". It runs ten years at 40 marks a quarter to the reeve. The urgency is the bridge: its two middle piles are failing. The Ansbury mason quoted 120 marks, and the village had 31. The cracks are stained orange, because the Pit's runoff is eating the mortar. The moot that follows records `mootChoice`: `keep`, `end` (notice at the quarter) or `ponds` (the lease stands if Harrowgate digs Hesk's settling ponds by spring; Hesk digs regardless).
- **The ford post.** The iron post from the old rope ford is still in the shallows below the bridge.
- **Old Notch** dens under the fallen stones at the Lantern's foot. His front left foot is missing a toe, from Ruth's brother's trap. Ashcrofts nail a wolf's fang over the barn door; Ruth's grandmother had four. Once killed, Notch doesn't return.
- **Joss Wether's bench** was carved by his father, Jonas Wether (the same initials), for Jonas's brother Tam, who couldn't get home either.
- **Hens.** Duchess lays twice a week. `duchessChoice`: `truth` (Dilly feeds her every morning) or `spare` (Dilly isn't blamed, and Duchess goes in the pot).
- **Pit copper.** Gil paid his debt to Tamsin with it, a mark a sack. `copperChoice`: `hesk` (Gil is off the Pit and rolling barrels for Agnes), `quiet` or `tamsin` (Tamsin forgives the eleven marks and stops buying).
- **Pell's pike.** Sixty years ago, the summer of the low water, Pell hid a pike behind Spill Falls to keep it from Agnes's father, who wanted it for the inn sign. His creel is still on a ledge there.
- **Nance's work.** She signs it with a small W: the Gorse Mill brake pin, and the moot hall hinges Bram never started.
- **Corrie Dunmore** writes to her brother Hesk at the Pit. He reads her letters standing up.

### Events, in order

1. Spring thaw: the Ford Bell cracks. Maud has it taken down and sends it to Bram for recasting.
2. Spring: Harrowgate & Daughters reopen Sallow Pit. Charcoal prices double. Bram falls behind on rent.
3. Early summer: Bram sells the cracked bell's bronze to the Pit's buyer. He tells Maud the mould keeps failing.
4. Late summer, when the game starts: Maud is out of patience and the rain gauge is rising.
5. **The Ford Bell** quest resolves this. Outcomes are recorded under `quest.fordBell.choice`: `unaware`, `cover`, `confess` or `report`.
6. July: Mr Pryce breaks the bell into pigs and sells the three stone of bronze to Gisborne the founder in Ansbury for 45 marks. Gisborne casts the Weighhouse's new weights from it (see Ansbury below).

## The Old Man's Workings (group dungeon) [in game]

Behind the boarded door at the east end of Sallow Pit's chamber. For four players; the Group Finder (key P) makes up a group, and henchmen fill the places nobody takes. The halls are in `src/world/sites.ts` (`buildOldMan`), the fights in `src/data/dungeons.ts`.

- **Number Four** gallery was shut after the roof came in at Candlemas. Hesk Dunmore boarded it himself. Since then six lamps have gone from the lamp room and the carts have weighed light every fourthday.
- **The old man** is miners' talk for workings older than anyone's records. Number Four broke into one: walls black from fire-setting (fires lit against the rock to crack it), copper still in the walls, and a tally cut in fives on the east wall by whoever worked it first. Nobody in the game says who that was.
- **Coll Bray** worked Number Four at night with a crew of two, sorting ore by hand with no company stamp. Hesk let him go at Michaelmas for drinking on shift.
- **Old Sump**: the pumps have been off since Candlemas, the water has come back up, and a mire jelly has grown huge in it.
- **Verdigris**: a rustback the size of a cart, green right through from eating nothing but copper. Rustbacks eat metal (Hesk, from the start of the game); this one ate a seam. Its young nest in the walls.
- After a clear, Hesk tells the company Number Four is flooded ("It very nearly is") and gives the player a pit lamp cap. Flag `heskN4Done`; clears are counted in `gdClears:gd-oldman`.
- **Rooms** (`src/data/rooms.ts`, run by `src/game/Rooms.ts`): stretches that shut behind you with a portcullis until they're done, each with a chest. **The lamp room**: four lamp hooks, lit in the order on the shift board by the ladder (the day men, the night men, the boys, the foreman: second, fourth, first, third hooks), signed H. Dunmore; under it in pencil, "and wakes whatever is eating the props". A hook lit out of turn puts the rest out and brings two rustbacks. **Number Four's end**: the night shift's lookout has the grille's key on his belt. **The hatchlings' drift**: three worn flagstones, the night shift's plates, each staying down a little after you step off; all three down at once lifts the grille to the old man.

## Under the Kettle (group dungeon) [in game]

Behind the crack in the north wall of the Kettle (the crater where a star came down, in Scarth). Levels 28 to 32. Halls in `src/world/sites.ts` (`buildUnderKettle`), fights in `src/data/dungeons.ts`.

- **The fold.** Kelderby folds its ewes in the crack every winter, behind hurdles. **Nia Prosser** keeps them there. At Martinmas nine went in one night with no blood at the hurdles.
- **Brack**: a grey wolf the size of a pony that leads the pack laying up behind the fold.
- **Millstone**: a graniteback the size of a cart in the seep, where the ice has grown into glass. It chews the crystal.
- **The Glim**: Nia's gran's name for the light at the bottom of the crack. A jelly grown in the crystal that came down with the star; pieces of it go on living when they break off. Nia's gran said the star was still down there and the light was it breathing. Nobody in the game says whether that's true.
- The dungeon's set is **the Fold** (Kelderby fleece, Brack's-pack hide, Kettle-glass plate, the fell knife and the shepherd's hood). Clears are counted in `gdClears:gd-kettle`.
- **Rooms.** **The wolves' den**: the shepherds wedged hurdles across the north passage to pen the wolves in; you hold the den through three waves of the pack (one wolf wears a shepherd's collar bell), then pull the hurdles down. **The singing drift**: ice has grown across the way down to the heart. Four glass pillars of different heights stand in the drift; struck from the tallest to the smallest, the ice rings back and cracks. Scratched in the ice wall by **Dai Prosser** (Nia's grandfather), one Michaelmas: "Took us four goes." A wrong note brings shard jellies up through the floor.

### Henchmen

Hesk's four regulars, who go down anywhere for a day's rate. Whoever's free comes: a tank, a healer, then Bet, then Tom.

| Name | Role | Voice |
| --- | --- | --- |
| **Osgood Mason** | Quarryman; holds the front | Few words. "On me." |
| **Edith Leach** | Bonesetter; heals, and gets people up | Brisk, scolding. "Hold still." |
| **Bet Pascoe** | Pick-hand; knows the Pit | Hard, practical. "Mind your heads." |
| **Tom Fowler** | Bird-catcher | Young, quick, talks too much. "Did you see that?" |

### The Lamp Company [in game]

Hesk's regulars, and the people who book them, call themselves the Lamp Company: delvers who go down where other people won't, for a day's rate and a story. They post one **pledge** a day (a dungeon to clear, the dungeons taking it in turns) with **Thomasina Penhale** at Ansbury's south gate and **Xisca Mir** by the Callis post. Cleared, the pledge pays **Lamp keys** (twice as many on veteran); the day's first **random dungeon** from the Group Finder pays the Company's bonus and a key too. Keys buy any piece of any dungeon's set from either clerk (`src/data/pledges.ts`, `src/data/content/pledges.ts`).

## The bell bronze, start to finish [in game]

The thread that ties the first four quests together. Every step is something the player can read or be told.

| Step | Fact | Where the player learns it |
| --- | --- | --- |
| 1 | Bram Tolley sells the cracked Ford Bell, 3 stone, to Mr Pryce for 31 marks | Bram's ledger; Pryce |
| 2 | Pryce breaks it into pigs and sells it to Gisborne, Tanners' Row, Ansbury, for 45 | Pryce; Pryce's purchase book |
| 3 | A Harrowgate cart brings it through Ansbury's south gate in July, signed for by A. Pryce | Corporal Strake's gate book |
| 4 | Gisborne casts the Weighhouse weights from it for 12 marks, against the 20 the city allowed. Bell metal poured fast comes out porous, so the weights are light and every load reads heavy | Osric Penhallow |

## Turnpike: Ansbury [in game]

The walled Charter city. The keep is at the centre, the Charter Market is on the keep steps, and the south gate takes the Turnpike.

### Places

| Place | Facts |
| --- | --- |
| **South gate** | Tolls are posted on a board outside. Corporal Strake writes every load into the gate book: "who, what, how much, and whose cart". |
| **Toll board** | Turnpike tolls by Charter, plus the **Light Fund** levy of one mark in twenty, which pays for Fleet Light's oil. Someone has chalked SCALES READ HEAVY under it. |
| **The Weighhouse** | Weighs every load coming up the Turnpike; tolls are charged by the stone. The scale is checked against the sealed **Ansbury stone** in the keep, last at Lady Day, next at Michaelmas. Its new set of weights was cast in July. |
| **The keep and the Charter Hall** | The keep stands in its own flagged square at the centre, where the four streets meet. Its ground floor is the Charter's hall: pillars down both sides, long tables for a sitting, a carpet to the Speaker's chair on a dais between the two north towers, hearths on the side walls. |
| **Charter Market** | Stalls on the keep steps and the square below them, with the market well and the market board. Everything sold there has paid its toll. |
| **Tanners' Row** | The south-west quarter. The Gisborne foundry is here, the yard with the cold chimney, and a physician. |
| **Market board** | A notice board on the Charter Market, by the well, for jobs and the Weighhouse's notices. |
| **Toll Office** | Collects the Turnpike tolls and the Light Fund. A stone building in the gate yard, with its table set out inside the south gate. |
| **The town** | Terraced houses line every street; the four quarters are lanes of back-to-back rows, with an inn on the corner of the keep square. The Weighhouse is the large stone building on the boulevard south of the market. |
| **The monuments** | Each stands once, in a square of its own, with a plaque to read (`src/data/monuments.ts`): the Nought Stone that every Charter milestone counts from; Speaker Margery Rendle with the Charter open; the Toll Riders, "stood down by order of the Charter"; Weighmistress Alys Coppard, SCALES READ HEAVY chalked under her motto; the Butter Cross; the Fullers' Fountain; the Fever Stone; the New Town bell, cast by Gisborne & Son and cracked in its twelfth winter; Tray the drover's dog; the Counties' Plough, with Hugh Kellet's pencilled "Given?"; the Wall Column to Speaker Hext; Bet Annis the schoolmistress; an unfinished statue that is only boots; and the Wallers, with Thomas Bray's mark on the block. The other squares have a covered well, a parish pump, a horse trough, a well-head or a plane tree with a seat round it. |

### People

| Name | Role | Wants | Won't admit |
| --- | --- | --- | --- |
| **Osric Penhallow** | Weighmaster, seventies. Wears his chain indoors | The Weighhouse to stay in the city's hands | He took Gisborne's cheap quote without checking the metal |
| **Hulda Strake** | Corporal of the south gate | An accurate book | She enjoys knowing things before Osric does |
| **Perrin Gale** | Charter Market trader | Steady trade and good gossip | — |
| **Hob Tannet** | Carter from Cotter's End | Paying toll on three sacks when he brings three | — |
| **Gisborne** | Founder on Tanners' Row, sixties. Met in the side quests (below) | His mark to mean something again | He poured bell bronze too fast to save money |

### Honest Weight [in game]

Hob's barley reads four sacks for three. A Tolley bar (Bram casts to the even pound) reads a pound and a third. The gate book traces the weights' metal to Pryce and, if the player knows the Ford Bell story, to the bell. Osric fears a public admission will make the Charter put the Weighhouse out to tender, and Harrowgate would bid. Outcome flag `hwChoice`:
- `refund`: Osric posts a notice and repays the carters out of his own purse. Hob shares his refund (25 marks). Perrin sells to the player at a tenth off.
- `quiet`: the weights are recast at Gisborne's cost, Osric pays the player 30 marks off the book, and nobody is repaid for the summer.

### More of Ansbury and the Turnpike (side quests) [in game]

Content is in `src/data/content/crownroad/`.

| Name | Role | Wants | Won't admit |
| --- | --- | --- | --- |
| **Dorcas Gisborne** | Gisborne's daughter, late twenties. The better founder; keeps the books | The furnace lit | — |
| **Ferris Wade** | Night watch at the south gate. Can't write, so he draws what comes through | — | He cut page 112 out of the gate book |
| **Tansy Wade** | Ferris's daughter, nine. Practises her letters in chalk | To read the gate book to her father | — |
| **Tallis Dorn** | Keeper of the Standards. Guards the sealed Ansbury stone in the keep | Every set tried at Michaelmas | — |
| **Dory Pask** | Pie seller on the Charter Market. Her heavy pie is the "Weighhouse" | Trout | — |
| **Bel Tannet** | Hob's wife. Runs the Tannets' two carts at Cotter's End | Davy home | — |
| **Garth Mallow** | Wheelwright at Cotter's End. Father of Jem and Bee | Straight grain | — |
| **Davy Tannet** | Hob and Bel's son, nineteen. Drives company carts for Harrowgate | To come home owing nobody | He hasn't written because he owes the company store |
| **Hetty Brannock** | Keeps the Waystation, and sorts the Post for the south road | Her beds back on firstdays | — |
| **Aud Merrow** | Lamp-keeper of the old drove road's shrines, seventies. Her knees have gone | Her lamps lit | — |
| **Caleb Hollis** | Kept the old toll tower before the Turnpike was paved | — | He drains the Downs lamp to keep warm |
| **Rosie Penhallow** | Osric's granddaughter, nineteen. Better with figures than him | Gullmouth, with Jem | — |
| **Jem Mallow** | Garth's son, twenty. Splices rope better than he drives | Rope work for Bett Rook | — |
| **Pru Askew** | Farms east of Ansbury | Her barley standing | — |

**Facts the quests establish:**

- **The Gisborne foundry** has been cold since Lammas: Harrowgate buys every burn of charcoal on the road. Dorcas burns her own in a clamp. With no orders since the weights, Gisborne poured harness rings at night from scrap, under his mark (a G over a bell), to pay her wages; three snapped. Hilda Harrowgate offered to take the lease. `foundryChoice`: `linnet` (her own mark, L, on the door; Gisborne pours what she checks), `maren` (the foundry is Harrowgate's; Dorcas pours for wages) or `gisborne` (his mark, no more night pours, cold again by Martinmas). Perrin is repaid either way.
- **The Weighhouse's new set** is two grains heavy in the pound, in the carters' favour. Gisborne cast it heavy on purpose. Tallis Dorn passed it at Michaelmas.
- **The south gate** shuts at first bell. The night toll is four marks. Ferris Wade draws the night entries (wheel for a cart, a stroke a sack, a circle with crosses for the bell) and Strake copies them fair. The week before Lammas, Ferris let Jem Mallow in at second bell with his sister Bee, who had the croup, without the toll, and cut the page out. `bookChoice`: `enter` (the night goes back in; the Mallows owe four marks; Ferris is docked a week), `blank` ("Page cut. Cause unknown. E.S.") or `ferris` (Ferris tells Strake himself; she pays the toll from her own purse and he learns his letters).
- **Tansy Wade** chalked SCALES READ HEAVY. Strake gave her the back of the gatehouse door.
- **Rosie Penhallow** left for Gullmouth by the morning Post with Jem Mallow, who has rope work with Bett Rook. Osric wrote her a letter telling her to go before he sent the player to fetch her. `rosieChoice`: `home` (Rosie keeps the Weighhouse books; Jem goes alone), `letter` (both in Gullmouth with his blessing) or `gone` (both in Gullmouth; she never read it).
- **Davy Tannet** owes the company store 34 marks (boots, a coat, board, a fine) and they take it from his pay. Company carts stop at the Waystation every firstday. Garth Mallow turned his axle. `davyChoice`: `cart` (Bel sells the spare cart to Garth for 34; Davy drives with Hob), `stay` (he works it off and writes every firstday) or `walk` (he walks home; Pryce bills Hob, Hob frames the bill, and Harrowgate stops hiring Cotter's End carts).
- **The shrine lamps.** Three shrines on the old drove road keep lamps carters steered by before the Turnpike was paved: the Withy (590, 449), the Wall shrine under the city (739, 229) and the Downs (794, 111). The Charter stopped paying for the oil two winters ago; Aud buys it herself, a pint a lamp.
- **Caleb Hollis** kept the drove road's toll tower (929, 134) until the road was paved and the tolls moved to the gates. His pension of eight marks a quarter stopped two winters ago, the same winter as Aud's oil money. `lampChoice`: `strake` (the cell by the gatehouse stove until the spring sessions; he sweeps the gatehouse), `round` (he keeps the north lamps for Aud) or `leave` (the Downs lamp stays dark).
- **The tower's last entry** was Hob Tannet's father: "Barley, 3 sacks. Toll paid in full. W.H." Hob kept the book.
- **The Charter Post** lost a bag on the south road when wolves spooked Bess Tull's grey. Two letters were never found. Strake's sister had a boy, eleven pounds.
- **The Askew barley.** A sow farrowed in the hedge by the beck with eight young. `sowChoice`: `killed` or `fenced` (Pru fenced the bottom field with six oak rails).
- **Dory Pask's** Weighhouse pie is trout, leek and a heavy crust. Osric buys two and says they're too heavy.

## Fleet Coast: Gullmouth [in game]

A fishing harbour of forty boats in a good year, thirty-one this year.

### Places

| Place | Facts |
| --- | --- |
| **Gullmouth** | Harbour street, two jetties, Bett's chandlery. Moorings are two marks a month. |
| **Fleet Light** | White-and-red tower on the headland north of Gullmouth. The keeper trims the lamp every two hours. The oil comes up by cart, paid from the Light Fund. |
| **The stacks** | Sea stacks south of Gullmouth. There is a channel between them that only good pilots use. |
| **The Gannet's wreck** | Col Maddox's boat, on a shingle bar under the stacks. The bow is buried in the bar and the stern is still in the surf. |

### People

| Name | Role | Wants | Won't admit |
| --- | --- | --- | --- |
| **Jory Maddox** | Young fisherman, Col's son | To know why his father died | He's relieved when he can blame his father |
| **Col Maddox** | Jory's father, skipper of the Gannet. Drowned in the March gale; his body was never found | — | — |
| **Bett Rook** | Chandler. Pays well for fish | — | — |
| **Ansel Rook** | Bett's son, nineteen. Spliced half the rope in the harbour. Drowned on the Gannet; his body was found | — | — |
| **Nessa Crane** | Harbourmaster | Col's death to mean something | It makes her angry, not sad |
| **Hester Coggin** | Keeper of Fleet Light, eighties. Hasn't come down the cliff path in ten years | To be blamed for her part only | She'd make the same call again with six barrels |

### The Gannet's Log [in game]

The Light Fund cart brought six barrels of oil in February where nine were ordered. The **Toll Office** held three back against the Fund's arrears, to be cleared from spring tolls. Hester turned the lamp down to a quarter, and on still nights put it out at first bell to save oil. On the 14th of March it was still at first bell, and the gale came after. The Gannet's log: "Second bell. No light on the point. Holding off." / "Third bell. Still dark. Will try the channel by the stacks." Outcome flag `gannetChoice`:
- `truth`: the player tells Jory about the oil and the Toll Office. Jory gives the player Col's compass. Nessa writes to the Toll Office, and nine barrels come up the next month. Bett stops selling rope to the Toll Office carter.
- `hester`: Hester walks down to the jetty and tells Jory herself. He gives the player the compass. Nessa and Bett react as for `truth`.
- `spare`: the player tells Jory the light was lit and his father cut the channel too fine. Jory pays 30 marks and three grilled mackerel and keeps the compass. Hester pays the player 40 marks. The oil stays at six barrels. Jory's new boat is the *Col*; in the other outcomes it is the *Second Bell*.

Either way, Nessa pays the player a 20-mark finder's share for the chest.

- **The Merchants' Hall** by the west gate: built after the Charter put a counting house on every quay in the Counties but Gullmouth's. Every cargo through the west gate is written down twice, once for the Charter and once for the Hall. Josiah Penhale, its clerk, keeps a copy of the Exchange book; Harriet Combe, wool factor, buys hides, pelts and silk for Callis's looms; Thomas Varcoe, ship's agent, knows every hull in the harbour (the Lantern Rose at the north jetty, Callis-built and waiting on Corlett's wine; the Charter's galleon, which anchors so as not to pay dues; the hull on the slip, for a Saltpenny house that hasn't paid). Edmund Lusk and Rosina Treloar have been arguing about pilchards at the long table since the morning.
- **Dan Ruddle**, boatman, hires rowing boats by the hour from the beach below the shipyard and sells them outright. His boat has never sunk, and he'd know.
- **Rook's Ropewalk** outside the town: a shed eighty blocks long and seven wide where the harbour's rope is laid. The jack at the head twists three yarns; the ropemaker walks them out backwards to the foot, the traveller lays them together, and the tar kettle does the rest. After the Morning Post, **Jem Mallow** lays rope here for Bett Rook, and if **Rosie Penhallow** came with him she keeps its books on the bench by the jack (`src/data/content/ropewalk.ts`).
- **Gull Castle** on the cliff above the terraces. The Fleet lords built it to keep the harbour; the last of them sold it to the Charter for his debts, and the Charter keeps a garrison in it, paid for thirty and twenty-two strong. The great hall has a dais and high table under the Charter's banners, long tables down both sides, and the hearth in the west wall; the harbour court sits there on the first of the month. **Edith Penberthy** captains the garrison and rows out to count the Charter galleon's guns; she asked Ansbury for the Light's oil in two reports and never sent a third. **Simon Teague**, steward, keeps copies of everything, including the replies that never came. **Kit Hocking** stands the gate; **Mary Opie** keeps the hall (`src/data/content/gullCastle.ts`).

### Gullmouth's side stories [in game]

- **Nell's Father** (Nell Kitto, the Ropewalk Cellar): Nell writes twice a year to a man on Skua Rock and has never had an answer. It's Amos Kitto, her father, on the Rock for the Charter's pay chest; he keeps all twenty-two letters under his bunk and asks you to tell her he's dead, because nobody trusts a fixer whose father is on the Rock. You tell her he's dead (she stops writing), that he keeps every one (she'll write in the spring), or what he asked you to say.
- **The Margery's Bell** (Nessa Crane): Nessa told the town the Margery's crew took to the boat, and doesn't believe it. The log in the wreck's stern cabin says the Black Hen hailed her off the Mewstones. Sink the Hen, east of the Mewstones, and the Margery's bell comes up out of her: hung in her waist as a trophy, and polished. The crew were pressed into Brethren oars and are alive out of Saltpenny; Nessa hangs the bell on the quay. **Peter Vosper** is the harbourmaster's clerk.

## Raddle Barrens: Harrowgate Works [in game]

The home works of **Harrowgate & Daughters**, behind a palisade, with the No. 1 Drift running into the slope.

### The company

- The founder died before he could change the sign, so it still says "& Daughters". His three daughters run the company: **Delia** at the Works, **Hilda** on the Ansbury side, and **Joan** at the smelter on the Rill.
- The company mines copper and tin in the Marches and at Sallow Pit, smelts on the Rill, sells bars to Ansbury, and buys everything else through Mr Pryce.
- **Company notice:** the company buys an injured hand's tools at the full posted rate (pick 18 marks, hatchet 12) and holds them until the hand returns. The notice is signed D. Harrowgate.
- Mr Pryce buys "on his own account" as well as the company's, which the notice doesn't cover. His purchase book lists both prices for each line. It includes **3 barrels of lamp oil bought from the Toll Office, Ansbury, as "surplus" for 12 marks** and sold on to the smelter for 30. That's the Light Fund oil Fleet Light never got. No character has connected this yet.

### People

| Name | Role | Wants | Won't admit |
| --- | --- | --- | --- |
| **Aubrey Pryce** | Buyer for Harrowgate & Daughters | Two prices on every line | Nothing. He lets people read his book |
| **Delia Harrowgate** | Partner, runs the Works | The company to keep its word, on paper at least | She never reads Pryce's book |
| **Corrie Dunmore** | Boss of No. 1 Drift. Sister of Hesk Dunmore at Sallow Pit | The roof props sound and her crew whole | Pryce signs her wages, and that keeps her quiet |
| **Wick Abery** | Miner. Broke his wrist when a cart came off the rail | His pick back. He burned WICK into the grip and taped the split himself | — |
| **Lewin Feld** | Runs the company store | Not to be blamed for company prices | — |
| **Dora Hurst** | Potter, outside the palisade. Fires crucibles for the furnaces and crocks for anyone | The company to keep buying crucibles at its price and leave her crocks at hers | She takes her blue glaze from the slag heap, which belongs to the company |

### Posted Rate [in game]

Wick sold his pick to Pryce for 3 marks to pay a six-mark bonesetter, and Tam has it on the store wall at 40. Outcome flag `fpChoice`:
- `paid`: the player buys it for 40. The drift's whip-round pays the player back 20.
- `delia`: the player shows Delia the "own account" line. Tam releases the pick at the posted rate, billed to Pryce, and Pryce pays Wick the 15-mark difference from his wages. Delia pays the player 30. Pryce: "I'll remember that."
- `leverage`: the player shows Pryce his own book. He writes Tam a no-charge slip and from then on buys from the player at 75% instead of 55%.

### Side stories [in game]

`src/data/content/harrowgateSide.ts`.
- **Pryce's Oak** (Corrie Dunmore): a prop burst on the night shift. Two of the three new timber sets in No. 1 Drift are rotten, one with a P cut in the end grain: Pryce's mark for oak bought on his own account and sold on to the company. `hgProps`: `delia` (sound oak on his wages, a month docked, and Delia reads his book at last), `crew` (the night shift downs tools; Corrie's name on the stoppage) or `pryce` (he pays for sound oak himself, and for your silence).
- **Pulled Spikes** (Ada Cleave, the rail gang): the new rail out of the smelter yard loses its spikes every night. A farrier's nail-bag in the ditch, WB on the flap: Walt Brindley's stable lads, because when the rail reaches the cuts the horses go to the knacker and the lads down the drift. `hgSpikes`: `told` (the six are turned off), `hands` (Walt walks them over to Ada's gang; the rail stops at the ford and the hill road keeps its horses) or `paid` (Walt pays you to say redbacks).
- **Dora's Blue** (Dora Hurst): her blue glaze is slag picked from the company heap at night, and Pryce has sold the slag to a glassworks. `hgBlue`: `bucket` (you fill her bucket on the quiet) or `paper` (Delia writes her a bucket a week, the company's gift; it hangs by the kiln where Pryce reads it).

## Hagworm Wood: Fellers' Camp [in game]

A logging camp in the giant-tree forest: tents, a firepit, a log stack and twelve fellers. Harrowgate & Daughters takes every log it can send.

- **The order.** Pinned up at the camp: forty elder-oak pit props, nine foot, for No. 1 Drift at Harrowgate Works, three marks the prop, signed A. Pryce. This is the roof Corrie Dunmore worries about.
- **Elder oak** is the only wood Harrowgate accepts for props. It takes Woodcutting 20.

| Name | Role | Wants | Won't admit |
| --- | --- | --- | --- |
| **Ide Marrow** | Camp boss | The order out on time without anyone under a tree | She'd rather Kit were lying, because that's easier to fix |
| **Sefton Garrow** | Feller, sixties. **Pell Garrow's younger brother.** Forty years on the saw | To stay on the saw | He's going deaf, and has been answering what he thinks people said since spring |
| **Kit Ashcroft** | Young feller from Hollin Ford, of the Ashcrofts with the hens; his aunt owns Duchess | Not to have a tree dropped on him | He doesn't want Sefton sacked |
| **Odo Fenn** | Camp cook and stores | — | — |

### Calling Timber [in game]

Sefton was on the saw and Kit was calling the fall. The tree came down the wrong way and Kit jumped clear. The player cuts the camp's last three elder logs, hears both sides, and advises Ide. Outcome flag `timberChoice`:
- `send`: Sefton goes home to Hollin Ford and is gone from the camp. Pell has a line about him: "He can't hear me, and I don't have to listen to him." Ide pays 30.
- `marker`: Sefton comes off the saw and picks and marks the trees instead. He gives the player his felling axe.
- `keep`: the player tells Ide that Sefton heard the call. Sefton stays on the saw, Kit moves to the far side of the clearing, and Ide pays 40.

### Side stories [in game]

`src/data/content/hagwormSide.ts`.
- **The Hen Money** (the Hollow Oak): at the bottom of the oak, "Hannah. I owe you four marks for the speckled hen. I'll leave it here by Lammas. R.M." and under it, years later, "You never did." R.M. is Rafe Marrow, Ide's father, who died owing half the wood; Hannah was Hannah Ashcroft, Ruth's mother, dead nine years. Odo Fenn knows the initials. `hwHen`: `paid` (Ide pays a week's wage now for four marks then and writes "Paid. I.M." under it; Ruth puts it in the tin with her mother's things, and Hannah's Lammas story was "Rafe Marrow and the speckled hen") or `oak` (Ide puts it back in the oak, where he left it and Hannah answered).
- **Where Fly Went** (Jabez Thackery): his nine-year-old hound followed a thornback stalker into the rocks north-west of the camp. The prints by the brook, fur on the bramble, the den; she comes home on three legs and goes under his bench. Her last stalker.

## Scarth Highlands: Kelderby and Scarth Watch [in game]

### Places

| Place | Facts |
| --- | --- |
| **Kelderby** | Three slate-roofed stone houses and a well on the high plateau. Sheep country. Its own landmarks: **the tally post** by the well, a larch post notched with every spring's lambs in fives (one spring of two, with a cross; the newest row fourteen, and one more notch filled in with pitch); **the fell cairn** at the foot of the north track, where shepherds add a stone going up and take one coming down, so it stands as high as whoever is still out, with a child's mitten in its top stones; and **Cai Morgan's sledge** in front of his door, the hamlet's only one: IF YOU TAKE IT BRING IT BACK, and under it, AND TELL CAI. (`src/data/monuments.ts`, town `kelderby`.) |
| **Hale's Fold** | The Hales' shepherds' bothy and a drystone sheepfold on the ridge above Kelderby. Frost wolves come to it when the fire is low. |
| **Scarth Watch** | An observatory tower with star crystal at its top. Ilse Blewitt counts the stars that fall and where they land. **The Charter pays a stipend for the count**, because crystal lies where stars come down, and Ansbury likes to know where its crystal is before Harrowgate does. She keeps a weather log by a storm glass. |

### People

| Name | Role | Wants | Won't admit |
| --- | --- | --- | --- |
| **Tressa Hale** | Shepherd of Kelderby | Bryn home and the flock safe | Given one, she'd choose the flock, and Bryn would choose the same |
| **Bryn Hale** | Shepherd, Tressa's husband. Never sat out weather in his life | Fourteen ewes kept, "because fourteen ewes is the house" | — |
| **Cai Morgan** | Carter and trader at Kelderby, Tressa's brother; has the hamlet's sledge | — | — |
| **Ilse Blewitt** | Astronomer at Scarth Watch | The Charter to pay on time | — |

### The High Pasture [in game]

Bryn went up to Hale's Fold to bring the flock down before the snow and didn't come back. Ilse saw his lantern two nights ago and none last night, and her glass says snow by tomorrow night. Bryn has a broken leg; frost wolves have been at the fold. Cai can make one sledge trip before the snow, for Bryn or for the ewes. Outcome flag `pastureChoice`:
- `bryn`: Cai brings Bryn down. Six ewes find their own way home and eight are lost.
- `flock`: Cai drives the ewes down and Bryn keeps the fire in at the bothy. He loses two toes.
- `wenna`: the player leaves it to Tressa. She chooses the ewes, and the result is the same as `flock`.

Tressa pays the player 50 marks either way, plus two smoked char if the flock was saved.

### Side stories [in game]

`src/data/content/scarthSide.ts`.
- **Three Quarters Late** (Ilse Blewitt): the Charter hasn't paid her stipend for the count since Candlemas, and Mr Pryce has offered a hundred and twenty marks for it. Clement Fry at the Toll Office has her in his ledger, owed, behind the debt with the Light Fund and the Weighhouse; he can pay one quarter from sundries if somebody who isn't him signs. `scStipend`: `charter` (one quarter of three; she keeps counting for Ansbury), `pryce` (thirty years of falling stars to Harrowgate; Harrowgate's men are at the next fall before the dust settles) or `posted` (she pins the count up at Kelderby, and eleven people are at the next fall by morning, arguing).
- **Owen's Crook** (Sela Orme): an old man who gave his name as Owen died of cold on the Kirk road, having walked a long way to put his hand on the star. The crook carries the Hale mark: he was Bryn's elder brother, gone twenty years after a quarrel over which side of the fold wall the gate went. `scOwen`: `told` (Tressa gives Bryn the crook and the truth), `spring` (it goes up in the loft with the fleeces till spring) or `kirk` (it stands by the crystal under his name: he went to the star, not to them).

## The main story: The Charter's Debt [in game]

Eleven chapters: the first six above, and five between them where the companions join (`src/data/content/actOne.ts`). In order: The Notice (I), A Witness (II), Wrong Way Round (III), Under the Crown (IV), The Fallen Star (V), The Surveyor's Girl (VI), The Lift (VII), Forty Feet (VIII), The Toll Riders (IX), What the Charter Owes (X), First Camp (XI). The later acts' chapter numbers follow on from XII. Dialogue is in `src/data/story.ts`; the quests are in `src/data/storyQuests.ts`.

### What is true in the world

- **The debt.** Twelve years ago the Charter paved the Turnpike from Hollin Ford to the coast with money borrowed from the guilds. The guilds sold the debt on. Harrowgate & Daughters, buying through Mr Pryce, bought nearly all of it at three marks in ten: 40,000 marks of debt for 12,000. Every Turnpike toll goes to servicing it before anything else. This is the source of the regional squeezes: the Weighhouse reading heavy, the Light Fund's oil held back, and the Toll Office selling that oil to Pryce.
- **Star crystal is light**, "like a cork held under water" (Ilse Blewitt). The rock over a crystal body, the **cap**, holds the ground down. Strip the cap and the ground lifts: Joan Harrowgate measured one span of lift for every three feet of cap taken.
- **The old builders.** About eight hundred years ago a people who didn't write (they drew and counted) mined crystal in what are now Hagworm Wood and the Raddle Barrens. Nobody knows what they called themselves; they are named after the places they left. They tied their fields down with ropes to **mooring arches**: Ketley's "gates" have rope grooves on the north face of each lintel.
- **Gallows Knap** was their hill and their workings. They cut the crown of stones off the hill and stripped the cap. The ground lifted, they cut the ropes, and a field went up with **forty-one** people on it. Their tally wall under the ruin records it.
- **The Weatherholms** are Ketley's lifted fields, still drifting about a stride a year. Ilse has thirty years of it in her log. The largest isle carries a mooring arch.
- **The Glass Kirk** sits on the largest crystal fall Ilse has counted. Pilgrims come to put a hand on the exposed crystal. Sela Orme keeps the floor and a book of their names.
- **The Hollow Oak** has been Hagworm Wood's post box since before the Charter: letters, debts and apologies are left inside it. The oldest thing in it was a Ketley slate.
- **The lift.** In Chapter V, Hilda's foreman strips the Kirk's test cut before the vote. The floor east of the crystal rises two feet in four seconds, and shard jellies and **Old Glass** come up out of the crack. The raised floor stays raised.

### People

| Name | Role | Wants | Won't admit |
| --- | --- | --- | --- |
| **Lowen Pike** | Clerk of the Toll Office, Ansbury. Held back Fleet's oil | Different books | He would do it again |
| **Hilda Harrowgate** | The Ansbury side of Harrowgate & Daughters | The debt paid, "efficiently" | She tendered for thirty feet over her engineer's written ten |
| **Joan Harrowgate** | The company's engineer; runs the smelter on the Rill. Lost two of her crew (Ennis and Pol) to the Rust Queen | Ten feet of cap, no less | She'd rather be right than loyal, and her sisters know it |
| **Rhosyn Tarrant** | Speaker of the Charter | A vote she can defend | — |
| **Wynn Carrow** | Antiquarian, has camped at Ketley for eleven years | Someone to tell him he's wrong | He has been right alone for too long |
| **Sela Orme** | Keeper of the Glass Kirk. Hadn't left the hill in six years before the sitting | Her floor left alone | — |
| **The Rust Queen** | A redback the size of a cart, nesting on the old builders' iron under Gallows Knap | — | — |
| **Old Glass** | A shard jelly grown huge in the crystal under the Kirk | — | — |

### Endings (`charterEnd`)

- `refuse`: the tender is refused and the debt stands. Turnpike tolls go up a mark (the toll board changes), and Fleet stays at six barrels.
- `joan`: the crystal is let on Joan's terms: ten feet of cap, Joan in charge and answerable to the Charter, and Sela's floor untouched. The debt is paid from the crystal over twenty years. Tolls go back to the Charter, and Fleet gets nine barrels.
- `paid`: only possible with Pryce's page. The Charter repays Harrowgate what it paid plus a tenth (13,200), by a one-year levy, and the tender is refused. Fleet's arrears are paid first. Harrowgate bids on nothing in the Charter for a year, so **Sallow Pit is shut for the winter**: Hesk, Tamsin and Hilda all say so.

The Speaker gives the player a Charter ring in every ending. Earlier choices change what people say: the Weighhouse and Gannet outcomes change Lowen's lines, Posted Rate changes Hilda's greeting and Pryce's price for the page, and doing Wick's quest earns a friendlier word from Corrie.

### The companions' chapters [in game]

- **II, A Witness** (`storyWitness`). On the Turnpike south of the Waystation, **Wenna Hale** has stopped a Harrowgate wagon driven by **Nat Hendy**, carrier. Six barrels carry the Light Fund's brand (a lighthouse and FLEET) with H&D chalked over it, and a docket: Light Fund surplus, eleven marks the barrel, for A. Pryce, released by L. Pike. Flag `witnessEnd`: `docket` (the wagon goes on; the player keeps the docket, `oil_docket`) or `back` (the barrels go back to the Toll Office on Wenna's say, and on to Fleet Light). Wenna joins.
- **VI, The Surveyor's Girl** (`storyOttilie`). **Ottilie Fenn**, of the Charter's survey office, has been on the Kirk floor nine days with a level line. Three chalk marks from the star to Harrowgate's stakes read a quarter of an inch, half an inch and an inch and a quarter: the floor is rising where Harrowgate bored in the spring. Joan reads her book, tells her to keep measuring and send it to her, not her sisters. Ottilie joins.
- **VIII, Forty Feet** (`storyFortyFeet`). After the lift: six feet of cap off gave two feet of lift, a third more than Joan's rule (a span for every three feet), which came from Gallows Knap. Ottilie would want forty feet of cap and a year of watching. Flag `fortyTold`: `joan` (told before the sitting; Joan still says ten, because ten is what she can defend, and measures every morning: "Then I'm the one standing on it") or `kept` (Ottilie keeps it until after).
- **IX, The Toll Riders** (`storyRiders`). Captain **Elis Prowse** of the Riders, four short, wants Wenna back on the roll to stand on the keep steps at the sitting. The duty book by the Waystation's office: "Escort, H and D wagons, the Turnpike. Two riders. Four marks a day. Paid, A.P.", every week since Lady Day. Flag `ridersEnd`: `coat` (Wenna takes the coat back and wears the Riders' blue) or `page` (she brings the page, `riders_page`, to the sitting; Prowse will be off the stretch by Martinmas).
- **XI, First Camp** (`storyCamp1`). The night after the sitting, walking Sela Orme home, the party camps in the meadow past the Waystation pond, by the Turnpike bridge. A word with each by the fire; Sela means to write the forty-one at the front of the Kirk's book of names (flag `selaForty`: `strokes` or `first`).

## The main story, Act II: The Weatherholms [in game]

Six chapters after the sitting. The quest ids are `storyStride`, `storyHoist`, `storyForty`, `storyDrop`, `storyBaskets` and `storyLastMark`. Everything is in `src/data/content/weatherholms.ts`; where the isles and the hoist stand is worked out in `src/world/holms.ts`. It starts from the Speaker after the sitting (she has a letter from Ilse), whichever way the sitting went.

### What is true in the world

- **Harrowgate's Weatherholm venture.** After the sitting, Hilda Harrowgate looks for crystal where the Charter's writ doesn't run. Her notice on the tower: "No claim of the Charter runs above the ground." Two marks a day and board, thirty baskets before the frost, mostly Kelderby hands.
- **The hoist.** A timber tower on the ground beside the largest isle, as tall as the isle is high, with a basket on a rope up its middle and a plank bridge from its top platform onto the isle's grass. The camp and the crystal store are at its foot. Its footings went down into a crystal seam, and shard jellies come up round them at night.
- **Crystal is lift, both ways.** Take crystal off an isle and it sinks. Ilse logged the big isle dropping nine feet in a month, then four in an afternoon. Joan's reckoning: it isn't a straight line; six more baskets and the isle comes down, on the tower and the camp.
- **The forty-one.** They lived on the field for generations. The ring's counting stones record forty-one, then up to sixty-three, then down: thirty, twenty-two, nine. They kept sheep, dug a well, buried their dead, and spun rope from their own wool for three lifetimes until it reached the ground.
- **The Ketley arches.** The last nine climbed down the rope and built the five arches at Ketley, to tie down the fields that were still on the ground, so that nobody else would go up. The fourth stone, under the crystal in the ring, shows nine strokes, a rope, and five arches. Wynn Carrow: "They're a promise."
- **The Keel.** The crystal mass under the ring floor, woken by Harrowgate's cut; it comes up out of the cut when the isle lurches.

### People

| Name | Role | Wants | Won't admit |
| --- | --- | --- | --- |
| **Gethin Vane** | Foreman of Harrowgate's hoist. Counts in baskets | His crew whole and the rope fine | He's been telling the crew the rope is fraying so they won't ask why it's stopped |
| **Delyth Morgan** | Crew on the isle, Cai Morgan's daughter from Kelderby. Copies the stones into a book of grey paper | To know what she's been standing on | She sent baskets down while she copied the stones |

### Endings (`holmEnd`)

- `back`: the twenty-four baskets go back up (the player helps load the last four crates); the isle holds; the venture ends and the hoist stands empty, kept standing on Hilda's pay.
- `charter`: the Speaker rules that the isles were Ketley's fields and Ketley is in the Charter, so the Charter's writ runs to them. The ring is left as it is, the crystal goes back at the company's cost, and the hoist is the Charter's, a mark a ride. Wynn is made keeper of the ring, unpaid.
- `joan`: Joan sets the rate: the ring isle is left alone, the small isles give a basket a month, and weight goes back on the big one until it stops dropping. Joan measures it every morning.

Every ending: Delyth cuts a forty-second stroke on the last stone and gives the player her chisel (`holm_mark`), and the basket is open to the player for good.

### Act II's added chapters [in game]

Act II is nine chapters (XII to XX): the six above, with Ilse's Log after Dead Weight and The Nine's Way and Second Camp after The Last Mark (`src/data/content/actTwo.ts`). Act III starts once Second Camp is done.

- **XVI, Ilse's Log** (`storyIlseLog`). Ottilie wants Ilse's thirty years of logbooks to work out the drift. One winter, eleven years back, is cut out close to the spine; the next spring has a line struck through: "A. Pryce, paid in full." The winter her sister **Bethan** had the lung fever in Kelderby, with the stipend three quarters late, Ilse sold Pryce that winter's count for two hundred marks. It recorded the biggest fall she had ever seen land on an isle, in the old ring: that is how Harrowgate knew where to build the hoist. Ilse wrote "On the Counting of Falls", the book Ottilie learned to read a staff from. Flag `ilseLog`: `speaker` (she writes to the Speaker herself, signed), `kept` (it stays between you), `blamed`. If `scStipend` is `pryce`, she sold him the rest this summer too.
- **XIX, The Nine's Way** (`storyNineWay`). After the fourth stone, Delyth ties the crew's rope to the last fence post at the big isle's far edge and climbs down it, twenty feet to the snow, the way the last nine did (sixty feet, then, one of them with a baby on her back); the player follows. Flag `nineRope`: `left` (the rope stays hanging for anyone who wants to go up and look, and come down again) or `cut`.
- **XX, Second Camp** (`storyCamp2`). The crew's fire at the hoist's foot, with Delyth, who means to copy the rest of the counties' stones, starting at Ketley. In the morning there is a letter from Nessa Crane.

## The main story, Act III: The Drowned Parish [in game]

Four chapters after the Weatherholms. The quest ids are `storyLowWater`, `storyRegister`, `storyLoads` and `storyBell`. Everything is in `src/data/content/holmsey.ts`; Holmsey and its bell-tower are built in `src/world/sites.ts` (`buildHolmsey`, `buildDrownedTower`). It starts from Nessa Crane at Gullmouth once Act II is done.

### What is true in the world

- **Holmsey** was a parish on the marsh under the Gulf Cliffs: a lane, a market cross, the Bell inn, the reeve's house, a churchyard and a church whose tower still stands out of the sea. It went under a hundred and twelve years ago.
- **The white.** At Michaelmas that year the Fennick estate's agent let the Glass Kirk's builders dig the white (star crystal) out of the marsh pits, at a mark the load. Thirty-eight loads went up the Kirk road by Martinmas. Crystal is lift: the ground went down a foot a month, the dyke broke by the Bell at Twelfth Night, and the parish left for the cliff top after Lady Day.
- **The register** was kept to the end by the clerk, **Ralph Sweet**. Its last dry pages record Ann Vosper buried in the high corner of the churchyard, and Mary, daughter of Ralph and Jane Sweet, baptised in the tower at Candlemas because the nave was under.
- **The Kirk's floor** is Holmsey's white. The Kirk's building book records the thirty-eight loads, and the floor was blessed at that same Candlemas.
- **The bell** came down off its beam long ago and lies on the drowned ringing-chamber floor. Since the Kirk floor came up, the ground under the Gulf has let go a little and Holmsey is rising, about an inch a month: at low water the bell's crown is clear, and the swell rings it. Tamar has measured the lane at the cross: four fathoms when she started diving it, three and a half now.
- Every boat from Gullmouth to the Raddle smelter goes down the Gulf over Holmsey.

### People

| Name | Role | Wants | Won't admit |
| --- | --- | --- | --- |
| **Tamar Sweet** | Salvage diver from Gullmouth; has slept in the bell-tower since midsummer. Ralph Sweet's great-great-granddaughter | Holmsey left alone to come up | She's been diving her own family's parish for twelve years |
| **Nessa Crane** | Harbourmaster (Fleet Coast) | Her lane | She hates the dredging more than the bill |
| **Sela Orme** | Keeper of the Glass Kirk | The floor where it is | — |
| **Hilda Harrowgate** | Harrowgate & Daughters | To dredge the white while it's shallow, paying the Charter a fifth | — |

### Endings (`parishEnd`)

- `rise`: Nessa buoys a new channel west of Holmsey (half a day longer to the smelter) and the parish is left to come up.
- `hold`: Gullmouth's lighters lay stone from the quarry at the stacks along the lane until it stops rising. The bell rings at every low water.
- `sink`: Harrowgate dredges the white and pays the Charter a fifth; the player gets 150 marks; the parish will go back under. Tamar leaves the tower.

Every ending: Sela writes Holmsey at the front of the Kirk's book of names, the player rings the bell while Tamar reads the last names, and Tamar gives the player a length of the bell rope (`holmsey_rope`).

### Act III's added chapters [in game]

Act III is six chapters (XXI to XXVI): Half a Purse, the parish's four, and Third Camp (`src/data/content/actThree.ts`). Act IV starts once Third Camp is done, and runs XXVII to XXXII.

- **XXI, Half a Purse** (`storyHalfPurse`). On Gullmouth quay **Tam Reddick** has just won **Jacca Pengelly**'s boat, the **Patience**, at cards (her father built her; she fishes her six days a week; he didn't cheat, this once). Flag `halfPurse`: `back` (Tam gives her back because you asked), `bought` (you pay him forty marks for her bill of sale) or `kept` (Jacca crews her for him for half the catch). Tam joins, for the bell under the Gulf.
- **XXVI, Third Camp** (`storyCamp3`). The last night in Tamar's bell-tower, on the planks over the drowned ringing chamber. Tam sits up by the lamp writing a letter and folds it away when you come over. Flag `tamLetter`: `asked` (he says it's to his mother in Saltpenny) or `let`. In the morning Nessa Crane is on the quay waving a letter.

## The factions

Companies you can join, each with its own hall, people and storyline, in the manner of the Elder Scrolls guilds but grown out of the Charter Counties. Each storyline chapter raises your rank and the last gives a title (`src/data/factions.ts`). Open: the Waits [in game]. Planned: the Collegium (crystal, the old words and weather, Guild Ward), the Muster (the laid-off toll riders' hiring hall at the tilt-yard, against Harrowgate's "Company Wardens"), the Lamplighters (who light Ansbury's lamps and rob the debt-holders by the same ladders, the Shambles), the Passing Bell (an old moor practice: ring the passing bell for someone the law can't reach), and the Ushers (the Speaker's doorkeepers in the Charter Hall, and her eyes). [planned]

### The Waits of Ansbury [in game]

The town's musicians. The Charter pays six Waits to play the hours on the Charter Green at dawn and dusk, walk in front of the Speaker at a sitting, and play whatever else the town needs. They are five when you arrive. The Waits' House stands on the north side of the Charter Green, with a low stage, benches, the instrument cupboard and the **Great Book** of the counties' tunes. Twelve years ago the Collegium borrowed the Book to copy and sent it back thirty pages short. The Waits play on the bandstand on the Green at noon, and the hours there at dawn and dusk (`src/data/content/waits.ts`; tunes in `src/data/tunes.ts`).

| Name | Role | Wants | Won't admit |
| --- | --- | --- | --- |
| **Tabitha Gant** | Master of the Waits, harp. Sixties | The Waits kept on the Charter's books | She hasn't written a tune in twenty years, until "Three Marks in Ten" |
| **Roley Spence** | Horn, keeps the instrument cupboard. Blew the horn on the Charter Post for six years | To be the only Wait who laughs | — |
| **Dorcas Pym** | Fiddle. Young, says little | — | — |
| **Perran Truscott** | Drum | — | — |
| **Amos Hollis** | Printer of broadsides, sells in the Charter Market | The debt's arithmetic done in public | Tabitha's tune is better than his words |
| **Hugh Kellet** | Gentleman Usher of the Charter Hall | The Waits to play the March | — |
| **Bet Polglase** | Widow on the Gullmouth quay; her husband Jory hauled boats to "Haul for Holmsey" | — | — |

Storyline (each a rank): **The Audition** (Apprentice: play "Lady Day" at the bandstand), **The Missing Pages** (Journeyman: learn the lost tunes still sung by Tressa Hale at Kelderby, Bet Polglase in Gullmouth and Sefton Garrow at Fellers' Camp, who give the Hale pipes, Jory's fiddle and Sefton's frame drum), **From the Moor** (Wait: the oldest page has five dots "from the moor"; Wynn Carrow sends you to **Carne Barrow**, a long barrow east of Scarrow Tor on Tolmen Moor, for a five-holed bone whistle; played under the Ketley Arches the tune comes back off the rope grooves, which the old builders cut to sing), **Three Marks in Ten** (Senior Wait: the Charter means to stop the Waits' wage; play Amos's ballad about the debt on the keep steps, or the Speaker's March; flag `waitsEnd` = `ballad` (the wage is stopped, the town sings it) or `march` (the wage stands)), **The Hours** (Wait of the Hours: play "The Hours" on the bandstand at first light; Tabitha gives you the Waits' harp; title Wait of Ansbury).

Instruments: tin whistle, Hale pipes, Jory Polglase's fiddle, Sefton's frame drum, the Ansbury lute, the post horn, the hurdy-gurdy, the Waits' harp and the Carne whistle. Anyone can play by ear on the number keys. Played through at a performance spot (the bandstand, the moot oak, the Waystation yard, the fire at Fellers' Camp, the well at Kelderby, the Gullmouth quay, the Glass Kirk, the Works yard, the Ketley Arches, the keep steps, the Minster steps), a tune brings people to listen, and they leave a few marks. A group can play as a band, each on their own part.

## Taverns [in game]

The towns' inns, kept and drunk in (`src/data/content/taverns.ts`). Each keeper sells drink and food, passes on the day's talk (true things about the counties, changing with the realm's day, among them where Mercy Haddow is), and two regulars sit at the tables. A musician playing in any of them earns a few marks.

| Tavern | Town | Keeper | Regulars |
| --- | --- | --- | --- |
| **The Low Water** | Hollin Ford | Agnes Pole | — |
| **The Charter Arms** | Ansbury, on the keep square | Nan Pargeter: forty years on the square, keeps a book of everyone's tab | Clement Fry (Toll Office clerk), Margery Pettifer (glover; the Collegium buys her thick gloves for handling crystal) |
| **The Long Stretch** | the Waystation | Ivo Rendle, a laid-off toll rider who put his severance into the roof | Josiah Yeo (carter), Hester Vowles (drover) |
| **The Company Canteen** | Harrowgate Works | Doll Hobday, the Company's cook since before the Daughters' name was on the gate | Rob Haig (smelter man), Ada Cleave (rail gang) |
| **The Coiled Rope** | Cragsby | Morwen Tregear; a hook on the wall for every climmer who went over | Jenkin Kemp (climmer, the "Wat" of the knot board), Loveday Tonkin (egg-gatherer) |
| **The Eel and Punt** | Holme Staithe | Sim Fenner; three generations of eel smoke in the walls | Obed Gedge (puntsman), Tilly Brewer (reed cutter; the Levels' drains silt up and nobody pays to dig them) |
| **The Peat Fire** | Scarrow Tor | Kerensa Garth; the fire hasn't gone out in five generations | Joss Trewin (shepherd; heard the Carne Cross bell), Win Polwhele (peat cutter) |

Drink and food: small beer, brown ale, Hollin cider (the Ashcrofts' orchard), Levels porter, mulled wine, bread and cheese, stew, pickled gull eggs, eel pie, mutton pie.

## Lore books [in game]

Twenty-four books lie open on stands by the places they're about, and go into the journal's Library when read (`src/data/lorebooks.ts`). What they establish:

- **The Charter** (a copy on the Charter Green): Ansbury keeps the roads, the counties keep their reeves, moots and customs; a toll may be no more than the keeping costs; a county may leave at Lady Day with a year's notice, paying what it owes; disputes go to the Speaker. A pencilled note by H.K. (Hugh Kellet): nobody has ever left, or been able to pay.
- **Nat Coverdale**, toll rider number fourteen, was laid off at Advent when the riders were cut. **Sergeant A. Holroyd** put up a roll at the tilt-yard for anyone who still wanted the work: the Muster.
- **The Lantern's** beacon line answered the Ridge fire and Fleet; its keeper lit it a last time after the Charter Post replaced it.
- **The Exchange** keeps one book on the realm; Gideon Wray takes one mark in twenty. Its **Wanted** page takes orders: ask for so many of anything at a price and the book holds your marks till someone fills it (a week at most), which is how you get a crafter to make something for you; fill anyone's order from your pack and you're paid on the spot.
- **The guild vault**: at any Charter Bank counter, a guild's goods and marks held in common, with a log of who moved what. Anyone in the guild pays in; officers and the leader take out what they need, and a member up to twenty things and two hundred marks a day (`server/guilds.mjs`, `src/game/Bank.ts`).
- **Hall Row** (`src/data/guildhalls.ts`, `world/sites.ts` buildHallRow): the old trading companies' halls on a lane off the south road, under Ansbury's wall. The fullers, dyers, chandlers, coopers, vintners, saddlers, mercers and cordwainers built them outside the old wall where land was cheap; the new wall left them outside it, the companies dwindled to a few old men and a dinner a year, and the Charter took the halls for what they owed. **Walter Pinnock**, Clerk of the Halls, lets them to guilds from his desk at the lane's head: 5,000 marks from the guild vault, an officer's to pay. A guild's banners (its arms worked from its name) and its name on the gate board go up for everyone to see. Then the members build it out, one wing at a time, from what they bring or an officer pays from the vault: **the long table** (supper in hall once a day: more health, quicker stamina, three-quarters of an hour), **the forge** (forge, anvil, joiner's bench and range in the yard), **the counting room** (the bank and the guild vault, upstairs), **the map room** (the Charter Post from the south gate at half fare) and **the roll of honour** (every world boss a member helps bring down, lettered in gold). Members can go straight to the hall from the guild panel once an hour (`server/guilds.mjs`, `src/game/GuildHalls.ts`).
- **Fellers' Camp rules** (I. Marrow): a caller for every tree, two to a saw, elder-oak props nine foot with no knots in the bottom third, nobody under an ancient after dark.
- **Harrowgate's Rules of the Works**: pay by the cart at the posted rate, tools deducted, stoppages for a fall of roof paid at half once the Company is satisfied it wasn't your fault.
- **The lamplighters** are licensed by the Charter, light every lamp by the second bell after sunset, and say nothing of what they see from a ladder. Someone has added "Light the poor streets first".
- **The Muster's notice**: anyone who can hold a weapon and keep their word, nobody also paid by the Company Wardens.
- **Ilse Blewitt's** volume nine: a big fall past the Kettle, the stipend three weeks late, the near isle a stride and a hand further since spring.
- **Wynn Carrow** measured the rope grooves on all seventeen standing Ketley arches: deepest nearest the Knap. A tenth arch stump holds up a gate in the Mossgate sheepfold. His rubbing of the Gallows Knap tally wall ends in forty-one strokes.
- **A Collegium lecture**: crystal lifts the ground by a span for every three feet of cap (Joan Harrowgate's figure); the Collegium wants a licence over the old words.
- **"Three Marks in Ten"**: Amos Hollis's broadside, four verses and a chorus.
- **Gullmouth sayings**: never whistle on the quay, never count the boats aloud.
- **Kelderby sayings** (the Hales'): when the Kettle steams on a cold morning, snow in two days.
- **The moor's bells**: the chapel at **Carne Cross** lost its roof a hundred years ago and its parish fifty before that, but keeps its bell; you can ring the passing bell for anyone, if you find the chapel and the coin. (The Passing Bell, planned.)
- **The Book of Names** at the Glass Kirk; after Act III, Sela writes Holmsey first.
- **The Hollow Oak's** letters, and an old slate of a field held down by four ropes.
- **Number Four's** shift board: Coll Bray with Penney and young Tully; Bray let go at Michaelmas; the roof down at Candlemas with nobody under it; "Ask the old man" chalked after.
- **The Collegium's letter** to Tabitha Gant: the pages were taken by a student who has since left; the Collegium keeps its own copy of the tunes, for scholars, by appointment.
- **Tomorrow's Coast**: a Morrow sailor at the Mewstones; their tall cities held down with black stone, and an island of wrecks where nobody pays a toll.

## The Mewstones [in game]

The isle a short ferry from Gullmouth's quay. The hamlet by the jetty is all most people see of it; the rest is sheep, peat and wind.
- **Bolitho's Croft**, half a mile up from the jetty: a stone longhouse under thatch with a peat stack and a fold. **Walt Bolitho** has the croft and an opinion on everything else on the isle (`src/data/content/mewIsle.ts`).
- **The Mew Stones** on the eastern headland: nine stones in a ring, one down since Walt's grandfather's day, a flat one in the middle that nobody sits on. Nobody knows why.
- **The Gullery**, caves right through Mew Fell, full of bats the size of a coat; at the bottom, **Old Leatherwing**, who saw off Walt's father and a ewe.
- **The Margery**, a Gullmouth boat ashore on the east shore since the February gales, her hold full of salt fish and nobody aboard. The harbourmaster says the crew took to the boat. Walt says there was no boat.

## Inkholm [in game]

An island south-east of Gullmouth, past the Mewstones, about six hundred blocks across. Locals call it the Holm. `world/terrain.ts` (INKHOLM), `data/inkholm.ts`, `data/content/inkholm.ts`.

- **The woods.** Inkholm grows mushrooms, not trees: broad caps in a cep's brown or (one in four) red with white flecks; tall ink caps whose rims run to black; and lantern caps that glow sea-green after dark. Mycelium covers the ground. Mist hangs over the island most of the day, and it's easy to lose your way: keep the sea on one side.
- **Ink.** Ripe ink caps melt into black ink. Boiled and settled at Black Hythe, it's what the Charter writes its ledgers in. Harrowgate & Daughters bought the works from the island's ink guild.
- **Corra Priory.** Ruins on top of Corra Fell. The brothers made ink and copied books. Three hundred years ago a grey mould came up out of the fell and took them. **Abbot Wystan** sealed the Old Bed under the priory, burned the first reek, and went down to see it out. His tomb says to burn it again if the stone is ever moved.
- **The Reekers.** The families who keep the fires: every autumn they burn reek (a bitter shore herb that smells like a wet dog's breath) on five rings of standing stones round the Holm: the Gull Reek, Hesketh's Reek, the Low Reek, Barrow Reek and the Long Reek. The smoke keeps the Grey in the ground. **Bryony Kitto** is the last of them.
- **The Grey.** A mould that roots in the lungs and sheds in the dry: a cough, then grey skin, then people walk into the woods and stand still until caps grow out of them (the greyed). Reek smoke breaks it down; the Collegium's **Doctor Lettice Hale** proved it.
- **What happened.** Last autumn Black Hythe's manager, **Cyprian Vosper**, paid the island council forty marks a month to let the fires lapse (reek smoke browns the drying caps), and sank the Deep Gill shaft toward the fell, where the warm air grows first-grade caps. At forty fathoms it broke into the priory's Undercroft. The Grey came up; the Charter stopped the crossing.
- **The Grey (the questline).** The Crossing: Doctor Hale and the ferryman **Reuben Hoskin** at Gullmouth's Post sign. Gillsby Staithe: Bryony, and grey caps for the doctor. Reek-Fires: relight all five. Black Hythe: Vosper's ledger, and the choice of who gets it (flag `inkLedger`: `charter`, Hale sends it to the Speaker and Vosper goes; `bryony`, she reads it out at the council, the council pays the money back and the works stay on the island's terms). Corra Priory: the tomb, the crypt stair, Abbot Wystan grey through in the Old Bed, and the bed burned with reek. Afterwards Bryony's grandson **Joss** is up and well, and she's teaching him the fires.
- **Gillsby Staithe** (the harbour): a stone quay, a lane of cottages, the Staithe Inn (**Kerra Rowse**), the reek-house, and a rope across the top of the lane. **Silas Hoskin**, Reuben's brother, keeps the quay ropes.
- **Standing Still** (`src/data/content/isleSide.ts`, after the Grey questline): Kerra Rowse's son **Jowan** had the cough in the spring and walked into the caps. She leaves a plate at the wood's edge every night. He's standing in the lantern-cap clearing east of the staithe, grey to the elbows but not to the face. Bryony gives you reek, you burn it beside him, and he coughs it out and walks home. He doesn't remember the summer. `isJowan`: `told` (Kerra tells him all of it, by the fire) or `ill` (he was ill abed; half the staithe will tell him different by Sunday).

## Bandit forts [in game]

Every troubled region has a gang, and every gang worth the name has a fort well off the road: a log palisade with a gate toward the road, a watchtower either side of it, tents and a fire in the yard, carts of what they've taken, and the chief's hall at the back with the gang's chest. `src/data/forts.ts`, `world/sites.ts` (buildBanditFort), `game/Activities.ts`.

- **The tally.** Every gang on the Charter roads hangs a tally over its gate: an oxblood rag with a chalked stroke for every cart it has taken. The Charter pays a bounty by the stroke, so chiefs keep the tally on them, and any trader pays well for one.
- **Clearing a fort.** Kill every member of the gang, the chief's two lieutenants and the chief, and the fort is cleared: the region's standing rises, the chief's chest unlocks, and the first clear of each fort pays well. An empty fort fills again in time; gangs drift back.

| Fort | Region | Gang | Chief |
|---|---|---|---|
| **Gibbet Knoll** | Turnpike | the Knoll crew (footpads) | **Captain Saul Rudd**, who kept the tally folded inside his coat |
| **Breakneck Stockade** | Hagworm Wood | the Breakneck poachers | **Jem Garside**; the strokes are knife cuts, and some are deer |
| **Blackwater Pale** | Fleet Coast | the Blackwater wreckers | **Bettany Crane**; every stroke is a ship, and a name under the last is crossed out |
| **Red Dog Redoubt** | Raddle Barrens | the Red Dog claim-jumpers | **Josiah Kell**; the strokes are Company claims dug first |
| **Gaunt's Eyrie** | Gannet Cliffs | the Eyrie robbers | **Matty Gaunt**, who marked small so the rag would last |
| **Stilt Fort** | Wrath Levels | the Stilt Fort poachers | **Agnes Mardle**; eel traps, not carts, the rag waxed against the wet |
| **Carrack Pale** | Tolmen Moor | the Carrack tinners | **Kit Pascoe**; two rags sewn together, the first ran out |

## Outskirts and churchyards [in game]

### The outer towns' side stories [in game]

`src/data/content/outerSide.ts`.
- **One in Three** (Loveday Tonkin, Cragsby): the village takes one egg in three from the gannet ledges, and somebody stripped the north ledge bare. In the egg store, a basket packed for the Ansbury cart and a tally slip, "W.K. 14 doz. @ 1 mark": Jenkin Kemp, who owes Morwen eleven marks and hasn't been hired to climb since the road came. `otEggs`: `village` (the meeting takes his rope-share), `store` (he pays the egg store from the egg money and gives his word) or `paid` (you clear his slate).
- **Brittle Reed** (Tilly Brewer, Holme Staithe): Harrowgate's drain has taken a yard off the mere and the reed beds are dying from the roots. A reed from the old bed snaps; one from the drain bank bends. `otReed`: `rent` (Ambrose Tilney writes to Harrowgate for a reed rent, slow but sure) or `gate` (Abner Rudd lifts the sluice a hand on Saturday nights, "when nobody counts"; the gate sticks, if anyone asks).
- **Croup Winter** (Joss Trewin, Scarrow Tor): his girl Bess, four, barks like a seal all night. Caddy Nankervis says the holed stone at sunrise; Senara Kitto says steam and honey, with bitter-moss from the mouth of Carne Barrow. `otCroup`: `both` (the kettle, and the stone at sunrise for Joss's sake) or `kettle` (Caddy, ninety years at the stone, says it never cured anyone: it told them where they were from).

No town stops dead at its edge. Round Ansbury, Gullmouth, Harrowgate Works, Cotter's End, the Waystation, Kelderby, Cragsby, Holme Staithe and Scarrow Tor the land is worked: cottages strung along the roads out of town, strip fields with a headland path every few rows (walled in dry stone in the highlands), orchards, market gardens, haystacks and woodpiles. Ansbury, Gullmouth, Cotter's End and Holme Staithe have a tower mill on the highest dry ground near them; Ansbury, Gullmouth and Cragsby a gallows on a rise by the road. `world/sites.ts` (buildOutskirts).

- **Churchyards.** Every town but the Waystation and Scarrow Tor buries its dead outside the houses, near a road: a dry-stone wall with a lychgate, a small stone chapel at the far end (an altar with candles, benches either side of the aisle), and rows of graves facing the gate: round-topped headstones, crosses, slates, a chest tomb or two, and the oldest slabs leaning. Yews in the corners. The sign at the gate names it: Ansbury Churchyard, Kelderby Churchyard and so on.

## Bright-cut [in game]

Pale blue heavy plate cut square on every face, with a small square mark inside each piece: helm, plate, greaves, gauntlets and boots. Nobody in the counties knows who made it or how many suits there are; pieces turn up among what any creature leaves behind, anywhere, about once in four thousand kills, and never one you already have. Worn in twos it brings up one ore or crystal in five as two. (An affectionate nod to a certain other game's diamond armour.) `data/armour.ts` (brightcut), `game/Game.ts` (onEnemyKilled).

## Callings and their masters [in game]

A calling is for life: chosen when a character is made, as in WoW and ESO (characters from before keep one change). From level 25 anyone may apprentice themselves to a master of another calling, for 500 marks, and learn their utility skills: one can take the second utility key (7). One master at a time; a new one means going to them and paying again. Skills that only work through their own calling's craft (Kindle, Rally) aren't taught.

| Calling | Master | Where |
|---|---|---|
| Warden | **Hugh Caddick**, warden-sergeant | the Waystation toll |
| Reaver | **Bet Hollis**, keeps the ring | the Harrowgate slag yard |
| Kindler | **Tobias Fenwick**, teaches the fire | the Glass Kirk |
| Pathfinder | **Jabez Thackery**, tracker | Fellers' Camp |
| Wizard | **Rosalind Eyre**, keeper of Scarth Watch | Kelderby, where she comes down for the post |
| Mender | **Bridget Abney**, keeps the menders' room | the Minster, Ansbury (the east transept) |
| Gravecaller | **Elias Jewell**, keeps the barrows on Tolmen Moor | Scarrow Tor, by the market cross |
| Prowler | **Sal Trevenna**, knows the Gullmouth back lanes | Gullmouth, by the quay |

**Menders.** The Minster in Ansbury has trained menders for the road and the bad winters for as long as it has stood. Each one it sends out gets a lamp, because the first of them did their work at night, when the road was worst. A mender looks after the rest first: their Mend heals the most hurt companion for three tenths of their health and the mender for a third as much. Each Mend builds two Grace and each Restoration one; at five, the next Mend heals twice over and reaches everyone near. Lamp Ward lays a ward on everyone of yours close by, Sanctuary hallows the ground underfoot, and Rebuke is the answer to a brute winding up a blow. A mender's heals and wards reach a dungeon's henchmen and groupmates within forty blocks; a groupmate's go by the realm, which checks they're in the same group, the same land and close enough (`case 'gAid'` in `server/social.mjs`).

**Gravecallers.** Scarrow Tor buries nobody in a churchyard. The barrows on Tolmen Moor have keepers, and the keepers learned long ago how to ask the dead for something and give it back: a last breath, a few old bones, the cold they lie in. The moor says the dead only lend. A gravecaller curses with **Wither**, a grave-cold that eats at a foe and stores its life as **Lifeblood**; **Siphon** draws life straight out, and whatever heals past full is stored too. The blood skills (Bone Ward, Grave Rot, Raise the Fallen) are paid in health, and Lifeblood pays first. Raised dead fight beside the gravecaller for twenty seconds, then lie down again. Elias Jewell, who keeps the barrows now, teaches anyone who asks politely; most of Scarrow would sooner not sit with them.

**Prowlers.** Every port has people who move goods the Charter never sees, and Gullmouth has more than most. The ones who last learn to be somewhere else when the watch comes round, to hit first and from behind, and to fight dirty when they can't. Sal Trevenna teaches it to anyone who can pay and keep quiet, and says she has never once been to the Smugglers' Hole.

`data/classes.ts` (chosenUtilities, crossUtilities), `data/content/masters.ts`.

Each master keeps **training dummies** in their yard, three sacking men on posts with a target daubed on the chest: hit one and the count shows over your action bar (damage a second, the total, your best blow), and it's whole again a few seconds after you stop. No experience comes off a dummy; it's for trying a build (`DUMMY_SPOTS` in `data/content/masters.ts`).

## Bows [in game]

Bows are made where people hunt: the Hollin smithy's **hunting bow**, the Hagworm fellers' **yew longbow**, the Gullmouth coast trackers' bow, the Wrath Levels **fowling bow** and the Tolmen Moor **horn bow**. With a bow in hand, Strike looses an arrow at your target up to twenty-four blocks off instead of swinging; a quiver rides on your back while you carry one. Pathfinders start with a hunting bow. `data/weapons.ts` (bow), `entities/humanoid.ts`, `game/Game.ts` (loose).

## Homes [in game]

- **Wendside Cottage**, on the Ford road east of Hollin Ford: one room and a hearth, sold as it stands. **The Wendside lots** beside it: five plots the Charter is letting to pay down the bridge debt, with the land board between the rows.
- **The Charter's estates**: a row or two of lots by every Post town, levelled, staked at the corners and roped along the front, on a lane of their own with a track out to the road and the estate's name where it meets the road. Tenter Field and Bell Croft by Ansbury, Carters' Close and Drovers' Garth by the Waystation, Sawpit Row and Bark Lane by Fellers' Camp, Gull Rise and Netloft Lane by Gullmouth, Ore Lane and Furnace Close by the Works, High Garth and Fold End by Kelderby, Crag End and Scree Row by Cragsby, Staithe Close and Reed Garth by Holme Staithe, Tor View by Scarrow Tor. In Morrow the Assembly lets lots on the Charter's terms by treaty: Sala Gardens and Roig Terrace by Callis, Scarp Row and Archive Close by Northgate, Larch Row and Wold End by Branchley, Rim Row and Plumb Close by Liftwick, Well Row and Caravan Close by Tenwells (`src/data/estates.ts` from `scripts/estates.ts`).
- A lease is ninety-nine years and 2,000 marks, and you build to your own plans at the lot's stake. **One home to a character, and one holder to a home**: the realm keeps one book (`server/homes.mjs`), everyone sees the house its holder built and their name on the board at the gate, and only the holder and their guests go in. Anyone can knock; the holder is asked to let them in. **A lease nobody comes back to for three months lapses** and goes back on sale; the holder's furniture goes ahead by the Charter Post.
- **Building by hand**: on your own lot you can lay blocks and dig them out, anywhere inside the stakes, from three blocks under the floor to twenty-four above it, the builders' walls included. The land clerks sell stone, brick, timber, plaster, glass and garden earth from the builders' yard, a block apiece (`src/game/LotBuild.ts`, `src/data/content/buildyard.ts`). **Marti Coll** keeps the Assembly's book by the Post in Callis.
- **A stall at the gate**: a lot's holder can put up a stall in the front garden and set out what they'd sell at their own prices. Anyone passing can buy, holder there or not, and the takings are paid to them in full; a stall takes no cut, unlike the Exchange's brokers, and keeps its stock a month. Give up the lot, or let the lease lapse, and the stall's stock comes home (`server/exchange.mjs`).
- **Stations of your own**: a joiner's bench, an iron cooking range, an anvil and a house forge are furniture like any other, made at the town bench and anvil (woodcutting 12, smithing 14 to 20). Set one down in your own house and it works like the town's, so a holder can cut, cook, smith and smelt without leaving home.

## Roadside inns [in game]

Out on the roads, a day's walk from any town, four inns keep a taproom and let rooms: **The Packhorse** on the Hagworm Wood road (Tamsyn Lugg; carriers stop going into the wood and coming out), **The Half Way House** on the north road to Cragsby (Osric Penhale, who came to work the egg cliffs and stopped for a drink), **The Dyke End** where the Wrath Levels road turns into a bank (Judith Fenner, Sim Fenner's niece; porter and eel pie from Holme Staithe), and **The Bield** on the Tolmen Moor road (Robert Trewin; bield is moor speech for shelter, and there's no other roof till Scarrow Tor). Each has a bar, tables, a hearth and a stair to five rooms let by the week (120 marks), rented at the room's door like a lodging house's. `data/lodgings.ts` (inn), `world/sites.ts` (buildLodging, tavernRoom), `data/content/inns.ts`.

## Smithies [in game]

Besides the smithy in Hollin Ford, every town of any size keeps a smithy by its Charter Post that anyone may work in: Ansbury (inside the south gate), Gullmouth, Harrowgate Works, the Waystation, Fellers' Camp, Kelderby, Cragsby, Holme Staithe, Scarrow Tor, Gillsby Staithe and Cotter's End. Each is an open-sided shed under slate with a brick furnace (fire in its mouth, a flue through the roof), bellows, an anvil and a quench barrel, a joiner's bench, and a cook fire in the yard. `world/sites.ts` (buildSmithies).

## The farms [in game]

The towns are fed from farms let out round them: six round Ansbury (Lower Farm, Highfield, Oxleaze, Copse Farm, Long Acre, Mill Farm), two round Gullmouth (Coldharbour, Pease Hill) and two round Harrowgate Works (Rookery Farm, Dove House Farm). Each has a thatched farmhouse, a barn, a yard with a well and a cart, hay, fenced strip fields, a paddock of cattle (or sheep), a stone pigsty with a lean-to, hens loose in the yard, and its name on a board at the gate. Cows and pigs are kept only on farms. `world/sites.ts` (buildCityFarms).

## Harbour lights [in game]

Besides Fleet Light on the Fleet Coast, every harbour keeps a light of its own on the nearest headland: **Gullmouth Light**, **Staithe Light** (Holme Staithe) and **Gillsby Light** (Inkholm). Each is a banded tower of red and white with a glazed lantern room that shows at night. Cragsby, for all its cliffs, is inland and has none. `world/sites.ts` (buildHarbourLights).

## The wilds' heavier kinds [in game]

Each country has a kind or two beyond its wolves and boars: brown bears on the Crown Road, white bears in Starfall, cave bears in the Held; great spiders (the bramble weavers of Hagworm Wood, raft spiders in the fens, grey weavers on Inkholm, glade spiders and barrow spiders in Morrow); bats in the sea caves, on the Gannet cliffs, over Kell's ash and in Morrow's quarries; heath, fen and red adders, and the mangrove snakes of the Keys; and on the Glass Flats the wild drakes, cousins of the caravans' walking drakes. On the high moors, the frozen north, the slag of the Raddle and the Sunder, **the old cairns sometimes get up and walk**: boulders held together by moss and roots, a mark nobody alive can read cut into the stones and lit from inside. Nobody knows who raised them. The Tolmen shepherds leave them be and walk round.

## The festival year [in game]

Seven fairs, on the real calendar, each kept at every Charter Post: bunting, a stall that takes the fair's own token, a centrepiece, and a writ. `data/festivals.ts`, `game/Festivals.ts`; the rounds, creatures, bags and hats in `data/seasons.ts` and `game/Seasons.ts`; the stories in `data/content/seasons.ts`.

- **The round.** Every fair has a round to make about each town, once a realm day: griddles, eggs, fires, sheaves, doors or geese. Each call pays a token or two, sometimes the fair's food, and now and then a festival bag.
- **The creature.** Every fair has a creature out of the counties' own stories that comes on the realm clock to one place. Its followers come first, then itself. It shows on the map while it's out and for a few minutes before. Once a realm day; it pays 12 tokens and a bag.
- **Bags and hats.** A bag holds tokens, food, now and then a fair's dye, and very rarely its hat. Every fair's hat also comes from its story. A hat goes into the wardrobe for good.
- **The stories.** While a fair is on, someone comes to Hollin Ford square with a job round the vale that ends at the fair's creature. Done once; they come back every year.

| Fair | Dates | Round | Creature (where, realm hours) | Story (Hollin Ford square) | Hat |
|---|---|---|---|---|---|
| **Shrovetide** | 2–24 Feb | tossing pancakes at the griddles | **Jack-a-Lent**, the straw man everyone throws things at, with his strawlings (the Wetlings green, 11–15) | **Hannah Brock** rings the pancake bell; her three pans are lent out round the vale | the fool's cap |
| **The Lambing Fair** | 20 Mar – 20 Apr | finding pace eggs | **Red Reynard** and his family (the fold below Ashcroft, 18–22) | **Ezra Dunn**, shepherd; three ewes have gone up the hill to lamb | the garland |
| **Midsummer Watch** | 14 Jun – 10 Jul | lighting the watch-fires | **The Hob** and his will-lights (the Hollow Oak, Hagworm Wood, 22–3) | **Kezia Lusk**, herb-woman; fern seed, which falls only on Midsummer night | the horn-dance antlers |
| **Harvest Home** | 18 Sep – 20 Oct | gleaning sheaves | **The Corn Wolf**, let out of the last sheaf, with its whelps (the fields by Cotter's End, 15–20) | **Nathaniel Crouch**, farmer; nobody will cut his last sheaf | the harvest crown |
| **The Lantern Wake** | 24 Oct – 10 Nov | souling at doors with a candle | **The Lantern Man**, a fen light that leads people into the water, with his wisps (the Lantern, 20–4) | **Absalom Pinnock**, the Wake bellman; a straight path of candles | the turnip lantern |
| **Goose Fair** | 14 Nov – 3 Dec | catching loose geese | **Old Hissing Jack**, the fair's champion gander, with his wives (the Waystation green, 9–14) | **Martha Gooding**, goose-girl; Jack's three wives are loose | the goose fair hat |
| **The Frostfair** | 12 Dec – 6 Jan | carolling at wreathed doors | **Old Rime**, out of Peg's Water in a hard winter, with rime-jellies (Peg's Water shore, 16–23) | **Prudence Holt**, fair-warden of the ice; it froze in a night | the bobble hat |

### Guising on the Wake [in game]

On the Wake nights children go round the doors in costume, which the dales call guising: whoever answers has to guess who you are before they hand over a soul cake. The towns put a carved turnip on the step, hang turnip lanterns from posts along the streets, and stand a scarecrow on the green to keep the Lantern Man off. After dark, pale lights drift between the houses. Nobody admits to knowing what they are.

The Wake stall sells the guising clothes for wake candles: Scarecrow, Bedsheet ghost, Skeleton, Hedge-witch, Crow, and the Lantern Man's coat. The Lantern Man sometimes leaves his coat behind when he's driven off. A costume goes on over your clothes and armour under Costume, with Change look, and is for looks only. The stall also sells parkin, toffee apples and mulled cider, plus a carved turnip, gourds and a scarecrow for your own house. Collecting all six costumes earns the title Guiser.

Any trader who sells clothes, armour or costumes lets you **try a piece on** before you buy: it shows on you until you walk off, close the shop or half a minute passes. The store's showcase shows its outfits and pets on the character you have chosen.

### The Wake Fair and the pumpkins [in game]

Six years ago a Morrow ship put in at Gullmouth with pumpkin seed in her hold, and the Wend valley took to it. Hollin Ford now grows a patch on the meadow east of the bridge, and for the Wake it holds a fair there round it (`data/wakeFair.ts`, `game/WakeFair.ts`, `data/content/wakefair.ts`). The old families still carve turnips, and say so; the young ones carve pumpkins, which see you through to the Goose Fair. For the Wake, carved pumpkins sit at the foot of road lamps, by signposts, wells and doors right across the counties.

- **Hoop-la**, kept by **Dilly Marsh**: five rings over pumpkins on a stepped table, the back row worth three.
- **The Lantern Shy**, kept by **Barnaby Coombe**, who has carved turnips for forty years and puts both kinds on his rail to keep the peace.
- **Bob for Apples**, kept by **Prue Fettle**, timed by the Wake rhyme said twice (there is a second verse; she doesn't do it in front of the Reeve).
- **The Giant Pumpkin**, judged by **Ida Pell**: one guess at its weight a day, a new pumpkin every morning. The heaviest she has weighed was 912 pounds.
- **Carving**, by **Barty Rudd**: pick a pumpkin from the patch and he cuts the face you choose.

The games pay in wake candles (the first three goes a day at each), now and then a toffee apple, and rarely the fair's top prize off the pole: a **pumpkin head** to wear.

## The Sickle [in game]

The frozen isle in the far north sea, past Kell: a crescent of snow fells round a sheltered bay, **Sickle Water**, its horns pointing south toward the mainland. Broad and high across the north, narrowing and dropping to the horns; the bay's shallows freeze, and a few stunted pines grow low in its lee. Levels 42 to 50. Davey Penrose's island boat runs out from Gullmouth. (`src/world/terrain.ts` SICKLE, `src/data/sickle.ts`, `src/data/content/sickle.ts`, `src/data/content/sickleSide.ts`)

- **Hookness**, the whaling town on the inner shore of the east horn, cut into the fell's foot: one street up from the quay between dark-timbered houses under slate, the Flensing Knife and the reeve's house, the try-works (brick furnaces, the oil casks, a whale's jaws for a gate), and the chapel at the street's head. Whaleboats on the shingle; an ice-fishers' camp out on the frozen shallows.
- **Westhorn Tower**, off the tip of the west horn: a watchtower of the old kingdom the sea came up round. Its ringers rang the boats home through fog for three hundred years. The last, **Ebba Lind**, stayed at the rope as the water rose and rang until it took her.
- **The Snowbarrows** on the crest across the north: five barrows kerbed with stones, each cut with a bell. They are the Westhorn ringers' graves: Aud, Hallvard, Tora, Ivo and Brand Lind, Ebba's father. There is none for Ebba.
- **The Steam Wells**, hot springs in a fold of the north-west fells where the snow won't lie. The water smells of iron and eggs, and Hookness swears by it for the lung fever.
- **The Glimmer**, an ice cave in the north-east fells, and **Grey Meg** at the bottom of it, a she-wolf the size of a pony.
- The drowned of the old kingdom come up the shore on still nights as **rimewights**. Ice wolves, ice bears and fell cairns walk the fells.

| Name | Role | Wants | Won't admit |
| --- | --- | --- | --- |
| **Annis Kettlewell** | Reeve of Hookness; owns the try-works | The bell at the bottom of the sea | She's frightened of it |
| **Ida Coulter** | Keeps the chapel and the drowned tally | The drowned rung home | — |
| **Bram Ellery** | Harpooner. His brother Alf went through the ice off the west horn | His brother's iron back | He thinks Alf is out there |
| **Elsie Fenwick** | Ice-fisher | Pip off the thin ice | She showed Pip the char hole first |
| **Robin Grice** | Keeps the Flensing Knife | Full casks | — |
| **Tobias Gunn** | Foreman at the try-works | The passage south | He's drawing off oil for the Kittiwake |

- **The Bell Under the Ice** (`sickleBell`): the bell rings under the ice off the west horn and the rimewights come up toward it. Annis wants it cut down; Ida lends the ringers' book. At the top of the tower the Ringer is still at the rope. `sickleBell`: `cut` (the bell goes into the sea; the drowned stop coming, and Hookness comes home by the sound of the surf in a fog) or `rung` (the home peal from Ebba's last page; the ice goes still, and Ida keeps the bell as the fog bell).
- Side stories: **Iron for Alf** (`alfIron`: Bram throws his brother's harpoon again, or it stays on a cairn on the horn), **Past the Red Flags** (`pipTold`: Pip barred from the ice, or Elsie's char hole), **Short Measure** (`oilTold`: Tobias Gunn sent south, or paying Robin back and owing you), **Grey Meg**, **The Names on the Stones**, **Warm Water**.

## Kell [in game]

An island north-east of the Fleet Coast, a day out from Gullmouth with a fair wind: one old volcano, the Kiln, with a flat crater on top. Sailors call it the island that smokes. `world/terrain.ts` (KELL, KILN), `data/kell.ts`, `data/content/kell.ts`.

- **The Kilnfolk.** Kell's people: short and broad (mainlanders say short; the kind ones say broad), long-lived (a hundred and forty, some), careful, and blunt. They came when the Kiln was louder than it is and have been quieting it ever since. Their saying is "let it out slow". They work brass and copper; their houses are dark stone framed in brass, roofed with copper gone green.
- **The Wheel.** Seven Kilnfolk who sit in the Wheelhouse in Brasswick and decide things, slowly. Ebrel Rundle keeps it ("I count when they've finished arguing"). Its badge is a small brass cog on a pin; they don't give them to mainlanders.
- **Brasswick.** The harbour town on the south-west shore, under the hill. The Wheelhouse with the town's cog turning on its gable, the Lamp & Spanner (Loveday Hocking), Agnes Lusty's forge, Tonkin's (brass and instruments, Gerens Tonkin), and Harrowgate & Daughters' office, let to the company for the iron trade (Piran Hext). Iron comes in from the mainland; copper goes out. Jory Tallack runs the Kell boat to Gullmouth.
- **The Escapement.** The engine sunk in the Kiln. It lets the mountain breathe out a tick at a time and turns every hammer in Brasswick on the way. Its speed is held by the Governor, two arms with a weight on each that swing out as it runs faster and check it; it is driven by the Mainspring. Its keepers are automata as old as the engine: wardens with hammers, springs, and Old Tallow, who keeps the lamps. The Works stand over it in the crater: the Escapement Gate, the Great Wheel turning in its stone frame, steam stacks, and the pipes out to the relief vents on the slope (the Bellmouth, the Sour Vent, the Old Stack).
- **Crystal is lift** (see the Weatherholms). In spring Kenver Sowden, the Works' young engineer, refitted the Governor with weights of star crystal bought from Piran Hext: lighter, stronger, quicker to answer. They never swung out. The Governor stopped checking the engine; the Escapement ran away; the vents blew; the automata woke for what they took for a working day and would let nobody down. Hext knew: it is on page four of the assay, and he had been at the Weatherholms.
- **The Escapement (the questline).** The Island That Smokes (Jory at Gullmouth), Let It Out Slow (shut the three vents), Worn on One Side (Kenver, and cogs from the brass mites: worn on one side only, driven too fast for months), Page Four (Hext; then who answers to the Wheel, flag `kellBlame`: `hext`, Harrowgate fined and its ships kept out of Brasswick for a year; `kenver`, a year off the Works for Kenver, and Harrowgate pays for iron weights), and The Escapement (the group dungeon: fit Agnes Lusty's iron weights to the Governor, let the Mainspring down). Afterwards the Works tick slowly again, and the Wheel met for twenty minutes, which has never happened.
- **The Escapement's rooms.** **The Gearhall treadles**: three treadles far apart down the Gearhall, the night winders' way of raising the brass grille at its end, one man to a treadle. **The Boiler Deep**: the brass men climb off their line in waves while the boiler's fire burns white, until it drops back to red. **The winder's stair**: the night winder keeps the last grille's key on a chain round his neck. The Kilnfolk's grilles are brass on a toothed rack.
- **The Wheel's Cog** (`src/data/content/isleSide.ts`, after the Escapement): **Hedra Penhallow**, eighty years on the Wheel, lost her cog badge on the slope. There are seven cogs for seven seats, and no spares. The brass mites hoard everything bright in a cleft above Brasswick (buckles, spoons, nine thimbles, a doorknob). You bring it back, and Ebrel tells you Hedra's hand was the first up when the Wheel voted you its badge.
- **Eleven Hours Fast** (Loveday Hocking, `src/data/content/keysKellSide.ts`, after the Escapement): Old Tallow came up out of the Kiln when the engine ran away and has lit Brasswick's lamps ever since, at noon. Gerens Tonkin cuts him a new regulator wheel from brass mites' brass, to town hours (he lights Brasswick at dusk) or the Works' (he goes back down to the lamps he was built for).
- **The land.** Black ash on the shore and in the crater, live rock (ember rock) glowing in the crater floor and the vents, bare rock and ash on the upper cone, short grass and a few wind-bent pines below. Cinderhounds, ash-crawlers, vent jellies (which lob scalding mud), and brass mites, the Works' small automata, out on the slope stripping anything bright.

## Cloak devices [in game]

A cloak may carry a device worked in its trim colour. Folk in the counties read them as badges, so a device is earned or bought rather than chosen idly.

- **The Charter Market tailor** in Ansbury sells the plain heraldic ones: bordered, quartered, chevron and chequy. The chevron is a roof, whatever the Charter clerks say. The Weighhouse men wear chequy on quarter-day.
- **Deeds.** Burning all seven bandit forts earns the tally (four strokes and a fifth across, the bandits' own count). Finding the six wonders earns the star. Bringing down every festival creature earns the lantern. Burning the Old Bed on Inkholm earns the Reekers' flame.
- **Under the hills.** The Kettle's frost star and the Sallow Pit miners' crossed picks come up rarely from those dungeons' bosses.
- **The Laurel.** A wreath of bay, the old sign for someone who went back down a second time and did it the hard way: the first veteran clear of any group dungeon.
- **Revered standing** with a region earns its own sign: Hollindale's mill wheel, the Turnpike's toll-key, Hagworm's oak leaf, the Fleet Coast's three waves, the Harrowgate Company's anvil, the Scarth peak, the gannet of the cliff villages, the reeds of the Wrath Levels, Tolmen's three stones and the Inkholm cap.

## Quarters [in game]

The tavern game of nine squares, played on a board scratched into the table or a sack across the knees. Each tile is painted with a creature of the realm and has a number on each side; you take turns laying five on a board of three by three, and a tile laid beside one of the other player's turns it to your colour wherever your side facing it is higher. Most tiles at the end wins, and the winner takes one of the other's. Players across the Counties: Ivy Marsh at Hollin Ford, Josiah Yeo and Hester Vowles at the Waystation, Clement Fry in Ansbury, Bet Polglase in Gullmouth, Doll Hobday in the Company Canteen, Odo Fenn at Fellers' Camp, Cai Morgan at Kelderby, Tib Corran at Cragsby, Kerensa Garth at the Peat Fire on Scarrow Tor, and Lorne Rush across the sea in Reedwater, the easy ones first. A stranger's first five tiles are wolves and jellies; the great tiles come off the creatures themselves, Old Notch's always and a world boss's one time in four. (`src/game/quarters.ts`, `src/game/QuartersTable.ts`, `src/data/cards.ts`.)

## Wagons [in game]

- **Wagons** (`src/data/content/wagons.ts`): carriers, drovers and caravan masters drive their own wagons where the Charter's carts don't go. A wagon is bought like a horse and called like one; the driver sits on the box, friends ride on the benches in the back, and the bed carries goods. Left standing, it waits where it was left, which is how a miner works a seam all day and drives the lot home at dusk.
- **The Carrier's cart** (Ansbury Stables): open, a bench across the back, the carriers' cart between the market towns. **The Drover's wagon** (Company Stables, Harrowgate): a canvas tilt over five bows and a company shire in the shafts; drovers live in them from spring to Goose Fair. **The Tenwells caravan** (Cass Moran, Tenwells, once the reavers are dealt with): a dune-dyed tilt and a slabback that has never hurried; the trains between the wells carry a season's water in them.

## The law [in game]

- **Every town keeps its own book** (`src/data/justice.ts`, `src/game/Justice.ts`): strike a hen in Ansbury market, a carter in Gullmouth or one of the watch anywhere, and if anyone sees it, that town puts a price on you. Its watch knows your face from then on; the next town over does not. A small price gets a warning; a bigger one, a guard comes to take you in; a big one, or a blow at the watch, and they come with blades out. Prices fade if you keep out of trouble, ten marks a minute, and half that while you are away from the realm (up to a day's worth at a time).
- **Taken in**, you pay what is owed on the spot, go quietly, or run. Going quietly, or beaten down, the watch's wagon (a black horse, an iron cage) takes you to the gaol: **the Weighhouse cells** under Ansbury, kept by Ezra Gale, or **the Tolbooth** under Callis, kept by Mateu Bosch. You sit your time; picking oakum or lying on the plank bed shortens it; a lockpick gets you out sooner with a worse price on your head. Lodgers: Dick Pender (one rabbit), Moll Tretheway (one lamp, in one window), Quim Soler (waiting on Saltpenny).
- **Clearing your name:** the **Ropewalk Cellar** under Gullmouth, down a hatch by the Charter Post: Nell Kitto has your name lose itself from every town's book for the price and a quarter again; Abe Rowse buys what you would rather not explain and sells picks. In Morrow, Gil Fenner in Saltpenny has the Brethren speak to the right clerk. Saltpenny keeps no book at all.

- **Skua Rock** (`src/data/skua.ts`, `buildSkuaRock` in `src/world/sites.ts`, `src/game/Rock.ts`): the Charter's prison for the worst it catches, a sheer oval of rock three hundred blocks off Gullmouth, close enough that the convicts hear the town on a still night and see every lamp in it from the yard. Taken in with a price of 1,200 marks or more in one town's book, you don't go to the town cells: the wagon takes you down to Gullmouth's south jetty and **the Tern**, the Charter's black-hulled boat, takes you out in irons with three others and two guards. The landing is cut into the west end; the Steps go up to the sally port; on top stand the cellhouse (forty cells back to back in two rows and two tiers, the utility corridor between them, Broadway down the south side with the mess at its west end and the gun gallery over it), the walled yard with its towers, the work shed with the oilskins drying behind it, the quarry, the lighthouse, the barracks, the water tank and the warden's house. The supply boat takes visitors with the warden's leave.
- **On the Rock** you're in **B 14** on Broadway, barred in from lights-out at nine till six. By day you have the yard, the work shed and the stone detail: a stint of six blocks broken takes a fifth off what's left of your time. Leave the prison's ground and the tower shouts you back with time added; the current takes swimmers and the guards' boat fishes them out.
- **The way off**, as **Amos Kitto** has planned it for eleven years and is too old to take: scrape out the vent grille behind your bunk with a sharpened spoon handle, take four oilskins off the work shed's lines for a float, then through the vent into the utility corridor, up the ladder, out through the roof hatch, down the drainpipe at the north-east corner and the gully to the rocks, and push off for the dunes north of Gullmouth in the dark. Gullmouth's price on you goes up by half again and three hundred more. **Mags Tregear** will forge a release in the warden's hand for two marks a second of your time.

| Name | Role | Wants | Won't admit |
| --- | --- | --- | --- |
| **Ruth Ashdown** | Warden of Skua Rock | Every one counted in and out | She admires the one who got away |
| **Nance Pollard** | Sergeant of the landing | Nobody landing without leave | She can't read past the stamp |
| **Will Yelland** | Guard, the cellhouse | Lights out on time | He's frightened of Saul Brack |
| **Amos Kitto** | Eleven years on the Rock; robbed the Charter's pay chest | Somebody to go | Nell Kitto under the Ropewalk is his daughter, and clears every name but his |
| **Dory Penhale** | Came out on the Tern; a boy | His mother not to worry | His brother never did six years on the Rock; Dory made it up on the boat to sound hard |
| **Saul Brack** | Was captain of the Gannet, for the Brethren | His ship back from Ned Vey | He knows who sold him |
| **Mags Tregear** | Forger; did the Assembly's seal for eleven months | Steady hands | She spelled Callis wrong on purpose |
| **Jenna Penhale** | Fishwife, Gullmouth's fish quay | Her boy home | She reads his letters twice |

- **A Letter for Gullmouth** (Dory Penhale): Dory won't let the warden read what he writes to his mother; carry his letter to Jenna Penhale on the fish quay when you're off the Rock.

## Ships of your own [in game]

- **The yards** (`src/data/naval.ts`, `src/game/Sailing.ts`, `src/data/content/naval.ts`): **Hal Treloar** on Gullmouth's quay, **Kester Bligh** at the Careen in the Teeth (Brethren-built: they sail), and **Pau Ferrer** for the Assembly's yard at Callis (everything in triplicate). Any of them hires you a ship by the hour, lays one down for you if you bring the timber, cable, sailcloth, iron fittings and tar, brings yours round to the berth, raises her if she's sunk (a tenth of what she cost), and paints and names her. Three keels to a captain.
- **The ships:** the **cutter** (one mast, two guns a side, quick: the revenue's favourite and the smuggler's), the **brig** (two masts square-rigged, four a side: the Brethren's working ship) and the **frigate** (three masts and a gun deck, seven a side; the Assembly has four). Cable comes from Rook's Ropewalk, sailcloth and tar from Hal, fittings from any anvil, tar from pine at a furnace.
- **Sailing:** sail set and taken in, the helm over, and the **wind**, which is everyone's and backs and veers round the compass over the hours: across it or behind it a ship runs, up into it she stops. Her guns are on her sides, so you fight her by turning her: bring the other ship abeam and fire.
- **The lanes:** **Brethren raiders** (cutters, and brigs further out) work the sea east of the Mewstones and out across the open water toward Morrow; **revenue cutters** off Gullmouth come for captains with a price on them. Out in **the Freewater**, the open sea between the continents, any captain may fire on any other, and the realm keeps the score.
- **First Command** (Hal Treloar): take a ship out into the lanes east of the Mewstones and put a Brethren raider on the bottom, and come back and tell Hal how she handled.
- **Living aboard** (`src/data/cabins.ts`): every ship of your own has her cabin under the quarterdeck, and it's a home. A cutter has **the cuddy** (room to sling a cot and stand up straight, just), a brig **the master's cabin**, panelled, and a frigate **the great cabin**, the width of her stern, with a gallery outside its windows to sit out on. Go below from beside her helm, or have the yard's boy row you out to her where she lies; come up on her deck again, or ashore by her berth if she's gone back to the yard. The cot is made up (sleep for the rested bonus), the sea chest is your bank, and the rest is yours to furnish as a house, crafting stations and all, one layout for each kind of ship you own. It's yours alongside a house ashore, not instead of one.

## Morrow, the second continent

The rest of the expansion across the eastern sea (Saltpenny Key, Northgate, Kingsbarrow, the Brethren, ships and the later chapters) is still planned in docs/MORROW.md.

### The crossing [in game]

- The world is one world: Morrow lies east of the Counties over open sea (`src/world/land.ts`, `src/world/morrow.ts`), and you could row there, or swim, if you had the days. The packet ship **the Constant** runs Gullmouth to Callis and back, a day and a night each way. **Hal Sennen** is her master; she was his mother's before him, and he has sailed her twenty-two years. The fare is 20 marks, and he takes nobody under level 30.
- The voyage is played the whole way: you board at the quay, she casts off and stands out to sea with you on her deck, and she sails the real sea between the lands, south inside the Mewstones, out across the open water to the south-east and up Morrow's east coast, with the coasts going by, until she comes into Callis and you step off onto the quay (`src/game/Voyage.ts`; her course is `PACKET_COURSE` in `src/data/travel.ts`). The world map's **World** view shows both lands on one sea, the Charter Counties to the west and Morrow to the east, with the Constant's course drawn as she sails it, and the island boat's lanes out to the Mewstones, Inkholm, Kell and the Sickle (`src/ui/worldMap.ts`, charts from `npm run charts`).

### Callis [in game]

- The Assembly city at the mouth of the Call, on the Bright Coast (`buildCallis` in `src/world/sites.ts`). The river runs through its middle between stone quays, under three bridges. North of it: the Towers, five white towers pinned with black at every course, round the Assembly's plaza and the domed Assembly Hall. South of it: the Market and the Hall of the Two Stones on its rise. Along the sea: the docks, four piers and the light at the harbour mouth.
- Houses are white stone with cream quoins, a cream band at each floor and a black stone plinth: the two stones of Callis. Players can build their own house front this way ("Callis stone").
- Callis names are short and plain: Ferrer, Oms, Sala, Vidal, Mas, Coll, Roig.
- Its monuments (`src/data/monuments.ts`): the Warden's Plumb, hanging two fingers off its old mark; Rosa Roig the net-mender on her bollard, a real net on her knees renewed every spring; and the First Stones, the white lifted off the black by a knife's thickness.

| Name | Role | Wants | Won't admit |
| --- | --- | --- | --- |
| **Pau Ferrer** | Harbourmaster | To be told what comes through his harbour | — |
| **Clara Oms** | Clerk to the Assembly's Works Committee | Not to be the one who wrote it down | She copied the lines for you on purpose |
| **Benet Sala** | Speaker of the Assembly | The towers standing, whatever it costs and whoever carries it | He knows exactly who the Brethren are |
| **Marta Vidal** | Warden of the Towers | The truth about the lift, said out loud | She hopes every morning she's read the gauge wrong |
| **Isidre Mas** | Keeper of the Hall of the Two Stones | People to remember the stones come as a pair | — |
| **Jaume Roig** | Cuts the black for the tower pins; sells iron | — | He isn't glad of the work |
| **Pere Coll** | Sardines, olive bread and Callis red in the Market | — | — |

- **The Two Stones.** The white lifts; the black holds. Callis's old builders raised the towers in a lifetime on the white and pinned them with the black. The white in the old walls has been settling for three hundred years, and settled crystal lifts: since midsummer the Old Tower has risen two fingers, the Morning Tower a finger and a half, the Evening Tower a finger (the Warden's plumb gauges).
- **The black.** The Works Committee has bought nine hundred weight of the black since midsummer, against forty in a usual year: "A. Pryce, for Harrowgate & Daughters", delivered by the **Kittiwake**, a Brethren hull out of Saltpenny Key. Jaume Roig has cut four hundred pins this year.
- Letters off the packet: Isidre's sister writes that Northgate has shut its gate "for the winter", which it has never done; Marta's son on the Sunder's skyfarms writes that the slabs are higher this summer.

### The Third Daughter, chapters XVII and XVIII [in game]

Quest ids `tdCrew` and `tdCallis`, with `tdJoan` and `callisLetters` alongside; everything is in `src/data/content/callis.ts`.

- **XVII, Half a Crew.** Once the Drowned Parish is done, Nessa Crane has news: a Morrow ship, the Good Return, came into Gullmouth half-crewed with northern passengers who won't say what they left, and her master asked after the Third Daughter. Aubrey Pryce talked Delia into one ship, one season, buying crystal in Morrow out of the Charter's reach; the Third Daughter sailed while the player was at Holmsey, with Delia's signature on his papers, and Pryce is gone from the Works. Delia pays the player's passage on the Constant (flag `tdPassage`: crossings are free on her account). Joan, separately and without telling Delia, gives forty marks and her plumb bob and wants numbers on Morrow's towers (`tdJoan`; the letter goes back through Pau Ferrer on the packet). Pau Ferrer remembers the Third Daughter: she came in at midsummer, her buyer went straight to the Assembly, and she sailed two days later, empty.
- **XVIII, Nine Hundred Weight.** Clara Oms shows the Committee's lines and gives the player a copy. Marta Vidal explains the lift and sends the player to read the three gauges. The Speaker, shown the lines, admits the Kittiwake is a Brethren hull, that the Brethren carry the black to Callis, and that Pryce went south with them to Saltpenny Key in the summer. Benet Sala: he would rather buy black from thieves than watch the Old Tower walk off into the sky. From then on the packet runs from Callis to Saltpenny (flag `saltFerry`).
- **XIX, What Pays** (`tdSalt`, `src/data/content/saltpenny.ts`). Mara Coyle of the Kittiwake loads the black in the north and won't say where: cargo is the Captains' Table's business. Ned Vey will tell, for a price. Pryce has started running black past the Brethren with Key wreckers, who don't fly Brethren colours and have sunk two Brethren boats this summer. The player either drives off the wreckers at Wreckers' Bight and burns their boat, or owes Ned a favour (flag `tdFavour`, owed when a Brethren captain asks; it matters at the end). The black loads at **Cold Harbour**, a cove under the Greywaste cliffs, two days north of Callis. Diggers bring it down from the barrows in carts, and Pryce pays and signs for every load. He went north with the last load a month ago and didn't come down. The diggers say the dead got up where they dug, and they have stopped coming down too.

- **XX, Lie Still** (`tdHeld`, `src/data/content/greywaste.ts`). The Kittiwake takes the player to Cold Harbour (flag `coldFerry`), or they go overland. The cove is empty but for **Wat Aske**, the last of Pryce's twelve diggers. On **Hollow Fell**, the barrow-field on the moor above, they lifted the black the old kingdom laid over its dead in slabs, "like a blanket", and the dead got up: one a night, then three, then all of them. These are the **Held**. Pryce paid double to keep digging, then took the hardest men north to **Kingsbarrow**, the old king's barrow, where the best black is. The player lays the black back over Ma's barrow, the last one opened, and the dead round it kneel and lie down. At **Northgate**, the Gatekeeper **Ursel Hale** has shut the gate; Pryce went through with twenty men the day before. **Edda Rusk** at the Gatekeepers' Archive shows the oldest roll: the old king's people laid the black over their dead so they would lie still, and the wall was built after the kingdom fell, in case anyone forgot. If Pryce lifts the king's black, the whole Held gets up at once. Ursel opens the postern to the player (flag `postern`).

- **XXI, The King's Black** (`tdKing`, `src/data/content/kingsbarrow.ts`). **Ebba Platt** walked out of the dig when they broke into the king's hall. Under the king's barrow (the group dungeon **Kingsbarrow**, level 95): Garrow Venn, Pryce's foreman, and his diggers; the Hall of the Kneeling, where the king's guard kneel in rows and the Barrow-warden keeps the door; and the King's Hall, where Pryce lifts the last slab and the Old King sits up on his bier. When the king lies still again, Pryce is waiting. He bought low and sold high; it's the only thing he's good at. The king's black is enough to hold every tower in Callis for fifty years, or to keep the Held lying down: not both. He leaves it to the player (flag `tdEnd`):
  - `back`: the black goes back, at Kingsbarrow and on the fell, and the Held lie down. Callis takes its tallest towers down a storey at a time, and the Assembly never forgives the Counties. Pryce comes home on the Third Daughter with nothing, and works the books at Joan's smelter at the posted rate.
  - `hold`: Northgate keeps the Held behind its wall, Harrowgate sells the black under Assembly licence, and the Greywaste is given up. Pryce comes home rich and buys for Harrowgate again, one price on every line.
  - `sink`: Ned Vey sinks the black in deep water off the Keys (if the player owes him, this is his favour). The Held lie down slowly, one a night, the towers come down anyway, and Saltpenny is owed by everyone. Pryce comes home in irons on a Brethren cutter and waits on the spring assizes in Ansbury gaol.
- **XXII, His Book** (`tdHome`). Delia Harrowgate reads Pryce's book at last: every line he signed with her name, and the two prices on each. She always knew what was in it; she didn't want to know which lines. The player keeps the last volume ("One king. A.P."). Benet Sala, Ned Vey, Ursel Hale and Ebba Platt each say how it went.

### Act IV's added chapters [in game]

Act IV is nine chapters (XXVII to XXXV), with three added (`src/data/content/actFour.ts`): Who Tam Writes To after What Pays, Ursel after Lie Still, and Fourth Camp after His Book. (The roman numerals in the entries above are the first numbering; the game's run as listed here.)

- **XXX, Who Tam Writes To** (`storyTamLetter`). Ned Vey has a bundle of letters waiting at the Captains' Table for A. Pryce, who went north: one a week since high summer, signed T.R., where the player has been and who with. In the spring the Brethren sold Tam's three-hundred-mark Kittiwake debt to Pryce; the letters were the interest. Holmsey was Tam: Hilda was at the bell before Nessa's ink was dry. If the player paid the Brethren on the jetty, Tam has been paying twice. Flag `tamEnd`: `kept` (he burns the last letter and stays), `double` (he goes on writing what the player wants Pryce to read) or `out` (turned out; he leaves). Without Tam, the chapter passes.
- **XXXII, Ursel** (`storyUrsel`). Northgate's Gatekeeper is **Ursel Hale**, sister of Wenna's father **Elwyn Hale**; she came over on a salt boat forty years ago and never wrote. Elwyn has been dead ten years, Bryn has the farm, and Owen died on the Kirk road last winter (Owen's Crook). Flag `urselStay`: `night` (Wenna stays the night at the gate) or `north`. Without Wenna, the chapter passes.
- **XXXV, Fourth Camp** (`storyCamp4`). On the open ground on top of Gallows Knap, south of the ruin, the first page of Pryce's book is in another hand: "The Third Daughter, her papers and her passage to Callis, to buy crystal of the Assembly out of the Charter's reach. Sold to Harrowgate & Daughters for the Charter's debt. For the Charter, R. Tarrant." The Speaker signed it (flag `bookPage`). Joan has offered Ottilie a proper apprenticeship at the smelter in the spring (flag `ottSpring`: `joan` or `stay`).

## The main story, Act V: The Held [in game]

`src/data/content/actFive.ts`. Starts from Wat Aske at Cold Harbour once Act IV is done.

- **XXXVI, The Ones Who Walked** (`storyWalked`). The first of the Held to get up, off the barrows stripped earliest, walked south off Hollow Fell before the black went back on Ma's barrow, down the valleys to the Greywaste farms. Families from the farms have come down to Cold Harbour to get away south; **Brenna Carse** of Carse's farm in the Ashgill speaks for them (her husband's mother got up out of the yard behind the byre, with no black on her at all). The Held come down the track at night. The Kittiwake's mate takes fares, and Brethren carry what pays. Flag `coldFamilies`: `ship` (the player pays two hundred marks for their passage south to Callis) or `stay` (a wall of carts, with Wat sleeping in the middle of it).
- **XXXVII, A.P., Again** (`storySecondAP`). Ma's barrow is stripped a second time; the tally board says A.P. against every load, and Pryce is home. The receipt trodden into the cart track: "Received of Hollow Fell, nine slabs, black. For the Assembly of Callis. A. Pascall, clerk." **Arthur Pascall**, the Assembly's clerk, buys the fell's black for the towers of Callis.
- **XXXVIII, The Gatekeepers' Rolls** (`storyRolls`). Edda Rusk: the black was laid so they would lie still, every barrow, every slab. Six of Hollow Fell's eight barrows are stripped: sixty slabs must go back, and the only black above ground is in the towers of Callis.
- **XXXIX, Callis Lends the Black** (`storyLendBlack`). Benet Sala won't take black from the Morning Tower (a finger and a half off its mark), but offers forty slabs from the Old Tower's keystones, the old kingdom's own black: "It would hold a season without them. Probably a season." Flag `lendBlack`: `tower` (taken from the top of the Old Tower; Marta Vidal won't forgive it), `bought` (the player pays five hundred marks to send Pascall's slabs back) or `none` (Wat digs the fell's own black out of the heaps by hand, all winter).

- **XL, The Fells at Night** (`storyFellsNight`). The black goes back on Hollow Fell's six stripped barrows by night, slab by slab over the crown, and the dead round each kneel and lie down. With only Wat's shovel (`lendBlack` `none`) there is black for two; the other four take the winter.
- **XLI, The Kneeling Rise** (`storyKneelingRise`). Pascall's men, with Assembly paper and a gang from the Keys, broke into the Hall of the Kneeling at Kingsbarrow for the king's guard's black. The Kneeling are up. Ebba Platt's camp of nineteen, diggers who wouldn't go back down and their families, runs for Northgate's postern.
- **XLII, The Postern** (`storyPostern`). Every digger through the postern but Ebba's boy **Tobin**, ten, still out on the road with the Kneeling behind him. Ursel Hale goes back for him: "You're quicker. I'm older. Forty years I've kept this gate. Let me keep it." She pushes him through and tells the player to bar it, and the player does. **Ursel dies** on the far side of her own gate (flag `urselDead`). Her sergeant of twenty-two years, **Gyda Thwaite**, keeps the gate after her, the barracks stable and all; she knows the first Gatekeeper's charge, so Lew Garth's cats need no trip to the Archive.
- **XLIII, What Wenna Does** (`storyWennaGrief`). The morning after, Wenna on Ursel's step with Ursel's glove. Nine days she knew her. Flag `wennaGrief`: `stay` (you sit with her), `alone` or `told` (you tell her it was your hand on the bar; she knew, and says not to carry it).
- **XLIV, Fifth Camp** (`storyCamp5`). A fire under the wall. Edda Rusk has written Ursel into the Gatekeepers' roll: "Ursel Hale, forty years at the gate. Went out of it for a child of the camp, and kept it shut behind her." The Kneeling went back down the road at first light, to kneel where they were found. In the morning a letter comes from Callis under the Assembly's seal: the Old Tower has moved.

## The main story, Act VI: The Tall City [in game]

`src/data/content/actSix.ts`. Starts from the letter at the end of Fifth Camp.

- **XLV, Down a Storey** (`storyDownStorey`). The Old Tower is three and a half fingers off its midsummer mark (faster if its keystones went to the fell). The Assembly is taking every tower down a storey at a time, the families out first.
- **XLVI, The Counting Floor** (`storyCountingFloor`). **Arthur Pascall** keeps the Assembly's bond office on the Old Tower's eleventh storey. The Charter's forty thousand: sold by the guilds, bought by Harrowgate at three in ten, and sold on last spring to the Assembly at five in ten, on the Speaker's papers. The fell's black was the interest; A.P. is just his initials. Flag `pascallEnd`: `arrest` (Benet takes him off the floor and puts him in a room with his books) or `keep`.
- **XLVII, Rhosyn's Hand** (`storyRhosynHand`). The Speaker in Callis for the Charter's first sitting abroad. She signed the Third Daughter's papers so the Charter would owe Callis instead of Hilda: "Callis forgives. Hilda doesn't." She didn't know what the Assembly would want to be paid in. Flag `rhosynSecret`: `kept` (six days, until the sitting) or `told`.
- **XLVIII, Pryce Tells the Truth** (`storyPryceTruth`). Pryce, the Charter's witness (bookkeeper at Joan's smelter, Harrowgate's buyer, or out of Ansbury gaol on the Charter's word, by `tdEnd`): every tower in Callis went up on money lent from the banks of Ambry, in the south (the Corvo, mostly), and three months ago every bank in Ambry called in everything it was owed in the same week. Flag `pryceSouth`.
- **XLIX, The Lift Towers** (`storyLiftTowers`). A storm off the bay; the Old Tower's gauge jumps a finger in an hour. There is a brake in the core, counterweights on chains, and forty clerks on the counting floor. Marta needs one pair of hands on the brake and one on the stair.

- **L, The Old Tower Falls** (`storyTowerFalls`). The brake in the core slips and the counting floor's stair cracks across the eighth landing; one pair of hands can be in one place. With Wenna and Tam both there: run to Wenna at the lever and **Tam dies** on the stair (they dig him out at dawn with the queen of cups in his hand), or run to Tam and **Wenna dies** holding the brake. If both trust the player completely (rapport 60), both their own stories are done, and the player has Pryce's last book, its brass-bound corners go into the brake drum as a wedge: everyone lives, and the book, every line Pryce signed for Harrowgate, comes out in pulp. With one of them: them, or eleven clerks. With neither: **Marta Vidal** holds the brake and doesn't let go. Flag `towerFall`: `wenna` | `tam` | `book` | `clerks` | `companion` | `marta`; a companion who dies stays dead (`comp:<id>:dead`). The Old Tower stands with its top storeys gone, like a broken tooth.
- **LI, What the Charter Owes Callis** (`storySittingCallis`). The Charter sits on the Assembly Hall's steps. Rhosyn tells it herself. The Assembly takes the Charter's debt down a storey at a time: half written off, half paid in black at the posted rate. Flags `rhosynFate` (`finish`: she stays until it's settled, then sits in the gallery; `resign`) and `speaker` (`rhosyn`, `nessa` or `sela`).
- **LII, Delia Reads** (`storyDeliaReads`). Delia Harrowgate has stopped signing things. The Corvo bank of Ambry has called in Harrowgate's loan early; Hilda went south a fortnight ago with Pryce's copies of the company books; Joan is going after her. No packet sails south this season: the captains say "the weather" and look at the sky.
- **LIII, Sixth Camp** (`storyCamp6`). The Mirador's lookout over the city, a place at the fire empty. In the morning there is a bank of cloud over the sea toward Ambry that hasn't moved in a week. (The story goes south with the third continent: docs/CONTINENT3.md.)

### The Mirador [in game]

- North of Callis the Sunder's plateau ends in a sheer scarp, twenty-five blocks of grey rock, and along its lip the shipping families built their summer houses, every one with a deck hung out over the drop and the whole city, the river mouth and the bay under it (`buildMirador` in `src/world/sites.ts`, `src/data/mirador.ts`). A flagged lane runs along the lip from the coast road, through a white gatehouse, past the houses, to a public lookout at its end.
- The salt trade went to the Brethren ten years ago (they pay no duty), and the families that did couldn't sell salt for what it cost them. Most have gone. **Teresa Mas** sells their houses for them from the office by the gatehouse, outright, no lease: an empty house stands open for anyone to walk round.
- The houses, west to east: **the Stair House** (three stone terraces down the face under it, and a private stair to the foot with a gate onto the Callis road), the Roigs', **the Point** (the dearest: the lip comes furthest out there, a white stone deck with a bay and a fire, a loggia on the west wing), **the Long Deck** (the Ferrers' supper deck, end to end, under a vine pergola), **the Lantern House** (glass all round the upper floor and a balcony hung with lamps; the harbour looks up at it at night), the Vidals', **the Tower House** (the Assembly's old lookout tower, standing on the cliff foot and rising past the roofs, with a house built against it), **the Cistern House** (the Oms': sandstone, long pools in the walled court, a bathing pool let into the deck, spring water piped from the plateau) and **the Cypress House** (dressed stone, an arcade along the cliff side, a deck in two steps).
- Buying one is one home to a household like any other: the Charter takes back a cottage or a lot and pays for it. Teresa buys a house back for its family at two thirds of its price.

| Name | Role | Wants | Won't admit |
| --- | --- | --- | --- |
| **Teresa Mas** | Sells the Mirador's houses | A neighbour for Nina who has suppers | She grew up in the Cistern House |
| **Bernat Roig** | Last of the Roig shipowners | The Bona Sort home | He signed the book that says she sank |
| **Nina Vidal** | Painter, thirty years at the same view | To get the light right once | She likes the Lantern House lit |
| **Clara Ferrer** | The Ferrers' daughter; sleeps on the lookout bench | To look at the Long Deck | She was nine, and she remembers the bailiffs |

- **The Bona Sort** (Bernat Roig): his last ship, black hull and white band, went to the Keys for salt. Pau Ferrer says she went onto Ysolde's Chair in the Teeth five years ago with all hands, and Bernat signed the harbour book himself. You tell him the truth (he gives you the spyglass and looks at the city instead) or you don't (he keeps watching, and pays you for your legs).
- **Someone on the Bench** (Nina Vidal): someone sleeps on the lookout bench at the lane's end, night after night. It's Clara Ferrer, whose father lost the Long Deck at cards and then to the bank; she comes up after dark to look at it. Her mother hid a tin box under the deck boards the night the bailiffs came. You bring it to her, and either speak to Teresa for her (Teresa takes her on to keep the empty houses) or leave the bench a public bench.

### Kingsbarrow [in game]

- The old kingdom's city of the dead on the Held's plateau, north of Northgate by the road through the gate. An avenue of standing stones runs north between rows of barrows, most stripped by Pryce's diggers, past stone tomb-houses, to the **king's barrow**: a hill kerbed with great stones, half its black cap torn off and heaped down the east side where the carts could reach it, and a portal of three stones in its south face. The diggers' camp is beside it.
- **Kingsbarrow's rooms.** **The Long Barrow**: four whole slabs of the black are left by the niches. **Edda Rusk** copied the guard's order from the Gatekeepers' oldest roll for whoever goes down: the king's own man, his shield-bearer, the thane of his horses, and his harper last, by the door, "so the king would hear him go". Laid back in that order, the grille at the barrow's end lifts; out of order, the slabs slide off and two of the guard climb out. **The round hall**: the dead kneeling round its walls rise a row at a time, the king's own last, and the grille over the Black Stair stays down until they kneel again.
- **The halls** (group dungeon `gd-kingsbarrow`): dressed stone, vaulted, banded with the black where the diggers haven't reached. The Long Barrow, a gallery of empty niches; the Diggers' Cut; the Hall of the Kneeling; the Black Stair; the King's Hall, his bier on its step between the columns. Its armour and weapons are **Barrowborn** (the king's guard's gravecloth, guard's leather and Kingsmail, and old-kingdom steel with a sliver of the black in the grip): below half health, your blows heal you for a tenth of their damage.

### Cold Harbour, Hollow Fell and Northgate [in game]

- **Cold Harbour**: a cove under the Greywaste's low cliffs. The diggers' shed, a jetty, carts left where they stood, heaps of black nobody shipped, and the tally board: five barrows, twenty-four carts, "A.P." against every load, then "Wat says no more" in chalk and "Double. A.P." in ink.
- **Hollow Fell**: eight barrows on the moor, each a low round mound with a stone-framed door on its south side and a kerb of standing stones. Two are still capped with the black; the rest are stripped, their black heaped beside them.
- **Northgate**: the wall city across the pass into the Held Country. The town lies below the scarp where the Held's plateau begins, grey stone under slate: the square with its well, the cathedral and its tower, the barracks, and the Gatekeepers' Archive, a round tower at the foot of the ramp. The wall runs along the top of the scarp, three hundred years old, with towers every forty strides and the gatehouse: the gate shut, the postern beside it.

| Name | Role | Wants | Won't admit |
| --- | --- | --- | --- |
| **Wat Aske** | The last of Pryce's diggers | To put the black back, one cart at a time | He left eleven men up on the fell |
| **Ursel Hale** | Gatekeeper of Northgate (dies at the postern, Act V) | The gate shut | She wanted someone to have read the roll before she opened it |
| **Edda Rusk** | Keeper of the Gatekeepers' Archive | Someone to read the rolls | — |
| **Lew Garth** | Herder of the Held, camped outside the shut gate with his last fell sabres | To get them inside before the trolls do | — |

- **Northgate's own landmarks** (`src/data/monuments.ts`, town `northgate`). **The keepers' stones** at the foot of the ramp: fourteen, one for each Gatekeeper, the first worn smooth but for the charge cut under it (SHUT IT AGAINST THE DEAD. NEVER AGAINST THE LIVING), the fourteenth URSEL HALE with one year, and a fifteenth already set, blank. **The wall bell** on the square: RING FOR THE WALL, its clapper strapped to the frame with a knot tied the same way every time the strap is changed; nobody alive in Northgate has heard it. **The watch board** by the barracks door: a peg on each tower's hook, nearly all Thwaites and Pennocks, and no peg on the third tower west of the gate, where somebody has chalked NOT AFTER DARK.

- **Three and Three** (Edda Rusk, after Lie Still; `src/data/content/heldSide.ts`): every night something knocks on the outside of the wall under the third tower west of the gate, three knocks and three more, the way Edda and her brother Col knocked on the Archive door as children. It's Col, one of the Held. She lays him down with the Archive's piece of the black, or leaves him be and goes up the tower at night to knock back.
- **The Last Fold** (Lew Garth): nine nights against the gate, two cats lost to the fell trolls. Thin the trolls, then find Ursel a reason older than her own: the first Gatekeeper's charge in Edda's oldest roll, "Shut it against the dead. Never against the living." Ursel opens the gate for an hour at noon, or passes the cats through the postern one at a time all night.

### Saltpenny Key [in game]

- The Brethren's city on the outermost of the Keys (`buildSaltpenny` in `src/world/sites.ts`), built out of and on top of wrecked ships, reached by the causeway along the Keys or the packet from Callis. Boardwalks run between beached hulls and shacks of salvaged timber, with rope bridges between the hulls' decks.
- **The Mercy**, a galleon run up the beach, is the market; her hold is full of stalls. **The Leaning Mast** is the tavern: she ran up the beach in a gale forty years ago and settled on her side, and the bar is at the low end. **The Captains' Table** is a hull with one long table down its hold. **Low Tide** is the fence's. **The Cockpit** is a ring dug in the sand, where captains settle things to first blood and the loser buys a round. The Brethren's ships lie at three piers on the lee side; the Kittiwake is at the middle one.
- **Ysolde Gale** was the first of the Brethren, sixty years dead. She sank more Assembly ships than anyone since, and buried what she took. Her sign was a compass rose. The Brethren's own sign is two crossed oars, because every captain started out pulling one.

| Name | Role | Wants | Won't admit |
| --- | --- | --- | --- |
| **Ned Vey** | Speaks for the captains at the Captains' Table | Whatever pays, as long as his crews come home | He'd sell you anything except his crew |
| **Mara Coyle** | Master of the Kittiwake | To be paid, by everyone | She hates Cold Harbour |
| **Dinah Lowry** | Draws maps in the Mercy's hold, from wreckers' talk and drowned men's charts | Gale's hoard found, and drawn | She learned to draw by copying Gale's hand |
| **Gil Fenner** | The fence, at Low Tide | — | — |

- **Saltpenny's own landmarks** (`src/data/monuments.ts`, town `saltpenny`). **The captains' oars** by the Long Walk: every captain stands the oar she pulled in the rack when she gets her first ship, her name burnt on the blade; Ned Vey's is sawn short (he was eleven), and a ring under a name means that captain brought every crew home. **The Constancy**, the figurehead of the first Assembly frigate Ysolde Gale sank, stood on ballast stones by the walk with a tin cup in her wreath: the Brethren put in for the families of crews that don't come back, and Ned Vey counts it out at the Captains' Table once a month. **Gale's compass**, her brass rose nailed into the boards where the walks cross, where captains are sworn; its south point was prised up long ago, by Gale herself, Dinah Lowry says.
| **Annie Coe** | Keeps the Leaning Mast | No fighting in her bar | — |
| **Jago Sweeney** | Keeps the Cockpit | — | — |

- **Dinah's maps.** `dinahSalt` (a map of the key itself; a tin of her own buttons under the X), `dinahKeys` (two maps of the Keys; a page of Gale's log in the second chest), `dinahGale` (Gale's hoard by Heron Mere in the Glades: an iron box, a brass compass Dinah keeps, and Gale's cloak with the compass rose, which the player keeps). After that Dinah sells maps of every region in Morrow; there are two to each region, as in the Counties.
- **Wreckers' Bight** is the camp on a key east along the causeway where Pryce's wreckers lie up.

### The Teeth [in game]

West and south of Saltpenny, off the end of the Keys: **Gallows Key**, **the Careen**, **Smoke Key** and **Ysolde's Chair**, where the captains the Captains' Table won't sit with lie up (`src/world/morrowLocal.ts` TEETH_ISLES, `src/data/teeth.ts`, `src/data/content/teeth.ts`).

- **Gallows Key**: an Assembly signal fort from before the Brethren, white stone pinned with black, its walls broken in three places and stopped up with logs. **Hob Merrick** holds it with the crews the Table cast out for taking a Brethren prize, forty of them Callis-born. The gallows by the gate gave the key its name; nobody uses it any more. His prize lies at anchor off the beach.
- **The Careen**: a shingle beach where the Teeth's ships are hauled out to be scraped and tarred. **Kester Bligh** is the shipwright; Mattias Crowe's Long Shilling is up on the shingle.
- **Smoke Key**: the beacon on its crown, and **Gert Vosse**, who keeps it and lights it for whoever pays. Ten years ago she lit it for the night the Morning Star went down off the Teeth, with her son Wilf aboard as ship's boy. She has lit it every night since.
- **Ysolde's Chair**: a stack of black rock with a stair cut round it, and Ysolde Gale's compass rose cut in its top. Gale's log: "North for the sea, west for the dead, south for the wind, east for home."
- **The Unpaid** (`teethUnpaid`, Ned Vey): three Brethren ships lost near the Teeth. It isn't Merrick taking them but the Assembly's revenue cutter, and Merrick's beacon brings them onto her for a pardon a ship. Her boat lands on Gallows beach under **Lieutenant Arnau Sabat**. `teethEnd`: `table` (Merrick stands before the Table; his crews scatter) or `pardon` (he takes them home to Callis on Assembly paper; Ned Vey doesn't forget it).
- Side stories: **Before the Tide** (rope from Rook's Ropewalk to float the Long Shilling), **False Lights** (`gertLight`: the beacon's glass broken, or Gert's secret kept), **The Compass Rose** (Gale's spyglass, for Dinah Lowry), **Prize Crew** (**Andreu Sabater**, an Assembly customs clerk nobody in Callis would ransom).

### The Black Pin, the Cockpit, and the far places' mounts [in game]

- **The Black Pin** is Callis's inn, on the east side of the Market square, white stone under a red roof: a taproom and five rooms to let upstairs. **Roser Puig** keeps it and keeps the peace with soup; the Assembly and the dockers drink there and don't sit where the other lot sits. It's named for the pins in the towers, the thing that holds everything else up.
- **The Cockpit's ladder** (`src/data/duels.ts`): Kit Rowe, a deckhand who has never drawn first blood off anyone; Hannah Skerry, the Kittiwake's bosun; Ruth Abel, a gunner who throws what she can't shoot; Mattias Crowe, captain of the Long Shilling, who has never lost a ship over a dispute; and Mara Coyle, who doesn't fight in the Cockpit and makes an exception. First blood: they yield at half, you yield at a quarter, nobody dies, and stepping out of the ring forfeits. Beating Mara wins the Cockpit's ribbon.
- **Davey Penrose** ran the island boat from Gullmouth's quay to the Mewstones, Inkholm, Kell and the Sickle, before the Charter put the Plover and the Wren on. He still rows, for anyone who'd rather. The Charter stopped the Inkholm crossing; the Charter doesn't row.
- **Mounts** (`src/data/content/mounts.ts`): the Kilnfolk breed great cats (kilncats) on the Kiln's warm slopes and build clockwork striders in the Works; the Held's herders ride sabre-toothed fell cats; the Glass Flats' caravans ride drakes that walk; the Keys ride their turtles (Old Shell is older than Saltpenny); the Sunder's skyfarmers keep slabbacks, oxen plated with the stone they graze; the Assembly keeps griffins in the eyries at the tops of its towers; and the grave-wyrms slept curled round the old king's bier. Stags come from both continents' woods.

### Morrow's towns and villages [in game]

`src/world/sites.ts` (buildReedwater and the rest); their people in `src/data/content/morrowTowns.ts`.

- **Reedwater** (the Glades): a stilt village over the sawgrass, houses and boardwalks on log stilts five blocks up, out of the floods; at night the glims light the creeks under it. **Orla Pike**, the reeve, wants the sawgrass lizards that wait under the walks thinned. **Lorne Rush** brews reed beer in a tub under his house.
- **Branchley** (the Amberwold): Wold folk under two great trees, plaster and timber along the old road, a stair winding round each trunk to a platform with cabins. Before the long nights they paint every doorpost with lamp-moth dust, which glows for a week. **Ivo Larch** keeps the lamps; **Mags Briar** bakes acorn bread. The Wold plants an acorn on the old road for every child born in the year, with the name on a peg; half the oaks along it are somebody's (**One for Each**, `src/data/content/woldSide.ts`: the leafbacks root up this year's three, and Mags fences the seedlings or plants two to a name). Branchley's own landmarks (`src/data/monuments.ts`, town `branchley`): **the long seat** by the old road, one bough off the east tree from the winter of the big wind, which missed the Larches' roof by a hand; once a year at the first frost the whole village sits on it at once to see if they still fit. **The marks on the west tree**, every Wold child's height cut on midsummer morning (they don't go up as the tree grows, whatever the old folk say; the newest is Linnet Larch, a little high, because she stood on her toes). **The finding post** by the crossing, hung with what's been found on the road and never thrown away, the oldest a set of wooden false teeth, in case he comes back for them.
- **Cala Roja** (the Bright Coast): white fishing town running down to a quay. **Nuria Pujol** dries the fish; the terrace jackals strip her racks at night. **Toni Rius** sells what the boats brought in that morning.
- **Liftwick** (the Sunder's north rim): the skyfarmers' village, grey stone and slate, with the Assembly's white lift tower at the rim. **Pol Vidal**, Marta Vidal's son, farms the hanging slabs; **Ada Moss** keeps hives on them. Liftwick's own landmarks (`src/data/monuments.ts`, town `liftwick`): **the bound stone** where the west road leaves the village, which rose a finger's width out of the ground three springs ago and is chained to an iron pin in the bedrock (the chain is tight now, with a bell on it); **the Assembly's notice** on the lift tower, the posted rate chalked and rubbed out until the board is grey, and at the bottom THE BEES RIDE FREE; and **the Solers' doorstep** west of the tower, the bottom course of a cottage cut off clean: the rest went up with the big slab and is the skyfarmers' hut, and old **Neus Soler** walks out over the bridges now and then to sit in her own kitchen.
- **The hanging slabs**: ground the white tore loose and lifted, hanging over the rift on knots of glowing crystal. Rope bridges climb from the rim; the biggest is a skyfarm, a waterfall spills off another, the last hangs out of reach. By Pol's plumb marks they've lifted a hand and a half to two hands since spring, as the towers in Callis have.
- **Tenwells** (the Glass Flats): the caravan fort, salt-white walls round a yard of wells, tents and carts, and the storm-hunters' tower with its copper rod. **Cass Moran** runs the caravans north and south; the salt reavers wait for the lightning to pass and come out of the glare. **Ennis Wade** sells water, dates and rope. **Bel Sorrel** handles the caravans' drakes and leaves a trail wherever she goes (**Out in the Glare**: she walks into the flats after a loose drake, and you follow her water skin, the snapped harness and her cairn to where she sits glare-blind under a glassback's shell; Cass lets her ride again or keeps her on the wells). All ten wells stand in the yard, round the coaching yard and the crossing; the fourth, the one that goes salt, is in the yard's north-east corner. Tenwells' own landmarks (`src/data/monuments.ts`, town `tenwells`): **the black glass**, a door-high slab out of the Mother's Bed, the storm-hunters' chalk sums high on it (LIGHTNING ON SALT) and the caravan folk's scratched drakes low down, one for every crossing, neither side's marks rubbed out; **the water law** at the fourth well's lip, THE WATER IS NOT SOLD AT THE WELL (Ennis Wade sells his from a barrel across the yard); and **Cass Moran's road board** inside the south gate, its north road's top nail pulled and the name painted over, not well enough: FELLSIDE.
- Side stories (`src/data/content/morrowSide.ts`): **The Long Nights** (after Lampwick: Ivo Larch did the trees, but his hands shake on the brush; you paint the last three doorposts on the old road, the widow Fenn comes home by them every night that week, and he gives you his brush, "next year, if you're passing") and **The Fourth Well** (one of Tenwells' ten wells goes salt overnight; rock salt in lumps, and sacks stamped with a white hand in the gully by the east gate. The reavers' own wells a day north charge a mark a skin. `mwSalt`: `ride` (you break the reavers at their wells and Cass fills them in with their own salt) or `quiet` (Ennis sinks a new well, and nobody tells the reavers it worked)).
- **Fellside** (the Greywaste): emptied. A letter on the last door from R. Alden: the Dunns went up the fell, came down, and were not the Dunns.
- **Conch Key** (the Keys): beach huts, drying racks and boats. **Sal Mudge** watches the turtle beach, where the mangrove crabs meet the hatchlings halfway to the sea. She has counted every hatchling into a book for forty-one years and can't see the beach any more (**The Count**: a bad year, nineteen; you write the true number, or sixty).

### Morrow's creatures [in game]

Written at their regions' levels in `src/data/gameplay.ts`, south to north. Two new body plans in `src/entities/creatures.ts`: the lizard, and the lamp-moth, which flies.

- **The Keys:** mangrove crabs, key lizards, reef jellies, and Key wreckers, who don't fly the Brethren's colours.
- **The Glades:** sawgrass lizards, the glade glims that light the water at night, marsh moths.
- **The Amberwold:** lamp-moths at dusk (the Wold folk paint their doorposts with the dust), amber lynx, leafback boars.
- **The Bright Coast:** terrace jackals, quarry beetles in the white quarries, and black-runners carrying the black up the coast.
- **The Sunder:** slab-crawlers and lift-moths off the hanging stone, rift wolves.
- **The Glass Flats:** glass basilisks, glassbacks, and salt reavers.
- **The Glassmother** [in game, world boss]: the one dragon anyone has seen, as long as a ropewalk shed with wings to match, who comes down every so often on **the Mother's Bed**, a ring of black glass spires deep in the Flats, with her brood of wild drakes round her. The storm-hunters at Tenwells hold that the black glass is lightning-melted salt; the caravan folk say it's where she lay down, and that the drakes are her get. Neither side has gone close enough to settle it.
- **The Greywaste:** waste hounds, fen-damps, and the **Risen**, the first of the Held.
- **The Held Country:** barrow-wights, the Risen, and the fell trolls of the high snow.
- What they leave: lizard hide, moth dust, chips of the white (it floats), shards of the black (heavy as a fist), black glass (lightning-melted salt crust), grave iron (the smiths at Northgate won't work it), and fell troll hide.

## Terminology

- "reeve", not "mayor". "moot", not "council".
- "the Pit", not "the mine", when villagers talk.
- "the Wend", never "the river Wend" in dialogue.
- Skill names: Mining, Smithing, Fishing, Cooking, Woodcutting, Melee.
