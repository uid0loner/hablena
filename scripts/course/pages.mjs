// One lesson-player page per lesson and locale (noindex, part of the app).
import { ALL_LESSONS } from './units.mjs';
import { lessonAudioMap, clipHash } from './audio.mjs';
import { VOICE_CONFIG, withSpeakers, voiceOf, MAIN } from './voices.mjs';
import { CHARACTERS } from './characters.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// JSON inside <script type="application/json">: only "<" needs neutralising.
const safeJson = (data) => JSON.stringify(data).replace(/</g, '\\u003c');

function localize(lesson, lang, index) {
  const exercises = withSpeakers(lesson, index);
  const roles = [...new Set(exercises.map((e) => e.s))];
  return {
    id: lesson.id,
    title: lesson.title[lang],
    vocab: lesson.vocab.map((v) => ({ es: v.es, tr: v[lang] })),
    exercises: exercises.map((e) => {
      const out = e.tr ? { ...e, tr: e.tr[lang] } : { ...e };
      if (e.line) out.line = { es: e.line.es, tr: e.line.tr[lang] };
      return out;
    }),
    audio: lessonAudioMap(lesson, index),
    speakers: Object.fromEntries(roles.map((r) => [r, { name: VOICE_CONFIG.voices[r].name, kind: VOICE_CONFIG.voices[r].kind, svg: CHARACTERS[r] || null }])),
  };
}

// Practice: a mixed review built in the browser from the lessons the learner has finished.
function practicePage(t, urls, otherLang) {
  const lang = t.lang;
  const main = voiceOf(MAIN);
  const pool = ALL_LESSONS.flatMap((l) => l.vocab.map((v) => ({ lesson: l.id, es: v.es, tr: v[lang] })));
  const data = {
    id: 'practice',
    mode: 'practice',
    title: t.app.practiceTitle,
    pool,
    exercises: [],
    audio: { [MAIN]: Object.fromEntries(pool.map((v) => [v.es, clipHash(main, v.es)])) },
    speakers: { [MAIN]: { name: VOICE_CONFIG.voices[MAIN].name, kind: 'mascot', svg: null } },
  };
  return {
    noindex: true,
    template: 'player',
    path: urls.practice(lang),
    alt: urls.practice(otherLang),
    title: `${t.app.practiceTitle} | Hablena`,
    description: t.app.practiceText,
    vars: {
      appUrl: urls.app(lang),
      loginUrl: urls.login(lang),
      lessonId: 'practice',
      lessonTitle: esc(t.app.practiceTitle),
      lessonGoal: esc(t.app.practiceText),
      nextButton: '',
      courseButtonClass: 'lp-cta--green',
      unitDoneText: '',
      vocabCount: pool.length,
      lessonJson: safeJson(data),
      stringsJson: safeJson(t.learn),
    },
  };
}

// "Next lesson" on the done screen; finishing a unit says so and points to the next unit.
function nextVars(t, urls, lang, index) {
  const lesson = ALL_LESSONS[index];
  const next = ALL_LESSONS[index + 1];
  const unitEnds = !next || next.unit.id !== lesson.unit.id;
  if (!next) return { nextButton: '', courseButtonClass: 'lp-cta--green', unitDoneText: esc(t.learn.unitDone.replace('{unit}', lesson.unit.title[lang])) };
  const label = unitEnds ? t.learn.nextUnit.replace('{unit}', next.unit.title[lang]) : t.learn.nextLesson;
  return {
    nextButton: `<a class="lp-cta lp-cta--green" href="${urls.lesson(lang, next.id)}" data-next>${esc(label)}</a>`,
    courseButtonClass: 'lp-cta--ghost',
    unitDoneText: unitEnds ? esc(t.learn.unitDone.replace('{unit}', lesson.unit.title[lang])) : '',
  };
}

export function lessonPages(t, urls, otherLang) {
  const lang = t.lang;
  return [practicePage(t, urls, otherLang), ...ALL_LESSONS.map((lesson, index) => ({
    noindex: true,
    template: 'player',
    path: urls.lesson(lang, lesson.id),
    alt: urls.lesson(otherLang, lesson.id),
    title: `${lesson.title[lang]} | Hablena`,
    description: lesson.goal[lang],
    vars: {
      appUrl: urls.app(lang),
      loginUrl: urls.login(lang),
      lessonId: lesson.id,
      lessonTitle: esc(lesson.title[lang]),
      lessonGoal: esc(lesson.goal[lang]),
      vocabCount: lesson.vocab.length,
      lessonJson: safeJson(localize(lesson, lang, index)),
      ...nextVars(t, urls, lang, index),
      stringsJson: safeJson(t.learn),
    },
  }))];
}
