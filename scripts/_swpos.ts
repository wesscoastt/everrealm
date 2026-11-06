import { NPCS } from '../src/data/npcs';
import { heightAt } from '../src/world/terrain';
for (const id of ['hall_thomas', 'hall_josiah', 'gc_simon', 'gil_fenner', 'co_montserrat', 'inf_laia']) {
  const n = NPCS.find((x) => x.id === id); const s = n?.schedule[0];
  console.log(id, s?.at, 'y', s?.y, 'terrain', s ? Math.round(heightAt(Math.floor(s.at[0]), Math.floor(s.at[1]))) : '-');
}
console.log('bm', Math.round(heightAt(1616, 596)));
