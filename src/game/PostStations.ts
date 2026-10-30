import * as THREE from 'three';
import { ITEMS } from '../data/items';
import { POST_STATIONS, YARD_CART, YARD_HORSES, yardAt, type PostYard } from '../data/postStations';
import { mountModel, type CreatureModel } from '../entities/creatures';
import { Humanoid } from '../entities/humanoid';
import type { VoxelWorld } from '../world/VoxelWorld';
import { CART, CARTER } from './PostRide';

// The Post's cart standing in each coaching yard (data/postStations.ts) with its carter beside it, and
// a pair of the Post's horses tied at the rail, while you're near. The horses shift and crop at the hay;
// the carter waits. (When you pay, a cart takes you: game/PostRide.ts.)

interface Shown { cart: CreatureModel; carter: Humanoid; horses: { model: CreatureModel; tied: number; yaw: number; turn: number; graze: number }[] }

export class PostStations {
  private shown = new Map<string, Shown>();

  constructor(private scene: THREE.Scene, private voxels: VoxelWorld) {}

  update(dt: number, P: THREE.Vector3): void {
    for (const y of POST_STATIONS) {
      const d = Math.hypot(P.x - y.x, P.z - y.z), s = this.shown.get(y.post);
      if (!s && d < 90 && this.voxels.isLoaded(y.x, y.z)) this.show(y);
      else if (s && d > 130) { this.scene.remove(s.cart.root, s.carter.root, ...s.horses.map((h) => h.model.root)); this.shown.delete(y.post); }
    }
    for (const s of this.shown.values()) {
      s.cart.update(dt, 0);
      s.carter.update(dt, 0);
      for (const h of s.horses) {
        if ((h.turn -= dt) <= 0) { h.turn = 7 + Math.random() * 10; h.yaw = h.tied + (Math.random() - 0.5) * 0.4; } // (tied: a little either way, never round through the rail)
        if ((h.graze -= dt) <= 0) { h.graze = 3 + Math.random() * 6; h.model.setAnim(h.model.anim === 'graze' ? 'idle' : 'graze'); }
        const r = h.model.root.rotation;
        r.y += (h.yaw - r.y) * Math.min(1, dt * 0.8);
        h.model.update(dt, 0);
      }
    }
  }

  private show(y: PostYard): void {
    const ground = (x: number, z: number) => this.voxels.groundBelow(x, y.base + 6, z);
    // Facing along the yard's front (its u), ready to pull out onto the road
    const along = { n: Math.PI / 2, s: -Math.PI / 2, e: 0, w: Math.PI }[y.face];
    const [cx, cz] = yardAt(y, YARD_CART[0], YARD_CART[1]);
    const cart = mountModel(CART);
    cart.root.position.set(cx + 0.5, ground(cx + 0.5, cz + 0.5), cz + 0.5);
    cart.root.rotation.y = along;
    cart.setAnim('idle');
    const carter = new Humanoid(CARTER);
    const [kx, kz] = yardAt(y, YARD_CART[0] - 2.4, YARD_CART[1] + 1.4);
    carter.root.position.set(kx + 0.5, ground(kx + 0.5, kz + 0.5), kz + 0.5);
    carter.root.rotation.y = along + Math.PI / 2;
    carter.setState('idle');
    const coats = ['halter_bay', 'halter_chestnut'];
    const horses = YARD_HORSES.map(([u, v], i) => {
      const m = ITEMS[coats[i % coats.length]]?.mount;
      const model = mountModel({ ...m!, cloth: CART.cloth });
      const [x, z] = yardAt(y, u, v);
      model.root.position.set(x + 0.5, ground(x + 0.5, z + 0.5), z + 0.5);
      // (their heads to the rail, toward the stable)
      const tied = { n: 0, s: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 }[y.face], yaw = tied + (Math.random() - 0.5) * 0.3;
      model.root.rotation.y = yaw;
      return { model, tied, yaw, turn: Math.random() * 8, graze: Math.random() * 5 };
    });
    this.scene.add(cart.root, carter.root, ...horses.map((h) => h.model.root));
    this.shown.set(y.post, { cart, carter, horses });
  }
}
