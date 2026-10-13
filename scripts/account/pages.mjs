// Sign-up, log-in and the logged-in app area. These pages are noindex and stay out of the sitemap.
import { readFileSync } from 'node:fs';
import { UNITS } from '../course/units.mjs';
import { STORIES } from '../course/stories.mjs';
import { ALL_LESSONS } from '../course/units.mjs';

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

  const ob = a.ob;
  const ICON = {
    travel: '<path d="M2.5 13.5l19-8-6 15-3.5-6.5z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 14l9.5-8.5" stroke="currentColor" stroke-width="2.2"/>',
    work: '<rect x="3" y="7" width="18" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12.5h18" fill="none" stroke="currentColor" stroke-width="2.2"/>',
    family: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>',
    culture: '<path d="M9 18V6l11-2v12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="17.5" cy="16" r="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/>',
    brain: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/>',
  };
  const stepHead = (n, title, text) => `<p class="ob-step__count">${esc(ob.stepOf.replace('{n}', n))}</p><h1>${esc(title)}</h1><p class="ob-step__text">${esc(text)}</p>`;
  const authPage = (extra) => ({ ...common, template: 'auth', ...extra });

  const signup = authPage({
    path: urls.signup(lang),
    alt: urls.signup(otherLang),
    title: `${a.signupTitle} | Hablena`,
    description: a.signupLead,
    vars: { sideBubble: esc(a.side.bubbleSignup), topText: esc(a.haveAccount), topHref: urls.login(lang), topLink: esc(a.loginLink) },
    content: `
<form class="ob-form" data-auth-form="signup" data-onboarding data-redirect="${urls.lesson(lang, 'u1-l1')}" data-lang="${lang}" data-messages="${messages}" novalidate>
  <div class="ob-progress" aria-hidden="true"><span data-ob-bar></span></div>
  <section class="ob-step" data-ob-step="0">
    ${stepHead(1, ob.motiveTitle, ob.motiveText)}
    <div class="ob-choices ob-choices--grid" role="radiogroup" aria-label="${esc(ob.motiveTitle)}">
      ${Object.entries(ob.motives).map(([k, label]) => `
      <label class="ob-choice"><input class="ob-choice__input" type="radio" name="motive" value="${k}"><span class="ob-choice__icon ob-choice__icon--${k}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg></span><span class="ob-choice__label">${esc(label)}</span></label>`).join('')}
    </div>
    <div class="ob-actions">
      <button class="lp-cta lp-cta--green" type="button" data-ob-next disabled>${esc(ob.continue)}</button>
      <button class="lp-link" type="button" data-ob-skip>${esc(ob.skip)}</button>
    </div>
  </section>
  <section class="ob-step" data-ob-step="1">
    ${stepHead(2, ob.goalTitle, ob.goalText)}
    <div class="ob-choices" role="radiogroup" aria-label="${esc(ob.goalTitle)}">
      ${ob.goals.map((g) => `
      <label class="ob-choice ob-choice--row"><input class="ob-choice__input" type="radio" name="dailyGoal" value="${g.v}"${g.v === 20 ? ' checked' : ''}><span class="ob-choice__label"><b>${esc(g.name)}</b><span>${esc(g.time)}</span></span><span class="ob-choice__xp">${g.v} XP</span></label>`).join('')}
    </div>
    <div class="ob-actions">
      <button class="lp-cta lp-cta--green" type="button" data-ob-next>${esc(ob.continue)}</button>
      <button class="lp-link" type="button" data-ob-back>${esc(ob.back)}</button>
    </div>
  </section>
  <section class="ob-step" data-ob-step="2">
    ${stepHead(3, ob.accountTitle, ob.accountText)}
    <div class="ob-fields">
      ${field({ id: 'name', label: a.name, autocomplete: 'given-name', required: false })}
      ${field({ id: 'email', label: a.email, type: 'email', autocomplete: 'email' })}
      ${field({ id: 'password', label: a.password, type: 'password', autocomplete: 'new-password', minlength: 10, hint: a.passwordHint })}
    </div>
    <p class="auth-error" role="alert" data-auth-error hidden></p>
    <button class="lp-cta lp-cta--red ob-submit" type="submit" data-label="${esc(ob.start)}" data-busy="${esc(a.busy)}">${esc(ob.start)}</button>
    <p class="auth-small">${a.privacyNote.replace('{link}', `<a href="${urls.privacy(lang)}">${esc(a.privacyLink)}</a>`)}</p>
    <button class="lp-link" type="button" data-ob-back>${esc(ob.back)}</button>
  </section>
</form>`,
  });

  const login = authPage({
    path: urls.login(lang),
    alt: urls.login(otherLang),
    title: `${a.loginTitle} | Hablena`,
    description: a.loginLead,
    vars: { sideBubble: esc(a.side.bubbleLogin), topText: esc(a.noAccount), topHref: urls.signup(lang), topLink: esc(a.signupLink) },
    content: `
<form class="ob-form" data-auth-form="login" data-redirect="${urls.app(lang)}" data-lang="${lang}" data-messages="${messages}" novalidate>
  <section class="ob-step">
    <h1>${esc(a.loginTitle)}</h1>
    <p class="ob-step__text">${esc(a.loginLead)}</p>
    <div class="ob-fields">
      ${field({ id: 'email', label: a.email, type: 'email', autocomplete: 'email' })}
      ${field({ id: 'password', label: a.password, type: 'password', autocomplete: 'current-password' })}
    </div>
    <p class="auth-error" role="alert" data-auth-error hidden></p>
    <button class="lp-cta lp-cta--red ob-submit" type="submit" data-label="${esc(a.loginButton)}" data-busy="${esc(a.busy)}">${esc(a.loginButton)}</button>
    <p class="auth-small">${esc(a.forgot)} <a href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>
  </section>
</form>`,
  });

  // Zig-zag offsets for the learning path (in units of the node width).
  const OFFSETS = [0, -0.9, -1.4, -0.9, 0, 0.9, 1.4, 0.9];
  const ICONS = {
    star: '<svg class="node__icon node__icon--star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" fill="currentColor"/></svg>',
    check: '<svg class="node__icon node__icon--check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    lock: '<svg class="node__icon node__icon--lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v5a5 5 0 0 1-10 0zM7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3M12 13v4M8 21h8M9 17h6v4H9z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  };
  const BADGE_ICON = {
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" fill="currentColor"/></svg>',
    flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 1.5-5 3-6 0 2 1 3 2 3 0-3-1-6 1-9z" fill="currentColor"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v5a5 5 0 0 1-10 0zM7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3M12 13v4M8 21h8M9 17h6v4H9z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  const BADGE_STYLE = { first: ['star', 'red'], five: ['star', 'blue'], ten: ['star', 'navy'], unit: ['trophy', 'gold'], perfect: ['check', 'green'], streak3: ['flame', 'orange'], streak7: ['flame', 'red'], xp100: ['bolt', 'gold'], xp500: ['bolt', 'purple'] };
  const total = UNITS.reduce((n, u) => n + u.lessons.length, 0);
  const STORY_ICON = '<svg class="node__icon node__icon--story" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><rect x="3" y="13" width="5" height="7" rx="2" fill="currentColor"/><rect x="16" y="13" width="5" height="7" rx="2" fill="currentColor"/></svg>';
  const storyNode = (u) => {
    const st = STORIES.find((x) => x.unit === u.id);
    if (!st) return '';
    return `<li class="node node--story is-locked" style="--x:0.9" data-story-node="${st.id}"><a class="node__btn" href="${urls.story(lang, st.id)}" tabindex="-1" aria-disabled="true" title="${esc(t.learn.storyLocked)}" aria-label="${esc(t.learn.storyNode)}: ${esc(st.title[lang])}">${STORY_ICON}</a><span class="node__label" aria-hidden="true">${esc(t.learn.storyNode)}</span></li>`;
  };
  let n = 0;
  const ap = t.app;

  const unitHtml = (u, ui) => `
    <section class="punit punit--${ui % 5}" aria-labelledby="unit-${u.id}" data-unit="${u.id}">
      <header class="punit__banner">
        <div>
          <p class="punit__kicker">${esc(a.unit)} ${ui + 1} · ${u.level}<span class="punit__premium"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5z" fill="currentColor"/></svg>${esc(t.premium.badge)}</span></p>
          <h2 id="unit-${u.id}">${esc(u.title[lang])}</h2>
        </div>
        <div class="punit__side">
          <span class="punit__count" data-unit-count>0/${u.lessons.length}</span>
          <a class="punit__guide" href="${urls.guide(lang, u.id)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5C6.5 4 9.5 4 12 5.5 14.5 4 17.5 4 20 5.5V19c-2.5-1.5-5.5-1.5-8 0-2.5-1.5-5.5-1.5-8 0z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 5.5V19" stroke="currentColor" stroke-width="2.2"/></svg><span>${esc(ap.guide)}</span></a>
        </div>
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
        ${storyNode(u)}
        <li class="node node--trophy" style="--x:0"><a class="node__btn" href="${urls.practice(lang)}?unit=${u.id}" tabindex="-1" aria-disabled="true" data-trophy aria-label="${esc(t.learn.unitTest)}: ${esc(u.title[lang])}">${ICONS.trophy}</a></li>
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
    vars: { appUrl: urls.app(lang), wordsUrl: urls.words(lang), learnActive: ' is-active', wordsActive: '' },
    content: `
<div class="learn" data-app data-premium-url="${urls.premium(lang)}" data-premium-unlock="${esc(t.premium.unlock)}" data-login="${urls.login(lang)}" data-home="${urls.home(lang)}" data-messages="${messages}" data-score-label="${esc(ap.bestScore)}" data-review-label="${esc(ap.review)}" data-start-label="${esc(ap.start)}" data-goal-text="${esc(ap.goalText)}" data-goal-done="${esc(ap.goalDone)}" data-streak-hint="${esc(ap.streakHint)}" data-streak-active="${esc(ap.streakActive)}">
  <div class="learn__path">
    <h1 class="learn__hello" data-greeting data-template="${esc(a.greeting)}" data-fallback="${esc(a.greetingNoName)}">${esc(a.greetingNoName)}</h1>
    <p class="learn__motive" data-motive-line data-lines="${esc(JSON.stringify(a.motiveLine))}" hidden></p>
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
      <ol class="week" data-app-week aria-hidden="true">${ap.weekdays.map(() => '<li><span></span></li>').join('')}</ol>
      <p class="freeze" title="${esc(ap.freezesHint)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M4 6.5l16 11M20 6.5l-16 11M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span data-freezes data-one="${esc(ap.freezes)}" data-none="${esc(ap.freezesNone)}">${esc(ap.freezesNone)}</span></p>
    </section>

    <section class="side-card side-card--quests" aria-labelledby="quests-title" data-quests data-labels="${esc(JSON.stringify({ xp: ap.questXp, lessons: ap.questLessons, perfect: ap.questPerfect, practice: ap.questPractice }))}">
      <div class="side-card__head"><h2 id="quests-title">${esc(ap.questsTitle)}</h2></div>
      <ul class="quests" data-quest-list></ul>
      <p class="quests__bonus" data-quest-bonus data-done="${esc(ap.questBonusDone)}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="10" width="18" height="11" rx="2" fill="#FFC400" stroke="#C99700" stroke-width="1.6"/><path d="M3 10l2-5h14l2 5" fill="#E0A800" stroke="#C99700" stroke-width="1.6" stroke-linejoin="round"/><rect x="10" y="12" width="4" height="5" rx="1" fill="#0A1633"/></svg><span>${esc(ap.questBonus)}</span></p>
    </section>

    <section class="side-card side-card--level" aria-labelledby="level-title" data-level-card data-text="${esc(ap.levelText)}">
      <div class="side-card__level">
        <span class="lvl-badge lvl-badge--md" aria-hidden="true"><svg viewBox="0 0 48 52"><path d="M24 2l20 8v16c0 13-9 21-20 24C13 47 4 39 4 26V10z" fill="#1E6BD6" stroke="#1554AE" stroke-width="3"/></svg><b data-stat-level>1</b></span>
        <div><h2 id="level-title">${esc(ap.levelTitle)} <span data-stat-level>1</span></h2><p data-level-msg></p></div>
      </div>
      <div class="lp-level__bar"><span data-level-fill></span></div>
    </section>

    <section class="side-card">
      <div class="side-card__head"><h2>${esc(ap.dailyGoal)}</h2><span class="side-card__xp"><span data-stat-xptoday>0</span>/<span data-stat-goal>20</span> XP</span></div>
      <div class="goalbar" role="progressbar" aria-label="${esc(ap.dailyGoal)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-goalbar><span></span></div>
      <p data-goal-msg>${esc(ap.goalText.replace('{xp}', '0').replace('{goal}', '20'))}</p>
    </section>

    <section class="side-card" aria-labelledby="badges-title">
      <div class="side-card__head"><h2 id="badges-title">${esc(ap.badges.title)}</h2><span class="side-card__xp" data-badge-count>0/${Object.keys(ap.badges.items).length}</span></div>
      <ul class="badges">${Object.entries(ap.badges.items).map(([k, [name, desc]]) => `
        <li class="badge-a badge-a--${BADGE_STYLE[k][1]}" data-badge="${k}" title="${esc(desc)}"><span class="badge-a__icon">${BADGE_ICON[BADGE_STYLE[k][0]]}</span><span class="badge-a__name">${esc(name)}</span><span class="sr-only">${esc(desc)}</span></li>`).join('')}
      </ul>
    </section>

    <section class="side-card side-card--vault" data-vault-card data-text="${esc(t.vault.sideText)}" data-none="${esc(t.vault.sideTextNone)}">
      <div class="side-card__head"><h2>${esc(t.vault.sideTitle)}</h2></div>
      <p data-vault-text>${esc(t.vault.sideTextNone)}</p>
      <script type="application/json" id="vault-mini">${JSON.stringify(ALL_LESSONS.flatMap((l) => l.vocab.map((w) => ({ es: w.es, lesson: l.id })))).replace(/</g, '\\u003c')}</script>
      <div class="side-card__row">
        <a class="lp-cta lp-cta--ghost side-card__cta" href="${urls.words(lang)}">${esc(t.vault.sideButton)}</a>
        <a class="lp-cta lp-cta--red side-card__cta" href="${urls.practice(lang)}?focus=weak" data-vault-weak hidden>${esc(t.vault.practiceWeak)}</a>
      </div>
    </section>

    <section class="side-card side-card--practice">
      <div class="side-card__head"><h2>${esc(ap.practiceTitle)}</h2></div>
      <p>${esc(ap.practiceText)}</p>
      <a class="lp-cta lp-cta--ghost side-card__cta" href="${urls.practice(lang)}">${esc(ap.practiceButton)}</a>
    </section>

    <section class="side-card">
      <h2>${esc(ap.more)}</h2>
      <a class="side-link" href="${urls.grammarIndex(lang)}"><span class="side-link__icon side-link__icon--blue" aria-hidden="true">Aa</span><span><strong>${esc(a.grammarTitle)}</strong><span>${esc(a.grammarText)}</span></span></a>
      <a class="side-link" href="${urls.index(lang)}"><span class="side-link__icon side-link__icon--green" aria-hidden="true">-ar</span><span><strong>${esc(a.conjTitle)}</strong><span>${esc(a.conjText)}</span></span></a>
    </section>

    <section class="side-card account" id="account" aria-labelledby="account-title">
      <h2 id="account-title">${esc(a.accountTitle)}</h2>
      <div class="acct-plan" data-plan data-t="${esc(JSON.stringify(a.plan))}">
        <span class="acct-plan__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5z" fill="currentColor"/></svg></span>
        <span class="acct-plan__text"><strong data-plan-name>${esc(a.plan.free)}</strong><span data-plan-sub>${esc(a.plan.freeText)}</span></span>
      </div>
      <a class="acct-plan__more" href="${urls.premium(lang)}" data-plan-more>${esc(t.premium.see)} →</a>
      <p class="acct-plan__test" data-plan-test hidden></p>
      <dl class="account__facts">
        <div><dt>${esc(a.email)}</dt><dd data-user-email>…</dd></div>
        <div><dt>${esc(a.memberSince)}</dt><dd data-user-since>…</dd></div>
        <div><dt>${esc(ap.xpTotal)}</dt><dd><span data-stat-xptotal>0</span> XP</dd></div>
      </dl>
      <div class="goal-setting">
        <label for="goal-select">${esc(a.goalSetting)}</label>
        <div class="goal-setting__row">
          <select id="goal-select" data-goal-select>${a.ob.goals.map((g) => `<option value="${g.v}"${g.v === 20 ? ' selected' : ''}>${esc(g.name)} · ${esc(g.time)} · ${g.v} XP</option>`).join('')}</select>
          <span class="goal-setting__saved" data-goal-saved hidden>${esc(a.goalSaved)}</span>
        </div>
      </div>
      <details class="redeem" data-redeem>
        <summary>${esc(a.plan.redeemTitle)}</summary>
        <form class="redeem__form" data-redeem-form novalidate>
          <label class="sr-only" for="redeem-code">${esc(a.plan.redeemTitle)}</label>
          <div class="redeem__row">
            <input id="redeem-code" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="40" placeholder="${esc(a.plan.redeemPlaceholder)}" required>
            <button class="btn btn--navy" type="submit">${esc(a.plan.redeemButton)}</button>
          </div>
          <p class="auth-error" role="alert" data-auth-error hidden></p>
          <p class="redeem__ok" role="status" data-redeem-ok hidden></p>
        </form>
      </details>
      <a class="side-link side-link--admin" href="/admin/" data-admin-link hidden><span class="side-link__icon side-link__icon--navy" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" fill="currentColor"/></svg></span><span><strong>${esc(a.plan.admin)}</strong></span></a>
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
