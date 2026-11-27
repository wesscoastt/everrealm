import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';
import { BIGHT, BIGHT_BOAT, MORROW_OX, SALT_COCKPIT, SALT_FLOOR, SALT_HULLS, SALT_PIERS, SALTPENNY } from '../../world/morrow';

// UNDER THE BLACK FLAG: the Brethren of Saltpenny's storyline (owner 2026-11-26: "i want a small dlc sized pirate
// storyline in the pirate area with pirate rewards etc"; docs/briefs/pirate-storyline.md). The Brethren are a faction
// (data/factions.ts): Hand, Able Hand, Bosun, Quartermaster, Captain, and the title Captain of the Brethren.
//
// The Brethren carry anything that pays more untaxed, and they keep articles: quarter is always given, the black flag is
// never flown, a prize is shared by shares, and a quarrel between captains goes to the Cockpit. Captain Hal Sorrel of
// the Grey Lady has torn his up. He flies the black at Brethren hulls that won't pay him a tenth of every cargo, and
// leaves no one alive to say who did it, so the Table blames the Assembly's revenue and nobody looks at him.
//
// I, SIGN THE ARTICLES (bfArticles; Bess Merrin, after The Admiral): the Fair Exchange is a hand short. Sign the articles
//   in the book at the Captains' Table, before Ned Vey, and report to Nan Gilly, her quartermaster. Hand.
// II, NO QUARTER (bfMary): the Mary Clare came in on the tide to the Bight with her crew dead on her deck and a black
//   flag nailed to her mast. The wreckers are stripping her. Drive them off and look her over: the flag, the log's last
//   page ("grey hull, no colours, came up out of the sun"), and her hold empty. Back to Bess. Able Hand; the slops of a
//   Brethren hand.
// III, THE GREY LADY (bfLady): the Mary's cargo was Callis red, forty casks, and Gil Fenner's tally-boy Pip Rudd says
//   forty casks came into Low Tide off the Swallow. Jory Quick carried them for a man who paid double and wouldn't give
//   his name, but Jory knows the Grey Lady's lines when he sees them. She lies off Smoke Key. Her crew camp in the lee
//   of the beacon hill: break them and take Sorrel's articles off his table, his own, written out fair: "A tenth of
//   every cargo, or the black." Bosun.
// IV, MAROONED (bfMaroon): Nan Gilly says Bess wants you on the Spit, the sandbank north of Gallows Key, at dusk, to
//   meet a Grey Lady man who wants to turn. Nobody turns. Sorrel's men are waiting, and Nan rows away with the boat.
//   Fight them off, and in the dead bosun's coat find Sorrel's silver with Nan's name on the purse. Light a fire of
//   driftwood on the Spit for Bess to see. Quartermaster, in Nan's place.
// V, THE CAPTAIN'S VOTE (bfVote): Sorrel comes into Saltpenny under a truce flag, with Nan at his shoulder, and asks
//   the Table for a seat and a tenth of the Key. Lay his articles on the Table; he says the Table hasn't the stomach to
//   stop him, and the articles say a quarrel between captains goes to the Cockpit. Beat him there. Then the Table
//   judges him by the articles: hang him at Gallows Key ('gallows'); maroon him on the Spit with a bottle of water and
//   a pistol with one shot, as the articles say ('marooned'); or ([Kind]) let Hob Merrick take him to work the Careen
//   with the crews the Table cast out ('careen'). Bess gives you the Fair Exchange. Captain, and the coat.
// bfSorrel = 'gallows' | 'marooned' | 'careen'.

const ART = 'bfArticles', MARY = 'bfMary', LADY = 'bfLady', MAROON = 'bfMaroon', VOTE = 'bfVote';
const F = SALT_FLOOR, H = SALT_HULLS, SX = SALTPENNY.x;
const zc = (h: { z: number }) => h.z + 0.5;
const BESS = { x: SX - 128.5, z: SALT_PIERS[0] + 0.5 };
const NAN = { x: SX - 134.5, z: SALT_PIERS[0] + 0.5 };
const BOOK = { x: H.table.x + 9.5, z: zc(H.table) + 1.5 };
const PIP = { x: H.lowtide.x + 9.5, z: zc(H.lowtide) + 2.4 };
const WRECKERS: [number, number][] = [[BIGHT.x + 5, BIGHT.z - 3], [BIGHT.x - 4, BIGHT.z + 4], [BIGHT.x + 9, BIGHT.z + 2]];
const MARY_THINGS: [number, number, string][] = [[BIGHT_BOAT.x - 1.5, BIGHT_BOAT.z - 1.5, 'cloth'], [BIGHT_BOAT.x + 1.5, BIGHT_BOAT.z + 1.5, 'letter']];
const SMOKE_CAMP = { x: MORROW_OX - 2100, z: 3645 };
const CAMP_CREW: [number, number][] = [[SMOKE_CAMP.x + 4, SMOKE_CAMP.z + 3], [SMOKE_CAMP.x - 4, SMOKE_CAMP.z + 2], [SMOKE_CAMP.x, SMOKE_CAMP.z - 4]];
const SPIT = { x: MORROW_OX - 1930, z: 3675 };
const SPIT_CREW: [number, number][] = [[SPIT.x + 4, SPIT.z + 3], [SPIT.x - 3, SPIT.z + 5], [SPIT.x + 2, SPIT.z - 4]];
const COCKPIT: [number, number][] = [[SALT_COCKPIT.x + 0.5, SALT_COCKPIT.z + 0.5]];

const searched = (g: GameApi) => MARY_THINGS.filter((_, i) => g.flag('bfMary' + i)).length;
const rank = (g: GameApi, r: number) => { const cur = g.flag('fac:brethren'); if (typeof cur !== 'number' || cur < r) g.setFlag('fac:brethren', r); };

// ================================================================ Bess Merrin

const bessNodes: Record<string, DNode> = {
  a1: { text: 'You found my Admiral. I don\'t forget a thing like that. And the Fair Exchange is a hand short: Davy Rowe went ashore at Callis and found a wife, the fool.', next: 'a2' },
  a2: { text: 'The Brethren aren\'t a navy. Nobody makes you come. But you sail with us, you sign the articles, and you keep them, and the articles keep you.', next: 'a3' },
  a3: { text: 'Quarter\'s always given. The black flag\'s never flown. A prize is shared by shares, the captain two, the quartermaster one and a half, every hand one. A quarrel between captains goes to the Cockpit, and nowhere else.', next: 'a4' },
  a4: {
    text: 'The book\'s at the Captains\' Table. Ned Vey will watch you sign. Then report to Nan Gilly, my quartermaster, on this pier. Well?',
    options: [{ text: 'I\'ll sign.', effect: (g) => g.setStage(ART, 'book') }, { text: 'Not now.' }],
  },
  aW: { text: (g) => (at(g, ART) === 'book' ? 'The book\'s on the Table, in the Captains\' Table hull. Sign where Ned points.' : 'Nan\'s just along the pier. She\'ll find you a hammock that doesn\'t leak much.') },
  m1: { text: 'You\'ve seen her? The Mary Clare? And the flag?', next: 'm2' },
  m2: { text: 'Black. On a Brethren hull. No quarter, and nobody left to say whose. The Table will say it\'s the Assembly\'s revenue again, and it isn\'t. The revenue hangs a crew. It doesn\'t leave them on the deck.', next: 'm3' },
  m3: { text: 'You did well. Here: slops of your own, so the Key knows you\'re Brethren. You\'re an able hand now. Don\'t let it go to your head. It went to Davy Rowe\'s, and look at him. Married.', effect: (g) => { g.take('bf_logpage', 1); g.give('costume_brethren_hand', 1); g.addMarks(150); rank(g, 1); g.setStage(MARY, 'done'); } },
  l1: { text: 'The Grey Lady. Hal Sorrel. I sailed with Hal, twenty years back, when we were both hands. He always said the Table was soft. I never thought he\'d write it down.', next: 'l2' },
  l2: { text: 'A tenth of every cargo, or the black. Every hull on the Key, paying Sorrel, and the ones that don\'t, the Mary Clare.', next: 'l3' },
  l3: { text: 'This goes to the Table. Not yet. Hal\'s got friends, and I want to know who they are before I lay this down. Bosun. That\'s what you are now. Keep your eyes open.', effect: (g) => { g.give('bf_sorrels_articles', 1); g.addMarks(200); rank(g, 2); g.setStage(LADY, 'done'); } },
  r1: { speaker: 'narrator', text: 'Bess Merrin hears it all on the end of the pier with the Admiral on her shoulder. When you show her the purse with Nan\'s name stitched in it, she closes her hand over it and doesn\'t open it again for a long time.', next: 'r2' },
  r2: { text: 'Nan. Eleven years. She stood by me in a gale off the Teeth with the mast coming down. For Hal\'s silver.', next: 'r3' },
  r3: { text: 'Well. A ship needs a quartermaster, and you\'re the one I\'d trust to share a prize. Quartermaster of the Fair Exchange. One share and a half. Now let\'s go and spoil Hal\'s evening.', effect: (g) => { g.take('bf_nans_purse', 1); g.addMarks(250); rank(g, 3); g.setStage(MAROON, 'done'); } },
  bv1: { text: 'He\'s here. Hal Sorrel, in the Key, under a truce flag, with forty guns sitting off the Spit. And Nan at his elbow, as bold as paint. He wants a seat at the Table and a tenth of everything that comes over the Key.', next: 'bv2' },
  bv2: { text: 'The Table\'s frightened. Ned Vey\'s frightened, and Ned\'s never frightened. Lay Hal\'s articles on the Table, and say what you saw on the Mary Clare. Then we\'ll see what Hal has the stomach for.', effect: (g) => g.setStage(VOTE, 'table') },
  bvW: { text: (g) => (at(g, VOTE) === 'table' ? 'The Captains\' Table. Lay it down. Say it loud.' : at(g, VOTE) === 'cockpit' ? 'The Cockpit. Hal\'s waiting. Don\'t fight fair. He won\'t.' : 'Ned has him in irons. The Table wants your word on him. You\'re the one he marooned.') },
  bvEnd: {
    text: (g) => {
      const f = g.flag('bfSorrel');
      return `${f === 'gallows' ? 'Gallows Key, at dawn. The Table watched. I didn\'t.' : f === 'marooned' ? 'The Spit, with a bottle and one shot. The articles\' own way. If the tide\'s kind, he\'ll think about it a long time.' : 'Hob Merrick\'s got him scraping keels on the Careen with the men the Table threw out. Hal will hate every day of it. Good.'} Now: I\'m sixty-one, and the Fair Exchange wants a captain with knees. The Table\'s voted. She\'s yours.`;
    },
    next: 'bvEnd2',
  },
  bvEnd2: { text: 'Captain. Of the Fair Exchange, and of the Brethren. Here: a captain\'s coat. Mine, when I was your age, and still a better fit on you. The Admiral stays with me. She\'s retired too.', effect: (g) => { g.give('costume_brethren_captain', 1); g.addMarks(500); rank(g, 4); g.setStage(VOTE, 'done'); } },
  bAfter: { text: 'Captain. Come and sit on the pier with an old woman and her cat when the sea lets you.' },
};

const nanNodes: Record<string, DNode> = {
  n0: { text: 'Nan Gilly, quartermaster, the Fair Exchange. If you\'ve signed, I\'ve a hammock for you. If you haven\'t, I haven\'t.' },
  n1: { text: 'Signed? Ned saw you? Good. Welcome aboard, hand. Your hammock\'s the one under the leak. Everybody starts under the leak.', effect: (g) => { g.give('bf_articles', 1); g.addMarks(80); rank(g, 0); g.setStage(ART, 'done'); } },
  nm1: { text: 'Word came in on the tide: the Mary Clare\'s drifted into the Bight with nobody at the helm, and the Key wreckers are already at her. Bess wants a hand out there before they strip her to the ribs. That\'s you.', effect: (g) => g.setStage(MARY, 'bight') },
  nl1: { text: 'Bess wants to know where the Mary\'s forty casks went. Callis red doesn\'t vanish. Ask at Low Tide; Gil Fenner buys what nobody else will, and his tally-boy Pip can be bought for less.', effect: (g) => g.setStage(LADY, 'pip') },
  nr1: { text: 'There\'s a Grey Lady man wants to turn. He\'ll meet one of ours on the Spit, the sandbank north of Gallows Key, at dusk, alone. Bess wants it to be you. I\'ll row you out.', effect: (g) => g.setStage(MAROON, 'spit') },
};

// ================================================================ The others

const pip: DialogueTree = {
  start: (g) => (at(g, LADY) === 'pip' ? 'p1' : 'p0'),
  nodes: {
    p0: { text: 'Pip Rudd. I count for Mr Fenner. Count, not talk.' },
    p1: { text: 'Forty casks of Callis red? I might have counted forty casks. A mark helps me remember.', next: 'p2' },
    p2: { text: 'Forty casks, off the Swallow, three nights back. Mr Fenner paid a third of what they\'re worth. Jory Quick carried them. Jory always looks guilty, so you can\'t tell if he is.', effect: (g) => g.setStage(LADY, 'jory') },
  },
};

const joryNodes: Record<string, DNode> = {
  jl1: { text: 'The forty casks? I carried them. I didn\'t ask. A man paid double and wouldn\'t give his name, and I\'m not a man who asks a man who pays double.', next: 'jl2' },
  jl2: { text: 'But I know a hull when I see one, and the boat that brought them out to me came off a grey ship with no colours, lying off Smoke Key. The Grey Lady. Hal Sorrel\'s. His men camp in the lee of the beacon hill.', next: 'jl3' },
  jl3: { text: 'Don\'t tell him I told you. Or do. He doesn\'t frighten me. He frightens me a great deal.', effect: (g) => g.setStage(LADY, 'camp') },
};

const nedNodes: Record<string, DNode> = {
  nv1: { speaker: 'narrator', text: 'You lay Sorrel\'s articles on the Captains\' Table, and the Mary Clare\'s flag beside them. Twenty captains go quiet. Hal Sorrel, at the foot of the Table, smiles.', next: 'nv2' },
  nv2: { text: 'Hal Sorrel: My articles. Yes. Written fair. A tenth, or the black. And what will the Table do? Vote? The Table hasn\'t the stomach to stop me, and every captain here knows it.', next: 'nv3' },
  nv3: { text: 'Ned Vey: The articles say a quarrel between captains goes to the Cockpit. You\'ve a quarrel with the Fair Exchange, Hal. The Fair Exchange has picked who stands for her.', effect: (g) => g.setStage(VOTE, 'cockpit') },
  nj1: { text: 'Hal Sorrel\'s on his back in the Cockpit sand and the Key saw it. The Table judges him by the articles, and the articles leave the how to the one he wronged. That\'s you, for the Spit.', next: 'nj2' },
  nj2: {
    text: 'What\'s it to be?',
    options: [
      { text: 'Gallows Key, at dawn. He hanged a crew on their own deck. He can hang on ours.', moral: { id: 'bfSorrel:gallows', a: -1, tr: { cruelty: 2, courage: 1 }, rep: { brethren: 6 }, npc: { ned_vey: 5, sp_bess: 0 }, note: 'Had Hal Sorrel hanged on Gallows Key by the Brethren\'s articles.', fame: 'brought Hal Sorrel to the Gallows', spread: 'local' }, effect: (g) => { g.setFlag('bfSorrel', 'gallows'); g.setStage(VOTE, 'bess'); }, next: 'njG' },
      { text: 'The articles\' own way. The Spit, a bottle of water and a pistol with one shot.', moral: { id: 'bfSorrel:marooned', tr: { loyalty: 2 }, rep: { brethren: 8 }, npc: { ned_vey: 10 }, note: 'Had Hal Sorrel marooned on the Spit, as the Brethren\'s articles say.', fame: 'marooned Hal Sorrel by the articles', spread: 'local' }, effect: (g) => { g.setFlag('bfSorrel', 'marooned'); g.setStage(VOTE, 'bess'); }, next: 'njM' },
      { text: 'Give him to Hob Merrick. Let him scrape keels on the Careen with the men the Table threw out, and live with it.', need: { trait: { compassion: [57, 100] } }, moral: { id: 'bfSorrel:careen', a: 5, tr: { compassion: 3 }, rep: { brethren: 4 }, npc: { ned_vey: -5 }, note: 'Spared Hal Sorrel to work the Careen under Hob Merrick.', fame: 'spared Hal Sorrel for the Careen', spread: 'local' }, effect: (g) => { g.setFlag('bfSorrel', 'careen'); g.setStage(VOTE, 'bess'); }, next: 'njC' },
    ],
  },
  njG: { text: 'Gallows it is. And Nan Gilly goes with him to see it, and then on the first hull out of the Keys, and never back. The articles are kept. Go and tell Bess.' },
  njM: { text: 'The old way. I haven\'t seen it done in thirty years. Nan Gilly rows him out herself; then she goes on the first hull out, and never back. Go and tell Bess.' },
  njC: { text: 'The Careen. Hob will enjoy that more than Hal will. Soft, some will say. I\'ll say the articles leave it to the wronged, and the wronged said so. Nan goes on the first hull out. Go and tell Bess.' },
};

// ================================================================ The quests

const quests: Record<string, QuestDef> = {
  [ART]: {
    id: ART, name: 'Under the Black Flag, I: Sign the Articles', region: 'keys', depth: 'storyline',
    notes: (_g, s) => (s === 'book' ? 'Captain Bess Merrin of the Fair Exchange will take me on as a hand. First, the articles: quarter always given, the black flag never flown, a prize shared by shares, a captains\' quarrel to the Cockpit. The book is on the Captains\' Table.'
      : s === 'nan' ? 'I signed the articles before Ned Vey. Report to Nan Gilly, the Fair Exchange\'s quartermaster, on the north pier.'
      : 'I signed the Brethren\'s articles and went aboard the Fair Exchange as a hand.'),
    objectives: (_g, s) => (s === 'book' ? [{ text: 'Sign the articles at the Captains\' Table', marker: 'bfBook' }] : s === 'nan' ? [{ text: 'Report to Nan Gilly on the north pier', marker: 'bf_nan' }] : []),
    marks: (g, s): Marks => (!s && at(g, 'spCat') === 'done' ? { sp_bess: '!' } : s === 'nan' ? { bf_nan: '?' } : {}),
    walk: { cast: ['sp_bess', 'bf_nan'], from: { quests: { spCat: 'done' } } },
  },
  [MARY]: {
    id: MARY, name: 'Under the Black Flag, II: No Quarter', region: 'keys', depth: 'storyline',
    notes: (_g, s) => (s === 'bight' ? 'The Mary Clare, a Brethren sloop, has drifted into the Bight with nobody at her helm, and the Key wreckers are at her. Drive them off and look her over.'
      : s === 'search' ? 'The wreckers are gone. Look the Mary Clare over.'
      : s === 'bess' ? 'Her crew dead on her deck, a black flag nailed to her mast, and the log\'s last page: a grey hull, no colours, out of the sun. Back to Bess.'
      : 'The Mary Clare was taken under the black flag. Bess made me an able hand.'),
    objectives: (g, s) => (s === 'bight' ? [{ text: `Drive the wreckers off the Mary Clare (${Math.min(WRECKERS.length, killed(g, 'bfWrecker'))}/${WRECKERS.length})`, done: killed(g, 'bfWrecker') >= WRECKERS.length }]
      : s === 'search' ? MARY_THINGS.map((_, i) => ({ text: ['Look at the mast', 'Look for her log'][i], done: !!g.flag('bfMary' + i), marker: 'bfMary' + i }))
      : s === 'bess' ? [{ text: 'Tell Bess Merrin', marker: 'sp_bess' }] : []),
    advance: (g, s) => (s === 'bight' && killed(g, 'bfWrecker') >= WRECKERS.length ? 'search' : s === 'search' && searched(g) >= MARY_THINGS.length ? 'bess' : null),
    marks: (g, s): Marks => (!s && at(g, ART) === 'done' ? { bf_nan: '!' } : s === 'bess' ? { sp_bess: '?' } : {}),
    walk: { cast: ['sp_bess', 'bf_nan'], kill: { bight: [['keywrecker', 3]] }, from: { quests: { spCat: 'done', bfArticles: 'done' }, flags: { 'fac:brethren': 0 } } },
  },
  [LADY]: {
    id: LADY, name: 'Under the Black Flag, III: The Grey Lady', region: 'keys', depth: 'storyline',
    notes: (_g, s) => (s === 'pip' ? 'The Mary Clare carried forty casks of Callis red, and they\'ve gone somewhere. Gil Fenner buys what nobody else will; his tally-boy Pip Rudd is at Low Tide.'
      : s === 'jory' ? 'Forty casks came into Low Tide off the Swallow. Jory Quick carried them.'
      : s === 'camp' ? 'The casks came off a grey ship with no colours lying off Smoke Key: the Grey Lady, Hal Sorrel\'s. His men camp in the lee of the beacon hill.'
      : s === 'take' ? 'Sorrel\'s camp is broken. His table is still standing.'
      : s === 'bess' ? 'Sorrel\'s own articles, written fair: a tenth of every cargo, or the black. Bess will want to see them.'
      : 'Hal Sorrel of the Grey Lady flies the black for a tenth of every cargo. Bess made me bosun.'),
    objectives: (g, s) => (s === 'pip' ? [{ text: 'Ask Pip Rudd at Low Tide about forty casks', marker: 'bf_pip' }]
      : s === 'jory' ? [{ text: 'Ask Jory Quick about the casks', marker: 'sp_jory' }]
      : s === 'camp' ? [{ text: `Break the Grey Lady's camp off Smoke Key (${Math.min(CAMP_CREW.length, killed(g, 'bfCamp'))}/${CAMP_CREW.length})`, done: killed(g, 'bfCamp') >= CAMP_CREW.length }]
      : s === 'take' ? [{ text: 'Search Sorrel\'s table', marker: 'bfTable' }]
      : s === 'bess' ? [{ text: 'Show Bess Merrin what you found', marker: 'sp_bess' }] : []),
    advance: (g, s) => (s === 'camp' && killed(g, 'bfCamp') >= CAMP_CREW.length ? 'take' : null),
    marks: (g, s): Marks => (!s && at(g, MARY) === 'done' ? { bf_nan: '!' } : s === 'pip' ? { bf_pip: '?' } : s === 'jory' ? { sp_jory: '?' } : s === 'bess' ? { sp_bess: '?' } : {}),
    walk: { cast: ['sp_bess', 'bf_nan', 'bf_pip', 'sp_jory'], kill: { camp: [['bf_greycrew', 3]] }, from: { quests: { spCat: 'done', bfArticles: 'done', bfMary: 'done' }, flags: { 'fac:brethren': 1 } } },
  },
  [MAROON]: {
    id: MAROON, name: 'Under the Black Flag, IV: Marooned', region: 'keys', depth: 'storyline',
    notes: (_g, s) => (s === 'spit' ? 'Nan Gilly says a Grey Lady man wants to turn, and will meet one of ours alone on the Spit, the sandbank north of Gallows Key, at dusk.'
      : s === 'ambush' ? 'Nobody turns. Sorrel\'s men were waiting on the Spit, and Nan has rowed away with the boat.'
      : s === 'purse' ? 'The Grey Lady men are dead. Their bosun\'s coat is lying in the sand.'
      : s === 'fire' ? 'In the bosun\'s coat, Sorrel\'s silver, in a purse with NAN stitched on it. Light a fire on the Spit for Bess to see.'
      : s === 'bess' ? 'Bess saw the fire. Tell her about Nan.'
      : 'Nan Gilly sold me to Sorrel. Bess made me quartermaster of the Fair Exchange in her place.'),
    objectives: (g, s) => (s === 'spit' ? [{ text: 'Go out to the Spit, north of Gallows Key', marker: 'bfSpit' }]
      : s === 'ambush' ? [{ text: `Fight off Sorrel's men (${Math.min(SPIT_CREW.length, killed(g, 'bfSpitCrew'))}/${SPIT_CREW.length})`, done: killed(g, 'bfSpitCrew') >= SPIT_CREW.length }]
      : s === 'purse' ? [{ text: 'Search the bosun\'s coat', marker: 'bfCoat' }]
      : s === 'fire' ? [{ text: 'Light a driftwood fire on the Spit', marker: 'bfFire' }]
      : s === 'bess' ? [{ text: 'Tell Bess Merrin about Nan', marker: 'sp_bess' }] : []),
    advance: (g, s) => (s === 'ambush' && killed(g, 'bfSpitCrew') >= SPIT_CREW.length ? 'purse' : null),
    marks: (g, s): Marks => (!s && at(g, LADY) === 'done' ? { bf_nan: '!' } : s === 'bess' ? { sp_bess: '?' } : {}),
    walk: { cast: ['sp_bess', 'bf_nan'], kill: { ambush: [['bf_greycrew', 3]] }, from: { quests: { spCat: 'done', bfArticles: 'done', bfMary: 'done', bfLady: 'done' }, flags: { 'fac:brethren': 2 } } },
  },
  [VOTE]: {
    id: VOTE, name: 'Under the Black Flag, V: The Captain\'s Vote', region: 'keys', depth: 'storyline',
    notes: (g, s) => (s === 'table' ? 'Hal Sorrel has come into Saltpenny under a truce flag, with Nan Gilly at his elbow, and asks the Table for a seat and a tenth of the Key. Lay his articles on the Captains\' Table.'
      : s === 'cockpit' ? 'A quarrel between captains goes to the Cockpit, and the Fair Exchange has picked me to stand for her. Hal Sorrel is waiting.'
      : s === 'judge' ? 'Sorrel is beaten, in front of the whole Key. The Table judges him by the articles, and Ned Vey says the how is mine.'
      : s === 'bess' ? 'The Table has judged Hal Sorrel. Bess is waiting on the north pier.'
      : `I stood for the Fair Exchange in the Cockpit, and Hal Sorrel ${g.flag('bfSorrel') === 'gallows' ? 'hanged on Gallows Key' : g.flag('bfSorrel') === 'marooned' ? 'was marooned on the Spit' : 'went to scrape keels on the Careen'}. The Table voted me captain.`),
    objectives: (g, s) => (s === 'table' ? [{ text: 'Lay Sorrel\'s articles on the Captains\' Table', marker: 'ned_vey' }]
      : s === 'cockpit' ? [{ text: `Beat Hal Sorrel in the Cockpit (${Math.min(1, killed(g, 'bfSorrel'))}/1)`, done: killed(g, 'bfSorrel') >= 1 }]
      : s === 'judge' ? [{ text: 'Tell Ned Vey what the Table should do with Sorrel', marker: 'ned_vey' }]
      : s === 'bess' ? [{ text: 'Go back to Bess Merrin', marker: 'sp_bess' }] : []),
    advance: (g, s) => (s === 'cockpit' && killed(g, 'bfSorrel') >= 1 ? 'judge' : null),
    marks: (g, s): Marks => (!s && at(g, MAROON) === 'done' ? { sp_bess: '!' } : s === 'table' || s === 'judge' ? { ned_vey: '?' } : s === 'bess' ? { sp_bess: '?' } : {}),
    walk: { cast: ['sp_bess', 'ned_vey'], kill: { cockpit: [['bf_sorrel', 1]] }, from: { quests: { spCat: 'done', bfArticles: 'done', bfMary: 'done', bfLady: 'done', bfMaroon: 'done' }, flags: { 'fac:brethren': 3 } } },
  },
};

const spawns: QuestSpawn[] = [
  { land: 'morrow', tag: 'bfWrecker', type: 'keywrecker', at: WRECKERS, when: (g) => at(g, MARY) === 'bight' },
  { land: 'morrow', tag: 'bfCamp', type: 'bf_greycrew', at: CAMP_CREW, when: (g) => at(g, LADY) === 'camp' },
  { land: 'morrow', tag: 'bfSpitCrew', type: 'bf_greycrew', at: SPIT_CREW, when: (g) => at(g, MAROON) === 'ambush' },
  { land: 'morrow', tag: 'bfSorrel', type: 'bf_sorrel', at: COCKPIT, when: (g) => at(g, VOTE) === 'cockpit' },
];

const things: WorldThing[] = [
  { land: 'morrow', id: 'bfBook', x: BOOK.x, z: BOOK.z, y: F, label: 'Sign the articles', radius: 2.4, look: 'letter',
    when: (g) => at(g, ART) === 'book',
    use: (g) => { g.setStage(ART, 'nan'); g.toast('The book is as thick as a hand and older than the Key. Ned Vey turns it to a clean page without a word and points. Above where you sign, the articles in a round old hand; below, a line for the next name. Ned blots it, and nods, and goes back to his rum.'); } },
  ...MARY_THINGS.map(([x, z, look], i): WorldThing => ({
    land: 'morrow', id: 'bfMary' + i, x, z, label: 'Look closer', radius: 2.4, look: look as WorldThing['look'],
    when: (g) => at(g, MARY) === 'search' && !g.flag('bfMary' + i),
    use: (g) => { g.setFlag('bfMary' + i, 1); if (i === 1) g.give('bf_logpage', 1); g.toast(['Nailed to the stump of her mast with four iron spikes, a square of black bunting, no mark on it. It means one thing on any sea: no quarter. The Brethren have never flown it.', 'Her log, in the master\'s cabin, its last page in a hand that was hurrying: "Grey hull, no colours, came up out of the sun. Bearing down. Keep us." You tear the page out and keep it.'][i]); },
  })),
  { land: 'morrow', id: 'bfTable', x: SMOKE_CAMP.x + 0.5, z: SMOKE_CAMP.z + 0.5, label: 'Search Sorrel\'s table', radius: 2.6, look: 'crate',
    when: (g) => at(g, LADY) === 'take',
    use: (g) => { g.setStage(LADY, 'bess'); g.toast('A sea chest for a table, and on it, weighted with a pistol, a sheet written out fair in a good clerk\'s hand: THE ARTICLES OF THE GREY LADY. A tenth of every cargo that passes the Keys, paid to the Grey Lady. Any hull that will not pay to have the black, and no word left. It is signed Hal Sorrel, and under it, twenty-two marks of his crew.'); } },
  { land: 'morrow', id: 'bfSpit', x: SPIT.x + 0.5, z: SPIT.z + 0.5, label: 'Wait for the Grey Lady man', radius: 4, look: 'none',
    when: (g) => at(g, MAROON) === 'spit',
    use: (g) => { g.setStage(MAROON, 'ambush'); g.toast('The sun goes down. A boat grounds on the far side of the Spit, and three men get out of it with cutlasses, and none of them looks like a man who wants to turn. Behind you, the scrape of oars: Nan Gilly, rowing your boat away without looking back.'); } },
  { land: 'morrow', id: 'bfCoat', x: SPIT.x + 2.5, z: SPIT.z + 1.5, label: 'Search the bosun\'s coat', radius: 2.4, look: 'cloth',
    when: (g) => at(g, MAROON) === 'purse',
    use: (g) => { g.give('bf_nans_purse', 1); g.setStage(MAROON, 'fire'); g.toast('In the bosun\'s coat, a leather purse heavy with Callis silver, and stitched on it in red thread, the way a mother stitches a child\'s name: NAN.'); } },
  { land: 'morrow', id: 'bfFire', x: SPIT.x - 1.5, z: SPIT.z - 1.5, label: 'Light a driftwood fire', radius: 2.6, look: 'scorch',
    when: (g) => at(g, MAROON) === 'fire',
    use: (g) => { g.setStage(MAROON, 'bess'); g.toast('Driftwood, dry as bone, and a flint from the bosun\'s pocket. The fire goes up tall and yellow on the Spit, and after a long hour a lantern answers from the north pier, and a boat puts out. In the bow, very upright, is Bess Merrin, with a cat on her shoulder.'); } },
];

const SEA = { skin: '#b88a60', eyes: '#3a3a2a', boots: '#2a1e14' };
const NPCS: NpcDef[] = [
  { land: 'morrow', id: 'bf_nan', name: 'Nan Gilly', title: 'Quartermaster, the Fair Exchange', look: { ...SEA, frame: 'f', hair: '#8a5a3a', hairStyle: 4, tunic: '#4a3a2a', trim: '#c8a040', trousers: '#2e2a26', hat: 'kerchief', hatColor: '#2a3a5a', lashes: true, build: 1.1, age: 0.45 },
    schedule: [{ from: 0, to: 24, at: [NAN.x, NAN.z], y: F, face: [NAN.x + 3, NAN.z], anim: 'idle' }], when: (g) => !at(g, MAROON) || at(g, MAROON) === 'spit', barks: ['Hammock\'s under the leak.'] },
  { land: 'morrow', id: 'bf_pip', name: 'Pip Rudd', title: 'Tally-boy, Low Tide', look: { ...SEA, hair: '#c8a060', hairStyle: 5, tunic: '#5a4a3a', trim: '#2a2420', trousers: '#3a3028', freckles: true, build: 0.6, height: 0.85, age: 0.1 },
    schedule: [{ from: 0, to: 24, at: [PIP.x, PIP.z], y: F, face: [PIP.x - 3, PIP.z], anim: 'idle' }], barks: ['Count, not talk.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'bf_articles', name: 'Your copy of the articles', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'letter', a: '#e8dcc0', b: '#1e1c1c' }, desc: 'The Brethren\'s articles, as you signed them: quarter always given, the black flag never flown, a prize shared by shares, a captains\' quarrel to the Cockpit.' },
  { id: 'bf_logpage', name: 'The Mary Clare\'s last page', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'letter', a: '#e8dcc0', b: '#5a3a1e' }, desc: '"Grey hull, no colours, came up out of the sun. Bearing down. Keep us."' },
  { id: 'bf_sorrels_articles', name: 'The Articles of the Grey Lady', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'letter', a: '#e8dcc0', b: '#a8382c' }, desc: 'A tenth of every cargo, or the black. Signed Hal Sorrel, and twenty-two marks of his crew.' },
  { id: 'bf_nans_purse', name: 'A purse stitched NAN', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'bag', a: '#5a3a1e', b: '#a8382c' }, desc: 'Sorrel\'s Callis silver, in a purse with a name stitched on it the way a mother stitches a child\'s.' },
  { id: 'costume_brethren_hand', name: 'A Brethren hand\'s slops', kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'chest', a: '#e8e0d0', b: '#2a3a5a' }, costume: 'brethren_hand',
    desc: 'A striped shirt, sailcloth breeches, and a red kerchief, so the Key knows you\'re Brethren.', stats: 'Use it to add it to your wardrobe for good, and wear it from Outfits.' },
  { id: 'costume_brethren_captain', name: 'Bess Merrin\'s captain\'s coat', kind: 'collectible', rarity: 'epic', stack: false, value: 0, icon: { shape: 'chest', a: '#1e1c1c', b: '#c8a040' }, costume: 'brethren_captain',
    desc: 'Black wool with gold at the cuffs, a red sash, and a tricorn that has been through three gales and a wedding. Still a better fit on you.', stats: 'Use it to add it to your wardrobe for good, and wear it from Outfits.' },
];

export const BLACK_FLAG: RegionContent = {
  id: 'blackFlag',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { bf_pip: pip, bf_nan: { start: (g) => (at(g, ART) === 'nan' ? 'n1' : !at(g, MARY) && at(g, ART) === 'done' ? 'nm1' : !at(g, LADY) && at(g, MARY) === 'done' ? 'nl1' : !at(g, MAROON) && at(g, LADY) === 'done' ? 'nr1' : 'n0'), nodes: nanNodes } },
  quests,
  spawns,
  things,
  hooks: (D) => {
    hook(D, 'sp_bess', (g) => {
      if (at(g, 'spCat') !== 'done') return undefined;
      const a = at(g, ART), m = at(g, MARY), l = at(g, LADY), r = at(g, MAROON), v = at(g, VOTE);
      // her boast for Cobb's verse comes first, unless the story needs her now
      if (at(g, 'spVerse') === 'boasts' && !g.flag('spBoastBess') && ![m, l, r, v].includes('bess')) return undefined;
      if (!a) return 'a1';
      if (a === 'book' || a === 'nan') return 'aW';
      if (m === 'bess') return 'm1';
      if (l === 'bess') return 'l1';
      if (r === 'bess') return 'r1';
      if (r === 'done' && !v) return 'bv1';
      if (v === 'table' || v === 'cockpit' || v === 'judge') return 'bvW';
      if (v === 'bess') return 'bvEnd';
      if (v === 'done') return 'bAfter';
      return undefined;
    }, bessNodes);
    hook(D, 'sp_jory', (g) => (at(g, LADY) === 'jory' ? 'jl1' : undefined), joryNodes);
    hook(D, 'ned_vey', (g) => (at(g, VOTE) === 'table' ? 'nv1' : at(g, VOTE) === 'judge' ? 'nj1' : undefined), nedNodes);
  },
};
