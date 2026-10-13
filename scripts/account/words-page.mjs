// The word vault: every word from finished lessons with a strength meter (spaced review).
import { ALL_LESSONS } from '../course/units.mjs';
import { clipHash } from '../course/audio-hash.mjs';
import { voiceOf, MAIN } from '../course/voices.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const safeJson = (data) => JSON.stringify(data).replace(/</g, '\\u003c');

export function wordsPage(t, urls, otherLang) {
  const lang = t.lang;
  const v = t.vault;
  const voice = voiceOf(MAIN);
  const seen = new Set();
  const words = [];
  for (const l of ALL_LESSONS) for (const w of l.vocab) {
    if (seen.has(w.es)) continue;
    seen.add(w.es);
    words.push({ es: w.es, tr: w[lang], lesson: l.id, src: `/api/audio/${clipHash(voice, w.es)}.mp3` });
  }
  return {
    noindex: true,
    template: 'app',
    path: urls.words(lang),
    alt: urls.words(otherLang),
    title: `${v.title} | Hablena`,
    description: v.lead,
    vars: { appUrl: urls.app(lang), wordsUrl: urls.words(lang), learnActive: '', wordsActive: ' is-active' },
    content: `
<div class="vault" data-vault data-login="${urls.login(lang)}" data-levels="${esc(JSON.stringify(v.levels))}">
  <header class="vault__head">
    <h1>${esc(v.title)}</h1>
    <p>${esc(v.lead)}</p>
    <dl class="vault__stats">
      <div><dd data-v-known>0</dd><dt>${esc(v.known)}</dt></div>
      <div class="is-strong"><dd data-v-strong>0</dd><dt>${esc(v.strong)}</dt></div>
      <div class="is-weak"><dd data-v-weak>0</dd><dt>${esc(v.weak)}</dt></div>
    </dl>
    <a class="lp-cta lp-cta--red vault__practice" href="${urls.practice(lang)}?focus=weak" data-v-practice hidden>${esc(v.practiceWeak)}</a>
  </header>
  <div class="vault__tools">
    <div class="vault__tabs" role="group">
      <button type="button" class="is-active" data-v-filter="all" aria-pressed="true">${esc(v.all)}</button>
      <button type="button" data-v-filter="weak" aria-pressed="false">${esc(v.filterWeak)}</button>
      <button type="button" data-v-filter="strong" aria-pressed="false">${esc(v.filterStrong)}</button>
    </div>
    <input class="vault__search" type="search" placeholder="${esc(v.search)}" aria-label="${esc(v.search)}" data-v-search>
  </div>
  <ul class="vault__list" data-v-list aria-live="polite"></ul>
  <p class="vault__empty" data-v-empty hidden>${esc(v.empty)}</p>
  <p class="vault__empty" data-v-nomatch hidden>${esc(v.noMatch)}</p>
  <script type="application/json" id="vault-data">${safeJson(words)}</script>
</div>`,
  };
}
