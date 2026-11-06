import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';

// The stage under the east wall (owner 2026-11-06: "there's a covered stage near the market, add benches in front
// for people to sit and watch; a band plays music there time to time"; Minecraft -591, 69, 788). The owner's
// stage, its roof put back (the slabs it was made of didn't come through), benches in rows on the paving before
// it and lamps at its corners where the old add-on's lamp posts stood; and the Harbour Band, who play a set at
// noon and another of an evening, and the rest of the day sit on the edge of the stage arguing about the last one.

/** The stage's roof, the benches facing it, the lamps (world/sites.ts 'ver-stage'). */
export const STAGE_PROPS: { t: 'roof' | 'bench' | 'lantern'; x: number; y: number; z: number; ry?: number; len?: number; span?: number; mat?: string; open?: boolean }[] = [
  { t: 'roof', x: -2866, y: 26.6, z: 2044.5, len: 10.6, span: 5.6, ry: 0, mat: 'slate', open: true },
  ...[-2869.5, -2866.5, -2863.5].flatMap((x) => [2035.5, 2037.5].map((z) => ({ t: 'bench' as const, x, y: 23, z, ry: 0 }))),
  { t: 'lantern', x: -2871.5, y: 23, z: 2033.5 }, { t: 'lantern', x: -2861.5, y: 23, z: 2033.5 },
  { t: 'lantern', x: -2871.5, y: 23, z: 2039.5 }, { t: 'lantern', x: -2861.5, y: 23, z: 2039.5 },
];

const SETS = ['ladyday', 'wendwater', 'haulholmsey', 'fourteenewes', 'calling'];
type Part = 'lead' | 'harmony' | 'bass' | 'drum';
const player = (id: string, name: string, title: string, item: string, part: Part, at: [number, number], rest: [number, number], look: NpcDef['look'], barks: string[]): NpcDef => {
  const play = { at, face: [at[0], 2036] as [number, number], anim: 'perform' as const, y: 25, held: item, play: { tunes: SETS, part } };
  const off = { at: rest, face: [rest[0], 2036] as [number, number], anim: 'idle' as const, y: 23 };
  return { id, name, title, look, barks, schedule: [
    { from: 12, to: 14, ...play }, { from: 18, to: 21.5, ...play },
    { from: 21.5, to: 12, ...off }, { from: 14, to: 18, ...off },
  ] };
};

const npcs: NpcDef[] = [
  player('ver_band_merryn', 'Merryn Tregunna', 'Fiddle, the Harbour Band', 'inst_fiddle', 'lead', [-2868.5, 2044.5], [-2870.5, 2041.5],
    { frame: 'f', skin: '#e2b894', hair: '#a84a22', hairStyle: 1, eyes: '#4a6a3a', tunic: '#22365a', trim: '#d8b04a', shirt: '#e8e0d0', trousers: '#2a2620', boots: '#1e1a16', lashes: true, age: 0.3 },
    ['Again from the top. No, the other top.', 'If you’re going to dance, dance in time.']),
  player('ver_band_ned', 'Jory Hambly', 'Drum, the Harbour Band', 'inst_drum', 'drum', [-2866.5, 2045.5], [-2865.5, 2041.5],
    { skin: '#c88a62', hair: '#1e1a16', hairStyle: 3, facial: 2, eyes: '#3a2a1e', tunic: '#5a2a24', trim: '#d8b04a', shirt: '#d8ccb0', trousers: '#2a2620', boots: '#1e1a16', build: 1.2 },
    ['Four beats a bar. Merryn counts five.', 'Played the Mermaid till two last night. Don’t ask me anything hard.']),
  player('ver_band_eseld', 'Eseld Curnow', 'Hurdy-gurdy, the Harbour Band', 'inst_gurdy', 'harmony', [-2864.5, 2044.5], [-2862.5, 2041.5],
    { frame: 'f', skin: '#d8a888', hair: '#3a2a1e', hairStyle: 5, eyes: '#3a4a5a', tunic: '#4a3a5a', trim: '#e8dcc0', shirt: '#e8e0d0', trousers: '#2a2620', boots: '#1e1a16', lashes: true, age: 0.4 },
    ['Bennet at the dairy is my brother. He can’t hold a tune in a bucket.', 'Noon and evening, rain or shine. Well. Not in rain.']),
];

export const VERANDAH_STAGE: RegionContent = { id: 'verandahStage', npcs };
