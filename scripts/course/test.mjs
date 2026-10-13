// Validates course content so a typo can never break a lesson. Run as part of npm test.
import { UNITS, ALL_LESSONS } from './units.mjs';
import { VOICE_CONFIG, CAST, MAIN, withSpeakers } from './voices.mjs';
import { CHARACTERS } from './characters.mjs';
import { lessonAudioMap } from './audio.mjs';
import { STORIES } from './stories.mjs';

let failures = 0;
let checks = 0;
const check = (name, cond) => { checks++; if (!cond) { failures++; console.error('✗ ' + name); } };
const strip = (s) => s.replace(/[¡!¿?.,;:]/g, '').split(/\s+/).filter(Boolean);
const ids = new Set();

for (const lesson of ALL_LESSONS) {
  const id = lesson.id;
  check(`${id}: unique id`, !ids.has(id)); ids.add(id);
  check(`${id}: id format`, /^u\d{1,3}-l\d{1,3}$/.test(id));
  for (const l of ['en', 'de']) {
    check(`${id}: title ${l}`, !!lesson.title[l]);
    check(`${id}: goal ${l}`, !!lesson.goal[l]);
    lesson.vocab.forEach((v, i) => check(`${id}: vocab ${i} ${l}`, !!v.es && !!v[l]));
  }
  const introduced = new Set();
  lesson.exercises.forEach((e, n) => {
    const at = `${id} #${n + 1} (${e.t})`;
    const refs = Array.isArray(e.v) ? e.v : e.v === undefined ? [] : [e.v];
    refs.forEach((i) => check(`${at}: vocab ${i} exists`, i >= 0 && i < lesson.vocab.length));
    if (e.t === 'intro') refs.forEach((i) => introduced.add(i));
    else refs.forEach((i) => check(`${at}: vocab ${i} introduced before use`, introduced.has(i)));
    if (e.t === 'match') {
      check(`${at}: four pairs`, refs.length === 4);
      for (const l of ['en', 'de']) check(`${at}: distinct ${l} translations`, new Set(refs.map((i) => lesson.vocab[i][l])).size === refs.length);
    }
    if (['choice', 'reverse', 'listen'].includes(e.t)) check(`${at}: enough distractors`, lesson.vocab.length >= 4);
    if (e.t === 'gap') {
      check(`${at}: one blank`, e.es.split('___').length === 2);
      check(`${at}: answer among options`, e.options.includes(e.answer));
      check(`${at}: translations`, !!e.tr?.en && !!e.tr?.de);
    }
    if (e.t === 'type') {
      if (e.v === undefined) {
        check(`${at}: sentence + translations`, !!e.es && !!e.tr?.en && !!e.tr?.de);
      }
      check(`${at}: alternatives are strings`, (e.alt || []).every((x) => typeof x === 'string' && x));
    }
    if (e.t === 'dialogue') {
      check(`${at}: line`, !!e.line?.es && !!e.line?.tr?.en && !!e.line?.tr?.de);
      check(`${at}: 3+ distinct options`, Array.isArray(e.options) && e.options.length >= 3 && new Set(e.options).size === e.options.length);
      check(`${at}: answer among options`, e.options.includes(e.answer));
    }
    if (e.t === 'build') {
      check(`${at}: translations`, !!e.tr?.en && !!e.tr?.de);
      check(`${at}: 2+ words`, strip(e.es).length >= 2);
      check(`${at}: extra word not in sentence`, (e.extra || []).every((x) => !strip(e.es).map((w) => w.toLowerCase()).includes(x.toLowerCase())));
    }
  });
  check(`${id}: has scored exercises`, lesson.exercises.some((e) => e.t !== 'intro'));
}
check('at least one unit', UNITS.length > 0);

// Voices: every role is configured, characters have a portrait, every spoken text has a clip
for (const role of [MAIN, ...CAST]) {
  const v = VOICE_CONFIG.voices[role];
  check(`voice ${role}: configured`, !!v && ['elevenlabs', 'azure', 'google'].includes(v.provider) && typeof v.id === 'string');
  if (role !== MAIN) check(`voice ${role}: portrait`, typeof CHARACTERS[role] === 'string' && CHARACTERS[role].startsWith('<svg'));
}
check('main voice has an id', !!VOICE_CONFIG.voices[MAIN].id);
ALL_LESSONS.forEach((lesson, li) => {
  const map = lessonAudioMap(lesson, li);
  const ex = withSpeakers(lesson, li);
  const used = new Set(ex.filter((e) => e.t !== 'intro').map((e) => e.s));
  check(`${lesson.id}: intros spoken by Hablena`, ex.filter((e) => e.t === 'intro').every((e) => e.s === MAIN));
  check(`${lesson.id}: at least 3 different character voices`, used.size >= Math.min(3, ex.filter((e) => e.t !== 'intro').length));
  for (const e of ex) {
    const refs = Array.isArray(e.v) ? e.v : e.v === undefined ? [] : [e.v];
    for (const i of refs) check(`${lesson.id} ${e.t}: clip for "${lesson.vocab[i].es}" (${e.s})`, !!map[e.s]?.[lesson.vocab[i].es]);
    if (e.t === 'build') check(`${lesson.id} build: sentence clip`, !!map[e.s]?.[e.es]);
  }
});
// Stories
const storyIds = new Set();
for (const st of STORIES) {
  check(`${st.id}: unique`, !storyIds.has(st.id)); storyIds.add(st.id);
  check(`${st.id}: id format`, /^u\d{1,3}-s\d{1,3}$/.test(st.id) && st.id.startsWith(st.unit + '-'));
  check(`${st.id}: unit exists`, UNITS.some((u) => u.id === st.unit));
  for (const l of ['en', 'de']) check(`${st.id}: title/scene ${l}`, !!st.title[l] && !!st.scene[l]);
  const qs = st.steps.filter((x) => x.t === 'question');
  check(`${st.id}: 2+ questions`, qs.length >= 2);
  check(`${st.id}: starts with a line`, st.steps[0].t === 'line');
  for (const x of st.steps) {
    if (x.t === 'line') {
      check(`${st.id}: speaker ${x.s} known`, x.s in VOICE_CONFIG.voices);
      check(`${st.id}: line text`, !!x.es && !!x.tr.en && !!x.tr.de);
    } else {
      for (const l of ['en', 'de']) {
        check(`${st.id}: question ${l}`, !!x.prompt[l]);
        check(`${st.id}: 3 distinct options ${l}`, x.options.length >= 3 && new Set(x.options.map((o) => o[l])).size === x.options.length);
      }
    }
  }
}

console.log(`${checks - failures}/${checks} course checks passed`);
if (failures) process.exit(1);
