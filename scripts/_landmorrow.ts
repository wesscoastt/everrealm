// Makes this process Morrow (world/land.ts reads it once, on import): import it first.
(globalThis as unknown as { __everrealmLand: string }).__everrealmLand = 'morrow';
