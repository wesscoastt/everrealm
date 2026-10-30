import type { GameApi } from '../game/api';
import type { QuestDef } from './quests';
import { pagePrice } from './story';

// The main story's first six chapters (dialogue and documents are in story.ts; the five between them are
// in content/actOne.ts). Each chapter chains to the
// next through QuestDef.next, and announces itself with a chapter card.

const kills = (g: GameApi, tag: string) => Number(g.flag('kills:' + tag) ?? 0);

export const STORY_QUESTS: Record<string, QuestDef> = {
  storyNotice: {
    id: 'storyNotice', name: 'The Notice', story: { chapter: 1, title: 'The Notice' }, next: ['storyWitness', 'road'],
    notes: (g, s) => {
      if (s === 'pike') return 'The Charter has posted a notice by Ansbury\'s south gate: it means to let the star crystal under the Glass Kirk to Harrowgate & Daughters, in return for the Charter\'s debt. Objections go to the Clerk of the Toll Office.';
      if (s === 'maren') return 'Lowen Pike, the clerk: the Charter owes Harrowgate forty thousand marks for paving the Turnpike, bought up from the guilds who lent it. Every toll goes to Harrowgate first. Ilse Blewitt at Scarth Watch wrote to the Speaker: "find out why there are arches at Ketley and nobody left to have built them." Hilda Harrowgate is on the keep steps.';
      return 'Hilda Harrowgate wants the debt paid and would rather be paid in crystal than in tolls. Her sister Joan, an engineer, has doubts. Ilse Blewitt\'s letter points at Ketley, in Hagworm Wood.';
    },
    objectives: (_g, s) => {
      if (s === 'pike') return [{ text: 'Ask Lowen Pike at the Toll Office about the notice', marker: 'lowen' }];
      if (s === 'maren') return [{ text: 'Find Hilda Harrowgate on the keep steps', marker: 'maren' }];
      return [];
    },
    marks: (_g, s): Record<string, '!' | '?'> => (!s ? { lowen: '!' } : s === 'pike' ? { lowen: '?' } : s === 'maren' ? { maren: '?' } : {}),
  },

  storyMossgate: {
    id: 'storyMossgate', name: 'Wrong Way Round', story: { chapter: 3, title: 'Wrong Way Round' }, next: ['storyCrown', 'corrie'],
    notes: (g, s) => {
      if (s === 'wynn') return 'Ilse Blewitt\'s letter: the arches at Ketley face the wrong way. Someone at the ruins will know what she meant.';
      if (s === 'arch') return 'Wynn Carrow, who has studied the arches for eleven years, says they aren\'t gates. They\'re moorings. He wants me to look at the near arch and tell him he\'s wrong.';
      if (s === 'oak') return 'The arches have rope grooves on the north side, slanting up, and a carving of a field tied down to arches. Wynn says the builders didn\'t write, they drew and counted, and anything of theirs still whole will be in the Hollow Oak, Hagworm Wood\'s old post box. Thornwolves den at its roots.';
      if (s === 'slate') return 'I found a slate at the roots of the Hollow Oak, scratched with pictures. Wynn should see it.';
      return 'The slate shows a hill with a crown cut into it, the crown cut away, and then a field gone. Wynn says the hill is Gallows Knap in the Raddle Barrens, and that whatever was cut out of it lies under the Kirk too.';
    },
    objectives: (g, s) => {
      if (s === 'wynn') return [{ text: 'Find whoever studies the arches at Ketley Arches', marker: 'wynn' }];
      if (s === 'arch') return g.flag('archRead') ? [{ text: 'Tell Wynn Carrow what you saw', marker: 'wynn' }] : [{ text: 'Look at the near arch', marker: 'mossArch' }];
      if (s === 'oak') {
        const k = Math.min(2, kills(g, 'oak'));
        return [
          { text: `Drive off the thornwolves at the Hollow Oak (${k}/2)`, done: k >= 2, marker: 'oakHollow' },
          { text: 'Search inside the Oak', marker: 'oakHollow' },
        ];
      }
      if (s === 'slate') return [{ text: 'Bring the slate to Wynn Carrow', marker: 'wynn' }];
      return [];
    },
    marks: (g, s): Record<string, '!' | '?'> => {
      if (s === 'wynn' || s === 'slate' || (s === 'arch' && g.flag('archRead'))) return { wynn: '?' };
      return {};
    },
  },

  storyCrown: {
    id: 'storyCrown', name: 'Under the Crown', story: { chapter: 4, title: 'Under the Crown' }, next: ['storyStar', 'ilse'],
    notes: (g, s) => {
      if (s === 'corrie') return 'Gallows Knap is a ruin in the Raddle Barrens. Harrowgate keeps stores there. Corrie Dunmore at Harrowgate Works will know what\'s under it.';
      if (s === 'descend') return 'Joan Harrowgate sent a survey crew under Gallows Knap in the spring: six went down, four came out. Redbacks nest on the old builders\' iron, and one of them, the Rust Queen, is the size of a cart. The way in is the door in the tower. Joan\'s notes are still in her crew\'s camp.';
      if (s === 'queen') return 'Joan\'s survey: where the old workers stripped the cap rock off the crystal, the ground lifted, a span for every three feet. She recommends leaving at least ten feet of cap. Under it, in Hilda\'s hand: "Tender is for thirty." The tally wall is at the far end of the deep cut, past the Rust Queen.';
      if (s === 'tally') return 'The Rust Queen is dead. The builders\' tally wall is at the south end of the deep cut.';
      return 'The tally wall shows the crown cut off the hill, the ground lifting, the ropes cut, and a field going up with forty-one people on it. I have a rubbing. Ilse Blewitt should see it.';
    },
    objectives: (g, s) => {
      if (s === 'corrie') return [{ text: 'Ask Corrie Dunmore at Harrowgate Works about Gallows Knap', marker: 'corrie' }];
      if (s === 'descend') return [{ text: 'Find the survey crew\'s camp under Gallows Knap', marker: 'surveyNotes' }];
      if (s === 'queen') return [{ text: `Kill the Rust Queen (${Math.min(1, kills(g, 'queen'))}/1)`, marker: 'crownTally' }];
      if (s === 'tally') return [{ text: 'Read the tally wall', marker: 'crownTally' }];
      return [];
    },
    advance: (g, s) => (s === 'queen' && kills(g, 'queen') >= 1 ? 'tally' : null),
    marks: (_g, s): Record<string, '!' | '?'> => (s === 'corrie' ? { corrie: '?' } : {}),
  },

  storyStar: {
    id: 'storyStar', name: 'The Fallen Star', story: { chapter: 5, title: 'The Fallen Star' }, next: ['storyOttilie', 'level'],
    notes: (g, s) => {
      if (s === 'ilse') return 'The tally wall under Gallows Knap. Ilse Blewitt at Scarth Watch wrote the letter that started this; she should see what it led to.';
      if (s === 'glass') return 'Ilse: star crystal is light the way a cork is light under water, and the cap rock is what keeps it down. The Kirk sits on the largest fall she has counted. Thirty feet of cap off it would lift the floor of the valley. She wants me to look through her glass at the Weatherholms.';
      if (s === 'sela') return 'On the largest of the Weatherholms there is an arch with a rope groove, like the arches at Ketley. The isles are Ketley\'s fields. Sela Orme keeps the Glass Kirk.';
      if (s === 'joan') return 'Sela Orme will go to the sitting. Joan Harrowgate, the engineer, is camped at the east end of the Kirk floor.';
      return 'Joan gave me her survey for the sitting. Then Hilda\'s foreman started on the cut without waiting for the vote.';
    },
    objectives: (_g, s) => {
      if (s === 'ilse') return [{ text: 'Show the rubbing to Ilse Blewitt at Scarth Watch', marker: 'ilse' }];
      if (s === 'glass') return [{ text: 'Look through Ilse\'s glass at the Weatherholms', marker: 'ilseGlass' }];
      if (s === 'sela') return [{ text: 'Find Sela Orme at the Glass Kirk', marker: 'sela' }];
      if (s === 'joan') return [{ text: 'Talk to Joan Harrowgate at the east end of the Kirk', marker: 'joan' }];
      return [];
    },
    marks: (_g, s): Record<string, '!' | '?'> => (s === 'ilse' ? { ilse: '?' } : s === 'sela' ? { sela: '?' } : s === 'joan' ? { joan: '?' } : {}),
  },

  storyLift: {
    id: 'storyLift', name: 'The Lift', story: { chapter: 7, title: 'The Lift' }, next: ['storyFortyFeet', 'ottilie'],
    notes: (g, s) => {
      if (s === 'cut') return 'Harrowgate\'s crew has started stripping the cap at the east end of the Kirk floor, before the sitting has voted.';
      if (s === 'fight') return 'The floor came up two feet in four seconds where the crew had cut. Shard jellies came out of the crack with it, and something much bigger.';
      if (s === 'after') return 'The cut is clear. Joan Harrowgate is standing on the part of the floor that moved.';
      return 'Joan ordered the cut backfilled. She and Sela Orme are going to the Charter\'s sitting in Ansbury, and so am I.';
    },
    objectives: (g, s) => {
      if (s === 'cut') return [{ text: 'Get to the cut at the east end of the Kirk', marker: 'templeCut' }];
      if (s === 'fight') {
        const j = Math.min(3, kills(g, 'lift')), b = Math.min(1, kills(g, 'oldglass'));
        return [
          { text: `Kill the shard jellies from the cut (${j}/3)`, done: j >= 3, marker: 'templeCut' },
          { text: `Kill Old Glass (${b}/1)`, done: b >= 1, marker: 'templeCut' },
        ];
      }
      if (s === 'after') return [{ text: 'Talk to Joan Harrowgate', marker: 'joan' }];
      return [];
    },
    advance: (g, s) => (s === 'fight' && kills(g, 'lift') >= 3 && kills(g, 'oldglass') >= 1 ? 'after' : null),
    marks: (_g, s): Record<string, '!' | '?'> => (s === 'after' ? { joan: '?' } : {}),
  },

  storySitting: {
    id: 'storySitting', name: 'What the Charter Owes', story: { chapter: 10, title: 'What the Charter Owes' }, next: ['storyCamp1', 'road'],
    notes: (g, s) => {
      if (s === 'done') {
        const e = g.flag('charterEnd');
        if (e === 'paid') return 'The Charter will pay Harrowgate what Harrowgate paid for its debt, and a tenth, and owe it nothing more. The Kirk stays as it is. Harrowgate will bid on nothing in the Charter for a year, and Sallow Pit is shut for the winter. Fleet\'s arrears are paid first.';
        if (e === 'joan') return 'The crystal is let on Joan Harrowgate\'s terms: ten feet of cap, Joan in charge of the cut and answerable to the Charter, Sela\'s floor untouched. The debt will be paid from the crystal over twenty years.';
        return 'The Charter refused the tender. The crystal stays under its cap. The debt stands, and the Charter is meeting it with a mark more on every cart.';
      }
      let t = 'The Charter sits on the keep steps in Ansbury. Speaker Rhosyn Tarrant will hear the tender, and anyone who speaks against it.';
      if (g.has('pryce_page')) t += ' I have a page from Mr Pryce\'s book: Harrowgate bought the Charter\'s forty thousand marks of debt for twelve.';
      else if (g.flag('lowenPryce')) t += ' Lowen Pike says the man at Harrowgate Works who writes every price down twice will know what Harrowgate paid for the debt.';
      return t;
    },
    objectives: (g, s) => {
      if (s !== 'sitting') return [];
      const o: { text: string; marker?: string; done?: boolean }[] = [{ text: 'Speak at the Charter\'s sitting on the keep steps', marker: 'rhosyn' }];
      if (!g.has('pryce_page')) o.push({ text: `(Optional) Find out what Harrowgate paid for the Charter's debt (Mr Pryce asks ${pagePrice(g)} marks)`, marker: 'pryce' });
      return o;
    },
    marks: (_g, s): Record<string, '!' | '?'> => (s === 'sitting' ? { rhosyn: '?' } : {}),
  },
};
