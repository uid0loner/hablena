// Public vocabulary pages (indexed): one page per course unit with every word, its translation and
// a listen button (Hablena's voice), plus a call to action to learn the unit. Good for search traffic.
import { UNITS } from '../course/units.mjs';
import { clipHash } from '../course/audio-hash.mjs';
import { voiceOf, MAIN } from '../course/voices.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fill = (tpl, vars) => tpl.replace(/{(\w+)}/g, (_, k) => vars[k] ?? '');
export const slugify = (s) => s.toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[’'“”„"?!.,]/g, '').replace(/&/g, 'und').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';

export function vocabPages(t, urls, otherLang) {
  const lang = t.lang;
  const v = t.vocab;
  const voice = voiceOf(MAIN);
  const indexUrl = urls.vocabIndex(lang);
  const count = (u) => new Set(u.lessons.flatMap((l) => l.vocab.map((w) => w.es))).size;
  const pages = [];

  pages.push({
    path: indexUrl,
    alt: urls.vocabIndex(otherLang),
    title: v.indexMetaTitle,
    description: v.indexMetaDesc,
    hero: `
<nav class="breadcrumb" aria-label="Breadcrumb"><a href="${urls.home(lang)}">Hablena</a><span aria-hidden="true">/</span><span>${esc(v.breadcrumb)}</span></nav>
<h1 class="display display--l">${esc(v.indexTitle)}</h1>
<p class="hero__lead" style="margin:20px 0 0">${esc(v.indexLead)}</p>`,
    content: `
<div class="container gindex">
  <ul class="gcards">${UNITS.map((u) => `<li class="gcard">
    <a href="${urls.vocab(lang, slugify(u.title[lang]))}">
      <span class="gcard__level">${u.level}</span>
      <span class="gcard__title">${esc(u.title[lang])}</span>
      <span class="gcard__sub">${esc(fill(v.cardSub, { n: count(u), topics: u.lessons.map((l) => l.title[lang]).join(' · ') }))}</span>
    </a>
  </li>`).join('')}</ul>
</div>`,
  });

  UNITS.forEach((u, ui) => {
    const title = u.title[lang];
    const others = UNITS.filter((x) => x !== u).slice(0, 6);
    pages.push({
      path: urls.vocab(lang, slugify(title)),
      alt: urls.vocab(otherLang, slugify(u.title[otherLang])),
      title: fill(v.unitMetaTitle, { title }),
      description: fill(v.unitMetaDesc, { title, n: count(u), topics: u.lessons.map((l) => l.title[lang]).join(', ') }),
      hero: `
<nav class="breadcrumb" aria-label="Breadcrumb"><a href="${urls.home(lang)}">Hablena</a><span aria-hidden="true">/</span><a href="${indexUrl}">${esc(v.breadcrumb)}</a><span aria-hidden="true">/</span><span>${esc(title)}</span></nav>
<span class="tag tag--irregular">${esc(t.gram.level)} ${u.level}</span>
<h1 class="display display--l" style="margin-top:20px">${esc(fill(v.unitTitle, { title }))}</h1>
<p class="verb-tr">${esc(fill(v.unitLead, { n: count(u) }))}</p>`,
      content: `
<div class="container vpage">
  <div class="vpage__main">
    ${u.lessons.map((l, li) => `
    <section class="vsection" aria-labelledby="l-${l.id}">
      <div class="vsection__head"><span class="vsection__num">${ui + 1}.${li + 1}</span><h2 id="l-${l.id}">${esc(l.title[lang])}</h2></div>
      <p class="gsection__text">${esc(l.goal[lang])}</p>
      <ul class="vlist">${l.vocab.map((w) => `
        <li><button class="say-btn" type="button" data-say="${esc(w.es)}" data-src="/api/audio/${clipHash(voice, w.es)}.mp3" aria-label="${esc(t.learn.play)}: ${esc(w.es)}">${SPEAKER}</button><span class="vlist__es" lang="es">${esc(w.es)}</span><span class="vlist__tr">${esc(w[lang])}</span></li>`).join('')}
      </ul>
    </section>`).join('')}
  </div>
  <aside class="vpage__side">
    <div class="vcta">
      <p class="vcta__kicker">${esc(v.ctaKicker)}</p>
      <h2>${esc(fill(v.ctaTitle, { title }))}</h2>
      <p>${esc(v.ctaText)}</p>
      <a class="btn3d btn3d--gold" href="${urls.signup(lang)}">${esc(v.ctaButton)}</a>
    </div>
    <nav class="vmore" aria-labelledby="more-title">
      <h2 id="more-title">${esc(v.moreTitle)}</h2>
      <ul>${others.map((o) => `<li><a href="${urls.vocab(lang, slugify(o.title[lang]))}">${esc(o.title[lang])}</a></li>`).join('')}</ul>
    </nav>
  </aside>
</div>`,
    });
  });
  return pages;
}
