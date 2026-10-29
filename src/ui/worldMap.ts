import { landAt, LAND_NAMES, type LandId } from '../world/land';
import { PACKET_COURSE } from '../data/travel';
import { CALLIS_PACKET, MORROW_OX } from '../world/morrow';
import { WMAX } from '../world/VoxelWorld';

// The world map's World view: the whole known world on one sea, as WoW's map shows both its
// continents. Each land's chart is painted from its terrain at build time (npm run charts:
// public/maps/<land>.png, with its towns in <land>.json); here they're laid side by side, the
// Charter Counties to the west and Morrow over the sea to the east, with the lanes the ships keep:
// the Constant's course from Gullmouth to Callis (the one she really sails: data/travel.ts), and the
// island boat out to the isles.

interface LandChart { img: HTMLImageElement; ready: boolean; meta: { wmin: number; wsize: number; towns: { name: string; x: number; z: number }[] } | null }
const charts: Partial<Record<LandId, LandChart>> = {};
function chartOf(land: LandId, redraw: () => void): LandChart {
  let c = charts[land];
  if (c) return c;
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  const img = new Image();
  c = { img, ready: false, meta: null };
  charts[land] = c;
  img.onload = () => { c!.ready = true; redraw(); };
  img.src = `${base}maps/${land}.png`;
  fetch(`${base}maps/${land}.json`).then((r) => r.json()).then((m) => { c!.meta = m; redraw(); }).catch(() => {});
  return c;
}

/**
 * How each land's chart is cut and placed: the share of its square kept (left to right), and where it
 * goes in the world. Only open sea is cut: the Teeth, off the west end of the Keys, come within 2.4% of
 * Morrow's west edge, and the Counties' last land (the Sickle) within 1.5% of their cut.
 */
const CUT: Record<LandId, { u0: number; u1: number; at: number }> = {
  counties: { u0: 0, u1: 0.88, at: 0 },
  morrow: { u0: 0.01, u1: 1, at: 0.88 },
};
const WIDTH = 0.88 + 0.99;

/** The sea lanes' ends (world coordinates). */
const GULL: [number, number] = [1784, 600];
const CALLIS: [number, number] = [CALLIS_PACKET.x - 6, CALLIS_PACKET.z];
const ISLES: [string, number, number][] = [['The Mewstones', 2345, 728], ['Inkholm', 2486, 1647], ['Kell', 2363, -552], ['The Sickle', 3268, -1603]];

export interface WorldMapState { hover: { x: number; y: number } | null }

/** Draws the World view into the map's canvas; returns the names under the pointer for the tooltip. */
export function drawWorldMap(c: HTMLCanvasElement, dpr: number, me: { x: number; z: number } | null, hover: { x: number; y: number } | null, redraw: () => void): { x: number; y: number; name: string; sub: string }[] {
  const x = c.getContext('2d')!, cw = c.width, ch = c.height;
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.fillStyle = '#587c94';
  x.fillRect(0, 0, cw, ch);
  const S = Math.min((cw * 0.96) / WIDTH, ch * 0.96), ox = (cw - S * WIDTH) / 2, oy = (ch - S) / 2;
  const hits: { x: number; y: number; name: string; sub: string }[] = [];
  const px = (n: number) => Math.round(n * dpr);
  /** A point in a land's own coordinates, on the World view. */
  const at = (land: LandId, wx: number, wz: number): [number, number] => {
    const m = charts[land]?.meta, cut = CUT[land];
    const wmin = m?.wmin ?? -2304, wsize = m?.wsize ?? 6400;
    const u = (wx - wmin) / wsize, v = (wz - wmin) / wsize;
    return [ox + (cut.at + (u - cut.u0)) * S, oy + v * S];
  };
  /** A point in the one world, on whichever land's chart it falls (the empty sea between them is cut out). */
  const atWorld = (wx: number, wz: number): [number, number] => (wx < WMAX - 320 ? at('counties', wx, wz) : at('morrow', wx - MORROW_OX, wz));
  const label = (text: string, lx: number, ly: number, font: string, fill: string, halo = 'rgba(250, 242, 220, 0.85)', width = 4) => {
    x.font = font; x.lineJoin = 'round'; x.lineWidth = width * dpr; x.strokeStyle = halo; x.fillStyle = fill;
    x.strokeText(text, lx, ly); x.fillText(text, lx, ly);
  };
  for (const land of ['counties', 'morrow'] as LandId[]) {
    const ch_ = chartOf(land, redraw), cut = CUT[land];
    if (!ch_.ready) continue;
    const iw = ch_.img.naturalWidth, ih = ch_.img.naturalHeight;
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(ch_.img, cut.u0 * iw, 0, (cut.u1 - cut.u0) * iw, ih, ox + cut.at * S, oy, (cut.u1 - cut.u0) * S, S);
  }
  // Paper over it, and a vignette, like the survey map
  x.fillStyle = 'rgba(236, 222, 186, 0.22)';
  x.fillRect(0, 0, cw, ch);
  const vg = x.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.4, cw / 2, ch / 2, Math.max(cw, ch) * 0.75);
  vg.addColorStop(0, 'rgba(20, 14, 6, 0)'); vg.addColorStop(1, 'rgba(20, 14, 6, 0.4)');
  x.fillStyle = vg; x.fillRect(0, 0, cw, ch);
  x.textAlign = 'center'; x.textBaseline = 'middle';

  // The sea lanes: dashed, rounding each corner of the course
  const lane = (pts: [number, number][], color: string) => {
    x.save(); x.strokeStyle = color; x.lineWidth = px(2.5); x.setLineDash([px(8), px(6)]);
    x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) x.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
    x.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    x.stroke(); x.restore();
  };
  const g = atWorld(GULL[0], GULL[1]);
  if (charts.morrow?.ready && charts.counties?.ready) {
    // The Constant: south inside the Mewstones, across the open sea, up Morrow's east coast into Callis; her ship halfway
    const course = [g, ...PACKET_COURSE.map(([cx, cz]) => atWorld(cx, cz)), atWorld(CALLIS[0], CALLIS[1])];
    lane(course, 'rgba(243, 213, 138, 0.95)');
    const legs = course.slice(1).map((q, i) => Math.hypot(q[0] - course[i][0], q[1] - course[i][1]));
    let half = legs.reduce((a, b) => a + b, 0) / 2, k = 0;
    while (k < legs.length - 1 && half > legs[k]) half -= legs[k++];
    const f = half / Math.max(1e-6, legs[k]);
    const mid: [number, number] = [course[k][0] + (course[k + 1][0] - course[k][0]) * f, course[k][1] + (course[k + 1][1] - course[k][1]) * f];
    shipGlyph(x, mid[0], mid[1], dpr * 1.4);
    label('The Constant · a day and a night', mid[0], mid[1] + px(22), `700 ${px(14)}px "Alegreya", serif`, '#3a2408');
    hits.push({ x: mid[0], y: mid[1], name: 'The Constant', sub: 'Gullmouth to Callis: Hal Sennen, at either quay' });
    for (const [name, ix, iz] of ISLES) { const p = atWorld(ix, iz); lane([g, p], 'rgba(250, 242, 220, 0.75)'); hits.push({ x: p[0], y: p[1], name, sub: 'The island boat: Davey Penrose, Gullmouth' }); }
  }
  // The lands' names, and their towns
  for (const land of ['counties', 'morrow'] as LandId[]) {
    const m = charts[land]?.meta;
    const name = LAND_NAMES[land].toUpperCase();
    const c0 = at(land, land === 'counties' ? 1000 : 1100, land === 'counties' ? -300 : -1600);
    x.letterSpacing = px(6) + 'px';
    label(name, c0[0], c0[1], `700 ${px(Math.max(16, S / 26))}px "Alegreya Sans SC", "Alegreya", serif`, 'rgb(58, 36, 14)', 'rgba(250, 242, 220, 0.7)', 5);
    x.letterSpacing = '0px';
    for (const t of m?.towns ?? []) {
      const [tx, ty] = at(land, t.x, t.z);
      x.fillStyle = '#3a2408'; x.strokeStyle = 'rgba(250, 242, 220, 0.9)'; x.lineWidth = px(2);
      x.beginPath(); x.arc(tx, ty, px(4), 0, Math.PI * 2); x.fill(); x.stroke();
      if (S > 500 * dpr) label(t.name, tx, ty + px(14), `600 ${px(12)}px "Alegreya", serif`, '#2a1a0a');
      hits.push({ x: tx, y: ty, name: t.name, sub: LAND_NAMES[land] });
    }
  }
  // You
  if (me) {
    // (each land's chart is in its own frame: Morrow's as it was drawn, before it was set down east)
    const land = landAt(me.x), [mx, my] = at(land, me.x - (land === 'morrow' ? MORROW_OX : 0), me.z);
    x.fillStyle = '#fff6dc'; x.strokeStyle = '#0b1122'; x.lineWidth = px(3);
    x.beginPath(); x.arc(mx, my, px(7), 0, Math.PI * 2); x.stroke(); x.fill();
    label('You are here', mx, my - px(18), `700 ${px(13)}px "Alegreya Sans", sans-serif`, '#0b1122');
  }
  // The name under the pointer
  if (hover) {
    let best: (typeof hits)[number] | null = null, bd = px(16);
    for (const h of hits) { const d = Math.hypot(h.x - hover.x * dpr, h.y - hover.y * dpr); if (d < bd) { bd = d; best = h; } }
    if (best) {
      x.font = `700 ${px(15)}px "Alegreya", serif`;
      const w1 = x.measureText(best.name).width;
      x.font = `500 ${px(12)}px "Alegreya Sans", sans-serif`;
      const w = Math.max(w1, x.measureText(best.sub).width) + px(20);
      const bx = Math.min(cw - w - px(6), best.x + px(14)), by = Math.max(px(6), best.y - px(48));
      x.fillStyle = 'rgba(12, 18, 36, 0.95)'; x.strokeStyle = 'rgba(243, 213, 138, 0.6)'; x.lineWidth = px(1);
      x.beginPath(); x.roundRect(bx, by, w, px(42), px(6)); x.fill(); x.stroke();
      x.textAlign = 'left'; x.textBaseline = 'alphabetic';
      x.fillStyle = '#f3d58a'; x.font = `700 ${px(15)}px "Alegreya", serif`; x.fillText(best.name, bx + px(10), by + px(18));
      x.fillStyle = '#c8c2d4'; x.font = `500 ${px(12)}px "Alegreya Sans", sans-serif`; x.fillText(best.sub, bx + px(10), by + px(34));
    }
  }
  return hits;
}

function shipGlyph(x: CanvasRenderingContext2D, X: number, Y: number, k: number): void {
  x.save(); x.translate(X, Y); x.scale(k, k);
  x.fillStyle = '#4a3020'; x.strokeStyle = '#1e1208'; x.lineWidth = 1.5;
  x.beginPath(); x.moveTo(-11, 2); x.lineTo(11, 2); x.lineTo(7, 7); x.lineTo(-7, 7); x.closePath(); x.fill(); x.stroke();
  x.fillStyle = '#f4ecd8';
  x.beginPath(); x.moveTo(-1, 1); x.lineTo(-1, -12); x.lineTo(8, 0); x.closePath(); x.fill(); x.stroke();
  x.beginPath(); x.moveTo(-3, 1); x.lineTo(-3, -9); x.lineTo(-10, 0); x.closePath(); x.fill(); x.stroke();
  x.restore();
}
