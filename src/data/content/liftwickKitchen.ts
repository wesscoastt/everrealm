import type { DialogueTree } from '../../game/api';
import { at, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { WorldThing } from '../places_regional';
import { MORROW_OX } from '../../world/morrow';

// Liftwick, on the Sunder's north rim (docs/LORE.md "Liftwick"; data/monuments.ts, lwstep: the Solers' doorstep, the
// bottom course of a cottage cut off clean when the big slab went up with the rest of it, which is the skyfarmers' hut
// now; and old Neus Soler walks out over the bridges now and then to sit in her own kitchen).
//
// lwKitchen, NEUS'S KITCHEN (Roser Soler, at the doorstep): Neus went over to her kitchen this morning and hasn't come
// back, and the bound stone's bell has rung twice since noon: the big slab is lifting again, and the bridge pins on its
// near end are pulling. Out on the slab, Neus has the kettle on in the hut. She was born in that kitchen and married
// from it, and she'll not be told. Talk her down for Roser's sake; or help her carry what she can't leave, the
// hearthstone with her mother's initials, down to Roser's house; or ([Brave]) stay out on the slab with her through the
// night while Pol Vidal and the skyfarmers pin a new bridge. lwKitchen = 'down' | 'hearth' | 'stayed'.

const KITCHEN = 'lwKitchen';
const ROSER = { x: 7865.5, y: 45, z: 276.5 };
const NEUS = { x: 7846.5, y: 62, z: 431.5 };
const PINS = { x: 1450 + MORROW_OX - 6.5, y: 62, z: 428 - 6.5 };

const roser: DialogueTree = {
  start: (g) => (g.flag('lwMetRoser') ? 'hello' : 'r0'),
  nodes: {
    r0: { speaker: 'narrator', text: 'A young woman sitting on the bottom course of a cottage that isn\'t there, the Solers\' doorstep, with her knees drawn up, watching the slabs out over the Sunder.', effect: (g) => g.setFlag('lwMetRoser', 1), next: 'hello' },
    hello: {
      text: (g) => (at(g, KITCHEN) === 'slab' ? 'Over the bridge from the tower and out to the big slab. She\'ll be in the hut. The kitchen.' : 'Roser Soler. This was our house. Most of it is up there now.'),
      options: [
        { text: 'You\'re watching the slabs.', cond: (g) => !at(g, KITCHEN), next: 'q1' },
        { text: 'How is your grandmother?', cond: (g) => at(g, KITCHEN) === 'done', next: 'after' },
        { text: 'Good day.' },
      ],
    },
    q1: { text: 'My gran went over to her kitchen this morning. She does, now and then. She sits in it and has a cup of tea and comes home. She hasn\'t come home, and the bell on the bound stone has rung twice since noon.', next: 'q2' },
    q2: {
      text: 'That means the big slab\'s lifting again. Pol says the pins on the bridge to it are pulling. If they go, she\'s up there till somebody builds another. She\'s eighty-four. Will you go? She won\'t listen to me. She might to a stranger.',
      options: [{ text: 'I\'ll go over.', effect: (g) => g.setStage(KITCHEN, 'slab') }, { text: 'Not now.' }],
    },
    after: {
      text: (g) => (g.flag(KITCHEN) === 'hearth'
        ? 'The hearthstone\'s in my kitchen now, by the fire. N.S. and A.S. She sits by it with her tea and tells me I\'ve put it in crooked.'
        : g.flag(KITCHEN) === 'stayed'
          ? 'Pol pinned the new bridge by morning. She walks over to her kitchen every day now, and I don\'t mind. Well. I mind less.'
          : 'She came home. She\'s cross with me. She\'ll get over it. She left the kettle up there, and she\'s asked Pol to fetch it twice.'),
    },
  },
};

const neus: DialogueTree = {
  start: (g) => (at(g, KITCHEN) === 'slab' ? 'n1' : 'hello'),
  nodes: {
    hello: {
      text: (g) => (g.flag(KITCHEN) === 'stayed' ? 'Kettle\'s on. It always is.' : 'Mind the edge.'),
      options: [{ text: 'Good day.' }],
    },
    n1: { speaker: 'narrator', text: 'A tiny old woman in a black shawl sitting on a stool at the door of the skyfarmers\' hut, with a kettle on a little iron stove behind her and the Sunder falling away past the slab\'s edge. At her feet, a flat stone cut with two sets of initials. She doesn\'t look round.', next: 'n2' },
    n2: { text: 'Roser sent you. Sit down. There\'s tea. I was born on this floor, and married off it, and I buried my husband from that door, and three springs ago it went up into the sky with my good teapot in it. You don\'t get to tell me where I sit.', next: 'n3' },
    n3: {
      text: 'I know the pins are pulling. I can hear them. I\'m old, not deaf. So. What are you going to say to me?',
      options: [
        { text: 'Roser\'s sitting on your doorstep waiting for you. Come down, for her.', moral: { id: 'lwKitchen:down', tr: { honesty: 2, loyalty: 1 }, npc: { lw_neus: 5, lw_roser: 15 } }, effect: (g) => { g.setFlag(KITCHEN, 'down'); g.addMarks(70); g.setStage(KITCHEN, 'done'); }, next: 'nD' },
        { text: 'Then let\'s take the kitchen with us. That hearthstone, for a start.', moral: { id: 'lwKitchen:hearth', tr: { compassion: 2, generosity: 1 }, npc: { lw_neus: 20, lw_roser: 15 } }, effect: (g) => { g.setFlag(KITCHEN, 'hearth'); g.addMarks(70); g.setStage(KITCHEN, 'done'); }, next: 'nH' },
        { text: 'Then I\'ll sit here with you tonight, and Pol can pin a new bridge by morning.', need: { trait: { courage: [57, 100] } }, moral: { id: 'lwKitchen:stayed', a: 3, tr: { courage: 2, compassion: 1 }, npc: { lw_neus: 25, lw_roser: 10, pol_vidal: 5 } }, effect: (g) => { g.setFlag(KITCHEN, 'stayed'); g.addMarks(70); g.setStage(KITCHEN, 'done'); }, next: 'nS' },
      ],
    },
    nD: { speaker: 'narrator', text: 'She looks at you for a long time. Then she pours the tea out onto the slab, rinses the cup, puts it back on its hook exactly where it was, and takes your arm. She doesn\'t look back once, all the way over the bridge. Roser is waiting at the near end, and pays you with both hands.' },
    nH: { speaker: 'narrator', text: 'The hearthstone is heavier than she is. You carry it over the bridge in a blanket, the pins groaning under you, and Neus walks behind you carrying the kettle and telling you to mind it. In Roser\'s kitchen she has you set it down by the fire and turns it twice before she\'s satisfied. Roser presses marks into your hand.' },
    nS: { speaker: 'narrator', text: 'You sit with her all night on the floor of the kitchen that went up into the sky, drinking stewed tea, while the slab groans and the pins sing and far off the bound stone\'s bell rings a third time. She tells you about her husband. At first light there are lanterns at the near end and Pol Vidal\'s voice, and a new bridge pinned into fresh rock. Roser pays you, and can\'t speak.' },
  },
};

const quests: Record<string, QuestDef> = {
  [KITCHEN]: {
    id: KITCHEN, name: 'Neus\'s Kitchen', region: 'sunder', depth: 'quest',
    notes: (g, s) => {
      if (s === 'slab') return 'Neus Soler has gone over to the skyfarmers\' hut on the big slab, which was her kitchen before it rose, and hasn\'t come back. The slab is lifting again and the bridge pins are pulling. Roser, her granddaughter, wants her home.';
      const f = g.flag(KITCHEN);
      return f === 'hearth' ? 'Neus came down, and her hearthstone with her, to Roser\'s kitchen.' : f === 'stayed' ? 'I sat out the night with Neus on the slab while Pol pinned a new bridge.' : 'Neus came home for Roser\'s sake.';
    },
    objectives: (g, s) => (s === 'slab' ? [
      { text: 'Look at the bridge pins on the near end of the big slab', done: !!g.flag('lwPins'), marker: 'lwPins' },
      { text: 'Find Neus Soler in the hut on the big slab', marker: 'lw_neus' },
    ] : []),
    marks: (_g, s): Marks => (!s ? { lw_roser: '!' } : s === 'slab' ? { lw_neus: '?' } : {}),
    walk: { cast: ['lw_roser', 'lw_neus'] },
  },
};

const things: WorldThing[] = [
  {
    land: 'morrow', id: 'lwPins', x: PINS.x, z: PINS.z, y: PINS.y, label: 'Look at the bridge pins', radius: 2.6, look: 'gauge',
    when: (g) => at(g, KITCHEN) === 'slab' && !g.flag('lwPins'),
    use: (g) => { g.setFlag('lwPins', 1); g.toast('Iron pins as thick as your wrist, driven into the slab\'s edge, and every one of them has a bright ring of new metal showing where the rock has let go of it. As you watch, the nearest one gives a little click and comes out another hair. From the hut, someone is singing.'); },
  },
];

const NPCS: NpcDef[] = [
  { land: 'morrow', id: 'lw_roser', name: 'Roser Soler', title: 'The Solers\' doorstep', look: { frame: 'f', lashes: true, skin: '#c89070', hair: '#2a1e16', hairStyle: 6, eyes: '#3a2a1e', tunic: '#5a4a3a', trim: '#c8a060', shirt: '#e8e0d0', trousers: '#3a3430', boots: '#2a2018', build: 0.95, age: 0.25 },
    schedule: [{ from: 0, to: 24, at: [ROSER.x, ROSER.z], face: [ROSER.x, ROSER.z + 4], anim: 'seated', y: ROSER.y }],
    barks: ['This was our house.', 'She\'ll come home. She always comes home.'] },
  { land: 'morrow', id: 'lw_neus', name: 'Neus Soler', title: 'Her own kitchen', look: { frame: 'f', lashes: true, skin: '#c89878', hair: '#e8e4dc', hairStyle: 7, eyes: '#3a3a3a', tunic: '#1a1a1e', trim: '#3a3a3e', shirt: '#d8d0c0', trousers: '#1a1a1e', boots: '#1a1612', cape: '#1a1a1e', build: 0.8, height: 0.88, age: 0.95 },
    schedule: [{ from: 0, to: 24, at: [NEUS.x, NEUS.z], face: [NEUS.x + 3, NEUS.z], anim: 'seated', y: NEUS.y }],
    when: (g) => at(g, KITCHEN) === 'slab' || g.flag(KITCHEN) === 'stayed',
    barks: ['Kettle\'s on.', 'Mind the edge.'] },
];

export const LIFTWICK_KITCHEN: RegionContent = {
  id: 'liftwickKitchen',
  npcs: NPCS,
  dialogue: { lw_roser: roser, lw_neus: neus },
  quests,
  things,
};
