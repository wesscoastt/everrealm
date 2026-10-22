import * as THREE from 'three';
import { B, isSolid } from './blocks';
import { EX, Layout, ROADS } from './generate';
import { distToPolyline, hash2 } from './noise';
import * as P from './props';
import { HOLLIN_SHRINE, SHRINE_SOLID, waymarkShrine } from './shrines';
import { Door, makeDoor } from './Doors';
import { SX, SY, Grid, WATER_LEVEL } from './grid';
import { roofApex, roofOverhang, roofRise } from './roofShape';
import { chimneyCell, fitOut, openDoorPlace, Role } from './interiors';

export type InteractKind = 'furnace' | 'anvil' | 'hearth' | 'ledger' | 'chest' | 'bell' | 'notice' | 'gauge' | 'minenotice' | 'bellframe';

export interface Interactable {
  id: string;
  kind: InteractKind;
  x: number;
  y: number;
  z: number;
  label: string;
  radius: number;
}

export interface StructureResult {
  group: THREE.Group;
  interactables: Interactable[];
  sails: THREE.Group;
  /** Ford Mill's wheel, turned by the game (GameWorld). */
  wheel: THREE.Group;
  bell: THREE.Group;
  fires: THREE.Object3D[];
  smoke: THREE.Vector3[];
  lights: THREE.Vector3[];
  poi: Record<string, THREE.Vector3>;
  doors: Door[];
}

const BASE = 19;

export function buildStructures(world: Grid, layout: Layout, M: P.PropMaterials, time: { value: number }): StructureResult {
  const batch = new P.Batcher();
  const group = new THREE.Group();
  const doors: Door[] = [];
  const interactables: Interactable[] = [];
  const fires: THREE.Object3D[] = [];
  const smoke: THREE.Vector3[] = [];
  const lights: THREE.Vector3[] = [];
  const poi: Record<string, THREE.Vector3> = {};

  const mark = (x0: number, z0: number, x1: number, z1: number, kind: number = EX.Building) => {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (x >= 0 && z >= 0 && x < SX && z < 320) layout.exclusion[x + z * SX] = kind;
  };
  const clearAbove = (x: number, z: number, fromY: number) => {
    for (let y = fromY; y < SY; y++) world.put(x, y, z, B.Air);
  };
  const ground = (x: number, z: number) => world.topSolid(x, z) + 1;
  const place = (g: THREE.Object3D, x: number, y: number, z: number, ry = 0) => batch.addGroup(g, P.mat4(x, y, z, ry));
  const barrier = (x: number, y: number, z: number, h = 1) => { for (let k = 0; k < h; k++) world.put(Math.floor(x), y + k, Math.floor(z), B.Barrier); };
  /** The way to the nearest road (a lamp's arm leans out over it), or null with no road near. */
  const toRoad = (x: number, z: number): number | null => {
    let best = 7, at: [number, number] | null = null;
    for (const road of ROADS) for (let i = 0; i < road.length - 1; i++) {
      const [ax, az] = road[i], [bx, bz] = road[i + 1];
      const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
      const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
      const px = ax + dx * t, pz = az + dz * t, d = Math.hypot(px - x, pz - z);
      if (d < best && d > 0.3) { best = d; at = [px, pz]; }
    }
    return at ? Math.atan2(-(at[1] - z), at[0] - x) : null;
  };
  const lantern = (x: number, z: number, ry0?: number) => {
    const ry = ry0 ?? toRoad(x, z) ?? 0;
    const y = ground(Math.floor(x), Math.floor(z));
    place(P.lanternPost(M), x, y, z, ry);
    barrier(x, y, z, 2);
    lights.push(new THREE.Vector3(x + Math.cos(ry) * 0.52, y + 1.98, z - Math.sin(ry) * 0.52));
  };

  // -------------------------------------------------------------- Houses
  interface HouseOpts { x0: number; z0: number; w: number; d: number; floors: number; roof: 'red' | 'blue' | 'thatch' | 'slate'; door: 'n' | 's' | 'e' | 'w'; chimney?: boolean; windowBoxes?: boolean; dormers?: boolean; role?: Role }
  // Each roof kind comes in three weathered tints so neighbouring roofs don't match exactly.
  const tints = ['#ffffff', '#e6d9cc', '#f2e8d2'];
  const tinted = new Map<string, THREE.Material>();
  let houseCount = 0;
  const roofMat = (r: HouseOpts['roof'], k: number) => {
    const base = r === 'red' ? M.roofRed : r === 'blue' ? M.roofBlue : r === 'thatch' ? M.thatch : M.roofSlate;
    const key = r + (k % tints.length);
    if (k % tints.length === 0) return base;
    if (!tinted.has(key)) { const m = base.clone(); m.color.set(tints[k % tints.length]); tinted.set(key, m); }
    return tinted.get(key)!;
  };

  const house = (o: HouseOpts) => {
    const { x0, z0, w, d, floors } = o;
    // The floor goes in at the town's level, unless the house stands on rising ground: then at the
    // ground's own level (the middle of its footprint), so it isn't sunk in a hollow it was dug into
    const hs: number[] = [];
    for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) hs.push(ground(x, z));
    hs.sort((a, b) => a - b);
    const mid = hs[hs.length >> 1];
    const HB = mid >= BASE + 2 ? mid : BASE;
    const top = HB + floors * 4;
    // Ease the ground down to the house a block a step, so a house on a slope never sits in a
    // trench you can't climb out of (rings beyond the first that belong to another house are left)
    for (let ring = 4; ring >= 2; ring--) for (let z = z0 - ring; z < z0 + d + ring; z++) for (let x = x0 - ring; x < x0 + w + ring; x++) {
      if (x > x0 - ring && x < x0 + w + ring - 1 && z > z0 - ring && z < z0 + d + ring - 1) continue;
      if (x < 0 || z < 0 || x >= SX || z >= 320 || layout.exclusion[x + z * SX] === EX.Building) continue;
      const lim = HB + ring - 1;
      if (ground(x, z) > lim) { clearAbove(x, z, lim); world.put(x, lim - 1, z, B.Grass); }
    }
    mark(x0 - 2, z0 - 2, x0 + w + 1, z0 + d + 1);
    for (let z = z0 - 1; z <= z0 + d; z++) for (let x = x0 - 1; x <= x0 + w; x++) clearAbove(x, z, HB);
    for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) {
      for (let y = ground(x, z); y < HB; y++) world.put(x, y, z, B.Cobble);
      world.put(x, HB - 1, z, B.Cobble);
    }
    // Door cell along the chosen wall
    const doorX = o.door === 'n' || o.door === 's' ? x0 + Math.floor(w / 2) : o.door === 'e' ? x0 + w - 1 : x0;
    const doorZ = o.door === 'e' || o.door === 'w' ? z0 + Math.floor(d / 2) : o.door === 's' ? z0 + d - 1 : z0;
    for (let y = HB; y < top; y++) {
      const ly = (y - HB) % 4;
      const f = Math.floor((y - HB) / 4);
      for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) {
        const edgeX = x === x0 || x === x0 + w - 1;
        const edgeZ = z === z0 || z === z0 + d - 1;
        if (!edgeX && !edgeZ) { world.put(x, y, z, B.Air); continue; }
        const along = edgeZ ? x - x0 : z - z0;
        const span = edgeZ ? w : d;
        let id: number = B.Plaster;
        if (edgeX && edgeZ) id = B.Timber;
        else if (ly === 3) id = B.DarkPlanks;
        else if (f === 0 && ly === 0) id = B.Cobble;
        else if (along % 3 === 0) id = B.Timber;
        else if ((ly === 1 || ly === 2) && along % 3 === 1 && along > 0 && along < span - 1 && !(f === 0 && ly === 2 && along === span - 2)) id = B.Window;
        // The doorway: two blocks high, under a dark lintel
        if (x === doorX && z === doorZ && f === 0 && ly <= 1) id = B.Air;
        else if (x === doorX && z === doorZ && f === 0 && ly === 2) id = B.DarkPlanks;
        world.put(x, y, z, id);
      }
    }
    // Inside: a boarded floor, upper storeys and stairs, furniture and lamplight
    for (let z = z0 + 1; z < z0 + d - 1; z++) for (let x = x0 + 1; x < x0 + w - 1; x++) world.put(x, HB - 1, z, B.Planks);
    world.put(doorX, HB - 1, doorZ, B.StoneBrick);
    const chim = o.chimney ? chimneyCell({ x0, z0, w, d, door: o.door }) : undefined;
    const shape = { x0, z0, w, d, floors, base: HB, door: o.door, doorX, doorZ, role: o.role, tint: Math.floor(hash2(x0, z0, 5) * 3), chimney: chim };
    const fit = fitOut(shape);
    for (const [bx, by, bz, kind] of fit.blocks) world.put(bx, by, bz, kind === 'floor' ? B.Planks : kind === 'step' ? B.DarkPlanks : kind === 'barrier' ? B.Barrier : B.Air);
    for (const f of fit.furn) { const g = P.furniture(M, f.item, f.tint ?? shape.tint); if (g) place(g, f.x, f.y, f.z, f.ry); }
    for (const [lx, ly, lz] of fit.lights) lights.push(new THREE.Vector3(lx, ly, lz));
    // Open door and porch lantern
    const doorRot = o.door === 'n' ? Math.PI : o.door === 's' ? 0 : o.door === 'e' ? Math.PI / 2 : -Math.PI / 2;
    const dOff = 0.52;
    const dx = o.door === 'e' ? dOff : o.door === 'w' ? -dOff : 0;
    const dz = o.door === 's' ? dOff : o.door === 'n' ? -dOff : 0;
    const leaf = openDoorPlace(shape);
    { const dr = makeDoor(M, leaf.x, HB, leaf.z, leaf.ry); group.add(dr.pivot); doors.push(dr); }
    const side = o.door === 'n' || o.door === 's' ? [1.2, 0] : [0, 1.2];
    const wl = P.wallLantern(M);
    place(wl, doorX + 0.5 + dx * 0.9 + side[0], HB + 1.8, doorZ + 0.5 + dz * 0.9 + side[1], doorRot);
    lights.push(new THREE.Vector3(doorX + 0.5 + dx * 1.7 + side[0], HB + 1.85, doorZ + 0.5 + dz * 1.7 + side[1]));

    // Roof. Dormers go on the slope that faces the door, when there is one.
    const alongX = w >= d;
    const len = alongX ? w : d;
    const spanW = alongX ? d : w;
    const thatch = o.roof === 'thatch';
    const apex = roofApex(spanW, roofRise(spanW), roofOverhang(thatch));
    const slope = alongX ? (o.door === 's' ? 1 : o.door === 'n' ? -1 : 0) : (o.door === 'e' ? 1 : o.door === 'w' ? -1 : 0);
    P.addHouseRoof(batch, M, { x: x0 + w / 2, y: top, z: z0 + d / 2, len, span: spanW, ry: alongX ? 0 : Math.PI / 2, mat: roofMat(o.roof, houseCount++), thatch, dormers: o.dormers ? slope : 0 });
    if (chim) {
      // Stone stack proud of the gable end wall, from the ground up past the ridge
      const [wx, wz] = chim;
      const ox = wx === x0 ? -1 : wx === x0 + w - 1 ? 1 : 0, oz = ox ? 0 : wz === z0 ? -1 : 1;
      const cx = wx + ox, cz = wz + oz;
      for (let y = HB; y < top; y++) world.put(wx, y, wz, B.Cobble);
      for (let y = Math.min(ground(cx, cz), HB) - 1; y < top + apex + 1.5; y++) world.put(cx, y, cz, y < top + apex + 0.5 ? B.Cobble : B.StoneBrick);
      smoke.push(new THREE.Vector3(cx + 0.5, Math.ceil(top + apex + 1.5) + 0.2, cz + 0.5));
    }
    if (o.windowBoxes) {
      const wz = o.door === 's' ? z0 + d + 0.02 : z0 - 0.02;
      const ry = o.door === 's' ? 0 : Math.PI;
      // One under each ground-floor window (the windows are at every third block from the corner);
      // never across the doorway
      for (let a = 1; a < w - 1; a += 3) if (x0 + a !== doorX) place(P.windowBox(M), x0 + a + 0.5, HB + 1.0, wz, ry);
    }
    return { doorX, doorZ, base: HB };
  };

  // -------------------------------------------------------------- Hollin Ford, west bank
  // The square
  for (let z = 180; z <= 193; z++) for (let x = 146; x <= 160; x++) {
    const d = Math.hypot(x - 153, z - 186.5);
    if (d > 7.2) continue;
    clearAbove(x, z, BASE);
    world.put(x, BASE - 1, z, (x + z) % 5 === 0 ? B.StoneBrick : hash2(x, z, 3) < 0.15 ? B.MossyCobble : B.Cobble);
    layout.exclusion[x + z * SX] = EX.Building;
  }
  poi.square = new THREE.Vector3(153, BASE, 187);
  poi.spawn = new THREE.Vector3(150.5, BASE, 187.5);

  // Moot Oak and the benches under it (tree itself is grown later with the others)
  poi.mootOak = new THREE.Vector3(144, BASE, 175);
  mark(136, 167, 152, 183, EX.Keep);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    const bx = 145 + Math.cos(a) * 3.6, bz = 176 + Math.sin(a) * 3.6;
    place(P.bench(M, 1.8), bx, ground(Math.floor(bx), Math.floor(bz)), bz, -a + Math.PI / 2);
  }

  const reeve = house({ x0: 156, z0: 169, w: 7, d: 7, floors: 2, roof: 'blue', door: 's', chimney: true, windowBoxes: true, dormers: true, role: 'office' });
  poi.reeveDoor = new THREE.Vector3(reeve.doorX + 0.5, BASE, reeve.doorZ + 1.6);
  house({ x0: 128, z0: 170, w: 6, d: 6, floors: 1, roof: 'red', door: 's', chimney: true, windowBoxes: true });
  house({ x0: 126, z0: 189, w: 7, d: 6, floors: 1, roof: 'thatch', door: 'n', chimney: true });
  house({ x0: 152, z0: 197, w: 6, d: 6, floors: 1, roof: 'red', door: 'n', chimney: true, windowBoxes: false });
  const pellHouse = house({ x0: 158, z0: 199, w: 5, d: 5, floors: 1, roof: 'thatch', door: 'e', chimney: true });
  poi.pellDoor = new THREE.Vector3(pellHouse.doorX + 1.6, BASE, pellHouse.doorZ + 0.5);

  // Banners in front of the reeve's house
  const hollinTex = P.bannerTexture('hollin');
  const hollinMat = P.createBannerMaterial(hollinTex, time);
  for (const bx of [156.2, 162.8]) {
    place(new THREE.Group().add(new THREE.Mesh(P.box(0.14, 4.2, 0.14), M.darkWood).translateY(2.1)), bx, BASE, 177.2);
    place(new THREE.Group().add(new THREE.Mesh(P.box(1.2, 0.1, 0.1), M.darkWood).translateY(4.0)), bx, BASE, 177.2);
    const b = P.bannerMesh(hollinMat, 1.0, 2.2);
    b.position.set(bx, BASE + 3.95, 177.25);
    group.add(b);
  }

  // Tamsin's stall and the notice board
  place(P.stall(M, M.clothRed), 156.5, BASE, 191.5, Math.PI);
  for (let x = 155; x <= 158; x++) barrier(x, BASE, 191);
  poi.stall = new THREE.Vector3(156.5, BASE, 193.2);
  place(P.crate(M), 159.2, BASE, 192.2, 0.3);
  place(P.barrel(M), 154, BASE, 192.6);
  place(P.noticeBoard(M), 158.5, BASE, 188.6, Math.PI);
  barrier(158, BASE, 188, 2); barrier(159, BASE, 188, 2);
  interactables.push({ id: 'notice', kind: 'notice', x: 158.5, y: BASE + 1, z: 187.6, label: 'Read the notice board', radius: 2.2 });
  place(P.standingSign(M, 'Charter Post'), 162.5, BASE, 186.5, Math.PI); // the post cart stops here

  // -------------------------------------------------------------- The bridge and the bell
  for (let x = 162; x <= 181; x++) {
    for (let z = 182; z <= 186; z++) {
      clearAbove(x, z, BASE);
      const deck = z >= 183 && z <= 185;
      if (deck) {
        world.put(x, BASE - 1, z, (x + z) % 4 === 0 ? B.Cobble : B.StoneBrick);
        // Abutments where there's no water beneath
        for (let y = BASE - 2; y >= 0; y--) {
          const id = world.get(x, y, z);
          if (id === B.Water) break;
          if (id !== B.Air) break;
          world.put(x, y, z, B.StoneBrick);
        }
      } else if (z === 182 && x >= 170 && x <= 173) {
        world.put(x, BASE - 1, z, B.StoneBrick); // opening into the bell bay
      } else if (x >= 163 && x <= 180) {
        world.put(x, BASE - 1, z, B.StoneBrick);
        world.put(x, BASE, z, x % 3 === 0 ? B.StoneBrick : B.Cobble);
        for (let y = BASE - 2; y >= 0 && world.get(x, y, z) === B.Air; y--) world.put(x, y, z, B.StoneBrick);
      }
    }
  }
  // Piers and arch shoulders
  for (const px of [166, 176]) for (let z = 182; z <= 186; z++) {
    for (let y = 8; y < BASE - 1; y++) world.put(px, y, z, B.StoneBrick);
    world.put(px - 1, BASE - 2, z, B.StoneBrick);
    world.put(px + 1, BASE - 2, z, B.StoneBrick);
  }
  for (let z = 182; z <= 186; z++) { world.put(169, BASE - 2, z, B.StoneBrick); world.put(173, BASE - 2, z, B.StoneBrick); }
  // Bell bay on the north side
  for (let x = 169; x <= 174; x++) for (let z = 179; z <= 181; z++) {
    clearAbove(x, z, BASE);
    world.put(x, BASE - 1, z, B.StoneBrick);
    world.put(x, BASE - 2, z, B.StoneBrick);
    if (z === 179 || x === 169 || x === 174) world.put(x, BASE, z, B.StoneBrick);
  }
  place(P.bellFrame(M), 171.5, BASE, 180.4);
  barrier(170, BASE, 180, 3); barrier(172, BASE, 180, 3);
  const bell = P.bellMesh(M);
  bell.position.set(171.5, BASE + 3.0, 180.4);
  bell.visible = false;
  bell.traverse((o) => { (o as THREE.Mesh).castShadow = true; });
  group.add(bell);
  interactables.push({ id: 'bellframe', kind: 'bellframe', x: 171.5, y: BASE + 1.2, z: 181.2, label: 'Look at the bell frame', radius: 2.6 });
  poi.bridge = new THREE.Vector3(171.5, BASE, 184);
  poi.bellBay = new THREE.Vector3(171.5, BASE, 182.2);
  mark(160, 178, 183, 188);

  // Rain gauge at the west end of the bridge
  const gy = ground(163, 180);
  place(P.rainGauge(M), 163.5, gy, 180.5);
  barrier(163, gy, 180, 2);
  interactables.push({ id: 'gauge', kind: 'gauge', x: 163.5, y: gy + 1, z: 180.5, label: 'Check the rain gauge', radius: 2 });

  // Dock and Pell's boat
  for (let x = 163; x <= 170; x++) for (let z = 195; z <= 197; z++) {
    clearAbove(x, z, WATER_LEVEL + 1);
    world.put(x, WATER_LEVEL, z, B.Planks);
    if ((x === 166 || x === 170) && (z === 195 || z === 197)) for (let y = WATER_LEVEL - 1; y > 8 && world.get(x, y, z) === B.Water; y--) world.put(x, y, z, B.Timber);
  }
  for (let x = 163; x <= 165; x++) for (let z = 195; z <= 197; z++) for (let y = WATER_LEVEL - 1; y > 8 && (world.get(x, y, z) === B.Air || world.get(x, y, z) === B.Water); y--) world.put(x, y, z, B.Cobble);
  mark(160, 193, 172, 199);
  const boatG = P.boat(M);
  place(boatG, 172.4, WATER_LEVEL - 0.55, 199.6, 0.3);
  place(P.barrel(M), 164.3, WATER_LEVEL + 1, 196.8);
  place(P.crate(M, 0.6), 165.2, WATER_LEVEL + 1, 195.4, 0.5);
  barrier(164, WATER_LEVEL + 1, 196); barrier(165, WATER_LEVEL + 1, 195);
  lantern(163.3, 194.4, Math.PI / 2);
  poi.dock = new THREE.Vector3(169.4, WATER_LEVEL + 1, 196);
  layout.fish.push({ id: layout.fish.length, x: 171.6, y: WATER_LEVEL, z: 196.5, water: 'wend' });

  // -------------------------------------------------------------- East bank: smithy and inn
  // Smithy (open south side facing the road)
  const SX0 = 182, SX1 = 190, SZ0 = 175, SZ1 = 181;
  mark(SX0 - 1, SZ0 - 1, SX1 + 1, SZ1 + 2);
  for (let z = SZ0; z <= SZ1 + 1; z++) for (let x = SX0; x <= SX1; x++) {
    clearAbove(x, z, BASE);
    for (let y = ground(x, z); y < BASE; y++) world.put(x, y, z, B.Cobble);
    world.put(x, BASE - 1, z, B.Cobble);
  }
  for (let x = SX0; x <= SX1; x++) for (let y = BASE; y < BASE + 4; y++) world.put(x, y, SZ0, x === SX0 || x === SX1 ? B.Timber : B.StoneBrick);
  for (const x of [SX0, SX1]) for (let z = SZ0; z <= SZ1; z++) {
    for (let y = BASE; y < BASE + 2; y++) world.put(x, y, z, B.StoneBrick);
    if (z === SZ1 || z === SZ0 + 3) for (let y = BASE; y < BASE + 4; y++) world.put(x, y, z, B.Timber);
  }
  // Furnace (2x2 brick with a cobble flue)
  for (let x = 186; x <= 187; x++) for (let z = 176; z <= 177; z++) {
    world.put(x, BASE, z, B.StoneBrick);
    world.put(x, BASE + 1, z, B.StoneBrick);
    world.put(x, BASE + 2, z, B.Cobble);
    world.put(x, BASE + 3, z, B.Cobble);
  }
  for (let y = BASE + 4; y < BASE + 9; y++) world.put(187, y, 176, B.Cobble);
  smoke.push(new THREE.Vector3(187.5, BASE + 9.3, 176.5));
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshBasicMaterial({ color: '#ff7a1c' }));
  mouth.position.set(187, BASE + 0.75, 178.02);
  group.add(mouth);
  fires.push(mouth);
  const arch = new THREE.Group();
  arch.add(new THREE.Mesh(P.box(1.5, 0.18, 0.3), M.iron).translateY(1.25));
  place(arch, 187, BASE, 178.05);
  interactables.push({ id: 'furnace', kind: 'furnace', x: 187, y: BASE + 0.8, z: 178.6, label: 'Use the furnace', radius: 2.2 });
  place(P.bellows(M), 184.8, BASE, 176.9);
  barrier(184, BASE, 176); barrier(185, BASE, 176);
  place(P.anvil(M), 185.4, BASE, 179.6, 0.2);
  barrier(185, BASE, 179);
  interactables.push({ id: 'anvil', kind: 'anvil', x: 185.4, y: BASE + 0.9, z: 179.6, label: 'Use the anvil', radius: 2.2 });
  place(P.barrel(M, true), 183.3, BASE, 179.2);
  barrier(183, BASE, 179);
  place(P.workbench(M), 189.0, BASE, 179.3, Math.PI / 2);
  barrier(189, BASE, 178); barrier(189, BASE, 179); barrier(189, BASE, 180);
  interactables.push({ id: 'ledger', kind: 'ledger', x: 188.6, y: BASE + 1, z: 179.6, label: 'Look at the ledger', radius: 1.8 });
  poi.smithy = new THREE.Vector3(185.8, BASE, 180.6);
  poi.anvilStand = new THREE.Vector3(186.1, BASE, 180.4);
  poi.bellowsStand = new THREE.Vector3(184.8, BASE, 178.1);
  const smithRoof = P.gableRoof(SX1 - SX0 + 1, SZ1 - SZ0 + 1, 3.2, 0.7, 0.22, 0.35);
  batch.add(smithRoof, M.roofSlate, P.mat4((SX0 + SX1 + 1) / 2, BASE + 4, (SZ0 + SZ1 + 1) / 2));
  batch.add(P.gableWall(SZ1 - SZ0 + 1, 3.5, 0.6), M.darkWood, P.mat4(SX0 + 0.3, BASE + 4, (SZ0 + SZ1 + 1) / 2, Math.PI / 2));
  batch.add(P.gableWall(SZ1 - SZ0 + 1, 3.5, 0.6), M.darkWood, P.mat4(SX1 + 0.7, BASE + 4, (SZ0 + SZ1 + 1) / 2, Math.PI / 2));
  lights.push(new THREE.Vector3(187, BASE + 1, 178.6));
  for (let i = 0; i < 4; i++) place(P.crate(M, 0.55), 191.5 + (i % 2) * 0.7, BASE + Math.floor(i / 2) * 0.55, 177 + (i % 2) * 0.3, i * 0.4);

  // The Low Water inn
  const inn = house({ x0: 184, z0: 188, w: 11, d: 9, floors: 2, roof: 'red', door: 'n', chimney: true, windowBoxes: true, dormers: true, role: 'inn' });
  const innSign = new THREE.Group();
  innSign.add(new THREE.Mesh(P.box(0.1, 0.1, 1.4), M.iron).translateY(0.1).translateZ(-0.6));
  const signTex = P.textTexture('The Low Water', 256, 128, '#2f4a3a', '#efd9a0', 34);
  const signMesh = new THREE.Mesh(P.box(1.2, 0.7, 0.06), [M.darkWood, M.darkWood, M.darkWood, M.darkWood, new THREE.MeshLambertMaterial({ map: signTex }), new THREE.MeshLambertMaterial({ map: signTex })]);
  signMesh.position.set(0, -0.35, -1.1);
  signMesh.rotation.y = Math.PI / 2;
  innSign.add(signMesh);
  place(innSign, inn.doorX + 2.4, BASE + 2.9, 188, Math.PI / 2);
  poi.innDoor = new THREE.Vector3(inn.doorX + 0.5, BASE, inn.doorZ - 1.2);
  // Cook fire outside the inn
  place(P.firepit(M), 181.5, BASE, 193.5);
  for (const [x, z] of [[181, 193], [182, 193], [181, 194], [182, 194]]) barrier(x, BASE, z);
  const flame = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.22 - i * 0.05, 0.6 - i * 0.12, 6), M.fire);
    f.position.set((i - 1) * 0.12, 0.35 + i * 0.05, (i % 2) * 0.1 - 0.05);
    flame.add(f);
  }
  flame.position.set(181.5, BASE, 193.5);
  group.add(flame);
  fires.push(flame);
  lights.push(new THREE.Vector3(181.5, BASE + 0.8, 193.5));
  smoke.push(new THREE.Vector3(181.5, BASE + 1.3, 193.5));
  interactables.push({ id: 'hearth', kind: 'hearth', x: 181.5, y: BASE + 0.6, z: 193.5, label: 'Cook at the fire', radius: 2.4 });
  // The bank drops away toward the river here: make good the ground the fireside benches stand on,
  // its far edge a block lower, so the Wetlings track below it is a step up and not a climb
  for (let z = 191; z <= 197; z++) for (let x = 178; x <= 184; x++) {
    if (world.get(x, BASE - 1, z) === B.Water) continue;
    const lvl = z === 197 ? BASE - 1 : BASE;
    clearAbove(x, z, lvl);
    for (let y = ground(x, z); y < lvl - 1; y++) world.put(x, y, z, B.Dirt);
    if (ground(x, z) < lvl) world.put(x, lvl - 1, z, B.Grass);
  }
  place(P.bench(M, 1.6), 179.3, BASE, 193.5, Math.PI / 2);
  place(P.bench(M, 1.6), 181.5, BASE, 196, 0);
  place(P.barrel(M), 183.4, BASE, 186.9);
  place(P.barrel(M), 182.6, BASE, 187.4);

  // East cottages
  house({ x0: 197, z0: 172, w: 6, d: 6, floors: 1, roof: 'blue', door: 's', chimney: true, windowBoxes: true });
  house({ x0: 199, z0: 190, w: 6, d: 6, floors: 1, roof: 'thatch', door: 'w', chimney: true });
  house({ x0: 197, z0: 200, w: 5, d: 5, floors: 1, roof: 'red', door: 'n' });

  // Lanterns along the valley's roads and lanes beyond the village street, every 22 blocks
  {
    let side = 1;
    for (const road of ROADS) for (let i = 0; i < road.length - 1; i++) {
      const [ax, az] = road[i], [bx, bz] = road[i + 1];
      const len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
      for (let t = 11; t < len; t += 22) {
        side = -side;
        const cx = ax + ux * t, cz = az + uz * t;
        if (cx > 112 && cx < 230 && cz > 170 && cz < 200) continue; // the village street has its own
        const x = Math.floor(cx - uz * 2.6 * side) + 0.5, z = Math.floor(cz + ux * 2.6 * side) + 0.5;
        if (ROADS.some((r) => distToPolyline(x, z, r).d < 1.8)) continue;
        const y = ground(Math.floor(x), Math.floor(z));
        if (y <= WATER_LEVEL + 1 || world.get(Math.floor(x), y, Math.floor(z)) !== B.Air || world.get(Math.floor(x), y - 1, Math.floor(z)) === B.Farmland) continue;
        lantern(x, z, Math.atan2(-(cz - z), cx - x));
      }
    }
  }

  // The waymark shrine on the north side of the square (its rune is lit by the game: Waymarks.ts)
  place(waymarkShrine(M, 'greenwake'), HOLLIN_SHRINE.x, HOLLIN_SHRINE.y, HOLLIN_SHRINE.z, HOLLIN_SHRINE.ry);
  for (const [dx, dz] of SHRINE_SOLID.greenwake.cells) barrier(Math.floor(HOLLIN_SHRINE.x) + dx, HOLLIN_SHRINE.y, Math.floor(HOLLIN_SHRINE.z) + dz, SHRINE_SOLID.greenwake.h);

  // Lantern posts along the village road, leaning out over it; the pair at the bridge stand on the
  // banks at either end of it, not up on the parapet
  for (const [x, z] of [[147.5, 182.2], [160.6, 186.4], [160.6, 181.6], [182.6, 186.6], [184.4, 182.2], [195.6, 186.8], [140.5, 186.8]] as [number, number][]) lantern(x, z);

  // Signposts at the two junctions
  const sign = (x: number, z: number, arms: { text: string; to: [number, number] }[]) => {
    const y = ground(Math.floor(x), Math.floor(z));
    const g = P.signpost(M, arms.map((a) => ({ text: a.text, angle: Math.atan2(-(a.to[1] - z), a.to[0] - x) })));
    place(g, x, y, z);
    barrier(x, y, z, 2);
  };
  sign(139.5, 182.0, [
    { text: 'Hollin Ford', to: [160, 184] },
    { text: 'Gorse Mill', to: [118, 202] },
    { text: 'Ford Mill', to: [172, 214] },
    { text: 'The Lantern', to: [96, 244] },
  ]);
  sign(196.5, 181.5, [ // on the corner, not in the Pit road
    { text: 'Sallow Pit', to: [210, 146] },
    { text: 'Ansbury', to: [260, 194] },
    { text: 'Hollin Ford', to: [170, 184] },
  ]);

  // -------------------------------------------------------------- Farms and the mill
  for (let z = 212; z <= 234; z++) for (let x = 128; x <= 148; x++) {
    const y = world.topSolid(x, z);
    if (y < 0) continue;
    clearAbove(x, z, y + 1);
    const row = (z - 212) % 6;
    world.put(x, y, z, row === 5 ? B.Water : B.Farmland);
    if (row === 5) world.put(x, y - 1, z, B.Dirt);
    layout.exclusion[x + z * SX] = EX.Farm;
  }
  // Post-and-rail fence in runs of up to six blocks (so it follows the ground): a barrier one block
  // high under it, which the player can't step up onto but can jump.
  const fenceLine = (x0: number, z0: number, x1: number, z1: number): void => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    // Where a road or lane crosses, the fence stops either side of it, like a gate left open
    const onRoad = (t: number) => { const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; return ROADS.some((r) => distToPolyline(x, z, r).d < 1.4); };
    const n = Math.ceil(len * 2);
    if (len > 0.5 && [...Array(n + 1).keys()].some((i) => onRoad(i / n))) {
      let from: number | null = null;
      for (let i = 0; i <= n; i++) {
        const t = i / n, road = onRoad(t);
        if (!road && from === null) from = t;
        if ((road || i === n) && from !== null) {
          const to = road ? (i - 1) / n : t;
          if (to - from > 0.5 / len) fenceLine(x0 + (x1 - x0) * from, z0 + (z1 - z0) * from, x0 + (x1 - x0) * to, z0 + (z1 - z0) * to);
          from = null;
        }
      }
      return;
    }
    const runs = Math.max(1, Math.ceil(len / 6));
    for (let r = 0; r < runs; r++) {
      const mx = x0 + ((x1 - x0) * (r + 0.5)) / runs, mz = z0 + ((z1 - z0) * (r + 0.5)) / runs;
      place(P.fenceRun(M, len / runs), mx, ground(Math.floor(mx), Math.floor(mz)), mz, -Math.atan2(z1 - z0, x1 - x0));
    }
    const steps = Math.ceil(len * 3);
    for (let i = 0; i <= steps; i++) {
      const x = Math.floor(x0 + ((x1 - x0) * i) / steps), z = Math.floor(z0 + ((z1 - z0) * i) / steps);
      // One barrier per cell: the ground under a barrier already placed is the barrier's own cell
      let y = ground(x, z);
      while (y > 0 && world.get(x, y - 1, z) === B.Barrier) y--;
      if (world.get(x, y, z) === B.Air) barrier(x, y, z, 1);
    }
  };
  for (const [x0, z0, x1, z1] of [[127, 211, 149, 211], [127, 235, 149, 235], [127, 211, 127, 222], [127, 226, 127, 235], [149, 211, 149, 235]]) fenceLine(x0, z0, x1, z1);
  house({ x0: 115, z0: 213, w: 9, d: 7, floors: 1, roof: 'thatch', door: 'e' });
  for (const [x0, z0, x1, z1] of [[114, 224, 125, 224], [114, 233, 125, 233], [114, 224, 114, 233], [125, 224, 125, 228]]) fenceLine(x0, z0, x1, z1);
  for (const [x, z] of [[130, 238], [131, 238], [130, 239]]) { const y = ground(x, z); world.put(x, y, z, B.Hay); world.put(x, y + 1, z, x === 130 && z === 238 ? B.Hay : B.Air); }
  poi.sheepPen = new THREE.Vector3(119.5, BASE, 228.5);
  poi.farm = new THREE.Vector3(138, BASE, 223);

  // -------------------------------------------------------------- The village street
  // Houses close up the street front on both banks, the road between them is cobbled, every
  // door has a worn path to the street, and the back plots are fenced gardens.
  const infill: HouseOpts[] = [
    { x0: 138, z0: 189, w: 6, d: 6, floors: 2, roof: 'red', door: 'n', chimney: true, windowBoxes: true, dormers: true },
    { x0: 118, z0: 189, w: 7, d: 6, floors: 1, roof: 'thatch', door: 'n', chimney: true },
    { x0: 116, z0: 174, w: 6, d: 6, floors: 1, roof: 'slate', door: 's', chimney: true, windowBoxes: true },
    { x0: 205, z0: 176, w: 6, d: 6, floors: 1, roof: 'red', door: 's', chimney: true, windowBoxes: true },
    { x0: 208, z0: 190, w: 7, d: 6, floors: 2, roof: 'slate', door: 'n', chimney: true, dormers: true },
    { x0: 215, z0: 175, w: 6, d: 6, floors: 1, roof: 'thatch', door: 's', chimney: true },
  ];
  infill.forEach(house);

  // Cobbles down the middle of the street, worn path along its edges
  // The ground's surface, under any barrier (a signpost's or a lantern's): paving must never land
  // on top of one, or it hangs in the air beside the post
  const surfaceY = (x: number, z: number) => {
    let y = world.topSolid(x, z);
    while (y > 0 && world.get(x, y, z) === B.Barrier) y--;
    return y >= BASE - 3 && y <= BASE + 1 ? y : -1;
  };
  const pave = (road: [number, number][], x0: number, x1: number) => {
    for (let x = x0; x <= x1; x++) for (let z = 168; z <= 204; z++) {
      const d = distToPolyline(x + 0.5, z + 0.5, road).d;
      if (d > 2.4 || layout.exclusion[x + z * SX] === EX.Building) continue;
      const y = surfaceY(x, z);
      if (y < 0 || world.get(x, y, z) === B.Water) continue;
      const h = hash2(x, z, 11);
      world.put(x, y, z, d > 1.5 ? B.Path : h < 0.12 ? B.MossyCobble : h < 0.3 ? B.StoneBrick : B.Cobble);
      for (let yy = y + 1; yy < SY; yy++) if (world.get(x, yy, z) !== B.Barrier) world.put(x, yy, z, B.Air);
    }
  };
  pave([[112, 186], [140, 184], [163, 184]], 114, 161);
  pave([[179, 184], [196, 184], [226, 188]], 182, 222);

  // From every door, a path worn to the nearest street: the shortest walkable way, round other
  // houses and fences rather than through them
  const paved = new Set<number>([B.Cobble, B.StoneBrick, B.MossyCobble]);
  for (const d of doors) {
    const nx = Math.round(Math.sin(d.open)), nz = Math.round(Math.cos(d.open));
    const sx = Math.floor(d.hinge.x + nx * 1.0 + nz * 0.42), sz = Math.floor(d.hinge.z + nz * 1.0 - nx * 0.42);
    const top = (x: number, z: number) => world.topSolid(x, z);
    const walk = (x: number, z: number) => {
      const y = top(x, z);
      return y >= BASE - 3 && y <= BASE + 2 && !isSolid(world.get(x, y + 1, z)) && !isSolid(world.get(x, y + 2, z)) && world.get(x, y, z) !== B.Water && world.get(x, y, z) !== B.Barrier;
    };
    if (!walk(sx, sz)) continue;
    const prev = new Map<number, number>(), q = [sx + sz * SX];
    prev.set(q[0], -1);
    let found = -1;
    for (let qi = 0; qi < q.length && qi < 2400; qi++) {
      const i = q[qi], x = i % SX, z = Math.floor(i / SX);
      if (paved.has(world.get(x, top(x, z), z)) || (qi > 0 && world.get(x, top(x, z), z) === B.Path)) { found = i; break; }
      for (const [dx, dz] of [[nx, nz], [nz, -nx], [-nz, nx], [-nx, -nz]]) {
        const X = x + dx, Z = z + dz, j = X + Z * SX;
        if (prev.has(j) || X < 0 || Z < 0 || X >= SX || Z >= 320 || !walk(X, Z) || Math.abs(top(X, Z) - top(x, z)) > 1) continue;
        prev.set(j, i); q.push(j);
      }
    }
    if (found < 0) continue;
    for (let i = found; i >= 0; i = prev.get(i)!) {
      const x = i % SX, z = Math.floor(i / SX), y = top(x, z);
      if (world.get(x, y, z) === B.Grass || world.get(x, y, z) === B.Dirt) world.put(x, y, z, B.Path);
    }
  }

  // Fenced kitchen gardens behind the new houses, and a front yard for the cottage by the green
  const garden = (x0: number, z0: number, x1: number, z1: number, gate: 'n' | 's') => {
    // Laid out at the ground's own level (the middle of the plot), not dug in at the town's floor
    // height: on a slope that left the beds two blocks down, and nobody could climb out of them.
    const hs: number[] = [];
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) hs.push(ground(x, z));
    hs.sort((a, b) => a - b);
    const gy = hs[hs.length >> 1];
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      clearAbove(x, z, gy);
      for (let y = gy - 3; y < gy; y++) if (world.get(x, y, z) === B.Air) world.put(x, y, z, B.Dirt);
      if (z > z0 && z < z1 && x > x0 && x < x1) {
        world.put(x, gy - 1, z, (z - z0) % 3 === 0 ? B.Dirt : B.Farmland);
        layout.exclusion[x + z * SX] = EX.Farm;
      } else world.put(x, gy - 1, z, B.Grass);
    }
    // ...and the ground round it eased down (or up) to meet it, a block a step
    for (let ring = 1; ring <= 3; ring++) for (let z = z0 - ring; z <= z1 + ring; z++) for (let x = x0 - ring; x <= x1 + ring; x++) {
      if (x > x0 - ring && x < x1 + ring && z > z0 - ring && z < z1 + ring) continue;
      if (layout.exclusion[x + z * SX] === EX.Building) continue;
      const h = ground(x, z);
      if (h > gy + ring) { clearAbove(x, z, gy + ring); world.put(x, gy + ring - 1, z, B.Grass); }
    }
    const gx = (x0 + x1) / 2;
    fenceLine(x0, z0, x0, z1); fenceLine(x1, z0, x1, z1);
    fenceLine(x0, gate === 'n' ? z1 : z0, x1, gate === 'n' ? z1 : z0);
    const gz = gate === 'n' ? z0 : z1;
    fenceLine(x0, gz, gx - 0.8, gz); fenceLine(gx + 0.8, gz, x1, gz);
  };
  garden(115, 166, 123, 172, 's');
  garden(204, 168, 212, 174, 's');
  garden(214, 167, 222, 173, 's');
  fenceLine(127, 180, 130.7, 180); fenceLine(132.3, 180, 135, 180);
  fenceLine(127, 177, 127, 180); fenceLine(135, 177, 135, 180);

  // Yard clutter by the doors, a well where the mill lane leaves the street, and lamps
  const yard = [[[143.2, 188.2], 'barrel'], [[124.6, 188.4], 'crate'], [[117.2, 181.0], 'barrel'], [[203.6, 182.6], 'crate'],
    [[214.8, 188.6], 'barrel'], [[221.6, 181.8], 'crate'], [[136.2, 177.6], 'barrel']] as [[number, number], string][];
  for (const [[x, z], kind] of yard) {
    const y = ground(Math.floor(x), Math.floor(z));
    place(kind === 'barrel' ? P.barrel(M) : P.crate(M, 0.65), x, y, z, hash2(Math.floor(x), Math.floor(z), 5) * 3);
    barrier(x, y, z);
  }
  place(P.well(M), 134.5, ground(134, 192), 192.5, 0.3);
  for (const [x, z] of [[134, 192], [135, 192], [134, 193], [135, 193]]) barrier(x, ground(x, z), z, 2);
  for (const [x, z] of [[125.5, 183.0], [203.5, 183.0], [213.5, 184.2]] as [number, number][]) lantern(x, z);

  // Gorse Mill
  const MX = 112, MZ = 206;
  const mBase = ground(MX, MZ);
  mark(MX - 6, MZ - 6, MX + 6, MZ + 6);
  for (let y = mBase; y < mBase + 11; y++) {
    const r = 3.4 - (y - mBase) * 0.05;
    for (let z = MZ - 4; z <= MZ + 4; z++) for (let x = MX - 4; x <= MX + 4; x++) {
      const d = Math.max(Math.abs(x - MX), Math.abs(z - MZ)) * 0.72 + Math.min(Math.abs(x - MX), Math.abs(z - MZ)) * 0.42;
      if (d <= r) {
        const shell = d > r - 1;
        const facing = x === MX + 4 && z === MZ && y < mBase + 2;
        world.put(x, y, z, !shell || facing ? B.Air : y < mBase + 3 ? B.StoneBrick : (y - mBase) % 4 === 3 ? B.DarkPlanks : (x + z + y) % 7 === 0 ? B.Window : B.Plaster);
      }
    }
  }
  for (let z = MZ - 3; z <= MZ + 3; z++) for (let x = MX - 3; x <= MX + 3; x++) if (world.get(x, mBase - 1, z) !== B.Air) world.put(x, mBase - 1, z, B.Planks);
  const cap = new THREE.Mesh(P.cyl(0.2, 5.0, 3.8, 8), M.thatch);
  cap.position.set(MX + 0.5, mBase + 12.8, MZ + 0.5);
  cap.castShadow = true;
  group.add(cap);
  const sails = P.windmillSails(M);
  sails.position.set(MX + 5.6, mBase + 9, MZ + 0.5);
  sails.rotation.y = Math.PI / 2;
  sails.traverse((o) => { (o as THREE.Mesh).castShadow = true; });
  group.add(sails);
  place(P.door(M), MX + 5.05, mBase, MZ + 0.5, Math.PI / 2);
  poi.mill = new THREE.Vector3(MX + 6.5, mBase, MZ + 0.5);
  const crateY = ground(MX + 6, MZ - 2);
  for (let i = 0; i < 3; i++) place(P.crate(M, 0.6), MX + 6.2, crateY + i * 0.6, MZ - 2 + (i % 2) * 0.2, i);

  // Ford Mill: below the bridge on the west bank, its undershot wheel turning in a race cut into the bank
  house({ x0: 169, z0: 211, w: 8, d: 6, floors: 2, roof: 'thatch', door: 'w', role: 'workshop' });
  for (let z = 209; z <= 216; z++) for (let x = 177; x <= 182; x++) {
    const lining = z === 209 || z === 216;
    if (!lining && world.get(x, WATER_LEVEL - 1, z) === B.Water) continue;
    clearAbove(x, z, lining ? WATER_LEVEL + 1 : WATER_LEVEL);
    for (let y = 12; y < WATER_LEVEL + (lining ? 1 : 0); y++) world.put(x, y, z, lining ? (y === WATER_LEVEL ? B.Cobble : B.StoneBrick) : y === 12 ? B.Gravel : B.Water);
  }
  // The pier that carries the axle's far end
  for (const z of [212, 213]) for (let y = 12; y <= WATER_LEVEL; y++) world.put(181, y, z, B.StoneBrick);
  const wheel = P.waterWheel(M, 5);
  wheel.position.set(180.0, WATER_LEVEL + 0.3, 213.0);
  wheel.traverse((o) => { (o as THREE.Mesh).castShadow = true; });
  group.add(wheel);
  // A plank footbridge just downstream, from the mill's side over to the riverside path
  for (let x = 182; x <= 195; x++) for (let z = 217; z <= 220; z++) {
    clearAbove(x, z, WATER_LEVEL + 1);
    world.put(x, WATER_LEVEL, z, z === 218 || z === 219 ? (x % 3 ? B.Planks : B.DarkPlanks) : B.DarkPlanks);
    if ((z === 217 || z === 220) && x > 182 && x < 190) barrier(x, WATER_LEVEL + 1, z, 1); // the rails stop short of the Wetlings track
  }
  for (const x of [185, 189]) for (const z of [217, 220]) for (let y = 11; y < WATER_LEVEL; y++) if (!isSolid(world.get(x, y, z))) world.put(x, y, z, B.OakLog);
  for (const z of [217.5, 220.5]) place(P.fenceRun(M, 7), 186.5, WATER_LEVEL + 1, z, 0);
  mark(181, 216, 196, 221);
  poi.fordMill = new THREE.Vector3(167.5, BASE, 214);

  // -------------------------------------------------------------- Sallow Pit mouth
  const pitY = 22;
  place(P.mineHeadframe(M), 218.5, pitY, 118.6);
  place(P.rails(M, 22), 218.5, pitY, 109);
  place(P.cart(M), 218.5, pitY, 114.5);
  place(P.cart(M, false), 220.6, pitY, 121.5, 0.6);
  barrier(218, pitY, 114); barrier(220, pitY, 121);
  for (const [x, y, z] of layout.mineLights) {
    // Hung on the nearest tunnel wall, facing out into the tunnel (not in the middle of the air)
    const yy = Math.floor(y - 0.4);
    let best: [number, number] | null = null, bd = 9;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
      for (let k = 1; k <= 8; k++) if (isSolid(world.get(Math.floor(x) + dx * k, yy, Math.floor(z) + dz * k))) { if (k < bd) { bd = k; best = [dx, dz]; } break; }
    }
    const [wx, wz] = best ?? [0, -1];
    const lx = Math.floor(x) + 0.5 + wx * (bd - 0.5), lz = Math.floor(z) + 0.5 + wz * (bd - 0.5);
    const ry = Math.atan2(-wx, -wz);
    place(P.wallLantern(M), lx, y - 0.4, lz, ry);
    lights.push(new THREE.Vector3(lx - wx * 0.42, y - 0.3, lz - wz * 0.42));
  }
  const harrowMat = P.createBannerMaterial(P.bannerTexture('harrow'), time);
  for (const bx of [214.6, 222.4]) {
    const b = P.bannerMesh(harrowMat, 0.9, 1.8);
    b.position.set(bx, pitY + 4.6, 119.0);
    group.add(b);
  }
  place(P.noticeBoard(M), 223.5, pitY, 121.5, -Math.PI / 2 - 0.4);
  barrier(223, pitY, 121, 2);
  interactables.push({ id: 'minenotice', kind: 'minenotice', x: 222.8, y: pitY + 1, z: 121.3, label: 'Read the company notice', radius: 2 });
  lantern(214.2, 121.2, 0);
  poi.pitMouth = new THREE.Vector3(218.5, pitY, 121.8);
  poi.pitChamber = new THREE.Vector3(238, pitY, 96);
  for (let i = 0; i < 4; i++) place(P.crate(M, 0.6), 213.4, pitY + (i > 1 ? 0.6 : 0), 116 + (i % 2) * 0.7, i * 0.3);

  // -------------------------------------------------------------- The Lantern (signal tower ruin)
  const LX = 68, LZ = 254;
  let lBase = 0;
  for (let z = LZ - 2; z <= LZ + 2; z++) for (let x = LX - 2; x <= LX + 2; x++) lBase = Math.max(lBase, ground(x, z));
  mark(LX - 5, LZ - 5, LX + 5, LZ + 5);
  for (let z = LZ - 3; z <= LZ + 3; z++) for (let x = LX - 3; x <= LX + 3; x++) {
    for (let y = ground(x, z); y < lBase; y++) world.put(x, y, z, B.MossyCobble);
    clearAbove(x, z, lBase);
  }
  for (let y = lBase; y < lBase + 13; y++) for (let z = LZ - 2; z <= LZ + 2; z++) for (let x = LX - 2; x <= LX + 2; x++) {
    const shell = Math.abs(x - LX) === 2 || Math.abs(z - LZ) === 2;
    if (!shell) continue;
    const brokenTop = y > lBase + 9 + Math.floor(hash2(x, z, 41) * 4);
    if (brokenTop) continue;
    if (x === LX + 2 && z === LZ && y < lBase + 2) continue; // doorway facing the vale
    if (y === lBase + 5 && (x === LX || z === LZ)) { world.put(x, y, z, B.Air); continue; } // arrow slits
    world.put(x, y, z, hash2(x, y * 7, z) < 0.35 ? B.MossyStone : B.StoneBrick);
  }
  // Spiral stair around a central post
  const ring: [number, number][] = [[1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
  for (let y = lBase; y < lBase + 9; y++) world.put(LX, y, LZ, B.StoneBrick);
  for (let k = 0; k < 9; k++) {
    const [dx, dz] = ring[(k + 1) % 8];
    world.put(LX + dx, lBase + k, LZ + dz, B.Planks);
  }
  ring.forEach(([dx, dz], i) => { if (i !== 7 && i !== 0 && i !== 1) world.put(LX + dx, lBase + 9, LZ + dz, B.Planks); });
  world.put(LX, lBase + 9, LZ, B.Planks);
  place(P.chest(M), LX - 0.5, lBase + 10, LZ + 0.5, Math.PI / 2);
  barrier(LX - 1, lBase + 10, LZ);
  interactables.push({ id: 'lanternCache', kind: 'chest', x: LX - 0.5, y: lBase + 10.4, z: LZ + 0.5, label: 'Open the tin box', radius: 1.8 });
  poi.lantern = new THREE.Vector3(LX + 4, lBase, LZ + 0.5);
  poi.lanternTop = new THREE.Vector3(LX + 0.5, lBase + 10, LZ + 0.5);
  // Fallen masonry around the base
  for (let i = 0; i < 18; i++) {
    const a = hash2(i, 5, 7) * Math.PI * 2, r = 3.5 + hash2(i, 6, 7) * 4;
    const x = Math.floor(LX + Math.cos(a) * r), z = Math.floor(LZ + Math.sin(a) * r);
    const y = ground(x, z);
    world.put(x, y, z, hash2(i, 8, 7) < 0.5 ? B.MossyCobble : B.StoneBrick);
  }

  // -------------------------------------------------------------- Wetlings ditches and reeds are handled by vegetation; add a few hay bales
  for (const [x, z] of [[208, 228], [209, 228], [208, 229]]) { const y = ground(x, z); world.put(x, y, z, B.Hay); }
  poi.wetlings = new THREE.Vector3(200, 18, 240);
  poi.haverwood = new THREE.Vector3(250, 20, 230);
  poi.spill = new THREE.Vector3(96, 17, 118);
  poi.fallsHollow = new THREE.Vector3(94, 17, 88);

  const built = batch.build(true);
  group.add(built);
  return { group, interactables, sails, wheel, bell, fires, smoke, lights, poi, doors };
}
