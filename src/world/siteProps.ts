import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as P from './props';
import { addConeVolume } from './roofVolumes';
import { waymarkShrine } from './shrines';
import { Door, makeDoor } from './Doors';
import { ImpostorBox, Site } from './sites';
import { festivalAt } from '../data/festivals';
import { shipDeckY, shipModel, SHIPS } from './ships';
import { POSTS } from '../data/travel';

// Turns a site's prop descriptors into meshes when the player comes near, and builds the
// cheap far-away stand-ins (impostors) that keep landmarks visible across the continent.

export interface BuiltSite {
  group: THREE.Group;
  glows: THREE.Vector3[];
  /** Every lamp, lantern and fire: where the night's point lights are placed (see GameWorld). */
  lamps: THREE.Vector3[];
  smoke: THREE.Vector3[];
  fires: THREE.Object3D[];
  doors: Door[];
  /** Windmill sails, turned on their axles by GameWorld. */
  sails: THREE.Object3D[];
}

/** A fire's three flame tongues as one shape (scaled on the fire's own origin to flicker). */
const FLAME_GEO = (() => {
  const g = P.campFlame();
  g.userData.shared = true;
  return g;
})();

const bannerMats = new Map<string, THREE.Material>();
const clothMats = new Map<string, THREE.Material>();

/**
 * Every light glow in a settlement drawn as one batch of points (a sprite each would be a draw call
 * each), sized in world units like the sprites were, following the shared glow material's opacity.
 */
const glowPointMats = new WeakMap<THREE.SpriteMaterial, THREE.ShaderMaterial>();
const _buf = new THREE.Vector2();
/** A lamp's own colour, where it isn't the lantern orange (a crystal's light, a cave's). */
export const LAMP_TINT = new WeakMap<THREE.Vector3, THREE.Color>();

function glowPoints(glowMat: THREE.SpriteMaterial, pos: number[], size: number[], col: number[]): THREE.Points {
  let mat = glowPointMats.get(glowMat);
  if (!mat) {
    mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: glowMat.map }, uOpacity: { value: 0 }, uScale: { value: 400 } },
      // A halo is a thing seen from off: it stops growing and fades out as you come right up to the lamp
      vertexShader: `attribute float aSize; attribute vec3 aColor; varying vec3 vColor; varying float vNear; uniform float uScale;
        void main() { vColor = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = min(aSize * uScale / max(0.5, -mv.z), 150.0); vNear = smoothstep(1.5, 5.0, -mv.z); }`,
      fragmentShader: `uniform sampler2D uMap; uniform float uOpacity; varying vec3 vColor; varying float vNear;
        void main() { vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(t.rgb * vColor, t.a * uOpacity * vNear); }`,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    });
    glowPointMats.set(glowMat, mat);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
  geo.setAttribute('aColor', new THREE.Float32BufferAttribute(col, 3));
  geo.computeBoundingSphere();
  const pts = new THREE.Points(geo, mat);
  const m = mat;
  pts.onBeforeRender = (renderer, _scene, camera) => {
    m.uniforms.uOpacity.value = glowMat.opacity;
    m.uniforms.uScale.value = renderer.getDrawingBufferSize(_buf).y * 0.5 * (camera as THREE.PerspectiveCamera).projectionMatrix.elements[5];
  };
  pts.renderOrder = 2;
  return pts;
}

/**
 * A town's lights as seen from far off, for its stand-in while it isn't loaded (game/GameWorld.ts): every
 * outdoor lantern, wall lantern, fire and lit glow, as one set of points that never shrinks below a few
 * pixels, so a town at night shows across the valley as a scatter of warm lights. No real lights at all:
 * one draw, and it's dark by day (the glow material's opacity follows the night).
 */
export function farLights(site: Site, glowMat: THREE.SpriteMaterial): THREE.Points | null {
  const pos: number[] = [], size: number[] = [], col: number[] = [], c = new THREE.Color();
  const add = (x: number, y: number, z: number, sz: number, color?: string) => { pos.push(x, y, z); size.push(sz); c.set(color ?? '#ffc070'); col.push(c.r, c.g, c.b); };
  for (const d of site.props) {
    if (d.t === 'lantern') add(d.x + Math.cos(d.ry ?? 0) * 0.52, d.y + 1.98, d.z - Math.sin(d.ry ?? 0) * 0.52, 3.2);
    else if (d.t === 'wallLantern') add(d.x, d.y + 0.05, d.z, 2.8);
    else if (d.t === 'firepit') add(d.x, d.y + 0.8, d.z, 4, '#ff9a40');
    else if (d.t === 'glow' && d.lit) add(d.x, d.y, d.z, (d.r ?? 2.4) * 1.3, d.color);
  }
  if (!pos.length) return null;
  const pts = glowPoints(glowMat, pos, size, col);
  // Far off it keeps a few pixels and a little more strength, so a distant town twinkles rather than vanishes
  pts.material = farMat(pts.material as THREE.ShaderMaterial);
  return pts;
}
const farMats = new WeakMap<THREE.ShaderMaterial, THREE.ShaderMaterial>();
function farMat(near: THREE.ShaderMaterial): THREE.ShaderMaterial {
  let m = farMats.get(near);
  if (m) return m;
  m = near.clone();
  m.uniforms = near.uniforms; // (the same opacity and scale, set each frame by the near points' hook)
  m.vertexShader = near.vertexShader.replace('gl_PointSize = min(aSize * uScale / max(0.5, -mv.z), 150.0); vNear = smoothstep(1.5, 5.0, -mv.z);', 'gl_PointSize = clamp(aSize * uScale / max(0.5, -mv.z) * 1.6, 3.0, 60.0); vNear = 1.25;');
  farMats.set(near, m);
  return m;
}

/** A cheap hash of a place, for which lamp gets a pumpkin and which face it has. */
const h3 = (x: number, z: number, k: number) => { const v = Math.sin(x * 127.1 + z * 311.7 + k * 74.7) * 43758.5453; return v - Math.floor(v); };
const PUMPKIN_TONES = ['#e8801e', '#e8801e', '#d86a14', '#f0962a', '#e8c890', '#c8641a'];

/**
 * The Lantern Wake's jack-o'-lanterns, all over the land while it's on: at the foot of road lamps and
 * town lanterns, by signposts, notice boards and wells, under the porch lamp of a house or two in every
 * street. (The towns round each Charter Post are dressed for the Wake by game/Seasons.ts; here it's
 * everywhere else.) Each is merged into the site's batch, and its glow joins the site's night halos.
 */
function wakeLanterns(site: Site, put: (g: THREE.Object3D, x: number, y: number, z: number, ry: number) => void, glow: (x: number, y: number, z: number, scale: number, color: string) => void): void {
  if (festivalAt()?.id !== 'lantern') return;
  const nearPost = (x: number, z: number) => POSTS.some((q) => Math.abs(q.x - x) < 52 && Math.abs(q.z - z) < 52);
  const one = (x: number, y: number, z: number, ry: number, k: number, size = 1) => {
    const face = Math.floor(h3(x, z, k + 1) * 6), tone = PUMPKIN_TONES[Math.floor(h3(x, z, k + 2) * PUMPKIN_TONES.length)];
    put(P.jackOLantern(face, size * (0.85 + h3(x, z, k + 3) * 0.35), tone), x, y, z, ry + (h3(x, z, k + 4) - 0.5) * 0.7);
    glow(x, y + 0.25 * size, z, 0.9 * size, '#ff9a30');
  };
  for (const d of site.props) {
    const ry = d.ry ?? 0, nx = Math.sin(ry), nz = Math.cos(ry), r = h3(d.x, d.z, 9);
    switch (d.t) {
      case 'lantern': if (r < 0.6) one(d.x + nz * 0.55, d.y, d.z - nx * 0.55, ry, 1); break;
      case 'sign': case 'notice': if (r < 0.7) one(d.x + nz * 0.7 + nx * 0.3, d.y, d.z - nx * 0.7 + nz * 0.3, ry, 2, 0.9); break;
      case 'well': if (r < 0.8) { one(d.x + 1.3, d.y, d.z + 0.4, 1.4, 3, 0.8); one(d.x - 1.2, d.y, d.z - 0.6, -1.9, 4, 1.1); } break;
      case 'wallLantern': if (r < 0.35 && !nearPost(d.x, d.z)) one(d.x + nx * 0.2, d.y - 2.3, d.z + nz * 0.2, ry, 5, 0.9); break;
      case 'bench': if (r < 0.25) one(d.x + nz * 1.15, d.y, d.z - nx * 1.15, ry, 6, 0.8); break;
      default: break;
    }
  }
}

export function buildSiteProps(site: Site, M: P.PropMaterials, time: { value: number }, glowMat: THREE.SpriteMaterial): BuiltSite {
  const batch = new P.Batcher();
  const group = new THREE.Group();
  const glows: THREE.Vector3[] = [];
  const banners = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const lamps: THREE.Vector3[] = [];
  const smoke: THREE.Vector3[] = [];
  const fires: THREE.Object3D[] = [];
  const sails: THREE.Object3D[] = [];
  const doors: Door[] = [];
  const roofMat = (m?: string) => (m === 'blue' ? M.roofBlue : m === 'thatch' ? M.thatch : m === 'slate' ? M.roofSlate : m === 'copper' ? M.roofCopper : M.roofRed);
  const place = (g: THREE.Object3D, x: number, y: number, z: number, ry = 0) => batch.addGroup(g, P.mat4(x, y, z, ry));
  const gPos: number[] = [], gSize: number[] = [], gCol: number[] = [];
  const _c = new THREE.Color();
  const glow = (x: number, y: number, z: number, scale = 2.4, color?: string) => {
    gPos.push(x, y, z); gSize.push(scale);
    _c.set(color ?? '#ffffff'); gCol.push(_c.r, _c.g, _c.b);
  };
  wakeLanterns(site, place, glow);

  for (const d of site.props) {
    switch (d.t) {
      case 'roof': {
        P.addHouseRoof(batch, M, { x: d.x, y: d.y, z: d.z, len: d.len!, span: d.span!, ry: d.ry ?? 0, mat: roofMat(d.mat), thatch: d.mat === 'thatch', dormers: d.dormers ?? 0, plain: d.plain, open: d.open });
        break;
      }
      case 'door': place(P.door(M, 2, d.doorKind, d.color), d.x, d.y, d.z, d.ry); break;
      case 'lantern':
        place(P.lanternPost(M), d.x, d.y, d.z, d.ry);
        glows.push(new THREE.Vector3(d.x + Math.cos(d.ry ?? 0) * 0.52, d.y + 1.98, d.z - Math.sin(d.ry ?? 0) * 0.52));
        break;
      case 'wallLantern':
        place(P.wallLantern(M), d.x, d.y, d.z, d.ry);
        glows.push(new THREE.Vector3(d.x, d.y + 0.05, d.z));
        break;
      case 'banner': {
        const kind = d.kind ?? 'hollin';
        let mat = bannerMats.get(kind);
        if (!mat) { mat = P.createBannerMaterial(P.bannerTexture(kind), time); bannerMats.set(kind, mat); }
        // Banners of a kind share one mesh: the wave runs along each banner's own normal
        const geo = P.bannerMesh(mat, 1.0, 2.2).geometry.applyMatrix4(P.mat4(d.x, d.y, d.z, d.ry ?? 0));
        let list = banners.get(mat);
        if (!list) banners.set(mat, (list = []));
        list.push(geo);
        place(new THREE.Group().add(new THREE.Mesh(P.box(1.2, 0.1, 0.1), M.darkWood).translateY(0.05)), d.x, d.y, d.z, d.ry);
        break;
      }
      case 'stall': {
        const c = d.color ?? '#a8382c';
        let mat = clothMats.get(c);
        if (!mat) { mat = new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide }); clothMats.set(c, mat); }
        place(P.stall(M, mat), d.x, d.y, d.z, d.ry);
        break;
      }
      case 'boat': place(P.boat(M), d.x, d.y, d.z, d.ry); break;
      case 'ship': {
        const kind = d.ship ?? 'carrack';
        // (her deck on a whole block, where the planner made it solid to: sites.propCollision)
        place(shipModel(M, kind, { sails: d.sails ?? 'furled', wale: d.color, hull: d.hull, sail: d.sail }), d.x, shipDeckY(kind, d.y, d.deck) - SHIPS[kind].deck, d.z, d.ry);
        break;
      }
      case 'waymark': place(waymarkShrine(M, d.theme ?? 'crownroad'), d.x, d.y, d.z, d.ry); break;
      case 'tent': place(P.tent(M, d.color ?? '#8a6a3a'), d.x, d.y, d.z, d.ry); break;
      case 'headframe': place(P.mineHeadframe(M, d.text ?? 'HARROWGATE WORKS\nNo. 1 Drift'), d.x, d.y, d.z, d.ry); break;
      case 'reekhearth': place(P.reekHearth(M), d.x, d.y, d.z, d.ry); break;
      case 'cart': place(P.cart(M), d.x, d.y, d.z, d.ry); break;
      case 'bench': place(P.bench(M, 1.6), d.x, d.y, d.z, d.ry); break;
      case 'windowBox': place(P.windowBox(M), d.x, d.y, d.z, d.ry); break;
      case 'shopSign': place(P.shopSign(M, d.color ?? '#2f528f', d.tint ?? 0), d.x, d.y, d.z, d.ry); break;
      case 'awning': place(P.awning(M, d.color ?? '#a8382c', d.len ?? 2.4), d.x, d.y, d.z, d.ry); break;
      case 'planter': place(P.planter(M, d.tint ?? 0), d.x, d.y, d.z, d.ry); break;
      case 'washLine': place(P.washLine(M, d.len ?? 4), d.x, d.y, d.z, d.ry); break;
      case 'woodpile': place(P.woodpile(M, d.len ?? 2), d.x, d.y, d.z, d.ry); break;
      case 'statue': place(P.statue(M), d.x, d.y, d.z, d.ry); break;
      case 'netRack': place(P.netRack(M, d.len ?? 3), d.x, d.y, d.z, d.ry); break;
      case 'bollard': place(P.bollard(M), d.x, d.y, d.z, d.ry); break;
      case 'fishBox': place(P.fishBox(M), d.x, d.y, d.z, d.ry); break;
      case 'vineRow': place(P.vineRow(M, d.len ?? 12, d.tint === 1, d.tint === 2), d.x, d.y, d.z, d.ry); break;
      case 'winePress': place(P.winePress(M), d.x, d.y, d.z, d.ry); break;
      case 'barrelRack': place(P.barrelRack(M, d.len ?? 4), d.x, d.y, d.z, d.ry); break;
      case 'cheeseRack': place(P.cheeseRack(M), d.x, d.y, d.z, d.ry); break;
      case 'smokeRack': place(P.smokeRack(M, d.len ?? 3), d.x, d.y, d.z, d.ry); break;
      case 'tanVat': place(P.tanVat(M, d.color), d.x, d.y, d.z, d.ry); break;
      case 'hideFrame': place(P.hideFrame(M), d.x, d.y, d.z, d.ry); break;
      case 'potStill': place(P.potStill(M), d.x, d.y, d.z, d.ry); break;
      case 'crane': place(P.dockCrane(M), d.x, d.y, d.z, d.ry); break;
      case 'lobsterPots': place(P.lobsterPots(M), d.x, d.y, d.z, d.ry); break;
      case 'beehive': place(P.beehive(M), d.x, d.y, d.z, d.ry); break;
      case 'doorstep': place(P.doorstep(M), d.x, d.y, d.z, d.ry); break;
      case 'postBox': place(P.postBox(M), d.x, d.y, d.z, d.ry); break;
      case 'shutter': place(P.shutter(M, d.color ?? '#3a5a7a'), d.x, d.y, d.z, d.ry); break;
      case 'barrel': place(P.barrel(M), d.x, d.y, d.z, d.ry); break;
      case 'crate': place(P.crate(M, 0.6), d.x, d.y, d.z, d.ry ?? (d.x * 7) % 1); break;
      case 'anvil': place(P.anvil(M), d.x, d.y, d.z, d.ry); break;
      case 'well': place(P.well(M), d.x, d.y, d.z, d.ry); break;
      case 'fence': place(P.fenceRun(M, d.len ?? 6), d.x, d.y, d.z, d.ry); break;
      case 'bars': place(P.ironBars(M, d.len ?? 3, d.rise ?? 4), d.x, d.y, d.z, d.ry); break;
      case 'hatch': place(P.cellarHatch(M), d.x, d.y, d.z, d.ry); break;
      case 'rails': place(P.rails(M, d.len ?? 6), d.x, d.y, d.z, d.ry); break;
      case 'sign': place(P.standingSign(M, d.text ?? ''), d.x, d.y, d.z, d.ry); break;
      case 'notice': place(P.noticeBoard(M), d.x, d.y, d.z, d.ry); break;
      case 'desk': place(P.workbench(M), d.x, d.y, d.z, d.ry); break;
      case 'furn': {
        if (d.item === 'doorOpen' && d.swing) { const dr = makeDoor(M, d.x, d.y, d.z, d.ry ?? 0, d.doorKind, d.color); dr.role = d.role; group.add(dr.pivot); doors.push(dr); break; }
        if (d.item === 'doorOpen' && d.doorKind) { place(P.openDoor(M, 3, d.doorKind, d.color), d.x, d.y, d.z, d.ry); break; }
        const g = P.furniture(M, d.item ?? '', d.tint ?? 0);
        if (g) place(g, d.x, d.y, d.z, d.ry);
        // A room's hanging lamp: a small glow round the lantern box and a light under it
        if (d.item === 'lamp') { glow(d.x, d.y - 0.68, d.z, 1.1); lamps.push(new THREE.Vector3(d.x, d.y - 0.9, d.z)); }
        // A fire in the hearth lights the room
        if (d.item === 'hearth') { glow(d.x, d.y + 0.45, d.z, 1.4, '#ff9a40'); lamps.push(new THREE.Vector3(d.x, d.y + 0.6, d.z)); }
        break;
      }
      case 'firepit': {
        place(P.firepit(M), d.x, d.y, d.z);
        const flame = new THREE.Mesh(FLAME_GEO, M.fire);
        flame.position.set(d.x, d.y, d.z);
        group.add(flame);
        fires.push(flame);
        glows.push(new THREE.Vector3(d.x, d.y + 0.8, d.z));
        smoke.push(new THREE.Vector3(d.x, d.y + 1.3, d.z));
        break;
      }
      case 'sails': {
        // On a pivot turned to face out, so they spin about their own axle
        const pivot = new THREE.Group();
        pivot.position.set(d.x, d.y, d.z);
        pivot.rotation.y = d.ry ?? 0;
        const sl = P.windmillSails(M);
        sl.traverse((o) => { o.castShadow = true; });
        pivot.add(sl);
        group.add(pivot);
        sails.push(sl);
        break;
      }
      case 'cog': {
        // Upright, facing ry, turning about its axle with the sails (tint 1: the other way)
        const pivot = new THREE.Group();
        pivot.position.set(d.x, d.y, d.z);
        pivot.rotation.y = (d.ry ?? 0) + (d.tint === 1 ? Math.PI : 0);
        const c = P.cog(M, d.r ?? 1.5);
        pivot.add(c);
        group.add(pivot);
        sails.push(c);
        break;
      }
      case 'pipe': place(P.pipe(M, d.len ?? 4, d.r ?? 0.18), d.x, d.y, d.z, d.ry); break;
      case 'grave': place(P.gravestone(M, d.tint ?? 0), d.x, d.y, d.z, d.ry); break;
      case 'bellows': place(P.bellows(M), d.x, d.y, d.z, d.ry); break;
      case 'flame': {
        // A fire on its own (a furnace's mouth): it flickers with the rest
        const f = new THREE.Mesh(FLAME_GEO, M.fire);
        f.position.set(d.x, d.y, d.z);
        f.scale.setScalar(d.r ?? 1);
        group.add(f);
        fires.push(f);
        break;
      }
      case 'cone': {
        batch.add(P.cyl(0.15, d.r ?? 4, d.h ?? 6, 8), roofMat(d.mat), P.mat4(d.x, d.y + (d.h ?? 6) / 2, d.z));
        addConeVolume(d.x, d.y, d.z, d.r ?? 4, d.h ?? 6);
        break;
      }
      case 'rope': place(P.strand(M.rope, d.len ?? 4, d.h ?? 0, d.r ?? 0.4, 0.035), d.x, d.y, d.z, d.ry); break;
      case 'root': place(P.strand(M.bark, d.len ?? 0.5, d.h ?? 3, d.r ?? 0.3, 0.13, 0.03, 6), d.x, d.y, d.z, d.ry); break;
      case 'glow': {
        glow(d.x, d.y, d.z, (d.r ?? 2.4) * 1.2, d.color);
        if (d.lit) { const v = new THREE.Vector3(d.x, d.y, d.z); lamps.push(v); if (d.color) LAMP_TINT.set(v, new THREE.Color(d.color)); }
        break;
      }
      case 'smoke': smoke.push(new THREE.Vector3(d.x, d.y, d.z)); break;
    }
  }
  for (const g of glows) { glow(g.x, g.y, g.z); lamps.push(g); }
  if (gPos.length) group.add(glowPoints(glowMat, gPos, gSize, gCol));
  for (const [mat, list] of banners) {
    const b = new THREE.Mesh(mergeGeometries(list, false), mat);
    b.castShadow = true;
    group.add(b);
  }
  group.add(batch.build(true));
  return { group, glows, lamps, smoke, fires, doors, sails };
}

/** Plain coloured boxes and cones standing in for a landmark until its chunks load (one draw call). */
/**
 * A site's far-away stand-in. Long pieces (a town wall's sides) are meshes of their own, each knowing
 * its footprint (userData.box), so the game can hide each one as you come near it: walking up to a
 * wall far from the town's middle mustn't leave the grey box drawn over the real wall and its gate.
 * The rest is merged, and hides with the site.
 */
export function buildImpostor(boxes: ImpostorBox[]): THREE.Group {
  const g = new THREE.Group();
  const parts: THREE.BufferGeometry[] = [];
  const col = new THREE.Color();
  for (const b of boxes) {
    if (!b.cone && Math.max(b.w, b.d) > 40) {
      const geo = new THREE.BoxGeometry(b.w, b.h, b.d).translate(b.x, b.y, b.z).toNonIndexed();
      geo.deleteAttribute('uv');
      col.set(b.color);
      const c = new Float32Array(geo.attributes.position.count * 3);
      for (let i = 0; i < c.length; i += 3) { c[i] = col.r; c[i + 1] = col.g; c[i + 2] = col.b; }
      geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
      const m = new THREE.Mesh(geo, IMPOSTOR_MAT);
      m.userData.box = b;
      g.add(m);
      continue;
    }
    let geo: THREE.BufferGeometry = b.cone ? new THREE.ConeGeometry(b.w * 0.55, b.h, 4) : new THREE.BoxGeometry(b.w, b.h, b.d);
    if (b.cone) geo.rotateY(Math.PI / 4);
    geo.translate(b.x, b.y, b.z);
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.deleteAttribute('uv');
    col.set(b.color);
    const c = new Float32Array(geo.attributes.position.count * 3);
    for (let i = 0; i < c.length; i += 3) { c[i] = col.r; c[i + 1] = col.g; c[i + 2] = col.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    parts.push(geo);
  }
  const merged = parts.length ? mergeGeometries(parts, false) : null;
  if (merged) g.add(new THREE.Mesh(merged, IMPOSTOR_MAT));
  return g;
}

/** Pushed back in depth so real geometry always wins a tie; GameWorld clips it to beyond the loaded chunks. */
export const IMPOSTOR_MAT = new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 8 });
