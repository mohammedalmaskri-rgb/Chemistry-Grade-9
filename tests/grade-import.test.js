// node tests/grade-import.test.js — منطق استيراد الدرجات (بلا متصفح ولا قاعدة بيانات). أسماء وهمية.
const G = require('../grade-import.js');
let pass = 0,
  fail = 0;
const ok = (name, cond, info) => {
  if (cond) pass++;
  else {
    fail++;
    console.log('FAIL', name, info === undefined ? '' : JSON.stringify(info));
  }
};
const students = [
  { id: 1, full_name: 'أحمد بن سالم الهنائي', username: '91001' },
  { id: 2, full_name: 'محمد سعيد خلفان البلوشي', username: '91002' },
  { id: 3, full_name: 'يوسف عبدالله ناصر الحارثي', username: '91003' },
  { id: 4, full_name: 'عمر خالد', username: '91004' },
  { id: 5, full_name: 'سالم علي حمد الكندي', username: '91005' }
];
const mapOf = a => {
  const m = {};
  a.columns.forEach(c => {
    if (c.kind && c.kind !== 'skip') m[c.idx] = c.kind;
  });
  return m;
};

// 1) شكل البوابة التعليمية: عنوان في صفين، والخلايا المدمجة معبأة (كما يفعل الـ Worker)
const portal = [
  ['المدرسة: مدرسة تجريبية', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  [
    'م',
    'رقم الطالب',
    'اسم الطالب',
    'الواجبات المنزلية (10)',
    'الواجبات المنزلية (10)',
    'الواجبات المنزلية (10)',
    'الحوار الشفوي (10)',
    'الحوار الشفوي (10)',
    'الحوار الشفوي (10)',
    'النشاط العملي (10)',
    'الاختبارات القصيرة (30)',
    'الاختبارات القصيرة (30)',
    'الاختبارات القصيرة (30)',
    'امتحان نهاية الفصل (40)'
  ],
  [
    'م',
    'رقم الطالب',
    'اسم الطالب',
    'الأول',
    'الثاني',
    'المجموع',
    'الأول',
    'الثاني',
    'المجموع',
    'النشاط العملي (10)',
    'الأول',
    'الثاني',
    'المجموع',
    'امتحان نهاية الفصل (40)'
  ],
  [1, 91001, 'أحمد بن سالم الهنائي', 5, 4.5, 9.5, 5, 5, 10, 9, 14, 13, 27, 38],
  [2, '', 'محمّد سعيد خلفان البلوشى', '٤', '٣٫٥', '', 'غ', 4, '', 8, 12, 20, '', 35],
  [3, '', 'يوسف عبد الله ناصر الحارثي', 3, '', '', '', '', '', 'abc', 15, 15, 30, 41],
  [4, '', 'شخص غير موجود', 5, 5, 10, 5, 5, 10, 10, 15, 15, 30, 40]
];
const a = G.analyze(portal);
ok('portal: header found', !a.error && a.headerRow === 2 && a.twoRowHeader === true, a);
const m = mapOf(a);
const kinds = Object.values(m).sort();
ok(
  'portal: 8 slots + name + id mapped',
  ['hw1', 'hw2', 'id', 'name', 'oral1', 'oral2', 'practical', 'quiz1', 'quiz2', 'final'].every(k => kinds.includes(k)),
  kinds
);
ok(
  'portal: totals skipped',
  a.columns.filter(c => /المجموع/.test(c.label)).every(c => c.kind === 'skip'),
  a.columns.map(c => [c.label, c.kind])
);
ok('portal: 4 data rows', a.rows.length === 4, a.rows.length);
const mt = G.match(a, students, m);
ok('match by id', mt[0].student && mt[0].student.id === 1 && mt[0].by === 'id', mt[0]);
ok('match by name with diacritics/ى', mt[1].student && mt[1].student.id === 2, mt[1].name);
ok('match name variant عبد الله/عبدالله', mt[2].student && mt[2].student.id === 3, mt[2]);
ok('unknown stays unmatched', !mt[3].student, mt[3]);
const cur = { '1:hw1': 5 }; // موجودة مسبقًا ومطابقة
const p = G.plan(mt, m, cur);
const f = (sid, slot) => p.fills.find(x => x.studentId === sid && x.slot === slot);
ok('same value not refilled', !f(1, 'hw1') && p.same === 1, p.same);
ok(
  'arabic digits + decimal comma',
  f(2, 'hw1') && f(2, 'hw1').value === 4 && f(2, 'hw2') && f(2, 'hw2').value === 3.5,
  p.fills.filter(x => x.studentId === 2)
);
ok('absent skipped', !f(2, 'oral1') && p.absent === 1, p.absent);
ok(
  'out of range rejected (20/15, 41/40)',
  !f(2, 'quiz2') && !f(3, 'final') && p.issues.some(x => x.slot === 'quiz2') && p.issues.some(x => x.slot === 'final'),
  p.issues
);
ok(
  'non-number rejected',
  p.issues.some(x => x.slot === 'practical' && x.value === 'abc'),
  p.issues
);
ok(
  'row 1 fills',
  ['hw2', 'oral1', 'oral2', 'practical', 'quiz1', 'quiz2', 'final'].every(s => f(1, s)),
  p.fills.filter(x => x.studentId === 1)
);

// 2) عنوان في صف واحد بأسماء قصيرة
const flat = [
  ['اسم الطالب', 'واجب 1', 'واجب 2', 'شفوي 1', 'شفوي 2', 'عملي', 'قصير 1', 'قصير 2', 'نهائي', 'المجموع'],
  ['سالم علي حمد الكندي', 5, 5, 5, 5, 10, 15, 15, 40, 100],
  ['عمر خالد', 1, 2, 3, 4, 5, 6, 7, 8, 36]
];
const b = G.analyze(flat),
  mb = mapOf(b);
ok('flat: header row 1, one-row', b.headerRow === 1 && !b.twoRowHeader, b);
ok(
  'flat: all 8 slots',
  ['hw1', 'hw2', 'oral1', 'oral2', 'practical', 'quiz1', 'quiz2', 'final'].every(k => Object.values(mb).includes(k)),
  mb
);
const pb = G.plan(G.match(b, students, mb), mb, {});
ok('flat: 16 fills', pb.fills.length === 16, pb.fills.length);
ok('short 2-word name matched', G.match(b, students, mb)[1].student?.id === 4);

// 3) ترتيب الأعمدة بالعكس + رقم بصيغة 91005.0 + عناوين بالأرقام العربية
const odd = [
  ['امتحان نهاية الفصل', 'اختبار قصير ٢', 'اختبار قصير ١', 'اسم المستخدم', 'الاسم'],
  [39, 14, 15, '91005.0', 'اسم مختلف تماما'],
  [20, 10, 10, '', 'إسماعيل حمد'],
  [21, 11, 11, '', 'أسماء علي']
];
const c = G.analyze(odd),
  mc = mapOf(c);
ok('arabic-digit ordinals', Object.values(mc).includes('quiz1') && Object.values(mc).includes('quiz2'), c.columns);
ok('اسم المستخدم = id, not name', c.columns.find(x => x.label === 'اسم المستخدم').kind === 'id', c.columns);
const mc2 = G.match(c, students, mc);
ok('id 91005.0 matches 91005', mc2[0]?.student?.id === 5, mc2[0]);
ok(
  'names containing «اسم» are data, not headers',
  c.rows.length === 3,
  c.rows.map(r => r.cells[4])
);

// 4) اسم مكرر في الملف → الثاني لا يُستورد
const dup = [
  ['اسم الطالب', 'نهائي'],
  ['عمر خالد', 30],
  ['عمر  خالد', 31]
];
const d = G.analyze(dup),
  md = G.match(d, students, mapOf(d));
ok('duplicate row flagged', md[0].student && !md[1].student && md[1].duplicate, md);

// 5) ملف بلا عمود اسم
ok(
  'no name column → error',
  !!G.analyze([
    ['أ', 'ب'],
    [1, 2]
  ]).error
);

// 6) أسماء متشابهة: لا مطابقة تقريبية إن كانت تطابق أكثر من طالب
const twins = [
  { id: 10, full_name: 'علي محمد سالم', username: 'a' },
  { id: 11, full_name: 'علي محمد سالم', username: 'b' }
];
const t = G.analyze([
  ['اسم الطالب', 'نهائي'],
  ['علي محمد سالم', 20]
]);
ok('ambiguous name not auto-matched', !G.match(t, twins, mapOf(t))[0].student);

// 7) ملف نور: كل الشعب في ورقة واحدة + عمودا الصف والشعبة + «(max: n)» + «—» للخانات الفارغة
const noor = [
  ['المدرسة', 'مدرسة تجريبية'],
  ['المادة', 'الكيمياء'],
  ['مجموع الطلبة', 3],
  [],
  [
    'الرقم المدني',
    'اسم الطالب',
    'الصف',
    'الشعبة',
    'الواجب المنزلي 1 (max: 5)',
    'الواجب المنزلي 2 (max: 5)',
    'الحوار 1 (max: 5)',
    'الحوار 2 (max: 5)',
    'النشاط العملي (max: 10)',
    'الإختبار القصير 1 (max: 15)',
    'الإختبار القصير 2 (max: 15)',
    'مجموع درجات التقويم المستمر (max: 60)',
    'الإختبار النهائي (max: 40)',
    'المجموع (max: 100)'
  ],
  [12345678, 'هلال بن سالم بن محمد الأزهري', 'التاسع', 1, '—', '—', 5, '—', '—', 14, '—', 19, '—', 19],
  [12345679, 'عبدالله بن طلال بن علي الإسماعيلي', 'التاسع', 1, 4, '—', 4, '—', '—', 11, '—', 15, '—', 15],
  [12345680, 'طالب من شعبة ثانية', 'التاسع', 2, 5, 5, 5, 5, 10, 15, 15, 60, 40, 100]
];
const platform = [
  // كما هي مخزنة في المنصة: الألف بعد اللام مفقودة و«عبدالله» → «عبدا»
  { id: 21, full_name: 'هلل بن سالم بن محمد الزهري', username: '546001', class_name: '9/1' },
  { id: 22, full_name: 'عبدا بن طلل بن علي السماعيلي', username: '546002', class_name: '9/1' }
];
const n = G.analyze(noor),
  mn = mapOf(n);
ok('noor: header row found below the info block', n.headerRow === 5 && n.rows.length === 3, n.headerRow);
ok(
  'noor: grade + section + 8 slots + id + name',
  ['grade', 'section', 'id', 'name', 'hw1', 'hw2', 'oral1', 'oral2', 'practical', 'quiz1', 'quiz2', 'final'].every(k =>
    Object.values(mn).includes(k)
  ),
  Object.values(mn)
);
const fc = G.filterByClass(n, mn, '9/1');
ok(
  'noor: class filter keeps 9/1 only',
  fc.filtered && fc.rows.length === 2 && fc.excluded === 1 && fc.classes.join(',') === '9/1,9/2',
  fc
);
const mnm = G.match({ rows: fc.rows }, platform, mn);
ok('noor: lost-alef names match (هلال/هلل, الأزهري/الزهري)', mnm[0].student?.id === 21, mnm[0].by);
ok('noor: عبدالله/عبدا, طلال/طلل, الإسماعيلي/السماعيلي', mnm[1].student?.id === 22, mnm[1].by);
const pn = G.plan(mnm, mn, {});
ok('noor: «—» skipped, values filled', pn.fills.length === 5 && pn.issues.length === 0, pn);
ok(
  'rowClass: «9/3» in one column',
  G.rowClass(['9/3'], null, 0) === '9/3' &&
    G.rowClass(['التاسع', 3], 0, 1) === '9/3' &&
    G.rowClass(['الصف الثامن', '2'], 0, 1) === '8/2'
);
ok('no class columns → no filtering', G.filterByClass(b, mb, '9/1').filtered === false);
ok('squash is symmetric & strict', G.squash('هلال') === G.squash('هلل') && G.squash('سالم') !== G.squash('سلمى'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
