// Full-stack local server: static site from dist/ + the Worker API on a local SQLite database.
// Run: npm run dev  →  http://localhost:4321
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../worker/index.js';
import { createD1 } from './lib/d1-sqlite.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(root, 'dist');
const PORT = Number(process.env.PORT || 4321);
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json' };

const ASSETS = {
  async fetch(request) {
    const url = new URL(request.url);
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    let file = join(DIST, path);
    try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); } catch {}
    try {
      const body = await readFile(file);
      return new Response(body, { headers: { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' } });
    } catch {
      return new Response(await readFile(join(DIST, '404.html')), { status: 404, headers: { 'Content-Type': TYPES['.html'] } });
    }
  },
};

const env = { DB: createD1(join(root, 'migrations'), process.env.DB_FILE || ':memory:'), ASSETS, ADMIN_EMAILS: process.env.ADMIN_EMAILS || '', PAYWALL: process.env.PAYWALL || '' };

createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
  headers.set('CF-Connecting-IP', req.socket.remoteAddress || '127.0.0.1');
  const request = new Request(`http://localhost:${PORT}${req.url}`, {
    method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
  });
  const response = await worker.fetch(request, env);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(PORT, () => console.log(`Hablena dev server → http://localhost:${PORT}`));
