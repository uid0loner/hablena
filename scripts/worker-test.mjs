// End-to-end tests for the Worker API against a local SQLite database that mimics D1.
// Run: npm run test:worker
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import worker, { warmAudio } from '../worker/index.js';
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
{
  const g = await call('POST', '/api/auth/signup', { body: { email: 'goal@example.com', password: 'correct horse battery', dailyGoal: 40, motive: 'travel' } });
  const row = env.DB.raw.prepare("SELECT daily_goal, motive FROM users WHERE email = 'goal@example.com'").get();
  check('signup stores goal and motive', g.status === 201 && row.daily_goal === 40 && row.motive === 'travel');
  const h = await call('POST', '/api/auth/signup', { body: { email: 'odd@example.com', password: 'correct horse battery', dailyGoal: 999, motive: '<script>' } });
  const row2 = env.DB.raw.prepare("SELECT daily_goal, motive FROM users WHERE email = 'odd@example.com'").get();
  check('signup ignores invalid goal and motive', h.status === 201 && row2.daily_goal === 20 && row2.motive === null);
}
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

// XP and streaks
{
  const day = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
  const save = (today, correct = 10) => call('POST', '/api/progress', { cookie: li.cookie, body: { lessonId: 'u1-l2', correct, total: 10, today } });
  const s1 = (await save(day(0))).data;
  check('xp for a perfect lesson', s1.xp === 15 && s1.xpToday === 37, JSON.stringify(s1)); // 12 + 10 from earlier saves today
  check('streak starts at 1', s1.streak === 1);
  // Simulate yesterday and the day before directly in the DB
  const uid = env.DB.raw.prepare("SELECT id FROM users WHERE email = 'nico@example.com'").get().id;
  env.DB.raw.prepare('INSERT INTO activity (user_id, day, xp, lessons) VALUES (?, ?, 10, 1), (?, ?, 10, 1)').run(uid, day(-1), uid, day(-2));
  const st = (await call('GET', `/api/stats?today=${day(0)}`, { cookie: li.cookie })).data;
  check('streak counts consecutive days', st.streak === 3, JSON.stringify(st));
  check('best streak', st.bestStreak === 3);
  const tomorrowView = (await call('GET', `/api/stats?today=${day(1)}`, { cookie: li.cookie })).data;
  check('streak survives until the day is over', tomorrowView.streak === 3 && tomorrowView.activeToday === false);
  const forged = (await call('GET', '/api/stats?today=2001-01-01', { cookie: li.cookie })).data;
  check('implausible client date ignored', forged.xpToday > 0);
  check('stats need login', (await call('GET', '/api/stats')).status === 401);
  check('default daily goal', st.dailyGoal === 20);
  check('goal rejects odd values', (await call('POST', '/api/me/goal', { cookie: li.cookie, body: { dailyGoal: 25 } })).status === 400);
  check('goal can be changed', (await call('POST', '/api/me/goal', { cookie: li.cookie, body: { dailyGoal: 30 } })).data.dailyGoal === 30);
  check('stats use personal goal', (await call('GET', `/api/stats?today=${day(0)}`, { cookie: li.cookie })).data.dailyGoal === 30);
  check('me returns goal', (await call('GET', '/api/me', { cookie: li.cookie })).data.user.dailyGoal === 30);
  const before = (await call('GET', '/api/progress', { cookie: li.cookie })).data.progress.length;
  const pr = await call('POST', '/api/progress', { cookie: li.cookie, body: { lessonId: 'practice', correct: 8, total: 10, today: day(0) } });
  const after = (await call('GET', '/api/progress', { cookie: li.cookie })).data.progress.length;
  await call('POST', '/api/progress', { cookie: li.cookie, body: { lessonId: 'u1-l3', correct: 1, total: 2, today: day(0), words: [{ w: 'hola', ok: true }, { w: 'adiós', ok: false }, { w: 'x'.repeat(200), ok: true }, null] } });
  await call('POST', '/api/progress', { cookie: li.cookie, body: { lessonId: 'u1-l3', correct: 2, total: 2, today: day(0), words: [{ w: 'hola', ok: true }] } });
  const ws = (await call('GET', '/api/words', { cookie: li.cookie })).data.words;
  const hola = ws.find((x) => x.w === 'hola');
  check('word stats stored and summed', ws.length === 2 && hola.right === 2 && hola.wrong === 0 && ws.find((x) => x.w === 'adiós').wrong === 1);
  check('words need login', (await call('GET', '/api/words')).status === 401);
  check('story progress accepted', (await call('POST', '/api/progress', { cookie: li.cookie, body: { lessonId: 'u1-s1', correct: 3, total: 3, today: day(0) } })).status === 200);
  check('practice earns XP without lesson progress', pr.status === 200 && pr.data.xp === 13 && after === before);
}

// Combo bonus, daily quests, streak freezes
{
  const day = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
  const su = await call('POST', '/api/auth/signup', { body: { email: 'quest@example.com', password: 'correct horse battery', dailyGoal: 10 }, ip: '9.9.9.1' });
  const cookie = su.cookie;
  const uid = env.DB.raw.prepare("SELECT id FROM users WHERE email = 'quest@example.com'").get().id;
  const save = (body) => call('POST', '/api/progress', { cookie, body: { today: day(0), ...body } });
  const r1 = (await save({ lessonId: 'u1-l1', correct: 10, total: 10, maxCombo: 9 })).data;
  check('combo bonus', r1.breakdown.combo === 3 && r1.xp === 18 && r1.firstToday === true);
  check('stats: week of seven days', r1.week.length === 7 && r1.week[6].day === day(0) && r1.week[6].xp >= 18);
  check('stats: three quests', r1.quests.length === 3 && r1.quests[0].id === 'xp' && r1.quests[0].target === 15);
  const r2 = (await save({ lessonId: 'u1-l2', correct: 9, total: 10, maxCombo: 99 })).data;
  check('combo capped by total', r2.breakdown.combo === 3 && r2.firstToday === false);
  // finish whatever quests are left
  await save({ lessonId: 'practice', correct: 10, total: 10 });
  const r3 = (await save({ lessonId: 'practice', correct: 10, total: 10 })).data;
  const st = (await call('GET', `/api/stats?today=${day(0)}`, { cookie })).data;
  check('all quests done', st.quests.every((q) => q.progress >= q.target));
  check('quest bonus paid once', st.questBonus === 10 && env.DB.raw.prepare('SELECT bonus FROM activity WHERE user_id = ? AND day = ?').get(uid, day(0)).bonus === 10);
  const r4 = (await save({ lessonId: 'practice', correct: 10, total: 10 })).data;
  check('no second quest bonus', r4.questBonus === 0, JSON.stringify({ r1: r1.questBonus, r2: r2.questBonus, r3: r3.questBonus, r4: r4.questBonus, q: r4.quests }));

  // Streak freeze earned at 7 days
  env.DB.raw.exec(`DELETE FROM activity WHERE user_id = '${uid}'`);
  for (let i = 1; i <= 6; i++) env.DB.raw.prepare('INSERT INTO activity (user_id, day, xp, lessons) VALUES (?, ?, 10, 1)').run(uid, day(-i));
  const f1 = (await save({ lessonId: 'u1-l3', correct: 10, total: 10 })).data;
  check('7-day streak earns a freeze', f1.streak === 7 && f1.freezeEarned === true && f1.freezes === 1);

  // Freezes cover missed days
  env.DB.raw.exec(`DELETE FROM activity WHERE user_id = '${uid}'`);
  env.DB.raw.prepare('UPDATE users SET freezes = 2 WHERE id = ?').run(uid);
  for (const i of [3, 4]) env.DB.raw.prepare('INSERT INTO activity (user_id, day, xp, lessons) VALUES (?, ?, 10, 1)').run(uid, day(-i));
  const f2 = (await save({ lessonId: 'u1-l3', correct: 10, total: 10 })).data;
  check('freezes bridge a two-day gap', f2.freezesUsed === 2 && f2.streak === 5 && f2.freezes === 0 && f2.week.filter((w) => w.frozen).length === 2);
  env.DB.raw.exec(`DELETE FROM activity WHERE user_id = '${uid}'`);
  env.DB.raw.prepare('UPDATE users SET freezes = 1 WHERE id = ?').run(uid);
  for (const i of [3, 4]) env.DB.raw.prepare('INSERT INTO activity (user_id, day, xp, lessons) VALUES (?, ?, 10, 1)').run(uid, day(-i));
  const f3 = (await save({ lessonId: 'u1-l3', correct: 10, total: 10 })).data;
  check('not enough freezes: streak restarts', f3.freezesUsed === 0 && f3.streak === 1 && f3.freezes === 1);
}

// Admin portal
{
  const day = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
  const aenv = { ...env, ADMIN_EMAILS: 'boss@example.com, other@example.com' };
  const acall = (method, path, opts = {}) => {
    const headers = { 'CF-Connecting-IP': opts.ip || '5.5.5.5' };
    headers.Origin = ORIGIN;
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (opts.cookie) headers.Cookie = opts.cookie;
    return worker.fetch(new Request(ORIGIN + path, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) }), aenv)
      .then(async (res) => ({ status: res.status, data: await res.json().catch(() => ({})), setCookie: res.headers.get('Set-Cookie') || '' }));
  };
  const cookieOf = (r) => { const m = r.setCookie.match(/__Host-hablena_session=([^;]*)/); return m ? `__Host-hablena_session=${m[1]}` : null; };
  const boss = await acall('POST', '/api/auth/signup', { body: { email: 'boss@example.com', password: 'correct horse battery' }, ip: '7.7.7.1' });
  const bossCookie = cookieOf(boss);
  const pleb = await acall('POST', '/api/auth/signup', { body: { email: 'pleb@example.com', password: 'correct horse battery' }, ip: '7.7.7.2' });
  const plebCookie = cookieOf(pleb);
  const plebId = env.DB.raw.prepare("SELECT id FROM users WHERE email = 'pleb@example.com'").get().id;
  const bossId = env.DB.raw.prepare("SELECT id FROM users WHERE email = 'boss@example.com'").get().id;

  check('admin: needs login', (await acall('GET', '/api/admin/overview')).status === 401);
  check('admin: normal user forbidden', (await acall('GET', '/api/admin/overview', { cookie: plebCookie })).status === 403);
  const ov = await acall('GET', '/api/admin/overview', { cookie: bossCookie });
  check('admin: overview', ov.status === 200 && ov.data.totals.users >= 2 && ov.data.days.length === 30);
  check('me: admin flag', (await acall('GET', '/api/me', { cookie: bossCookie })).data.user.admin === true && (await acall('GET', '/api/me', { cookie: plebCookie })).data.user.admin === false);

  const list = await acall('GET', '/api/admin/users?q=pleb', { cookie: bossCookie });
  check('admin: search users', list.status === 200 && list.data.users.length === 1 && list.data.users[0].email === 'pleb@example.com');

  // Premium
  const P = (body) => acall('POST', `/api/admin/users/${plebId}/premium`, { cookie: bossCookie, body });
  const g1 = await P({ mode: 'days', days: 7 });
  const u1 = g1.data.user.premium.until;
  check('premium: grant 7 days', g1.status === 200 && g1.data.user.premium.active && Math.abs(u1 - (Date.now() + 7 * 86_400_000)) < 60_000);
  const g2 = await P({ mode: 'days', days: 1 });
  check('premium: extends from current end', Math.abs(g2.data.user.premium.until - (u1 + 86_400_000)) < 5_000);
  check('premium: visible to the user', (await acall('GET', '/api/me', { cookie: plebCookie })).data.user.premium.active === true);
  const g3 = await P({ mode: 'lifetime' });
  check('premium: lifetime', g3.data.user.premium.lifetime === true);
  check('premium: filter lifetime', (await acall('GET', '/api/admin/users?filter=lifetime', { cookie: bossCookie })).data.users.some((u) => u.email === 'pleb@example.com'));
  const g4 = await P({ mode: 'until', until: '2001-01-01' });
  check('premium: past date rejected', g4.status === 400);
  const g5 = await P({ mode: 'revoke' });
  check('premium: revoke', g5.data.user.premium.active === false && g5.data.user.premium.until === null);

  // Block / unblock
  const U = (body, id = plebId) => acall('POST', `/api/admin/users/${id}/update`, { cookie: bossCookie, body });
  await U({ blocked: true });
  check('block: sessions ended', (await acall('GET', '/api/me', { cookie: plebCookie })).status === 401);
  const blockedLogin = await acall('POST', '/api/auth/login', { body: { email: 'pleb@example.com', password: 'correct horse battery' }, ip: '7.7.7.3' });
  check('block: login refused', blockedLogin.status === 403 && blockedLogin.data.error === 'account_disabled');
  await U({ blocked: false });
  const relog = await acall('POST', '/api/auth/login', { body: { email: 'pleb@example.com', password: 'correct horse battery' }, ip: '7.7.7.3' });
  check('unblock: login works', relog.status === 200);
  const pleb2 = cookieOf(relog);
  // Expiry
  await U({ expiresAt: new Date(Date.now() - 60_000).toISOString() });
  check('expiry: expired account is logged out', (await acall('GET', '/api/me', { cookie: pleb2 })).status === 401);
  const expLogin = await acall('POST', '/api/auth/login', { body: { email: 'pleb@example.com', password: 'correct horse battery' }, ip: '7.7.7.3' });
  check('expiry: login refused', expLogin.status === 403 && expLogin.data.error === 'account_expired');
  await U({ expiresAt: null });
  // Self-protection
  check('admin cannot block self', (await U({ blocked: true }, bossId)).status === 400);
  check('admin cannot demote self', (await U({ role: 'user' }, bossId)).status === 400);
  // Roles
  await U({ role: 'admin' });
  check('promote to admin', env.DB.raw.prepare('SELECT role FROM users WHERE id = ?').get(plebId).role === 'admin');
  await U({ role: 'user' });

  // Password reset and logout-all
  const reset = await acall('POST', `/api/admin/users/${plebId}/password-reset`, { cookie: bossCookie, body: {} });
  check('password reset returns a temporary password', reset.status === 200 && /^[a-z]+-[a-z]+-[a-z]+-\d{3}$/.test(reset.data.password));
  check('old password no longer works', (await acall('POST', '/api/auth/login', { body: { email: 'pleb@example.com', password: 'correct horse battery' }, ip: '7.7.7.4' })).status === 401);
  const withTemp = await acall('POST', '/api/auth/login', { body: { email: 'pleb@example.com', password: reset.data.password }, ip: '7.7.7.4' });
  check('temporary password works', withTemp.status === 200);
  await acall('POST', `/api/admin/users/${plebId}/logout-all`, { cookie: bossCookie, body: {} });
  check('logout-all ends sessions', (await acall('GET', '/api/me', { cookie: cookieOf(withTemp) })).status === 401);

  // Detail view
  const det = await acall('GET', `/api/admin/users/${plebId}`, { cookie: bossCookie });
  check('user detail with log', det.status === 200 && det.data.user.email === 'pleb@example.com' && det.data.log.length >= 5);

  // Test accounts
  const ta = await acall('POST', '/api/admin/test-accounts', { cookie: bossCookie, body: { accountDays: 3, premiumDays: 3, note: 'Tester Max' } });
  check('test account created', ta.status === 200 && /@test\.hablena\.com$/.test(ta.data.user.email) && ta.data.user.password);
  const taLogin = await acall('POST', '/api/auth/login', { body: { email: ta.data.user.email, password: ta.data.user.password }, ip: '7.7.7.5' });
  check('test account can log in with premium', taLogin.status === 200 && (await acall('GET', '/api/me', { cookie: cookieOf(taLogin) })).data.user.premium.active === true);
  check('test filter', (await acall('GET', '/api/admin/users?filter=test', { cookie: bossCookie })).data.users.length === 1);
  const taNamed = await acall('POST', '/api/admin/test-accounts', { cookie: bossCookie, body: { email: 'pleb@example.com', accountDays: 1 } });
  check('test account: taken email rejected', taNamed.status === 409);

  // Codes
  const cc = await acall('POST', '/api/admin/codes', { cookie: bossCookie, body: { count: 2, days: 30, maxUses: 1, note: 'Messe' } });
  check('codes created', cc.status === 200 && cc.data.codes.length === 2 && /^HABLA-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cc.data.codes[0]));
  const plebLogin = await acall('POST', '/api/auth/login', { body: { email: 'pleb@example.com', password: reset.data.password }, ip: '7.7.7.6' });
  const pc = cookieOf(plebLogin);
  const red = await acall('POST', '/api/me/redeem', { cookie: pc, body: { code: cc.data.codes[0].toLowerCase() } });
  check('code redeemed (case-insensitive)', red.status === 200 && red.data.premium.active === true);
  check('code used up', (await acall('POST', '/api/me/redeem', { cookie: cookieOf(taLogin), body: { code: cc.data.codes[0] } })).data.error === 'code_used');
  check('code cannot be redeemed twice', (await acall('POST', '/api/me/redeem', { cookie: pc, body: { code: cc.data.codes[0] } })).status === 400);
  await acall('POST', `/api/admin/codes/${cc.data.codes[1]}/disable`, { cookie: bossCookie, body: {} });
  check('disabled code refused', (await acall('POST', '/api/me/redeem', { cookie: pc, body: { code: cc.data.codes[1] } })).data.error === 'code_invalid');
  const life = await acall('POST', '/api/admin/codes', { cookie: bossCookie, body: { count: 1, lifetime: true, maxUses: 5 } });
  await acall('POST', '/api/me/redeem', { cookie: pc, body: { code: life.data.codes[0] } });
  check('lifetime code', (await acall('GET', '/api/me', { cookie: pc })).data.user.premium.lifetime === true);
  check('codes list', (await acall('GET', '/api/admin/codes', { cookie: bossCookie })).data.codes.length === 3);
  check('bad code format', (await acall('POST', '/api/me/redeem', { cookie: pc, body: { code: '<x>' } })).status === 400);

  // Paywall (settings)
  {
    const guest = await acall('GET', '/api/access');
    check('access: public, paywall off by default', guest.status === 200 && guest.data.paywall === false && guest.data.loggedIn === false && guest.data.freeUnits === 1);
    const freeSignup = await acall('POST', '/api/auth/signup', { body: { email: 'free@example.com', password: 'correct horse battery' }, ip: '7.7.7.9' });
    const fc = cookieOf(freeSignup);
    const S = (body, cookie = bossCookie) => acall('POST', '/api/admin/settings', { cookie, body });
    check('settings: normal user forbidden', (await S({ paywall: true }, fc)).status === 403);
    check('settings: invalid value rejected', (await S({ freeUnits: 0 })).status === 400);
    const set = await S({ paywall: true, freeUnits: 1, freePracticePerDay: 1 });
    check('settings: saved', set.status === 200 && set.data.settings.paywall === true && set.data.settings.freePracticePerDay === 1);
    check('settings: readable with free-user count', (await acall('GET', '/api/admin/settings', { cookie: bossCookie })).data.freeUsers >= 1);
    const today = new Date().toISOString().slice(0, 10);
    const save = (cookie, lessonId, extra = {}) => acall('POST', '/api/progress', { cookie, body: { lessonId, correct: 5, total: 6, today, ...extra } });
    check('paywall: free unit allowed', (await save(fc, 'u1-l1')).status === 200);
    const locked = await save(fc, 'u2-l1');
    check('paywall: premium unit locked', locked.status === 402 && locked.data.error === 'premium_required');
    check('paywall: premium story locked', (await save(fc, 'u2-s1')).status === 402);
    check('paywall: premium unit test locked', (await save(fc, 'practice', { unit: 'u3' })).status === 402);
    check('paywall: first practice allowed', (await save(fc, 'practice')).status === 200);
    const limit = await save(fc, 'practice');
    check('paywall: daily practice limit', limit.status === 402 && limit.data.error === 'practice_limit');
    const acc = await acall('GET', `/api/access?today=${today}`, { cookie: fc });
    check('access: logged-in view', acc.data.paywall === true && acc.data.premium === false && acc.data.practiceToday === 1 && acc.data.loggedIn === true);
    check('me: access block', (await acall('GET', '/api/me', { cookie: fc })).data.access.paywall === true);
    check('paywall: admins are never limited', (await save(bossCookie, 'u4-l1')).status === 200);
    const freeId = env.DB.raw.prepare("SELECT id FROM users WHERE email = 'free@example.com'").get().id;
    await acall('POST', `/api/admin/users/${freeId}/premium`, { cookie: bossCookie, body: { mode: 'days', days: 1 } });
    check('paywall: premium unlocks units', (await save(fc, 'u2-l1')).status === 200);
    check('paywall: premium practises without limit', (await save(fc, 'practice')).status === 200);
    check('access: premium flag', (await acall('GET', '/api/access', { cookie: fc })).data.premium === true);
    await S({ paywall: false });
    check('paywall off: everything open again', (await save(cookieOf(await acall('POST', '/api/auth/login', { body: { email: 'free@example.com', password: 'correct horse battery' }, ip: '7.7.7.9' })), 'u5-l1')).status === 200);
  }

  // Log and deletion
  const lg = await acall('GET', '/api/admin/log', { cookie: bossCookie });
  check('audit log', lg.status === 200 && lg.data.entries.some((e) => e.action === 'premium_granted') && lg.data.entries.some((e) => e.action === 'code_redeemed'));
  check('delete needs confirmation', (await acall('POST', `/api/admin/users/${plebId}/delete`, { cookie: bossCookie, body: { confirm: 'nope' } })).status === 400);
  check('admin cannot delete self', (await acall('POST', `/api/admin/users/${bossId}/delete`, { cookie: bossCookie, body: { confirm: 'boss@example.com' } })).status === 400);
  const del = await acall('POST', `/api/admin/users/${plebId}/delete`, { cookie: bossCookie, body: { confirm: 'pleb@example.com' } });
  check('admin deletes user', del.status === 200 && !env.DB.raw.prepare('SELECT 1 FROM users WHERE id = ?').get(plebId));
  check('unknown admin route', (await acall('GET', '/api/admin/nope', { cookie: bossCookie })).status === 404);
}

// Account settings: name, password, email
{
  const su = await call('POST', '/api/auth/signup', { body: { email: 'settings@example.com', password: 'correct horse battery' }, ip: '9.9.9.1' });
  const other = await call('POST', '/api/auth/login', { body: { email: 'settings@example.com', password: 'correct horse battery' }, ip: '9.9.9.1' });
  check('profile: name saved', (await call('POST', '/api/me/profile', { cookie: su.cookie, body: { name: '  Carla  ' } })).data.name === 'Carla'
    && (await call('GET', '/api/me', { cookie: su.cookie })).data.user.name === 'Carla');
  check('password: wrong current refused', (await call('POST', '/api/me/password', { cookie: su.cookie, body: { current: 'nope', next: 'new password 123' } })).data.error === 'wrong_password');
  check('password: too short refused', (await call('POST', '/api/me/password', { cookie: su.cookie, body: { current: 'correct horse battery', next: 'short' } })).data.error === 'weak_password');
  const pw = await call('POST', '/api/me/password', { cookie: su.cookie, body: { current: 'correct horse battery', next: 'new password 123' } });
  check('password: changed, fresh session', pw.status === 200 && pw.cookie && (await call('GET', '/api/me', { cookie: pw.cookie })).status === 200);
  check('password: other devices logged out', (await call('GET', '/api/me', { cookie: other.cookie })).status === 401);
  check('password: new one works', (await call('POST', '/api/auth/login', { body: { email: 'settings@example.com', password: 'new password 123' }, ip: '9.9.9.2' })).status === 200);
  check('email: needs password', (await call('POST', '/api/me/email', { cookie: pw.cookie, body: { email: 'carla@example.com', password: 'wrong' } })).status === 401);
  check('email: invalid refused', (await call('POST', '/api/me/email', { cookie: pw.cookie, body: { email: 'nope', password: 'new password 123' } })).data.error === 'invalid_email');
  check('email: taken refused', (await call('POST', '/api/me/email', { cookie: pw.cookie, body: { email: 'nico@example.com', password: 'new password 123' } })).status === 409);
  const em = await call('POST', '/api/me/email', { cookie: pw.cookie, body: { email: 'Carla@Example.com', password: 'new password 123' } });
  check('email: changed', em.status === 200 && (await call('GET', '/api/me', { cookie: pw.cookie })).data.user.email === 'carla@example.com');
  check('email: log in with new address', (await call('POST', '/api/auth/login', { body: { email: 'carla@example.com', password: 'new password 123' }, ip: '9.9.9.3' })).status === 200);
  let limited = false;
  for (let i = 0; i < 12 && !limited; i++) limited = (await call('POST', '/api/me/password', { cookie: pw.cookie, body: { current: 'guess' + i, next: 'whatever 12345' } })).status === 429;
  check('password: guessing is rate limited', limited);
}

// Paddle webhook
{
  const secret = 'pdl_ntfset_test_secret';
  const penv = { ...env, PADDLE_WEBHOOK_SECRET: secret, ADMIN_EMAILS: 'boss@example.com' };
  const sign = async (body, ts = Math.floor(Date.now() / 1000)) => {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ts}:${body}`)));
    return `ts=${ts};h1=${[...mac].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
  };
  const hook = async (event, sig) => {
    const body = JSON.stringify(event);
    const res = await worker.fetch(new Request(ORIGIN + '/api/paddle/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Paddle-Signature': sig ?? await sign(body) }, body }), penv);
    return { status: res.status, data: await res.json() };
  };
  const su = await call('POST', '/api/auth/signup', { body: { email: 'buyer@example.com', password: 'correct horse battery' }, ip: '8.8.8.1' });
  const uid = env.DB.raw.prepare("SELECT id FROM users WHERE email = 'buyer@example.com'").get().id;
  const end = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const ev = (type, status, extra = {}) => ({ event_type: type, occurred_at: new Date().toISOString(), data: { id: 'sub_01test', customer_id: 'ctm_01test', status, custom_data: { userId: uid }, billing_cycle: { interval: 'month', frequency: 1 }, current_billing_period: { starts_at: new Date().toISOString(), ends_at: end }, ...extra } });
  check('paddle: unsigned webhook refused', (await hook(ev('subscription.created', 'active'), 'ts=1;h1=00')).status === 401);
  const old = Math.floor(Date.now() / 1000) - 3600;
  check('paddle: old signature refused', (await hook(ev('subscription.created', 'active'), await sign(JSON.stringify(ev('subscription.created', 'active')), old))).status === 401);
  check('paddle: webhook needs no Origin header', (await hook(ev('subscription.created', 'active'))).status === 200);
  const row = () => env.DB.raw.prepare('SELECT * FROM users WHERE id = ?').get(uid);
  check('paddle: premium until period end', row().premium_source === 'paddle' && row().premium_until > Date.parse(end) && row().paddle_plan === 'monthly' && row().paddle_customer_id === 'ctm_01test');
  const me1 = await call('GET', '/api/me', { cookie: su.cookie });
  check('paddle: me shows subscription', me1.data.subscription?.status === 'active' && me1.data.subscription.manage === true && me1.data.user.premium.active === true);
  check('paddle: sandbox checkout only for admins', me1.data.checkout.allowed === false && me1.data.checkout.environment === 'sandbox');
  // a stale event (older than the last applied one) is ignored
  const stale = ev('subscription.past_due', 'canceled'); stale.occurred_at = '2000-01-01T00:00:00Z';
  check('paddle: stale event ignored', (await hook(stale)).data.ignored === 'stale' && row().paddle_status === 'active');
  await hook(ev('subscription.canceled', 'canceled'));
  check('paddle: cancellation ends premium', row().premium_until <= Date.now() && row().paddle_status === 'canceled');
  check('paddle: other events ignored', (await hook({ event_type: 'transaction.completed', data: {} })).data.ignored === true);
  // lifetime granted by an admin is never touched
  env.DB.raw.prepare("UPDATE users SET premium_until = 253402214400000, premium_source = 'admin' WHERE id = ?").run(uid);
  await hook(ev('subscription.updated', 'canceled'));
  check('paddle: lifetime untouched', row().premium_until === 253402214400000);
  check('paddle: portal without key', (await call('POST', '/api/me/billing-portal', { cookie: su.cookie, body: {} })).status === 503);
  check('paddle: unknown user ignored', (await hook({ event_type: 'subscription.created', occurred_at: new Date().toISOString(), data: { id: 'sub_x', status: 'active', custom_data: {} } })).data.ignored === 'unknown_user');
}

// Account deletion
check('delete needs password', (await call('POST', '/api/me/delete', { cookie: li.cookie, body: { password: 'nope' } })).status === 401);
const del = await call('POST', '/api/me/delete', { cookie: li.cookie, body: { password: 'correct horse battery' } });
check('delete 200', del.status === 200);
check('user removed', !env.DB.raw.prepare("SELECT 1 FROM users WHERE email = 'nico@example.com'").get());
check('progress removed', !env.DB.raw.prepare('SELECT 1 FROM progress p LEFT JOIN users u ON u.id = p.user_id WHERE u.id IS NULL').get());
check('activity removed', !env.DB.raw.prepare('SELECT 1 FROM activity a LEFT JOIN users u ON u.id = a.user_id WHERE u.id IS NULL').get());
check('word stats removed', !env.DB.raw.prepare("SELECT 1 FROM word_stats WHERE word = 'hola'").get());
check('sessions removed', !env.DB.raw.prepare('SELECT 1 FROM sessions s LEFT JOIN users u ON u.id = s.user_id WHERE u.id IS NULL').get());

check('unknown route → 404', (await call('GET', '/api/nothing')).status === 404);

// Audio
{
  const text = 'buenos días';
  const h = (c) => c.repeat(24);
  const manifest = {
    version: 2,
    models: { elevenlabs: 'eleven_multilingual_v2' },
    azureRegion: 'westeurope',
    voices: { voice123: 'Hablena', voice456: 'Lucía' },
    clips: {
      [h('a')]: [text, 'elevenlabs', 'voice123'],
      [h('c')]: ['hola', 'elevenlabs', 'voice456'],
      [h('d')]: ['adiós', 'azure', 'es-ES-ElviraNeural'],
      [h('e')]: ['gracias', 'google', 'es-ES-Chirp3-HD-Aoede'],
    },
  };
  const manifestEnv = (extra) => ({
    ...env,
    ASSETS: { fetch: async (req) => (new URL(req.url).pathname === '/audio/manifest.json' ? Response.json(manifest) : new Response('static')) },
    ...extra,
  });
  const get = async (e, hash = h('a')) => worker.fetch(new Request(`${ORIGIN}/api/audio/${hash}.mp3`), e);
  env.DB.raw.exec('DELETE FROM audio_cache');
  check('audio: not configured → 503', (await get(manifestEnv({}))).status === 503);
  check('audio: unknown hash → 404', (await get(manifestEnv({ TTS_API_KEY: 'k' }), h('b'))).status === 404);
  check('audio: malformed hash → 404', (await worker.fetch(new Request(`${ORIGIN}/api/audio/not-a-hash.mp3`), env)).status === 404);

  const realFetch = globalThis.fetch;
  let calls = 0;
  let sent = [];
  const mp3 = () => new Response(new Uint8Array([73, 68, 51, 4]), { headers: { 'Content-Type': 'audio/mpeg' } });
  globalThis.fetch = async (url, init) => { calls++; sent.push({ url: String(url), init }); return String(url).includes('googleapis') ? Response.json({ audioContent: btoa('ID3x') }) : mp3(); };
  try {
    const e = manifestEnv({ TTS_API_KEY: 'secret' });
    const r1 = await get(e);
    const bytes = new Uint8Array(await r1.arrayBuffer());
    check('audio: generated', r1.status === 200 && r1.headers.get('Content-Type') === 'audio/mpeg' && bytes[0] === 73);
    check('audio: immutable caching', /immutable/.test(r1.headers.get('Cache-Control') || ''));
    const body = JSON.parse(sent[0].init.body);
    check('audio: ElevenLabs request uses the clip voice', sent[0].url.includes('api.elevenlabs.io') && sent[0].url.includes('voice123') && sent[0].init.headers['xi-api-key'] === 'secret' && body.text === text && body.model_id === 'eleven_multilingual_v2');
    const r2 = await get(e);
    check('audio: second request served from DB', r2.status === 200 && calls === 1 && new Uint8Array(await r2.arrayBuffer())[0] === 73);
    check('audio: azure clip without key → 503', (await get(e, h('d'))).status === 503);

    // Status + cron warm-up
    const st = await (await worker.fetch(new Request(`${ORIGIN}/api/audio/status`), e)).json();
    check('audio status: counts', st.voices.Hablena.ready === 1 && st.voices['Lucía'].total === 1 && st.total === 4 && st.ready === 1 && st.providers.elevenlabs.total === 2 && st.providers.azure.configured === false);
    env.DB.raw.prepare('INSERT INTO audio_cache (hash, provider, voice, data, created_at) VALUES (?, ?, ?, ?, ?)').run(h('f'), 'elevenlabs', 'old', new Uint8Array([1]), 1);
    sent = [];
    const all = manifestEnv({ TTS_API_KEY: 'secret', AZURE_TTS_KEY: 'akey', GOOGLE_TTS_KEY: 'gkey' });
    const warm = await warmAudio(all);
    check('warm: generated all missing clips', warm.made === 3 && warm.ready === 4 && warm.total === 4);
    check('warm: removed clip no longer in the course', warm.removed === 1 && !env.DB.raw.prepare('SELECT 1 FROM audio_cache WHERE hash = ?').get(h('f')));
    const az = sent.find((x) => x.url.includes('tts.speech.microsoft.com'));
    check('warm: Azure request', !!az && az.url.startsWith('https://westeurope.') && az.init.headers['Ocp-Apim-Subscription-Key'] === 'akey' && az.init.body.includes('es-ES-ElviraNeural') && az.init.body.includes('adiós'));
    const gg = sent.find((x) => x.url.includes('googleapis'));
    check('warm: Google request', !!gg && gg.url.includes('key=gkey') && JSON.parse(gg.init.body).voice.languageCode === 'es-ES');
    const again = await warmAudio(all);
    check('warm: nothing left to do', again.made === 0 && again.ready === 4);
    const st2 = await (await worker.fetch(new Request(`${ORIGIN}/api/audio/status`), all)).json();
    check('audio status: done', st2.done === true);

    // Monthly budget: generation stops before the limit; placeholder clips are skipped by the cron
    env.DB.raw.exec('DELETE FROM audio_cache');
    manifest.clips[h('9')] = ['texto de prueba', 'elevenlabs', 'voice123', 1];
    const tight = manifestEnv({ TTS_API_KEY: 'secret', AZURE_TTS_KEY: 'akey', GOOGLE_TTS_KEY: 'gkey', TTS_MONTHLY_CHAR_LIMIT: '20' });
    const wb = await warmAudio(tight);
    check('budget: warm-up stops at the monthly limit', wb.made === 3 && wb.error?.budget === true);
    check('budget: on-demand request refused when over budget', (await get(tight, h('e'))).status === 503);
    const big = manifestEnv({ TTS_API_KEY: 'secret', AZURE_TTS_KEY: 'akey', GOOGLE_TTS_KEY: 'gkey' });
    const wc = await warmAudio(big);
    check('placeholder clips are not pre-generated', !env.DB.raw.prepare('SELECT 1 FROM audio_cache WHERE hash = ?').get(h('9')) && wc.made === 1);
    check('placeholder clip is generated on demand', (await get(big, h('9'))).status === 200);
    delete manifest.clips[h('9')];

    // Errors: reported per request, and the warm-up stops early on a bad key
    env.DB.raw.exec('DELETE FROM audio_cache');
    calls = 0;
    globalThis.fetch = async () => { calls++; return Response.json({ detail: { status: 'invalid_api_key', message: 'Invalid API key' } }, { status: 401 }); };
    const bad = await get(e);
    const badBody = await bad.json();
    check('audio: provider error is reported', bad.status === 502 && badBody.status === 401 && badBody.detail.includes('invalid_api_key'));
    calls = 0;
    const w2 = await warmAudio(all);
    check('warm: stops after an auth error', calls === 1 && w2.made === 0 && w2.error.status === 401);

    // Cron entry point
    const waited = [];
    globalThis.fetch = async (url) => (String(url).includes('googleapis') ? Response.json({ audioContent: btoa('ID3x') }) : mp3());
    env.DB.raw.prepare("INSERT INTO admin_log (at, action) VALUES (?, 'old_entry'), (?, 'new_entry')").run(Date.now() - 400 * 86_400_000, Date.now());
    await worker.scheduled({}, all, { waitUntil: (p) => { waited.push(p); } });
    await Promise.all(waited);
    check('cron: scheduled handler warms audio', env.DB.raw.prepare('SELECT COUNT(*) AS n FROM audio_cache').get().n >= 3);
    check('cron: prunes admin log after 12 months', !env.DB.raw.prepare("SELECT 1 FROM admin_log WHERE action = 'old_entry'").get() && !!env.DB.raw.prepare("SELECT 1 FROM admin_log WHERE action = 'new_entry'").get());
  } finally {
    globalThis.fetch = realFetch;
  }
}

console.log(`${checks - failures}/${checks} worker checks passed`);
if (failures) process.exit(1);
