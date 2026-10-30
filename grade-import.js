/* استيراد سجل الدرجات من ملف Excel (البوابة التعليمية أو أي ملف مشابه) إلى «سجل الدرجات» في المنصة.
   - قراءة الملف تتم في Worker معزول (vendor/xlsx-worker.js).
   - الاستيراد يعبّئ خانات السجل فقط؛ لا يُحفظ شيء حتى يضغط المعلم «💾 حفظ الدرجات» (نفس مسار الحفظ الحالي وصلاحياته). */
(function (root) {
  'use strict';

  var SLOTS = ['hw1', 'hw2', 'oral1', 'oral2', 'practical', 'quiz1', 'quiz2', 'final'];
  var SLOT_LABEL = {
    hw1: 'الواجب الأول',
    hw2: 'الواجب الثاني',
    oral1: 'الحوار الشفوي الأول',
    oral2: 'الحوار الشفوي الثاني',
    practical: 'النشاط العملي',
    quiz1: 'الاختبار القصير الأول',
    quiz2: 'الاختبار القصير الثاني',
    final: 'امتحان نهاية الفصل'
  };
  var SLOT_MAX = { hw1: 5, hw2: 5, oral1: 5, oral2: 5, practical: 10, quiz1: 15, quiz2: 15, final: 40 };

  // ---------- أدوات نصية ----------
  function digits(s) {
    return String(s)
      .replace(/[٠-٩]/g, function (d) {
        return String(d.charCodeAt(0) - 0x660);
      })
      .replace(/[۰-۹]/g, function (d) {
        return String(d.charCodeAt(0) - 0x6f0);
      });
  }
  function norm(s) {
    if (s == null) return '';
    return digits(s)
      .replace(/[ً-ٰٟـ]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/[_\-–—/\\.,،:;|*#"'«»]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }
  function tokens(s) {
    return norm(s)
      .replace(/[()[\]{}]/g, ' ')
      .split(' ')
      .filter(Boolean);
  }
  function stripParens(s) {
    return String(s).replace(/\([^)]*\)|\[[^\]]*\]/g, ' ');
  }

  function toNum(v) {
    if (v == null || v === '') return { empty: true };
    if (typeof v === 'number') return isFinite(v) ? { n: v } : { bad: String(v) };
    var t = digits(String(v)).trim().replace(/٫/g, '.').replace(/,/g, '.');
    if (t === '' || t === '-' || t === '—') return { empty: true };
    if (/^(غ|غائب|غياب|معفي|اعفاء|ع)$/.test(norm(t))) return { absent: t };
    if (/^-?\d+(\.\d+)?$/.test(t)) return { n: Number(t) };
    return { bad: String(v) };
  }

  // ---------- تصنيف الأعمدة ----------
  function ordinal(label) {
    var ts = tokens(stripParens(label));
    if (
      ts.some(function (t) {
        return t === 'الاول' || t === 'اول' || t === '1' || t === 'الاولي' || t === 'اولي';
      })
    )
      return 1;
    if (
      ts.some(function (t) {
        return t === 'الثاني' || t === 'ثاني' || t === '2' || t === 'الثانيه' || t === 'ثانيه';
      })
    )
      return 2;
    var m = norm(stripParens(label)).match(/(?:واجب|شفوي|شفهي|قصير|حوار)\s*(\d)\b/);
    if (m) return Number(m[1]);
    return 0;
  }
  function classify(label) {
    var n = norm(label);
    if (!n) return null;
    var bare = norm(stripParens(label));
    if (/مجموع|نسبه|مستوي|تقدير|معدل|اتقان|ملاحظ|الحاله|المحصله/.test(bare)) return 'skip';
    if (
      bare === 'م' ||
      bare === 'ر' ||
      bare === 'رقم' ||
      bare === 'التسلسل' ||
      bare === 'تسلسل' ||
      bare === 'no' ||
      bare === '#'
    )
      return 'skip';
    if (bare === 'الصف' || bare === 'الصف الدراسي' || bare === 'grade') return 'grade';
    if (bare === 'الشعبه' || bare === 'الفصل' || bare === 'الصف والشعبه' || bare === 'section' || bare === 'class')
      return 'section';
    if (/مستخدم|username|مدني|الرقم الوطني|رقم الطالب|رقم القيد|الرقم الاكاديمي|رقم الهويه|\bid\b/.test(bare))
      return 'id';
    if (
      tokens(bare).some(function (t) {
        return t === 'اسم' || t === 'الاسم' || t === 'name';
      })
    )
      return 'name';
    var o = ordinal(label);
    if (/قصير/.test(bare)) return o ? 'quiz' + o : 'quiz?';
    if (/واجب/.test(bare)) return o ? 'hw' + o : 'hw?';
    if (/شفوي|شفهي|حوار/.test(bare)) return o ? 'oral' + o : 'oral?';
    if (/عملي|نشاط/.test(bare)) return 'practical';
    if (/نهاي|امتحان/.test(bare)) return 'final'; // نهاية/نهائي (بعد التوحيد: نهايه/نهايي)
    return null;
  }

  // ---------- تحليل الورقة ----------
  function looksSubHeader(row) {
    if (!row) return false;
    var cells = row.filter(function (v) {
      return v !== '' && v != null;
    });
    if (!cells.length) return false;
    var nums = cells.filter(function (v) {
      return typeof v === 'number' || /^\s*[\d٠-٩.]+\s*$/.test(String(v));
    }).length;
    var subs = cells.filter(function (v) {
      return ordinal(v) || /مجموع/.test(norm(v));
    }).length;
    return subs >= 2 && nums <= cells.length / 2;
  }

  function analyze(rows) {
    rows = rows || [];
    var h = -1;
    for (var r = 0; r < Math.min(rows.length, 25) && h < 0; r++) {
      var row = rows[r] || [];
      var hasName = row.some(function (v) {
        return classify(v) === 'name';
      });
      var slotish = row.filter(function (v) {
        var k = classify(v);
        return k && k !== 'name' && k !== 'id' && k !== 'skip';
      }).length;
      var nextSlotish = (rows[r + 1] || []).filter(function (v) {
        var k = classify(v);
        return k && k !== 'skip';
      }).length;
      if (hasName && slotish + nextSlotish >= 1) h = r;
    }
    if (h < 0) return { error: 'لم أجد صف العناوين (عمود «اسم الطالب») في هذه الورقة.' };
    var two = looksSubHeader(rows[h + 1]);
    var width = 0;
    rows.slice(h, h + 40).forEach(function (rw) {
      width = Math.max(width, (rw || []).length);
    });
    var columns = [];
    for (var c = 0; c < width; c++) {
      var a = (rows[h] || [])[c],
        b = two ? (rows[h + 1] || [])[c] : '';
      var na = String(a == null ? '' : a).trim(),
        nb = String(b == null ? '' : b).trim();
      var label = na && nb && norm(na) !== norm(nb) ? na + ' ' + nb : na || nb;
      if (!label) continue;
      columns.push({ idx: c, label: label, kind: classify(label) });
    }
    // عمود واحد بلا ترتيب لمجموعة لها خانتان → الأول
    ['hw', 'oral', 'quiz'].forEach(function (g) {
      var q = columns.filter(function (x) {
        return x.kind === g + '?';
      });
      if (
        q.length === 1 &&
        !columns.some(function (x) {
          return x.kind === g + '1';
        })
      )
        q[0].kind = g + '1';
    });
    // أي تكرار لنفس الخانة: الأول يبقى، والباقي يُترك للمعلم
    var seen = {};
    columns.forEach(function (x) {
      if (
        SLOTS.indexOf(x.kind) >= 0 ||
        x.kind === 'name' ||
        x.kind === 'id' ||
        x.kind === 'grade' ||
        x.kind === 'section'
      ) {
        if (seen[x.kind]) x.kind = null;
        else seen[x.kind] = true;
      }
      if (x.kind && /\?$/.test(x.kind)) x.kind = null;
    });
    var dataStart = h + (two ? 2 : 1);
    var nameCol = columns.filter(function (x) {
      return x.kind === 'name';
    })[0];
    var data = [],
      empty = 0;
    for (var i = dataStart; i < rows.length; i++) {
      var rw2 = rows[i] || [];
      var nm = nameCol ? String(rw2[nameCol.idx] == null ? '' : rw2[nameCol.idx]).trim() : '';
      if (!nm) {
        if (++empty >= 8) break;
        continue;
      }
      empty = 0;
      if (norm(nm) === norm(nameCol.label) || norm(nm) === norm((rows[h] || [])[nameCol.idx])) continue; // عنوان مكرر
      data.push({ row: i + 1, cells: rw2 });
    }
    return { headerRow: h + 1, twoRowHeader: two, columns: columns, rows: data };
  }

  // ---------- مطابقة الطلاب ----------
  var STOP = { 'بن': 1, 'بنت': 1, 'ابن': 1 };
  // أسماء المنصة المخزّنة فقدت الألف بعد اللام («هلال»→«هلل»، «الأزهر»→«الزهر») ورمز «ﷲ» («عبدالله»→«عبدا»).
  // نوحّد الطرفين بالطريقة نفسها قبل المقارنة.
  function squash(s) {
    return norm(String(s == null ? '' : s).replace(/\uFDF2/g, 'الله'))
      .replace(/(^| )عبد ?الل?ه(?= |$)/g, '$1عبدا')
      .replace(/ل+ا/g, 'ل')
      .replace(/لل+/g, 'ل');
  }
  function nameKeys(s) {
    var t = squash(s)
      .replace(/[()[\]{}]/g, ' ')
      .split(' ')
      .filter(function (x) {
        return x && !STOP[x];
      });
    // مواضع ثابتة: [الاسم كاملًا، أول ثلاثة، أول اثنين + الأخير، الأول + الأخير]
    return [
      t.join(' '),
      t.length >= 3 ? t.slice(0, 3).join(' ') : null,
      t.length >= 3 ? t[0] + ' ' + t[1] + ' ' + t[t.length - 1] : null,
      t.length >= 2 ? t[0] + ' ' + t[t.length - 1] : null
    ];
  }
  function cleanId(v) {
    return digits(String(v == null ? '' : v))
      .trim()
      .replace(/\.0+$/, '');
  }

  function match(analysis, students, mapping) {
    var byUser = {},
      idx = [{}, {}, {}, {}];
    (students || []).forEach(function (s) {
      if (s.username) byUser[cleanId(s.username)] = s;
      nameKeys(s.full_name).forEach(function (k, i) {
        if (!k) return;
        var m = idx[i];
        m[k] = m[k] ? 'dup' : s;
      });
    });
    var col = function (kind) {
      for (var k in mapping) if (mapping[k] === kind) return Number(k);
      return null;
    };
    var nameC = col('name'),
      idC = col('id');
    var used = {};
    return analysis.rows.map(function (r) {
      var name = nameC == null ? '' : String(r.cells[nameC] == null ? '' : r.cells[nameC]).trim();
      var st = null,
        by = '';
      if (idC != null) {
        var u = byUser[cleanId(r.cells[idC])];
        if (u) {
          st = u;
          by = 'id';
        }
      }
      if (!st && name) {
        var ks = nameKeys(name);
        for (var i = 0; i < ks.length && !st; i++) {
          if (!ks[i]) continue;
          var hit = idx[i][ks[i]];
          if (hit && hit !== 'dup') {
            st = hit;
            by = i === 0 ? 'name' : 'name~';
          }
        }
      }
      var dup = false;
      if (st) {
        if (used[st.id]) dup = true;
        else used[st.id] = true;
      }
      return { row: r.row, name: name, student: dup ? null : st, by: by, duplicate: dup, cells: r.cells };
    });
  }

  // ---------- تصفية صفوف الملف حسب الشعبة المختارة (ملفات نور تضم كل الشعب في ورقة واحدة) ----------
  var GRADE_WORDS = {
    'الاول': 1,
    'الثاني': 2,
    'الثالث': 3,
    'الرابع': 4,
    'الخامس': 5,
    'السادس': 6,
    'السابع': 7,
    'الثامن': 8,
    'التاسع': 9,
    'العاشر': 10,
    'الحادي عشر': 11,
    'الثاني عشر': 12
  };
  function gradeNum(v) {
    var raw = digits(String(v == null ? '' : v)).trim();
    var m = raw.match(/^(\d+)\s*[/\-]\s*\d+$/);
    if (m) return Number(m[1]);
    var n = norm(raw)
      .replace(/^الصف /, '')
      .trim();
    if (/^\d+$/.test(n)) return Number(n);
    return GRADE_WORDS[n] || null;
  }
  function rowClass(cells, gradeC, sectionC) {
    var sec =
      sectionC == null
        ? ''
        : digits(String(cells[sectionC] == null ? '' : cells[sectionC]))
            .replace(/\s+/g, '')
            .replace(/\.0+$/, '');
    var m = sec.match(/^(\d+)[/\-](\d+)$/);
    if (m) return Number(m[1]) + '/' + Number(m[2]);
    var g = gradeC == null ? null : gradeNum(cells[gradeC]);
    if (g && /^\d+$/.test(sec)) return g + '/' + Number(sec);
    if (!g && /^\d+$/.test(sec)) return '?/' + Number(sec);
    return null;
  }
  function filterByClass(analysis, mapping, cls) {
    var col = function (kind) {
      for (var k in mapping) if (mapping[k] === kind) return Number(k);
      return null;
    };
    var gC = col('grade'),
      sC = col('section');
    if (gC == null && sC == null) return { rows: analysis.rows, excluded: 0, classes: [], filtered: false };
    var want = String(cls || '').replace(/\s+/g, ''),
      wantSec = want.split('/')[1];
    var keep = [],
      classes = {},
      excluded = 0;
    analysis.rows.forEach(function (r) {
      var c = rowClass(r.cells, gC, sC);
      if (c) classes[c] = (classes[c] || 0) + 1;
      var ok = !c || c === want || (c.indexOf('?/') === 0 && c.slice(2) === wantSec);
      if (ok) keep.push(r);
      else excluded++;
    });
    return {
      rows: keep,
      excluded: excluded,
      classes: Object.keys(classes).sort(function (a, b) {
        return a.localeCompare(b, 'en', { numeric: true });
      }),
      filtered: true
    };
  }

  // ---------- خطة التعبئة ----------
  function plan(matches, mapping, current, maxes) {
    maxes = maxes || SLOT_MAX;
    var fills = [],
      issues = [],
      same = 0,
      absent = 0;
    matches.forEach(function (m) {
      if (!m.student) return;
      Object.keys(mapping).forEach(function (c) {
        var slot = mapping[c];
        if (SLOTS.indexOf(slot) < 0) return;
        var v = toNum(m.cells[Number(c)]);
        if (v.empty) return;
        if (v.absent) {
          absent++;
          return;
        }
        if (v.bad != null) {
          issues.push({ row: m.row, name: m.name, slot: slot, value: v.bad, why: 'ليست رقمًا' });
          return;
        }
        if (v.n < 0 || v.n > maxes[slot]) {
          issues.push({ row: m.row, name: m.name, slot: slot, value: v.n, why: 'خارج المدى 0–' + maxes[slot] });
          return;
        }
        var cur = current && current[m.student.id + ':' + slot];
        if (cur != null && Number(cur) === v.n) {
          same++;
          return;
        }
        fills.push({ studentId: m.student.id, slot: slot, value: v.n, before: cur == null ? null : Number(cur) });
      });
    });
    return { fills: fills, issues: issues, same: same, absent: absent };
  }

  var api = {
    SLOTS: SLOTS,
    SLOT_LABEL: SLOT_LABEL,
    SLOT_MAX: SLOT_MAX,
    norm: norm,
    toNum: toNum,
    classify: classify,
    analyze: analyze,
    match: match,
    plan: plan,
    nameKeys: nameKeys,
    squash: squash,
    filterByClass: filterByClass,
    rowClass: rowClass
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
    return;
  }
  root.RGImport = api;

  // =================== واجهة المستخدم (المتصفح فقط) ===================
  var doc = root.document;
  function el(id) {
    return doc.getElementById(id);
  }
  function h(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var MAX_BYTES = 8 * 1024 * 1024;

  function runWorker(msg, transfer) {
    return new Promise(function (resolve, reject) {
      var w;
      try {
        w = new Worker('vendor/xlsx-worker.js');
      } catch (e) {
        reject(new Error('المتصفح لا يدعم قراءة الملفات هنا'));
        return;
      }
      var t = setTimeout(function () {
        w.terminate();
        reject(new Error('استغرقت قراءة الملف وقتًا طويلًا. تأكد أنه ملف Excel صحيح.'));
      }, 20000);
      w.onmessage = function (e) {
        clearTimeout(t);
        w.terminate();
        if (e.data && e.data.ok) resolve(e.data);
        else reject(new Error('تعذر قراءة الملف: ' + ((e.data && e.data.error) || '')));
      };
      w.onerror = function () {
        clearTimeout(t);
        w.terminate();
        reject(new Error('تعذر قراءة الملف.'));
      };
      w.postMessage(msg, transfer || []);
    });
  }

  function gradebookState() {
    var cur = {},
      ids = {};
    doc.querySelectorAll('#gradebookTable .gradebook-input').forEach(function (inp) {
      var k = inp.dataset.gbStudent + ':' + inp.dataset.gbSlot;
      cur[k] = inp.value === '' ? null : Number(inp.value);
      ids[inp.dataset.gbStudent] = true;
    });
    return { current: cur, loaded: Object.keys(ids).length > 0 };
  }
  async function classStudents() {
    var cls = el('gradebookClass') && el('gradebookClass').value;
    /* global rpc, teacherToken, teacherSubjectCode */
    var list = await rpc('portal_teacher_students_v2', {
      p_token: teacherToken,
      p_subject_code: teacherSubjectCode,
      p_class: cls
    });
    return {
      cls: cls,
      students: (list || []).filter(function (s) {
        return s.is_active !== false;
      })
    };
  }

  var S = null; // حالة نافذة الاستيراد
  var LAST = null; // آخر ملف قُرئ (لاستيراد الشعب الأخرى من الملف نفسه دون رفعه مجددًا)
  function showName(n) {
    try {
      return typeof fixStudentName === 'function' ? fixStudentName(n) : n;
    } catch (e) {
      return n;
    }
  } // eslint-disable-line no-undef

  function closeModal() {
    var m = el('rgImportModal');
    if (m) m.remove();
    S = null;
  }
  function modal(inner) {
    var m = el('rgImportModal');
    if (!m) {
      m = doc.createElement('div');
      m.id = 'rgImportModal';
      m.className = 'popup';
      m.setAttribute('role', 'dialog');
      m.setAttribute('aria-modal', 'true');
      m.addEventListener('click', function (e) {
        if (e.target === m) closeModal();
      });
      doc.body.appendChild(m);
    }
    m.innerHTML = '<div class="card rg-card">' + inner + '</div>';
    return m;
  }

  function optionList(selected) {
    var opts = [
      ['', '— تجاهل —'],
      ['name', 'اسم الطالب'],
      ['id', 'رقم الطالب / اسم المستخدم'],
      ['grade', 'الصف'],
      ['section', 'الشعبة']
    ].concat(
      SLOTS.map(function (s) {
        return [s, SLOT_LABEL[s] + ' (من ' + SLOT_MAX[s] + ')'];
      })
    );
    return opts
      .map(function (o) {
        return (
          '<option value="' + o[0] + '"' + (o[0] === (selected || '') ? ' selected' : '') + '>' + h(o[1]) + '</option>'
        );
      })
      .join('');
  }

  function render() {
    var a = S.analysis,
      mapping = S.mapping;
    var fc = a.error ? { rows: [], excluded: 0, classes: [], filtered: false } : filterByClass(a, mapping, S.cls);
    var matches = match({ rows: fc.rows }, S.students, mapping);
    Object.keys(S.manual).forEach(function (row) {
      var m = matches.filter(function (x) {
        return String(x.row) === row;
      })[0];
      var st = S.students.filter(function (x) {
        return String(x.id) === String(S.manual[row]);
      })[0];
      if (m && st) {
        m.student = st;
        m.by = 'manual';
        m.duplicate = false;
      }
    });
    var p = plan(matches, mapping, S.state.current);
    S.matches = matches;
    S.plan = p;
    var matched = matches.filter(function (m) {
      return m.student;
    }).length;
    var unmatched = matches.filter(function (m) {
      return !m.student;
    });
    var mappedSlots = Object.keys(mapping).filter(function (c) {
      return SLOTS.indexOf(mapping[c]) >= 0;
    }).length;
    var hasName = Object.keys(mapping).some(function (c) {
      return mapping[c] === 'name';
    });
    var lowMatch = matches.length && matched / matches.length < 0.4;
    var takenIds = {};
    matches.forEach(function (m) {
      if (m.student) takenIds[m.student.id] = true;
    });

    var cols = a.columns
      .filter(function (c) {
        return c.kind !== 'skip';
      })
      .map(function (c) {
        return (
          '<tr><td>' +
          h(c.label) +
          '</td><td><select data-rg-col="' +
          c.idx +
          '">' +
          optionList(mapping[c.idx]) +
          '</select></td></tr>'
        );
      })
      .join('');
    var un = unmatched
      .slice(0, 60)
      .map(function (m) {
        var choices = S.students
          .filter(function (s) {
            return !takenIds[s.id];
          })
          .map(function (s) {
            return '<option value="' + s.id + '">' + h(showName(s.full_name)) + '</option>';
          })
          .join('');
        return (
          '<tr><td>' +
          m.row +
          '</td><td>' +
          h(m.name || '—') +
          (m.duplicate ? ' <span class="badge">مكرر</span>' : '') +
          '</td><td><select data-rg-row="' +
          m.row +
          '"><option value="">— لا يُستورد —</option>' +
          choices +
          '</select></td></tr>'
        );
      })
      .join('');
    var iss = p.issues
      .slice(0, 40)
      .map(function (x) {
        return (
          '<li>صف ' +
          x.row +
          ' — ' +
          h(x.name) +
          ': ' +
          h(SLOT_LABEL[x.slot]) +
          ' = «' +
          h(x.value) +
          '» (' +
          h(x.why) +
          ')</li>'
        );
      })
      .join('');

    modal(
      '<div class="rg-head"><h2>📥 استيراد الدرجات من Excel</h2><button class="btn secondary" data-rg="close" aria-label="إغلاق">✕</button></div>' +
        '<p class="muted">الملف: <b>' +
        h(S.fileName) +
        '</b>' +
        (S.sheets.length > 1
          ? ' — الورقة: <select data-rg="sheet">' +
            S.sheets
              .map(function (s, i) {
                return (
                  '<option value="' + i + '"' + (i === S.sheetIndex ? ' selected' : '') + '>' + h(s.name) + '</option>'
                );
              })
              .join('') +
            '</select>'
          : '') +
        ' — الشعبة في المنصة: <b>' +
        h(S.cls) +
        '</b></p>' +
        (a.error
          ? '<div class="msg err">' + h(a.error) + '</div>'
          : '<div class="rg-stats"><div><b>' +
            matches.length +
            '</b><span>صف في الملف</span></div><div><b>' +
            matched +
            '</b><span>طالب مطابق</span></div>' +
            '<div><b>' +
            p.fills.length +
            '</b><span>درجة ستُعبّأ</span></div><div><b>' +
            p.same +
            '</b><span>مطابقة للمسجّل</span></div></div>' +
            (fc.filtered
              ? fc.rows.length
                ? '<p class="muted">الملف يضم الشعب: ' +
                  h(fc.classes.join('، ')) +
                  ' — تم أخذ صفوف ' +
                  h(S.cls) +
                  ' فقط، واستُبعد ' +
                  fc.excluded +
                  ' صفًا من الشعب الأخرى.</p>'
                : '<div class="msg err">لا توجد صفوف للشعبة ' +
                  h(S.cls) +
                  ' في هذا الملف. الشعب الموجودة فيه: ' +
                  h(fc.classes.join('، ') || '—') +
                  '. اختر الشعبة الصحيحة من «سجل الدرجات» ثم استورد مرة أخرى.</div>'
              : '') +
            (lowMatch
              ? '<div class="msg err">أغلب أسماء الملف غير موجودة في الشعبة ' +
                h(S.cls) +
                '. تأكد أنك اخترت الشعبة الصحيحة قبل الاستيراد.</div>'
              : '') +
            (!hasName ? '<div class="msg err">حدّد عمود «اسم الطالب» من القائمة أدناه.</div>' : '') +
            (!mappedSlots
              ? '<div class="msg err">لم أتعرف على أعمدة الدرجات. اختر لكل عمود الخانة المناسبة.</div>'
              : '') +
            '<details open><summary>مطابقة الأعمدة (' +
            mappedSlots +
            ' خانة)</summary><div class="rg-scroll"><table class="eng-table"><tr><th>عمود الملف</th><th>الخانة في سجل المنصة</th></tr>' +
            cols +
            '</table></div></details>' +
            (unmatched.length
              ? '<details' +
                (unmatched.length <= 10 ? ' open' : '') +
                '><summary>طلاب لم تتم مطابقتهم (' +
                unmatched.length +
                ')</summary><p class="muted">اختر الطالب المقابل من الشعبة، أو اتركه فلا تُستورد درجاته.</p><div class="rg-scroll"><table class="eng-table"><tr><th>صف</th><th>الاسم في الملف</th><th>الطالب في المنصة</th></tr>' +
                un +
                '</table></div></details>'
              : '') +
            (p.issues.length
              ? '<details><summary>قيم لن تُستورد (' +
                p.issues.length +
                ')</summary><ul class="rg-issues">' +
                iss +
                '</ul></details>'
              : '') +
            (p.absent ? '<p class="muted">تم تجاهل ' + p.absent + ' خانة مكتوب فيها غياب أو إعفاء.</p>' : '')) +
        '<div class="rg-actions"><button class="btn primary" data-rg="apply"' +
        (p.fills.length ? '' : ' disabled') +
        '>تعبئة السجل (' +
        p.fills.length +
        ' درجة)</button>' +
        '<button class="btn secondary" data-rg="close">إلغاء</button></div>' +
        '<p class="muted" style="margin-top:8px">التعبئة لا تحفظ شيئًا. ستظهر الدرجات المستوردة بلون أصفر في السجل لتراجعها، ثم تضغط «💾 حفظ الدرجات».</p>'
    );
  }

  function setSheet(i) {
    S.sheetIndex = i;
    S.analysis = analyze(S.sheets[i].rows);
    S.mapping = {};
    S.manual = {};
    (S.analysis.columns || []).forEach(function (c) {
      if (c.kind && c.kind !== 'skip') S.mapping[c.idx] = c.kind;
    });
    if (!S.analysis.columns) S.analysis.columns = [];
    if (!S.analysis.rows) S.analysis.rows = [];
  }

  function apply() {
    var n = 0;
    S.plan.fills.forEach(function (f) {
      var inp = doc.querySelector(
        '#gradebookTable .gradebook-input[data-gb-student="' + f.studentId + '"][data-gb-slot="' + f.slot + '"]'
      );
      if (!inp) return;
      inp.value = String(f.value);
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.style.background = '#fef9c3';
      inp.title = 'مستورد من ' + S.fileName + (f.before != null ? ' (كانت ' + f.before + ')' : '');
      n++;
    });
    var fileName = S.fileName;
    closeModal();
    var msg = el('gradebookMsg');
    if (msg) {
      var box = doc.createElement('div');
      box.className = 'msg ok';
      box.textContent =
        'تمت تعبئة ' +
        n +
        ' درجة من «' +
        fileName +
        '» (باللون الأصفر). راجعها ثم اضغط «💾 حفظ الدرجات» لحفظها في المنصة. لاستيراد شعبة أخرى من الملف نفسه: احفظ، ثم اختر الشعبة واضغط «📥 استيراد» مرة أخرى.';
      msg.insertBefore(box, msg.firstChild);
    }
    var first = doc.querySelector(
      '#gradebookTable .gradebook-input[style*="254, 249, 195"],#gradebookTable .gradebook-input[style*="fef9c3"]'
    );
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function startImport(file) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      alert('حجم الملف كبير جدًا (الحد 8MB).');
      return;
    }
    if (!/\.(xlsx|xlsm|xls|csv|ods)$/i.test(file.name)) {
      alert('اختر ملف Excel (‎.xlsx أو ‎.xls) أو CSV.');
      return;
    }
    modal('<h2>📥 استيراد الدرجات</h2><p class="muted">جاري قراءة الملف…</p>');
    try {
      var st = gradebookState();
      if (!st.loaded && typeof loadGradebook === 'function') {
        await loadGradebook();
        st = gradebookState();
      } // eslint-disable-line no-undef
      var info = await classStudents();
      var buf = await file.arrayBuffer();
      var res = await runWorker({ cmd: 'read', buf: buf }, [buf]);
      var sheets = (res.sheets || []).filter(function (s) {
        return s.rows && s.rows.length;
      });
      if (!sheets.length) throw new Error('الملف فارغ.');
      LAST = { fileName: file.name, sheets: sheets };
      openWith(LAST, info, st);
    } catch (e) {
      modal(
        '<h2>📥 استيراد الدرجات</h2><div class="msg err">' +
          h(e.message || 'تعذر قراءة الملف') +
          '</div><div class="rg-actions"><button class="btn secondary" data-rg="close">إغلاق</button></div>'
      );
    }
  }

  async function reuseLast() {
    if (!LAST) return;
    modal('<h2>📥 استيراد الدرجات</h2><p class="muted">جاري التجهيز…</p>');
    try {
      var st = gradebookState();
      if (!st.loaded && typeof loadGradebook === 'function') {
        await loadGradebook();
        st = gradebookState();
      } // eslint-disable-line no-undef
      var info = await classStudents();
      openWith(LAST, info, st);
    } catch (e) {
      modal(
        '<h2>📥 استيراد الدرجات</h2><div class="msg err">' +
          h(e.message || 'تعذر التجهيز') +
          '</div><div class="rg-actions"><button class="btn secondary" data-rg="close">إغلاق</button></div>'
      );
    }
  }

  function openWith(last, info, st) {
    var sheets = last.sheets;
    {
      S = { fileName: last.fileName, sheets: sheets, cls: info.cls, students: info.students, state: st, manual: {} };
      // اختر الورقة التي يُعثر فيها على عناوين الدرجات
      var best = 0;
      for (var i = 0; i < sheets.length; i++) {
        var a = analyze(sheets[i].rows);
        if (!a.error && a.rows.length) {
          best = i;
          break;
        }
      }
      setSheet(best);
      render();
    }
  }

  async function downloadTemplate() {
    try {
      var st = gradebookState();
      if (!st.loaded && typeof loadGradebook === 'function') {
        await loadGradebook();
        st = gradebookState();
      } // eslint-disable-line no-undef
      var info = await classStudents();
      var r1 = [
        'م',
        'اسم المستخدم',
        'اسم الطالب',
        'الواجبات المنزلية (10)',
        '',
        'الحوار الشفوي (10)',
        '',
        'النشاط العملي (10)',
        'الاختبارات القصيرة (30)',
        '',
        'امتحان نهاية الفصل (40)'
      ];
      var r2 = ['', '', '', 'الأول', 'الثاني', 'الأول', 'الثاني', '', 'الأول', 'الثاني', ''];
      var aoa = [r1, r2];
      info.students.forEach(function (s, i) {
        var v = function (slot) {
          var x = st.current[s.id + ':' + slot];
          return x == null ? '' : x;
        };
        aoa.push([
          i + 1,
          s.username || '',
          s.full_name || '',
          v('hw1'),
          v('hw2'),
          v('oral1'),
          v('oral2'),
          v('practical'),
          v('quiz1'),
          v('quiz2'),
          v('final')
        ]);
      });
      var M = function (r1_, c1, r2_, c2) {
        return { s: { r: r1_, c: c1 }, e: { r: r2_, c: c2 } };
      };
      var res = await runWorker({
        cmd: 'write',
        aoa: aoa,
        sheetName: 'سجل ' + String(info.cls || '').replace(/\//g, '-'),
        merges: [
          M(0, 0, 1, 0),
          M(0, 1, 1, 1),
          M(0, 2, 1, 2),
          M(0, 3, 0, 4),
          M(0, 5, 0, 6),
          M(0, 7, 1, 7),
          M(0, 8, 0, 9),
          M(0, 10, 1, 10)
        ],
        cols: [
          { wch: 5 },
          { wch: 14 },
          { wch: 34 },
          { wch: 9 },
          { wch: 9 },
          { wch: 9 },
          { wch: 9 },
          { wch: 12 },
          { wch: 9 },
          { wch: 9 },
          { wch: 14 }
        ]
      });
      var blob = new Blob([res.buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      var a = doc.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'سجل-الدرجات-' + String(info.cls || '').replace(/\//g, '-') + '.xlsx';
      doc.body.appendChild(a);
      a.click();
      setTimeout(function () {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 2000);
    } catch (e) {
      alert(e.message || 'تعذر تجهيز القالب');
    }
  }

  doc.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-rg],#gradeImportBtn,#gradeTemplateBtn');
    if (!t) return;
    if (t.id === 'gradeImportBtn') {
      if (LAST) {
        var cls = el('gradebookClass') ? el('gradebookClass').value : '';
        modal(
          '<div class="rg-head"><h2>📥 استيراد الدرجات</h2><button class="btn secondary" data-rg="close" aria-label="إغلاق">✕</button></div>' +
            '<p class="muted">آخر ملف استخدمته: <b>' +
            h(LAST.fileName) +
            '</b></p><div class="rg-actions">' +
            '<button class="btn primary" data-rg="reuse">استيراد هذا الملف للشعبة ' +
            h(cls) +
            '</button>' +
            '<button class="btn secondary" data-rg="pick">اختيار ملف آخر</button></div>'
        );
      } else if (el('gradeImportFile')) el('gradeImportFile').click();
      return;
    }
    if (t.id === 'gradeTemplateBtn') {
      downloadTemplate();
      return;
    }
    var act = t.getAttribute('data-rg');
    if (act === 'close') closeModal();
    else if (act === 'apply' && S && S.plan) apply();
    else if (act === 'reuse') reuseLast();
    else if (act === 'pick') {
      closeModal();
      if (el('gradeImportFile')) el('gradeImportFile').click();
    }
  });
  doc.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'gradeImportFile') {
      var f = t.files && t.files[0];
      t.value = '';
      startImport(f);
      return;
    }
    if (!S) return;
    if (t.matches('[data-rg-col]')) {
      var c = t.getAttribute('data-rg-col');
      if (t.value) {
        Object.keys(S.mapping).forEach(function (k) {
          if (S.mapping[k] === t.value && k !== c) delete S.mapping[k];
        });
        S.mapping[c] = t.value;
      } else delete S.mapping[c];
      render();
    } else if (t.matches('[data-rg-row]')) {
      if (t.value) S.manual[t.getAttribute('data-rg-row')] = t.value;
      else delete S.manual[t.getAttribute('data-rg-row')];
      render();
    } else if (t.getAttribute('data-rg') === 'sheet') {
      setSheet(Number(t.value));
      render();
    }
  });
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && el('rgImportModal')) closeModal();
  });
})(typeof window !== 'undefined' ? window : this);
