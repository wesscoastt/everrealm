# Everrealm lore record

This is the canon reference. Anything written into the game must agree with it. When the game establishes a new fact, add it here.

Status markers: **[in game]** means the fact is visible or playable in the current build. **[planned]** means it's reserved for later and nothing in the game contradicts it yet.

## The wider world

- **The Charter Counties.** A set of regions bound to the city of **Ansbury** by trade charters rather than conquest. Each county keeps its own reeves and customs. Ansbury collects tolls on the Turnpike and settles disputes nobody else wants. When a city office fails, the Charter can put it out to tender, and Harrowgate & Daughters bids on everything. [in game]
- **Money.** The coin is the **mark**: a small copper-silver disc stamped with a road sign. Prices in Hollindale are quoted in marks. [in game]
- **The Charter Post.** Carts licensed by the Charter run between the settlements on its roads, stopping at a signpost marked CHARTER POST. Fares are set by the Charter: two marks to get on and a mark for every stretch of road. Stops: Hollin Ford, Ansbury (outside the south gate), the Waystation, Fellers' Camp, Gullmouth, Harrowgate Works, Kelderby, and a pilgrims' stop at the Glass Kirk. The Post is why the Lantern's beacon line was given up. It does not run to Scarth Watch, the Hollow Oak or anywhere off the roads. [in game]
- **Letters by the Post.** The carts carry the mail as well as passengers. A post box painted the Post's blue, with a brass slot and the Post's horn on its face, stands beside every Post sign; the clerks empty them at every stop, and any box will hand you what has come for you. Postage is a mark a letter and a mark for every parcel sent with it, up to six. A letter waits at the Post for thirty days; after that the Post sends back whatever was in it. A reader may send a letter back unopened, parcels and all, and the Post will carry it home free. `src/game/Mail.ts`, `server/mail.mjs`. [in game]
- **Mercy Haddow**, packwoman, has walked the same round of the Charter roads for eleven years with a pony and a second pack: a day each at Ansbury's south gate, the Waystation, Gullmouth and Kelderby (by the Post signs), on the realm's day. She buys treasure maps for a mark off people who won't dig and sells them for sixty, and will sell the pony that carries her second pack. `src/data/content/packwoman.ts`. [in game]
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
| **Ned Bracken** | Keeps the Wetlings ditches. "Six is cows" | The ditch mouths salted | — |
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

## Under the Kettle (group dungeon) [in game]

Behind the crack in the north wall of the Kettle (the crater where a star came down, in Scarth). Levels 28 to 32. Halls in `src/world/sites.ts` (`buildUnderKettle`), fights in `src/data/dungeons.ts`.

- **The fold.** Kelderby folds its ewes in the crack every winter, behind hurdles. **Nia Prosser** keeps them there. At Martinmas nine went in one night with no blood at the hurdles.
- **Brack**: a grey wolf the size of a pony that leads the pack laying up behind the fold.
- **Millstone**: a graniteback the size of a cart in the seep, where the ice has grown into glass. It chews the crystal.
- **The Glim**: Nia's gran's name for the light at the bottom of the crack. A jelly grown in the crystal that came down with the star; pieces of it go on living when they break off. Nia's gran said the star was still down there and the light was it breathing. Nobody in the game says whether that's true.
- The dungeon's set is **the Fold** (Kelderby fleece, Brack's-pack hide, Kettle-glass plate, the fell knife and the shepherd's hood). Clears are counted in `gdClears:gd-kettle`.

### Henchmen

Hesk's four regulars, who go down anywhere for a day's rate. Whoever's free comes: a tank, a healer, then Bet, then Tom.

| Name | Role | Voice |
| --- | --- | --- |
| **Osgood Mason** | Quarryman; holds the front | Few words. "On me." |
| **Edith Leach** | Bonesetter; heals, and gets people up | Brisk, scolding. "Hold still." |
| **Bet Pascoe** | Pick-hand; knows the Pit | Hard, practical. "Mind your heads." |
| **Tom Fowler** | Bird-catcher | Young, quick, talks too much. "Did you see that?" |

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

### People

| Name | Role | Wants | Won't admit |
| --- | --- | --- | --- |
| **Osric Penhallow** | Weighmaster, seventies. Wears his chain indoors | The Weighhouse to stay in the city's hands | He took Gisborne's cheap quote without checking the metal |
| **Edda Strake** | Corporal of the south gate | An accurate book | She enjoys knowing things before Osric does |
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
| **Wat Hollis** | Kept the old toll tower before the Turnpike was paved | — | He drains the Downs lamp to keep warm |
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
- **Wat Hollis** kept the drove road's toll tower (929, 134) until the road was paved and the tolls moved to the gates. His pension of eight marks a quarter stopped two winters ago, the same winter as Aud's oil money. `lampChoice`: `strake` (the cell by the gatehouse stove until the spring sessions; he sweeps the gatehouse), `round` (he keeps the north lamps for Aud) or `leave` (the Downs lamp stays dark).
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
| **Tam Feld** | Runs the company store | Not to be blamed for company prices | — |

### Posted Rate [in game]

Wick sold his pick to Pryce for 3 marks to pay a six-mark bonesetter, and Tam has it on the store wall at 40. Outcome flag `fpChoice`:
- `paid`: the player buys it for 40. The drift's whip-round pays the player back 20.
- `delia`: the player shows Delia the "own account" line. Tam releases the pick at the posted rate, billed to Pryce, and Pryce pays Wick the 15-mark difference from his wages. Delia pays the player 30. Pryce: "I'll remember that."
- `leverage`: the player shows Pryce his own book. He writes Tam a no-charge slip and from then on buys from the player at 75% instead of 55%.

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

## Scarth Highlands: Kelderby and Scarth Watch [in game]

### Places

| Place | Facts |
| --- | --- |
| **Kelderby** | Three slate-roofed stone houses and a well on the high plateau. Sheep country. |
| **Hale's Fold** | The Hales' shepherds' bothy and a drystone sheepfold on the ridge above Kelderby. Frost wolves come to it when the fire is low. |
| **Scarth Watch** | An observatory tower with star crystal at its top. Ilse Blewitt counts the stars that fall and where they land. **The Charter pays a stipend for the count**, because crystal lies where stars come down, and Ansbury likes to know where its crystal is before Harrowgate does. She keeps a weather log by a storm glass. |

### People

| Name | Role | Wants | Won't admit |
| --- | --- | --- | --- |
| **Wenna Hale** | Shepherd of Kelderby | Bryn home and the flock safe | Given one, she'd choose the flock, and Bryn would choose the same |
| **Bryn Hale** | Shepherd, Wenna's husband. Never sat out weather in his life | Fourteen ewes kept, "because fourteen ewes is the house" | — |
| **Cai Morgan** | Carter and trader at Kelderby, Wenna's brother; has the hamlet's sledge | — | — |
| **Ilse Blewitt** | Astronomer at Scarth Watch | The Charter to pay on time | — |

### The High Pasture [in game]

Bryn went up to Hale's Fold to bring the flock down before the snow and didn't come back. Ilse saw his lantern two nights ago and none last night, and her glass says snow by tomorrow night. Bryn has a broken leg; frost wolves have been at the fold. Cai can make one sledge trip before the snow, for Bryn or for the ewes. Outcome flag `pastureChoice`:
- `bryn`: Cai brings Bryn down. Six ewes find their own way home and eight are lost.
- `flock`: Cai drives the ewes down and Bryn keeps the fire in at the bothy. He loses two toes.
- `wenna`: the player leaves it to Wenna. She chooses the ewes, and the result is the same as `flock`.

Wenna pays the player 50 marks either way, plus two smoked char if the flock was saved.

## The main story: The Charter's Debt [in game]

Six chapters. The quest ids are `storyNotice`, `storyMossgate`, `storyCrown`, `storyStar`, `storyLift` and `storySitting`. Dialogue is in `src/data/story.ts`; the quests are in `src/data/storyQuests.ts`.

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

## The factions

Companies you can join, each with its own hall, people and storyline, in the manner of the Elder Scrolls guilds but grown out of the Charter Counties. Each storyline chapter raises your rank and the last gives a title (`src/data/factions.ts`). Open: the Waits [in game]. Planned: the Collegium (crystal, the old words and weather, Guild Ward), the Muster (the laid-off toll riders' hiring hall at the tilt-yard, against Harrowgate's "Company Wardens"), the Lamplighters (who light Ansbury's lamps and rob the debt-holders by the same ladders, the Shambles), the Passing Bell (an old moor practice: ring the passing bell for someone the law can't reach), and the Ushers (the Speaker's doorkeepers in the Charter Hall, and her eyes). [planned]

### The Waits of Ansbury [in game]

The town's musicians. The Charter pays six Waits to play the hours on the Charter Green at dawn and dusk, walk in front of the Speaker at a sitting, and play whatever else the town needs. They are five when you arrive. The Waits' House stands on the north side of the Charter Green, with a low stage, benches, the instrument cupboard and the **Great Book** of the counties' tunes. Twelve years ago the Collegium borrowed the Book to copy and sent it back thirty pages short. The Waits play on the bandstand on the Green at noon, and the hours there at dawn and dusk (`src/data/content/waits.ts`; tunes in `src/data/tunes.ts`).

| Name | Role | Wants | Won't admit |
| --- | --- | --- | --- |
| **Tabitha Gant** | Master of the Waits, harp. Sixties | The Waits kept on the Charter's books | She hasn't written a tune in twenty years, until "Three Marks in Ten" |
| **Roley Spence** | Horn, keeps the instrument cupboard. Blew the horn on the Charter Post for six years | To be the only Wait who laughs | — |
| **Dorcas Pym** | Fiddle. Young, says little | — | — |
| **Hal Truscott** | Drum | — | — |
| **Amos Hollis** | Printer of broadsides, sells in the Charter Market | The debt's arithmetic done in public | Tabitha's tune is better than his words |
| **Hugh Kellet** | Gentleman Usher of the Charter Hall | The Waits to play the March | — |
| **Bet Polglase** | Widow on the Gullmouth quay; her husband Jory hauled boats to "Haul for Holmsey" | — | — |

Storyline (each a rank): **The Audition** (Apprentice: play "Lady Day" at the bandstand), **The Missing Pages** (Journeyman: learn the lost tunes still sung by Wenna Hale at Kelderby, Bet Polglase in Gullmouth and Sefton Garrow at Fellers' Camp, who give the Hale pipes, Jory's fiddle and Sefton's frame drum), **From the Moor** (Wait: the oldest page has five dots "from the moor"; Wynn Carrow sends you to **Carne Barrow**, a long barrow east of Scarrow Tor on Tolmen Moor, for a five-holed bone whistle; played under the Ketley Arches the tune comes back off the rope grooves, which the old builders cut to sing), **Three Marks in Ten** (Senior Wait: the Charter means to stop the Waits' wage; play Amos's ballad about the debt on the keep steps, or the Speaker's March; flag `waitsEnd` = `ballad` (the wage is stopped, the town sings it) or `march` (the wage stands)), **The Hours** (Wait of the Hours: play "The Hours" on the bandstand at first light; Tabitha gives you the Waits' harp; title Wait of Ansbury).

Instruments: tin whistle, Hale pipes, Jory Polglase's fiddle, Sefton's frame drum, the Ansbury lute, the post horn, the hurdy-gurdy, the Waits' harp and the Carne whistle. Anyone can play by ear on the number keys. Played through at a performance spot (the bandstand, the moot oak, the Waystation yard, the fire at Fellers' Camp, the well at Kelderby, the Gullmouth quay, the Glass Kirk, the Works yard, the Ketley Arches, the keep steps, the Minster steps), a tune brings people to listen, and they leave a few marks. A group can play as a band, each on their own part.

## Taverns [in game]

The towns' inns, kept and drunk in (`src/data/content/taverns.ts`). Each keeper sells drink and food, passes on the day's talk (true things about the counties, changing with the realm's day, among them where Mercy Haddow is), and two regulars sit at the tables. A musician playing in any of them earns a few marks.

| Tavern | Town | Keeper | Regulars |
| --- | --- | --- | --- |
| **The Low Water** | Hollin Ford | Agnes Pole | — |
| **The Charter Arms** | Ansbury, on the keep square | Nan Pargeter: forty years on the square, keeps a book of everyone's tab | Clement Fry (Toll Office clerk), Margery Pettifer (glover; the Collegium buys her thick gloves for handling crystal) |
| **The Long Stretch** | the Waystation | Ivo Rendle, a laid-off toll rider who put his severance into the roof | Josiah Yeo (carter), Hester Vowles (drover) |
| **The Company Canteen** | Harrowgate Works | Doll Hobday, the Company's cook since before the Daughters' name was on the gate | Rob Haig (smelter man), Ada Cleave (rail gang) |
| **The Coiled Rope** | Cragsby | Morwen Tregear; a hook on the wall for every climmer who went over | Wat Kemp (climmer, the "Wat" of the knot board), Loveday Tonkin (egg-gatherer) |
| **The Eel and Punt** | Holme Staithe | Sim Fenner; three generations of eel smoke in the walls | Obed Gedge (puntsman), Tilly Brewer (reed cutter; the Levels' drains silt up and nobody pays to dig them) |
| **The Peat Fire** | Scarrow Tor | Kerensa Garth; the fire hasn't gone out in five generations | Joss Trewin (shepherd; heard the Carne Cross bell), Win Polwhele (peat cutter) |

Drink and food: small beer, brown ale, Hollin cider (the Ashcrofts' orchard), Levels porter, mulled wine, bread and cheese, stew, pickled gull eggs, eel pie, mutton pie.

## Lore books [in game]

Twenty-four books lie open on stands by the places they're about, and go into the journal's Library when read (`src/data/lorebooks.ts`). What they establish:

- **The Charter** (a copy on the Charter Green): Ansbury keeps the roads, the counties keep their reeves, moots and customs; a toll may be no more than the keeping costs; a county may leave at Lady Day with a year's notice, paying what it owes; disputes go to the Speaker. A pencilled note by H.K. (Hugh Kellet): nobody has ever left, or been able to pay.
- **Nat Coverdale**, toll rider number fourteen, was laid off at Advent when the riders were cut. **Sergeant A. Holroyd** put up a roll at the tilt-yard for anyone who still wanted the work: the Muster.
- **The Lantern's** beacon line answered the Ridge fire and Fleet; its keeper lit it a last time after the Charter Post replaced it.
- **The Exchange** keeps one book on the realm; Gideon Wray takes one mark in twenty.
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

## Morrow, the second continent [planned]

The expansion across the eastern sea: its land, its great cities, the Brethren of Saltpenny, ships and the story (The Third Daughter) are planned in docs/MORROW.md.

## Terminology

- "reeve", not "mayor". "moot", not "council".
- "the Pit", not "the mine", when villagers talk.
- "the Wend", never "the river Wend" in dialogue.
- Skill names: Mining, Smithing, Fishing, Cooking, Woodcutting, Melee.
