// Roof proportions shared by the voxel builders (chimney heights) and the roof meshes.
// Kept free of three.js so the world workers can import it.

/** Height of a gable roof above the wall plate for a given span. Wide spans pitch a little lower. */
export function roofRise(span: number): number {
  return span * (span > 7 ? 0.5 : 0.56);
}

/** Eave overhang past the walls: thatch hangs further than tile or slate. */
export function roofOverhang(thatch: boolean): number {
  return thatch ? 0.95 : 0.75;
}

/** Height of the ridge above the wall plate, including the overhang's extra slope. */
export function roofApex(span: number, rise: number, overhang: number): number {
  return rise * (1 + (2 * overhang) / span);
}
