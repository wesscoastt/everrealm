import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { utcDay } from '../calendar';
import { shareOwed, STAKE_TIERS, stakeOf, TOWN_STAKES } from '../stakes';
import { addOption, hook } from './kit';
import type { RegionContent } from './types';

// A stake in the towns' own trades (data/stakes.ts TOWN_STAKES), as at the country businesses: put marks
// into a market stall, a chandlery, an inn, a maker's shop, and take a share of the takings by the day and
// the partner's price at the counter. Each keeper keeps their own conversation; this adds the stake to it.

function stakeNodes(id: string, pitch: string): Record<string, DNode> {
  const key = 'stake:' + id;
  const stake = (g: GameApi) => stakeOf(g.flag(key));
  const put = (tier: number) => (g: GameApi) => {
    const had = stake(g), cost = STAKE_TIERS[tier] - (had ? STAKE_TIERS[had.tier] : 0);
    if (g.marks < cost) { g.toast(`That's ${cost} marks.`); return; }
    if (had) { const owed = shareOwed(had); if (owed) g.addMarks(owed); }
    g.addMarks(-cost);
    g.setFlag(key, { tier, day: utcDay() });
    g.toast(`A partner in the place: ${STAKE_TIERS[tier]} marks in. Your share is put by every day.`);
  };
  return {
    ts_stake: {
      text: `${pitch} ${STAKE_TIERS[0]} marks buys a share of what comes in, ${STAKE_TIERS[1]} a bigger one, ${STAKE_TIERS[2]} and you're family. Your share put by every day, and the family price.`,
      options: [...STAKE_TIERS.map((n, tier) => ({ text: `${n} marks.`, cond: (g: GameApi) => g.marks >= n, effect: put(tier), next: 'ts_thanks' })), { text: 'Let me think about it.' }],
    },
    ts_thanks: { text: 'Then we shake on it. Your share goes in the tin under the counter, and nobody looks in the tin but me.' },
    ts_share: {
      text: (g) => { const owed = shareOwed(stake(g)!); return owed ? `${owed} marks put by since you were last in. Count it.` : 'Nothing put by yet. Come back tomorrow; the takings come in by the day.'; },
      options: [
        { text: 'Thank you.', cond: (g) => shareOwed(stake(g)!) > 0, effect: (g) => { const s = stake(g)!; g.addMarks(shareOwed(s)); g.setFlag(key, { ...s, day: utcDay() }); } },
        ...STAKE_TIERS.map((n, tier) => ({ text: `Put more in: make it ${n} marks.`, cond: (g: GameApi) => { const s = stake(g); return !!s && tier === s.tier + 1 && g.marks >= n - STAKE_TIERS[s.tier]; }, effect: put(tier), next: 'ts_thanks' })),
        { text: 'Good day.' },
      ],
    },
  };
}

const hooks = (D: Record<string, DialogueTree>) => {
  for (const t of TOWN_STAKES) {
    if (!D[t.npc]) continue;
    hook(D, t.npc, () => undefined, stakeNodes(t.npc, t.pitch));
    addOption(D, t.npc, t.node, { text: 'I\'d put money into the place.', cond: (g) => !stakeOf(g.flag('stake:' + t.npc)), next: 'ts_stake' });
    addOption(D, t.npc, t.node, { text: 'My share?', cond: (g) => !!stakeOf(g.flag('stake:' + t.npc)), next: 'ts_share' });
  }
};

export const TOWN_STAKES_CONTENT: RegionContent = { id: 'townStakes', hooks };
