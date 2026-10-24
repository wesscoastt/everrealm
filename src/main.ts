import { Game } from './game/Game';

// Testing aid (dev builds, ?rafshim): a page in a hidden preview pane gets no animation frames, so
// supply them from a message loop at about thirty a second. Never on for players.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('rafshim')) {
  const ch = new MessageChannel();
  const queue: FrameRequestCallback[] = [];
  let last = 0;
  ch.port1.onmessage = () => {
    const now = performance.now();
    if (now - last < 33) { ch.port2.postMessage(0); return; }
    last = now;
    for (const cb of queue.splice(0)) cb(now);
  };
  window.requestAnimationFrame = (cb) => { queue.push(cb); ch.port2.postMessage(0); return queue.length; };
  window.cancelAnimationFrame = () => {};
}

// The trailer maker (src/dev/trailer.ts, previews/trailer.mjs): loaded only with ?trailer on this machine
if (new URLSearchParams(location.search).has('trailer') && (location.hostname === '127.0.0.1' || location.hostname === 'localhost')) {
  void import('./dev/trailer').then((m) => { (window as unknown as { __trailer: unknown }).__trailer = m; });
}

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (!canvas) throw new Error('Missing #game-canvas element.');

const gl = document.createElement('canvas').getContext('webgl2');
if (!gl) {
  document.getElementById('ui')!.innerHTML = '<div style="position:fixed;inset:0;display:grid;place-items:center;color:#efe6d2;font:18px sans-serif;text-align:center;padding:20px">Everrealm needs WebGL 2. Try a current version of Chrome, Edge or Firefox.</div>';
} else {
  new Game(canvas);
}
