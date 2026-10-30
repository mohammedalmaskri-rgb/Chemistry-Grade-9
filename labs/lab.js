/* Rawafid virtual chemistry lab: step engine, animation helpers, closing quiz. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  // Run fn(progress 0..1) for ms milliseconds; resolves when done.
  function anim(ms, fn) {
    if (reduce) ms = Math.min(ms, 60);
    return new Promise(res => {
      const t0 = performance.now();
      function f(now) {
        const p = Math.min(1, (now - t0) / ms);
        fn(ease(p), p);
        if (p < 1) requestAnimationFrame(f);
        else res();
      }
      requestAnimationFrame(f);
    });
  }
  const wait = ms => new Promise(r => setTimeout(r, reduce ? 10 : ms));
  const lerp = (a, b, t) => a + (b - a) * t;
  function mix(c1, c2, t) {
    const h = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    const a = h(c1),
      b = h(c2);
    return (
      '#' +
      a
        .map((v, i) =>
          Math.round(lerp(v, b[i], t))
            .toString(16)
            .padStart(2, '0')
        )
        .join('')
    );
  }
  const NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function esc(s) {
    return String(s).replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  }

  function shuffleQ(q) {
    const idx = q.opts.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return { q: q.q, why: q.why, opts: idx.map(i => q.opts[i]), correct: idx.indexOf(q.correct) };
  }
  function quiz(items) {
    const box = $('quiz');
    if (!box || !items || !items.length) return;
    items = items.map(shuffleQ);
    let answered = 0,
      right = 0;
    box.innerHTML =
      '<h2>🧠 ماذا استنتجت؟</h2><p class="muted" style="margin:0;color:var(--muted)">أجب عن الأسئلة لتتأكد من فهمك للتجربة.</p>' +
      items
        .map(
          (q, i) =>
            `<div class="q" data-i="${i}"><p>${i + 1}) ${esc(q.q)}</p><div class="opts">${q.opts.map((o, j) => `<button class="btn" data-j="${j}">${esc(o)}</button>`).join('')}</div><div class="why hide"></div></div>`
        )
        .join('') +
      '<div class="score hide" id="quizScore"></div>';
    box.classList.remove('hide');
    box.querySelectorAll('.q').forEach(qe => {
      const q = items[+qe.dataset.i];
      qe.querySelectorAll('button').forEach(b =>
        b.addEventListener('click', () => {
          if (qe.dataset.done) return;
          qe.dataset.done = '1';
          answered++;
          const j = +b.dataset.j,
            ok = j === q.correct;
          if (ok) right++;
          b.classList.add(ok ? 'right' : 'wrong');
          qe.querySelector(`button[data-j="${q.correct}"]`).classList.add('right');
          qe.querySelectorAll('button').forEach(
            x => (x.disabled = x.classList.contains('right') || x === b ? false : true)
          );
          const w = qe.querySelector('.why');
          w.innerHTML = (ok ? '✅ إجابة صحيحة. ' : '❌ الإجابة الصحيحة موضحة باللون الأخضر. ') + esc(q.why || '');
          w.classList.remove('hide');
          if (answered === items.length) {
            const s = $('quizScore');
            s.textContent = `نتيجتك: ${right} من ${items.length} ${right === items.length ? '🌟 ممتاز!' : '— راجع التفسيرات ثم أعد التجربة إن أردت.'}`;
            s.classList.remove('hide');
          }
        })
      );
    });
  }

  // steps: [{title,text,btn,run:async()=>string|void}]  — run returns the observation HTML.
  function steps(list, opts) {
    opts = opts || {};
    const ol = $('steps'),
      act = $('act'),
      obs = $('obs');
    ol.innerHTML = list
      .map(s => `<li><div><b>${esc(s.title)}</b><span class="d">${esc(s.text || '')}</span></div></li>`)
      .join('');
    const lis = [...ol.children];
    let i = 0,
      busy = false;
    function show() {
      lis.forEach((li, k) => {
        li.classList.toggle('on', k === i);
        li.classList.toggle('done', k < i);
      });
      if (i < list.length) {
        act.textContent = list[i].btn;
        act.disabled = false;
      } else {
        act.textContent = '✅ اكتملت التجربة';
        act.disabled = true;
      }
    }
    act.addEventListener('click', async () => {
      if (busy || i >= list.length) return;
      busy = true;
      act.disabled = true;
      if (list[i].before) obs.innerHTML = list[i].before;
      let r;
      try {
        r = await list[i].run();
      } catch (e) {
        console.error(e);
      }
      if (r && typeof r === 'object' && r.stay) {
        obs.innerHTML = r.html || '';
        busy = false;
        act.disabled = false;
        return;
      }
      if (r) obs.innerHTML = r;
      i++;
      busy = false;
      show();
      if (i === list.length) {
        if (opts.done) opts.done();
        quiz(opts.quiz);
        setTimeout(() => {
          const q = $('quiz');
          if (q && !q.classList.contains('hide'))
            q.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        }, 700);
      }
    });
    show();
    if (opts.intro) obs.innerHTML = opts.intro;
  }
  function wireReset() {
    const r = $('reset');
    if (r) r.addEventListener('click', () => location.reload());
  }
  document.addEventListener('DOMContentLoaded', wireReset);
  window.Lab = { $, anim, wait, lerp, mix, svg, esc, steps, quiz };
})();
