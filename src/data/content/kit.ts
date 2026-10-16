import type { DialogueTree, DNode, DOption, GameApi } from '../../game/api';

// Small helpers for writing content modules. Type-only imports keep this free of cycles.

/** Adds nodes to an existing tree and lets `pick` choose the opening node first (undefined: the tree's own start). */
export function hook(D: Record<string, DialogueTree>, id: string, pick: (g: GameApi) => string | undefined, nodes: Record<string, DNode>): void {
  const t = D[id];
  if (!t) throw new Error(`hook: no dialogue tree "${id}"`);
  const base = t.start;
  t.start = (g) => pick(g) ?? base(g);
  Object.assign(t.nodes, nodes);
}

/** Inserts an option into a node of an existing tree, before its last option (usually "Bye."). */
export function addOption(D: Record<string, DialogueTree>, id: string, node: string, o: DOption): void {
  const opts = D[id]?.nodes[node]?.options;
  if (!opts) throw new Error(`addOption: no options on ${id}.${node}`);
  opts.splice(Math.max(0, opts.length - 1), 0, o);
}

/** Stage of a quest, for brevity in conditions. */
export const at = (g: GameApi, q: string) => g.stage(q);
/** Kills counted for a quest-creature tag or (with "type:") any creature of a type. */
export const killed = (g: GameApi, key: string) => Number(g.flag((key.startsWith('type:') ? 'killed:' + key.slice(5) : 'kills:' + key)) ?? 0);

/** Return type for QuestDef.marks: who wears a "!" (has something for you) or "?" (waiting on you). */
export type Marks = Record<string, '!' | '?'>;
