// What’s new: the updates, newest first, for the front page’s tab and the card a player sees once on coming
// into the world after an update (game/Game.ts finishStart; /news shows it again). Add an update at the top with
// the next `v`: everyone sees it once. Write it for players: what they’ll find and where, in a line or two each.

export interface Update { v: number; date: string; title: string; items: [string, string][] }

export const UPDATES: Update[] = [
  {
    v: 15, date: '13 November', title: 'Dice, doubloons and the Downs',
    items: [
      ['Games at the taverns.', 'Ask any tavern keeper “Any games going?” for Crown and Anchor, Find the Lady, or BS round the big table for a pot of marks. Taverns have a T on the map.'],
      ['BS with other players.', 'At the BS table, ask the players near you to sit in, grouped or not. Whoever deals keeps the game.'],
      ['Amberwold Downs.', 'A racecourse on Morrow, south of Branchley, with its own waymark. A race every six minutes that everyone there sees alike: watch from the stand and bet with Barnabas Quick at the book.'],
      ['Mourning lace.', 'Black lace, a laced corset and fishnets, for women. Sabine Orrell, the travelling draper, sells it.'],
      ['Temples on the map.', 'Every altar where you can unlearn skill points has a cross on the map.'],
      ['The Black Gull’s Doubloons.', 'Ten cursed doubloons lie out in the Counties each week, the same ten for everyone, each under a pillar of gold light. Pick one up and your group near you gets one too. Morwenna Veale buys them on Gullmouth quay for a tricorn, dyes, rum and a black mare.'],
      ['The Red Lamp.', 'Kezia Love on Gullmouth quay needs someone to hear her brother out. He is on Skua Rock. A new story line, and a new companion at the end of it.'],
      ['Several homes.', 'Hold up to three homes, and a let room besides. Buying or leasing another keeps the one you have. Travel home on the map (or /home) lists them all: going to another moves you in, furniture and all.'],
      ['Outfits in the world.', 'Open your pack (B): Outfits, beside your gear, puts a costume on or takes it off, changes your hat, and keeps five saved outfits to change into at a click.'],
      ['Light at night.', 'Lamps throw their light further, and every lamp in sight lights the ground under it, so a street half a mile off looks lit. The torch in your hand lights a good deal more than a few steps round you.'],
      ['The Angling Match.', 'Every three hours, for half an hour, the whole realm fishes against itself in any water. The heaviest fish and the biggest bag win marks for the top three, and everyone who weighs in is paid. Where you stand shows while it runs.'],
      ['Controllers.', 'Plug in a controller and play, laid out as ESO’s: sticks to move and look, RT to attack, LT to block, the face buttons and RB for your skills (hold LB for the rest), A to talk or jump, the D-pad for food, horse, light and weapon. In a window the left stick moves a pointer.'],
      ['Posts that weather.', 'A message post stands three days; each player who finds it helpful adds half a day, and three logs of any wood mend it for three more, up to a month. A post with a day left looks weathered. Then it comes down.'],
      ['The King’s Dock.', 'Awschitz Fort has a military dock north of its wall, with warships, guns and a watchtower, and its yard is full of the garrison going about their day.'],
    ],
  },
  {
    v: 14, date: '12 November', title: 'Companions, a new look, and a fairer road',
    items: [
      ['Your companions.', 'Press U to call any of them to your side from wherever they are. Give them gifts (one a day counts), put gear on them, and choose the horse they ride. Each grows from stranger to loyal companion, and is stronger beside you for it.'],
      ['Companions at home.', 'Send one to your house: they sit in your chairs, cook at the range, sleep in your beds and talk to each other. Hide them, or tell them to leave your things be.'],
      ['Others’ companions.', 'You see other players’ companions following them now, on their horses when they ride.'],
      ['The windows.', 'A look of their own, leather and brass, and nothing to scroll through to find a thing: the pack, skills, talents, journal, group finder and options.'],
      ['Faces.', 'The face beside a conversation is drawn from the person themselves, hat, beard and glasses and all.'],
      ['The world.', 'Light streaming round the sun and through the trees, lamps and fires that glow and flicker each their own way, morning mist in the valleys, heaped clouds, rain in a brown haze, and the northern lights over the Scarth Highlands, Tolmen Moor and the Sickle on a clear night. The options can turn the new light off on a slower computer.'],
      ['A fairer road.', 'Experience balanced across everything you do: world bosses, delve chests, the tower, sea fights, writs and commissions, swimming, enchanting and the public fields.'],
      ['The options.', 'Field of view, a frame cap and counter, names over players and people, numbers in a fight, camera shake, quality at a click, and every key moved where you want it.'],
    ],
  },
  {
    v: 13, date: '11 November', title: 'Fisherman Dave, the quarry and the cart',
    items: [
      ['Fisherman Dave.', 'His story in Gullmouth: Becky White, the Curse-Keeper and the Pilgrim Hat. Find him in his net shed above the south quay.'],
      ['The Verandah quarry.', 'Dug as deep as it goes, with the Charter’s prisoners cutting stone in it. In a cell, ask to go on the gang to work off your time.'],
      ['The watch’s cart.', 'Prisoners ride through Ansbury and Gullmouth in the cage cart. Apples are two marks at the general store.'],
    ],
  },
  {
    v: 12, date: '5 November', title: 'Verandah',
    items: [
      ['Verandah.', 'A port town on its own island in the sea west of the Counties, with its docks, its king\'s house, its farms and bridges, and the country north of it to the edge of the snow. Its people put up their own signs; read them.'],
      ['The Fortress.', 'The walled islet off Verandah\'s docks is a smugglers\' den now. Jory Kettle buys anything and asks nothing. Mind the stair down to the sea cave.'],
      ['Fisherman Dave.', 'Dave Kitto drinks on the quay at Gullmouth and won\'t say why. Five chapters, a ghost on the headland, and a fight he has to win on his own. He\'ll travel with you after.'],
      ['Jumping puzzles.', 'Climbs hidden around the world with a chest at the top, and old folk costumes in them: the fox mask, the sealskin hood and more.'],
      ['New music.', 'Eleven new pieces for the score, Ansbury\'s anthem among them.'],
      ['King Shep\'s Fold.', 'A giant wool ram in the meadows south of Ansbury, and a king living in its belly.'],
    ],
  },
  {
    v: 11, date: '4 November', title: 'Fishing, enchanting and message posts',
    items: [
      ['Fishing.', 'Twenty-six fish from shrimp to sharks, rods that each fish differently, and bait that changes what bites. Fish from any bank.'],
      ['Enchanting.', 'Take rubbings of the old kingdom\'s marks at the standing stones, cut them into glyphs, and set them in your gear.'],
      ['Message posts.', 'Leave a few words where you stand for whoever comes by (the pencil by the chat tabs, or /post).'],
      ['Smoother.', 'The music no longer stutters, and loading no longer freezes the page.'],
    ],
  },
  {
    v: 10, date: '1 November', title: 'Weapons and the shadow in the sky',
    items: [
      ['Something in the sky.', 'Now and then a shadow crosses the Counties and Morrow out of the south. Nobody knows what it is. Yet.'],
      ['New weapons.', 'Every sword, axe, staff and bow rebuilt: real edges and points, steel that catches the light.'],
      ['Never lost.', 'Your objective is marked on screen with how far it is, and an arrow when it\'s behind you.'],
      ['New stories.', 'Fresh quests in Hagworm Wood, on the Gannet Cliffs and on the Wrath Levels.'],
    ],
  },
];

/** The newest update's number: a player who hasn't seen it gets the card. */
export const NEWS_V = UPDATES[0].v;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]!));

/** The newest `n` updates as HTML: a heading for each, then its list. */
export function newsHtml(n = 3): string {
  return UPDATES.slice(0, n).map((u) => `<h4 class="news-h">${esc(u.title)} <span class="news-d">${esc(u.date)}</span></h4><ul class="news">${u.items.map(([b, t]) => `<li><b>${esc(b)}</b> ${esc(t)}</li>`).join('')}</ul>`).join('');
}
