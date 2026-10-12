// Sign-up, log-in and the logged-in app area. These pages are noindex and stay out of the sitemap.
import { readFileSync } from 'node:fs';
import { UNITS } from '../course/units.mjs';

const MASCOT = readFileSync(new URL('../../src/partials/mascot.html', import.meta.url), 'utf8').trim();

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const field = ({ id, label, type = 'text', autocomplete, required = true, hint, minlength, lang }) => `
<div class="field">
  <label for="${id}">${esc(label)}</label>
  <input id="${id}" name="${id}" type="${type}" autocomplete="${autocomplete}"${required ? ' required' : ''}${minlength ? ` minlength="${minlength}"` : ''}${lang ? ` lang="${lang}"` : ''}${hint ? ` aria-describedby="${id}-hint"` : ''}>
  ${hint ? `<p class="field__hint" id="${id}-hint">${esc(hint)}</p>` : ''}
</div>`;

export function accountPages(t, urls, otherLang, site) {
  const lang = t.lang;
  const a = t.auth;
  const messages = esc(JSON.stringify(a.errors));
  const common = { noindex: true };

  const signup = {
    ...common,
    path: urls.signup(lang),
    alt: urls.signup(otherLang),
    title: `${a.signupTitle} | Hablena`,
    description: a.signupLead,
    hero: `<h1 class="display display--l">${esc(a.signupTitle)}</h1><p class="hero__lead" style="margin:16px 0 0">${esc(a.signupLead)}</p>`,
    content: `
<div class="container auth">
  <form class="auth-card" data-auth-form="signup" data-redirect="${urls.app(lang)}" data-lang="${lang}" data-messages="${messages}" novalidate>
    ${field({ id: 'name', label: a.name, autocomplete: 'given-name', required: false })}
    ${field({ id: 'email', label: a.email, type: 'email', autocomplete: 'email' })}
    ${field({ id: 'password', label: a.password, type: 'password', autocomplete: 'new-password', minlength: 10, hint: a.passwordHint })}
    <p class="auth-error" role="alert" data-auth-error hidden></p>
    <button class="btn btn--red btn--lg btn--block" type="submit" data-label="${esc(a.signupButton)}" data-busy="${esc(a.busy)}">${esc(a.signupButton)}</button>
    <p class="auth-small">${a.privacyNote.replace('{link}', `<a href="${urls.privacy(lang)}">${esc(a.privacyLink)}</a>`)}</p>
  </form>
  <p class="auth-switch">${esc(a.haveAccount)} <a href="${urls.login(lang)}">${esc(a.loginLink)}</a></p>
</div>`,
  };

  const login = {
    ...common,
    path: urls.login(lang),
    alt: urls.login(otherLang),
    title: `${a.loginTitle} | Hablena`,
    description: a.loginLead,
    hero: `<h1 class="display display--l">${esc(a.loginTitle)}</h1><p class="hero__lead" style="margin:16px 0 0">${esc(a.loginLead)}</p>`,
    content: `
<div class="container auth">
  <form class="auth-card" data-auth-form="login" data-redirect="${urls.app(lang)}" data-lang="${lang}" data-messages="${messages}" novalidate>
    ${field({ id: 'email', label: a.email, type: 'email', autocomplete: 'email' })}
    ${field({ id: 'password', label: a.password, type: 'password', autocomplete: 'current-password' })}
    <p class="auth-error" role="alert" data-auth-error hidden></p>
    <button class="btn btn--red btn--lg btn--block" type="submit" data-label="${esc(a.loginButton)}" data-busy="${esc(a.busy)}">${esc(a.loginButton)}</button>
    <p class="auth-small">${esc(a.forgot)} <a href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>
  </form>
  <p class="auth-switch">${esc(a.noAccount)} <a href="${urls.signup(lang)}">${esc(a.signupLink)}</a></p>
</div>`,
  };

  // Zig-zag offsets for the learning path (in units of the node width).
  const OFFSETS = [0, -0.9, -1.4, -0.9, 0, 0.9, 1.4, 0.9];
  const ICONS = {
    star: '<svg class="node__icon node__icon--star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" fill="currentColor"/></svg>',
    check: '<svg class="node__icon node__icon--check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    lock: '<svg class="node__icon node__icon--lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v5a5 5 0 0 1-10 0zM7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3M12 13v4M8 21h8M9 17h6v4H9z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  };
  const total = UNITS.reduce((n, u) => n + u.lessons.length, 0);
  let n = 0;
  const ap = t.app;

  const unitHtml = (u, ui) => `
    <section class="punit punit--${ui % 3}" aria-labelledby="unit-${u.id}" data-unit="${u.id}">
      <header class="punit__banner">
        <div>
          <p class="punit__kicker">${esc(a.unit)} ${ui + 1} · ${u.level}</p>
          <h2 id="unit-${u.id}">${esc(u.title[lang])}</h2>
        </div>
        <span class="punit__count" data-unit-count>0/${u.lessons.length}</span>
      </header>
      <ol class="path">
        ${u.lessons.map((l, li) => {
          n++;
          const x = OFFSETS[li % OFFSETS.length];
          return `
        <li class="node is-locked" style="--x:${x}" data-node>
          <button class="node__btn" type="button" aria-expanded="false" aria-controls="pop-${l.id}" data-lesson="${l.id}">
            ${ICONS.star}${ICONS.check}${ICONS.lock}
            <span class="sr-only">${esc(l.title[lang])}</span>
          </button>
          <span class="node__start" aria-hidden="true">${esc(ap.startBubble)}</span>
          <div class="node__pop" id="pop-${l.id}" role="dialog" aria-label="${esc(l.title[lang])}" hidden>
            <p class="node__pop-kicker">${esc(ap.lessonOf.replace('{n}', n).replace('{total}', total))}</p>
            <h3>${esc(l.title[lang])}</h3>
            <p class="node__pop-goal">${esc(l.goal[lang])}</p>
            <p class="node__pop-score" data-score hidden></p>
            <a class="lp-cta node__go" href="${urls.lesson(lang, l.id)}" data-go>${esc(ap.start)}</a>
            <p class="node__pop-locked">${esc(ap.locked)}</p>
          </div>
        </li>`;
        }).join('')}
        <li class="node node--trophy" style="--x:0" aria-hidden="true"><span class="node__btn">${ICONS.trophy}</span></li>
      </ol>
      <div class="punit__mascot" aria-hidden="true" style="--side:${ui % 2 ? -1 : 1}">${MASCOT}</div>
    </section>`;

  const app = {
    ...common,
    template: 'app',
    path: urls.app(lang),
    alt: urls.app(otherLang),
    title: `${a.appTitle} | Hablena`,
    description: a.appTitle,
    vars: { appUrl: urls.app(lang) },
    content: `
<div class="learn" data-app data-login="${urls.login(lang)}" data-home="${urls.home(lang)}" data-messages="${messages}" data-score-label="${esc(ap.bestScore)}" data-review-label="${esc(ap.review)}" data-start-label="${esc(ap.start)}" data-goal-text="${esc(ap.goalText)}" data-goal-done="${esc(ap.goalDone)}" data-streak-hint="${esc(ap.streakHint)}" data-streak-active="${esc(ap.streakActive)}">
  <div class="learn__path">
    <h1 class="learn__hello" data-greeting data-template="${esc(a.greeting)}" data-fallback="${esc(a.greetingNoName)}">${esc(a.greetingNoName)}</h1>
    ${UNITS.map(unitHtml).join('')}
    <section class="soon">
      <p class="soon__kicker">${esc(a.courseLabel)}</p>
      <h2>${esc(a.courseTitle)}</h2>
      <p>${esc(a.courseText)}</p>
    </section>
  </div>

  <aside class="learn__side">
    <section class="side-card side-card--streak">
      <div class="side-card__big">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 1.5-5 3-6 0 2 1 3 2 3 0-3-1-6 1-9z" fill="#FF8A00"/><path d="M12 12c.5 2 3 3 3 6a3 3 0 0 1-6 0c0-1.6 1-2.7 2-3.2 0 1 .4 1.6 1 1.6 0-1.6-.6-3 0-4.4z" fill="#FFC400"/></svg>
        <div><strong data-stat-streak>0</strong><span>${esc(ap.streak)}</span></div>
      </div>
      <p data-streak-msg>${esc(ap.streakHint)}</p>
    </section>

    <section class="side-card">
      <div class="side-card__head"><h2>${esc(ap.dailyGoal)}</h2><span class="side-card__xp"><span data-stat-xptoday>0</span>/<span data-stat-goal>20</span> XP</span></div>
      <div class="goalbar" role="progressbar" aria-label="${esc(ap.dailyGoal)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-goalbar><span></span></div>
      <p data-goal-msg>${esc(ap.goalText.replace('{xp}', '0').replace('{goal}', '20'))}</p>
    </section>

    <section class="side-card">
      <h2>${esc(ap.more)}</h2>
      <a class="side-link" href="${urls.grammarIndex(lang)}"><span class="side-link__icon side-link__icon--blue" aria-hidden="true">Aa</span><span><strong>${esc(a.grammarTitle)}</strong><span>${esc(a.grammarText)}</span></span></a>
      <a class="side-link" href="${urls.index(lang)}"><span class="side-link__icon side-link__icon--green" aria-hidden="true">-ar</span><span><strong>${esc(a.conjTitle)}</strong><span>${esc(a.conjText)}</span></span></a>
    </section>

    <section class="side-card account" id="account" aria-labelledby="account-title">
      <h2 id="account-title">${esc(a.accountTitle)}</h2>
      <dl class="account__facts">
        <div><dt>${esc(a.email)}</dt><dd data-user-email>…</dd></div>
        <div><dt>${esc(a.memberSince)}</dt><dd data-user-since>…</dd></div>
        <div><dt>${esc(ap.xpTotal)}</dt><dd><span data-stat-xptotal>0</span> XP</dd></div>
      </dl>
      <button class="lp-cta lp-cta--ghost account__logout" type="button" data-logout>${esc(a.logout)}</button>
      <details class="danger">
        <summary>${esc(a.deleteTitle)}</summary>
        <form class="danger__form" data-delete-form novalidate>
          <p>${esc(a.deleteText)}</p>
          ${field({ id: 'delete-password', label: a.password, type: 'password', autocomplete: 'current-password' })}
          <p class="auth-error" role="alert" data-auth-error hidden></p>
          <button class="btn btn--red" type="submit">${esc(a.deleteButton)}</button>
        </form>
      </details>
    </section>
  </aside>
</div>`,
  };

  return [signup, login, app];
}
