import { defineConfig, Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

/** Dev-only endpoint so the music preview page can save rendered WAV files into ./previews. */
function musicPreviewSink(): Plugin {
  return {
    name: 'music-preview-sink',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__save-preview', (req, res) => {
        const name = new URL(req.url ?? '', 'http://x').searchParams.get('name') ?? 'preview';
        const safe = name.replace(/[^a-z0-9_-]/gi, '');
        const ext = new URL(req.url ?? '', 'http://x').searchParams.get('ext') === 'png' ? 'png' : 'wav';
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          const dir = path.resolve('previews');
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, `${safe}.${ext}`), Buffer.concat(chunks));
          res.end('ok');
        });
      });
    },
  };
}

export default defineConfig({
  // GitHub Pages serves the game from /<repo>/; the deploy workflow sets BASE_PATH to match
  base: process.env.BASE_PATH || '/',
  plugins: [musicPreviewSink()],
  server: {
    host: '127.0.0.1',
    port: 5188,
    strictPort: true,
    // Windows can report this folder under a redirected path (AppData\Local\Packages\...\LocalCache),
    // which is where the world worker's URL resolves; allow both spellings of the project root.
    fs: { allow: [process.cwd(), fs.realpathSync.native(process.cwd())] },
  },
  preview: {
    host: '127.0.0.1',
    port: 4188,
    strictPort: true,
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        // three.js changes only when we upgrade it: its own file stays cached in the browser across
        // game updates, and the game's own code (which changes often) is the only part re-downloaded.
        advancedChunks: { groups: [{ name: 'three', test: /node_modules[\/]three/ }] },
      },
    },
  },
});
