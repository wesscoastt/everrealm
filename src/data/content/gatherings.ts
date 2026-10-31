import type { DialogueTree, GameApi } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';
import { GATHERINGS, gatheringLit, gatheringNow, type GatheringDef } from '../gatherings';


// The people at the towns' fires (data/gatherings.ts): at each, a host who hands round what's on the
// fire, and two who play. They come out while their town's fire is lit and go home when it's out.

type Look = NpcDef['look'];
const look = (o: Record<string, unknown>) => ({ eyes: '#4a3a2a', trousers: '#2a2a30', boots: '#1a1612', hairStyle: 1, age: 0.45, ...o }) as Look;

interface Fire {
  id: string;
  host: { id: string; name: string; title: string; look: Look; barks: string[] };
  band: [{ id: string; name: string; look: Look; item: string; part: 'lead' | 'harmony' | 'bass' | 'drum' }, { id: string; name: string; look: Look; item: string; part: 'lead' | 'harmony' | 'bass' | 'drum' }];
  tunes: string[];
  /** The host's greeting, what the fire is for, and their line as they hand you something. */
  hello: string;
  why: string;
  give: string;
}

const FIRES: Fire[] = [
  {
    id: 'ansbury', tunes: ['ladyday', 'speakersmarch', 'wendwater'],
    host: { id: 'gf_joan', name: 'Joan Trevail', title: 'Keeps the Hiring Fire', look: look({ frame: 'f', skin: '#e2b894', hair: '#8a5a3a', hairStyle: 2, lashes: true, tunic: '#6a3a2a', trim: '#d8c090', apron: true, age: 0.55 }), barks: ['Chestnuts! Mind your fingers.', 'Come in closer, it\'s warm.'] },
    band: [
      { id: 'gf_davey', name: 'Davey Rowe', look: look({ skin: '#d8a882', hair: '#4a3020', tunic: '#3a4a2a', trim: '#c8a050', age: 0.3, hat: 'cap', hatColor: '#3a3a2a' }), item: 'inst_fiddle', part: 'lead' },
      { id: 'gf_nell', name: 'Nell Coombe', look: look({ frame: 'f', skin: '#e8c4a0', hair: '#2a1e14', hairStyle: 3, lashes: true, tunic: '#4a3a5a', trim: '#d8c090', age: 0.25 }), item: 'inst_drum', part: 'drum' },
    ],
    hello: 'Evening. You\'ve come for the fire? Everybody does. Come in out of the wind.',
    why: 'In my grandmother\'s day this was where the hands stood to be hired for the year: a ribbon in your hat for a shepherd, a twist of straw for a carter. The farmers walked round and looked at your teeth. Nobody\'s hired here now. The fiddles kept coming, so we kept lighting it.',
    give: 'Here. Split them with your thumb, and don\'t blame me if you burn it.',
  },
  {
    id: 'gullmouth', tunes: ['haulholmsey', 'wendwater'],
    host: { id: 'gf_tom', name: 'Tom Pascoe', title: 'Skipper of the Morwenna', look: look({ skin: '#c89070', hair: '#5a5a54', beard: true, tunic: '#2a3a5a', trim: '#c8c0b0', age: 0.6, hat: 'wide', hatColor: '#2a2a30', build: 1.15 }), barks: ['Sprats! Hot off the fire!', 'Fleet\'s in. Sit down.'] },
    band: [
      { id: 'gf_jenny', name: 'Jenny Hocking', look: look({ frame: 'f', skin: '#d8a888', hair: '#a87a4a', hairStyle: 2, lashes: true, tunic: '#5a6a7a', trim: '#c8c0b0', age: 0.35, hat: 'kerchief', hatColor: '#8a3a2a' }), item: 'inst_fiddle', part: 'lead' },
      { id: 'gf_ben', name: 'Ben Trudgeon', look: look({ skin: '#d0a080', hair: '#2a1e14', tunic: '#6a5a3a', trim: '#3a2a1a', age: 0.4, beard: true }), item: 'inst_horn', part: 'bass' },
    ],
    hello: 'Tom Pascoe, the Morwenna. We\'re all in tonight, every boat on the quay, so there\'s a fire. Sit, if you can find a bit of bench nobody\'s mending a net on.',
    why: 'When the whole fleet\'s in at once it means the weather\'s turned, or the fish have. Either way there\'s nothing to do but mend and eat. My father used to say a quay with no fire on it looks like a quay that\'s lost a boat. So we light one.',
    give: 'Sprats. Eat them off the stick, head and all. That\'s how you can tell who\'s from here.',
  },
  {
    id: 'harrowgate', tunes: ['threemarks', 'calling', 'speakersmarch'],
    host: { id: 'gf_sal', name: 'Sal Dakin', title: 'Runs the works canteen', look: look({ frame: 'f', skin: '#e2b894', hair: '#9a948c', hairStyle: 2, lashes: true, tunic: '#4a4a52', trim: '#c8b080', apron: true, age: 0.6, build: 1.1 }), barks: ['Toffee, love. Don\'t break a tooth.', 'Day shift\'s up. About time.'] },
    band: [
      { id: 'gf_wilf', name: 'Wilf Hardcastle', look: look({ skin: '#d8a882', hair: '#3a2418', tunic: '#3a3a40', trim: '#8a7a5a', age: 0.5, hat: 'cap', hatColor: '#2a2a2a', gloves: '#2a2a2a' }), item: 'inst_horn', part: 'bass' },
      { id: 'gf_annie', name: 'Annie Thwaite', look: look({ frame: 'f', skin: '#c89070', hair: '#1e1612', hairStyle: 4, lashes: true, tunic: '#5a3a3a', trim: '#c8a050', age: 0.3 }), item: 'inst_whistle', part: 'lead' },
    ],
    hello: 'You\'re not from the works. That\'s all right, the fire doesn\'t ask. Sal Dakin. I feed four hundred men a day and tonight I\'m feeding you.',
    why: 'When the day shift comes up and the night shift goes down, there\'s an hour where the whole town\'s awake at once. The band started playing them up the hill fifty years ago, and somebody lit a fire to stand round. We\'ve had the band ever since. The works has changed hands three times. The fire hasn\'t.',
    give: 'Pit toffee. Suck it, don\'t chew it. I\'ve seen grown men cry.',
  },
  {
    id: 'callis', tunes: ['haulholmsey', 'ladyday'],
    host: { id: 'gf_jordi', name: 'Jordi Pons', title: 'Grills the sardines', look: look({ skin: '#c89070', hair: '#2a1e14', tunic: '#e8e0d0', trim: '#2a2a2a', apron: true, age: 0.45, beard: true }), barks: ['Sardines! Bread under, always.', 'Watch the oil, it spits.'] },
    band: [
      { id: 'gf_laia', name: 'Laia Serra', look: look({ frame: 'f', skin: '#d8a882', hair: '#1e1612', hairStyle: 3, lashes: true, tunic: '#2a2a30', trim: '#e8e0d0', age: 0.3 }), item: 'inst_lute', part: 'harmony' },
      { id: 'gf_quim', name: 'Quim Bosch', look: look({ skin: '#b88060', hair: '#2a1e14', tunic: '#e8e0d0', trim: '#2a2a2a', age: 0.4 }), item: 'inst_drum', part: 'drum' },
    ],
    hello: 'Welcome, welcome. Jordi Pons. You\'re just in time, the first lot\'s done. Bread first, then the fish on top. Never the other way.',
    why: 'Callis eats sardines on the quay the night the boats bring the first good catch, and then again every time anyone can find an excuse. The Assembly tried to move it off the street once, for the smell. They passed the motion. Nobody moved. The two stones, you know: the white lifts and the black holds. We\'re the black.',
    give: 'There. Let the oil soak in first. The bread is the best part, whatever the fishermen say.',
  },
  {
    id: 'northgate', tunes: ['mooring', 'hours', 'calling'],
    host: { id: 'gf_hild', name: 'Hild Rowntree', title: 'Feeds the watch', look: look({ frame: 'f', skin: '#e8c4a0', hair: '#cfcac0', hairStyle: 2, lashes: true, tunic: '#4a4a3a', trim: '#8a7a5a', age: 0.7, cape: '#3a3a30' }), barks: ['Broth\'s hot. Take a bowl.', 'Wave to the wall. They can see you.'] },
    band: [
      { id: 'gf_osgar', name: 'Osgar Brack', look: look({ skin: '#d8a882', hair: '#7a3a1e', tunic: '#3a4a3a', trim: '#8a7a5a', age: 0.5, beard: true, build: 1.15 }), item: 'inst_pipes', part: 'lead' },
      { id: 'gf_tam', name: 'Tam Garside', look: look({ skin: '#e2b894', hair: '#4a3020', tunic: '#3a3a40', trim: '#8a7a5a', age: 0.2 }), item: 'inst_drum', part: 'drum' },
    ],
    hello: 'Come to the fire, there\'s room. Hild Rowntree. Wave up at the wall when you\'ve got your bowl. They like to see faces.',
    why: 'Since the gate shut, the watch don\'t come down. Twelve hours on the wall and twelve in the towers. So on fire nights the town brings its supper out here, where the lads up top can see it, and we play loud enough for them to hear. It\'s not much. It tells them what they\'re standing up there for.',
    give: 'Mutton and barley. Same pot as goes up the wall. If it\'s good enough for them, it\'s good enough for you.',
  },
];

const byId = Object.fromEntries(GATHERINGS.map((g) => [g.id, g])) as Record<string, GatheringDef>;

/** One fairing a lighting. */
const fairingKey = (id: string) => 'fairing:' + id;
const hadOne = (g: GameApi, id: string) => g.flag(fairingKey(id)) === gatheringNow().cycle;

const npcs: NpcDef[] = [];
const dialogue: Record<string, DialogueTree> = {};
for (const f of FIRES) {
  const def = byId[f.id], land = def.land ?? 'counties', when = () => gatheringLit(f.id);
  const { x, z } = def;
  npcs.push({
    ...f.host, land, when,
    schedule: [{ from: 0, to: 24, at: [x + 2.2, z + 2.2], face: [x, z], anim: 'idle' }],
  });
  f.band.forEach((b, k) => {
    const sx = x + (k ? 1.1 : -1.1), sz = z - 3.5;
    npcs.push({
      id: b.id, name: b.name, title: `Plays at ${def.name.replace(/^The /, 'the ')}`, look: b.look, land, when,
      schedule: [{ from: 0, to: 24, at: [sx, sz], face: [sx, z], anim: 'perform', held: b.item, play: { tunes: f.tunes, part: b.part } }],
      barks: k ? ['One more.', 'Keep up.'] : ['Requests cost a penny.', 'This one\'s old.'],
    });
  });
  dialogue[f.host.id] = {
    start: () => 'hello',
    nodes: {
      hello: {
        text: f.hello,
        options: [
          { text: 'Anything off the fire going spare?', next: 'give', cond: (g) => !hadOne(g, f.id) },
          { text: 'What\'s the fire for?', next: 'why' },
          { text: 'I\'ll find a seat.' },
        ],
      },
      why: {
        text: f.why,
        options: [
          { text: 'Anything off the fire going spare?', next: 'give', cond: (g) => !hadOne(g, f.id) },
          { text: 'I\'ll find a seat.' },
        ],
      },
      give: {
        text: f.give,
        effect: (g) => {
          if (hadOne(g, f.id)) return;
          if (g.give(def.fairing, 1)) g.setFlag(fairingKey(f.id), gatheringNow().cycle);
          else g.toast('Your pack is full.');
        },
        options: [{ text: 'Thank you.' }],
      },
    },
  };
}

export const GATHERINGS_CONTENT: RegionContent = { id: 'gatherings', npcs, dialogue };
