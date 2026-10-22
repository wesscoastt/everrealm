import type { DialogueTree, GameApi } from '../game/api';
import { ITEMS } from './items';
import { applyStoryHooks, STORY_READABLES, tollBoard } from './story';

// All written content for Hollindale's speaking characters.
// Voice notes live in docs/NARRATIVE_STYLE.md; facts in docs/LORE.md.

const Q = 'fordBell';
const st = (g: GameApi) => g.stage(Q);
const choice = (g: GameApi) => g.flag('bellChoice') as string | undefined;
const midQuest = (g: GameApi) => ['askBram', 'gather', 'smelt', 'deliver'].includes(st(g) ?? '');

/** Hand the bars over and start the pour. */
function handOver(g: GameApi, c: string): void {
  g.take('bronze_bar', 3);
  if (!g.flag('bellChoice')) g.setFlag('bellChoice', c);
  g.setStage(Q, 'casting');
  g.startCasting();
}

function finishBell(g: GameApi, marks: number): void {
  g.addMarks(marks);
  g.setStage(Q, 'done');
}

/** An Exchange broker: first meeting, the book, and how it works. */
function broker(flag: string, first: string, again: string): DialogueTree {
  return {
    start: () => 'main',
    nodes: {
      main: {
        text: (g) => (g.flag(flag) ? again : first),
        effect: (g) => g.setFlag(flag),
        options: [
          { text: 'Show me the book.', effect: (g) => g.openExchange() },
          { text: 'How does the Exchange work?', next: 'how' },
          { text: 'Bye.' },
        ],
      },
      how: { text: 'Post a stack at your price and it leaves your pack. When it sells, the marks wait in the book for you.', next: 'how2' },
      how2: { text: 'The Exchange keeps a mark in every twenty. Take a stack down whenever you like.', next: 'how3' },
      how3: { text: 'If nobody buys it in three days, it comes back to you by itself.', next: 'how4' },
      how4: { text: 'Every broker reads the same book. Post it here and someone in Gullmouth or at the Works can buy it.', next: 'main' },
    },
  };
}

export const DIALOGUE: Record<string, DialogueTree> = {
  // ---------------------------------------------------------------- The Exchange's brokers
  wray: broker('wrayMet', 'Gideon Wray, for the Exchange. The guilds keep one book for the whole of the counties, and I read it to anyone who asks.', 'The book\'s open.'),
  tregear: broker('tregearMet', 'Morwenna Tregear. I keep the Exchange\'s book for the harbour. Same book as Ansbury\'s: post it here, sell it there.', 'What are we selling?'),
  pound: broker('poundMet', 'Silas Pound. The Company lends me this end of the counter. It\'s the same book as Ansbury\'s, whatever the Company tells you.', 'Buying or selling?'),

  // ---------------------------------------------------------------- Maud Ashby, reeve
  maud: {
    start: (g) => {
      const s = st(g);
      if (!s) return g.flag('maudMet') ? 'reintro' : 'intro';
      if (s === 'askBram') return 'askBram';
      if (s === 'gather' || s === 'smelt' || s === 'deliver') return 'progress';
      if (s === 'casting') return 'casting';
      if (s === 'report') {
        const c = choice(g);
        if (c === 'confess') return 'r_confess';
        if (c === 'report') return 'r_report';
        if (c === 'cover' || c === 'silent') return 'r_cover';
        return 'r_unaware';
      }
      return 'after';
    },
    nodes: {
      intro: {
        text: 'Mind the frame. The pegs are loose, and I\'m not paying for anybody\'s foot.',
        effect: (g) => g.setFlag('maudMet'),
        options: [
          { text: 'What\'s the frame for?', next: 'bell1' },
          { text: 'Who are you?', next: 'who' },
          { text: 'Just passing.' },
        ],
      },
      reintro: {
        text: 'Back again. The gauge hasn\'t gone down, if that\'s what you were hoping.',
        options: [
          { text: 'Tell me about the bell.', next: 'bell1' },
          { text: 'Just passing.' },
        ],
      },
      who: {
        text: 'Maud Ashby. Reeve. Which means when something goes wrong in Hollin Ford, people come and stand where you\'re standing.',
        options: [
          { text: 'What\'s gone wrong?', next: 'bell1' },
          { text: 'I\'ll leave you to it.' },
        ],
      },
      bell1: {
        text: 'It\'s the Ford Bell\'s frame. The bell itself is at Bram Tolley\'s smithy. It has been since April.',
        options: [{ text: 'Why is it at the smithy?', next: 'bell2' }],
      },
      bell2: {
        text: 'Cracked in the thaw. Bram took it to recast. Every week since midsummer it\'s the mould sweating, or the clay, or the wind\'s in the east.',
        next: 'gauge',
      },
      gauge: {
        text: 'See the gauge by the bridge? Four fingers this morning. Two on market day. At six the Wetlings go under, and somebody rings that bell.',
        options: [
          { text: 'I could go and ask Bram.', next: 'accept' },
          { text: 'Can\'t you ring something else?', next: 'pan' },
          { text: 'Not my business.', next: 'decline' },
        ],
      },
      pan: {
        text: 'We tried a pan. You can\'t hear a pan over the weir. The Ashcrofts lost two heifers finding that out.',
        options: [
          { text: 'I\'ll go and ask Bram.', next: 'accept' },
          { text: 'Not my business.', next: 'decline' },
        ],
      },
      accept: {
        text: 'He won\'t give me a straight answer. He might give one to a stranger, if only to get you out of his smithy. Across the bridge, on the left.',
        effect: (g) => g.setStage(Q, 'askBram'),
        next: 'accept2',
      },
      accept2: { text: 'If he tells you it\'s the mould, ask him which part.' },
      decline: { text: 'Fair enough. Most people\'s problems aren\'t.' },
      askBram: {
        text: 'Well? Has he got it?',
        options: [
          { text: 'I haven\'t spoken to him yet.', next: 'go' },
          { text: 'I read Bram\'s ledger.', next: 'tell1', cond: (g) => !!g.flag('ledgerRead') && !choice(g) },
        ],
      },
      go: { text: 'The smithy\'s not going anywhere. Neither is he, most days.' },
      progress: {
        text: 'You\'ve got ore dust on your sleeves. Bram has you mining for him?',
        options: [
          { text: 'He says he\'s short of metal.', next: 'short' },
          { text: 'I read Bram\'s ledger.', next: 'tell1', cond: (g) => !!g.flag('ledgerRead') && !choice(g) },
          { text: 'Still working on it.' },
        ],
      },
      short: { text: 'Short. He had a whole bell.', next: 'short2' },
      short2: { speaker: 'narrator', text: 'She looks at the empty frame for a while.', next: 'short3' },
      short3: { text: 'Carry on, then. And ask him where the old one went, while you\'re at it.' },
      tell1: {
        text: 'Go on.',
        options: [{ text: 'He sold the cracked bell to the Pit\'s buyer. Thirty-one marks.', next: 'tell2', effect: (g) => g.setFlag('bellChoice', 'report') }],
      },
      tell2: { speaker: 'narrator', text: 'Maud doesn\'t say anything. She takes a pencil from behind her ear and writes something on the back of her hand.', next: 'tell3' },
      tell3: { text: 'Thirty-one. And he\'s eight short on his rent. Right. I\'ll have it out of him. You finish what you started. I still need a bell.' },
      casting: {
        text: 'There\'s smoke coming off that forge like a barn fire. Is that my bell?',
        options: [{ text: 'Bram\'s pouring it now.', next: 'casting2' }],
      },
      casting2: { text: 'I\'ll believe it when I hear it.' },
      r_unaware: {
        text: 'Heard it from the reeve\'s house. It sounds better than the old one, which is annoying, because I liked the old one.',
        next: 'r_pay',
      },
      r_pay: {
        text: 'Here. It\'s from the moot purse, so don\'t spend it on anything I\'d disapprove of.',
        effect: (g) => finishBell(g, 50),
      },
      r_cover: {
        text: 'Heard it from my kitchen. Bram says the trouble was the clay all along. Is that what he told you?',
        options: [
          { text: 'That\'s what he told me.', next: 'r_cover2' },
          { text: 'No. He sold the old bell to the Pit\'s buyer.', next: 'r_late', effect: (g) => g.setFlag('bellChoice', 'report') },
        ],
      },
      r_cover2: { text: 'Hm.', next: 'r_pay' },
      r_late: { text: 'And you let me hang it first.', next: 'r_late2' },
      r_late2: { speaker: 'narrator', text: 'She doesn\'t sound angry. She sounds tired.', next: 'r_late3' },
      r_late3: {
        text: 'Well. It\'s up, and he can pay me back for the metal a mark a week. Here, for your trouble.',
        effect: (g) => finishBell(g, 40),
      },
      r_confess: {
        text: 'He came over with soot to his elbows and told me the whole of it. Stood in my kitchen like a boy who\'d put a ball through a window.',
        next: 'r_confess2',
      },
      r_confess2: {
        text: 'I\'ve fined him what Pryce paid him. He can work it off in hinges for the moot hall. You could have just told me yourself.',
        options: [
          { text: 'He needed to say it.', next: 'r_confess3' },
          { text: 'You\'re right. I should have.', next: 'r_confess4' },
        ],
      },
      r_confess3: { text: 'Maybe. It would have saved me a month of excuses either way. Here.', effect: (g) => finishBell(g, 40) },
      r_confess4: { text: 'Well. It\'s done now. Here.', effect: (g) => finishBell(g, 40) },
      r_report: {
        text: 'Rang it myself this morning. Pryce\'s thirty-one marks are coming out of Bram a mark a week.',
        next: 'r_report2',
      },
      r_report2: {
        text: 'You did right telling me. I won\'t pretend it was pleasant to hear. Here.',
        effect: (g) => finishBell(g, 60),
      },
      after: {
        text: (g) => choice(g) === 'confess'
          ? 'Bram\'s hung the first of my hinges. Crooked. I think he did it on purpose.'
          : 'Gauge is at five. The Ashcrofts heard the bell at dawn and had the cows up before breakfast.',
        options: [
          { text: 'Anything else need doing?', next: 'after2' },
          { text: 'Goodbye.' },
        ],
      },
      after2: { text: 'Ask me after the rains.' },
    },
  },

  // ---------------------------------------------------------------- Bram Tolley, smith
  bram: {
    start: (g) => {
      const s = st(g);
      if (!s) return 'idle';
      if (s === 'askBram') return 'b_bell';
      if (s === 'gather' || s === 'smelt') return 'progress';
      if (s === 'deliver') {
        if (g.count('bronze_bar') < 3) return 'progress';
        return choice(g) === 'report' ? 'cold' : 'ready';
      }
      if (s === 'casting') return 'cast';
      const c = choice(g);
      if ((c === 'cover' || c === 'confess') && !g.flag('tolleyPickGiven')) return 'gift';
      if ((c === 'unaware' || c === 'silent') && !g.flag('bramPaid')) return 'pay';
      return c === 'report' ? 'after_cold' : 'after';
    },
    nodes: {
      idle: {
        text: 'If it\'s a horseshoe, I\'m three days out. If it\'s a blade, four.',
        options: [
          { text: 'Just looking.', next: 'idle2' },
          { text: 'Can I use your forge?', next: 'forge' },
        ],
      },
      idle2: { text: 'Look from over there, then. Sparks.' },
      forge: { text: 'Furnace and anvil are there for anyone who doesn\'t waste my fuel. Don\'t touch the ledger.' },
      b_bell: { speaker: 'narrator', text: 'Bram doesn\'t look up from the anvil.', next: 'b_bell1' },
      b_bell1: {
        text: 'Maud sent you. The mould\'s sweating. Pour bronze into a damp mould and you get a bell full of holes. Sounds like a goat.',
        options: [
          { text: 'Which part of the mould?', next: 'which' },
          { text: 'How long until it\'s done?', next: 'howlong' },
        ],
      },
      which: { text: 'The cope. The outside bit. It\'s clay, and clay holds water, and when you—', next: 'which2' },
      which2: { speaker: 'narrator', text: 'He puts the hammer down.', next: 'which3' },
      which3: { text: 'It\'s not the mould. I\'m short of metal.', next: 'short' },
      howlong: { text: 'Depends on the metal. I\'m short.', next: 'short' },
      short: {
        text: 'A bell that size wants three bronze bars. Harrowgate\'s lot buy every scrap of ore out of the Pit. Can\'t get any for love or money. Mostly money.',
        options: [
          { text: 'I\'ll mine it for you.', next: 'offer' },
          { text: 'What happened to the old bell\'s metal?', next: 'where' },
        ],
      },
      where: { text: 'Cracked bronze is no good to anyone.', next: 'where2' },
      where2: { speaker: 'narrator', text: 'That isn\'t an answer, and he looks like he knows it.', next: 'where3' },
      where3: {
        text: 'Are you mining or not?',
        options: [
          { text: 'I\'ll mine it.', next: 'offer' },
          { text: 'Not right now.', next: 'later' },
        ],
      },
      later: { text: 'Then Maud can keep sending people.' },
      offer: { text: 'Would you.', next: 'offer1' },
      offer1: { speaker: 'narrator', text: 'It isn\'t quite a question.', next: 'offer2', effect: (g) => g.setStage(Q, 'gather') },
      offer2: {
        text: 'Hesk lets folk chip at the Pit\'s upper gallery if they keep clear of his carts. Three copper, three tin. Smelt them, bring me bars. I\'ll pour.',
        options: [
          { text: 'I don\'t have a pickaxe.', next: 'pick', cond: (g) => !g.hasTool('mining') },
          { text: 'Anything I should know?', next: 'rust', cond: (g) => g.hasTool('mining') },
        ],
      },
      pick: {
        text: 'Take my spare. The handle\'s been replaced twice and the head once, so I suppose it\'s somebody else\'s pick by now.',
        effect: (g) => { g.give('worn_pickaxe'); },
        next: 'rust',
      },
      rust: { text: 'Watch for rustbacks down there. They go for anything metal, and that includes my pick.' },
      progress: {
        text: (g) => {
          const s = st(g);
          if (s === 'gather') return 'Three copper, three tin. Then the furnace. Then me.';
          if (s === 'smelt') return 'Furnace is hot. One copper and one tin to a bar.';
          return 'Three bars. You\'ve got fewer than three.';
        },
        options: [
          { text: 'Where did the old bell go?', next: 'deflect', cond: (g) => !g.flag('ledgerRead') },
          { text: 'I saw your ledger.', next: 'notyet', cond: (g) => !!g.flag('ledgerRead') && choice(g) !== 'report' },
          { text: 'How does the furnace work?', next: 'howfurnace' },
          { text: 'Back to it.' },
        ],
      },
      deflect: { text: 'You ask a lot of questions for someone doing me a favour.' },
      notyet: { text: 'Bring me the bars first. Then say whatever you\'ve got to say.' },
      howfurnace: { text: 'Stand at it and pick what you\'re making. It\'s a furnace, not a riddle.' },
      ready: { text: 'Let\'s see them.', next: 'ready2' },
      ready2: { speaker: 'narrator', text: 'He turns a bar over and squints along the edge.', next: 'ready3' },
      ready3: {
        text: 'Clean. Nance\'s first ones looked like porridge.',
        options: [
          { text: 'Here. Make the bell.', next: 'handed', effect: (g) => handOver(g, g.flag('ledgerRead') ? 'silent' : 'unaware') },
          { text: 'Your ledger says you sold the old bell to Pryce for thirty-one marks.', next: 'c1', cond: (g) => !!g.flag('ledgerRead') },
        ],
      },
      handed: { text: 'Right. Nance! Bellows.' },
      c1: { speaker: 'narrator', text: 'Bram sets the bar down on the anvil very carefully, as if it might go off.', next: 'c2' },
      c2: { text: 'Charcoal was four marks a sack before the Pit. Now it\'s nine: their smelter burns it faster than anyone can make it. My rent didn\'t drop.', next: 'c3' },
      c3: {
        text: 'A cracked bell in my yard, worth more than my season. Pryce asked. I said yes. I\'d make it good next month. There wasn\'t one.',
        options: [
          { text: 'It stays between us. Make the bell.', next: 'cover', effect: (g) => handOver(g, 'cover') },
          { text: 'Tell Maud yourself, or I will.', next: 'confess', effect: (g) => handOver(g, 'confess') },
          { text: 'Why should I keep quiet for you?', next: 'why' },
        ],
      },
      why: {
        text: 'You shouldn\'t. I\'m asking anyway.',
        options: [
          { text: 'It stays between us. Make the bell.', next: 'cover', effect: (g) => handOver(g, 'cover') },
          { text: 'Tell Maud yourself, or I will.', next: 'confess', effect: (g) => handOver(g, 'confess') },
          { text: 'I\'ll decide later. Take the bars.', next: 'decide', effect: (g) => handOver(g, 'silent') },
        ],
      },
      decide: { text: 'Fair. Decide on your own time. Nance! Bellows.' },
      cover: { text: 'Right.', next: 'cover2' },
      cover2: { speaker: 'narrator', text: 'He doesn\'t thank you. He holds on to the first bar a little too long before he takes the rest.', next: 'cover3' },
      cover3: { text: 'I owe you. Don\'t think I don\'t know it. Nance! Bellows.' },
      confess: { text: 'She\'ll have the forge off me.', next: 'confess2' },
      confess2: { speaker: 'narrator', text: 'You wait.', next: 'confess3' },
      confess3: { text: 'Fine. After the pour. I\'m not walking over that bridge without a bell to show her.' },
      cold: { speaker: 'narrator', text: 'Bram doesn\'t look up.', next: 'cold2' },
      cold2: {
        text: 'Maud\'s been in. Pryce\'s thirty-one marks back to the moot, a mark a week. I\'ll be square with her about when I\'m dead. Give me the bars.',
        options: [{ text: 'Here.', next: 'cold3', effect: (g) => handOver(g, 'report') }],
      },
      cold3: { text: 'I\'ll pour it. Then we\'re square, you and me. That\'s all we are.' },
      cast: { text: 'Not now. Bronze doesn\'t wait for conversation.' },
      gift: {
        text: (g) => choice(g) === 'confess'
          ? 'Here. For keeping your mouth shut long enough for me to open mine.'
          : 'Here. You\'ll get more out of the Pit with this than with my spare.',
        next: 'gift2',
      },
      gift2: { speaker: 'narrator', text: 'He holds out his own pickaxe, handle first.', next: 'gift3' },
      gift3: {
        text: 'Keep it. Don\'t make a speech about it.',
        effect: (g) => { g.give('tolley_pick'); g.setFlag('tolleyPickGiven'); },
      },
      pay: {
        text: 'Here. For the ore. Don\'t tell Maud I paid you, she\'ll want to know where I got it.',
        effect: (g) => { g.addMarks(20); g.setFlag('bramPaid'); },
      },
      after: {
        text: 'Bell sounds right. I hit it with a hammer when nobody was looking, to check.',
        options: [
          { text: 'Can I use your forge?', next: 'forge' },
          { text: 'Bye.' },
        ],
      },
      after_cold: { text: 'Anvil\'s there if you need it. I\'m busy.' },
    },
  },

  // ---------------------------------------------------------------- Nance Tolley, apprentice
  wren: {
    start: () => 'main',
    nodes: {
      main: {
        text: (g) => {
          const s = st(g);
          const c = choice(g);
          if (s === 'casting') return 'He\'s actually smiling. Don\'t look straight at him, he\'ll stop.';
          if (s === 'report' || s === 'done') {
            if (c === 'report') return 'You told Maud. He\'s not talking to anyone. Don\'t take it personally. Well. Take it a bit personally.';
            if (c === 'cover') return 'He\'s been nicer since you brought the bars. It\'s weird. What did you say to him?';
            if (c === 'confess') return 'He went over to Maud\'s covered in soot, came back an hour later, and hasn\'t said a word. I think that\'s good?';
          }
          return 'If you want Uncle Bram, he\'s the one hitting things. I\'m the one keeping the fire going, which nobody notices until it goes out.';
        },
        options: [
          { text: 'What\'s it like working here?', next: 'work' },
          { text: 'Is something going on with the bell?', next: 'bell', cond: (g) => midQuest(g) && !g.flag('ledgerRead') },
          { text: 'Know anywhere worth exploring?', next: 'lantern' },
          { text: 'I found this up the Lantern.', next: 'whistle', cond: (g) => g.has('wren_whistle') && !g.flag('whistleShown') },
          { text: 'Bye.' },
        ],
      },
      work: { text: 'Loud. He lets me do hinges now. Last week I did one so good he said "hm" at it.' },
      bell: { speaker: 'narrator', text: 'She glances at the workbench, then at Bram, then back at you.', next: 'bell2' },
      bell2: {
        text: 'He\'s not— look. Just don\'t touch the ledger. It\'s on the bench, under the tongs. Don\'t touch it.',
        effect: (g) => g.setFlag('wrenHint'),
      },
      lantern: { text: 'The Lantern, up on the south ridge. I used to hide things up there when I was little.', next: 'lantern2', effect: (g) => g.setFlag('heardLantern') },
      lantern2: { speaker: 'narrator', text: 'She goes red.', next: 'lantern3' },
      lantern3: { text: 'Don\'t go looking. It\'s all rubbish.' },
      whistle: { text: 'Oh no.', next: 'whistle2' },
      whistle2: { speaker: 'narrator', text: 'She stares at the whistle as if it might bite.', next: 'whistle3' },
      whistle3: {
        text: 'I told you not to go looking.',
        options: [{ text: 'Do you want it back?', next: 'whistle4' }],
      },
      whistle4: { text: 'Yes. No. Keep it. No—', next: 'whistle5' },
      whistle5: { speaker: 'narrator', text: 'She takes it, blows one shrill note that makes Bram drop his tongs, and hands it back.', next: 'whistle6' },
      whistle6: {
        text: 'Keep it. It\'s embarrassing either way, but this way it\'s your embarrassment.',
        effect: (g) => g.setFlag('whistleShown'),
      },
    },
  },

  // ---------------------------------------------------------------- Pell Garrow, fisherman
  pell: {
    start: () => 'main',
    nodes: {
      main: {
        text: (g) => {
          if (!g.flag('pellMet')) return 'Mind the third board, it\'s soft. If you\'re after fish, there aren\'t any. If you\'re after conversation, there\'s less.';
          if (g.stage('pellTrout') === 'catch' && g.has('raw_trout')) return 'That a trout in your bag? Let\'s have a look, then.';
          return 'Still here? They\'re not biting. Never are, these days.';
        },
        effect: (g) => g.setFlag('pellMet'),
        options: [
          { text: 'No fish at all?', next: 'penny' },
          { text: 'Can you show me how to fish?', next: 'teach', cond: (g) => !g.hasTool('fishing') },
          { text: 'Where\'s the best fishing?', next: 'where' },
          { text: 'Any work going?', next: 'task', cond: (g) => !g.stage('pellTrout') },
          { text: 'Here\'s your trout.', next: 'done', cond: (g) => g.stage('pellTrout') === 'catch' && g.has('raw_trout') },
          { text: 'I caught a glass eel.', next: 'eel', cond: (g) => g.has('glass_eel') && !g.flag('eelShown') },
          { text: 'Your brother Sefton\'s home, then.', next: 'sefton', cond: (g) => g.flag('timberChoice') === 'send' && !g.flag('pellSefton') },
          { text: 'Bye.' },
        ],
      },
      sefton: { text: 'He is. Can\'t hear a word I say.', effect: (g) => g.setFlag('pellSefton'), next: 'sefton2' },
      sefton2: { speaker: 'narrator', text: 'Pell doesn\'t sound sorry about it.', next: 'sefton3' },
      sefton3: { text: 'Best company I\'ve had in years. He can\'t hear me, and I don\'t have to listen to him. We get on.' },
      penny: { text: 'Penny water. Since that lot opened the Pit, the Wend tastes like a mouthful of coins. Trout don\'t care for it. Neither do I.' },
      teach: { text: 'Show you? You put the hook in and you wait. Waiting\'s the bit people get wrong.', next: 'teach2' },
      teach2: {
        text: 'Here, have my old rod. Took me nine years to lose the last one, so look after it.',
        effect: (g) => { g.give('fishing_rod'); },
        next: 'teach3',
      },
      teach3: { text: 'Find the rings on the water where they\'re rising. Cast. Watch the float. When it goes under, pull. Not before, and not long after.' },
      where: { text: 'Pike under Spill Falls, if you can stand the noise. The youngsters say there\'s eels behind the falls. Glass eels, they reckon, that you can see through.', next: 'where2' },
      where2: { speaker: 'narrator', text: 'He snorts.', next: 'where3' },
      where3: { text: 'Seventy years on this river and I\'ve never seen one.' },
      task: {
        text: 'Bring me a brown trout and I\'ll believe the Wend\'s not dead. A proper one, mind. Not some minnow.',
        effect: (g) => g.setStage('pellTrout', 'catch'),
      },
      done: { speaker: 'narrator', text: 'Pell holds the trout up to the light and turns it over twice. Then he hands it back.', next: 'done2' },
      done2: {
        text: 'Hm. That\'ll do. River\'s not dead. Just sulking. Here, for your trouble.',
        effect: (g) => { g.addMarks(15); g.setStage('pellTrout', 'done'); },
      },
      eel: { speaker: 'narrator', text: 'Pell looks at the eel for a long time.', next: 'eel2' },
      eel2: { text: 'Well. Don\'t tell the youngsters.', effect: (g) => g.setFlag('eelShown') },
    },
  },

  // ---------------------------------------------------------------- Hesketh Dunmore, Pit foreman
  hesk: {
    start: () => 'main',
    nodes: {
      main: {
        text: (g) => (g.flag('heskMet') ? 'Back again. Mind the carts.' : 'You\'re not one of mine. Visiting, or after work?'),
        effect: (g) => g.setFlag('heskMet'),
        options: [
          { text: 'Can I mine here?', next: 'mine' },
          { text: 'What are rustbacks?', next: 'rust' },
          { text: 'The village says your runoff is fouling the Wend.', next: 'runoff' },
          { text: 'Know anything about Hollin Ford\'s bell?', next: 'bell', cond: (g) => midQuest(g) },
          { text: 'What\'s behind the boards in the chamber?', next: 'n4', cond: (g) => !g.flag('heskN4Done') },
          { text: 'I\'ve been down Number Four.', next: 'n4r', cond: (g) => !!g.flag('gdClears:gd-oldman') && !g.flag('heskN4Done') },
          { text: 'Bye.' },
        ],
      },
      // The Old Man's Workings (group dungeon, data/dungeons.ts)
      n4: { text: 'Number Four gallery. The roof came in at Candlemas and the company shut it. I boarded it up myself.', next: 'n4b' },
      n4b: { text: 'Since then I\'ve lost six lamps out of the lamp room, and the carts weigh light every fourthday. Somebody\'s working it at night.', options: [{ text: 'I could go down and look.', next: 'n4c' }, { text: 'Bye.' }] },
      n4c: { text: 'Not on your own, you couldn\'t. Take a crew of four. If you can\'t find anyone, I\'ve four regulars who\'ll go down anywhere for a day\'s rate.', next: 'n4d' },
      n4d: { text: 'Say the word at the boards and they\'ll be there. Osgood holds the front, Edith patches you up, Bet and Tom do the rest.', effect: (g) => g.setFlag('heskN4') },
      n4r: { text: 'And?', options: [{ text: 'Coll Bray was working it at night, with two others.', next: 'n4r2' }] },
      n4r2: { text: 'Coll. I let him go at Michaelmas for drinking on shift. He said he\'d be back for his wages.', next: 'n4r3' },
      n4r3: { speaker: 'narrator', text: 'He doesn\'t seem to think that was funny, then or now.', options: [{ text: 'He said something else was eating the seam.', next: 'n4r4' }] },
      n4r4: { text: 'Rustbacks eat copper. I knew that. I didn\'t know they\'d eat a seam.', next: 'n4r5' },
      n4r5: { speaker: 'narrator', text: 'He writes something in his tally book, crosses it out, and writes it again.', next: 'n4r6' },
      n4r6: {
        text: 'I\'ll tell the company Number Four\'s flooded. It very nearly is. Here: company issue. Don\'t tell the company.',
        effect: (g) => { g.setFlag('heskN4Done'); g.give('pitlamp_cap'); g.addMarks(40); },
      },
      mine: { text: 'Company pays by the cart. Whatever you chip off on your own time is yours. Just not out of my carts. The working\'s straight in and to the right.' },
      rust: { text: 'Beetles the size of a dog that eat metal. They\'ve had two lamps and a pump fitting off me this month. If one charges, step aside. They don\'t turn well.' },
      runoff: { text: 'The village is right.', next: 'runoff2' },
      runoff2: { speaker: 'narrator', text: 'He lets that sit.', next: 'runoff3' },
      runoff3: { text: 'I\'ve written to Harrowgate about settling ponds twice. They\'ve written back about output twice.' },
      bell: { text: 'Pryce does the buying. I dig. Though I did see a fair bit of bronze go out on the Ansbury cart in July.', next: 'bell2', effect: (g) => g.setFlag('heskHint') },
      bell2: { speaker: 'narrator', text: 'He shrugs.', next: 'bell3' },
      bell3: { text: 'We don\'t mine bronze.' },
    },
  },

  // ---------------------------------------------------------------- Tamsin Pargeter, trader
  tamsin: {
    start: () => 'main',
    nodes: {
      main: {
        text: (g) => (g.flag('tamsinMet') ? 'My prices go down when it rains. It isn\'t raining.' : 'Buying or selling? I do both. I prefer selling.'),
        effect: (g) => g.setFlag('tamsinMet'),
        options: [
          { text: 'Let me see what you\'ve got.', effect: (g) => g.openShop() },
          { text: 'How\'s trade?', next: 'trade' },
          { text: 'Where does your stock come from?', next: 'stock' },
          { text: 'I killed a big wolf near the Lantern. It had a torn ear.', next: 'fang', cond: (g) => g.has('notch_fang') && !g.flag('fangShown') },
          { text: 'Bye.' },
        ],
      },
      trade: {
        text: 'Good, since the Pit opened. Miners get paid on fourthday and spend it by fifthday.',
        options: [{ text: 'And the village?', next: 'village' }, { text: 'Bye.' }],
      },
      village: { text: 'The village complains about the miners on fourthday and buys from me on fifthday.' },
      stock: {
        text: 'Ansbury, mostly. Some local.',
        options: [{ text: 'What local?', next: 'local' }, { text: 'Bye.' }],
      },
      local: { text: 'The kind I get a good price on.' },
      fang: { text: 'Old Notch? You\'re joking. Let me see.', next: 'fang2' },
      fang2: { speaker: 'narrator', text: 'She turns the fang over, then gives it back a little reluctantly.', next: 'fang3' },
      fang3: {
        text: 'The Ashcrofts have been after that wolf for three winters. I\'d give you thirty for it, but you\'d be a fool to take it.',
        effect: (g) => g.setFlag('fangShown'),
      },
    },
  },

  // ---------------------------------------------------------------- Background villagers
  joss: {
    start: () => 'main',
    nodes: { main: { text: 'If you\'re here about the jellies, the salt\'s in the barn. If you\'re not, mind the wheat.' } },
  },
  dilly: {
    start: () => 'main',
    nodes: { main: { text: (g) => (g.has('wren_whistle') ? 'That\'s Nance\'s whistle! Where\'d you get it? Is the treasure real?' : 'Nance says there\'s treasure up the Lantern. Nance says a lot of things.') } },
  },

  // ================================================================ ALDERMERE (Turnpike)
  // Quest: honestWeight. The Weighhouse reads heavy because its new weights were cast from
  // porous bell bronze. Stages: askOsric, bringBar, askStrake, confront, tellHob, done.

  // ---------------------------------------------------------------- Hob Tannet, carter
  hob: {
    start: (g) => {
      const s = hw(g);
      if (!s) return 'intro';
      if (s === 'tellHob') return g.flag('hwChoice') === 'refund' ? 'end_refund' : 'end_quiet';
      if (s === 'done') return 'after';
      return 'waiting';
    },
    nodes: {
      intro: {
        text: 'Three sacks. I brought three sacks of barley through that gate, and the Weighhouse made it four.',
        options: [
          { text: 'Isn\'t heavier better? You\'re selling it.', next: 'toll' },
          { text: 'Maybe you miscounted.', next: 'count' },
          { text: 'Not my business.' },
        ],
      },
      count: {
        text: 'I loaded them. I\'ve got the back to prove it. Three.',
        options: [{ text: 'So what does a fourth sack cost you?', next: 'toll' }, { text: 'Not my business.' }],
      },
      toll: {
        text: 'Toll\'s by the stone. They charge me on four and the miller pays me on three. All summer. Every carter on this road.',
        options: [
          { text: 'Who runs the scale?', next: 'osric' },
          { text: 'Not my business.' },
        ],
      },
      osric: {
        text: 'Osric Penhallow. Weighmaster. Wears his chain indoors. He\'ll tell you the scale\'s right because it\'s his scale.',
        options: [
          { text: 'I\'ll ask him.', next: 'accept' },
          { text: 'Good luck with that.' },
        ],
      },
      accept: {
        text: 'He\'s on the end stall, by the keep steps. If he fobs you off, ask the gate. Corporal Strake writes down everything that comes through.',
        effect: (g) => g.setStage(HW, 'askOsric'),
      },
      waiting: { text: (g) => (hw(g) === 'askOsric' ? 'End stall. The chain.' : 'Well? Am I mad, or is it four?') },
      end_refund: {
        text: 'There\'s a notice on the Weighhouse door. "Errors in weighing." Errors. Like the weights fell over by themselves.',
        next: 'end_refund2',
      },
      end_refund2: { speaker: 'narrator', text: 'He counts coins from one hand into the other.', next: 'end_refund3' },
      end_refund3: {
        text: 'He paid back the summer, near enough. Here. You did the asking.',
        effect: (g) => { g.addMarks(25); g.setStage(HW, 'done'); },
      },
      end_quiet: {
        text: 'Read three sacks this morning. Three. So it\'s fixed. Nobody\'s paying back the summer, though, are they.',
        effect: (g) => g.setStage(HW, 'done'),
      },
      after: { text: (g) => (g.flag('hwChoice') === 'refund' ? 'Three sacks, three sacks. Lovely sound.' : 'Three sacks. Still owed for the summer. Still carting.') },
    },
  },

  // ---------------------------------------------------------------- Osric Penhallow, weighmaster
  osric: {
    start: (g) => {
      const s = hw(g);
      if (s === 'askOsric') return 'ask';
      if (s === 'bringBar') return g.has('bronze_bar') ? 'weigh' : 'noBar';
      if (s === 'askStrake') return 'afterWeigh';
      if (s === 'confront') return 'confront';
      if (s === 'tellHob' || s === 'done') return g.flag('hwChoice') === 'refund' ? 'after_refund' : 'after_quiet';
      return 'main';
    },
    nodes: {
      main: {
        text: 'Weighhouse is open dawn to dusk. Loads to the yard, not to me.',
        options: [
          { text: 'What do you do?', next: 'job' },
          { text: 'Bye.' },
        ],
      },
      job: { text: 'Every load up the Turnpike is weighed and tolled by the stone. I keep the scale honest. It\'s duller than it sounds, and it sounds dull.' },
      ask: {
        text: 'If this is about a carter, it\'s always about a carter.',
        options: [{ text: 'Hob Tannet says your scale reads heavy.', next: 'ask2' }, { text: 'Never mind.' }],
      },
      ask2: {
        text: 'Hob Tannet also says his ox understands him. The scale is checked against the Ansbury stone, which is sealed in the keep.',
        options: [
          { text: 'When was it last checked?', next: 'ask3' },
          { text: 'Then you won\'t mind me testing it.', next: 'test' },
        ],
      },
      ask3: { text: 'Lady Day. It\'s due again at Michaelmas.', next: 'ask4' },
      ask4: { speaker: 'narrator', text: 'He straightens the chain on his chest, though it was straight.', next: 'test' },
      test: {
        text: 'Test it, then. Bring me something whose weight you know better than you trust me.',
        options: [{ text: 'Such as?', next: 'tolley' }],
      },
      tolley: {
        text: 'A Tolley bar, from Hollin Ford. Bram Tolley casts every bar to the even pound. Ridiculous man. Accurate.',
        effect: (g) => g.setStage(HW, 'bringBar'),
      },
      noBar: { text: 'A Tolley bar. Bronze, stamped with a hammer over a wave. Smelt one, or pay Perrin Gale\'s price at the market.' },
      weigh: {
        text: 'Well. Put it on the pan.',
        options: [{ text: 'Hand him the bar.', next: 'weigh2' }, { text: 'Not yet.' }],
      },
      weigh2: { speaker: 'narrator', text: 'Osric sets the bar on the pan and adds weights from the new set: the pound, then a quarter, then a twelfth. The beam settles.', next: 'weigh3' },
      weigh3: { text: 'A pound and a third.', next: 'weigh4' },
      weigh4: {
        text: 'The pans are clean. The pivot was dressed last month. The beam is the same beam it\'s been for thirty years.',
        options: [{ text: 'And the weights?', next: 'weigh5' }],
      },
      weigh5: {
        text: 'New. Gisborne cast them in July, on Tanners\' Row. The old set was worn smooth.',
        next: 'weigh6',
      },
      weigh6: { speaker: 'narrator', text: 'He gives you the bar back, and doesn\'t look at the weights.', next: 'weigh7' },
      weigh7: {
        text: 'Leave it with me.',
        options: [{ text: 'Where did Gisborne get the metal?', next: 'weigh8' }],
      },
      weigh8: {
        text: 'I didn\'t ask. Next load.',
        effect: (g) => g.setStage(HW, 'askStrake'),
      },
      afterWeigh: { text: 'Next load, I said.' },
      confront: {
        text: 'You\'ve been at the gate. Strake told me. Strake tells everybody.',
        options: [{ text: 'Gisborne cast your weights from three stone of bronze off a Harrowgate cart.', next: 'c2' }],
      },
      c2: {
        text: 'The city allowed twenty marks for a new set. Gisborne asked twelve. I assumed bronze was bronze.',
        options: [
          { text: 'It was a cracked bell. Bell metal pours full of holes if you rush it.', next: 'bell', cond: (g) => !!g.flag('hwBellNoted') },
          { text: 'It isn\'t. Your weights are light, so every load reads heavy.', next: 'c3' },
        ],
      },
      bell: { speaker: 'narrator', text: 'He picks up the pound weight and turns it over. There\'s a pinhole in the base. He puts it down very gently.', next: 'bell2', effect: (g) => g.setFlag('weightsFromBell') },
      bell2: { text: 'A bell. I\'ve been weighing Turnpike barley against a bell.', next: 'c3' },
      c3: {
        text: 'If the Charter hears the Weighhouse read heavy all summer, they\'ll put it out to tender. Harrowgate will bid. They bid on everything.',
        next: 'choice',
      },
      choice: {
        text: 'So. What do you want me to do?',
        options: [
          { text: 'Post a notice and pay the carters back.', next: 'refund' },
          { text: 'Recast the weights quietly. Nobody needs to know.', next: 'quiet' },
          { text: 'Why should I keep anything quiet?', next: 'why' },
        ],
      },
      why: {
        text: 'You shouldn\'t. I\'d only ask you to think about who weighs Hob\'s barley next year.',
        next: 'choice',
      },
      refund: {
        text: 'A notice is a confession with a nail through it.',
        next: 'refund2',
      },
      refund2: { speaker: 'narrator', text: 'He takes a sheet of paper from under the counter anyway.', next: 'refund3' },
      refund3: {
        text: 'I\'ll write it myself. I can at least spell it correctly.',
        effect: (g) => { g.setFlag('hwChoice', 'refund'); g.setStage(HW, 'tellHob'); },
      },
      quiet: {
        text: 'Gisborne will recast them at his own cost, or I\'ll find out what else he\'s made cheaply. And you\'ve lost a day on my account.',
        next: 'quiet2',
      },
      quiet2: { speaker: 'narrator', text: 'He counts thirty marks onto the counter.', next: 'quiet3' },
      quiet3: {
        text: 'Most fees here go in the book. This one won\'t.',
        effect: (g) => { g.addMarks(30); g.setFlag('hwChoice', 'quiet'); g.setStage(HW, 'tellHob'); },
      },
      after_refund: { text: 'Forty-one carters so far. I\'m paying it out of the Weighhouse purse, and when that\'s gone, out of mine.' },
      after_quiet: { text: 'The new set reads true. I checked it against the stone myself. Next load.' },
    },
  },

  // ---------------------------------------------------------------- Edda Strake, gate corporal
  strake: {
    start: (g) => (hw(g) === 'askStrake' ? 'ask' : 'main'),
    nodes: {
      main: {
        text: (g) => (g.flag('strakeMet') ? 'Back again. Same toll.' : 'Name and load. You haven\'t got a load. Name, then.'),
        effect: (g) => g.setFlag('strakeMet'),
        options: [
          { text: 'What\'s the toll?', next: 'toll' },
          { text: 'What do you write down?', next: 'book' },
          { text: 'Bye.' },
        ],
      },
      toll: { text: 'It\'s on the board, outside. Read it on your way. Everyone else does it on their way.' },
      book: { text: 'Who, what, how much, and whose cart. Most of it\'s turnips. The rest is people who don\'t want it written down.' },
      ask: {
        text: 'Name and load.',
        options: [{ text: 'Anything coming in for Gisborne the founder this summer?', next: 'ask2' }, { text: 'Never mind.' }],
      },
      ask2: { speaker: 'narrator', text: 'She doesn\'t ask why. She turns back pages with a wet thumb.', next: 'ask3' },
      ask3: {
        text: 'July. "Bronze in pigs, three stone, Harrowgate cart. For Gisborne, Tanners\' Row." Signed for by A. Pryce.',
        options: [
          { text: 'Three stone. Was it a broken bell?', next: 'bell', cond: (g) => !!g.stage('fordBell') },
          { text: 'Thanks.', next: 'ask4' },
        ],
      },
      bell: { text: 'Doesn\'t say. Says pigs. Anything\'s pigs once you\'ve broken it up.', next: 'bell2' },
      bell2: {
        text: 'I heard about Hollin Ford\'s bell. Everyone on the road did. Well. It\'s our weights now.',
        next: 'ask4',
        effect: (g) => g.setFlag('hwBellNoted'),
      },
      ask4: {
        text: 'If that\'s going to Penhallow, tell him I copied it out for nothing. He\'ll hate that.',
        effect: (g) => g.setStage(HW, 'confront'),
      },
    },
  },

  // ---------------------------------------------------------------- Perrin Gale, Charter Market
  perrin: {
    start: () => 'main',
    nodes: {
      main: {
        text: (g) => (g.flag('perrinMet') ? 'Back. Bread\'s still this morning\'s.' : 'Charter Market. Everything here\'s paid its toll, so everything here costs it.'),
        effect: (g) => g.setFlag('perrinMet'),
        options: [
          { text: 'Let me see your stock.', effect: (g) => g.openShop('perrin') },
          { text: 'Are your bronze bars Tolley\'s?', next: 'tolley', cond: (g) => hw(g) === 'bringBar' },
          { text: 'Any news?', next: 'news' },
          { text: 'Bye.' },
        ],
      },
      tolley: { text: 'Everybody\'s bronze on this road is Tolley\'s. He\'s the only smith on the Wend who bothers stamping it.' },
      news: { text: (g) => perrinNews(g) },
    },
  },

  // ================================================================ GULLMOUTH (Fleet Coast)
  // Quest: gannetLog. Col Maddox's boat went onto the stacks in the March gale with the light dark.
  // Stages: crabs, chest, return, askHester, tellJory, done.

  // ---------------------------------------------------------------- Jory Maddox, fisherman
  jory: {
    start: (g) => {
      const s = gl(g);
      if (!s) return g.flag('joryMet') ? 'reintro' : 'intro';
      if (s === 'crabs') return 'w_crabs';
      if (s === 'chest') return 'w_chest';
      if (s === 'return') return 'open';
      if (s === 'askHester') return 'w_hester';
      if (s === 'tellJory') {
        const c = g.flag('gannetChoice');
        return c === 'hester' ? 'e_hester' : c === 'spare' ? 'e_spare' : 'e_truth';
      }
      return 'after';
    },
    nodes: {
      intro: {
        text: 'You\'re stood on my line.',
        effect: (g) => g.setFlag('joryMet'),
        options: [
          { text: 'Sorry. What are you fishing for?', next: 'fish' },
          { text: 'Bye.' },
        ],
      },
      reintro: {
        text: 'Still mackerel. Still not rowing out.',
        options: [{ text: 'Rowing out where?', next: 'gannet' }, { text: 'Bye.' }],
      },
      fish: {
        text: 'Mackerel. Mostly I\'m fishing for a reason not to row out.',
        options: [{ text: 'Row out where?', next: 'gannet' }, { text: 'Bye.' }],
      },
      gannet: {
        text: 'The Gannet. Dad\'s boat. She went onto the stacks south of here in the March gale. Dad and Ansel Rook aboard.',
        next: 'gannet2',
      },
      gannet2: {
        text: 'Bett\'s lad, Ansel. They found Ansel. They didn\'t find Dad.',
        options: [{ text: 'What\'s left of her?', next: 'gannet3' }, { text: 'I\'m sorry.', next: 'sorry' }],
      },
      sorry: { text: 'Everybody is. It doesn\'t get the chest out.', next: 'gannet3' },
      gannet3: {
        text: 'Half a hull on a sandbar, and his sea chest under the bow. Every low tide I row out. Every low tide the crabs have the bow.',
        options: [
          { text: 'I\'ll clear the crabs and bring the chest back.', next: 'accept' },
          { text: 'How many crabs?', next: 'howmany' },
          { text: 'Not today.' },
        ],
      },
      howmany: {
        text: 'Three big ones. Tide crabs. They pinch through a boot. I\'ve got the boot to show you.',
        options: [{ text: 'I\'ll go.', next: 'accept' }, { text: 'Not today.' }],
      },
      accept: {
        text: 'Follow the shore south till you see the stacks. You can\'t miss her. I\'ve been trying to for six months.',
        effect: (g) => g.setStage(GL, 'crabs'),
      },
      w_crabs: { text: 'The crabs are under the bow, on the landward side. Three of them.' },
      w_chest: { text: 'Crabs gone? Then the chest\'s under the bow. Wedged. You\'ll have to dig with your hands.' },
      open: {
        text: 'That\'s it. That\'s the one.',
        options: [{ text: 'Give Jory the chest.', next: 'open2' }],
      },
      open2: {
        speaker: 'narrator',
        text: 'He opens the padlock with a key he wears on a string. He goes through it without hurrying: letters, a ring, a knife. The log last.',
        effect: (g) => g.take('maddox_chest'),
        next: 'open3',
      },
      open3: { text: '"Second bell. No light on the point. Holding off."', next: 'open4' },
      open4: { text: '"Third bell. Still dark. Will try the channel by the stacks."', next: 'open5' },
      open5: { speaker: 'narrator', text: 'He reads it again.', next: 'open6' },
      open6: {
        text: 'There\'s always a light on the point. Thirty years, Dad said, never once dark.',
        options: [{ text: 'Who keeps the light?', next: 'open7' }],
      },
      open7: {
        text: 'Hester Coggin. North up the coast, on the headland. She was Dad\'s friend.',
        next: 'open8',
      },
      open8: {
        text: 'Ask her why it was dark. If I go up there I\'ll shout, and I don\'t want to have shouted at her.',
        effect: (g) => g.setStage(GL, 'askHester'),
      },
      w_hester: { text: 'Has she said? North, on the headland. The striped tower.' },
      e_truth: {
        text: 'Well? Was it dark?',
        options: [{ text: 'Tell him about the oil.', next: 'e_truth2' }],
      },
      e_truth2: { speaker: 'narrator', text: 'You tell him: the six barrels, the three kept back against the Fund\'s arrears, the lamp put out at first bell on a still night.', next: 'e_truth3' },
      e_truth3: { text: 'A third of the oil. For tolls.', next: 'e_truth4' },
      e_truth4: { speaker: 'narrator', text: 'He\'s quiet for a long time. Then he takes something out of the chest and holds it out.', next: 'compass' },
      e_hester: { speaker: 'narrator', text: 'Jory\'s eyes are red, and he isn\'t hiding it.', next: 'e_hester2' },
      e_hester2: { text: 'She came down. She\'s not come down the cliff path in ten years.', next: 'e_hester3' },
      e_hester3: {
        text: 'She told me all of it. The oil. First bell. She said she\'d do it again with six barrels. Then she said she wished she hadn\'t said that.',
        next: 'compass',
      },
      compass: {
        text: 'Dad\'s compass. He scratched the channel on the card. I\'m never using that channel. You have it.',
        effect: (g) => { g.give('maddox_compass'); g.setStage(GL, 'done'); },
      },
      e_spare: {
        text: 'Well? Was it dark?',
        options: [{ text: 'Tell him the light was lit.', next: 'e_spare2' }],
      },
      e_spare2: { text: 'Lit. Course it was lit.', next: 'e_spare3' },
      e_spare3: { speaker: 'narrator', text: 'He looks relieved, and then ashamed of being relieved.', next: 'e_spare4' },
      e_spare4: { text: 'Dad always cut the channel too fine. Mum said so for twenty years.', next: 'e_spare5' },
      e_spare5: {
        text: 'Here. Bett says I\'m to pay you, so I\'m paying you. Not the compass. I\'m keeping the compass.',
        effect: (g) => { g.addMarks(30); g.give('cooked_mackerel', 3); g.setStage(GL, 'done'); },
      },
      after: {
        text: (g) => (g.flag('gannetChoice') === 'spare'
          ? 'Buying a boat off the Penroses. I\'m calling her the Col.'
          : 'Buying a boat off the Penroses. I\'m calling her the Second Bell. Nessa says that\'s morbid. Nessa can name her own boat.'),
      },
    },
  },

  // ---------------------------------------------------------------- Hester Coggin, keeper of Fleet Light
  hester: {
    start: (g) => {
      const s = gl(g);
      if (s === 'askHester') return g.flag('oilBookRead') ? 'explain' : 'ask';
      if (s === 'tellJory') return 'waiting';
      if (s === 'done' && g.flag('gannetChoice') === 'spare' && !g.flag('hesterPaid')) return 'pay';
      if (s === 'done') return 'after';
      return 'main';
    },
    nodes: {
      main: {
        text: 'People only climb up here to ask me something. Usually it\'s whether I\'m lonely.',
        options: [
          { text: 'Are you?', next: 'lonely' },
          { text: 'What does the light need?', next: 'needs' },
          { text: 'Bye.' },
        ],
      },
      lonely: { text: 'I have a lamp that needs trimming every two hours. I don\'t have time to be anything.' },
      needs: { text: 'Oil, and someone awake. The Light Fund pays for the oil. Ansbury collects it on the Turnpike tolls.' },
      ask: {
        text: 'You\'ve come up from the harbour. You\'ve got the harbour look.',
        options: [{ text: 'The Gannet\'s log says the light was dark at second bell, the night she went down.', next: 'ask2' }, { text: 'Bye.' }],
      },
      ask2: { speaker: 'narrator', text: 'She looks at the lamp room, not at you.', next: 'ask3' },
      ask3: { text: 'It was.', options: [{ text: 'Why?', next: 'ask4' }] },
      ask4: { text: 'The oil book is on the trestle by the door. Read it. Then ask me again, and I\'ll answer.' },
      explain: {
        text: 'You\'ve read it.',
        options: [{ text: 'Six barrels.', next: 'ex2' }],
      },
      ex2: { text: 'Six barrels to see out a winter that needs nine. The Toll Office kept three back against the Fund\'s arrears.', next: 'ex3' },
      ex3: { text: 'So I turned the lamp down to a quarter.', next: 'ex3b' },
      ex3b: { text: 'And on still nights I put it out at first bell. To save oil for the bad ones.', next: 'ex4' },
      ex4: { text: 'It was still at first bell.', next: 'ex5' },
      ex5: { speaker: 'narrator', text: 'She stops there, as if that\'s the end of the sentence.', next: 'ex6' },
      ex6: {
        text: 'Will you tell the boy?',
        options: [
          { text: 'Yes. He should hear it.', next: 'truth' },
          { text: 'You should tell him yourself.', next: 'hester' },
          { text: 'I\'ll tell him the light was lit.', next: 'spare' },
        ],
      },
      truth: {
        text: 'Then tell him all of it. The Toll Office as well. Don\'t let him put it all on one old woman. It\'s not all hers.',
        effect: (g) => { g.setFlag('gannetChoice', 'truth'); g.setStage(GL, 'tellJory'); },
      },
      hester: {
        text: 'Then I had better find my boots.',
        effect: (g) => { g.setFlag('gannetChoice', 'hester'); g.setStage(GL, 'tellJory'); },
      },
      spare: { text: 'That isn\'t your decision to make.', next: 'spare2' },
      spare2: { speaker: 'narrator', text: 'She turns the lamp key a quarter turn, and back.', next: 'spare3' },
      spare3: {
        text: 'But I won\'t stop you making it.',
        effect: (g) => { g.setFlag('gannetChoice', 'spare'); g.setStage(GL, 'tellJory'); },
      },
      waiting: { text: 'He\'s on the jetty. He always is.' },
      pay: {
        text: 'Forty marks. Take it. I still don\'t know if what you did was kind, and I\'d rather not owe you while I decide.',
        effect: (g) => { g.addMarks(40); g.setFlag('hesterPaid'); },
      },
      after: {
        text: (g) => (g.flag('gannetChoice') === 'spare'
          ? 'Six barrels again this month. The lamp\'s down to a quarter. I haven\'t put it out once, and I won\'t.'
          : 'Nine barrels came up this month. And a letter from the Toll Office I haven\'t opened. It\'ll be about the arrears.'),
      },
    },
  },

  // ---------------------------------------------------------------- Nessa Crane, harbourmaster
  nessa: {
    start: (g) => (gl(g) === 'done' && !g.flag('nessaPaid') ? 'salvage' : 'main'),
    nodes: {
      main: {
        text: 'Moorings are two marks a month. You haven\'t got a boat, so this conversation\'s free.',
        options: [
          { text: 'How\'s the harbour?', next: 'harbour' },
          { text: 'What happened to the Gannet?', next: 'gannet', cond: (g) => !!gl(g) && gl(g) !== 'done' },
          { text: 'Any news?', next: 'news', cond: (g) => gl(g) === 'done' },
          { text: 'Bye.' },
        ],
      },
      harbour: { text: 'Forty boats in a good year. Thirty-one this year. Mackerel are running, sea bass if you\'ve the patience. Bett buys both.' },
      gannet: { text: 'Col Maddox knew the stacks better than anyone in this harbour. That\'s what makes me angry about it. You don\'t lose Col on the stacks.' },
      news: {
        text: (g) => (g.flag('gannetChoice') === 'spare'
          ? 'Jory\'s buying a boat. Good. Sitting on a jetty with a line out isn\'t fishing, it\'s waiting.'
          : 'I\'ve written to the Toll Office about the Light Fund. They\'ll write back about tolls. I\'ll write again.'),
      },
      salvage: {
        text: 'The Gannet\'s chest. A fifth of any salvage in my water goes to the harbour. I\'m waiving it, and paying you the finder\'s share.',
        next: 'salvage2',
      },
      salvage2: {
        text: 'Don\'t argue. I hate being argued with about money I\'m giving away.',
        effect: (g) => { g.addMarks(20); g.setFlag('nessaPaid'); },
      },
    },
  },

  // ---------------------------------------------------------------- Bett Rook, chandler
  bett: {
    start: () => 'main',
    nodes: {
      main: {
        text: (g) => (g.flag('bettMet') ? 'Fish? I\'ll pay for fish.' : 'Bett Rook. Rope, tackle, food. I pay well for fish and badly for everything else.'),
        effect: (g) => g.setFlag('bettMet'),
        options: [
          { text: 'Let me see your stock.', effect: (g) => g.openShop('bett') },
          { text: 'Jory said your son was on the Gannet.', next: 'ansel', cond: (g) => !!gl(g) && gl(g) !== 'done' },
          { text: 'Jory knows about the light.', next: 'oil', cond: (g) => gl(g) === 'done' && g.flag('gannetChoice') !== 'spare' },
          { text: 'Bye.' },
        ],
      },
      ansel: { text: 'Ansel. Nineteen. Every boat in this harbour has my rope on it, and he spliced half of it.', next: 'ansel2' },
      ansel2: { speaker: 'narrator', text: 'She goes back to coiling the line on the counter.', next: 'ansel3' },
      ansel3: { text: 'Col paid a share, not a wage. Ansel liked that. Thought it meant he owned a bit of the boat.' },
      oil: { text: 'He told me. About the oil.', next: 'oil2' },
      oil2: { text: 'I\'ve sold rope to the Toll Office carter for eleven years. I\'ve told him to buy it somewhere else.' },
    },
  },

  // ================================================================ HARROWGATE WORKS (Raddle Barrens)
  // Quest: fairPrice. Wick Abery sold his pick to the company buyer at a fraction of the posted rate
  // for injured hands. Stages: getPick, returnPick, done. Picks up the Ford Bell thread through Pryce.

  // ---------------------------------------------------------------- Corrie Dunmore, drift boss
  corrie: {
    start: (g) => {
      const s = fp(g);
      if (!s) return 'main';
      if (s === 'done' && g.flag('fpChoice') === 'paid' && !g.flag('fpWhip')) return 'whip';
      if (s === 'done') return 'after';
      return 'waiting';
    },
    nodes: {
      main: {
        text: (g) => (g.flag('corrieMet') ? 'Still a visitor.' : 'Drift\'s closed to visitors. You look like a visitor.'),
        effect: (g) => g.setFlag('corrieMet'),
        options: [
          { text: 'Is there work?', next: 'work' },
          { text: 'Your brother runs the Pit at Hollin Ford.', next: 'hesk', cond: (g) => !!g.flag('heskMet') },
          { text: 'Bye.' },
        ],
      },
      hesk: { text: 'Hesk. He writes. Mostly about pumps, and how the village is right about the runoff.', next: 'hesk2' },
      hesk2: { text: 'Hesk thinks about the village. I think about the roof over No. 1 Drift. Somebody in this family has to.' },
      work: {
        text: 'Not today. Ask me again when I\'m not a man short.',
        options: [{ text: 'Who are you short?', next: 'wick' }, { text: 'Bye.' }],
      },
      wick: {
        text: 'Wick Abery. Cart came off the rail on a loading day and his wrist went under it.',
        next: 'wick2',
      },
      wick2: {
        text: 'Bonesetter wanted six marks. Wick had three. So he sold his pick to Pryce for three.',
        options: [{ text: 'Is that a fair price?', next: 'wick3' }],
      },
      wick3: {
        text: 'Notice on the gate says the company buys an injured hand\'s tools at the posted rate, and holds them till he\'s back. Eighteen for a pick.',
        next: 'wick4',
      },
      wick4: { text: 'Tam\'s got it on the store wall now. Forty.', options: [{ text: 'Why haven\'t you said anything?', next: 'wick5' }] },
      wick5: {
        text: 'Pryce signs my wages.',
        options: [
          { text: 'I\'ll get Wick\'s pick back.', next: 'accept' },
          { text: 'That\'s between you and Pryce.' },
        ],
      },
      accept: {
        text: 'You didn\'t hear it from me. Wick\'s by the bunkhouse, bored out of his mind.',
        effect: (g) => g.setStage(FP, 'getPick'),
      },
      waiting: { text: (g) => (fp(g) === 'returnPick' ? 'Well, give it him, then. Bunkhouse.' : 'Shift\'s in an hour. I\'m not talking about it during the shift.') },
      whip: {
        text: 'You paid Tam forty for a three-mark pick. The drift had a whip-round. It came to twenty.',
        next: 'whip2',
      },
      whip2: {
        text: 'Take it. They\'ll be offended if you don\'t, and I have to work with them.',
        effect: (g) => { g.addMarks(20); g.setFlag('fpWhip'); },
      },
      after: { text: 'Wick\'s back on half shifts. Holds the lamp, mostly. Complains, mostly.' },
    },
  },

  // ---------------------------------------------------------------- Wick Abery, injured miner
  wick: {
    start: (g) => {
      const s = fp(g);
      if (s === 'returnPick') return 'give';
      if (s === 'done') return 'after';
      return 'main';
    },
    nodes: {
      main: {
        text: (g) => (fp(g) === 'getPick'
          ? 'Corrie sent you? She\'s soft. Don\'t tell her I said that.'
          : 'Wrist\'s in a sling. Pick\'s in the store. I\'m in the way.'),
      },
      give: {
        text: 'Is that —',
        options: [{ text: 'Give Wick his pick.', next: 'give2' }],
      },
      give2: { speaker: 'narrator', text: 'He takes it left-handed and runs his thumb along the handle.', effect: (g) => g.take('abery_pick'), next: 'give3' },
      give3: { text: 'That\'s my split. Taped it myself.', next: 'give4' },
      give4: {
        text: (g) => {
          const c = g.flag('fpChoice');
          if (c === 'leverage') return 'Pryce gave it back? Pryce doesn\'t give things back. What did you do to him?';
          if (c === 'delia') return 'Mrs Harrowgate sent a boy round. Fifteen marks, from Pryce\'s wages, the boy said. He said it twice. He enjoyed it.';
          return 'You paid Tam for it? I can\'t pay you back. I can\'t pay you anything. Ask Corrie.';
        },
        effect: (g) => g.setStage(FP, 'done'),
      },
      after: { text: 'Half shifts. I hold the lamp. I\'m very good at holding the lamp.' },
    },
  },

  // ---------------------------------------------------------------- Aubrey Pryce, buyer
  pryce: {
    start: (g) => (g.flag('pryceMet') ? 'main' : 'intro'),
    nodes: {
      intro: {
        text: 'Aubrey Pryce, buyer. I buy what people have and don\'t need, and occasionally what they need and can\'t keep.',
        effect: (g) => g.setFlag('pryceMet'),
        next: 'main',
      },
      main: {
        text: (g) => (g.flag('fpChoice') === 'delia' ? 'You read carefully. I\'ll remember that. Buying or going?' : 'Buying, today. Are you selling?'),
        options: [
          { text: 'I\'m selling.', effect: (g) => g.openShop('pryce') },
          { text: 'You bought the Ford Bell from Bram Tolley.', next: 'bell', cond: (g) => !!g.stage('fordBell') && !g.flag('pryceBell') },
          { text: 'Gisborne cast Ansbury\'s weights from that bell.', next: 'weights', cond: (g) => !!g.flag('weightsFromBell') && !!g.flag('pryceBell') && !g.flag('pryceWeights') },
          { text: 'You bought Wick Abery\'s pick for three marks.', next: 'pick', cond: (g) => fp(g) === 'getPick' && !g.flag('pryceAsked') },
          { text: 'Your book says you bought Wick\'s pick on your own account and sold it to the store for thirty.', next: 'lev', cond: (g) => fp(g) === 'getPick' && !!g.flag('pryceBook') && !g.flag('fpRelease') },
          { text: 'Bye.' },
        ],
      },
      bell: {
        text: 'Three stone of cracked bronze. Thirty-one marks. Broke it into pigs and sold it to Gisborne the founder in Ansbury for forty-five.',
        effect: (g) => g.setFlag('pryceBell'),
        options: [{ text: 'Did you know Bram needed the money?', next: 'bell2' }, { text: 'Right.', next: 'main' }],
      },
      bell2: { text: 'Everyone I buy from needs the money. People who don\'t need money don\'t sell me things.', next: 'main' },
      weights: {
        text: 'Did he. I sell bronze. What people make of it is between them and their customers.',
        effect: (g) => g.setFlag('pryceWeights'),
        next: 'weights2',
      },
      weights2: { speaker: 'narrator', text: 'He makes a note in the margin of his book anyway.', next: 'main' },
      pick: {
        text: 'I did. On my own account, not the company\'s.',
        effect: (g) => g.setFlag('pryceAsked'),
        options: [{ text: 'The notice says injured hands get the posted rate.', next: 'pick2' }],
      },
      pick2: { text: 'For tools the company buys. Notices are written by people who don\'t buy things.', next: 'main' },
      lev: { text: 'It does.', next: 'lev2' },
      lev2: { speaker: 'narrator', text: 'He doesn\'t look at the book. He doesn\'t need to.', next: 'lev3' },
      lev3: {
        text: 'Mrs Harrowgate reads my book at the quarter. It\'s not the quarter. What would you like?',
        options: [
          { text: 'Wick\'s pick, back to Wick. No charge.', next: 'lev4' },
          { text: 'Nothing. I\'ll take it to Mrs Harrowgate.', next: 'lev_no' },
        ],
      },
      lev_no: { text: 'Then she\'ll be by the anvil. She usually is.', next: 'main' },
      lev4: { speaker: 'narrator', text: 'He writes on a slip, initials it, and folds it once.', next: 'lev5' },
      lev5: {
        text: 'Give that to Tam. No charge. And bring me what you find on the road. I pay well for people who read carefully.',
        effect: (g) => { g.setFlag('fpRelease', 'leverage'); g.setFlag('fpChoice', 'leverage'); },
      },
    },
  },

  // ---------------------------------------------------------------- Delia Harrowgate, partner
  delia: {
    start: (g) => (g.flag('deliaMet') ? 'main' : 'intro'),
    nodes: {
      intro: {
        text: 'Delia Harrowgate. The "Daughters" part. One of three. Hilda does the Ansbury side, Joan runs the smelter on the Rill.',
        effect: (g) => g.setFlag('deliaMet'),
        next: 'intro2',
      },
      intro2: { text: 'Father died before he could change the sign. We\'ve kept it. It annoys the right people.', next: 'main' },
      main: {
        text: 'If you\'re after work, Corrie hires. If you\'re after a complaint, I\'m the office.',
        options: [
          { text: 'What does the company do?', next: 'company' },
          { text: 'Wick Abery sold his pick to Pryce for three marks.', next: 'wick', cond: (g) => fp(g) === 'getPick' && !g.flag('pryceBook') },
          { text: 'Pryce bought Wick Abery\'s pick on his own account. It\'s in his book.', next: 'book', cond: (g) => fp(g) === 'getPick' && !!g.flag('pryceBook') && !g.flag('fpRelease') },
          { text: 'Bye.' },
        ],
      },
      company: {
        text: 'We dig copper and tin, smelt it on the Rill, and sell bars to Ansbury. Everything else we buy. That\'s Mr Pryce.',
      },
      wick: {
        text: 'Then Wick sold a pick. The notice covers tools the company buys. Mr Pryce knows that, so I\'m sure he bought it properly.',
        next: 'wick2',
      },
      wick2: { speaker: 'narrator', text: 'She says "properly" as if she\'s weighing it.' },
      book: { text: 'On his own account.', next: 'book2' },
      book2: { speaker: 'narrator', text: 'She doesn\'t ask to see it. She looks across the yard at the buyer\'s trestle.', next: 'book3' },
      book3: { text: 'So the notice doesn\'t apply, because the company never bought it. Clever.', next: 'book4' },
      book4: {
        text: 'Tam will let the pick go at the posted rate, billed to Mr Pryce. Mr Pryce will pay Wick the difference out of his wages.',
        next: 'book5',
      },
      book5: {
        text: 'And this is for reading the book. I should have read it myself.',
        effect: (g) => { g.addMarks(30); g.setFlag('fpRelease', 'delia'); g.setFlag('fpChoice', 'delia'); },
      },
    },
  },

  // ---------------------------------------------------------------- Tam Feld, company store
  tamFeld: {
    start: () => 'main',
    nodes: {
      main: {
        text: 'Company store. Company prices. I don\'t set them, I just say them.',
        options: [
          { text: 'Let me see your stock.', effect: (g) => g.openShop('company') },
          {
            text: (g) => (g.flag('fpRelease') === 'leverage' ? 'Hand him Pryce\'s slip.' : 'Mrs Harrowgate says Wick\'s pick goes at the posted rate.'),
            next: 'release',
            cond: (g) => fp(g) === 'getPick' && !!g.flag('fpRelease') && !g.has('abery_pick'),
          },
          { text: 'Why is a used pick forty marks?', next: 'forty', cond: (g) => fp(g) === 'getPick' && !g.flag('fpRelease') },
          { text: 'Bye.' },
        ],
      },
      forty: { text: 'Company prices.' },
      release: { speaker: 'narrator', text: 'Tam takes Wick\'s pick off the wall and hands it over handle first.', next: 'release2' },
      release2: {
        text: (g) => (g.flag('fpRelease') === 'leverage'
          ? '"No charge. A.P." First one of those I\'ve seen in four years.'
          : 'Posted rate, billed to Mr Pryce. I\'m writing that down very clearly.'),
        effect: (g) => g.give('abery_pick'),
      },
    },
  },

  // ================================================================ FELLERS' CAMP (Hagworm Wood)
  // Quest: callingTimber. Sefton Garrow is going deaf and nearly felled a tree onto Kit Ashcroft.
  // Stages: logs, deliver, askSefton, decide, done. Outcome flag timberChoice: send, marker, keep.

  // ---------------------------------------------------------------- Ide Marrow, camp boss
  ide: {
    start: (g) => {
      const s = ct(g);
      if (!s) return g.flag('ideMet') ? 'reintro' : 'intro';
      if (s === 'logs') return 'w_logs';
      if (s === 'deliver') return 'deliver';
      if (s === 'askSefton') return 'w_ask';
      if (s === 'decide') return 'decide';
      return 'after';
    },
    nodes: {
      intro: {
        text: 'If you can swing an axe, I can pay you. If you can\'t, mind the stumps.',
        effect: (g) => g.setFlag('ideMet'),
        options: [{ text: 'What are you cutting?', next: 'order' }, { text: 'Bye.' }],
      },
      reintro: {
        text: 'Still thirty-seven.',
        options: [{ text: 'Thirty-seven what?', next: 'order' }, { text: 'Bye.' }],
      },
      order: {
        text: 'Pit props. Elder oak, nine foot, for Harrowgate\'s No. 1 Drift. Forty by the month\'s end. I\'ve got thirty-seven.',
        options: [{ text: 'Why are you short?', next: 'short' }, { text: 'Bye.' }],
      },
      short: {
        text: 'I\'m a sawyer short. Sefton Garrow\'s off the saw until I decide what to do with him.',
        options: [
          { text: 'I\'ll cut your last three.', next: 'accept' },
          { text: 'What did he do?', next: 'what' },
          { text: 'Bye.' },
        ],
      },
      what: {
        text: 'Get me my three trees and I\'ll have time to tell you.',
        options: [{ text: 'I\'ll cut them.', next: 'accept' }, { text: 'Bye.' }],
      },
      accept: {
        text: 'Elder oak. The big ones, bark like a cliff face. You\'ll want Woodcutting 20 and a hatchet that isn\'t for kindling.',
        effect: (g) => g.setStage(CT, 'logs'),
      },
      w_logs: { text: 'Three elder. I\'ve counted the stack twice. It hasn\'t grown.' },
      deliver: {
        text: 'Is that elder?',
        options: [{ text: 'Hand over three elder logs.', next: 'deliver2' }],
      },
      deliver2: {
        speaker: 'narrator',
        text: 'She checks the grain on each one before she puts it on the stack.',
        effect: (g) => { g.take('elder_logs', 3); g.addMarks(25); },
        next: 'deliver3',
      },
      deliver3: {
        text: 'Forty. Harrowgate gets its props. Here\'s your three marks a log, and a bit for walking.',
        options: [{ text: 'What happened with Sefton?', next: 'story' }],
      },
      story: {
        text: 'Sefton was on the saw, Kit was on the call. The tree went the wrong way and Kit went the right one. Just.',
        next: 'story2',
      },
      story2: {
        text: 'Kit says he called it. Sefton says he heard him and took his time. One of them\'s lying, and I\'d rather it was Kit.',
        options: [{ text: 'Why would you rather?', next: 'story3' }],
      },
      story3: {
        text: 'Kit lying I can fix. Ask them both. Then tell me what you think, because I\'ve stopped trusting what I think.',
        effect: (g) => g.setStage(CT, 'askSefton'),
      },
      w_ask: { text: 'Sefton\'s by the stack. Kit\'s on the far side, sulking with an axe.' },
      decide: {
        text: (g) => (g.flag('seftonTested')
          ? 'Well? Kit\'s told me you were shouting Sefton\'s name behind his back. So you know something.'
          : 'Well? You\'ve talked to them both.'),
        options: [
          { text: 'He didn\'t hear the call. Send him home to Hollin Ford.', next: 'send' },
          { text: 'Take him off the saw. Let him pick and mark the trees.', next: 'marker' },
          { text: 'He heard it. Keep him on the saw.', next: 'keep' },
        ],
      },
      send: { text: 'His brother\'s in Hollin Ford. Pell. They can sit on the dock and grumble at the river.', next: 'send2' },
      send2: { speaker: 'narrator', text: 'She writes something in the camp book and doesn\'t look up.', next: 'send3' },
      send3: {
        text: 'I\'ll pay him to the end of the month. He\'ll hate me anyway. Here, for the trouble.',
        effect: (g) => { g.addMarks(30); g.setFlag('timberChoice', 'send'); g.setStage(CT, 'done'); },
      },
      marker: {
        text: 'Marking\'s a boy\'s job. Walking about with a paint pot.',
        options: [{ text: 'Who reads grain better than Sefton?', next: 'marker2' }],
      },
      marker2: { text: 'Nobody. That\'s not the point, and you know it isn\'t.', next: 'marker3' },
      marker3: { speaker: 'narrator', text: 'She looks over at the stack, where Sefton is sharpening something that doesn\'t need it.', next: 'marker4' },
      marker4: {
        text: 'Fine. He\'ll hate it, he\'ll be good at it, and I\'ll be paying a new sawyer out of nowhere.',
        effect: (g) => { g.setFlag('timberChoice', 'marker'); g.setStage(CT, 'done'); },
      },
      keep: { text: 'Then Kit\'s lying.', next: 'keep2' },
      keep2: { speaker: 'narrator', text: 'She looks across the clearing at Kit, who is looking at his boots.', next: 'keep3' },
      keep3: {
        text: 'All right. Sefton stays on the saw. Kit works the far side from now on. That\'s for your trouble, and for being sure.',
        effect: (g) => { g.addMarks(40); g.setFlag('timberChoice', 'keep'); g.setStage(CT, 'done'); },
      },
      after: {
        text: (g) => {
          const c = g.flag('timberChoice');
          if (c === 'send') return 'Quiet without him. I keep turning round to tell him to stop talking.';
          if (c === 'marker') return 'He marks, they cut. We\'ve had no bad trees since. Don\'t tell him I said so.';
          return 'Sefton\'s on the saw. Kit\'s on the far side. Everyone\'s happy, apparently.';
        },
      },
    },
  },

  // ---------------------------------------------------------------- Sefton Garrow, feller
  sefton: {
    start: (g) => {
      const s = ct(g);
      if (s === 'askSefton' && !g.flag('seftonAsked')) return 'ask';
      if (s === 'done' && g.flag('timberChoice') === 'marker' && !g.flag('seftonAxe')) return 'axe';
      if (s === 'done') return 'after';
      return 'main';
    },
    nodes: {
      main: {
        text: 'Sefton Garrow. You\'ll know my brother if you\'ve been through Hollin Ford. Everybody knows Pell. He makes sure of it.',
        options: [{ text: 'What are you doing?', next: 'sharp' }, { text: 'Bye.' }],
      },
      sharp: { text: 'Sharpening. You sharpen, you fell, you sharpen. Forty years of it.' },
      ask: {
        text: 'You\'re the one cutting Ide\'s three. Good. She needs them.',
        options: [{ text: 'Kit says you didn\'t hear his call.', next: 'ask2' }],
      },
      ask2: {
        text: 'I heard him. I wanted the cut finished before she went. Forty years I\'ve been finishing cuts.',
        effect: (g) => g.setFlag('seftonAsked'),
        options: [
          { text: 'Step behind him and say his name.', next: 'test' },
          { text: 'All right.' },
        ],
      },
      test: { speaker: 'narrator', text: 'You step behind him and say his name. Then louder. He keeps sharpening.', next: 'test2' },
      test2: { speaker: 'narrator', text: 'When you walk back round, he looks up, surprised.', next: 'test3' },
      test3: {
        text: 'There you are. Thought you\'d gone.',
        effect: (g) => g.setFlag('seftonTested'),
      },
      axe: { text: 'Marking. Me. Forty years on the saw, and now I walk about with a pot of paint.', next: 'axe2' },
      axe2: { speaker: 'narrator', text: 'He holds out his felling axe, haft first.', next: 'axe3' },
      axe3: {
        text: 'Take it. I won\'t be needing it to point at trees.',
        effect: (g) => { if (g.give('garrow_axe')) g.setFlag('seftonAxe'); },
      },
      after: {
        text: (g) => (g.flag('timberChoice') === 'marker'
          ? 'That one. Not that one. See the grain on it? I\'ve an eye. Always had.'
          : 'Back on the saw. Kit\'s moved to the far side. Says the light\'s better over there.'),
      },
    },
  },

  // ---------------------------------------------------------------- Kit Ashcroft, feller
  kit: {
    start: (g) => {
      const s = ct(g);
      if (s === 'askSefton' && !g.flag('kitAsked')) return 'ask';
      if (s === 'done') return 'after';
      return 'main';
    },
    nodes: {
      main: {
        text: 'Kit Ashcroft. From Hollin Ford, the Ashcrofts with the hens. If you\'ve seen a brown hen called Duchess, she\'s my aunt\'s, and she isn\'t coming back.',
      },
      ask: {
        text: 'Ide sent you.',
        options: [{ text: 'Did Sefton hear your call?', next: 'ask2' }],
      },
      ask2: { text: 'No.', next: 'ask3' },
      ask3: { speaker: 'narrator', text: 'He says it quickly, then looks as if he wishes he\'d said it slower.', next: 'ask4' },
      ask4: { text: 'He\'s not lying. He thinks he heard me. He\'s been doing that since spring, answering what he thinks you said.', next: 'ask5' },
      ask5: {
        text: 'I don\'t want him sacked. I want him not to drop a tree on me.',
        effect: (g) => g.setFlag('kitAsked'),
      },
      after: {
        text: (g) => {
          const c = g.flag('timberChoice');
          if (c === 'send') return 'Camp\'s quiet without him shouting the weather at everyone.';
          if (c === 'marker') return 'He marks, I cut. He shouts at me when I cut the wrong side of his mark. I hear him fine.';
          return 'I work the far side now. The light\'s better.';
        },
      },
    },
  },

  // ---------------------------------------------------------------- Odo Fenn, camp stores
  odo: {
    start: () => 'main',
    nodes: {
      main: {
        text: 'Stew\'s on. Stew\'s always on. Stores are what\'s left.',
        options: [
          { text: 'Let me see the stores.', effect: (g) => g.openShop('odo') },
          { text: 'How\'s the camp?', next: 'camp' },
          { text: 'Bye.' },
        ],
      },
      camp: { text: 'Twelve fellers, one cook, and Harrowgate\'s order. The order eats more than the fellers do.' },
    },
  },

  // ================================================================ COLD HEARTH (Scarth Highlands)
  // Quest: highPasture. Bryn Hale is stranded at Hale's Fold with a broken leg and the flock, and snow is coming.
  // Stages: askIlse, findBryn, feed, tellCai, askWenna, done. Outcome flag pastureChoice: bryn, flock, wenna.

  // ---------------------------------------------------------------- Wenna Hale, shepherd
  wenna: {
    start: (g) => {
      const s = hp(g);
      if (!s) return 'intro';
      if (s === 'tellCai') return 'w_cai';
      if (s === 'askWenna') return 'decide';
      if (s === 'done') return g.flag('wennaPaid') ? 'after' : 'pay';
      return 'waiting';
    },
    nodes: {
      intro: {
        text: 'If you came over the ridge, did you pass a man with fourteen ewes? Big. The man, not the ewes.',
        options: [{ text: 'No. Who is he?', next: 'who' }, { text: 'Sorry, no.' }],
      },
      who: {
        text: 'Bryn. My husband. He went up to Hale\'s Fold to bring the flock down before the snow. That was three days ago.',
        next: 'who2',
      },
      who2: {
        text: 'It\'s a day there and back.',
        options: [
          { text: 'I\'ll go and look for him.', next: 'accept' },
          { text: 'Maybe he\'s sheltering.', next: 'shelter' },
        ],
      },
      shelter: {
        text: 'Bryn doesn\'t shelter. He\'s never sat out weather in his life. He walks through it and complains after.',
        options: [{ text: 'I\'ll go and look for him.', next: 'accept' }, { text: 'Bye.' }],
      },
      accept: {
        text: 'Ask at Scarth Watch first. Ilse\'s up all night at that glass of hers. If there\'s been a lantern on the ridge, she\'ll have seen it.',
        effect: (g) => g.setStage(HP, 'askIlse'),
      },
      waiting: { text: (g) => (hp(g) === 'askIlse' ? 'Scarth Watch. The tower with the crystal on top.' : 'Hale\'s Fold is up on the ridge. Stone hut, stone fold. You\'ll see the wall before the hut.') },
      w_cai: { text: 'Cai\'s getting the sledge out. Tell him, not me. If you tell me, I\'ll go up there myself.' },
      decide: { text: 'Cai says one trip before the snow. Bryn or the ewes.', next: 'decide2' },
      decide2: { speaker: 'narrator', text: 'She doesn\'t answer straight away.', next: 'decide3' },
      decide3: { text: 'Fourteen ewes is this house. Bryn knows that. It\'s why he stayed up there with them.', next: 'decide4' },
      decide4: { text: 'Bring the ewes down. Bryn keeps the fire in. He\'ll lose toes, and he\'ll forgive me for toes.', next: 'decide5' },
      decide5: {
        text: 'He\'d never forgive me for the ewes. Go and tell Cai.',
        effect: (g) => { g.setFlag('pastureChoice', 'wenna'); g.setStage(HP, 'done'); },
      },
      pay: {
        text: (g) => (g.flag('pastureChoice') === 'bryn'
          ? 'He\'s home. The ewes aren\'t. Six came down on their own, which is six more than I expected. Take this. You found him.'
          : 'Two toes, the bonesetter says. Fourteen ewes. Bryn says that\'s a good trade, and I\'m to stop looking at him like that. Take this.'),
        effect: (g) => {
          g.addMarks(50);
          if (g.flag('pastureChoice') !== 'bryn') g.give('cooked_char', 2);
          g.setFlag('wennaPaid');
        },
      },
      after: {
        text: (g) => (g.flag('pastureChoice') === 'bryn'
          ? 'Six ewes. We\'ll buy in come spring, if Cai can find a seller who doesn\'t laugh at us.'
          : 'He\'s on a stick and furious about it. The flock\'s in the low field. I\'m counting them twice a day.'),
      },
    },
  },

  // ---------------------------------------------------------------- Ilse Blewitt, astronomer
  ilse: {
    start: (g) => (hp(g) === 'askIlse' ? 'ask' : 'main'),
    nodes: {
      main: {
        text: 'Scarth Watch. I count the stars that fall, and write down where. The Charter pays me for the count, eventually.',
        options: [
          { text: 'Why count them?', next: 'why' },
          { text: 'I\'ve got star crystal to sell.', effect: (g) => g.openShop('ilse') },
          { text: 'Bye.' },
        ],
      },
      why: { text: 'Where a star comes down, there\'s crystal. Ansbury likes to know where its crystal is before Harrowgate does.' },
      ask: {
        text: 'You\'ve been sent from Kelderby. People from Kelderby don\'t come here to look at stars.',
        options: [{ text: 'Have you seen a lantern on the ridge?', next: 'ask2' }],
      },
      ask2: { text: 'Two nights ago, at Hale\'s Fold. Not last night.', next: 'ask3' },
      ask3: { speaker: 'narrator', text: 'She glances at the log on the trestle.', next: 'ask4' },
      ask4: {
        text: 'And the glass has been falling since noon. Snow tomorrow night, a lot of it. Whoever\'s at the fold needs to be off it by then.',
        effect: (g) => g.setStage(HP, 'findBryn'),
      },
    },
  },

  // ---------------------------------------------------------------- Bryn Hale, at Hale's Fold
  bryn: {
    start: (g) => {
      const s = hp(g);
      if (s === 'askIlse' || s === 'findBryn') return 'wolves';
      if (s === 'feed') return firstFood(g) ? 'feed' : 'hungry';
      return 'waiting';
    },
    nodes: {
      wolves: {
        text: 'Behind you. Wolves. They come back every time the fire gets low.',
        effect: (g) => { if (hp(g) === 'askIlse') g.setStage(HP, 'findBryn'); },
      },
      hungry: { text: 'They\'ve gone. Good. Have you got anything to eat? Anything cooked. I\'ve had snow water for two days.' },
      feed: {
        text: 'They\'ve gone. Good. Have you got anything to eat?',
        options: [{ text: 'Give him something to eat.', next: 'feed2' }],
      },
      feed2: {
        speaker: 'narrator',
        text: 'He eats it too fast and then sits with his eyes shut for a while.',
        effect: (g) => { const f = firstFood(g); if (f) g.take(f); },
        next: 'feed3',
      },
      feed3: {
        text: 'Leg went under me on the scree. I can\'t stand on it. The ewes are in the fold, all fourteen.',
        options: [{ text: 'Ilse says snow tomorrow night.', next: 'feed4' }],
      },
      feed4: { text: 'Then Cai can bring the sledge up once before it comes. Once.', next: 'feed5' },
      feed5: {
        text: 'Tell him the ewes first. Fourteen ewes is the house. I\'ve got the fire, and the bothy\'s stone.',
        effect: (g) => g.setStage(HP, 'tellCai'),
      },
      waiting: { text: 'Tell Cai. Ewes first.' },
    },
  },

  // ---------------------------------------------------------------- Bryn Hale, home again
  brynHome: {
    start: () => 'main',
    nodes: {
      main: {
        text: (g) => {
          const c = g.flag('pastureChoice');
          if (c === 'bryn') return 'Six ewes found their own way down. Eight didn\'t. Wenna says I\'m worth eight ewes. She\'s being generous.';
          if (c === 'wenna') return 'Wenna chose. I\'d have chosen the same. I\'m still not speaking to her till the thaw.';
          return 'Two toes. I\'ve got eight more. The ewes are all in.';
        },
      },
    },
  },

  // ---------------------------------------------------------------- Cai Morgan, carter
  cai: {
    start: (g) => {
      const s = hp(g);
      if (s === 'tellCai') return 'tell';
      if (s === 'done') return 'after';
      return 'main';
    },
    nodes: {
      main: {
        text: 'Cai Morgan. I take things up the mountain and other things down it.',
        options: [
          { text: 'What have you got?', effect: (g) => g.openShop('cai') },
          { text: 'Bye.' },
        ],
      },
      tell: {
        text: 'You found him? Where?',
        options: [{ text: 'At the fold. His leg\'s broken. Ilse says snow tomorrow night.', next: 'tell2' }],
      },
      tell2: {
        text: 'One trip, then. I can bring him down on the sledge, or drive the ewes down through the drifts. Not both. Not before that snow.',
        options: [
          { text: 'Bring Bryn down.', next: 'bryn' },
          { text: 'Drive the ewes down. Bryn keeps the fire in.', next: 'flock' },
          { text: 'Ask Wenna. It\'s her house.', next: 'wenna' },
        ],
      },
      bryn: { text: 'He told you ewes first, didn\'t he.', next: 'bryn2' },
      bryn2: { speaker: 'narrator', text: 'You don\'t answer, which answers.', next: 'bryn3' },
      bryn3: {
        text: 'Right. I\'ll bring him. He can shout at me the whole way down.',
        effect: (g) => { g.setFlag('pastureChoice', 'bryn'); g.setStage(HP, 'done'); },
      },
      flock: { text: 'That\'s what he said, isn\'t it. That\'s exactly what he said.', next: 'flock2' },
      flock2: {
        text: 'Right. Stone walls and a fire. He\'ll keep.',
        effect: (g) => { g.setFlag('pastureChoice', 'flock'); g.setStage(HP, 'done'); },
      },
      wenna: {
        text: 'It is. Go on, then. I\'ll have the sledge out either way.',
        effect: (g) => g.setStage(HP, 'askWenna'),
      },
      after: {
        text: (g) => (g.flag('pastureChoice') === 'bryn'
          ? 'Brought him down shouting. Didn\'t stop till the well.'
          : 'Fourteen ewes through the drifts. I\'m not doing that again till I\'m paid in something better than stew.'),
        options: [{ text: 'What have you got?', effect: (g) => g.openShop('cai') }, { text: 'Bye.' }],
      },
    },
  },
};

// Kit across the clearing is the same Kit.
DIALOGUE.kitFar = DIALOGUE.kit;

// ---------------------------------------------------------------- Things you read in the world

/** Things you read. A body can depend on the state of the world (the toll board changes with the main story). */
export const READABLES: Record<string, { title: string; body: string | ((g: GameApi) => string); effect?: (g: GameApi) => void }> = {
  landBoard: {
    title: 'Charter of Hollindale: Lots to Let',
    body: 'Five lots on the Ford road, laid out by the moot and staked at the corners. Each let for ninety-nine years at three hundred marks, the money to the bridge.\n\nThe leaseholder may build as they please, by the Ansbury builders, who supply the stone, lime, thatch and glazing, and want the timber and ironwork found for them, and their wages.\n\nOne home to a household. Anyone holding Wendside Cottage may give it back to the Charter, which will pay two hundred marks for it, once their own house is built.\n\nEnquire at the stake of any lot.\n\n– M. Ashby, Reeve',
  },
  notice: {
    title: 'Notice board, Hollin Ford',
    body: [
      'LOST. One brown hen, answers to Duchess. Does not actually answer. Ruth Ashcroft.',
      'MOOT, next fourthday, under the Oak. First item: the bell. Second item: the bell. M. Ashby, Reeve.',
      'Hands wanted, Sallow Pit, upper gallery. 3 marks a shift. Bring your own lamp. Harrowgate & Daughters.',
      'Whoever keeps taking the good bench by the Oak: it\'s mine. My name\'s carved in it. Look. J.W.',
    ].join('\n\n'),
  },
  minenotice: {
    title: 'Company notice',
    body: 'Rustbacks are not to be fed, petted, or "kept for luck".\n\nAny found in the carts are to be reported to the foreman.\n\nDamage to company lamps will be charged at cost.\n\nH. Dunmore, Foreman, for Harrowgate & Daughters',
  },
  gauge: {
    title: 'Rain gauge',
    body: 'A glass tube marked off in fingers. The water sits at four. Someone has scratched a line at six and written COWS next to it.',
  },
  bellframe: {
    title: 'The Ford Bell',
    body: 'An empty timber frame. The bell rope has been tied off so it won\'t swing in the wind.',
  },
  ledger: {
    title: 'Bram Tolley\'s ledger',
    body: 'Heavy, careful handwriting. Most of it is horseshoes. The latest page:\n\nRent, Lammas quarter. 14m. Paid 6. OWING 8.\nCharcoal, 3 sacks at 9m. 27m. (!!)\nAshcroft, shoes for the grey. 2m. Not paid.\nBell bronze, 3 stone, cracked. To H&D buyer, Mr Pryce. 31m.\nMoot hall hinges for M.A. Not started.',
    effect: (g) => g.setFlag('ledgerRead'),
  },
  aldermereToll: {
    title: 'Toll board, Ansbury south gate',
    body: [
      'CROWNROAD TOLLS. BY CHARTER.',
      'On foot, no load: free.\nHand cart: 1 mark.\nOx cart, grain: 2 marks, and the Weighhouse fee by the stone.\nOx cart, ore or metal: 4 marks.\nCattle: 1 mark the head. Sheep: 1 mark the five.',
      'LIGHT FUND, for Fleet Light: one mark in twenty on all of the above.',
      'Under it, in chalk, in three different hands: SCALES READ HEAVY. ASK ANY CARTER. ASK ME.',
    ].join('\n\n'),
  },
  lightOilBook: {
    title: 'Oil book, Fleet Light',
    body: 'Small upright handwriting, the same for twenty years of pages. The last winter:\n\nFeb 3. Light Fund cart. 6 barrels. Nine ordered.\nFeb 4. Wrote to the Toll Office, Ansbury.\nFeb 21. Reply. Three barrels held against the Fund\'s arrears, to be cleared from spring tolls.\nMar 1. Lamp down to a quarter.\nMar 9. Still nights: out at first bell.\nMar 14. Still. Out at first bell.\n\nThe last line is written harder than the others.',
    effect: (g) => g.setFlag('oilBookRead'),
  },
  harrowNotice: {
    title: 'Company notice, Harrowgate Works',
    body: 'HARROWGATE & DAUGHTERS. TO ALL HANDS.\n\nThe tools of any hand injured in company work will be bought by the company at the full posted rate (pick, 18 marks; hatchet, 12 marks) and held for the hand\'s return. Apply to the buyer.\n\nD. Harrowgate, Partner\n\nUnderneath, nailed on separately: The shift bell is the shift bell. It is not a suggestion. C. Dunmore',
  },
  pryceBook: {
    title: 'Mr Pryce\'s purchase book',
    body: 'Neat, small and all in the same ink. Most lines have two prices.\n\nPick, iron. W. Abery (own account). 3m. To store, 30m.\nHatchet. J. Sallis (own account). 2m. To store, 20m.\nLamp oil, 3 barrels. Toll Office, Ansbury (surplus). 12m. To smelter, 30m.\nBronze, 3 stone (bell, cracked, broken to pigs). B. Tolley, Hollin Ford. 31m. To Gisborne, Ansbury, 45m.\nCopper ore, 40 carts. Sallow Pit. Company.\n\nPryce watches you read it. He doesn\'t stop you.',
    effect: (g) => g.setFlag('pryceBook'),
  },
  campOrder: {
    title: 'Order slip, Fellers\' Camp',
    body: 'HARROWGATE & DAUGHTERS\n\nPit props, elder oak, nine foot, sound. Forty, by the month\'s end, for No. 1 Drift.\nThree marks the prop, paid at the camp.\n\nA. Pryce, Buyer\n\nChalked underneath, crossed out and rewritten: 31. 34. 37.',
  },
  weatherLog: {
    title: 'Scarth Watch weather log',
    body: 'In Ilse Blewitt\'s hand, one line every few hours.\n\nThird day. Clear. Glass steady. Lantern at Hale\'s Fold after dark.\nFourth day. Clear. Glass steady. No lantern at the fold.\nFifth day, noon. Glass falling.\nFifth day, dusk. Glass falling fast. Wind backing. Snow by tomorrow\'s dark.\n\nCount: four falls, all south of the temple.',
  },
};

// ---------------------------------------------------------------- Hagworm Wood and Scarth quest helpers

const CT = 'callingTimber';
const HP = 'highPasture';
function ct(g: GameApi): string | undefined { return g.stage(CT); }
function hp(g: GameApi): string | undefined { return g.stage(HP); }
/** The first cooked food in the player's pack, if any (Bryn will eat anything). */
function firstFood(g: GameApi): string | undefined {
  return Object.values(ITEMS).find((i) => i.kind === 'food' && i.id !== 'burnt_fish' && g.has(i.id))?.id;
}

// ---------------------------------------------------------------- Regional quest helpers

const HW = 'honestWeight';
const GL = 'gannetLog';
const FP = 'fairPrice';
function hw(g: GameApi): string | undefined { return g.stage(HW); }
function gl(g: GameApi): string | undefined { return g.stage(GL); }
function fp(g: GameApi): string | undefined { return g.stage(FP); }

/** Perrin hears everything that comes up the Turnpike, latest first. */
function perrinNews(g: GameApi): string {
  if (g.flag('hwChoice') === 'refund') return 'Weighhouse put up a notice. Carters queued past my stall all morning for their money. Osric paid every one himself.';
  if (g.flag('hwChoice') === 'quiet') return 'Hob says the Weighhouse made his three sacks three this week. Nobody\'s said why, so nobody\'s paying anybody back.';
  if (g.flag('fpChoice') === 'delia') return 'Harrowgate\'s buyer had his wages docked. Didn\'t hear it from me. Heard it from Hilda Harrowgate, who was delighted.';
  if (gl(g) === 'done' && g.flag('gannetChoice') !== 'spare') return 'Gullmouth\'s harbourmaster is writing to the Toll Office about the Light Fund. The Toll Office is writing back about tolls.';
  return 'Harrowgate carts on the road every day now. Ore going in, nothing coming back out but marks.';
}

// ---------------------------------------------------------------- The main story (src/data/story.ts)
applyStoryHooks(DIALOGUE);
Object.assign(READABLES, STORY_READABLES);
READABLES.aldermereToll.body = tollBoard;

// ---------------------------------------------------------------- Side content (src/data/content)
import { BOARDS, CONTENT } from './content';
import type { DNode } from '../game/api';
for (const c of CONTENT) { Object.assign(DIALOGUE, c.dialogue ?? {}); Object.assign(READABLES, c.readables ?? {}); }
for (const c of CONTENT) c.hooks?.(DIALOGUE);
// A notice board reads like a conversation: the list of postings, and each posting in full.
for (const b of BOARDS) {
  const open = (g: GameApi) => b.postings.filter((p) => !g.stage(p.quest) && (!p.when || p.when(g)));
  const nodes: Record<string, DNode> = {
    list: {
      text: (g) => [b.header?.(g), open(g).length ? 'Jobs, pinned on top:' : 'Nothing new pinned up.'].filter(Boolean).join('\n\n'),
      options: [
        ...b.postings.map((p) => ({ text: p.title, next: 'p:' + p.quest, cond: (g: GameApi) => open(g).includes(p) })),
        { text: 'Leave the board.' },
      ],
    },
  };
  for (const p of b.postings) {
    nodes['p:' + p.quest] = {
      text: p.text,
      options: [
        { text: 'Take it.', effect: (g: GameApi) => g.setStage(p.quest, p.stage) },
        { text: 'Leave it pinned.', next: 'list' },
      ],
    };
  }
  DIALOGUE['board:' + b.id] = { start: () => 'list', nodes };
}
