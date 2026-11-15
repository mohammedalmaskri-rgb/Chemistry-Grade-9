import { useEffect, useMemo, useState } from 'react';
import { Ban, CalendarCheck2, CheckCircle2, Clock3, FileDown, FileSpreadsheet, Layers, Users, XCircle } from 'lucide-react';
import type { Booking } from '../types';
import { repo } from '../data';
import { computeStats } from '../lib/stats';
import { downloadCSV, periodText, typeText } from '../lib/bookingHelpers';
import { STATUS_LABEL } from '../lib/labels';
import { toISODate } from '../lib/schedule';
import { useToast } from '../context/ToastContext';
import { BarList, ColumnChart } from '../components/charts';
import { Btn, PageHeader } from '../components/ui';

const RANGES = [
  { id: 30, label: 'آخر 30 يوماً' },
  { id: 90, label: 'آخر 3 أشهر' },
  { id: 0, label: 'الكل' },
];

export default function StatsPage() {
  const toast = useToast();
  const [all, setAll] = useState<Booking[]>([]);
  const [range, setRange] = useState(90);
  const [loading, setLoading] = useState(true);
  useEffect(() => { repo.listAllBookings().then((b) => { setAll(b); setLoading(false); }); }, []);
  const s = useMemo(() => computeStats(all, range || null), [all, range]);

  const exportExcel = () => {
    downloadCSV(`تقرير-مركز-المصادر-${toISODate(new Date())}.csv`, [
      ['تقرير حجوزات مركز مصادر التعلم', RANGES.find((r) => r.id === range)!.label],
      [],
      ['إجمالي الحجوزات', s.total], ['المعتمدة', s.approved], ['المعلقة', s.pending], ['المرفوضة', s.rejected], ['الملغاة', s.cancelled], ['المعلمون المستخدمون', s.teachersUsing],
      [],
      ['أكثر المعلمين استخداماً', 'عدد الحجوزات'], ...s.topTeachers.map((t) => [t.label, t.value]),
      [],
      ['نوع الحجز', 'العدد'], ...s.types.map((t) => [t.label, t.value]),
      [],
      ['التاريخ', 'الحصة', 'المعلم', 'الصف', 'الشعبة', 'النوع', 'الحالة'],
      ...all.map((b) => [b.date, periodText(b), b.teacherName, b.grade, b.section, typeText(b), STATUS_LABEL[b.status]]),
    ]);
    toast('تم تنزيل التقرير (Excel)');
  };

  const tiles = [
    { label: 'إجمالي الحجوزات', value: s.total, icon: Layers, chip: 'bg-navy-50 text-navy-700' },
    { label: 'المعتمدة', value: s.approved, icon: CheckCircle2, chip: 'bg-slot-busyBg text-slot-busy' },
    { label: 'بانتظار الموافقة', value: s.pending, icon: Clock3, chip: 'bg-slot-pendBg text-slot-pend' },
    { label: 'المرفوضة', value: s.rejected, icon: XCircle, chip: 'bg-navy-50 text-navy-600' },
    { label: 'الملغاة', value: s.cancelled, icon: Ban, chip: 'bg-gray-100 text-gray-500' },
    { label: 'المعلمون المستخدمون', value: s.teachersUsing, icon: Users, chip: 'bg-sky-soft text-navy-700' },
  ];

  return (
    <div className="print:p-0">
      <PageHeader
        title="لوحة الإحصائيات"
        subtitle="مؤشرات استخدام مركز مصادر التعلم"
        actions={
          <>
            <Btn variant="outline" onClick={exportExcel}><FileSpreadsheet className="h-4 w-4" /> تصدير Excel</Btn>
            <Btn variant="outline" onClick={() => window.print()}><FileDown className="h-4 w-4" /> تقرير PDF</Btn>
          </>
        }
      />

      {/* فلتر الفترة */}
      <div className="mb-5 flex flex-wrap items-center gap-3 print:hidden">
        <div className="inline-flex rounded-xl bg-white p-1 shadow-card">
          {RANGES.map((r) => (
            <button key={r.id} onClick={() => setRange(r.id)} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${range === r.id ? 'bg-navy-800 text-white' : 'text-navy-600 hover:text-navy-800'}`}>{r.label}</button>
          ))}
        </div>
        {s.fromLabel && <span className="text-xs font-semibold text-navy-400">من {s.fromLabel} حتى نهاية الأسابيع المتاحة للحجز</span>}
      </div>

      <div className={`transition-opacity ${loading ? 'opacity-40' : ''}`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {tiles.map(({ label, value, icon: I, chip }) => (
            <div key={label} className="rounded-xl2 bg-white p-4 shadow-card">
              <span className={`grid h-9 w-9 place-items-center rounded-xl ${chip}`}><I className="h-5 w-5" /></span>
              <div className="mt-3 text-[28px] font-extrabold leading-none text-navy-800">{value}</div>
              <div className="mt-1.5 text-xs font-bold text-navy-500">{label}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3" title="الحجوزات الأسبوعية" note="المعتمدة والمعلقة · الأسبوع الحالي بالكحلي الداكن والقادمة بالفاتح">
            <ColumnChart data={s.weekly} height={220} />
          </Card>
          <Card className="lg:col-span-2" title="الحجوزات الشهرية" note="آخر 6 أشهر">
            <ColumnChart data={s.monthly} height={220} />
          </Card>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card title="أكثر المعلمين استخداماً" note="عدد الحصص المعتمدة والمعلقة">
            <ol className="grid gap-3">
              {s.topTeachers.map((t, i) => (
                <li key={t.label} className="flex items-center gap-3">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-extrabold ${i === 0 ? 'bg-[#F5C451] text-navy-900' : 'bg-navy-50 text-navy-600'}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-bold text-navy-800">{t.label}</span>
                      <span className="font-extrabold text-navy-800">{t.value}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-navy-50">
                      <div className="h-full rounded-full bg-navy-600" style={{ width: `${(t.value / (s.topTeachers[0]?.value || 1)) * 100}%` }} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
          <Card title="أنواع الحجوزات">
            <BarList data={s.types} />
          </Card>
          <Card title="أكثر الحصص طلباً">
            <BarList data={s.periods} />
            <div className="mt-5 flex items-center gap-3 rounded-xl bg-sky-page p-3">
              <CalendarCheck2 className="h-8 w-8 text-navy-500" />
              <div>
                <div className="text-xl font-extrabold text-navy-800">{s.approvalRate}%</div>
                <div className="text-xs font-bold text-navy-500">نسبة الاعتماد من الطلبات التي تمت مراجعتها</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, note, children, className = '' }: { title: string; note?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl2 bg-white p-5 shadow-card break-inside-avoid ${className}`}>
      <h2 className="text-base font-extrabold text-navy-800">{title}</h2>
      {note && <p className="mt-0.5 text-xs font-semibold text-navy-400">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
