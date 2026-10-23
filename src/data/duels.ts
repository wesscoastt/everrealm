// The Cockpit at Saltpenny Key (world/sites.ts buildSaltpenny, game/Duels.ts): the ring where the
// Brethren settle things to first blood, and the loser buys a round at the Leaning Mast. Jago Sweeney
// keeps the ladder: five fighters, and nobody fights the one above until they've beaten the one below.
// A duel ends when one side is down to half (the duelist) or a quarter (you): they yield, or you do.
// Nobody dies. Stepping out of the ring forfeits.

export interface Duelist {
  id: string;
  /** The creature fought (data/gameplay.ts, duel_*). */
  type: string;
  name: string;
  title: string;
  /** Said stepping into the ring; said yielding to you; said when you yield to them. */
  pull: string;
  yields: string;
  wins: string;
  /** Marks the first time you beat them (written for the Keys' level; paid at yours). */
  purse: number;
}

export const DUELISTS: Duelist[] = [
  { id: 'rowe', type: 'duel_rowe', name: 'Kit Rowe', title: 'deckhand on the Gannet\'s Luck', purse: 120, pull: 'First blood. I\'ve never had first blood off anyone. Today, then.', yields: 'Enough! That\'s blood. Mine. I\'ll buy. I always buy.', wins: 'That\'s blood! Yours! Jago, did you see? Somebody tell my mother.' },
  { id: 'skerry', type: 'duel_skerry', name: 'Hannah Skerry', title: 'bosun of the Kittiwake', purse: 180, pull: 'Mara says you\'re handy. Mara says a lot of things about people she\'s paid.', yields: 'All right. All right. You\'re handy. Don\'t tell Mara I said it.', wins: 'Yield, then. No shame in it. Some shame. Buy me a rum.' },
  { id: 'abel', type: 'duel_abel', name: 'Ruth Abel', title: 'gunner, who throws what she can\'t shoot', purse: 250, pull: 'Stay back from me. It\'s more fun for me that way.', yields: 'You got close. Nobody gets close. Fine. The round\'s on me.', wins: 'Told you to stay back. Now you know why.' },
  { id: 'crowe', type: 'duel_crowe', name: 'Mattias Crowe', title: 'captain of the Long Shilling', purse: 330, pull: 'I\'ve settled four disputes in this ring and lost none of the ships over them. Shall we?', yields: 'Well fought. I yield the point and keep the ship. Barkeep!', wins: 'You yield? Good. I hate an argument that goes on.' },
  { id: 'coyle', type: 'duel_coyle', name: 'Mara Coyle', title: 'master of the Kittiwake', purse: 450, pull: 'I don\'t fight in the Cockpit. I\'m making an exception because Jago asked, and because I want to.', yields: 'That\'s blood. Mine, for once. The Table will hear about this, and I\'ll be the one who tells them.', wins: 'You\'re good. Not yet good enough. Come back when you are. I\'ll still be here. I\'m always here.' },
];

/** The trophy for beating the whole ladder. */
export const LADDER_PRIZE = 'cockpit_ribbon';
