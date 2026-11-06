import { chimneyCell } from '../src/world/interiors';
import { HALLS } from '../src/data/guildhalls';
for (const h of HALLS) { const c = chimneyCell({ x0: h.x0, z0: h.z0, w: h.w, d: h.d, floors: 2, base: h.base, door: h.door } as any); console.log(h.id, h.door, c, c ? [c[0] - h.x0, h.door === 's' ? h.z0 + h.d - 1 - c[1] : c[1] - h.z0] : null); }
