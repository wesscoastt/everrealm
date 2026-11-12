import type { CompanionId } from './companions';

// What the companions say to each other when they're living at your house (game/HouseGuests.ts): a short exchange
// between two of them, the first speaker walking over to the other. 'a' and 'b' are the pair as written; either
// may be the one who starts, as the lines say. (David Kitto, kept only for those who had him, has none: he keeps
// to himself.)

export interface HouseTalk { a: CompanionId; b: CompanionId; lines: ['a' | 'b', string][] }

const T = (a: CompanionId, b: CompanionId, ...lines: ['a' | 'b', string][]): HouseTalk => ({ a, b, lines });

export const HOUSE_TALK: HouseTalk[] = [
  // Wenna and Ottilie
  T('wenna', 'ottilie', ['b', 'Wenna, would you hold the end of this tape?'], ['a', 'What are we measuring?'], ['b', 'The kitchen. It\'s two inches out of square. I thought you\'d want to know.'], ['a', 'I didn\'t.']),
  T('wenna', 'ottilie', ['a', 'You\'ve had that map upside down for an hour.'], ['b', 'It\'s a map of the south. That\'s how you know it\'s the right way up.'], ['a', 'If you say so.']),
  // Wenna and Tam
  T('wenna', 'tam', ['b', 'Cards, Wenna? Penny a point.'], ['a', 'I\'ve seen you deal.'], ['b', 'Then you know I\'m good at it.'], ['a', 'That\'s why I said no.']),
  T('wenna', 'tam', ['a', 'Where did that spoon come from?'], ['b', 'A spoon\'s a spoon. They don\'t come from anywhere.'], ['a', 'Put it back, Tam.'], ['b', 'It was already back. I was just holding it.']),
  // Wenna and Ned
  T('wenna', 'ned', ['b', 'Wenna, how many bandits have you two fought? Roughly. I\'m writing it down.'], ['a', 'Enough.'], ['b', 'I\'ll put enough. It sounds better than a number.']),
  T('wenna', 'ned', ['a', 'Ned. You\'re standing on my coat.'], ['b', 'Sorry! Sorry. It\'s a very good coat.'], ['a', 'It was.']),
  // Wenna and Fisherman Dave
  T('wenna', 'fdave', ['b', 'Cup of tea, Wenna? I make it strong. Becky said you could stand a spoon in it.'], ['a', 'Strong\'s fine.'], ['b', 'That\'s what I like about you. No fuss.']),
  T('wenna', 'fdave', ['a', 'You\'ve stopped drinking.'], ['b', 'Eleven weeks. Not that I\'m counting. I\'m counting.'], ['a', 'Good. Keep counting.']),
  // Ottilie and Tam
  T('ottilie', 'tam', ['b', 'Bet you a penny you can\'t say how far it is to the gate.'], ['a', 'Forty-one yards and two feet.'], ['b', 'I\'m not paying that. You could have made it up.'], ['a', 'I could have. I didn\'t.']),
  T('ottilie', 'tam', ['a', 'Tam, have you seen my good pencil?'], ['b', 'Which one\'s the good one?'], ['a', 'The one behind your ear.']),
  // Ottilie and Ned
  T('ottilie', 'ned', ['b', 'Ottilie, will you put this house on a map?'], ['a', 'It\'s already on a map.'], ['b', 'A better map. With a star on it.'], ['a', 'I\'ll see what the office says about stars.']),
  T('ottilie', 'ned', ['a', 'Ned, hold this end and don\'t move.'], ['b', 'I\'m not moving. I\'m hardly breathing.'], ['a', 'Breathing\'s allowed. Just not on the paper.']),
  // Ottilie and Fisherman Dave
  T('ottilie', 'fdave', ['b', 'Becky liked maps. She\'d mark where the fish were.'], ['a', 'Did she ever get it right?'], ['b', 'Every time. I never told her.']),
  T('ottilie', 'fdave', ['a', 'Dave, does the tide ever come up this far?'], ['b', 'Not in my lifetime.'], ['a', 'I\'ll write down probably not.']),
  // Tam and Ned
  T('tam', 'ned', ['a', 'Ned, what\'ll you take for that book of yours?'], ['b', 'It\'s not for sale. It\'s got their name in it.'], ['a', 'Signed?'], ['b', 'Three times now.']),
  T('tam', 'ned', ['b', 'Tam, teach me a card trick.'], ['a', 'Pick a card.'], ['b', 'That\'s the one I picked! How did you do that?'], ['a', 'Practice, and a big sleeve.']),
  // Tam and Fisherman Dave
  T('tam', 'fdave', ['a', 'Fancy a drink, Dave?'], ['b', 'No. Thank you for asking, though. People stop asking.'], ['a', 'Tea, then. You can beat me at cards.']),
  T('tam', 'fdave', ['b', 'You cheat at cards, Tam.'], ['a', 'Only when I\'m losing.'], ['b', 'You\'re always losing.'], ['a', 'Now you see the problem.']),
  // Ned and Fisherman Dave
  T('ned', 'fdave', ['a', 'Dave, what\'s it like, being in one of their stories?'], ['b', 'Wet, mostly. And Becky shouting.'], ['a', 'I\'d give anything to be shouted at by a ghost.']),
  T('ned', 'fdave', ['b', 'Have a sandwich, Ned.'], ['a', 'Is it fish?'], ['b', 'It\'s always fish.']),
];
