import type { ItemDef } from './items';

// The look of a garden (docs/briefs/farming-cozy.md, "a garden that's pretty, the way cozy games' farms are a
// picture"; owner 2026-11-14: "farming and gardening should be in depth like cozy games"). Paths, fences and gates,
// a trellis, a bench, a lantern post, a bird bath, flower tubs and a rose arch, bought from Bertram and laid out in
// your own yard a piece at a time. Use one from your bag to start laying it; fences join up to their neighbours.
// The laying and drawing are game/HomeFarm.ts.

export type DecorKind = 'path_flags' | 'path_brick' | 'path_gravel' | 'fence_paling' | 'fence_hurdle' | 'gate' | 'trellis' | 'bench' | 'lantern' | 'birdbath' | 'tub' | 'arch';
export const DECOR: Record<DecorKind, { item: string; name: string; price: number; desc: string; stats: string; a: string; b: string }> = {
  path_flags: { item: 'decor_path_flags', name: 'Stone flags', price: 4, a: '#a8a49a', b: '#6a665e', desc: 'Squared river stone, three to a tile, the edges softened by somebody else\'s boots.', stats: 'A tile of path for your yard.' },
  path_brick: { item: 'decor_path_brick', name: 'Brick paving', price: 5, a: '#a85a3a', b: '#6a3a24', desc: 'Old red brick laid herringbone. Bertram had them off a wall that fell down, which he says is not the same as taking them.', stats: 'A tile of path for your yard.' },
  path_gravel: { item: 'decor_path_gravel', name: 'Gravel', price: 2, a: '#c8bca0', b: '#8a8070', desc: 'A sack of pea gravel. It crunches, which is half the point of it.', stats: 'A tile of path for your yard.' },
  fence_paling: { item: 'decor_fence_paling', name: 'White paling fence', price: 8, a: '#ece6d6', b: '#8a8070', desc: 'Pointed palings on two rails, painted white. It keeps nothing out, but it looks like it would.', stats: 'A length of fence for your yard. Joins up to the fences and gates beside it.' },
  fence_hurdle: { item: 'decor_fence_hurdle', name: 'Wattle hurdle', price: 6, a: '#8a6a3a', b: '#5a4024', desc: 'Hazel woven between stakes, the way the downs men make them for the sheep.', stats: 'A length of fence for your yard. Joins up to the fences and gates beside it.' },
  gate: { item: 'decor_gate', name: 'Garden gate', price: 20, a: '#ece6d6', b: '#5a4024', desc: 'A little gate on a latch, with a heart cut in the top rail by whoever made it.', stats: 'A gate in your fence. Laid facing the way you face.' },
  trellis: { item: 'decor_trellis', name: 'Trellis', price: 18, a: '#8a6a3a', b: '#4a7a32', desc: 'A ladder of split ash, criss-crossed, on two posts.', stats: 'For your yard. Peas, beans and hops growing beside it climb it and bear a little more.' },
  bench: { item: 'decor_bench', name: 'Garden bench', price: 45, a: '#6a4a2a', b: '#3a2a1a', desc: 'Oak slats on iron ends. For sitting on in the evening and admiring the leeks.', stats: 'For your yard. Laid facing away from you, so it looks at what you were looking at.' },
  lantern: { item: 'decor_lantern', name: 'Lantern post', price: 35, a: '#2a2a2a', b: '#f0c060', desc: 'A black iron post with a glazed lantern on a hook. Lit at dusk, if you believe Bertram, by nobody in particular.', stats: 'For your yard: a light by the beds.' },
  birdbath: { item: 'decor_birdbath', name: 'Bird bath', price: 30, a: '#b8b4aa', b: '#6a9aba', desc: 'A stone dish on a pedestal. The sparrows argue over it every morning.', stats: 'For your yard.' },
  tub: { item: 'decor_tub', name: 'Flower tub', price: 16, a: '#8a5a32', b: '#d8402a', desc: 'Half a barrel, planted up with whatever was flowering when Bertram did it.', stats: 'For your yard: colour by the door.' },
  arch: { item: 'decor_arch', name: 'Rose arch', price: 70, a: '#3a3a3a', b: '#c8304a', desc: 'An iron hoop over a path, a climbing rose already halfway up it.', stats: 'For your yard, over a path. Laid facing the way you face.' },
};
export const DECOR_OF_ITEM: Record<string, DecorKind> = Object.fromEntries(Object.entries(DECOR).map(([k, d]) => [d.item, k as DecorKind]));
export const isFence = (k: DecorKind) => k === 'fence_paling' || k === 'fence_hurdle' || k === 'gate';
export const isPath = (k: DecorKind) => k === 'path_flags' || k === 'path_brick' || k === 'path_gravel';

export const DECOR_ITEMS: ItemDef[] = Object.values(DECOR).map((d) => ({
  id: d.item, name: d.name, kind: 'collectible', rarity: 'common', stack: true, value: Math.max(1, Math.round(d.price / 2)),
  icon: { shape: 'chest', a: d.a, b: d.b }, desc: d.desc, stats: `${d.stats} Use it from your bag to start laying it, then face where it goes and press E.`,
}));
