// Validates course content so a typo can never break a lesson. Run as part of npm test.
import { UNITS, ALL_LESSONS } from './units.mjs';

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
    if (e.t === 'build') {
      check(`${at}: translations`, !!e.tr?.en && !!e.tr?.de);
      check(`${at}: 2+ words`, strip(e.es).length >= 2);
      check(`${at}: extra word not in sentence`, (e.extra || []).every((x) => !strip(e.es).map((w) => w.toLowerCase()).includes(x.toLowerCase())));
    }
  });
  check(`${id}: has scored exercises`, lesson.exercises.some((e) => e.t !== 'intro'));
}
check('at least one unit', UNITS.length > 0);
console.log(`${checks - failures}/${checks} course checks passed`);
if (failures) process.exit(1);
