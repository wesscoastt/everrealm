import type { Appearance } from '../entities/humanoid';

// THE INFIRMARIES (docs/COMPANY_BRIEF.md, part 2): in each city a place where the hurt are looked after,
// with a physician, a nurse, a ward of beds with people in them, and work of its own. What they do for you:
//   treatment: the physician cures every harm on you and heals you to full, for a few marks (free to
//     anyone with fewer than POOR marks: the Charter pays);
//   your bed here: choose the infirmary as where you come back when you fall (the flag "bind"), and you
//     come back on your feet at full health instead of the square at Hollin Ford at three-fifths;
//   remedies: the nurse's still-room.
// The buildings are in world/sites.ts (infirmary); the people's dialogue in data/content/infirmary.ts.

interface Person { id: string; name: string; title: string; at: [number, number]; face: [number, number]; look: Partial<Appearance>; barks: string[] }

export interface Patient extends Person {
  /** What they say from the bed, and what's wrong with them (the nurse's word for it). */
  says: string;
  ail: string;
}

export interface Infirmary {
  id: string;
  name: string;
  town: string;
  /** Where you come back when you fall, if you chose it: on your feet by the door, inside. */
  bed: [number, number, number];
  /** The physician's greeting, and what they say seeing to someone with no money, and someone with some. */
  physician: Person & { hello: string; free: string; paid: string };
  /** The nurse, and what they say about the ward. */
  nurse: Person & { ward: string };
  patients: Patient[];
}

/** Treatment's price, and the purse under which it's free. */
export const TREAT_COST = 8;
export const POOR = 20;

export const INFIRMARIES: Infirmary[] = [
  {
    // The Spital, on the main street's south side at its west end, Tanners' Row behind: hall corner (757, 307), door north
    id: 'spital', name: 'The Spital', town: 'Ansbury', bed: [766.5, 24, 309.6],
    physician: {
      id: 'inf_hesper', name: 'Hesper Galloway', title: 'Physician of the Spital', at: [760.4, 310.6], face: [764, 311.5],
      look: { skin: '#e8c0a0', hair: '#4a3a2a', hairStyle: 2, lashes: true, tunic: '#2a2a2e', trim: '#c8c0b0', shirt: '#e8e4dc', age: 0.5, apron: true },
      barks: ['Wash your hands.', 'Next.', 'Sit. Not there. There.'],
      free: 'Sit. The Charter pays for this one, and the Charter will never know it did.',
      paid: 'Sit. Eight marks for the Spital\'s box, and I\'ll have whatever\'s on you off you.',
      hello: 'Hesper Galloway, physician. The Spital takes anyone the Charter will pay for, which is everyone the Charter hasn\'t noticed yet. Are you hurt, or visiting?',
    },
    nurse: {
      id: 'inf_kitty', name: 'Kitty Rudge', title: 'Nurse of the Spital', at: [770.4, 311.2], face: [766, 311.5],
      look: { skin: '#f0d0b8', hair: '#c8a060', hairStyle: 2, lashes: true, tunic: '#5a6a7a', trim: '#e8e4dc', apron: true, age: 0.3 },
      barks: ['Comfrey, honey, linen. In that order.', 'Mind the bucket.', 'He\'s asleep. Let him be.'],
      ward: 'Mending, the two young ones. The old soldier coughs all night and says it\'s nothing. It isn\'t nothing. Don\'t tell him I said so.',
    },
    patients: [
      { id: 'inf_oswin', name: 'Oswin Pardew', title: 'Carter', at: [759.5, 313.4], face: [759.5, 310], look: { skin: '#c89070', hair: '#5a4030', hairStyle: 3, beard: true, tunic: '#e8e4dc', trim: '#c8c0b0', build: 1.15, age: 0.5 },
        barks: ['Six weeks, she says.', 'Who\'s driving my cart?'],
        says: 'Wheel went over my leg at the Toll Office. My own wheel, my own cart. The physician says six weeks. My horse says nothing; she\'s at my brother\'s eating his hay.',
        ail: 'A broken leg, set and splinted. He\'ll walk.' },
      { id: 'inf_effie', name: 'Effie Tregarthen', title: 'Laundress', at: [764.5, 313.4], face: [764.5, 310], look: { skin: '#e2b894', hair: '#8a4a2a', hairStyle: 2, lashes: true, tunic: '#e8e4dc', trim: '#c8c0b0', age: 0.35 },
        barks: ['It\'s only my arm.', 'Somebody\'s got to do the Weighhouse sheets.'],
        says: 'Copper boiled over at the Weighhouse wash-house. It\'s only my arm. I\'ve two hands, I told her, and she said not for a fortnight I haven\'t.',
        ail: 'A scald from the elbow to the wrist. Honey and linen, and it\'ll mend clean.' },
      { id: 'inf_tobit', name: 'Tobit Hawes', title: 'Old soldier', at: [769.5, 313.4], face: [769.5, 310], look: { skin: '#d8a882', hair: '#c8c4bc', hairStyle: 0, beard: true, tunic: '#e8e4dc', trim: '#c8c0b0', age: 0.85, build: 0.95 },
        barks: ['Coughed through thirty winters.', 'Don\'t let her give me the brown bottle.'],
        says: 'Thirty years under the Charter\'s colours and they put me in a bed by the door. I\'d have asked for the one by the window. Thirty years under canvas, you forget there are windows.',
        ail: 'A cough he\'s had since the winter. He\'s old, and it\'s settled in.' },
    ],
  },
  {
    // The Works' sick bay at Harrowgate, in the yard's south-west corner inside the palisade: hall corner
    // (972, 1016), door east. Stone, the only building the Company put up in stone, after the fire.
    id: 'sickbay', name: 'the Works\' sick bay', town: 'Harrowgate', bed: [981.5, 25, 1019.5],
    physician: {
      id: 'inf_cuthbert', name: 'Cuthbert Fane', title: 'Company doctor, the Works', at: [979.6, 1018.0], face: [976, 1018.5],
      look: { skin: '#e0b48e', hair: '#8a847c', hairStyle: 0, tunic: '#3a3a3e', trim: '#8a8a90', shirt: '#e8e4dc', age: 0.65, beard: true },
      barks: ['Company pays. Company decides how much.', 'Show me the hand.', 'You\'ll keep the fingers. Most of them.'],
      free: 'Sit down. The Company won\'t miss what this costs, and if it does it can take it out of my pay.',
      paid: 'Eight marks to the sick-club box, which the Company says it matches. Sit down.',
      hello: 'Cuthbert Fane, company doctor. The Company pays me to keep its hands working, and I do, for the Company\'s money and my own conscience. Hurt?',
    },
    nurse: {
      id: 'inf_hepsie', name: 'Hepsie Corbin', title: 'Dresser, the Works\' sick bay', at: [980.6, 1020.4], face: [977, 1019],
      look: { skin: '#d8a882', hair: '#5a3a24', hairStyle: 2, lashes: true, tunic: '#5a4a3a', trim: '#c8b890', apron: true, age: 0.4 },
      barks: ['Lint, splints, and patience.', 'He\'s not to have the gin.'],
      ward: 'Lemuel will lose the one finger. He knows. What he doesn\'t know is that Pryce had the prop sawn up for firewood, so there\'s nothing left to look at.',
    },
    patients: [
      { id: 'inf_lemuel', name: 'Lemuel Sawle', title: 'Hewer, No. 1 Drift', at: [976.0, 1017.8], face: [980, 1017.8], look: { skin: '#c89070', hair: '#2a1e14', hairStyle: 3, tunic: '#e8e4dc', trim: '#c8c0b0', build: 1.1, age: 0.4 },
        barks: ['Half pay, once they\'re satisfied.', 'It wasn\'t my fault. Ask the prop.'],
        says: 'A fall of roof in No. 1 Drift, and my hand under it. The Rules say half pay for a fall, once the Company\'s satisfied it wasn\'t my fault. They\'re not satisfied yet. They\'re looking at the prop.',
        ail: 'A crushed hand. Two fingers set; one he\'ll lose.' },
    ],
  },
  {
    // The Seamen's Sick-House, Gullmouth, on the upper terrace by the head of the stair: hall corner
    // (1698, 679), door north. The harbour dues keep it, a penny a ton, which the masters complain of.
    id: 'sickhouse', name: 'the Seamen\'s Sick-House', town: 'Gullmouth', bed: [1705.5, 30, 681.0],
    physician: {
      id: 'inf_isolde', name: 'Isolde Penwarden', title: 'Physician, the Seamen\'s Sick-House', at: [1701.2, 682.2], face: [1705, 683.5],
      look: { skin: '#c89070', hair: '#1e1a16', hairStyle: 2, lashes: true, tunic: '#1f3a4a', trim: '#e8e4dc', shirt: '#e8e4dc', age: 0.45, apron: true },
      barks: ['Sit. Breathe out. Again.', 'Lemons. Tell your master: lemons.', 'Salt water heals nothing. Whatever they tell you.'],
      free: 'Sit. A penny a ton off every hull in the harbour pays for this, and you\'re cheaper than a ton.',
      paid: 'Eight marks for the dues box, and the harbour thanks you. Sit.',
      hello: 'Isolde Penwarden. The Sick-House is for seamen, and the harbour decides who\'s a seaman, and the harbour isn\'t fussy. What\'s wrong with you?',
    },
    nurse: {
      id: 'inf_clemmie', name: 'Clemmie Blewett', title: 'Nurse, the Seamen\'s Sick-House', at: [1709.6, 682.2], face: [1705, 683.5],
      look: { skin: '#e2b894', hair: '#8a4a2a', hairStyle: 2, lashes: true, tunic: '#4a5a6a', trim: '#e8e4dc', apron: true, age: 0.35 },
      barks: ['Linen\'s on the line, not on you.', 'He\'ll eat the onion or I\'ll know why.'],
      ward: 'Ezekiel\'s teeth are firming up; the onions are doing it, he\'d sooner die than say so. Nicodemus won\'t say how he got his burns. The burns say a gun, and he\'s no gunner on any ship that pays dues here.',
    },
    patients: [
      { id: 'inf_ezekiel', name: 'Ezekiel Cardew', title: 'Ship\'s cook', at: [1700.5, 684.4], face: [1700.5, 680], look: { skin: '#d8a882', hair: '#c8c4bc', hairStyle: 3, beard: true, tunic: '#e8e4dc', trim: '#c8c0b0', build: 1.15, age: 0.7 },
        barks: ['Four months on biscuit.', 'Don\'t mention onions.'],
        says: 'Four months to the Isles and back on biscuit and salt pork, and the cook\'s the one with the scurvy. My teeth were going. She feeds me onions raw. I\'ve fed worse to better men.',
        ail: 'Scurvy, from a long passage. Greens and rest, and he\'ll keep his teeth.' },
      { id: 'inf_nicodemus', name: 'Nicodemus Vean', title: 'Seaman', at: [1705.5, 684.4], face: [1705.5, 680], look: { skin: '#b8865e', hair: '#2a1e14', hairStyle: 5, tunic: '#e8e4dc', trim: '#c8c0b0', age: 0.3 },
        barks: ['Galley fire. That\'s all.', 'I\'ll be gone by Sunday.'],
        says: 'Galley fire. On a coaster. Which coaster? A small one. I\'ll be out of here by Sunday and you\'ll never have seen me, which is what I\'d like best.',
        ail: 'Powder burns down one arm and the side of his face. He says a galley fire.' },
    ],
  },
  {
    // The Assembly's Hospital, Callis, on the plaza across from the Charter Post: hall corner (8551, 1058),
    // door west onto the plaza. Everything in it was paid for by a vote, and the vote is painted over the door.
    id: 'hospital', name: 'the Assembly\'s Hospital', town: 'Callis', bed: [8552.6, 22, 1066.5],
    physician: {
      id: 'inf_laia', name: 'Laia Serra', title: 'Physician of the Assembly\'s Hospital', at: [8553.6, 1061.4], face: [8556, 1065],
      look: { skin: '#c8906a', hair: '#1e1a16', hairStyle: 2, lashes: true, tunic: '#e8e4dc', trim: '#3a5a8a', shirt: '#e8e4dc', age: 0.5 },
      barks: ['Name, parish, complaint. In that order.', 'The Assembly pays. In triplicate.'],
      free: 'Sit. The Assembly voted this bed free to anyone who needs it, by a majority of four. Don\'t make me regret the four.',
      paid: 'Eight marks for the poor box. The Assembly matches it, on paper. Sit.',
      hello: 'Laia Serra, physician. The Assembly voted for a hospital and then for a physician and then, a year later, for medicines. Hurt?',
    },
    nurse: {
      id: 'inf_nil', name: 'Nil Font', title: 'Nurse of the Assembly\'s Hospital', at: [8554.4, 1070.4], face: [8556, 1066],
      look: { skin: '#d8a882', hair: '#3a2a1e', hairStyle: 1, tunic: '#5a6a7a', trim: '#e8e4dc', apron: true, age: 0.3 },
      barks: ['Clean linen, every bed, every day.', 'The cook doesn\'t get the burns cream again.'],
      ward: 'Gerard should be dead and isn\'t, which is the physician\'s doing and not the Company\'s. Joana breathes better since we moved her by the window. She doesn\'t know where the smoke came from either.',
    },
    patients: [
      { id: 'inf_gerard', name: 'Gerard Fiol', title: 'Porter', at: [8556.3, 1060.5], face: [8553, 1060.5], look: { skin: '#c89070', hair: '#2a1e14', hairStyle: 3, beard: true, tunic: '#e8e4dc', trim: '#c8c0b0', build: 1.15, age: 0.45 },
        barks: ['Carried bales eleven years.', 'They said the stairs were sound.'],
        says: 'Eleven years carrying bales at the warehouses, and one Saturday the stair behind the Company\'s goes from under me. Third floor. They say the stair was sound. Stairs don\'t fall down when they\'re sound.',
        ail: 'A broken back that isn\'t broken, by some luck. He\'ll walk by spring.' },
      { id: 'inf_joana', name: 'Joana Tous', title: 'Lace-maker', at: [8556.3, 1065.5], face: [8553, 1065.5], look: { skin: '#e2b894', hair: '#a8a49c', hairStyle: 2, lashes: true, tunic: '#e8e4dc', trim: '#c8c0b0', age: 0.75 },
        barks: ['Smoke in my chest still.', 'Forty years of lace, all gone up.'],
        says: 'My rooms were over the warehouses on the coast road. One night the smoke came up through the boards. Forty years of lace, the pillow, the bobbins, all of it. They say a lamp was left. Whose lamp, they don\'t say.',
        ail: 'Smoke in the chest. Old lungs; she\'ll mend slowly or not at all.' },
    ],
  },
];

export const INFIRMARY_BY_ID = new Map(INFIRMARIES.map((i) => [i.id, i]));
