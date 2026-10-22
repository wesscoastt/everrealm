import * as THREE from 'three';
import { Appearance, HeldItem, Humanoid } from './humanoid';
import type { CreatureAnim } from './creatures';

// People who fight: bandits in their camps. A humanoid body driven the way Enemy drives a creature
// (setAnim, update, flashHit), so the same AI, telegraphs and combat work for them. Each foe gets
// its own face and hair from a seed, and its own copies of its materials so a hit's flash lights
// only it, not every townsperson who shares its colours.

const SKINS = ['#f0cfb0', '#e2b894', '#d8a882', '#c89070', '#b07a52', '#8a5a3a'];
const HAIRS = ['#1e1612', '#3a2418', '#6a4a2a', '#9a948c', '#7a3a1e', '#c8a060'];

export class FoeModel {
  readonly kind = 'bandit' as const;
  readonly body: Humanoid;
  plateHeight = 2.4;
  anim: CreatureAnim = 'idle';
  animTime = 0;
  private flash = 0;
  private flashed = false;
  private mats: THREE.MeshLambertMaterial[] = [];
  private base: THREE.Color[] = [];

  constructor(outfit: Partial<Appearance>, held: HeldItem, seed: number) {
    const r = (k: number) => { const v = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
    const look: Appearance = {
      skin: SKINS[Math.floor(r(1) * SKINS.length)], hair: HAIRS[Math.floor(r(2) * HAIRS.length)], hairStyle: Math.floor(r(3) * 5), eyes: '#3a2a1a',
      tunic: '#4a3a2a', trim: '#8a6a3a', trousers: '#3a3430', boots: '#2a1e14',
      beard: r(4) < 0.45, frame: r(5) < 0.3 ? 'f' : 'm', build: 0.92 + r(6) * 0.22, age: 0.2 + r(7) * 0.5, scar: r(8) < 0.3,
      ...outfit,
    };
    this.body = new Humanoid(look);
    this.body.setHeld(held);
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !(m.material as THREE.MeshLambertMaterial).isMeshLambertMaterial) return;
      const own = (m.material as THREE.MeshLambertMaterial).clone();
      m.material = own;
      this.mats.push(own);
      this.base.push(own.emissive.clone());
    });
  }

  get root(): THREE.Group { return this.body.root; }

  setAnim(a: CreatureAnim): void {
    if (a !== this.anim) { this.anim = a; this.animTime = 0; }
  }

  flashHit(): void { this.flash = 0.12; }

  update(dt: number, speed: number): void {
    this.animTime += dt;
    if (this.flash > 0) {
      this.flash -= dt;
      for (const m of this.mats) m.emissive.setRGB(0.9, 0.85, 0.8);
      this.flashed = true;
    } else if (this.flashed) {
      this.flashed = false;
      this.mats.forEach((m, i) => m.emissive.copy(this.base[i]));
    }
    const B = this.body;
    switch (this.anim) {
      case 'windup':
        // The swing's first moment, held: the blade drawn back
        B.setState('attack'); B.stateTime = 0;
        break;
      case 'attack': B.setState('attack'); break;
      case 'hit': B.setState('hit'); break;
      case 'dead': B.setState('dead'); break;
      case 'run': B.setState('run'); break;
      case 'walk': B.setState('walk'); break;
      default: B.setState('idle');
    }
    B.update(dt, speed);
  }
}
