// Hablena static site builder — zero dependencies.
// Renders src/pages/*.html and the generated tool pages for every locale into dist/.
//
// Template syntax:
//   {{> name}}                 include src/partials/name.html
//   {{t.some.key}}             translation value (may contain inline HTML)
//   {{#each t.list}}…{{/each}} repeat for each item; use {{this}} or {{this.key}}
//   {{lang}} {{base}} {{path}} {{canonical}} {{altHref}} {{altLabel}} {{altLang}} {{year}}
//   {{pageTitle}} {{pageDescription}} {{hero}} {{content}}

import { readFile, writeFile, mkdir, readdir, cp, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { conjugatorPages } from './conjugator/pages.mjs';
import { grammarPages } from './grammar/pages.mjs';
import { legalPages } from './legal/pages.mjs';
import { accountPages } from './account/pages.mjs';
import { lessonPages } from './course/pages.mjs';
import { guidePages } from './course/guide-pages.mjs';
import { vocabPages } from './vocab/pages.mjs';
import { storyPages } from './course/story-pages.mjs';
import { wordsPage } from './account/words-page.mjs';
import { audioManifest } from './course/audio.mjs';
import { UNITS, ALL_LESSONS } from './course/units.mjs';
import { CHARACTERS } from './course/characters.mjs';
import { demoData, introAudio, INTRODUCTIONS } from './course/demo.mjs';

// Real course numbers for the marketing pages, so they never drift from the content.
const COURSE = {
  units: UNITS.length,
  lessons: ALL_LESSONS.length,
  words: new Set(ALL_LESSONS.flatMap((l) => l.vocab.map((v) => v.es))).size,
  types: new Set(ALL_LESSONS.flatMap((l) => l.exercises.filter((e) => e.t !== 'intro').map((e) => e.t))).size,
};

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src');
const DIST = join(root, 'dist');
const SITE = 'https://hablena.com';

// First locale is the default and lives at the site root; others live under /<lang>/.
const LOCALES = ['en', 'de'];
const DEFAULT = LOCALES[0];
const prefix = (lang) => (lang === DEFAULT ? '/' : `/${lang}/`);

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

async function loadDir(dir) {
  const out = {};
  for (const f of await readdir(dir)) {
    if (f.endsWith('.html')) out[f.replace(/\.html$/, '')] = await readFile(join(dir, f), 'utf8');
  }
  return out;
}

function includePartials(html, partials, depth = 0) {
  if (depth > 5) throw new Error('Partial include depth exceeded');
  const next = html.replace(/{{>\s*([\w-]+)\s*}}/g, (_, name) => {
    if (!(name in partials)) throw new Error(`Unknown partial: ${name}`);
    return partials[name];
  });
  return next === html ? next : includePartials(next, partials, depth + 1);
}

function render(html, ctx, file) {
  html = html.replace(/{{#each\s+([\w.]+)\s*}}([\s\S]*?){{\/each}}/g, (_, path, body) => {
    const list = get(ctx, path);
    if (!Array.isArray(list)) throw new Error(`${file}: "${path}" is not a list`);
    return list
      .map((item) =>
        body.replace(/{{\s*this(?:\.([\w.]+))?\s*}}/g, (m, key) => {
          const v = key ? get(item, key) : item;
          if (v === undefined) throw new Error(`${file}: missing "${key}" in ${path}`);
          return String(v);
        })
      )
      .join('');
  });
  return html.replace(/{{\s*([\w.]+)\s*}}/g, (m, path) => {
    const v = get(ctx, path);
    if (v === undefined) throw new Error(`${file}: missing value for "${path}" (${ctx.lang})`);
    return String(v);
  });
}

const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// paths: { [lang]: path } for every locale of the same page
function makeCtx(dict, lang, paths, extra = {}) {
  const other = LOCALES.find((l) => l !== lang);
  const t = dict[lang];
  return {
    t,
    lang,
    base: prefix(lang),
    path: paths[lang],
    canonical: SITE + paths[lang],
    altLang: other,
    altHref: paths[other],
    altLabel: other.toUpperCase(),
    hreflang:
      LOCALES.map((l) => `<link rel="alternate" hreflang="${l}" href="${SITE}${paths[l]}">`).join('\n') +
      `\n<link rel="alternate" hreflang="x-default" href="${SITE}${paths[DEFAULT]}">`,
    year: new Date().getFullYear(),
    pageTitle: escAttr(extra.title ?? t.meta.title),
    pageDescription: escAttr(extra.description ?? t.meta.description),
    hero: extra.hero ?? '',
    robots: extra.noindex ? '<meta name="robots" content="noindex">' : '',
    content: extra.content ?? '',
    course: COURSE,
    cast: CHARACTERS,
    ...(extra.vars || {}),
  };
}

// Homepage: the live demo (three questions in three voices) and the character introductions.
function homeVars(t, lang) {
  const data = { ...demoData(lang), strings: t.home.demo, faces: CHARACTERS };
  const intro = Object.fromEntries(Object.keys(INTRODUCTIONS).map((r) => {
    const a = introAudio(r);
    return [r, { text: escAttr(a.text), src: a.src }];
  }));
  return { demoJson: JSON.stringify(data).replace(/</g, '\\u003c'), intro };
}

async function writePage(path, html) {
  const outDir = join(DIST, ...path.split('/').filter(Boolean));
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'index.html'), html);
}

async function build() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  await cp(join(root, 'public'), DIST, { recursive: true });
  await cp(join(SRC, 'assets'), join(DIST, 'assets'), { recursive: true });

  const partials = await loadDir(join(SRC, 'partials'));
  const templates = await loadDir(join(SRC, 'templates'));
  const dict = {};
  for (const l of LOCALES) {
    dict[l] = JSON.parse(await readFile(join(SRC, 'i18n', `${l}.json`), 'utf8'));
    dict[l].lang = l;
  }
  const sitemap = [];

  // 1) Hand-written pages (same slug in every locale)
  const pages = await loadDir(join(SRC, 'pages'));
  for (const [page, raw] of Object.entries(pages)) {
    const tpl = includePartials(raw, partials);
    const paths = Object.fromEntries(LOCALES.map((l) => [l, page === 'index' ? prefix(l) : `${prefix(l)}${page}/`]));
    for (const lang of LOCALES) {
      const extra = page === 'index' ? { vars: homeVars(dict[lang], lang) } : {};
      const html = render(tpl, makeCtx(dict, lang, paths, extra), `${page}.html`);
      if (page === '404') {
        if (lang === DEFAULT) await writeFile(join(DIST, '404.html'), html);
        continue;
      }
      await writePage(paths[lang], html);
      sitemap.push(SITE + paths[lang]);
    }
  }

  // 2) Generated tool pages (localized slugs)
  const compiled = Object.fromEntries(Object.entries(templates).map(([name, raw]) => [name, includePartials(raw, partials)]));
  const urls = {
    home: (l) => prefix(l),
    index: (l) => `${prefix(l)}${dict[l].conj.slug}/`,
    verb: (l, slug) => `${prefix(l)}${dict[l].conj.slug}/${slug}/`,
    grammarIndex: (l) => `${prefix(l)}${dict[l].gram.slug}/`,
    grammar: (l, slug) => `${prefix(l)}${dict[l].gram.slug}/${slug}/`,
    imprint: (l) => `${prefix(l)}${dict[l].legal.imprint.slug}/`,
    privacy: (l) => `${prefix(l)}${dict[l].legal.privacy.slug}/`,
    signup: (l) => `${prefix(l)}${dict[l].auth.signupSlug}/`,
    login: (l) => `${prefix(l)}${dict[l].auth.loginSlug}/`,
    app: (l) => `${prefix(l)}app/`,
    lesson: (l, id) => `${prefix(l)}app/learn/${id}/`,
    guide: (l, id) => `${prefix(l)}app/guide/${id}/`,
    story: (l, id) => `${prefix(l)}app/story/${id}/`,
    words: (l) => `${prefix(l)}app/words/`,
    practice: (l) => `${prefix(l)}app/practice/`,
    vocabIndex: (l) => `${prefix(l)}${dict[l].vocab.slug}/`,
    vocab: (l, slug) => `${prefix(l)}${dict[l].vocab.slug}/${slug}/`,
  };
  const site = JSON.parse(await readFile(join(SRC, 'config', 'site.json'), 'utf8'));
  let generated = 0;
  for (const lang of LOCALES) {
    const other = LOCALES.find((l) => l !== lang);
    for (const p of [...conjugatorPages(dict[lang], urls, other), ...grammarPages(dict[lang], urls, other), ...legalPages(dict[lang], urls, other, site), ...accountPages(dict[lang], urls, other, site), ...lessonPages(dict[lang], urls, other), ...guidePages(dict[lang], urls, other), ...vocabPages(dict[lang], urls, other), ...storyPages(dict[lang], urls, other), wordsPage(dict[lang], urls, other)]) {
      const tpl = compiled[p.template || 'tool'];
      if (!tpl) throw new Error(`Unknown template "${p.template}" for ${p.path}`);
      const html = render(tpl, makeCtx(dict, lang, { [lang]: p.path, [other]: p.alt }, p), `${p.template || 'tool'}.html`);
      await writePage(p.path, html);
      if (!p.noindex) sitemap.push(SITE + p.path);
      generated++;
    }
  }

  await mkdir(join(DIST, 'audio'), { recursive: true });
  const manifest = audioManifest();
  await writeFile(join(DIST, 'audio', 'manifest.json'), JSON.stringify(manifest));

  await writeFile(
    join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap
      .map((u) => `  <url><loc>${u}</loc></url>`)
      .join('\n')}\n</urlset>\n`
  );

  console.log(`Built ${Object.keys(pages).length * LOCALES.length + generated} pages (${sitemap.length} in sitemap) for ${LOCALES.join(', ')} → dist/`);
}

build().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
