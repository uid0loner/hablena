// One story page per unit and locale, played by the lesson player in story mode.
import { STORIES, storyCast } from './stories.mjs';
import { UNITS } from './units.mjs';
import { storyAudioMap } from './audio.mjs';
import { VOICE_CONFIG } from './voices.mjs';
import { CHARACTERS } from './characters.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const safeJson = (data) => JSON.stringify(data).replace(/</g, '\\u003c');
const shuffle = (a) => a; // options are shuffled in the browser

export function storyPages(t, urls, otherLang) {
  const lang = t.lang;
  return STORIES.map((st) => {
    const unit = UNITS.find((u) => u.id === st.unit);
    const cast = storyCast(st);
    const data = {
      id: st.id,
      mode: 'story',
      title: st.title[lang],
      scene: st.scene[lang],
      cast: cast.filter((r) => r !== 'hablena'),
      exercises: st.steps.map((x) => (x.t === 'line'
        ? { t: 'line', s: x.s, es: x.es, tr: x.tr[lang] }
        : { t: 'question', s: 'hablena', prompt: x.prompt[lang], options: shuffle(x.options.map((o) => o[lang])), answer: x.options[0][lang] })),
      vocab: [],
      audio: storyAudioMap(st),
      speakers: Object.fromEntries(cast.map((r) => [r, { name: VOICE_CONFIG.voices[r].name, kind: VOICE_CONFIG.voices[r].kind, svg: CHARACTERS[r] || null }])),
    };
    return {
      noindex: true,
      template: 'player',
      path: urls.story(lang, st.id),
      alt: urls.story(otherLang, st.id),
      title: `${st.title[lang]} | Hablena`,
      description: st.scene[lang],
      vars: {
        appUrl: urls.app(lang),
        loginUrl: urls.login(lang),
        lessonId: st.id,
        lessonTitle: esc(st.title[lang]),
        lessonGoal: esc(st.scene[lang]),
        vocabCount: 0,
        lessonJson: safeJson(data),
        stringsJson: safeJson(t.learn),
        nextButton: '',
        courseButtonClass: 'lp-cta--green',
        unitDoneText: '',
      },
    };
  });
}
