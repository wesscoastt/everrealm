// Lets prop code that paints canvas textures run under node.
const ctx = new Proxy({}, { get: (t, k) => k === 'createImageData' || k === 'getImageData' ? (w = 1, h = 1) => ({ data: new Uint8ClampedArray(w * h * 4 || 4) }) : k === 'measureText' ? () => ({ width: 10 }) : typeof k === 'string' && /^[a-z]/.test(k) ? () => ctx : undefined, set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) };
