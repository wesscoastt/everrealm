import * as THREE from 'three';
import { ITEMS } from '../data/items';
import { PADDOCK_SPOTS, stableAt, STABLES, type StableDef } from '../data/stables';
import { CreatureModel } from '../entities/creatures';
import type { VoxelWorld } from '../world/VoxelWorld';

// The horses for sale, standing in each stable's paddock (data/stables.ts) while you're near: you
// see what you're buying before you buy it. They graze, look up, and turn about now and then.

interface Shown { model: CreatureModel; yaw: number; turn: number; graze: number }

export class Stables {
  private shown = new Map<string, Shown[]>();

  constructor(private scene: THREE.Scene, private voxels: VoxelWorld) {}

  update(dt: number, P: THREE.Vector3): void {
    for (const st of STABLES) {
      const d = Math.hypot(P.x - st.x, P.z - st.z);
      const list = this.shown.get(st.id);
      if (!list && d < 90 && this.voxels.isLoaded(st.x, st.z)) this.show(st);
      else if (list && d > 130) { for (const h of list) this.scene.remove(h.model.root); this.shown.delete(st.id); }
    }
    for (const list of this.shown.values()) for (const h of list) {
      if ((h.turn -= dt) <= 0) { h.turn = 6 + Math.random() * 10; h.yaw += (Math.random() - 0.5) * 1.6; }
      if ((h.graze -= dt) <= 0) { h.graze = 3 + Math.random() * 6; h.model.setAnim(h.model.anim === 'graze' ? 'idle' : 'graze'); }
      const r = h.model.root.rotation;
      r.y += (h.yaw - r.y) * Math.min(1, dt * 0.8);
      h.model.update(dt, 0);
    }
  }

  private show(st: StableDef): void {
    const list: Shown[] = [];
    st.stock.forEach((s, i) => {
      const m = ITEMS[s.item]?.mount;
      if (!m) return;
      const [u, v] = PADDOCK_SPOTS[i % PADDOCK_SPOTS.length];
      const [x, z] = stableAt(st, u, v);
      const model = new CreatureModel('horse', { a: m.coat, b: m.mane, c: m.cloth, glow: m.glow, breed: m.breed, pillion: m.seats === 2 });
      model.root.position.set(x + 0.5, this.voxels.groundBelow(x + 0.5, 140, z + 0.5), z + 0.5);
      const yaw = Math.random() * Math.PI * 2;
      model.root.rotation.y = yaw;
      this.scene.add(model.root);
      list.push({ model, yaw, turn: Math.random() * 8, graze: Math.random() * 5 });
    });
    this.shown.set(st.id, list);
  }
}
