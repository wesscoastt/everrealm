import { BUSINESSES, keeperSpot } from '../src/data/businesses';
import { heightAt } from '../src/world/terrain';
const b = BUSINESSES[0]; const k = keeperSpot(b); console.log(b.keeper.id, k.at, Math.floor(heightAt(Math.floor(k.at[0]), Math.floor(k.at[1]))));
