// Hablena static site builder — zero dependencies.
// Renders src/pages/*.html for every locale in src/i18n/*.json into dist/.
//
// Template syntax:
//   {{> name}}                 include src/partials/name.html
//   {{t.some.key}}             translation value (may contain inline HTML)
//   {{#each t.list}}…{{/each}} repeat for each item; use {{this}} or {{this.key}}
//   {{lang}} {{base}} {{path}} {{canonical}} {{altHref}} {{altLabel}} {{altLang}} {{year}}

import { readFile, writeFile, mkdir, readdir, cp, rm, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src');
const DIST = join(root, 'dist');
const SITE = 'https://hablena.com';

// First locale is the default and lives at the site root; others live under /<lang>/.
const LOCALES = ['en', 'de'];
const DEFAULT = LOCALES[0];

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

async function loadPartials() {
  const dir = join(SRC, 'partials');
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

const urlFor = (lang, page) => {
  const prefix = lang === DEFAULT ? '/' : `/${lang}/`;
  return page === 'index' ? prefix : `${prefix}${page}/`;
};

async function build() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  await cp(join(root, 'public'), DIST, { recursive: true });
  await cp(join(SRC, 'assets'), join(DIST, 'assets'), { recursive: true });

  const partials = await loadPartials();
  const dict = {};
  for (const l of LOCALES) dict[l] = JSON.parse(await readFile(join(SRC, 'i18n', `${l}.json`), 'utf8'));

  const pages = (await readdir(join(SRC, 'pages'))).filter((f) => f.endsWith('.html')).map((f) => f.replace(/\.html$/, ''));
  const sitemap = [];

  for (const page of pages) {
    const tpl = includePartials(await readFile(join(SRC, 'pages', `${page}.html`), 'utf8'), partials);
    for (const lang of LOCALES) {
      const other = LOCALES.find((l) => l !== lang);
      const path = urlFor(lang, page);
      const ctx = {
        t: dict[lang],
        lang,
        base: lang === DEFAULT ? '/' : `/${lang}/`,
        path,
        canonical: SITE + path,
        altLang: other,
        altHref: urlFor(other, page),
        altLabel: other.toUpperCase(),
        hreflang: LOCALES.map((l) => `<link rel="alternate" hreflang="${l}" href="${SITE}${urlFor(l, page)}">`).join('\n') +
          `\n<link rel="alternate" hreflang="x-default" href="${SITE}${urlFor(DEFAULT, page)}">`,
        year: new Date().getFullYear(),
      };
      const html = render(tpl, ctx, `${page}.html`);
      // 404 is served by Cloudflare from /404.html (default locale only).
      if (page === '404') {
        if (lang === DEFAULT) await writeFile(join(DIST, '404.html'), html);
        continue;
      }
      const outDir = join(DIST, ...path.split('/').filter(Boolean));
      await mkdir(outDir, { recursive: true });
      await writeFile(join(outDir, 'index.html'), html);
      sitemap.push(SITE + path);
    }
  }

  await writeFile(
    join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap
      .map((u) => `  <url><loc>${u}</loc></url>`)
      .join('\n')}\n</urlset>\n`
  );

  const size = (await stat(join(DIST, 'index.html'))).size;
  console.log(`Built ${sitemap.length} pages for ${LOCALES.join(', ')} → dist/ (home: ${size} bytes)`);
}

build().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
