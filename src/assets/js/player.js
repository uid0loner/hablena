// Hablena lesson player. Content comes from #lesson-data, strings from #player-strings.
(() => {
  const root = document.querySelector('[data-player]');
  if (!root) return;

  const L = JSON.parse(document.getElementById('lesson-data').textContent);
  const S = JSON.parse(document.getElementById('player-strings').textContent);
  const $ = (sel, el = root) => el.querySelector(sel);
  const stage = $('[data-stage]');
  const primary = $('[data-primary]');
  const bar = $('[data-bar]');
  const feedback = $('[data-feedback]');
  const progress = $('[data-progress]');
  const done = $('[data-done]');

  // ---------- helpers ----------
  const h = (tag, attrs = {}, ...children) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) if (c != null) el.append(c.nodeType ? c : document.createTextNode(c));
    return el;
  };
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const norm = (s) => s.toLowerCase().replace(/[¡!¿?.,;:]/g, '').replace(/\s+/g, ' ').trim();
  const words = (s) => s.replace(/[¡!¿?.,;:]/g, '').split(/\s+/).filter(Boolean);

  // ---------- speech (browser text-to-speech, Spanish voice) ----------
  const speech = 'speechSynthesis' in window ? window.speechSynthesis : null;
  let esVoice = null;
  const pickVoice = () => {
    if (!speech) return;
    const voices = speech.getVoices();
    esVoice = voices.find((v) => /^es[-_]ES/i.test(v.lang)) || voices.find((v) => /^es/i.test(v.lang)) || null;
  };
  if (speech) { pickVoice(); speech.addEventListener?.('voiceschanged', pickVoice); }
  const speak = (text) => {
    if (!speech) return;
    speech.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[¿¡]/g, '').replace('…', ''));
    u.lang = 'es-ES';
    if (esVoice) u.voice = esVoice;
    u.rate = 0.9;
    speech.speak(u);
  };
  const SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  const audioButton = (text, big = false) => {
    const btn = h('button', { type: 'button', class: big ? 'audio audio--big' : 'audio', 'aria-label': S.play, onclick: () => speak(text) });
    btn.innerHTML = SPEAKER;
    return btn;
  };

  // ---------- state ----------
  const steps = L.exercises;
  const scored = steps.filter((s) => s.t !== 'intro').length;
  let index = 0;
  let correct = 0;
  let current = null; // { ready(), evaluate() → {ok, answer}, auto? }
  let phase = 'answer';

  const setProgress = () => {
    const pct = Math.round((index / steps.length) * 100);
    progress.firstElementChild.style.width = pct + '%';
    progress.setAttribute('aria-valuenow', String(pct));
  };
  const setPrimary = (label, enabled, style = 'red') => {
    primary.textContent = label;
    primary.disabled = !enabled;
    primary.className = `btn btn--lg player__primary btn--${style}`;
  };
  const clearFeedback = () => {
    feedback.hidden = true;
    bar.classList.remove('is-right', 'is-wrong');
  };
  const showFeedback = (ok, answer) => {
    bar.classList.add(ok ? 'is-right' : 'is-wrong');
    $('[data-feedback-icon]').textContent = ok ? '✓' : '✕';
    $('[data-feedback-title]').textContent = ok ? S.right : S.wrong;
    $('[data-feedback-text]').textContent = ok ? '' : `${S.correctAnswer} ${answer}`;
    feedback.hidden = false;
  };

  // Option buttons shared by choice / reverse / listen / gap
  function optionList(options, answer, { lang, onPick }) {
    let picked = null;
    const buttons = options.map((text, i) =>
      h('button', {
        type: 'button', class: 'opt', lang, 'data-key': String(i + 1),
        onclick: () => {
          if (phase !== 'answer') return;
          buttons.forEach((b) => b.classList.remove('is-picked'));
          buttons[i].classList.add('is-picked');
          picked = text;
          onPick?.(text);
          setPrimary(S.check, true);
        },
      }, h('span', { class: 'opt__key', 'aria-hidden': 'true' }, String(i + 1)), text));
    return {
      el: h('div', { class: 'opts', role: 'group' }, buttons),
      buttons,
      evaluate: () => {
        const ok = picked === answer;
        buttons.forEach((b) => {
          b.disabled = true;
          if (b.textContent.slice(1) === answer) b.classList.add('is-right');
          else if (b.classList.contains('is-picked')) b.classList.add('is-wrong');
        });
        return { ok, answer };
      },
    };
  }

  const distractors = (target, key, n = 3) => {
    const pool = [...new Set(L.vocab.map((v) => v[key]).filter((x) => x !== target))];
    return shuffle(pool).slice(0, n);
  };

  // ---------- step renderers ----------
  const render = {
    intro(step) {
      const cards = step.v.map((i) => {
        const v = L.vocab[i];
        return h('div', { class: 'word-card' },
          h('div', {}, h('span', { class: 'word-card__es', lang: 'es' }, v.es), h('span', { class: 'word-card__tr' }, v.tr)),
          speech ? audioButton(v.es) : null);
      });
      stage.append(h('p', { class: 'step-kicker' }, step.v.length > 1 ? S.newWords : S.newWord), h('div', { class: 'word-cards' }, cards));
      if (speech && step.v.length === 1) setTimeout(() => speak(L.vocab[step.v[0]].es), 250);
      return { intro: true };
    },
    choice(step) {
      const v = L.vocab[step.v];
      stage.append(h('p', { class: 'step-kicker' }, S.chooseTranslation),
        h('div', { class: 'prompt' }, h('span', { class: 'prompt__text', lang: 'es' }, v.es), speech ? audioButton(v.es) : null));
      const list = optionList(shuffle([v.tr, ...distractors(v.tr, 'tr')]), v.tr, {});
      stage.append(list.el);
      return list;
    },
    reverse(step) {
      const v = L.vocab[step.v];
      stage.append(h('p', { class: 'step-kicker' }, S.chooseSpanish), h('div', { class: 'prompt' }, h('span', { class: 'prompt__text' }, v.tr)));
      const list = optionList(shuffle([v.es, ...distractors(v.es, 'es')]), v.es, { lang: 'es', onPick: (t) => speak(t) });
      stage.append(list.el);
      return list;
    },
    listen(step) {
      const v = L.vocab[step.v];
      const reveal = h('button', { type: 'button', class: 'link-btn', onclick: (e) => { e.currentTarget.replaceWith(h('span', { class: 'reveal', lang: 'es' }, v.es)); } }, S.noAudio);
      stage.append(h('p', { class: 'step-kicker' }, S.whatDidYouHear), h('div', { class: 'prompt prompt--listen' }, speech ? audioButton(v.es, true) : null, reveal));
      const list = optionList(shuffle([v.es, ...distractors(v.es, 'es')]), v.es, { lang: 'es' });
      stage.append(list.el);
      if (speech) setTimeout(() => speak(v.es), 300);
      return list;
    },
    gap(step) {
      const blank = h('span', { class: 'blank' }, '___');
      const [before, after] = step.es.split('___');
      stage.append(h('p', { class: 'step-kicker' }, S.fillGap),
        h('p', { class: 'gap-sentence', lang: 'es' }, before, blank, after),
        h('p', { class: 'gap-tr' }, step.tr));
      const list = optionList(shuffle(step.options), step.answer, { lang: 'es', onPick: (t) => { blank.textContent = t; blank.classList.add('is-filled'); } });
      stage.append(list.el);
      const evaluate = list.evaluate;
      list.evaluate = () => { const r = evaluate(); blank.textContent = step.answer; if (speech) speak(step.es.replace('___', step.answer)); return r; };
      return list;
    },
    build(step) {
      const target = words(step.es);
      const tiles = shuffle([...target, ...(step.extra || [])]);
      const answerRow = h('div', { class: 'build-answer', 'aria-label': S.yourAnswer });
      const pool = h('div', { class: 'build-pool' });
      const chosen = [];
      const update = () => setPrimary(S.check, chosen.length > 0);
      tiles.forEach((word) => {
        const tile = h('button', { type: 'button', class: 'wtile', lang: 'es' }, word);
        tile.addEventListener('click', () => {
          if (phase !== 'answer') return;
          if (tile.parentElement === pool) { answerRow.append(tile); chosen.push(tile); speak(word); }
          else { pool.append(tile); chosen.splice(chosen.indexOf(tile), 1); }
          update();
        });
        pool.append(tile);
      });
      stage.append(h('p', { class: 'step-kicker' }, S.buildSentence), h('div', { class: 'prompt' }, h('span', { class: 'prompt__text' }, step.tr)), answerRow, pool);
      return {
        evaluate: () => {
          const given = chosen.map((t) => t.textContent).join(' ');
          const ok = norm(given) === norm(step.es);
          [...answerRow.children, ...pool.children].forEach((t) => { t.disabled = true; });
          answerRow.classList.add(ok ? 'is-right' : 'is-wrong');
          if (speech) speak(step.es);
          return { ok, answer: step.es };
        },
      };
    },
    match(step) {
      const items = step.v.map((i) => L.vocab[i]);
      let selected = null;
      let mistakes = 0;
      let matched = 0;
      const api = { auto: true };
      const mk = (text, side, key, lang) => h('button', { type: 'button', class: 'match__item', 'data-key': key, 'data-side': side, lang }, text);
      const left = shuffle(items).map((v) => mk(v.es, 'es', v.es, 'es'));
      const right = shuffle(items).map((v) => mk(v.tr, 'tr', v.es));
      const onClick = (btn) => {
        if (btn.disabled) return;
        if (!selected || selected.dataset.side === btn.dataset.side) {
          if (selected) selected.classList.remove('is-picked');
          selected = btn; btn.classList.add('is-picked');
          if (btn.dataset.side === 'es') speak(btn.textContent);
          return;
        }
        if (selected.dataset.key === btn.dataset.key) {
          [selected, btn].forEach((b) => { b.classList.remove('is-picked'); b.classList.add('is-matched'); b.disabled = true; });
          matched++;
          if (matched === items.length) api.onDone?.(mistakes === 0);
        } else {
          mistakes++;
          const pair = [selected, btn];
          pair.forEach((b) => b.classList.add('is-error'));
          setTimeout(() => pair.forEach((b) => b.classList.remove('is-error', 'is-picked')), 450);
        }
        selected = null;
      };
      [...left, ...right].forEach((b) => b.addEventListener('click', () => onClick(b)));
      stage.append(h('p', { class: 'step-kicker' }, S.matchPairs), h('div', { class: 'match' }, h('div', { class: 'match__col' }, left), h('div', { class: 'match__col' }, right)));
      return api;
    },
  };

  // ---------- flow ----------
  function show(i) {
    index = i;
    phase = 'answer';
    stage.innerHTML = '';
    clearFeedback();
    setProgress();
    const step = steps[i];
    current = render[step.t](step);
    stage.focus?.({ preventScroll: true });
    if (current.intro) setPrimary(S.continue, true, 'gold');
    else if (current.auto) {
      setPrimary(S.check, false);
      primary.hidden = true;
      current.onDone = (ok) => {
        if (ok) correct++;
        phase = 'feedback';
        showFeedback(ok, '');
        if (!ok) $('[data-feedback-text]').textContent = S.matchMistakes;
        primary.hidden = false;
        setPrimary(S.continue, true, ok ? 'gold' : 'navy');
        primary.focus();
      };
    } else setPrimary(S.check, false);
    if (!current.auto) primary.hidden = false;
  }

  function next() {
    if (index + 1 < steps.length) show(index + 1);
    else finish();
  }

  primary.addEventListener('click', () => {
    if (primary.disabled) return;
    if (current.intro || phase === 'feedback') return next();
    const { ok, answer } = current.evaluate();
    if (ok) correct++;
    phase = 'feedback';
    showFeedback(ok, answer);
    setPrimary(S.continue, true, ok ? 'gold' : 'navy');
  });

  document.addEventListener('keydown', (e) => {
    if (!done.hidden) return;
    if (e.key === 'Enter' && !primary.disabled && !primary.hidden && document.activeElement?.tagName !== 'BUTTON') { e.preventDefault(); primary.click(); }
    if (/^[1-4]$/.test(e.key) && phase === 'answer') {
      const btn = stage.querySelector(`.opt[data-key="${e.key}"]`);
      if (btn) btn.click();
    }
  });

  async function finish() {
    index = steps.length;
    setProgress();
    stage.hidden = true;
    bar.hidden = true;
    done.hidden = false;
    $('[data-done-title]').textContent = correct === scored ? S.perfect : S.wellDone;
    $('[data-done-score]').textContent = `${correct}/${scored}`;
    const note = $('[data-save-note]');
    try {
      const res = await fetch('/api/progress', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: L.id, correct, total: scored }),
      });
      if (res.status === 401) {
        note.innerHTML = '';
        note.append(S.loginToSave + ' ', h('a', { href: root.dataset.login }, S.loginLink));
        note.hidden = false;
      } else if (!res.ok) throw new Error();
    } catch {
      note.textContent = S.saveFailed;
      note.hidden = false;
    }
  }

  $('[data-restart]').addEventListener('click', () => {
    correct = 0;
    done.hidden = true;
    stage.hidden = false;
    bar.hidden = false;
    show(0);
  });

  stage.setAttribute('tabindex', '-1');
  show(0);
})();
