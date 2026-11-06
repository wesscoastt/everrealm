import { COLD_HARBOUR } from '../src/world/morrow';
import { heightAt } from '../src/world/terrain';
console.log(COLD_HARBOUR, Math.round(heightAt(COLD_HARBOUR.x - 8, COLD_HARBOUR.z)));
