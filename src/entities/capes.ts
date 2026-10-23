import * as THREE from 'three';

// Cloak designs (data/capes.ts), drawn on a cloth texture: the cloak's colour, and the device in its
// trim colour. One texture per cloth, trim and design, shared by everyone wearing it.

const cache = new Map<string, THREE.CanvasTexture>();

export function capeTexture(cloth: string, trim: string, design: string): THREE.CanvasTexture {
  const key = `${cloth}|${trim}|${design}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const W = 64, H = 96;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  x.fillStyle = cloth; x.fillRect(0, 0, W, H);
  // A little weave, so it reads as cloth
  x.fillStyle = 'rgba(0,0,0,0.07)';
  for (let y = 0; y < H; y += 3) x.fillRect(0, y, W, 1);
  x.fillStyle = trim; x.strokeStyle = trim; x.lineCap = 'round'; x.lineJoin = 'round';
  const cx = W / 2, cy = H * 0.42;
  const line = (pts: [number, number][], w = 3) => { x.lineWidth = w; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke(); };
  const poly = (pts: [number, number][]) => { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill(); };
  const circle = (a: number, b: number, r: number, fill = true) => { x.beginPath(); x.arc(a, b, r, 0, Math.PI * 2); if (fill) x.fill(); else x.stroke(); };
  switch (design) {
    case 'border': x.lineWidth = 4; x.strokeRect(6, 6, W - 12, H - 12); break;
    case 'quartered': x.fillRect(0, 0, W / 2, H / 2); x.fillRect(W / 2, H / 2, W / 2, H / 2); break;
    case 'chevron': poly([[4, 62], [cx, 30], [W - 4, 62], [W - 4, 76], [cx, 44], [4, 76]]); break;
    case 'chequy': for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2 === 0) x.fillRect(i * 16, j * 16, 16, 16); break;
    case 'tally': for (let i = 0; i < 4; i++) line([[16 + i * 10, 22], [16 + i * 10, 62]], 4); line([[10, 52], [54, 30]], 4); break;
    case 'star': { const pts: [number, number][] = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 9 : 22; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } poly(pts); break; }
    case 'lantern': x.fillRect(cx - 9, cy - 10, 18, 24); x.fillRect(cx - 12, cy - 14, 24, 4); x.fillRect(cx - 12, cy + 14, 24, 4); line([[cx - 6, cy - 14], [cx, cy - 22], [cx + 6, cy - 14]], 2); x.fillStyle = 'rgba(255,220,140,0.85)'; x.fillRect(cx - 5, cy - 6, 10, 16); break;
    case 'flame': x.beginPath(); x.moveTo(cx, cy - 24); x.bezierCurveTo(cx + 18, cy - 6, cx + 14, cy + 16, cx, cy + 18); x.bezierCurveTo(cx - 14, cy + 16, cx - 18, cy - 4, cx - 4, cy - 12); x.bezierCurveTo(cx - 4, cy - 2, cx + 2, cy - 4, cx, cy - 24); x.fill(); break;
    case 'snowflake': for (let i = 0; i < 3; i++) { const a = (i * Math.PI) / 3; line([[cx - Math.cos(a) * 22, cy - Math.sin(a) * 22], [cx + Math.cos(a) * 22, cy + Math.sin(a) * 22]], 3); for (const s of [1, -1]) { const ex = cx + Math.cos(a) * 14 * s, ey = cy + Math.sin(a) * 14 * s; line([[ex, ey], [ex + Math.cos(a + 0.8) * 6 * s, ey + Math.sin(a + 0.8) * 6 * s]], 2); line([[ex, ey], [ex + Math.cos(a - 0.8) * 6 * s, ey + Math.sin(a - 0.8) * 6 * s]], 2); } } break;
    case 'picks': for (const s of [1, -1]) { line([[cx - 16 * s, cy + 18], [cx + 14 * s, cy - 16]], 4); x.beginPath(); x.moveTo(cx + 4 * s, cy - 22); x.quadraticCurveTo(cx + 18 * s, cy - 18, cx + 22 * s, cy - 6); x.lineWidth = 4; x.stroke(); } break;
    case 'wheel': x.lineWidth = 4; circle(cx, cy, 20, false); circle(cx, cy, 4); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; line([[cx, cy], [cx + Math.cos(a) * 20, cy + Math.sin(a) * 20]], 2); } break;
    case 'key': x.lineWidth = 4; circle(cx, cy - 16, 8, false); line([[cx, cy - 8], [cx, cy + 22]], 4); line([[cx, cy + 14], [cx + 8, cy + 14]], 4); line([[cx, cy + 22], [cx + 8, cy + 22]], 4); break;
    case 'oak': { for (const [a, b, r] of [[0, -14, 8], [-9, -6, 7], [9, -6, 7], [-10, 6, 7], [10, 6, 7], [0, 4, 9]] as const) circle(cx + a, cy + b, r); line([[cx, cy + 10], [cx, cy + 26]], 3); break; }
    case 'waves': for (let k = 0; k < 3; k++) { const y0 = cy - 14 + k * 14; x.lineWidth = 3; x.beginPath(); x.moveTo(8, y0); for (let i = 0; i <= 4; i++) x.quadraticCurveTo(8 + i * 12 + 6, y0 - 7, 8 + i * 12 + 12, y0); x.stroke(); } break;
    case 'anvil': poly([[cx - 22, cy - 10], [cx + 22, cy - 10], [cx + 12, cy], [cx + 8, cy], [cx + 8, cy + 10], [cx + 14, cy + 18], [cx - 14, cy + 18], [cx - 8, cy + 10], [cx - 8, cy], [cx - 16, cy]]); break;
    case 'peak': poly([[6, cy + 18], [cx - 6, cy - 18], [cx + 6, cy - 2], [cx + 14, cy - 12], [W - 6, cy + 18]]); x.fillStyle = '#f4f8fc'; poly([[cx - 12, cy - 6], [cx - 6, cy - 18], [cx + 1, cy - 7]]); break;
    case 'gull': x.beginPath(); x.lineWidth = 4; x.moveTo(cx - 24, cy); x.quadraticCurveTo(cx - 12, cy - 14, cx, cy); x.quadraticCurveTo(cx + 12, cy - 14, cx + 24, cy); x.stroke(); break;
    case 'reed': for (const [a, h] of [[-12, 30], [0, 38], [12, 26]] as const) { line([[cx + a, cy + 22], [cx + a, cy + 22 - h]], 2); } x.fillRect(cx - 3, cy - 18, 6, 14); break;
    case 'stones': for (const [a, w, h] of [[-16, 8, 26], [0, 10, 34], [16, 8, 22]] as const) x.fillRect(cx + a - w / 2, cy + 18 - h, w, h); x.fillRect(6, cy + 18, W - 12, 3); break;
    case 'mushroom': x.beginPath(); x.arc(cx, cy, 20, Math.PI, 0); x.closePath(); x.fill(); x.fillRect(cx - 5, cy, 10, 18); x.fillStyle = 'rgba(255,255,255,0.7)'; circle(cx - 8, cy - 8, 3); circle(cx + 7, cy - 11, 3); break;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  cache.set(key, t);
  return t;
}
