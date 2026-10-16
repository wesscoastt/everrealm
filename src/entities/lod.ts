import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Distance detail for character and creature models. A townsperson is built from about forty
// small meshes, each a draw call (and another in the shadow pass), so a busy street of them cost
// more than the town around them. Up close nothing changes. Past SHADOW_RANGE the flat-coloured parts hanging
// from each joint are drawn as one vertex-coloured mesh per joint (they still swing with it), and
// nothing casts a shadow; past DETAIL_RANGE the smallest leftover parts are hidden too.

const SHADOW_RANGE = 16, DETAIL_RANGE = 30, SMALL = 0.1;
const BAKED_MAT = new THREE.MeshLambertMaterial({ vertexColors: true });

interface Parts {
  /** Parts drawn one by one up close, and replaced by `baked` further out. */
  bakedFrom: THREE.Mesh[];
  baked: THREE.Mesh[];
  /** Parts left as they are (textured faces, unlit or see-through pieces). */
  kept: THREE.Mesh[];
  small: THREE.Mesh[];
  casters: THREE.Mesh[];
  level: number;
}
const cache = new WeakMap<THREE.Object3D, Parts>();

function prepare(root: THREE.Object3D): Parts {
  const p: Parts = { bakedFrom: [], baked: [], kept: [], small: [], casters: [], level: 0 };
  const byJoint = new Map<THREE.Object3D, THREE.Mesh[]>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    if (m.castShadow) p.casters.push(m);
    const mat = m.material as THREE.MeshLambertMaterial;
    const flat = !Array.isArray(mat) && mat.type === 'MeshLambertMaterial' && !mat.map && !mat.transparent && !mat.vertexColors && mat.emissive.getHex() === 0;
    // Parts hidden at build time (a blink's eyelids), glowing parts (eyes) and parts with children stay as they are
    if (flat && m.visible && !m.children.length && m.parent) {
      let list = byJoint.get(m.parent);
      if (!list) byJoint.set(m.parent, (list = []));
      list.push(m);
    } else {
      p.kept.push(m);
      if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
      if (m.geometry.boundingSphere!.radius * Math.max(m.scale.x, m.scale.y, m.scale.z) < SMALL) p.small.push(m);
    }
  });
  for (const [joint, list] of byJoint) {
    if (list.length < 2) { p.kept.push(...list); continue; }
    const geos = list.map((m) => {
      const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone());
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
      m.updateMatrix();
      g.applyMatrix4(m.matrix);
      const c = (m.material as THREE.MeshLambertMaterial).color;
      const col = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < col.length; i += 3) { col[i] = c.r; col[i + 1] = c.g; col[i + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      return g;
    });
    const merged = mergeGeometries(geos, false);
    if (!merged) { p.kept.push(...list); continue; }
    merged.computeBoundingSphere();
    const baked = new THREE.Mesh(merged, BAKED_MAT);
    baked.visible = false;
    joint.add(baked);
    p.baked.push(baked);
    p.bakedFrom.push(...list);
  }
  return p;
}

export function characterDetail(root: THREE.Object3D, distance: number): void {
  let p = cache.get(root);
  if (!p) cache.set(root, (p = prepare(root)));
  const level = distance < SHADOW_RANGE ? 0 : distance < DETAIL_RANGE ? 1 : 2;
  if (level === p.level) return;
  p.level = level;
  for (const m of p.casters) m.castShadow = level === 0;
  for (const m of p.bakedFrom) m.visible = level === 0;
  for (const m of p.baked) m.visible = level > 0;
  for (const m of p.small) m.visible = level < 2;
}
