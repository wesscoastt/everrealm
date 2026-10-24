import type { Appearance } from '../entities/humanoid';

// Companions, the way ESO's are, written the way BioWare writes them: people you meet in the world who
// will walk it with you. One at a time. Each has a place they're found, a way of fighting, things they
// like to see you do and things they don't (rapport, -100 to 100), something to say about wherever you
// are, a story of their own in three parts that opens as they come to trust you, and, if you ask and
// they're willing, more than friendship. Their conversations are in data/content/companions.ts; the
// walking, fighting and talking in game/Companions.ts.

export type CompanionId = 'wenna' | 'ottilie' | 'tam';
export type CompanionRole = 'tank' | 'healer' | 'damage';

export interface Outfit { id: string; name: string; /** Rapport needed to have it (0: from the start). */ rapport: number; look: Partial<Appearance> }

export interface CompanionDef {
  id: CompanionId;
  name: string;
  /** How the nameplate and the journal call them. */
  title: string;
  /** Where they're found before they join, and wait when sent home: x, z, facing point. */
  home: { at: [number, number]; face: [number, number]; place: string };
  /** The roles they'll take (the first is their own). */
  roles: CompanionRole[];
  look: Appearance;
  outfits: Outfit[];
  /** What they like to see you do, and what they don't: event -> rapport and what they say. */
  likes: Partial<Record<CompanionEvent, [number, string]>>;
  /** What they say: by where you are and what's happening. Picked at random, never twice running. */
  banter: Partial<Record<BanterKey, string[]>>;
}

/** Things you do that a companion has an opinion on (game/Companions.ts hears them). */
export type CompanionEvent = 'crime' | 'revive' | 'vista' | 'wonder' | 'book' | 'treat' | 'boss' | 'bounty' | 'quest' | 'rare' | 'theft';
/** When they talk: the land around you, the town you're in, the hour, the fight, the festival. */
export type BanterKey = 'greenwake' | 'crownroad' | 'brambledeep' | 'saltwind' | 'redstone' | 'starfall' | 'morrow'
  | 'ansbury' | 'gullmouth' | 'harrowgate' | 'kelderby' | 'kirk' | 'night' | 'rain' | 'wake' | 'fight' | 'won' | 'hurt' | 'down' | 'swim' | 'ride' | 'idle' | 'partner';

export const COMPANIONS: Record<CompanionId, CompanionDef> = {
  // ---------------------------------------------------------------- Wenna Hale
  // A Toll Rider, once: the Charter's mounted wardens of the Turnpike. In February she drove the Light
  // Fund cart to Fleet Light and signed for nine barrels of oil with six in the back, because the Toll
  // Office told her to. Fleet Light burned low that March, and the Gannet went onto the stacks. The
  // Riders let her go in April. Nobody has told her it wasn't her fault, and she wouldn't believe them.
  wenna: {
    id: 'wenna', name: 'Wenna Hale', title: 'Once of the Toll Riders',
    home: { at: [712.5, 584.5], face: [709.5, 580.5], place: 'the Waystation yard' },
    roles: ['tank', 'damage'],
    look: { frame: 'f', skin: '#c8906a', hair: '#3a2418', hairStyle: 4, eyes: '#4a5a3a', tunic: '#3a4a5a', trim: '#c8a050', shirt: '#5a4a3a', trousers: '#3a3430', hose: '#2a2420', boots: '#2a1e14', shoes: 1, top: 4, gloves: '#4a3020', belt: '#5a3a1e', cape: '#2e3a4a', build: 1.08, height: 1.04, scar: true, brows: 1, age: 0.35,
      chestArmour: { style: 'brigandine', color: '#4a5260', trim: '#c8a050' }, shoulders: { style: 'round', color: '#6a7078' }, bracers: { style: 'leather', color: '#4a3020' } },
    outfits: [
      { id: 'rider', name: 'Rider\'s blues', rapport: 0, look: {} },
      { id: 'plain', name: 'Off duty', rapport: 15, look: { tunic: '#5a4a3a', trim: '#8a6a3a', top: 6, chestArmour: undefined, shoulders: undefined, cape: null, hat: 'none' } },
      { id: 'parade', name: 'Parade coat', rapport: 45, look: { top: 7, tunic: '#2a3a6a', trim: '#e0c070', shirt: '#f0e8d8', cape: '#7a2a24', chestArmour: undefined, shoulders: { style: 'mantle', color: '#2a3a6a', trim: '#e0c070' } } },
    ],
    likes: {
      revive: [6, 'You went back for them. Good.'],
      bounty: [5, 'Paid what you owed. That\'s all the law ever asks.'],
      boss: [3, 'That was a big one. You held your ground.'],
      quest: [2, 'Somebody\'s better off for that.'],
      crime: [-8, 'That\'s not what the road\'s for. Don\'t do it again where I can see.'],
      theft: [-6, 'Put it back. Or don\'t, and I\'ll pretend I didn\'t see. Once.'],
    },
    banter: {
      greenwake: ['Hollindale. The road\'s soft down here; you could ride it asleep.', 'I like a valley. You can see trouble coming down both sides.'],
      crownroad: ['Every milestone on this road has a number and a man who\'s paid to keep it. I was one.', 'The Turnpike. Thirty-one tolls between the Ford and the sea, and I could tell you who takes each one.', 'Keep left at the bends. The carters don\'t.'],
      brambledeep: ['I don\'t like woods. You can\'t see the end of anything.', 'Fellers say the Wood listens. I say the Wood\'s got wolves in it, which is worse.'],
      saltwind: ['I can smell the oil from the Light. Can you?', 'Gullmouth.'],
      redstone: ['Everything here is red. My boots will be red for a month.', 'The Company pays its men on a Friday and takes it back on a Saturday. I\'ve seen the books.'],
      starfall: ['Cold up here. Good cold. Keeps your head clear.', 'Snow hides the road. Follow the posts, not the tracks.'],
      morrow: ['They drive on the wrong side of the road here. I\'ve checked.', 'No tolls in Morrow. I keep looking for the gate.'],
      ansbury: ['The south gate. Edda Strake still writes down everyone who comes in, and how much they look like trouble.', 'I was sworn in at the keep. Seems a long time ago.'],
      gullmouth: ['I don\'t come here.', 'The Light\'s up there. I can\'t look at it.'],
      harrowgate: ['The Works keeps its own law. It\'s a worse law than ours, and it\'s better at keeping it.'],
      night: ['Riders work nights. You get used to the dark; you never get used to the cold.', 'Keep your torch low. It blinds you more than it shows you.'],
      rain: ['Rain\'s the road\'s friend. Washes the blood off.'],
      wake: ['Turnips on every doorstep. When I was small we were told the Lantern Man counts them.'],
      fight: ['Behind me.', 'Stay close.', 'Mine.', 'Let them come.'],
      won: ['Done.', 'That\'s that.', 'Check your straps.'],
      hurt: ['You\'re bleeding. Fall back, I\'ve got it.', 'Get your breath. I\'ll hold them.'],
      down: ['Up. Get up. I\'ve got you.'],
      ride: ['Give her her head on the straight. She knows the road better than you.'],
      swim: ['I don\'t swim. Riders don\'t swim. Riders ride round.'],
      idle: ['When you\'re ready.', 'I could do with walking.', 'The road\'s still there, last I looked.'],
      partner: ['You know you snore? Not much. Just enough that I know you\'re there.', 'If anyone asks, I\'m your bodyguard. If you ask, I\'m not.'],
    },
  },
  // ---------------------------------------------------------------- Ottilie Fenn
  // A surveyor's apprentice from the Charter office in Ansbury, sent to measure the Glass Kirk's floor
  // and stayed when the numbers wouldn't sit still. Her grandmother's name is on the tally wall under
  // Gallows Knap: one of the forty-one who went up with the field. She measures crystal because nobody
  // measured it then.
  ottilie: {
    id: 'ottilie', name: 'Ottilie Fenn', title: 'Surveyor\'s apprentice',
    home: { at: [1179.5, 1811.5], face: [1174.5, 1816.5], place: 'the Glass Kirk' },
    roles: ['healer', 'damage'],
    look: { frame: 'f', skin: '#f0d0b4', hair: '#c8743a', hairStyle: 7, eyes: '#4a6a8a', tunic: '#5a6a4a', trim: '#e8dcc0', shirt: '#e8dcc0', trousers: '#4a4a3a', hose: '#3a3a30', boots: '#4a3020', shoes: 1, top: 1, gloves: null, belt: '#6a4a2a', cape: '#6a5a3a', freckles: true, build: 0.94, height: 0.96, age: 0.15, earring: '#d8b050', hat: 'band', hatColor: '#c8a050' },
    outfits: [
      { id: 'field', name: 'Field coat', rapport: 0, look: {} },
      { id: 'office', name: 'Office black', rapport: 15, look: { tunic: '#2a2a30', trim: '#c8a050', shirt: '#f0ece0', top: 7, cape: null, hat: 'none' } },
      { id: 'wake', name: 'Lantern blue', rapport: 40, look: { top: 5, tunic: '#2a3a6a', trim: '#d8b050', shirt: '#e8dcc0', cape: '#1e2a4a', hat: 'circlet', hatColor: '#d8b050' } },
    ],
    likes: {
      vista: [4, 'Look at that. I could survey this whole country from here.'],
      wonder: [6, 'That shouldn\'t exist. I love it.'],
      book: [3, 'What did it say? Tell me everything. Leave out the boring bits; I\'ll ask for them later.'],
      quest: [2, 'Good work. I\'d write it down, but I already have.'],
      crime: [-6, 'Was that necessary? Don\'t answer that.'],
      theft: [-4, 'I didn\'t see that. I\'m going to write down that I didn\'t see that.'],
    },
    banter: {
      greenwake: ['The Ford\'s mill is six inches out of true. Nobody\'s noticed in two hundred years. I noticed.', 'Hollindale\'s my favourite valley. Everything is exactly where the old maps say it is.'],
      crownroad: ['The Turnpike follows a line the Charter surveyors drew in the first year. Dead straight, except where a farmer said no.', 'Ansbury\'s walls lean. Two degrees, to the north. I wrote to the Charter about it. They wrote back to say they were aware.'],
      brambledeep: ['Trees grow toward the light. These grow toward something else. I\'d like to know what.'],
      saltwind: ['The sea\'s the only honest surveyor. It finds the low ground every time.'],
      redstone: ['Iron in the soil. My compass hates it here.', 'The Works dug a hole so deep they found the bottom of the counties. They didn\'t like it, so they filled it in.'],
      starfall: ['Thin air. Every number I take up here is a little wrong and I love every one of them.', 'Somewhere under this snow is a crystal the size of a church. Possibly a church.'],
      morrow: ['Morrow\'s maps were drawn by people who\'d been told about the coast and never seen it.'],
      kirk: ['Put your hand on the crystal. Go on. Feel that? That\'s not warmth. That\'s pull.'],
      kelderby: ['Kelderby has the best bread in the counties. It\'s the altitude. Or the baker. I need more data.'],
      night: ['Stars. All of them where they should be, for once.', 'I measure better at night. Nobody asks what I\'m doing.'],
      rain: ['Rain gauge, rain gauge, my kingdom for a rain gauge.'],
      wake: ['The Lantern Man is a story for children and surveyors. Both of us go out after dark and come back with numbers nobody believes.'],
      fight: ['Careful! I\'m not paid enough to carry you home.', 'Keep still, I\'ll mend you.', 'Left! Your other left!'],
      won: ['Everyone still in one piece? Count your fingers.', 'Well. That was educational.'],
      hurt: ['Hold on, hold on, I\'ve got you.', 'Stop bleeding, it\'s very distracting.'],
      down: ['No, no, no. Up you come. Breathe.'],
      swim: ['Water\'s eleven degrees. I checked. Don\'t ask how.'],
      ride: ['If I fall off, measure where I land.'],
      idle: ['Do you mind if I take a reading?', 'Two minutes. Three. Four at most.', 'I\'m not lost. I know exactly where I am. I just don\'t know where anything else is.'],
      partner: ['I measured how far apart we walk. It\'s getting shorter. That\'s not a complaint.', 'You\'re the only thing in the counties I haven\'t been able to measure. I mean that kindly.'],
    },
  },
  // ---------------------------------------------------------------- Tam Reddick
  // A Gullmouth boatman's son who could splice rope before he could read, and learned cards instead of
  // either. Two summers ago he played a long game on the Kittiwake, a Brethren hull out of Saltpenny
  // Key, and won. He shouldn't have. The Brethren say he owes them three hundred marks for the lesson.
  tam: {
    id: 'tam', name: 'Tam Reddick', title: 'Card sharp, mostly honest',
    home: { at: [1738.5, 601.5], face: [1742.5, 603.5], place: 'the Gullmouth quay' },
    roles: ['damage', 'tank'],
    look: { frame: 'm', skin: '#d8a070', hair: '#1e1612', hairStyle: 1, eyes: '#6a4a2a', tunic: '#7a2a24', trim: '#d8b050', shirt: '#f0e8d8', trousers: '#2a2a2e', hose: '#2a2a2e', boots: '#1e1610', shoes: 1, top: 3, gloves: null, belt: '#3a2a1a', cape: null, earring: '#d8b050', facial: 2, build: 0.98, height: 1.02, age: 0.2, hat: 'kerchief', hatColor: '#2a3a6a' },
    outfits: [
      { id: 'quay', name: 'Quay waistcoat', rapport: 0, look: {} },
      { id: 'sea', name: 'Sea jacket', rapport: 15, look: { top: 7, tunic: '#1e2a44', trim: '#c8c8c8', hat: 'wide', hatColor: '#1e2a44' } },
      { id: 'best', name: 'Sunday best', rapport: 40, look: { top: 1, tunic: '#4a2a5a', trim: '#e0c070', shirt: '#f4f0e8', hat: 'feathered', hatColor: '#2a1a30', cape: '#2a1a30' } },
    ],
    likes: {
      treat: [3, 'Is that toffee? Give us a bit.'],
      quest: [2, 'You do a lot of good for someone who doesn\'t get paid much.'],
      rare: [3, 'Now that\'s a story for the quay.'],
      revive: [4, 'Remind me to never be the one you leave behind. Oh. You didn\'t.'],
      crime: [-3, 'I\'ve no problem with it. I\'ve a problem with getting caught. You\'re getting caught.'],
      bounty: [-2, 'Paying the watch? Where\'s your pride?'],
    },
    banter: {
      greenwake: ['There\'s a man in Hollin Ford who bets on which duck crosses the river first. He\'s lost thirty marks. The ducks are fixed.'],
      crownroad: ['Every inn on this road has a card table and a man at it who thinks he\'s me.', 'The carters here bet on the weight of their own loads. They always lose.'],
      brambledeep: ['I don\'t trust a wood that doesn\'t have a pub in it.'],
      saltwind: ['Smell that? Tar, fish and bad decisions. Home.', 'Every boat on this coast owes somebody money. Mostly me. Mostly I owe them.'],
      redstone: ['The Works. Nothing to steal that isn\'t too heavy to carry.'],
      starfall: ['It\'s so cold my cards are stuck together.', 'I had a cousin went up to Kelderby to make his fortune. He made cheese.'],
      morrow: ['Saltpenny\'s that way. Don\'t look at it. If you look at it, it looks back.'],
      gullmouth: ['Home. Don\'t tell anyone I said it like that.', 'See that boat? Never sails. Best card game on the coast, every Thursday.'],
      ansbury: ['They count everything in Ansbury. I\'ve been thrown out of three of their inns for counting faster.'],
      night: ['Night\'s when the honest money comes out. It\'s the dishonest money you have to watch for.', 'Stars are just the sky\'s cheating. Too many aces.'],
      rain: ['Rain\'s good. Nobody looks at your hands when it\'s raining.'],
      wake: ['Lantern Wake! Toffee apples and turnips. It\'s like Christmas for people who don\'t like Christmas.'],
      fight: ['Behind you! No, behind ME!', 'I\'ll take the ugly one. They\'re all ugly. I\'ll take them all.', 'Let\'s make this quick, I\'ve a game at six.'],
      won: ['And that\'s the hand.', 'Easy money. Easy-ish.'],
      hurt: ['You look terrible. Stop that.', 'Drink something. Anything. Not that.'],
      down: ['Oh, don\'t you dare. Come on, up.'],
      ride: ['If this horse wins a race, I want a cut.'],
      swim: ['Boatman\'s son. Never learned to swim. Never needed to. Boats.'],
      idle: ['Fancy a game? Penny a point.', 'I\'m not bored. I\'m resting my wit.', 'You\'re quiet. I like that in a partner. At cards, I mean.'],
      partner: ['Funny thing. I\'ve stopped counting the exits when you\'re in the room.', 'I\'ve never bet on anything I couldn\'t fix. Except you. Still winning.'],
    },
  },
};

export const COMPANION_IDS = Object.keys(COMPANIONS) as CompanionId[];
/** Rapport needed for each part of their own story to open (the first is when they join). */
export const STORY_AT = [0, 20, 40];
/** Rapport, and flirtations answered, before the end of their story can become something more. */
export const ROMANCE_AT = 60, FLIRTS_NEEDED = 2;
