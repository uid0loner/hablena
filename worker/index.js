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
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url);
      } catch (err) {
        console.error('api_error', err && err.stack ? err.stack : err);
        return json({ error: 'server_error' }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  },
};

// ---------------------------------------------------------------------------
// Routing

async function handleApi(request, env, url) {
  const route = `${request.method} ${url.pathname.replace(/\/+$/, '')}`;

  if (!env.DB) return json({ error: 'not_configured' }, 503);

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
  return json({ ok: true });
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
