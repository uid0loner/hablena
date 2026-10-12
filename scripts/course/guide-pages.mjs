// One guide page per unit and locale: short rules with examples you can listen to (Hablena's voice).
import { UNITS } from './units.mjs';
import { GUIDES } from './guides.mjs';
import { clipHash } from './audio.mjs';
import { voiceOf, MAIN } from './voices.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';

export function guidePages(t, urls, otherLang) {
  const lang = t.lang;
  const ap = t.app;
  const voice = voiceOf(MAIN);
  return UNITS.filter((u) => GUIDES[u.id]).map((u) => {
    const ui = UNITS.indexOf(u);
    const tips = GUIDES[u.id];
    return {
      noindex: true,
      template: 'app',
      path: urls.guide(lang, u.id),
      alt: urls.guide(otherLang, u.id),
      title: `${ap.guide}: ${u.title[lang]} | Hablena`,
      description: ap.guideLead,
      vars: { appUrl: urls.app(lang) },
      content: `
<div class="guide">
  <a class="guide__back" href="${urls.app(lang)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>${esc(ap.backToCourse)}</a>
  <header class="punit punit--${ui % 5}"><div class="punit__banner">
    <div>
      <p class="punit__kicker">${esc(t.auth.unit)} ${ui + 1} · ${u.level} · ${esc(ap.guideKicker)}</p>
      <h1 class="guide__title">${esc(u.title[lang])}</h1>
    </div>
  </div></header>
  <p class="guide__lead">${esc(ap.guideLead)}</p>
  ${tips.map((tip, i) => `
  <section class="tip-card" aria-labelledby="tip-${i}">
    <span class="tip-card__num" aria-hidden="true">${i + 1}</span>
    <h2 id="tip-${i}">${esc(tip.title[lang])}</h2>
    <p>${esc(tip.text[lang])}</p>
    <ul class="tip-card__examples">${tip.examples.map((e) => `
      <li><button class="say-btn" type="button" data-say="${esc(e.es)}" data-src="/api/audio/${clipHash(voice, e.es)}.mp3" aria-label="${esc(t.learn.play)}: ${esc(e.es)}">${SPEAKER}</button><span class="tip-card__es" lang="es">${esc(e.es)}</span><span class="tip-card__tr">${esc(e[lang])}</span></li>`).join('')}
    </ul>
  </section>`).join('')}
  <a class="lp-cta lp-cta--green guide__start" href="${urls.lesson(lang, u.lessons[0].id)}">${esc(ap.startUnit)}</a>
</div>`,
    };
  });
}
