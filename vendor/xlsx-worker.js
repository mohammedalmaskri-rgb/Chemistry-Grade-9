/* قارئ ملفات Excel معزول (Web Worker).
   يعمل SheetJS هنا فقط، بعيدًا عن صفحة المنصة وجلسة المستخدم؛ ولا يخرج من هنا إلا بيانات بسيطة (صفوف وقيم). */
'use strict';
importScripts('xlsx.full.min.js');
function fillMerges(ws, aoa) {
  (ws['!merges'] || []).forEach(function (m) {
    var v = (aoa[m.s.r] || [])[m.s.c];
    for (var r = m.s.r; r <= m.e.r; r++) {
      aoa[r] = aoa[r] || [];
      for (var c = m.s.c; c <= m.e.c; c++) if (aoa[r][c] === '' || aoa[r][c] == null) aoa[r][c] = v;
    }
  });
  return aoa;
}
self.onmessage = function (e) {
  var d = e.data || {};
  try {
    if (d.cmd === 'read') {
      var wb = XLSX.read(new Uint8Array(d.buf), { type: 'array', cellDates: true, dense: false });
      var sheets = wb.SheetNames.slice(0, 20).map(function (n) {
        var ws = wb.Sheets[n];
        var aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: false });
        aoa = fillMerges(ws, aoa).slice(0, 2000).map(function (row) {
          return (row || []).slice(0, 80).map(function (v) {
            if (v instanceof Date) return v.toISOString().slice(0, 10);
            if (typeof v === 'number' || typeof v === 'boolean') return v;
            return v == null ? '' : String(v).slice(0, 300);
          });
        });
        return { name: String(n).slice(0, 100), rows: aoa };
      });
      self.postMessage({ ok: true, sheets: sheets });
    } else if (d.cmd === 'write') {
      var ws2 = XLSX.utils.aoa_to_sheet(d.aoa || []);
      if (d.merges) ws2['!merges'] = d.merges;
      if (d.cols) ws2['!cols'] = d.cols;
      var wb2 = XLSX.utils.book_new();
      wb2.Workbook = { Views: [{ RTL: true }] };
      XLSX.utils.book_append_sheet(wb2, ws2, String(d.sheetName || 'Sheet1').slice(0, 31));
      var out = XLSX.write(wb2, { bookType: 'xlsx', type: 'array' });
      self.postMessage({ ok: true, buf: out }, [out]);
    } else {
      self.postMessage({ ok: false, error: 'unknown command' });
    }
  } catch (err) {
    self.postMessage({ ok: false, error: String((err && err.message) || err) });
  }
};
