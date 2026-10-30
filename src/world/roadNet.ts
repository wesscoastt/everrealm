import { POST_LEGS } from '../data/postLegs';
import { WORLD_ROADS } from './terrain';

// The Charter's roads as one network for the post carts (game/PostRide.ts): the roads themselves and
// the town legs between them and the post signs (data/postLegs.ts), joined where they meet, and the
// shortest way along it between two places.

type Pt = [number, number];
const SPEED = 11;

/** The roads and the town legs as one network: each line's points in order, joined where lines meet. */
export class RoadNet {
  readonly pts: Pt[] = [];
  private readonly adj: { to: number; d: number }[][] = [];

  constructor(lines: Pt[][]) {
    const node = (p: Pt) => { this.pts.push(p); this.adj.push([]); return this.pts.length - 1; };
    const link = (a: number, b: number) => {
      const d = Math.hypot(this.pts[a][0] - this.pts[b][0], this.pts[a][1] - this.pts[b][1]);
      this.adj[a].push({ to: b, d }); this.adj[b].push({ to: a, d });
    };
    const ids = lines.map((l) => l.map(node));
    // Where a line's end meets another line: a node on that line's segment there
    const splits = new Map<string, { t: number; n: number }[]>();
    lines.forEach((l, i) => {
      for (const e of l.length > 1 ? [0, l.length - 1] : [0]) {
        const p = l[e];
        let best: { j: number; k: number; t: number; d: number } | null = null;
        lines.forEach((m, j) => {
          if (j === i) return;
          for (let k = 0; k + 1 < m.length; k++) {
            const a = m[k], b = m[k + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz || 1;
            const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L));
            const d = Math.hypot(a[0] + dx * t - p[0], a[1] + dz * t - p[1]);
            if (d < 12 && (!best || d < best.d)) best = { j, k, t, d };
          }
          if (m.length === 1) { const d = Math.hypot(m[0][0] - p[0], m[0][1] - p[1]); if (d < 12 && (!best || d < best.d)) best = { j, k: -1, t: 0, d }; }
        });
        if (!best) continue;
        const { j, k, t } = best as { j: number; k: number; t: number };
        if (k < 0) { link(ids[i][e], ids[j][0]); continue; }
        const a = lines[j][k], b = lines[j][k + 1];
        const n = node([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        link(ids[i][e], n);
        const key = j + ':' + k;
        if (!splits.has(key)) splits.set(key, []);
        splits.get(key)!.push({ t, n });
      }
    });
    lines.forEach((l, j) => {
      for (let k = 0; k + 1 < l.length; k++) {
        const chain = [ids[j][k], ...(splits.get(j + ':' + k) ?? []).sort((p, q) => p.t - q.t).map((s) => s.n), ids[j][k + 1]];
        for (let c = 0; c + 1 < chain.length; c++) link(chain[c], chain[c + 1]);
      }
    });
  }

  private nearest(x: number, z: number): { n: number; d: number } {
    let n = -1, d = Infinity;
    this.pts.forEach((p, i) => { const e = Math.hypot(p[0] - x, p[1] - z); if (e < d) { d = e; n = i; } });
    return { n, d };
  }

  /** The network's point nearest a place, and how far off it is. */
  near(x: number, z: number): { p: Pt; d: number } { const { n, d } = this.nearest(x, z); return { p: this.pts[n], d }; }

  /** The way along the network from one place to another (each within a few blocks of it), or null. */
  route(from: Pt, to: Pt): Pt[] | null {
    const a = this.nearest(from[0], from[1]), b = this.nearest(to[0], to[1]);
    if (a.d > 8 || b.d > 8) return null;
    const dist = new Float64Array(this.pts.length).fill(Infinity), prev = new Int32Array(this.pts.length).fill(-1), done = new Uint8Array(this.pts.length);
    dist[a.n] = 0;
    for (;;) {
      let u = -1, du = Infinity;
      for (let i = 0; i < dist.length; i++) if (!done[i] && dist[i] < du) { du = dist[i]; u = i; }
      if (u < 0 || u === b.n) break;
      done[u] = 1;
      for (const e of this.adj[u]) if (du + e.d < dist[e.to]) { dist[e.to] = du + e.d; prev[e.to] = u; }
    }
    if (!isFinite(dist[b.n])) return null;
    const out: Pt[] = [];
    for (let u = b.n; u >= 0; u = prev[u]) out.push(this.pts[u]);
    out.reverse();
    out.unshift(from);
    out.push(to);
    // (no doubled points: a turn on the spot)
    const way = out.filter((p, i) => i === 0 || Math.hypot(p[0] - out[i - 1][0], p[1] - out[i - 1][1]) > 0.3);
    return unspike(way);
  }
}

/**
 * A way with its doubling-back taken out. Where a town leg ends a few blocks past the road it meets, or the
 * nearest point of the network lies behind a post sign, the shortest way runs out to the end and back:
 * the carter drives up, turns round and comes back. A point the way turns back on itself at (sharper than
 * about a hundred degrees) is dropped, so she takes the corner, until none is left.
 */
function unspike(way: Pt[]): Pt[] {
  const w = way.slice();
  for (let changed = true, guard = 0; changed && guard < 200; guard++) {
    changed = false;
    for (let i = 1; i + 1 < w.length; i++) {
      const ax = w[i][0] - w[i - 1][0], az = w[i][1] - w[i - 1][1], bx = w[i + 1][0] - w[i][0], bz = w[i + 1][1] - w[i][1];
      const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
      if (la < 0.01 || lb < 0.01 || (ax * bx + az * bz) / (la * lb) < -0.2) { w.splice(i, 1); changed = true; break; }
    }
  }
  return w;
}

let net: RoadNet | null = null;
/** This land's road network (built once, when first wanted). */
export function roadNet(): RoadNet {
  return (net ??= new RoadNet([...(WORLD_ROADS as Pt[][]), ...POST_LEGS]));
}

/** The length of a way, in blocks. */
export function wayLength(w: Pt[]): number {
  let L = 0;
  for (let i = 1; i < w.length; i++) L += Math.hypot(w[i][0] - w[i - 1][0], w[i][1] - w[i - 1][1]);
  return L;
}
/** Minutes on the cart for a way that long. */
export const rideMinutes = (len: number): number => Math.max(1, Math.round(len / SPEED / 60 + 0.2));

