import { heightAt } from '../src/world/terrain';
for (const [n, x, z] of [['josep', 7868.5, 286.5], ['rim anchor', 7870.5, 291.5], ['rosa', 7860.5, 236.5], ['post', 7866.5, 233.5], ['falls foot', 7938.5, 477.5], ['rift near', 7930, 470]] as const) console.log(n, heightAt(Math.floor(x), Math.floor(z)));
