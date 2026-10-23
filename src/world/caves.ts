import { B } from './blocks';
import { hash2 } from './noise';
import type { PropDesc } from './sites';

// Caves for the group dungeons: rock that looks dug or worn, not boxes. Chambers are domed, their
// walls pushed in and out by noise, with pillars of living rock left standing; tunnels wind between
// them, natural (round-roofed) or a mine's (square, with timber sets). The rock is laid in strata,
// spikes hang from high roofs, rubble lies along the walls. Everything carved is remembered, so the
// walls are painted only where open space meets rock, and a corridor never ends in a painted wall.
// Floors can sit at different heights (a ramp is a tunnel whose ends differ), and the site check
// (npm run sites) walks every dungeon to prove it can still be crossed.

export interface CaveTheme {
  /** The rock, in strata: the main stone, a second, and a thin band now and then. */
  wall: number; wall2: number; band: number;
  floor: number; floor2: number;
  /** What hangs from a high roof (spikes), and what lies along the walls (rubble). */
  spike: number; rubble: number;
  /** The colour of the lamps' light. */
  light: string;
}

interface Setter { set(x: number, y: number, z: number, id: number): void }

/** A smooth wobble round a circle (for a chamber's outline): a few sines with seeded phases. */
function wobble(a: number, seed: number): number {
  const p = (k: number) => hash2(seed, k, 711) * Math.PI * 2;
  return 0.55 * Math.sin(a * 3 + p(1)) + 0.3 * Math.sin(a * 5 + p(2)) + 0.15 * Math.sin(a * 9 + p(3));
}

export function caveKit(O: Setter, props: PropDesc[], OX: number, OZ: number, F: number) {
  /** Open cells (world coords), and which theme each column belongs to. */
  const open = new Set<string>();
  const theme = new Map<string, CaveTheme>();
  /** The floor of each open column (its lowest open cell), for spikes and rubble. */
  const floorOf = new Map<string, number>();
  const ceilOf = new Map<string, number>();
  const solid = new Set<string>(); // cells kept as rock inside a chamber (pillars), never opened
  const ck = (x: number, z: number) => x + ',' + z;
  const k3 = (x: number, y: number, z: number) => x + ',' + y + ',' + z;

  const openCell = (X: number, y: number, Z: number, th: CaveTheme) => {
    if (solid.has(k3(X, y, Z))) return;
    open.add(k3(X, y, Z));
    const c = ck(X, Z);
    if (!theme.has(c)) theme.set(c, th);
    floorOf.set(c, Math.min(floorOf.get(c) ?? 1e9, y));
    ceilOf.set(c, Math.max(ceilOf.get(c) ?? -1e9, y));
  };

  /**
   * A chamber: an ellipse rx by rz round (x, z), its outline pushed in and out, domed to h at the
   * middle. Pillars of living rock ([x, z, r]) stand floor to roof. f: its floor (default F).
   */
  const chamber = (x: number, z: number, rx: number, rz: number, h: number, th: CaveTheme, opt: { f?: number; pillars?: [number, number, number][]; seed?: number } = {}) => {
    const f = opt.f ?? F, seed = opt.seed ?? Math.round(x * 31 + z * 17);
    for (const [px, pz, pr] of opt.pillars ?? []) {
      for (let dx = -Math.ceil(pr) - 2; dx <= Math.ceil(pr) + 2; dx++) for (let dz = -Math.ceil(pr) - 2; dz <= Math.ceil(pr) + 2; dz++) {
        for (let y = f; y < f + h + 2; y++) {
          // Thicker at the foot and the roof, waisted between
          const mid = f + h / 2, waist = 1 + 0.45 * Math.abs(y - mid) / (h / 2);
          const n = (hash2(OX + px + dx, y * 7 + OZ + pz + dz, 713) - 0.5) * 0.5;
          if (Math.hypot(dx, dz) < pr * waist + n) solid.add(k3(OX + px + dx, y, OZ + pz + dz));
        }
      }
    }
    for (let dx = -Math.ceil(rx * 1.35); dx <= Math.ceil(rx * 1.35); dx++) for (let dz = -Math.ceil(rz * 1.35); dz <= Math.ceil(rz * 1.35); dz++) {
      const a = Math.atan2(dz / rz, dx / rx);
      const d = Math.hypot(dx / rx, dz / rz) / (1 + 0.16 * wobble(a, seed));
      if (d >= 1) continue;
      const X = OX + x + dx, Z = OZ + z + dz;
      const roof = Math.max(4, Math.round(h * (1 - 0.62 * d * d) + (hash2(X, Z, 715) - 0.5) * 1.6));
      for (let y = f; y < f + roof; y++) openCell(X, y, Z, th);
    }
  };

  /**
   * A tunnel through these points ([x, z] or [x, z, floor]), w wide and h high. Natural ones wind a
   * little and have round roofs; a mine's is square, with timber sets every few blocks. The floor
   * runs straight between the points' floors, so a tunnel can be a ramp.
   */
  const tunnel = (pts: ([number, number] | [number, number, number])[], w: number, h: number, th: CaveTheme, opt: { mine?: boolean; seed?: number } = {}) => {
    const seed = opt.seed ?? Math.round(pts[0][0] * 13 + pts[0][1] * 7);
    let along = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, az, af = F] = pts[i], [bx, bz, bf = F] = pts[i + 1];
      const len = Math.hypot(bx - ax, bz - az), steps = Math.max(1, Math.ceil(len * 2));
      const nx = -(bz - az) / (len || 1), nz = (bx - ax) / (len || 1);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const sway = opt.mine ? 0 : Math.sin((along + t * len) * 0.35 + seed) * 0.8;
        const cx = ax + (bx - ax) * t + nx * sway, cz = az + (bz - az) * t + nz * sway;
        const f = Math.round(af + (bf - af) * t);
        const half = w / 2;
        for (let dx = -Math.ceil(half) - 1; dx <= Math.ceil(half) + 1; dx++) for (let dz = -Math.ceil(half) - 1; dz <= Math.ceil(half) + 1; dz++) {
          const X = Math.round(OX + cx + dx), Z = Math.round(OZ + cz + dz);
          const off = Math.abs(dx * nx + dz * nz); // across the tunnel
          const r = opt.mine ? half : half + (hash2(X, Z, 717) - 0.5) * 0.6;
          if (Math.hypot(OX + cx - X, OZ + cz - Z) > r + 0.25) continue;
          const roof = opt.mine ? h : Math.max(3, Math.round(h - (off / half) * 1.4));
          for (let y = f; y < f + roof; y++) openCell(X, y, Z, th);
        }
        // Timber sets in a mine: two posts and a cap, every four blocks
        if (opt.mine && Math.round((along + t * len) * 2) % 8 === 0) sets.push({ x: OX + cx, z: OZ + cz, nx, nz, f, w, h });
      }
      along += len;
    }
  };
  const sets: { x: number; z: number; nx: number; nz: number; f: number; w: number; h: number }[] = [];

  /** A pit across the way (a flooded shaft, a crack), depth deep, with water in the bottom if wet. */
  const pits: { x0: number; z0: number; x1: number; z1: number; depth: number; wet: boolean }[] = [];
  const pit = (x0: number, z0: number, x1: number, z1: number, depth: number, wet: boolean) => pits.push({ x0: OX + x0, z0: OZ + z0, x1: OX + x1, z1: OZ + z1, depth, wet });
  /** A plank bridge from (ax, az) to (bx, bz), w wide, laid at the floor. */
  const bridges: { ax: number; az: number; bx: number; bz: number; w: number; f: number }[] = [];
  const bridge = (ax: number, az: number, bx: number, bz: number, w = 3, f = F) => bridges.push({ ax: OX + ax, az: OZ + az, bx: OX + bx, bz: OZ + bz, w, f });
  /** A pool sunk a block into the floor (wading water) round (x, z). */
  const pools: { x: number; z: number; r: number }[] = [];
  const pool = (x: number, z: number, r: number) => pools.push({ x: OX + x, z: OZ + z, r });

  /** A lamp on the nearest wall to (x, z), at about head height, facing into the room. */
  const lamps: { x: number; z: number; f: number }[] = [];
  const lamp = (x: number, z: number, f = F) => lamps.push({ x: OX + x, z: OZ + z, f });
  /** A soft light hanging in the air (no fitting). */
  const glow = (x: number, z: number, y: number, r: number, color: string, lit = false) => props.push({ t: 'glow', x: OX + x + 0.5, y, z: OZ + z + 0.5, r, color, lit });

  const isOpen = (X: number, y: number, Z: number) => open.has(k3(X, y, Z));

  /** Paint the rock where open meets solid, hang spikes, scatter rubble, cut pits and lay bridges and lamps. */
  const finish = (opt: { spikes?: number; rubble?: number } = {}) => {
    const spikes = opt.spikes ?? 0.05, rubble = opt.rubble ?? 0.1;
    const rock = (th: CaveTheme, X: number, y: number, Z: number) => {
      // Strata: bands three or four high that wander a little, and a thin band of the third now and then
      const b = y + Math.floor(hash2(Math.floor(X / 6), Math.floor(Z / 6), 721) * 3);
      // The thin band shows only in broken veins, never a stripe all the way round
      if (b % 7 === 0 && hash2(X >> 2, (Z >> 2) + y * 3, 722) < 0.4) return th.band;
      return Math.floor(b / 3.5) % 2 ? th.wall2 : (hash2(X * 3 + y, Z, 723) < 0.18 ? th.wall2 : th.wall);
    };
    for (const key of open) {
      const [X, y, Z] = key.split(',').map(Number);
      const th = theme.get(ck(X, Z))!;
      O.set(X, y, Z, B.Air);
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]] as const) {
        const nX = X + dx, ny = y + dy, nZ = Z + dz;
        if (open.has(k3(nX, ny, nZ))) continue;
        // The second floor lies in patches (coarse noise with finer edges), not as single blocks
        if (dy === -1) O.set(nX, ny, nZ, (hash2(nX >> 2, nZ >> 2, 725) + hash2(nX >> 1, nZ >> 1, 726) * 0.6 + hash2(nX, nZ, 724) * 0.3) / 1.9 > 0.62 ? th.floor2 : th.floor);
        else O.set(nX, ny, nZ, rock(th, nX, ny, nZ));
      }
    }
    // Spikes from high roofs (never over a floor someone has to walk under at less than four clear)
    for (const [c, top] of ceilOf) {
      const [X, Z] = c.split(',').map(Number);
      const f = floorOf.get(c)!, th = theme.get(c)!;
      if (top - f < 7 || hash2(X, Z, 727) > spikes) continue;
      const n = 1 + Math.floor(hash2(X, Z, 729) * 3);
      for (let i = 0; i < n; i++) { O.set(X, top - i, Z, th.spike); open.delete(k3(X, top - i, Z)); }
    }
    // Rubble along the walls: a block of loose stone where a floor cell has rock on two sides
    for (const [c, f] of floorOf) {
      const [X, Z] = c.split(',').map(Number);
      const th = theme.get(c)!;
      let rockSides = 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!isOpen(X + dx, f, Z + dz)) rockSides++;
      if (rockSides >= 2 && hash2(X, Z, 731) < rubble) O.set(X, f, Z, th.rubble);
    }
    // Pits, then the bridges over them
    for (const p of pits) for (let X = p.x0; X <= p.x1; X++) for (let Z = p.z0; Z <= p.z1; Z++) {
      const f = floorOf.get(ck(X, Z)) ?? F;
      for (let y = f - p.depth; y < f; y++) O.set(X, y, Z, p.wet && y < f - p.depth + 2 ? B.Water : B.Air);
      O.set(X, f - p.depth - 1, Z, B.Gravel);
      // Wall the pit's sides where they meet rock below the floor
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nX = X + dx, nZ = Z + dz;
        if (nX >= p.x0 && nX <= p.x1 && nZ >= p.z0 && nZ <= p.z1) continue;
        const th = theme.get(ck(X, Z));
        if (th) for (let y = f - p.depth; y < f; y++) O.set(nX, y, nZ, rock(th, nX, y, nZ));
      }
    }
    for (const b of bridges) {
      const len = Math.hypot(b.bx - b.ax, b.bz - b.az), steps = Math.ceil(len * 2);
      const nx = -(b.bz - b.az) / len, nz = (b.bx - b.ax) / len;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps, cx = b.ax + (b.bx - b.ax) * t, cz = b.az + (b.bz - b.az) * t;
        for (let k = -(b.w - 1) / 2; k <= (b.w - 1) / 2; k++) O.set(Math.round(cx + nx * k), b.f - 1, Math.round(cz + nz * k), B.Planks);
      }
      // Rope rails along both sides
      for (const side of [-1, 1]) {
        const ox = nx * ((b.w + 1) / 2) * side, oz = nz * ((b.w + 1) / 2) * side;
        props.push({ t: 'rope', x: b.ax + ox + 0.5, y: b.f + 1.1, z: b.az + oz + 0.5, ry: Math.atan2(-(b.bz - b.az), b.bx - b.ax), len, h: 0, r: 0.35 });
      }
    }
    for (const p of pools) for (let X = Math.floor(p.x - p.r); X <= Math.ceil(p.x + p.r); X++) for (let Z = Math.floor(p.z - p.r); Z <= Math.ceil(p.z + p.r); Z++) {
      if (Math.hypot(X - p.x, Z - p.z) > p.r + (hash2(X, Z, 733) - 0.5) * 0.8) continue;
      const f = floorOf.get(ck(X, Z));
      if (f === undefined) continue;
      O.set(X, f - 1, Z, B.Water); O.set(X, f - 2, Z, B.Gravel);
    }
    // Timber sets in the mine drifts
    for (const st of sets) {
      const half = Math.floor(st.w / 2);
      for (const side of [-half, half]) {
        const X = Math.round(st.x + st.nx * side), Z = Math.round(st.z + st.nz * side);
        for (let y = st.f; y < st.f + st.h; y++) O.set(X, y, Z, B.Timber);
      }
      for (let k = -half; k <= half; k++) O.set(Math.round(st.x + st.nx * k), st.f + st.h - 1, Math.round(st.z + st.nz * k), B.Timber);
    }
    // Lamps: on the nearest rock within six blocks of the spot, at head height
    for (const l of lamps) {
      const X = Math.round(l.x), Z = Math.round(l.z), y = l.f + 2;
      let best: { x: number; z: number; ry: number; d: number } | null = null;
      for (const [dx, dz, ry] of [[1, 0, -Math.PI / 2], [-1, 0, Math.PI / 2], [0, 1, Math.PI], [0, -1, 0]] as const) {
        for (let d = 0; d < 7; d++) {
          const cx = X + dx * d, cz = Z + dz * d;
          if (!isOpen(cx, y, cz)) break;
          if (!isOpen(cx + dx, y, cz + dz)) {
            if (!best || d < best.d) best = { x: cx + 0.5 + dx * 0.42, z: cz + 0.5 + dz * 0.42, ry, d };
            break;
          }
        }
      }
      if (best) props.push({ t: 'wallLantern', x: best.x, y: y + 0.4, z: best.z, ry: best.ry });
    }
  };

  /** Each chamber's footprint and roof, for the site check's buried-hall test. */
  const covered = (): [number, number, number, number, number][] => {
    const out: [number, number, number, number, number][] = [];
    for (const [c, top] of ceilOf) { const [X, Z] = c.split(',').map(Number); out.push([X, Z, X, Z, top + 1]); }
    return out;
  };

  return { chamber, tunnel, pit, bridge, pool, lamp, glow, finish, covered, isOpen, floorAt: (x: number, z: number) => floorOf.get(ck(OX + x, OZ + z)) };
}
