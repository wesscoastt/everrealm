# Cocky Road (owner, 2026-11-27)

Verbatim:

> new minigame / questline idea. a parody of crossy road called cocky road, it will be a new location, a waitch turns you into a animal for the quest and thats also how you start the minigame, allow player to go back to beat score.;

Built as Everrealm's own lane-crossing minigame in the genre (its own place, art, rules and scoring); the name and the
hop-across-the-road idea are the owner's.

## The design (2026-11-27)

- **Where:** the old drove road north of Hollin Ford, a dead-straight strip running east from (140, 100), 150 lanes
  long and 13 wide (z 94 to 106), checked flat (18.6 to 20.3), clear of every site, river and road. Each lane is one
  block across in x and spans the strip's width.
- **The lanes are real ground** (world/sites.ts), laid out once by a seeded plan shared with the minigame
  (data/cockyRoad.ts): grass lanes (with hay bales and stumps to hop round), road lanes (rutted path, carts on them in
  play), river lanes (a channel of water a block deep; logs and punts float down them in play). The first lanes are
  grass, the last is the far gate. The traffic (carts, logs, punts) is drawn only while someone plays, its speeds and
  gaps new every run.
- **The witch:** a henwife on the start of the road, in her cottage with a hen coop. Her curse turns you into a cockerel
  (the hen model, a cock's colours) and puts you on the first lane; it lifts when you're squashed, drowned, or reach the
  far gate.
- **Play:** hop one block at a time (forward, back, left, right). Your score is the furthest lane reached. Carts squash,
  water drowns unless you're on a log or punt, and a log that carries you off the edge sweeps you away. Your best is
  kept; come back to her any time to try again.
- **The questline:** chapters asking for further each time (to the first river, past halfway, the far gate), each with
  her reason, BioWare-plain; then the minigame stays open.
- **The runtime:** game/CockyRoad.ts. While playing, the player's own movement is locked and their model hidden; the
  cockerel stands in, the camera looks along the road from behind and above, and the player's position follows the bird
  so the world stays loaded round it.
