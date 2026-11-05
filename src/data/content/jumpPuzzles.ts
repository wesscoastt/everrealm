import type { GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import { COSTUMES } from '../costumes';
import { JUMP_PUZZLES } from '../jumpPuzzles';
import { heightAt, SEA } from '../../world/terrain';
import type { RegionContent } from './types';

// The jumping puzzles' chests (data/jumpPuzzles.ts; world/sites.ts builds the climbs). The first time
// you reach the top: the outfit from its story, into the wardrobe when you use it, and the note left with
// it. After that, a few marks in the bottom of the chest, once a day: somebody keeps leaving them.

/** The top of a climb, where the chest stands (world/sites.ts buildPuzzle: the foot, plus its height). */
export const puzzleTop = (p: (typeof JUMP_PUZZLES)[number]) => (p.theme === 'selkie' ? SEA - 1 : heightAt(p.x, p.z)) + p.top;

const DAY = 20 * 60 * 60 * 1000;

const items: ItemDef[] = JUMP_PUZZLES.map((p): ItemDef => ({
  id: 'costume_' + p.costume, name: COSTUMES[p.costume].name, kind: 'collectible', rarity: 'epic', stack: false, value: 0,
  icon: { shape: 'chest', a: p.theme === 'fox' ? '#c8281e' : p.theme === 'ash' ? '#4a4c50' : p.theme === 'selkie' ? '#8a9098' : '#7a1e1a', b: '#d8a838' },
  costume: p.costume,
  desc: `Found at the top of ${p.name}. Use it to put it in your wardrobe for good.`,
  stats: 'An outfit, worn over your clothes and armour (looks only)',
}));

export const JUMP_PUZZLE_CONTENT: RegionContent = {
  id: 'jumpPuzzles', items,
  things: JUMP_PUZZLES.map((p) => ({
    // (beside the chest: the chest itself takes its cell)
    id: 'chest_' + p.id, x: Math.floor(p.x) + 1.5, z: Math.floor(p.z) + 0.5, y: puzzleTop(p), radius: 2.2,
    label: 'Open the chest',
    use: (g: GameApi) => {
      const key = 'jp:' + p.id;
      if (!g.flag(key)) {
        g.setFlag(key, Date.now());
        g.give('costume_' + p.costume);
        g.addMarks(250);
        g.toast(`At the top of ${p.name}, in a chest gone grey with weather: ${COSTUMES[p.costume].name}, and a note. "${p.note}"`);
        return;
      }
      const last = Number(g.flag(key + ':purse') ?? 0);
      if (Date.now() - last < DAY) { g.toast('The chest is empty. Whoever leaves the marks in it hasn\'t been back yet.'); return; }
      g.setFlag(key + ':purse', Date.now());
      g.addMarks(40);
      g.toast('A few marks in the bottom of the chest again. Somebody keeps leaving them, for whoever makes the climb.');
    },
  })),
};
