// End-to-end tests for the Worker API against a local SQLite database that mimics D1.
// Run: npm run test:worker
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../worker/index.js';
import { createD1 } from './lib/d1-sqlite.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const d1 = () => createD1(join(root, 'migrations'));

const ORIGIN = 'https://hablena.com';
const env = { DB: d1(), ASSETS: { fetch: async () => new Response('static') } };
let failures = 0;
let checks = 0;
const check = (name, cond, extra = '') => { checks++; if (!cond) { failures++; console.error(`✗ ${name} ${extra}`); } };

async function call(method, path, { body, cookie, origin = ORIGIN, type = 'application/json', ip = '1.2.3.4' } = {}) {
  const headers = { 'CF-Connecting-IP': ip };
  if (origin) headers.Origin = origin;
  if (body !== undefined) headers['Content-Type'] = type;
  if (cookie) headers.Cookie = cookie;
  const res = await worker.fetch(new Request(ORIGIN + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env);
  const data = res.headers.get('Content-Type')?.includes('json') ? await res.json() : await res.text();
  const setCookie = res.headers.get('Set-Cookie') || '';
  const session = setCookie.match(/__Host-hablena_session=([^;]*)/)?.[1];
  return { status: res.status, data, setCookie, cookie: session ? `__Host-hablena_session=${session}` : null };
}

// www → apex redirect
{
  const r = await worker.fetch(new Request('https://www.hablena.com/de/grammatik/?x=1'), env);
  check('www redirects to apex', r.status === 301 && r.headers.get('Location') === 'https://hablena.com/de/grammatik/?x=1');
}

// Static pages still go to the assets binding
check('static passthrough', (await worker.fetch(new Request(ORIGIN + '/'), env).then((r) => r.text())) === 'static');

// Missing DB → 503
{
  const res = await worker.fetch(new Request(ORIGIN + '/api/me'), { ASSETS: env.ASSETS });
  check('not configured → 503', res.status === 503);
}

// Signup validation
check('invalid email', (await call('POST', '/api/auth/signup', { body: { email: 'nope', password: 'longenough1' } })).status === 400);
check('weak password', (await call('POST', '/api/auth/signup', { body: { email: 'a@b.de', password: 'short' } })).status === 400);
check('CSRF: foreign origin', (await call('POST', '/api/auth/signup', { body: { email: 'a@b.de', password: 'longenough1' }, origin: 'https://evil.example' })).status === 403);
check('CSRF: missing origin', (await call('POST', '/api/auth/signup', { body: { email: 'a@b.de', password: 'longenough1' }, origin: null })).status === 403);
check('CSRF: form post rejected', (await call('POST', '/api/auth/signup', { body: { email: 'a@b.de', password: 'longenough1' }, type: 'application/x-www-form-urlencoded' })).status === 415);

// Signup
const s = await call('POST', '/api/auth/signup', { body: { email: '  Nico@Example.com ', password: 'correct horse battery', name: 'Nico', lang: 'de' } });
check('signup 201', s.status === 201, JSON.stringify(s.data));
check('signup sets secure cookie', /HttpOnly/.test(s.setCookie) && /Secure/.test(s.setCookie) && /SameSite=Lax/.test(s.setCookie));
check('email normalized', s.data.user?.email === 'nico@example.com');
const stored = env.DB.raw.prepare('SELECT password FROM users').get().password;
check('password stored hashed', stored.startsWith('pbkdf2$100000$') && !stored.includes('correct horse'));
const tokenRow = env.DB.raw.prepare('SELECT token_hash FROM sessions').get();
check('session token stored hashed', tokenRow.token_hash.length === 64 && !s.cookie.includes(tokenRow.token_hash));
check('duplicate email → 409', (await call('POST', '/api/auth/signup', { body: { email: 'nico@example.com', password: 'another password' } })).status === 409);

// Me
const m = await call('GET', '/api/me', { cookie: s.cookie });
check('me with session', m.status === 200 && m.data.user.name === 'Nico' && m.data.user.lang === 'de');
check('me without session → 401', (await call('GET', '/api/me')).status === 401);
check('me with forged token → 401', (await call('GET', '/api/me', { cookie: '__Host-hablena_session=forged' })).status === 401);

// Logout
const lo = await call('POST', '/api/auth/logout', { cookie: s.cookie, body: {} });
check('logout clears cookie', lo.status === 200 && /Max-Age=0/.test(lo.setCookie));
check('session gone after logout', (await call('GET', '/api/me', { cookie: s.cookie })).status === 401);

// Login
check('wrong password → 401', (await call('POST', '/api/auth/login', { body: { email: 'nico@example.com', password: 'wrong password!' } })).status === 401);
check('unknown user → 401 (same error)', (await call('POST', '/api/auth/login', { body: { email: 'ghost@example.com', password: 'whatever123' } })).data.error === 'invalid_credentials');
const li = await call('POST', '/api/auth/login', { body: { email: 'NICO@example.com', password: 'correct horse battery' } });
check('login 200', li.status === 200 && li.cookie);
check('me after login', (await call('GET', '/api/me', { cookie: li.cookie })).status === 200);

// Brute-force protection
for (let i = 0; i < 10; i++) await call('POST', '/api/auth/login', { body: { email: 'nico@example.com', password: 'guess' + i + 'xxxxx' }, ip: '9.9.9.' + i });
check('locked after 10 failures', (await call('POST', '/api/auth/login', { body: { email: 'nico@example.com', password: 'correct horse battery' } })).status === 429);

// Signup rate limit per IP
for (let i = 0; i < 5; i++) await call('POST', '/api/auth/signup', { body: { email: `u${i}@example.com`, password: 'longenough1' }, ip: '5.5.5.5' });
check('signup limited per IP', (await call('POST', '/api/auth/signup', { body: { email: 'u9@example.com', password: 'longenough1' }, ip: '5.5.5.5' })).status === 429);

// Progress
check('progress needs login', (await call('GET', '/api/progress')).status === 401);
check('progress empty', (await call('GET', '/api/progress', { cookie: li.cookie })).data.progress?.length === 0);
check('progress rejects bad id', (await call('POST', '/api/progress', { cookie: li.cookie, body: { lessonId: 'x; drop', correct: 1, total: 2 } })).status === 400);
check('progress rejects correct > total', (await call('POST', '/api/progress', { cookie: li.cookie, body: { lessonId: 'u1-l1', correct: 9, total: 2 } })).status === 400);
check('progress save', (await call('POST', '/api/progress', { cookie: li.cookie, body: { lessonId: 'u1-l1', correct: 7, total: 10 } })).status === 200);
await call('POST', '/api/progress', { cookie: li.cookie, body: { lessonId: 'u1-l1', correct: 5, total: 10 } });
{
  const pr = (await call('GET', '/api/progress', { cookie: li.cookie })).data.progress;
  check('progress keeps best score', pr.length === 1 && pr[0].bestCorrect === 7 && pr[0].attempts === 2, JSON.stringify(pr));
}

// Account deletion
check('delete needs password', (await call('POST', '/api/me/delete', { cookie: li.cookie, body: { password: 'nope' } })).status === 401);
const del = await call('POST', '/api/me/delete', { cookie: li.cookie, body: { password: 'correct horse battery' } });
check('delete 200', del.status === 200);
check('user removed', !env.DB.raw.prepare("SELECT 1 FROM users WHERE email = 'nico@example.com'").get());
check('progress removed', !env.DB.raw.prepare('SELECT 1 FROM progress').get());
check('sessions removed', !env.DB.raw.prepare('SELECT 1 FROM sessions s LEFT JOIN users u ON u.id = s.user_id WHERE u.id IS NULL').get());

check('unknown route → 404', (await call('GET', '/api/nothing')).status === 404);

// Audio
{
  const text = 'buenos días';
  const hash = 'a'.repeat(24);
  const manifestEnv = (extra) => ({
    ...env,
    ASSETS: { fetch: async (req) => (new URL(req.url).pathname === '/audio/manifest.json' ? Response.json({ [hash]: text }) : new Response('static')) },
    ...extra,
  });
  const get = async (e, h = hash) => worker.fetch(new Request(`${ORIGIN}/api/audio/${h}.mp3`), e);
  check('audio: not configured → 503', (await get(manifestEnv({}))).status === 503);
  check('audio: unknown hash → 404', (await get(manifestEnv({ TTS_API_KEY: 'k', TTS_VOICE: 'v' }), 'b'.repeat(24))).status === 404);
  check('audio: malformed hash → 404', (await worker.fetch(new Request(`${ORIGIN}/api/audio/not-a-hash.mp3`), env)).status === 404);

  const realFetch = globalThis.fetch;
  let calls = 0;
  let sent = null;
  globalThis.fetch = async (url, init) => { calls++; sent = { url: String(url), init }; return new Response(new Uint8Array([73, 68, 51, 4]), { headers: { 'Content-Type': 'audio/mpeg' } }); };
  try {
    const e = manifestEnv({ TTS_API_KEY: 'secret', TTS_VOICE: 'voice123' });
    const r1 = await get(e);
    const bytes = new Uint8Array(await r1.arrayBuffer());
    check('audio: generated', r1.status === 200 && r1.headers.get('Content-Type') === 'audio/mpeg' && bytes[0] === 73);
    check('audio: immutable caching', /immutable/.test(r1.headers.get('Cache-Control') || ''));
    check('audio: ElevenLabs request', sent.url.includes('api.elevenlabs.io') && sent.url.includes('voice123') && sent.init.headers['xi-api-key'] === 'secret' && JSON.parse(sent.init.body).text === text);
    const r2 = await get(e);
    check('audio: second request served from DB', r2.status === 200 && calls === 1 && new Uint8Array(await r2.arrayBuffer())[0] === 73);

    env.DB.raw.exec('DELETE FROM audio_cache');
    globalThis.fetch = async () => Response.json({ detail: { status: 'invalid_api_key', message: 'Invalid API key' } }, { status: 401 });
    const bad = await get(e);
    const badBody = await bad.json();
    check('audio: provider error is reported', bad.status === 502 && badBody.status === 401 && badBody.detail.includes('invalid_api_key'));

    globalThis.fetch = async (url, init) => { sent = { url: String(url), init }; return Response.json({ audioContent: btoa('ID3x') }); };
    const g = await get(manifestEnv({ TTS_PROVIDER: 'google', TTS_API_KEY: 'gkey' }));
    check('audio: Google provider', g.status === 200 && sent.url.includes('texttospeech.googleapis.com') && JSON.parse(sent.init.body).voice.languageCode === 'es-ES');
  } finally {
    globalThis.fetch = realFetch;
  }
}

console.log(`${checks - failures}/${checks} worker checks passed`);
if (failures) process.exit(1);
