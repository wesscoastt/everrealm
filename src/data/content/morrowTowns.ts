import type { DialogueTree, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import type { QuestDef } from '../quests';
import type { ShopDef } from '../shops';
import { at, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { KELL_MOUNT_STOCK } from './mounts';
import { REED_DECK, SLAB_MARKS, TOWNS } from '../../world/morrow';

// Morrow's towns and villages (world/sites.ts buildReedwater and the rest): the people in each, a job
// that wants doing, and somewhere to eat. Each job is the town's own trouble with the country round it.

type Town = keyof typeof TOWNS;
const P = (t: Town, dx: number, dz: number): [number, number] => (t === 'reedwater' ? [TOWNS[t].x + 0.5 + dx, TOWNS[t].z + 0.5 + dz] : [TOWNS[t].post[0] + dx, TOWNS[t].post[1] + dz]);

/**
 * A job of so many of one creature: asked for, done, brought back. The giver's lines: [offer, accept],
 * the reminder, the thanks; the journal's: while hunting, when done.
 */
function cull(o: {
  id: string; name: string; region: string; giver: string; type: string; n: number; what: string; marks: number; item?: string;
  offer: string[]; accept: string; wait: string; thanks: string[]; notes: [string, string];
}): { quest: QuestDef; nodes: DialogueTree['nodes'] } {
  const got = (g: GameApi) => Math.min(o.n, killed(g, 'type:' + o.type) - Number(g.flag(o.id + ':base') ?? 0));
  const nodes: DialogueTree['nodes'] = {};
  o.offer.forEach((t, i) => { nodes[`${o.id}_o${i}`] = { text: t, next: i < o.offer.length - 1 ? `${o.id}_o${i + 1}` : `${o.id}_ask` }; });
  nodes[`${o.id}_ask`] = {
    text: o.accept,
    options: [
      { text: 'I\'ll see to it.', next: `${o.id}_yes`, effect: (g) => { g.setFlag(o.id + ':base', killed(g, 'type:' + o.type)); g.setStage(o.id, 'hunt'); } },
      { text: 'Not now.' },
    ],
  };
  nodes[`${o.id}_yes`] = { text: 'Good. I\'ll be here.' };
  nodes[`${o.id}_wait`] = { text: o.wait };
  o.thanks.forEach((t, i) => {
    nodes[`${o.id}_t${i}`] = { text: t, next: i < o.thanks.length - 1 ? `${o.id}_t${i + 1}` : undefined, effect: i === o.thanks.length - 1 ? (g) => { g.addMarks(o.marks); if (o.item) g.give(o.item); g.setStage(o.id, 'done'); } : undefined };
  });
  const quest: QuestDef = {
    id: o.id, name: o.name, region: o.region, depth: 'quest',
    notes: (g, s) => (s === 'hunt' ? `${o.notes[0]} (${got(g)}/${o.n})` : s === 'back' ? o.notes[0] : o.notes[1]),
    objectives: (g, s) => (s === 'hunt' ? [{ text: `${o.what} (${got(g)}/${o.n})` }] : s === 'back' ? [{ text: 'Go back to ' + o.giver.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), marker: o.giver }] : []),
    advance: (g, s) => (s === 'hunt' && got(g) >= o.n ? 'back' : null),
    marks: (_g, s): Marks => (!s ? { [o.giver]: '!' } : s === 'back' ? { [o.giver]: '?' } : {}),
    walk: { kill: { hunt: [[o.type, o.n]] } },
  };
  return { quest, nodes };
}

// ================================================================ The jobs

const reed = cull({
  id: 'reedLizards', name: 'Sawgrass', region: 'glades', giver: 'orla_pike', type: 'gladelizard', n: 6, what: 'Sawgrass lizards killed in the Glades', marks: 160,
  offer: ['Orla Pike. I\'m reeve here, which in Reedwater means I\'m the one who gets woken.', 'The sawgrass lizards have learned the stilts. They wait under the walks at night and take whatever leans over. Two dogs this month. A boy\'s arm, nearly.'],
  accept: 'Thin them out for me. Six, out in the sawgrass. They\'ll learn again, but slower.',
  wait: 'Out in the sawgrass, round the village. Big as a boat, some of them. Mind your feet.',
  thanks: ['Six. You can see the difference already: the boys are fishing off the walks again.', 'Here. And there\'s a bed at Lorne\'s whenever you\'re through.'],
  notes: ['The sawgrass lizards have learned to wait under Reedwater\'s walks. Orla Pike, the reeve, wants six of them killed.', 'I thinned the sawgrass lizards round Reedwater. The boys are fishing off the walks again.'],
});

const wold = (() => {
  const id = 'woldLamps', n = 6;
  const quest: QuestDef = {
    id, name: 'Lampwick', region: 'amberwold', depth: 'quest',
    notes: (g, s) => (s === 'dust' ? `Ivo Larch keeps Branchley's lamps. The Wold folk paint their doorposts with lamp-moth dust before the long nights, and he's short. (${Math.min(n, g.count('moth_dust'))}/${n})` : s === 'back' ? 'I have the moth dust for Ivo Larch.' : 'Branchley\'s doorposts are painted. They glow amber all night, every one.'),
    objectives: (g, s) => (s === 'dust' ? [{ text: `Moth dust from the lamp-moths of the Amberwold (${Math.min(n, g.count('moth_dust'))}/${n})` }] : s === 'back' ? [{ text: 'Take the moth dust to Ivo Larch in Branchley', marker: 'ivo_larch' }] : []),
    advance: (g, s) => (s === 'dust' && g.count('moth_dust') >= n ? 'back' : null),
    marks: (_g, s): Marks => (!s ? { ivo_larch: '!' } : s === 'back' ? { ivo_larch: '?' } : {}),
    walk: { obtain: { dust: [['moth_dust', n]] } },
  };
  const nodes: DialogueTree['nodes'] = {
    woldLamps_o0: { text: 'Ivo Larch. I keep the lamps, up the trees and down. Mostly up.', next: 'woldLamps_o1' },
    woldLamps_o1: { text: 'Before the long nights we paint every doorpost in Branchley with lamp-moth dust. It glows for a week. Nothing that hunts at night likes it.', next: 'woldLamps_ask' },
    woldLamps_ask: {
      text: 'I\'m six twists short, and my knees don\'t climb like they did. The moths come out at dusk, in the trees round the village.',
      options: [{ text: 'I\'ll bring you six.', next: 'woldLamps_yes', effect: (g) => g.setStage(id, 'dust') }, { text: 'Not now.' }],
    },
    woldLamps_yes: { text: 'Scrape it off the wings into a twist of paper. Don\'t lick your fingers after. You\'ll glow.' },
    woldLamps_wait: { text: 'Six twists of moth dust. At dusk, in the trees. Don\'t lick your fingers.' },
    woldLamps_t0: { text: 'That\'s the lot. Every doorpost by tomorrow. You\'ll see the village from the old road, after dark, like a lantern somebody dropped.', next: 'woldLamps_t1', effect: (g) => { g.take('moth_dust', n); } },
    woldLamps_t1: { text: 'Here. And the platform on the east tree is yours to sleep on, any night. Best view in the Wold.', effect: (g) => { g.addMarks(150); g.setStage(id, 'done'); } },
  };
  return { quest, nodes };
})();

const cala = cull({
  id: 'calaJackals', name: 'The Racks', region: 'bright', giver: 'nuria_pujol', type: 'terracejackal', n: 6, what: 'Terrace jackals killed on the Bright Coast', marks: 170,
  offer: ['Nuria Pujol. I dry the fish for half of Cala Roja, which is to say I dry the fish.', 'The jackals come down off the vine terraces at night and have the racks bare by morning. A week\'s catch, three nights running.'],
  accept: 'Go up the terraces and kill six of them. They\'re cowards one at a time. They\'re not one at a time.',
  wait: 'Up the terraces, behind the town. They lie up in the vines in the day.',
  thanks: ['Six. The racks were full this morning, every one. I counted them twice.', 'Take this. And eat at Toni\'s: tell him I said you don\'t pay for the sardines.'],
  notes: ['Terrace jackals are stripping Cala Roja\'s fish racks at night. Nuria Pujol wants six of them killed up on the vine terraces.', 'The racks in Cala Roja are full again. Nuria Pujol counted them twice.'],
});

const ten = cull({
  id: 'tenReavers', name: 'Salt and Glass', region: 'glassflats', giver: 'cass_moran', type: 'saltreaver', n: 6, what: 'Salt reavers driven off on the Glass Flats', marks: 200,
  offer: ['Cass Moran. I run the Tenwells caravans: north to Northgate, south to the Sunder, and back if we\'re lucky.', 'We\'re not lucky. The salt reavers have had two trains this month. They wait for the lightning to pass and come out of the glare.'],
  accept: 'Six of them, out on the Flats. I can\'t pay what a caravan\'s worth, but I can pay.',
  wait: 'Out on the Flats. They wear white to the eyes. You\'ll see them when they want you to.',
  thanks: ['Six. The next train goes out tomorrow, and I\'ve drivers for it again.', 'Here. Tenwells doesn\'t forget a favour. It\'s a fort full of people with nothing to do but remember.'],
  notes: ['Salt reavers are raiding the caravans out of Tenwells. Cass Moran, the caravan master, wants six of them dealt with.', 'The caravans run out of Tenwells again. Cass Moran found drivers.'],
});

const conch = cull({
  id: 'conchCrabs', name: 'Hatchlings', region: 'keys', giver: 'sal_mudge', type: 'mangrovecrab', n: 6, what: 'Mangrove crabs killed on the Keys', marks: 140,
  offer: ['Sal Mudge. I watch the turtle beach. It\'s a job. Somebody made it one, and that was me.', 'The hatchlings come up out of the sand and run for the sea, and the mangrove crabs come out of the roots and meet them halfway.'],
  accept: 'Kill six of the crabs, on the Keys round here. I can\'t save all of them. I\'d like to save more.',
  wait: 'The mangroves, round the Key. The crabs are the size of a cart wheel and twice as stupid.',
  thanks: ['Six. Last night I counted forty hatchlings into the sea. Forty. I sat in the sand and cried, and I don\'t mind who knows.', 'Here. It\'s not much. The turtles say thank you as well, but slowly.'],
  notes: ['Mangrove crabs are taking the turtle hatchlings on Conch Key\'s beach. Sal Mudge wants six of them killed.', 'Forty turtle hatchlings made it to the sea from Conch Key. Sal Mudge counted.'],
});

const JOBS = [reed, wold, cala, ten, conch];

// Liftwick: Pol Vidal, Marta's son, reads the slabs' plumb marks for his mother
const SLABQ = 'liftSlabs';
const READS = ['a hand and a half', 'a hand and a half, near enough', 'two hands'];
const marked = (g: GameApi) => SLAB_MARKS.filter((_m, i) => g.flag('slabMark:' + i)).length;
const slabQuest: QuestDef = {
  id: SLABQ, name: 'Higher This Summer', region: 'sunder', depth: 'quest',
  notes: (g, s) => (s === 'read' ? `Pol Vidal farms the hanging slabs over the Sunder. His mother, the Warden of the Towers in Callis, wants numbers. There are plumb marks on three of the slabs. (${marked(g)}/3)` : s === 'back' ? 'I\'ve read the plumb marks on the slabs. Pol Vidal will want the numbers.' : 'The slabs over the Sunder have lifted a hand and a half since spring: the same as the towers in Callis, near enough.'),
  objectives: (g, s) => (s === 'read' ? SLAB_MARKS.map((_m, i) => ({ text: `Read the plumb mark on the ${['first', 'big', 'falls'][i]} slab`, done: !!g.flag('slabMark:' + i), marker: 'slabMark-' + i })) : s === 'back' ? [{ text: 'Tell Pol Vidal in Liftwick', marker: 'pol_vidal' }] : []),
  advance: (g, s) => (s === 'read' && marked(g) >= 3 ? 'back' : null),
  marks: (_g, s): Marks => (!s ? { pol_vidal: '!' } : s === 'back' ? { pol_vidal: '?' } : {}),
};
const pol: DialogueTree = {
  start: (g) => { const s = at(g, SLABQ); return !s ? 'p1' : s === 'read' ? 'pWait' : s === 'back' ? 'r1' : 'pDone'; },
  nodes: {
    p1: { text: 'Pol Vidal. I farm the slabs. My mother\'s the Warden of the Towers in Callis. She wants numbers, so I measure.', next: 'p2' },
    p2: { text: (g) => (g.flag('letter:marta_vidal') ? 'You carried her my letter, didn\'t you. I said the slabs were higher like it was good news. It isn\'t.' : 'The slabs are higher this summer. Everyone up here says it like it\'s good news. It isn\'t.'), next: 'p3' },
    p3: {
      text: 'There are plumb marks on three of them, from the spring. I\'ve a field to get in. Will you read them for me?',
      options: [{ text: 'I\'ll read them.', next: 'p4', effect: (g) => g.setStage(SLABQ, 'read') }, { text: 'Not now.' }],
    },
    p4: { text: 'Over the bridge from the rim by the tower. Don\'t look down until you\'re used to it. Nobody gets used to it.' },
    pWait: { text: 'Three marks: the first slab, the big one with the hives, and the one with the falls. Over the bridge by the tower.' },
    r1: { speaker: 'narrator', text: 'You tell him: a hand and a half on the first and the big one, two hands on the falls slab. All since the spring.', next: 'r2' },
    r2: { text: 'Same as the towers in Callis, near enough. The white in the old walls and the white under these: it\'s all waking up at once.', next: 'r3' },
    r3: { text: 'I\'ll write to her. Here. Honey off the big slab. The bees don\'t know anything\'s wrong.', effect: (g) => { g.addMarks(170); g.give('sky_honey', 3); g.setStage(SLABQ, 'done'); } },
    pDone: { text: 'Mother wrote back. Two words: "measure again." So I measure again.', options: [{ text: 'What have you got?', effect: (g) => g.openShop('pol_vidal') }, { text: 'Bye.' }] },
  },
};
/** A quest-giver's tree: the job on offer, waiting, thanks, and what they say after. */
function giver(after: string, qid: string, shop?: string): DialogueTree {
  const job = JOBS.find((j) => j.quest.id === qid)!;
  return {
    start: (g) => { const s = at(g, qid); return !s ? `${qid}_o0` : s === 'back' ? `${qid}_t0` : s === 'done' ? 'after' : `${qid}_wait`; },
    nodes: { ...job.nodes, after: { text: after, options: shop ? [{ text: 'What have you got?', effect: (g) => g.openShop(shop) }, { text: 'Bye.' }] : undefined } },
  };
}

// ================================================================ Shops and plain talk

const shopkeep = (id: string, line: string, more?: [string, string]): DialogueTree => ({
  start: () => 'a',
  nodes: { a: { text: line, options: [{ text: 'What have you got?', effect: (g) => g.openShop(id) }, ...(more ? [{ text: more[0], next: 'b' }] : []), { text: 'Bye.' }] }, ...(more ? { b: { text: more[1], next: 'a' } } : {}) },
});

const items: ItemDef[] = [
  { id: 'reed_beer', name: 'Reed beer', kind: 'food', rarity: 'common', stack: true, value: 22, icon: { shape: 'gel', a: '#c8a050', b: '#6a5020' }, desc: 'Brewed from marsh barley in a tub under Lorne Rush\'s house. Green-gold, and better than it has any right to be.', heal: 150, stats: 'Restores 150 health.' },
  { id: 'wold_bread', name: 'Acorn bread', kind: 'food', rarity: 'common', stack: true, value: 24, icon: { shape: 'bread', a: '#8a5a2a', b: '#c8a060' }, desc: 'The Wold folk grind acorns for it, and soak them for a week first. Dense, sweet and brown.', heal: 170, stats: 'Restores 170 health.' },
  { id: 'sky_honey', name: 'Skyfarm honey', kind: 'food', rarity: 'uncommon', stack: true, value: 40, icon: { shape: 'gel', a: '#f0c040', b: '#9fe8ff' }, desc: 'From hives on the hanging slabs over the Sunder. The bees fly a long way down for it.', heal: 280, stats: 'Restores 280 health.' },
  { id: 'caravan_dates', name: 'Caravan dates', kind: 'food', rarity: 'common', stack: true, value: 30, icon: { shape: 'bread', a: '#6a3a1e', b: '#c8a050' }, desc: 'Pressed into a cake for the long walk north. A handful will carry you a day.', heal: 230, stats: 'Restores 230 health.' },
];

const npc = (o: Omit<NpcDef, 'schedule' | 'land'> & { at: [number, number]; face: [number, number]; y?: number }): NpcDef => ({ land: 'morrow', ...o, schedule: [{ from: 0, to: 24, at: o.at, face: o.face, y: o.y, anim: 'idle' }] });
const L = { skin: '#c8946a', eyes: '#3a2a1e' };

export const MORROW_TOWNS: RegionContent = {
  id: 'morrowTowns',
  items,
  npcs: [
    npc({ id: 'orla_pike', name: 'Orla Pike', title: 'Reeve of Reedwater', look: { ...L, skin: '#b88a60', hair: '#5a3a1e', hairStyle: 4, tunic: '#4a5a3a', trim: '#c8b070', trousers: '#3a3a2a', boots: '#2a2018', lashes: true, build: 1.05, age: 0.55 }, at: P('reedwater', -3, -3), face: P('reedwater', -3, 3), y: REED_DECK + 1, barks: ['Mind your feet.'] }),
    npc({ id: 'tam_rush', name: 'Lorne Rush', title: 'Reed beer and smoked eel', look: { ...L, skin: '#b88a60', hair: '#3a2a1e', hairStyle: 3, facial: 4, tunic: '#5a4a2a', trim: '#8a7a4a', trousers: '#3a3a2a', boots: '#2a2018', apron: true, build: 1.2, age: 0.5 }, at: P('reedwater', 4, -3), face: P('reedwater', 4, 3), y: REED_DECK + 1, barks: ['Beer\'s cold. Ish.'] }),
    npc({ id: 'ivo_larch', name: 'Ivo Larch', title: 'Lamplighter, Branchley', look: { ...L, skin: '#d8a880', hair: '#c8c4bc', hairStyle: 0, facial: 6, tunic: '#5a3a1e', trim: '#ffb040', trousers: '#3a2e20', boots: '#2a1e14', hat: 'wide', hatColor: '#3a2a1e', age: 0.8 }, at: P('branchley', -3, 3), face: P('branchley', 2, 3), barks: ['Every doorpost.'] }),
    npc({ id: 'mags_briar', name: 'Mags Briar', title: 'Acorn bread and cider', look: { ...L, skin: '#e0b090', hair: '#8a3a1e', hairStyle: 2, tunic: '#6a4a2a', trim: '#c8a040', trousers: '#3a2e26', boots: '#2a2018', apron: true, lashes: true, freckles: true, age: 0.45 }, at: P('branchley', 5, -3), face: P('branchley', 5, 2), barks: ['Fresh this morning.'] }),
    npc({ id: 'nuria_pujol', name: 'Nuria Pujol', title: 'Fish-drier, Cala Roja', look: { ...L, hair: '#1a1410', hairStyle: 2, tunic: '#2f4a7a', trim: '#e8e2d4', trousers: '#2a2a30', boots: '#1e1a16', apron: true, lashes: true, age: 0.6 }, at: P('cala', -3, 3), face: P('cala', 1, 3), barks: ['Twice. I counted twice.'] }),
    npc({ id: 'toni_rius', name: 'Toni Rius', title: 'Fish market, Cala Roja', look: { ...L, hair: '#2a1e16', hairStyle: 1, facial: 2, tunic: '#e8e2d4', trim: '#2f4a7a', trousers: '#2a2a30', boots: '#1e1a16', apron: true, build: 1.2, age: 0.45 }, at: P('cala', 4, 3), face: P('cala', 0, 3), barks: ['Sardines!', 'Off the boat this hour.'] }),
    npc({ id: 'pol_vidal', name: 'Pol Vidal', title: 'Skyfarmer, Liftwick', look: { ...L, hair: '#4a3a2a', hairStyle: 3, tunic: '#5a6a3a', trim: '#c8b070', trousers: '#3a3430', boots: '#2a2018', hat: 'straw', age: 0.3 }, at: P('liftwick', -3, 4), face: P('liftwick', 2, 4), barks: ['Higher this summer.'] }),
    npc({ id: 'ada_moss', name: 'Ada Moss', title: 'Skyfarm honey, Liftwick', look: { ...L, skin: '#e0b898', hair: '#b8a888', hairStyle: 4, tunic: '#6a6a4a', trim: '#f0c040', trousers: '#3a3430', boots: '#2a2018', apron: true, lashes: true, age: 0.65 }, at: P('liftwick', 5, -3), face: P('liftwick', 5, 2), barks: ['The bees fly a long way down.'] }),
    npc({ id: 'cass_moran', name: 'Cass Moran', title: 'Caravan master, Tenwells', look: { ...L, skin: '#a8704a', hair: '#2a1e16', hairStyle: 4, tunic: '#d8c8a0', trim: '#a8382c', trousers: '#8a7a5a', boots: '#3a2a1e', hat: 'kerchief', hatColor: '#e8e0d0', lashes: true, scar: true, age: 0.5 }, at: P('tenwells', -3, 3), face: P('tenwells', 2, 3), barks: ['North at dawn.'] }),
    npc({ id: 'ennis_wade', name: 'Ennis Wade', title: 'Provisions, Tenwells', look: { ...L, skin: '#a8704a', hair: '#d8d4cc', hairStyle: 0, facial: 8, tunic: '#c8b890', trim: '#5a4a3a', trousers: '#6a5a4a', boots: '#3a2a1e', hat: 'wide', hatColor: '#d8c8a0', age: 0.85 }, at: P('tenwells', 5, -3), face: P('tenwells', 5, 2), barks: ['Water first. Then talk.'] }),
    npc({ id: 'sal_mudge', name: 'Sal Mudge', title: 'Turtle-watcher, Conch Key', look: { ...L, skin: '#b07a50', hair: '#d8c8a0', hairStyle: 4, tunic: '#2a6a7a', trim: '#e0d4b0', trousers: '#3a5a6a', boots: '#2a2018', hat: 'straw', lashes: true, freckles: true, age: 0.55 }, at: P('conch', -3, 3), face: P('conch', 1, 3), barks: ['Forty. I counted.'] }),
  ],
  dialogue: {
    orla_pike: giver('The walks are quiet at night again. I sleep through, mostly.', 'reedLizards'),
    ivo_larch: giver('Every doorpost in Branchley, glowing. You can see us from the old road.', 'woldLamps', 'ivo_larch'),
    nuria_pujol: giver('Full racks, every morning. I\'ve stopped counting. No, I haven\'t.', 'calaJackals'),
    cass_moran: giver('Two trains out this week and both came back. Tenwells remembers.', 'tenReavers', 'cass_moran'),
    sal_mudge: giver('Another clutch hatched last night. Thirty-one. I counted.', 'conchCrabs', 'sal_mudge'),
    tam_rush: shopkeep('tam_rush', 'Lorne Rush. Reed beer, smoked eel, and a bed over the water. The bed doesn\'t move. The water does.', ['Why stilts?', 'Because the Glades come up every spring and go down every autumn, and we got tired of moving.']),
    mags_briar: shopkeep('mags_briar', 'Mags Briar. Acorn bread, cider, and the gossip of the whole Wold, which is mostly about acorns.', ['Who lives up the trees?', 'Whoever got there first. Ivo, the Larches, the Thornes before them. Nobody\'s fallen off in my lifetime. Nearly, once.']),
    toni_rius: shopkeep('toni_rius', 'Toni Rius. Whatever the boats brought in this morning, and nothing older. If it\'s older, it\'s Callis\'s.'),
    ada_moss: shopkeep('ada_moss', 'Ada Moss. Honey off the slabs. The hives are up on the hanging stone. The bees don\'t mind the drop. I do.', ['How do you get up there?', 'Over the bridge from the tower, and then carefully. Pol will show you. Pol shows everybody.']),
    pol_vidal: pol,
    ennis_wade: shopkeep('ennis_wade', 'Ennis Wade. Water, dates, and rope. Everything else on the Flats you can do without.'),
  },
  quests: { ...Object.fromEntries(JOBS.map((j) => [j.quest.id, j.quest])), [SLABQ]: slabQuest },
  shops: {
    tam_rush: { id: 'tam_rush', name: 'Lorne Rush\'s', owner: 'tam_rush', stock: [{ item: 'reed_beer', price: 34 }, { item: 'smoked_eel', price: 32 }, { item: 'bread', price: 5 }], buyRate: () => 0.5, footer: () => 'Lorne pays half of an item\'s worth' } as ShopDef,
    mags_briar: { id: 'mags_briar', name: 'Mags Briar\'s', owner: 'mags_briar', stock: [{ item: 'wold_bread', price: 36 }, { item: 'bramble_pie', price: 34 }, { item: 'mushroom_stew', price: 52 }], buyRate: () => 0.5, footer: () => 'Mags pays half of an item\'s worth' } as ShopDef,
    toni_rius: { id: 'toni_rius', name: 'Cala Roja fish market', owner: 'toni_rius', stock: [{ item: 'callis_sardines', price: 44 }, { item: 'cooked_seabass', price: 40 }, { item: 'olive_bread', price: 27 }], buyRate: (_g, item) => (/raw_|cooked_/.test(item) ? 0.7 : 0.5), footer: () => 'Toni pays well for fish' } as ShopDef,
    ada_moss: { id: 'ada_moss', name: 'Skyfarm honey', owner: 'ada_moss', stock: [{ item: 'sky_honey', price: 60 }, { item: 'bread', price: 5 }], buyRate: () => 0.5, footer: () => 'Ada pays half of an item\'s worth' } as ShopDef,
    ennis_wade: { id: 'ennis_wade', name: 'Tenwells provisions', owner: 'ennis_wade', stock: [{ item: 'caravan_dates', price: 46 }, { item: 'brethren_rum', price: 44 }, { item: 'lockpick', price: 6 }, { item: 'loupe', price: 25 }], buyRate: () => 0.5, footer: () => 'Ennis pays half of an item\'s worth' } as ShopDef,
    sal_mudge: { id: 'sal_mudge', name: 'Sal Mudge\'s pot', owner: 'sal_mudge', stock: [{ item: 'conch_chowder', price: 60 }, ...KELL_MOUNT_STOCK.sal], buyRate: () => 0.5, footer: () => 'Sal pays half of an item\'s worth' } as ShopDef,
  },
  readables: {
    fellLetter: {
      title: 'A letter nailed to a door in Fellside',
      body: 'To whoever comes.\n\nWe have gone to Northgate, all that are left: the Aldens, the two Harrow girls, old Sim and me.\n\nThe Dunns went up the fell to see what the diggers had done and did not come down, and then they did, and they were not the Dunns.\n\nDo not open the doors. Do not go up the fell. If you see the Dunns, do not answer them, however they call.\n\nR. Alden',
    },
  },
  things: [
    ...SLAB_MARKS.map((m, i) => ({
      land: 'morrow' as const, id: 'slabMark-' + i, x: m.x, z: m.z, y: m.y, label: 'Read the plumb mark', radius: 2.4,
      when: (g: GameApi) => at(g, SLABQ) === 'read' && !g.flag('slabMark:' + i),
      use: (g: GameApi) => { g.setFlag('slabMark:' + i, true); g.toast(`The bob hangs ${READS[i]} below the mark scratched on the slate in the spring.`); },
    })),
    { land: 'morrow', id: 'fellLetter', x: TOWNS.fellside.x - 4.5, z: TOWNS.fellside.z + 1.5, label: 'Read the letter on the door', radius: 2.2, read: 'fellLetter' },
  ],
};
