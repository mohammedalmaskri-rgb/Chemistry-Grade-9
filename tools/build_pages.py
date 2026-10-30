# -*- coding: utf-8 -*-
"""يبني صفحات منصة روافد العلوم العامة (للتعريف وظهورها في محركات البحث).
usage: python3 build_pages.py <repo_dir> [instagram_url]"""
import json, os, sys, html

ROOT = sys.argv[1]
INSTAGRAM = sys.argv[2] if len(sys.argv) > 2 else ""
SITE = "https://rawafidedu.om"
NAME = "منصة روافد العلوم"
SCHOOL = "مدرسة الشيخ سعيد بن حمد الحارثي للبنين"

NAV = [("/about/", "عن المنصة"), ("/science-grade-7/", "علوم السابع"), ("/science-grade-8/", "علوم الثامن"),
       ("/chemistry-grade-9/", "كيمياء التاسع"), ("/physics-grade-9/", "فيزياء التاسع"),
       ("/biology-grade-9/", "أحياء التاسع"), ("/features/", "المزايا"), ("/faq/", "أسئلة شائعة")]

SUBJECTS = {
 "science-grade-7": dict(title="العلوم للصف السابع", subject="العلوم", grade="السابع", ic="🌱",
   units=["النبات والإنسان ككائنات حية", "حالات المادة", "الطاقة", "الخلايا والكائنات الحية", "الأرض", "الأرض وما حولها"],
   intro="مادة العلوم للصف السابع على منصة روافد العلوم: دروس منظمة حسب وحدات الكتاب، مع ملخصات وأسئلة وتجارب وألعاب تعليمية تساعد الطالب على فهم أساسيات علم الأحياء والمادة والطاقة وعلوم الأرض.",
   focus="يتعرّف طالب الصف السابع على الكائنات الحية والخلايا، وحالات المادة، وصور الطاقة، وكوكب الأرض وما حوله، فيبني أساسًا متينًا لمواد العلوم في الصفوف التالية."),
 "science-grade-8": dict(title="العلوم للصف الثامن", subject="العلوم", grade="الثامن", ic="🔭",
   units=["النباتات", "العناصر والمركبات", "الضوء", "الغذاء والهضم", "تغيرات المادة", "الحركة وعزم القوة"],
   intro="مادة العلوم للصف الثامن على منصة روافد العلوم: النباتات، والعناصر والمركبات، والضوء، والغذاء والهضم، وتغيرات المادة، والحركة وعزم القوة، مع ملخصات وأسئلة وتجارب لكل درس.",
   focus="يربط الصف الثامن بين الأحياء والكيمياء والفيزياء: كيف تتغذى النباتات، ومن أي شيء تتكون المواد، وكيف ينتشر الضوء، وكيف تتحرك الأجسام."),
 "chemistry-grade-9": dict(title="الكيمياء للصف التاسع", subject="الكيمياء", grade="التاسع", ic="⚗️",
   units=["طبيعة المادة", "التركيب الذري", "الجدول الدوري", "الروابط الكيميائية", "معدل سرعة التفاعل وتغيرات الطاقة"],
   intro="الكيمياء للصف التاسع على منصة روافد العلوم: طبيعة المادة، والتركيب الذري، والجدول الدوري، والروابط الكيميائية، ومعدل سرعة التفاعل، مع ملخصات وبنك أسئلة وتجارب افتراضية.",
   focus="يدرس طالب الصف التاسع في الكيمياء مكونات المادة من الذرة إلى المركبات، ويتعلم قراءة الجدول الدوري وفهم أنواع الروابط، وما يؤثر في سرعة التفاعلات الكيميائية."),
 "physics-grade-9": dict(title="الفيزياء للصف التاسع", subject="الفيزياء", grade="التاسع", ic="🧲",
   units=["الطول والزمن", "الحركة", "الكتلة والوزن", "الكثافة", "نموذج الحركة الجزيئية البسيطة للمادة",
          "المادة والخصائص الحرارية", "قياس درجة الحرارة", "الطاقة",
          "انتقال الطاقة: التوصيل والحمل الحراري والإشعاع", "التطبيقات والآثار المترتبة على نقل الطاقة الحرارية"],
   intro="الفيزياء للصف التاسع على منصة روافد العلوم: القياس والحركة، والكتلة والكثافة، والنظرية الجزيئية، والخصائص الحرارية، والطاقة وانتقالها، مع ملخصات وأسئلة وفيديوهات شرح.",
   focus="تبدأ فيزياء الصف التاسع بالقياس الدقيق للطول والزمن، ثم تنتقل إلى وصف الحركة، والكتلة والكثافة، وسلوك جزيئات المادة، وصولًا إلى الطاقة وطرق انتقال الحرارة وتطبيقاتها."),
 "biology-grade-9": dict(title="الأحياء للصف التاسع", subject="الأحياء", grade="التاسع", ic="🧬",
   units=["الخلايا", "انتقال المواد من الخلايا وإليها", "الجزيئات الحيوية", "التغذية في الإنسان", "التنفس",
          "التنظيم والاتزان الداخلي في الإنسان"],
   intro="الأحياء للصف التاسع على منصة روافد العلوم: الخلايا، وانتقال المواد، والجزيئات الحيوية، والتغذية والتنفس في الإنسان، والاتزان الداخلي، مع ملخصات وأسئلة وتجارب.",
   focus="تأخذ أحياء الصف التاسع الطالب من تركيب الخلية وانتقال المواد عبر أغشيتها، إلى الجزيئات الحيوية، ثم أجهزة جسم الإنسان: التغذية والتنفس والتنظيم والاتزان الداخلي."),
}

STUDENT_FEATURES = [
 ("📚", "دروسي", "دروس المادة مرتبة حسب الوحدات، ويعرف الطالب أين وصلت شعبته في المنهج."),
 ("📖", "الملخصات والأسئلة", "ملخص لكل درس، وأسئلة الكتاب وحلولها، وحلول الأنشطة."),
 ("🧠", "بنك الأسئلة", "أسئلة اختيار من متعدد، وصح وخطأ، وتوصيل، تُصحَّح فورًا مع النقاط."),
 ("🎮", "ألعاب تعليمية", "عشر ألعاب تحوّل المراجعة إلى تحدٍّ ممتع، والنتيجة تُحسب بعدل."),
 ("🎬", "فيديوهات الشرح", "فيديوهات لكل مادة يختارها المعلم لشرح الدروس."),
 ("🧪", "التجارب", "تجارب ومحاكاة تفاعلية تقرّب المفاهيم العلمية."),
 ("📝", "الواجبات والاختبارات", "الواجبات ومواعيد تسليمها، والاختبارات الإلكترونية."),
 ("📊", "درجاتي ونقاطي", "درجات الطالب في كل مادة، ونقاط التميز والمشاركة."),
 ("💬", "اسأل معلمك", "يرسل الطالب سؤاله لمعلم المادة ويصله الرد داخل المنصة."),
]
TEACHER_FEATURES = [
 ("📍", "تقدم الشعب", "يحدد المعلم الدرس الذي وصلت إليه كل شعبة."),
 ("📂", "إدارة الدروس والملفات", "رفع الملخصات والأسئلة والحلول لكل درس، وإظهارها أو إخفاؤها."),
 ("📢", "رسالة جماعية", "إعلانات تظهر لطلاب الشعبة عند الدخول."),
 ("📊", "الدرجات والتقارير", "رصد الدرجات وتعديلها وتقارير لكل شعبة."),
 ("⭐", "النقاط والسلوك", "نقاط التميز وملاحظات السلوك ومتابعتها."),
 ("👀", "متابعة الطلاب", "من فتح الدرس ومن لم يفتحه، ومتى سجّل الطالب دخوله."),
 ("🎮", "صانع الألعاب", "ينشئ المعلم لعبة من أسئلته في دقائق، ويتابع نتائج الطلاب."),
 ("🔐", "حسابات الطلاب", "إضافة الطلاب ونقلهم بين الشعب وإعادة تعيين كلمات المرور، ضمن شعبه فقط."),
]
GAMES = [("🚪", "غرفة الهروب", "أبواب مقفلة والوقت يمرّ"), ("🕵️", "المحقق", "أدلة تنكشف واحدًا تلو الآخر"),
 ("🌊", "ارتفاع الماء", "تسلّق قبل أن يغرقك الماء"), ("🤥", "اكشف الكاذب", "عبارتان صادقتان وواحدة كاذبة"),
 ("🎰", "راهن على إجابتك", "ابدأ بمئة نقطة وراهن"), ("🔥", "سلسلة النار", "إجابات متتالية تضاعف نقاطك"),
 ("🖼️", "الصورة الغامضة", "كل إجابة تكشف جزءًا من الصورة"), ("📦", "صناديق الكنز", "لعبة جماعية داخل الحصة"),
 ("💣", "القنبلة المتنقلة", "مرّر القنبلة قبل أن تنفجر"), ("🚀", "سباق الصواريخ", "فريقان يتسابقان للوصول")]

FAQ = [
 ("ما هي منصة روافد العلوم؟", f"منصة تعليمية رقمية لمواد العلوم للصفوف السابع والثامن والتاسع في سلطنة عمان، تجمع الدروس والملخصات والأسئلة والفيديوهات والتجارب والألعاب التعليمية والدرجات في مكان واحد."),
 ("لمن صُمّمت المنصة؟", f"لطلاب الصفوف من السابع إلى التاسع ومعلميهم في {SCHOOL}. لكل طالب حساب خاص يرى فيه مواد شعبته فقط."),
 ("ما المواد المتاحة على المنصة؟", "العلوم للصفين السابع والثامن، والكيمياء والفيزياء والأحياء للصف التاسع."),
 ("كيف أدخل إلى المنصة؟", "افتح rawafidedu.om واختر «طالب»، ثم اكتب اسم المستخدم وكلمة المرور اللذين أعطاك إياهما معلمك. عند أول دخول قد يُطلب منك تغيير كلمة المرور."),
 ("نسيت كلمة المرور، ماذا أفعل؟", "تواصل مع معلم مادتك، فهو يستطيع إعادة تعيين كلمة المرور لطلاب شعبه. لا تشارك كلمة مرورك مع أي شخص."),
 ("هل تعمل المنصة على الهاتف والآيباد؟", "نعم، المنصة تعمل من المتصفح على الهاتف والآيباد والحاسوب دون الحاجة إلى تثبيت أي تطبيق."),
 ("كيف تعمل الألعاب التعليمية؟", "ينشئ المعلم لعبة من أسئلة الدرس، ويلعبها الطالب من حسابه. الإجابات تُصحَّح على الخادم، فلا يمكن معرفتها مسبقًا، ويحصل الطالب على النقاط عند إكمال اللعبة."),
 ("كيف أسأل المعلم إذا لم أفهم درسًا؟", "من قسم «اسأل معلمك» داخل حسابك، اكتب سؤالك ويصل إلى معلم المادة، وستجد الرد في القسم نفسه."),
]

def esc(s): return html.escape(s, quote=True)

def ld(obj): return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "</script>"

def crumbs_ld(items):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + u} for i, (u, n) in enumerate(items)]}

def page(slug, title, desc, h1, lead, body, extra_ld=None, crumb_name=None):
    url = f"{SITE}/{slug}/"
    crumbs = [("/", NAME), (f"/{slug}/", crumb_name or h1)]
    graph = [{"@type": "WebPage", "@id": url, "url": url, "name": title, "description": desc, "inLanguage": "ar-OM",
              "isPartOf": {"@id": f"{SITE}/#website"}, "publisher": {"@id": f"{SITE}/#org"}}, crumbs_ld(crumbs)]
    graph += extra_ld or []
    nav = "".join(f'<a href="{u}"{" aria-current=page" if u == f"/{slug}/" else ""}>{esc(n)}</a>' for u, n in NAV)
    insta = f' · <a href="{esc(INSTAGRAM)}" rel="me noopener" target="_blank">إنستغرام المنصة</a>' if INSTAGRAM else ""
    return f'''<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'; upgrade-insecure-requests"/>
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}"/>
<meta name="robots" content="index,follow,max-image-preview:large"/>
<meta name="author" content="الأستاذ محمد المسكري"/>
<meta name="theme-color" content="#0b2447"/>
<link rel="canonical" href="{url}"/>
<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/pages.css?v=20261030">
<meta property="og:locale" content="ar_OM"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="{NAME}"/>
<meta property="og:title" content="{esc(title)}"/>
<meta property="og:description" content="{esc(desc)}"/>
<meta property="og:url" content="{url}"/>
<meta property="og:image" content="{SITE}/og-image.jpg"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:image" content="{SITE}/og-image.jpg"/>
{ld({"@context": "https://schema.org", "@graph": graph})}
</head>
<body>
<header class="site-head"><div class="in">
<a class="brand" href="/"><img src="/favicon-192.png" alt="" width="40" height="40">{NAME}</a>
<nav class="nav" aria-label="صفحات المنصة">{nav}</nav>
</div></header>
<div class="hero"><div class="in">
<p class="crumbs"><a href="/">{NAME}</a> ‹ {esc(crumb_name or h1)}</p>
<h1>{esc(h1)}</h1>
<p>{esc(lead)}</p>
<a class="cta" href="/">الدخول إلى المنصة</a>
</div></div>
<main>
{body}
</main>
<footer class="site-foot"><div class="in">
<div>© {NAME} — {SCHOOL} · الصفوف 7–9 · سلطنة عمان{insta}</div>
<nav aria-label="روابط">{"".join(f'<a href="{u}">{esc(n)}</a>' for u, n in NAV)}</nav>
</div></footer>
</body>
</html>
'''

def cards(items, cls="grid"):
    return f'<div class="{cls}">' + "".join(
        f'<div class="card"><span class="ic" aria-hidden="true">{i}</span><h3>{esc(t)}</h3><p>{esc(d)}</p></div>' for i, t, d in items) + "</div>"

def subject_links(exclude=None):
    out = []
    for slug, s in SUBJECTS.items():
        if slug == exclude: continue
        out.append(f'<a class="card" href="/{slug}/"><span class="ic" aria-hidden="true">{s["ic"]}</span><h3>{esc(s["title"])}</h3><p>{len(s["units"])} وحدات دراسية</p></a>')
    return '<div class="grid">' + "".join(out) + "</div>"

pages = {}

# عن المنصة
pages["about"] = page("about",
  f"عن {NAME} | التعليم الرقمي للعلوم للصفوف 7 - 9 في سلطنة عمان",
  f"{NAME} منصة تعليمية رقمية لمواد العلوم والكيمياء والفيزياء والأحياء للصفوف السابع والثامن والتاسع في {SCHOOL} بسلطنة عمان.",
  f"عن {NAME}",
  f"منصة تعليمية رقمية تجمع لطلاب الصفوف السابع والثامن والتاسع دروس العلوم وملخصاتها وأسئلتها وتجاربها وألعابها في مكان واحد.",
  f'''<section><h2>ما هي المنصة؟</h2>
<p class="lead">{NAME} بيئة تعلّم رقمية لمواد العلوم في {SCHOOL} بسلطنة عمان. صُمّمت لتكمل ما يحدث داخل الفصل: يجد الطالب درس اليوم وملخصه وأسئلته في حسابه، ويتابع المعلم تقدم كل شعبة ومن راجع الدرس ومن لم يراجعه.</p>
<p class="lead">لكل طالب حساب خاص به، ويرى فيه مواد شعبته ومعلميه فقط. ولكل معلم لوحة يدير منها دروسه وطلاب شعبه.</p></section>
<section><h2>المواد والصفوف</h2>{subject_links()}</section>
<section><h2>ماذا يجد الطالب؟</h2>{cards(STUDENT_FEATURES[:6])}<p><a href="/features/">كل مزايا المنصة للطالب والمعلم ←</a></p></section>
<section><h2>تعمل على كل الأجهزة</h2><p class="lead">تعمل المنصة من المتصفح على الهاتف والآيباد والحاسوب، دون تثبيت أي تطبيق، وتحافظ على خصوصية بيانات الطلاب: لا يرى الطالب إلا حسابه، ولا يدير المعلم إلا طلاب شعبه.</p></section>''',
  crumb_name="عن المنصة")

# صفحات المواد
for slug, s in SUBJECTS.items():
    units = "".join(f"<li>{esc(u)}</li>" for u in s["units"])
    course_ld = {"@type": "Course", "name": f'{s["title"]} — {NAME}', "description": s["intro"], "inLanguage": "ar",
                 "educationalLevel": f'الصف {s["grade"]}', "about": s["subject"],
                 "provider": {"@id": f"{SITE}/#org"}, "url": f"{SITE}/{slug}/",
                 "syllabusSections": [{"@type": "Syllabus", "name": u} for u in s["units"]]}
    pages[slug] = page(slug,
      f'{s["title"]} | {NAME}',
      s["intro"][:155],
      f'{s["title"]}',
      s["intro"],
      f'''<section><h2>عن مادة {esc(s["subject"])} للصف {esc(s["grade"])}</h2><p class="lead">{esc(s["focus"])}</p></section>
<section><h2>وحدات المادة</h2><ol class="units">{units}</ol></section>
<section><h2>كيف يذاكر الطالب المادة على المنصة؟</h2>{cards([STUDENT_FEATURES[0], STUDENT_FEATURES[1], STUDENT_FEATURES[2], STUDENT_FEATURES[3], STUDENT_FEATURES[4], STUDENT_FEATURES[5]])}</section>
<section><h2>مواد أخرى على المنصة</h2>{subject_links(exclude=slug)}</section>''',
      extra_ld=[course_ld])

# المزايا
games = "".join(f'<div class="card"><span class="ic" aria-hidden="true">{i}</span><h3>{esc(n)}</h3><p>{esc(d)}</p></div>' for i, n, d in GAMES)
pages["features"] = page("features",
  f"مزايا {NAME} للطلاب والمعلمين | دروس وأسئلة وألعاب تعليمية",
  "مزايا منصة روافد العلوم: دروس منظمة وملخصات وبنك أسئلة وفيديوهات وتجارب وعشر ألعاب تعليمية للطلاب، وأدوات متابعة ودرجات وتقارير للمعلمين.",
  "مزايا المنصة",
  "كل ما يحتاجه طالب العلوم للمراجعة، وكل ما يحتاجه المعلم لمتابعة شعبه، في مكان واحد.",
  f'''<section><h2>للطالب</h2>{cards(STUDENT_FEATURES)}</section>
<section><h2>للمعلم</h2>{cards(TEACHER_FEATURES)}</section>
<section><h2>عشر ألعاب تعليمية</h2><p class="lead">يحوّل المعلم أسئلة الدرس إلى لعبة في دقائق. في الألعاب الفردية تُصحَّح الإجابات على الخادم وتُحسب النتيجة بعدل، وتُمنح النقاط عند إكمال اللعبة.</p><div class="grid">{games}</div></section>''',
  crumb_name="المزايا")

# الأسئلة الشائعة
faq_html = "".join(f"<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>" for q, a in FAQ)
faq_ld = {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]}
pages["faq"] = page("faq",
  f"أسئلة شائعة عن {NAME} | الدخول وكلمة المرور والمواد",
  "إجابات عن أكثر الأسئلة شيوعًا حول منصة روافد العلوم: كيفية الدخول، ونسيان كلمة المرور، والمواد المتاحة، والألعاب التعليمية، والتواصل مع المعلم.",
  "أسئلة شائعة",
  "إجابات سريعة عن الدخول إلى المنصة، وكلمة المرور، والمواد، والألعاب، والتواصل مع المعلم.",
  f'<section>{faq_html}</section>', extra_ld=[faq_ld], crumb_name="أسئلة شائعة")

for slug, content in pages.items():
    os.makedirs(os.path.join(ROOT, slug), exist_ok=True)
    open(os.path.join(ROOT, slug, "index.html"), "w", encoding="utf-8").write(content)
print("pages:", ", ".join(pages))
