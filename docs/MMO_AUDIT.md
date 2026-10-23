# What Everrealm has, measured against WoW, ESO and GW2

Taken on 2026-10-23, after the first continent's towns, farms and smithies were filled in. Rerun it
when the second continent is in (the owner asked for a second balance and economy check then too).

## Already in

| Area | What's there |
|---|---|
| Character | Callings (classes) with a GW2-style skill bar unlocked by level, three talent trees each, faces, hair, the wardrobe, dyes, titles |
| Levelling | Level 1-100 paced in weeks (data/pacing.ts, `npm run economy`), quests pay XP, everything scales to you (ESO One Tamriel), rested XP, group bonus |
| Questing | Main story (three acts), regional storylines, side quests, notice boards, dailies and writs, escorts, puzzles, festival stories |
| Group content | Two group dungeons, public dungeons and delves, world bosses on timers, open-world events (GW2), tasks (GW2 hearts), Group Finder, henchmen |
| Loot | Personal loot, rolled quality and leanings, 18 named server-capped pieces, armour sets, hidden chests and lockpicking, treasure maps, rares |
| Trades | Mining, woodcutting, fishing, smithing, cooking; smithies in every town; furniture by the joiner's bench |
| Economy | Marks, the Exchange (auction house), shops, the Charter Bank, mail with attachments, player trading |
| Social | Chat (say, emote, group, guild, whisper), friends list, groups, guilds with ranks, emotes, bands that play music together; ignore and report (this audit) |
| World | ~6 km continent, day and night on the realm clock, weather, swimming and diving, towns with outskirts, farms, churchyards, harbour lights, roadfolk and pedlars, pets and livestock, lore books and a library, waymarks and Charter Post travel |
| Housing | Wendside Cottage, leased lots with houses built to plan, rented rooms, furniture, visiting |
| Mounts | Stables in every town, regional mounts, two-seat riding |
| Collecting | Feats (achievements) with titles, festival hats, the library, dyes |
| Seasonal | Seven fairs with rounds, creatures, stories and hats |
| Safety | /ignore, /report (kept with the reported player's recent chat; /reports for the keeper), strong-language filter on by default |
| Settings | Audio, view distance, render scale, shadows, full screen, mouse look speed, invert mouse |

## Gaps, most important first

| Gap | In WoW / ESO / GW2 | Plan |
|---|---|---|
| Shared creatures | Everyone sees the same mob | Owed: server-owned creature state near players (only deaths are shared now) |
| Alchemy and potions, buff foods | All three | Owed: potions and buff foods unlocked through Cooking; an Alchemy trade with herbs |
| More trades | Tailoring, leatherworking, jewelcrafting, enchanting | Tailoring and leatherworking for light and medium armour; jewelcrafting for the accessories owed |
| PvP | Battlegrounds, arenas, duels | Owed: arena PvP like ESO battlegrounds; duels first (cheap: a challenge, a ring, no penalty) |
| Raid | 10-25 player raids | Owed once the first continent is done |
| Post-cap progression | Champion points, paragon, masteries | Owed: champion-point-style points past 100 |
| Key rebinding, UI scale, colour-blind modes | All three | Next settings pass |
| Inspect a player | WoW, ESO | Player menu: see their gear and calling |
| Armour transmog | All three | Extend the wardrobe from hats and dyes to whole armour looks |
| Mount skills and levels | ESO riding skills, GW2 mount abilities | Owed: mounts that level with use |
| Gliding | GW2 | Consider after the second continent |
| Dungeon difficulty tiers | Heroic, veteran, mythic+ | A veteran mode for each dungeon with better rolls |
| Guild bank and guild hall | All three | Guild bank first, then a hall on a lot |
| Leaderboards | Some | Low priority |
| Controller support | ESO, GW2 | Low priority (touch controls exist) |
| Pet battles, battle pass | WoW, many | Not planned (no pay-to-win) |
