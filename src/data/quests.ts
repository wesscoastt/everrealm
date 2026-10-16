import type { GameApi } from '../game/api';
import { STORY_QUESTS } from './storyQuests';

export interface Objective {
  text: string;
  done?: boolean;
  /** POI key used to place the map and compass marker. */
  marker?: string;
}

export interface QuestDef {
  id: string;
  name: string;
  /** Journal entry for the current stage, written as the player's own notes. */
  notes: (g: GameApi, stage: string) => string;
  objectives: (g: GameApi, stage: string) => Objective[];
  /** Automatic stage transitions driven by inventory changes. */
  advance?: (g: GameApi, stage: string) => string | null;
  /** Quest-giver / turn-in marks over NPC heads, keyed by NPC id. Stage is undefined before the quest starts. */
  marks?: (g: GameApi, stage: string | undefined) => Record<string, '!' | '?'>;
  /** Main-story chapter: shown with a chapter card, its own marker colour, and first in the journal. */
  story?: { chapter: number; title: string };
  /** Quest started (at this stage) the moment this one is done: how story chapters chain. */
  next?: [string, string];
  /** Region the quest belongs to, for the journal and the quest walker's report. */
  region?: string;
  /** How substantial it is: a short job, a multi-stage quest, or part of a storyline. */
  depth?: 'short' | 'quest' | 'storyline';
  /** Hints for the headless quest walker (scripts/questwalk.ts). */
  walk?: QuestWalk;
}

/** What the walker may do beyond talking, reading and searching, which it always tries. */
export interface QuestWalk {
  /** Items the player gets through gathering, crafting, buying or loot at a stage: [item, count]. */
  obtain?: Record<string, [string, number][]>;
  /** Creatures killed by type at a stage (counted in the "killed:<type>" flag): [type, count]. */
  kill?: Record<string, [string, number][]>;
  /** Stage changes the game engine makes itself (a casting finishing, the ground lifting). */
  auto?: Record<string, string>;
  /** Extra people to try talking to. */
  cast?: string[];
  /** Starting state for quests that need others done first. */
  from?: { quests?: Record<string, string>; flags?: Record<string, unknown>; items?: [string, number][] };
}

const bars = (g: GameApi) => g.count('bronze_bar');

export const QUESTS: Record<string, QuestDef> = {
  fordBell: {
    id: 'fordBell',
    name: 'The Ford Bell',
    notes: (g, s) => {
      const c = g.flag('bellChoice') as string | undefined;
      switch (s) {
        case 'askBram':
          return 'Maud Ashby, the reeve, wants the Ford Bell back in its frame before the Wend floods the Wetlings. Bram Tolley took the cracked bell in April to recast it. Maud says that if he blames the mould, I should ask him which part.';
        case 'gather':
          return 'Bram says he\'s short of metal and needs three bronze bars. The Pit foreman lets people mine the upper gallery. Bram dodged the question of where the old bell\'s bronze went.';
        case 'smelt':
          return 'I have the ore. One copper and one tin make a bar at Bram\'s furnace.';
        case 'deliver':
          return g.flag('ledgerRead')
            ? 'I have the bars. Bram\'s ledger says he sold the cracked bell to the Pit\'s buyer, Mr Pryce, for 31 marks.'
            : 'I have the bars. Bram is waiting on them.';
        case 'casting':
          return 'Bram is pouring the new bell.';
        case 'report':
          return c === 'confess' ? 'The bell is up. Bram promised to tell Maud what he did with the old one.' : 'The bell is hanging on the bridge. Maud will want to know.';
        case 'done':
          if (c === 'cover') return 'The bell is back. Maud thinks the trouble was the clay. Bram gave me his own pickaxe.';
          if (c === 'confess') return 'The bell is back. Bram told Maud himself, and she\'s fined him what he was paid for the old metal.';
          if (c === 'report') return 'The bell is back. I told Maud about the sale, and Bram is paying it back a mark a week. He isn\'t talking to me.';
          if (c === 'silent') return 'The bell is back. I never told Maud what was in the ledger.';
          return 'The bell is back on the bridge.';
      }
      return '';
    },
    objectives: (g, s) => {
      const cu = g.count('copper_ore') + bars(g);
      const sn = g.count('tin_ore') + bars(g);
      switch (s) {
        case 'askBram':
          return [{ text: 'Ask Bram Tolley about the bell', marker: 'bram' }];
        case 'gather':
          return [
            { text: `Mine copper ore in Sallow Pit (${Math.min(3, cu)}/3)`, done: cu >= 3, marker: 'ore:copper' },
            { text: `Mine tin ore in Sallow Pit (${Math.min(3, sn)}/3)`, done: sn >= 3, marker: 'ore:tin' },
          ];
        case 'smelt':
          return [{ text: `Smelt bronze bars at the smithy furnace (${Math.min(3, bars(g))}/3)`, done: bars(g) >= 3, marker: 'furnace' }];
        case 'deliver':
          return bars(g) >= 3
            ? [{ text: 'Bring the bars to Bram', marker: 'bram' }]
            : [{ text: `Bronze bars (${bars(g)}/3)`, marker: 'furnace' }];
        case 'casting':
          return [{ text: 'Wait while Bram pours the bell' }];
        case 'report':
          return [{ text: 'Tell Maud the bell is up', marker: 'maud' }];
      }
      return [];
    },
    advance: (g, s) => {
      if (s === 'gather' && g.count('copper_ore') + bars(g) >= 3 && g.count('tin_ore') + bars(g) >= 3) return bars(g) >= 3 ? 'deliver' : 'smelt';
      if (s === 'smelt' && bars(g) >= 3) return 'deliver';
      return null;
    },
  },
  pellTrout: {
    id: 'pellTrout',
    name: 'Sulking River',
    notes: (_g, s) => (s === 'done'
      ? 'Pell admitted the Wend isn\'t dead. He gave the trout back.'
      : 'Pell Garrow, the old fisherman on the Hollin Ford dock, says the Pit runoff has driven the fish off. He wants to see a brown trout before he\'ll believe otherwise. Trout need Fishing 5.'),
    objectives: (g, s) => {
      if (s === 'catch') return g.has('raw_trout')
        ? [{ text: 'Show Pell the trout', marker: 'pell' }]
        : [{ text: 'Catch a brown trout (Fishing 5)', marker: 'dock' }];
      return [];
    },
  },

  // ---------------------------------------------------------------- Ansbury, Turnpike
  honestWeight: {
    id: 'honestWeight',
    name: 'Honest Weight',
    notes: (g, s) => {
      const c = g.flag('hwChoice');
      switch (s) {
        case 'askOsric':
          return 'Hob Tannet, a carter from Cotter\'s End, brought three sacks of barley into Ansbury and the Weighhouse charged him toll on four. He says it\'s been like that all summer. The weighmaster is Osric Penhallow, on the end market stall.';
        case 'bringBar':
          return 'Osric says his scale is checked against the Ansbury stone, though not since Lady Day. He\'ll test it against a Tolley bar from Hollin Ford, because Bram Tolley casts every bar to the even pound.';
        case 'askStrake':
          return 'The Weighhouse read a one-pound Tolley bar as a pound and a third. Osric\'s weights are new: Gisborne the founder cast them in July on Tanners\' Row. Hob said Corporal Strake at the south gate writes down everything that comes in.';
        case 'confront':
          return g.flag('hwBellNoted')
            ? 'Strake\'s gate book: in July a Harrowgate cart brought Gisborne three stone of bronze in pigs, signed for by A. Pryce. Three stone is what Bram Tolley sold Pryce when he sold the Ford Bell.'
            : 'Strake\'s gate book: in July a Harrowgate cart brought Gisborne three stone of bronze in pigs, signed for by A. Pryce. Osric should hear it.';
        case 'tellHob':
          return c === 'refund'
            ? 'Osric is posting a notice and paying the carters back. Hob should hear it from me before he reads it.'
            : 'Osric paid me thirty marks and will have the weights recast without a word to the Charter. Hob will only notice that his sacks weigh right again.';
        case 'done':
          return c === 'refund'
            ? 'The Weighhouse admitted the error in public, and Osric is paying the carters back himself. Hob shared his refund with me.'
            : 'The weights were recast quietly. The scale reads true and the Weighhouse stays in the city\'s hands, but nobody was paid back for the summer.';
      }
      return '';
    },
    objectives: (g, s) => {
      switch (s) {
        case 'askOsric': return [{ text: 'Ask Osric Penhallow about the scale', marker: 'osric' }];
        case 'bringBar':
          return g.has('bronze_bar')
            ? [{ text: 'Bring a Tolley bronze bar to Osric', marker: 'osric' }]
            : [{ text: 'Get a bronze bar (smelt one, or buy one at the Charter Market)', marker: 'perrin' }];
        case 'askStrake': return [{ text: 'Ask Corporal Strake at the south gate about Gisborne\'s bronze', marker: 'strake' }];
        case 'confront': return [{ text: 'Tell Osric where the bronze came from', marker: 'osric' }];
        case 'tellHob': return [{ text: 'Tell Hob Tannet', marker: 'hob' }];
      }
      return [];
    },
    marks: (g, s): Record<string, '!' | '?'> => {
      if (!s) return { hob: '!' };
      if (s === 'askOsric' || s === 'confront' || (s === 'bringBar' && g.has('bronze_bar'))) return { osric: '?' };
      if (s === 'askStrake') return { strake: '?' };
      if (s === 'tellHob') return { hob: '?' };
      return {};
    },
  },

  // ---------------------------------------------------------------- Gullmouth, Fleet Coast
  gannetLog: {
    id: 'gannetLog',
    name: 'The Gannet\'s Log',
    notes: (g, s) => {
      const c = g.flag('gannetChoice');
      switch (s) {
        case 'crabs':
          return 'Jory Maddox\'s father Col took his boat, the Gannet, onto the stacks in the March gale. Bett Rook\'s son Ansel was aboard. Col\'s sea chest is still under the bow of the wreck south of Gullmouth, and tide crabs have taken the bow.';
        case 'chest':
          return 'The crabs at the wreck are dead. The chest is wedged under the Gannet\'s bow.';
        case 'return':
          return 'I have Col Maddox\'s sea chest. Jory has the key.';
        case 'askHester':
          return g.flag('oilBookRead')
            ? 'The Light Fund cart brought six barrels of oil where nine were ordered. The Toll Office in Ansbury held three back against the Fund\'s arrears. On the night of the fourteenth of March the keeper put the light out at first bell.'
            : 'The Gannet\'s log: "Second bell. No light on the point. Holding off." "Third bell. Still dark. Will try the channel by the stacks." Jory wants to know why Fleet Light was dark. Hester Coggin keeps it.';
        case 'tellJory':
          if (c === 'hester') return 'Hester is going down the cliff path to tell Jory herself.';
          if (c === 'spare') return 'I\'ve decided to tell Jory the light was lit. Hester won\'t stop me.';
          return 'Hester asked me to tell Jory all of it, the Toll Office as well.';
        case 'done':
          if (c === 'hester') return 'Hester told Jory herself. Jory gave me his father\'s compass.';
          if (c === 'spare') return 'I told Jory the light was lit and his father cut the channel too fine. He believed me.';
          return 'I told Jory the light went out because the Toll Office kept a third of the oil. He gave me his father\'s compass.';
      }
      return '';
    },
    objectives: (g, s) => {
      const k = Math.min(3, Number(g.flag('kills:gannet') ?? 0));
      switch (s) {
        case 'crabs': return [{ text: `Kill the tide crabs at the Gannet's wreck (${k}/3)`, done: k >= 3, marker: 'gannetChest' }];
        case 'chest': return [{ text: 'Search under the Gannet\'s bow', marker: 'gannetChest' }];
        case 'return': return [{ text: 'Bring the sea chest to Jory Maddox', marker: 'jory' }];
        case 'askHester':
          return g.flag('oilBookRead')
            ? [{ text: 'Ask Hester Coggin about the oil book', marker: 'hester' }]
            : [{ text: 'Ask Hester Coggin at Fleet Light why it was dark', marker: 'hester' }, { text: 'Read the oil book', marker: 'lightOilBook' }];
        case 'tellJory': return [{ text: 'Go back to Jory', marker: 'jory' }];
      }
      return [];
    },
    advance: (g, s) => {
      if (s === 'crabs' && Number(g.flag('kills:gannet') ?? 0) >= 3) return 'chest';
      if (s === 'chest' && g.has('maddox_chest')) return 'return';
      return null;
    },
    marks: (g, s): Record<string, '!' | '?'> => {
      if (!s) return { jory: '!' };
      if (s === 'return' || s === 'tellJory') return { jory: '?' };
      if (s === 'askHester') return { hester: '?' };
      if (s === 'done') {
        const m: Record<string, '!' | '?'> = {};
        if (!g.flag('nessaPaid')) m.nessa = '?';
        if (g.flag('gannetChoice') === 'spare' && !g.flag('hesterPaid')) m.hester = '?';
        return m;
      }
      return {};
    },
  },

  // ---------------------------------------------------------------- Harrowgate Works, Raddle Barrens
  fairPrice: {
    id: 'fairPrice',
    name: 'Posted Rate',
    notes: (g, s) => {
      const c = g.flag('fpChoice');
      switch (s) {
        case 'getPick': {
          let t = 'Wick Abery broke his wrist on a loading day and sold his pick to Mr Pryce, the company buyer, for three marks to pay the bonesetter. The notice on the gate says the company buys an injured hand\'s tools at the posted rate, eighteen for a pick, and holds them for him. Tam Feld has it on the company store wall at forty.';
          if (g.flag('pryceBook')) t += ' Pryce\'s purchase book says he bought it "own account", so the notice doesn\'t bind him, and sold it to the store for thirty.';
          if (g.flag('fpRelease') === 'leverage') t += ' Pryce wrote a slip for Tam to release it at no charge.';
          if (g.flag('fpRelease') === 'delia') t += ' Delia Harrowgate told Tam to release it at the posted rate, billed to Pryce.';
          return t;
        }
        case 'returnPick':
          return 'I have Wick\'s pick.';
        case 'done':
          if (c === 'delia') return 'Delia Harrowgate made Pryce pay Wick the posted rate out of his wages. Pryce says he\'ll remember me.';
          if (c === 'leverage') return 'Pryce gave the pick back to keep his book away from Delia Harrowgate. He says he pays well for people who read carefully, and he does.';
          return 'I bought Wick\'s pick back from the company store for forty marks.';
      }
      return '';
    },
    objectives: (g, s) => {
      switch (s) {
        case 'getPick': {
          const rel = g.flag('fpRelease');
          if (rel) return [{ text: 'Collect Wick\'s pick from Tam Feld', marker: 'tamFeld' }];
          const o: { text: string; marker?: string }[] = [{ text: 'Get Wick\'s pick back (buy it, or find another way)', marker: 'tamFeld' }];
          if (!g.flag('pryceBook')) o.push({ text: 'Ask Mr Pryce about the pick', marker: 'pryce' });
          return o;
        }
        case 'returnPick': return [{ text: 'Give Wick Abery his pick', marker: 'wick' }];
      }
      return [];
    },
    advance: (g, s) => {
      if (s === 'getPick' && g.has('abery_pick')) {
        if (!g.flag('fpChoice')) g.setFlag('fpChoice', 'paid');
        return 'returnPick';
      }
      return null;
    },
    marks: (g, s): Record<string, '!' | '?'> => {
      if (!s) return { corrie: '!' };
      if (s === 'getPick' && g.flag('fpRelease')) return { tamFeld: '?' };
      if (s === 'returnPick') return { wick: '?' };
      if (s === 'done' && g.flag('fpChoice') === 'paid' && !g.flag('fpWhip')) return { corrie: '?' };
      return {};
    },
  },

  // ---------------------------------------------------------------- Fellers' Camp, Hagworm Wood
  callingTimber: {
    id: 'callingTimber',
    name: 'Calling Timber',
    notes: (g, s) => {
      const c = g.flag('timberChoice');
      switch (s) {
        case 'logs':
          return 'Ide Marrow runs Fellers\' Camp. She owes Harrowgate forty elder-oak pit props for No. 1 Drift by the month\'s end and has thirty-seven, because she has taken Sefton Garrow off the saw. I said I\'d cut the last three.';
        case 'deliver':
          return 'I have three elder oak logs for Ide.';
        case 'askSefton': {
          let t = 'Sefton was on the saw and Kit Ashcroft was calling the fall. The tree went the wrong way. Kit says he called it; Sefton says he heard and took his time. Ide wants to know what I think.';
          if (g.flag('seftonAsked')) t += g.flag('seftonTested') ? ' Sefton says he heard. When I said his name behind him, twice, he didn\'t turn round.' : ' Sefton says he heard.';
          if (g.flag('kitAsked')) t += ' Kit says Sefton isn\'t lying: he thinks he heard, and has been answering what he thinks people said since spring.';
          return t;
        }
        case 'decide':
          return 'I\'ve talked to Sefton and Kit. Ide is waiting for my answer.';
        case 'done':
          if (c === 'send') return 'Ide sent Sefton home to his brother Pell in Hollin Ford.';
          if (c === 'marker') return 'Sefton is off the saw and marks the trees for felling instead. He gave me his felling axe.';
          return 'I told Ide that Sefton heard the call. He\'s back on the saw, and Kit works the far side of the clearing.';
      }
      return '';
    },
    objectives: (g, s) => {
      const n = Math.min(3, g.count('elder_logs'));
      switch (s) {
        case 'logs': return [{ text: `Cut elder oak logs (${n}/3, Woodcutting 20)`, done: n >= 3, marker: 'tree:giant' }];
        case 'deliver': return [{ text: 'Bring the logs to Ide Marrow', marker: 'ide' }];
        case 'askSefton':
          return [
            { text: 'Ask Sefton Garrow about the call', done: !!g.flag('seftonAsked'), marker: 'sefton' },
            { text: 'Ask Kit Ashcroft', done: !!g.flag('kitAsked'), marker: 'kit' },
          ];
        case 'decide': return [{ text: 'Tell Ide what you think', marker: 'ide' }];
        case 'done':
          return g.flag('timberChoice') === 'marker' && !g.flag('seftonAxe') ? [{ text: 'Sefton wants a word', marker: 'sefton' }] : [];
      }
      return [];
    },
    advance: (g, s) => {
      if (s === 'logs' && g.count('elder_logs') >= 3) return 'deliver';
      if (s === 'deliver' && g.count('elder_logs') < 3) return 'logs';
      if (s === 'askSefton' && g.flag('seftonAsked') && g.flag('kitAsked')) return 'decide';
      return null;
    },
    marks: (g, s): Record<string, '!' | '?'> => {
      if (!s) return { ide: '!' };
      if (s === 'deliver' || s === 'decide') return { ide: '?' };
      if (s === 'askSefton') {
        const m: Record<string, '!' | '?'> = {};
        if (!g.flag('seftonAsked')) m.sefton = '?';
        if (!g.flag('kitAsked')) m.kit = '?';
        return m;
      }
      if (s === 'done' && g.flag('timberChoice') === 'marker' && !g.flag('seftonAxe')) return { sefton: '?' };
      return {};
    },
  },

  // ---------------------------------------------------------------- Kelderby, Scarth Highlands
  highPasture: {
    id: 'highPasture',
    name: 'The High Pasture',
    notes: (g, s) => {
      const c = g.flag('pastureChoice');
      switch (s) {
        case 'askIlse':
          return 'Bryn Hale went up to Hale\'s Fold three days ago to bring his fourteen ewes down before the snow, and hasn\'t come back. His wife Wenna says to ask Ilse Blewitt at Scarth Watch whether she\'s seen a lantern on the ridge.';
        case 'findBryn':
          return 'Ilse saw a lantern at Hale\'s Fold two nights ago and none last night. Her glass is falling: snow tomorrow night. Whoever is at the fold has to be off it by then.';
        case 'feed':
          return 'Frost wolves were circling the fold. Bryn is there with a broken leg and the flock, and hasn\'t eaten in two days.';
        case 'tellCai':
          return 'Bryn can\'t walk. Cai Morgan has one sledge trip before the snow: Bryn, or the ewes. Bryn says the ewes first; fourteen ewes is the house.';
        case 'askWenna':
          return 'Cai can bring down Bryn or the ewes, not both. I\'ve left it to Wenna.';
        case 'done':
          if (c === 'bryn') return 'I told Cai to bring Bryn down. Six ewes found their own way home; eight were lost in the snow.';
          if (c === 'wenna') return 'Wenna chose the ewes. Bryn kept the fire in and lost two toes. The flock is safe.';
          return 'I told Cai to bring the ewes down. Bryn kept the fire in through the snow and lost two toes. The flock is safe.';
      }
      return '';
    },
    objectives: (g, s) => {
      const k = Math.min(3, Number(g.flag('kills:fold') ?? 0));
      switch (s) {
        case 'askIlse': return [{ text: 'Ask Ilse Blewitt at Scarth Watch about a lantern on the ridge', marker: 'ilse' }];
        case 'findBryn': return [{ text: `Drive the frost wolves off Hale's Fold (${k}/3)`, done: k >= 3, marker: 'bryn' }];
        case 'feed': return [{ text: 'Give Bryn something to eat (any cooked food)', marker: 'bryn' }];
        case 'tellCai': return [{ text: 'Tell Cai Morgan at Kelderby', marker: 'cai' }];
        case 'askWenna': return [{ text: 'Ask Wenna Hale', marker: 'wenna' }];
        case 'done': return g.flag('wennaPaid') ? [] : [{ text: 'See Wenna Hale', marker: 'wenna' }];
      }
      return [];
    },
    advance: (g, s) => (s === 'findBryn' && Number(g.flag('kills:fold') ?? 0) >= 3 ? 'feed' : null),
    marks: (g, s): Record<string, '!' | '?'> => {
      if (!s) return { wenna: '!' };
      if (s === 'askIlse') return { ilse: '?' };
      if (s === 'feed') return { bryn: '?' };
      if (s === 'tellCai') return { cai: '?' };
      if (s === 'askWenna' || (s === 'done' && !g.flag('wennaPaid'))) return { wenna: '?' };
      return {};
    },
  },
};

// The main story's chapters are defined in storyQuests.ts.
Object.assign(QUESTS, STORY_QUESTS);

// Side content quests (src/data/content).
import { CONTENT } from './content';
for (const c of CONTENT) Object.assign(QUESTS, c.quests ?? {});

// ---------------------------------------------------------------- Walker hints for the hand-written quests
// (Side content declares its own `walk` inline. See scripts/questwalk.ts.)
const storyDone = (...ids: string[]) => Object.fromEntries(ids.map((id) => [id, 'done']));
Object.assign(QUESTS.fordBell, { walk: { cast: ['maud', 'bram', 'wren', 'hesk'], obtain: { gather: [['copper_ore', 3], ['tin_ore', 3]], smelt: [['bronze_bar', 3]] }, auto: { casting: 'report' } } });
Object.assign(QUESTS.pellTrout, { walk: { cast: ['pell'], obtain: { catch: [['raw_trout', 1]] } } });
Object.assign(QUESTS.honestWeight, { walk: { obtain: { bringBar: [['bronze_bar', 1]] } } });
Object.assign(QUESTS.fairPrice, { walk: { cast: ['pryce', 'delia'], obtain: { getPick: [['abery_pick', 1]] } } });
Object.assign(QUESTS.callingTimber, { walk: { obtain: { logs: [['elder_logs', 3]] } } });
Object.assign(QUESTS.highPasture, { walk: { obtain: { feed: [['cooked_char', 1]] } } });
Object.assign(QUESTS.storyMossgate, { walk: { from: { quests: { ...storyDone('storyNotice'), storyMossgate: 'wynn' } } } });
Object.assign(QUESTS.storyCrown, { walk: { from: { quests: { ...storyDone('storyNotice', 'storyMossgate'), storyCrown: 'corrie' } } } });
Object.assign(QUESTS.storyStar, { walk: { from: { quests: { ...storyDone('storyNotice', 'storyMossgate', 'storyCrown'), storyStar: 'ilse' }, items: [['crown_rubbing', 1]] } } });
Object.assign(QUESTS.storyLift, { walk: { auto: { cut: 'fight' }, from: { quests: { ...storyDone('storyNotice', 'storyMossgate', 'storyCrown', 'storyStar'), storyLift: 'cut' }, items: [['crown_rubbing', 1], ['joan_survey', 1]] } } });
Object.assign(QUESTS.storySitting, { walk: { cast: ['rhosyn', 'pryce', 'lowen'], from: { quests: { ...storyDone('storyNotice', 'storyMossgate', 'storyCrown', 'storyStar', 'storyLift'), storySitting: 'sitting' }, items: [['crown_rubbing', 1], ['joan_survey', 1]] } } });
