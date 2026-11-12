# Everrealm: narrative review and revised plan

This is the review the owner asked for on 2026-11-11 (brief: docs/briefs/narrative-review.md). It covers the seven
deliverables the brief asks for. Nothing in it has been built yet: it is for the owner to read, argue with and
approve before any story code changes.

Sources read for this review:
- docs/LORE.md (canon; it still wins);
- docs/NARRATIVE_STYLE.md, docs/STORY_PLAN.md, docs/MORROW.md and docs/CONTINENT3.md;
- the built chapters (story.ts, storyQuests.ts, and the act and region content files);
- companions.ts and the companions' dialogue;
- the Verandah lore book and content.

File references are given so every claim can be checked.

---

## 1. The critique

### What works, and should be protected

These are the reasons to keep the existing plan and improve it, not replace it.

- **The spine is genuinely good.** A debt, someone who bought it cheap, and ground that moves when something is taken
  out of it is a theme with real teeth. It turns geology into economics and economics into people, and almost no
  fantasy RPG does that.
- **The trouble always has a human cause.** This rule is the campaign's identity. The Held rise because diggers
  sold the black, and the towers lean because someone took the black out of them. Keep this above everything.
- **The voices are distinct and grounded.** Maud's numbers, Bram's deflections, Hesk counting in carts and Tamsin's
  arithmetic friendliness all read as people. NARRATIVE_STYLE.md is a strong working standard.
- **Pryce is the best character idea in the game.** He openly prices everything, "two prices on every line", and
  ends up the only honest man in the room. That sits at the centre of the brief's question about whether honesty is
  the same as goodness.
- **Some choices really do carry.** `charterEnd`, `tdEnd`, `tamEnd`, `rhosynFate` and the Old Tower all change
  later lines. The bones of a reactive campaign are already in place.

### What is weak, in order of how much it costs the story

**1. Hilda is offstage for most of the campaign, and she is the antagonist.**
- After Act III's dredging tender (holmsey.ts:179) she is gone until the plan brings her back in Act VIII, which is
  some forty chapters later.
- Her one development in that gap is a line: she "went south a fortnight ago" (actSixB.ts:125).
- The plan's arc for her (from a hard woman you can argue with to someone who drains a living thing and calls it
  sense) is a good arc that the player never watches happen.
- Her code id is still `maren` and her survey is signed "M.H." (story.ts:117, 342), so even the data hasn't fully
  settled who she is.
- What's missing is why she is like this. Nothing establishes her history, what she is afraid of, what she was like
  at twenty, or why the debt matters to her personally rather than as a ledger line.

**2. The supernatural rules contradict each other, and the plan leans on them more and more.**

| Rule | Where | The problem |
|---|---|---|
| Taking crystal off an isle makes it sink | Weatherholms, LORE.md:456 | Consistent with Callis on its own, but nothing says how the two fit together |
| "Settled crystal lifts" | Callis, LORE.md:872 | Reads as the opposite rule |
| Holmsey is rising "since the Kirk floor came up" | LORE.md:494 | No mechanism given |
| The black holds the dead down | LORE.md:884 | Yet Brenna's mother-in-law rose with no black on her (actFive.ts:65) |
| The Old Mother crosses the Counties every three hours, "nobody knows what she is yet" | LORE.md:1071 | Her waking is explained only in Serra's plan, so the player sees her from hour one and gets no answer for seven acts |

The danger is the brief's own point: once the rules are vague, every new act can bend them, and the human cause
gets lost behind "the crystal did it".

**3. Choices that are promised but ignored.**
- `tdEnd` "back" says the black goes back and the Held lie down (kingsbarrow.ts:12-13). Act V then opens the same
  way whatever you chose (actFive.ts:42). This breaks NARRATIVE_STYLE rule 8 ("only promise what the game does"),
  and it is the most serious continuity fault in the game.
- `charterEnd` "paid" repays Harrowgate in full (story.ts:365), yet in Act VI the Assembly holds the full 40,000
  whatever the ending.
- The Kittiwake wrong turn, the plan's best one, wasn't built as designed. What burns in the game is the wreckers'
  boat (saltpenny.ts:87), and the Kittiwake later carries the families safely.

**4. Small facts that contradict each other, all fixable.**

| Fact | Version A | Version B | Version C |
|---|---|---|---|
| The Light Fund oil | Lowen Pike held 3 barrels back (story.ts:69) | Captain G. Ottery held them by order (companions content:148) | Pike sold 6 to Pryce at 11 marks (actOne.ts:68); LORE says 3 for 12 |
| Captain of the Toll Riders | Prowse (chapter 9) | Ottery (Wenna's own story) | |
| How long Sela has watched the Kirk floor | "same height for a hundred years" | 40 years of chalk marks | "thirty years"; and she is "six years on the hill" |
| Margery Fenn, Ottilie's grandmother | One of the forty-one "forty years ago" | The forty-one belong 800 years back (LORE.md:412) | |
| Rhosyn's motive | A kinder creditor (actSix.ts:97) | "To buy crystal out of the Charter's reach" (LORE.md:898) | Selling crystal to Morrow (the plan) |
| Who bought the Charter's debt, and when | Pascall: the Assembly "last spring" (actSix.ts:65) | Hilda still tenders on it at the Act I sitting | |
| Hollow Fell | 8 barrows (LORE.md:956) | 5 on the tally board | Edda: 6 stripped |
| Wat's diggers | 12 (greywaste.ts:38) | 11 (LORE.md:961) | |
| A Tam you turn out | "I'll be on the quay" (actFour.ts:66) | The Kittiwake took him away (companions content:290) | |

**5. The companions don't talk to each other, and two of the five aren't built.**
- There is no companion-to-companion banter. Only one companion travels with you at a time.
- Wat is an NPC, not a companion. Wend doesn't exist.
- The camps carry the relationships: Camp V is Wenna alone, which is right for her grief but leaves the others with
  nothing.
- The relationships the brief wants (friendships, rivalries, conflicts that resolve without you) have no system to
  live in yet.

**6. The hidden third way in Act VI is a stat gate.**
- It needs both companions at rapport 60, both at story part 3, and Pryce's book in hand (actSixB.ts:35).
- The brief says it must be discovered through story, and it's right. As built, a player can earn it without ever
  understanding why it works.
- The cost (Pryce's book) is good. The way in isn't.

**7. Deaths and losses: some are earned, some aren't yet.**
- **Ursel** dies one act after we meet her (chapters 32 and 42), with almost nothing in between. Wenna knew her
  "nine days". That is the point, but the player needs at least one scene with her that isn't exposition.
- **Joan** is planned to die in Act VIII, but she has been offstage since Act IV. Her death needs her back on the
  page in Acts VI and VII, or it will land on a character the player barely remembers.
- **Marta Vidal** can die in chapter 50 and is never mentioned again.
- **Stair** burns in Act VII's first chapter. That is fine as a disaster, but a town the player has never seen
  burning only matters through people, so the plan's "who you carry out" must be real.
- **Wenna or Tam** at the Old Tower: the design is good, but the brake and the stair are fixed (Wenna is always at
  the brake), so the scene can't respond to who the player has grown closer to.

**8. Numbering and the plan's own bookkeeping.**
- 53 chapters are built, against the plan's "22 today" (STORY_PLAN.md:22).
- Acts V and VI were built at 9 chapters each instead of 14, so the plan's numbers for Acts VII to X are all 13 too
  high.
- Old numerals survive in code comments and in LORE.md. Section 7 lists every one.

**9. Transitions between acts are weak.**
- How and why the player leaves the Counties for Morrow (III to IV) is carried by Delia paying your passage. It
  works, but the player didn't choose to go.
- Act VI to VII: the plan sends a letter, while the game has Delia in Callis in person.
- Serra joins the main story only through the Corvo loan, and Hilda's journey south happens offscreen.

**10. The protagonist.**
- "A useful stranger" is right and should stay. But the player's personal stake is thin: you are always someone's
  witness, escort or errand.
- The ESO and BioWare standard isn't a chosen one. It is a person whose relationships and reputation the world
  responds to.
- What's missing:
  - a home base the story returns to;
  - people who know your face and your history and say so;
  - a few dialogue choices that let you set a temperament (kind, dry, hard, wry) that later lines remember.

**11. Filler risk in the plan as written.**
- Camps are numbered chapters every act. They are valuable, but they inflate the count.
- The plan repeats beats. "Lie Still, Again" repeats chapter 31. Act IX's "Three Ways" reruns the Act IV three-way
  choice in the same shape.
- The plan's 112 chapters will mean thin chapters in places. The revised outline aims at about 95, and every chapter
  is listed with what it changes.

**12. Verandah isn't in canon at all.**
- LORE.md never mentions it.
- Its lore book uses shillings and "mayors" (lorebooks.ts:30), where the canon has marks and reeves.
- Its king is a crowned harbourmaster (King Edmund). That is a good grounded fact: a port that made itself a kingdom
  and has to keep being worth not conquering.
- Section 3 places it.

---

## 2. Recommended changes

Each is marked **[fix]** for a continuity repair, **[deepen]** for added content inside what exists, or **[change]**
for altering a planned beat. Built content is preserved in every case: nothing built is thrown away.

### Canon and continuity
1. **[fix]** One version of the Light Fund oil.
   - Pike sold six barrels to Pryce at eleven marks, signed off "by order" of Captain Ottery of the Riders.
   - Prowse took over the Riders after Ottery was moved up to the Toll Office.
   - That keeps every built line true, and gives Wenna's story and chapter 9 the same villain.
2. **[fix]** Sela has kept the Kirk's chalk for forty years. "A hundred years" becomes her mother's and
   grandmother's marks, read off the older wall. "Six years on the hill" becomes "six years keeping the book".
3. **[fix]** Margery Fenn was one of the forty-one *families' descendants* who went back to Gallows Knap forty
   years ago to take a count. That keeps Ottilie's grandmother, the 800-year history and the word "forty-one".
4. **[fix]** Rhosyn's motive becomes one story told three ways:
   - she moved the debt to a creditor she thought kinder (the Assembly);
   - she paid for that by letting crystal out of the Charter's reach;
   - Morrow was the buyer.
   Each built line is one person's partial account of it.
5. **[fix]** The debt timeline:
   - Harrowgate sold the debt on to the Assembly the spring before the game starts, and kept the right to collect
     it.
   - That is why Hilda tenders at the sitting: she is collecting for a buyer.
   - `charterEnd` "paid" pays Harrowgate's collection fee, not the principal.
6. **[fix]** The Act IV ending carries into Act V. If `tdEnd` was "back":
   - Act V opens with the Held quieter;
   - chapter 36's walkers are the ones who had already left before the black went back;
   - Ma's barrow is the exception, because someone lifted its slab again.
   Lines change in chapters 36 to 38 and in Edda's rolls. This needs a few dozen lines and two flag checks.
7. **[fix]** The barrow counts:
   - Hollow Fell has eight barrows; six were stripped, two still capped.
   - The tally board says five because it's out of date.
   - Wat's diggers were twelve, and he left eleven behind (one was his brother).
8. **[fix]** A Tam who is turned out goes to the quay, and the Kittiwake takes him later. Both lines are true at
   different times.
9. **[fix]** The renames left half done:
   - `maren` becomes `hilda`;
   - `maud_hale` becomes `ursel_hale`;
   - LORE's store-clerk "Tam" becomes Lewin Feld;
   - the Verandah lore book uses marks and reeves, or explains its own coin (see section 3).
   Pure data, no player-facing change except the fixes themselves.

### Antagonists
10. **[deepen]** Hilda gets a history and stays on the page. See section 3's Hilda thread:
    - one scene per act from Act IV to IX, short and in person;
    - each one a step in her deterioration that the player watches and can argue with;
    - she is never cartoonish, and she always has a point.
11. **[deepen]** Pryce's honesty gets tested:
    - in Act V he openly sells the black's location to the Assembly and to the Brethren at the same price, and tells
      each that he did;
    - in Act VI he refuses to lie for you when a lie would save someone you love.
    Honest is not the same as good, and the player should feel the difference.

### Companions
12. **[deepen]** Companion conversations between each other, out in the world (section 4's matrix): short exchanges
    that fire on place, time and what has happened, with one or two companions in your group or at your camp.
13. **[deepen]** Wat Aske becomes a full companion in Act V, as planned.
14. **[deepen]** Wend is built with Serra (Act VII).
15. **[change]** Departures: a companion who leaves can be won back once, through a scene in a place that matters
    to them, as the plan says (not built yet).
16. **[change]** The Old Tower's third way is discoverable through story, not rapport (section 5). Rapport still
    matters for whether they trust you enough to do it.
17. **[change]** The Old Tower's roles follow the bond:
    - the companion you're closer to takes the brake, because they trust you to get the clerks out;
    - the other takes the stair.
    Both orders are written.

### Losses
18. **[deepen]** Ursel: one scene in Act IV after the gate (she walks the wall with Wenna and the player) and her
    letters in Act V, so her death costs something.
19. **[deepen]** Joan comes back on the page:
    - in Act VI she is in Callis, checking Pryce's copies;
    - in Act VII she is the one who reads the Hill's temperatures and works out what the pipes are doing.
    Her death in Act VIII then lands.
20. **[deepen]** Marta Vidal's death, if it happens, is remembered: her gauges are unread at the next Callis
    chapter, and Benet Sala says so.
21. **[change]** Stair: you see it alive first. The packet calls at Stair in the last chapter of Act VI, so you meet
    three people there before the Old Mother passes over it.

### The protagonist
22. **[deepen]** A temperament the story remembers:
    - at four points in Act I, the main story offers a short choice of manner (plain, kind, dry or hard);
    - it is tracked as a running tendency, not a meter;
    - later lines pick from it ("You were straight with me at the sitting").
    This fits the morality brief (docs/briefs/morality.md) and becomes its first use.
23. **[deepen]** A home the story comes back to:
    - Hollin Ford's Moot Oak, where the camps begin and end;
    - Sela's book, where the names you've earned are written;
    - the Ford Bell, which rings when you come home between acts.
24. **[deepen]** Reputation in the regions:
    - each region keeps what you did there;
    - its people say so when you come back;
    - its prices, doors and side quests change with it (the morality brief's reputation system).

### Structure
25. **[change]** The camps stay, but stop being numbered chapters. They become "the night after" scenes at the
    end of each act, entered from the act's last chapter. Built camp quest ids are kept; only the chapter card
    changes.
26. **[change]** The total is cut from 112 to about 95 by removing repeats and folding thin chapters together
    (section 3).
27. **[change]** Verandah's Silent Waters becomes the bridge between Act III and Act IV (section 3), so the
    crossing to Morrow is the player's own decision.

---

## 3. The revised outline

### Numbering rule
- Built chapters keep their numbers, 1 to 53.
- New material inside a built act is added as companion scenes, regional chapters or "the night after" scenes, not
  as renumbered main chapters.
- New main chapters start at 54.
- Camps lose their chapter numbers in the journal, but keep their places.

### Part one: the Counties (built: 1 to 26)

**Act I, The Charter's Debt (1 to 11, built).**
- Keep it as it is, with fixes 1, 2, 5 and 9.
- Add the four temperament moments.
- Add one Hilda scene: after chapter 10, she buys you a drink at the Waystation, tells you you're right about the
  carters, and that the Charter will still lose.

**Act II, The Weatherholms (12 to 20, built).**
- Fix 3.
- Add one Hilda scene: she is on the hoist platform the night Delyth climbs down. She saw the rope and said
  nothing, and she tells you why ("Nine of them chose it. That's the only honest thing that happened here.").

**Act III, The Drowned Parish (21 to 26, built).**
- Keep it.
- Hilda's dredging tender gets her one human moment: Holmsey is where her mother was born.

**Interlude, The Silent Waters (regional campaign, Verandah; levels 20 to 30, matching Verandah's region).**
- About ten regional chapters (V1 to V10). The full outline goes in docs/briefs/verandah-silent-waters.md's design
  document once approved.
- Verandah's ships and fishing boats go missing on the run south of the Counties.
- It starts grounded:
  - customs disputes;
  - a missing herring boat;
  - a cooper who can't get staves.
  It grows into a smuggling ring carrying white crystal out of the Charter's reach to Morrow, the same trade Rhosyn
  let through.
- Verandah's two forts each matter:
  - **the Fortress** (the smugglers' old den, now the harbour's);
  - **Awschitz** (the coast watch);
  - each with its commander, who disagree about how far to trust the merchant houses.
- The merchant house behind it sells to the Brethren of Saltpenny, which is how the player first hears of Ned Vey.
- The last chapter puts you on the ship south, by your own choice, to follow the cargo. That replaces "Delia pays
  your passage" as the reason you go to Morrow (Delia still pays: you're carrying her letter as well).
- **Verandah in canon:**
  - a free port south-west of the Counties;
  - outside the Charter, but trading under it;
  - its king a harbourmaster's grandson who took the crown when the Charter wouldn't protect the town from the
    second raid;
  - it mints its own shillings at par with the mark.
  That is why the lore book counts in shillings, and why its people distrust the Charter.
- Fisherman Dave's questline (docs/briefs/fisherman-dave.md) sits in this region as a self-contained side story,
  outside the main campaign.

### Part two: Morrow (built: 27 to 53)

**Act IV, The Third Daughter (27 to 35, built).**
- Fix 6's setup.
- Add Ursel's wall walk (deepen 18).
- Hilda isn't in Morrow. Her letter to Delia, which Delia shows you at chapter 34, is the first sign she has stopped
  arguing and started deciding.

**Act V, The Held (36 to 44, built).**
- Fix 6, so the act opens by `tdEnd`.
- Wat joins as a companion here, in chapter 40 "The Fells at Night", with his own story parts.
- Pryce's open sale of the black's location goes into chapter 37 "A.P., Again" (deepen 11).

**Act VI, The Tall City (45 to 53, built).**
- The third way made discoverable (section 5).
- Joan in Callis (deepen 19).
- Marta remembered (deepen 20).
- Rhosyn as one story (fix 4).
- Add two companion scenes the plan wanted:
  - Mara Coyle, the Kittiwake's master, now about the families she carried and who paid for them;
  - Wat goes back into Hollow Fell, the plan's "Wat Goes Back", as his part-3 story.
- Chapter 53's camp ends on the packet south calling at Stair (deepen 21).

### Part three: Serra (new: 54 to 83)

**Act VII, Landfall (54 to 63).**
- 54, **Stair**: the people you met at the end of Act VI, the Old Mother passing over, the town burning. Who you
  carry out shapes later chapters. Wend gets you out.
- 55, **A Letter of Credit**: the Corvo clerk's ledgers. Every bank called its loans the same week.
- 56, **Warm Ground**: Joan reads the Hill's springs. The Corvo pipes are drawing heat out of the dragon.
- 57, **The Wardens**: the cathedral wardens ask you to help bind the Old Mother to the Hill. You do, and it works
  (the wrong turn).
- 58, **The Sallow Wood**: you need someone to speak for you; Wend can if you've never lied to her. Wend joins.
- 59, **What the Wood Remembers**: the carved oak's record of the dragon lying down on the green. The wardens'
  chains are the Corvo's pipes.
- 60, **Hilda in Ambry**: she has bought the Hill's debt, and she asks you to help her because she's the only one
  who'll pay to keep the city standing. She means it.
- 61, **The Brood**: the young dragons over the Cane Coast.
- 62, **Cane and Pitch**: the strike; the Bassa meet you over the Pitch.
- 63, **The night after**: the camp in the Sallow wood.

**Act VIII, The Green (64 to 73).**
- 64, **The Pipes**: Joan and Ottilie map them.
- 65, **Sisters**: Delia comes south. Three Harrowgates in one room for the first time since the Act I sitting.
- 66, **The Empty Hill**: a quarter of the old town gone into the hole.
- 67, **Hilda's Contract**: she offers the Corvo a way to keep the heat, by draining the dragon slowly instead of
  waking it. It would work, it would be cruel, and it would save the town.
- 68, **The Green Seam**: down the pipes.
- 69, **The Speaking Tube**: Joan's last reading. Ottilie hears it. (Fixed loss.)
- 70, **The Plumb Bob**: Ottilie takes the measuring.
- 71, **Delia Chooses**: a sister, and the player's word counts.
- 72, **The Old Mother Lies Down**: on the ruin, like a cat on a warm stone.
- 73, **The night after**.

**Act IX, The Hill (74 to 83).**
- 74, **Three Voices**:
  - the Corvo (kill her and sell her);
  - the Sallows (put the green back and break the banks);
  - the Bassa (move her south and own the ground).
  This time the choice is written as an argument between companions as much as factions, not a repeat of Act IV's
  vote.
- 75, **Wend Speaks** (or can't).
- 76, **The City Votes**.
- 77, **What Hilda Wanted**: her history at last, from Delia. The year their father's works flooded, and what Hilda
  promised him.
- 78 to 80, **Under the Hill**: the raid, three chapters, shaped by the vote.
- 81, **Hilda's Last Cut**: she isn't killed in a boss fight. She makes the cut, and you decide whether to stop her,
  help her, or let her.
- 82, **The Ambry Accord**.
- 83, **The night after**.

### Part four: home (new: 84 to 89)

**Act X, The Book of Names (84 to 89).**
- 84, **The Packet Home**: whoever is alive is on the deck with you.
- 85, **Hollin Ford**: the Ford Bell; the people of the first hour, older.
- 86, **What Became of Them**: every companion and every choice, as places and people, not narration.
- 87, **Pryce's Last Line**: the only honest man in the room tells you what everything cost, to the mark.
- 88, **The Glass Kirk**: Sela opens the book and asks whose name goes first. The answer is yours, and the game
  shows who you were by what you chose. Nobody tells you.
- 89, **The Count**: Delyth's ring, a new stroke on the last stone, and the travellers' board.
  - It ends on an ordinary morning in Hollin Ford, the bell rung, and you free to go anywhere.
  - It doesn't close the world. The ideas backlog's raid and the Debatable Land war are left open, not promised.

**Total: 89 main chapters plus the ten Silent Waters chapters, about 99.** This is down from 112. Every chapter is
named, and none repeats another's shape.

---

## 4. Companions: development and relationships

### Each companion across the acts

| | Wenna Hale | Ottilie Fenn | Tam Reddick | Wat Aske | Wend |
|---|---|---|---|---|---|
| Joins | 2 | 6 | 21 | 40 (new) | 58 (new) |
| What they want | The Charter to deserve her oath | To measure what nobody has | Never to owe anyone | To put back every slab | The pipes out of the Hill |
| What they won't admit | She signed for nine barrels with six on the cart, and the Gannet was lost | She's afraid she's only clever | He has reported on you to Pryce | His brother's dead were in the barrow he dug | She was sent to watch you |
| Acts I to III | Finds out who ordered the barrels (her part 3) | Measures the Kirk; Joan takes her numbers | Joins; the bell-tower letter | — | — |
| The Silent Waters | Distrusts Verandah's king ("crowns are for people who won't pay tolls") | Fascinated by the port's tide gauges | Knows the Brethren's runners; this is his world | — | — |
| Act IV | Meets Ursel | Apprenticed to Joan | Found out; kept, turned double or turned out | — | — |
| Act V | Loses Ursel; grief, and whether she stays | Reads the Gatekeepers' rolls with Edda | If kept, the most loyal | Joins; his brother | — |
| Act VI | The Old Tower (brake or stair) | Joan in Callis | The Old Tower | Goes back into Hollow Fell | — |
| Act VII | Distrusts the wardens | Reads the springs with Joan | Sees through the Corvo | Wants to dig the pipes out with his hands | Joins; speaks for you |
| Act VIII | Holds the line at the Empty Hill | Hears Joan's last reading | Gets Delia out | Shuts a valve with Joan | Her people's oak record |
| Act IX | Speaks for the Sallows or the Bassa, depending on you | Takes the measuring; surveys the vote | Bets on the Corvo, and is wrong | Can't decide; asks you | Speaks for you, or can't |
| Act X | The Riders, or not | The Charter's surveyor | Owes nobody, or everyone | Puts the last slab back | Stays south, or comes north |

### Between companions (the conversations the brief asks for)

| Pair | The relationship | How it plays |
|---|---|---|
| Wenna and Ottilie | An older sister she didn't ask for | Wenna keeps her off ledges; Ottilie measures Wenna's moods out loud. Warm. |
| Wenna and Tam | Rivals who end as the two who'd die for each other | She was a Rider and he's a smuggler, so the arguments are about law and need. After Act IV their trust in each other matters at the Old Tower. |
| Ottilie and Tam | He teaches her cards; she teaches him odds | Funny. She wins by Act V. He never admits she's better. |
| Tam and Wat | Two men who sold something they shouldn't have | Quiet. They understand each other without saying so, and that unsettles Wenna. |
| Wenna and Wat | Duty and guilt | She thinks he should have refused. He says she signed for nine barrels. Neither is wrong. |
| Ottilie and Wat | The girl who measures ground and the man who dug it up | She is the first person to ask him how deep, not why. |
| Wend and everyone | An outsider's eye on the northerners | She notices what the others take for granted (the debt, the Charter, the black), and says so. |

**Conflicts that resolve without you.**
- Wenna and Tam fall out after Act IV. By the Act V camp they've sorted it on their own, and the player only learns
  how if they ask.
- Ottilie and Wat argue about Hollow Fell and are both right.

**Opinions on your choices.**
- Each companion keeps a short list of things they care about:
  - Wenna: honest dealing and duty;
  - Ottilie: truth and measurement;
  - Tam: debts paid, loyalty;
  - Wat: the dead left alone;
  - Wend: her people's word kept.
- Each main-story choice is tagged with what it touches. The journal's "Wenna didn't like that" comes from the tags,
  not from a hand-written line per choice.

**Romance:** as built (Wenna, Ottilie and Tam), plus Wat and Wend later. It stays a companion-story ending, never a
mechanic.

---

## 5. Deaths, losses and what they change

**Fixed** means the story requires it. **Shaped** means it happens, but the player decides how. **Avoidable** means
the player's choices decide whether it happens at all.

| Loss | Kind | Set up by | What it changes later |
|---|---|---|---|
| Ursel Hale (chapter 42) | Fixed | The gate (32), the wall walk (new, Act IV), her letters (Act V) | Wenna's grief and her stay-or-go choice; her stone on Northgate's wall; Wenna's lines for the rest of the game; the memorial in Act X |
| Marta Vidal (chapter 50) | Avoidable (you or a companion get the clerks out) | Her gauges in 28 and 46 | Callis's gauges go unread; Benet Sala's grief; a later Callis chapter is harder |
| The Old Tower (chapter 50) | Fixed | Callis lending the black (39) | The skyline changes; prices in Callis rise |
| Wenna or Tam (chapter 50) | Shaped. The third way is avoidable by story, not stats (below) | Their own stories and the Old Tower's brakes | The survivor's grief; the empty place at the camp; what the dead one would have said at each later choice |
| Rhosyn (chapter 51) | Shaped (her fate is yours) | The first page (35), six days (47) | The Speaker, the Charter's standing in every region, Sela's role |
| Wat Aske (Act VI, his story) | Avoidable (go with him, or let him go alone) | His brother (Act V) | Hollow Fell lies still or doesn't; his Act VII to X lines |
| Stair (chapter 54) | Fixed disaster, but who you save is shaped | The packet calling there at the end of Act VI | The people you carried out reappear in Ambry |
| Joan Harrowgate (chapter 69) | Fixed | Joan's return in Acts VI and VII | Ottilie inherits the measuring; Hilda's last scenes; Delia's choice |
| Hilda (chapter 81) | Shaped (stop, help or let) | Her thread through every act | The Accord's terms; Delia; the Act X epilogue |

### The third way at the Old Tower, through story

The way to save both companions is built from things the player was shown and can work out:
- In Wenna's own story she learns the Riders' gate brakes from Hulda Strake's book. The lift towers use the same
  pattern, and she says so in chapter 49.
- In Tam's story he learns that a counterweight can be cut loose and run as a weight on its own. That's how he won
  Jacca's boat, on a bet about the Gullmouth hoist.
- In chapter 49 "The Lift Towers", Marta shows you the brake and the counterweight.

The third way is to cut the counterweight so one person can hold the brake while the other clears the stair. It's
open if the player:
1. has done both of those companions' story parts, so each knows their piece;
2. brings them both to chapter 50;
3. knows the counterweight trick, from chapter 49 or Tam's story.

It still costs Pryce's book: the counterweight comes down on the counting floor, where the book is.

Rapport doesn't gate it. It only decides whether they'll listen when you call it.

---

## 6. The rules of the strange (supernatural lore reference)

This is a proposal for LORE.md once approved. It keeps the core rule, that the trouble has human causes, and gives
the strangeness one consistent logic.

### One stuff, three ways
Star crystal falls from the sky. Where it lies over centuries decides what it becomes:
- **White** (the Counties). Fresh fall in cold ground. It lifts, "like a cork held under water". Cap rock holds it
  down. Joan's rule is one span of lift for every three feet of cap.
- **Black** (Morrow). White that lay under great weight for a very long time, in the northern ice and under the old
  kingdom's barrows. It is dense and holds things down.
- **Green** (Serra). White that lay in warm ground, over a sleeping dragon's heat. It makes things grow.

**How the existing facts fit.**
- **The Weatherholms.** The isles float on white. Take the white off an isle and it sinks.
- **Callis.** The builders "settled" white under each tower's footings, which lifts it, and capped each tower with
  black keystones, which hold it level. Take the black out of a tower (Act V) and the white beneath tips it. The
  two rules are the same rule.
- **Holmsey.** The parish sits on the same seam as the Kirk. When Harrowgate's bores cracked the cap under the Kirk
  (Act I), the white along the whole seam began to lift. That is why Holmsey rises "since the Kirk floor came up".
  It's Harrowgate's doing, and a human cause.

### The Held
- The old kingdom buried its dead on ground thick with white, so the barrows would never flood, and pinned the
  graves with black.
- Over centuries, white dust gets into whatever lies on it. A body laid on white for long enough has some lift in
  its bones.
- With the black on, it lies still. Lift the black off, and what the white has got into gets up and walks. It isn't
  alive and it isn't a ghost. It's lifted.
- It walks south because the white in it pulls toward the white of the Counties, its old home.
- **Brenna's mother-in-law rose with no black on her** because the diggers' carts spilled white dust across the
  village graveyard on their way south. A human cause, in a single line.
- **What puts the Held down:** black laid back on them, or the white taken out of the ground they lie in. The second
  is what the Gatekeepers' oldest roll warns against, because taking it out moves ground elsewhere.

### The Old Mother
- Dragons live on crystal heat. The Old Mother lay down on the green under the Hill three hundred years ago, and the
  green kept her asleep and warm.
- The Corvo pipes, drawing her heat for their forges, cooled the green over her. She woke, cold and hungry, a year
  before the game begins.
- **The dragon crossing the Counties sky every three hours is the Old Mother**, flying north to the white fields to
  warm herself on fresh fall. That is why the Counties see her from the first hour. LORE.md's "nobody knows what
  she is yet" stays true until Act VII, when the Sallows' oak tells you.
- The Glassmother is her daughter, hatched in the Glass Flats, where the black runs hot under lightning. Morrow's
  world boss is the Old Mother's child gone feral on the wrong crystal.

### The green seam and the Corvo pipes
- The seam runs under the whole of Serra, deepest under the Hill.
- The pipes go down to it to draw hot water. They're cheaper than coal, and that is what woke her.
- The cathedral wardens' "chains" are anchors for the pipes, presented to the city as holding the dragon down.
- The Bassa's plan (move her south) works because the green runs to the Burnt Reach. The Sallows' plan (put the
  green back) works because the green re-warms if the pipes come out. The Corvo's plan (kill her) works because she
  is weak and cold.
- All three are true, and all three cost someone.

### The rules every writer follows
1. Crystal doesn't think, want, curse or prophesy. It lifts, holds or grows, and nothing else.
2. Every crisis starts with a person digging, selling, buying or signing.
3. The dead who walk are lifted, not haunted. Ghosts belong to side stories such as Fisherman Dave's Becky, and
   never to the main campaign's explanations.
4. No one in the main story can see the future.

---

## 7. Numbering and continuity audit

### Chapters as built
- Act I: 1 to 11. Act II: 12 to 20. Act III: 21 to 26. Act IV: 27 to 35. Act V: 36 to 44. Act VI: 45 to 53.
- 53 in all, with no gaps and no duplicates (storyQuests.ts and the act files).

### Fixes to the documents and comments (no player-facing change)

| Where | What it says | What it should say |
|---|---|---|
| STORY_PLAN.md:22 | "Today there are 22 chapters in four acts" | 53 in six acts (this review replaces the act outlines) |
| STORY_PLAN.md, Acts V to X numbers | Plan numbers | This review's numbering (54 onward) |
| weatherholms.ts:7 | "chapters VII to XII" | XII to XX |
| holmsey.ts:1 | "XIII to XVI" | XXI to XXVI |
| callis.ts:4, saltpenny.ts, greywaste.ts, kingsbarrow.ts headers | XVII to XXII | XXVII to XXXV |
| story.ts:165, 221 | "II. WRONG WAY ROUND", "IV-V" | III; V and VII |
| LORE.md:417 | The lift is "Chapter V" | Chapter VII |
| LORE.md:516, 876, 894 | Act IV as XXVII to XXXII, and XVII to XVIII | XXVII to XXXV |
| MORROW.md | XVII to XXII | XXVII to XXXV |
| CONTINENT3.md:95 | "eight chapters, from Act IV, the third act" | Acts VII to IX, chapters 54 to 83 |
| STORY_SUMMARY.md:147 | Fisherman Dave "planned" | A side story in game; being rewritten to the owner's brief |

### Data fixes (player-facing only where noted)
- `maren` becomes `hilda`; `maud_hale` becomes `ursel_hale`; `ebba_thorne` and `nan_carse` checked against their
  names.
- Act I and II camps check `gone` as well as `joined` (actOne.ts:34, actTwo.ts:36). Player-facing: a companion who
  has left won't turn up at an old camp.
- Chapter 50's `alive()` should also require the companion to be with you, or their story done (actSixB.ts:32).
- `compLeave` gets a way back (the win-back scene).
- Sixteen continuity lines changed (section 2, fixes 1 to 8). Player-facing, and they make the story agree with
  itself.

### Name collisions to resolve
These are minor; each needs one rename, chosen with the owner.

| Collision | Proposed fix |
|---|---|
| Ned Applegarth, Ned Vey, Ned Callow, Ned Pascoe | Applegarth becomes **Hob Applegarth** (Vey keeps Ned: he's the one the story needs) |
| Hesk Dunmore and Hesk of the Brethren | The Brethren's man becomes **Jory Hesketh** |
| Wend (the Sallow ranger) and the river Wend | Keep both: a Sallow named for the river her mother crossed. Say so once, in Act VII |
| Saint Ilse and Ilse Blewitt | Keep: Ilse is a common name in the Counties because of the saint. One line in Act VII |
| Edda and Ebba | Ebba becomes **Ebba Platt** everywhere (the code has `ebba_thorne`) |

---

## Questions for the owner

1. **Verandah as the bridge to Morrow** (the Silent Waters between Acts III and IV). Agree?
2. **Fisherman Dave's questline** is placed in the Verandah region and the Counties' first town, as a self-contained
   side story. Agree?
3. **The temperament system** (plain, kind, dry or hard, remembered) as the morality brief's first use in the main
   story. Agree?
4. **Camps stop being numbered chapters.** Agree?
5. **The total goes from 112 to about 99.** Agree, or do you want the full 112?
6. **The third way at the Old Tower by story clues** as in section 5. Agree?
7. **Hilda doesn't die in a fight.** She makes her last cut, and you decide whether to stop, help or let her.
   Agree?
8. **The rules of the strange** in section 6, written into LORE.md. Agree?
9. **The name fixes** in section 7. Agree?

**Once approved, the order of work:**
1. The continuity fixes and data renames.
2. The companion conversation system and Wat as a companion.
3. Acts I to VI deepened, as listed above.
4. The Silent Waters.
5. Serra's acts, when continent 3 is built.
