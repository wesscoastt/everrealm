// The Help page in the menu (owner 2026-11-13: "add a help menu in the pause screen for general things people may have
// questions about"). Short, plain answers, grouped; ui/Hud.ts renderSettings draws them as questions that open.

export const HELP: [string, [string, string][]][] = [
  ['Getting about', [
    ['How do I move and look round?', 'W, A, S and D move you, Space jumps, Shift runs. Hold the right mouse button and drag to look round, and use the wheel to bring the camera in or out. A controller works too, laid out as ESO's: plug one in and the prompts and the bar show its buttons. Hold LB with the D-pad for the other windows: up for skills, down for the group finder, left for companions, right for social; LB and L3 for talents.'],
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
  ['Homes', [
    ['How do I get a home?', 'Look for the For Sale and To Let signs on houses in the towns: walk up to one to see the price and buy it. You can also lease a lot or rent a room at an inn.'],
    ['I have more than one home. How do I pick?', 'Travel home from the map, and if you hold more than one you\'ll be asked which.'],
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
