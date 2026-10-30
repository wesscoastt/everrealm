import type { GameApi } from '../game/api';
import { CAMP, COLD, GULL, MOSSGATE, OAK, STARWATCH, TEMPLE, WORKS } from './places_regional';
import { CRAGSBY, HOLME, SCARROW } from './travel';

// Lore books: things people wrote, left where they wrote them, for anyone who stops to read. Each one
// read goes into your library (the journal's Library page), where you can read it again. They agree
// with docs/LORE.md, and they are written in the voice of whoever wrote them: a clerk, a camp boss,
// a printer, a shepherd's grandmother. Each sits by the place it's about (game/LoreBooks.ts).

export type Shelf = 'The Counties' | 'Trades and Rules' | 'Crystal and the Old Builders' | 'Songs and Sayings' | 'Letters and Records';
export const SHELVES: Shelf[] = ['The Counties', 'Trades and Rules', 'Crystal and the Old Builders', 'Songs and Sayings', 'Letters and Records'];

export interface LoreBook {
  id: string;
  title: string;
  shelf: Shelf;
  /** Where it lies, and how the library describes the place before you've found it. */
  x: number;
  z: number;
  where: string;
  text: string | ((g: GameApi) => string);
}

export const LORE_BOOKS: LoreBook[] = [
  // ---------------------------------------------------------------- The Counties
  {
    id: 'charter', title: 'The Charter of the Counties (a copy)', shelf: 'The Counties', x: 682.5, z: 425.5, where: 'the Charter Green, Ansbury',
    text: 'THE CHARTER, as sealed on the Green.\n\nWe, the reeves of the counties named below, bind our roads to the city of Ansbury, and Ansbury to us, on these terms and no others.\n\nFirst. Ansbury keeps the roads. The counties keep their own reeves, their own moots and their own customs, and Ansbury shall not send a reeve where a county has one.\n\nSecond. A toll is a fee for a road kept, and shall be no more than the keeping costs.\n\nThird. Any county may leave the Charter at Lady Day, giving a year\'s notice and paying what it owes.\n\nFourth. A dispute between counties comes to the Speaker, who hears both and decides one.\n\n[In the margin, in pencil:] Nobody has ever left. Nobody has ever been able to pay what they owe. H.K.',
  },
  {
    id: 'tolldaybook', title: 'A Toll Rider\'s Daybook', shelf: 'The Counties', x: 710.5, z: 578.5, where: 'the Waystation',
    text: 'Nat Coverdale, Charter toll rider, number fourteen.\n\nMichaelmas. Rode the long stretch to the Fleet turning and back. Two carts, both paid. One wolf, did not pay.\n\nSt Luke\'s. The corporal says the riders are to be cut from twelve to six in the new year. The tolls are up and the riders are down. I asked where the money goes. He said up.\n\nMartinmas. Took a wool cart through the cutting. The carter wanted to know why he paid a toll on a road with wolves on it. I said the toll pays for me. He looked at me for a while.\n\nAdvent. Last day. Handed in the sabre and kept the scabbard, which nobody counted. Sergeant Holroyd says she\'s putting up a roll at the tilt-yard for anyone who still wants the work, Charter or no Charter. I said I\'d think about it.\n\nI have thought about it.',
  },
  {
    id: 'exchange', title: 'How the Exchange Works, for the Bewildered', shelf: 'The Counties', x: 773.5, z: 166.5, where: 'the Guild Ward, Ansbury',
    text: 'By Gideon Wray, broker.\n\nYou give me a thing and a price. I write them in the book. It is the same book at every broker\'s desk in the counties, because it lives on the realm, not on my desk, whatever my desk looks like.\n\nSomeone buys it. I take one mark in twenty, for the ink. The rest is yours, and waits for you at any desk until you come for it.\n\nNobody buys it. In a while it comes back to you, also at any desk.\n\nQuestions I am asked daily. No, I can\'t tell you who bought it. No, I can\'t buy it myself and sell it to you dearer; it isn\'t that sort of book. Yes, Mr Pryce uses the Exchange. So does everyone. That is rather the point of it.',
  },
  {
    id: 'lanternlog', title: 'The Last Log of the Lantern', shelf: 'The Counties', x: 73.5, z: 255.5, where: 'the Lantern, Hollindale',
    text: 'The beacon log of the Lantern, the last page.\n\nLit at dusk. Answered by the Ridge fire and by Fleet. All quiet.\n\nLit at dusk. Answered by the Ridge fire. Fleet late. Fleet answered.\n\nA notice from the Charter, read at the Hollin moot: the beacon line is to be given up. The Charter Post will carry word between the towns, by cart, on the road, in all weathers.\n\nI said a cart can\'t be seen from the next hill. The man from Ansbury said nobody needs to be seen from the next hill any more.\n\nLit at dusk, the last time. Nobody answered. I knew they wouldn\'t. I lit it anyway, and sat up with it until it went out.',
  },
  {
    id: 'morrow', title: 'Tomorrow\'s Coast', shelf: 'The Counties', x: 2341.5, z: 731.5, where: 'the Mewstones',
    text: 'Written down at the Mewstones by a ferryman, from a sailor off a ship from the east that stopped for water.\n\nHe said that where he comes from they call this country "the Counties", the way you\'d call a neighbour by his trade.\n\nHe said his land is a day and a night\'s sail east. We call it Morrow, because you always get there tomorrow. He laughed at that, and said they call it home.\n\nHe said their cities are taller than ours and held down with black stone, and that the tallest have started wanting to go up. He said it the way you\'d talk about the weather.\n\nHe said there\'s an island of wrecks at the south end where nobody pays a toll to anybody, and that if I ever sailed there I should take nothing I wanted to bring back.\n\nHe took his water and went. He paid for it, which surprised everyone.',
  },
  // ---------------------------------------------------------------- Trades and Rules
  {
    id: 'calling', title: 'Rules for Calling Timber', shelf: 'Trades and Rules', x: CAMP.x + 2.5, z: CAMP.z - 6.5, where: 'Fellers\' Camp, Hagworm Wood',
    text: 'FELLERS\' CAMP. RULES FOR CALLING TIMBER. Read them. Then read them again.\n\n1. No tree is cut without a caller. The caller stands where she can see the whole fall and nobody else\'s back.\n\n2. The caller calls three times: the side it\'s going, "timber", and the side again. If you can\'t hear the call, you\'re too close or too deaf. Either way, stand back.\n\n3. Two to a saw. Keep the stroke. If you don\'t know the stroke, Sefton will sing it.\n\n4. Elder oak goes to Harrowgate as props: nine foot, no shakes, no knots in the bottom third. A prop with a knot in the bottom third goes in the fire, not in the Works. A prop that breaks is a roof that falls.\n\n5. Nobody goes under an ancient after dark. There are things in the roots that don\'t care for company.\n\nI. Marrow, camp boss',
  },
  {
    id: 'works', title: 'Rules of the Works', shelf: 'Trades and Rules', x: WORKS.cx + 9.5, z: WORKS.cz + 29.5, where: 'Harrowgate Works',
    text: 'HARROWGATE & DAUGHTERS. RULES OF THE WORKS. Posted by order. H. Harrowgate.\n\nThe Company pays by the cart, at the posted rate. The posted rate is posted.\n\nTools are issued and returned. A tool not returned is deducted. A tool returned broken is deducted at half.\n\nNobody goes below the second level without a lamp, a partner, and the shift clerk\'s chalk on the board.\n\nNothing leaves the Works that the Company has not paid for. This includes ore, timber, rail and gossip.\n\nStoppages for weather are unpaid. Stoppages for a fall of roof are paid at half, from the moment the Company is satisfied the fall was not your fault.\n\n[Scratched underneath, very small:] Nobody has ever satisfied the Company.',
  },
  {
    id: 'knots', title: 'Knots for Climmers', shelf: 'Trades and Rules', x: CRAGSBY.x + 6.5, z: CRAGSBY.z + 7.5, where: 'Cragsby, on the Gannet Cliffs',
    text: 'Posted at the climmers\' hut, Cragsby, for anyone going over the edge for eggs or for a living.\n\nThe bowline, for your middle. Tie it with your eyes shut until you can. The cliff is not the place to learn.\n\nThe double fisherman\'s, for joining two ropes. If it comes undone, you\'ll know about it, briefly.\n\nThe clove hitch, for the stake. Check the stake. Check it again. The stake was put in by somebody who isn\'t going down.\n\nNever go over on a rope you didn\'t coil yourself.\n\nNever go over when the gannets are sitting tight. A gannet will have your eye out and think nothing of it.\n\n[Added in a different hand:] And never go over drunk, Wat.',
  },
  {
    id: 'eels', title: 'Eeling on the Wrath Levels', shelf: 'Trades and Rules', x: HOLME.x + 6.5, z: HOLME.z + 6.5, where: 'Holme Staithe, the Wrath Levels',
    text: 'For the visitor who has been told the eeling is good, and wants to know how wet he\'ll get. Very.\n\nSet your gig at slack water, where a drain meets the river. The eels come up the drains at dusk.\n\nEel-skin on the handle. Bare wood goes slippery as soon as it\'s wet, which is always.\n\nThe big ones in the deep drains are not eels, whatever the Staithe tells you after a drink. Leave them be.\n\nSmoke what you catch. Fresh eel keeps a day. Smoked eel keeps a winter, and the smell keeps longer.',
  },
  {
    id: 'lamplighters', title: 'The Lamplighters\' Company: Rules of Service', shelf: 'Trades and Rules', x: 671.5, z: 285.5, where: 'the Shambles, Ansbury',
    text: 'Rules for the lamplighters of Ansbury, licensed by the Charter.\n\nEvery lamp lit by the second bell after sunset. Every lamp out at first light.\n\nWicks trimmed, glass cleaned, oil counted. The oil is the Charter\'s. A lamplighter found with the Charter\'s oil in his own lamp is a lamplighter no longer.\n\nThe keys to the lamp boxes are the Company\'s, and stay on the Company\'s ring.\n\nA lamplighter sees a great deal from a ladder. A lamplighter says nothing about any of it.\n\n[Underneath, in a careful hand, not part of the printed rules:] Light the poor streets first.',
  },
  {
    id: 'muster', title: 'A Notice from the Muster', shelf: 'Trades and Rules', x: 958.5, z: 239.5, where: 'the tilt-yard, Ansbury',
    text: 'THE MUSTER. At the tilt-yard, Ansbury.\n\nThe Charter no longer employs toll riders. The roads still have wolves on them. Somebody ought to be paid to do something about that, and it may as well be you.\n\nSign the roll. Take a contract off the board. Do it. Get paid.\n\nWe take anybody who can hold a weapon and keep their word. We don\'t take anybody who is also drawing a wage from the Company Wardens. You know who you are.\n\nA. Holroyd, Sergeant-at-Muster',
  },
  {
    id: 'nuisances', title: 'Redbacks, Jellies and Other Nuisances', shelf: 'Trades and Rules', x: WORKS.cx - 5.5, z: WORKS.cz + 20.5, where: 'the gate of Harrowgate Works',
    text: 'A warden\'s notes for new riders, kept at the Works gate.\n\nRedbacks. The size of a dog and the temper of a goose. They nest on old iron. If you find old iron, expect a redback. If you find a redback the size of a cart, ride away. That one has a name, and you are not the person to meet it.\n\nJellies. Slow, stupid and acid. Don\'t let one touch your horse. Don\'t let one touch you either, but horses complain more.\n\nShard jellies. As above, but they\'ve been near star crystal and it has made them bright and bad-tempered. Keep away from cracks in the ground that glow.\n\nBoars. If a boar looks at you, it has already decided. Get off the road.\n\nWolves. Road wolves go for the last cart. Ride at the back.',
  },
  // ---------------------------------------------------------------- Crystal and the Old Builders
  {
    id: 'starlog', title: 'A Count of Falling Stars, Volume Nine', shelf: 'Crystal and the Old Builders', x: STARWATCH.x + 4.5, z: STARWATCH.z + 4.5, where: 'Scarth Watch',
    text: 'Kept at Scarth Watch by I. Blewitt.\n\nThe 3rd. Clear. Eleven falls, all small, all north. Glass steady.\n\nThe 4th. Clear. A big one at the second hour, bright enough to read by, came down past the Kettle. Marked on the chart. The Charter will want to know. So will Harrowgate, which is why it goes in the book and not in a letter.\n\nThe 9th. Cloud. Counted nothing. The stipend is three weeks late. Counted that.\n\nThe 14th. Clear. Measured the drift of the near isle against the cairn. A stride and a hand since spring. Thirty years of this, and it has never once gone the other way.\n\nThe 17th. A young man from the Collegium came up to ask whether I had considered that the falling stars might be falling. I said yes. He wrote it down.',
  },
  {
    id: 'ketley', title: 'Notes on the Ketley Arches', shelf: 'Crystal and the Old Builders', x: MOSSGATE.x + 3.5, z: MOSSGATE.z + 5.5, where: 'the Ketley Arches, Hagworm Wood',
    text: 'By W. Carrow.\n\nSeventeen arches stand. There were more: the stumps of nine are in the bracken, and a tenth is built into the wall of the Mossgate sheepfold, where it holds up a gate.\n\nEach lintel has rope grooves cut in its north face. The grooves are worn smooth, so rope ran in them for a long time, so something pulled.\n\nI have measured the grooves on every lintel. They are not the same depth. The deepest are on the arches nearest the Knap. If you tied down a field, and the field wanted to go up, the ropes nearest the lift would take the most strain.\n\nI have put this to the Collegium four times. They have replied twice. The second reply suggested I was lonely.\n\nI am, a little. I am also right.',
  },
  {
    id: 'tally', title: 'The Tally Wall at Gallows Knap', shelf: 'Crystal and the Old Builders', x: 1244.5, z: 1256.5, where: 'Gallows Knap',
    text: 'A rubbing, charcoal on linen, by W. Carrow.\n\nThey did not write, so there are no words to copy. There are marks: strokes in fives, the fifth across the four, the way shepherds still count. Over each set there is a drawing. A field. A house. A field with a rope. A field without one.\n\nUnder the last drawing, forty-one strokes. Nothing after them. No more drawings, and no more counting.\n\nI counted them nine times. They do not get fewer.',
  },
  {
    id: 'lecture', title: 'A First-Year Lecture on Star Crystal', shelf: 'Crystal and the Old Builders', x: 791.5, z: 180.5, where: 'the Guild Ward, Ansbury',
    text: 'Notes taken at the Collegium, in a student\'s hand, with doodles of the professor.\n\nStar crystal is light. Not "gives light", though it does. Light, as in not heavy. Ilse Blewitt\'s phrase: "like a cork held under water".\n\nWhere a star falls, crystal is found under a cap of rock that holds it down. Take the cap off and the ground rises, by a span for every three feet of cap. (Joan Harrowgate\'s figure. The professor says it as if it were his.)\n\nThe old words. Scarth Watch keeps them. The Collegium would like to keep them too. The professor calls this "a matter for licensing".\n\n[In the margin:] Ask why the Kirk floor is crystal. Ask why it doesn\'t go up. The professor did not take the question.',
  },
  // ---------------------------------------------------------------- Songs and Sayings
  {
    id: 'threemarks', title: 'Three Marks in Ten (a broadside)', shelf: 'Songs and Sayings', x: 814.5, z: 341.5, where: 'the Charter Market, Ansbury',
    text: 'Printed and sold by A. Hollis, the Charter Market. One penny. To be sung to the Waits\' tune.\n\nThey paved the road from Ford to sea,\nAnd borrowed for the stone.\nThe guilds lent fair, the guilds sold on,\nAnd now the debt\'s not ours to own.\n\n    Three marks in ten, three marks in ten,\n    They bought it cheap and sell it dear.\n    Three marks in ten, and ten in ten\n    We pay the Turnpike every year.\n\nThe Weighhouse scales are reading heavy,\nThe light at Fleet is burning low.\nThe oil was sold to pay the interest,\nAnd where it went, you\'ll never know.\n\nNow forty thousand marks of road\nWent for twelve to Mr Pryce.\nHe paid it once; we pay it yearly,\nAnd some years, neighbour, we pay twice.\n\nSo when you pass the toll board, neighbour,\nCount the coin and do the sum:\nThree it cost him, ten he\'s taking,\nAnd seven more for years to come.',
  },
  {
    id: 'tides', title: 'Gullmouth Tides, and What They Mean', shelf: 'Songs and Sayings', x: GULL.coast - 30, z: 603.5, where: 'the quay at Gullmouth',
    text: 'Springs and neaps you can read off the moon. The rest of what the water means, Gullmouth reads off itself.\n\nA tide that comes in quiet goes out loud.\n\nGannets fishing close to the slip: weather by morning.\n\nIf the Fleet Light burns low, the oil\'s been sold. (Chalked on the board last winter, and nobody has rubbed it out.)\n\nNever whistle on the quay. It calls the wind, and the wind never comes on its own.\n\nNever count the boats in harbour out loud. Count them in your head, and make sure it\'s the same number in the morning.',
  },
  {
    id: 'weather', title: 'Kelderby Weather, as the Hales Read It', shelf: 'Songs and Sayings', x: COLD.x - 3.5, z: COLD.z + 3.5, where: 'Kelderby, on the Scarth Highlands',
    text: 'Tressa Hale says these are her grandmother\'s, and her grandmother said they were her grandmother\'s, so take it up with her.\n\nFrost on the fold wall before Michaelmas: a long winter and short tempers.\n\nSheep with their backs to the wind are cleverer than you. Put yours there too.\n\nWhen the Kettle steams on a cold morning, the snow\'s two days off.\n\nWhen the frost wolves come down to the fold, it isn\'t the cold that sent them. It\'s whatever is up above them.\n\nCount the ewes in every night. If you\'re one short, go now, not in the morning. In the morning you\'ll be two short.',
  },
  {
    id: 'moorbells', title: 'What the Moor Says About Bells', shelf: 'Songs and Sayings', x: SCARROW.x + 8.5, z: SCARROW.z + 8.5, where: 'Scarrow Tor, on Tolmen Moor',
    text: 'Collected at Scarrow Tor from the shepherds, who did not want their names in it.\n\nA bell that rings on the moor with no church under it means somebody is going to die. Nobody on the tor will say who rings it.\n\nThe chapel at Carne Cross lost its roof a hundred years ago, and its parish fifty years before that. It still has its bell. Some nights, they say, the rope has been pulled.\n\nMy grandmother said you could ring the passing bell for anybody you liked, if you could find the chapel and the coin. She said it the way you\'d tell a child about wolves.\n\nI asked her what the coin was for. She said it was so that whoever answered the bell would know you meant it.',
  },
  // ---------------------------------------------------------------- Letters and Records
  {
    id: 'names', title: 'From the Book of Names', shelf: 'Letters and Records', x: TEMPLE.x - 3.5, z: TEMPLE.z + 9.5, where: 'the Glass Kirk',
    text: (g) => 'Kept at the Glass Kirk by the keeper. Pilgrims write their own names, or have them written.\n\nAnn Penrose of Kelderby, for her husband\'s eyes.\n\nTomas, a carter, for the road.\n\nJoan, who did not say what for.\n\nHob Tannet of Cotter\'s End, three times, all on the same day.\n\nThe crew of the Gannet, eleven names, written in one hand.'
      + (g.flag('parishEnd') ? '\n\n[On the first page, in Sela Orme\'s hand:] Holmsey. One hundred and twelve years ago. Their names are in their own register, and I won\'t copy them out of it. But the parish is written here first, because the floor is theirs.' : ''),
  },
  {
    id: 'oakletters', title: 'Letters Left in the Hollow Oak', shelf: 'Letters and Records', x: OAK.x + 5.5, z: OAK.z + 5.5, where: 'the Hollow Oak, Hagworm Wood',
    text: 'Taken out of the oak, read, and put back, because nobody said not to.\n\n"Davy, the two marks I owe you are under the stone by the stream. Don\'t tell your mother where I got them. E."\n\n"To whoever took my good axe. I know it was you. Bring it back and I\'ll say nothing. Keep it and I\'ll say a great deal."\n\n"Mother, I\'m at the Works now. The pay is by the cart and the carts are heavy. I\'m well. Please don\'t send the cake. The lads eat it before I\'ve seen it."\n\n"Sorry."\n\n[On a slate, very old: a field held down by four ropes, and a small figure on it, waving.]',
  },
  {
    id: 'numberfour', title: 'The Shift Board, Number Four', shelf: 'Letters and Records', x: 214.5, z: 125.5, where: 'Sallow Pit, Hollindale',
    text: 'Copied off the board at the Number Four gallery by the shift clerk, before Hesk Dunmore boarded it up.\n\nMichaelmas. Nights: C. Bray, with Penney and young Tully. Carts: three. Weighed light. Bray says the seam\'s thinning. Hesk says Bray\'s thinning.\n\nMichaelmas, the fourth day. Nights: Penney and Tully. Bray let go for drink on shift. Carts: two.\n\nAdvent. Nights: none. Penney gone to Ansbury. Tully gone to the fellers.\n\nCandlemas. Roof down in the far drift. Nobody under it. Gallery shut by order of H. Dunmore.\n\n[Chalked underneath, later, in a hand the clerk didn\'t know:] Lamps: six gone. Carts: still light. Ask the old man.',
  },
  {
    id: 'pages', title: 'On the Missing Pages', shelf: 'Letters and Records', x: 692.5, z: 383.5, where: 'the Waits\' House, Ansbury',
    text: 'To Mistress Gant, Master of the Waits.\n\nThe Provost has asked me to reply to your letter of the 3rd, and to your letters of the 3rd of each month for some years.\n\nThe Collegium regrets that the Great Book came back incomplete. The pages appear to have been taken by a student who has since left us. The Collegium does not, as a rule, pursue former students for the return of music.\n\nThe Provost wishes me to add that the Collegium\'s own copy of the tunes in question is kept in the library for scholars, and may be consulted by appointment.\n\n[Across the bottom, in Tabitha Gant\'s hand:] Their own copy. Of our pages.',
  },
];

export const BOOK_BY_ID: Record<string, LoreBook> = Object.fromEntries(LORE_BOOKS.map((b) => [b.id, b]));
