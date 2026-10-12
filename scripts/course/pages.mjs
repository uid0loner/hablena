// One lesson-player page per lesson and locale (noindex, part of the app).
import { ALL_LESSONS } from './units.mjs';
import { lessonAudioMap } from './audio.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// JSON inside <script type="application/json">: only "<" needs neutralising.
const safeJson = (data) => JSON.stringify(data).replace(/</g, '\\u003c');

function localize(lesson, lang) {
  return {
    id: lesson.id,
    title: lesson.title[lang],
    vocab: lesson.vocab.map((v) => ({ es: v.es, tr: v[lang] })),
    exercises: lesson.exercises.map((e) => (e.tr ? { ...e, tr: e.tr[lang] } : e)),
    audio: lessonAudioMap(lesson),
  };
}

export function lessonPages(t, urls, otherLang) {
  const lang = t.lang;
  return ALL_LESSONS.map((lesson) => ({
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
      lessonJson: safeJson(localize(lesson, lang)),
      stringsJson: safeJson(t.learn),
    },
  }));
}
