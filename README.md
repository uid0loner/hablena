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

## Legal pages

Imprint (`/imprint/`, `/de/impressum/`) and privacy policy (`/privacy/`, `/de/datenschutz/`) are generated
from `scripts/legal/pages.mjs`; owner details and contact email live in `src/config/site.json`.
The privacy policy describes exactly what the site does today (Cloudflare hosting, no cookies,
no tracking, self-hosted fonts). Update it whenever accounts, payments or new services are added.

## Accounts (Worker API)

`worker/index.js` serves `/api/*` (everything else comes from `dist/`):

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/signup` | create account, start session |
| `POST /api/auth/login` | log in |
| `POST /api/auth/logout` | end session |
| `GET /api/me` | current user |
| `POST /api/me/delete` | delete account (password required) |
| `GET /api/progress` | lesson progress of the current user |
| `POST /api/progress` | save a lesson result |

Security: PBKDF2-SHA256 password hashes (100k iterations), random session tokens stored only as
SHA-256 hashes, `__Host-` HttpOnly/Secure/SameSite=Lax cookie, Origin + JSON checks against CSRF,
rate limits on login (per email and IP) and sign-up (per IP).

Database: Cloudflare D1, schema in `migrations/`. Without a `DB` binding the API answers 503 and the
static site keeps working.

Setup once:
1. Cloudflare dashboard → **Storage & Databases → D1** → create `hablena` (location: **EU jurisdiction**)
2. Add the binding to `wrangler.jsonc` (see the comment there) with the database ID
3. Set the Cloudflare deploy command to `npx wrangler d1 migrations apply hablena --remote && npx wrangler deploy`

## Course

`scripts/course/units.mjs` holds units, lessons, vocabulary and exercises (intro, choice, reverse,
listen, match, gap, build). Each lesson becomes a player page at `/app/learn/<id>/` (EN) and
`/de/app/learn/<id>/` (DE); the player is `src/assets/js/player.js`. Audio uses the browser's
Spanish text-to-speech. Results are saved via `POST /api/progress` (best score kept).
`scripts/course/test.mjs` validates all content (indices, translations, every word introduced before it is tested).

## Local development

```bash
npm test           # conjugation engine + Worker API tests
npm run build      # builds dist/
npm run dev        # builds and runs site + API locally (SQLite) on http://localhost:4321
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
