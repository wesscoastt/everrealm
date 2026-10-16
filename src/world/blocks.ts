// Block registry. Tile indices refer to layers in the procedural texture array.

export enum T {
  GrassTop, GrassSide, Dirt, Stone, Cobble, Sand, Gravel, Snow,
  OakLog, LogTop, OakLeaves, Planks, DarkPlanks, Plaster, StoneBrick, Path,
  CopperOre, TinOre, SilverOre, Depleted, BirchLog, BirchLeaves, PineLeaves, Clay,
  MossyStone, Window, Thatch, Farmland, HayTop, HaySide, MossyCobble, SnowSide,
  DeepStone, PineLog, Timber, Glowcap, RoofRed,
  RedSand, TerraOrange, TerraCream, TerraBrown, IronOre, Crystal, Ice, Loam, Basalt, Count,
}

export enum B {
  Air = 0,
  Grass, Dirt, Stone, Cobble, Sand, Gravel, Snow,
  OakLog, OakLeaves, Planks, DarkPlanks, Plaster, StoneBrick, Path,
  CopperOre, TinOre, SilverOre, Depleted,
  BirchLog, BirchLeaves, PineLog, PineLeaves, Clay, MossyStone,
  Window, Thatch, Farmland, Hay, MossyCobble, DeepStone, Timber, Glowcap,
  Water, Barrier, SnowGrass,
  RedSand, TerraOrange, TerraCream, TerraBrown, IronOre, Crystal, Ice, Loam, Basalt,
  Count,
}

export interface BlockDef {
  name: string;
  top: number;
  side: number;
  bottom: number;
  solid: boolean;
  /** Rendered but neighbours still draw faces against it (leaves, glass). */
  seeThrough?: boolean;
  invisible?: boolean;
  /** Base tint multiplier (r,g,b) applied as vertex colour. */
  tint?: [number, number, number];
  /** Amount of per-block brightness jitter. */
  jitter?: number;
  emissive?: number;
}

const D = (name: string, top: number, side = top, bottom = side, extra: Partial<BlockDef> = {}): BlockDef => ({
  name, top, side, bottom, solid: true, jitter: 0.06, ...extra,
});

export const BLOCKS: BlockDef[] = [];
BLOCKS[B.Air] = { name: 'air', top: 0, side: 0, bottom: 0, solid: false, invisible: true };
BLOCKS[B.Grass] = D('grass', T.GrassTop, T.GrassSide, T.Dirt, { jitter: 0.05 });
BLOCKS[B.Dirt] = D('dirt', T.Dirt);
BLOCKS[B.Stone] = D('stone', T.Stone);
BLOCKS[B.Cobble] = D('cobblestone', T.Cobble);
BLOCKS[B.Sand] = D('sand', T.Sand, T.Sand, T.Sand, { jitter: 0.03 });
BLOCKS[B.Gravel] = D('gravel', T.Gravel);
BLOCKS[B.Snow] = D('snow', T.Snow, T.Snow, T.Snow, { jitter: 0.02 });
BLOCKS[B.OakLog] = D('oak log', T.LogTop, T.OakLog, T.LogTop);
BLOCKS[B.OakLeaves] = D('oak leaves', T.OakLeaves, T.OakLeaves, T.OakLeaves, { seeThrough: true, jitter: 0.12 });
BLOCKS[B.Planks] = D('planks', T.Planks);
BLOCKS[B.DarkPlanks] = D('dark planks', T.DarkPlanks);
BLOCKS[B.Plaster] = D('plaster', T.Plaster, T.Plaster, T.Plaster, { jitter: 0.025 });
BLOCKS[B.StoneBrick] = D('stone brick', T.StoneBrick);
BLOCKS[B.Path] = D('path', T.Path, T.Dirt, T.Dirt, { jitter: 0.05 });
BLOCKS[B.CopperOre] = D('copper ore', T.CopperOre, T.CopperOre, T.CopperOre, { jitter: 0.02 });
BLOCKS[B.TinOre] = D('tin ore', T.TinOre, T.TinOre, T.TinOre, { jitter: 0.02 });
BLOCKS[B.SilverOre] = D('silver ore', T.SilverOre, T.SilverOre, T.SilverOre, { jitter: 0.02, emissive: 0.25 });
BLOCKS[B.Depleted] = D('worked rock', T.Depleted);
BLOCKS[B.BirchLog] = D('birch log', T.LogTop, T.BirchLog, T.LogTop);
BLOCKS[B.BirchLeaves] = D('birch leaves', T.BirchLeaves, T.BirchLeaves, T.BirchLeaves, { seeThrough: true, jitter: 0.1 });
BLOCKS[B.PineLog] = D('pine log', T.LogTop, T.PineLog, T.LogTop);
BLOCKS[B.PineLeaves] = D('pine needles', T.PineLeaves, T.PineLeaves, T.PineLeaves, { seeThrough: true, jitter: 0.08 });
BLOCKS[B.Clay] = D('clay', T.Clay);
BLOCKS[B.MossyStone] = D('mossy stone', T.MossyStone);
BLOCKS[B.Window] = D('window', T.Planks, T.Window, T.Planks, { jitter: 0, emissive: 1 });
BLOCKS[B.Thatch] = D('thatch', T.Thatch);
BLOCKS[B.Farmland] = D('farmland', T.Farmland, T.Dirt, T.Dirt);
BLOCKS[B.Hay] = D('hay', T.HayTop, T.HaySide, T.HayTop);
BLOCKS[B.MossyCobble] = D('mossy cobble', T.MossyCobble);
BLOCKS[B.DeepStone] = D('deep stone', T.DeepStone);
BLOCKS[B.Timber] = D('timber', T.Timber);
BLOCKS[B.Glowcap] = D('glowcap', T.Glowcap, T.Glowcap, T.Glowcap, { emissive: 0.7 });
BLOCKS[B.Water] = { name: 'water', top: 0, side: 0, bottom: 0, solid: false, invisible: true };
BLOCKS[B.Barrier] = { name: 'barrier', top: 0, side: 0, bottom: 0, solid: true, invisible: true };
BLOCKS[B.SnowGrass] = D('snowy grass', T.Snow, T.SnowSide, T.Dirt);
BLOCKS[B.RedSand] = D('red sand', T.RedSand, T.RedSand, T.RedSand, { jitter: 0.04 });
BLOCKS[B.TerraOrange] = D('orange clay', T.TerraOrange, T.TerraOrange, T.TerraOrange, { jitter: 0.03 });
BLOCKS[B.TerraCream] = D('pale clay', T.TerraCream, T.TerraCream, T.TerraCream, { jitter: 0.03 });
BLOCKS[B.TerraBrown] = D('brown clay', T.TerraBrown, T.TerraBrown, T.TerraBrown, { jitter: 0.03 });
BLOCKS[B.IronOre] = D('iron ore', T.IronOre, T.IronOre, T.IronOre, { jitter: 0.02 });
BLOCKS[B.Crystal] = D('star crystal', T.Crystal, T.Crystal, T.Crystal, { jitter: 0, emissive: 1 });
BLOCKS[B.Ice] = D('ice', T.Ice, T.Ice, T.Ice, { jitter: 0.02 });
BLOCKS[B.Loam] = D('forest loam', T.Loam, T.Dirt, T.Dirt, { jitter: 0.05 });
BLOCKS[B.Basalt] = D('basalt', T.Basalt, T.Basalt, T.Basalt);

export function isSolid(id: number): boolean {
  return BLOCKS[id]?.solid ?? false;
}

/** True if a face of a neighbouring opaque block should be drawn against this block. */
export function exposesFace(id: number): boolean {
  if (id === B.Air || id === B.Water || id === B.Barrier) return true;
  return !!BLOCKS[id].seeThrough;
}

export function isLeaves(id: number): boolean {
  return id === B.OakLeaves || id === B.BirchLeaves || id === B.PineLeaves;
}
