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
| `POST /api/me/redeem` | redeem a premium voucher code |
| `GET /api/access` | paywall rules, premium and today's practice count for the visitor |
| `/api/admin/*` | admin portal API (see below) |
| `GET /api/progress` | lesson progress of the current user |
| `POST /api/progress` | save a lesson result, returns XP and streak |
| `GET /api/stats?today=YYYY-MM-DD` | streak, total XP, today's XP and daily goal |

Security: PBKDF2-SHA256 password hashes (100k iterations), random session tokens stored only as
SHA-256 hashes, `__Host-` HttpOnly/Secure/SameSite=Lax cookie, Origin + JSON checks against CSRF,
rate limits on login (per email and IP) and sign-up (per IP).

Database: Cloudflare D1, schema in `migrations/`. Without a `DB` binding the API answers 503 and the
static site keeps working.

Setup once:
1. Cloudflare dashboard → **Storage & Databases → D1** → create `hablena` (location: **EU jurisdiction**)
2. Add the binding to `wrangler.jsonc` (see the comment there) with the database ID
3. Set the Cloudflare deploy command to `npx wrangler d1 migrations apply hablena --remote && npx wrangler deploy`

## Admin portal

`/admin/` (static page `src/admin/index.html`, script `src/assets/js/admin.js`, styles `src/assets/css/admin.css`,
German, noindex) manages accounts through `/api/admin/*` (`worker/admin.js`):

- **Übersicht**: users, new sign-ups, premium/lifetime, active learners, lessons and XP, a 30-day chart and the
  monthly voice budget.
- **Benutzer**: search (email, name, note), filters (premium, free, lifetime, test, blocked, expired, admins),
  sorting, paging and CSV export. Each user opens a panel to add premium (1 day, 1 week, 1 month, 1 year, custom
  days, until a date, lifetime) or revoke it, limit the account to a date, block/unblock, make admin, mark as
  test account, edit name and internal note, create a new password (shown once), log out everywhere and delete.
- **Testzugänge**: time-limited accounts with a generated password and optional premium; the credentials are
  shown once with a copy button. Expired accounts are logged out and cannot log in.
- **Gutscheincodes**: premium codes (days or lifetime, uses per code, redeemable until, prefix, note), copy/CSV,
  enable/disable. Users redeem them in "Dein Konto" (`POST /api/me/redeem`).
- **Protokoll**: every admin action and code redemption (kept 12 months).

Who is admin: everyone whose login email is listed in the Cloudflare variable `ADMIN_EMAILS`
(comma-separated, Worker → Settings → Variables and Secrets), plus users given the admin role in the portal.
Premium is stored as `users.premium_until` (lifetime = year 9999); `GET /api/me` returns `premium`, `admin`
and `expiresAt`.

- **Einstellungen**: the paywall (off by default) with the number of free units and free practice sessions
  per day, stored in the `settings` table. When it is on, learners without premium see a premium screen in
  lessons, stories and unit tests after the free units and after the daily practice limit; the Worker also
  refuses to save progress there (`402 premium_required` / `practice_limit`). Premium users and admins are never
  limited. `GET /api/access` (public) tells pages the current rules. The Premium page lives at `/app/premium/`
  (prices, Free vs Premium, voucher codes); its buy button says "soon" until payments (Paddle) are connected.
  Lesson content itself is part of the static pages, so the paywall is a product gate, not DRM.

## Course

`scripts/course/units.mjs` holds units, lessons, vocabulary and exercises (intro, choice, reverse,
listen, match, gap, build). Each lesson becomes a player page at `/app/learn/<id>/` (EN) and
`/de/app/learn/<id>/` (DE); the player is `src/assets/js/player.js` (template `src/templates/player.html`).
Results are saved via `POST /api/progress` (best score kept). Each lesson earns 5–15 XP
(`5 + round(10 · correct / total)`), stored per local day in `activity` for the daily goal (20 XP) and streak.

The app home (`/app/`, template `src/templates/app.html`, markup in `scripts/account/pages.mjs`) shows the
learning path: lessons unlock one after another, with streak, XP and daily goal from `/api/stats`.

Sound effects (`src/assets/js/sfx.js`) are synthesised with the Web Audio API, so there are no audio files
or licences. The mute setting is kept in `localStorage` (`hablena-sfx-muted`), which the privacy policy lists.

Voices: Hablena (the mascot) introduces new words; four characters take turns speaking the exercises:
Lucía (woman), Mateo (man), Sofía (girl) and Pablo (boy). Speakers and voice IDs live in
`src/config/voices.json` (provider `elevenlabs`, `azure` or `google` per voice; an empty ID falls back to the
Hablena voice). Portraits are in `scripts/course/characters.mjs`, the rotation in `scripts/course/voices.mjs`.

Audio: every clip (text + voice) the player can play is listed in `dist/audio/manifest.json` at build time.
`GET /api/audio/<hash>.mp3` serves it from D1 (or generates it once) and caches it at the edge. The hash covers
provider, model, voice and text, so changing a voice yields new clips automatically. A cron trigger
(every 5 minutes, see `wrangler.jsonc`) pre-generates missing clips in batches of 20 and removes unused ones;
`GET /api/audio/status` shows progress. Keys are Cloudflare secrets: `TTS_API_KEY` (ElevenLabs),
`AZURE_TTS_KEY` (+ optional `AZURE_TTS_REGION`), `GOOGLE_TTS_KEY`. Without audio the player falls back to the
browser voice (with a different pitch per character).
Exercise types: intro, choice, reverse, listen, match, gap, build, type (write the Spanish; accents via
on-screen keys, missing accents, articles and one-letter typos count as right with a hint) and dialogue
(a character speaks, the learner picks the reply). Unit guides live in `scripts/course/guides.mjs` and are
served at `/app/guide/<unit>/`; practice mode (`/app/practice/`) builds a mixed review in the browser from
finished lessons and earns XP without touching lesson progress. The landing page shows live course numbers
(units, lessons, words, exercise types) computed at build time.

`scripts/course/test.mjs` validates all content (indices, translations, every word introduced before it is tested).

## Local development

```bash
npm test           # conjugation engine + Worker API tests
npm run build      # builds dist/
npm run dev        # builds and runs site + API locally (SQLite) on http://localhost:4321
ADMIN_EMAILS=you@example.com npm run dev   # same, with that account as admin
```

## Deploy (Cloudflare)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository** → `uid0loner/hablena`
2. Build command: `npm run build`
3. Deploy command: `npx wrangler d1 migrations apply hablena --remote && npx wrangler deploy`
4. Custom domains `hablena.com` and `www.hablena.com` are declared in `wrangler.jsonc`; www redirects to the apex in the Worker

Every push to `main` deploys automatically.

## Brand

| Token | Value | Use |
| --- | --- | --- |
| Red | `#C8102E` | primary, hero, premium |
| Gold | `#FFC400` | accents, main buttons |
| Navy | `#0A1633` | text, dark sections |
| Surface | `#F4F5F8` | light sections, cards |

Display type: Archivo (expanded, 900, uppercase). Body: Geist.
