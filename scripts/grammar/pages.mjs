// Generates the grammar guides (index + one page per topic) for one locale.
import { TOPICS } from './topics.mjs';
import { VERBS, slugOf } from '../conjugator/verbs.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fill = (tpl, vars) => tpl.replace(/{(\w+)}/g, (_, k) => vars[k] ?? '');
const KNOWN_VERBS = new Map(VERBS.map((v) => [v.inf, v]));

const exampleList = (items, lang) => `
<ul class="examples">${items
  .map((e) => `<li><span class="examples__es" lang="es">${esc(e.es)}</span><span class="examples__tr">${esc(e[lang])}</span></li>`)
  .join('')}</ul>`;

function section(s, lang, i) {
  const id = `s${i + 1}`;
  let body = '';
  if (s.type === 'pairs') {
    body = `<div class="pairs">${s.pairs
      .map((p) => `<div class="pairs__row">
  <div class="pairs__cell"><span class="examples__es" lang="es">${esc(p.a.es)}</span><span class="examples__tr">${esc(p.a[lang])}</span></div>
  <div class="pairs__cell pairs__cell--b"><span class="examples__es" lang="es">${esc(p.b.es)}</span><span class="examples__tr">${esc(p.b[lang])}</span></div>
</div>`)
      .join('')}</div>`;
  } else if (s.type === 'table') {
    const head = s.head[lang].map((h) => `<th scope="col">${esc(h)}</th>`).join('');
    const rows = s.rows.map((r) => `<tr>${r.map((c, j) => (j === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`).join('');
    body = `<div class="table-wrap"><table class="gtable" lang="es"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  } else if (s.type === 'signals') {
    const col = (c) => `<div class="signals__col"><h3>${esc(c.label[lang])}</h3><ul>${c.words.map((w) => `<li lang="es">${esc(w)}</li>`).join('')}</ul></div>`;
    body = `<div class="signals">${col(s.signals.a)}${col(s.signals.b)}</div>`;
  } else {
    body = exampleList(s.examples, lang);
  }
  return `
<section class="gsection" aria-labelledby="${id}">
  <h2 id="${id}">${esc(s.title[lang])}</h2>
  <p class="gsection__text">${esc(s.text[lang])}</p>
  ${body}
</section>`;
}

function quiz(t, topic, lang) {
  const items = topic.quiz
    .map((q, i) => {
      const sentence = esc(q.q).replace('___', '<span class="blank" data-blank>___</span>');
      const opts = q.options.map((o, j) => `<button type="button" class="quiz__opt" data-i="${j}" lang="es">${esc(o)}</button>`).join('');
      return `<li class="quiz__q" data-answer="${q.answer}">
  <p class="quiz__sentence" lang="es"><span class="quiz__num">${i + 1}</span>${sentence}</p>
  <div class="quiz__opts" role="group" aria-label="${esc(t.gram.chooseLabel)}">${opts}</div>
  <p class="quiz__why" data-why hidden><strong data-verdict></strong> ${esc(q.why[lang])}</p>
</li>`;
    })
    .join('');
  return `
<section class="quiz" data-quiz data-correct="${esc(t.gram.correct)}" data-wrong="${esc(t.gram.wrong)}" data-score="${esc(t.gram.score)}" aria-labelledby="quiz-title">
  <h2 id="quiz-title">${esc(t.gram.quizTitle)}</h2>
  <p class="gsection__text">${esc(t.gram.quizText)}</p>
  <ol class="quiz__list">${items}</ol>
  <p class="quiz__score" data-quiz-score aria-live="polite" hidden></p>
</section>`;
}

export function grammarPages(t, urls, otherLang) {
  const lang = t.lang;
  const indexUrl = urls.grammarIndex(lang);
  const pages = [];

  const card = (topic) => `<li class="gcard">
  <a href="${urls.grammar(lang, topic.slug[lang])}">
    <span class="gcard__level">${topic.level}</span>
    <span class="gcard__title">${esc(topic.title[lang])}</span>
    <span class="gcard__sub">${esc(topic.subtitle[lang])}</span>
  </a>
</li>`;

  // ---- index ----
  pages.push({
    path: indexUrl,
    alt: urls.grammarIndex(otherLang),
    title: t.gram.indexMetaTitle,
    description: t.gram.indexMetaDesc,
    hero: `
<nav class="breadcrumb" aria-label="Breadcrumb"><a href="${urls.home(lang)}">Hablena</a><span aria-hidden="true">/</span><span>${esc(t.gram.breadcrumb)}</span></nav>
<h1 class="display display--l">${esc(t.gram.indexTitle)}</h1>
<p class="hero__lead" style="margin:20px 0 0">${esc(t.gram.indexLead)}</p>`,
    content: `
<div class="container gindex">
  <ul class="gcards">${TOPICS.map(card).join('')}</ul>
</div>`,
  });

  // ---- one page per topic ----
  for (const topic of TOPICS) {
    const verbs = topic.verbs.filter((v) => KNOWN_VERBS.has(v));
    const verbLinks = verbs.length
      ? `<aside class="gverbs" aria-labelledby="verbs-title">
  <h2 id="verbs-title">${esc(t.gram.verbsTitle)}</h2>
  <ul class="verb-list">${verbs
    .map((inf) => {
      const v = KNOWN_VERBS.get(inf);
      return `<li class="verb-card"><a href="${urls.verb(lang, slugOf(inf))}"><span class="verb-card__inf" lang="es">${esc(inf)}</span><span class="verb-card__tr">${esc(v[lang] ?? v.en)}</span></a></li>`;
    })
    .join('')}</ul>
</aside>`
      : '';
    const mistakes = `
<section class="gsection" aria-labelledby="mistakes-title">
  <h2 id="mistakes-title">${esc(t.gram.mistakesTitle)}</h2>
  <ul class="mistakes">${topic.mistakes
    .map((m) => `<li class="mistake">
    <div class="mistake__pair">
      <span class="mistake__wrong" lang="es"><span class="sr-only">${esc(t.gram.wrongLabel)}: </span>${esc(m.wrong)}</span>
      <span class="mistake__right" lang="es"><span class="sr-only">${esc(t.gram.rightLabel)}: </span>${esc(m.right)}</span>
    </div>
    <p>${esc(m.why[lang])}</p>
  </li>`)
    .join('')}</ul>
</section>`;
    const others = TOPICS.filter((x) => x !== topic);

    pages.push({
      path: urls.grammar(lang, topic.slug[lang]),
      alt: urls.grammar(otherLang, topic.slug[otherLang]),
      title: fill(t.gram.topicMetaTitle, { title: topic.title[lang], subtitle: topic.subtitle[lang] }),
      description: topic.lead[lang],
      hero: `
<nav class="breadcrumb" aria-label="Breadcrumb"><a href="${urls.home(lang)}">Hablena</a><span aria-hidden="true">/</span><a href="${indexUrl}">${esc(t.gram.breadcrumb)}</a><span aria-hidden="true">/</span><span>${esc(topic.title[lang])}</span></nav>
<span class="tag tag--irregular">${esc(t.gram.level)} ${topic.level}</span>
<h1 class="display display--l" style="margin-top:20px">${esc(topic.title[lang])}</h1>
<p class="verb-tr">${esc(topic.subtitle[lang])}</p>`,
      content: `
<div class="container gtopic">
  <article class="gtopic__main">
    <p class="glead">${esc(topic.lead[lang])}</p>
    <div class="gtip"><span class="gtip__label">${esc(t.gram.tipLabel)}</span><p>${esc(topic.tip[lang])}</p></div>
    ${topic.sections.map((s, i) => section(s, lang, i)).join('')}
    ${mistakes}
    ${quiz(t, topic, lang)}
  </article>
  ${verbLinks}
</div>
<section class="section section--navy conj-cta" aria-labelledby="cta-practise">
  <div class="container conj-cta__inner">
    <div>
      <h2 class="display display--l" id="cta-practise">${esc(t.gram.ctaTitle)}</h2>
      <p class="lead" style="margin-top:16px">${esc(t.gram.ctaText)}</p>
    </div>
    <a class="btn btn--gold btn--lg" href="${urls.home(lang)}">${esc(t.gram.ctaButton)}</a>
  </div>
</section>
<section class="container conj-related" aria-labelledby="more-topics">
  <div class="conj-related__head">
    <h2 id="more-topics">${esc(t.gram.more)}</h2>
    <a href="${indexUrl}">${esc(t.gram.all)} →</a>
  </div>
  <ul class="gcards">${others.map(card).join('')}</ul>
</section>`,
    });
  }
  return pages;
}
