// Block registry. Tile indices refer to layers in the procedural texture array.

export enum T {
  GrassTop, GrassSide, Dirt, Stone, Cobble, Sand, Gravel, Snow,
  OakLog, LogTop, OakLeaves, Planks, DarkPlanks, Plaster, StoneBrick, Path,
  CopperOre, TinOre, SilverOre, Depleted, BirchLog, BirchLeaves, PineLeaves, Clay,
  MossyStone, Window, Thatch, Farmland, HayTop, HaySide, MossyCobble, SnowSide,
  DeepStone, PineLog, Timber, Glowcap, RoofRed,
  RedSand, TerraOrange, TerraCream, TerraBrown, IronOre, Crystal, Ice, Loam, Basalt,
  MyceliumTop, MyceliumSide, MushStem, StemTop, CapBrown, CapInk, CapRed, Gills, CapGlow,
  // Kell: the Kilnfolk's brass and copper plate, the volcano's ash and its ember rock
  Brass, Copper, Ash, Emberstone,
  // Morrow: the white stone that lifts, worked smooth, and the black that holds it down
  Whitestone, Blackstone,
  // Towns: brick, honey sandstone, flagstones, brick paving, a carved frieze, and lime washed in colour
  RedBrick, Sandstone, Flagstone, BrickPave, CarvedStone, OchrePlaster, RosePlaster, BluePlaster,
  // The wilds: a meadow in flower, granite, peat
  FlowerGrass, Granite, Peat,
  Count,
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
  // Inkholm: the mushroom isle's ground, and its giant mushrooms' stems, caps and gills
  Mycelium, MushStem, CapBrown, CapInk, CapRed, Gills, CapGlow,
  // Kell (the clockwork isle): riveted brass and verdigris copper plate, black ash, rock with live cracks
  Brass, Copper, Ash, Emberstone,
  // Morrow (the second continent): dressed white crystal-stone, and the black keystone that holds it
  Whitestone, Blackstone,
  // Towns: red brick, honey sandstone ashlar, big paving flags, brick laid in a basket weave, a carved
  // frieze for a cornice or a string course, and plaster limewashed ochre, Suffolk pink and pale blue
  RedBrick, Sandstone, Flagstone, BrickPave, CarvedStone, OchrePlaster, RosePlaster, BluePlaster,
  // The wilds: grass full of flowers, speckled granite on the high ground, black peat on the moor
  FlowerGrass, Granite, Peat,
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
BLOCKS[B.Mycelium] = D('mycelium', T.MyceliumTop, T.MyceliumSide, T.Dirt, { jitter: 0.05 });
BLOCKS[B.MushStem] = D('mushroom stem', T.StemTop, T.MushStem, T.StemTop, { jitter: 0.03 });
BLOCKS[B.CapBrown] = D('mushroom cap', T.CapBrown, T.CapBrown, T.Gills, { jitter: 0.05 });
BLOCKS[B.CapInk] = D('ink cap', T.CapInk, T.CapInk, T.CapInk, { jitter: 0.04 });
BLOCKS[B.CapRed] = D('red cap', T.CapRed, T.CapRed, T.Gills, { jitter: 0.04 });
BLOCKS[B.Gills] = D('gills', T.Gills, T.Gills, T.Gills, { jitter: 0.03 });
BLOCKS[B.CapGlow] = D('lantern cap', T.CapGlow, T.CapGlow, T.Gills, { jitter: 0.03, emissive: 0.9 });
BLOCKS[B.Brass] = D('brass plate', T.Brass, T.Brass, T.Brass, { jitter: 0.02 });
BLOCKS[B.Copper] = D('copper plate', T.Copper, T.Copper, T.Copper, { jitter: 0.03 });
BLOCKS[B.Ash] = D('ash', T.Ash, T.Ash, T.Ash, { jitter: 0.05 });
BLOCKS[B.Emberstone] = D('ember rock', T.Emberstone, T.Emberstone, T.Emberstone, { jitter: 0.03, emissive: 1 });
BLOCKS[B.Whitestone] = D('whitestone', T.Whitestone, T.Whitestone, T.Whitestone, { jitter: 0.03 });
BLOCKS[B.Blackstone] = D('blackstone', T.Blackstone, T.Blackstone, T.Blackstone, { jitter: 0.02 });
BLOCKS[B.RedBrick] = D('red brick', T.RedBrick, T.RedBrick, T.RedBrick, { jitter: 0.04 });
BLOCKS[B.Sandstone] = D('sandstone', T.Sandstone, T.Sandstone, T.Sandstone, { jitter: 0.04 });
BLOCKS[B.Flagstone] = D('flagstones', T.Flagstone, T.Sandstone, T.Sandstone, { jitter: 0.05 });
BLOCKS[B.BrickPave] = D('brick paving', T.BrickPave, T.RedBrick, T.RedBrick, { jitter: 0.04 });
BLOCKS[B.CarvedStone] = D('carved stone', T.Sandstone, T.CarvedStone, T.Sandstone, { jitter: 0.02 });
BLOCKS[B.OchrePlaster] = D('ochre limewash', T.OchrePlaster, T.OchrePlaster, T.OchrePlaster, { jitter: 0.025 });
BLOCKS[B.RosePlaster] = D('pink limewash', T.RosePlaster, T.RosePlaster, T.RosePlaster, { jitter: 0.025 });
BLOCKS[B.BluePlaster] = D('blue limewash', T.BluePlaster, T.BluePlaster, T.BluePlaster, { jitter: 0.025 });
BLOCKS[B.FlowerGrass] = D('meadow', T.FlowerGrass, T.GrassSide, T.Dirt, { jitter: 0.05 });
BLOCKS[B.Granite] = D('granite', T.Granite, T.Granite, T.Granite, { jitter: 0.04 });
BLOCKS[B.Peat] = D('peat', T.Peat, T.Peat, T.Peat, { jitter: 0.05 });

export function isSolid(id: number): boolean {
  return BLOCKS[id]?.solid ?? false;
}

/** Plaster in any wash: a house front built of it is a plastered one (see sites.houseInto). */
export function isPlaster(id: number | undefined): boolean {
  return id === B.Plaster || id === B.OchrePlaster || id === B.RosePlaster || id === B.BluePlaster;
}

/** True if a face of a neighbouring opaque block should be drawn against this block. */
export function exposesFace(id: number): boolean {
  if (id === B.Air || id === B.Water || id === B.Barrier) return true;
  return !!BLOCKS[id].seeThrough;
}

export function isLeaves(id: number): boolean {
  return id === B.OakLeaves || id === B.BirchLeaves || id === B.PineLeaves;
}
