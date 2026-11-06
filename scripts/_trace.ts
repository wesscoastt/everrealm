import { Overrides, plan } from '../src/world/sites';
const want = process.argv.slice(2).map(Number);
const orig = Overrides.prototype.set;
Overrides.prototype.set = function (x: number, y: number, z: number, id: number) {
  if (Math.floor(x) === want[0] && Math.floor(y) === want[1] && Math.floor(z) === want[2]) console.log('set', id, new Error().stack!.split('\n').slice(2, 5).join(' | '));
  return orig.call(this, x, y, z, id);
};
plan();
