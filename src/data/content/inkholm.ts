import type { DialogueTree, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { QuestDef } from '../quests';
import type { ShopDef } from '../shops';
import { at, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { GILLSBY, HYTHE, OLD_BED, PRIORY, REEKS } from '../inkholm';

// INKHOLM, the mushroom isle south-east of Gullmouth past the Mewstones (world/terrain.ts INKHOLM,
// data/inkholm.ts, LORE.md "Inkholm"). Its woods are giant mushrooms; its trade is ink, boiled from
// ink caps at Black Hythe for the Charter's ledgers.
//
// THE GREY: for three hundred years the Reekers lit five fires round the Holm every autumn and burned
// reek on them, which kept a grey mould in the ground under Corra Fell, where Abbot Wystan sealed it.
// Last autumn Harrowgate & Daughters' works manager paid the island council to let the fires lapse
// (reek smoke browns the drying caps), and sank the Deep Gill shaft toward the fell for the warm air
// the best caps grow in. It broke into the priory's undercroft. Now the Grey is in the woods and in
// people's chests, and the Charter has stopped the crossing.
//
// Quests: inkCrossing, inkGillsby, inkReek, inkHythe, inkPriory. Choice flag inkLedger = 'charter'
// (Doctor Hale sends Vosper's ledger to the Speaker: Vosper goes, Black Hythe is put under the
// Charter) | 'bryony' (Bryony reads it out at the council: the council pays back the smoke money,
// the works stay under the island's terms). Cast: Doctor Lettice Hale (Collegium physician), Reuben
// Hoskin (ferryman, Gullmouth), Bryony Kitto (the last Reeker), Joss Kitto (her grandson), Aubrey
// Vosper (works manager), Wenna Rowse (the Staithe Inn), Silas Hoskin (quay ropes, Reuben's brother).

const CROSS = 'inkCrossing', VILLAGE = 'inkGillsby', FIRES = 'inkReek', WORKS = 'inkHythe', PRIORY_Q = 'inkPriory';
const G = GILLSBY, W = HYTHE;
/** Gullmouth's Charter Post sign (data/travel.ts POSTS), literal because content imports types only. */
const GULL_POST: [number, number] = [1731.5, 594.5];

const lit = (g: GameApi) => REEKS.filter((r) => g.flag('reekLit:' + r.id)).length;
const ledger = (g: GameApi) => g.flag('inkLedger') as 'charter' | 'bryony' | undefined;
const cured = (g: GameApi) => at(g, PRIORY_Q) === 'done';

// ================================================================ The people

const haleGull: DialogueTree = {
  start: (g) => (!at(g, CROSS) ? 'h1' : at(g, CROSS) === 'reuben' ? 'hWait' : 'h1'),
  nodes: {
    h1: { text: 'Doctor Lettice Hale. Collegium. I\'m meant to be on Inkholm by now.', next: 'h2' },
    h2: { text: 'The Charter stopped the crossing a week ago. There\'s a sickness on the island. They call it the Grey.', next: 'h3' },
    h3: {
      text: 'I have the Speaker\'s leave to go over with one helper. The ferryman wants double, and a reason he can\'t argue with.',
      options: [
        { text: 'I\'ll come with you.', next: 'h4', effect: (g) => g.setStage(CROSS, 'reuben') },
        { text: 'What is the Grey?', next: 'h5' },
        { text: 'Not now.' },
      ],
    },
    h4: { text: 'Good. Reuben Hoskin, by the Post sign. Tell him I\'m paying, and that he won\'t have to get off the boat.' },
    h5: { text: 'A cough, then grey skin. Then people walk into the woods and stand still. That\'s the letter. I\'d like better than a letter.', next: 'h3' },
    hWait: { text: 'Reuben\'s by the Post sign. He\'ll complain. Let him; it\'s how he agrees to things.' },
  },
};

const reuben: DialogueTree = {
  start: (g) => (at(g, CROSS) === 'reuben' ? 'r1' : g.flag('inkFerry') ? (cured(g) ? 'rDone' : 'r5') : 'r0'),
  nodes: {
    r0: { text: 'Inkholm? Not for the Charter\'s money and not for yours. My brother\'s over there.' },
    r1: { text: 'The doctor\'s paying? Double?', next: 'r2' },
    r2: { text: 'My brother Silas keeps the ropes on the quay at Gillsby. I haven\'t heard from him in nine days.', next: 'r3' },
    r3: { text: 'I\'ll take you both over. I don\'t get off the boat, and you don\'t cough on it.', next: 'r4', effect: (g) => { g.setFlag('inkFerry', true); g.setStage(CROSS, 'cross'); } },
    r4: { text: 'Use the Post sign and ask for Gillsby Staithe. I\'ll have the boat round.' },
    r5: { text: 'If you see Silas, tell him I\'ve still got his good knife.' },
    rDone: { text: 'Silas wrote. Two pages, all about his chest. I\'ve never been so glad to be bored by him.' },
  },
};

const haleInk: DialogueTree = {
  start: (g) => {
    const c = at(g, CROSS), v = at(g, VILLAGE), f = at(g, FIRES), w = at(g, WORKS), p = at(g, PRIORY_Q);
    if (c === 'cross') return 'i1';
    if (v === 'bryony') return 'iBryony';
    if (v === 'samples') return 'iSamples';
    if (v === 'hale') return 'i6';
    if (f && f !== 'done') return 'iFires';
    if (w === 'choose') return 'c1';
    if (w && w !== 'done') return 'iWorks';
    if (p && p !== 'done') return 'iPriory';
    if (p === 'done') return 'iDone';
    return 'iWorks';
  },
  nodes: {
    i1: { text: 'You made it. Reuben was sick over the side twice and blamed the fish.', next: 'i2' },
    i2: { text: 'Nobody came down to the quay. The village has a rope across the top of the lane.', next: 'i3' },
    i3: { text: 'There\'s a woman here they call the last of the Reekers. Bryony Kitto, the house with the smoke. Start with her.', effect: (g) => g.setStage(CROSS, 'done') },
    iBryony: { text: 'Bryony Kitto. The house at the top of the lane with smoke coming out of it.' },
    iSamples: { text: 'Five caps off the greyed, if you can. Don\'t breathe on them, and don\'t let them breathe on you.' },
    i6: { text: 'You got them. Give them here.', next: 'i7', effect: (g) => { g.take('grey_cap', 5); } },
    i7: { text: 'Look at the gills under the glass. It\'s a mould that roots in the lung, and it sheds in the dry.', next: 'i8' },
    i8: { text: 'Mrs Kitto says reek smoke kills it. I came here to write that down as a story.', next: 'i9' },
    i9: { text: 'It isn\'t one. The smoke breaks it down. Their fires were medicine, done the slow way.', effect: (g) => g.setStage(VILLAGE, 'done') },
    iFires: { text: 'Five fires. I\'ll keep Joss breathing until then. He\'s twenty-two and he coughs like a coal-heaver.' },
    iWorks: { text: 'Black Hythe buys every ink cap on the Holm. If somebody decided the fires should stop, the works will know who.' },
    c1: { text: 'You\'ve found something. I can see it on you.', next: 'c2' },
    c2: { speaker: 'narrator', text: 'You show her the ledger: forty marks to the Holm council every month since last October, signed A. Vosper.', next: 'c3' },
    c3: { text: 'The Charter buys every bottle of ink this island makes. That makes this the Charter\'s business.', next: 'c4' },
    c4: {
      text: 'Give it to me and the Speaker will take Black Hythe off Harrowgate by spring. Vosper goes. So might the Holm\'s trade.',
      options: [
        { text: 'Send it to the Speaker.', next: 'c5', effect: (g) => { g.take('works_ledger'); g.setFlag('inkLedger', 'charter'); g.setStage(WORKS, 'done'); } },
        { text: 'I want to hear what Bryony says first.' },
      ],
    },
    c5: { text: 'I\'ll write tonight. Vosper will be on the next boat off; I\'ll see to that myself.' },
    iPriory: { text: 'The tomb on the fell. If the abbot sealed something under it, I want to know what. Then I want to know how.' },
    iDone: { text: 'Joss walked to the quay this morning. I\'m writing it down before I believe it.' },
  },
};

const bryony: DialogueTree = {
  start: (g) => {
    const v = at(g, VILLAGE), f = at(g, FIRES), w = at(g, WORKS), p = at(g, PRIORY_Q);
    if (v === 'bryony') return 'b1';
    if (v === 'samples' || v === 'hale') return 'bWait';
    if (f === 'bryony') return 'f1';
    if (f === 'fires') return g.has('reek_bundle') ? 'f5' : 'fMore';
    if (f === 'back') return 'f6';
    if (w === 'vosper' || w === 'ledger') return 'f9';
    if (w === 'choose') return 'k1';
    if (p === 'tomb' || p === 'abbot') return 'p2';
    if (p === 'burn') return g.has('reek_bundle') ? 'p3' : 'pMore';
    if (p === 'bryony') return 'z1';
    if (p === 'done') return 'z5';
    return 'b0';
  },
  nodes: {
    b0: { text: 'Shut the door behind you. Reek keeps the air clean in here, as long as it stays in here.' },
    b1: { text: 'You came off Reuben\'s boat. Is the doctor with you? Good. Shut the door.', next: 'b2' },
    b2: { text: 'My grandson\'s in the back with the cough. Joss. Twenty-two.', next: 'b3' },
    b3: { text: 'Every autumn since before the priory fell, the Reekers lit five fires round the Holm and burned reek on them for a week.', next: 'b4' },
    b4: { text: 'The smoke keeps the Grey in the ground. Last autumn the council said no fires. The works said the smoke spoiled the caps.', next: 'b5' },
    b5: { text: 'So no fires. Now the Grey\'s in the woods, and in half the chests on the Holm.', next: 'b6' },
    b6: { text: 'Your doctor wants to see it. The greyed past the rope have caps growing on them. Bring her some.', effect: (g) => g.setStage(VILLAGE, 'samples') },
    bWait: { text: 'The greyed don\'t run. They stand in the woods like they\'re waiting for a cart. Go past the rope and you\'ll see.' },
    f1: { text: 'She believes us, then. It only took a doctor.', next: 'f2' },
    f2: { text: 'There are five rings on the Holm. The Gull Reek, Hesketh\'s, the Low Reek, Barrow Reek and the Long Reek.', next: 'f3' },
    f3: { text: 'I can\'t walk to them any more. Here. Six bundles: one for each fire and one for when you drop one in a mere.', next: 'f4', effect: (g) => { g.give('reek_bundle', 6); g.setStage(FIRES, 'fires'); } },
    f4: { text: 'Light them and stand back. The smoke tastes like a wet dog\'s breath, but you won\'t cough after.' },
    f5: { text: 'The mist turns you round out there. Keep the sea on one side and you\'ll find your way back.' },
    fMore: { text: 'Dropped them in a mere, did you? Here. That\'s the last of what\'s dry.', effect: (g) => { g.give('reek_bundle', 2); } },
    f6: { text: 'I saw the smoke from my step. All five. First time in a year.', next: 'f7' },
    f7: { text: 'Now. The fires didn\'t go out because the council forgot. Somebody paid them to forget.', next: 'f8' },
    f8: { text: 'Black Hythe, on the east shore. Ask for Aubrey Vosper. He\'ll give you a lot of numbers. Ask him who he pays.', effect: (g) => g.setStage(FIRES, 'done') },
    f9: { text: 'Vosper\'s at the works. Follow the smell of boiling ink.' },
    k1: { text: 'What did you find?', next: 'k2' },
    k2: { speaker: 'narrator', text: 'You show her Vosper\'s ledger: forty marks to the council every month since last October.', next: 'k3' },
    k3: { text: 'Forty marks. That\'s what our fires cost. Forty marks a month.', next: 'k4' },
    k4: { text: 'Give it to me and I\'ll read it out at the council in front of the whole Staithe. They\'ll pay back every mark.', next: 'k5' },
    k5: {
      text: 'The works stay, on our terms. Ink is all the Holm sells. Without Black Hythe, Gillsby is twelve houses and a quay.',
      options: [
        { text: 'It\'s yours.', next: 'k6', effect: (g) => { g.take('works_ledger'); g.setFlag('inkLedger', 'bryony'); g.setStage(WORKS, 'done'); } },
        { text: 'The doctor should see it first.' },
      ],
    },
    k6: { text: 'I\'ll enjoy this more than I should.' },
    p2: { text: 'Wystan\'s tomb. My gran said he burned the first reek and then went down under the fell to see it out. Nobody saw him come up.' },
    p3: { text: 'If the bed\'s down there, burn it. Use a whole bundle. Don\'t be careful with it.' },
    pMore: { text: 'Out of reek? Take this. Burn the lot.', effect: (g) => { g.give('reek_bundle', 1); } },
    z1: { text: 'Smoke came up out of the fell this morning. Grey, then white.', next: 'z2' },
    z2: { text: 'Joss is asleep. Not coughing. Asleep.', next: 'z3' },
    z3: { text: 'Here. Every Reeker wears one. You\'ve earned it more than most of them did.', next: 'z4', effect: (g) => { g.give('reek_sprig'); g.addMarks(250); g.setStage(PRIORY_Q, 'done'); } },
    z4: { text: 'The greyed in the woods won\'t come back to us. But nobody else will go to them. That\'s enough.' },
    z5: { text: (g) => (ledger(g) === 'bryony' ? 'The council paid it back. Every mark, counted out on the quay. Fires every autumn from now on. I\'m teaching Joss.' : 'The Charter\'s man runs the works now. He came to ask about the fires before he unpacked. Fires every autumn. I\'m teaching Joss.') },
  },
};

const vosper: DialogueTree = {
  start: (g) => {
    const w = at(g, WORKS);
    if (w === 'vosper') return 'v1';
    if (w === 'ledger' || w === 'choose') return 'v6';
    if (ledger(g) === 'bryony') return at(g, PRIORY_Q) && at(g, PRIORY_Q) !== 'done' ? 'v8' : 'v7';
    return 'v0';
  },
  nodes: {
    v0: { text: 'Black Hythe ink works. We aren\'t taking visitors while the island is in its present difficulty.' },
    v1: { text: 'Aubrey Vosper. I manage the works for Harrowgate and Daughters.', next: 'v2' },
    v2: { text: 'The fires? The council decided that. We advised. Reek smoke settles on the drying caps and the ink comes out brown.', next: 'v3' },
    v3: { text: 'Brown ink doesn\'t sell. The Charter buys black, at four grades, by the gallon, against an assay.', next: 'v4' },
    v4: { text: 'Payments? There are always payments. Compensation for disturbance. It\'s all in the books, properly entered.', next: 'v5' },
    v5: { text: 'No, you may not see the books. They\'re in my office, and my office is closed.', effect: (g) => g.setStage(WORKS, 'ledger') },
    v6: { text: 'My office is closed. I said so.' },
    v7: { text: 'The council has put the burnings back. In October, when the caps are already in. I\'ve written to Ansbury about it.' },
    v8: { text: 'The Deep Gill? At forty fathoms we broke into a warm cavity. Dressed stone in its walls. The caps raised on its air graded first.', next: 'v9' },
    v9: { text: 'Then the men started coughing. I sealed the shaft. That\'s all there is to it.' },
  },
};

const wenna: DialogueTree = {
  start: () => 'w1',
  nodes: {
    w1: {
      text: 'The Staithe Inn. We\'re open. Nobody\'s been in for a week, but we\'re open.',
      options: [
        { text: 'What have you got?', effect: (g) => g.openShop('wenna_rowse') },
        { text: 'What\'s the rope across the lane for?', next: 'w2' },
        { text: 'Bye.' },
      ],
    },
    w2: { text: 'So the greyed don\'t wander in. They don\'t, much. Silas put it up anyway. It made people feel better.', next: 'w1' },
  },
};

const silas: DialogueTree = {
  start: (g) => (cured(g) ? 's2' : 's1'),
  nodes: {
    s1: { text: 'Reuben sent you? Tell him I\'m alive. And I want my knife back.' },
    s2: { text: 'Chest\'s clear. Wrote Reuben two pages about it. He hasn\'t answered. He\'ll have read it twice.' },
  },
};

const joss: DialogueTree = {
  start: () => 'j1',
  nodes: {
    j1: { text: 'Gran says you went down under the fell. I\'d have come. I couldn\'t have got up the fell, mind.', next: 'j2' },
    j2: { text: 'She\'s teaching me the fires. There\'s a lot more to it than setting light to a bundle, apparently.' },
  },
};

// ================================================================ The quests

const quests: Record<string, QuestDef> = {
  [CROSS]: {
    id: CROSS, name: 'The Crossing', region: 'inkholm', depth: 'storyline', next: [VILLAGE, 'bryony'],
    notes: (_g, s) => {
      if (s === 'reuben') return 'Doctor Lettice Hale of the Collegium has the Speaker\'s leave to cross to Inkholm with one helper. The Charter has stopped the crossing: there\'s a sickness there called the Grey. The ferryman, Reuben Hoskin, is by Gullmouth\'s Post sign.';
      if (s === 'cross') return 'Reuben will take us over. The Charter Post at Gullmouth crosses to Gillsby Staithe on Inkholm.';
      return 'Doctor Hale and I are crossing to Inkholm, where a sickness called the Grey has closed the island.';
    },
    objectives: (_g, s) => {
      if (s === 'reuben') return [{ text: 'Talk to Reuben Hoskin by Gullmouth\'s Post sign', marker: 'reuben' }];
      if (s === 'cross') return [{ text: 'Cross to Gillsby Staithe on the Charter Post', marker: 'hale_ink' }, { text: 'Talk to Doctor Hale at Gillsby', marker: 'hale_ink' }];
      return [];
    },
    marks: (_g, s): Marks => (!s ? { hale_gull: '!' } : s === 'reuben' ? { reuben: '?' } : s === 'cross' ? { hale_ink: '?' } : {}),
  },
  [VILLAGE]: {
    id: VILLAGE, name: 'Gillsby Staithe', region: 'inkholm', depth: 'storyline', next: [FIRES, 'bryony'],
    notes: (g, s) => {
      if (s === 'bryony') return 'Gillsby has a rope across the top of its lane. Bryony Kitto, the last of the Reekers, lives in the house with the smoke.';
      if (s === 'samples') return `Every autumn the Reekers burned reek on five fires round the Holm, and the smoke kept the Grey in the ground. Last autumn the council stopped the fires. Doctor Hale wants caps from the greyed in the woods past the rope. (${Math.min(5, g.count('grey_cap'))}/5)`;
      return 'I have five grey caps for Doctor Hale.';
    },
    objectives: (g, s) => {
      if (s === 'bryony') return [{ text: 'Talk to Bryony Kitto at the reek-house', marker: 'bryony' }];
      if (s === 'samples') return [{ text: `Take grey caps from the greyed past the rope (${Math.min(5, g.count('grey_cap'))}/5)` }];
      if (s === 'hale') return [{ text: 'Bring the caps to Doctor Hale', marker: 'hale_ink' }];
      return [];
    },
    advance: (g, s) => (s === 'samples' && g.count('grey_cap') >= 5 ? 'hale' : null),
    marks: (_g, s): Marks => (s === 'bryony' ? { bryony: '?' } : s === 'hale' ? { hale_ink: '?' } : {}),
    walk: { obtain: { samples: [['grey_cap', 5]] }, from: { quests: { [CROSS]: 'done', [VILLAGE]: 'bryony' } } },
  },
  [FIRES]: {
    id: FIRES, name: 'Reek-Fires', region: 'inkholm', depth: 'storyline', next: [WORKS, 'vosper'],
    notes: (g, s) => {
      if (s === 'bryony') return 'Doctor Hale says the reek smoke breaks the Grey down: the fires were medicine. Bryony Kitto will want to hear it.';
      if (s === 'fires') return `Bryony gave me bundles of reek for the five reek-fires round the Holm: the Gull Reek, Hesketh's Reek, the Low Reek, Barrow Reek and the Long Reek. (${lit(g)}/5 lit)`;
      return 'All five reek-fires are burning. Bryony will have seen the smoke.';
    },
    objectives: (g, s) => {
      if (s === 'bryony') return [{ text: 'Talk to Bryony Kitto', marker: 'bryony' }];
      if (s === 'fires') return REEKS.map((r) => ({ text: `Light ${r.name.replace(/^The /, 'the ')}`, done: !!g.flag('reekLit:' + r.id), marker: 'reek-' + r.id }));
      if (s === 'back') return [{ text: 'Tell Bryony Kitto', marker: 'bryony' }];
      return [];
    },
    advance: (g, s) => (s === 'fires' && lit(g) >= 5 ? 'back' : null),
    marks: (_g, s): Marks => (s === 'bryony' || s === 'back' ? { bryony: '?' } : {}),
    walk: { from: { quests: { [CROSS]: 'done', [VILLAGE]: 'done', [FIRES]: 'bryony' } } },
  },
  [WORKS]: {
    id: WORKS, name: 'Black Hythe', region: 'inkholm', depth: 'storyline', next: [PRIORY_Q, 'tomb'],
    notes: (_g, s) => {
      if (s === 'vosper') return 'Somebody paid the council to let the fires lapse. Aubrey Vosper runs Harrowgate & Daughters\' ink works at Black Hythe, on the east shore.';
      if (s === 'ledger') return 'Vosper says the council stopped the fires and the works only advised, and that there were payments, "properly entered". His books are in his office, which he says is closed.';
      return 'Vosper\'s ledger: forty marks a month to the Holm council since last October. Doctor Hale wants it for the Speaker; Bryony wants to read it out at the council.';
    },
    objectives: (_g, s) => {
      if (s === 'vosper') return [{ text: 'Talk to Aubrey Vosper at Black Hythe', marker: 'vosper' }];
      if (s === 'ledger') return [{ text: 'Find the works ledger in Vosper\'s office', marker: 'inkLedger' }];
      if (s === 'choose') return [{ text: 'Give the ledger to Doctor Hale or to Bryony Kitto', marker: 'bryony' }];
      return [];
    },
    marks: (_g, s): Marks => (s === 'vosper' ? { vosper: '?' } : s === 'choose' ? { bryony: '?', hale_ink: '?' } : {}),
    walk: { from: { quests: { [CROSS]: 'done', [VILLAGE]: 'done', [FIRES]: 'done', [WORKS]: 'vosper' } } },
  },
  [PRIORY_Q]: {
    id: PRIORY_Q, name: 'Corra Priory', region: 'inkholm', depth: 'storyline',
    notes: (_g, s) => {
      if (s === 'tomb') return 'Vosper\'s Deep Gill broke into old stonework under Corra Fell. The priory\'s ruins are on top of the fell; Abbot Wystan is buried there.';
      if (s === 'abbot') return 'Wystan\'s tomb: he burned the first reek and went down under the fell to see it out. If the stone is moved, burn it again. The stone has been moved, and the crypt stair is open.';
      if (s === 'burn') return 'Abbot Wystan was still down there, grey through. The Old Bed is in the deepest hall of the Undercroft.';
      if (s === 'bryony') return 'The Old Bed is burning. Bryony Kitto will want to know.';
      return 'The Old Bed under Corra Fell is burned.';
    },
    objectives: (g, s) => {
      if (s === 'tomb') return [{ text: 'Find Abbot Wystan\'s tomb at Corra Priory', marker: 'inkTomb' }];
      if (s === 'abbot') return [{ text: `Go down to the Old Bed and kill Abbot Wystan (${Math.min(1, killed(g, 'type:greyabbot'))}/1)`, marker: 'inkBed' }];
      if (s === 'burn') return [{ text: 'Burn the Old Bed with reek', marker: 'inkBed' }];
      if (s === 'bryony') return [{ text: 'Tell Bryony Kitto', marker: 'bryony' }];
      return [];
    },
    advance: (g, s) => (s === 'abbot' && killed(g, 'type:greyabbot') >= 1 ? 'burn' : null),
    marks: (_g, s): Marks => (s === 'bryony' ? { bryony: '?' } : {}),
    walk: { kill: { abbot: [['greyabbot', 1]] }, from: { quests: { [CROSS]: 'done', [VILLAGE]: 'done', [FIRES]: 'done', [WORKS]: 'done', [PRIORY_Q]: 'tomb' }, flags: { inkLedger: 'bryony' }, items: [['reek_bundle', 1]] } },
  },
};

// ================================================================ Things, people, places

const items: ItemDef[] = [
  { id: 'grey_cap', name: 'Grey cap', kind: 'material', rarity: 'common', stack: true, value: 6, icon: { shape: 'ore', a: '#cfc8b8', b: '#8a8478' }, desc: 'A pale, dry cap that grew out of one of the greyed. It sheds a fine dust if you shake it. Don\'t shake it.' },
  { id: 'wystan_crook', name: 'Abbot Wystan\'s crook', kind: 'trophy', rarity: 'epic', stack: false, value: 220, icon: { shape: 'rod', a: '#c8b890', b: '#4a3a2a' }, desc: 'Blackthorn bound in silver, the silver green with three hundred years under the fell. The head is carved as an ink cap.' },
  { id: 'stemwood', name: 'Stemwood', kind: 'material', rarity: 'common', stack: true, value: 4, icon: { shape: 'log', a: '#e4dccb', b: '#cfc6b0' }, desc: 'The pale, stringy flesh of a giant mushroom\'s stem, dried hard. Light as cork and stronger than it looks; the Holm builds its sheds and its boats\' floors with it.' },
  { id: 'reek_bundle', name: 'Bundle of reek', kind: 'quest', rarity: 'uncommon', stack: true, value: 0, icon: { shape: 'log', a: '#4a5a3a', b: '#8a6a3a' }, desc: 'A dried bitter herb off the Holm\'s shore, tied with twine. It smells like a wet dog\'s breath and burns slow.' },
  { id: 'works_ledger', name: 'Black Hythe ledger', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'letter', a: '#2a2a30', b: '#c8b890' }, desc: 'Aubrey Vosper\'s ledger, in very good ink. Forty marks to the Holm council, every month since last October.' },
  { id: 'reek_sprig', name: 'Reeker\'s sprig', kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'whistle', a: '#4a5a3a', b: '#a8a8b0' }, desc: 'A sprig of reek in a pewter clasp. Every Reeker on the Holm wears one. Bryony Kitto gave you hers.' },
];

const LOOK_ISLE = { skin: '#d8a882', hair: '#3a2a1e', eyes: '#4a5a6a' };

export const INKHOLM_CONTENT: RegionContent = {
  id: 'inkholm',
  items,
  npcs: [
    {
      id: 'hale_gull', name: 'Lettice Hale', title: 'Physician, the Collegium',
      look: { skin: '#e2b894', hair: '#6a4a2a', hairStyle: 1, eyes: '#4a5a3a', tunic: '#3a3a4a', trim: '#c8b890', trousers: '#2e2e36', boots: '#1e1a16', cape: '#2a2a36', hat: 'beret', hatColor: '#2a2a36', lashes: true, build: 0.92, age: 0.4 },
      schedule: [{ from: 0, to: 24, at: [GULL_POST[0] + 4, GULL_POST[1] + 3.5], face: [GULL_POST[0] + 8, GULL_POST[1] + 6], anim: 'idle' }],
      barks: ['Nine days without a letter.', 'Inkholm.'],
      when: (g) => !at(g, CROSS) || at(g, CROSS) === 'reuben',
    },
    {
      id: 'reuben', name: 'Reuben Hoskin', title: 'Ferryman',
      look: { ...LOOK_ISLE, hairStyle: 3, facial: 3, tunic: '#2e3a4a', trim: '#a8a090', trousers: '#2a2a30', boots: '#1e1a16', hat: 'wide', hatColor: '#2a2a2a', build: 1.08, age: 0.55 },
      schedule: [{ from: 0, to: 24, at: [GULL_POST[0] + 6.5, GULL_POST[1] + 0.5], face: [GULL_POST[0] + 3, GULL_POST[1] + 1], anim: 'idle' }],
      barks: ['Not to the Holm.', 'Weather\'s coming.'],
    },
    {
      id: 'hale_ink', name: 'Lettice Hale', title: 'Physician, the Collegium',
      look: { skin: '#e2b894', hair: '#6a4a2a', hairStyle: 1, eyes: '#4a5a3a', tunic: '#3a3a4a', trim: '#c8b890', trousers: '#2e2e36', boots: '#1e1a16', cape: '#2a2a36', hat: 'beret', hatColor: '#2a2a36', lashes: true, build: 0.92, age: 0.4 },
      schedule: [{ from: 0, to: 24, at: [G.x + 2.5, G.z + 2.7], face: [G.x - 1, G.z + 3.5], anim: 'idle' }],
      barks: ['Don\'t breathe on the samples.', 'Write it down.'],
      when: (g) => !!at(g, CROSS) && at(g, CROSS) !== 'reuben',
    },
    {
      id: 'bryony', name: 'Bryony Kitto', title: 'The last of the Reekers',
      look: { ...LOOK_ISLE, hair: '#d8d4cc', hairStyle: 2, tunic: '#4a5a3a', trim: '#8a6a3a', trousers: '#3a3428', boots: '#2a2018', apron: true, hat: 'kerchief', hatColor: '#5a3a2a', lashes: true, age: 0.92, build: 0.9, height: 0.94 },
      schedule: [{ from: 0, to: 24, at: [G.x + 10.5, G.z + 3.2], face: [G.x + 10.5, G.z + 0.5], anim: 'idle' }],
      barks: ['Shut the door.', 'Five fires.'],
    },
    {
      id: 'joss_kitto', name: 'Joss Kitto', title: 'Bryony\'s grandson',
      look: { ...LOOK_ISLE, hairStyle: 5, tunic: '#5a4a3a', trim: '#8a7a5a', trousers: '#3a3430', boots: '#2a2018', build: 0.9, age: 0.15 },
      schedule: [{ from: 0, to: 24, at: [G.x + 15.5, G.z + 2.8], face: [G.x + 16, G.z + 4.5], anim: 'idle' }],
      barks: ['Gran\'s teaching me the fires.'],
      when: (g) => cured(g),
    },
    {
      id: 'wenna_rowse', name: 'Wenna Rowse', title: 'The Staithe Inn',
      look: { ...LOOK_ISLE, hair: '#8a4a2a', hairStyle: 7, tunic: '#7a3a3a', trim: '#e0c890', trousers: '#3a2e26', boots: '#2a2018', apron: true, lashes: true, freckles: true, build: 1.05, age: 0.45 },
      schedule: [{ from: 0, to: 24, at: [G.x - 5.5, G.z + 3.3], face: [G.x - 5.5, G.z + 0.5], anim: 'idle' }],
      barks: ['We\'re open.', 'Mind the rope.'],
    },
    {
      id: 'silas', name: 'Silas Hoskin', title: 'Quay ropes',
      look: { ...LOOK_ISLE, hairStyle: 3, facial: 2, tunic: '#4a4a3a', trim: '#8a8a6a', trousers: '#2e2e28', boots: '#1e1a16', hat: 'cap', hatColor: '#3a3a3a', build: 1.05, age: 0.5 },
      schedule: [{ from: 0, to: 24, at: [G.x - 35.5, G.z + 0.5], face: [G.x - 40, G.z + 0.5], anim: 'idle' }],
      barks: ['Mind the bollards.'],
    },
    {
      id: 'vosper', name: 'Aubrey Vosper', title: 'Works manager, Harrowgate & Daughters',
      look: { skin: '#e8c4a0', hair: '#2a2a2a', hairStyle: 4, eyes: '#3a4a5a', tunic: '#2a2a32', trim: '#e0b860', trousers: '#22222a', boots: '#141210', cape: '#1e1e26', hat: 'wide', hatColor: '#1a1a1a', build: 0.95, height: 1.04, age: 0.45 },
      schedule: [{ from: 0, to: 24, at: [W.x + 7.5, W.z - 10.2], face: [W.x + 7.5, W.z - 6], anim: 'idle' }],
      barks: ['The office is closed.', 'Four grades, by the gallon.'],
      when: (g) => ledger(g) !== 'charter',
    },
  ],
  dialogue: { hale_gull: haleGull, reuben, hale_ink: haleInk, bryony, vosper, wenna_rowse: wenna, silas, joss_kitto: joss },
  quests,
  shops: {
    wenna_rowse: {
      id: 'wenna_rowse', name: 'The Staithe Inn', owner: 'wenna_rowse',
      stock: [{ item: 'bread', price: 3 }, { item: 'smoked_eel', price: 24 }, { item: 'mutton_pie', price: 11 }, { item: 'brown_ale', price: 4 }, { item: 'hollin_cider', price: 4 }],
      buyRate: () => 0.5,
      footer: () => 'Wenna pays half of an item\'s worth',
    } as ShopDef,
  },
  readables: {
    inkNotice: {
      title: 'Notice on the staithe board',
      body: 'BY ORDER OF THE CHARTER\n\nThe crossing between Gullmouth and Inkholm is stopped until further notice, on account of sickness on the island. No goods or persons to be landed.\n\nR. Tarrant, Speaker\n\nUnder it, in pencil: "Stay inside the rope. W.R."',
    },
    inkLedger: {
      title: 'Black Hythe ledger, kept by A. Vosper',
      body: 'Paid to the Holm council, compensation for disturbance: 40 marks.\n(The same line, every month since last October.)\n\nDeep Gill: broke into a warm cavity at forty fathoms. Dressed stone in its walls. Caps raised on the cavity\'s air grade first.\n\nNine men off with the cough. Shaft sealed. Second-grade caps only until further notice.\n\nA. V.',
      effect: (g) => { if (at(g, WORKS) === 'ledger') { g.give('works_ledger'); g.setStage(WORKS, 'choose'); } },
    },
    inkTomb: {
      title: 'Abbot Wystan\'s tomb',
      body: 'The slab is cracked across and pushed off the stair under it. The carving reads:\n\nWYSTAN, ABBOT OF CORRA\nWHO BURNED THE FIRST REEK\nAND WENT DOWN TO SEE IT OUT\n\nUnder it, in smaller letters cut later and less well: IF THIS STONE IS MOVED, BURN IT AGAIN.',
      effect: (g) => { if (at(g, PRIORY_Q) === 'tomb') g.setStage(PRIORY_Q, 'abbot'); },
    },
  },
  things: [
    { id: 'inkNotice', x: G.x - 3, z: G.z - 1.4, label: 'Read the notice', radius: 2.2, read: 'inkNotice' },
    { id: 'inkLedger', x: W.x + 6.5, z: W.z - 13.5, y: W.y, label: 'Look through the ledger on the desk', radius: 2.6, read: 'inkLedger', when: (g) => at(g, WORKS) === 'ledger' || !!ledger(g) },
    { id: 'inkTomb', x: PRIORY.x - 1.5, z: PRIORY.z - 5.5, label: 'Read the tomb', radius: 2.4, read: 'inkTomb' },
    ...REEKS.map((r) => ({
      id: 'reek-' + r.id, x: r.x + 2.5, z: r.z + 0.5, label: 'Light the reek-fire', radius: 2.6,
      when: (g: GameApi) => at(g, FIRES) === 'fires' && !g.flag('reekLit:' + r.id),
      use: (g: GameApi) => {
        if (!g.take('reek_bundle', 1)) { g.toast('You have no reek left. Bryony Kitto has more.'); return; }
        g.setFlag('reekLit:' + r.id, true);
        g.toast(`${r.name} is burning. The smoke is green-white and bitter, and it rolls out into the mist.`);
      },
    })),
    {
      id: 'inkBed', x: OLD_BED.x + 5.5, z: OLD_BED.z + 0.5, y: OLD_BED.y, label: 'Burn the Old Bed', radius: 3.2,
      when: (g: GameApi) => at(g, PRIORY_Q) === 'burn',
      use: (g: GameApi) => {
        if (!g.take('reek_bundle', 1)) { g.toast('You need a bundle of reek to burn it. Bryony Kitto has more.'); return; }
        g.setFlag('inkBedBurned', true);
        g.quake(0.4);
        g.toast('The reek catches. The bed blackens from the edges in, and the smoke that comes off it is grey, then white.');
        g.setStage(PRIORY_Q, 'bryony');
      },
    },
  ],
};
