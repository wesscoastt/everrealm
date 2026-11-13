import type { CompanionId } from './companions';

// How far along you are with a companion (the companions brief: ESO's Rapport, SWTOR's Influence): five steps from
// a stranger to a loyal companion, and one below, by their rapport (-100 to 100). Each step up is something real:
// a friend hits a little harder beside you, a trusted ally lasts longer, and a loyal companion brings what's theirs
// alone. Their story's parts open at 0, 20 and 40 (data/companions.ts STORY_AT) and romance at 60, inside these.

export interface Bond { id: 'wary' | 'stranger' | 'acquaintance' | 'friend' | 'trusted' | 'loyal'; name: string; at: number }

export const BONDS: Bond[] = [
  { id: 'wary', name: 'Wary of you', at: -100 },
  { id: 'stranger', name: 'Stranger', at: -20 },
  { id: 'acquaintance', name: 'Acquaintance', at: 10 },
  { id: 'friend', name: 'Friend', at: 25 },
  { id: 'trusted', name: 'Trusted ally', at: 45 },
  { id: 'loyal', name: 'Loyal companion', at: 70 },
];

export function bondOf(rapport: number): Bond {
  let b = BONDS[0];
  for (const x of BONDS) if (rapport >= x.at) b = x;
  return b;
}
export function nextBond(rapport: number): Bond | null { return BONDS.find((x) => x.at > rapport) ?? null; }

/** What a loyal companion brings that's theirs alone. */
export const LOYAL_PERK: Record<CompanionId, { text: string; hit?: number; hp?: number; mend?: number; guard?: number }> = {
  wenna: { text: 'Takes a sixth less from every blow: the Riders taught her to ride a hit.', guard: 0.17 },
  ottilie: { text: 'Mends a quarter more: she measures a wound before she dresses it.', mend: 0.25 },
  tam: { text: 'Hits a tenth harder again: he knows where to put a knife.', hit: 0.1 },
  ned: { text: 'A sixth more health: he refuses to fall over while you\'re watching.', hp: 0.17 },
  dave: { text: 'Hits a tenth harder: twenty years of hauling nets.', hit: 0.1 },
  fdave: { text: 'Mends a quarter more: Becky\'s gift, steadier now his hands are.', mend: 0.25 },
  daejon: { text: 'Takes a sixth less from every blow: a year on the Rock teaches you how to be hit.', guard: 0.17 },
};

/** Everything the bond adds in a fight, as shares: harder blows, more health, more mending, less taken. */
export function bondPerks(id: CompanionId, rapport: number): { hit: number; hp: number; mend: number; guard: number } {
  const b = bondOf(rapport).id, out = { hit: 0, hp: 0, mend: 0, guard: 0 };
  const at = (x: Bond['id']) => BONDS.findIndex((y) => y.id === x) <= BONDS.findIndex((y) => y.id === b);
  if (at('friend')) out.hit += 0.05;
  if (at('trusted')) out.hp += 0.1;
  if (at('loyal')) { const p = LOYAL_PERK[id]; out.hit += p.hit ?? 0; out.hp += p.hp ?? 0; out.mend += p.mend ?? 0; out.guard += p.guard ?? 0; }
  return out;
}

/** What each step up brings, for the companions window. */
export const BOND_GIVES: Partial<Record<Bond['id'], string>> = {
  friend: 'Blows a twentieth harder.',
  trusted: 'A tenth more health.',
};

/** What they say when they reach a step: in their own voice. */
export const BOND_LINES: Record<CompanionId, Partial<Record<Bond['id'], string>>> = {
  wenna: {
    friend: 'I\'d have said no to most people by now. I haven\'t. Take that how you like.',
    trusted: 'If you go down, I\'m coming back for you. That\'s not a promise. It\'s just how it is.',
    loyal: 'I lost the Riders. I\'m not losing this. Wherever you\'re going, I\'m going.',
  },
  ottilie: {
    friend: 'I\'ve put you in my notebook. Under friends. It\'s a short list. It\'s a very good list.',
    trusted: 'I\'d trust your measurements. That\'s the nicest thing I know how to say.',
    loyal: 'Wherever you go, I\'ll map it. I\'ll map all of it. You\'ll never be lost while I\'m about.',
  },
  tam: {
    friend: 'I\'ve stopped counting your purse. That\'s practically love, where I come from.',
    trusted: 'I\'d stake everything on you. And I\'ve seen the odds. They\'re terrible.',
    loyal: 'I\'ve walked out on every table I ever sat at. Not this one. Deal me in for good.',
  },
  ned: {
    friend: 'We\'re friends. Actual friends. I\'m going to need to sit down.',
    trusted: 'You trust me to watch your back. Me! I won\'t blink. I\'ve been practising not blinking.',
    loyal: 'I used to write about you. Now I\'m in the story. I\'m staying in it to the end.',
  },
  dave: {
    friend: 'You\'re all right, you are.',
    trusted: 'I\'d let you take the boat out on your own. That\'s saying something.',
    loyal: 'Whatever you need. You only have to ask.',
  },
  fdave: {
    friend: 'You know, I think we might be friends. Becky always said I\'d make one eventually.',
    trusted: 'I don\'t trust easy, not since the drink. But I trust you.',
    loyal: 'You got me out of the bottle and back to Becky. I\'ll follow you anywhere. Sober.',
  },
  daejon: {
    friend: 'I think I can call you a friend. I haven\'t had one I could say that to since I was nineteen.',
    trusted: 'I\'d tell you the rest of it. The Gull years. All of it. Ask, some night.',
    loyal: 'You took me off the Rock. Anywhere you go, I go. That\'s not a debt any more. It\'s a choice.',
  },
};
