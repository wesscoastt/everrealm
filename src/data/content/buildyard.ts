import { B } from '../../world/blocks';
import type { ItemDef } from '../items';
import type { ShopDef } from '../shops';
import type { RegionContent } from './types';

// Building blocks, for laying by hand on your own lot (game/LotBuild.ts): stone, brick, timber, plaster,
// roofing and glass, a block apiece, sold by the land clerks from the Charter's builders' yard. Dig out
// a block you laid and it comes back to your pack; dig out the ground or the builders' walls and it
// doesn't (the Charter's stone is the Charter's).

type Kind = 'bar' | 'log';
const blocks: [id: string, name: string, block: number, price: number, a: string, b: string, shape: Kind, desc: string][] = [
  ['blk_cobble', 'Fieldstone', B.Cobble, 1, '#8a8a86', '#5a5a58', 'bar', 'Stone picked off the fields. Walls, footings, a sheepfold.'],
  ['blk_stonebrick', 'Dressed stone', B.StoneBrick, 2, '#a8a8a2', '#6a6a66', 'bar', 'Squared blocks from the Kelderby quarries.'],
  ['blk_granite', 'Granite', B.Granite, 2, '#b0a8a4', '#6a6260', 'bar', 'Grey and pink, hard as a debt.'],
  ['blk_redbrick', 'Red brick', B.RedBrick, 2, '#a8503a', '#6a2e22', 'bar', 'Kiln brick from the clay pits.'],
  ['blk_sandstone', 'Sandstone', B.Sandstone, 3, '#d8b878', '#a08048', 'bar', 'Honey-coloured ashlar.'],
  ['blk_whitestone', 'White stone', B.Whitestone, 3, '#ece6d8', '#b8b0a0', 'bar', 'The pale stone Callis builds in.'],
  ['blk_blackstone', 'Black stone', B.Blackstone, 3, '#3a3a40', '#1a1a20', 'bar', 'The dark stone Callis pins its towers with.'],
  ['blk_carved', 'Carved stone', B.CarvedStone, 5, '#c8c0a8', '#8a8270', 'bar', 'A frieze course, cut by a mason who charges for it.'],
  ['blk_flagstone', 'Flagstone', B.Flagstone, 2, '#9a968a', '#5a564c', 'bar', 'Flat slabs for a floor or a yard.'],
  ['blk_brickpave', 'Brick paving', B.BrickPave, 2, '#a85a42', '#6a3426', 'bar', 'Bricks laid on edge for a path.'],
  ['blk_planks', 'Planks', B.Planks, 1, '#c89a5a', '#8a6232', 'log', 'Sawn boards: floors, shutters, a lean-to.'],
  ['blk_darkplanks', 'Dark planks', B.DarkPlanks, 1, '#6a4a2a', '#3a2614', 'log', 'Oak boards, tarred dark.'],
  ['blk_timber', 'Timber framing', B.Timber, 2, '#5a3a20', '#e8dcc0', 'log', 'Posts and rails for a timber-framed wall.'],
  ['blk_oaklog', 'Oak log', B.OakLog, 1, '#7a5a34', '#4a3420', 'log', 'A whole log, bark on.'],
  ['blk_plaster', 'Lime plaster', B.Plaster, 1, '#ece4d0', '#b8ae98', 'bar', 'Wattle and daub under a lime wash.'],
  ['blk_ochre', 'Ochre limewash', B.OchrePlaster, 2, '#e0b860', '#a8842e', 'bar', 'Plaster washed with yellow earth.'],
  ['blk_rose', 'Pink limewash', B.RosePlaster, 2, '#e8b0a8', '#b0766c', 'bar', 'Plaster washed pink with red earth.'],
  ['blk_blue', 'Blue limewash', B.BluePlaster, 2, '#a8c0d8', '#6a84a0', 'bar', 'Plaster washed a harbour blue.'],
  ['blk_thatch', 'Thatch', B.Thatch, 1, '#c8a860', '#8a7034', 'log', 'Reed bundles for a roof.'],
  ['blk_terracotta', 'Terracotta', B.TerraOrange, 2, '#c8743a', '#8a4a22', 'bar', 'Fired clay, the orange of a roof tile.'],
  ['blk_window', 'Glazed window', B.Window, 4, '#a8c8e0', '#5a3a20', 'bar', 'A small-paned window in its frame.'],
  ['blk_hay', 'Hay bale', B.Hay, 1, '#e0c870', '#a89038', 'log', 'For a barn, or for sitting on.'],
  ['blk_loam', 'Garden loam', B.Loam, 1, '#5a4030', '#3a2a1e', 'bar', 'Good dark earth for a bed or a bank.'],
  ['blk_gravel', 'Gravel', B.Gravel, 1, '#9a948a', '#6a645a', 'bar', 'For a path that crunches.'],
];

/** The blocks you can lay, by item, and back from block to item. */
export const BUILD_BLOCKS: { item: string; block: number }[] = blocks.map(([item, , block]) => ({ item, block }));

const items: ItemDef[] = blocks.map(([id, name, , price, a, b, shape, desc]) => ({
  id, name: `${name} (block)`, kind: 'material', rarity: 'common', stack: true, value: Math.max(1, Math.round(price / 2)), icon: { shape, a, b }, desc,
  stats: 'Lay it on your own lot: Build on your lot, then E.',
} as ItemDef));

/** The builders' yard as a land clerk sells from it (one to each clerk: a shop closes when you walk away from its keeper). */
export const yardShop = (owner: string, assembly = false): ShopDef => ({
  id: 'yard_' + owner, name: assembly ? 'The Assembly\'s builders\' yard' : 'The Charter\'s builders\' yard', owner,
  stock: blocks.map(([item, , , price]) => ({ item, price })), buyRate: () => 0.5, footer: () => 'A block apiece. Half back on what you return.',
} as ShopDef);

export const BUILDYARD_CONTENT: RegionContent = { id: 'buildyard', items };
