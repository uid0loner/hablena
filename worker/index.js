// Hablena Worker: serves the static site and the /api/* endpoints.
// No dependencies: Web Crypto for password hashing and tokens, D1 for storage.
import { handleAdmin, redeemCode, isAdmin, premiumOf } from './admin.js';
import { getSettings, hasPremium, lockReason } from './access.js';
import { paddleWebhook, billingPortal, paddleEnv } from './paddle.js';

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
    // Admin log entries are kept for 12 months (see privacy policy).
    ctx.waitUntil(env.DB.prepare('DELETE FROM admin_log WHERE at < ?').bind(Date.now() - 365 * 86_400_000).run().catch(() => {}));
  },
};

// ---------------------------------------------------------------------------
// Routing

async function handleApi(request, env, url, ctx) {
  const route = `${request.method} ${url.pathname.replace(/\/+$/, '')}`;

  if (!env.DB) return json({ error: 'not_configured' }, 503);

  const audioMatch = request.method === 'GET' && url.pathname.match(/^\/api\/audio\/([a-f0-9]{24})\.mp3$/);
  if (audioMatch) return audio(request, env, url, ctx, audioMatch[1]);

  // Paddle calls this from its servers; it is authenticated by its signature, not by Origin.
  if (route === 'POST /api/paddle/webhook') return paddleWebhook(request, env, json);

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const bad = checkSameOrigin(request, url);
    if (bad) return bad;
  }

  const helpers = { json, readJson, currentUser, hashPassword, normalizeEmail };
  if (url.pathname.startsWith('/api/admin/')) return handleAdmin(request, env, url, route, helpers);

  switch (route) {
    case 'POST /api/me/redeem': return redeemCode(request, env, helpers);
    case 'POST /api/me/billing-portal': return portal(request, env);
    case 'POST /api/auth/signup': return signup(request, env);
    case 'POST /api/auth/login': return login(request, env);
    case 'POST /api/auth/logout': return logout(request, env);
    case 'GET /api/me': return me(request, env);
    case 'GET /api/access': return getAccess(request, env, url);
    case 'POST /api/me/delete': return deleteAccount(request, env);
    case 'POST /api/me/goal': return setGoal(request, env);
    case 'POST /api/me/profile': return updateProfile(request, env);
    case 'POST /api/me/password': return changePassword(request, env);
    case 'POST /api/me/email': return changeEmail(request, env);
    case 'GET /api/progress': return getProgress(request, env);
    case 'POST /api/progress': return saveProgress(request, env);
    case 'GET /api/stats': return getStats(request, env, url);
    case 'GET /api/words': return getWords(request, env);
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
  const dailyGoal = DAILY_GOALS.includes(Number(body.dailyGoal)) ? Number(body.dailyGoal) : DAILY_GOAL_XP;
  const motive = MOTIVES.includes(body.motive) ? body.motive : null;

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
  await env.DB.prepare('INSERT INTO users (id, email, name, password, lang, created_at, last_login_at, daily_goal, motive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, email, name || null, stored, lang, now, now, dailyGoal, motive)
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

  const user = await env.DB.prepare('SELECT id, email, name, lang, password, blocked, expires_at FROM users WHERE email = ?').bind(email).first();
  // Verify against a dummy hash when the user does not exist, so timing does not reveal it.
  const ok = await verifyPassword(password, user ? user.password : DUMMY_HASH);
  if (!user || !ok) {
    await Promise.all([recordEvent(env, emailKey, now), recordEvent(env, ipKey, now)]);
    return json({ error: 'invalid_credentials' }, 401);
  }

  if (user.blocked) return json({ error: 'account_disabled' }, 403);
  if (user.expires_at && user.expires_at <= now) return json({ error: 'account_expired' }, 403);
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
  return json({
    user: {
      id: user.id, email: user.email, name: user.name, lang: user.lang, createdAt: user.created_at, dailyGoal: user.daily_goal, motive: user.motive,
      premium: premiumOf(user), admin: isAdmin(user, env), isTest: !!user.is_test, expiresAt: user.expires_at || null,
    },
    access: { ...(await getSettings(env)), premium: hasPremium(user, env) },
    subscription: await subscriptionOf(env, user),
    checkout: { environment: paddleEnv(env), allowed: paddleEnv(env) === 'production' || isAdmin(user, env) },
  }, 200, { 'Cache-Control': 'no-store' });
}

async function subscriptionOf(env, user) {
  const r = await env.DB.prepare('SELECT paddle_status, paddle_plan, paddle_customer_id FROM users WHERE id = ?').bind(user.id).first();
  return r && r.paddle_status ? { status: r.paddle_status, plan: r.paddle_plan, manage: !!r.paddle_customer_id } : null;
}

async function portal(request, env) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const row = await env.DB.prepare('SELECT paddle_customer_id, paddle_subscription_id FROM users WHERE id = ?').bind(user.id).first();
  return billingPortal(request, env, row || {}, json);
}

// What the current visitor may use: paywall settings plus, when logged in, premium and today's practice count.
// Public (guests get the settings only), so lesson pages can show the paywall before a lesson starts.
async function getAccess(request, env, url) {
  const settings = await getSettings(env);
  const user = await currentUser(request, env);
  let practiceToday = 0;
  if (user) {
    const day = localDay(url.searchParams.get('today'), Date.now());
    const row = await env.DB.prepare('SELECT practice FROM activity WHERE user_id = ? AND day = ?').bind(user.id, day).first();
    practiceToday = row ? row.practice || 0 : 0;
  }
  return json({ ...settings, loggedIn: !!user, premium: hasPremium(user, env), practiceToday }, 200, { 'Cache-Control': 'no-store' });
}

async function setGoal(request, env) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const body = await readJson(request);
  const goal = body ? Number(body.dailyGoal) : NaN;
  if (!DAILY_GOALS.includes(goal)) return json({ error: 'invalid_request' }, 400);
  await env.DB.prepare('UPDATE users SET daily_goal = ? WHERE id = ?').bind(goal, user.id).run();
  return json({ ok: true, dailyGoal: goal });
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
    env.DB.prepare('DELETE FROM word_stats WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM code_redemptions WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
  ]);
  return json({ ok: true }, 200, { 'Set-Cookie': clearCookie() });
}

// Account settings. Changing the email or password needs the current password; wrong attempts count
// towards the same per-email limit as failed logins.
async function checkCurrentPassword(env, user, password, now) {
  const key = await sha256Hex(`login:${user.email}`);
  if ((await countEvents(env, key, now - LOGIN_WINDOW_MS)) >= LOGIN_MAX_FAILURES) return json({ error: 'too_many_requests' }, 429);
  if (await verifyPassword(String(password || '').slice(0, MAX_PASSWORD), user.password)) return null;
  await recordEvent(env, key, now);
  return json({ error: 'wrong_password' }, 401);
}

async function updateProfile(request, env) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const body = await readJson(request);
  if (!body || typeof body.name !== 'string') return json({ error: 'invalid_request' }, 400);
  const name = body.name.trim().slice(0, 60);
  await env.DB.prepare('UPDATE users SET name = ? WHERE id = ?').bind(name || null, user.id).run();
  return json({ ok: true, name: name || null });
}

async function changePassword(request, env) {
  const user = await currentUser(request, env, true);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const body = await readJson(request);
  const next = body && typeof body.next === 'string' ? body.next : '';
  const now = Date.now();
  const refused = await checkCurrentPassword(env, user, body?.current, now);
  if (refused) return refused;
  if (next.length < MIN_PASSWORD || next.length > MAX_PASSWORD) return json({ error: 'weak_password' }, 400);
  // New password, every other device is logged out, this one gets a fresh session.
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password = ? WHERE id = ?').bind(await hashPassword(next), user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
  ]);
  return json({ ok: true }, 200, { 'Set-Cookie': await createSession(env, user.id, now) });
}

async function changeEmail(request, env) {
  const user = await currentUser(request, env, true);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  if (!email) return json({ error: 'invalid_email' }, 400);
  const refused = await checkCurrentPassword(env, user, body?.password, Date.now());
  if (refused) return refused;
  if (email === user.email) return json({ ok: true, email });
  if (await env.DB.prepare('SELECT 1 FROM users WHERE email = ?').bind(email).first()) return json({ error: 'email_taken' }, 409);
  await env.DB.prepare('UPDATE users SET email = ? WHERE id = ?').bind(email, user.id).run();
  return json({ ok: true, email });
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
  const practice = lessonId === 'practice';
  if ((!practice && !/^u\d{1,3}-[ls]\d{1,3}$/.test(lessonId)) || !Number.isInteger(total) || !Number.isInteger(correct) || total < 1 || total > 100 || correct < 0 || correct > total) {
    return json({ error: 'invalid_request' }, 400);
  }
  const now = Date.now();
  // Paywall (only when switched on in the admin portal): premium units and the daily practice limit.
  const settings = await getSettings(env);
  if (settings.paywall && !hasPremium(user, env, now)) {
    const unitId = practice ? (typeof body.unit === 'string' ? body.unit : '') : lessonId;
    if (lockReason(settings, false, unitId)) return json({ error: 'premium_required' }, 402);
    if (practice) {
      const row = await env.DB.prepare('SELECT practice FROM activity WHERE user_id = ? AND day = ?').bind(user.id, localDay(body.today, now)).first();
      if ((row ? row.practice || 0 : 0) >= settings.freePracticePerDay) return json({ error: 'practice_limit' }, 402);
    }
  }
  // A practice session earns XP but is not a lesson, so it leaves the lesson progress alone.
  if (!practice) await env.DB.prepare(
    `INSERT INTO progress (user_id, lesson_id, best_correct, total, attempts, first_completed_at, last_completed_at)
     VALUES (?, ?, ?, ?, 1, ?, ?)
     ON CONFLICT (user_id, lesson_id) DO UPDATE SET
       best_correct = MAX(best_correct, excluded.best_correct),
       total = excluded.total,
       attempts = attempts + 1,
       last_completed_at = excluded.last_completed_at`
  ).bind(user.id, lessonId, correct, total, now, now).run();

  // Per-word results (optional): which words were answered right or wrong in this session
  const words = Array.isArray(body.words) ? body.words.slice(0, MAX_WORDS_PER_SAVE) : [];
  const valid = words.filter((w) => w && typeof w.w === 'string' && w.w.length > 0 && w.w.length <= 80);
  if (valid.length) {
    await env.DB.batch(valid.map((w) => env.DB.prepare(
      `INSERT INTO word_stats (user_id, word, right_count, wrong_count, last_seen) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (user_id, word) DO UPDATE SET right_count = right_count + excluded.right_count, wrong_count = wrong_count + excluded.wrong_count, last_seen = excluded.last_seen`
    ).bind(user.id, w.w, w.ok ? 1 : 0, w.ok ? 0 : 1, now)));
  }

  const day = localDay(body.today, now);
  const kind = practice ? 'practice' : /-s\d+$/.test(lessonId) ? 'story' : 'lesson';
  const maxCombo = Number.isInteger(Number(body.maxCombo)) ? Math.min(Math.max(Number(body.maxCombo), 0), total) : 0;
  const breakdown = xpBreakdown(correct, total, maxCombo);
  const xp = breakdown.base + breakdown.accuracy + breakdown.combo;

  // First session today? Then missed days since the last active day may be covered by streak freezes.
  const todayRow = await env.DB.prepare('SELECT day FROM activity WHERE user_id = ? AND day = ?').bind(user.id, day).first();
  const firstToday = !todayRow;
  let freezes = user.freezes || 0;
  let freezesUsed = 0;
  if (firstToday && freezes > 0) {
    const last = await env.DB.prepare('SELECT day FROM activity WHERE user_id = ? AND day < ? ORDER BY day DESC LIMIT 1').bind(user.id, day).first();
    if (last) {
      const gap = [];
      for (let c = prevDay(day); c > last.day && gap.length <= MAX_FREEZES; c = prevDay(c)) gap.push(c);
      if (gap.length > 0 && gap.length <= freezes) {
        await env.DB.batch([
          ...gap.map((d) => env.DB.prepare('INSERT OR IGNORE INTO activity (user_id, day, xp, lessons, frozen) VALUES (?, ?, 0, 0, 1)').bind(user.id, d)),
          env.DB.prepare('UPDATE users SET freezes = freezes - ? WHERE id = ?').bind(gap.length, user.id),
        ]);
        freezesUsed = gap.length;
        freezes -= gap.length;
      }
    }
  }

  await env.DB.prepare(
    `INSERT INTO activity (user_id, day, xp, lessons, perfect, practice, stories) VALUES (?, ?, ?, 1, ?, ?, ?)
     ON CONFLICT (user_id, day) DO UPDATE SET xp = xp + excluded.xp, lessons = lessons + 1,
       perfect = perfect + excluded.perfect, practice = practice + excluded.practice, stories = stories + excluded.stories`
  ).bind(user.id, day, xp, correct === total ? 1 : 0, kind === 'practice' ? 1 : 0, kind === 'story' ? 1 : 0).run();

  // Daily quests: finishing all three pays a bonus once per day
  const row = await env.DB.prepare('SELECT xp, lessons, perfect, practice, stories, bonus FROM activity WHERE user_id = ? AND day = ?').bind(user.id, day).first();
  let questBonus = 0;
  if (!row.bonus && questsFor(day, user.daily_goal).every((q) => questProgress(q, row) >= q.target)) {
    questBonus = QUEST_BONUS_XP;
    await env.DB.prepare('UPDATE activity SET bonus = ?, xp = xp + ? WHERE user_id = ? AND day = ?').bind(questBonus, questBonus, user.id, day).run();
  }

  let stats = await statsFor(env, { ...user, freezes }, day);
  // Every full week of streak earns a streak freeze (at most two in stock)
  let freezeEarned = false;
  if (firstToday && stats.streak > 0 && stats.streak % 7 === 0 && freezes < MAX_FREEZES) {
    await env.DB.prepare('UPDATE users SET freezes = freezes + 1 WHERE id = ?').bind(user.id).run();
    freezeEarned = true;
    stats = { ...stats, freezes: freezes + 1 };
  }
  return json({ ...stats, ok: true, xp, breakdown: { ...breakdown, quest: questBonus }, questBonus, questBonusToday: stats.questBonus, firstToday, freezesUsed, freezeEarned });
}

// 5 XP for finishing, up to 10 for accuracy, up to 3 for a streak of right answers in a row.
export const xpFor = (correct, total) => 5 + Math.round((10 * correct) / total);
export const xpBreakdown = (correct, total, maxCombo = 0) => ({
  base: 5,
  accuracy: Math.round((10 * correct) / total),
  combo: maxCombo >= 8 ? 3 : maxCombo >= 5 ? 2 : maxCombo >= 3 ? 1 : 0,
});
export const DAILY_GOAL_XP = 20;
const MAX_WORDS_PER_SAVE = 80;
const MAX_FREEZES = 2;
const QUEST_BONUS_XP = 10;
const DAILY_GOALS = [10, 20, 30, 40]; // about 5, 10, 15 and 20 minutes a day
const MOTIVES = ['travel', 'work', 'family', 'culture', 'brain'];

// Three quests a day: always "earn XP", plus two of the others, picked by the date.
const QUEST_POOL = [
  { id: 'lessons', target: 2 },
  { id: 'perfect', target: 1 },
  { id: 'practice', target: 1 },
];
export function questsFor(day, goal = DAILY_GOAL_XP) {
  const seed = [...day].reduce((n, c) => n + c.charCodeAt(0), 0);
  const skip = seed % QUEST_POOL.length;
  return [{ id: 'xp', target: Math.max(10, Math.round((goal * 1.5) / 5) * 5) }, ...QUEST_POOL.filter((_, i) => i !== skip)];
}
const questProgress = (q, row) => {
  if (!row) return 0;
  if (q.id === 'xp') return row.xp - (row.bonus || 0);
  return row[q.id] || 0;
};

// The learner's local date (sent by the browser), accepted only within a day of the server's date.
function localDay(value, now) {
  const utc = new Date(now).toISOString().slice(0, 10);
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return utc;
  const diff = Math.abs(Date.parse(value + 'T00:00:00Z') - Date.parse(utc + 'T00:00:00Z'));
  return diff <= 86_400_000 ? value : utc;
}

const prevDay = (day) => new Date(Date.parse(day + 'T00:00:00Z') - 86_400_000).toISOString().slice(0, 10);

async function statsFor(env, user, today) {
  const goal = user.daily_goal || DAILY_GOAL_XP;
  const { results } = await env.DB.prepare('SELECT day, xp, lessons, perfect, practice, stories, bonus, frozen FROM activity WHERE user_id = ? ORDER BY day DESC LIMIT 400').bind(user.id).all();
  const days = new Map(results.map((r) => [r.day, r]));
  let streak = 0;
  let cursor = days.has(today) ? today : prevDay(today);
  while (days.has(cursor)) { streak++; cursor = prevDay(cursor); }
  // Longest run of consecutive days, for achievements
  let bestStreak = 0;
  let run = 0;
  let prev = null;
  for (const day of [...days.keys()].sort()) {
    run = prev && prevDay(day) === prev ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    prev = day;
  }
  const xpTotal = results.reduce((n, r) => n + r.xp, 0);
  const todayRow = days.get(today);
  // The last seven days, oldest first, for the week view
  const week = [];
  for (let i = 6, d = today; i >= 0; i--) {
    week.unshift({ day: d, xp: days.get(d)?.xp || 0, frozen: !!days.get(d)?.frozen });
    d = prevDay(d);
  }
  const quests = questsFor(today, goal).map((q) => ({ ...q, progress: Math.min(q.target, questProgress(q, todayRow)) }));
  return {
    streak,
    bestStreak: Math.max(bestStreak, streak),
    xpTotal,
    xpToday: todayRow?.xp || 0,
    dailyGoal: goal,
    activeToday: !!todayRow && !todayRow.frozen,
    freezes: user.freezes || 0,
    week,
    quests,
    questBonus: todayRow?.bonus || 0,
  };
}

async function getWords(request, env) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const { results } = await env.DB.prepare('SELECT word, right_count, wrong_count, last_seen FROM word_stats WHERE user_id = ?').bind(user.id).all();
  return json({ words: results.map((r) => ({ w: r.word, right: r.right_count, wrong: r.wrong_count, last: r.last_seen })) });
}

async function getStats(request, env, url) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, 401);
  return json(await statsFor(env, user, localDay(url.searchParams.get('today'), Date.now())));
}

// ---------------------------------------------------------------------------
// Pronunciation audio. Every clip (text + voice) the course needs is listed in /audio/manifest.json,
// built from the course and src/config/voices.json. A clip is generated once by its TTS provider,
// stored in D1 and cached at the edge. A cron trigger generates missing clips in the background, so
// nobody has to play through the lessons first. Only manifest clips can be synthesised.

const SITE_ORIGIN = 'https://hablena.com';
const WARM_BATCH = 20; // clips per cron run (stays well inside the subrequest limit)
// Characters we allow ourselves to generate per calendar month (the provider plan is the hard limit;
// this keeps a safety margin). Override with the TTS_MONTHLY_CHAR_LIMIT variable.
const DEFAULT_MONTHLY_CHARS = 25_000;
const monthlyLimit = (env) => Number(env.TTS_MONTHLY_CHAR_LIMIT) || DEFAULT_MONTHLY_CHARS;
async function charsThisMonth(env, manifest, now = Date.now()) {
  const d = new Date(now);
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  const { results } = await env.DB.prepare('SELECT hash FROM audio_cache WHERE created_at >= ?').bind(start).all();
  return results.reduce((n, r) => n + (manifest.clips[r.hash]?.[0].length || 0), 0);
}
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
  if ((await charsThisMonth(env, manifest)) + clip[0].length > monthlyLimit(env)) return json({ error: 'audio_budget_reached' }, 503);

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
  let budget = monthlyLimit(env) - (await charsThisMonth(env, manifest));
  // Skip clips for placeholder voices (flag at index 3): they are generated on demand only.
  for (const [hash, clip] of missing.filter(([, c]) => providerKey(env, c[1]) && !c[3]).slice(0, limit)) {
    if (clip[0].length > budget) { error = { budget: true }; break; }
    budget -= clip[0].length;
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
  const byVoice = {};
  for (const [hash, [, provider, voice]] of clips) {
    const p = (byProvider[provider] ||= { total: 0, ready: 0, configured: !!providerKey(env, provider) });
    const v = (byVoice[manifest.voices?.[voice] || voice] ||= { total: 0, ready: 0 });
    p.total++;
    v.total++;
    if (stored.has(hash)) { p.ready++; v.ready++; }
  }
  const ready = clips.filter(([hash]) => stored.has(hash)).length;
  const pending = clips.filter(([hash, c]) => c[3] && !stored.has(hash)).length;
  return json({ total: clips.length, ready, done: ready + pending === clips.length, onDemandOnly: pending, charsThisMonth: await charsThisMonth(env, manifest), monthlyLimit: monthlyLimit(env), voices: byVoice, providers: byProvider }, 200, { 'Cache-Control': 'no-store' });
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
  const cols = `u.id, u.email, u.name, u.lang, u.created_at, u.daily_goal, u.motive, u.freezes, u.role, u.premium_until, u.premium_source, u.expires_at, u.is_test${withPassword ? ', u.password' : ''}`;
  const now = Date.now();
  // Blocked and expired (test) accounts are treated as logged out
  return env.DB.prepare(`SELECT ${cols} FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ? AND u.blocked = 0 AND (u.expires_at IS NULL OR u.expires_at > ?)`)
    .bind(await sha256Hex(token), now, now)
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
