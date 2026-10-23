import * as THREE from 'three';
import { shade, Vox, VOX_MAT } from './vox';

// Turns a creature built from smooth parts into one built from cubes a sixteenth of a block on a side,
// the world's own pixel size (the mounts are sculpted that way in entities/voxmounts.ts). Each joint
// of the rig (body, head, each leg, the tail) keeps its place and pivot, so every walk, bite and wag
// still drives it; only the solid parts hung on a joint are filled into cubes, in the joint's own
// frame, coloured from their material with a little variation cube by cube. An animated piece that is
// a single part (a tail, a jaw) is filled in place in its own frame. Glowing parts (eyes, a jelly's
// bell) and see-through ones stay as they are. The cubes are worked out once per creature and look,
// and shared by every creature that wears it.

const S = 1 / 16;
const cache = new Map<string, (THREE.BufferGeometry | null)[]>();

/** Is a point (in a part's own frame) inside its closed surface? Counted by crossings along +x. */
function inside(tris: ArrayLike<number>, x: number, y: number, z: number): boolean {
  let hits = 0;
  for (let t = 0; t < tris.length; t += 9) {
    const ax = tris[t], ay = tris[t + 1], az = tris[t + 2], bx = tris[t + 3], by = tris[t + 4], bz = tris[t + 5], cx = tris[t + 6], cy = tris[t + 7], cz = tris[t + 8];
    // Quick reject: the ray (y, z fixed, running to +x) must pass within the triangle's span
    if ((y < ay && y < by && y < cy) || (y > ay && y > by && y > cy) || (z < az && z < bz && z < cz) || (z > az && z > bz && z > cz) || (x > ax && x > bx && x > cx)) continue;
    // Moller-Trumbore with the direction (1, 0, 0)
    const e1x = bx - ax, e1y = by - ay, e1z = bz - az, e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
    const py = -e2z, pz = e2y; // (1,0,0) x e2
    const det = e1y * py + e1z * pz;
    if (Math.abs(det) < 1e-12) continue;
    const inv = 1 / det, tx = x - ax, ty = y - ay, tz = z - az;
    const u = (ty * py + tz * pz) * inv;
    if (u < 0 || u > 1) continue;
    const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
    const v = qx * inv;
    if (v < 0 || u + v > 1) continue;
    if ((e2x * qx + e2y * qy + e2z * qz) * inv > 1e-9) hits++;
  }
  return (hits & 1) === 1;
}

/** Whether a mesh is one to fill with cubes: solid, plain-lit, not glowing, not already cubes. */
function solid(o: THREE.Object3D): o is THREE.Mesh {
  const m = o as THREE.Mesh, mat = m.material as THREE.MeshLambertMaterial;
  return !!m.isMesh && !m.userData.plain && !m.children.length && m.visible && !Array.isArray(mat) && !!mat?.isMeshLambertMaterial && !mat.transparent && !mat.map && mat.emissive.getHex() === 0;
}

/** The cubes for some parts: in their joint's frame, or (own) each in its own frame. */
function cubesOf(parts: THREE.Mesh[], own: boolean): THREE.BufferGeometry | null {
  const v = new Vox(S, true), p = new THREE.Vector3();
  for (const m of parts) {
    m.updateMatrix();
    const place = own ? new THREE.Matrix4() : m.matrix;
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
    const tris = g.getAttribute('position').array;
    const inv = place.clone().invert();
    g.computeBoundingBox();
    const box = g.boundingBox!.clone().applyMatrix4(place);
    const hex = '#' + (m.material as THREE.MeshLambertMaterial).color.getHexString();
    const paint = (_x: number, _y: number, _z: number, n: number) => shade(hex, 0.9 + n * 0.14);
    const before = v.size;
    v.fill([box.min.x, box.min.y, box.min.z], [box.max.x, box.max.y, box.max.z], (x, y, z) => {
      p.set(x, y, z).applyMatrix4(inv);
      return inside(tris, p.x, p.y, p.z);
    }, paint);
    // A part thinner than a cube (a hen's leg, a whisker) still shows: the cube at its middle
    if (v.size === before) {
      const c = box.getCenter(new THREE.Vector3()), h = S * 0.4;
      v.box([c.x - h, c.y - h, c.z - h], [c.x + h, c.y + h, c.z + h], paint);
    }
  }
  return v.size ? v.mesh().geometry : null;
}

/**
 * Fill the solid parts of `root` into cubes, joint by joint. `key` names the creature and its look
 * (the same key gives the same cubes, worked out once); `keep` holds the animated pieces that are
 * single parts, to be filled where they are.
 */
export function voxelize(root: THREE.Object3D, key: string, keep: Set<THREE.Object3D> = new Set()): void {
  const joints: THREE.Object3D[] = [], own: THREE.Mesh[] = [];
  root.traverse((o) => { if (!(o as THREE.Mesh).isMesh) joints.push(o); else if (keep.has(o) && solid(o)) own.push(o); });
  const known = cache.get(key), geos = known ?? [];
  joints.forEach((j, ji) => {
    const parts = j.children.filter((c): c is THREE.Mesh => !keep.has(c) && solid(c));
    if (!parts.length) return;
    if (!known) geos[ji] = cubesOf(parts, false);
    for (const m of parts) j.remove(m);
    const geo = geos[ji];
    if (geo) {
      const mesh = new THREE.Mesh(geo, VOX_MAT);
      mesh.castShadow = true;
      mesh.userData.plain = true;
      j.add(mesh);
    }
  });
  own.forEach((m, k) => {
    const at = joints.length + k;
    if (!known) geos[at] = cubesOf([m], true);
    const geo = geos[at];
    if (geo) { m.geometry = geo; m.material = VOX_MAT; m.userData.plain = true; }
  });
  if (!known) cache.set(key, geos);
}
