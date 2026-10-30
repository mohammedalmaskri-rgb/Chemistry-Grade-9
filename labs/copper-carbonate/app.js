(function () {
  'use strict';
  const { $, anim, wait, lerp, mix, svg } = Lab;
  const cap = $('caption'),
    mass = $('mass'),
    green = $('green'),
    black = $('black'),
    lime = $('lime'),
    bub = $('bubbles'),
    flame = $('flame');
  const setRect = (el, h) => {
    el.setAttribute('y', 289 - h);
    el.setAttribute('height', h);
  };
  let bubbling = false;
  function bubbleLoop() {
    if (!bubbling) return;
    const b = svg(
      'circle',
      {
        cx: 440 + (Math.random() - 0.5) * 6,
        cy: 300,
        r: 2 + Math.random() * 2.5,
        fill: 'none',
        stroke: '#ffffff',
        'stroke-opacity': 0.85,
        'stroke-width': 1.3
      },
      bub
    );
    const x0 = +b.getAttribute('cx'),
      dx = (Math.random() - 0.5) * 26;
    anim(1300, (t, raw) => {
      b.setAttribute('cy', lerp(300, 254, raw));
      b.setAttribute('cx', x0 + dx * raw + Math.sin(raw * 9) * 2);
    }).then(() => b.remove());
    setTimeout(bubbleLoop, 120 + Math.random() * 140);
  }
  Lab.steps(
    [
      {
        title: 'ضع كربونات النحاس (II) في الأنبوب',
        text: 'مسحوق أخضر اللون، ثم سجّل كتلته.',
        btn: '🟢 ضع المسحوق وسجّل الكتلة',
        run: async () => {
          cap.textContent = 'كربونات النحاس (II) CuCO₃';
          await anim(1200, t => setRect(green, 45 * t));
          await anim(700, t => (mass.textContent = (5 * t).toFixed(2) + ' g'));
          return '<b>ملاحظة:</b> كربونات النحاس (II) مسحوق <b>أخضر</b>، وكتلته <b>5.00 g</b>.';
        }
      },
      {
        title: 'صِل أنبوب التوصيل بماء الجير',
        text: 'أغلق الأنبوب بسدادة وأنبوب توصيل يصل إلى كأس فيه ماء الجير.',
        btn: '🔗 صِل أنبوب التوصيل',
        run: async () => {
          const st = $('stopper'),
            d = $('delivery');
          await anim(700, t => {
            st.setAttribute('opacity', t);
            d.setAttribute('opacity', t);
            lime.setAttribute('opacity', t * 0.55);
          });
          cap.textContent = 'ماء الجير شفاف';
          return '<b>ملاحظة:</b> <b>ماء الجير</b> (محلول هيدروكسيد الكالسيوم) شفاف عديم اللون، ويُستخدم للكشف عن غاز ثاني أكسيد الكربون.';
        }
      },
      {
        title: 'سخّن الأنبوب',
        text: 'راقب لون المسحوق وماء الجير.',
        btn: '🔥 ابدأ التسخين',
        run: async () => {
          cap.textContent = 'التسخين…';
          await anim(500, t => flame.setAttribute('opacity', t));
          flame.classList.add('pulse');
          await wait(600);
          bubbling = true;
          bubbleLoop();
          await anim(6000, t => {
            const h = lerp(0, 45, t);
            setRect(black, h);
            setRect(green, 45);
            lime.setAttribute('fill', mix('#cdeefa', '#f4f6f8', Math.min(1, t * 1.2)));
            lime.setAttribute('opacity', lerp(0.55, 0.95, t));
          });
          cap.textContent = 'تحوّل المسحوق إلى الأسود وتعكّر ماء الجير';
          return '<b>ملاحظة:</b> تحوّل لون المسحوق من <b>الأخضر إلى الأسود</b>، وخرجت فقاعات غاز <b>عكّرت ماء الجير</b>؛ إذن الغاز الناتج هو <b>ثاني أكسيد الكربون</b>.<span class="eq">CuCO₃ → CuO + CO₂</span>';
        }
      },
      {
        title: 'اسحب أنبوب التوصيل ثم أوقف التسخين',
        text: 'بهذا الترتيب لمنع ارتداد ماء الجير.',
        btn: '⬆️ اسحب الأنبوب وأوقف التسخين',
        run: async () => {
          const p = $('dpath');
          await anim(900, t => p.setAttribute('d', `M200 132 V92 H440 V${lerp(300, 200, t)}`));
          bubbling = false;
          flame.classList.remove('pulse');
          await anim(600, t => flame.setAttribute('opacity', 1 - t));
          cap.textContent = 'توقف التسخين بأمان';
          return '<b>ملاحظة:</b> سحبنا أنبوب التوصيل من ماء الجير <b>قبل</b> إطفاء الموقد؛ لو أطفأناه أولًا لبرد الأنبوب وارتدّ ماء الجير البارد إلى الأنبوب الساخن.';
        }
      },
      {
        title: 'أعد وزن الناتج',
        text: 'قارن الكتلة قبل التسخين وبعده.',
        btn: '⚖️ أعد وزن الناتج',
        run: async () => {
          await anim(900, t => {
            setRect(black, lerp(45, 38, t));
            setRect(green, lerp(45, 38, t));
          });
          await anim(1600, t => (mass.textContent = lerp(5, 3.22, t).toFixed(2) + ' g'));
          cap.textContent = 'نقصت كتلة المادة إلى 3.22 g';
          return '<b>ملاحظة:</b> نقصت الكتلة من <b>5.00 g</b> إلى <b>3.22 g</b> لأن غاز ثاني أكسيد الكربون خرج من الأنبوب.<br>تجزّأ مركّب واحد إلى مادتين: أكسيد النحاس (II) الأسود وثاني أكسيد الكربون، وهذا تفاعل <b>تفكّك حراري</b>.';
        }
      }
    ],
    {
      intro: 'اضغط الزر الأخضر لبدء التجربة خطوة بخطوة.',
      quiz: [
        {
          q: 'ما نوع التفاعل الذي حدث عند تسخين كربونات النحاس (II)؟',
          opts: ['تكوين', 'تفكّك', 'ذوبان', 'تقطير'],
          correct: 1,
          why: 'تجزّأ مركّب واحد إلى مادتين أبسط منه بفعل الحرارة، فهو تفكّك حراري.'
        },
        {
          q: 'ما الغاز الذي عكّر ماء الجير؟',
          opts: ['الأكسجين', 'الهيدروجين', 'ثاني أكسيد الكربون', 'بخار الماء'],
          correct: 2,
          why: 'ثاني أكسيد الكربون هو الغاز الذي يعكّر ماء الجير.'
        },
        {
          q: 'لماذا نقصت كتلة المادة في الأنبوب بعد التسخين؟',
          opts: [
            'لأن النحاس تبخّر',
            'لأن غاز ثاني أكسيد الكربون خرج من الأنبوب',
            'لأن المسحوق احترق بالكامل',
            'لأن الميزان غير دقيق'
          ],
          correct: 1,
          why: 'جزء من المادة تحوّل إلى غاز خرج عبر أنبوب التوصيل، فبقي أكسيد النحاس (II) فقط.'
        },
        {
          q: 'لماذا نسحب أنبوب التوصيل من ماء الجير قبل إيقاف التسخين؟',
          opts: [
            'لتسريع التفاعل',
            'حتى لا يرتد ماء الجير إلى الأنبوب الساخن',
            'حتى يتعكّر ماء الجير أكثر',
            'لزيادة كتلة الناتج'
          ],
          correct: 1,
          why: 'عند تبريد الأنبوب يقل الضغط فيه فيُسحب ماء الجير إليه وقد ينكسر الأنبوب الساخن.'
        }
      ]
    }
  );
})();
