import type { DialogueTree, DNode, GameApi } from '../../game/api';
import type { QuestDef } from '../quests';
import { at, hook, type Marks } from './kit';
import type { RegionContent } from './types';
import { CALLIS_SPOTS } from '../../world/morrow';
import { MIRADOR_LOOKOUT } from '../mirador';
import { COMPANIONS } from '../companions';

// THE TALL CITY, second half (docs/STORY_PLAN.md, Act VI):
//
//   L     The Old Tower Falls (storyTowerFalls): the brake in the core slips, the counting floor's stair is
//         jammed with clerks, and you can only be in one place. With Wenna and Tam both beside you, one of
//         them dies, unless both trust you completely and their own stories are done: then the brass-bound
//         last volume of Pryce's book goes into the brake drum as a wedge, and the book is lost. With one
//         of them: them, or the clerks. With neither: Marta Vidal holds the brake. Flag towerFall =
//         'wenna' (Wenna died at the brake) | 'tam' (Tam died on the stair) | 'book' (the book was lost) |
//         'clerks' (eleven clerks died; your companion lived) | 'companion' (your companion died; the
//         clerks lived) | 'marta'. A companion who dies stays dead (comp:<id>:dead).
//   LI    What the Charter Owes Callis (storySittingCallis): the Charter's first sitting abroad. Flags
//         rhosynFate = 'resign' | 'finish' (she stays to settle the debt with Callis, then goes); speaker =
//         'nessa' | 'sela' | 'rhosyn'.
//   LII   Delia Reads (storyDeliaReads): Delia Harrowgate comes over with a letter from the Corvo bank of
//         Ambry, calling her loan early. Hilda has already gone south.
//   LIII  Sixth Camp (storyCamp6): the Mirador lookout over the city, the place at the fire that's empty.

const FALL = 'storyTowerFalls', SIT = 'storySittingCallis', DELIA = 'storyDeliaReads', CAMP = 'storyCamp6';
const ACT = 'The Tall City';

const P = CALLIS_SPOTS.plaza;
const FIRE = { x: MIRADOR_LOOKOUT.x - 4.5, z: MIRADOR_LOOKOUT.z - 3.5 };

const alive = (g: GameApi, id: string) => !!g.flag(`comp:${id}:joined`) && !g.flag(`comp:${id}:gone`) && !g.flag(`comp:${id}:dead`);
const R = (g: GameApi, id: string) => Number(g.flag(`comp:${id}:rapport`) ?? 0);
/** The third way: both of them beside you, both trusting you completely, both their own stories told, and the book to wedge the brake with. */
const thirdWay = (g: GameApi) => alive(g, 'wenna') && alive(g, 'tam') && R(g, 'wenna') >= 60 && R(g, 'tam') >= 60
  && Number(g.flag('comp:wenna:part') ?? 0) >= 3 && Number(g.flag('comp:tam:part') ?? 0) >= 3 && g.has('pryce_book');

/** A companion dies, and stays dead: gone from your side, from their home, and from every camp after. */
function dies(g: GameApi, id: 'wenna' | 'tam'): void {
  if (g.compActive() === id) g.compDismiss();
  g.setFlag(`comp:${id}:dead`, 1);
  g.setFlag(`comp:${id}:gone`, 1);
}

// ================================================================ L. THE OLD TOWER FALLS

const fallNodes: Record<string, DNode> = {
  tf_f1: { speaker: 'narrator', text: 'Inside the Old Tower\'s core the chains of the counterweights run up into the dark, and the brake drum shrieks every time the wind leans on the tower. Above you, eleven storeys up, forty clerks are carrying ledgers down one narrow stair.', next: 'tf_f2' },
  tf_f2: { text: 'The brake\'s slipping. A tooth at a time. When it goes, the tower lifts off its keys and the top half walks. Somebody has to hold the lever down. And somebody has to get that stair moving.', next: 'tf_f3' },
  tf_f3: {
    text: (g) => {
      if (alive(g, 'wenna') && alive(g, 'tam')) return 'You\'ve two of them. Use them.';
      if (alive(g, 'wenna') || alive(g, 'tam')) return 'You\'ve one with you. One pair of hands on the lever, one on the stair. That leaves nobody to spare.';
      return 'You\'re alone? Then you take the stair. I\'ll hold the brake. It\'s my tower.';
    },
    options: [
      { text: 'Wenna, the brake. Tam, the stair. I\'ll go between.', cond: (g) => alive(g, 'wenna') && alive(g, 'tam'), next: 'tf_b1' },
      { text: (g) => (alive(g, 'wenna') ? 'Wenna, hold the brake. I\'ll take the stair.' : 'Tam, hold the brake. I\'ll take the stair.'), cond: (g) => alive(g, 'wenna') !== alive(g, 'tam'), next: 'tf_o1' },
      { text: 'Go, Marta. I\'ll get them down.', cond: (g) => !alive(g, 'wenna') && !alive(g, 'tam'), next: 'tf_m1' },
    ],
  },
  // Both of them
  tf_b1: { speaker: 'narrator', text: 'Wenna throws her weight on the lever. Tam is up the stair three at a time. The drum stops shrieking and starts to groan. Somewhere above, the first clerks come down past you with their arms full.', next: 'tf_b2' },
  tf_b2: { speaker: 'narrator', text: 'Then two things at once. The lever jumps in Wenna\'s hands and lifts her off her feet, and she hangs on to it. And up on the eighth landing the stair cracks across, and Tam is above the crack with the last clerk on his back.', next: 'tf_b3' },
  tf_b3: {
    as: 'wenna', text: 'I\'ve got it. I\'ve got it. Go to him.',
    options: [
      { text: '(Run to the lever) Wenna, I\'m here. Hold on.', next: 'tf_b_wenna' },
      { text: '(Run up the stair) Tam! Throw me the clerk!', next: 'tf_b_tam' },
      { text: '(Wedge the brake drum with Pryce\'s book) Both of you, let go!', cond: thirdWay, next: 'tf_b_book' },
    ],
  },
  tf_b_wenna: { speaker: 'narrator', text: 'You put your weight beside hers, and the lever comes down, and holds. Above you, the eighth landing goes. You hear Tam shout something, the way he always does, as if it were a joke. Then the stair comes down through the core in a long roar of stone and timber, and the clerk he was carrying lands in a heap of ledgers at your feet, alive.', next: 'tf_b_wenna2' },
  tf_b_wenna2: { speaker: 'narrator', text: 'They dig him out at dawn. He has a card in his hand, the queen of cups. Nobody knows where he was keeping it.', effect: (g) => { dies(g, 'tam'); g.setFlag('towerFall', 'tam'); g.setStage(FALL, 'done'); } },
  tf_b_tam: { speaker: 'narrator', text: 'You are on the eighth landing as it goes, and Tam swings the clerk across the gap into your arms and jumps after, and you both land on stone that holds. Below you the drum gives a shriek like a living thing. The lever goes up, and Wenna doesn\'t let go of it.', next: 'tf_b_tam2' },
  tf_b_tam2: { speaker: 'narrator', text: 'The counterweight comes down the core and the tower settles back onto its keys with a sound the whole city hears. When you get down, the lever is in its place and the brake is holding, and Wenna is holding it still.', effect: (g) => { dies(g, 'wenna'); g.setFlag('towerFall', 'wenna'); g.setStage(FALL, 'done'); } },
  tf_b_book: { speaker: 'narrator', text: 'Pryce\'s last volume has brass at its corners. You jam it edge-on into the brake drum between two teeth, and the drum bites it, and stops. Wenna falls off the lever. Tam comes down the last flight with the clerk on his back as the eighth landing goes behind him.', next: 'tf_b_book2' },
  tf_b_book2: { speaker: 'narrator', text: 'In the morning they pull the book out of the drum in pieces. Every line Pryce ever signed for Harrowgate, chewed to pulp. Whatever you were going to hold over Hilda, you held a tower up with instead.', effect: (g) => { g.take('pryce_book'); g.setFlag('bookLost', 1); g.setFlag('towerFall', 'book'); g.compRapport('wenna', 10); g.compRapport('tam', 10); g.setStage(FALL, 'done'); } },
  // One of them
  tf_o1: { speaker: 'narrator', text: 'Your companion throws their weight on the lever, and you run for the stair. Halfway up, the stair cracks across the eighth landing with eleven clerks above it. Below you the drum shrieks, and the lever lifts the one holding it off their feet.', next: 'tf_o2' },
  tf_o2: {
    text: 'Choose!',
    options: [
      { text: '(Run back down to the lever)', next: 'tf_o_comp' },
      { text: '(Get the eleven clerks across the crack)', next: 'tf_o_clerks' },
    ],
  },
  tf_o_comp: { speaker: 'narrator', text: 'You reach the lever together and bring it down. Above you the eighth landing goes with the eleven clerks on it, and their ledgers come down the core after them like snow.', effect: (g) => { g.setFlag('towerFall', 'clerks'); g.setStage(FALL, 'done'); } },
  tf_o_clerks: { speaker: 'narrator', text: 'You get them across one at a time, the last of them on your back. When you come down, the lever is in its place, the brake is holding, and the one who held it hasn\'t let go.', effect: (g) => { dies(g, alive(g, 'wenna') ? 'wenna' : 'tam'); g.setFlag('towerFall', 'companion'); g.setStage(FALL, 'done'); } },
  // Neither
  tf_m1: { speaker: 'narrator', text: 'You get the clerks down, all forty, the last of them carrying Pascall\'s first ledger in both arms like a child. When you come back into the core, the brake is holding, and the Warden of the Towers is holding it, and doesn\'t let go.', effect: (g) => { g.setFlag('towerFall', 'marta'); g.setFlag('martaDead', 1); g.setStage(FALL, 'done'); } },
};

// ================================================================ LI. WHAT THE CHARTER OWES CALLIS

const sitNodes: Record<string, DNode> = {
  s1: { speaker: 'narrator', text: 'The Charter sits on the steps of the Assembly Hall, the first time it has ever sat outside Ansbury. Half of Callis has come to watch. The Old Tower stands at the end of the plaza with its top storeys gone, like a broken tooth.', next: 's2' },
  s2: {
    text: (g) => (g.flag('rhosynSecret') === 'kept' ? 'I asked for six days, and I have used them. Before anything else on the agenda: I signed the Third Daughter\'s papers. Everything since comes from that line. I\'ll answer for it.' : 'You told them. Good. Now I\'ll tell them the rest: why, and what it bought, and what it cost. Then they can do what they like with me.'),
    next: 's3',
  },
  s3: { speaker: 'narrator', text: 'Benet Sala stands up for Callis and says the Assembly will take the debt down a storey at a time, the same as the towers: half of it written off, half paid in the black the Charter doesn\'t need, at the posted rate. Nobody cheers. Everybody signs.', next: 's4' },
  s4: {
    text: 'And the Speaker. The Charter needs one tomorrow morning. Tell them what you think, you\'ve earned it.',
    options: [
      { text: 'Rhosyn stays until the debt with Callis is settled. Then she goes.', next: 's_finish' },
      { text: 'Rhosyn goes today. Nessa Crane speaks for the Charter: she keeps the lanes open and the boats off the rocks.', next: 's_nessa' },
      { text: 'Rhosyn goes today. Sela Orme speaks for the Charter: she writes everyone\'s name in the same book.', next: 's_sela' },
    ],
  },
  s_finish: { text: 'Until it\'s settled. Then I\'ll go back to Ansbury and sit in the gallery like anyone else, and watch somebody else make it worse.', effect: (g) => { g.setFlag('rhosynFate', 'finish'); g.setFlag('speaker', 'rhosyn'); g.setStage(SIT, 'done'); } },
  s_nessa: { text: 'Nessa. She\'ll hate it. She\'ll be very good at it. I\'ll write her everything I know. It won\'t take long.', effect: (g) => { g.setFlag('rhosynFate', 'resign'); g.setFlag('speaker', 'nessa'); g.compRapport('wenna', 4); g.setStage(SIT, 'done'); } },
  s_sela: { text: 'Sela Orme, who hadn\'t left her hill in six years until you walked her down it. Yes. The Charter could do worse. It has.', effect: (g) => { g.setFlag('rhosynFate', 'resign'); g.setFlag('speaker', 'sela'); g.compRapport('ottilie', 4); g.setStage(SIT, 'done'); } },
};

// ================================================================ LII. DELIA READS

const delia: DialogueTree = {
  start: (g) => (at(g, DELIA) === 'delia' ? 'd1' : 'dAfter'),
  nodes: {
    d1: { text: 'Delia Harrowgate. You\'ll have heard of me as the one who signs things. I\'ve stopped. It\'s very restful.', next: 'd2' },
    d2: { text: 'This came on the packet. The Corvo bank of Ambry, calling in Harrowgate\'s loan. Early. With no reason given, which is how banks say there\'s a reason.', next: 'd3' },
    d3: { text: 'Hilda went south a fortnight ago, without a word to me or Joan. She took Pryce\'s copies of the company books. She means to buy the loan back, or buy whoever holds it.', next: 'd4' },
    d4: { text: 'Joan says she\'s going after her. Joan has never once gone after Hilda. Joan goes after numbers. So something down there is a number Joan can\'t leave alone.', next: 'd5' },
    d5: {
      text: (g) => (g.flag('bookLost') ? 'You held up a tower with Pryce\'s last book, I hear. Good. It was the best use anyone ever made of it. Will you come south?' : 'You still have Pryce\'s last book. Bring it. Down there it might be worth something to somebody. Will you come south?'),
      options: [{ text: 'I\'ll come.', next: 'd6' }],
    },
    d6: { text: 'Then the next packet that goes south, we\'re on it. It isn\'t for some months yet. Nobody\'s sailing south this season, the captains say. Something about the weather over Ambry.', effect: (g) => { g.setFlag('southBound', 1); g.setStage(DELIA, 'done'); } },
    dAfter: { text: 'The next packet south. Some months. The captains won\'t say more than "the weather". They look at the sky when they say it.' },
  },
};

// ================================================================ LIII. SIXTH CAMP

const campOtt: DialogueTree = {
  start: (g) => (g.flag('camp6O') ? 'co_again' : 'co1'),
  nodes: {
    co1: {
      text: (g) => {
        const f = g.flag('towerFall');
        if (f === 'wenna') return 'I keep setting out a place for her. Four bowls. I don\'t know why I can\'t stop.';
        if (f === 'tam') return 'He owed me two marks. He owed everyone two marks. I\'d give a great deal for him to owe me two marks.';
        if (f === 'marta') return 'The Warden. She knew every finger of that tower. I measured it for a week and thought I understood it.';
        if (f === 'clerks') return 'Eleven. Eleven clerks and their ledgers. I keep counting them. It doesn\'t change.';
        return 'Everyone came down. I didn\'t think everyone would come down.';
      },
      next: 'co2',
    },
    co2: { text: 'Joan\'s going south after Hilda. Delia says the weather over Ambry has stopped the boats. I want to measure it. Is that wrong, wanting to measure the thing that\'s frightening everyone?', options: [{ text: 'No. That\'s why you\'re you.', next: 'co_you' }, { text: 'Measure it from here first.', next: 'co_here' }] },
    co_you: { text: 'That\'s why I\'m me. All right. I\'ll pack the level.', effect: (g) => { g.compRapport('ottilie', 4); g.setFlag('camp6O', 1); } },
    co_here: { text: 'From here. Yes. Carefully. The way Ilse would. I\'ll start tonight.', effect: (g) => { g.compRapport('ottilie', 2); g.setFlag('camp6O', 1); } },
    co_again: { text: 'Sleep. I\'ll keep an eye on the south.' },
  },
};
const campWenna: DialogueTree = {
  start: (g) => (g.flag('camp6W') ? 'cw_again' : 'cw1'),
  nodes: {
    cw1: { text: (g) => (g.flag('towerFall') === 'tam' ? 'The queen of cups. He had it in his hand. I keep wondering what the trick was. There was always a trick.' : g.flag('towerFall') === 'book' ? 'You jammed a book in a brake. Of all the things. Pryce would laugh himself sick.' : 'From up here the Old Tower looks like nothing. A broken tooth. We nearly lost everything in it.'), next: 'cw2' },
    cw2: { text: 'Ursel would have liked Callis, I think. All these people keeping their gates.', effect: (g) => { g.compRapport('wenna', 2); g.setFlag('camp6W', 1); } },
    cw_again: { text: 'First watch. It\'s quiet up here. I don\'t trust it.' },
  },
};
const campTam: DialogueTree = {
  start: (g) => (g.flag('camp6T') ? 'ct_again' : 'ct1'),
  nodes: {
    ct1: { text: (g) => (g.flag('towerFall') === 'wenna' ? 'She told me to go. On the stair. "Go to him," she said, to you. About me. And you did. And I\'m here.' : g.flag('towerFall') === 'book' ? 'Pryce\'s book, in the brake. I\'ve played for high stakes. I\'ve never seen anyone fold a hand like that.' : 'I came down eleven storeys with a clerk on my back. He was sick on me twice. Best day of my life. Again.'), next: 'ct2' },
    ct2: { text: 'Ambry, next. Where all the money goes. I\'ve always wanted to see where all the money goes.', effect: (g) => { g.compRapport('tam', 2); g.setFlag('camp6T', 1); } },
    ct_again: { text: 'Sleep. I\'m counting the lights in the harbour. Two hundred and six.' },
  },
};

// ================================================================ The chapters

const QUESTS: Record<string, QuestDef> = {
  [FALL]: {
    id: FALL, name: 'The Old Tower Falls', story: { chapter: 50, title: 'The Old Tower Falls', act: ACT }, next: [SIT, 'sitting'],
    notes: (g, s) => {
      if (s === 'core') return 'The storm is on Callis. Marta Vidal is in the Old Tower\'s core, at the brake.';
      const f = g.flag('towerFall');
      if (f === 'wenna') return 'Wenna held the brake until the tower settled, and didn\'t let go. Wenna Hale is dead.';
      if (f === 'tam') return 'The eighth landing came down through the core with Tam on it. Tam Reddick is dead.';
      if (f === 'book') return 'Pryce\'s last book went into the brake drum as a wedge. Everyone came down. The book is gone.';
      if (f === 'clerks') return 'The eighth landing came down with eleven clerks on it.';
      if (f === 'companion') return 'I got the clerks across. The one who held the brake didn\'t let go.';
      return 'Marta Vidal held the brake on her own tower, and didn\'t let go.';
    },
    objectives: (_g, s) => (s === 'core' ? [{ text: 'Go into the Old Tower\'s core with Marta', marker: 'marta_vidal' }] : []),
    marks: (_g, s): Marks => (s === 'core' ? { marta_vidal: '?' } : {}),
    walk: { from: { quests: { storyLiftTowers: 'done', [FALL]: 'core' }, flags: { 'comp:wenna:joined': 1, 'comp:tam:joined': 1 } } },
  },
  [SIT]: {
    id: SIT, name: 'What the Charter Owes Callis', story: { chapter: 51, title: 'What the Charter Owes Callis', act: ACT }, next: [DELIA, 'delia'],
    notes: (g, s) => (s === 'sitting' ? 'The Charter sits on the steps of the Assembly Hall in Callis, the first time it has ever sat abroad.' : `The Assembly takes the Charter's debt down a storey at a time: half written off, half paid in black at the posted rate. ${g.flag('speaker') === 'nessa' ? 'Nessa Crane is Speaker.' : g.flag('speaker') === 'sela' ? 'Sela Orme is Speaker.' : 'Rhosyn stays until it\'s settled, then goes.'}`),
    objectives: (_g, s) => (s === 'sitting' ? [{ text: 'Speak at the sitting on the Assembly Hall\'s steps', marker: 'rhosyn_callis' }] : []),
    marks: (_g, s): Marks => (s === 'sitting' ? { rhosyn_callis: '?' } : {}),
    walk: { from: { quests: { [FALL]: 'done', [SIT]: 'sitting' }, flags: { rhosynSecret: 'kept' } } },
  },
  [DELIA]: {
    id: DELIA, name: 'Delia Reads', story: { chapter: 52, title: 'Delia Reads', act: ACT }, next: [CAMP, 'lookout'],
    notes: (_g, s) => (s === 'delia' ? 'Delia Harrowgate has come over on the packet, with a letter.' : 'The Corvo bank of Ambry has called in Harrowgate\'s loan early. Hilda went south a fortnight ago; Joan is going after her. No packet sails south this season: "the weather" over Ambry.'),
    objectives: (_g, s) => (s === 'delia' ? [{ text: 'Talk to Delia Harrowgate in the plaza', marker: 'delia_callis' }] : []),
    marks: (_g, s): Marks => (s === 'delia' ? { delia_callis: '?' } : {}),
    walk: { from: { quests: { [SIT]: 'done', [DELIA]: 'delia' } } },
  },
  [CAMP]: {
    id: CAMP, name: 'Sixth Camp', story: { chapter: 53, title: 'Sixth Camp', act: ACT },
    notes: (_g, s) => (s === 'lookout' ? 'A fire at the Mirador\'s lookout, over the whole city, the night after the sitting.' : s === 'camp' ? 'The Mirador lookout, at night, the broken Old Tower below.' : 'The next packet south is months away. Something is wrong with the weather over Ambry.'),
    objectives: (g, s) => {
      if (s === 'lookout') return [{ text: 'Go up to the Mirador\'s lookout', marker: 'camp6Fire' }];
      if (s !== 'camp') return [];
      const o: { text: string; marker?: string; done?: boolean }[] = [];
      if (alive(g, 'ottilie')) o.push({ text: 'Sit with Ottilie', done: !!g.flag('camp6O'), marker: 'camp6_ottilie' });
      if (alive(g, 'wenna')) o.push({ text: 'Sit with Wenna', done: !!g.flag('camp6W'), marker: 'camp6_wenna' });
      if (alive(g, 'tam')) o.push({ text: 'Sit with Tam', done: !!g.flag('camp6T'), marker: 'camp6_tam' });
      o.push({ text: 'Sleep at the lookout', marker: 'camp6Fire' });
      return o;
    },
    marks: (g, s): Marks => (s === 'camp' ? {
      ...(alive(g, 'ottilie') && !g.flag('camp6O') ? { camp6_ottilie: '?' as const } : {}),
      ...(alive(g, 'wenna') && !g.flag('camp6W') ? { camp6_wenna: '?' as const } : {}),
      ...(alive(g, 'tam') && !g.flag('camp6T') ? { camp6_tam: '?' as const } : {}),
    } : {}),
    advance: (g, s) => {
      if (s !== 'lookout' || !g.compNear(FIRE.x, FIRE.z, 12)) return null;
      if (g.compActive()) g.compDismiss();
      return 'camp';
    },
    walk: { from: { quests: { [DELIA]: 'done', [CAMP]: 'lookout' }, flags: { 'comp:ottilie:joined': 1, towerFall: 'book' } }, auto: { lookout: 'camp' } },
  },
};

const look = (id: 'wenna' | 'ottilie' | 'tam') => COMPANIONS[id].look;
const inCamp = (g: GameApi) => at(g, CAMP) === 'camp';
const DELIA_LOOK = { skin: '#e0b898', hair: '#6a3a2a', hairStyle: 2, eyes: '#5a4a3a', tunic: '#3a2a3a', trim: '#c8a868', shirt: '#f0e8d8', trousers: '#2a2228', boots: '#1e1a18', cape: '#4a2a3a', frame: 'f' as const, lashes: true, build: 0.95, age: 0.45 };

export const ACT_SIX_B: RegionContent = {
  id: 'actSixB',
  npcs: [
    { land: 'morrow', id: 'delia_callis', name: 'Delia Harrowgate', title: 'Harrowgate & Daughters', look: DELIA_LOOK, schedule: [{ from: 0, to: 24, at: [P.x + 4.5, P.z - 8.5], face: [P.x, P.z], anim: 'idle' }], barks: [], when: (g) => !!at(g, DELIA) },
    { land: 'morrow', id: 'camp6_ottilie', name: 'Ottilie Fenn', title: 'Surveyor\'s apprentice', look: look('ottilie'), schedule: [{ from: 0, to: 24, at: [FIRE.x + 2.2, FIRE.z + 1.3], face: [FIRE.x, FIRE.z], anim: 'idle' }], barks: [], when: (g) => inCamp(g) && alive(g, 'ottilie') },
    { land: 'morrow', id: 'camp6_wenna', name: 'Wenna Hale', title: 'Once of the Toll Riders', look: look('wenna'), schedule: [{ from: 0, to: 24, at: [FIRE.x - 2.3, FIRE.z + 1.2], face: [FIRE.x, FIRE.z], anim: 'idle' }], barks: [], when: (g) => inCamp(g) && alive(g, 'wenna') },
    { land: 'morrow', id: 'camp6_tam', name: 'Tam Reddick', title: 'Card sharp, mostly honest', look: look('tam'), schedule: [{ from: 0, to: 24, at: [FIRE.x + 0.4, FIRE.z - 2.4], face: [FIRE.x, FIRE.z], anim: 'idle' }], barks: [], when: (g) => inCamp(g) && alive(g, 'tam') },
  ],
  dialogue: { delia_callis: delia, camp6_ottilie: campOtt, camp6_wenna: campWenna, camp6_tam: campTam },
  quests: QUESTS,
  readables: {
    camp6Sleep: {
      title: 'The lookout',
      body: (g) => {
        const f = g.flag('towerFall');
        const empty = f === 'wenna' ? 'Nobody takes the first watch. Then Ottilie does, badly, because somebody should.' : f === 'tam' ? 'Nobody counts the lights in the harbour. You find you\'re doing it yourself.' : 'The city sleeps under you, all of it.';
        return `The lights of Callis go out street by street below the lookout, and the Old Tower stands dark at the end of the plaza with its top storeys gone. ${empty}\n\nIn the morning the bay is flat calm to the north, and to the south, over the sea toward Ambry, there is a bank of cloud that hasn't moved in a week.`;
      },
      effect: (g) => { if (inCamp(g)) g.setStage(CAMP, 'done'); },
    },
  },
  things: [
    { land: 'morrow', id: 'camp6Fire', x: FIRE.x, z: FIRE.z, label: 'Sleep at the lookout', radius: 2.6, read: 'camp6Sleep', when: (g) => inCamp(g) && (!alive(g, 'ottilie') || !!g.flag('camp6O')) && (!alive(g, 'wenna') || !!g.flag('camp6W')) && (!alive(g, 'tam') || !!g.flag('camp6T')) },
  ],
  pieces: [
    { id: 'camp6Fire', kind: 'campfire', x: FIRE.x, z: FIRE.z, when: (g) => at(g, CAMP) === 'lookout' || inCamp(g) },
    { id: 'camp6RollP', kind: 'bedroll', x: FIRE.x - 1.6, z: FIRE.z + 3.4, ry: 2.6, tint: '#7a3a2e', when: (g) => at(g, CAMP) === 'lookout' || inCamp(g) },
    { id: 'camp6RollO', kind: 'bedroll', x: FIRE.x + 3.2, z: FIRE.z + 1.8, ry: -1.1, tint: '#6a5a3a', when: (g) => (at(g, CAMP) === 'lookout' || inCamp(g)) && alive(g, 'ottilie') },
  ],
  hooks: (D) => {
    hook(D, 'marta_vidal', (g) => (at(g, FALL) === 'core' ? 'tf_f1' : g.flag('martaDead') ? 'tf_gone' : undefined), {
      ...fallNodes,
      tf_gone: { speaker: 'narrator', text: 'Her chair by the gauge is empty. Somebody has left her brass bob on it, wound up neat.' },
    });
    hook(D, 'rhosyn_callis', (g) => (at(g, SIT) === 'sitting' ? 's1' : undefined), sitNodes);
  },
};
