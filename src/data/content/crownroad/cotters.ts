import type { DialogueTree } from '../../../game/api';
import { at, type Marks } from '../kit';
import type { RegionContent } from '../types';

// Cotter's End, the carters' hamlet west of Ansbury, and Davy Tannet at the Waystation.
// THE COMPANY CART (storyline, three quests): Bel Tannet's letter, Davy's cracked axle, and his
//   thirty-four marks on the company slate. davyChoice = 'cart' | 'stay' | 'walk'.
// HARNESS LEATHER (short): boar hides for Bel.
// SPOKES (short): birch for the Charter Post's new wheels.

const TAN1 = 'crTan1', TAN2 = 'crTan2', TAN3 = 'crTan3', HIDES = 'crHides', SPOKES = 'crSpokes';

const bel: DialogueTree = {
  start: (g) => {
    if (!at(g, TAN1)) return 'b1';
    if (at(g, TAN3) === 'bel') {
      const p = g.flag('crDavyPlan');
      return p === 'cart' ? 'bt1' : p === 'stay' ? 'bs1' : 'bw1';
    }
    if (at(g, HIDES) === 'hides' && g.count('boar_hide') >= 3) return 'h3';
    return 'main';
  },
  nodes: {
    main: {
      text: (g) => {
        const c = g.flag('davyChoice');
        if (c === 'cart') return 'One cart, two Tannets, and Hob talking the whole road. Garth gloats about the other cart. Let him.';
        if (c === 'stay') return 'A letter every firstday. Twenty marks to go on the slate. He spells "slate" with two Ts.';
        if (c === 'walk') return 'Pryce\'s bill came. Hob framed it. Harrowgate doesn\'t hire Cotter\'s End carts now. We\'ll manage.';
        if (at(g, TAN1) && at(g, TAN1) !== 'done') return 'Davy, at the Waystation. Company carts stop there every firstday.';
        return 'Cotter\'s End. Four houses, a well, and more carts than people.';
      },
      options: [
        { text: 'Need anything?', next: 'h1', cond: (g) => !at(g, HIDES) },
        { text: 'Bye.' },
      ],
    },
    b1: { text: 'If you\'re going south, you\'ll pass the Waystation. Will you take a letter?', next: 'b2' },
    b2: { text: 'Our Davy drives company carts for Harrowgate now. Two marks a day. Hob paid him in barley and opinions.', next: 'b3' },
    b3: {
      text: 'He hasn\'t written since midsummer. Company carts stop at the Waystation every firstday. Give him this.',
      options: [{ text: 'I\'ll take it.', next: 'b4' }, { text: 'Not today.' }],
    },
    b4: {
      text: 'Tell him his dad\'s fine. His dad isn\'t fine. Tell him anyway.',
      effect: (g) => { g.give('bel_letter'); g.setStage(TAN1, 'davy'); },
    },
    // Company time: Bel's answer
    bt1: { text: 'Sell the spare cart.', next: 'bt2' },
    bt2: { speaker: 'narrator', text: 'She looks out at the spare cart in the lane. You can watch her pricing it, and not liking the price.', next: 'bt3' },
    bt3: { text: 'Garth\'s wanted that cart for three years. He\'ll give thirty-four and gloat for nothing.', next: 'bt4' },
    bt4: {
      text: 'Tell Davy to come home. I\'ll tell Hob. Hob can be cross with me. He\'s had practice.',
      effect: (g) => { g.setFlag('davyChoice', 'cart'); g.addMarks(20); g.setStage(TAN3, 'done'); },
    },
    bs1: { text: 'He\'s staying, then.', options: [{ text: 'Give her Davy\'s letter.', next: 'bs2' }] },
    bs2: { speaker: 'narrator', text: 'She reads it at the door, then again inside, where you can\'t see her.', next: 'bs3' },
    bs3: { text: 'Every firstday, he says. That\'s a long slate. But it\'s his slate.', next: 'bs4' },
    bs4: {
      text: 'Here. I\'d been saving it for his boots. He\'s got boots. That\'s the trouble.',
      effect: (g) => { g.take('davy_letter'); g.setFlag('davyChoice', 'stay'); g.addMarks(20); g.setStage(TAN3, 'done'); },
    },
    bw1: { text: 'He\'s walking home.', next: 'bw2' },
    bw2: { text: 'And Harrowgate will bill Hob, and stop hiring Cotter\'s End carts, and Hob will say it was worth it.', next: 'bw3' },
    bw3: {
      text: 'It was worth it. Don\'t tell Hob I said so.',
      effect: (g) => { g.setFlag('davyChoice', 'walk'); g.addMarks(20); g.setStage(TAN3, 'done'); },
    },
    // Harness leather
    h1: { text: 'Harness. Tanners\' Row wants a mark a strap since the Weighhouse business. Everyone in Ansbury wants a mark for something.', next: 'h2' },
    h2: {
      text: 'Bring me three boar hides and I\'ll cure my own. The boars are in everybody\'s barley this year.',
      options: [{ text: 'Three hides. All right.', next: 'h2b' }, { text: 'Not now.' }],
    },
    h2b: { text: 'Not hacked about, if you can help it. I\'m making harness, not a quilt.', effect: (g) => g.setStage(HIDES, 'hides') },
    h3: { text: 'Three hides.', options: [{ text: 'Hand them over.', next: 'h4' }] },
    h4: {
      text: 'Good ones. Here. When Hob\'s harness doesn\'t snap on the Weighhouse hill, I\'ll take the credit.',
      effect: (g) => { g.take('boar_hide', 3); g.addMarks(15); g.setStage(HIDES, 'done'); },
    },
  },
};

const garth: DialogueTree = {
  start: (g) => {
    if (at(g, TAN2) === 'garth') return g.count('oak_logs') >= 4 ? 'ga3' : 'ga1';
    if (at(g, SPOKES) === 'birch') return g.count('birch_logs') >= 4 ? 's3' : 'sWait';
    return 'main';
  },
  nodes: {
    main: {
      text: (g) => {
        if (g.flag('davyChoice') === 'cart') return 'Thirty-four marks for the Tannets\' spare cart. Robbery. I\'d have paid forty.';
        if (at(g, SPOKES) === 'done') return 'Bess Tull\'s new wheels. She\'ll complain about them. That\'s how I\'ll know she\'s using them.';
        return 'Wheels, axles, felloes. Straight grain or nothing.';
      },
      options: [
        { text: 'Busy?', next: 's1', cond: (g) => !at(g, SPOKES) },
        { text: 'Bye.' },
      ],
    },
    ga1: { text: 'Davy Tannet\'s axle. He owes me two marks and an apology, and I\'ll take the apology.', next: 'ga2' },
    ga2: { text: 'Axle wants oak. Four good logs, straight. I\'m not cutting into my own stack for a Harrowgate cart.' },
    ga3: { text: 'Four. Straight enough.', options: [{ text: 'Hand over the logs.', next: 'ga4' }] },
    ga4: { speaker: 'narrator', text: 'He sights along each log, rejects none of them, and is at the first with a drawknife before you\'ve put the rest down.', next: 'ga5' },
    ga5: {
      text: 'There. It\'s a company cart, so it\'s a company axle. I\'ve charged the company twice.',
      effect: (g) => { g.take('oak_logs', 4); g.give('cart_axle'); g.setStage(TAN2, 'axle'); },
    },
    s1: { text: 'The Charter Post wants new wheels by Michaelmas. Bess Tull\'s. She drives like the road owes her money.', next: 's2' },
    s2: {
      text: 'Spokes are birch. Four logs. I can\'t leave the bench to cut them.',
      options: [{ text: 'I\'ll bring four.', next: 's2b' }, { text: 'Not now.' }],
    },
    s2b: { text: 'Birch. Not oak. Oak\'s for axles and argument.', effect: (g) => g.setStage(SPOKES, 'birch') },
    sWait: { text: 'Four birch, for spokes.' },
    s3: { text: 'Four birch.', options: [{ text: 'Hand over the logs.', next: 's4' }] },
    s4: {
      text: 'Bess will complain about these too. Here, and thank you. My back thanks you more.',
      effect: (g) => { g.take('birch_logs', 4); g.addMarks(12); g.setStage(SPOKES, 'done'); },
    },
  },
};

const davy: DialogueTree = {
  start: (g) => {
    if (at(g, TAN1) === 'davy') return 'v1';
    if (at(g, TAN2) === 'garth') return 'vWait';
    if (at(g, TAN2) === 'axle') return g.has('cart_axle') ? 'v10' : 'vWait';
    if (at(g, TAN3) === 'davy') return 'v20';
    if (at(g, TAN3) === 'bel') return 'v30';
    return 'main';
  },
  nodes: {
    main: {
      text: (g) => (g.flag('davyChoice') === 'stay'
        ? 'Firstday. I write on firstday. Twenty marks to go, and I\'ve started a second letter by mistake.'
        : 'Company cart. Company horse. Company driver. The slate says so.'),
    },
    v1: { text: 'Is that my mam\'s writing? It is. She does a D like a pair of bellows.', options: [{ text: 'Give him the letter.', next: 'v2' }] },
    v2: { speaker: 'narrator', text: 'He reads it fast, then slower, then folds it smaller than it needs to be.', next: 'v3' },
    v3: { text: 'Tell her I\'m well. I\'m stuck, is what I am. Axle cracked on the hill out of Ansbury.', next: 'v4' },
    v4: {
      text: 'Company docks me a day for every day the cart sits. Garth Mallow turns axles, at Cotter\'s End. I owe him two marks already.',
      effect: (g) => { g.take('bel_letter'); g.setStage(TAN1, 'done'); },
    },
    vWait: { text: 'Garth Mallow. Cotter\'s End. Tell him I\'m sorry about the two marks. Don\'t tell him I said "sorry".' },
    v10: { text: 'Is that an axle? That\'s an axle.', options: [{ text: 'Give him the axle.', next: 'v11' }] },
    v11: { speaker: 'narrator', text: 'He has the wheel off and the old axle out before you\'ve got your breath back. He\'s good at this.', next: 'v12' },
    v12: { text: 'There. Rolling. So now I can go back to owing them.', next: 'v13' },
    v13: { text: 'She wants me home. I can\'t come home. I owe the company store thirty-four marks.', next: 'v14' },
    v14: {
      text: 'Boots, a coat, board here on firstdays, a fine for a late load. It\'s on the slate. They take it out of my pay before I see it.',
      effect: (g) => { g.take('cart_axle'); g.setStage(TAN2, 'done'); },
    },
    v20: {
      text: 'What would you do?',
      options: [
        { text: 'Your father could sell the spare cart. It would clear the slate.', next: 'vC' },
        { text: 'Work it off. Write to your mother every week.', next: 'vS' },
        { text: 'Walk away. The company can chase its own slate.', next: 'vW' },
      ],
    },
    vC: { text: 'He would. That\'s why I didn\'t ask him.', next: 'vC2' },
    vC2: {
      text: 'Ask my mam, then. If she says yes, I\'ll come home. She won\'t say yes.',
      effect: (g) => { g.setFlag('crDavyPlan', 'cart'); g.setStage(TAN3, 'bel'); },
    },
    vS: { text: 'Every week. I can do every week.', next: 'vS2' },
    vS2: { speaker: 'narrator', text: 'He writes on the back of her letter with a carpenter\'s pencil, slowly, tongue between his teeth.', next: 'vS3' },
    vS3: {
      text: 'Take her that. Tell her firstday.',
      effect: (g) => { g.give('davy_letter'); g.setFlag('crDavyPlan', 'stay'); g.setStage(TAN3, 'bel'); },
    },
    vW: { text: 'Walk.', next: 'vW2' },
    vW2: { text: 'They\'ll send the bill to my dad. Pryce sends bills to dads. He likes dads. Dads pay.', next: 'vW3' },
    vW3: {
      text: 'Fine. I\'ll walk. Tell Mam I\'ll be home by fifthday.',
      effect: (g) => { g.setFlag('crDavyPlan', 'walk'); g.setStage(TAN3, 'bel'); },
    },
    v30: { text: 'Have you told her yet? Go on. I\'m not going anywhere. That\'s the whole problem.' },
  },
};

const davyHome: DialogueTree = {
  start: () => 'main',
  nodes: {
    main: {
      text: (g) => (g.flag('davyChoice') === 'cart'
        ? 'Home. Me and Dad on one cart. He talks the whole road. I\'d forgotten he does that.'
        : 'Home. Pryce\'s bill came. Dad framed it. Says it\'s the dearest thing in the house.'),
    },
  },
};

export const CR_COTTERS: RegionContent = {
  id: 'crownroad-cotters',
  dialogue: { bel, garth, davy, davyHome },
  items: [
    { id: 'bel_letter', name: 'Letter for Davy Tannet', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bread', a: '#efe6cf' }, desc: 'From Cotter\'s End, in a hand that does its Ds like bellows. Three pages. Feels like four.' },
    { id: 'cart_axle', name: 'Cart axle', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'log', a: '#a8844a', b: '#6a4a2a' }, desc: 'Oak, turned and tapered by Garth Mallow. Charged to Harrowgate & Daughters, twice.' },
    { id: 'davy_letter', name: 'Davy\'s reply', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bread', a: '#efe6cf' }, desc: 'Written in carpenter\'s pencil on the back of his mother\'s letter. "Firstday" is underlined.' },
  ],
  quests: {
    [TAN1]: {
      id: TAN1, name: 'A Letter for Davy', region: 'crownroad', depth: 'storyline', next: [TAN2, 'garth'],
      notes: (_g, s) => (s === 'davy'
        ? 'Bel Tannet\'s son Davy drives company carts for Harrowgate & Daughters and hasn\'t written since midsummer. She gave me a letter for him. Company carts stop at the Waystation.'
        : 'Davy Tannet is stuck at the Waystation with a cracked axle, and the company docks him a day for every day the cart sits.'),
      objectives: (_g, s) => (s === 'davy' ? [{ text: 'Give Davy Tannet his mother\'s letter at the Waystation', marker: 'davy' }] : []),
      marks: (_g, s): Marks => (!s ? { bel: '!' } : s === 'davy' ? { davy: '?' } : {}),
    },
    [TAN2]: {
      id: TAN2, name: 'Cracked Axle', region: 'crownroad', depth: 'storyline', next: [TAN3, 'davy'],
      notes: (_g, s) => {
        if (s === 'garth') return 'Davy\'s axle cracked on the hill out of Ansbury. Garth Mallow at Cotter\'s End turns axles, but Davy owes him two marks. Garth will want oak.';
        if (s === 'axle') return 'Garth turned Davy an oak axle and charged the company twice.';
        return 'Davy\'s cart is rolling again. He owes the company store thirty-four marks, and they take it out of his pay before he sees it.';
      },
      objectives: (g, s) => {
        if (s === 'garth') return [{ text: `Bring Garth Mallow oak logs (${Math.min(4, g.count('oak_logs'))}/4)`, marker: 'garth', done: g.count('oak_logs') >= 4 }];
        if (s === 'axle') return [{ text: 'Take the axle to Davy at the Waystation', marker: 'davy' }];
        return [];
      },
      marks: (g, s): Marks => (s === 'garth' ? { garth: g.count('oak_logs') >= 4 ? '?' : '!' } : s === 'axle' ? { davy: '?' } : {}),
      walk: { obtain: { garth: [['oak_logs', 4]] }, from: { quests: { crTan1: 'done', crTan2: 'garth' } } },
    },
    [TAN3]: {
      id: TAN3, name: 'Company Time', region: 'crownroad', depth: 'storyline',
      notes: (g, s) => {
        if (s === 'davy') return 'Davy won\'t come home owing the company thirty-four marks. He asked me what I\'d do.';
        if (s === 'bel') {
          const p = g.flag('crDavyPlan');
          if (p === 'cart') return 'Davy will come home if Bel agrees to sell the Tannets\' spare cart to clear his slate.';
          if (p === 'stay') return 'Davy will stay and work off the slate, and write home every firstday. He gave me a letter for Bel.';
          return 'Davy is walking home and leaving the company its slate. They\'ll bill Hob. Bel should know.';
        }
        const c = g.flag('davyChoice');
        if (c === 'cart') return 'Bel sold the spare cart to Garth Mallow for thirty-four marks. Davy is home, driving with his father.';
        if (c === 'stay') return 'Davy is working off his slate at the Waystation, and writes to his mother every firstday.';
        return 'Davy walked home. Pryce billed Hob, and Harrowgate stopped hiring Cotter\'s End carts. Hob framed the bill.';
      },
      objectives: (_g, s) => {
        if (s === 'davy') return [{ text: 'Talk to Davy Tannet', marker: 'davy' }];
        if (s === 'bel') return [{ text: 'Go to Bel Tannet at Cotter\'s End', marker: 'bel' }];
        return [];
      },
      marks: (_g, s): Marks => (s === 'davy' ? { davy: '?' } : s === 'bel' ? { bel: '?' } : {}),
      walk: { from: { quests: { crTan1: 'done', crTan2: 'done', crTan3: 'davy' } } },
    },
    [HIDES]: {
      id: HIDES, name: 'Harness Leather', region: 'crownroad', depth: 'short',
      notes: (_g, s) => (s === 'hides'
        ? 'Bel Tannet will cure her own harness leather rather than pay Tanners\' Row a mark a strap. She wants three boar hides.'
        : 'Bel Tannet has her boar hides. She says she\'ll take the credit when the harness holds.'),
      objectives: (g, s) => (s === 'hides' ? [{ text: `Bring Bel Tannet boar hides (${Math.min(3, g.count('boar_hide'))}/3)`, marker: 'bel', done: g.count('boar_hide') >= 3 }] : []),
      marks: (g, s): Marks => (!s && at(g, TAN1) ? { bel: '!' } : s === 'hides' && g.count('boar_hide') >= 3 ? { bel: '?' } : {}),
      walk: { obtain: { hides: [['boar_hide', 3]] }, from: { quests: { crTan1: 'davy' } } },
    },
    [SPOKES]: {
      id: SPOKES, name: 'Spokes', region: 'crownroad', depth: 'short',
      notes: (_g, s) => (s === 'birch'
        ? 'Garth Mallow is building new wheels for Bess Tull\'s Charter Post cart and needs four birch logs for spokes.'
        : 'Garth has his birch for Bess Tull\'s wheels. He expects her to complain about them.'),
      objectives: (g, s) => (s === 'birch' ? [{ text: `Bring Garth Mallow birch logs (${Math.min(4, g.count('birch_logs'))}/4)`, marker: 'garth', done: g.count('birch_logs') >= 4 }] : []),
      marks: (g, s): Marks => (!s ? { garth: '!' } : s === 'birch' && g.count('birch_logs') >= 4 ? { garth: '?' } : {}),
      walk: { obtain: { birch: [['birch_logs', 4]] } },
    },
  },
};
