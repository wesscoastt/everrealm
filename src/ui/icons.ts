import { IconSpec, ITEMS } from '../data/items';

// Pixel-art icons painted at 32x32 and shown with image-rendering: pixelated.

const cache = new Map<string, string>();

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return `rgb(${r},${g},${b})`;
}

function paint(spec: IconSpec): string {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const x = c.getContext('2d')!;
  const px = (cx: number, cy: number, w: number, h: number, col: string) => { x.fillStyle = col; x.fillRect(cx, cy, w, h); };
  const outline = '#1a120c';
  const a = spec.a, b = spec.b ?? shade(spec.a, 0.7);
  const diag = (x0: number, y0: number, len: number, w: number, col: string) => {
    for (let i = 0; i < len; i++) px(x0 + i, y0 - i, w, w, col);
  };
  switch (spec.shape) {
    case 'ore': {
      px(6, 10, 20, 16, outline); px(8, 8, 16, 20, outline);
      px(8, 10, 16, 16, '#7f8389'); px(9, 9, 14, 2, '#9da1a6'); px(8, 22, 16, 4, '#5d6066');
      for (const [ox, oy, s] of [[10, 12, 4], [17, 14, 5], [12, 19, 4], [19, 21, 3]]) { px(ox, oy, s, s, a); px(ox, oy, 1, 1, '#ffffff'); }
      px(15, 11, 2, 2, b); px(11, 24, 2, 2, b);
      break;
    }
    case 'bar': {
      x.fillStyle = outline; x.beginPath(); x.moveTo(4, 24); x.lineTo(10, 12); x.lineTo(28, 12); x.lineTo(28, 22); x.lineTo(22, 26); x.lineTo(4, 26); x.fill();
      x.fillStyle = a; x.beginPath(); x.moveTo(6, 24); x.lineTo(11, 14); x.lineTo(26, 14); x.lineTo(21, 24); x.fill();
      x.fillStyle = shade(a, 0.7); x.beginPath(); x.moveTo(21, 24); x.lineTo(26, 14); x.lineTo(26, 21); x.lineTo(21, 25); x.fill();
      px(12, 15, 10, 2, shade(a, 1.35));
      break;
    }
    case 'log': {
      px(4, 11, 24, 12, outline); px(5, 12, 20, 10, a); px(5, 13, 20, 1, shade(a, 1.3)); px(5, 19, 20, 2, shade(a, 0.7));
      px(23, 11, 6, 12, outline); px(24, 12, 4, 10, b); px(25, 14, 2, 6, shade(b, 0.8)); px(25, 16, 2, 2, shade(b, 1.2));
      break;
    }
    case 'fish':
    case 'cooked': {
      const body = spec.shape === 'cooked' ? a : a;
      x.fillStyle = outline; x.beginPath(); x.ellipse(15, 16, 11, 7, 0, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.moveTo(24, 16); x.lineTo(31, 9); x.lineTo(31, 23); x.fill();
      x.fillStyle = body; x.beginPath(); x.ellipse(15, 16, 9.5, 5.5, 0, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.moveTo(24, 16); x.lineTo(29.5, 11); x.lineTo(29.5, 21); x.fill();
      x.fillStyle = spec.shape === 'cooked' ? shade(a, 0.6) : b; x.fillRect(8, 17, 14, 3);
      if (spec.shape === 'cooked') { px(10, 12, 2, 8, shade(a, 0.45)); px(15, 11, 2, 10, shade(a, 0.45)); px(20, 12, 2, 8, shade(a, 0.45)); }
      else { px(8, 14, 2, 2, '#ffffff'); px(9, 14, 1, 1, '#000000'); }
      px(12, 12, 6, 1, shade(body, 1.3));
      break;
    }
    case 'sword': {
      diag(9, 22, 16, 3, outline); diag(10, 21, 15, 2, a); diag(11, 20, 13, 1, shade(a, 1.4));
      px(5, 21, 10, 3, outline); px(6, 22, 8, 1, '#c8a040');
      diag(4, 28, 5, 3, outline); diag(5, 27, 4, 2, b);
      px(3, 28, 3, 3, '#c8a040');
      break;
    }
    case 'pick': {
      diag(6, 28, 18, 3, outline); diag(7, 27, 17, 2, b);
      x.strokeStyle = outline; x.lineWidth = 5; x.beginPath(); x.moveTo(8, 9); x.quadraticCurveTo(18, 3, 29, 12); x.stroke();
      x.strokeStyle = a; x.lineWidth = 3; x.beginPath(); x.moveTo(9, 9); x.quadraticCurveTo(18, 4.5, 28, 12); x.stroke();
      break;
    }
    case 'hatchet': {
      diag(7, 28, 17, 3, outline); diag(8, 27, 16, 2, b);
      x.fillStyle = outline; x.beginPath(); x.moveTo(16, 6); x.lineTo(28, 4); x.lineTo(28, 18); x.lineTo(20, 14); x.fill();
      x.fillStyle = a; x.beginPath(); x.moveTo(18, 7); x.lineTo(26.5, 5.5); x.lineTo(26.5, 16); x.lineTo(20, 12.5); x.fill();
      px(25, 6, 2, 9, shade(a, 1.4));
      break;
    }
    case 'rod': {
      diag(4, 29, 25, 2, outline); diag(5, 28, 23, 1, a);
      px(7, 22, 5, 5, outline); px(8, 23, 3, 3, '#5a5a5a');
      x.strokeStyle = '#e8e8e8'; x.lineWidth = 1; x.beginPath(); x.moveTo(28.5, 5); x.quadraticCurveTo(31, 18, 26, 26); x.stroke();
      px(25, 25, 3, 3, '#d8362a');
      break;
    }
    case 'bread': {
      x.fillStyle = outline; x.beginPath(); x.ellipse(16, 18, 13, 8, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = a; x.beginPath(); x.ellipse(16, 18, 11.5, 6.5, 0, 0, Math.PI * 2); x.fill();
      px(9, 14, 3, 2, shade(a, 1.3)); px(14, 13, 3, 2, shade(a, 1.3)); px(19, 14, 3, 2, shade(a, 1.3));
      px(6, 21, 20, 2, shade(a, 0.75));
      break;
    }
    case 'helm': {
      x.fillStyle = outline; x.beginPath(); x.arc(16, 19, 12, Math.PI, 0); x.fill(); px(3, 19, 26, 5, outline);
      x.fillStyle = a; x.beginPath(); x.arc(16, 19, 10, Math.PI, 0); x.fill(); px(5, 19, 22, 3, shade(a, 0.8));
      px(15, 8, 2, 14, shade(a, 1.3));
      break;
    }
    case 'shell': {
      x.fillStyle = outline; x.beginPath(); x.ellipse(16, 18, 13, 10, 0, Math.PI, 0); x.fill(); px(3, 18, 26, 4, outline);
      x.fillStyle = a; x.beginPath(); x.ellipse(16, 18, 11, 8.5, 0, Math.PI, 0); x.fill();
      px(15, 10, 2, 10, shade(a, 0.6));
      for (const [ox, oy] of [[9, 15], [21, 13], [12, 11], [23, 17]]) px(ox, oy, 2, 2, b);
      break;
    }
    case 'pelt': {
      x.fillStyle = outline; x.beginPath(); x.moveTo(4, 10); x.lineTo(28, 8); x.lineTo(26, 26); x.lineTo(16, 22); x.lineTo(6, 27); x.fill();
      x.fillStyle = a; x.beginPath(); x.moveTo(6, 11); x.lineTo(26, 10); x.lineTo(24.5, 24); x.lineTo(16, 20); x.lineTo(7.5, 24.5); x.fill();
      for (let i = 0; i < 8; i++) px(8 + i * 2, 12 + (i % 3) * 3, 1, 3, shade(a, 0.7));
      break;
    }
    case 'shoe': {
      // A horseshoe hung on a halter strap
      x.strokeStyle = outline; x.lineWidth = 7; x.beginPath(); x.arc(16, 15, 9, Math.PI * 0.15, Math.PI * 0.85, true); x.stroke();
      x.strokeStyle = a; x.lineWidth = 4; x.beginPath(); x.arc(16, 15, 9, Math.PI * 0.15, Math.PI * 0.85, true); x.stroke();
      for (const [ox, oy] of [[8, 13], [11, 8], [21, 8], [24, 13]]) px(ox, oy, 1, 1, outline);
      px(14, 24, 4, 6, outline); px(15, 25, 2, 5, b ?? a);
      break;
    }
    case 'whistle': {
      diag(7, 24, 14, 5, outline); diag(8, 23, 13, 3, a);
      px(13, 16, 3, 3, outline);
      px(22, 7, 3, 3, shade(a, 1.3));
      break;
    }
    case 'gel': {
      x.fillStyle = outline; x.beginPath(); x.arc(16, 18, 11, 0, Math.PI * 2); x.fill();
      x.fillStyle = a; x.beginPath(); x.arc(16, 18, 9, 0, Math.PI * 2); x.fill();
      px(11, 13, 4, 3, '#ffffff');
      break;
    }
    case 'fang': {
      x.fillStyle = outline; x.beginPath(); x.moveTo(10, 4); x.quadraticCurveTo(26, 8, 20, 29); x.lineTo(14, 26); x.quadraticCurveTo(18, 12, 6, 7); x.fill();
      x.fillStyle = a; x.beginPath(); x.moveTo(11, 6); x.quadraticCurveTo(23, 9, 19, 26); x.lineTo(16, 24.5); x.quadraticCurveTo(18, 12, 9, 7.5); x.fill();
      break;
    }
    case 'coin': {
      x.fillStyle = outline; x.beginPath(); x.arc(16, 16, 11, 0, Math.PI * 2); x.fill();
      x.fillStyle = a; x.beginPath(); x.arc(16, 16, 9, 0, Math.PI * 2); x.fill();
      px(12, 12, 3, 3, '#fff6c8');
      break;
    }
  }
  return c.toDataURL();
}

export function itemIcon(id: string): string {
  let url = cache.get(id);
  if (!url) {
    const def = ITEMS[id];
    url = paint(def ? def.icon : { shape: 'coin', a: '#888888' });
    cache.set(id, url);
  }
  return url;
}

export function shapeIcon(shape: IconSpec['shape'], a: string, b?: string): string {
  const key = `shape:${shape}:${a}:${b ?? ''}`;
  let url = cache.get(key);
  if (!url) { url = paint({ shape, a, b }); cache.set(key, url); }
  return url;
}

/** Ability icons: 16x16 pixel glyphs on a bevelled tile, shown pixelated. */
/** Ten-by-ten glyphs for the calling skills (X = lit), and their colour. */
const GLYPHS: Record<string, [string[], string]> = {
  shield: [['XXXXXXXXXX', 'X........X', 'X..XXXX..X', 'X..X..X..X', 'X..XXXX..X', 'X........X', '.X......X.', '..X....X..', '...X..X...', '....XX....'], '#e8f0ff'],
  bash: [['....XX....', '...XXXX...', '..XXXXXX..', '.XXX..XXX.', 'XXX....XXX', '.XXX..XXX.', '..XXXXXX..', '...XXXX...', 'X...XX...X', '.X......X.'], '#f6ecd0'],
  oath: [['...XXXX...', '.XX....XX.', 'X...XX...X', 'X..X..X..X', 'X.X.XX.X.X', 'X.X.XX.X.X', 'X..X..X..X', 'X...XX...X', '.XX....XX.', '...XXXX...'], '#fff0b0'],
  bleed: [['....X.....', '....X.....', '...XXX....', '...XXX....', '..XXXXX...', '..XXXXX...', '..XXXXX..X', '...XXX...X', '........XX', '.......XX.'], '#ffb0a0'],
  leap: [['.......XX.', '......X..X', '.....X....', '....X.....', '...X......', '..X.......', '.X........', 'X.........', 'XXX....XXX', '.X.XXXX.X.'], '#f6ecd0'],
  redhour: [['..XXXXXX..', '.X......X.', 'X...XX...X', 'X...XX...X', 'X...XXXX.X', 'X........X', 'X........X', '.X......X.', '..XXXXXX..', '..........'], '#ffb0a0'],
  ward: [['....X.....', '...XX..X..', '..XXX.XX..', '.XXXXXXX..', '.XXX.XXXX.', 'XXX...XXX.', 'XX.....XX.', 'XX.....XX.', '.XX...XX..', '..XXXXX...'], '#ffe0a0'],
  bolt: [['......XXX.', '.....XXXXX', '....XXXXXX', '...XXXXXX.', '..XXX.XX..', '.XX.......', 'XX........', 'X.........', '..........', '..........'], '#fff0b0'],
  star: [['....XX....', '....XX....', '...XXXX...', 'XXXXXXXXXX', '.XXXXXXXX.', '..XXXXXX..', '..XXXXXX..', '.XXX..XXX.', '.XX....XX.', 'X........X'], '#fff0b0'],
  dressing: [['...XXXX...', '...XXXX...', '...XXXX...', 'XXXXXXXXXX', 'XXXXXXXXXX', 'XXXXXXXXXX', 'XXXXXXXXXX', '...XXXX...', '...XXXX...', '...XXXX...'], '#f6f6f0'],
  volley: [['X.X.X.....', '.XXX......', '..XXX.....', '...XXX....', '....XXX...', '.....XXX..', '......XXX.', '.......XX.', '..........', '..........'], '#f6ecd0'],
  step: [['..XX......', '..XX......', '.XXXX..XX.', 'X.XX.X.XX.', '..XX..XXXX', '.X..XX.XX.', '.X..X.XX.X', 'X..X..X..X', '.....X..X.', '.....X..X.'], '#c8c8f0'],
};

export function abilityIcon(kind: string): string {
  const key = 'ability:' + kind;
  let url = cache.get(key);
  if (url) return url;
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const x = c.getContext('2d')!;
  const tones: Record<string, [string, string, string]> = {
    strike: ['#c4553a', '#8a2e1c', '#5a1a0e'], cleave: ['#d88a3a', '#9a5a1c', '#5a320c'], wind: ['#6ab04a', '#3f7a2a', '#204a14'],
    roll: ['#4a8ac8', '#2a5a8a', '#163452'], eat: ['#c8a050', '#8a6a2a', '#4a3a14'],
    shield: ['#6a9ad0', '#3a6aa0', '#1a3a60'], bash: ['#7a8aa8', '#4a5a78', '#262e44'], oath: ['#d8b860', '#9a7a30', '#5a4414'],
    bleed: ['#c84040', '#8a1e1e', '#4a0c0c'], leap: ['#d86a3a', '#9a3a1a', '#5a1e0a'], redhour: ['#a82a2a', '#6a1010', '#3a0606'],
    ward: ['#e09040', '#a85a1a', '#5a2e0a'], bolt: ['#f0a040', '#b0601a', '#60300a'], star: ['#6a5ab0', '#3a2a78', '#1a1440'],
    dressing: ['#7ab060', '#4a7a34', '#24441a'], volley: ['#8ab060', '#5a7a34', '#2e441a'], step: ['#5a5a7a', '#34344a', '#1a1a28'],
  };
  const [hi, mid, lo] = tones[kind];
  x.fillStyle = mid; x.fillRect(0, 0, 16, 16);
  x.fillStyle = hi; x.fillRect(0, 0, 16, 1); x.fillRect(0, 0, 1, 16);
  x.fillStyle = lo; x.fillRect(0, 15, 16, 1); x.fillRect(15, 0, 1, 16);
  const p = (col: string, pts: [number, number][]) => { x.fillStyle = col; for (const [a, b] of pts) x.fillRect(a, b, 1, 1); };
  const W = '#f6ecd0', D = '#1a120c';
  if (kind === 'strike') {
    const blade: [number, number][] = []; for (let i = 0; i < 8; i++) blade.push([5 + i, 10 - i], [6 + i, 10 - i]);
    p(D, blade.map(([a, b]) => [a, b + 1] as [number, number])); p(W, blade);
    p('#c8a040', [[3, 10], [4, 10], [5, 11], [5, 12], [6, 12]]); p('#6a3a1c', [[3, 12], [2, 13]]);
  } else if (kind === 'cleave') {
    const ring: [number, number][] = [[6,3],[7,3],[8,3],[9,3],[10,4],[11,5],[12,6],[12,7],[12,8],[12,9],[11,10],[10,11],[9,12],[8,12],[7,12],[6,12],[5,11],[4,10],[3,9],[3,8],[3,7]];
    p(D, ring.map(([a, b]) => [a + 1, b + 1] as [number, number])); p(W, ring); p(W, [[2,6],[3,6],[4,6],[3,5]]);
  } else if (kind === 'wind') {
    const heart: [number, number][] = [];
    const rows = ['.XX..XX.', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', '.XXXXXX.', '..XXXX..', '...XX...'];
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === 'X') heart.push([4 + i, 4 + j]); }));
    p(D, heart.map(([a, b]) => [a + 1, b + 1] as [number, number])); p(W, heart);
    p('#3f7a2a', [[7, 6], [8, 6], [7, 7], [8, 7], [6, 7], [9, 7], [7, 8], [8, 8]]);
  } else if (kind === 'roll') {
    const arc: [number, number][] = [[4,9],[4,8],[4,7],[5,6],[5,5],[6,4],[7,4],[8,4],[9,4],[10,5],[11,6],[11,7],[11,8],[10,9],[9,10],[8,11],[7,11]];
    p(D, arc.map(([a, b]) => [a + 1, b + 1] as [number, number])); p(W, arc); p(W, [[6,10],[6,11],[6,12],[7,12],[8,12],[5,11]]);
  } else if (GLYPHS[kind]) {
    const [rows, col] = GLYPHS[kind];
    const pts: [number, number][] = [];
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === 'X') pts.push([3 + i, 3 + j]); }));
    p(D, pts.map(([a, b]) => [a + 1, b + 1] as [number, number])); p(col, pts);
  } else {
    const loaf: [number, number][] = []; for (let i = 3; i < 13; i++) for (let j = 6; j < 11; j++) if (!((i === 3 || i === 12) && (j === 6 || j === 10))) loaf.push([i, j]);
    p(D, loaf.map(([a, b]) => [a + 1, b + 1] as [number, number])); p('#e8c070', loaf); p('#a8783a', [[5,7],[6,8],[8,7],[9,8],[11,7]]); p('#fff0c0', [[4,7],[5,6],[6,6]]);
  }
  url = c.toDataURL();
  cache.set(key, url);
  return url;
}
