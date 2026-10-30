(function () {
  'use strict';
  const { $, anim, wait, lerp, mix, svg, esc } = Lab;
  const SALTS = [
    {
      k: 'li',
      salt: 'كلوريد الليثيوم',
      metal: 'الليثيوم',
      sym: 'Li',
      color: '#e11d48',
      cname: 'أحمر قرمزي',
      solid: '#f8fafc'
    },
    {
      k: 'na',
      salt: 'كلوريد الصوديوم',
      metal: 'الصوديوم',
      sym: 'Na',
      color: '#fbbf24',
      cname: 'أصفر برتقالي',
      solid: '#f8fafc'
    },
    {
      k: 'k',
      salt: 'كلوريد البوتاسيوم',
      metal: 'البوتاسيوم',
      sym: 'K',
      color: '#c084fc',
      cname: 'بنفسجي فاتح (ليلكي)',
      solid: '#f8fafc'
    },
    {
      k: 'ca',
      salt: 'كلوريد الكالسيوم',
      metal: 'الكالسيوم',
      sym: 'Ca',
      color: '#f97316',
      cname: 'أحمر طوبي (برتقالي محمر)',
      solid: '#f1f5f9'
    },
    {
      k: 'cu',
      salt: 'كلوريد النحاس (II)',
      metal: 'النحاس',
      sym: 'Cu',
      color: '#2dd4bf',
      cname: 'أخضر مزرق',
      solid: '#5eead4'
    }
  ];
  const BLUE = '#3b82f6';
  const cap = $('caption'),
    wire = $('wire'),
    loop = $('loopSalt'),
    fo = $('flameOut'),
    gl = $('glowC');
  const POS = { home: [480, 220], acid: [588, 312], flame: [160, 200], unknown: [237, 318] };
  SALTS.forEach((s, i) => {
    const x = 290 + i * 55;
    POS[s.k] = [x, 318];
    const g = svg('g', {}, $('samples'));
    svg(
      'path',
      {
        d: `M${x - 22} 326 Q${x} 342 ${x + 22} 326`,
        fill: 'url(#glass)',
        stroke: '#d6f6ff',
        'stroke-opacity': 0.8,
        'stroke-width': 2.2
      },
      g
    );
    svg('ellipse', { cx: x, cy: 329, rx: 13, ry: 4, fill: s.solid }, g);
    const t = svg(
      'text',
      { x, y: 362, 'font-size': 13, fill: '#e2f3ff', 'text-anchor': 'middle', 'font-weight': 700, direction: 'ltr' },
      g
    );
    t.textContent = s.sym;
    const t2 = svg('text', { x, y: 378, 'font-size': 11, fill: '#9fc3d3', 'text-anchor': 'middle' }, g);
    t2.textContent = s.metal.replace('ال', '');
  });
  (function () {
    const x = 237,
      g = svg('g', {}, $('samples'));
    svg(
      'path',
      {
        d: `M${x - 22} 326 Q${x} 342 ${x + 22} 326`,
        fill: 'url(#glass)',
        stroke: '#fde68a',
        'stroke-opacity': 0.9,
        'stroke-width': 2.2
      },
      g
    );
    svg('ellipse', { cx: x, cy: 329, rx: 13, ry: 4, fill: '#f8fafc' }, g);
    const t = svg(
      'text',
      { x, y: 362, 'font-size': 15, fill: '#fde68a', 'text-anchor': 'middle', 'font-weight': 800 },
      g
    );
    t.textContent = '؟';
    const t2 = svg('text', { x, y: 378, 'font-size': 11, fill: '#fde68a', 'text-anchor': 'middle' }, g);
    t2.textContent = 'مجهولة';
  })();

  let w = { x: 480, y: 220 },
    flameColor = BLUE,
    sel = null,
    tested = new Map(),
    unknown = null,
    lastColor = '#fbbf24';
  const picks = $('picks');
  picks.innerHTML = SALTS.map(s => `<button class="btn pick" data-k="${s.k}">${esc(s.salt)}</button>`).join('');
  picks.querySelectorAll('button').forEach(b =>
    b.addEventListener('click', () => {
      sel = b.dataset.k;
      picks.querySelectorAll('button').forEach(x => x.classList.toggle('sel', x === b));
    })
  );
  const salt = k => SALTS.find(s => s.k === k);

  async function moveTo(name, ms) {
    const [x, y] = POS[name],
      a = { ...w };
    await anim(ms || 700, t => {
      w = { x: lerp(a.x, x, t), y: lerp(a.y, y, t) - Math.sin(t * Math.PI) * 40 };
      wire.setAttribute('transform', `translate(${w.x},${w.y})`);
    });
  }
  async function setFlame(c) {
    const a = flameColor;
    flameColor = c;
    const on = c !== BLUE;
    await anim(600, t => {
      fo.setAttribute('fill', mix(a, c, t));
      fo.setAttribute('opacity', on ? lerp(0.55, 0.92, t) : lerp(0.92, 0.55, t));
      gl.setAttribute('fill', mix(a, c, t));
      gl.setAttribute('opacity', on ? lerp(0.12, 0.55, t) : lerp(0.55, 0.12, t));
    });
  }
  async function clean() {
    loop.setAttribute('opacity', 0);
    await setFlame(BLUE);
    await moveTo('acid', 650);
    await wait(250);
  }
  async function test(k, where) {
    const s = salt(k);
    cap.textContent = 'تنظيف السلك بالحمض…';
    await clean();
    cap.textContent = where === 'unknown' ? 'غمس السلك في العيّنة المجهولة…' : `غمس السلك في ${s.salt}…`;
    await moveTo(where || k, 700);
    loop.setAttribute('fill', s.solid);
    loop.setAttribute('opacity', 1);
    await wait(250);
    cap.textContent = 'وضع السلك في اللهب…';
    await moveTo('flame', 800);
    await setFlame(s.color);
    lastColor = s.color;
    cap.textContent = where === 'unknown' ? 'ما لون اللهب؟' : `لهب ${s.metal}: ${s.cname}`;
    await wait(1300);
    await moveTo('home', 700);
  }
  function table() {
    return (
      '<table class="res">' +
      [...tested.keys()]
        .map(k => {
          const s = salt(k);
          return `<tr><td>${esc(s.salt)}</td><td><span class="sw" style="background:${s.color}"></span>${esc(s.cname)}</td></tr>`;
        })
        .join('') +
      '</table>'
    );
  }

  Lab.steps(
    [
      {
        title: 'نظّف سلك الاختبار',
        text: 'اغمسه في الحمض ثم ضعه في اللهب.',
        btn: '🧼 نظّف السلك',
        run: async () => {
          cap.textContent = 'تنظيف السلك بالحمض…';
          await moveTo('acid', 800);
          await wait(400);
          cap.textContent = 'السلك النظيف في اللهب…';
          await moveTo('flame', 900);
          await wait(1100);
          await moveTo('home', 700);
          cap.textContent = 'اللهب بقي أزرق';
          return '<b>ملاحظة:</b> بقي اللهب <b>أزرق</b>؛ السلك نظيف ولا توجد عليه مادة تلوّن اللهب.<br>الآن اختر عيّنة من الأزرار في الأعلى.';
        }
      },
      {
        title: 'اختبر ثلاث عيّنات على الأقل',
        text: 'اختر عيّنة من الأعلى ثم اضغط زر الاختبار.',
        btn: '🔥 اختبر العيّنة المختارة',
        run: async () => {
          if (!sel) return { stay: true, html: '👆 اختر عيّنة أولًا من أزرار «العيّنة» في أعلى اللوحة.' };
          await test(sel);
          tested.set(sel, true);
          if (tested.size < 3)
            return { stay: true, html: `<b>نتائجك (${tested.size}/3):</b>${table()}<br>اختر عيّنة أخرى واختبرها.` };
          return `<b>جدول النتائج:</b>${table()}<br>لكل فلز لون لهب مميّز يساعدنا على التعرّف عليه.`;
        }
      },
      {
        title: 'لماذا يتلوّن اللهب؟',
        text: 'شاهد ما يحدث للإلكترونات.',
        btn: '⚛️ فسّر الألوان',
        run: async () => {
          const lv = $('levels'),
            e = $('elec'),
            ph = $('photon');
          await anim(500, t => lv.setAttribute('opacity', t));
          cap.textContent = 'الإلكترون يكتسب طاقة من اللهب…';
          e.setAttribute('fill', '#38bdf8');
          await anim(1100, t => e.setAttribute('cy', lerp(118, 46, t)));
          await wait(500);
          cap.textContent = '…ثم يعود ويُطلق الطاقة ضوءًا ملوّنًا';
          ph.setAttribute('stroke', lastColor);
          await anim(1100, t => {
            e.setAttribute('cy', lerp(46, 118, t));
          });
          await anim(1300, (t, raw) => {
            let d = 'M118 104';
            for (let x = 0; x <= 72 * raw; x += 2) d += ` L${118 + x} ${104 + Math.sin(x / 4) * 7}`;
            ph.setAttribute('d', d);
            ph.setAttribute('opacity', 1 - raw * 0.2);
          });
          return '<b>التفسير:</b> عند التسخين تكتسب الإلكترونات طاقة <b>فتنتقل إلى مستوى طاقة أعلى</b>، ثم تعود إلى مستواها الأصلي <b>وتُطلق الطاقة على شكل ضوء</b> له لون محدّد.<br>ترتيب الإلكترونات يختلف من عنصر إلى آخر، لذلك يختلف اللون — وهذا ما يحدث في <b>الألعاب النارية</b> و<b>الشفق القطبي</b>.';
        }
      },
      {
        title: 'تعرّف على العيّنة المجهولة',
        text: 'اختبرها، ثم اختر اسم الملح من الأعلى وتحقّق.',
        btn: '🔍 اختبر العيّنة المجهولة',
        run: async () => {
          const act = $('act');
          if (!unknown) {
            unknown = SALTS[Math.floor(Math.random() * SALTS.length)].k;
            sel = null;
            picks.querySelectorAll('button').forEach(x => x.classList.remove('sel'));
            await test(unknown, 'unknown');
            act.textContent = '✔️ تحقّق من إجابتك';
            return {
              stay: true,
              html: 'لاحظ لون اللهب، ثم <b>اختر اسم الملح</b> من أزرار «العيّنة» في الأعلى واضغط «تحقّق من إجابتك».'
            };
          }
          if (!sel) return { stay: true, html: '👆 اختر اسم الملح من أزرار «العيّنة» أولًا.' };
          if (sel !== unknown)
            return {
              stay: true,
              html: `❌ ليست الإجابة الصحيحة. لون لهب ${esc(salt(sel).metal)} ${esc(salt(sel).cname)}، أما لهب العيّنة المجهولة فلونه مختلف. قارنه بجدول نتائجك وحاول مرة أخرى.`
            };
          const s = salt(unknown);
          cap.textContent = `العيّنة: ${s.salt}`;
          return `✅ <b>أحسنت!</b> العيّنة المجهولة هي <b>${esc(s.salt)}</b>، لأن لون لهبها <b>${esc(s.cname)}</b>.`;
        }
      }
    ],
    {
      intro: 'اضغط الزر الأخضر لبدء التجربة خطوة بخطوة.',
      quiz: [
        {
          q: 'ما لون لهب أملاح الصوديوم؟',
          opts: ['أخضر مزرق', 'أصفر برتقالي', 'بنفسجي فاتح', 'أحمر قرمزي'],
          correct: 1,
          why: 'أملاح الصوديوم تعطي لهبًا أصفر برتقاليًا مميّزًا.'
        },
        {
          q: 'لماذا يظهر لون في اللهب؟',
          opts: [
            'لأن البروتونات تخرج من النواة',
            'لأن الإلكترونات تعود من مستوى طاقة أعلى وتُطلق الطاقة ضوءًا',
            'لأن الملح يحترق ويختفي',
            'لأن النيوترونات تكتسب طاقة'
          ],
          correct: 1,
          why: 'الإلكترونات تكتسب طاقة فتنتقل لمستوى أعلى، ثم تعود وتطلق الطاقة ضوءًا.'
        },
        {
          q: 'لماذا يُنظَّف السلك بالحمض قبل كل عيّنة؟',
          opts: [
            'لزيادة حرارة اللهب',
            'لإزالة بقايا العيّنة السابقة حتى لا تغيّر لون اللهب',
            'ليصبح لون اللهب أصفر',
            'لتبريد السلك فقط'
          ],
          correct: 1,
          why: 'بقايا عيّنة سابقة تخلط الألوان وتعطي نتيجة خاطئة.'
        }
      ]
    }
  );
})();
