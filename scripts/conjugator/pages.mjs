// Generates the conjugator pages (index + one page per verb) for one locale.
import { conjugate, irregularMap, PERSONS, IMPERATIVE_PERSONS } from './engine.mjs';
import { VERBS, slugOf } from './verbs.mjs';

const TENSE_ORDER = ['presente', 'indefinido', 'imperfecto', 'perfecto', 'futuro', 'condicional', 'subjuntivo', 'subjuntivoImperfecto', 'imperativo'];
const GROUPS = ['irregular', 'stem', 'regular'];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fill = (tpl, vars) => tpl.replace(/{(\w+)}/g, (_, k) => vars[k] ?? '');
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function typeOf(def, irr) {
  if (def.sc && !def.yo && !def.strong && !def.pres) return 'stem';
  return irr.any ? 'irregular' : 'regular';
}

// Pre-compute once for all locales.
const DATA = VERBS.map((def) => {
  const conj = conjugate(def);
  const irr = irregularMap(def);
  return { def, conj, irr, slug: slugOf(def.inf), type: typeOf(def, irr) };
});

const searchForm = (t, indexUrl, big = false) => `
<form class="verb-search${big ? ' verb-search--big' : ''}" action="${indexUrl}" method="get" role="search">
  <label class="sr-only" for="verb-q">${esc(t.conj.searchLabel)}</label>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
  <input id="verb-q" name="q" type="search" autocomplete="off" spellcheck="false" lang="es" placeholder="${esc(t.conj.search)}" data-verb-filter>
</form>`;

function tenseCard(t, key, forms, marks) {
  const meta = t.conj.tenses[key];
  const persons = key === 'imperativo' ? IMPERATIVE_PERSONS : PERSONS;
  const rows = forms
    .map((f, i) => {
      const value = f === null ? '—' : esc(f);
      const cls = marks[i] ? ' class="form form--irr"' : ' class="form"';
      return `<tr><th scope="row">${persons[i]}</th><td${cls}>${value}</td></tr>`;
    })
    .join('');
  return `
<section class="tense" aria-labelledby="t-${key}">
  <header class="tense__head">
    <h2 id="t-${key}">${esc(meta.name)}</h2>
    <span class="tense__es" lang="es">${esc(meta.es)}</span>
  </header>
  <p class="tense__use">${esc(meta.use)}</p>
  <table class="tense__table" lang="es"><tbody>${rows}</tbody></table>
</section>`;
}

function verbCard(t, d, base) {
  const tr = d.def[t.lang] ?? d.def.en;
  return `<li class="verb-card" data-verb="${esc(fold(d.def.inf + ' ' + tr))}">
  <a href="${base}${d.slug}/"><span class="verb-card__inf" lang="es">${esc(d.def.inf)}</span><span class="verb-card__tr">${esc(tr)}</span></a>
</li>`;
}

/**
 * @param {object} t   translations for this locale (t.lang must be set)
 * @param {object} urls { index(lang), verb(lang, slug) }
 * @returns {Array<{path, alt, title, description, content}>}
 */
export function conjugatorPages(t, urls, otherLang) {
  const lang = t.lang;
  const indexUrl = urls.index(lang);
  const pages = [];

  // ---- index ----
  const groups = GROUPS.map((g) => {
    const items = DATA.filter((d) => d.type === g).sort((a, b) => a.def.inf.localeCompare(b.def.inf, 'es'));
    return `
<section class="verb-group" data-verb-group aria-labelledby="g-${g}">
  <h2 class="verb-group__title" id="g-${g}">${esc(t.conj.groups[g])} <span>${items.length}</span></h2>
  <ul class="verb-list">${items.map((d) => verbCard(t, d, indexUrl)).join('')}</ul>
</section>`;
  }).join('');

  pages.push({
    path: indexUrl,
    alt: urls.index(otherLang),
    title: t.conj.indexMetaTitle,
    description: fill(t.conj.indexMetaDesc, { count: DATA.length }),
    hero: `
<nav class="breadcrumb" aria-label="Breadcrumb"><a href="${urls.home(lang)}">Hablena</a><span aria-hidden="true">/</span><span>${esc(t.conj.breadcrumb)}</span></nav>
<h1 class="display display--l">${esc(t.conj.indexTitle)}</h1>
<p class="hero__lead" style="margin:20px 0 32px">${esc(fill(t.conj.indexLead, { count: DATA.length }))}</p>
${searchForm(t, indexUrl, true)}`,
    content: `
<div class="container conj-index">
  ${groups}
  <p class="verb-empty" data-verb-empty hidden>${esc(t.conj.noResults)}</p>
</div>`,
  });

  // ---- one page per verb ----
  for (const d of DATA) {
    const { def, conj, irr } = d;
    const tr = def[lang] ?? def.en;
    const cards = TENSE_ORDER.map((k) => tenseCard(t, k, conj.tenses[k], irr.marks[k])).join('');
    const related = DATA.filter((x) => x !== d && x.type === d.type).slice(0, 12);

    pages.push({
      path: urls.verb(lang, d.slug),
      alt: urls.verb(otherLang, d.slug),
      title: fill(t.conj.verbMetaTitle, { verb: def.inf }),
      description: fill(t.conj.verbMetaDesc, { verb: def.inf, translation: tr }),
      hero: `
<nav class="breadcrumb" aria-label="Breadcrumb"><a href="${urls.home(lang)}">Hablena</a><span aria-hidden="true">/</span><a href="${indexUrl}">${esc(t.conj.breadcrumb)}</a><span aria-hidden="true">/</span><span lang="es">${esc(def.inf)}</span></nav>
<div class="verb-hero">
  <div>
    <h1 class="verb-title" lang="es">${esc(def.inf)}</h1>
    <p class="verb-tr">${esc(tr)}</p>
    <div class="verb-meta">
      <span class="tag tag--${d.type}">${esc(t.conj.types[d.type])}</span>
      <span class="verb-meta__item"><span>${esc(t.conj.gerund)}</span> <strong lang="es"${irr.gerund ? ' class="is-irr"' : ''}>${esc(conj.gerund)}</strong></span>
      <span class="verb-meta__item"><span>${esc(t.conj.participle)}</span> <strong lang="es"${irr.participle ? ' class="is-irr"' : ''}>${esc(conj.participle)}</strong></span>
    </div>
  </div>
  ${searchForm(t, indexUrl)}
</div>`,
      content: `
<div class="container conj-verb">
  <p class="legend"><span class="legend__swatch" aria-hidden="true"></span>${esc(t.conj.legend)}</p>
  <div class="tense-grid">${cards}</div>
</div>
<section class="section section--navy conj-cta" aria-labelledby="cta-practise">
  <div class="container conj-cta__inner">
    <div>
      <h2 class="display display--l" id="cta-practise">${esc(t.conj.ctaTitle)}</h2>
      <p class="lead" style="margin-top:16px">${esc(fill(t.conj.ctaText, { verb: def.inf }))}</p>
    </div>
    <a class="btn btn--gold btn--lg" href="${urls.signup(lang)}">${esc(t.conj.ctaButton)}</a>
  </div>
</section>
<section class="container conj-related" aria-labelledby="more-verbs">
  <div class="conj-related__head">
    <h2 id="more-verbs">${esc(t.conj.more)}</h2>
    <a href="${indexUrl}">${esc(t.conj.all)} →</a>
  </div>
  <ul class="verb-list">${related.map((x) => verbCard(t, x, indexUrl)).join('')}</ul>
</section>`,
    });
  }

  return pages;
}

export const VERB_COUNT = DATA.length;
