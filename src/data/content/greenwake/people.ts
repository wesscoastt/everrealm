import type { NpcDef } from '../../npcs';

// Hollindale: the people side quests add to Hollin Ford and the farms around it.
// Voices are noted beside each; canon is in docs/LORE.md under Hollindale.

export const GW_PEOPLE: NpcDef[] = [
  {
    // Eighties. The oldest person in the vale. Remembers the ford before the bridge. Precise, dry, digresses on purpose.
    id: 'ivy', name: 'Ivy Marsh', title: 'Oldest in the vale',
    look: { skin: '#e8c8a8', hair: '#e8e4dc', hairStyle: 2, eyes: '#5a6a7a', tunic: '#5a4a6a', trim: '#c8b8d0', trousers: '#3a3440', boots: '#2a2220', cape: '#4a3a52', lashes: true, build: 0.86, height: 0.92, age: 1 },
    schedule: [{ from: 0, to: 24, at: [141.5, 178.6], face: [145, 176], anim: 'idle' }],
    barks: ['Forty-one years. Still the new bridge.'],
  },
  {
    // Brisk farmer, counts her losses aloud. Dilly's aunt, Kit's aunt. Flinty, protective.
    id: 'ruth', name: 'Ruth Ashcroft', title: 'Ashcroft farm',
    look: { skin: '#e2b894', hair: '#a8642e', hairStyle: 4, eyes: '#4a6a4a', tunic: '#6a5a3a', trim: '#c8a860', trousers: '#4a4034', boots: '#3a2a1c', apron: true, lashes: true, build: 1.02, age: 0.5 },
    schedule: [{ from: 0, to: 24, at: [126.5, 218.5], face: [130, 218.5], anim: 'idle' }],
    barks: ['Twelve ewes. Was fifteen.'],
  },
  {
    // Pit hand from the village. Spends fourthday's wages by fifthday. Decent, weak, funny about it.
    id: 'gil', name: 'Gil Saxby', title: 'Pit hand',
    look: { skin: '#d09870', hair: '#3a2a1a', hairStyle: 0, beard: true, eyes: '#4a3a2a', tunic: '#5a5048', trim: '#8a7a5a', trousers: '#3a3430', boots: '#2a1e14', build: 1.08, age: 0.4 },
    schedule: [{ from: 0, to: 24, at: [148.3, 178.6], face: [145, 176], anim: 'idle' }],
  },
  {
    // Keeps the Low Water. Counts plates and heads. Kind in a way that adds up.
    id: 'agnes', name: 'Agnes Pole', title: 'The Low Water',
    look: { skin: '#e8c4a4', hair: '#5a3a22', hairStyle: 2, eyes: '#4a3a2a', tunic: '#7a3a3a', trim: '#e8d0a0', trousers: '#3a2a2a', boots: '#2a1e1a', apron: true, lashes: true, build: 1.12, age: 0.6 },
    schedule: [{ from: 0, to: 24, at: [191.5, 186.2], face: [191.5, 183], anim: 'idle' }],
    barks: ['Fourthday. Thirty plates.'],
  },
  {
    // Charcoal burner in Haverwood. Few words, smells of smoke, plain about money.
    id: 'cass', name: 'Cass Pudney', title: 'Charcoal burner',
    look: { skin: '#b07a52', hair: '#2a2420', hairStyle: 3, eyes: '#3a3a3a', tunic: '#3a3a36', trim: '#6a6a60', trousers: '#2a2a28', boots: '#1e1a18', lashes: true, build: 1.0, age: 0.55 },
    schedule: [{ from: 0, to: 24, at: [234.5, 214.5], face: [238, 214.5], anim: 'idle' }],
  },
  {
    // Gorse Mill. Talks in weather. Worried about wind the way other people worry about money.
    id: 'dunstan', name: 'Dunstan Hay', title: 'Miller, Gorse Mill',
    look: { skin: '#e8c8a8', hair: '#cfc8b8', hairStyle: 0, beard: true, eyes: '#4a5a6a', tunic: '#c8c0a8', trim: '#8a7a5a', trousers: '#5a5040', boots: '#3a2a1c', hat: 'cap', hatColor: '#d8d0b8', apron: true, build: 1.1, age: 0.7 },
    schedule: [{ from: 0, to: 24, at: [120.5, 208], face: [124, 208], anim: 'idle' }],
    barks: ['Wind\'s backing.'],
  },
  {
    // Keeps the Wetlings ditches. One-track: cows, salt, jellies, the gauge.
    id: 'ned', name: 'Ned Bracken', title: 'Ditch-keeper',
    look: { skin: '#c88a62', hair: '#8a7a6a', hairStyle: 0, eyes: '#4a4a3a', tunic: '#4a5a3a', trim: '#8a8a5a', trousers: '#4a4034', boots: '#3a3020', hat: 'cap', hatColor: '#5a4a2a', build: 1.0, age: 0.65 },
    schedule: [{ from: 0, to: 24, at: [195.5, 234.5], face: [200, 240], anim: 'idle' }],
    barks: ['Four fingers. Six is cows.'],
  },
  {
    // Joss Wether's son, fourteen. Bravado, easily embarrassed by his father.
    id: 'tobin', name: 'Tobin Wether', title: '',
    look: { skin: '#d09870', hair: '#8a5a2a', hairStyle: 0, eyes: '#4a3a2a', tunic: '#6a7a3a', trim: '#a8904a', trousers: '#5a4a3a', boots: '#3a2a1c', build: 0.88, height: 0.9, age: 0.05 },
    schedule: [{ from: 0, to: 24, at: [74, 257.5], face: [70, 255], anim: 'idle' }],
    wander: 3,
  },
  {
    // Shepherd. Counts everything twice. A long, polite rivalry with Ruth Ashcroft over whose ewes are whose.
    id: 'elspeth', name: 'Elspeth Cole', title: 'Shepherd',
    look: { skin: '#f0c8a8', hair: '#dedad2', hairStyle: 1, eyes: '#4a6a7a', tunic: '#7a6a4a', trim: '#c8b890', trousers: '#4a4034', boots: '#3a2a1c', hat: 'hood', hatColor: '#6a5a3a', lashes: true, build: 0.92, age: 0.75 },
    schedule: [{ from: 0, to: 24, at: [122.5, 225.5], face: [119.5, 228.5], anim: 'idle' }],
  },
  {
    // Drives the Charter Post cart. Carries the news faster than the letters.
    id: 'bess', name: 'Bess Tull', title: 'Charter Post driver',
    look: { skin: '#b88058', hair: '#1e1612', hairStyle: 4, eyes: '#3a2a1a', tunic: '#2e3a5a', trim: '#e0c060', trousers: '#2a2a34', boots: '#1e1a18', cape: '#3a2a1a', hat: 'cap', hatColor: '#2e3a5a', lashes: true, build: 1.0, age: 0.4 },
    schedule: [{ from: 0, to: 24, at: [161.5, 189.5], face: [162.5, 186.5], anim: 'idle' }], // (behind the Post sign, clear of the lamp post and the post box)
    barks: ['Ansbury by dark.'],
  },
];
