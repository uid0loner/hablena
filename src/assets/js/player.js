// Hablena lesson player. Content comes from #lesson-data, strings from #player-strings.
(() => {
  const root = document.querySelector('[data-player]');
  if (!root) return;

  const L = JSON.parse(document.getElementById('lesson-data').textContent);
  const S = JSON.parse(document.getElementById('player-strings').textContent);
  const $ = (sel, el = root) => el.querySelector(sel);
  const stage = $('[data-stage]');
  const primary = $('[data-primary]');
  const sheet = $('[data-sheet]');
  const feedback = $('[data-feedback]');
  const progress = $('[data-progress]');
  const done = $('[data-done]');
  const comboBadge = $('[data-combo]');
  const sfx = (name) => window.HablenaSfx?.play(name);
  const MASCOT = document.getElementById('mascot-tpl').innerHTML;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- helpers ----------
  const h = (tag, attrs = {}, ...children) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
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
  const norm = (s) => s.toLowerCase().replace(/[¡!¿?.,;:"“”«»]/g, '').replace(/[’`´]/g, "'").replace(/\s+/g, ' ').trim();
  const fold = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const editDistance = (a, b) => {
    if (Math.abs(a.length - b.length) > 1) return 2;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return d[a.length][b.length];
  };
  const words = (s) => s.replace(/[¡!¿?.,;:]/g, '').split(/\s+/).filter(Boolean);
  const replay = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  // ---------- audio: natural voice recordings from the server, browser speech only as fallback ----------
  // L.audio: { role: { text: hash } }. Each role (Hablena + four characters) has its own voice.
  const AUDIO = L.audio || {};
  const SPEAKERS = L.speakers || {};
  let serverAudio = Object.keys(AUDIO).length > 0;
  const clips = new Map();
  const clip = (text, role = 'hablena') => {
    const hash = AUDIO[role]?.[text] || AUDIO.hablena?.[text];
    if (!hash || !serverAudio) return null;
    if (!clips.has(hash)) {
      const a = new Audio(`/api/audio/${hash}.mp3`);
      a.preload = 'auto';
      a.addEventListener('error', () => { serverAudio = false; });
      clips.set(hash, a);
    }
    return clips.get(hash);
  };
  const speech = 'speechSynthesis' in window ? window.speechSynthesis : null;
  let esVoice = null;
  const pickVoice = () => {
    if (!speech) return;
    const es = speech.getVoices().filter((v) => /^es/i.test(v.lang));
    const score = (v) => (/es[-_]ES/i.test(v.lang) ? 2 : 0) + (/natural|neural|online|google|mónica|monica|jorge|elvira|álvaro|alvaro/i.test(v.name) ? 3 : 0);
    esVoice = es.sort((a, b) => score(b) - score(a))[0] || null;
  };
  if (speech) { pickVoice(); speech.addEventListener?.('voiceschanged', pickVoice); }
  const PITCH = { man: 0.8, woman: 1.08, girl: 1.5, boy: 1.35 };
  const browserSpeak = (text, role) => {
    if (!speech) return;
    speech.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[¿¡]/g, '').replace('…', ''));
    u.lang = 'es-ES';
    if (esVoice) u.voice = esVoice;
    u.rate = 0.9;
    u.pitch = PITCH[SPEAKERS[role]?.kind] || 1;
    speech.speak(u);
  };
  let playing = null;
  const speak = (text, role = 'hablena') => {
    const a = clip(text, role);
    if (playing && playing !== a) playing.pause();
    if (!a) return browserSpeak(text, role);
    playing = a;
    a.currentTime = 0;
    a.play().catch((err) => {
      if (err && err.name === 'NotAllowedError') return; // autoplay blocked before the first tap
      serverAudio = false;
      browserSpeak(text, role);
    });
  };
  const canSpeak = serverAudio || !!speech;
  const SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  const audioButton = (text, role, size = '') =>
    canSpeak ? h('button', { type: 'button', class: `lp-audio ${size}`, 'aria-label': S.play, html: SPEAKER, onclick: (e) => { replay(e.currentTarget, 'is-pulse'); speak(text, role); } }) : null;

  // ---------- state ----------
  let steps = L.exercises || [];
  let scored = steps.filter((s) => s.t !== 'intro').length;
  let index = 0;
  let correct = 0;
  let combo = 0;
  let current = null;
  let phase = 'answer';
  let startedAt = Date.now();

  const setProgress = () => {
    const pct = Math.round((index / steps.length) * 100);
    progress.firstElementChild.style.width = Math.max(pct, 2) + '%';
    progress.setAttribute('aria-valuenow', String(pct));
  };
  const setPrimary = (label, enabled, tone = '') => {
    primary.textContent = label;
    primary.disabled = !enabled;
    primary.className = `lp-cta ${tone ? 'lp-cta--' + tone : ''}`;
  };
  const resetSheet = () => {
    feedback.hidden = true;
    sheet.classList.remove('is-right', 'is-wrong');
  };
  const showFeedback = (ok, answer, note) => {
    sheet.classList.add(ok ? 'is-right' : 'is-wrong');
    $('[data-feedback-icon]').innerHTML = ok
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    $('[data-feedback-title]').textContent = ok ? pick(S.praise) : S.correctAnswer;
    $('[data-feedback-text]').textContent = ok ? (note || '') : (note || answer);
    feedback.hidden = false;
    replay(sheet, 'is-enter');
  };
  const pick = (list) => (Array.isArray(list) ? list[Math.floor(Math.random() * list.length)] : list);

  function registerResult(ok) {
    if (ok) {
      correct++;
      combo++;
      sfx(combo >= 3 && [3, 5, 8, 12].includes(combo) ? 'combo' : 'correct');
    } else {
      combo = 0;
      sfx('wrong');
    }
    comboBadge.hidden = combo < 2;
    $('[data-combo-count]').textContent = String(combo);
    if (combo >= 2) replay(comboBadge, 'is-bump');
  }

  // ---------- building blocks ----------
  const heading = (text) => h('h1', { class: 'lp-heading' }, text);
  // A character (or Hablena) with a speech bubble. Characters show their name under the avatar.
  const say = (role, ...content) => {
    const who = SPEAKERS[role];
    const avatar = who?.svg
      ? h('div', { class: 'lp-say__mascot lp-say__mascot--person' }, h('div', { class: `lp-say__face lp-say__face--${role}`, html: who.svg }), h('span', { class: 'lp-say__name' }, who.name))
      : h('div', { class: 'lp-say__mascot', html: MASCOT });
    return h('div', { class: 'lp-say' }, avatar, h('div', { class: 'lp-bubble' }, ...content));
  };

  function optionList(options, answer, { lang, onPick, layout = 'grid' }) {
    let picked = null;
    const buttons = options.map((text, i) =>
      h('button', {
        type: 'button', class: 'lp-opt', lang, 'data-key': String(i + 1), 'data-value': text,
        onclick: () => {
          if (phase !== 'answer') return;
          buttons.forEach((b) => b.classList.remove('is-picked'));
          buttons[i].classList.add('is-picked');
          picked = text;
          sfx('tap');
          onPick?.(text);
          setPrimary(S.check, true);
        },
      }, h('span', { class: 'lp-opt__key', 'aria-hidden': 'true' }, String(i + 1)), h('span', { class: 'lp-opt__text' }, text)));
    const wrap = h('div', { class: `lp-opts lp-opts--${layout}`, role: 'group' }, buttons);
    return {
      el: wrap,
      evaluate: () => {
        const ok = picked === answer;
        buttons.forEach((b) => {
          b.disabled = true;
          if (b.dataset.value === answer) b.classList.add('is-right');
          else if (b.classList.contains('is-picked')) b.classList.add('is-wrong');
        });
        if (!ok) replay(wrap, 'is-shake');
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
        return h('div', { class: 'lp-card' },
          audioButton(v.es, step.s),
          h('div', { class: 'lp-card__text' }, h('span', { class: 'lp-card__es', lang: 'es' }, v.es), h('span', { class: 'lp-card__tr' }, v.tr)));
      });
      stage.append(h('span', { class: 'lp-badge' }, step.v.length > 1 ? S.newWords : S.newWord), heading(S.introHeading), h('div', { class: 'lp-cards' }, cards));
      if (canSpeak) setTimeout(() => speak(L.vocab[step.v[0]].es, step.s), 300);
      return { intro: true };
    },
    choice(step) {
      const v = L.vocab[step.v];
      stage.append(heading(S.chooseTranslation), say(step.s, audioButton(v.es, step.s), h('span', { class: 'lp-bubble__text', lang: 'es' }, v.es)));
      const list = optionList(shuffle([v.tr, ...distractors(v.tr, 'tr')]), v.tr, {});
      stage.append(list.el);
      if (canSpeak) setTimeout(() => speak(v.es, step.s), 300);
      return list;
    },
    reverse(step) {
      const v = L.vocab[step.v];
      stage.append(heading(S.chooseSpanish), say(step.s, h('span', { class: 'lp-bubble__text' }, v.tr)));
      const list = optionList(shuffle([v.es, ...distractors(v.es, 'es')]), v.es, { lang: 'es', onPick: (t) => speak(t, step.s) });
      stage.append(list.el);
      return list;
    },
    listen(step) {
      const v = L.vocab[step.v];
      const reveal = h('button', { type: 'button', class: 'lp-link', onclick: (e) => e.currentTarget.replaceWith(h('span', { class: 'lp-reveal', lang: 'es' }, v.es)) }, S.noAudio);
      stage.append(heading(S.whatDidYouHear), say(step.s, h('div', { class: 'lp-listen' }, audioButton(v.es, step.s, 'lp-audio--xl'), reveal)));
      const list = optionList(shuffle([v.es, ...distractors(v.es, 'es')]), v.es, { lang: 'es' });
      stage.append(list.el);
      if (canSpeak) setTimeout(() => speak(v.es, step.s), 350);
      return list;
    },
    gap(step) {
      const blank = h('span', { class: 'lp-blank' }, ' ');
      const [before, after] = step.es.split('___');
      const full = step.es.replace('___', step.answer);
      stage.append(heading(S.fillGap), say(step.s, h('span', { class: 'lp-bubble__text', lang: 'es' }, before, blank, after), h('span', { class: 'lp-bubble__tr' }, step.tr)));
      const list = optionList(shuffle(step.options), step.answer, {
        lang: 'es', layout: 'row',
        onPick: (t) => { blank.textContent = t; blank.classList.add('is-filled'); },
      });
      stage.append(list.el);
      const evaluate = list.evaluate;
      list.evaluate = () => { const r = evaluate(); blank.textContent = step.answer; speak(full, step.s); return { ...r, answer: full }; };
      return list;
    },
    build(step) {
      const target = words(step.es);
      const tiles = shuffle([...target, ...(step.extra || [])]);
      const answerRow = h('div', { class: 'lp-build__answer', 'aria-label': S.yourAnswer });
      const pool = h('div', { class: 'lp-build__pool' });
      const chosen = [];
      tiles.forEach((word) => {
        const slot = h('span', { class: 'lp-slot' });
        const tile = h('button', { type: 'button', class: 'lp-tile', lang: 'es' }, word);
        slot.append(tile);
        tile.addEventListener('click', () => {
          if (phase !== 'answer') return;
          sfx('tap');
          if (tile.parentElement === slot) { answerRow.append(tile); chosen.push(tile); speak(word, step.s); }
          else { slot.append(tile); chosen.splice(chosen.indexOf(tile), 1); }
          setPrimary(S.check, chosen.length > 0);
        });
        pool.append(slot);
      });
      stage.append(heading(S.buildSentence), say(step.s, h('span', { class: 'lp-bubble__text' }, step.tr)), h('div', { class: 'lp-build' }, answerRow, pool));
      return {
        evaluate: () => {
          const ok = norm(chosen.map((t) => t.textContent).join(' ')) === norm(step.es);
          stage.querySelectorAll('.lp-tile').forEach((t) => { t.disabled = true; });
          answerRow.classList.add(ok ? 'is-right' : 'is-wrong');
          if (!ok) replay(answerRow, 'is-shake');
          speak(step.es, step.s);
          return { ok, answer: step.es };
        },
      };
    },
    // Write the Spanish yourself. Accents and one-letter typos count as right, with a hint.
    type(step) {
      const target = step.es || L.vocab[step.v].es;
      const prompt = step.tr || L.vocab[step.v].tr;
      const accepted = [target, ...(step.alt || [])];
      const input = h('textarea', {
        class: 'lp-input', lang: 'es', rows: '3', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
        'aria-label': S.yourAnswer, placeholder: S.typePlaceholder,
      });
      input.addEventListener('input', () => setPrimary(S.check, phase === 'answer' && input.value.trim().length > 0));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); if (!primary.disabled) primary.click(); }
      });
      const keys = h('div', { class: 'lp-keys', role: 'group', 'aria-label': S.specialChars },
        ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡'].map((ch) => h('button', {
          type: 'button', class: 'lp-key', lang: 'es',
          onmousedown: (e) => e.preventDefault(),
          onclick: () => {
            if (input.disabled) return;
            const { selectionStart: a, selectionEnd: b, value } = input;
            input.value = value.slice(0, a) + ch + value.slice(b);
            input.selectionStart = input.selectionEnd = a + 1;
            input.focus();
            input.dispatchEvent(new Event('input'));
          },
        }, ch)));
      stage.append(heading(S.typeSpanish), say(step.s, h('span', { class: 'lp-bubble__text' }, prompt)), input, keys);
      setTimeout(() => input.focus({ preventScroll: true }), 50);
      return {
        evaluate: () => {
          const given = norm(input.value);
          let ok = accepted.some((a) => norm(a) === given);
          let note = '';
          if (!ok && accepted.some((a) => fold(norm(a)) === fold(given))) { ok = true; note = S.accentNote.replace('{answer}', target); }
          if (!ok && target.length >= 5 && accepted.some((a) => editDistance(fold(norm(a)), fold(given)) <= 1)) { ok = true; note = S.typoNote.replace('{answer}', target); }
          const bare = (x) => x.replace(/^(el|la|los|las|un|una) /, '');
          if (!ok && accepted.some((a) => bare(fold(norm(a))) !== fold(norm(a)) && bare(fold(norm(a))) === fold(given))) { ok = true; note = S.articleNote.replace('{answer}', target); }
          input.disabled = true;
          keys.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          input.classList.add(ok ? 'is-right' : 'is-wrong');
          if (!ok) replay(input, 'is-shake');
          speak(target, step.s);
          return { ok, answer: target, note };
        },
      };
    },
    // A character says something; pick the best reply. The chosen reply appears as your message.
    dialogue(step) {
      const tr = h('span', { class: 'lp-bubble__tr', hidden: true }, step.line.tr);
      const toggle = h('button', { type: 'button', class: 'lp-link lp-link--inline', onclick: (e) => { tr.hidden = false; e.currentTarget.remove(); } }, S.showTranslation);
      const thread = h('div', { class: 'lp-chat' },
        say(step.s, audioButton(step.line.es, step.s), h('span', { class: 'lp-bubble__text', lang: 'es' }, step.line.es), tr, toggle));
      stage.append(heading(S.dialogueHeading), thread);
      const list = optionList(shuffle(step.options), step.answer, { lang: 'es', layout: 'stack' });
      stage.append(list.el);
      if (canSpeak) setTimeout(() => speak(step.line.es, step.s), 300);
      const evaluate = list.evaluate;
      list.evaluate = () => {
        const r = evaluate();
        thread.append(h('div', { class: 'lp-chat__me' }, h('span', { class: 'lp-chat__who' }, S.you), h('div', { class: 'lp-chat__bubble', lang: 'es' }, step.answer)));
        speak(step.answer, 'hablena');
        return r;
      };
      return list;
    },
    match(step) {
      const items = step.v.map((i) => L.vocab[i]);
      let selected = null;
      let mistakes = 0;
      let matched = 0;
      const api = { auto: true };
      const mk = (text, side, key, lang) => h('button', { type: 'button', class: 'lp-match__item', 'data-key': key, 'data-side': side, lang }, text);
      const left = shuffle(items).map((v) => mk(v.es, 'es', v.es, 'es'));
      const right = shuffle(items).map((v) => mk(v.tr, 'tr', v.es));
      const onClick = (btn) => {
        if (btn.disabled) return;
        if (!selected || selected.dataset.side === btn.dataset.side) {
          if (selected) selected.classList.remove('is-picked');
          selected = btn;
          btn.classList.add('is-picked');
          sfx('tap');
          if (btn.dataset.side === 'es') speak(btn.textContent, step.s);
          return;
        }
        if (selected.dataset.key === btn.dataset.key) {
          const pair = [selected, btn];
          pair.forEach((b) => { b.classList.remove('is-picked'); b.classList.add('is-matched'); b.disabled = true; });
          setTimeout(() => pair.forEach((b) => b.classList.add('is-gone')), 450);
          matched++;
          sfx('tap');
          if (matched === items.length) setTimeout(() => api.onDone?.(mistakes === 0), 300);
        } else {
          mistakes++;
          sfx('wrong');
          const pair = [selected, btn];
          pair.forEach((b) => { b.classList.remove('is-picked'); replay(b, 'is-error'); });
          setTimeout(() => pair.forEach((b) => b.classList.remove('is-error')), 500);
        }
        selected = null;
      };
      [...left, ...right].forEach((b) => b.addEventListener('click', () => onClick(b)));
      stage.append(heading(S.matchPairs), h('div', { class: 'lp-match' }, h('div', { class: 'lp-match__col' }, left), h('div', { class: 'lp-match__col' }, right)));
      return api;
    },
  };

  // ---------- flow ----------
  function preloadStep(step) {
    const refs = Array.isArray(step.v) ? step.v : step.v === undefined ? [] : [step.v];
    const texts = refs.map((i) => L.vocab[i].es);
    if (step.t === 'gap') texts.push(step.es.replace('___', step.answer));
    if (step.t === 'build') texts.push(step.es, ...words(step.es), ...(step.extra || []));
    if (step.t === 'type' && step.es) texts.push(step.es);
    if (step.t === 'dialogue') { texts.push(step.line.es); clip(step.answer, 'hablena'); }
    texts.forEach((t) => clip(t, step.s));
  }

  function show(i) {
    index = i;
    phase = 'answer';
    stage.innerHTML = '';
    resetSheet();
    setProgress();
    const step = steps[i];
    root.dataset.step = String(i);
    root.__steps = steps; // read by the end-to-end tests
    root.__vocab = L.vocab;
    preloadStep(step);
    if (steps[i + 1]) preloadStep(steps[i + 1]);
    current = render[step.t](step);
    replay(stage, 'is-enter');
    primary.hidden = false;
    if (current.intro) setPrimary(S.continue, true, 'red');
    else if (current.auto) {
      primary.hidden = true;
      current.onDone = (ok) => {
        registerResult(ok);
        phase = 'feedback';
        showFeedback(ok, '', ok ? '' : S.matchMistakes);
        if (!ok) $('[data-feedback-title]').textContent = S.almost;
        primary.hidden = false;
        setPrimary(S.continue, true, ok ? 'green' : 'red');
        primary.focus();
      };
    } else setPrimary(S.check, false);
  }

  function next() {
    if (index + 1 < steps.length) show(index + 1);
    else finish();
  }

  primary.addEventListener('click', () => {
    if (primary.disabled) return;
    if (current.intro || phase === 'feedback') return next();
    const { ok, answer, note } = current.evaluate();
    registerResult(ok);
    phase = 'feedback';
    showFeedback(ok, answer, note);
    setPrimary(S.continue, true, ok ? 'green' : 'red');
  });

  document.addEventListener('keydown', (e) => {
    if (!done.hidden || e.target?.tagName === 'TEXTAREA') return;
    if (e.key === 'Enter' && !primary.disabled && !primary.hidden && document.activeElement?.tagName !== 'BUTTON') { e.preventDefault(); primary.click(); }
    if (/^[1-4]$/.test(e.key) && phase === 'answer') stage.querySelector(`.lp-opt[data-key="${e.key}"]`)?.click();
  });

  // Mute toggle for sound effects
  const muteBtn = $('[data-mute]');
  const syncMute = () => {
    const m = !!window.HablenaSfx?.muted;
    muteBtn.classList.toggle('is-muted', m);
    muteBtn.setAttribute('aria-pressed', String(m));
    muteBtn.setAttribute('aria-label', m ? muteBtn.dataset.labelUnmute : muteBtn.dataset.labelMute);
  };
  muteBtn.addEventListener('click', () => { window.HablenaSfx?.toggle(); syncMute(); });
  window.addEventListener('load', syncMute);

  // ---------- finish ----------
  const countUp = (el, to, ms = 900) => {
    if (reduceMotion) { el.textContent = String(to); return; }
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  function confetti() {
    if (reduceMotion) return;
    const canvas = $('[data-confetti]');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr);
    const colors = ['#C8102E', '#FFC400', '#0A1633', '#2FA35F', '#1E6BD6'];
    const parts = Array.from({ length: 140 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * 120, y: H * 0.32,
      vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 12 - 4,
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    const t0 = performance.now();
    const frame = (t) => {
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      }
      if (t - t0 < 3200) requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
    };
    requestAnimationFrame(frame);
  }

  const localToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  async function finish() {
    index = steps.length;
    setProgress();
    stage.hidden = true;
    sheet.hidden = true;
    done.hidden = false;
    comboBadge.hidden = true;
    sfx('complete');
    confetti();

    const accuracy = Math.round((correct / scored) * 100);
    const secs = Math.round((Date.now() - startedAt) / 1000);
    $('[data-done-title]').textContent = accuracy === 100 ? S.perfect : S.wellDone;
    $('[data-stat-time]').textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    countUp($('[data-stat-acc]'), accuracy);
    const localXp = 5 + Math.round((10 * correct) / scored);
    countUp($('[data-stat-xp]'), localXp);

    const note = $('[data-save-note]');
    try {
      const res = await fetch('/api/progress', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: L.id, correct, total: scored, today: localToday() }),
      });
      if (res.status === 401) {
        note.innerHTML = '';
        note.append(S.loginToSave + ' ', h('a', { href: root.dataset.login }, S.loginLink));
        note.hidden = false;
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.streak) {
        $('[data-streak-text]').textContent = S.streakDays.replace('{n}', data.streak);
        $('[data-streak]').hidden = false;
      }
    } catch {
      note.textContent = S.saveFailed;
      note.hidden = false;
    }
  }

  // ---------- practice mode: a fresh mixed review from the lessons you have finished ----------
  async function buildPractice() {
    let doneIds = [];
    try {
      const res = await fetch('/api/progress', { credentials: 'same-origin' });
      if (res.ok) doneIds = (await res.json()).progress.map((p) => p.lessonId);
    } catch {}
    let pool = L.pool.filter((v) => doneIds.includes(v.lesson));
    if (pool.length < 8) pool = L.pool.filter((v) => v.lesson === L.pool[0].lesson);
    const chosen = shuffle(pool).slice(0, 12);
    L.vocab = chosen.map(({ es, tr }) => ({ es, tr }));
    const typeable = (v) => !/[,…]/.test(v.es);
    const order = ['choice', 'listen', 'reverse', 'type', 'choice', 'match', 'listen', 'type', 'reverse', 'choice'];
    let k = 0;
    const exercises = [];
    for (const t of order) {
      if (t === 'match') {
        const seen = new Set();
        const four = [];
        L.vocab.forEach((v, i) => { if (four.length < 4 && !seen.has(v.tr)) { seen.add(v.tr); four.push(i); } });
        if (four.length === 4) exercises.push({ t: 'match', v: four, s: 'hablena' });
        continue;
      }
      let i = k++ % L.vocab.length;
      if (t === 'type') {
        const j = L.vocab.findIndex((v, n) => n >= i && typeable(v));
        if (j < 0) continue;
        i = j;
      }
      exercises.push({ t, v: i, s: 'hablena' });
    }
    steps = exercises;
    scored = steps.length;
  }

  $('[data-restart]').addEventListener('click', async () => {
    if (L.mode === 'practice') await buildPractice();
    correct = 0;
    combo = 0;
    startedAt = Date.now();
    done.hidden = true;
    stage.hidden = false;
    sheet.hidden = false;
    $('[data-streak]').hidden = true;
    show(0);
  });

  stage.setAttribute('tabindex', '-1');
  if (L.mode === 'practice') buildPractice().then(() => { startedAt = Date.now(); show(0); });
  else show(0);
})();
