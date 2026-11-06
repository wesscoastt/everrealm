import { plan } from '../src/world/sites';
import { heightAt } from '../src/world/terrain';
const P = plan() as any;
for (const [x, z] of [[1820, 545], [1820, 538], [1817, 560]]) {
  console.log(x, z, 'h', heightAt(x, z), P.sites.filter((s: any) => s.rects.some((r: number[]) => x >= r[0] && x < r[2] && z >= r[1] && z < r[3])).map((s: any) => s.id + ' ' + JSON.stringify(s.rects.find((r: number[]) => x >= r[0] && x < r[2] && z >= r[1] && z < r[3]))).join('; '));
}
