// The Help page in the menu (owner 2026-11-13: "add a help menu in the pause screen for general things people may have
// questions about"). Short, plain answers, grouped; ui/Hud.ts renderSettings draws them as questions that open.

export const HELP: [string, [string, string][]][] = [
  ['Getting about', [
    ['How do I move and look round?', 'W, A, S and D move you, Space jumps, Shift runs. Hold the right mouse button and drag to look round, and use the wheel to bring the camera in or out. A controller works too, laid out as ESO’s: plug one in and the prompts and the bar show its buttons. Hold LB with the D-pad for the other windows: up for skills, down for the group finder, left for companions, right for social; LB and L3 for talents.'],
    ['How do I talk to someone or use something?', 'Walk up to it. When a prompt with E shows at the bottom of the screen, press E. In a conversation, click an answer or press its number.'],
    ['How do I travel quickly?', 'Touch the waymarks you find on the roads to attune them. Then open the map (M) and click one to travel there from anywhere. Your home is on the map once you have one.'],
    ['Where is my horse?', 'Press G to call your horse and ride; G again gets you down. You can buy more horses, and change their look, at the stables in the towns.'],
    ['How do I find my way to a quest?', 'Your quests are in the journal (J). The tracked one shows on the right of the screen with how far it is, and a marker on the compass and the map points the way.'],
  ]],
  ['Fighting', [
    ['How do I fight?', 'Press 1 to attack and 2 to 8 for the skills on your bar. Tab picks the next enemy. Hold V to block, and press Q to roll out of the way.'],
    ['How do I learn and change skills?', 'Skills (K) shows what you know and what you can learn as you level. Talents (T) is where you spend your talent points.'],
    ['How do I respec?', 'Open Talents (T): Unlearn at the foot of it takes back every talent, skill and morph for a few marks, so you can choose again. Save your build first if you want it back. A temple or a chapel will do it too (they are on the map).'],
    ['What happens if I\'m knocked out?', 'You come round somewhere safe nearby, a bench or a bed, with your health back. Nothing you carry is lost.'],
  ]],
  ['Money and things', [
    ['What are marks?', 'Marks are the money of the realm. You earn them from quests, selling what you find, crafting, and the day\'s writs on the notice boards.'],
    ['Where do I sell things?', 'To any shopkeeper: talk to them and choose to trade. The Exchange in the big towns lets you sell to other players at your own price.'],
    ['My pack is full. What now?', 'Sell or drop what you don\'t need, put things in the bank in any town, or buy a bigger bag. Anything that overflows waits for you at the nearest post box.'],
    ['Where is my mail?', 'At any post box. Parcels, letters and what didn\'t fit in your pack all wait there.'],
  ]],
  ['Crafting, farming and fishing', [
    ['How do I craft?', 'Gather as you go (ore, wood, herbs, fish), then use a crafting station in a town: the forge, the bench, the range and the rest. Each craft levels as you use it, and new recipes come with it.'],
    ['How do I farm?', 'Your own garden comes with a home. Till the ground, plant seeds from the seed sellers, water them, and come back when they\'re grown. There are public fields too, for anyone.'],
    ['Can my friends help on my farm?', 'Yes. Type /farmhands friends to open your garden to the people on your friends list, or /farmhands group for your group. They can water, plant and compost it; /farmhands pick on lets them harvest too. /farmhands off closes it again.'],
    ['How do I fish?', 'Buy a rod from a fishmonger or a tackle shop, stand by the water and cast. Different water holds different fish, and some only bite at certain hours.'],
  ]],
  ['Your garden and yard', [
    ['Where do I buy seeds, tools and animals?', 'From Bertram Sowerby, the seedsman by Hollin Ford’s west garden: ask him what he sells. He has the hoe and the watering can, seeds, fertilisers, the compost heap, hens, ewes and a cow, the makers, beehives, a greenhouse and garden decor. Some need a Farming level first. He buys back at half price.'],
    ['How do I choose which seed to sow?', 'Use the seed from your bag, and you’ll sow that one next while you have it. Otherwise your best seed is picked for you.'],
    ['Some crops keep cropping. Which?', 'Strawberries, peas, beans, tomatoes, peppers, raspberries, rhubarb and herbs give three to five pickings before they’re done. The prompt tells you how many are left.'],
    ['What do fertilisers do?', 'Dig one into a tile between plantings. Compost helps all round, bone meal gives more fine and prize produce, wood ash grows a quarter faster, and seaweed holds water twice as long.'],
    ['How does the compost heap work?', 'Build it in your yard, then put scraps on it: three produce become two compost after an hour and a half, up to six loads. Dig out the compost when it’s ready.'],
    ['How do I water without the can?', 'Sprinklers are made at an anvil (Smithing 12, 30 and 50). Bronze, iron and silver ones water the tilled ground one, two or three tiles round them. Set one down in the garden, and take it up again when you like.'],
    ['How do I keep animals?', 'Buy hens, ewes or a cow, then use them in your yard to set up the coop, the pen or the tether. Feed them wheat or barley, brush them, and collect eggs, milk or fleece. A fed animal goes on giving for three hours.'],
    ['What are the hearts on my animals?', 'How fond of you they are, from wary to devoted. Feeding and brushing raise it, and a day without food lowers it. A fonder animal gives more, and better.'],
    ['What are the makers for?', 'The churn, cheese press, loom, preserves shelf, cider press and keg turn your produce into butter, cheese, cloth, preserves, cider and the rest. Set one up in the yard, put the produce in, and come back when it’s done.'],
    ['How do I get new flower colours?', 'Pansies, tulips and roses come in red, yellow and white. Grow different colours side by side, and when you pick them a seed of a new colour may come: orange, pink, purple, and rarest of all, blue.'],
    ['How do bees work?', 'Set up to three hives. Each makes a jar of honey every two hours, and holds up to three. The honey tastes of the flowers growing near the hive.'],
    ['What does the greenhouse do?', 'Everything growing inside it grows as if it were in season, all year round.'],
    ['How do I grow a giant crop?', 'Grow pumpkins, marrows, cabbages or melons in a square of three by three, keep them well, and when all nine are ripe they may grow together into one giant. Cutting it is quicker with your group.'],
    ['What is the Hollin Ford Show?', 'Each season Hester Wragg, at her trestle by the seedsman’s garden, judges produce in six classes, from vegetables to giant crops. Enter once a class a day; she picks your best. Prizes are marks, Farming experience and a rosette or card, and four firsts in a season win the show cup.'],
    ['How do I put decorations in my garden?', 'Use the piece from your bag, face where it should go in your yard and press E. It can’t go on tilled ground. A trellis helps peas, beans and hops.'],
    ['Where can I see how my garden is doing?', 'In your journal (J), on the Garden page: your show places this season, your animals and their hearts, the flower colours you’ve found, and everything you’ve grown.'],
  ]],
  ['Tavern games', [
    ['How do I play a game in a tavern?', 'Ask the keeper “Any games going?”. There are dice, Find the Lady, blackjack, cards and chess, and some regulars will play Quarters if you ask them.'],
    ['How does chess work here?', 'There are two rules. The old game has the counsellor and the aufin instead of the queen and bishop, and no castling; you also win by leaving your rival a bare king. The new game is chess as you know it.'],
    ['Can I bet?', 'Yes. Dice and the Lady take stakes from 5 to 50 marks, and chess from nothing to 100, as far as your opponent will go. In chess the winner takes both stakes and a draw hands them back. A house only pays out so much a day.'],
    ['Can I play chess against a friend?', 'Yes: anyone in your group who is nearby shows at the table to ask.'],
  ]],
  ['Loot', [
    ['What is the beam of light?', 'A good drop: a rare, epic or legendary weapon or piece of armour.'],
    ['How is loot shared in a group?', 'A good drop goes to a roll for thirty seconds: Need, Greed or Pass. Need beats Greed, then the higher roll wins. You can only Need what you can wear. If nobody wants it, the one it dropped for keeps it. Dungeon chests are your own.'],
    ['What does bound mean?', 'Epic, legendary and named things are bound when you pick them up, and rare ones when you wear them. Something bound to you can’t be traded, mailed or sold on the Exchange.'],
  ]],
  ['Stealing and the law', [
    ['How do I sneak?', 'Press Left Ctrl. You move slower, and people see you from half as far. Press it again to stand.'],
    ['How do I steal?', 'In a town, barrels, crates, chests and the rest show Steal from. Locked ones need a lockpick. Sneak up behind someone for Pick their pocket. Out in the country, searching is not stealing.'],
    ['Where do I sell stolen things?', 'Shops won’t buy them. Take them to a fence: Abe Rowse in the Ropewalk Cellar in Gullmouth, under a hatch in the street, or Gil Fenner at Low Tide in Saltpenny. Both sell lockpicks.'],
    ['What happens if I’m seen?', 'You get a bounty in that town. It fades over time, but a big one brings the guards. When they catch you, pay it, go quietly to the gaol, or run (which adds to it). Stolen goods are taken. A fixer will clear every town’s book for a price: Nell Kitto in the Ropewalk Cellar, or Gil.'],
  ]],
  ['Delves and dungeons', [
    ['What does Cleared mean on the map?', 'You beat that delve’s or public dungeon’s boss. The first time gives a banner and experience, and the place gets a green tick on the map from then on.'],
  ]],
  ['Enchanting', [
    ['How does enchanting work?', 'An enchantment is a glyph you set into a weapon or a piece of armour you wear. A glyph is made from two things: a blank, which decides how strong it is, and a rubbing, which decides what it does. Cut the two together at a glyph-cutter’s bench and you have a glyph.'],
    ['Where do I get rubbings?', 'From the rings of old standing stones out in the wild. Walk up to one and choose Take a rubbing of the stones: each ring gives a rubbing of one of its marks, and another if you come back after a few minutes. Each mark is a different enchantment: flame, frost, storm, warding and more.'],
    ['Where do I get blanks?', 'Agnes Thew sells them in Ansbury’s market, where her bench is too, and anyone may use it. Soapstone makes a minor glyph, slate a full one from Enchanting 20, and basalt a greater one from Enchanting 40.'],
    ['How do I put a glyph on my gear?', 'Wear the weapon or armour first, then use the glyph from your pack and choose which piece to set it in. A weapon takes the weapon glyphs (flame, frost, storm, leech and the like); armour takes the guarding ones (warding, vigour, thorns and the wards against fire, sea, earth and wind). A piece shows its enchantment in its tooltip.'],
    ['I made the wrong glyph.', 'Take it apart at the same bench: you get the blank back, and half the time the rubbing too. Taking glyphs apart also teaches you a little Enchanting.'],
  ]],
  ['Homes', [
    ['How do I get a home?', 'Look for the For Sale and To Let signs on houses in the towns: walk up to one to see the price and buy it. You can also lease a lot or rent a room at an inn.'],
    ['I have more than one home. How do I pick?', 'Travel home from the map, and if you hold more than one you\'ll be asked which.'],
    ['How many homes can I have?', 'Up to three.'],
    ['How do I sell my home?', 'At your home’s gate, choose Sell. The Charter buys it back for half what you paid, once you’ve taken the furniture out. Or sell it to another player, furnished or empty, at your own price: /sellhome Name price, with furnished on the end to leave the furniture in. They have a minute to say yes.'],
    ['How do I put furniture in?', 'At home, choose Arrange the furniture. Pick a piece from your pack to place it; X picks one up again.'],
  ]],
  ['Playing with others', [
    ['How do I group with friends?', 'Open Group (P) to invite someone or to find a group for a dungeon. Everything in the game can be done together: quests, dungeons, crafting, fishing and the rest.'],
    ['How do I add a friend?', 'Social (O) holds your friends and your guild. Add a friend by name, and Travel to takes you to them. /goto <name> does the same.'],
    ['How do I chat?', 'Press Enter to type. The tabs on the chat box switch between everyone near you, the world and your group.'],
    ['Where can I play cards and dice?', 'In any tavern: they\'re marked on the map. Sit at a table to play against the house or against other players.'],
  ]],
  ['Trouble', [
    ['The game is slow. What can I do?', 'Open the Picture tab in this menu and lower the view distance or the quality, or turn off the shadows and light shafts.'],
    ['I\'m stuck in a wall or a hole.', 'Travel to a waymark or home from the map (M). That always gets you out.'],
    ['Is my progress saved?', 'Yes, as you play. Save and quit, under Character in this menu, takes you back to your characters.'],
  ]],
];
