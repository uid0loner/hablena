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

## Local development

```bash
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
