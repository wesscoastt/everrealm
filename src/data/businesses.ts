import type { Appearance } from '../entities/humanoid';

// The trades out in the country, each a place of its own with a keeper, a shop and something you
// can't get anywhere else: two vineyards, a brewhouse with its oast and hop garden, a cheese dairy,
// a glasshouse, a bee garden and meadery, a smokehouse, a tannery and a whisky still in the Scarth.
// Where each stands was found by scripts/_sitebiz.ts (flat ground near a road, clear of everything
// else); world/sites.ts buildBusiness lays each out facing its road, a lane down to it and a sign
// where the lane meets it. Their people and shops are in data/content/businesses.ts.

export type BusinessKind = 'winery' | 'vinery' | 'brewery' | 'dairy' | 'glass' | 'meadery' | 'smokehouse' | 'tannery' | 'distillery';
export type Face = 'n' | 's' | 'e' | 'w';

export interface BusinessDef {
  id: string;
  name: string;
  kind: BusinessKind;
  x: number;
  z: number;
  /** Which way the place fronts: toward its road. */
  face: Face;
  keeper: { id: string; name: string; title: string; look: Appearance };
}

/**
 * Each kind's shop in the place's own frame (u across, v toward the road): its middle, width (across)
 * and depth (toward the road), storeys and roof. The keeper stands out in front of its door.
 */
export const SHOP_PLAN: Record<BusinessKind, { u: number; v: number; w: number; d: number; floors: number; roof: 'red' | 'slate' | 'thatch' | 'blue' }> = {
  winery: { u: 0, v: 8, w: 9, d: 7, floors: 2, roof: 'red' },
  vinery: { u: 0, v: 6, w: 7, d: 6, floors: 1, roof: 'thatch' },
  brewery: { u: 8, v: 9, w: 8, d: 6, floors: 1, roof: 'red' },
  dairy: { u: 0, v: 6, w: 8, d: 6, floors: 2, roof: 'thatch' },
  glass: { u: -11, v: 6, w: 7, d: 6, floors: 1, roof: 'slate' },
  meadery: { u: 0, v: 6, w: 7, d: 6, floors: 1, roof: 'thatch' },
  smokehouse: { u: 6, v: 8, w: 6, d: 5, floors: 1, roof: 'thatch' },
  tannery: { u: 8, v: 8, w: 6, d: 5, floors: 1, roof: 'red' },
  distillery: { u: 9, v: 9, w: 6, d: 5, floors: 1, roof: 'slate' },
};

const FACE_V: Record<Face, [number, number]> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
/** A point in a place's own frame (u across, v toward its road) in the world. */
export function bizAt(b: BusinessDef, u: number, v: number): [number, number] {
  const [fx, fz] = FACE_V[b.face], rx = -fz, rz = fx;
  return [b.x + rx * u + fx * v, b.z + rz * u + fz * v];
}
/** Where the keeper stands, and the point they face (down the lane). */
export function keeperSpot(b: BusinessDef): { at: [number, number]; face: [number, number] } {
  const S = SHOP_PLAN[b.kind];
  const at = bizAt(b, S.u + 2.2, S.v + S.d / 2 + 1.4), face = bizAt(b, S.u + 2.2, S.v + S.d / 2 + 6);
  return { at: [at[0] + 0.5, at[1] + 0.5], face };
}

const L = (skin: string, hair: string, hairStyle: number, tunic: string, trim: string, extra: Partial<Appearance> = {}): Appearance =>
  ({ skin, hair, hairStyle, eyes: '#4a3a2a', tunic, trim, trousers: '#3a3028', boots: '#2a1e14', ...extra } as Appearance);

export const BUSINESSES: BusinessDef[] = [
  { id: 'corlett', name: 'Corlett\'s Vineyard', kind: 'winery', x: 680, z: 673, face: 'e', keeper: { id: 'biz_hester', name: 'Hester Corlett', title: 'Vintner', look: L('#e2b894', '#6a4a2a', 2, '#5a1a2a', '#c8a050', { lashes: true, age: 0.55, apron: true }) } },
  { id: 'fallowhill', name: 'Fallow Hill', kind: 'vinery', x: 1340, z: 427, face: 'w', keeper: { id: 'biz_simeon', name: 'Simeon Gale', title: 'Winemaker', look: L('#c89a78', '#8a847c', 1, '#6a7a3a', '#3a2a1c', { beard: true, age: 0.7 }) } },
  { id: 'garrow', name: 'Garrow\'s Brewhouse', kind: 'brewery', x: 742, z: 790, face: 'n', keeper: { id: 'biz_ned', name: 'Ned Garrow', title: 'Brewer', look: L('#d8a888', '#a8562a', 3, '#7a5a2a', '#3a2a1c', { beard: true, build: 1.2, apron: true, age: 0.45 }) } },
  { id: 'mardle', name: 'Mardle Dairy', kind: 'dairy', x: 1028, z: 289, face: 's', keeper: { id: 'biz_ruth', name: 'Ruth Mardle', title: 'Cheesemaker', look: L('#f0d0b8', '#c8a060', 2, '#e8e0d0', '#3f6a8a', { lashes: true, apron: true, age: 0.35 }) } },
  { id: 'wren', name: 'Wren\'s Glasshouse', kind: 'glass', x: 1240, z: 944, face: 'n', keeper: { id: 'biz_tobias', name: 'Tobias Wren', title: 'Glassblower', look: L('#c88a62', '#2a1e16', 1, '#3a3a40', '#a87a3a', { apron: true, age: 0.5 }) } },
  { id: 'pruett', name: 'Pruett\'s Bee Garden', kind: 'meadery', x: 261, z: 695, face: 'e', keeper: { id: 'biz_agnes', name: 'Agnes Pruett', title: 'Beekeeper', look: L('#e8c0a0', '#e8e0d0', 2, '#c8a03a', '#3a2a1c', { lashes: true, age: 0.8, hat: 'straw' }) } },
  { id: 'brock', name: 'Brock\'s Smokehouse', kind: 'smokehouse', x: 1630, z: 681, face: 'n', keeper: { id: 'biz_silas', name: 'Silas Brock', title: 'Smoker', look: L('#b8865e', '#3a2a1a', 3, '#2a3a4a', '#8a6a3a', { beard: true, build: 1.1, age: 0.6 }) } },
  { id: 'dunmore', name: 'Dunmore Tannery', kind: 'tannery', x: 1184, z: 358, face: 's', keeper: { id: 'biz_abel', name: 'Abel Dunmore', title: 'Tanner', look: L('#a87a58', '#1e1610', 3, '#5a3a24', '#2a1e14', { apron: true, build: 1.05, age: 0.4 }) } },
  { id: 'keir', name: 'Keir\'s Still', kind: 'distillery', x: 878, z: 1799, face: 'n', keeper: { id: 'biz_morag', name: 'Morag Keir', title: 'Distiller', look: L('#f0d0b8', '#8a2a1a', 2, '#3a4a3a', '#a83a2a', { lashes: true, age: 0.5, cape: '#2a3a2a' }) } },
];
