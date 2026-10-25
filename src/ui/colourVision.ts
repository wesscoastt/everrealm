import type { ColourVision } from '../game/state';

// Colour vision settings: the screen's colours corrected for the three common kinds of colour blindness,
// so a creature's red warning circle stands out from the grass, a rare item's colour from an uncommon one,
// and a hostile name from a friendly one. Daltonizing: what a viewer with that kind of vision would lose
// (the difference between the true colour and how it looks to them) is moved into the colours they still
// tell apart. One colour matrix over the whole page (the world and the interface together), as an SVG filter.

/** Each kind's correction, rows r, g, b (from simulation matrices for each, with the lost difference shifted). */
const MATRIX: Record<Exclude<ColourVision, 'standard'>, number[][]> = {
  // Red-weak: red's difference goes into green and blue
  protan: [[1, 0, 0], [-0.2549, 1.2549, 0], [0.3031, -0.5451, 1.242]],
  // Green-weak (the most common): green's difference goes into blue
  deutan: [[1, 0, 0], [-0.4375, 1.4375, 0], [0.2625, -0.5625, 1.3]],
  // Blue-weak: blue's difference goes into red and green
  tritan: [[1.05, -0.3825, 0.3325], [0, 1.2345, -0.2345], [0, 0, 1]],
};

export const COLOUR_VISION_NAMES: Record<ColourVision, string> = {
  standard: 'Standard',
  protan: 'Red-weak (protanopia)',
  deutan: 'Green-weak (deuteranopia)',
  tritan: 'Blue-weak (tritanopia)',
};

/** Put the chosen correction on the page (or take it off). */
export function applyColourVision(kind: ColourVision | undefined): void {
  const id = 'er-colour-vision';
  if (!kind || kind === 'standard' || !(kind in MATRIX)) { document.documentElement.style.filter = ''; return; }
  let svg = document.getElementById(id) as SVGSVGElement | null;
  if (!svg) {
    const made = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    made.id = id;
    made.setAttribute('aria-hidden', 'true');
    made.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    document.body.append(made);
    svg = made;
  }
  const m = MATRIX[kind as keyof typeof MATRIX];
  const values = m.map((r) => [...r, 0, 0].join(' ')).join(' ') + ' 0 0 0 1 0';
  svg.innerHTML = `<filter id="${id}-f" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${values}"/></filter>`;
  // (on the root: a filter anywhere below it would turn the fixed-position interface into one positioned in its box)
  document.documentElement.style.filter = `url(#${id}-f)`;
}
