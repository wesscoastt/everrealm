import { FISH, MYTHICS, rollFish, TIER_NAME, type BaitKind, type FishWater } from '../src/data/fish';
const N = 200000;
for (const [water, bait, lvl] of [['river', null, 20], ['river', 'worm', 20], ['lake', 'minnow', 50], ['sea', null, 50], ['sea', 'minnow', 50], ['warmsea', 'shrimp', 50], ['swamp', 'minnow', 40], ['cold', 'grub', 60]] as [FishWater, BaitKind | null, number][]) {
  const n = new Map<string, number>(), tiers = new Map<string, number>();
  for (let i = 0; i < N; i++) { const f = rollFish(water, lvl, bait, 0); if (!f) continue; n.set(f.name, (n.get(f.name) ?? 0) + 1); tiers.set(f.tier, (tiers.get(f.tier) ?? 0) + 1); }
  console.log(`${water} lvl ${lvl} bait ${bait ?? 'none'}: ` + [...tiers].map(([t, c]) => `${TIER_NAME[t as never]} ${(c / N * 100).toFixed(2)}%`).join(', '));
  console.log('   ' + [...n].sort((a, b) => b[1] - a[1]).map(([k, c]) => `${k} ${(c / N * 100).toFixed(2)}%`).join(', '));
}
console.log('Ice Spice Fish odds a cast:', MYTHICS.ice_spice_fish.odds, '= 1 in', 1 / MYTHICS.ice_spice_fish.odds, '=', MYTHICS.ice_spice_fish.odds * 100 + '%');
console.log('Megalodon odds a cast:', MYTHICS.megalodon.odds, '= 1 in', 1 / MYTHICS.megalodon.odds, '=', MYTHICS.megalodon.odds * 100 + '%');
console.log('species:', FISH.length);
