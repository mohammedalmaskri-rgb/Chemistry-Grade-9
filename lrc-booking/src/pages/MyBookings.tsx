import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CalendarPlus, Camera, ClipboardList, XCircle } from 'lucide-react';
import type { Booking, BookingStatus } from '../types';
import { repo } from '../data';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { STATUS_LABEL } from '../lib/labels';
import { formatDayDate, periodById, toISODate } from '../lib/schedule';
import { canCancel, periodText, periodTime, sortByDate, typeText } from '../lib/bookingHelpers';
import { Btn, ConfirmDialog, EmptyState, PageHeader, StatusBadge } from '../components/ui';

type Filter = 'all' | BookingStatus;
const FILTERS: Filter[] = ['all', 'pending', 'approved', 'rejected', 'cancelled'];

export default function MyBookings() {
  const { user } = useAuth();
  const toast = useToast();
  const [list, setList] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [toCancel, setToCancel] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setList(await repo.listMyBookings(user!.id));
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: list.length, pending: 0, approved: 0, rejected: 0, cancelled: 0 };
    list.forEach((b) => c[b.status]++);
    return c;
  }, [list]);

  // القادمة أولاً بترتيب زمني، ثم السابقة من الأحدث
  const shown = useMemo(() => {
    const f = list.filter((b) => filter === 'all' || b.status === filter);
    const today = toISODate(new Date());
    const upcoming = f.filter((b) => b.date >= today).sort(sortByDate);
    const past = f.filter((b) => b.date < today).sort(sortByDate).reverse();
    return [...upcoming, ...past];
  }, [list, filter]);

  const doCancel = async () => {
    if (!toCancel) return;
    setBusy(true);
    try {
      await repo.cancelBooking(toCancel.id, user!);
      toast('تم إلغاء الحجز وأصبحت الحصة متاحة');
      setToCancel(null);
      load();
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader
        title="حجوزاتي"
        subtitle="جميع طلبات الحجز التي أرسلتها وحالة كل منها"
        actions={<Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-navy-800 px-4 py-2.5 text-sm font-bold text-white shadow-lift hover:bg-navy-700"><CalendarPlus className="h-4 w-4" /> حجز جديد</Link>}
      />

      {/* فلاتر الحالة */}
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${filter === f ? 'bg-navy-800 text-white shadow-lift' : 'bg-white text-navy-600 shadow-card hover:text-navy-800'}`}
          >
            {f === 'all' ? 'الكل' : STATUS_LABEL[f]}
            <span className={`rounded-full px-2 py-0.5 text-xs ${filter === f ? 'bg-white/15' : 'bg-navy-50'}`}>{counts[f]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl2 bg-white/70" />)}</div>
      ) : shown.length === 0 ? (
        <EmptyState icon={ClipboardList} title="لا توجد حجوزات" text="لا توجد حجوزات بهذه الحالة حالياً." />
      ) : (
        <>
          {/* كمبيوتر: جدول */}
          <div className="hidden overflow-hidden rounded-xl2 bg-white shadow-card md:block">
            <table className="w-full text-right text-sm">
              <thead className="bg-navy-50 text-xs font-extrabold text-navy-600">
                <tr>
                  <th className="px-5 py-3.5">التاريخ</th>
                  <th className="px-3 py-3.5">الحصة</th>
                  <th className="px-3 py-3.5">الصف / الشعبة</th>
                  <th className="px-3 py-3.5">نوع الحجز</th>
                  <th className="px-3 py-3.5">الحالة</th>
                  <th className="px-5 py-3.5 text-left">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {shown.map((b) => (
                  <tr key={b.id} className="align-top hover:bg-sky-page/60">
                    <td className="px-5 py-4 font-extrabold text-navy-800">{formatDayDate(b.date)}</td>
                    <td className="px-3 py-4">
                      <div className="font-bold text-navy-800">{periodText(b)}</div>
                      <div className="text-xs font-semibold text-navy-400" dir="ltr">{periodTime(b)}</div>
                    </td>
                    <td className="px-3 py-4 font-bold text-navy-700">الصف {b.grade} / {b.section}</td>
                    <td className="px-3 py-4">
                      <div className="font-bold text-navy-700">{typeText(b)}</div>
                      {b.wantsDocumentation && <DocTag />}
                    </td>
                    <td className="px-3 py-4">
                      <StatusBadge status={b.status} />
                      {b.status === 'rejected' && <Reason b={b} />}
                      {b.status === 'cancelled' && b.cancelledByRole && b.cancelledByRole !== 'teacher' && (
                        <div className="mt-1.5 text-xs font-semibold text-navy-400">أُلغي من قبل الإدارة</div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-left">
                      {canCancel(b) && (
                        <Btn variant="danger" className="!px-3 !py-1.5 text-xs" onClick={() => setToCancel(b)}>
                          <XCircle className="h-4 w-4" /> إلغاء
                        </Btn>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* هاتف: بطاقات */}
          <div className="grid gap-3 md:hidden">
            {shown.map((b) => (
              <article key={b.id} className="rounded-xl2 bg-white p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-extrabold text-navy-800">{formatDayDate(b.date)}</div>
                    <div className="mt-0.5 text-xs font-semibold text-navy-500">
                      {periodText(b)} · <span dir="ltr">{periodTime(b)}</span>
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-lg bg-navy-50 px-2.5 py-1 text-navy-700">الصف {b.grade} / {b.section}</span>
                  <span className="rounded-lg bg-navy-50 px-2.5 py-1 text-navy-700">{typeText(b)}</span>
                  {b.wantsDocumentation && <DocTag />}
                </div>
                {b.status === 'rejected' && <Reason b={b} />}
                {canCancel(b) && (
                  <Btn variant="danger" className="mt-3 w-full" onClick={() => setToCancel(b)}>
                    <XCircle className="h-4 w-4" /> إلغاء الحجز
                  </Btn>
                )}
              </article>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!toCancel}
        danger
        busy={busy}
        title="إلغاء الحجز"
        confirmLabel="نعم، إلغاء الحجز"
        onClose={() => setToCancel(null)}
        onConfirm={doCancel}
        message={toCancel && <>هل تريد إلغاء حجز <b>{periodById(toCancel.periodId)?.label}</b> يوم <b>{formatDayDate(toCancel.date)}</b>؟ ستصبح الحصة متاحة لبقية المعلمين.</>}
      />
    </div>
  );
}

function Reason({ b }: { b: Booking }) {
  return (
    <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-slot-busyBg/60 px-2.5 py-2 text-xs font-semibold leading-5 text-slot-busy">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span><b>سبب الرفض:</b> {b.rejectionReason ?? 'لم يُذكر سبب'}</span>
    </div>
  );
}

function DocTag() {
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-lg bg-sky-soft px-2 py-0.5 text-[11px] font-bold text-navy-600">
      <Camera className="h-3 w-3" /> توثيق
    </span>
  );
}
