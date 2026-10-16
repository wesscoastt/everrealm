import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as P from './props';
import { ImpostorBox, Site } from './sites';

// Turns a site's prop descriptors into meshes when the player comes near, and builds the
// cheap far-away stand-ins (impostors) that keep landmarks visible across the continent.

export interface BuiltSite {
  group: THREE.Group;
  glows: THREE.Vector3[];
  /** Every lamp, lantern and fire: where the night's point lights are placed (see GameWorld). */
  lamps: THREE.Vector3[];
  smoke: THREE.Vector3[];
  fires: THREE.Object3D[];
}

/** A fire's three flame tongues as one shape (scaled on the fire's own origin to flicker). */
const FLAME_GEO = (() => {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) parts.push(new THREE.ConeGeometry(0.22 - i * 0.05, 0.6 - i * 0.12, 6).translate((i - 1) * 0.12, 0.35 + i * 0.05, (i % 2) * 0.1 - 0.05));
  const g = mergeGeometries(parts, false)!;
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
function glowPoints(glowMat: THREE.SpriteMaterial, pos: number[], size: number[], col: number[]): THREE.Points {
  let mat = glowPointMats.get(glowMat);
  if (!mat) {
    mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: glowMat.map }, uOpacity: { value: 0 }, uScale: { value: 400 } },
      vertexShader: `attribute float aSize; attribute vec3 aColor; varying vec3 vColor; uniform float uScale;
        void main() { vColor = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uScale / max(0.5, -mv.z); }`,
      fragmentShader: `uniform sampler2D uMap; uniform float uOpacity; varying vec3 vColor;
        void main() { vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(t.rgb * vColor, t.a * uOpacity); }`,
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

export function buildSiteProps(site: Site, M: P.PropMaterials, time: { value: number }, glowMat: THREE.SpriteMaterial): BuiltSite {
  const batch = new P.Batcher();
  const group = new THREE.Group();
  const glows: THREE.Vector3[] = [];
  const banners = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const lamps: THREE.Vector3[] = [];
  const smoke: THREE.Vector3[] = [];
  const fires: THREE.Object3D[] = [];
  const roofMat = (m?: string) => (m === 'blue' ? M.roofBlue : m === 'thatch' ? M.thatch : m === 'slate' ? M.roofSlate : M.roofRed);
  const place = (g: THREE.Object3D, x: number, y: number, z: number, ry = 0) => batch.addGroup(g, P.mat4(x, y, z, ry));
  const gPos: number[] = [], gSize: number[] = [], gCol: number[] = [];
  const _c = new THREE.Color();
  const glow = (x: number, y: number, z: number, scale = 2.4, color?: string) => {
    gPos.push(x, y, z); gSize.push(scale);
    _c.set(color ?? '#ffffff'); gCol.push(_c.r, _c.g, _c.b);
  };

  for (const d of site.props) {
    switch (d.t) {
      case 'roof': {
        P.addHouseRoof(batch, M, { x: d.x, y: d.y, z: d.z, len: d.len!, span: d.span!, ry: d.ry ?? 0, mat: roofMat(d.mat), thatch: d.mat === 'thatch', dormers: d.dormers ?? 0 });
        break;
      }
      case 'door': place(P.door(M), d.x, d.y, d.z, d.ry); break;
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
      case 'tent': place(P.tent(M, d.color ?? '#8a6a3a'), d.x, d.y, d.z, d.ry); break;
      case 'headframe': place(P.mineHeadframe(M, 'HARROWGATE WORKS\nNo. 1 Drift'), d.x, d.y, d.z, d.ry); break;
      case 'cart': place(P.cart(M), d.x, d.y, d.z, d.ry); break;
      case 'bench': place(P.bench(M, 1.6), d.x, d.y, d.z, d.ry); break;
      case 'barrel': place(P.barrel(M), d.x, d.y, d.z, d.ry); break;
      case 'crate': place(P.crate(M, 0.6), d.x, d.y, d.z, d.ry ?? (d.x * 7) % 1); break;
      case 'anvil': place(P.anvil(M), d.x, d.y, d.z, d.ry); break;
      case 'well': place(P.well(M), d.x, d.y, d.z, d.ry); break;
      case 'fence': place(P.fenceRun(M, d.len ?? 6), d.x, d.y, d.z, d.ry); break;
      case 'rails': place(P.rails(M, d.len ?? 6), d.x, d.y, d.z, d.ry); break;
      case 'sign': place(P.standingSign(M, d.text ?? ''), d.x, d.y, d.z, d.ry); break;
      case 'notice': place(P.noticeBoard(M), d.x, d.y, d.z, d.ry); break;
      case 'desk': place(P.workbench(M), d.x, d.y, d.z, d.ry); break;
      case 'furn': {
        const g = P.furniture(M, d.item ?? '', d.tint ?? 0);
        if (g) place(g, d.x, d.y, d.z, d.ry);
        // A room's hanging lamp: a small glow round the lantern box and a light under it
        if (d.item === 'lamp') { glow(d.x, d.y - 0.68, d.z, 1.1); lamps.push(new THREE.Vector3(d.x, d.y - 0.9, d.z)); }
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
      case 'cone': {
        batch.add(P.cyl(0.15, d.r ?? 4, d.h ?? 6, 8), roofMat(d.mat), P.mat4(d.x, d.y + (d.h ?? 6) / 2, d.z));
        break;
      }
      case 'rope': place(P.strand(M.rope, d.len ?? 4, d.h ?? 0, d.r ?? 0.4, 0.035), d.x, d.y, d.z, d.ry); break;
      case 'root': place(P.strand(M.bark, d.len ?? 0.5, d.h ?? 3, d.r ?? 0.3, 0.13, 0.03, 6), d.x, d.y, d.z, d.ry); break;
      case 'glow': glow(d.x, d.y, d.z, (d.r ?? 2.4) * 1.2, d.color); break;
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
  return { group, glows, lamps, smoke, fires };
}

/** Plain coloured boxes and cones standing in for a landmark until its chunks load (one draw call). */
export function buildImpostor(boxes: ImpostorBox[]): THREE.Group {
  const parts: THREE.BufferGeometry[] = [];
  const col = new THREE.Color();
  for (const b of boxes) {
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
  const g = new THREE.Group();
  const merged = mergeGeometries(parts, false);
  if (merged) g.add(new THREE.Mesh(merged, IMPOSTOR_MAT));
  return g;
}

const IMPOSTOR_MAT = new THREE.MeshLambertMaterial({ vertexColors: true });
