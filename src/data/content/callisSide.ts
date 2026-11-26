import type { DialogueTree, GameApi } from '../../game/api';
import { at, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { WorldThing } from '../places_regional';
import { CALLIS, CALLIS_FLOOR, CALLIS_PACKET, CALLIS_QUAY_X, CALLIS_SPOTS, CALLIS_TOWERS } from '../../world/morrow';

// Callis's own side stories (owner 2026-11-26: "start fleshing out continent 2"). The great city had one side quest of
// its own; these are its people's, not the Third Daughter's.
//
// clGauge, A FINGER AND A HALF (Aleix Ferran, the Warden's gauge boy): the Old Tower has risen two fingers since
// midsummer and the Evening Tower one, and both are still climbing, but the Morning Tower has read a finger and a half
// for a month and not moved. Aleix thinks the gauge is wrong and daren't say so to Marta Vidal, who checks his sums.
// Read it yourself: the brass mark on the plate has been filed out and cut again a finger lower. Agnes Puig, the tower's
// porter, says only three people have the gauge-room key: the Warden, Aleix, and the Wine Guild's steward, whose Guild
// rents the top three floors, which the Committee would vote off the tower first. Bernat Oliver, the steward, with brass
// dust in the seams of his gloves. Then: take it to the Warden ('warden'), let Aleix take it to her and the credit with it
// ([Generous], 'aleix'), or ([Bad or Evil]) take the Guild's thanks, a cask a month, and leave the plate as it is
// ('guild'). clGauge = 'warden' | 'aleix' | 'guild'.
//
// clNet, ROSA'S NET (Neus Roig, on the harbour): every spring the youngest on the quay knots a new net for the statue of
// Rosa Roig, who mended nets on the North Quay for sixty years, and the old one goes back to sea. Neus is Rosa's
// granddaughter, eighty-one, and this spring the youngest on the quay is a boy who has gone to sea. Her hands won't
// knot any more, but they'll show yours how. Fetch the Call hemp from the three rope-sellers' bundles on the river quays,
// borrow Pere Coll's netting needle from the Market, and sit with Neus while you knot it. The custom is that the knotter
// ties their own mark into the corner. Tie yours ('mine'), tie Rosa's ('rosa'), or tie the boy's who's at sea ('boy').
// clNet = 'mine' | 'rosa' | 'boy'.

const GAUGE = 'clGauge', NET = 'clNet';
const P = CALLIS_SPOTS.plaza, M = CALLIS_SPOTS.market, F = CALLIS_FLOOR, QX = CALLIS_QUAY_X;
const MT = { x: P.x + CALLIS_TOWERS.morning.dx, z: P.z + CALLIS_TOWERS.morning.dz };
const ALEIX = { x: P.x + 8.5, z: P.z + 6.5 }, AGNES = { x: MT.x - 5.5, z: MT.z + 6.5 }, BERNAT = { x: MT.x + 6.5, z: MT.z + 6.5 };
const PLATE = { x: MT.x + 0.5, z: MT.z + 0.5 };
const NEUS = { x: QX - 10.5, z: CALLIS_PACKET.z - 18.5 };
const HEMP: [number, number][] = [[CALLIS.x + 40.5, 1149.5], [CALLIS.x - 10.5, 1170.5], [CALLIS.x - 60.5, 1149.5]];

const hemp = (g: GameApi) => HEMP.filter((_, i) => g.flag('clHemp' + i)).length;

// ================================================================ A Finger and a Half

const aleix: DialogueTree = {
  start: (g) => {
    const s = at(g, GAUGE);
    if (!s) return 'a1';
    if (s === 'done') return 'after';
    return 'wait';
  },
  nodes: {
    a1: { speaker: 'narrator', text: 'A boy of sixteen with a slate under his arm covered in columns of figures, sitting on the edge of the plaza\'s fountain and doing the same sum for the fourth time.', next: 'a2' },
    a2: { text: 'Aleix Ferran. I read the gauges for the Warden every morning, and she checks my sums every night.', next: 'a3' },
    a3: { text: 'The Old Tower\'s up two fingers since midsummer. The Evening Tower, one. Both still going. The Morning Tower\'s read a finger and a half for a month, and hasn\'t moved a hair.', next: 'a4' },
    a4: { text: 'Towers don\'t stop. Not one, while the others climb. Either I can\'t read a gauge, or the gauge is wrong.', next: 'a5' },
    a5: {
      text: 'I can\'t tell the Warden. If I\'m wrong she\'ll never trust my slate again. Would you read it? With your own eyes?',
      options: [{ text: 'I\'ll read the Morning Tower\'s gauge.', effect: (g) => g.setStage(GAUGE, 'plate') }, { text: 'Not now.' }],
    },
    wait: { text: (g) => (at(g, GAUGE) === 'plate' ? 'The Morning Tower, east of the plaza. The gauge room is at the foot of the stair.' : at(g, GAUGE) === 'agnes' ? 'Agnes Puig keeps the door. She knows who comes and goes. She knows everything, Agnes.' : 'The Wine Guild? The steward? He tips his hat to me every morning.') },
    after: {
      text: (g) => {
        const f = g.flag(GAUGE);
        if (f === 'aleix') return 'Deputy gauge-reader. Me. The Warden said it in front of the whole Committee. She also said I should have come to her first. Both things at once. She does that.';
        if (f === 'guild') return 'The Morning Tower still reads a finger and a half. Still. I\'ve stopped writing it down. I\'ve started doing it again in pencil, on the back of the slate.';
        return 'The Warden had the plate recut that afternoon. Two fingers and a quarter. The Committee voted on the top storey by the end of the week. I was right. I wish I\'d been wrong.';
      },
    },
  },
};

const agnes: DialogueTree = {
  start: (g) => (at(g, GAUGE) === 'agnes' ? 'p1' : 'p0'),
  nodes: {
    p0: { text: 'Agnes Puig. I keep the Morning Tower\'s door. Wipe your feet.' },
    p1: { text: 'The gauge room? Three keys. The Warden has one. The boy has one. And the Wine Guild has one, because the Guild rents the top three floors and pays for the stair lamps, and what the Guild pays for, the Guild has a key to.', next: 'p2' },
    p2: { text: 'Mr Oliver, the steward. He\'s been down to the gauge room every week since midsummer. To see how his floors are, he says. Like a man visiting a sick aunt.', options: [{ text: 'Thank you, Agnes.', effect: (g) => g.setStage(GAUGE, 'bernat') }] },
  },
};

const bernat: DialogueTree = {
  start: (g) => (at(g, GAUGE) === 'bernat' ? 'b1' : at(g, GAUGE) === 'done' ? 'after' : 'b0'),
  nodes: {
    b0: { text: 'Bernat Oliver, steward to the Wine Guild of Callis. If you have business with the Guild, the Guild is on the twentieth floor, and the stair is long.' },
    b1: { speaker: 'narrator', text: 'A neat, heavy man in a good coat with kid gloves, which he takes off when he sees where you\'re looking. There is brass dust ground into the seams of both of them.', next: 'b2' },
    b2: { text: 'The plate. Yes. I filed it. It took me three nights and a great deal of nerve.', next: 'b3' },
    b3: { text: 'The Guild has kept its cellars and its hall at the top of that tower for a hundred and forty years. If the Committee takes a storey off, it takes ours first. Then the next. A finger and a half, they argue about. Two fingers, they vote.', next: 'b4' },
    b4: {
      text: 'The tower will stand another year either way. Everyone says so. What will you do?',
      options: [
        { text: 'The Warden will hear it today, from me.', moral: { id: 'clGauge:warden', a: 4, tr: { honesty: 3 }, rep: { assembly: 4 }, npc: { cl_bernat: -20, cl_aleix: 10, marta_vidal: 10 }, note: 'Told the Warden of the Towers the Wine Guild\'s steward had filed the Morning Tower\'s gauge.' }, effect: (g) => { g.setFlag(GAUGE, 'warden'); g.addMarks(90); g.setStage(GAUGE, 'done'); }, next: 'bW' },
        { text: 'Aleix found it. He takes it to the Warden, and he gets the credit.', need: { trait: { generosity: [57, 100] } }, moral: { id: 'clGauge:aleix', a: 6, tr: { generosity: 3, honesty: 2 }, rep: { assembly: 4 }, npc: { cl_bernat: -20, cl_aleix: 30, marta_vidal: 10 }, note: 'Let the Warden\'s gauge boy take the filed plate to her, and the credit for finding it.', fame: 'stood behind the boy who caught the Morning Tower\'s gauge', spread: 'local' }, effect: (g) => { g.setFlag(GAUGE, 'aleix'); g.addMarks(80); g.setStage(GAUGE, 'done'); }, next: 'bA' },
        { text: 'A cask a month from the Guild\'s cellar, and I never saw your gloves.', need: { band: ['bad', 'evil'] }, moral: { id: 'clGauge:guild', a: -10, tr: { greed: 4, deception: 3 }, rep: { assembly: -6 }, npc: { cl_bernat: 15, cl_aleix: -15 }, note: 'Took the Wine Guild\'s casks to leave a tampered tower gauge in Callis as it was.', major: true }, effect: (g) => { g.setFlag(GAUGE, 'guild'); g.give('callis_red', 3); g.addMarks(40); g.setStage(GAUGE, 'done'); }, next: 'bG' },
      ],
    },
    bW: { text: 'Then I\'ll go up and tell the Guild to start packing the cellar. A hundred and forty years. Down the stair a cask at a time.' },
    bA: { text: 'The boy. Of course. He tips his hat to me every morning. I expect he\'ll stop.' },
    bG: { text: 'The first of every month, at the foot of the stair. Agnes will have it. Agnes will not ask what\'s in it. Agnes is a treasure.' },
    after: { text: (g) => (g.flag(GAUGE) === 'guild' ? 'The first of the month. As agreed.' : 'The Guild is looking at a hall on the Market. Ground floor. The cellars flood. I\'m told that\'s character.') },
  },
};

// ================================================================ Rosa's Net

const neus: DialogueTree = {
  start: (g) => {
    const s = at(g, NET);
    if (!s) return 'n1';
    if (s === 'knot') return 'k1';
    if (s === 'done') return 'after';
    return 'wait';
  },
  nodes: {
    n1: { speaker: 'narrator', text: 'A tiny old woman in black on a folding stool by the harbour, her hands in her lap, knuckles like walnuts, watching the boats come in as if she were counting them.', next: 'n2' },
    n2: { text: 'Neus Roig. Rosa on her bollard was my grandmother. Every spring the youngest on the quay knots her a new net, and the old one goes back to sea.', next: 'n3' },
    n3: { text: 'This spring the youngest on the quay is Pep Mas, and Pep went out on the Santa Clara a fortnight ago, and I can\'t knot any more. Look at these. Two old crabs.', next: 'n4' },
    n4: { text: 'They can\'t knot, but they can show. If somebody young fetched the hemp and the needle and sat with me an afternoon, Rosa would have her net.', next: 'n5' },
    n5: {
      text: 'The rope-sellers leave Call hemp out on the river quays. Three bundles will do. And Pere Coll in the Market has my grandmother\'s needle. He keeps it for me. Will you?',
      options: [{ text: 'I\'ll fetch the hemp and the needle.', effect: (g) => g.setStage(NET, 'hemp') }, { text: 'Not now.' }],
    },
    wait: { text: (g) => (at(g, NET) === 'hemp' ? `The river quays, either side of the Call. ${hemp(g)} bundle${hemp(g) === 1 ? '' : 's'} so far. Then Pere Coll for the needle.` : 'Pere Coll, in the Market. Tell him it\'s for Rosa.') },
    k1: { speaker: 'narrator', text: 'Neus has you sit on an upturned basket beside her stool, and takes your hands in hers, and puts the needle in one and the hemp in the other, and doesn\'t let go.', next: 'k2' },
    k2: { text: 'Over, under, through, and pull. Over, under, through, and pull. No. Pull. You\'re not asking it, you\'re telling it. There.', next: 'k3' },
    k3: { speaker: 'narrator', text: 'It takes the whole afternoon. Fishermen stop on their way up the quay and stand behind you and tell you you\'re doing it wrong, and then that you\'re doing it right, and then that Rosa did it faster. By the time the light goes the net is the length of the bollard and the boats are all in.', next: 'k4' },
    k4: {
      text: 'Last thing. The knotter ties their own mark in the corner. Rosa\'s had sixty years of other people\'s. Whose will it be?',
      options: [
        { text: 'Mine. I knotted it.', moral: { id: 'clNet:mine', tr: { courage: 1 }, npc: { cl_neus: 10 } }, effect: (g) => { g.take('cl_hemp', 3); g.take('cl_needle', 1); g.setFlag(NET, 'mine'); g.addMarks(50); g.setStage(NET, 'done'); }, next: 'kM' },
        { text: 'Rosa\'s. It\'s her net.', moral: { id: 'clNet:rosa', tr: { compassion: 1 }, npc: { cl_neus: 20 } }, effect: (g) => { g.take('cl_hemp', 3); g.take('cl_needle', 1); g.setFlag(NET, 'rosa'); g.addMarks(50); g.setStage(NET, 'done'); }, next: 'kR' },
        { text: 'Pep Mas\'s. It was his turn. He can see it when he comes home.', moral: { id: 'clNet:boy', a: 2, tr: { generosity: 2 }, npc: { cl_neus: 25 }, note: 'Knotted Rosa Roig\'s spring net on the Callis quay, and tied the absent boy\'s mark into it.' }, effect: (g) => { g.take('cl_hemp', 3); g.take('cl_needle', 1); g.setFlag(NET, 'boy'); g.addMarks(50); g.setStage(NET, 'done'); }, next: 'kB' },
      ],
    },
    kM: { text: 'Good. A stranger\'s mark on Rosa\'s knees. She\'d have liked that. She married two of them.' },
    kR: { text: 'An R in the corner. She never had one of her own on it. Sixty years, and every mark somebody else\'s. Thank you.' },
    kB: { text: 'Pep\'s. He\'ll come up the quay off the Santa Clara and see his mark on her and not know how it got there. Let him wonder. It\'ll do him good.' },
    after: {
      text: (g) => (g.flag(NET) === 'boy' ? 'Pep came home Tuesday. He stood in front of her a long time. He\'s asked me to show him the knots. Two old crabs, teaching.' : 'Every morning I come down and look at her. Good net. Bit loose at the top. Don\'t tell anyone I said so.'),
    },
  },
};

const quests: Record<string, QuestDef> = {
  [GAUGE]: {
    id: GAUGE, name: 'A Finger and a Half', region: 'callis', depth: 'quest',
    notes: (g, s) => {
      if (s === 'plate') return 'Aleix Ferran reads the tower gauges for the Warden. The Old Tower and the Evening Tower are still rising, but the Morning Tower has read a finger and a half for a month. He wants someone to read it with their own eyes.';
      if (s === 'agnes') return 'The brass mark on the Morning Tower\'s gauge plate has been filed out and cut again, a finger lower. Somebody with a key. Agnes Puig keeps the tower\'s door.';
      if (s === 'bernat') return 'Three keys to the gauge room: the Warden\'s, Aleix\'s, and the Wine Guild\'s, whose Guild rents the top three floors. Bernat Oliver, the Guild\'s steward, has been down every week since midsummer.';
      const f = g.flag(GAUGE);
      return f === 'warden' ? 'I told the Warden. The plate was recut, and the Committee voted on the top storey.' : f === 'aleix' ? 'Aleix took it to the Warden, and the credit with it.' : 'I take a cask a month from the Wine Guild, and the gauge still reads a finger and a half.';
    },
    objectives: (_g, s) => (s === 'plate' ? [{ text: 'Read the Morning Tower\'s gauge plate', marker: 'clPlate' }]
      : s === 'agnes' ? [{ text: 'Ask Agnes Puig at the Morning Tower who has a key', marker: 'cl_agnes' }]
      : s === 'bernat' ? [{ text: 'Talk to Bernat Oliver, the Wine Guild\'s steward', marker: 'cl_bernat' }] : []),
    marks: (g, s): Marks => (!s ? { cl_aleix: '!' } : s === 'agnes' ? { cl_agnes: '?' } : s === 'bernat' ? { cl_bernat: '?' } : {}),
    walk: { cast: ['cl_aleix', 'cl_agnes', 'cl_bernat'] },
  },
  [NET]: {
    id: NET, name: 'Rosa\'s Net', region: 'callis', depth: 'quest',
    notes: (g, s) => {
      if (s === 'hemp') return 'Every spring the youngest on the Callis quay knots a new net for the statue of Rosa Roig. This spring the youngest is at sea, and Neus Roig, her granddaughter, can\'t knot any more. Fetch three bundles of Call hemp from the river quays.';
      if (s === 'needle') return 'I have the hemp. Pere Coll in the Market keeps Rosa\'s netting needle for Neus.';
      if (s === 'knot') return 'Hemp and needle. Sit with Neus Roig on the harbour and knot the net.';
      const f = g.flag(NET);
      return f === 'boy' ? 'Rosa has her net, with Pep Mas\'s mark in the corner.' : f === 'rosa' ? 'Rosa has her net, with her own mark in the corner at last.' : 'Rosa has her net, with my mark in the corner.';
    },
    objectives: (g, s) => (s === 'hemp' ? HEMP.map((_, i) => ({ text: `Take a bundle of Call hemp from the river quays (${i + 1})`, done: !!g.flag('clHemp' + i), marker: 'clHemp' + i }))
      : s === 'needle' ? [{ text: 'Ask Pere Coll in the Market for Rosa\'s needle', marker: 'pere_coll' }]
      : s === 'knot' ? [{ text: 'Knot the net with Neus Roig on the harbour', marker: 'cl_neus' }] : []),
    advance: (g, s) => (s === 'hemp' && hemp(g) >= HEMP.length ? 'needle' : null),
    marks: (_g, s): Marks => (!s ? { cl_neus: '!' } : s === 'needle' ? { pere_coll: '?' } : s === 'knot' ? { cl_neus: '?' } : {}),
    walk: { cast: ['cl_neus', 'pere_coll'] },
  },
};

const things: WorldThing[] = [
  { land: 'morrow', id: 'clPlate', x: PLATE.x, z: PLATE.z, y: F, label: 'Look closely at the gauge plate', radius: 2.4, look: 'none',
    when: (g) => at(g, GAUGE) === 'plate',
    use: (g) => { g.setStage(GAUGE, 'agnes'); g.toast('The plumb hangs where Aleix said, a finger and a half off the old mark. But the brass round the mark is brighter than the rest of the plate, and when you run a thumb down it there is a shallow dip, filed smooth, where a mark was. The new one has been cut a finger lower. The scratches are a week old at most.'); } },
  ...HEMP.map(([x, z], i): WorldThing => ({
    land: 'morrow', id: 'clHemp' + i, x, z, y: F, label: 'Take a bundle of hemp', radius: 2.4, look: 'basket',
    when: (g) => at(g, NET) === 'hemp' && !g.flag('clHemp' + i),
    use: (g) => { g.setFlag('clHemp' + i, 1); g.give('cl_hemp', 1); g.toast(['A coil of brown Call hemp on a bollard, with a penny under a stone for whoever takes it. Neus said the rope-sellers leave it for the net.', 'Hemp, hung on a hook by a rope-seller\'s door, and a slate: FOR ROSA.', 'The last bundle, on a crate by the bridge steps, tied with a red thread so nobody sells it by mistake.'][i]); },
  })),
];

const pereNodes = {
  pn1: { text: 'For Rosa? Then it\'s for Neus. Here: her grandmother\'s needle. Boxwood, older than the Market. If you lose it I\'ll put you in a barrel of sardines.', options: [{ text: 'I\'ll guard it with my life.', effect: (g: GameApi) => { g.give('cl_needle', 1); g.setStage(NET, 'knot'); } }] },
};

const LOOK_CALLIS = { skin: '#c8946a', eyes: '#3a2a1e', boots: '#2a1e14' };
const NPCS: NpcDef[] = [
  { land: 'morrow', id: 'cl_aleix', name: 'Aleix Ferran', title: 'Gauge-reader to the Warden', look: { ...LOOK_CALLIS, hair: '#2a1e1a', hairStyle: 5, tunic: '#3a3e44', trim: '#c8c8d0', trousers: '#2e2a26', build: 0.85, age: 0.15 },
    schedule: [{ from: 0, to: 24, at: [ALEIX.x, ALEIX.z], y: F, face: [ALEIX.x - 3, ALEIX.z], anim: 'idle' }], barks: ['A finger and a half.'] },
  { land: 'morrow', id: 'cl_agnes', name: 'Agnes Puig', title: 'Porter, the Morning Tower', look: { ...LOOK_CALLIS, frame: 'f', hair: '#5a5a5a', hairStyle: 2, tunic: '#2a2a2e', trim: '#e0d8c0', trousers: '#2a2a2e', apron: true, lashes: true, build: 1.1, age: 0.65 },
    schedule: [{ from: 0, to: 24, at: [AGNES.x, AGNES.z], y: F, face: [AGNES.x, AGNES.z + 3], anim: 'idle' }], barks: ['Wipe your feet.'] },
  { land: 'morrow', id: 'cl_bernat', name: 'Bernat Oliver', title: 'Steward, the Wine Guild of Callis', look: { ...LOOK_CALLIS, hair: '#3a2a1e', hairStyle: 4, facial: 1, tunic: '#5a1e2a', trim: '#e0c060', trousers: '#2a1e1e', hat: 'wide', hatColor: '#2a1e1e', build: 1.2, age: 0.55 },
    schedule: [{ from: 0, to: 24, at: [BERNAT.x, BERNAT.z], y: F, face: [BERNAT.x, BERNAT.z + 3], anim: 'idle' }], barks: ['The twentieth floor.'] },
  { land: 'morrow', id: 'cl_neus', name: 'Neus Roig', title: 'Rosa Roig\'s granddaughter', look: { ...LOOK_CALLIS, frame: 'f', hair: '#e0e0e0', hairStyle: 2, tunic: '#1e1e22', trim: '#3a3a3e', trousers: '#1e1e22', hat: 'kerchief', hatColor: '#1e1e22', lashes: true, build: 0.7, height: 0.9, age: 0.95 },
    schedule: [{ from: 7, to: 20, at: [NEUS.x, NEUS.z], y: F, face: [NEUS.x + 4, NEUS.z], anim: 'idle' }], barks: ['Over, under, through.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'cl_hemp', name: 'Call hemp', kind: 'quest', rarity: 'common', stack: true, value: 0, icon: { shape: 'bag', a: '#8a6a3a', b: '#5a4a2a' }, desc: 'Brown hemp from the river, the rope-sellers\' gift for Rosa\'s net.' },
  { id: 'cl_needle', name: 'Rosa Roig\'s netting needle', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'rod', a: '#c8a060', b: '#8a6a3a' }, desc: 'A boxwood netting needle, worn smooth, older than the Market. Pere Coll says if you lose it he\'ll put you in a barrel of sardines.' },
];

export const CALLIS_SIDE: RegionContent = {
  id: 'callisSide',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { cl_aleix: aleix, cl_agnes: agnes, cl_bernat: bernat, cl_neus: neus },
  quests,
  things,
  hooks: (D) => {
    const t = D['pere_coll'];
    if (!t) return;
    const base = t.start;
    t.start = (g) => (at(g, NET) === 'needle' ? 'pn1' : base(g));
    Object.assign(t.nodes, pereNodes);
  },
};
