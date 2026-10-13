// Admin API (/api/admin/*): user management, premium, test accounts, codes and an audit log.
// Admins are users with role 'admin' or whose email is listed in the ADMIN_EMAILS variable.
// Every change is written to admin_log. Shared helpers are passed in from index.js.
import { getSettings, cleanSettings, saveSettings } from './access.js';

export const LIFETIME = 253402214400000; // 9999-12-31, means "premium forever"
const DAY = 86_400_000;
const PAGE_SIZE = 50;

export const isAdmin = (user, env) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const list = String(env.ADMIN_EMAILS || '').toLowerCase().split(/[\s,;]+/).filter(Boolean);
  return list.includes(String(user.email).toLowerCase());
};

export const premiumOf = (row, now = Date.now()) => {
  const until = row?.premium_until || null;
  return { active: !!until && until > now, until, lifetime: until === LIFETIME, source: row?.premium_source || null };
};

// Extends from the current end if premium is still running, otherwise from now.
export const extendPremium = (currentUntil, days, now = Date.now()) => {
  if (currentUntil === LIFETIME) return LIFETIME;
  const base = currentUntil && currentUntil > now ? currentUntil : now;
  return base + days * DAY;
};

const WORDS = ['sol', 'mar', 'luna', 'playa', 'tapas', 'flor', 'cielo', 'fiesta', 'casa', 'gato', 'perro', 'tren', 'cafe', 'libro', 'verde', 'rojo', 'azul', 'monte', 'rio', 'pan'];
const randomInt = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
export function tempPassword() {
  const pick = () => WORDS[randomInt(WORDS.length)];
  return `${pick()}-${pick()}-${pick()}-${100 + randomInt(900)}`;
}
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newCode(prefix = 'HABLA') {
  let s = '';
  for (let i = 0; i < 8; i++) s += CODE_CHARS[randomInt(CODE_CHARS.length)];
  return `${prefix}-${s.slice(0, 4)}-${s.slice(4)}`;
}

export async function handleAdmin(request, env, url, route, h) {
  const { json, readJson, currentUser, hashPassword, normalizeEmail } = h;
  const admin = await currentUser(request, env);
  if (!admin) return json({ error: 'unauthorized' }, 401);
  if (!isAdmin(admin, env)) return json({ error: 'forbidden' }, 403);
  const now = Date.now();
  const noStore = { 'Cache-Control': 'no-store' };
  const ok = (data = {}) => json({ ok: true, ...data }, 200, noStore);
  const log = (action, target, detail) => env.DB.prepare(
    'INSERT INTO admin_log (at, admin_id, admin_email, action, target_id, target_email, detail) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(now, admin.id, admin.email, action, target?.id || null, target?.email || null, detail ? JSON.stringify(detail) : null).run();
  const getUser = (id) => env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();

  // ---------- overview ----------
  if (route === 'GET /api/admin/overview') {
    const one = (sql, ...args) => env.DB.prepare(sql).bind(...args).first();
    const today = new Date(now).toISOString().slice(0, 10);
    const weekAgo = new Date(now - 6 * DAY).toISOString().slice(0, 10);
    const [users, newWeek, premium, lifetime, blocked, tests, activeToday, activeWeek, lessonsWeek, xpWeek] = await Promise.all([
      one('SELECT COUNT(*) AS n FROM users'),
      one('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?', now - 7 * DAY),
      one('SELECT COUNT(*) AS n FROM users WHERE premium_until > ?', now),
      one('SELECT COUNT(*) AS n FROM users WHERE premium_until = ?', LIFETIME),
      one('SELECT COUNT(*) AS n FROM users WHERE blocked = 1'),
      one('SELECT COUNT(*) AS n FROM users WHERE is_test = 1'),
      one('SELECT COUNT(DISTINCT user_id) AS n FROM activity WHERE day = ? AND frozen = 0', today),
      one('SELECT COUNT(DISTINCT user_id) AS n FROM activity WHERE day >= ? AND frozen = 0', weekAgo),
      one('SELECT COALESCE(SUM(lessons), 0) AS n FROM activity WHERE day >= ?', weekAgo),
      one('SELECT COALESCE(SUM(xp), 0) AS n FROM activity WHERE day >= ?', weekAgo),
    ]);
    // Sign-ups and active learners per day, last 30 days
    const since = now - 29 * DAY;
    const signups = (await env.DB.prepare('SELECT created_at FROM users WHERE created_at >= ?').bind(new Date(new Date(since).toISOString().slice(0, 10)).getTime()).all()).results;
    const active = (await env.DB.prepare('SELECT day, COUNT(DISTINCT user_id) AS n FROM activity WHERE day >= ? AND frozen = 0 GROUP BY day').bind(new Date(since).toISOString().slice(0, 10)).all()).results;
    const activeMap = new Map(active.map((r) => [r.day, r.n]));
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * DAY).toISOString().slice(0, 10);
      days.push({ day: d, signups: signups.filter((r) => new Date(r.created_at).toISOString().slice(0, 10) === d).length, active: activeMap.get(d) || 0 });
    }
    const recent = (await env.DB.prepare('SELECT id, email, name, created_at FROM users ORDER BY created_at DESC LIMIT 6').all()).results;
    return ok({
      totals: { users: users.n, newWeek: newWeek.n, premium: premium.n, lifetime: lifetime.n, blocked: blocked.n, tests: tests.n, activeToday: activeToday.n, activeWeek: activeWeek.n, lessonsWeek: lessonsWeek.n, xpWeek: xpWeek.n },
      days,
      recent,
      settings: await getSettings(env),
      me: { id: admin.id, email: admin.email },
    });
  }

  // ---------- user list ----------
  if (route === 'GET /api/admin/users') {
    const q = (url.searchParams.get('q') || '').trim().toLowerCase().slice(0, 100);
    const filter = url.searchParams.get('filter') || 'all';
    const sort = url.searchParams.get('sort') || 'newest';
    const page = Math.max(0, Number(url.searchParams.get('page')) || 0);
    const where = [];
    const args = [];
    if (q) { where.push('(LOWER(u.email) LIKE ? OR LOWER(COALESCE(u.name, \'\')) LIKE ? OR LOWER(COALESCE(u.note, \'\')) LIKE ?)'); args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    if (filter === 'premium') { where.push('u.premium_until > ?'); args.push(now); }
    if (filter === 'free') { where.push('(u.premium_until IS NULL OR u.premium_until <= ?)'); args.push(now); }
    if (filter === 'lifetime') { where.push('u.premium_until = ?'); args.push(LIFETIME); }
    if (filter === 'test') where.push('u.is_test = 1');
    if (filter === 'blocked') where.push('u.blocked = 1');
    if (filter === 'expired') { where.push('u.expires_at IS NOT NULL AND u.expires_at <= ?'); args.push(now); }
    if (filter === 'admin') where.push("u.role = 'admin'");
    const order = {
      newest: 'u.created_at DESC', oldest: 'u.created_at ASC', login: 'COALESCE(u.last_login_at, 0) DESC',
      xp: 'xp DESC', email: 'u.email ASC', premium: 'COALESCE(u.premium_until, 0) DESC',
    }[sort] || 'u.created_at DESC';
    const sql = `SELECT u.id, u.email, u.name, u.created_at, u.last_login_at, u.role, u.premium_until, u.premium_source, u.blocked, u.expires_at, u.is_test, u.note,
        (SELECT COALESCE(SUM(xp), 0) FROM activity a WHERE a.user_id = u.id) AS xp,
        (SELECT COUNT(*) FROM progress p WHERE p.user_id = u.id) AS lessons,
        (SELECT MAX(day) FROM activity a WHERE a.user_id = u.id AND a.frozen = 0) AS last_active
      FROM users u ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order} LIMIT ? OFFSET ?`;
    const rows = (await env.DB.prepare(sql).bind(...args, PAGE_SIZE + 1, page * PAGE_SIZE).all()).results;
    const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM users u ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`).bind(...args).first()).n;
    return ok({
      users: rows.slice(0, PAGE_SIZE).map((r) => ({ ...publicUser(r, env), xp: r.xp, lessons: r.lessons, lastActive: r.last_active })),
      total, page, pageSize: PAGE_SIZE, more: rows.length > PAGE_SIZE,
    });
  }

  // ---------- test accounts ----------
  if (route === 'POST /api/admin/test-accounts') {
    const body = (await readJson(request)) || {};
    let email = body.email ? normalizeEmail(body.email) : null;
    if (body.email && !email) return json({ error: 'invalid_email' }, 400);
    if (!email) email = `test-${newCode('').slice(1).toLowerCase().replace(/-/g, '')}@test.hablena.com`;
    if (await env.DB.prepare('SELECT 1 FROM users WHERE email = ?').bind(email).first()) return json({ error: 'email_taken' }, 409);
    const accountDays = Number(body.accountDays) || 0;
    const premiumDays = Number(body.premiumDays) || 0;
    if (accountDays < 0 || accountDays > 3650 || premiumDays < 0 || premiumDays > 3650) return json({ error: 'invalid_request' }, 400);
    const password = tempPassword();
    const id = crypto.randomUUID();
    const premiumUntil = body.lifetime ? LIFETIME : premiumDays ? now + premiumDays * DAY : null;
    const expiresAt = accountDays ? now + accountDays * DAY : null;
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 60) : '';
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '';
    await env.DB.prepare(`INSERT INTO users (id, email, name, password, lang, created_at, last_login_at, premium_until, premium_source, expires_at, is_test, note)
      VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 1, ?)`)
      .bind(id, email, name || null, await hashPassword(password), body.lang === 'en' ? 'en' : 'de', now, premiumUntil, premiumUntil ? 'admin' : null, expiresAt, note || null).run();
    await log('test_account_created', { id, email }, { accountDays, premiumDays, lifetime: !!body.lifetime });
    return ok({ user: { id, email, password, expiresAt, premiumUntil } });
  }

  // ---------- codes ----------
  if (route === 'GET /api/admin/codes') {
    const rows = (await env.DB.prepare('SELECT * FROM codes ORDER BY created_at DESC LIMIT 300').all()).results;
    return ok({ codes: rows.map((c) => ({ code: c.code, days: c.days, lifetime: !!c.lifetime, maxUses: c.max_uses, used: c.used, expiresAt: c.expires_at, disabled: !!c.disabled, note: c.note, createdAt: c.created_at, createdBy: c.created_by })) });
  }
  if (route === 'POST /api/admin/codes') {
    const body = (await readJson(request)) || {};
    const count = Math.min(Math.max(Number(body.count) || 1, 1), 100);
    const days = Number(body.days) || 0;
    const lifetime = !!body.lifetime;
    const maxUses = Math.min(Math.max(Number(body.maxUses) || 1, 1), 100000);
    const validDays = Number(body.validDays) || 0;
    if (!lifetime && (days < 1 || days > 3650)) return json({ error: 'invalid_request' }, 400);
    const prefix = String(body.prefix || 'HABLA').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'HABLA';
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 300) : null;
    const codes = Array.from({ length: count }, () => newCode(prefix));
    await env.DB.batch(codes.map((code) => env.DB.prepare(
      'INSERT INTO codes (code, days, lifetime, max_uses, used, expires_at, note, created_at, created_by) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)'
    ).bind(code, lifetime ? null : days, lifetime ? 1 : 0, maxUses, validDays ? now + validDays * DAY : null, note, now, admin.email)));
    await log('codes_created', null, { count, days, lifetime, maxUses, validDays, prefix });
    return ok({ codes });
  }
  const codeMatch = url.pathname.match(/^\/api\/admin\/codes\/([A-Z0-9-]{4,40})\/(disable|enable)$/);
  if (codeMatch && request.method === 'POST') {
    const res = await env.DB.prepare('UPDATE codes SET disabled = ? WHERE code = ?').bind(codeMatch[2] === 'disable' ? 1 : 0, codeMatch[1]).run();
    if (!res.meta?.changes) return json({ error: 'not_found' }, 404);
    await log(`code_${codeMatch[2]}d`, null, { code: codeMatch[1] });
    return ok();
  }

  // ---------- settings (paywall) ----------
  if (route === 'GET /api/admin/settings') {
    const settings = await getSettings(env);
    const affected = await env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE (premium_until IS NULL OR premium_until <= ?) AND role != ?').bind(now, 'admin').first();
    return ok({ settings, freeUsers: affected.n });
  }
  if (route === 'POST /api/admin/settings') {
    const values = cleanSettings(await readJson(request));
    if (!values || values.error) return json({ error: 'invalid_request', field: values?.error }, 400);
    await saveSettings(env, values, admin.email);
    await log('settings_updated', null, values);
    return ok({ settings: await getSettings(env) });
  }

  // ---------- log ----------
  if (route === 'GET /api/admin/log') {
    const page = Math.max(0, Number(url.searchParams.get('page')) || 0);
    const rows = (await env.DB.prepare('SELECT * FROM admin_log ORDER BY id DESC LIMIT ? OFFSET ?').bind(PAGE_SIZE + 1, page * PAGE_SIZE).all()).results;
    return ok({ entries: rows.slice(0, PAGE_SIZE).map(logEntry), more: rows.length > PAGE_SIZE, page });
  }

  // ---------- single user ----------
  const m = url.pathname.match(/^\/api\/admin\/users\/([0-9a-f-]{36})(?:\/([a-z-]+))?$/);
  if (!m) return json({ error: 'not_found' }, 404);
  const target = await getUser(m[1]);
  if (!target) return json({ error: 'not_found' }, 404);
  const action = m[2] || '';

  if (request.method === 'GET' && !action) {
    const [prog, act, sessions, words, redemptions, entries] = await Promise.all([
      env.DB.prepare('SELECT lesson_id, best_correct, total, attempts, last_completed_at FROM progress WHERE user_id = ? ORDER BY last_completed_at DESC').bind(target.id).all(),
      env.DB.prepare('SELECT day, xp, lessons, frozen FROM activity WHERE user_id = ? ORDER BY day DESC LIMIT 60').bind(target.id).all(),
      env.DB.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ? AND expires_at > ?').bind(target.id, now).first(),
      env.DB.prepare('SELECT COUNT(*) AS n FROM word_stats WHERE user_id = ?').bind(target.id).first(),
      env.DB.prepare('SELECT code, at FROM code_redemptions WHERE user_id = ? ORDER BY at DESC').bind(target.id).all(),
      env.DB.prepare('SELECT * FROM admin_log WHERE target_id = ? ORDER BY id DESC LIMIT 30').bind(target.id).all(),
    ]);
    const days = act.results;
    let streak = 0;
    const set = new Set(days.map((d) => d.day));
    const prev = (d) => new Date(Date.parse(d + 'T00:00:00Z') - DAY).toISOString().slice(0, 10);
    const today = new Date(now).toISOString().slice(0, 10);
    for (let c = set.has(today) ? today : prev(today); set.has(c); c = prev(c)) streak++;
    return ok({
      user: { ...publicUser(target, env), lang: target.lang, dailyGoal: target.daily_goal, motive: target.motive, freezes: target.freezes },
      stats: {
        lessons: prog.results.length,
        xp: (await env.DB.prepare('SELECT COALESCE(SUM(xp), 0) AS n FROM activity WHERE user_id = ?').bind(target.id).first()).n,
        streak, sessions: sessions.n, words: words.n,
      },
      progress: prog.results.slice(0, 20).map((p) => ({ lessonId: p.lesson_id, best: p.best_correct, total: p.total, attempts: p.attempts, at: p.last_completed_at })),
      activity: days.slice(0, 30),
      redemptions: redemptions.results,
      log: entries.results.map(logEntry),
    });
  }
  if (request.method !== 'POST') return json({ error: 'not_found' }, 404);
  const body = (await readJson(request)) || {};
  const self = target.id === admin.id;

  if (action === 'premium') {
    let until;
    if (body.mode === 'revoke') until = null;
    else if (body.mode === 'lifetime') until = LIFETIME;
    else if (body.mode === 'until') {
      until = Date.parse(String(body.until));
      if (!Number.isFinite(until) || until < now) return json({ error: 'invalid_date' }, 400);
    } else {
      const days = Number(body.days);
      if (!Number.isFinite(days) || days < 1 || days > 3650) return json({ error: 'invalid_request' }, 400);
      until = extendPremium(target.premium_until, days, now);
    }
    await env.DB.prepare('UPDATE users SET premium_until = ?, premium_source = ? WHERE id = ?').bind(until, until ? 'admin' : null, target.id).run();
    await log(until ? 'premium_granted' : 'premium_revoked', target, { mode: body.mode || 'days', days: body.days, until });
    return ok({ user: publicUser(await getUser(target.id), env) });
  }

  if (action === 'update') {
    const sets = [];
    const args = [];
    const changes = {};
    if ('blocked' in body) {
      if (self && body.blocked) return json({ error: 'cannot_block_self' }, 400);
      sets.push('blocked = ?'); args.push(body.blocked ? 1 : 0); changes.blocked = !!body.blocked;
    }
    if ('role' in body) {
      if (!['user', 'admin'].includes(body.role)) return json({ error: 'invalid_request' }, 400);
      if (self && body.role !== 'admin') return json({ error: 'cannot_demote_self' }, 400);
      sets.push('role = ?'); args.push(body.role); changes.role = body.role;
    }
    if ('expiresAt' in body) {
      let exp = null;
      if (body.expiresAt) {
        exp = Date.parse(String(body.expiresAt));
        if (!Number.isFinite(exp)) return json({ error: 'invalid_date' }, 400);
      }
      if (self && exp) return json({ error: 'cannot_expire_self' }, 400);
      sets.push('expires_at = ?'); args.push(exp); changes.expiresAt = exp;
    }
    if ('note' in body) { sets.push('note = ?'); args.push(String(body.note || '').slice(0, 1000) || null); changes.note = true; }
    if ('name' in body) { sets.push('name = ?'); args.push(String(body.name || '').trim().slice(0, 60) || null); changes.name = true; }
    if ('isTest' in body) { sets.push('is_test = ?'); args.push(body.isTest ? 1 : 0); changes.isTest = !!body.isTest; }
    if (!sets.length) return json({ error: 'invalid_request' }, 400);
    await env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...args, target.id).run();
    if (changes.blocked) await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(target.id).run();
    await log('user_updated', target, changes);
    return ok({ user: publicUser(await getUser(target.id), env) });
  }

  if (action === 'password-reset') {
    const password = tempPassword();
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET password = ? WHERE id = ?').bind(await hashPassword(password), target.id),
      env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(target.id),
    ]);
    await log('password_reset', target);
    return ok({ password });
  }

  if (action === 'logout-all') {
    await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(target.id).run();
    await log('sessions_ended', target);
    return ok();
  }

  if (action === 'delete') {
    if (self) return json({ error: 'cannot_delete_self' }, 400);
    if (body.confirm !== target.email) return json({ error: 'confirmation_mismatch' }, 400);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM progress WHERE user_id = ?').bind(target.id),
      env.DB.prepare('DELETE FROM activity WHERE user_id = ?').bind(target.id),
      env.DB.prepare('DELETE FROM word_stats WHERE user_id = ?').bind(target.id),
      env.DB.prepare('DELETE FROM code_redemptions WHERE user_id = ?').bind(target.id),
      env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(target.id),
      env.DB.prepare('DELETE FROM users WHERE id = ?').bind(target.id),
    ]);
    await log('user_deleted', target);
    return ok();
  }

  return json({ error: 'not_found' }, 404);
}

function publicUser(r, env) {
  const now = Date.now();
  return {
    id: r.id, email: r.email, name: r.name, createdAt: r.created_at, lastLoginAt: r.last_login_at,
    role: r.role, admin: r.role === 'admin' || isAdmin({ role: r.role, email: r.email }, env),
    premium: premiumOf(r, now),
    blocked: !!r.blocked, expiresAt: r.expires_at, expired: !!r.expires_at && r.expires_at <= now,
    isTest: !!r.is_test, note: r.note,
  };
}

const logEntry = (e) => ({ id: e.id, at: e.at, admin: e.admin_email, action: e.action, targetId: e.target_id, target: e.target_email, detail: e.detail ? JSON.parse(e.detail) : null });

// Redeeming a code (user side): adds the code's premium time once per user.
export async function redeemCode(request, env, h) {
  const { json, readJson, currentUser } = h;
  const user = await currentUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const body = await readJson(request);
  const code = String(body?.code || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9-]{4,40}$/.test(code)) return json({ error: 'code_invalid' }, 400);
  const now = Date.now();
  const c = await env.DB.prepare('SELECT * FROM codes WHERE code = ?').bind(code).first();
  if (!c || c.disabled) return json({ error: 'code_invalid' }, 400);
  if (c.expires_at && c.expires_at <= now) return json({ error: 'code_expired' }, 400);
  if (c.used >= c.max_uses) return json({ error: 'code_used' }, 400);
  if (await env.DB.prepare('SELECT 1 FROM code_redemptions WHERE code = ? AND user_id = ?').bind(code, user.id).first()) return json({ error: 'code_already_redeemed' }, 400);
  const row = await env.DB.prepare('SELECT premium_until FROM users WHERE id = ?').bind(user.id).first();
  const until = c.lifetime ? LIFETIME : extendPremium(row.premium_until, c.days, now);
  const claim = await env.DB.prepare('UPDATE codes SET used = used + 1 WHERE code = ? AND used < max_uses').bind(code).run();
  if (claim.meta && claim.meta.changes === 0) return json({ error: 'code_used' }, 400);
  await env.DB.batch([
    env.DB.prepare('INSERT INTO code_redemptions (code, user_id, at) VALUES (?, ?, ?)').bind(code, user.id, now),
    env.DB.prepare("UPDATE users SET premium_until = ?, premium_source = 'code' WHERE id = ?").bind(until, user.id),
    env.DB.prepare('INSERT INTO admin_log (at, admin_id, admin_email, action, target_id, target_email, detail) VALUES (?, NULL, NULL, ?, ?, ?, ?)')
      .bind(now, 'code_redeemed', user.id, user.email, JSON.stringify({ code, until })),
  ]);
  return json({ ok: true, premium: premiumOf({ premium_until: until, premium_source: 'code' }, now) });
}
