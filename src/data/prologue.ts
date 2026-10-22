import counties from '../assets/story/counties.jpg';
import turnpike from '../assets/story/turnpike.jpg';
import harrowgate from '../assets/story/harrowgate.jpg';
import isles from '../assets/story/isles.jpg';
import kirk from '../assets/story/kirk.jpg';
import vale from '../assets/story/vale.jpg';

// The prologue a new character sees before arriving in Hollindale: six painted pages of the land,
// in the manner of Guild Wars 2's storybook scenes. It sets up what the first hours show (the
// Charter, the road and its debt, the company, the drifting isles, the Kirk) and gives nothing
// away: why the isles float is for the story to tell. The pictures are the game's own places,
// washed in ink (previews/panels.mjs paints them).

export interface Page { img: string; kicker: string; text: string }

export const PROLOGUE: Page[] = [
  { img: counties, kicker: 'The Charter Counties', text: 'The counties are bound to the city of Ansbury by trade charters, not by war. Each keeps its own reeves, its own customs and its own grudges.' },
  { img: turnpike, kicker: 'The Turnpike', text: 'Twelve years ago the Charter paved the road from Hollin Ford to the coast with borrowed money. The debt was sold on, and sold on again. Every toll on the road still goes to paying it.' },
  { img: harrowgate, kicker: 'Harrowgate & Daughters', text: 'In the Raddle Barrens the Harrowgate company digs, smelts, and bids on everything the Charter puts out to tender. Lately it has been digging for star crystal.' },
  { img: isles, kicker: 'The Weatherholms', text: 'Over the Scarth Highlands, islands of turf drift across the sky. The shepherds count them. Nobody has been up, and nobody can say what holds them there.' },
  { img: kirk, kicker: 'The Glass Kirk', text: 'Pilgrims climb to the Glass Kirk to put a hand on the crystal in its floor. Some say it is warm. Harrowgate would like to know how deep it goes.' },
  { img: vale, kicker: 'Hollindale', text: 'And at the west end of the Turnpike lies Hollindale: a ford, a mill, a pit on the hill, and a bell that cracked this spring. This is where you come in.' },
];
