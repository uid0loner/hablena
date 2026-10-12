// Homepage demo: three quick questions, each spoken by a different character. No account needed.
(() => {
  const root = document.querySelector('[data-demo]');
  if (!root) return;
  const D = JSON.parse(document.getElementById('demo-data').textContent);
  const S = D.strings;
  const body = root.querySelector('[data-demo-body]');
  const dots = [...root.querySelectorAll('.demo__dots i')];
  const sfx = (n) => window.HablenaSfx?.play(n);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  const PITCH = { lucia: 1.08, mateo: 0.8, sofia: 1.5, pablo: 1.35 };

  const h = (tag, attrs = {}, ...children) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    children.flat().forEach((c) => c != null && el.append(c.nodeType ? c : document.createTextNode(c)));
    return el;
  };
  const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
  const pick = (l) => l[Math.floor(Math.random() * l.length)];

  let playing = null;
  const speak = (step) => {
    if (playing) playing.pause();
    const a = new Audio(step.audio);
    playing = a;
    let fell = false;
    const fallback = () => {
      if (fell || !('speechSynthesis' in window)) return;
      fell = true;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(step.es.replace(/[¿¡]/g, ''));
      u.lang = 'es-ES';
      u.rate = 0.9;
      u.pitch = PITCH[step.s] || 1;
      speechSynthesis.speak(u);
    };
    a.addEventListener('error', fallback, { once: true });
    a.play().catch((err) => { if (!err || err.name !== 'NotAllowedError') fallback(); });
  };

  let index = 0;
  let score = 0;

  const swap = (...nodes) => {
    body.replaceChildren(...nodes);
    if (!reduceMotion) { body.classList.remove('is-enter'); void body.offsetWidth; body.classList.add('is-enter'); }
  };

  function step(i) {
    index = i;
    const st = D.steps[i];
    dots.forEach((d, n) => d.classList.toggle('is-current', n === i));
    const fb = h('p', { class: 'demo__fb', role: 'status' });
    const next = h('button', { type: 'button', class: 'lp-cta lp-cta--green demo__next', hidden: true, onclick: () => (i + 1 < D.steps.length ? step(i + 1) : finish()) },
      i + 1 < D.steps.length ? S.next : S.finish);
    const buttons = shuffle(st.options).map((text) => h('button', {
      type: 'button', class: 'lp-opt demo__opt', 'data-value': text,
      onclick: () => {
        if (buttons.some((b) => b.disabled)) return;
        const ok = text === st.answer;
        buttons.forEach((b) => {
          b.disabled = true;
          if (b.dataset.value === st.answer) b.classList.add('is-right');
          else if (b === buttons.find((x) => x.dataset.value === text)) b.classList.add('is-wrong');
        });
        if (ok) score++;
        dots[i].classList.add(ok ? 'is-right' : 'is-wrong');
        sfx(ok ? 'correct' : 'wrong');
        fb.className = `demo__fb ${ok ? 'is-right' : 'is-wrong'}`;
        fb.textContent = ok ? pick(S.right) : `${S.wrong} ${st.answer}`;
        next.hidden = false;
        next.focus({ preventScroll: true });
      },
    }, h('span', { class: 'lp-opt__text' }, text)));
    swap(
      h('p', { class: 'demo__step' }, S.step.replace('{n}', i + 1)),
      h('p', { class: 'demo__q' }, S.question),
      h('div', { class: 'demo__say' },
        h('div', { class: 'demo__who' }, h('span', { class: `cast__face cast__face--${st.s}`, html: D.faces[st.s] }), h('span', { class: 'demo__name' }, st.name)),
        h('div', { class: 'lp-bubble demo__bubble' },
          h('button', { type: 'button', class: 'lp-audio', 'aria-label': S.listen, html: SPEAKER, onclick: () => speak(st) }),
          h('span', { class: 'lp-bubble__text', lang: 'es' }, st.es))),
      h('div', { class: 'demo__opts' }, buttons),
      fb,
      next,
    );
    setTimeout(() => speak(st), 250);
  }

  function finish() {
    dots.forEach((d) => d.classList.remove('is-current'));
    sfx('complete');
    const signup = document.querySelector('.hh .btn3d')?.getAttribute('href') || '/signup/';
    swap(
      h('div', { class: 'demo__done' },
        h('div', { class: 'demo__done-mascot', html: document.querySelector('.demo__mascot').innerHTML }),
        h('p', { class: 'demo__score' }, S.doneTitle.replace('{n}', score)),
        h('p', { class: 'demo__done-text' }, S.doneText),
        h('a', { class: 'btn3d btn3d--red demo__cta', href: signup }, S.doneCta),
        h('button', { type: 'button', class: 'lp-link', onclick: () => { score = 0; dots.forEach((d) => d.className = ''); step(0); } }, S.again)),
    );
    root.classList.add('is-done');
    if (!reduceMotion) burst();
  }

  // A small confetti burst from the card
  function burst() {
    const canvas = h('canvas', { class: 'demo__confetti', 'aria-hidden': 'true' });
    root.append(canvas);
    const r = root.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const colors = ['#C8102E', '#FFC400', '#0A1633', '#2FA35F', '#1E6BD6'];
    const parts = Array.from({ length: 90 }, () => ({
      x: r.width / 2, y: r.height * 0.3, vx: (Math.random() - 0.5) * 10, vy: -Math.random() * 10 - 3,
      w: 5 + Math.random() * 5, h: 7 + Math.random() * 7, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3, c: pick(colors),
    }));
    const t0 = performance.now();
    const frame = (t) => {
      ctx.clearRect(0, 0, r.width, r.height);
      parts.forEach((p) => {
        p.vy += 0.3; p.x += p.vx; p.y += p.vy; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      if (t - t0 < 2200) requestAnimationFrame(frame); else canvas.remove();
    };
    requestAnimationFrame(frame);
  }

  root.querySelector('[data-demo-start]').addEventListener('click', () => {
    root.classList.add('is-live');
    sfx('tap');
    step(0);
  });
})();
