# Everrealm art direction

**Voxel world geometry, storybook-fantasy art direction.** The ground, cliffs, ore and trees are built from blocks you can mine and chop. Buildings, characters, creatures and props add authored silhouettes on top of that block world: curved eaves, rounded bevels, cloth, and ornament.

## Block world

- One block is 1 m. Characters stand about 1.8 m tall, so a doorway is 2 blocks and a cottage storey is 4.
- Tiles are 32×32, painted procedurally in `src/world/textures.ts`, and stored in a `DataArrayTexture`. That means no atlas bleeding, and mipmaps work.
- Every exposed vertex gets ambient occlusion, so blocks read as solid without an outline shader.
- Per-block tint jitter plus biome tint fields keep large surfaces from looking flat.
- Terrain rules:
  - Grass on top, then dirt, then stone.
  - Slopes steeper than two blocks show their layers.
  - Sand within a block of water.
  - Snow above y = 46.

## Authored layer (not voxel)

- Roofs are custom meshes: gable, overhang, eaves upturned in three steps, ridge beam, and chimney.
- Characters are built from rounded boxes with painted faces. Proportions are chunky: big hands, broad shoulders, slightly large heads.
- Props: anvil, furnace mouth, lanterns, banners, bell frame, mine cart and rails, stalls, fences, windmill sails, boat, signs.
- Creatures each get a silhouette you can identify from 30 m away:
  - Wolf: long, low, with a tail.
  - Jelly: a cube that squashes and stretches.
  - Rustback: a stepped dome on short legs.

## Palette by region

| Region | Key colours | Light |
| --- | --- | --- |
| Hollindale | Warm grass `#6fae3c`, oak `#7a5130`, cream plaster `#e8dcc0`, red roof `#a9432f`, blue banner `#2c4f8f` | Low warm sun, soft blue fog |
| Turnpike [planned] | Grey stone, blue and gold banners, slate roofs | Clear and bright |
| Hagworm Wood [planned] | Deep greens, violet mushroom glow | Cool shade, light shafts |
| Fleet Coast [planned] | Sand, sea teal, weathered white wood | Hazy and bright |
| Raddle Barrens [planned] | Red clay, ochre, copper glow | Hot, with long shadows |
| Scarth Highlands [planned] | Snow, slate, pale crystal blue | Thin, cold air |

## Lighting

- Hemisphere light plus a directional sun with a shadow frustum that follows the player.
- ACES tone mapping.
- Day/night cycle with four colour keys: dawn, day, dusk, night.
- At night, window and lantern emissives ramp up. Glow is reserved for light sources and rare ore.

## Rarity

Item borders: grey for common, green for uncommon, blue for rare, purple for epic. Ore rarity shows in the material itself (copper has green and orange flecks, tin is pale, silver glints) rather than in particle glow.

## Readability checks

- From the normal camera distance (about 7 m), you can tell which ore you're looking at, which way an enemy is facing, and whether a node has been depleted.
- No floating props, and no chunk seams. Water meets the shore with foam.

## Interface ("Hearthwood")

The UI is built from the same materials as the world, so it doesn't look like a generic fantasy template.

- **Materials.** Panels are dark oak planks inside iron frames with riveted corner brackets. Headers are slate tiles. Inventory sockets are stone. Reading surfaces (dialogue, journal, notes) are parchment. The textures are painted at runtime by `src/ui/skin.ts`, using the same tile painters as the world.
- **Shapes.** Corners are square, never rounded. Bevels are drawn the way a lit block face looks: light on the top and left, dark on the bottom and right. Shadows are hard 1–2 px offsets, not blurs.
- **Type.**
  - Pixelify Sans: labels, numbers and titles at 13 px and up.
  - Alegreya: dialogue and prose.
  - Alegreya Sans: small numbers and UI text, because the pixel face is ambiguous below 13 px.
- **Colour.** Gold is reserved for rarity and elites.
  - Moss green: primary actions, good outcomes.
  - Ember: health and danger.
  - Wheat: energy and quests.
  - Crystal teal: XP and system messages.
- **Signature pieces.**
  - A blocky extruded logo.
  - A square, wood-framed minimap with compass letters.
  - Segmented health and energy bars.
  - A cooldown shown as a dark block filling the slot from the bottom.
  - A hanging cloth zone banner.
  - Pixel portraits of NPCs in dialogue.
