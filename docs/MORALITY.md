# Morality, alignment and reputation: writing content for it

The owner's brief is docs/briefs/morality.md. The system is `src/data/morality.ts`; the game side is
`Game.deed()` / `Game.moral()`, the dialogue runner (`nodeOptions`, `chooseOption`), companions' reactions
(`src/data/companionMorals.ts`, `Companions.moralDeed`), the Character page in the journal, and the server's check
(`moralCheck` in `server/server.mjs`). Tests: `npm run morality`.

## The idea in one paragraph

Every meaningful thing a character does is a **deed** with its own id, written once in their **book of deeds**
(the save's `moral` flag). Alignment, the eight traits, regard with groups, and individual people's feelings are all
worked out from the book. Nothing else stores them, so they can't drift, double up, or be edited on their own, and the
server refuses a save whose book has lost or changed a deed.

## Scales

- **Alignment**, -100 to 100. Evil -100 to -76, Bad -75 to -26, Neutral -25 to 25, Good 26 to 75, Heroic 76 to 100.
  A deed moves it at most 25. Never final: a hero can fall and the worst can come back.
- **Traits**, 0 to 100 from an even 50: compassion, greed, honesty, cruelty, courage, loyalty, deception, generosity.
  At most 10 per deed. Shown to the player as words, never numbers.
- **Regard**, -100 to 100 per group (`GROUPS`: kingdoms, towns, guilds, faiths, soldieries, criminal brotherhoods).
  At most 30 per deed. A group the player has never touched isn't shown.
- **Feelings**, -100 to 100 per person (an NPC id, or `comp:<id>` for a companion). At most 40 per deed.

Alignment does not decide regard. A heroic character can be loathed by the Court of Verandah; an evil one honoured by
the Ropewalk Cellar.

## Writing a choice

Put `moral` on a dialogue option. It is written when the option is chosen, once, with the NPC you're talking to as a
witness (and the companion with you, who reacts by their own morals).

```ts
{ text: 'Keep your money. I\'ll see the cart to Ansbury.',
  moral: { id: 'crCart:free', a: 12, tr: { generosity: 4, compassion: 3 }, npc: { cr_ada: 25 }, rep: { ansbury: 4 },
           note: 'Guarded Ada Penrose\'s cart for nothing.', fame: 'saw a carter safe for nothing', spread: 'local' },
  effect: (g) => g.setStage(CART, 'escort'), next: 'free1' },
```

- `id`: unique for the decision. Re-choosing the same option never counts twice.
- `a`: alignment. Most choices are 2 to 8. Save 12 to 25 for the things people would tell their grandchildren.
- Leave out what a deed doesn't touch. **Not every decision needs alignment**: plenty are just regard, or nothing.
- `note` + `major: true` puts it under Major decisions on the Character page; `note` alone puts it in the record.
- `spread`: how word gets about. `self` (only them), `witness` (those there, then the district in time), `local` (the
  district after the gossip, `GOSSIP_MS`), `faction` (a group's members after `FACTION_MS`; give `group`), `realm` (cried
  abroad: everyone). Use `who: [ids]` for named witnesses.
- Options with `a` of 3 or more show a small gold (light) or red (dark) mark by their number, SWTOR's way. `quiet: true`
  hides it, for a consequence the player shouldn't see coming.

In code outside dialogue (a thing's `use`, a node's `effect`), call `deed(g, {...})` from `./kit`.

## Asking who the character is

```ts
import { bandIs, did, moral, qualifies } from './kit';
bandIs(g) === 'heroic'
did(g, 'crCart:rob')
moral(g).traits.greed > 70
moral(g).regard.ropewalk >= 25
moral(g).feel.cr_ada < -20
qualifies(g, { band: ['bad', 'evil'], trait: { loyalty: [60, 100] } })
```

Put `need` on an option to offer it only to those who qualify. It shows its tag ("[Heroic]", "[Bad or Evil]", "[Bold]"):

```ts
{ text: 'You know who I am. Nobody touches this cart.', need: { band: ['heroic'] }, next: 'fame1' }
```

**Never make alignment a gate on a quest.** Gate *approaches* and *dialogue*, not access. An evil character should be
able to help a widow, for their own reasons; a hero should be able to walk into the Ropewalk Cellar.

## Who has heard

`knows(hearer, deed)` and `heardOf(book, hearer)` answer whether someone has heard of a deed by now: done to them,
seen, gossiped round their district, passed round their group, or cried abroad. Use it for a line that only someone
who could have heard would say:

```ts
const heard = heardOf(readBook(g.flag('moral')), { id: 'tamsin', region: 'greenwake', groups: ['ansbury'] });
```

## Choices written before the book

`CHOICE_DEEDS` lists older quest choices (a flag set to a value) with the weight they carry. When the flag is set, the
deed is written; a save from before the book gets its old choices written in once when it loads. Add to it when you
give an old quest's choice moral weight. New content uses `moral` on options instead.

## Companions

`src/data/companionMorals.ts`: how much each companion cares about light and dark (`light`, negative for those who
like an edge), which traits they weigh and how, their approve/disapprove lines, and whether they `leave` for good when
rapport falls to -80 through what they've watched you do. A deed can also touch a companion directly with
`npc: { 'comp:wenna': -10 }`.

## The six examples the brief asks for

Four are written as a real quest, `src/data/content/hagwormSalt.ts` (The Hollin Ford Salt and Salt Back, on the woods road from Fellers' Camp to Hollin Ford): read it alongside this list.

1. **A heroic-only optional response**: `need: { band: ['heroic'] }` on an option. In the quest: "You know who I am. Let them hear it.", and two of the three footpads leave.
2. **A quest with five moral approaches** (Ada's ask: free, a sack of salt, fifty marks up front, walk on, rob her): one node with five options, each with its own `moral` and its own stage
   or flag, all reaching an ending (heroic: for nothing; good: a fair favour; neutral: decline; bad: an extortionate
   price; evil: rob the one asking). The walker checks every ending is reachable.
3. **A faction that recruits evil characters**: the recruiter's opening offers `need: { band: ['bad', 'evil'] }` a
   straight invitation, and everyone else another way in (a job, a test, a lie) so it's never a gate.
4. **A redemption quest** (Salt Back, for whoever robbed or sold out Ada): offered when `moral(g).align <= -26` and `did(g, <the old wrong>)`, its deeds positive and
   `major`, and the wronged person's `feel` rising only if they `knows()` you came back.
5. **An NPC who remembers a betrayal** (Jem Sallow's offer, and Ada at home after): the betraying option carries `npc: { thatNpc: -40 }`; their tree's start picks
   a cold opening when `moral(g).feel.thatNpc <= -30`, and `did(g, 'betrayalId')` lets them name it.
6. **A kingdom whose regard follows a political decision**: the decision's options carry
   `rep: { verandah: -25, charter: 15 }` with `spread: 'realm'`, and the court's people check `moral(g).regard.verandah`.

## Gossip

Passers-by in a town now and then say what they've heard you did (`Game.gossipAt`): the `fame` of a deed whose word has reached their district, admiring for a light deed, wary for a dark one; and for a Heroic or Evil name with nothing particular heard, a line for that. Give a deed a `fame` written to follow "the one who": `fame: 'pulled the miller's boy out of the race'`.
