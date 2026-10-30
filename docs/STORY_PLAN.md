# The main story, whole (plan for the owner, owed item 4l)

The owner, 2026-10-29: "okay i like the main story, lets aim for gw2 / wow main story length even eso
could be used for length lets make it have emotion, companions you grow to love, wrong turns,
unexpected losses, etc. bioware / cd projekt red triple a writing."

This is the plan to read before the writing starts. Everything not already in the game is
**[planned]**. LORE.md stays canon and NARRATIVE_STYLE.md holds for every line: plain speech, no
prophecy, and the trouble always has a human cause. Where this plan and LORE.md disagree, LORE.md wins
until the owner says otherwise.

## How long

| Game | Main story | What we take from it |
| --- | --- | --- |
| GW2 | Personal story: about 70 steps, then the Living World seasons on top | Your own story in a world that goes on without you; a mentor who dies (Tybalt, Trahearne) |
| WoW | An expansion's campaign: 40 to 60 quests per continent, chapter by chapter | Story chapters that unlock zone by zone, cutscenes at the turns, a villain you meet early |
| ESO | The main quest is about 20, but each zone has its own 15 to 25-quest story | Every region has a complete story of its own, and the main story ties through them |
| Witcher 3 / BioWare | 40 to 60 hours of main story | Companions with their own wants; choices that come back; losses you didn't see coming |

**The target: about 112 chapters in ten acts**, 60 to 80 hours played at a normal pace with the side
stories it opens. Today there are 22 chapters in four acts. The four acts in the game stay and are
deepened; six are new.

## The spine

Every act so far has the same shape: a debt, someone who bought it cheap, and ground that lifts, sinks
or gets up when something is taken out of it. The spine makes that one story.

**The Harrowgate sisters.** Hilda, Joan and Delia have been in every act. Hilda wants the debt paid
and believes she's the only adult in the room. Joan would rather be right than loyal. Delia signs what
she's given and doesn't read it. Over the ten acts Hilda goes from a hard woman you can argue with to
someone who'll drain a living thing for its heat and call it sense; Joan dies stopping her; Delia
finally reads the books and has to choose between her sisters. Pryce, who bought every debt in the
story at three marks in ten, ends up the only honest man in a room of liars.

**Books of names.** The Book of Names at the Glass Kirk, Holmsey's register, the forty-one's counting
stones, Pryce's book, the Gatekeepers' rolls, the Sallows' carved oak. Each act turns on someone
writing names down or refusing to. The last chapter asks you whose name goes first.

**What the player is.** Not chosen and not special: a useful stranger with a strong arm who keeps
being in the room when things go wrong, and whose friends come to matter more than the debt.

## The companions (the heart of it)

Five who travel with you through the main story, each with a want, a voice, a line of their own
quests, an opinion of what you do (rapport, which already exists in `data/companions.ts`), a camp scene
at the end of every act, and a scene that pays it all off. They speak up in the main story's
conversations, and they disagree with each other.

| Who | Joins | Wants | Won't admit | Their story's turn |
| --- | --- | --- | --- | --- |
| **Wenna Hale** (in game), once of the Toll Riders, tank | Act I, on the Turnpike | The Charter to deserve the oath she swore to it | She left the Riders because she was told to look away, and she did, once | Act V: she finds the aunt she never met at Northgate's wall, and loses her |
| **Ottilie Fenn** (in game), surveyor's apprentice, healer | Act I, at the Glass Kirk | To measure something nobody's measured | She's afraid she's only clever, not good | Joan's apprentice by Act IV; Joan's death in Act VIII leaves her the measuring; she ends the game as the Charter's surveyor |
| **Tam Reddick** (in game), card sharp, mostly honest | Act III, at Gullmouth | Never to owe anybody | He owes Pryce, and has been reporting on you since Holmsey | Act IV: you find out. You can turn him out or keep him; kept, he becomes the most loyal of them |
| **Wat Aske** (in game as an NPC), the last of Pryce's diggers | Act V, at Cold Harbour | To put back every slab he lifted | He dug the barrow that killed his own brother's dead | Act VI: he goes back into Hollow Fell alone; whether he comes out depends on you |
| **Wend** (planned, CONTINENT3.md), a Sallow ranger | Act VII, at Stair | The pipes out of the Hill | She was sent to watch you, not to help you | Act IX: she has to speak for you before her people, and only can if you've never lied to her |

Rapport changes how each speaks to you, which of their own chapters open (`STORY_AT` 0/20/40), and the
end of their story; romance stays as it is (`ROMANCE_AT`). New: a companion with low enough rapport
**leaves** at an act's end, says why, and can be won back once. A companion's death is permanent on
that character.

## The losses

Planned so each one is set up an act or more before it lands, and so the game never kills someone just
to make the player sad.

1. **Ursel Hale** (renamed from Maud Hale, the Gatekeeper of Northgate, who is in game; see "Name
   fixes"), Wenna's aunt. Act V. She holds the postern alone so the Cold Harbour families get through,
   and the Held come over her. Unavoidable. Wenna had known her for nine days.
2. **The Old Tower of Callis.** Act VI. Whatever you chose at the end of Act IV, the tallest tower in
   the city comes down; who was in it is down to you.
3. **Wenna or Tam.** Act VI, the Old Tower's fall. One holds the lift's brake while the other gets the
   clerks out of the counting floor. You can reach one of them. If both their own stories are done and
   both trust you (rapport 60), there's a third way, and it costs you something else instead: Pryce's
   book, and with it any hold you had over Hilda.
4. **Rhosyn Tarrant**, the Speaker. Act VI. Not dead: wrong. She's guided you since the sitting, and
   she signed the Third Daughter's papers herself, because selling crystal to Morrow was the only way she
   could see to pay the debt without breaking the Charter. Cold Harbour is what that cost. You decide
   what becomes of her, and the Charter is never quite the same either way.
5. **Joan Harrowgate.** Act VIII. She goes down Hilda's pipes to shut the green seam herself, with
   your plumb bob from Act IV in her pocket, because nobody else can read the valves. Unavoidable.
   Ottilie is the one who hears her last reading come up the speaking tube.
6. **Stair**, the herring port. Act VII's opening. It burns whatever you do; who you carry out of it
   matters later.
7. **Wat Aske**, maybe. Act VI. If you let him go into Hollow Fell alone, he doesn't come out, and the
   fell lies still from that night.

## The wrong turns

Places where the player does the reasonable thing and it goes badly, so the story can't be read off a
quest marker.

- **Act III:** you hand Holmsey's register to the Kirk's clerk, who is Hilda's. The dredging bid goes
  in a day early, and the Charter sits on it before you can stop it.
- **Act IV:** you take Ned Vey's word that the Kittiwake carries Pryce's black, and burn her at Wreckers'
  Bight. She was carrying Held-country families south. Mara Coyle never forgives it; the Brethren
  remember.
- **Act V:** the Gatekeepers' oldest roll says lay the black back and the dead lie down. It's right
  about the dead, and wrong about the living: the black you take from Callis to do it is what holds up
  the Old Tower.
- **Act VII:** the cathedral's wardens ask you to help chain the Old Mother to the Hill. It works, and
  the chains are the Corvo pipes; you've been helping drain her.
- **Act IX:** whichever of the three ways the city takes, the people who argued for the others are right
  about what it costs.

## The acts

Chapter titles are working titles. Chapters marked (in game) exist today and get companion scenes, a
camp at the act's end and the changes below; the rest are new.

### Part one: the Counties

**Act I. The Charter's Debt** (10 chapters; 6 in game)
1. The Notice (in game)
2. Wrong Way Round (in game) + **Wenna** joins on the Turnpike: she's stopped a Harrowgate cart and
   wants a witness
3. Under the Crown (in game)
4. **The Surveyor's Girl**: Ottilie at the Glass Kirk, measuring the floor nobody asked her to; she joins
5. The Fallen Star (in game)
6. **The Toll Riders**: Wenna's old troop are taking Harrowgate's money to look away from the oil;
   her old captain asks her to come back
7. The Lift (in game)
8. **Forty Feet**: after the lift, Joan's figures and Hilda's tender side by side; Ottilie finds the
   thirty feet in Hilda's hand
9. What the Charter Owes (in game)
10. **First Camp**: the night after the sitting, on the Kirk road; the first camp scene

**Act II. The Weatherholms** (9; 6 in game)
11 to 16. A Stride a Week, Company Basket, The Forty-One, Dead Weight, Thirty Baskets, The Last Mark
(in game), with Wenna and Ottilie in each
17. **Ilse's Log**: Ilse Blewitt's thirty years of the isles, and what she never wrote down: that she
    sold the count to Pryce once, the winter her sister was ill
18. **Rope Walk**: the forty-one's rope, spun three lifetimes long; Delyth wants to climb it
19. **Second Camp**: the hoist at night

**Act III. The Drowned Parish** (8; 4 in game)
20. **Half a Purse**: Tam Reddick at Gullmouth, winning a boat at cards that he can't sail; he joins
21 to 24. Low Water, The Register, A Mark the Load, The Last Names (in game). The register goes to the
    wrong clerk (wrong turn)
25. **The Sitting Comes Early**: the dredging bid, and the Speaker's office closing ranks
26. **Third Camp**: Tamar's bell-tower; Tam sits up all night and won't say why

### Part two: Morrow

**Act IV. The Third Daughter** (12; 6 in game)
27 to 32. Half a Crew, Nine Hundred Weight, What Pays, Lie Still, The King's Black, His Book (in game),
    with the Kittiwake burned on Ned's word (wrong turn) and Joan's plumb bob given to you
33. **Who Tam Writes To**: the letters to Pryce, in Tam's hand
34. **Turn Him Out**: you keep Tam or you don't
35. **Ottilie Measures a Tower**: Callis's Old Tower is leaning a finger a month
36. **Ursel**: at Northgate's gate, Wenna meets her father's sister
37. **What Delia Signed**: Delia's letter, and the first page of Pryce's book in Rhosyn's hand
38. **Fourth Camp**: the Constant, crossing home and back

**Act V. The Held** (14, new)
The black is back in the barrows (or isn't), and the Held aren't all lying down: the ones that got up
first have walked south. Cold Harbour, the Greywaste villages, and Northgate's wall.
39. Wat Aske at the jetty: Cold Harbour's families want to go south, and the Brethren won't carry them
40. The Grey Road: escorting the carts
41. Ma's Barrow again: the slab you laid has been lifted, by someone who signs "A.P." and isn't Pryce
42. The Gatekeepers' Rolls: Edda Rusk and the oldest roll; lay the black back (wrong turn)
43. Callis Lends the Black: the Assembly's black, borrowed from the Old Tower's keystones
44. Wat's Brother: Wat joins
45. The Fells at Night: Hollow Fell, every barrow
46. The Postern: Ursel holds it; Ursel dies (loss)
47. What Wenna Does: Wenna's grief, and whether she stays
48. The Siege of Northgate (a public event: the wall's defence, with other players)
49. The Second A.P.: Aubrey Pryce's clerk, Aldous Penrose, who has been signing in his name
50. The Kneeling Rise: Kingsbarrow on fire
51. Lie Still, Again: the Held lie down
52. **Fifth Camp**: on the wall, Wenna's vigil for Ursel

**Act VI. The Tall City** (14, new)
Callis without its black. The Assembly's towers, the shipping families, and the Speaker's secret.
53. Down a Storey: Callis taking its towers down
54. The Counting Floor: the Assembly's bond office, where the Charter's debt is bought and sold
55. Rhosyn's Hand: the signature on the Third Daughter's papers (mentor wrong)
56. The Brethren's Price
57. Mara Coyle: the Kittiwake's master, and what you burned
58. Wat Goes Back: alone into Hollow Fell, or not (loss, maybe)
59. Pryce Tells the Truth: the only one who does
60. The Lift Towers: the Assembly's brakes and counterweights
61. The Old Tower Falls: Wenna or Tam (loss)
62. What the Speaker Is Owed: Rhosyn's fate
63. The Charter Sits in Callis: the first sitting held abroad
64. A New Speaker
65. Delia Reads: Delia and her sisters, and the loan Corvo bank has called
66. **Sixth Camp**: the empty place at the fire

### Part three: Serra

**Act VII. Landfall** (14, new; CONTINENT3.md's opening and chapters 1 to 3, deepened)
67. Stair: the Old Mother passes over; the town burns (loss); Wend gets you out
68 to 80. A Letter of Credit, the Shingle Coast, Warm Ground, the wardens' chains (wrong turn), the
    Sallow wood, Wend joins, What the Wood Remembers, the Corvo's furnaces, the first of the brood,
    the cathedral crypt, the Bassa, Ottilie's survey of the Hill, **Seventh Camp**

**Act VIII. The Green** (14, new; CONTINENT3.md 4 and 5, with Hilda come south)
81 to 94. Cane and Pitch, the plantation strike, Hilda in Ambry buying the Hill's debt, Joan follows
    her, the pipes, the Empty Hill, sisters, the green seam, the speaking tube, Joan's last reading
    (loss), Ottilie takes the plumb bob, Delia chooses a sister, the Old Mother lies on the ruin,
    **Eighth Camp**

**Act IX. The Hill** (12, new; CONTINENT3.md 6 to 8)
95 to 106. Three Ways (the Corvo, the Sallows, the Bassa), Wend speaks for you (or can't), the city's
    vote, Under the Hill (the raid), Hilda's last cut, the Old Mother, the Ambry Accord, and an ending
    shaped by everything you chose

### Part four: home

**Act X. The Book of Names** (6, new)
107. The Packet Home
108. Hollin Ford: the Ford Bell (from the game's first hour) rings you in
109. What Became of Them: every companion, alive or not, and every ending you chose
110. Pryce's Last Line
111. The Glass Kirk: Sela Orme opens the book and asks whose name goes first
112. The Count: Delyth's ring, a new stroke on the last stone, and the travellers' board at the Post

## What changes in the game to carry it

- **Camp scenes.** At each act's end, a fire somewhere true to the act, the companions sat round it,
  a conversation with each (rapport, their own story's next step, what they think of what you did).
- **Staged scenes** at the turns: the Old Mother over Stair, Ursel at the postern, the Old Tower,
  Joan's last reading. Camera, lines and timing, played in the world, never a video.
- **Companions in the main story's conversations.** They interject, disagree, and are remembered: the
  journal keeps "Wenna didn't like that" with the choice.
- **Choices carried.** Every act's ending flag (`charterEnd`, `holmEnd`, `parishEnd`, `tdEnd` and the
  new ones) changes lines and at least one scene later. A codex page lists what you chose.
- **A memorial.** The names of the dead, cut on the stone by the Ford Bell in Act X.
- **Level and pacing.** Acts I to III over levels 1 to 40, IV to VI over 40 to 75, VII to IX over 75
  to 95, X at any level after IX. The chapters lead you through the zones' side stories rather than
  past them (ESO's way), and the pacing check (`npm run balance`) is rerun after every act.

## Name fixes before Act I is rewritten

- **Four Wennas.** The companion keeps her name. The Kelderby shepherd Wenna Hale (Bryn's wife, who
  sings the old tunes) becomes **Tressa Hale**; Wenna Rowse of Gillsby Staithe becomes **Kerra
  Rowse**; Wenna Kitto at Scarrow Tor becomes **Senara Kitto**. The companion is Bryn Hale's younger
  sister, who left the farm for the Riders.
- **Two Mauds.** Maud Ashby the reeve keeps hers. Maud Hale, Northgate's Gatekeeper, becomes **Ursel
  Hale**: Bryn and Wenna's father's sister, who crossed the sea before either of them was born. That's
  why the Kelderby Hales have a Morrow name in the family bible, and why Owen walked to the Kirk.

## Order of building

1. This plan, read by the owner.
2. The name fixes and the camp scene system; Act I's four new chapters and its camp. Tested in game end
   to end.
3. One act at a time, in order, alongside the owed list: each act written in full, reviewed against
   NARRATIVE_STYLE.md, built, played through headless start to finish (`npm run quests` plus a scripted
   walk), and its canon moved into LORE.md.
4. Serra's acts wait for continent 3 to be built (owed item 17).

## Questions for the owner

1. Is a permanent companion death right for an MMO, where people play for years? (The plan says yes,
   on that character only, with the third way in Act VI for players who've earned it.)
2. Should Act VI's Wenna-or-Tam choice be there at all, or should the Old Tower take someone you can't
   save?
3. Act X ends the main story. Should it leave a door open for the expansions (the ideas backlog's raid,
   the PvP war in the Debatable Land), or close?
