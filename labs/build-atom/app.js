(function () {
  'use strict';
  const { $, svg, wait } = Lab;
  const EL = [
    null,
    ['هيدروجين', 'H'],
    ['هيليوم', 'He'],
    ['ليثيوم', 'Li'],
    ['بيريليوم', 'Be'],
    ['بورون', 'B'],
    ['كربون', 'C'],
    ['نيتروجين', 'N'],
    ['أكسجين', 'O'],
    ['فلور', 'F'],
    ['نيون', 'Ne'],
    ['صوديوم', 'Na'],
    ['ماغنيسيوم', 'Mg'],
    ['ألومنيوم', 'Al'],
    ['سيليكون', 'Si'],
    ['فوسفور', 'P'],
    ['كبريت', 'S'],
    ['كلور', 'Cl'],
    ['أرجون', 'Ar'],
    ['بوتاسيوم', 'K'],
    ['كالسيوم', 'Ca']
  ];
  const MAX = { p: 20, n: 24, e: 20 };
  const st = { p: 0, n: 0, e: 0 };
  const CX = 320,
    CY = 210,
    R = [56, 94, 132, 170],
    CAP = [2, 8, 8, 2];
  function config(e) {
    const out = [];
    let left = e;
    for (const c of CAP) {
      if (left <= 0) break;
      const k = Math.min(c, left);
      out.push(k);
      left -= k;
    }
    return out;
  }
  function drawNucleus() {
    const g = $('nucleus');
    g.innerHTML = '';
    const total = st.p + st.n;
    const order = [];
    // interleave protons and neutrons so the nucleus looks mixed
    let p = st.p,
      n = st.n;
    while (p || n) {
      if (p && (p >= n || !n)) {
        order.push('p');
        p--;
      }
      if (n) {
        order.push('n');
        n--;
      }
    }
    const rr = total > 30 ? 5.2 : 6.2,
      step = total > 30 ? 3.7 : 4.4;
    order.forEach((t, i) => {
      const r = step * Math.sqrt(i + 0.5),
        a = i * 2.39996;
      svg(
        'circle',
        {
          cx: CX + r * Math.cos(a),
          cy: CY + r * Math.sin(a),
          r: rr,
          fill: t === 'p' ? 'url(#pG)' : 'url(#nG)',
          stroke: '#0006',
          'stroke-width': 0.6
        },
        g
      );
    });
  }
  function drawElectrons() {
    const cfg = config(st.e);
    for (let s = 0; s < 4; s++) {
      const g = $('e' + (s + 1));
      g.innerHTML = '';
      const k = cfg[s] || 0;
      for (let j = 0; j < k; j++) {
        const a = (j / k) * Math.PI * 2 - Math.PI / 2 + s * 0.4;
        svg(
          'circle',
          {
            cx: CX + R[s] * Math.cos(a),
            cy: CY + R[s] * Math.sin(a),
            r: 6.5,
            fill: 'url(#eG)',
            stroke: '#e0f2fe',
            'stroke-width': 1
          },
          g
        );
      }
    }
  }
  function info() {
    ['p', 'n', 'e'].forEach(k => ($('n' + k).textContent = st[k]));
    const A = st.p + st.n,
      el = EL[st.p];
    $('zBig').textContent = st.p;
    $('aBig').textContent = A;
    $('nm').textContent = el ? (st.n ? `${el[0]}-${A}` : el[0]) : 'لا يوجد عنصر';
    $('sym').textContent = el ? el[1] : '';
    $('aTxt').textContent = el ? A : '';
    $('zTxt').textContent = el ? st.p : '';
    const q = st.p - st.e;
    $('chg').textContent = q === 0 ? '0' : q > 0 ? `+${q}` : `−${-q}`;
    $('chgT').textContent = !st.p && !st.e ? '' : q === 0 ? 'ذرّة متعادلة' : q > 0 ? 'أيون موجب' : 'أيون سالب';
    const cfg = config(st.e);
    $('cfg').textContent = cfg.length ? cfg.join('،') : '—';
    const outer = cfg[cfg.length - 1] || 0,
      full = (cfg.length === 1 && outer === 2) || (cfg.length > 1 && outer === 8);
    $('cfgT').textContent = st.e ? (full ? 'مستوى خارجي مكتمل (مستقر)' : `${outer} في المستوى الخارجي`) : '';
  }
  function render() {
    drawNucleus();
    drawElectrons();
    info();
  }
  document.querySelectorAll('#ctrl button').forEach(b =>
    b.addEventListener('click', () => {
      const k = b.dataset.k,
        d = +b.dataset.d;
      st[k] = Math.max(0, Math.min(MAX[k], st[k] + d));
      render();
    })
  );
  render();

  function mission(title, text, target, extra) {
    return {
      title,
      text,
      btn: '✔️ تحقّق من المهمة',
      run: async () => {
        const miss = [];
        if (st.p !== target.p) miss.push(`عدد <b>البروتونات</b> غير صحيح — ${extra.p}`);
        if (st.n !== target.n) miss.push(`عدد <b>النيوترونات</b> غير صحيح — ${extra.n}`);
        if (st.e !== target.e) miss.push(`عدد <b>الإلكترونات</b> غير صحيح — ${extra.e}`);
        if (miss.length) return { stay: true, html: '❌ لم تكتمل المهمة بعد:<br>• ' + miss.join('<br>• ') };
        const a = $('atom');
        a.classList.remove('flash');
        void a.getBBox();
        a.classList.add('flash');
        await wait(900);
        return '✅ <b>أحسنت!</b> ' + extra.ok;
      }
    };
  }
  Lab.steps(
    [
      mission(
        'ذرّة كربون-12 متعادلة',
        'العدد الذرّي للكربون 6.',
        { p: 6, n: 6, e: 6 },
        {
          p: 'العدد الذرّي للكربون 6.',
          n: 'النيوترونات = العدد الكتلي − العدد الذرّي = 12 − 6.',
          e: 'الذرّة المتعادلة: الإلكترونات = البروتونات.',
          ok: 'ذرّة الكربون-12: 6 بروتونات و6 نيوترونات و6 إلكترونات، وتركيبها الإلكتروني <b>2،4</b>.'
        }
      ),
      mission(
        'ذرّة صوديوم متعادلة (A = 23)',
        'العدد الذرّي للصوديوم 11.',
        { p: 11, n: 12, e: 11 },
        {
          p: 'العدد الذرّي للصوديوم 11.',
          n: 'احسب: 23 − 11.',
          e: 'في الذرّة المتعادلة عدد الإلكترونات يساوي عدد البروتونات.',
          ok: 'الصوديوم: 11 بروتونًا و12 نيوترونًا، وتركيبه الإلكتروني <b>2،8،1</b> — إلكترون واحد في المستوى الخارجي.'
        }
      ),
      mission(
        'ذرّة كلور-37',
        'العدد الذرّي للكلور 17.',
        { p: 17, n: 20, e: 17 },
        {
          p: 'العدد الذرّي للكلور 17.',
          n: 'احسب: 37 − 17.',
          e: 'الذرّة متعادلة.',
          ok: 'الكلور-37 فيه <b>20 نيوترونًا</b>، وتركيبه الإلكتروني <b>2،8،7</b>.'
        }
      ),
      mission(
        'نظير آخر: كلور-35',
        'غيّر عدد جسيم واحد فقط!',
        { p: 17, n: 18, e: 17 },
        {
          p: 'النظائر لها العدد نفسه من البروتونات.',
          n: 'كلور-35: 35 − 17.',
          e: 'النظائر لها العدد نفسه من الإلكترونات.',
          ok: 'غيّرنا <b>النيوترونات فقط</b> (20 ← 18). الكلور-35 والكلور-37 <b>نظيران</b>: العدد الذرّي نفسه وعدد كتلي مختلف، ولهما الخصائص الكيميائية نفسها لأن تركيبهما الإلكتروني واحد.'
        }
      ),
      mission(
        'ذرّة تركيبها الإلكتروني 2،8،8،2 (A = 40)',
        'اجمع الإلكترونات لتعرف العدد الذرّي.',
        { p: 20, n: 20, e: 20 },
        {
          p: '2 + 8 + 8 + 2 = ؟ وهذا هو العدد الذرّي.',
          n: 'احسب: 40 − العدد الذرّي.',
          e: 'وزّع الإلكترونات حتى يصبح التركيب 2،8،8،2.',
          ok: 'إنها ذرّة <b>الكالسيوم-40</b>: 20 بروتونًا و20 نيوترونًا و20 إلكترونًا.'
        }
      )
    ],
    {
      intro: 'استخدم أزرار <b>+</b> و<b>−</b> لبناء الذرّة المطلوبة في المهمة، ثم اضغط «تحقّق من المهمة».',
      quiz: [
        {
          q: 'ما الذي يحدّد نوع العنصر؟',
          opts: ['عدد النيوترونات', 'عدد البروتونات', 'العدد الكتلي', 'عدد مستويات الطاقة'],
          correct: 1,
          why: 'العدد الذرّي (عدد البروتونات) هو الذي يحدّد ماهية العنصر.'
        },
        {
          q: 'ذرّة فيها 8 بروتونات و8 نيوترونات و8 إلكترونات، تركيبها الإلكتروني:',
          opts: ['2،6', '8', '2،8', '4،4'],
          correct: 0,
          why: '8 إلكترونات: 2 في المستوى الأول و6 في الثاني.'
        },
        {
          q: 'إذا أضفنا نيوترونًا إلى نواة ذرّة، فإن:',
          opts: ['العنصر يتغيّر', 'العدد الكتلي يزيد بواحد', 'الشحنة تزيد بواحد', 'التركيب الإلكتروني يتغيّر'],
          correct: 1,
          why: 'النيوترون متعادل، فيزيد العدد الكتلي فقط وتتكوّن ذرّة نظير للعنصر نفسه.'
        }
      ]
    }
  );
})();
