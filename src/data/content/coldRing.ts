import type { DialogueTree, GameApi } from '../../game/api';
import { at, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { QuestSpawn, WorldThing } from '../places_regional';
import { COLD_SHED, MORROW_OX } from '../../world/morrow';

// The Greywaste moor between Cold Harbour and Hollow Fell (docs/LORE.md "Cold Harbour, Hollow Fell and Northgate";
// after Lie Still, greywaste.ts tdHeld).
//
// gwRing, THE RING OF BLACK (Ellen Dacre, at Cold Harbour): a cart of black tipped coming down off the fell in the
// spring, the night before the diggers stopped, and spilled across the Dacres' sheep pasture. Jos Dacre raked it into
// a ring round the flock, and the Held won't cross it. It was one cart. The ring has a gap on the north side, and Jos
// sits in the gap every night with a crook. Ellen wants a sack from the heaps at Cold Harbour, the black Wat Aske is
// carrying back up to the barrows a cart at a time. Take it up, hold the gap with Jos while it's raked in, then: close
// the ring and leave them their sheep, talk them down to the Kittiwake and the black back to Wat, or tell Wat and let
// him bring a cart up and do it properly, and take back whatever's over. gwRing = 'ring' | 'south' | 'wat'.

const RING = 'gwRing';
const ELLEN = { x: COLD_SHED.x + COLD_SHED.w + 2.5, y: 18, z: COLD_SHED.z - 2.5 };
const HEAP = { x: COLD_SHED.x - 2.5, y: 18, z: COLD_SHED.z + 3.5 };
const JOS = { x: 2100.5 + MORROW_OX, y: 30, z: -1135.5 };
const GAP = { x: 2100.5 + MORROW_OX, y: 30, z: -1145.5 };
const HELD: [number, number][] = [[2096 + MORROW_OX, -1154], [2104 + MORROW_OX, -1156], [2100 + MORROW_OX, -1160]];
const heldDown = (g: GameApi) => killed(g, 'gwRingHeld') >= HELD.length;

const ellen: DialogueTree = {
  start: (g) => (g.flag('gwMetEllen') ? 'hello' : 'e0'),
  nodes: {
    e0: { speaker: 'narrator', text: 'A broad, weathered woman in a man\'s coat with a lamb under one arm, standing under the awning by the diggers\' shed and watching the track down off the moor, not the sea.', effect: (g) => g.setFlag('gwMetEllen', 1), next: 'hello' },
    hello: {
      text: (g) => (at(g, RING) === 'heap' ? 'A sack off the heaps by the shed. Wat won\'t miss one. He will, but he\'ll not say.' : at(g, RING) === 'up' ? 'Up the track, a mile, where the sheep are. You\'ll see Jos. He\'ll be in the gap.' : 'Ellen Dacre. Dacre\'s pasture, up the track.'),
      options: [
        { text: 'You\'re watching the moor, not the boats.', cond: (g) => !at(g, RING) && at(g, 'tdHeld') === 'done', next: 'e1' },
        { text: 'How\'s the ring?', cond: (g) => at(g, RING) === 'done', next: 'after' },
        { text: 'Good day.' },
      ],
    },
    e1: { text: 'A cart tipped coming down off the fell in the spring, the night before the diggers gave up. Spilled the black right across our pasture. Jos raked it into a ring round the flock, and when they came down off the fell, the dead, they walked right up to it and stopped. They won\'t cross it.', next: 'e2' },
    e2: { text: 'It was one cart. It doesn\'t go all the way round. There\'s a gap on the north side, the width of a door, and Jos sits in it every night with his crook. Every night. He\'s sixty.', next: 'e3' },
    e3: {
      text: 'There\'s heaps of it here by the shed that nobody shipped. Wat\'s carrying it back up to the barrows a cart at a time. One sack would close the gap. One sack.',
      options: [{ text: 'I\'ll take a sack up to Jos.', effect: (g) => g.setStage(RING, 'heap') }, { text: 'Not now.' }],
    },
    after: {
      text: (g) => (g.flag(RING) === 'south'
        ? 'Callis has sheep. Not like ours. Jos says the grass tastes of salt. He sleeps through the night, though. First time since the spring.'
        : g.flag(RING) === 'wat'
          ? 'Wat came up with a cart and a rake and did it in an afternoon, a ring you could set a wheel on. Then he took the rest back up the fell. He wouldn\'t take a penny. He took a cheese.'
          : 'The ring\'s closed. Jos sleeps in the house now. I can hear the dead on the moor some nights, walking round and round it, looking for the door.'),
    },
  },
};

const jos: DialogueTree = {
  start: (g) => (at(g, RING) === 'up' ? (heldDown(g) ? 'j4' : 'j1') : 'hello'),
  nodes: {
    hello: {
      text: (g) => (g.flag(RING) === 'ring' ? 'Closed. Look at it. Not a gap in it.' : 'Sheep don\'t mind the dark. I mind it for them.'),
      options: [{ text: 'Good day.' }],
    },
    j1: { speaker: 'narrator', text: 'A lean old man in a sheepskin, sitting on an upturned bucket in a gap in a long ring of black dust, with a shepherd\'s crook across his knees and three hundred sheep packed together behind him. He looks at your sack and closes his eyes for a moment.', next: 'j2' },
    j2: {
      text: 'Ellen sent you. Course she did. Rake it in while I hold the gap. They come at dusk, three or four. They stand in the gap and look at me. Tonight they\'ll look at you as well.',
      options: [{ text: 'Then let them look.', effect: (g) => g.setFlag('gwHold', 1) }],
    },
    j4: { text: 'Gone back up the moor. That\'s the first night they\'ve gone back without me having to get up off the bucket. Now. What do we do with it? You\'ve a sack of Wat\'s black, and there\'s a gap.', next: 'j5' },
    j5: {
      text: 'Ellen wants it closed. Ellen\'s right, mostly. Mostly.',
      options: [
        { text: 'Close the ring. Keep your sheep.', moral: { id: 'gwRing:ring', tr: { compassion: 2 }, npc: { gw_jos: 20, gw_ellen: 20, wat_aske: -5 } }, effect: (g) => { g.take('gw_sack', 1); g.setFlag(RING, 'ring'); g.addMarks(90); g.setStage(RING, 'done'); }, next: 'jR' },
        { text: 'Come down with Ellen and take the Kittiwake south. The black goes back to Wat\'s barrows.', moral: { id: 'gwRing:south', tr: { honesty: 1, loyalty: 1, courage: 1 }, npc: { gw_jos: -5, gw_ellen: 10, wat_aske: 15 } }, effect: (g) => { g.take('gw_sack', 1); g.setFlag(RING, 'south'); g.addMarks(90); g.setStage(RING, 'done'); }, next: 'jS' },
        { text: 'It\'s Wat\'s black. Let him bring a cart up and do it properly, and take back what\'s over.', moral: { id: 'gwRing:wat', tr: { honesty: 2, loyalty: 1 }, npc: { gw_jos: 10, gw_ellen: 10, wat_aske: 20 } }, effect: (g) => { g.take('gw_sack', 1); g.setFlag(RING, 'wat'); g.addMarks(90); g.setStage(RING, 'done'); }, next: 'jW' },
      ],
    },
    jR: { speaker: 'narrator', text: 'Jos rakes the black into the gap himself, slowly, the way a man smooths a bed, then stands back and looks at the ring for a long time. Then he picks up the bucket and walks back to the house without a word, and you hear the door bar go across. Ellen will want paying you. She\'ll want it to come from her.' },
    jS: { text: 'Leave the flock. Well. I\'ve thought it. Every night on that bucket I\'ve thought it. The Brethren\'ll buy the sheep, at their price. Tell Ellen yes. Tell her before I change my mind.' },
    jW: { text: 'Wat. He\'d come, wouldn\'t he. He\'s been up and down that track every day since spring with a barrow, putting it back. I\'ve watched him. Leave the sack at the gap. I\'ll tell him myself, when he comes by.' },
  },
};

const quests: Record<string, QuestDef> = {
  [RING]: {
    id: RING, name: 'The Ring of Black', region: 'greywaste', depth: 'quest',
    notes: (g, s) => {
      if (s === 'heap') return 'Jos Dacre keeps his flock on the moor above Cold Harbour inside a ring of spilled black, and the Held won\'t cross it, but there\'s a gap. Ellen Dacre wants a sack off the heaps by the diggers\' shed taken up to close it.';
      if (s === 'up') return heldDown(g) ? 'The Held have gone back up the moor. Talk to Jos.' : 'Take the sack up to Jos Dacre in the gap, and hold it with him when the Held come.';
      const f = g.flag(RING);
      return f === 'south' ? 'The Dacres sold their flock and took the Kittiwake south.' : f === 'wat' ? 'Wat Aske closed the Dacres\' ring with a cart, and took the rest of the black back up the fell.' : 'The Dacres\' ring is closed.';
    },
    objectives: (g, s) => (s === 'heap' ? [{ text: 'Take a sack from the heaps of black by the diggers\' shed', marker: 'gwHeap' }]
      : s === 'up' ? [
        { text: 'Take the sack up to Jos Dacre', marker: 'gw_jos', done: !!g.flag('gwHold') },
        ...(g.flag('gwHold') ? [{ text: `Hold the gap (${Math.min(HELD.length, killed(g, 'gwRingHeld'))}/${HELD.length})`, done: heldDown(g) }] : []),
      ] : []),
    marks: (g, s): Marks => (!s && at(g, 'tdHeld') === 'done' ? { gw_ellen: '!' } : s === 'up' && (heldDown(g) || !g.flag('gwHold')) ? { gw_jos: '?' } : {}),
    walk: { cast: ['gw_ellen', 'gw_jos'], kill: { up: [['risen', 3]] }, from: { quests: { tdHeld: 'done' } } },
  },
};

const spawns: QuestSpawn[] = [
  { land: 'morrow', tag: 'gwRingHeld', type: 'risen', at: HELD, when: (g) => at(g, RING) === 'up' && !!g.flag('gwHold') },
];

const things: WorldThing[] = [
  {
    land: 'morrow', id: 'gwHeap', x: HEAP.x, z: HEAP.z, y: HEAP.y, label: 'Fill a sack with black', radius: 2.6, look: 'crate',
    when: (g) => at(g, RING) === 'heap',
    use: (g) => { g.give('gw_sack', 1); g.setStage(RING, 'up'); g.toast('The heap is cold and heavier than coal, broken slabs and dust. You shovel a sack full. Over by the shed, a tally board says "Wat says no more" in chalk. Up the track, a mile, the Dacres\' pasture.'); },
  },
  {
    land: 'morrow', id: 'gwGapCart', x: GAP.x - 2, z: GAP.z, y: GAP.y, label: 'The tipped cart', radius: 2, look: 'saltcart',
    when: (g) => at(g, RING) === 'up',
    use: (g) => { g.toast('The cart that tipped coming down off the fell, still on its side where it went over, its bed scraped clean. "A.P." is chalked on the tailboard.'); },
  },
];

const NPCS: NpcDef[] = [
  { land: 'morrow', id: 'gw_ellen', name: 'Ellen Dacre', title: 'Dacre\'s pasture', look: { frame: 'f', lashes: true, skin: '#d8a888', hair: '#8a7a6a', hairStyle: 5, eyes: '#4a5a6a', tunic: '#4a4038', trim: '#6a5a4a', shirt: '#c8c0b0', trousers: '#3a3430', boots: '#2a2018', build: 1.1, age: 0.6 },
    schedule: [{ from: 0, to: 24, at: [ELLEN.x, ELLEN.z], face: [ELLEN.x - 4, ELLEN.z - 2], anim: 'idle', y: ELLEN.y }],
    barks: ['Watch the track, not the sea.', 'One sack.'] },
  { land: 'morrow', id: 'gw_jos', name: 'Jos Dacre', title: 'Shepherd, the Greywaste', look: { skin: '#c89878', hair: '#c8c4bc', hairStyle: 0, facial: 3, eyes: '#4a5a6a', tunic: '#d8ccb0', trim: '#8a7a5a', shirt: '#c8c0b0', trousers: '#4a4038', boots: '#2a2018', build: 0.9, age: 0.75 },
    schedule: [{ from: 0, to: 24, at: [GAP.x, GAP.z + 1], face: [GAP.x, GAP.z - 4], anim: 'seated', y: GAP.y }],
    barks: ['Sheep don\'t mind the dark.', 'Not past me.'] },
];

export const COLD_RING: RegionContent = {
  id: 'coldRing',
  items: [{ id: 'gw_sack', name: 'Sack of black', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bag', a: '#2a2a2e', b: '#5a5a5e' }, desc: 'A sack of the old kingdom\'s black, off the heaps at Cold Harbour. Cold, and heavier than it should be.' }],
  npcs: NPCS,
  dialogue: { gw_ellen: ellen, gw_jos: jos },
  quests,
  spawns,
  things,
};
