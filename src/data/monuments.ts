// The cities' monuments: each one stands once, in a square of its own (world/sites.ts takeMonument),
// built by its own model (world/props.ts monument) with a plaque to read. Ansbury's are in the order
// the planner hands them out, Callis's likewise. Plain data: the world worker reads this too.

/** Which model props.monument builds. */
export type MonumentModel =
  | 'speaker' | 'rider' | 'scales' | 'cross' | 'fountain' | 'obelisk' | 'bell' | 'dog' | 'plough'
  | 'milestone' | 'column' | 'seated' | 'boots' | 'masons' | 'plumb' | 'netmender' | 'stones'
  | 'jawbones' | 'drownedboard' | 'fogbell' | 'tallystone' | 'anselbench'
  | 'companysign' | 'priceboard' | 'flywheel'
  | 'fordpost' | 'floodstone' | 'mootstone' | 'pump'
  | 'tallypost' | 'cairn' | 'sledge'
  | 'keeperstones' | 'wallbell' | 'watchboard'
  | 'oarrack' | 'figurehead' | 'compassrose'
  | 'glassslab' | 'lawstone' | 'routeboard'
  | 'boundstone' | 'assemblynotice' | 'doorstep'
  | 'longseat' | 'heightmarks' | 'findingpost'
  | 'bogoak' | 'chalklizard' | 'floodpunt'
  | 'tilewall' | 'redrock' | 'fishrack'
  | 'conchhorn' | 'countshelf' | 'turtleshell'
  | 'blackcairn' | 'bootrow' | 'tidepost';

export interface Monument {
  id: string;
  town: 'ansbury' | 'callis' | 'gullmouth' | 'harrowgate' | 'hollin' | 'kelderby' | 'northgate' | 'saltpenny' | 'tenwells' | 'liftwick' | 'branchley' | 'reedwater' | 'cala' | 'conch' | 'coldharbour';
  /** Placed by hand: at Gullmouth (world/sites.ts) blocks east of the coast line at z 600, north-south, facing;
   *  at Hollin Ford (world/structures.ts) the place itself, x, z and facing. */
  at?: [number, number, number];
  model: MonumentModel;
  /** What the interact prompt and the readable's title call it. */
  title: string;
  /** The plaque, then what you notice standing in front of it. */
  body: string;
}

export const MONUMENTS: Monument[] = [
  // ---------------------------------------------------------------- Conch Key (world/sites.ts buildConch: x and z from the crossing, facing)
  // ---------------------------------------------------------------- Cold Harbour (world/sites.ts buildColdHarbour: x and z from the cove's middle, facing)
  {
    id: 'chcairn', town: 'coldharbour', at: [-8, -8, 0.4], model: 'blackcairn', title: 'Wat\'s cairn',
    body: "A heap of the black, knee-high and growing, with a stake driven into the middle of it. Every morning Wat Aske loads one cart from the heaps by the shore and pulls it up the track to Hollow Fell by himself, and every evening he comes down and puts a stone on this, and cuts a notch in the stake.\n\nThe stake has a hundred and nine notches. The heaps by the shore are no smaller that anyone can see." },
  {
    id: 'chboots', town: 'coldharbour', at: [-12, -3.5, Math.PI / 2], model: 'bootrow', title: 'Eleven pairs',
    body: "A plank on two stones against the shed wall, and on it eleven pairs of boots, set out as neatly as on a cobbler's shelf. Big ones and small ones, one pair hobnailed, one pair with the toe out. Each pair has a name chalked on the plank behind it, and the chalk is renewed when the rain takes it.\n\nThere's room on the plank for a twelfth pair. Nobody has put one there." },
  {
    id: 'chtide', town: 'coldharbour', at: [8.5, 3.6, 0], model: 'tidepost', title: 'The tide post',
    body: "An oak post at the root of the jetty, painted in white rings where the big tides have reached, a year cut beside each. Most are low, at the height of a boot. One is above a man's head: THE YEAR THE FELL WENT QUIET.\n\nBelow it, smaller and newer, someone has cut: AND THEN IT DIDN'T." },
  {
    id: 'ckhorn', town: 'conch', at: [2.5, 18.5, 0], model: 'conchhorn', title: 'The turtle horn',
    body: 'A conch shell the size of a man\'s head, hung on a post above the beach with a rope through it, its point cut off for a mouthpiece.\n\nWhen the sand starts to move on a nest, whoever sees it blows one long note, and everybody on Conch Key stops what they\'re doing and comes down with a lantern to keep the gulls and the crabs off.\n\nThree short notes is a boat in trouble. It hasn\'t been blown that way in eleven years.',
  },
  {
    id: 'ckbooks', town: 'conch', at: [4.5, 9.5, Math.PI], model: 'countshelf', title: 'Sal\'s books',
    body: 'A shelf with a little roof of its own, nailed up beside Sal Mudge\'s door out of the rain. Forty-one count-books stand on it in a row, waxed against the damp, one for every year she has watched the beach.\n\nThe first is in a child\'s handwriting. She was nine.\n\nEach spine has the year on it and a number. Most of the numbers are over fifty.',
  },
  {
    id: 'ckshell', town: 'conch', at: [-12, 24, 0.5], model: 'turtleshell', title: 'The big shell',
    body: 'The shell of a turtle bigger than a rowing boat, propped up on stones above the tide line. She came up the beach to die sixty years ago, and the key left her shell where she lay.\n\nThe children use it for a den.\n\nEvery captain on the Keys says they rode Old Shell as a child. On Conch Key they will tell you this was his mother.',
  },
  // ---------------------------------------------------------------- Cala Roja (world/sites.ts buildCala: x from the quay's edge, z from the town's middle, facing)
  {
    id: 'crtiles', town: 'cala', at: [-6.2, -7, Math.PI / 2], model: 'tilewall', title: 'The boat tiles',
    body: 'A low white wall at the head of the quay, faced with painted tiles, one for every boat ever built in Cala Roja: her name, her colours and the year she went in the water, blue on white. There are a hundred and twelve.\n\nSome have one corner painted black. Those are the boats that didn\'t come back.\n\nThe newest tile has the colours painted and the name left blank. The Pujols haven\'t decided.',
  },
  {
    id: 'crrock', town: 'cala', at: [-2.5, -25, 0.4], model: 'redrock', title: 'La Roja',
    body: 'The rock the town is named for, red as a roof tile, standing up through the paving at the north end of the quay. When they built the quay they built it round the rock rather than move it.\n\nEvery child in Cala Roja jumps off it into the basin on the day they turn ten. The top is worn smooth by bare feet. There\'s an iron ring in the side for the ones who need a hand getting out.',
  },
  {
    id: 'crrack', town: 'cala', at: [-3.5, 6.5, Math.PI / 2], model: 'fishrack', title: 'Nuria\'s racks',
    body: 'Split fish drying on a rack of cane, salt crusted white on them. Strung all along it on a line: tin cans, cockle shells, a spoon, and a bell off a goat, to rattle if anything comes at the fish in the night.\n\nIt does rattle. The terrace jackals have learned that the rattle means dinner.',
  },
  // ---------------------------------------------------------------- Reedwater (world/sites.ts buildReedwater: x and z from the middle platform, facing; all on the deck)
  {
    id: 'rwoak', town: 'reedwater', at: [2.5, 2.5, 0], model: 'bogoak', title: 'The bog oak',
    body: 'A black trunk standing up through the middle platform, harder than iron and older than anybody can say. It was standing in the marsh, dead, when the first Reedwater folk came, and they tied the first walk to it.\n\nEverybody who leaves Reedwater for good drives a nail into it on the way out. Below the rail it is more iron than wood.\n\nMost of the nails are rust brown. A good many, near the bottom, are still bright.',
  },
  {
    id: 'rwlizard', town: 'reedwater', at: [-21, 0.5, 0], model: 'chalklizard', title: 'The long lizard',
    body: 'A lizard drawn in chalk on the boards of the west walk, nose to tail longer than a punt, with a row of teeth like a saw. Chalked beside it: THE ONE ORLA\'S FATHER TOOK. UNDER THIS WALK.\n\nIt is drawn fresh every spring. Ask anybody in Reedwater and they will tell you it is a little longer every year.\n\nChildren lie down in it to see how many of them it would take.',
  },
  {
    id: 'rwpunt', town: 'reedwater', at: [4, 5, 0], model: 'floodpunt', title: 'The flood punt',
    body: 'A flat-bottomed punt turned over on two trestles at the edge of the platform, its pole lashed underneath. It is kept for the night the water comes over the walks.\n\nPainted along its bottom are the years it has been needed. There are three in sixty years. The last is this spring\'s, and the paint is still bright.',
  },
  // ---------------------------------------------------------------- Branchley (world/sites.ts buildBranchley: x and z from the crossing, facing; the marks on the west tree's trunk)
  {
    id: 'brseat', town: 'branchley', at: [-17.5, -4.5, 0], model: 'longseat', title: 'The long seat',
    body: 'A seat made from one bough, long enough for the whole village to sit on at once. It came off the east tree in the winter of the big wind, fell across the old road, and missed the Larches\' roof by a hand.\n\nThe Wold doesn\'t burn what its trees give it. They dressed the bough where it lay, legged it with its own stubs and dragged it to the roadside.\n\nOnce a year, at the first frost, everybody in Branchley sits on it at once, to see if they still fit. Last year they did, just.',
  },
  {
    id: 'brmarks', town: 'branchley', at: [-21.02, -21.5, -Math.PI / 2], model: 'heightmarks', title: 'The marks on the west tree',
    body: 'Nicks cut in the bark at the foot of the west tree, each with a name and a year beside it, from a small child\'s height to a tall man\'s. Every Wold child is stood against the tree on midsummer morning and marked.\n\nThe old folk will tell you the marks go up as the tree grows. They don\'t. The oldest are where they were cut, low on the trunk, and the names beside them belong to the grandmothers of the people telling you.\n\nThe newest is still pale. It says LINNET LARCH, and it is a little higher than it ought to be, because she stood on her toes.',
  },
  {
    id: 'brfound', town: 'branchley', at: [-4.5, 6.5, Math.PI], model: 'findingpost', title: 'The finding post',
    body: 'An oak post by the crossing with a crossbar and a row of hooks. Whatever anyone finds on the old road gets hung here: a pipe, a doll\'s arm, three keys on a string, a pair of spectacles with one lens, a single good boot.\n\nNothing is taken that isn\'t yours, and nothing is ever thrown away.\n\nThe oldest thing on it is a set of wooden false teeth. Every year somebody says it\'s time they came down, and every year somebody\'s grandmother says he might still come back for them.',
  },
  // ---------------------------------------------------------------- Liftwick (world/sites.ts buildLiftwick: x and z from the crossing, facing)
  {
    id: 'lwbound', town: 'liftwick', at: [-37.5, -1.6, 0], model: 'boundstone', title: 'The bound stone',
    body: 'Liftwick\'s boundary stone, where the west road leaves the village, older than the Assembly\'s tower: a squat grey stone with the village\'s mark cut in it, a wheatsheaf over a wavy line.\n\nThree springs ago it rose a finger\'s width out of the ground on its own. The smith drove an iron pin into the bedrock beside it and chained it down.\n\nThe chain was slack then. It is tight now. Somebody has hung a little bell on it, so they will hear if it goes.',
  },
  {
    id: 'lwnotice', town: 'liftwick', at: [2.6, 28.95, Math.PI], model: 'assemblynotice', title: 'The Assembly\'s notice',
    body: 'Printed in Callis and nailed to the lift tower beside its door: THE LIFT AND THE BRIDGES OF LIFTWICK ARE THE PROPERTY OF THE ASSEMBLY OF CALLIS. PASSAGE AT THE POSTED RATE.\n\nThe posted rate is chalked underneath. It has been rubbed out and chalked again so many times that the board has gone grey.\n\nAt the bottom, in somebody\'s careful capitals: THE BEES RIDE FREE.',
  },
  {
    id: 'lwstep', town: 'liftwick', at: [-6.5, 40.5, 0], model: 'doorstep', title: 'The Solers\' doorstep',
    body: 'A doorstep and the bottom course of a cottage\'s walls, cut off clean a hand above the ground, as if with a knife. The floor inside is swept.\n\nThe Solers\' house stood here. The spring the first slab went up, the house went up with it. It is the hut on the big slab now, the one the skyfarmers keep their tools in, and it still has the Solers\' door.\n\nThe Solers lodge at the inn. Every so often old Neus Soler walks out over the bridges and sits in her own kitchen for an hour.',
  },
  // ---------------------------------------------------------------- Tenwells (world/sites.ts buildTenwells: x and z from the yard's middle, facing)
  {
    id: 'twglass', town: 'tenwells', at: [-20, 8, 0.3], model: 'glassslab', title: 'The black glass',
    body: 'A slab of black glass as tall as a door, stood on end in the yard where the caravans unload. It came out of the Mother\'s Bed on a sledge forty years ago, and it took nine drakes to pull it.\n\nTwo kinds of marks are on it. The storm-hunters\' are in chalk, high up: sums, and LIGHTNING ON SALT, underlined twice. The caravan folk\'s are scratched in low down with knife points: a little drake for every crossing of the Flats, hundreds of them, the oldest worn nearly smooth.\n\nNeither side has rubbed out the other\'s.',
  },
  {
    id: 'twlaw', town: 'tenwells', at: [15, -11.5, -Math.PI / 2], model: 'lawstone', title: 'The water law',
    body: 'A squat white stone at the lip of the fourth well, cut deep in old square letters: THE WATER IS NOT SOLD AT THE WELL. Under it, smaller: Whoever comes in off the Flats drinks first, and pays after or not at all.\n\nEnnis Wade sells water from a barrel on the far side of the coaching yard, out of sight of the stone. Ask him and he will tell you that it is a barrel, not a well.',
  },
  {
    id: 'twroutes', town: 'tenwells', at: [6.5, 27, -Math.PI / 2], model: 'routeboard', title: 'Cass Moran\'s road board',
    body: 'A board inside the south gate with the north road and the south road painted on it as two long lines, a nail for every stop, and the days between chalked beside each. Cass Moran keeps it. The chalk is new every morning.\n\nThe nail at the top of the north road has been pulled out and the hole painted over. The name beside it has been painted over too, but not well enough: FELLSIDE.',
  },
  // ---------------------------------------------------------------- Saltpenny Key (world/sites.ts buildSaltpenny: x and z from the key's middle, facing)
  {
    id: 'spoars', town: 'saltpenny', at: [104, 6.5, Math.PI], model: 'oarrack', title: 'The captains\' oars',
    body: 'A rack of oars stood on end beside the Long Walk, blades up, each with a name burnt into the blade. The Brethren\'s sign is two crossed oars because every captain started out pulling one, and when a captain gets her first ship she brings her oar here and stands it in the rack.\n\nNed Vey\'s is near the middle, sawn off short. He was eleven when he pulled it.\n\nA few blades have a ring burnt under the name: that captain brought every crew home. There are not many rings.',
  },
  {
    id: 'spfigure', town: 'saltpenny', at: [92.5, -5.5, 0], model: 'figurehead', title: 'The Constancy',
    body: 'A ship\'s figurehead stood on a heap of ballast stones by the Long Walk: a woman in blue and gold, leaning forward the way she leaned off the bow, the paint gone grey with salt. She came off the Constancy, an Assembly frigate and the first ship Ysolde Gale ever sank. She washed up on the key a month after, and Gale stood her up here herself.\n\nHer hands were carved holding a wreath. Somebody has put a tin cup in them. There are coins in it, and nobody takes them: the Brethren put in for the families of crews that don\'t come back, and once a month Ned Vey empties it and counts it out at the Captains\' Table.',
  },
  {
    id: 'spcompass', town: 'saltpenny', at: [20, 0.5, 0], model: 'compassrose', title: 'Gale\'s compass',
    body: 'A compass rose let into the boardwalk where the two walks cross, cut from the brass of Ysolde Gale\'s own binnacle and nailed down plank by plank. It was her sign. Every captain on the key has stood on it to be sworn.\n\nThe south point is gone. Somebody prised it up a long time ago; the nail holes are still there, worn smooth. Dinah Lowry, who draws maps in the Mercy\'s hold, says Gale took it up herself the year before she died, and won\'t say how she knows.',
  },
  // ---------------------------------------------------------------- Northgate (world/sites.ts buildNorthgate: x and z from the square's middle, facing)
  {
    id: 'ngkeepers', town: 'northgate', at: [-6, -72, Math.PI / 2], model: 'keeperstones', title: 'The keepers\' stones',
    body: 'Fourteen stones set in a row at the foot of the ramp, one for each Gatekeeper of Northgate, the oldest farthest from the gate. Each has a name and two years cut in it, in a different hand each time.\n\nThe first is worn almost smooth. Under the name, cut deeper than the name, is the charge: SHUT IT AGAINST THE DEAD. NEVER AGAINST THE LIVING.\n\nThe fourteenth says URSEL HALE and one year, forty years back. There is room after it for a second year. Beyond it a fifteenth stone is already set, with nothing on it.',
  },
  {
    id: 'ngbell', town: 'northgate', at: [-9.5, -9.5, 0], model: 'wallbell', title: 'The wall bell',
    body: 'A bronze bell as tall as a child, hung in an oak frame on the north side of the square, facing the ramp. Cast round its rim: RING FOR THE WALL.\n\nThe clapper is tied to the frame with a leather strap so the wind can\'t ring it. The strap is new. The knot is old: every time the strap is changed it is tied again the way the last one was, and nobody alive in Northgate has heard the bell.\n\nThe bell-rope is looped up on a hook, out of reach of children.',
  },
  {
    id: 'ngwatch', town: 'northgate', at: [-12.5, -67, Math.PI / 2], model: 'watchboard', title: 'The watch board',
    body: 'A board by the barracks door with a hook for every tower on the wall, and on each hook a peg with the name of whoever walks that tower tonight. The pegs say Thwaite and Pennock, over and over, with a Rusk here and there.\n\nThe hook for the third tower west of the gate has no peg on it. Under it somebody has chalked NOT AFTER DARK. Somebody else has started to rub it out, and stopped.',
  },
  // ---------------------------------------------------------------- Kelderby (world/sites.ts, the hamlet's build: x, z, facing)
  {
    id: 'kbtally', town: 'kelderby', at: [296.5, 1457.5, Math.PI / 4], model: 'tallypost', title: 'The tally post',
    body: 'A larch post by the well, taller than a man and grey with weather, notched on all four sides: a row for every spring, the lambs Kelderby counted, cut in fives.\n\nSome springs are long rows. One near the top is two notches, with a cross cut beside it.\n\nThe newest row is fourteen. One more notch was cut after it, and then filled in with pitch.',
  },
  {
    id: 'kbcairn', town: 'kelderby', at: [296.5, 1441.5, Math.PI / 2], model: 'cairn', title: 'The fell cairn',
    body: 'A cairn at the foot of the north track, where it leaves for the high fells, about as tall as you are. Every stone in it was carried up by somebody.\n\nThe shepherds put a stone on it going up and take one off coming down, so the cairn is the size of whoever is still out. Today it stands a little higher than the snowline on it says it should.\n\nWedged in among the top stones, out of the wet, is a child\'s mitten, waiting for whoever lost it.',
  },
  {
    id: 'kbsledge', town: 'kelderby', at: [307.5, 1461.5, 0], model: 'sledge', title: 'Cai Morgan\'s sledge',
    body: 'The hamlet\'s only sledge: ash runners shod with iron, a bed that takes four ewes or one shepherd lying down, and a rope harness for whoever is pulling, which is mostly Cai.\n\nPainted on the back board, faded nearly away: IF YOU TAKE IT BRING IT BACK.\n\nUnder it, newer: AND TELL CAI.',
  },
  // ---------------------------------------------------------------- Hollin Ford (world/structures.ts)
  {
    id: 'hfford', town: 'hollin', at: [0, 0, 0], model: 'fordpost', title: 'The old ford',
    body: 'A post of black oak driven into the bank where the stepping stones start, notched all down the side that faces the water. Carved at the top: THE FORD. Under it, smaller and newer: When the water is over the third notch, ring the bell and wait.\n\nThere were stepping stones here before there was a bridge, and before there was a village. Hollin Ford is named for them.\n\nToday the water stands a hand under the second notch.',
  },
  {
    id: 'hfflood', town: 'hollin', at: [160.4, 179.6, Math.PI * 0.75], model: 'floodstone', title: 'The flood stone',
    body: 'A slab set in the bank at the end of the bridge, with lines cut across it at different heights and a few words beside each. THE WATER CAME TO HERE, over and over, in hands that change down the stone.\n\nThe highest line is level with your chest: THE BIG WATER. THE BELL RANG ALL NIGHT.\n\nThe lowest is the newest, cut so fresh the dust is still in it: LAST SPRING. Somebody has chalked a mark above it, a little higher, with a question mark beside it.',
  },
  {
    id: 'hfmoot', town: 'hollin', at: [150.5, 179.8, Math.PI], model: 'mootstone', title: 'The moot stone',
    body: 'A flat stone at the edge of the moot oak\'s shade, worn hollow on top where the reeves have stood to call the moot.\n\nThe names of the reeves are cut round its sides, each in a different hand: some deep and square, some scratched, one spelt wrong and corrected. The last is the cleanest: MAUD ASHBY. The space after it is very smooth.',
  },
  {
    id: 'hfpump', town: 'hollin', at: [147.6, 191.4, Math.PI / 2], model: 'pump', title: 'The village pump',
    body: 'Cast iron, painted green a long time ago, with a stone trough and a tin cup on a chain.\n\nA notice is nailed to the post: BOIL IT. The Pit\'s runoff has been in the well since spring. M.A.\n\nUnderneath, in a child\'s capitals: TASTES OF PENNIES.',
  },

  {
    id: 'zero', town: 'ansbury', model: 'milestone', title: 'The Nought Stone',
    body: 'ANSBURY\nNOUGHT\n\nEvery milestone on the Charter roads is counted from this one.\n\nCarters touch it on the way out on a long haul and again when they get back. Two hundred years of hands have worn it to a waist.',
  },
  {
    id: 'rendle', town: 'ansbury', model: 'speaker', title: 'Statue of Speaker Rendle',
    body: 'MARGERY RENDLE\nFirst Speaker of the Charter\nShe read it out on the keep steps on Lady Day, and then read it again for the people at the back.\n\nThe stone Charter in her hands is open at the last page, where the counties put their seals. The seals are worn smooth. Children are lifted up to touch them for luck.',
  },
  {
    id: 'riders', town: 'ansbury', model: 'rider', title: 'The Toll Riders',
    body: 'TO THE TOLL RIDERS OF THE TURNPIKE\nwho kept the road from the south gate to the Works\nin all weathers, for forty-one years\nSTOOD DOWN BY ORDER OF THE CHARTER\n\nThe last line was cut later than the rest, by a different mason, and not as deep. Somebody has left a horseshoe on the plinth, and a cup of ale that has gone flat.',
  },
  {
    id: 'coppard', town: 'ansbury', model: 'scales', title: 'Statue of Alys Coppard',
    body: 'ALYS COPPARD\nWeighmistress, forty years at the beam\n"A pound is a pound in Ansbury."\n\nThe scales in her hand hang level. Under the motto, in chalk, someone has written SCALES READ HEAVY. It has been scrubbed off at least once and written again.',
  },
  {
    id: 'butter', town: 'ansbury', model: 'cross', title: 'The Butter Cross',
    body: 'Before there was a New Town, this was a field outside the old wall, and the farm wives sold butter and eggs under this cross so they wouldn\'t pay the gate toll. The market went inside the walls in the end. The cross stayed where it was.\n\nThe steps are worn into hollows where the baskets stood. A tin plate is nailed to the shaft: NO SELLING ON THE STEPS. BY ORDER.',
  },
  {
    id: 'fullers', town: 'ansbury', model: 'fountain', title: 'The Fullers\' Fountain',
    body: 'GIVEN BY THE COMPANY OF FULLERS\nthat nobody in this ward go thirsty\nDrink, and remember the Fullers\n\nThe Fullers\' Company is three old men and a dinner a year now, in their hall on Hall Row. The cup is still chained to the basin, and the water is still cold.',
  },
  {
    id: 'fever', town: 'ansbury', model: 'obelisk', title: 'The Fever Stone',
    body: 'THE FEVER SUMMER\nTwo hundred and six of this ward lie at the Minster\nTheir names are on the four faces of this stone\n\nThe north face alone has fifty-one names. Some surnames come three and four times running: whole households, buried in the same week.',
  },
  {
    id: 'bell', town: 'ansbury', model: 'bell', title: 'The Cracked Bell',
    body: 'THE NEW TOWN BELL\nCast by Gisborne & Son, Tanners\' Row\nRang the curfew eleven winters. Cracked in the frost of the twelfth.\n\nThe crack runs from the lip almost to the crown. Anyone on Tanners\' Row will tell you the frost did it. Ask who poured the bronze, and how fast, and the talk turns to something else.',
  },
  {
    id: 'tray', town: 'ansbury', model: 'dog', title: 'Statue of a dog',
    body: 'TRAY\nA drover\'s dog\nwho found nine people in the snow in the Long Winter\nand would not come in until he had\n\nThe bronze has been rubbed bright along his back and between his ears by people stroking him as they pass. Somebody keeps a bowl of water filled by the plinth.',
  },
  {
    id: 'plough', town: 'ansbury', model: 'plough', title: 'The Counties\' Plough',
    body: 'GIVEN TO ANSBURY BY THE CHARTER COUNTIES\nHollindale, the Fleet, the Raddle, the Scarth and Hagworm Wood\nin the year the last of them signed\n\nIt\'s an ordinary plough cast in bronze, clods and all: the founder copied a working one. In pencil on the plinth, in a small neat hand you might have seen on the copy of the Charter on the Green: "Given?" H.K.',
  },
  {
    id: 'column', town: 'ansbury', model: 'column', title: 'The Wall Column',
    body: 'THIS COLUMN MARKS THE LAYING OF THE FIRST STONE OF THE NEW WALL\nSpeaker Edmund Hext\nMaster Mason Thomas Bray\n\nThe urn on top has lost its lid. The wall took nineteen years to finish. The column went up in four months, before the wall was a course high, which tells you most of what the ward remembers about Speaker Hext.',
  },
  {
    id: 'annis', town: 'ansbury', model: 'seated', title: 'Statue of Bet Annis',
    body: 'BET ANNIS\nkept the ward school in the Shambles for thirty-eight years\nand taught half this town its letters\n\nShe sits with a slate on her knee. The slate is a real one, set into the bronze, and somebody has written on it in big careful letters: I DID MY SUMS MISS ANNIS.',
  },
  {
    id: 'boots', town: 'ansbury', model: 'boots', title: 'An unfinished statue',
    body: 'HONOURING\n\nThe plaque stops there. On the plinth stand two stone boots and the hem of a coat, and nothing above the knee. The ward voted the money, the man fell out of favour at the Charter while the mason was still on the shins, and the ward voted the money back. Nobody has agreed on what to put up instead, so the boots stay.',
  },
  {
    id: 'wallers', town: 'ansbury', model: 'masons', title: 'The Wallers',
    body: 'TO THE WALLERS\nwho built the New Wall\nand the eleven of them who did not see it finished\n\nTwo bronze masons lever a block into place between them. The block is real stone, left over from the wall, and carries a mason\'s mark: a square with a cross through it. That was Bray\'s mark. He\'s one of the eleven.',
  },
  // Gullmouth, on the quay and at the head of the harbour street (placed by hand)
  {
    id: 'jawbones', town: 'gullmouth', model: 'jawbones', at: [-11, 600, Math.PI / 2], title: 'The Jawbones',
    body: 'THE GIFT\nCame ashore under the stacks in the hard winter\nand fed Gullmouth for a month\n\nThe whale\'s oil lit Fleet Light for two years. Its jawbones were stood up here, over the harbour street, so nobody would forget that the sea gives now and then as well as takes. Children are dared to lick them. Nobody knows why.',
  },
  {
    id: 'drowned', town: 'gullmouth', model: 'drownedboard', at: [18.5, 603.5, -Math.PI / 2], title: 'The Drowned Board',
    body: 'LOST FROM GULLMOUTH\n\nThe board is slate, painted white, the oldest names worn to shadows at the top. Boats first, then the men aboard them. The last lines are new and the paint is still sharp:\n\nTHE GANNET, 14th MARCH\nCOL MADDOX, skipper\nANSEL ROOK\n\nSomeone has wedged a sprig of sea thrift into the frame by Col\'s name. There is room on the board for about thirty more. The harbour has started to talk about painting a second one, and nobody wants to be the one who asks the sign-writer.',
  },
  {
    id: 'fogbell', town: 'gullmouth', model: 'fogbell', at: [22.5, 590.5, -Math.PI / 2], title: 'The Fog Bell',
    body: 'RUNG FROM THE HARBOUR OFFICE IN FOG\nONE STROKE A MINUTE UNTIL EVERY BOAT IS IN\n\nThe bell rope runs back along the quay on iron eyes to Nessa Crane\'s window. On the night of the March gale she rang it until morning. A bell doesn\'t carry as far as a light.',
  },
  {
    id: 'boatstone', town: 'gullmouth', model: 'tallystone', at: [-1.5, 594.5, 0], title: 'The Boat Stone',
    body: 'Every spring the harbour paints a stroke on this stone for each boat that goes out, bundled in fives. Forty, the old rows say, in a good year.\n\nThis year\'s row has thirty-one. After the twenty-ninth there\'s a smudge where someone painted a stroke and scrubbed it out again.',
  },
  {
    id: 'ansel', town: 'gullmouth', model: 'anselbench', at: [20.5, 612.5, Math.PI / 2], title: 'Ansel\'s bench',
    body: 'ANSEL ROOK\nSPLICED HALF THE ROPE IN THIS HARBOUR\nNINETEEN\n\nBett Rook had the bench made from the Gannet\'s hatch cover when it washed up on the shingle. It faces the stacks. Most mornings there\'s a coil of new rope left on it by whoever is going out.',
  },
  // Harrowgate Works, inside the palisade (placed by hand, x from the Works' middle)
  {
    id: 'hgsign', town: 'harrowgate', model: 'companysign', at: [0, 1026.5, 0], title: 'The company sign',
    body: 'HARROWGATE & DAUGHTERS\nMINERS · SMELTERS · CARRIERS\n\nThe founder had the sign painted the year his third daughter was born, meaning to have it done again when he had a son. He died first. Delia, Hilda and Joan have it repainted every spring, in the same words, a little larger each time.',
  },
  {
    id: 'hgprices', town: 'harrowgate', model: 'priceboard', at: [-20.5, 995.5, 0], title: 'The price board',
    body: 'THE COMPANY BUYS\nCopper ore, the stone: 3\nTin ore, the stone: 3\nSilver ore, the stone: 14\nBronze, the Tolley bar: 9\nBy order, A. Pryce\n\nDown the right-hand side, in pencil, smaller, another column of prices, every one of them lower, under the heading "own acct." Somebody has rubbed at it with a thumb. It hasn\'t come off.',
  },
  {
    id: 'hgwheel', town: 'harrowgate', model: 'flywheel', at: [21.5, 990.5, Math.PI / 2], title: 'The cracked flywheel',
    body: 'The flywheel off the first winding engine, taller than a man, leaned against the store wall. One spoke is gone and the rim is cracked through beside the gap. It threw that spoke through the engine-house roof the day it was run faster than it was made for, and by luck it killed nobody.\n\nChalked on the rim, and chalked again whenever the rain takes it off: DELIA SAYS KEEP IT.',
  },
  // Callis
  {
    id: 'plumb', town: 'callis', model: 'plumb', title: 'The Warden\'s Plumb',
    body: 'THE PLUMB OF THE OLD TOWER\nhung here by the Warden of the Two Stones\nso the city can see for itself\nThe white lifts. The black holds.\n\nThe bob doesn\'t hang over the old mark scratched in the paving any more. It hangs two fingers to the side of it, over a new scratch, and there is a third scratch past that, fainter, with a question mark.',
  },
  {
    id: 'roig', town: 'callis', model: 'netmender', title: 'Statue of Rosa Roig',
    body: 'ROSA ROIG\nmended nets on the North Quay for sixty years\nand outlived three boats and two husbands\nShe never learned to swim\n\nShe sits on a bollard with a net across her knees. The net is a real one. Every spring the youngest on the quay puts a new one on her, and the old one goes back to sea.',
  },
  {
    id: 'first', town: 'callis', model: 'stones', title: 'The First Stones',
    body: 'THE FIRST STONES OF CALLIS\nthe white cut at the mouth of the Call, the black brought by sea\nlaid by Joan Ferrer, builder\nThe white lifts. The black holds.\n\nThe white block has risen off the black by the thickness of a knife blade. Bend down and you can see daylight through the joint.',
  },
];
