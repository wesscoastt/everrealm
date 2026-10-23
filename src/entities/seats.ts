import type { MountLook } from './creatures';
import { WAGON_ROWS } from './voxmounts';

// Where everyone sits on a mount: the rider astride the saddle, or on a wagon's box; passengers
// behind the saddle on a two-seat horse, or on the benches in a wagon's back, two to a row.
// The lift is how far the figure is raised off the ground under it; the pose is how it sits.

export type SeatPose = 'ride' | 'seated';
export interface Seat { x: number; y: number; z: number; yaw: number; lift: number; pose: SeatPose }

const SADDLE = 1.08, BOX = 0.88, BENCH = 0.68, PILLION_BACK = 0.55;

export const riderLift = (m?: MountLook | null): number => (m?.wagon ? BOX : SADDLE);
export const riderPose = (m?: MountLook | null): SeatPose => (m?.wagon ? 'seated' : 'ride');
/** Seats past the rider's own. */
export const spareSeats = (m?: MountLook | null): number => Math.max(0, (m?.seats ?? 1) - 1);

/** Passenger i's seat on a mount standing at x, y, z and facing yaw (null: no such seat). */
export function passengerSeat(m: MountLook | undefined | null, i: number, x: number, y: number, z: number, yaw: number): Seat | null {
  if (!m || i < 0 || i >= spareSeats(m)) return null;
  const back = m.wagon ? WAGON_ROWS[i >> 1] ?? WAGON_ROWS[0] : PILLION_BACK;
  const side = m.wagon ? (i & 1 ? -0.34 : 0.34) : 0;
  const sn = Math.sin(yaw), cs = Math.cos(yaw);
  return { x: x - sn * back + cs * side, y, z: z - cs * back - sn * side, yaw, lift: m.wagon ? BENCH : SADDLE, pose: m.wagon ? 'seated' : 'ride' };
}
