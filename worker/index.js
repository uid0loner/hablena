// Hablena Worker: serves the static site and the /api/* endpoints.
// No dependencies: Web Crypto for password hashing and tokens, D1 for storage.

const SESSION_COOKIE = '__Host-hablena_session';
const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100_000; // the maximum Cloudflare Workers allows for PBKDF2
const MIN_PASSWORD = 10;
const MAX_PASSWORD = 200;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 10;
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;
const SIGNUP_MAX_PER_IP = 5;
const RATE_RETENTION_MS = 24 * 60 * 60 * 1000;

const enc = new TextEncoder();

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // One canonical host: www.hablena.com → hablena.com
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url, ctx);
      } catch (err) {
        console.error('api_error', err && err.stack ? err.stack : err);
        return json({ error: 'server_error' }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  },

  // Cron trigger (see wrangler.jsonc): pre-generates lesson audio in the background.
  async scheduled(event, env, ctx) {
    if (!env.DB || !env.ASSETS) return;
    ctx.waitUntil(warmAudio(env).then((r) => console.log('audio_warm', JSON.stringify(r))));
  },
};

// ---------------------------------------------------------------------------
// Routing

async function handleApi(request, env, url, ctx) {
  const route = `${request.method} ${url.pathname.replace(/\/+$/, '')}`;

  if (!env.DB) return json({ error: 'not_configured' }, 503);

  const audioMatch = request.method === 'GET' && url.pathname.match(/^\/api\/audio\/([a-f0-9]{24})\.mp3$/);
  if (audioMatch) return audio(request, env, url, ctx, audioMatch[1]);

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const bad = checkSameOrigin(request, url);
    if (bad) return bad;
  }

  switch (route) {
    case 'POST /api/auth/signup': return signup(request, env);
    case 'POST /api/auth/login': return login(request, env);
    case 'POST /api/auth/logout': return logout(request, env);
    case 'GET /api/me': return me(request, env);
    case 'POST /api/me/delete': return deleteAccount(request, env);
    case 'GET /api/progress': return getProgress(request, env);
    case 'POST /api/progress': return saveProgress(request, env);
    case 'GET /api/stats': return getStats(request, env, url);
    case 'GET /api/audio/status': return audioStatus(env);
    default: return json({ error: 'not_found' }, 404);
  }
}

// State-changing requests must come from our own pages as JSON (CSRF protection).
function checkSameOrigin(request, url) {
  const origin = request.headers.get('Origin');
  if (!origin || origin !== url.origin) return json({ error: 'forbidden' }, 403);
  const type = request.headers.get('Content-Type') || '';
  if (!type.toLowerCase().startsWith('application/json')) return json({ error: 'unsupported_media_type' }, 415);
  return null;
}

// ---------------------------------------------------------------------------
// Handlers

async function signup(request, env) {
  const body = await readJson(request);
  if (!body) return json({ error: 'invalid_request' }, 400);

  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 60) : '';
  const lang = body.lang === 'de' ? 'de' : 'en';

  if (!email) return json({ error: 'invalid_email' }, 400);
  if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) return json({ error: 'weak_password' }, 400);

  const now = Date.now();
  const ipKey = await sha256Hex(`signup-ip:${clientIp(request)}`);
  if ((await countEvents(env, ipKey, now - SIGNUP_WINDOW_MS)) >= SIGNUP_MAX_PER_IP) {
    return json({ error: 'too_many_requests' }, 429);
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return json({ error: 'email_taken' }, 409);

  const id = crypto.randomUUID();
  const stored = await hashPassword(password);
  await env.DB.prepare('INSERT INTO users (id, email, name, password, lang, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, email, name || null, stored, lang, now, now)
    .run();
  await recordEvent(env, ipKey, now);

  const cookie = await createSession(env, id, now);
  return json({ user: { email, name: name || null, lang } }, 201, { 'Set-Cookie': cookie });
}

async function login(request, env) {
  const body = await readJson(request);
  if (!body) return json({ error: 'invalid_request' }, 400);

  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password.slice(0, MAX_PASSWORD) : '';
  if (!email || !password) return json({ error: 'invalid_credentials' }, 401);

  const now = Date.now();
  const emailKey = await sha256Hex(`login:${email}`);
  const ipKey = await sha256Hex(`login-ip:${clientIp(request)}`);
  const since = now - LOGIN_WINDOW_MS;
  const [byEmail, byIp] = await Promise.all([countEvents(env, emailKey, since), countEvents(env, ipKey, since)]);
  if (byEmail >= LOGIN_MAX_FAILURES || byIp >= LOGIN_MAX_FAILURES * 3) {
    return json({ error: 'too_many_requests' }, 429);
  }

  const user = await env.DB.prepare('SELECT id, email, name, lang, password FROM users WHERE email = ?').bind(email).first();
  // Verify against a dummy hash when the user does not exist, so timing does not reveal it.
  const ok = await verifyPassword(password, user ? user.password : DUMMY_HASH);
  if (!user || !ok) {
    await Promise.all([recordEvent(env, emailKey, now), recordEvent(env, ipKey, now)]);
    return json({ error: 'invalid_credentials' }, 401);
  }

  await env.DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').bind(now, user.id).run();
  const cookie = await createSession(env, user.id, now);
  // Occasionally clean up old rate-limit events and expired sessions.
  if (Math.random() < 0.05) await cleanup(env, now);
  return json({ user: { email: user.email, name: user.name, lang: user.lang } }, 200, { 'Set-Cookie': cookie });
}

async function logout(request, env) {
  const token = readSessionToken(request);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run();
  return json({ ok: true }, 200, { 'Set-Cookie': clearCookie() });
}

async function me(request, env) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, 401, { 'Set-Cookie': clearCookie() });
  return json({ user: { email: user.email, name: user.name, lang: user.lang, createdAt: user.created_at } });
}

async function deleteAccount(request, env) {
  const user = await currentUser(request, env, true);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const body = await readJson(request);
  const password = body && typeof body.password === 'string' ? body.password.slice(0, MAX_PASSWORD) : '';
  if (!(await verifyPassword(password, user.password))) return json({ error: 'invalid_credentials' }, 401);

  await env.DB.batch([
    env.DB.prepare('DELETE FROM progress WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM activity WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
  ]);
  return json({ ok: true }, 200, { 'Set-Cookie': clearCookie() });
}

async function getProgress(request, env) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const { results } = await env.DB.prepare('SELECT lesson_id, best_correct, total, attempts, last_completed_at FROM progress WHERE user_id = ?')
    .bind(user.id)
    .all();
  return json({
    progress: results.map((r) => ({ lessonId: r.lesson_id, bestCorrect: r.best_correct, total: r.total, attempts: r.attempts, lastCompletedAt: r.last_completed_at })),
  });
}

async function saveProgress(request, env) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const body = await readJson(request);
  const lessonId = body && typeof body.lessonId === 'string' ? body.lessonId : '';
  const total = body ? Number(body.total) : NaN;
  const correct = body ? Number(body.correct) : NaN;
  if (!/^u\d{1,3}-l\d{1,3}$/.test(lessonId) || !Number.isInteger(total) || !Number.isInteger(correct) || total < 1 || total > 100 || correct < 0 || correct > total) {
    return json({ error: 'invalid_request' }, 400);
  }
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO progress (user_id, lesson_id, best_correct, total, attempts, first_completed_at, last_completed_at)
     VALUES (?, ?, ?, ?, 1, ?, ?)
     ON CONFLICT (user_id, lesson_id) DO UPDATE SET
       best_correct = MAX(best_correct, excluded.best_correct),
       total = excluded.total,
       attempts = attempts + 1,
       last_completed_at = excluded.last_completed_at`
  ).bind(user.id, lessonId, correct, total, now, now).run();

  const xp = xpFor(correct, total);
  const day = localDay(body.today, now);
  await env.DB.prepare(
    `INSERT INTO activity (user_id, day, xp, lessons) VALUES (?, ?, ?, 1)
     ON CONFLICT (user_id, day) DO UPDATE SET xp = xp + excluded.xp, lessons = lessons + 1`
  ).bind(user.id, day, xp).run();
  return json({ ok: true, xp, ...(await statsFor(env, user.id, day)) });
}

// 5 XP for finishing, up to 10 more for accuracy.
export const xpFor = (correct, total) => 5 + Math.round((10 * correct) / total);
export const DAILY_GOAL_XP = 20;

// The learner's local date (sent by the browser), accepted only within a day of the server's date.
function localDay(value, now) {
  const utc = new Date(now).toISOString().slice(0, 10);
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return utc;
  const diff = Math.abs(Date.parse(value + 'T00:00:00Z') - Date.parse(utc + 'T00:00:00Z'));
  return diff <= 86_400_000 ? value : utc;
}

const prevDay = (day) => new Date(Date.parse(day + 'T00:00:00Z') - 86_400_000).toISOString().slice(0, 10);

async function statsFor(env, userId, today) {
  const { results } = await env.DB.prepare('SELECT day, xp FROM activity WHERE user_id = ? ORDER BY day DESC LIMIT 400').bind(userId).all();
  const days = new Map(results.map((r) => [r.day, r.xp]));
  let streak = 0;
  let cursor = days.has(today) ? today : prevDay(today);
  while (days.has(cursor)) { streak++; cursor = prevDay(cursor); }
  const xpTotal = results.reduce((n, r) => n + r.xp, 0);
  return { streak, xpTotal, xpToday: days.get(today) || 0, dailyGoal: DAILY_GOAL_XP, activeToday: days.has(today) };
}

async function getStats(request, env, url) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, 401);
  return json(await statsFor(env, user.id, localDay(url.searchParams.get('today'), Date.now())));
}

// ---------------------------------------------------------------------------
// Pronunciation audio. Every clip (text + voice) the course needs is listed in /audio/manifest.json,
// built from the course and src/config/voices.json. A clip is generated once by its TTS provider,
// stored in D1 and cached at the edge. A cron trigger generates missing clips in the background, so
// nobody has to play through the lessons first. Only manifest clips can be synthesised.

const SITE_ORIGIN = 'https://hablena.com';
const WARM_BATCH = 20; // clips per cron run (stays well inside the subrequest limit)
const PROVIDER_KEYS = { elevenlabs: 'TTS_API_KEY', azure: 'AZURE_TTS_KEY', google: 'GOOGLE_TTS_KEY' };
const providerKey = (env, provider) => env[PROVIDER_KEYS[provider]];

const manifests = new WeakMap();
async function loadManifest(env) {
  const cached = manifests.get(env.ASSETS);
  if (cached) return cached;
  const res = await env.ASSETS.fetch(new Request(new URL('/audio/manifest.json', SITE_ORIGIN)));
  const data = res.ok ? await res.json().catch(() => null) : null;
  const manifest = data && data.clips ? data : { clips: {} };
  manifests.set(env.ASSETS, manifest);
  return manifest;
}

const audioResponse = (data) =>
  new Response(data, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, immutable' } });

async function generateClip(env, hash, [text, provider, voice], manifest) {
  const data = await synthesize(env, { text, provider, voice }, manifest);
  await env.DB.prepare('INSERT OR IGNORE INTO audio_cache (hash, provider, voice, data, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(hash, provider, voice, data, Date.now())
    .run();
  return data;
}

async function audio(request, env, url, ctx, hash) {
  const cache = globalThis.caches?.default;
  const cacheKey = new Request(url.toString());
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }
  const keep = (res) => {
    if (cache) {
      const p = cache.put(cacheKey, res.clone());
      if (ctx?.waitUntil) ctx.waitUntil(p);
    }
    return res;
  };

  const row = await env.DB.prepare('SELECT data FROM audio_cache WHERE hash = ?').bind(hash).first();
  if (row) return keep(audioResponse(new Uint8Array(row.data)));

  const manifest = await loadManifest(env);
  const clip = manifest.clips[hash];
  if (!clip) return json({ error: 'not_found' }, 404);
  if (!providerKey(env, clip[1])) return json({ error: 'audio_not_configured' }, 503);

  try {
    return keep(audioResponse(await generateClip(env, hash, clip, manifest)));
  } catch (err) {
    if (!(err instanceof TtsError)) throw err;
    console.error('tts_failed', err.provider, err.status, err.detail);
    return json({ error: 'tts_failed', provider: err.provider, status: err.status, detail: err.detail }, 502);
  }
}

// Generates up to `limit` missing clips and removes clips the course no longer uses.
export async function warmAudio(env, limit = WARM_BATCH) {
  const manifest = await loadManifest(env);
  const { results } = await env.DB.prepare('SELECT hash FROM audio_cache').all();
  const stored = new Set(results.map((r) => r.hash));
  const wanted = Object.entries(manifest.clips);
  const missing = wanted.filter(([hash]) => !stored.has(hash));
  const orphans = [...stored].filter((hash) => !manifest.clips[hash]).slice(0, 50);
  if (orphans.length) await env.DB.batch(orphans.map((hash) => env.DB.prepare('DELETE FROM audio_cache WHERE hash = ?').bind(hash)));

  let made = 0;
  let failed = 0;
  let error = null;
  for (const [hash, clip] of missing.filter(([, c]) => providerKey(env, c[1])).slice(0, limit)) {
    try {
      await generateClip(env, hash, clip, manifest);
      made++;
    } catch (err) {
      if (!(err instanceof TtsError)) throw err;
      failed++;
      error = { provider: err.provider, status: err.status, detail: err.detail };
      console.error('tts_warm_failed', err.provider, err.status, err.detail);
      // Bad key, quota or rate limit: stop for this run instead of burning through the batch.
      if ([401, 402, 403, 429].includes(err.status) || failed >= 3) break;
    }
  }
  return { total: wanted.length, ready: wanted.length - missing.length + made, made, removed: orphans.length, error };
}

async function audioStatus(env) {
  const manifest = await loadManifest(env);
  const { results } = await env.DB.prepare('SELECT hash FROM audio_cache').all();
  const stored = new Set(results.map((r) => r.hash));
  const clips = Object.entries(manifest.clips);
  const byProvider = {};
  for (const [hash, [, provider]] of clips) {
    const p = (byProvider[provider] ||= { total: 0, ready: 0, configured: !!providerKey(env, provider) });
    p.total++;
    if (stored.has(hash)) p.ready++;
  }
  const ready = clips.filter(([hash]) => stored.has(hash)).length;
  return json({ total: clips.length, ready, done: ready === clips.length, providers: byProvider }, 200, { 'Cache-Control': 'no-store' });
}

class TtsError extends Error {
  constructor(provider, status, body) {
    super(`tts_failed ${provider} ${status}`);
    this.provider = provider;
    this.status = status;
    // Provider error messages (e.g. invalid key, unknown voice) never contain the key itself.
    this.detail = String(body).slice(0, 300);
  }
}

const escXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export async function synthesize(env, { text, provider, voice }, manifest = {}) {
  const key = providerKey(env, provider);
  if (provider === 'elevenlabs') {
    const model = manifest.models?.elevenlabs || 'eleven_multilingual_v2';
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: model, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
    });
    if (!res.ok) throw new TtsError('elevenlabs', res.status, await res.text().catch(() => ''));
    return new Uint8Array(await res.arrayBuffer());
  }
  if (provider === 'azure') {
    const region = env.AZURE_TTS_REGION || manifest.azureRegion || 'westeurope';
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${escXml(voice.slice(0, 5))}"><voice name="${escXml(voice)}">${escXml(text)}</voice></speak>`;
    const res = await fetch(`https://${encodeURIComponent(region)}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3', 'User-Agent': 'hablena' },
      body: ssml,
    });
    if (!res.ok) throw new TtsError('azure', res.status, await res.text().catch(() => ''));
    return new Uint8Array(await res.arrayBuffer());
  }
  if (provider === 'google') {
    const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { text }, voice: { languageCode: voice.slice(0, 5), name: voice }, audioConfig: { audioEncoding: 'MP3' } }),
    });
    if (!res.ok) throw new TtsError('google', res.status, await res.text().catch(() => ''));
    const { audioContent } = await res.json();
    return Uint8Array.from(atob(audioContent), (c) => c.charCodeAt(0));
  }
  throw new TtsError(String(provider), 400, 'unknown provider');
}

// ---------------------------------------------------------------------------
// Sessions

async function createSession(env, userId, now) {
  const token = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const expires = now + SESSION_DAYS * 24 * 60 * 60 * 1000;
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256Hex(token), userId, now, expires)
    .run();
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 60 * 60}`;
}

const clearCookie = () => `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

function readSessionToken(request) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === SESSION_COOKIE) return v.join('=') || null;
  }
  return null;
}

async function currentUser(request, env, withPassword = false) {
  const token = readSessionToken(request);
  if (!token || token.length > 100) return null;
  const cols = `u.id, u.email, u.name, u.lang, u.created_at${withPassword ? ', u.password' : ''}`;
  return env.DB.prepare(`SELECT ${cols} FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`)
    .bind(await sha256Hex(token), Date.now())
    .first();
}

// ---------------------------------------------------------------------------
// Passwords: PBKDF2-SHA256, stored as pbkdf2$<iterations>$<salt>$<hash>

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${base64url(salt)}$${base64url(hash)}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, iter, saltB64, hashB64] = String(stored).split('$');
  if (scheme !== 'pbkdf2') return false;
  const expected = fromBase64url(hashB64);
  const actual = await derive(password, fromBase64url(saltB64), Number(iter));
  return timingSafeEqual(actual, expected);
}

const DUMMY_HASH = `pbkdf2$${PBKDF2_ITERATIONS}$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Rate limiting

async function countEvents(env, key, since) {
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM rate_events WHERE key = ? AND ts > ?').bind(key, since).first();
  return row ? Number(row.n) : 0;
}

async function recordEvent(env, key, now) {
  await env.DB.prepare('INSERT INTO rate_events (key, ts) VALUES (?, ?)').bind(key, now).run();
}

async function cleanup(env, now) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM rate_events WHERE ts < ?').bind(now - RATE_RETENTION_MS),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
  ]);
}

// ---------------------------------------------------------------------------
// Helpers

function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

const clientIp = (request) => request.headers.get('CF-Connecting-IP') || 'unknown';

async function readJson(request) {
  try {
    const text = await request.text();
    if (text.length > 10_000) return null;
    const data = JSON.parse(text);
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function base64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(str) {
  const s = String(str).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
