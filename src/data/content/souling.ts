import type { DialogueTree, GameApi } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';
import { utcDay } from '../calendar';
import { SOUL_ROUTES, type SoulStop } from '../soulingRoutes';

// Souling (docs/LORE.md, the Lantern Wake): on the Wake's three souling nights, the last of October and the
// first two of November, children go round the doors in the guising clothes. Whoever answers has to guess
// who's under the costume before they hand over a soul cake. A band of three goes round each big town from
// morning to midnight, a door every two hours of the day, singing at each; after midnight they're home.
// Guess right, give a soul cake (the Wake stall sells them), and they pay you in wake candles, once a day.

/** The souling nights: 31 October to 2 November (UTC), every year. */
export function soulingOn(now = new Date()): boolean {
  const m = now.getUTCMonth() + 1, d = now.getUTCDate();
  return (m === 10 && d === 31) || (m === 11 && d <= 2);
}

type Look = NpcDef['look'];
const kidLook = (o: Record<string, unknown>) => ({ eyes: '#4a3a2a', trousers: '#3a3430', boots: '#2a1e14', hairStyle: 1, build: 0.85, height: 0.72, age: 0, ...o }) as Look;

/** What each costume looks like from the doorstep. */
const SEEN: Record<string, string> = {
  ghost: 'A small bedsheet ghost', skeleton: 'A small skeleton', witch: 'A small hedge-witch',
  crow: 'A small crow', scarecrow: 'A small scarecrow', lanternman: 'A very small Lantern Man',
};

interface Kid { costume: string; who: string; from: string; skin: string; hair: string }
interface Band { id: string; town: string; start: number; kids: [Kid, Kid, Kid]; decoys: string[]; rhyme: string[] }

const BANDS: Band[] = [
  { id: 'hollin', town: 'hollin', start: 0, decoys: ['Dilly Ashcroft', 'one of the Tolley boys', 'Ivy Marsh\'s cousin'],
    rhyme: ['Soul cake, soul cake, guess who I be!', 'One for the candle and one for me!'],
    kids: [{ costume: 'ghost', who: 'Kit Garrow', from: 'Pell\'s grandson, from the dock', skin: '#f0c8a0', hair: '#6a4a2a' },
      { costume: 'scarecrow', who: 'Nan Saxby', from: 'Gil\'s youngest, from the Pit cottages', skin: '#e2b894', hair: '#a87a3a' },
      { costume: 'crow', who: 'Jory Wether', from: 'Joss\'s boy, from the mill road', skin: '#d8a882', hair: '#2a1e14' }] },
  { id: 'ansbury', town: 'ansbury', start: 0, decoys: ['the cooper\'s twins', 'a girl from Tanners\' Row', 'the Weighhouse clerk\'s son'],
    rhyme: ['Knock at the door, the Wake\'s at the door!', 'Soul cake or a trick, and we\'ll come back for more!'],
    kids: [{ costume: 'skeleton', who: 'Robin Penhallow', from: 'Osric\'s nephew, from the market end', skin: '#e8c0a0', hair: '#4a3020' },
      { costume: 'witch', who: 'Ellen Strake', from: 'the Corporal\'s girl, from the south gate', skin: '#d8a882', hair: '#5a4030' },
      { costume: 'ghost', who: 'Hal Gisborne', from: 'the founder\'s boy, from Tanners\' Row', skin: '#c89070', hair: '#2a1e14' }] },
  { id: 'ansbury2', town: 'ansbury', start: 4, decoys: ['the baker\'s girl', 'a boy from the Hall Row', 'the cooper\'s twins'],
    rhyme: ['A soul for the candle, a cake for the soul!', 'Guess us right and we\'ll leave you whole!'],
    kids: [{ costume: 'lanternman', who: 'Tamsin Varcoe', from: 'from the carters\' yard', skin: '#f0d0b8', hair: '#8a4a2a' },
      { costume: 'crow', who: 'Will Combe', from: 'from over the dye works', skin: '#e2b894', hair: '#6a5a4a' },
      { costume: 'scarecrow', who: 'Bet Lusk', from: 'from behind the chapel', skin: '#d0a080', hair: '#c8a060' }] },
  { id: 'gullmouth', town: 'gullmouth', start: 0, decoys: ['the harbourmaster\'s lad', 'a fisher girl from the terraces', 'Mary Opie\'s little sister'],
    rhyme: ['Soul cake, soul cake, salt on the door!', 'Give us a cake and we\'ll knock no more!'],
    kids: [{ costume: 'ghost', who: 'Ned Odgers', from: 'Lowdy\'s boy, from the salt store', skin: '#e2b894', hair: '#8a6a4a' },
      { costume: 'skeleton', who: 'Morwen Bennetts', from: 'Ann\'s girl, from the wine store', skin: '#e8c0a0', hair: '#2a1e14' },
      { costume: 'crow', who: 'Davy Hosking', from: 'Peter\'s brother, from the wool store', skin: '#d0a080', hair: '#a87a4a' }] },
  { id: 'harrowgate', town: 'harrowgate', start: 0, decoys: ['a winder\'s girl', 'one of the smelter boys', 'the clerk\'s youngest'],
    rhyme: ['Soul cake, soul cake, ash on the stair!', 'Guess who we are, if you think you dare!'],
    kids: [{ costume: 'scarecrow', who: 'Sid Pound', from: 'Silas\'s boy, from the yard', skin: '#c89070', hair: '#3a2a1a' },
      { costume: 'witch', who: 'Ada Abery', from: 'Wick\'s girl, from the sorting shed', skin: '#e2b894', hair: '#6a4a2a' },
      { costume: 'lanternman', who: 'Tom Grainger', from: 'Nell\'s boy, from the bunkhouse', skin: '#d8a882', hair: '#2a1e14' }] },
  { id: 'callis', town: 'callis', start: 0, decoys: ['a dockhand\'s boy', 'the tower-keeper\'s daughter', 'a girl from the Market'],
    rhyme: ['Soul cake, soul cake, white stone, black!', 'Guess who we are and we won\'t come back!'],
    kids: [{ costume: 'ghost', who: 'Pau Rius', from: 'Toni\'s boy, off the boats', skin: '#c89070', hair: '#1e1610' },
      { costume: 'witch', who: 'Neus Ferrer', from: 'from the Guild Row', skin: '#d8a882', hair: '#2a1e14' },
      { costume: 'skeleton', who: 'Jordi Mas', from: 'from behind the Market', skin: '#b8865e', hair: '#1e1610' }] },
  { id: 'callis2', town: 'callis', start: 4, decoys: ['a dockhand\'s boy', 'the Assembly clerk\'s son', 'a girl from the temple steps'],
    rhyme: ['The sailors brought it, the sailors said:', 'a cake for the living, a light for the dead!'],
    kids: [{ costume: 'crow', who: 'Aina Pujol', from: 'Nuria\'s niece, off the Cala boat', skin: '#b8865e', hair: '#1e1610' },
      { costume: 'scarecrow', who: 'Oriol Vidal', from: 'from the Docks', skin: '#c89070', hair: '#3a2a1a' },
      { costume: 'lanternman', who: 'Berta Mir', from: 'Xisca\'s girl, from by the Post', skin: '#d0a080', hair: '#2a1e14' }] },
  { id: 'northgate', town: 'northgate', start: 0, decoys: ['a keeper\'s boy', 'the bell-ringer\'s girl', 'one from the barracks'],
    rhyme: ['Soul cake, soul cake, cold on the wall!', 'One for the Gatekeepers, one for us all!'],
    kids: [{ costume: 'skeleton', who: 'Gerd Platt', from: 'from the square by the well', skin: '#f0d0b8', hair: '#c8b080' },
      { costume: 'ghost', who: 'Arne Rusk', from: 'from the Archive steps', skin: '#e8c0a0', hair: '#8a6a4a' },
      { costume: 'crow', who: 'Sig Holm', from: 'from the barracks row', skin: '#e2b894', hair: '#5a4030' }] },
];

/**
 * A band's day: the door at each two-hour stretch from seven in the morning, round the route from its own
 * starting door; from eleven at night to seven it waits at the first door (home). Each child a step to one
 * side of the middle one, all three facing the door.
 */
function schedule(stops: SoulStop[], start: number, side: number): NpcDef['schedule'] {
  const n = stops.length, out: NpcDef['schedule'] = [];
  const spot = (s: SoulStop): [number, number] => {
    const [[x, z], [fx, fz]] = s, dx = fx - x, dz = fz - z, d = Math.hypot(dx, dz) || 1;
    return [x + (-dz / d) * side * 0.9, z + (dx / d) * side * 0.9];
  };
  for (let k = 0; k < 8; k++) {
    const s = stops[(start + k) % n];
    out.push({ from: 7 + k * 2, to: 9 + k * 2, at: spot(s), face: s[1], anim: 'idle', path: s[2] });
  }
  const home = stops[start % n];
  out.push({ from: 23, to: 7, at: spot(home), face: home[1], anim: 'idle', path: home[2] });
  return out;
}

const npcs: NpcDef[] = [];
const dialogue: Record<string, DialogueTree> = {};
const flagOf = (band: string) => 'souling:' + band;

for (const b of BANDS) {
  const stops = SOUL_ROUTES[b.town];
  if (!stops?.length) continue;
  b.kids.forEach((k, i) => {
    const id = `soul_${b.id}_${i}`;
    npcs.push({
      land: b.town === 'callis' || b.town === 'northgate' ? 'morrow' : 'counties',
      id, name: SEEN[k.costume], title: 'Souling',
      look: kidLook({ skin: k.skin, hair: k.hair, tunic: '#5a4a6a', trim: '#e8701a', costume: k.costume }),
      schedule: schedule(stops, b.start, i === 0 ? 0 : i === 1 ? 1 : -1),
      barks: b.rhyme,
      when: () => soulingOn(),
    });
    // Guess who's under it: their own name among two from the town who might as well be
    const guesses = [k.who, ...b.decoys.slice(0, 2)];
    const order = [i % 3, (i + 1) % 3, (i + 2) % 3].map((j) => guesses[j]);
    dialogue[id] = {
      start: (g: GameApi) => (g.flag(flagOf(b.id)) === utcDay() ? 'had' : 'guess'),
      nodes: {
        guess: {
          text: `${SEEN[k.costume]} holds out a bag. "Soul cake! But you have to guess who I am first."`,
          options: [
            ...order.map((name) => ({ text: name === k.who ? `Is that ${k.who}?` : `Are you ${name}?`, next: name === k.who ? 'right' : 'wrong' })),
            { text: 'Not tonight.' },
          ],
        },
        wrong: { text: 'A muffled snort under the costume. "No! Guess again."', options: [{ text: 'Let me think.', next: 'guess' }] },
        right: {
          text: `The costume comes up off a red face. "How did you know? It's me, ${k.who}, ${k.from}. Now you have to give us a cake."`,
          options: [
            { text: 'Here. One soul cake.', cond: (g) => g.count('soul_cake') > 0, next: 'paid', effect: (g) => { g.take('soul_cake'); g.give('wake_candle'); g.give('wake_candle'); g.setFlag(flagOf(b.id), utcDay()); } },
            { text: 'I haven\'t got one.', cond: (g) => g.count('soul_cake') === 0, next: 'none' },
          ],
        },
        paid: { text: '"Thank you! Here, these are for luck. We found them. Mostly." Two wake candles, a bit squashed.', options: [{ text: 'Happy Wake.' }] },
        none: { text: '"Then you\'re no use. The stall by the Post has them, three candles each. We\'ll still be going round."', options: [{ text: 'I\'ll find one.' }] },
        had: { text: '"You\'ve given us ours. Go and knock on someone else\'s door."', options: [{ text: 'Fair enough.' }] },
      },
    };
  });
}

export const SOULING_CONTENT: RegionContent = { id: 'souling', npcs, dialogue };
