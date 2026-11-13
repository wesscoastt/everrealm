import { portraitIcon } from './icons3d';
import { paintCanvasTexture } from '../world/textures';
import type { Appearance } from '../entities/humanoid';
import { createSeededRandom } from '../utils/random';

// The interface's painted surfaces for the Lanternlight theme (see theme.css): night-blue cloth
// for panels and a lighter indigo for headers, each with a fine weave and a little star dust,
// and parchment for letters and the journal. The world's block tiles stay in the world.

function tile(kind: Parameters<typeof paintCanvasTexture>[0], darken = 0): string {
  const src = paintCanvasTexture(kind).image as HTMLCanvasElement;
  if (!darken) return src.toDataURL();
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const x = c.getContext('2d')!;
  x.drawImage(src, 0, 0);
  x.fillStyle = `rgba(10,7,4,${darken})`;
  x.fillRect(0, 0, c.width, c.height);
  return c.toDataURL();
}

function parchment(): string {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  const rnd = createSeededRandom(808);
  x.fillStyle = '#eadcb6';
  x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) {
    const v = rnd();
    x.fillStyle = v < 0.5 ? `rgba(120,90,40,${rnd() * 0.08})` : `rgba(255,250,230,${rnd() * 0.12})`;
    x.fillRect(Math.floor(rnd() * 128), Math.floor(rnd() * 128), 1 + Math.floor(rnd() * 3), 1);
  }
  for (let i = 0; i < 6; i++) {
    const g = x.createRadialGradient(rnd() * 128, rnd() * 128, 2, rnd() * 128, rnd() * 128, 30 + rnd() * 30);
    g.addColorStop(0, 'rgba(150,110,50,0.08)');
    g.addColorStop(1, 'rgba(150,110,50,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
  }
  return c.toDataURL();
}

/**
 * A tileable leather surface, the windows' own (owner 2026-11-12: a UI of the game's own, not navy and gold): the
 * base, the grain in soft darker and lighter patches, pores, and here and there a scuff where it's been handled.
 */
function cloth(base: string, size: number, seed: number, scuffs: number): string {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d')!;
  const rnd = createSeededRandom(seed);
  x.fillStyle = base;
  x.fillRect(0, 0, size, size);
  // the grain: soft patches, drawn three times over so it tiles
  for (let i = 0; i < size * 0.9; i++) {
    const px = rnd() * size, py = rnd() * size, r = 4 + rnd() * 14, dark = rnd() < 0.55;
    for (const [ox, oy] of [[0, 0], [-size, 0], [0, -size], [-size, -size], [size, 0], [0, size]]) {
      const g = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, r);
      g.addColorStop(0, dark ? 'rgba(10,5,2,0.10)' : 'rgba(255,214,160,0.035)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.fillRect(px + ox - r, py + oy - r, r * 2, r * 2);
    }
  }
  // pores
  for (let i = 0; i < size * size * 0.05; i++) {
    x.fillStyle = rnd() < 0.7 ? `rgba(8,4,2,${0.08 + rnd() * 0.12})` : `rgba(255,220,170,${rnd() * 0.05})`;
    x.fillRect(Math.floor(rnd() * size), Math.floor(rnd() * size), 1, 1);
  }
  // a few short scuffs, lighter, along the grain
  for (let i = 0; i < scuffs; i++) {
    x.strokeStyle = `rgba(255,226,180,${0.03 + rnd() * 0.04})`;
    x.lineWidth = 1;
    const sx = rnd() * size, sy = rnd() * size, a = rnd() * Math.PI, l = 4 + rnd() * 10;
    x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + Math.cos(a) * l, sy + Math.sin(a) * l); x.stroke();
  }
  return c.toDataURL();
}

export function applySkin(): void {
  const r = document.documentElement.style;
  r.setProperty('--tex-plank', `url(${cloth('#302114', 256, 11, 26)})`);
  r.setProperty('--tex-oak', `url(${cloth('#382717', 256, 12, 18)})`);
  r.setProperty('--tex-stone', `url(${cloth('#46311e', 128, 13, 6)})`);
  r.setProperty('--tex-iron', `url(${tile('iron')})`);
  r.setProperty('--tex-parch', `url(${parchment()})`);
}

/**
 * A face for a frame or a conversation: the person's own model, head and shoulders (ui/icons3d.ts), or, where
 * there's no WebGL for it, the plain painted face below.
 */
export function drawFace(canvas: HTMLCanvasElement, look: Appearance): void {
  const url = portraitIcon(look);
  if (!url) { paintFace(canvas, look); return; }
  const img = new Image();
  canvas.dataset.look = url.length + ':' + url.slice(-24);
  const mine = canvas.dataset.look;
  img.onload = () => {
    if (canvas.dataset.look !== mine) return; // (a newer face asked for since)
    canvas.width = canvas.height = img.width;
    const x = canvas.getContext('2d')!;
    x.imageSmoothingEnabled = true;
    x.clearRect(0, 0, img.width, img.height);
    x.drawImage(img, 0, 0);
    canvas.classList.add('portrait3d');
  };
  img.src = url;
}
/** The plain painted face, the same way as the character's in-world face texture. */
function paintFace(canvas: HTMLCanvasElement, look: Appearance): void {
  canvas.classList.remove('portrait3d');
  const x = canvas.getContext('2d')!;
  canvas.width = canvas.height = 16;
  x.imageSmoothingEnabled = false;
  x.fillStyle = look.skin; x.fillRect(0, 0, 16, 16);
  if (look.hat === 'cap' || look.hat === 'kerchief') { x.fillStyle = look.hatColor ?? '#6a3a2a'; x.fillRect(0, 0, 16, 4); }
  else if (look.hairStyle !== 3) { x.fillStyle = look.hair; x.fillRect(0, 0, 16, 4); x.fillRect(0, 0, 2, 9); x.fillRect(14, 0, 2, 9); }
  const brow = (look.age ?? 0) > 0.6 ? '#cfcac0' : look.hair;
  x.fillStyle = brow; x.fillRect(3, 5, 3, 1); x.fillRect(10, 5, 3, 1);
  x.fillStyle = '#f6f2ea'; x.fillRect(3, 7, 3, 2); x.fillRect(10, 7, 3, 2);
  x.fillStyle = look.eyes; x.fillRect(4, 7, 2, 2); x.fillRect(10, 7, 2, 2);
  x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(7, 8, 2, 3);
  x.fillStyle = 'rgba(120,40,30,0.55)'; x.fillRect(6, 12, 4, 1);
  if (look.beard) { x.fillStyle = look.hair === '#dedad2' ? '#dedad2' : look.hair; x.fillRect(1, 11, 14, 5); x.fillStyle = 'rgba(120,40,30,0.7)'; x.fillRect(6, 12, 4, 1); }
}
