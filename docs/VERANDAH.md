# Verandah: survey, canon and plan (OWED 97x)

The owner's brief is `docs/briefs/verandah-silent-waters.md`. It asks for three steps in order: survey what was
imported, settle the canon, then build in stages. This file covers the first two and sets out the stages. Everything
under **Canon** is binding on new Verandah content; where a line in game already says something, the canon follows
the game, and the source is named.

## 1. Survey: what is in the world

The island runs roughly x -3560 to -2270 and z 1575 to 2880 (about 1.3 by 1.3 km). Its blocks come from
`public/mcland` (the owner's Minecraft world), so `npm run sites` does not see them: check every placement with a
screenshot. Map render: `.walker/gamemap2.ts`, 2 blocks to the pixel.

### Named places in game

| Place | Where (x, z) | What it is now |
|---|---|---|
| Verandah, the walled city | -3140..-2880, 1856..2300 | The owner's city: castle and throne hall, market, high street, square, halls, taverns, docks |
| Port Sands | -2937, 1905 | The beach below the port where cargo is landed; footpad event |
| Awschitz Fort | -3445, 1960 | Walled fort on the west coast; Captain Jenifer Morvah, the King's Dock, marines, the cutter *Vigilant* |
| Awschitz Head | -3458, 1912 | The headland under the fort; wreckers' false-lights event |
| The outpost | -3136, 2332 | The owner's keep on the peak west of the Airport; Captain Penhallow's garrison (`ver-outpost`) |
| The Fortress | the north islet, about -2990, 1630 | The owner's walled islet, made a smugglers' den: Jory Kettle, Sal Treharne, Mab Penhallow |
| Black Gull Keep | -3384, 2114 | Public dungeon: the Black Gull wreckers |
| Stables | -3305, 2050 | The Charter Post's yard and the king's horses |
| Sunken Temple | -3384, 2464 | Ruin, flooded |
| Tregarthen Vaults | -2986, 2490 | Dungeon under an old merchant house |
| Drowned Cistern | -2759, 2246 | Dungeon, the old town water |
| Long Sands | -2642, 2158 | Beach; crab event |
| Mizuholm Woods | -2862, 2735 | Deer forest; poacher event |
| Kestle and the Kestle Folds | -2340, 2445 | East-island village and sheep folds; wolf event |
| Gorran | behind the Arena | Walled village: Loveday Rowse, reeve |
| Verandah Farm | waystone | The farm country |

The owner's waystones: Verandah, Verandah Farm, Mizuholm, Verandah Port, Awschitz, Verandah Airport, Kestle,
Verandah Arena.

### Unnamed clusters on the map (from the prop survey, `.walker/vcells.ts`)

- A heavily lit structure near (-2368, 2624..2688), about two hundred lanterns. Unnamed. A candidate for the
  Lamp House (see the canon below).
- A western village near (-3456, 2368). Unnamed, no people. A candidate for Polwith (see the canon below).
- Farms near (-2880, 2688) and (-3392, 2816).
- A forge with anvils near (-3136, 2496), under the outpost.

### Content already in game

- **Court and household:** King Edmund Arundell on his throne, Margery Pell (Steward), the King's Guard, the
  housekeeper Jenifer Treloar and the household (`verandahCourt.ts`, `verandahGuards.ts`).
- **Guard:** the watch tower on the rock above the high street, the barracks below it (Sergeant Rendle), the butts
  (Bersaba Trewin), the outpost (Captain Penhallow, smith Gwen Bolitho), Sergeant Vosper at the gate, and guards on
  their beats. Commander Joan Ellery commands the King's Guard.
- **Awschitz:** Captain Jenifer Morvah, the King's Dock under Lieutenant Hal Ennor, Gunner Pellow, the quartermaster
  Sergeant Annie Tonkin, boatwoman Wenna Chegwidden, and the smith Jory Pascoe.
- **Trade:** the market (fishmongers Tegen Hocking and Arthur Bolitho), the square (greengrocer, dairyman, dyer,
  potter, pie seller), shops, the post (Hester Pengelly), the quarry under the Charter, the blacksmith Jowan Kessell.
- **Taverns:** the Broken Sword (Tam Rowe), the Screaming Mermaid (Nell Trevail), the Boatman's Tail (Wat Polglaze),
  the Dolphyn (Ada Blackwell), and the Winery (Clemency Hart).
- **Halls:** the Vanguard Hospital (Doctor Eleanor Rodda), the Fighters Guild (Ancrum Treneer), the Mages Guild
  (Walter Gilby, the Collegium), the City Hall, the Bank of Verandah, the library (Cador Penhale).
- **Quests (six):** the Fighters Guild's *Feet First*, *Wreckers' Lights* and *The Guild's Word*; the Mages
  Guild's *Touch Nothing That Hums*, *Where the Ground Sinks* and *The Slow Teaching*. Daejon Love's *The Red Lamp*
  is set on Awschitz Head. There are five events: false lights, footpads, poachers, the Kestle wolves and the
  Long Sands crabs.

### Gaps against the brief

- No harbour government in game: no harbour master, customs house or dues, though the brief asks for them.
- No merchant houses with names and faces.
- The second fort, the outpost, has no proper name, no history, no supplies, no patrols and no quests.
- Awschitz has people but no quests of its own.
- No main storyline. The Silent Waters does not exist yet.
- The countryside is mostly empty of people beyond Gorran and Kestle.
- No repeatable work in Verandah tied to the harbour.

## 2. Canon

### What Verandah is

Verandah is an island kingdom west of the Charter Counties, and the richest port on this side of the sea. It is
not part of the Charter. The king is Edmund Arundell; in his own words the island is his "as far as these things
go: the harbour, the walls, the roads, and the arguments" (`verandahCourt.ts`). Its coin is the mark, the same as
the Counties', by treaty. Its people speak the same tongue with a western burr and Cornish-sounding names.

### Why the harbour matters

The Counties' coast is shoal water from Gullmouth south, with sandbars that move every winter. Verandah's harbour
is deep, sheltered by the Fortress islet and Awschitz Head, and never freezes. Every ship running between the
Counties and Morrow, and every ship coming up from the south, either calls at Verandah or takes a week longer. Ships
water, refit and sell part of their cargo there before going on. Verandah takes harbour dues on every hull and a
duty on every cask landed, and that is where its money comes from. The fish, the wine and the stone are real
trades, but the harbour is the fortune.

### History

1. **The herring winters (about three hundred years ago).** Fleet Coast herring crews wintered on the island in
   turf huts and went home in spring. One winter a crew didn't go home. They built a refuge of piled stone on the
   highest peak, where they could see a sail a day out. That refuge is the oldest stone on the island, and the
   outpost stands on it now.
2. **The Arundells.** A ship's master named Piran Arundell bought the peak and the anchorage below it from the
   crews who held them, with a ship's worth of salt. He charged other ships to lie in his water. His children built
   the first quay, and his grandchildren the first wall. Nobody crowned the Arundells. People called them lords
   because they collected the dues, and kings because nobody stopped them.
3. **The first raid (about a hundred and twenty years ago).** The Brethren, sea raiders out of the south, burned
   the quay and carried off the harbour chest. The town walls as they stand now were built in the ten years after.
4. **The Charter and the Packet Treaty.** When the Counties bound themselves to Ansbury by charter, the Charter
   asked Verandah to join. The Arundell of the day refused and signed the Packet Treaty instead. Under it:
   - Verandah stays outside the Charter;
   - the Charter keeps a yard by the stables;
   - the Charter's packet and its Post use Verandah's docks free;
   - the Charter's revenue cutters may patrol the strait;
   - Charter goods pay half dues.

   Both sides have been trying to rewrite it ever since.
5. **The second raid (about fifty-five years ago).** The Brethren came in under fog on the west shore and burned
   half the farms before the town knew (`verandahGuards.ts`). They came on to the town through a gate that nobody
   would hold for them, because the gate's own guard had been paid to be elsewhere. Ancrum Treneer, nine years
   old, held it with a fishing gaff (`verandahHalls.ts`). Edmund was a boy and remembers it
   (`fightersGuild.ts`).
6. **After the second raid.** Edmund's grandfather built the Vanguard Hospital "for the men who stood at the
   front". Edmund's father, King Richard Arundell, built Awschitz Fort on the west shore so a raid could never again
   land there unseen. He also gave its captain the King's Dock and a cutter, the first royal ships Verandah ever
   kept. Edmund built the watch tower above the high street.
7. **Now.** Edmund has reigned thirty-one years. He is sixty-four and has no heir of his body. His sister's son,
   Piers Arundell, sits on the Harbour Board and expects the throne. The harbour has never been richer. In the
   last two years, ships have begun to go missing.

### Government

- **The king**, Edmund Arundell. He holds the harbour, the forts, the courts and the right to pardon. He
  listens more than he talks, which people take for weakness until he decides.
- **The Steward**, Margery Pell. She runs the household, the treasury and the king's diary, and she knows
  where every mark goes.
- **The Harbour Board.** Five seats:
  - the Portreeve, chair, appointed by the king;
  - one seat for each of the three great merchant houses;
  - one for the Guild of the Quay (the dockers, lightermen and pilots).

  The Board sets the dues, licenses the pilots and settles disputes on the water. It is where the money argues.
- **The Customs House** on the quay, under the Collector of Customs. It weighs, gauges and stamps every cargo.
  It is the most bribed office on the island, and everyone knows it.
- **The King's Guard** under Commander Joan Ellery: the town watch, the gates and the castle.
- **The two forts**, each under a captain who answers to the king directly, not to Ellery. That is a
  deliberate choice, and it causes friction.
- **Gorran and Kestle** have reeves (Loveday Rowse in Gorran), elected by their householders and confirmed by
  the king.

### The merchant houses

- **Vyvyan.** Fish and salt. They own most of the herring fleet and the salting sheds, and lease boats to
  half the fishing families on the island. Old, close-fisted, decent to their crews. The head of the house is
  Grace Vyvyan, seventy, who still counts the barrels herself. When fishing boats go missing, Vyvyan bleeds.
- **Tregarthen.** Money. Bankers and underwriters: they insure hulls and cargoes in the Tregarthen house on the
  hill, whose vaults are now flooded and haunted by what was left in them (the Tregarthen Vaults). The house moved
  to new rooms in the town after the cellar flood. Its head is Lewis Tregarthen, fifty, charming and generous with
  the town, and deep in debt to the Charter's banks since the flood.
- **Trefusis.** Land and wine. They own Verandah Farm, most of the vines and the Winery's lease. They grow
  richer every time the harbour falters, because a dear cask from abroad sells their own. The head of the house is
  Honor Trefusis, a widow in her forties, the shrewdest person on the Board.

### The two forts

The brief asks for two forts with different work and different tempers.

**Awschitz Fort: the sea.**
- *Captain:* Jenifer Morvah.
- *Built:* fifty years ago by King Richard after the second raid. New stone, in good repair, well paid.
- *Purpose:* the western approaches. Awschitz keeps the King's Dock, the cutter *Vigilant* under Lieutenant Hal
  Ennor, a company of marines and a signal mast that can talk to the watch tower. It hunts wreckers and
  smugglers at sea, boards ships that won't stop, and escorts the dues ships.
- *Temper:* brisk, wet and proud. The soldiers are half sailors, they swear in knots, and they think the
  outpost is a museum.
- *Daily life:*
  - the wall watch west;
  - drill at the butts;
  - the cutter going out on the morning tide and back on the evening one;
  - Sergeant Annie Tonkin counting powder, rope and biscuit;
  - Wenna Chegwidden rowing messages round to the town.
- *Morvah:* clever, tireless, and sure she is right, which she usually is. She has been asking the king for a
  second cutter for three years. She thinks someone on the island is selling the *Vigilant*'s patrol times,
  and she suspects the outpost.

**Carn Hold (the outpost): the land.**
- *Captain:* Jago Penhallow (the "Captain Penhallow" already in game).
- *Name and age:* The keep on the peak is Carn Hold, raised on the herring crews' refuge: the oldest stone on the
  island, as Penhallow says (`verandahGuards.ts`).
- *Purpose:* the roads, the farms and the beacons.
  - Carn Hold holds the island's armoury and its beacon chain. Fires on Carn Hold, the watch tower, Awschitz and
    Kestle can raise the whole island in a quarter of an hour.
  - It patrols the merchant road from the port to Gorran and Kestle, guards the quarry and keeps the farms
    safe.
  - It is the king's last refuge: if the town falls, the king goes to the Hold.
- *Temper:* old, dry and underpaid. Its soldiers are farmers' sons who patrol the roads they grew up on, and
  they resent the money that goes to Awschitz's boats.
- *Daily life:*
  - the road patrol out to Gorran in the morning and Kestle in the afternoon;
  - the beacon keeper drying wood;
  - Gwen Bolitho at the forge below;
  - the lookout with his glass;
  - carts of grain and arrows coming up the hill.
- *Penhallow:* forty-eight, steady, honest in everything but one thing. His mother is Mab Penhallow, who keeps the
  tally in the smugglers' den on the Fortress. He has known for years and done nothing, because she is his mother
  and because the den only ever ran wine and tobacco. He keeps his patrols away from the Fortress shore.

**The difference in short:** Awschitz looks out to sea and does not trust the land; Carn Hold looks inland and
does not trust the sea. Each is half right about the other.

### Other factions

- **The Black Gulls.** Wreckers out of Black Gull Keep, who light false lamps on Awschitz Head. They are real,
  small, poor and vicious, and every loss on the island gets blamed on them. They have not taken a merchant ship in
  two years. They have taken fishing boats, and they have been paid to.
- **The Fortress den.** Jory Kettle's smugglers, buying anything and selling what came in on the last tide. The
  Charter's cutters "go round the point twice a day and never once look in" (`smugglersDen.ts`). Kettle is a
  small fence who has become, without quite noticing, the front for something much bigger.
- **The Charter.** The Charter has the yard, the packet and the cutters. Ansbury wants the harbour in the Charter,
  and Harrowgate & Daughters want the harbour itself. Their factor in Verandah, Ambrose Garland, keeps rooms at
  the Dolphyn and lends money to anyone on the Board who needs it.
- **The Guild of the Quay.** Dockers, lightermen and pilots. Its master is Kerra Nance, a pilot. They know every
  ship that comes in and every one that doesn't, and nobody asks them.

### The people of the Silent Waters (recurring)

| Person | Who | Where |
|---|---|---|
| Tegen Hocking | Fishmonger whose brother's boat, the *Little Grace*, didn't come home | Market (in game) |
| Kerra Nance | Master of the Guild of the Quay, a pilot | The quay |
| Hugh Carne | Collector of Customs, tired, kind, frightened | The port warehouse, the King's bonded store |
| Grace Vyvyan | Head of House Vyvyan | The salting sheds |
| Lewis Tregarthen | Head of House Tregarthen | The house in town |
| Honor Trefusis | Head of House Trefusis | Verandah Farm |
| Ambrose Garland | Harrowgate's factor | The Dolphyn |
| Jenifer Morvah | Captain of Awschitz | Awschitz (in game) |
| Jago Penhallow | Captain of Carn Hold | Carn Hold (in game) |
| Mab Penhallow | Keeps the den's tally; the captain's mother | The Fortress (in game) |
| Jory Kettle | Runs the den | The Fortress (in game) |
| Hal Ennor | Lieutenant, the *Vigilant* | The King's Dock (in game) |
| Edmund Arundell | The king | The throne hall (in game) |
| Margery Pell | Steward | The castle (in game) |

## 3. The Silent Waters: the main storyline

**What is really happening.** Lewis Tregarthen is ruined. The cellar flood took the house's gold, and he
borrowed from Harrowgate's bank to hide it. Ambrose Garland offered him a way out.

1. Tregarthen insures a ship's hull and cargo for twice their worth. A captain in Garland's pay sails her into
   the Fortress's sea cave at night instead of out to sea.
2. The cargo goes out through Kettle's den and along the Charter's own packet route, and nobody checks, because the
   Charter's cutters are told not to look in.
3. The ship is re-rigged and renamed in a Charter yard on the mainland. Tregarthen pays the claim to his own
   partners and keeps the difference.
4. Fishing boats that saw the ships go in are taken by the Black Gulls, who are paid for each one, and the
   crews are held on Black Gull Keep rather than killed. The Gulls are many things, but they are not stupid, and a
   living man can be sold back.
5. Hugh Carne at the Customs House stamps the clearances for ships that never sailed, because Garland holds his
   debts.

Garland's purpose is larger than Tregarthen's. A harbour where ships vanish is a harbour no underwriter will touch,
and when Verandah's trade fails, the king will have to accept the Charter's "protection": its cutters in his
harbour, its customs on his quay, and the Packet Treaty torn up. Ansbury gets the harbour; Harrowgate gets the dues.

**How the player finds it out.** Each chapter starts with an ordinary problem. The pieces only fit together at
the end of the third chapter.

1. **The Little Grace.** Tegen Hocking's brother is two days late. The player searches the Long Sands, finds
   the boat's marker buoy cut loose, not torn free, and talks to the pilots. Kerra Nance says three boats have gone
   missing this way in a year, all from the same water off the Fortress. Ends with Tegen's brother still missing.
   Grounded: fetch, search, talk.
2. **Late Cargo.** A Vyvyan salt ship, the *Good Intent*, is reported lost in fair weather. Grace Vyvyan
   wants the papers checked before Tregarthen pays her claim, which he is oddly quick to do. The player carries the
   papers to the Customs House, and Hugh Carne's clearance says the ship sailed on a night the pilots swear
   nothing left the harbour. Delivery, social, a document clue.
3. **False Lights.** Morvah blames the Black Gulls and asks the player to help the *Vigilant* clear Awschitz
   Head. The player fights the wreckers and takes their lamp-man alive. He tells them the Gulls haven't wrecked a
   merchant ship in two years. They take fishing boats when they're paid to, and they keep the crews. Combat,
   an interrogation, the first real turn.
4. **Black Gull Keep.** The player goes into the Keep, the public dungeon, to bring out the fishing crews,
   Tegen's brother among them. One of the crews saw a ship go into the Fortress's sea cave at night with her lamps
   out. Group dungeon run, rescue, a reunion at the market.
5. **The Tally.** At the Fortress, Mab Penhallow's ledger has the names of the "lost" ships against cargoes
   sold, in her hand. Getting it means choosing how:
   - buy it from Kettle;
   - steal it;
   - or talk Mab round. She is old, and frightened of what the den has become.

   It also means learning who she is. Stealth or social, and the first moral choice.
6. **Two Captains.** Morvah wants to raid the Fortress with marines tonight. Penhallow begs for a day to get his
   mother out first. The player chooses whose side to take, or brokers a plan that uses both forts: the
   *Vigilant* at the sea cave and Carn Hold's men on the causeway. Either way the raid happens, and what the player
   chose decides who is in the cave when it does, and whether Penhallow keeps his command. Both forts, a set-piece
   battle.
7. **The Underwriters.** The ship in the sea cave carries papers with Tregarthen's seal. The player follows
   the money:
   - into the Tregarthen Vaults, for the old house's books;
   - to Hugh Carne, who breaks;
   - to the Dolphyn, where Garland is packing.

   Investigation, a dungeon, a chase on the quay.
8. **The King's Council.** The player brings it all to Edmund, with the Board in the hall. The last choice is
   the kingdom's politics:
   - **Expose Garland and the Charter in open council.** The treaty is shamed and Edmund rewrites it on his terms,
     but Ansbury will remember.
   - **Let Edmund settle it quietly.** Garland is sent home, and the Charter pays a fat price for silence and
     withdraws its cutters.
   - **Put it all on Tregarthen and say nothing of the Charter.** It is the easiest, and the Charter keeps its
     hooks in the harbour.

   Tregarthen's fate (gaol, exile, or a pardon in return for his evidence) and Hugh Carne's are smaller choices
   inside it. The morality system records each choice, the Board's regard for the player follows it, and the
   harbour's NPCs remember it in their dialogue afterwards.

**After the story.** The missing crews are home and the harbour is busy again. Morvah gets her second cutter, or
Penhallow does, depending on whose side the player took. The Fortress is either a King's store or still a den
under new management. Piers Arundell is on the Board. Garland, if he got away, turns up again in Morrow.

## 4. Stages

1. This document. *(Done 2026-11-19.)*
2. *(Done 2026-11-19: `verandahHarbour.ts`, Hugh Carne in the warehouse, Kerra Nance at the pier end, her son Bryok with the daily tally, Grace Vyvyan on the pier; Short Measure and Off Station.)* Harbour government: the Customs House (Hugh Carne), the Guild of the Quay (Kerra Nance), Grace Vyvyan at the
   sheds, and harbour dues as a talk-to-learn system. Two everyday harbour quests and a repeatable dock job
   (unloading, tallying). Help entry for the harbour.
3. *(Done 2026-11-19: `verandahCarn.ts`, Sampson Keast the beacon keeper; Wet Wood and The Night Cart, which shows the player Mab Penhallow's tally mark; the outpost and its people renamed Carn Hold. Still to do: road patrols on schedules, a sign at the gate.)* Carn Hold. Give the outpost its name on signs and waystones, add the beacon keeper, the road patrol on
   schedules and supplies at the gate. Two fort quests: a road investigation and a beacon drill.
4. *(Done 2026-11-19: `awschitzMore.ts`, Two Kegs Short with Annie Tonkin, Wenna, Ennor and Gunner Pellow; The Cutter's Hours, where an Ansbury man leases a Vyvyan boat to watch the Vigilant go out.)* Awschitz quests: a supply run to the King's Dock and a night patrol on the *Vigilant*'s boat.
5. *(Done 2026-11-19: `silentWaters.ts`, swGrace and swIntent. Tegen's brother is Petroc; the lost boats are the Swallow, the Sweet Promise and the Little Grace; the Good Intent's master was Ralph Truscott.)* Silent Waters chapters 1 and 2.
6. *(Done 2026-11-19: `silentWaters2.ts`, swLights and swKeep. The lamp-man is Nicky Skewes, Mother Skewes's son; the crews are chained in the Keep's hall; Petroc saw the Good Intent go into the Fortress's sea cave.)* Chapters 3 and 4 (Black Gull Keep wiring, the rescued crews at the market).
7. *(Done 2026-11-19: `silentWaters3.ts`, swTally and swTwo. The Good Intent had already sailed from the cave painted over as the Charity of Ansbury; her nameboard and master's chest, with the papers under Tregarthen's seal, were left on the landing stage.)* Chapters 5 and 6 (the Fortress, the two captains, the raid).
8. *(Done 2026-11-19: `silentWaters4.ts`, swUnder and swCouncil. The other insured ships are the Fair Maid, the Brothers and the Hope of Kestle.)* Chapters 7 and 8, and the council. This is the kingdom-politics example owed under the morality item
   (OWED u).
9. The countryside: Polwith (the western village) and the Lamp House (the lit structure in the south-east), the
   farms and Kestle's unfinished buildings, side quests for each.

Every stage ships with its Help entries, the quest walker, the site check and a screenshot pass. Placements are
checked by eye because the site check can't see Verandah's blocks.
