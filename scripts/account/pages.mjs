// Sign-up, log-in and the logged-in app area. These pages are noindex and stay out of the sitemap.

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

  const app = {
    ...common,
    path: urls.app(lang),
    alt: urls.app(otherLang),
    title: `${a.appTitle} | Hablena`,
    description: a.appTitle,
    hero: `<p class="hero__kicker" style="margin-bottom:16px">${esc(a.appKicker)}</p>
<h1 class="display display--l" data-greeting data-template="${esc(a.greeting)}" data-fallback="${esc(a.greetingNoName)}">${esc(a.greetingNoName)}</h1>`,
    content: `
<div class="container app-home" data-app data-login="${urls.login(lang)}" data-home="${urls.home(lang)}" data-messages="${messages}">
  <div class="app-grid">
    <section class="app-card app-card--dark">
      <span class="label">${esc(a.courseLabel)}</span>
      <h2>${esc(a.courseTitle)}</h2>
      <p>${esc(a.courseText)}</p>
    </section>
    <a class="app-card app-link" href="${urls.grammarIndex(lang)}">
      <span class="label">${esc(t.nav.grammar)}</span>
      <h2>${esc(a.grammarTitle)}</h2>
      <p>${esc(a.grammarText)}</p>
    </a>
    <a class="app-card app-link" href="${urls.index(lang)}">
      <span class="label">${esc(t.nav.conjugator)}</span>
      <h2>${esc(a.conjTitle)}</h2>
      <p>${esc(a.conjText)}</p>
    </a>
  </div>

  <section class="account" aria-labelledby="account-title">
    <h2 id="account-title">${esc(a.accountTitle)}</h2>
    <dl class="account__facts">
      <div><dt>${esc(a.email)}</dt><dd data-user-email>…</dd></div>
      <div><dt>${esc(a.memberSince)}</dt><dd data-user-since>…</dd></div>
    </dl>
    <button class="btn btn--outline" type="button" data-logout>${esc(a.logout)}</button>

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
</div>`,
  };

  return [signup, login, app];
}
