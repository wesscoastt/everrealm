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
    case 'bow': {
      // A bow on the diagonal, its string straight across behind, an arrow nocked
      x.lineCap = 'round';
      x.strokeStyle = outline; x.lineWidth = 5; x.beginPath(); x.moveTo(7, 26); x.quadraticCurveTo(6, 6, 26, 7); x.stroke();
      x.strokeStyle = a; x.lineWidth = 3; x.beginPath(); x.moveTo(7, 26); x.quadraticCurveTo(6, 6, 26, 7); x.stroke();
      x.strokeStyle = '#efe6cf'; x.lineWidth = 1; x.beginPath(); x.moveTo(7, 26); x.lineTo(26, 7); x.stroke();
      x.strokeStyle = outline; x.lineWidth = 3; x.beginPath(); x.moveTo(11, 22); x.lineTo(25, 26); x.stroke();
      x.strokeStyle = '#c8b090'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(11, 22); x.lineTo(25, 26); x.stroke();
      px(9, 20, 3, 3, b); px(24, 25, 3, 3, '#c8c8d0');
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
    case 'chest': {
      // A jerkin: shoulders, body, the trim down the front
      x.fillStyle = outline; x.beginPath(); x.moveTo(5, 9); x.lineTo(11, 5); x.lineTo(21, 5); x.lineTo(27, 9); x.lineTo(25, 15); x.lineTo(23, 14); x.lineTo(23, 28); x.lineTo(9, 28); x.lineTo(9, 14); x.lineTo(7, 15); x.fill();
      x.fillStyle = a; x.beginPath(); x.moveTo(7, 9.5); x.lineTo(12, 7); x.lineTo(20, 7); x.lineTo(25, 9.5); x.lineTo(24, 12.5); x.lineTo(21.5, 12); x.lineTo(21.5, 26.5); x.lineTo(10.5, 26.5); x.lineTo(10.5, 12); x.lineTo(8, 12.5); x.fill();
      px(15, 7, 2, 20, b ?? shade(a, 0.7)); px(11, 20, 10, 2, shade(a, 0.75));
      break;
    }
    case 'legs': {
      x.fillStyle = outline; x.beginPath(); x.moveTo(8, 5); x.lineTo(24, 5); x.lineTo(25, 28); x.lineTo(18, 28); x.lineTo(16, 13); x.lineTo(14, 28); x.lineTo(7, 28); x.fill();
      x.fillStyle = a; x.beginPath(); x.moveTo(10, 7); x.lineTo(22, 7); x.lineTo(23, 26.5); x.lineTo(19.5, 26.5); x.lineTo(16, 10.5); x.lineTo(12.5, 26.5); x.lineTo(9, 26.5); x.fill();
      px(9, 7, 14, 2, b ?? shade(a, 0.7));
      break;
    }
    case 'gloves': {
      x.fillStyle = outline; x.fillRect(7, 6, 10, 20); x.fillRect(17, 12, 6, 8); x.fillRect(5, 22, 14, 6);
      x.fillStyle = a; x.fillRect(9, 8, 6, 15); x.fillRect(15, 14, 6, 4); px(7, 23, 10, 4, b ?? shade(a, 0.7));
      px(11, 8, 1, 12, shade(a, 0.75));
      break;
    }
    case 'boots': {
      x.fillStyle = outline; x.beginPath(); x.moveTo(8, 4); x.lineTo(17, 4); x.lineTo(17, 18); x.lineTo(27, 22); x.lineTo(27, 28); x.lineTo(7, 28); x.fill();
      x.fillStyle = a; x.beginPath(); x.moveTo(10, 6); x.lineTo(15, 6); x.lineTo(15, 19.5); x.lineTo(25, 23.5); x.lineTo(25, 26); x.lineTo(9, 26); x.fill();
      px(9, 6, 7, 2, b ?? shade(a, 0.7));
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
    case 'torch': {
      // A brand: the stave, the wrapped head, the flame
      diag(9, 27, 12, 5, outline); diag(10, 26, 11, 3, b ?? '#5a3a22');
      px(18, 9, 6, 6, outline); px(19, 10, 4, 4, '#2a2018');
      px(18, 2, 6, 7, outline); px(19, 3, 4, 6, a); px(20, 4, 2, 4, '#fff0b0');
      break;
    }
    case 'lantern': {
      // A lantern on its hook
      px(15, 3, 2, 4, outline); px(10, 7, 12, 3, outline); px(10, 24, 12, 3, outline);
      px(10, 10, 12, 14, outline); px(12, 11, 8, 12, a); px(14, 13, 4, 8, '#fff6d0');
      px(11, 8, 10, 1, b ?? '#2a2a2e'); px(11, 25, 10, 1, b ?? '#2a2a2e');
      break;
    }
    case 'wheel': {
      // A cartwheel: an iron tyre on a painted rim, spokes to the hub
      x.strokeStyle = outline; x.lineWidth = 6; x.beginPath(); x.arc(16, 16, 11, 0, Math.PI * 2); x.stroke();
      x.strokeStyle = a; x.lineWidth = 3; x.beginPath(); x.arc(16, 16, 11, 0, Math.PI * 2); x.stroke();
      x.strokeStyle = b ?? a; x.lineWidth = 2;
      for (let i = 0; i < 4; i++) { const t = (i * Math.PI) / 4; x.beginPath(); x.moveTo(16 - Math.cos(t) * 10, 16 - Math.sin(t) * 10); x.lineTo(16 + Math.cos(t) * 10, 16 + Math.sin(t) * 10); x.stroke(); }
      px(13, 13, 6, 6, outline); px(14, 14, 4, 4, '#8a8a8c');
      break;
    }
    case 'whistle': {
      diag(7, 24, 14, 5, outline); diag(8, 23, 13, 3, a);
      px(13, 16, 3, 3, outline);
      px(22, 7, 3, 3, shade(a, 1.3));
      break;
    }
    case 'fiddle': {
      // A stringed body on the slant, its neck up to the right: fiddle, lute or gurdy by colour
      x.save(); x.translate(16, 17); x.rotate(-0.7);
      x.fillStyle = outline; x.beginPath(); x.ellipse(0, 5, 8, 9, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = a; x.beginPath(); x.ellipse(0, 5, 6.5, 7.5, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = outline; x.fillRect(-2, -14, 4, 13); x.fillRect(-1.5, 2, 3, 3);
      x.fillStyle = b; x.fillRect(-1, -13, 2, 12); x.fillRect(-2.5, -16, 5, 3);
      x.fillStyle = '#f0e0b0'; x.fillRect(-0.5, -12, 1, 18);
      x.restore();
      break;
    }
    case 'harp': {
      x.strokeStyle = outline; x.lineWidth = 5; x.beginPath(); x.moveTo(8, 28); x.lineTo(8, 6); x.quadraticCurveTo(18, 4, 25, 12); x.lineTo(14, 28); x.closePath(); x.stroke();
      x.strokeStyle = a; x.lineWidth = 3; x.stroke();
      x.fillStyle = b; for (let i = 0; i < 4; i++) x.fillRect(11 + i * 3, 9 + i * 2, 1, 16 - i * 3);
      break;
    }
    case 'drum': {
      x.fillStyle = outline; x.beginPath(); x.arc(16, 16, 12, 0, Math.PI * 2); x.fill();
      x.fillStyle = a; x.beginPath(); x.arc(16, 16, 10.5, 0, Math.PI * 2); x.fill();
      x.fillStyle = b; x.beginPath(); x.arc(16, 16, 8.5, 0, Math.PI * 2); x.fill();
      px(11, 11, 3, 2, '#fff6dc');
      diag(19, 28, 9, 2, outline); px(26, 18, 4, 4, outline); px(27, 19, 2, 2, '#c8b088');
      break;
    }
    case 'horn': {
      x.strokeStyle = outline; x.lineWidth = 6; x.beginPath(); x.arc(14, 16, 8, 0, Math.PI * 2); x.stroke();
      x.strokeStyle = a; x.lineWidth = 3; x.beginPath(); x.arc(14, 16, 8, 0, Math.PI * 2); x.stroke();
      x.fillStyle = outline; x.beginPath(); x.moveTo(20, 18); x.lineTo(30, 12); x.lineTo(30, 26); x.closePath(); x.fill();
      x.fillStyle = a; x.beginPath(); x.moveTo(21, 18.5); x.lineTo(29, 14); x.lineTo(29, 24); x.closePath(); x.fill();
      px(4, 15, 4, 2, b);
      break;
    }
    case 'pipes': {
      x.fillStyle = outline; x.beginPath(); x.ellipse(13, 20, 9, 7, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = a; x.beginPath(); x.ellipse(13, 20, 7.5, 5.5, 0, 0, Math.PI * 2); x.fill();
      for (const [ox, len] of [[17, 16], [21, 13], [25, 10]]) { px(ox, 18 - len, 3, len, outline); px(ox + 1, 19 - len, 1, len - 2, b); px(ox - 1, 17 - len, 5, 2, '#e8dcc0'); }
      px(9, 25, 3, 6, outline); px(10, 25, 1, 5, b);
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
    case 'bag': {
      // A sack tied at the neck
      x.fillStyle = outline; x.beginPath(); x.moveTo(9, 12); x.quadraticCurveTo(3, 28, 16, 28); x.quadraticCurveTo(29, 28, 23, 12); x.closePath(); x.fill();
      x.fillStyle = a; x.beginPath(); x.moveTo(10.5, 13); x.quadraticCurveTo(5, 26.5, 16, 26.5); x.quadraticCurveTo(27, 26.5, 21.5, 13); x.closePath(); x.fill();
      px(11, 9, 10, 4, outline); px(12, 10, 8, 2, a);
      px(11, 12, 10, 2, b); px(14, 4, 4, 6, outline); px(15, 5, 2, 4, a);
      px(12, 16, 2, 6, shade(a, 1.25));
      break;
    }
    case 'letter': {
      // A folded letter, its flap's creases running down to a wax seal
      px(4, 8, 24, 17, outline);
      px(5, 9, 22, 15, a);
      px(5, 21, 22, 3, shade(a, 0.82));
      for (let i = 0; i < 10; i++) { px(5 + i, 9 + Math.floor(i * 0.6), 1, 1, shade(a, 0.62)); px(26 - i, 9 + Math.floor(i * 0.6), 1, 1, shade(a, 0.62)); }
      px(14, 13, 4, 6, outline); px(13, 14, 6, 4, outline);
      px(14, 14, 4, 4, b); px(15, 14, 1, 1, shade(b, 1.5));
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
  holdfast: [['..XXXXXX..', '.XX....XX.', '.X..XX..X.', '.X..XX..X.', '.X......X.', '..X....X..', '...X..X...', '....XX....', '.XX.XX.XX.', 'XXXXXXXXXX'], '#e8f0ff'],
  shieldthrow: [['......XXX.', '.....XXXXX', '.....X.X.X', '.....XXXXX', '......XXX.', '...X......', '..X.......', '.X........', 'X.........', '..........'], '#e8f0ff'],
  rally: [['....XX....', '....XX....', '..XXXXXX..', '....XX....', '....XX....', '.XX....XX.', 'XXXX..XXXX', '.XX....XX.', '..........', '..XXXXXX..'], '#fff0b0'],
  rend: [['X.........', '.X..X.....', '..X..X..X.', '...X..X..X', '....X..X..', '.....X..X.', '......X..X', '.......X..', '........X.', '.........X'], '#ffb0a0'],
  rush: [['.....XX...', '....XX....', '...XX.....', '..XXXXXX..', '.....XX...', '....XX....', '...XX.....', '..XX......', '.XX.......', 'XX........'], '#ffd0a0'],
  hamstring: [['..X.......', '..XX......', '..X.X.....', '..X..X....', '..X...X...', '..XXXXXX..', '..X.......', '..X....XX.', '..X...X..X', '.XXX...XX.'], '#ffb0a0'],
  firewall: [['..X...X...', '.XX..XX..X', '.XXX.XXX.X', 'XXXXXXXXXX', 'XX.XXX.XXX', 'X...X...XX', '..........', 'XXXXXXXXXX', '.X.X.X.X.X', 'X.X.X.X.X.'], '#ffd080'],
  cinderstep: [['......XX..', '.....XXXX.', '......XX..', '....X.X...', '...X..X...', '......X...', '.....X.X..', '..X.X...X.', '.XXX......', 'XXXXX.....'], '#ffd080'],
  kindle: [['....X.....', '...XX.....', '..XXX..X..', '..XXXX.XX.', '.XXXXXXXX.', '.XXX.XXXX.', 'XXX...XXX.', 'XX.....XX.', 'XX.....XX.', '.XXXXXXX..'], '#fff0a0'],
  snare: [['XXXXXXXXXX', 'X.X.X.X.XX', 'XX.X.X.X.X', 'X.X.X.X.XX', 'XX.X.X.X.X', 'X.X.X.X.XX', 'XX.X.X.X.X', 'X.X.X.X.XX', 'XX.X.X.X.X', 'XXXXXXXXXX'], '#e8dcc0'],
  rain: [['X..X..X..X', '.X..X..X..', '..X..X..X.', 'X..X..X..X', '.X..X..X..', '..X..X..X.', '..........', '.XXXXXXXX.', 'XXXXXXXXXX', '..........'], '#f6ecd0'],
  quickstep: [['.....XX...', '.....XX...', '....XXXX..', '...X.XX.X.', '.....XX...', '....X..X..', '...X....X.', '..........', 'XX..XX..XX', '.XX..XX..X'], '#d0f0c0'],
  riposte: [['X........X', '.X......X.', '..X....X..', '...X..X...', '....XX....', '....XX....', '...X..X...', '..X....X..', '.XX....XX.', 'XX......XX'], '#f6ecd0'],
  flurry: [['X...X...X.', '.X...X...X', '..X...X...', '...X...X..', 'X...X...X.', '.X...X...X', '..X...X...', '...X...X..', '..........', '..........'], '#f6ecd0'],
  frostbolt: [['.......X.X', '........X.', '......XXX.', '.....XXX..', '....XXX...', '...XXX....', '..XXX.....', '.XX.......', 'XX........', 'X.........'], '#e8f8ff'],
  icebarrier: [['....XX....', '...XXXX...', '..XX..XX..', '.XX.XX.XX.', 'XX.XXXX.XX', 'XX.XXXX.XX', '.XX.XX.XX.', '..XX..XX..', '...XXXX...', '....XX....'], '#e8f8ff'],
  blizzard: [['X...X...X.', '.X.X.X.X.X', 'X...X...X.', '..X...X...', '.X.X.X.X.X', '..X...X...', 'X...X...X.', '.X.X.X.X.X', 'X...X...X.', '..........'], '#f0faff'],
  blink: [['X.X.X.....', '.........X', '........XX', '.......XXX', '......XXXX', '........XX', '.......X.X', '......X...', '.....X....', '....X.....'], '#e0d8ff'],
  icelance: [['.........X', '........XX', '.......XX.', '......XX..', '.....XX...', '....XX....', '...XX.....', '..XX......', '.XX.......', 'X.........'], '#e8f8ff'],
  frostnova: [['X...X...X.', '.X..X..X..', '..X.X.X...', '...XXX....', 'XXXXXXXXX.', '...XXX....', '..X.X.X...', '.X..X..X..', 'X...X...X.', '..........'], '#f0faff'],
  // The Gravecaller's: a drop drawn off, a skull, a hand out of the ground, a ribcage, two hands, spreading rot
  siphon: [['....X.....', '...XX.....', '...XXX....', '..XXXX..X.', '..XXXXX.X.', '.XXXXXX.X.', '.XXXXXX...', '..XXXX..X.', '...XX...X.', '..........'], '#f0c0c0'],
  wither: [['...XXXX...', '..XXXXXX..', '.XX.XX.XX.', '.XX.XX.XX.', '.XXXXXXXX.', '..XXXXXX..', '..X.XX.X..', '..XXXXXX..', '...X..X...', '..........'], '#e0ecd0'],
  raise: [['..X.X.X...', '..X.X.X.X.', '..X.X.X.X.', '..XXXXXXX.', 'X.XXXXXXX.', 'XXXXXXXX..', '.XXXXXX...', '..XXXX....', 'XXXXXXXXXX', 'X.X.X.X.X.'], '#e8e4d0'],
  boneward: [['XXXXXXXXXX', 'X...XX...X', 'X.XXXXXX.X', 'X...XX...X', 'X.XXXXXX.X', '.X..XX..X.', '.X.XXXX.X.', '..X.XX.X..', '...XXXX...', '..........'], '#ece6d4'],
  gravegrip: [['X.X....X.X', 'X.X.X..X.X', 'XXX.X..XXX', '.XXXX.XXX.', '..XX..XX..', '..XX..XX..', '..XX..XX..', 'XXXXXXXXXX', 'X.X.X.X.X.', '..........'], '#e0dccc'],
  graverot: [['X.......X.', '...XX.....', '..XXXX..X.', '.XXXXXX...', '.XXXXXX..X', '..XXXX....', 'X..XX..X..', '.......XX.', '..X....XX.', '..........'], '#c8e0a0'],
  // The Mender's: a cross of light, a lantern, a hallowed ring, a ward, a starburst, a rising spiral
  mend: [['....XX....', '....XX....', '....XX....', 'XXXXXXXXXX', 'XXXXXXXXXX', '....XX....', '....XX....', '....XX....', '....XX....', '..........'], '#fff4d0'],
  lanternlight: [['....XX....', '...X..X...', '..XXXXXX..', '..X.XX.X..', '..XXXXXX..', '..X.XX.X..', '..XXXXXX..', '...XXXX...', '..........', '..........'], '#fff0b0'],
  sanctuary: [['...XXXX...', '.XX....XX.', '.X..XX..X.', 'X..XXXX..X', 'X..XXXX..X', 'X...XX...X', '.X......X.', '.XX....XX.', '...XXXX...', '..........'], '#fff0c0'],
  lampward: [['XXXXXXXXXX', 'X........X', 'X...XX...X', 'X..XXXX..X', 'X..XXXX..X', '.X..XX..X.', '.X......X.', '..X....X..', '...XXXX...', '..........'], '#fff4d0'],
  rebuke: [['X...XX...X', '.X..XX..X.', '..X.XX.X..', '...XXXX...', 'XXXXXXXXXX', 'XXXXXXXXXX', '...XXXX...', '..X.XX.X..', '.X..XX..X.', 'X...XX...X'], '#fff8e0'],
  restore: [['....XXX...', '...X...X..', '..X..X..X.', '..X.X.X.X.', '..X.X..X..', '..X..XX...', '...X......', '....XXXX..', '..........', '..........'], '#f0f8d0'],
  sunder: [['...XXXX...', '...XXXX...', '....XX....', '....XX....', '....XX....', '....XX....', '..........', '.X..XX..X.', 'XXXXXXXXXX', '.X.X..X.X.'], '#f6ecd0'],
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
    holdfast: ['#6a9ad0', '#3a6aa0', '#1a3a60'], shieldthrow: ['#7a8aa8', '#4a5a78', '#262e44'], rally: ['#d8b860', '#9a7a30', '#5a4414'],
    rend: ['#c84040', '#8a1e1e', '#4a0c0c'], rush: ['#d86a3a', '#9a3a1a', '#5a1e0a'], hamstring: ['#a83a3a', '#6a1a1a', '#3a0a0a'],
    firewall: ['#e07030', '#a84010', '#5a2006'], cinderstep: ['#c86a30', '#8a4010', '#4a2006'], kindle: ['#f0b040', '#b07010', '#603a06'],
    snare: ['#8a7a50', '#5a4a2a', '#2e2614'], rain: ['#6a8ab0', '#3a5a7a', '#1a2e44'], quickstep: ['#5a9a6a', '#2e6a3a', '#163a1e'],
    riposte: ['#9aa4b4', '#5a6474', '#2a3040'], flurry: ['#b4a48a', '#74644a', '#403420'], sunder: ['#a8784a', '#6a4422', '#3a220e'],
    frostbolt: ['#5ab0e0', '#2a78b0', '#14405e'], icebarrier: ['#7ac8e8', '#3a88b0', '#1a4862'], blizzard: ['#8aa8d0', '#4a6a98', '#24365a'],
    blink: ['#8a7ad0', '#5a4aa0', '#2e245a'], icelance: ['#4aa0d0', '#1a6a9a', '#0c3654'], frostnova: ['#6ac0e0', '#2a80a8', '#124460'],
    mend: ['#d8b860', '#9a7a30', '#5a4414'], lanternlight: ['#e0b850', '#a07a20', '#5a420c'], sanctuary: ['#c8a860', '#8a6a2a', '#4a3a14'],
    lampward: ['#b0a070', '#7a6a3a', '#40381a'],
    siphon: ['#a83038', '#6a1820', '#380c10'], wither: ['#6a8a4a', '#3e5a2a', '#1e2e14'], raise: ['#5a5a6a', '#34343e', '#18181e'],
    boneward: ['#8a8070', '#5a5244', '#2e2a22'], gravegrip: ['#4a5a3e', '#2c3824', '#141c10'], graverot: ['#7a8a3a', '#4a5a1e', '#24300c'], rebuke: ['#e0c070', '#a08030', '#5a4414'], restore: ['#9ab060', '#6a7a34', '#3a441a'],
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
