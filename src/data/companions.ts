import type { Appearance } from '../entities/humanoid';

// Companions, the way ESO's are, written the way BioWare writes them: people you meet in the world who
// will walk it with you. One at a time. Each has a place they're found, a way of fighting, things they
// like to see you do and things they don't (rapport, -100 to 100), something to say about wherever you
// are, a story of their own in three parts that opens as they come to trust you, and, if you ask and
// they're willing, more than friendship. Their conversations are in data/content/companions.ts; the
// walking, fighting and talking in game/Companions.ts.

export type CompanionId = 'wenna' | 'ottilie' | 'tam' | 'ned' | 'dave' | 'fdave';
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

export const COMPANIONS: Record<CompanionId, CompanionDef> = <Record<CompanionId, CompanionDef>>{
  // ---------------------------------------------------------------- Wenna Hale
  // A Toll Rider, once: the Charter's mounted wardens of the Turnpike. In February she drove the Light
  // Fund cart to Fleet Light and signed for nine barrels of oil with six in the back, because the Toll
  // Office told her to. Fleet Light burned low that March, and the Gannet went onto the stacks. The
  // Riders let her go in April. Nobody has told her it wasn't her fault, and she wouldn't believe them.
  wenna: {
    id: 'wenna', name: 'Wenna Hale', title: 'Once of the Toll Riders',
    home: { at: [710.5, 583.5], face: [707.5, 580.5], place: 'the Waystation yard' },
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
      ansbury: ['The south gate. Hulda Strake still writes down everyone who comes in, and how much they look like trouble.', 'I was sworn in at the keep. Seems a long time ago.'],
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
  // ---------------------------------------------------------------- Ned Applegarth
  // Your biggest admirer (owner 2026-11-04, "a biggest fan follower like Oblivion's and Starfield's"; our own).
  // A clerk's boy from the Ansbury counting houses who heard about you once and has thought of nothing
  // else since. He keeps a book of everything you've done, with drawings, most of them wrong. He turns up
  // in Ansbury's market once your name has got about (level 15), and he would follow you into the sea.
  // He approves of everything you do. He fights the way he does everything: with enormous enthusiasm.
  ned: {
    id: 'ned', name: 'Ned Applegarth', title: 'Your biggest admirer',
    home: { at: [811.5, 327.4], face: [811.5, 323.4], place: 'Ansbury\'s market' },
    roles: ['damage', 'tank'],
    look: { frame: 'm', skin: '#f0c8a0', hair: '#c87a3a', hairStyle: 8, eyes: '#4a7a8a', tunic: '#5a7aa8', trim: '#e0bd64', shirt: '#e8dcc0', trousers: '#4a4034', hose: '#e8dcc0', boots: '#5a4030', top: 1, legs: 1, shoes: 2, belt: '#7a2a24', freckles: true, brows: 2, build: 0.9, height: 0.96, age: 0.05, hat: 'cap', hatColor: '#5a7aa8' },
    outfits: [
      { id: 'clerk', name: 'Counting-house best', rapport: 0, look: {} },
      { id: 'yours', name: 'Dressed as you (nearly)', rapport: 15, look: { top: 4, tunic: '#3a5a8a', trim: '#e0bd64', cape: '#7a2a24', hat: 'none', chestArmour: { style: 'cuirass', color: '#6a4a2a' } } },
      { id: 'herald', name: 'Your herald', rapport: 40, look: { top: 7, tunic: '#7a2a24', trim: '#e0bd64', shirt: '#f4f0e8', cape: '#e0bd64', hat: 'feathered', hatColor: '#7a2a24', tabard: { color: '#7a2a24', trim: '#e0bd64' } } },
    ],
    likes: {
      quest: [3, 'Another one for the book! Hold still, I want to get your face right this time.'],
      boss: [4, 'Did you see that? Of course you saw it, you did it. I saw it. I SAW it.'],
      rare: [3, 'May I hold it? Just for a moment. I won\'t breathe on it.'],
      revive: [4, 'You came back for me. That\'s going in the book. In capitals.'],
      vista: [2, 'I\'ll draw it. I\'ll draw you in front of it. Don\'t move. Move a little to the left.'],
      wonder: [2, 'Nobody back at the counting house is going to believe this. I don\'t believe this.'],
      book: [1, 'You read as well? Is there anything you can\'t do?'],
      treat: [2, 'You eat toffee apples too? I eat toffee apples!'],
      bounty: [1, 'Paying what you owe. That\'s honourable, that is. I\'ll put it in.'],
      crime: [1, 'I didn\'t see anything. I\'ll put in the book that I didn\'t see anything. Should I put that in?'],
      theft: [1, 'They had too many of those anyway. You were helping, really.'],
    },
    banter: {
      greenwake: ['Hollin Ford! Where it all started. I made a map of where you stood. Just here, I think. Or there.', 'The ford\'s smaller than I drew it.'],
      crownroad: ['Every inn on this road has heard of you. I made sure. I went ahead last week.', 'I told the toll men you were coming. They didn\'t seem as pleased as I\'d hoped.'],
      brambledeep: ['If anything comes out of those trees, I\'ll protect you. Then you protect me. That\'s fair.'],
      saltwind: ['Is that the sea? I\'ve never seen the sea up close. It\'s very big. Bigger than you said. You didn\'t say. Bigger than I thought.'],
      redstone: ['The Works! Do you think they\'d let me draw the furnaces? Do you think they\'d let me draw you in front of the furnaces?'],
      starfall: ['My ink\'s frozen. I\'m remembering it all instead. I\'ve remembered four things already.'],
      morrow: ['Another land. You\'ve crossed to another land and I\'m with you. Mother won\'t believe it. Mother didn\'t believe Ansbury.'],
      ansbury: ['This is where I first heard of you. Third bench from the well. I can show you the bench.', 'I used to add up columns for the mercers. Now I add up what you\'ve done. It\'s a longer column.'],
      gullmouth: ['They know you here. A fisherman pointed. I pointed back. We were both pointing at you.'],
      harrowgate: ['Harrowgate. I\'ll stand behind you. I\'ll stand slightly to the side of behind you.'],
      kirk: ['The Glass Kirk. I wrote your name in the pilgrims\' book. Six times. Was that too many?'],
      night: ['I can\'t sleep when we\'re out. What if you do something and I miss it?', 'The stars look like they\'re watching you. I would be.'],
      rain: ['I\'ve got the book under my coat. The book is dry. I am not dry. The book is what matters.'],
      wake: ['Lantern Wake! I carved a turnip to look like you. It looks more like a turnip. It\'s the thought.'],
      fight: ['For the book!', 'I\'m helping! Am I helping?', 'Stand back, all of you! Not you. You can stay.'],
      won: ['That was the best thing I\'ve ever seen. Again, if you like.', 'I\'ve put that down. I\'ve put it all down.'],
      hurt: ['You\'re bleeding. Heroes bleed? I didn\'t know heroes bleed.', 'Sit down. Have something. I\'ll fan you.'],
      down: ['No no no no. Up. Please. The book isn\'t finished.'],
      ride: ['I can\'t ride, really. I\'m holding on. I\'m holding on with my whole self.'],
      swim: ['I can\'t swim either. I\'m learning. From watching you. Is this how? Is THIS how?'],
      idle: ['Would you sign the book again? The first time was a bit smudged.', 'I\'ve been thinking what your statue should look like. Taller. That\'s all. Just taller.', 'Do you need anything carried? I could carry you. I couldn\'t carry you.', 'Sorry. I was staring. I\'ll stop. I\'ve stopped. Mostly.'],
      partner: ['I never thought you\'d look at me. Now you do, I don\'t know where to look.'],
    },
  },
  // ---------------------------------------------------------------- Dave Kitto
  // A Gullmouth fisherman, forty, built like a mooring post, who says about a third of what he thinks.
  // Three winters ago Becky White, who he was going to marry at Lammas, walked out to Gullmouth Light in a
  // fog with a lamp to bring his boat home, and didn't come back. Some nights he can see her lamp out on
  // the water from the quay. His story is the quest line in data/content/fishermanDave.ts: the Reckoner,
  // what it keeps, and the one pair of hands that can take it back. He's never hit anyone in his life.
  // You teach him. He likes honest work and people being kind to each other; he can't abide cruelty.
  dave: {
    id: 'dave', name: 'David Kitto', title: 'Fisherman, Gullmouth',
    home: { at: [1786.5, 607.5], face: [1790.5, 607.5], place: 'Gullmouth quay' },
    roles: ['tank', 'damage'],
    look: { frame: 'm', skin: '#c8906a', hair: '#5a4a3a', hairStyle: 3, facial: 7, eyes: '#4a6a7a', tunic: '#3a4a5a', trim: '#8a7a5a', shirt: '#d8ccb0', trousers: '#2e2a26', boots: '#1e1a16', top: 6, belt: '#4a3420', hat: 'cap', hatColor: '#2a3440', build: 1.3, height: 1.04, age: 0.45, brows: 1 },
    outfits: [
      { id: 'boat', name: 'Boat clothes', rapport: 0, look: {} },
      { id: 'gansey', name: 'Becky\'s gansey', rapport: 20, look: { top: 3, tunic: '#2a3a5a', trim: '#2a3a5a', shirt: '#2a3a5a', hat: 'none' } },
      { id: 'oilskin', name: 'Oilskins', rapport: 35, look: { top: 7, tunic: '#c8a030', trim: '#a8801a', shirt: '#d8ccb0', hat: 'wide', hatColor: '#c8a030' } },
      { id: 'sunday', name: 'His Sunday coat', rapport: 55, look: { top: 7, tunic: '#2a2a30', trim: '#8a7a5a', shirt: '#f0e8d8', hat: 'none', cape: null } },
    ],
    likes: {
      revive: [4, 'You came back for me. I\'ll remember that. I don\'t forget much.'],
      treat: [2, 'Becky had a sweet tooth. Never trusted a man who didn\'t, she said.'],
      quest: [2, 'That was a decent thing.'],
      bounty: [2, 'Square with them. Good.'],
      vista: [1, 'You can see the weather coming from here. That\'s worth a lot, at sea.'],
      boss: [2, 'I\'d not have stood against that. Not a year ago.'],
      crime: [-4, 'That wasn\'t yours to take. Somebody worked for that.'],
      theft: [-5, 'Put it back. I mean it.'],
      book: [1, 'Read it out, if it\'s any good. I never learned well.'],
    },
    banter: {
      greenwake: ['Hollin Ford. My mother\'s people were from up here. She said the river was too small to be honest.'],
      crownroad: ['Long way from salt water. My hands don\'t know what to do.', 'Ansbury folk buy our fish and complain about it. Every week. Same complaint.'],
      brambledeep: ['I don\'t like trees close up like this. You can\'t see what\'s coming. At sea you can see it for an hour.'],
      saltwind: ['Smell that. That\'s home. Fish guts and tar. Best smell there is.', 'Wind\'s backing south. We\'ll have rain by dark.'],
      redstone: ['They work like we fish, the Works men. Never enough, and never stop.'],
      starfall: ['Cold up here. Not sea cold. Dry. I don\'t trust a cold that doesn\'t wet you.'],
      morrow: ['Other side of the sea. I\'ve looked at it from the boat all my life and never been.'],
      ansbury: ['Too many people, all of them in a hurry to be somewhere else.'],
      gullmouth: ['That\'s my boat. The blue one. She\'s called the Becky. I know. I know.', 'Every man on this quay\'s lost somebody to the water. We don\'t talk about it. We mend the nets.'],
      kirk: ['Becky came here once. Lit a candle for her dad. I stood outside. Didn\'t feel right going in.'],
      night: ['On a clear night you can see her lamp from the quay. I\'ve looked every night for three winters.', 'Quiet. Too quiet. I like the sound of water.'],
      rain: ['Rain\'s nothing. Rain\'s just the sea come to visit.'],
      wake: ['Lantern Wake. Becky carved the best turnips on the quay. Faces like the harbour master.'],
      fight: ['Right.', 'Come on, then.', 'Stay behind me.', 'I\'ve got this one.'],
      won: ['That\'s done.', 'Still standing. Good.', 'You taught me that.'],
      hurt: ['I\'m all right. Seen worse on a winch.', 'Sit down a minute. You\'re grey.'],
      down: ['Get up. Please. I can\'t lose two.'],
      ride: ['Never sat a horse in my life. It\'s like a boat that has opinions.'],
      swim: ['Most fishermen can\'t swim. Quicker that way, they say. I learned anyway. For her.'],
      idle: ['Becky would\'ve liked you. She liked anyone who didn\'t talk for the sake of it.', 'I can mend a net in the dark by feel. Twenty years of it. My hands do it while I\'m thinking.', 'Do you want a sandwich? I\'ve got a sandwich. It\'s fish.', 'You\'re a good teacher. You don\'t shout. Much.'],
      partner: ['You know where I stand. I\'ll not say it twice.'],
    },
  },
};

// Fisherman Dave (owner 2026-11-11, docs/briefs/fisherman-dave.md and the concept art): poor, friendly, strange and a
// little unhinged; drunk since Becky White died, his fighting gone with his nerve. His story is the quest line in
// data/content/fishermanDave.ts; he joins in it, and the Magical Pilgrim Hat makes a spellcaster of him (the hat's
// powers, not his own: game/Companions.ts). He stays as long as you'd like. (David Kitto is someone else.)
COMPANIONS.fdave = {
  id: 'fdave', name: 'Fisherman Dave', title: 'Gullmouth',
  home: { at: [1772.5, 640.5], face: [1776.5, 640.5], place: 'his net shed above the slip' },
  roles: ['damage', 'tank'],
  look: { frame: 'm', skin: '#e8c4a4', hair: '#6a3a1e', hairStyle: 0, facial: 1, eyes: '#3a5a7a', glasses: '#141414', tunic: '#d8a020', trim: '#c08a18', shirt: '#5a6a2a', top: 4, braces: '#2a1e14', belt: '#2a1e14', trousers: '#22305a', boots: '#6a1e1a', shoes: 1, gloves: '#3a5a1e', hat: 'none', build: 1.05 },
  outfits: [
    { id: 'own', name: 'His smock', rapport: 0, look: {} },
    { id: 'grin', name: 'In a good mood', rapport: 25, look: { smile: true } },
  ],
  likes: {
    revive: [5, 'You came back for me. I won\'t forget it. I forget most things. Not that.'],
    quest: [2, 'That was decent of you. Nobody\'s decent any more. You are.'],
    treat: [2, 'Becky had a sweet tooth. Never trusted a man without one, she said.'],
    vista: [1, 'You can see the weather coming from up here. That\'s worth something.'],
    boss: [3, 'Did we do that? We did that!'],
    crime: [-4, 'That wasn\'t yours. Somebody worked for that. I\'ve been poor; I know.'],
    theft: [-5, 'Put it back. I mean it. Put it back.'],
  },
  banter: {
    saltwind: ['Smell that. Fish and tar. Best smell in the world. Don\'t tell anyone I said that, they\'ll think I\'m strange.'],
    gullmouth: ['That\'s my shed. Don\'t look in it.', 'Ford\'s up on the quay road. He\'s always up on the quay road. I think he sleeps standing.'],
    greenwake: ['Hollin Ford. The river\'s too small to fish properly. I\'ve tried. The fish were embarrassed for me.'],
    night: ['Quiet. I don\'t like it quiet. Quiet\'s when you think.', 'You ever notice how quiet the world gets near water?'],
    rain: ['Rain\'s just the sea come visiting.'],
    fight: ['Right!', 'Hit them before they hit you. That\'s the first rule.', 'Stay close. If I do something strange, it\'s probably intentional.'],
    won: ['Well, that\'s one less thing trying to kill us.', 'Now that\'s starting to look familiar!', 'I didn\'t fall over!'],
    hurt: ['I\'m fine. I\'m fine. Is that mine? That\'s mine.', 'Sit down a minute. You\'ve gone a funny colour.'],
    down: ['Get up! Get up, please. I can\'t do this on my own.'],
    swim: ['I can swim. I just don\'t like to. The fish look at you.'],
    idle: ['Well, things certainly turned out better than I expected.', 'I\'ve got my hat, I\'ve got Becky, and I\'ve got a reason to get out of bed. That\'s a pretty good day.', 'You ever notice how strange life gets when you stop drinking long enough to pay attention?', 'I suppose I ought to thank you again. I might get around to it eventually.', 'Do you want a sandwich? I\'ve got half a sandwich.'],
    partner: ['You know where I stand. I\'m not saying it twice. Once was hard enough.'],
  },
};

export const COMPANION_IDS = Object.keys(COMPANIONS) as CompanionId[];
/** Rapport needed for each part of their own story to open (the first is when they join). */
export const STORY_AT = [0, 20, 40];
/** Rapport, and flirtations answered, before the end of their story can become something more. */
export const ROMANCE_AT = 60, FLIRTS_NEEDED = 2;

/** What a companion is called in passing (a chat line, "Talk to"): the first name, or Dave for Fisherman Dave. */
export const compShort = (id: CompanionId): string => (id === 'fdave' ? 'Dave' : COMPANIONS[id].name.split(' ')[0]);
