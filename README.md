# Hablena

**Speak Spanish. For real.** The complete Spanish course with an AI tutor you actually talk to.

This repository holds the Hablena website. Right now it is a fast, static, bilingual
site (English and German) served by a Cloudflare Worker. The app (accounts, lessons,
Hablena conversations, subscriptions) will be added on top of it step by step.

## Stack

- **Zero-dependency build** (`scripts/build.mjs`): plain HTML templates + JSON translations → `dist/`
- **Cloudflare Workers** with static assets (`wrangler.jsonc`)
- **Self-hosted fonts** (Archivo, Geist; SIL Open Font License) — no requests to Google, GDPR-friendly
- No tracking, no cookies

## Structure

```
src/
  pages/        one HTML template per page (index, 404)
  partials/     shared pieces: head, header, footer
  i18n/         en.json, de.json — every visible text lives here
  assets/       css/main.css (design tokens + styles), js/main.js
public/         copied as-is: fonts, favicon, robots.txt, _headers
scripts/        build.mjs
```

English lives at `/`, German at `/de/`. Adding a language = add `src/i18n/<lang>.json`
and the code to `LOCALES` in `scripts/build.mjs`.

Template syntax: `{{t.key}}` for translations, `{{> partial}}` for includes,
`{{#each t.list}}…{{this}}…{{/each}}` for lists. A missing key fails the build.

## Conjugator

`/conjugation/` (EN) and `/de/konjugation/` (DE): one static page per verb, generated at build time.

- `scripts/conjugator/engine.mjs` derives every form by rule (endings, spelling changes, stem changes)
- `scripts/conjugator/verbs.mjs` lists the verbs, with only their irregularities written down
- `scripts/conjugator/test.mjs` checks the engine against reference conjugations: `npm test`

Irregular forms are detected automatically (compared with the regular pattern) and shown in red.
To add a verb, add one line to `verbs.mjs`, add a reference check to `test.mjs`, run `npm test`.

## Grammar guides

`/grammar/` (EN) and `/de/grammatik/` (DE). Content lives in `scripts/grammar/topics.mjs`:
Spanish examples are shared, explanations and translations exist per language.
Each guide has rules, examples, common mistakes, an interactive quiz and links to the conjugator.

## Local development

```bash
npm test           # checks the conjugation engine
npm run build      # builds dist/
npm run dev        # builds and serves on http://localhost:4321
```

## Deploy (Cloudflare)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository** → `uid0loner/hablena`
2. Build command: `npm run build`
3. Deploy command: `npx wrangler deploy`
4. After buying the domain: Worker → **Settings** → **Domains & Routes** → add `hablena.com` and `www.hablena.com`

Every push to `main` deploys automatically.

## Brand

| Token | Value | Use |
| --- | --- | --- |
| Red | `#C8102E` | primary, hero, premium |
| Gold | `#FFC400` | accents, main buttons |
| Navy | `#0A1633` | text, dark sections |
| Surface | `#F4F5F8` | light sections, cards |

Display type: Archivo (expanded, 900, uppercase). Body: Geist.
