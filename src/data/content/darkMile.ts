import type { DNode, DialogueTree, GameApi } from '../../game/api';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import { at, type Marks } from './kit';
import type { RegionContent } from './types';
import { TOWNS } from '../../world/morrow';

// THE DARK MILE, a side story of the Amberwold (Morrow's thinnest regions first: docs/OWED.md).
//
// West of Branchley the old road runs a mile through the oldest of the Wold, where the crowns close over and noon
// looks like dusk. Since before the Assembly the woodsfolk have kept seven posts along it smeared with tallow: at
// dusk the lamp-moths come down to the tallow and light the road gold, post to post. This autumn three posts have
// gone dark, and Gil Tanner went off the road in the black with his cart, and broke the axle and his leg.
//
// awDark (Wat Elder, the lampkeeper, at the Mile's east end; his knees won't take the walk any more):
//   'posts'  look at the three dark posts: scraped to the wood, a boot print, and at the third a tallow scraper
//            with a Callis maker's stamp on the blade, HADLEY & DAUGHTER, CHANDLERS.
//   'camp'   follow the cart ruts into a hollow off the road: Sela Hadley and her father Rob, scraping the posts
//            for the chandlery. Callis pays three times over for candles made of tallow the moths have touched:
//            they burn with a little gold in the flame, and the Assembly men's wives have taken to them. The
//            Hadleys didn't know what the tallow was for. Choose:
//              'home'  they put back what they took and go home poorer;
//              'deal'  bring them to Wat: they may scrape one post in seven, and in return they keep every post
//                      tallowed for him, which his knees can't;
//              'cut'   let them scrape and take a share of the price (the road stays dark; Wat will know).
//   'tallow' (home or deal) smear fresh tallow on the three posts; 'wat' tell Wat; at dusk the moths come back.
//            ('cut' goes straight to 'wat', who knows what you did by the dark.)
//
// Names: Wold plain and woody (Elder, Tanner); Callis town names (Hadley).

const Q = 'awDark';
const B = TOWNS.branchley;
/** The three dark posts along the Mile, east to west, and what's on each. */
const POSTS: [string, number, number, string][] = [
  ['dmPost1', B.x - 170.5, B.z + 58.5, 'The post is scraped to the bare wood, round and round, as high as a tall man reaches. A few flakes of old tallow in the moss at its foot, and a boot print: a town boot, nailed.'],
  ['dmPost2', B.x - 250.5, B.z + 82.5, 'Scraped the same, clean as a peeled stick. Cart ruts, deep and fresh, as if the cart was heavy, run on along the verge.'],
  ['dmPost3', B.x - 330.5, B.z + 100.5, 'This one half done, and the scraper left on the ground beside it: a curved blade on a short handle, stamped HADLEY & DAUGHTER, CHANDLERS, CALLIS.'],
];
const CAMP = { x: B.x - 262.5, z: B.z + 77.5 }; // (on the verge by the fourth post, the cart pulled off the road: the Wold's floor off the road is under its crowns)
const WAT = { x: B.x - 128.5, z: B.z + 40.5 };
const looked = (g: GameApi) => POSTS.filter(([id]) => g.flag(id)).length;
const tallowed = (g: GameApi) => POSTS.filter(([id]) => g.flag(id + ':t')).length;

const watNodes: Record<string, DNode> = {
  dm1: { speaker: 'narrator', text: 'An old man on a bench at the edge of the trees, a tallow pot between his boots and a stick across his knees, looking west down a road that goes dark a hundred yards in.', next: 'dm2' },
  dm2: { text: 'Wat Elder. I keep the Mile. Kept it. Seven posts, tallow on each, and the moths come down at dusk and light the road. My father kept it, and his.', next: 'dm3' },
  dm3: { text: 'Three of them have gone dark. Last week Gil Tanner came through after sundown with a load of staves and went off the road where the second post should have been. Broke his axle and his leg.', next: 'dm4' },
  dm4: {
    text: 'I can\'t walk the Mile any more. My knees. Will you go and see what\'s wrong with them? The second, the fourth and the sixth. You\'ll know them. They\'re the dark ones.',
    options: [
      { text: 'I\'ll go and look at the posts.', effect: (g) => g.setStage(Q, 'posts') },
      { text: 'Not now.' },
    ],
  },
  dmWait: { text: (g) => `West, along the road. The dark ones. ${looked(g)} of three looked at.` },
  dmCampWait: { text: 'Callis chandlers? Out here? Go and find them, then. I\'ll be on this bench. I\'m always on this bench.' },
  dmTallowWait: { text: (g) => `Here's the pot. A good thick coat, all the way round, as high as you reach. ${tallowed(g)} of three done.` },
  // Back to Wat, the posts tallowed again
  dmB1: { speaker: 'narrator', text: 'Wat is standing up, which he doesn\'t do. Down the road the light is going, and along the Mile the posts are coming alight one by one, gold, as the moths settle on them.', next: 'dmB2' },
  dmB2: {
    text: (g) => (g.flag(Q) === 'deal'
      ? 'There\'s the second. There\'s the fourth. And the Hadley girl came by this afternoon and asked me which pot was which. She\'ll do the tallow from now on, she says, and take her one post in seven. That\'s fair. That\'s more than fair.'
      : 'There\'s the second. There\'s the fourth. Seven of them, like it should be. The Hadleys went back to Callis this morning with an empty cart and long faces, and I don\'t care.'),
    next: 'dmB3',
  },
  dmB3: {
    text: 'Here. My father\'s tallow pot, and the rest of what I\'d put by. You\'ve kept the Mile. Nobody\'s kept it but an Elder for a hundred and forty years.',
    options: [{ text: 'It\'s still yours, Wat.', effect: (g) => { g.addMarks(420); g.give('moth_candle', 2); g.setStage(Q, 'done'); } }],
  },
  // Back to Wat, having taken the Hadleys' money
  dmC1: { speaker: 'narrator', text: 'Wat is on his bench, looking down the road. Past the first post the Mile is black. He doesn\'t look at you.', next: 'dmC2' },
  dmC2: {
    text: 'Gil Tanner\'s cousin came through last night. He brought a lantern, because he\'d heard. He said a Callis man on the road told him the Mile\'s spoken for now. He said it was your name the Callis man gave.',
    next: 'dmC3',
  },
  dmC3: {
    text: 'I\'ll keep the four I have. I\'ll carry the pot up myself if it kills my knees. Go on.',
    options: [{ text: 'Leave him to it.', effect: (g) => { g.setStage(Q, 'done'); } }],
  },
  dmAfter: {
    text: (g) => (g.flag(Q) === 'cut'
      ? 'Four posts. I do them myself now. It takes me all day.'
      : g.flag(Q) === 'deal'
        ? 'Seven posts lit, and Sela Hadley up and down the Mile every third day with a pot. She talks to the moths. I\'ve told her they don\'t listen. She says neither do I.'
        : 'Seven posts lit. I had Ivo Larch\'s boy carry the pot this week. He wants to keep the Mile when I\'m done. He\'s an Elder on his mother\'s side, so.'),
  },
};

const selaNodes: Record<string, DNode> = {
  ds1: { speaker: 'narrator', text: 'Off the road on the verge, a handcart half full of grey tallow cakes wrapped in leaves, and two people in town coats crouched by a small fire. The younger one is up on her feet before you\'re out of the trees.', next: 'ds2' },
  ds2: { text: 'We\'re not stealing. Nobody owns those posts. Do they? Sela Hadley. That\'s my father, Rob. We\'re from Callis. We make candles.', next: 'ds3' },
  ds3: { text: 'This tallow\'s been on the posts out here for years, and the moths have been at it. Burn a candle made from it and there\'s gold in the flame. The Assembly men\'s wives can\'t get enough. Three times what a plain candle fetches.', next: 'ds4' },
  ds4: {
    text: 'What do you mean, a man broke his leg? Because of the posts? We thought it was for the moths. We thought it was a sort of shrine. Nobody said it was the road.',
    options: [
      { text: 'Put back what you took and go home.', next: 'dsHome' },
      { text: 'Come and see Wat Elder. You can take one post in seven if you keep the rest tallowed for him.', next: 'dsDeal' },
      { text: 'Keep scraping. Give me a share of what Callis pays, and I\'ll say nothing.', next: 'dsCut' },
    ],
  },
  dsHome: {
    text: 'Back? All of it? That\'s the season. That\'s the rent. Father. Father, say something. No. You\'re right. A man broke his leg. We\'ll put it back. Here, take the pot, it\'s ours, it\'s the least.',
    options: [{ text: 'I\'ll do the posts.', effect: (g) => { g.setFlag(Q, 'home'); g.give('wold_tallow', 3); g.setStage(Q, 'tallow'); } }],
  },
  dsDeal: {
    text: 'One in seven. And keep the rest. That\'s fair. That\'s more than fair, from an old man whose road we took. Tell him we\'ll come. Here, take our pot and do the three, so he sees it done before he sees us.',
    options: [{ text: 'I\'ll do the posts.', effect: (g) => { g.setFlag(Q, 'deal'); g.give('wold_tallow', 3); g.setStage(Q, 'tallow'); } }],
  },
  dsCut: {
    text: 'You\'d do that? Father, she means it. All right. A fifth of what Callis pays, every season, left at the Post in Branchley under your name. Here\'s the first of it.',
    options: [{ text: 'Done.', effect: (g) => { g.setFlag(Q, 'cut'); g.addMarks(600); g.setStage(Q, 'wat'); } }],
  },
  dsAfter: {
    text: (g) => (g.flag(Q) === 'deal' ? 'One post in seven. I go up the Mile with the pot every third day. Father says I talk to the moths. I do.' : 'We\'re packing. Tell the old man we\'re sorry. Or don\'t. He\'d rather not hear it from us.'),
  },
};

const wat: DialogueTree = {
  start: (g) => {
    const s = at(g, Q);
    if (!s) return 'dm1';
    if (s === 'posts') return 'dmWait';
    if (s === 'camp') return 'dmCampWait';
    if (s === 'tallow') return 'dmTallowWait';
    if (s === 'wat') return g.flag(Q) === 'cut' ? 'dmC1' : 'dmB1';
    return 'dmAfter';
  },
  nodes: watNodes,
};
const sela: DialogueTree = {
  start: (g) => (at(g, Q) === 'camp' ? 'ds1' : 'dsAfter'),
  nodes: selaNodes,
};

const quests: Record<string, QuestDef> = {
  [Q]: {
    id: Q, name: 'The Dark Mile', region: 'amberwold', depth: 'quest',
    notes: (g, s) => {
      if (s === 'posts') return `West of Branchley the old road runs a mile through the deepest of the Wold, lit at dusk by lamp-moths on seven tallowed posts. Three have gone dark, and a carter broke his leg off the road. Wat Elder, the lampkeeper, can't walk it any more. (posts looked at ${looked(g)}/3)`;
      if (s === 'camp') return 'The dark posts were scraped bare, and the last had a chandler\'s scraper by it: HADLEY & DAUGHTER, CALLIS. Somebody\'s handcart is pulled off onto the verge by the fourth post.';
      if (s === 'tallow') return `The Hadleys gave up their pot. Tallow the three dark posts again. (${tallowed(g)}/3)`;
      if (s === 'wat') return g.flag(Q) === 'cut' ? 'I took the Hadleys\' money and left the Mile dark. Wat Elder will know.' : 'The three posts are tallowed. Wat Elder will want to see the Mile at dusk.';
      return g.flag(Q) === 'cut' ? 'The Hadleys scrape the Mile and pay me a fifth. Wat Elder keeps four posts himself.' : g.flag(Q) === 'deal' ? 'Sela Hadley keeps the Mile\'s posts tallowed and takes one in seven.' : 'The Hadleys went home to Callis. The Mile is lit again.';
    },
    objectives: (g, s) => (s === 'posts' ? POSTS.map(([id], i) => ({ text: `Look at the ${['second', 'fourth', 'sixth'][i]} post on the Mile`, marker: id, done: !!g.flag(id) }))
      : s === 'camp' ? [{ text: 'See whose handcart is on the verge by the fourth post', marker: 'dm_sela' }]
        : s === 'tallow' ? POSTS.map(([id], i) => ({ text: `Tallow the ${['second', 'fourth', 'sixth'][i]} post`, marker: id, done: !!g.flag(id + ':t') }))
          : s === 'wat' ? [{ text: 'Go back to Wat Elder at the Mile\'s east end', marker: 'dm_wat' }] : []),
    advance: (g, s) => (s === 'posts' && looked(g) >= 3 ? 'camp' : s === 'tallow' && tallowed(g) >= 3 ? 'wat' : null),
    marks: (_g, s): Marks => (!s ? { dm_wat: '!' } : s === 'camp' ? { dm_sela: '?' } : s === 'wat' ? { dm_wat: '?' } : {}),
    walk: { cast: ['dm_wat', 'dm_sela'] },
  },
};

const NPCS: NpcDef[] = [
  { id: 'dm_wat', name: 'Wat Elder', title: 'Lampkeeper of the Mile', land: 'morrow',
    look: { skin: '#d8b090', hair: '#e0dcd4', hairStyle: 3, beard: true, eyes: '#5a4a3a', tunic: '#5a4a2e', trim: '#8a6a3a', trousers: '#3a3428', boots: '#2a1e14', hat: 'cap', hatColor: '#4a3a24', build: 1.05, height: 0.94, age: 0.95 },
    schedule: [{ from: 0, to: 24, at: [WAT.x, WAT.z], face: [WAT.x - 6, WAT.z + 2], anim: 'idle' }], barks: ['Seven posts, there were.', 'Mind the dark past the first post.'] },
  { id: 'dm_sela', name: 'Sela Hadley', title: 'Chandler, of Callis', land: 'morrow', when: (g) => !!at(g, Q) && at(g, Q) !== 'posts' && g.flag(Q) !== 'home',
    look: { frame: 'f', skin: '#c89878', hair: '#3a2418', hairStyle: 6, eyes: '#4a3a2a', tunic: '#6a3a3a', trim: '#c8a868', trousers: '#3a3a40', boots: '#2a2018', apron: true, lashes: true, build: 0.92, height: 0.96, age: 0.25 },
    schedule: [{ from: 0, to: 24, at: [CAMP.x, CAMP.z], face: [CAMP.x + 3, CAMP.z + 4], anim: 'idle' }], barks: ['Nobody owns those posts.', 'Gold in the flame. You should see it.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'wold_tallow', name: 'Pot of post tallow', kind: 'material', rarity: 'common', stack: true, value: 0, icon: { shape: 'jar', a: '#d8d0b8', b: '#6a5a3a' },
    desc: 'Rendered mutton fat in a clay pot, thick and grey, with a smell the lamp-moths can find a mile off.', stats: 'For the posts on the Dark Mile.' },
  { id: 'moth_candle', name: 'Mothlight candle', kind: 'collectible', rarity: 'uncommon', stack: true, value: 18, icon: { shape: 'bag', a: '#e8d8a0', b: '#c89030' },
    desc: 'A plain tallow candle that burns with a thread of gold in the flame. Wat Elder\'s father made a box of them, the year the moths were thickest, and Wat never lit one.' },
];

export const DARK_MILE_CONTENT: RegionContent = {
  id: 'darkMile', quests, items: ITEMS, npcs: NPCS,
  dialogue: { dm_wat: wat, dm_sela: sela },
  things: [
    ...POSTS.map(([id, x, z, text]) => ({
      land: 'morrow' as const, id, x, z, label: 'Look at the dark post', radius: 2.4,
      when: (g: GameApi) => at(g, Q) === 'posts' && !g.flag(id),
      use: (g: GameApi) => { g.setFlag(id, 1); g.toast(text); if (looked(g) >= 3) g.setStage(Q, 'camp'); },
    })),
    ...POSTS.map(([id, x, z], i) => ({
      land: 'morrow' as const, id: id + 't', x, z, label: 'Tallow the post', radius: 2.4,
      when: (g: GameApi) => at(g, Q) === 'tallow' && !g.flag(id + ':t'),
      use: (g: GameApi) => {
        g.setFlag(id + ':t', 1); g.take('wold_tallow', 1);
        g.toast(['You work the tallow into the wood all the way round, thick, as high as you reach. It smells like a sheep\'s winter.', 'A good coat, the way Wat said. Somewhere up in the dark crowns something small and pale stirs.', 'The last of the pot. By the time you have wiped your hands, two moths have come down out of the dark and settled on the post, glowing faintly gold.'][i]);
        if (tallowed(g) >= 3) g.setStage(Q, 'wat');
      },
    })),
  ],
};
