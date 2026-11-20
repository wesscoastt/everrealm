import type { DialogueTree, DNode } from '../../game/api';
import { addOption, at, hook, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { WorldThing } from '../places_regional';
import { SALT_FLOOR, SALT_HULLS, SALT_PIERS, SALTPENNY } from '../../world/morrow';

// More of Saltpenny Key (Morrow side stories, docs/LORE.md "Saltpenny Key").
//
// sbBowden, WASHED (Annie Coe, the Leaning Mast): somebody has been at the chowder pot every night after the Mast
// shuts, and brings the bowl back washed, which no Brethren alive has ever done. Wet prints at the back hatch go
// down to the third pier, where the galley Long Meg's oar crew sleep chained under her deck. One of them is Sam
// Bowden, of the Margery (Gullmouth: The Margery's Bell, gullmouthSide.ts): the Margery's six were pressed into
// Brethren oars, and Sam slips his chain at night with a bent nail. Feed the oar crew openly and dare the Table to
// stop it, get Sam aboard the Kittiwake for Callis in a cask, or tell Ned Vey. sbBowden = 'fed' | 'cask' | 'table'.

const BOWDEN = 'sbBowden';
const H = SALT_HULLS, F = SALT_FLOOR, SX = SALTPENNY.x;
const zc = (h: { z: number }) => h.z + 0.5;
const HATCH = { x: H.mast.x + 1.2, z: zc(H.mast) + 1.5 };
const SAM = { x: SX - 128.5, z: SALT_PIERS[2] + 1.5 };

const annieNodes: Record<string, DNode> = {
  bw1: { text: 'Somebody\'s at my pot. Every night after I bar the door. Lid off, a bowl gone, and in the morning the bowl\'s back on the shelf. Washed.', next: 'bw2' },
  bw2: { text: 'Washed! I\'ve kept this bar twenty years. Nobody on this Key has ever washed a bowl in his life. I\'m not angry. I\'m frightened. Find out who it is before I start liking them.', options: [{ text: 'I\'ll look round the back.', effect: (g) => g.setStage(BOWDEN, 'hatch') }, { text: 'Not now.' }] },
  bb1: { text: 'The Margery\'s men? On the Long Meg\'s oars? Under my own pier, all this time, and me selling Ned\'s captains chowder over their heads. One bowl a night. For six men.', next: 'bb2' },
  bb2: {
    text: 'Well. What do I do? You found him. You tell me.',
    options: [
      { text: 'Feed them. Six bowls at the back hatch every night, and let Ned Vey come and stop you.', moral: { id: 'sbBowden:fed', tr: { compassion: 2, courage: 1 }, rep: { brethren: -1 }, npc: { annie_coe: 15, sb_sam: 15 } }, effect: (g) => { g.setFlag(BOWDEN, 'fed'); g.addMarks(70); g.setStage(BOWDEN, 'done'); }, next: 'bbF' },
      { text: 'Get Sam into a rum cask and onto the Kittiwake for Callis. He can find his way home from there.', moral: { id: 'sbBowden:cask', tr: { courage: 2, deception: 1 }, rep: { brethren: -3 }, npc: { annie_coe: 10, sb_sam: 25, mara_coyle: -5 }, note: 'Smuggled Sam Bowden of the Margery off Saltpenny Key in a rum cask.' }, effect: (g) => { g.setFlag(BOWDEN, 'cask'); g.addMarks(70); g.setStage(BOWDEN, 'done'); }, next: 'bbC' },
      { text: 'Tell Ned Vey. It\'s the Table\'s Key and the Table\'s oars.', moral: { id: 'sbBowden:table', tr: { loyalty: 1, cruelty: 2 }, rep: { brethren: 3 }, npc: { annie_coe: -20, sb_sam: -30, ned_vey: 10 } }, effect: (g) => { g.setFlag(BOWDEN, 'table'); g.addMarks(90); g.setStage(BOWDEN, 'done'); }, next: 'bbT' },
    ],
  },
  bbF: { text: 'Six bowls. And spoons. If Ned Vey wants to stop me, he can come round the back of my bar and say so to my face, and then he can find somewhere else to drink. Here. That\'s for the looking.' },
  bbC: { speaker: 'narrator', text: 'That night Annie rolls an empty rum cask down to the Kittiwake with a chalk mark on its head and two holes bored under the hoops. Mara Coyle looks at the mark, and at Annie, and at you, and has it stowed in the hold without a word. Annie presses marks into your hand on the way back up the beach.' },
  bbT: { text: 'The Table. Of course. The Table\'s Key and the Table\'s oars. Take your money and drink somewhere else for a while. I\'ll be washing my own bowls.' },
  bbAfter: {
    text: (g) => (g.flag(BOWDEN) === 'fed'
      ? 'Six bowls, every night. Ned came round the back once. He looked at the bowls, and at me, and went away again. The Long Meg\'s master pays for them now. Don\'t ask me how that happened.'
      : g.flag(BOWDEN) === 'cask'
        ? 'Mara says a cask came off at Callis that walked away on its own. That\'s all she\'ll say. That\'s all I want to know.'
        : 'They moved the Long Meg to the north pier. No more bowls go missing. I count them every night anyway.'),
    next: 'a0',
  },
};

const sam: DialogueTree = {
  start: (g) => (at(g, BOWDEN) === 'pier' ? 's1' : 'hello'),
  nodes: {
    hello: {
      text: (g) => (g.flag(BOWDEN) === 'table' ? 'Go away.' : g.flag(BOWDEN) === 'fed' ? 'Six bowls. Every night. Tell her thank you. Tell her again.' : 'Pull, rest, pull.'),
      options: [{ text: 'Good day.' }],
    },
    s1: { speaker: 'narrator', text: 'A thin man in the remains of a Gullmouth fisherman\'s smock, sitting on the pier with his back to a bollard and his ankle in an iron cuff with a bent nail through the pin. He doesn\'t try to run. He looks too tired to run.', next: 's2' },
    s2: { text: 'Sam Bowden. The Margery, out of Gullmouth. The Hen took us off the Mewstones in February and sold the six of us to the Long Meg for her oars. I worked the pin loose a month ago. I go up to the Mast at night and take one bowl, and we share it, and I wash it so she\'ll not know.', next: 's3' },
    s3: {
      text: 'I could have run any night. Where to? It\'s a Key. And the other five are still chained. Tell her I\'m sorry about the chowder. Tell her it was very good.',
      options: [{ text: 'I\'ll tell her.', effect: (g) => g.setStage(BOWDEN, 'back') }],
    },
  },
};

const quests: Record<string, QuestDef> = {
  [BOWDEN]: {
    id: BOWDEN, name: 'Washed', region: 'saltpenny', depth: 'quest',
    notes: (g, s) => {
      if (s === 'hatch') return 'Somebody takes a bowl of chowder from the Leaning Mast every night after it shuts, and brings it back washed. Annie Coe wants to know who. Look round the back hatch.';
      if (s === 'pier') return 'Wet prints from the Mast\'s back hatch go down to the third pier, where the galley Long Meg lies.';
      if (s === 'back') return 'Sam Bowden, of the Margery out of Gullmouth, pressed to the Long Meg\'s oars with the rest of her crew. Back to Annie Coe.';
      const f = g.flag(BOWDEN);
      return f === 'fed' ? 'Annie Coe feeds the Long Meg\'s oar crew at her back hatch every night.' : f === 'cask' ? 'Sam Bowden went to Callis in a rum cask aboard the Kittiwake.' : 'I told Ned Vey about Sam Bowden.';
    },
    objectives: (_g, s) => (s === 'hatch' ? [{ text: 'Look at the Leaning Mast\'s back hatch', marker: 'sbHatch' }]
      : s === 'pier' ? [{ text: 'Find who comes up from the third pier', marker: 'sb_sam' }]
      : s === 'back' ? [{ text: 'Back to Annie Coe', marker: 'annie_coe' }] : []),
    marks: (_g, s): Marks => (!s ? { annie_coe: '!' } : s === 'pier' ? { sb_sam: '?' } : s === 'back' ? { annie_coe: '?' } : {}),
    walk: { cast: ['annie_coe', 'sb_sam'] },
  },
};

const things: WorldThing[] = [
  {
    land: 'morrow', id: 'sbHatch', x: HATCH.x, z: HATCH.z, y: F, label: 'Look at the back hatch', radius: 2.4, look: 'tracks',
    when: (g) => at(g, BOWDEN) === 'hatch',
    use: (g) => { g.setStage(BOWDEN, 'pier'); g.toast('The back hatch has been opened from outside with something thin, a nail or a knife. On the boards, wet bare footprints, salt-white when they dry, and a smear of the black grease they put on oar looms. They go down the beach to the third pier.'); },
  },
];

const NPCS: NpcDef[] = [
  { land: 'morrow', id: 'sb_sam', name: 'Sam Bowden', title: 'The Long Meg\'s oars', look: { skin: '#d8a888', hair: '#6a4a2a', hairStyle: 1, facial: 1, eyes: '#4a5a6a', tunic: '#5a5a4a', trim: '#3a3a30', shirt: '#a8a090', trousers: '#3a3a30', boots: '#3a2a1e', build: 0.8, age: 0.35 },
    schedule: [{ from: 0, to: 24, at: [SAM.x, SAM.z], face: [SAM.x, SAM.z + 4], anim: 'seated' }],
    barks: ['Pull, rest, pull.'] },
];

export const SALTPENNY_MORE: RegionContent = {
  id: 'saltpennyMore',
  npcs: NPCS,
  dialogue: { sb_sam: sam },
  quests,
  things,
  hooks: (D) => {
    hook(D, 'annie_coe', (g) => (at(g, BOWDEN) === 'back' ? 'bb1' : undefined), annieNodes);
    addOption(D, 'annie_coe', 'a0', { text: 'You look worried, Annie.', cond: (g) => !at(g, BOWDEN), next: 'bw1' });
    addOption(D, 'annie_coe', 'a0', { text: 'About the bowls.', cond: (g) => at(g, BOWDEN) === 'done', next: 'bbAfter' });
  },
};
