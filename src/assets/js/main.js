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
