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
    let waited = null;
    globalThis.fetch = async (url) => (String(url).includes('googleapis') ? Response.json({ audioContent: btoa('ID3x') }) : mp3());
    await worker.scheduled({}, all, { waitUntil: (p) => { waited = p; } });
    await waited;
    check('cron: scheduled handler warms audio', env.DB.raw.prepare('SELECT COUNT(*) AS n FROM audio_cache').get().n >= 3);
  } finally {
    globalThis.fetch = realFetch;
  }
}

console.log(`${checks - failures}/${checks} worker checks passed`);
if (failures) process.exit(1);
