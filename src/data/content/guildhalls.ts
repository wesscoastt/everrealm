import type { DialogueTree, DNode, DOption, GameApi } from '../../game/api';
import { HALL_CLERK, HALL_LEASE, HALLS } from '../guildhalls';
import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';

// Walter Pinnock, Clerk of the Halls, at his desk at the head of Hall Row (data/guildhalls.ts). He
// shows you round any of the eight on paper, and takes the lease from a guild's officer. After that,
// a guild's own hall page (the social panel's Hall tab) is where its members build it out.

const cap = (t: string) => t[0].toUpperCase() + t.slice(1);
const free = (g: GameApi, id: string) => g.guildHall().free.includes(id);

const npcs: NpcDef[] = [
  {
    land: 'counties', id: 'hall_clerk', name: 'Walter Pinnock', title: 'Clerk of the Halls',
    look: { skin: '#e0b898', hair: '#c8c4bc', hairStyle: 1, eyes: '#4a4a5a', tunic: '#2a2a34', trim: '#c8a050', trousers: '#2a2a2e', boots: '#1e1a16', build: 0.9, age: 0.85 },
    schedule: [{ from: 7, to: 19, at: HALL_CLERK.at, face: [HALL_CLERK.at[0], HALL_CLERK.at[1] + 4], anim: 'idle' }, { from: 19, to: 7, at: [HALL_CLERK.at[0] + 0.4, HALL_CLERK.at[1] - 0.9], face: [HALL_CLERK.at[0], HALL_CLERK.at[1] + 4], anim: 'idle' }],
    barks: ['Halls to let. Guilds only.', 'Eight halls, and the Charter would like rent on all of them.', 'Mind the step. The mercers put it there to make you look up.'],
  },
];

const hallNodes: Record<string, DNode> = {};
for (const h of HALLS) {
  hallNodes['h_' + h.id] = {
    text: h.blurb,
    options: [
      { text: 'We\'ll take it.', cond: (g) => free(g, h.id) && g.guildHall().officer && !g.guildHall().hall, next: 'wTaken', effect: (g) => g.leaseHall(h.id) },
      { text: 'Tell me about another.', next: 'wWhich' },
      { text: 'Thank you.' },
    ],
  };
}

const which: DOption[] = HALLS.map((h) => ({ text: (g: GameApi) => `${cap(h.name)}${g.guildHall().online && !free(g, h.id) ? ' (let)' : ''}`, next: 'h_' + h.id }));

const clerk: DialogueTree = {
  start: () => 'w1',
  nodes: {
    w1: {
      text: (g) => (g.guildHall().hall ? 'Your guild\'s hall is in good hands, I hope. Mine are full of paper.' : 'Walter Pinnock, Clerk of the Halls. These were the old companies\'. The Charter lets them now, to guilds.'),
      options: [
        { text: 'Tell me about the halls.', next: 'w2' },
        { text: 'Which ones are free?', next: 'wFree' },
        { text: 'Show me one.', next: 'wWhich' },
        { text: 'I\'d like to lease a hall for my guild.', cond: (g) => g.guildHall().online && g.guildHall().officer && !g.guildHall().hall, next: 'wLease' },
        { text: 'How\'s our hall coming on?', cond: (g) => !!g.guildHall().hall, effect: (g) => g.openHallPage() },
        { text: 'Good day.' },
      ],
    },
    w2: { text: 'The fullers, the dyers, the chandlers and the rest built them outside the old wall, where land was cheap. Then the new wall left them outside it.', next: 'w3' },
    w3: { text: 'The companies are a few old men and a dinner a year now. The Charter took the halls for what they owed.', next: 'w4' },
    w4: { text: `A guild leases one for ${HALL_LEASE.toLocaleString()} marks from its vault. Then it makes the place its own.`, next: 'w5' },
    w5: {
      text: 'A long table, a forge in the yard, a counting room, a map room, a roll of honour. Your people bring the timber and the iron. I bring the paperwork.',
      options: [{ text: 'Which ones are free?', next: 'wFree' }, { text: 'Show me one.', next: 'wWhich' }, { text: 'Good day.' }],
    },
    wFree: {
      text: (g) => {
        const v = g.guildHall();
        if (!v.online) return 'I\'d have to look in the book, and the book\'s on the realm. Come back when you\'re playing online.';
        const f = HALLS.filter((h) => v.free.includes(h.id)).map((h) => h.name.replace(/^the /, ''));
        return !f.length ? 'None. Every hall on the row is let. That\'s never happened.' : f.length === HALLS.length ? 'All eight. Take your pick.' : `${f.length === 1 ? 'Just the one' : f.length + ' of them'}: ${f.join(', ')}.`;
      },
      options: [{ text: 'Show me one.', next: 'wWhich' }, { text: 'Good day.' }],
    },
    wWhich: { text: 'Which one?', options: [...which, { text: 'None for now.' }] },
    wLease: {
      text: (g) => `Which one? It's ${HALL_LEASE.toLocaleString()} marks from your guild's vault, and the vault holds ${g.guildHall().vaultMarks.toLocaleString()}.`,
      options: [...which, { text: 'Let me think about it.' }],
    },
    wTaken: { text: 'Then I\'ll make out the lease. If the vault\'s good for it, the keys are yours, and your banners go up by evening.' },
    ...hallNodes,
  },
};

export const GUILDHALLS_CONTENT: RegionContent = { id: 'guildhalls', npcs, dialogue: { hall_clerk: clerk } };
