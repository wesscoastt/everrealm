import * as THREE from 'three';
import * as P from '../world/props';
import { mountModel } from '../entities/creatures';
import type { GameApi } from './api';
import type { SetPiece } from '../data/content/types';
import type { VoxelWorld } from '../world/VoxelWorld';

// Story set pieces (data/content: RegionContent.pieces): things that stand in the world only while a
// chapter needs them. A Harrowgate wagon stopped on the verge with its barrels, a camp's fire and
// bedrolls the night after the sitting. Each is built when it should be there and you're near enough to
// see it, and taken away again when its chapter has moved on.

const NEAR = 170;

export class SetPieces {
  private live = new Map<string, { o: THREE.Object3D; fire?: THREE.Mesh }>();
  private t = 0;

  constructor(private scene: THREE.Scene, private voxels: VoxelWorld, private M: P.PropMaterials, private pieces: SetPiece[]) {}

  update(dt: number, g: GameApi, at: THREE.Vector3): void {
    for (const l of this.live.values()) if (l.fire) l.fire.rotation.y += dt * 0.6;
    this.t -= dt;
    if (this.t > 0) return;
    this.t = 0.5;
    for (const p of this.pieces) {
      const want = Math.hypot(p.x - at.x, p.z - at.z) < NEAR && this.voxels.isLoaded(p.x, p.z) && p.when(g);
      const have = this.live.get(p.id);
      if (want && !have) {
        const built = this.build(p);
        const y = p.y ?? this.voxels.groundBelow(p.x, at.y + 40, p.z);
        built.o.position.set(p.x, y, p.z);
        built.o.rotation.y = p.ry ?? 0;
        this.scene.add(built.o);
        this.live.set(p.id, built);
      } else if (!want && have) {
        this.scene.remove(have.o);
        this.live.delete(p.id);
      }
    }
  }

  private build(p: SetPiece): { o: THREE.Object3D; fire?: THREE.Mesh } {
    const M = this.M;
    switch (p.kind) {
      case 'wagon': {
        // A company wagon under a tilt, its horse still in the shafts
        const m = mountModel({ coat: '#5a3a24', mane: '#1e1610', cloth: p.tint ?? '#7a2a24', seats: 3, wagon: { kind: 'covered', bed: 20, paint: p.tint ?? '#7a2a24', canvas: '#d8c8a8' } } as Parameters<typeof mountModel>[0]);
        return { o: m.root };
      }
      case 'barrels': {
        // Barrels set down off a tailboard, one on its side
        const g = new THREE.Group();
        [[0, 0, 0], [0.75, 0, 0.2], [-0.2, 0, 0.8]].forEach(([x, , z], i) => { const b = P.barrel(M); b.position.set(x, 0, z); b.rotation.y = i * 0.7; g.add(b); });
        const lying = P.barrel(M); lying.rotation.z = Math.PI / 2; lying.position.set(0.9, 0.38, 1.0); g.add(lying);
        return { o: g };
      }
      case 'campfire': {
        const g = P.firepit(M);
        const flame = new THREE.Mesh(P.campFlame(), M.fire);
        g.add(flame);
        const light = new THREE.PointLight('#ff9a40', 1.4, 10, 1.6); light.position.y = 0.9; g.add(light);
        return { o: g, fire: flame };
      }
      case 'bedroll': {
        // A blanket rolled out on a groundsheet, the pack at its head for a pillow
        const g = new THREE.Group();
        g.add(new THREE.Mesh(P.box(0.9, 0.05, 2.0), P.flat('#4a4436')).translateY(0.03));
        g.add(new THREE.Mesh(P.box(0.8, 0.12, 1.5), P.flat(p.tint ?? '#7a3a2e')).translateY(0.1).translateZ(0.2));
        g.add(new THREE.Mesh(P.box(0.6, 0.3, 0.35), P.flat('#6a5a3e')).translateY(0.18).translateZ(-0.8));
        return { o: g };
      }
      case 'tent':
        return { o: P.tent(M, p.tint ?? '#c8b890') };
      case 'rope': {
        // A rope hanging straight down from an edge, a knot at the top and a loose coil at the foot
        const g = new THREE.Group(), len = p.len ?? 6, hemp = P.flat('#b8a070');
        g.add(new THREE.Mesh(P.cyl(0.05, 0.05, len, 6), hemp).translateY(-len / 2));
        g.add(new THREE.Mesh(P.box(0.22, 0.22, 0.22), hemp));
        for (let i = 0; i < 3; i++) g.add(new THREE.Mesh(P.cyl(0.3 - i * 0.06, 0.3 - i * 0.06, 0.06, 10), hemp).translateY(-len + 0.04 + i * 0.06));
        return { o: g };
      }
    }
  }

  dispose(): void { for (const l of this.live.values()) this.scene.remove(l.o); this.live.clear(); }
}
