import * as THREE from 'three';
import { HALLS, hallProps, type HallId, type ProjectId } from '../data/guildhalls';
import type { HallsBook } from '../net/Online';
import type { BuiltSite } from '../world/siteProps';
import type { Site } from '../world/sites';

// What stands in the halls on Hall Row, in the live world (data/guildhalls.ts): for each hall the board
// at its gate, and for a hall a guild holds its banners and every wing it's built, as the realm's book has
// them (server/guilds.mjs). The halls themselves are built with the world; only these come and go. Only
// halls near the player are dressed.

export interface GuildHallsHost {
  scene: THREE.Scene;
  /** Turns prop descriptors into meshes, as for any settlement. */
  buildProps(site: Site): BuiltSite;
}

export class GuildHalls {
  /** The realm's book: by hall, who holds it and what's built (empty offline: every hall to let). */
  book: HallsBook = {};
  private raised = new Map<HallId, { key: string; built: BuiltSite }>();

  constructor(private host: GuildHallsHost) {}

  /** Who holds a hall, if anyone. */
  holder(id: HallId): string | null { return this.book[id]?.guild ?? null; }

  /** Dresses the halls within reach of (x, z) as the book has them, and takes down the rest. */
  sync(x: number, z: number): void {
    for (const h of HALLS) {
      const near = Math.abs(h.x0 + h.w / 2 - x) < 220 && Math.abs(h.z0 + h.d / 2 - z) < 220;
      const e = this.book[h.id];
      const key = JSON.stringify(e ?? null);
      const r = this.raised.get(h.id);
      if (r && (!near || r.key !== key)) this.takeDown(h.id);
      if (!near || this.raised.has(h.id)) continue;
      const site: Site = { id: 'hall-' + h.id, name: '', region: 'greenwake', x: h.x0 + h.w / 2, z: h.z0 + h.d / 2, r: 200, named: false, props: hallProps(h, e?.guild ?? null, (e?.built ?? []) as ProjectId[], e?.honour ?? []), rects: [], impostor: [] };
      const built = this.host.buildProps(site);
      this.host.scene.add(built.group);
      this.raised.set(h.id, { key, built });
    }
  }

  private takeDown(id: HallId): void {
    const r = this.raised.get(id);
    if (!r) return;
    this.raised.delete(id);
    this.host.scene.remove(r.built.group);
    r.built.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !m.geometry.userData.shared) m.geometry.dispose();
    });
  }
}
