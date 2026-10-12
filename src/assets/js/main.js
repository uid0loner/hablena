// Hablena — small progressive enhancements. The page works without JS.

(() => {
  // Mobile menu
  const header = document.querySelector('[data-header]');
  const toggle = document.querySelector('[data-menu-toggle]');
  if (header && toggle) {
    toggle.addEventListener('click', () => {
      const open = header.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    header.querySelectorAll('.nav a').forEach((a) =>
      a.addEventListener('click', () => {
        header.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      })
    );
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && header.classList.contains('is-open')) {
        header.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  // Monthly / yearly pricing switch
  const billing = document.querySelector('[data-billing]');
  if (billing) {
    const targets = document.querySelectorAll('[data-price], [data-per], [data-note]');
    billing.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-period]');
      if (!btn) return;
      const period = btn.dataset.period;
      billing.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      targets.forEach((el) => {
        const value = el.dataset[period];
        if (value) el.textContent = value;
      });
    });
  }
})();

// Conjugator: live filter on the index page (accent-insensitive)
(() => {
  const input = document.querySelector('[data-verb-filter]');
  const groups = document.querySelectorAll('[data-verb-group]');
  if (!input || !groups.length) return;
  const empty = document.querySelector('[data-verb-empty]');
  const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  const apply = () => {
    const q = fold(input.value);
    let total = 0;
    groups.forEach((g) => {
      let shown = 0;
      g.querySelectorAll('[data-verb]').forEach((li) => {
        const hit = !q || li.dataset.verb.includes(q);
        li.hidden = !hit;
        if (hit) shown++;
      });
      g.hidden = shown === 0;
      total += shown;
    });
    if (empty) empty.hidden = total !== 0;
  };

  // Enter jumps straight to the verb when there is exactly one match
  input.closest('form')?.addEventListener('submit', (e) => {
    const visible = [...document.querySelectorAll('[data-verb]:not([hidden]) a')];
    if (visible.length === 1) { e.preventDefault(); location.href = visible[0].href; }
    else e.preventDefault();
  });

  const q = new URLSearchParams(location.search).get('q');
  if (q) input.value = q;
  input.addEventListener('input', apply);
  apply();
})();

// Grammar quizzes
(() => {
  document.querySelectorAll('[data-quiz]').forEach((quiz) => {
    const questions = quiz.querySelectorAll('.quiz__q');
    const scoreEl = quiz.querySelector('[data-quiz-score]');
    let answered = 0;
    let correct = 0;
    questions.forEach((q) => {
      const answer = Number(q.dataset.answer);
      const buttons = q.querySelectorAll('.quiz__opt');
      buttons.forEach((btn) =>
        btn.addEventListener('click', () => {
          const i = Number(btn.dataset.i);
          const ok = i === answer;
          buttons.forEach((b) => { b.disabled = true; });
          btn.classList.add(ok ? 'is-right' : 'is-wrong');
          if (!ok) buttons[answer].classList.add('is-right');
          const blank = q.querySelector('[data-blank]');
          if (blank) { blank.textContent = buttons[answer].textContent; blank.classList.add('is-filled'); }
          const why = q.querySelector('[data-why]');
          why.querySelector('[data-verdict]').textContent = ok ? quiz.dataset.correct : quiz.dataset.wrong;
          why.hidden = false;
          answered++;
          if (ok) correct++;
          if (answered === questions.length && scoreEl) {
            scoreEl.textContent = quiz.dataset.score.replace('{score}', correct).replace('{total}', questions.length);
            scoreEl.hidden = false;
          }
        })
      );
    });
  });
})();

// Accounts: sign-up, log-in, app area
(() => {
  const post = (path, body) =>
    fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body || {}) })
      .then(async (res) => ({ ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) }));
  const readMessages = (el) => { try { return JSON.parse(el.dataset.messages || '{}'); } catch { return {}; } };
  const showError = (box, messages, code) => { box.textContent = messages[code] || messages.server_error || code; box.hidden = false; };

  // Sign-up / log-in forms
  document.querySelectorAll('[data-auth-form]').forEach((form) => {
    const mode = form.dataset.authForm;
    const messages = readMessages(form);
    const errorBox = form.querySelector('[data-auth-error]');
    const button = form.querySelector('button[type="submit"]');
    const fields = { name: form.querySelector('#name'), email: form.querySelector('#email'), password: form.querySelector('#password') };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.hidden = true;
      Object.values(fields).forEach((f) => f && f.removeAttribute('aria-invalid'));

      const email = fields.email.value.trim();
      const password = fields.password.value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fields.email.setAttribute('aria-invalid', 'true'); fields.email.focus(); return showError(errorBox, messages, 'invalid_email'); }
      if (mode === 'signup' && password.length < 10) { fields.password.setAttribute('aria-invalid', 'true'); fields.password.focus(); return showError(errorBox, messages, 'weak_password'); }

      button.disabled = true;
      button.textContent = button.dataset.busy;
      try {
        const body = { email, password };
        if (mode === 'signup') { body.name = fields.name ? fields.name.value.trim() : ''; body.lang = form.dataset.lang; }
        const res = await post(`/api/auth/${mode}`, body);
        if (res.ok) { location.href = form.dataset.redirect; return; }
        showError(errorBox, messages, res.data.error || 'server_error');
      } catch {
        showError(errorBox, messages, 'network');
      }
      button.disabled = false;
      button.textContent = button.dataset.label;
    });
  });

  // App area
  const app = document.querySelector('[data-app]');
  if (!app) return;
  const messages = readMessages(app);
  app.setAttribute('aria-busy', 'true');
  fetch('/api/me', { credentials: 'same-origin' })
    .then(async (res) => {
      if (res.status === 401 || res.status === 503) { location.replace(app.dataset.login); return; }
      const { user } = await res.json();
      const greet = document.querySelector('[data-greeting]');
      if (greet && user.name) greet.textContent = greet.dataset.template.replace('{name}', user.name);
      app.querySelector('[data-user-email]').textContent = user.email;
      app.querySelector('[data-user-since]').textContent = new Date(user.createdAt).toLocaleDateString(document.documentElement.lang, { year: 'numeric', month: 'long', day: 'numeric' });
      app.removeAttribute('aria-busy');
    })
    .catch(() => location.replace(app.dataset.login));

  app.querySelector('[data-logout]')?.addEventListener('click', async () => {
    await post('/api/auth/logout').catch(() => {});
    location.href = app.dataset.home;
  });

  const del = app.querySelector('[data-delete-form]');
  del?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const box = del.querySelector('[data-auth-error]');
    box.hidden = true;
    const res = await post('/api/me/delete', { password: del.querySelector('#delete-password').value }).catch(() => null);
    if (res && res.ok) { location.href = app.dataset.home; return; }
    showError(box, messages, res ? res.data.error || 'server_error' : 'network');
  });
})();
