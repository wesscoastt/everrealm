// The cities' monuments: each one stands once, in a square of its own (world/sites.ts takeMonument),
// built by its own model (world/props.ts monument) with a plaque to read. Ansbury's are in the order
// the planner hands them out, Callis's likewise. Plain data: the world worker reads this too.

/** Which model props.monument builds. */
export type MonumentModel =
  | 'speaker' | 'rider' | 'scales' | 'cross' | 'fountain' | 'obelisk' | 'bell' | 'dog' | 'plough'
  | 'milestone' | 'column' | 'seated' | 'boots' | 'masons' | 'plumb' | 'netmender' | 'stones'
  | 'jawbones' | 'drownedboard' | 'fogbell' | 'tallystone' | 'anselbench'
  | 'companysign' | 'priceboard' | 'flywheel';

export interface Monument {
  id: string;
  town: 'ansbury' | 'callis' | 'gullmouth' | 'harrowgate';
  /** Placed by hand (world/sites.ts gullmouthLife): blocks east of the coast line at z 600, north-south, facing. */
  at?: [number, number, number];
  model: MonumentModel;
  /** What the interact prompt and the readable's title call it. */
  title: string;
  /** The plaque, then what you notice standing in front of it. */
  body: string;
}

export const MONUMENTS: Monument[] = [
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
