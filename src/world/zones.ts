import * as THREE from 'three';

// Lighting by room under the ground (the dungeon pass, after the dark-crawler kit's zones): each hall of a
// dungeon or a delve says how it is lit, and the light eases from one to the next over a second or so as
// you walk through. A zone sets the fog (its colour and how near it closes in), the fill from above and
// below (what the dark corners get), the grade (warm lights, cool shadows), how hard the torches flicker,
// and its key: one strong light on the room's set piece, with the rest left darker round it.
// The builders in world/sites.ts lay the zones (caveKit gives every chamber one from its rock's lamp
// colour; a set piece's room is given its own); game/GameWorld.ts eases to the one you stand in, and
// core/PostFX.ts reads the grade.

export interface ZoneLook {
  /** The fog's colour, and where it starts and closes in (blocks). */
  fog: string; near: number; far: number;
  /** The fill: from above, from below, and how strong. */
  sky: string; ground: string; hemi: number;
  /** The grade on the lights and on the shadows (RGB multipliers about 1). */
  warm?: [number, number, number]; cool?: [number, number, number];
  /** The one hero light: where it hangs (world), its colour, strength and reach. */
  key?: { x: number; y: number; z: number; color: string; power: number; reach: number };
  /** How hard the lamps flicker here (1 the usual, 2.5 a draughty hall of torches). */
  flick?: number;
}

/** A zone: an ellipse round (x, z), between floors y0 and y1 (world). The last laid that holds you wins. */
export interface LightZone extends ZoneLook { x: number; z: number; rx: number; rz: number; y0: number; y1: number; name?: string }

/** What the room under your feet asks of the grade this frame (GameWorld writes it, PostFX reads it). */
export const ZONE_GRADE = { on: 0, warm: new THREE.Color(1, 1, 1), cool: new THREE.Color(1, 1, 1) };

const mix = (a: string, b: string, t: number) => mixHex(a, b, t);

/** A plain room's light from its lamps' colour: a touch of it in the fog and the fill, the torches flickering a little more than up top. */
export function zoneFromLamp(light: string): ZoneLook {
  return {
    fog: mix('#0b0c0f', light, 0.07), near: 18, far: 110,
    sky: mix('#8a94a4', light, 0.28), ground: mix('#4a4038', light, 0.12), hemi: 1.45,
    flick: 1.6,
  };
}

/** Is (x, y, z) inside the zone? */
export function inZone(z: LightZone, x: number, y: number, zz: number): boolean {
  if (y < z.y0 - 2 || y > z.y1 + 1) return false;
  const dx = (x - z.x) / z.rx, dz = (zz - z.z) / z.rz;
  return dx * dx + dz * dz <= 1;
}

/** A colour part way from one to another, as a hex string (for laying zones at plan time). */
export const mixHex = (a: string, b: string, t: number): string => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
