import { Game } from './game/Game';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (!canvas) throw new Error('Missing #game-canvas element.');

const gl = document.createElement('canvas').getContext('webgl2');
if (!gl) {
  document.getElementById('ui')!.innerHTML = '<div style="position:fixed;inset:0;display:grid;place-items:center;color:#efe6d2;font:18px sans-serif;text-align:center;padding:20px">Everrealm needs WebGL 2. Try a current version of Chrome, Edge or Firefox.</div>';
} else {
  new Game(canvas);
}
