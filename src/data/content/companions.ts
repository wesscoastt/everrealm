import type { DialogueTree, DNode, DOption, GameApi } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';
import { COMPANIONS, FLIRTS_NEEDED, ROMANCE_AT, STORY_AT, type CompanionId } from '../companions';

// The companions' conversations (data/companions.ts says who they are): meeting them, the menu you get
// whenever you talk to one after (how they are, their outfits, their role, sending them home), their
// own stories in three parts, and flirting. A part of their story opens when rapport reaches it, and
// is told in the place it happened, so they'll ask you to take them there first.

const R = (g: GameApi, id: CompanionId) => Number(g.flag(`comp:${id}:rapport`) ?? 0);
const part = (g: GameApi, id: CompanionId) => Number(g.flag(`comp:${id}:part`) ?? 0);
const flirts = (g: GameApi, id: CompanionId) => Number(g.flag(`comp:${id}:flirt`) ?? 0);
const joined = (g: GameApi, id: CompanionId) => !!g.flag(`comp:${id}:joined`);
const partner = (g: GameApi, id: CompanionId) => !!g.flag(`comp:${id}:partner`);
const active = (g: GameApi, id: CompanionId) => g.compActive() === id;
const night = (g: GameApi) => { const h = g.compHour(); return h >= 20 || h < 5; };
/** The romance closing a story: if you've flirted and they trust you enough, they say it. */
const canLove = (g: GameApi, id: CompanionId) => !g.flag(`comp:${id}:romanceAsked`) && flirts(g, id) >= FLIRTS_NEEDED && R(g, id) >= ROMANCE_AT;

/** The options every companion's menu shares: outfits, role, coming and going. */
function common(id: CompanionId): DOption[] {
  const c = COMPANIONS[id];
  return [
    { text: 'Change into something else.', next: 'outfits', cond: (g) => joined(g, id) },
    { text: 'Fight differently.', next: 'roles', cond: (g) => joined(g, id) && c.roles.length > 1 },
    { text: `Go back to ${c.home.place} for now.`, cond: (g) => active(g, id), effect: (g) => g.compDismiss(), next: 'bye' },
    { text: 'Come with me.', cond: (g) => joined(g, id) && !active(g, id), effect: (g) => g.compJoin(id), next: 'hello' },
  ];
}
function outfitNodes(id: CompanionId): Record<string, DNode> {
  const c = COMPANIONS[id];
  return {
    outfits: {
      text: 'What did you have in mind?',
      options: [
        ...c.outfits.map((o): DOption => ({ text: (g) => (R(g, id) >= o.rapport ? o.name : `${o.name} (when you know each other better)`), cond: () => true, effect: (g) => { if (R(g, id) >= o.rapport) g.compOutfit(id, o.id); }, next: 'menu' })),
        { text: 'Never mind.', next: 'menu' },
      ],
    },
    roles: {
      text: id === 'wenna' ? 'I can hold them or I can hit them. I\'m better at holding.' : id === 'ottilie' ? 'I can mend you or I can freeze them. I prefer mending. It\'s more polite.' : 'I can stab things or I can stand in front of things that want stabbing. Your call.',
      options: [
        ...c.roles.map((r): DOption => ({ text: r === 'tank' ? 'Hold the line: draw them onto you.' : r === 'healer' ? 'Keep us standing: mend.' : 'Hit them hard.', effect: (g) => g.compRole(id, r), next: 'menu' })),
        { text: 'As you were.', next: 'menu' },
      ],
    },
  };
}

// ==================================================================== Wenna Hale
const wenna: DialogueTree = {
  start: (g) => (g.flag('comp:wenna:gone') ? 'gone' : joined(g, 'wenna') ? 'menu' : 'meet'),
  nodes: {
    gone: { text: 'I\'ve said what I had to say to you. Ride safe.' },
    meet: {
      text: (g) => (g.flag('comp:wenna:met') ? 'You again.' : 'You\'re standing in my light.'),
      effect: (g) => g.setFlag('comp:wenna:met', 1),
      options: [
        { text: 'Sorry. I\'ll move.', next: 'meet2' },
        { text: 'It\'s a big yard. Move your chair.', effect: (g) => g.compRapport('wenna', 2), next: 'meet2b' },
        { text: 'Leave her be.' },
      ],
    },
    meet2: { text: 'Don\'t. You\'re the most interesting thing that\'s happened in this yard all week, and you\'ve done nothing.', next: 'intro' },
    meet2b: { text: 'Ha. Fair. Sit, then.', next: 'intro' },
    intro: {
      text: 'Wenna Hale. I used to ride the Turnpike for the Charter: Toll Riders, the blue coats. Now I sit in the Waystation yard and watch other people ride it.',
      options: [
        { text: 'Used to?', next: 'used' },
        { text: 'I could use someone who knows the road.', next: 'offer' },
        { text: 'Good to meet you, Wenna.' },
      ],
    },
    used: {
      text: 'The Riders and I had a difference of opinion. They thought I should go. In the end, so did I.',
      options: [
        { text: 'What happened?', next: 'usedwhat' },
        { text: 'I\'m sorry.', next: 'usedsorry' },
        { text: 'I could use someone who knows the road.', next: 'offer' },
      ],
    },
    usedwhat: { text: 'Ask me again when you know me. If you ever do.', next: 'intro2' },
    usedsorry: { text: 'Don\'t be. Nobody died of it. Not of that.', next: 'intro2' },
    intro2: { text: 'Anything else?', options: [{ text: 'I could use someone who knows the road.', next: 'offer' }, { text: 'No. Take care.' }] },
    offer: {
      text: 'You want an escort. Most people who say that want somebody to blame when the road goes wrong.',
      options: [
        { text: 'I want someone who\'ll stand beside me.', effect: (g) => g.compRapport('wenna', 3), next: 'joinyes' },
        { text: 'I\'ll pay you.', next: 'joinpay' },
        { text: 'Forget it.' },
      ],
    },
    joinyes: { text: 'Beside you. That, I can do.', next: 'join' },
    joinpay: { text: 'Keep it. Pay me in roads I haven\'t seen. There aren\'t many.', next: 'join' },
    join: { text: 'Give me a minute to find my shield. Found it. Lead on.', effect: (g) => { g.setFlag('comp:wenna:joined', 1); g.setFlag('comp:wenna:part', 1); g.compJoin('wenna'); } },
    hello: { text: 'About time.' },
    bye: { text: 'I\'ll be in the yard. Same chair.' },
    menu: {
      text: (g) => (partner(g, 'wenna') ? 'Hello, you.' : R(g, 'wenna') >= 40 ? 'What do you need?' : R(g, 'wenna') >= 0 ? 'What is it?' : 'Well?'),
      options: [
        { text: 'How are you holding up?', next: 'mood' },
        { text: 'Tell me about the Toll Riders.', next: 'riders' },
        // Her story
        { text: 'You said nobody died of it. "Not of that." What did you mean?', cond: (g) => part(g, 'wenna') === 1 && R(g, 'wenna') >= STORY_AT[1] && !g.flag('comp:wenna:s2'), next: 's2hook' },
        { text: 'We\'re at the quay, Wenna.', cond: (g) => !!g.flag('comp:wenna:s2') && part(g, 'wenna') === 1 && active(g, 'wenna') && g.compNear(1745, 600, 35), next: 's2a' },
        { text: 'Do you want to know who ordered the oil held back?', cond: (g) => part(g, 'wenna') === 2 && R(g, 'wenna') >= STORY_AT[2] && !g.flag('comp:wenna:s3'), next: 's3hook' },
        { text: 'We\'re at the south gate.', cond: (g) => !!g.flag('comp:wenna:s3') && part(g, 'wenna') === 2 && active(g, 'wenna') && g.compNear(849, 361, 35), next: 's3a' },
        // Flirting
        { text: '(Flirt) You wear that coat like you mean it.', cond: (g) => !partner(g, 'wenna') && R(g, 'wenna') >= 25 && flirts(g, 'wenna') === 0, next: 'f1' },
        { text: '(Flirt) Save me a place by the fire tonight.', cond: (g) => !partner(g, 'wenna') && R(g, 'wenna') >= 25 && flirts(g, 'wenna') === 1, next: 'f2' },
        { text: '(Flirt) I feel safer with you than behind any wall.', cond: (g) => !partner(g, 'wenna') && R(g, 'wenna') >= 25 && flirts(g, 'wenna') >= 2, next: 'f3' },
        { text: '(Romance) Come here.', cond: (g) => partner(g, 'wenna'), next: 'love' },
        ...common('wenna'),
        { text: 'Nothing. Let\'s go.' },
      ],
    },
    mood: {
      text: (g) => (R(g, 'wenna') >= 50 ? 'Better than I have been in a year. Don\'t make a thing of it.' : R(g, 'wenna') >= 15 ? 'I\'m sleeping. That\'s new.' : R(g, 'wenna') >= 0 ? 'I\'m upright. Ask me again in a week.' : 'I\'m watching you. That\'s how I\'m holding up.'),
      next: 'menu',
    },
    riders: {
      text: 'Forty of us, from the Ford to the sea. You ride your stretch, you know every carter by his horse, you know which inns water the ale and which water the oats. You see a cart on the verge, you stop. That\'s the job: you stop. Most people don\'t.',
      next: 'menu',
    },
    s2hook: { text: 'Not here. Gullmouth. Take me to the quay at Gullmouth and ask me there. I\'ll only say it once.', effect: (g) => g.setFlag('comp:wenna:s2', 1), next: 'menu' },
    s2a: { text: 'See the Light? Up on the headland. Fleet Light. I don\'t look at it if I can help it.', next: 's2b' },
    s2b: {
      text: 'In February I drove the Light Fund cart out from Ansbury. Nine barrels of oil on the order. Six in the back. The clerk at the Toll Office said three were held against the Fund\'s arrears, the Charter would square it in the spring, sign for nine. So I signed for nine.',
      next: 's2c',
    },
    s2c: {
      text: 'Hester Coggin turned the lamp down to make six last. In March the Gannet came round the stacks in the dark looking for a light that wasn\'t there. Col Maddox. Ansel Rook. Ansel was nineteen. He spliced the rope on my saddle once, for nothing.',
      options: [
        { text: 'You didn\'t keep the oil back. The Toll Office did.', next: 's2kind' },
        { text: 'You knew the barrels were short. You should have said something.', next: 's2hard' },
        { text: 'Then we find out who told you to sign.', next: 's2find' },
      ],
    },
    s2kind: { text: 'My name\'s on the paper. That\'s what a name on a paper is for. But thank you. I\'ve wanted someone to say that and I\'ve wanted nobody to say it, both, for months.', effect: (g) => g.compRapport('wenna', 8), next: 's2end' },
    s2hard: { text: 'Yes. I should have. Nobody\'s said it to my face before. They all said it behind my back, which was worse. Thank you for that, oddly.', effect: (g) => g.compRapport('wenna', 4), next: 's2end' },
    s2find: { text: 'You\'d do that? For a Rider they threw out?', effect: (g) => g.compRapport('wenna', 10), next: 's2end' },
    s2end: { text: 'The Riders let me go in April. Lost three barrels of the Charter\'s oil, they said. I let them say it. Come on. I\'ve looked at that light long enough.', effect: (g) => { g.setFlag('comp:wenna:part', 2); g.compStory('wenna', 2); } },
    s3hook: { text: 'Hulda Strake keeps the south gate book at Ansbury. Every cart, every load, every name, and who signs the holds. Take me to the south gate. If the name\'s in there, I want to read it myself.', effect: (g) => g.setFlag('comp:wenna:s3', 1), next: 'menu' },
    s3a: { text: 'Wait here.', speaker: 'npc', next: 's3b' },
    s3b: { text: 'Wenna talks to the corporal at the gate for a long time. Hulda Strake looks at you, then at Wenna, and turns the book round on the table.', speaker: 'narrator', next: 's3c' },
    s3c: {
      text: 'February. "Light Fund cart, hold of three barrels against arrears, Amos Penn for the Toll Office." And under it, in another hand: "By order. G. Ottery, Captain of Riders." My captain. He held the oil back himself, and then he stood in front of the Charter and let them throw me out for losing it.',
      options: [
        { text: 'Take it to the Charter Hall. Everyone should hear it.', next: 's3hall' },
        { text: 'Go and see Ottery yourself. Make him pay the families.', next: 's3quiet' },
        { text: 'It\'s done, Wenna. Leave it.', next: 's3leave' },
      ],
    },
    s3hall: { text: 'Everyone. The Rooks, Jory Maddox, the Riders. They should hear it read out loud, the way they heard my name read out. Yes.', effect: (g) => { g.compRapport('wenna', 15); g.setFlag('comp:wenna:end', 'hall'); }, next: 's3end' },
    s3quiet: { text: 'He\'ll pay. Every penny the Rooks and the Maddoxes are owed, and he\'ll sign for it, and I\'ll watch him sign. It isn\'t enough. It\'s what there is.', effect: (g) => { g.compRapport('wenna', 5); g.setFlag('comp:wenna:end', 'quiet'); }, next: 's3end' },
    s3leave: {
      text: 'Leave it. No. I don\'t think I will.',
      effect: (g) => { g.compRapport('wenna', -25); g.setFlag('comp:wenna:end', 'leave'); },
      next: 's3leave2',
    },
    s3leave2: { text: (g) => (R(g, 'wenna') < 10 ? 'I\'ll do it on my own. I always was going to. Goodbye.' : 'You\'re wrong. But you were there when I read it, and that counts. Come on.'), effect: (g) => { if (R(g, 'wenna') < 10) g.compLeave('wenna'); else { g.setFlag('comp:wenna:part', 3); g.compStory('wenna', 3); } } },
    s3end: {
      text: (g) => (g.flag('comp:wenna:end') === 'hall' ? 'They\'ll send for him. They\'ll ask me back, too, I expect. I\'ll say no. I\'ve a road to ride, and somebody to ride it with.' : 'It\'s done. Or it\'s as done as it gets.'),
      effect: (g) => { g.setFlag('comp:wenna:part', 3); g.compStory('wenna', 3); },
      next: 's3love',
    },
    s3love: {
      text: (g) => (canLove(g, 'wenna') ? 'There\'s something else, and I\'ve been sitting on it the way I sat on that paper. I like you. More than I\'ve any business liking someone I\'m meant to be keeping alive. There. Said it.' : 'Let\'s go. Somewhere that isn\'t Ansbury.'),
      options: [
        { text: 'I feel the same, Wenna.', cond: (g) => canLove(g, 'wenna'), effect: (g) => { g.setFlag('comp:wenna:romanceAsked', 1); g.setFlag('comp:wenna:partner', 1); g.compRapport('wenna', 10); }, next: 'loveyes' },
        { text: 'I\'m sorry. I don\'t.', cond: (g) => canLove(g, 'wenna'), effect: (g) => g.setFlag('comp:wenna:romanceAsked', 1), next: 'loveno' },
        { text: 'Let\'s go.', cond: (g) => !canLove(g, 'wenna') },
      ],
    },
    loveyes: { text: 'Good. Right. Good. I\'m not going to be soft about it in front of people. I\'m going to be very soft about it when they\'ve gone.' },
    loveno: { text: 'Clear. That\'s how I like things. Nothing changes, then; I\'ve still got your back.' },
    f1: { text: 'It\'s a brigandine. It\'s meant to look like I mean it. Thank you.', effect: (g) => { g.setFlag('comp:wenna:flirt', 1); g.compRapport('wenna', 2); }, next: 'menu' },
    f2: { text: 'I always save you a place. You never notice.', effect: (g) => { g.setFlag('comp:wenna:flirt', 2); g.compRapport('wenna', 2); }, next: 'menu' },
    f3: { text: 'Careful. I might start believing you.', effect: (g) => { g.setFlag('comp:wenna:flirt', 3); g.compRapport('wenna', 1); }, next: 'menu' },
    love: { text: (g) => (night(g) ? 'Not out here. All right, out here. Quickly.' : 'People are looking. Let them look.'), next: 'menu' },
    ...outfitNodes('wenna'),
  },
};

// ==================================================================== Ottilie Fenn
const ottilie: DialogueTree = {
  start: (g) => (g.flag('comp:ottilie:gone') ? 'gone' : joined(g, 'ottilie') ? 'menu' : 'meet'),
  nodes: {
    gone: { text: 'I\'ve a lot of measuring to do. On my own, it seems. Goodbye.' },
    meet: {
      text: (g) => (g.flag('comp:ottilie:met') ? 'Oh, it\'s you. Mind the line.' : 'Don\'t step on the line! Thank you. Sorry. Ottilie Fenn, Charter survey office, Ansbury. Would you hold this end?'),
      effect: (g) => g.setFlag('comp:ottilie:met', 1),
      options: [
        { text: 'Hold it how?', next: 'hold' },
        { text: 'What are you measuring?', next: 'measure' },
        { text: 'No.', next: 'no' },
      ],
    },
    no: { text: 'Fair. It\'s very boring. That\'s rather the point of it.' },
    hold: { text: 'You hold the end of the line against a chalk mark on the floor. She reads a brass scale, writes, reads again, and frowns.', speaker: 'narrator', next: 'hold2' },
    hold2: { text: 'Half an inch. Since Lady Day. The floor is half an inch higher than it was in March, and it was a quarter higher in March than at Christmas.', effect: (g) => g.compRapport('ottilie', 3), next: 'measure' },
    measure: {
      text: 'The Kirk stands on crystal. Crystal is lift; everyone knows what happened at Gallows Knap. Sela Orme, the keeper, says the floor\'s been the same height for a hundred years. My line disagrees, and my line has no reason to lie.',
      options: [
        { text: 'Is it dangerous?', next: 'danger' },
        { text: 'Why do you care so much?', next: 'why' },
        { text: 'I\'m going all over the counties. Come and measure the rest of them.', next: 'join' },
      ],
    },
    danger: { text: 'It\'s half an inch. Ask me again in a year, and again in ten. That\'s the trouble with lift: it\'s never dangerous until it is.', next: 'measure' },
    why: { text: 'Ask me again when you\'ve known me longer than an afternoon. I\'m told it\'s polite to wait.', next: 'measure' },
    join: { text: 'Every crystal in the counties? Give me a moment to pack. Three moments. And somebody to carry the tripod. Is that you? It\'s you.', effect: (g) => { g.setFlag('comp:ottilie:joined', 1); g.setFlag('comp:ottilie:part', 1); g.compRapport('ottilie', 3); g.compJoin('ottilie'); } },
    hello: { text: 'Good. I\'ve run out of things to measure here.' },
    bye: { text: 'I\'ll be at the Kirk. Holding my own line, sadly.' },
    menu: {
      text: (g) => (partner(g, 'ottilie') ? 'There you are. I was about to measure how long you\'d been gone.' : R(g, 'ottilie') >= 40 ? 'Yes? I\'m listening. Mostly.' : 'Hm? Sorry. Yes?'),
      options: [
        { text: 'How are you?', next: 'mood' },
        { text: 'What do you actually do at the survey office?', next: 'office' },
        { text: 'You never told me why you care about the crystal.', cond: (g) => part(g, 'ottilie') === 1 && R(g, 'ottilie') >= STORY_AT[1] && !g.flag('comp:ottilie:s2'), next: 's2hook' },
        { text: 'We\'re at the Rime Bowl.', cond: (g) => !!g.flag('comp:ottilie:s2') && part(g, 'ottilie') === 1 && active(g, 'ottilie') && g.compNear(959, 1753, 45), next: 's2a' },
        { text: 'What do you want to do about the Kirk floor?', cond: (g) => part(g, 'ottilie') === 2 && R(g, 'ottilie') >= STORY_AT[2] && !g.flag('comp:ottilie:s3'), next: 's3hook' },
        { text: 'We\'re at the Kirk.', cond: (g) => !!g.flag('comp:ottilie:s3') && part(g, 'ottilie') === 2 && active(g, 'ottilie') && g.compNear(1174, 1816, 30), next: 's3a' },
        { text: '(Flirt) You\'ve got ink on your nose.', cond: (g) => !partner(g, 'ottilie') && R(g, 'ottilie') >= 25 && flirts(g, 'ottilie') === 0, next: 'f1' },
        { text: '(Flirt) Measure me, then.', cond: (g) => !partner(g, 'ottilie') && R(g, 'ottilie') >= 25 && flirts(g, 'ottilie') === 1, next: 'f2' },
        { text: '(Flirt) I like the way you look at the world.', cond: (g) => !partner(g, 'ottilie') && R(g, 'ottilie') >= 25 && flirts(g, 'ottilie') >= 2, next: 'f3' },
        { text: '(Romance) Come here, you.', cond: (g) => partner(g, 'ottilie'), next: 'love' },
        ...common('ottilie'),
        { text: 'Nothing. Lead on.' },
      ],
    },
    mood: { text: (g) => (R(g, 'ottilie') >= 50 ? 'Happy. Is that allowed? I\'m going to allow it.' : R(g, 'ottilie') >= 15 ? 'Busy. Good busy. I\'ve filled two books.' : R(g, 'ottilie') >= 0 ? 'Cold. Curious. The usual.' : 'I\'m fine. I\'m being very professional about it.'), next: 'menu' },
    office: { text: 'Mostly I copy other people\'s numbers into bigger books. Once a year they let me out to make some numbers of my own. This year I didn\'t go back. I expect they\'ve noticed. I expect they\'ve noted it.', next: 'menu' },
    s2hook: { text: 'The Rime Bowl, up past Kelderby. Take me there and I\'ll tell you. Some things I can only say standing on crystal.', effect: (g) => g.setFlag('comp:ottilie:s2', 1), next: 'menu' },
    s2a: { text: 'Hold the line again? There. A quarter of an inch a year, the Bowl\'s floor. It\'s been rising since before the Charter. Nobody here has fallen into the sky, so nobody minds.', next: 's2b' },
    s2b: {
      text: 'My grandmother was a stone-cutter\'s girl at Gallows Knap. She was in the field when they cut the ropes. Forty-one names on the tally wall under the hill. Hers is the thirtieth. Margery Fenn. Nobody measured anything. They just cut.',
      options: [
        { text: 'That\'s why you measure.', next: 's2why' },
        { text: 'You can\'t measure grief, Ottilie.', next: 's2grief' },
        { text: 'It was a long time ago.', next: 's2long' },
      ],
    },
    s2why: { text: 'That\'s why I measure. If anyone had been watching that hill with a line and a scale, she\'d have grown old in Hollindale and been very rude to me about my handwriting.', effect: (g) => g.compRapport('ottilie', 8), next: 's2end' },
    s2grief: { text: 'No. But I can measure the next one before it happens. That\'s something. That\'s what I\'ve got instead.', effect: (g) => g.compRapport('ottilie', 6), next: 's2end' },
    s2long: { text: 'Forty years. My mother was four. She still won\'t walk on the Knap road. I know you meant it kindly.', effect: (g) => g.compRapport('ottilie', -3), next: 's2end' },
    s2end: { text: 'Thank you for bringing me. I\'ve never said it out loud on the crystal before. It\'s colder than I thought.', effect: (g) => { g.setFlag('comp:ottilie:part', 2); g.compStory('ottilie', 2); } },
    s3hook: { text: 'Sela Orme knows the floor is rising. I\'d stake my line on it. I want to ask her straight, at the Kirk, and I want you there when I do.', effect: (g) => g.setFlag('comp:ottilie:s3', 1), next: 'menu' },
    s3a: { text: 'Sela Orme hears Ottilie out at the edge of the crystal, and doesn\'t argue. She takes a book from under the altar: forty years of chalk marks from the pillar, copied out in a careful hand, each a little higher than the last.', speaker: 'narrator', next: 's3b' },
    s3b: {
      text: 'She\'s known. She\'s measured it herself every Lady Day since she came, and she tells the pilgrims the warmth in the floor is a blessing. Forty years. Two feet. And she told the Charter it was the same as ever.',
      options: [
        { text: 'Nail the readings to the Kirk door. The pilgrims deserve to know.', next: 's3door' },
        { text: 'Take them to the Charter quietly. Let the Kirk keep its pilgrims a while longer.', next: 's3quiet' },
        { text: 'It\'s risen for forty years and nobody\'s been hurt. Let Sela be.', next: 's3let' },
      ],
    },
    s3door: { text: 'And the Charter will send surveyors, and they\'ll close the floor, and Sela will hate me for the rest of her life. Yes. The door. Pass me a nail.', effect: (g) => { g.compRapport('ottilie', 12); g.setFlag('comp:ottilie:end', 'door'); }, next: 's3end' },
    s3quiet: { text: 'Quietly. The office will take a year to read it and another to believe it. But it\'ll move. Things that get written down move, eventually.', effect: (g) => { g.compRapport('ottilie', 5); g.setFlag('comp:ottilie:end', 'quiet'); }, next: 's3end' },
    s3let: { text: 'Nobody\'s been hurt yet. That\'s exactly what they said at Gallows Knap, right up to the morning.', effect: (g) => { g.compRapport('ottilie', -12); g.setFlag('comp:ottilie:end', 'let'); }, next: 's3letend' },
    s3letend: { text: (g) => (R(g, 'ottilie') < 10 ? 'I can\'t work with someone who\'d look at those numbers and shrug. I\'m sorry. I\'ll take them to the Charter myself.' : 'I\'m going to pretend you didn\'t say that. I\'m good at pretending, it turns out. Come on.'), effect: (g) => { if (R(g, 'ottilie') < 10) g.compLeave('ottilie'); else { g.setFlag('comp:ottilie:part', 3); g.compStory('ottilie', 3); } } },
    s3end: {
      text: 'Well. That\'s my career at the survey office finished. I\'ve never felt better.',
      effect: (g) => { g.setFlag('comp:ottilie:part', 3); g.compStory('ottilie', 3); },
      next: 's3love',
    },
    s3love: {
      text: (g) => (canLove(g, 'ottilie') ? 'Can I tell you something I haven\'t measured? I like you. A great deal. I\'ve tried to be scientific about it and failed completely, which has never happened to me before.' : 'Shall we? There\'s a crystal at the Kettle nobody\'s measured since the flood.'),
      options: [
        { text: 'I like you too, Ottilie. A great deal.', cond: (g) => canLove(g, 'ottilie'), effect: (g) => { g.setFlag('comp:ottilie:romanceAsked', 1); g.setFlag('comp:ottilie:partner', 1); g.compRapport('ottilie', 10); }, next: 'loveyes' },
        { text: 'I\'m sorry. Not like that.', cond: (g) => canLove(g, 'ottilie'), effect: (g) => g.setFlag('comp:ottilie:romanceAsked', 1), next: 'loveno' },
        { text: 'Lead on.', cond: (g) => !canLove(g, 'ottilie') },
      ],
    },
    loveyes: { text: 'Oh. Oh, good. I had a whole speech for if you said no, and nothing at all for this. Hold my hand, then. For balance. It\'s icy.' },
    loveno: { text: 'That\'s all right. It\'s a good result even if it isn\'t the one I wanted. I\'m used to those.' },
    f1: { text: 'I know. I put it there to see if you\'d notice. You noticed.', effect: (g) => { g.setFlag('comp:ottilie:flirt', 1); g.compRapport('ottilie', 2); }, next: 'menu' },
    f2: { text: 'Five foot. No. I\'m not doing this. Yes, I am. Hold still. Stop smiling, it changes the reading.', effect: (g) => { g.setFlag('comp:ottilie:flirt', 2); g.compRapport('ottilie', 2); }, next: 'menu' },
    f3: { text: 'Careful. I write everything down.', effect: (g) => { g.setFlag('comp:ottilie:flirt', 3); g.compRapport('ottilie', 1); }, next: 'menu' },
    love: { text: (g) => (night(g) ? 'The stars are out. All of them exactly where they should be. So are you.' : 'Hello. I\'ve missed you. You were gone four minutes.'), next: 'menu' },
    ...outfitNodes('ottilie'),
  },
};

// ==================================================================== Tam Reddick
const tam: DialogueTree = {
  start: (g) => (g.flag('comp:tam:gone') ? 'gone' : joined(g, 'tam') ? 'menu' : 'meet'),
  nodes: {
    gone: { text: 'Tam Reddick isn\'t on the quay any more. A fisherman says the Kittiwake took him off one night, and nobody\'s asked after him since.', speaker: 'narrator' },
    meet: { text: 'A young man in a red waistcoat moves three cups on an upturned barrel. Two fishermen watch, their money on the barrelhead. He catches your eye.', speaker: 'narrator', next: 'meet2' },
    meet2: {
      text: 'Find the pea, friend? Two marks gets you four. Your eye\'s as good as theirs. Better, by the look of you.',
      effect: (g) => g.setFlag('comp:tam:met', 1),
      options: [
        { text: '(Watch his hands) It isn\'t under any of them. It\'s in your left hand.', next: 'called' },
        { text: '(Play along and lose two marks)', cond: (g) => g.marks >= 2, next: 'played' },
        { text: '(Walk away)' },
      ],
    },
    called: { text: 'The fishermen look at him. He looks at you, and grins, and gives them back every penny. Then he turns to you.', speaker: 'narrator', effect: (g) => g.compRapport('tam', -2), next: 'called2' },
    called2: { text: 'Well, that\'s my afternoon ruined. Tam Reddick. You\'ve good eyes. Fancy keeping them on me? There\'s a man from the Keys wants a word, and I\'d like to have it standing behind someone large.', next: 'offer' },
    played: { text: 'He takes your two marks with a flourish. Unlucky! You saw, didn\'t you. You saw, and you paid anyway. Who does that?', effect: (g) => { g.addMarks(-2); g.compRapport('tam', 5); }, next: 'offer' },
    offer: {
      text: 'I\'m good company, I can swing a cutlass, and I know every back way out of every inn from here to the Waystation. Take me with you?',
      options: [
        { text: 'Come on, then.', next: 'join' },
        { text: 'Who\'s the man from the Keys?', next: 'keys' },
        { text: 'Not today.' },
      ],
    },
    keys: { text: 'Two summers ago I played cards on the Kittiwake, a Brethren boat out of Saltpenny Key, and I won. You don\'t win on a Brethren boat. They say I owe them three hundred marks for the lesson. So. Are we going?', options: [{ text: 'We\'re going.', next: 'join' }, { text: 'Not today.' }] },
    join: { text: 'You won\'t regret it. You\'ll regret some of it. The good bits.', effect: (g) => { g.setFlag('comp:tam:joined', 1); g.setFlag('comp:tam:part', 1); g.compJoin('tam'); } },
    hello: { text: 'Missed me? Course you did.' },
    bye: { text: 'I\'ll be on the quay, relieving fishermen of the burden of money.' },
    menu: {
      text: (g) => (partner(g, 'tam') ? 'There\'s my favourite person. Don\'t tell anyone, they\'ll want to be it.' : R(g, 'tam') >= 40 ? 'What can I do you for?' : 'Yes, boss?'),
      options: [
        { text: 'How are you doing?', next: 'mood' },
        { text: 'Teach me a card trick.', next: 'trick' },
        { text: 'The man from the Keys. When is he coming?', cond: (g) => part(g, 'tam') === 1 && R(g, 'tam') >= STORY_AT[1] && !g.flag('comp:tam:s2'), next: 's2hook' },
        { text: 'We\'re on the quay, and it\'s dark.', cond: (g) => !!g.flag('comp:tam:s2') && part(g, 'tam') === 1 && active(g, 'tam') && g.compNear(1740, 600, 35) && night(g), next: 's2a' },
        { text: 'You\'ve been quiet. What is it?', cond: (g) => part(g, 'tam') === 2 && R(g, 'tam') >= STORY_AT[2] && !g.flag('comp:tam:s3'), next: 's3hook' },
        { text: 'We\'re on the quay. Got your list?', cond: (g) => !!g.flag('comp:tam:s3') && part(g, 'tam') === 2 && active(g, 'tam') && g.compNear(1740, 600, 35) && !night(g), next: 's3a' },
        { text: '(Flirt) Teach me a trick. A good one.', cond: (g) => !partner(g, 'tam') && R(g, 'tam') >= 25 && flirts(g, 'tam') === 0, next: 'f1' },
        { text: '(Flirt) Buy you a drink?', cond: (g) => !partner(g, 'tam') && R(g, 'tam') >= 25 && flirts(g, 'tam') === 1, next: 'f2' },
        { text: '(Flirt) You\'re better company than you let on.', cond: (g) => !partner(g, 'tam') && R(g, 'tam') >= 25 && flirts(g, 'tam') >= 2, next: 'f3' },
        { text: '(Romance) Come here, you rogue.', cond: (g) => partner(g, 'tam'), next: 'love' },
        ...common('tam'),
        { text: 'Nothing. Let\'s go.' },
      ],
    },
    mood: { text: (g) => (R(g, 'tam') >= 50 ? 'Honestly? Good. I\'m worried about it. Nothing\'s ever this good for this long without a catch.' : R(g, 'tam') >= 15 ? 'Not bad. Nobody\'s tried to drown me in a week.' : R(g, 'tam') >= 0 ? 'Grand. Skint, but grand.' : 'Me? Fine. You\'re the one with the face on.'), next: 'menu' },
    trick: { text: 'First rule: never look at the hand that\'s moving. Look at the eyes. The eyes always look where the pea is. Second rule: never teach anybody the first rule. Ah.', next: 'menu' },
    s2hook: { text: 'Soon. He\'ll come to Gullmouth after dark; they always do, it\'s a Brethren thing, they think it\'s dramatic. It is dramatic. Be on the quay with me, at night.', effect: (g) => g.setFlag('comp:tam:s2', 1), next: 'menu' },
    s2a: { text: 'A thin man in a good coat waits at the end of the jetty, two more behind him. He doesn\'t look at you; he looks at Tam. "Three hundred, Reddick. Or the Kittiwake takes it out of you, a mark at a time."', speaker: 'narrator', next: 's2b' },
    s2b: {
      text: 'Hesk. Nice coat, Hesk. So this is the man from the Keys.',
      options: [
        { text: '(Pay 300 marks) Here. He owes you nothing now.', cond: (g) => g.marks >= 300, next: 's2pay' },
        { text: 'He won fairly. If you want it, come and take it.', next: 's2face' },
        { text: 'Take him. He\'s nothing to me.', next: 's2sell' },
      ],
    },
    s2pay: { text: 'You did what? Why? I\'d have run. I always run. I\'ll pay you back. Every mark. Probably most of them.', effect: (g) => { g.addMarks(-300); g.compRapport('tam', 15); g.setFlag('comp:tam:debt', 'paid'); }, next: 's2end' },
    s2face: { text: 'Hesk weighs you up for a long moment. Then he shrugs, and walks back down the jetty to his boat. "Another time, Reddick." Tam lets out a breath he must have been holding since summer.', speaker: 'narrator', effect: (g) => { g.compRapport('tam', 10); g.setFlag('comp:tam:debt', 'faced'); }, next: 's2face2' },
    s2face2: { text: 'I\'ve never seen anyone call the Brethren on their own jetty. I\'d like to see it again. From much further away.', next: 's2end' },
    s2sell: { text: 'Tam looks at you, and something in his face shuts like a door. "Right. Course. Course you would." Hesk\'s men take him by the arms, and he goes without a word.', speaker: 'narrator', effect: (g) => { g.compRapport('tam', -80); g.compLeave('tam'); } },
    s2end: { text: 'Drink? I\'m buying. With your money, if you paid. Mine, if you didn\'t. Either way, I\'m buying.', effect: (g) => { g.setFlag('comp:tam:part', 2); g.compStory('tam', 2); } },
    s3hook: { text: 'I\'ve been thinking. Dangerous, I know. Every fisherman on that quay has lost money to me, and every one of them knew, and played anyway because it was something to do. I\'ve a list. I want to pay them back. In daylight, so they see it. Come with me?', effect: (g) => g.setFlag('comp:tam:s3', 1), next: 'menu' },
    s3a: { text: 'Tam goes from boat to boat with his list and a purse. Some of the fishermen laugh. One of them, very old, shakes his hand and won\'t let go of it for a long while.', speaker: 'narrator', next: 's3b' },
    s3b: {
      text: 'Forty-one marks short. Wouldn\'t you know it. Forty-one.',
      options: [
        { text: '(Give 100 marks) Here. Finish it.', cond: (g) => g.marks >= 100, next: 's3give' },
        { text: 'I\'m proud of you, Tam.', next: 's3proud' },
        { text: 'You\'ll be skint by Sunday.', next: 's3skint' },
      ],
    },
    s3give: { text: 'You\'re making a habit of rescuing me. I\'m going to have to start being worth it.', effect: (g) => { g.addMarks(-100); g.compRapport('tam', 12); }, next: 's3end' },
    s3proud: { text: 'Don\'t. No, do. Nobody\'s said that to me since I was nine. It was about a knot.', effect: (g) => g.compRapport('tam', 8), next: 's3end' },
    s3skint: { text: 'I\'ve been skint every Sunday since I was nine. This time I\'ll be skint and honest. Never tried that. Might be fun.', effect: (g) => g.compRapport('tam', 3), next: 's3end' },
    s3end: { text: 'There. Clean hands. Feels strange. Like a coat that fits.', effect: (g) => { g.setFlag('comp:tam:part', 3); g.compStory('tam', 3); }, next: 's3love' },
    s3love: {
      text: (g) => (canLove(g, 'tam') ? 'So. I\'ve folded every hand I ever cared about. Not this one. I\'m all in. On you. ...Say something before I take it back and make a joke about it.' : 'Right. Where next? Somewhere with cards. Honest cards. Mostly honest.'),
      options: [
        { text: 'All in, Tam.', cond: (g) => canLove(g, 'tam'), effect: (g) => { g.setFlag('comp:tam:romanceAsked', 1); g.setFlag('comp:tam:partner', 1); g.compRapport('tam', 10); }, next: 'loveyes' },
        { text: 'I\'m sorry, Tam. Not like that.', cond: (g) => canLove(g, 'tam'), effect: (g) => g.setFlag('comp:tam:romanceAsked', 1), next: 'loveno' },
        { text: 'Somewhere with cards.', cond: (g) => !canLove(g, 'tam') },
      ],
    },
    loveyes: { text: 'Oh, thank God. I had no idea what my face was going to do if you said no. It\'s doing this. Apparently it does this.' },
    loveno: { text: 'Ha. Well. Good hand, wrong table. No harm done. Some harm done. I\'ll live. Drink?' },
    f1: { text: 'First trick: never look at the hand that\'s moving. Look at me. That\'s it. Keep doing that.', effect: (g) => { g.setFlag('comp:tam:flirt', 1); g.compRapport('tam', 2); }, next: 'menu' },
    f2: { text: 'You buy, I\'ll lose the change. It\'s the most romantic thing I know how to do.', effect: (g) => { g.setFlag('comp:tam:flirt', 2); g.compRapport('tam', 2); }, next: 'menu' },
    f3: { text: 'Careful. I might stop cheating.', effect: (g) => { g.setFlag('comp:tam:flirt', 3); g.compRapport('tam', 1); }, next: 'menu' },
    love: { text: (g) => (night(g) ? 'Stars, a quay, and you. If I\'d known honest life came with this, I\'d have tried it years ago.' : 'In broad daylight? Scandalous. Do it again.'), next: 'menu' },
    ...outfitNodes('tam'),
  },
};

const TREES: Record<CompanionId, DialogueTree> = { wenna, ottilie, tam };

export const COMPANION_CONTENT: RegionContent = {
  id: 'companions',
  // Each waits at home until they join you, and whenever you send them back
  npcs: (Object.keys(COMPANIONS) as CompanionId[]).map((id): NpcDef => {
    const c = COMPANIONS[id];
    return {
      id: 'comp_' + id, name: c.name, title: c.title, look: c.look,
      schedule: [{ from: 0, to: 24, at: c.home.at, face: c.home.face, anim: 'idle' }],
      barks: [],
      // (not when they've gone for good: Tam taken off the quay, or anyone who died in the main story)
      when: (g) => g.compActive() !== id && !(id === 'tam' && g.flag('comp:tam:gone')) && !g.flag(`comp:${id}:dead`),
    };
  }),
  dialogue: Object.fromEntries((Object.keys(TREES) as CompanionId[]).map((id) => ['comp_' + id, TREES[id]])),
};
export { TREES as COMPANION_TREES };
