import { useMemo, useState } from 'react';
import { Check, Download, Search, X, XCircle } from 'lucide-react';
import type { Booking, BookingStatus } from '../../types';
import { repo } from '../../data';
import { STATUS_LABEL } from '../../lib/labels';
import { formatDayDate, toISODate } from '../../lib/schedule';
import { canCancel, downloadCSV, periodText, sortByDate, typeText } from '../../lib/bookingHelpers';
import { Btn, ConfirmDialog, EmptyState, StatusBadge, selectCls } from '../../components/ui';
import { RejectDialog } from '../../components/RejectDialog';
import type { AdminData } from './AdminPage';

const PAGE = 15;

export function AllBookings({ bookings, users, reload, actor, toast }: AdminData) {
  const [status, setStatus] = useState<'' | BookingStatus>('');
  const [teacher, setTeacher] = useState('');
  const [when, setWhen] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [toCancel, setToCancel] = useState<Booking | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const today = toISODate(new Date());
  const rows = useMemo(() => {
    let r = bookings.filter((b) =>
      (!status || b.status === status) &&
      (!teacher || b.teacherId === teacher) &&
      (when === 'all' || (when === 'upcoming' ? b.date >= today : b.date < today)) &&
      (!q || `${b.teacherName} ${b.grade}/${b.section} ${typeText(b)}`.includes(q.trim())),
    ).sort(sortByDate);
    if (when !== 'upcoming') r = r.reverse();
    return r;
  }, [bookings, status, teacher, when, q, today]);

  const shown = rows.slice(0, page * PAGE);
  const teachers = users.filter((u) => bookings.some((b) => b.teacherId === u.id));

  const act = async (fn: () => Promise<void>, msg: string) => {
    setBusy(true);
    try { await fn(); await reload(); toast(msg); } catch (e) { toast((e as Error).message, 'err'); }
    setBusy(false);
  };

  const exportCSV = () =>
    downloadCSV(`حجوزات-مركز-المصادر-${today}.csv`, [
      ['التاريخ', 'الحصة', 'المعلم', 'الرقم الوظيفي', 'الصف', 'الشعبة', 'نوع الحجز', 'التوثيق', 'الحالة', 'سبب الرفض'],
      ...rows.map((b) => [b.date, periodText(b), b.teacherName, b.employeeNo, b.grade, b.section, typeText(b), b.wantsDocumentation ? 'نعم' : 'لا', STATUS_LABEL[b.status], b.rejectionReason ?? '']),
    ]);

  return (
    <div>
      {/* الفلاتر في صف واحد */}
      <div className="mb-4 grid gap-2 rounded-xl2 bg-white p-3 shadow-card sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="بحث بالاسم أو الصف أو النوع" className={`${selectCls} pr-9 font-semibold`} />
        </div>
        <select className={selectCls} value={when} onChange={(e) => { setWhen(e.target.value as typeof when); setPage(1); }}>
          <option value="upcoming">القادمة</option>
          <option value="past">السابقة</option>
          <option value="all">كل الفترات</option>
        </select>
        <select className={selectCls} value={status} onChange={(e) => { setStatus(e.target.value as BookingStatus | ''); setPage(1); }}>
          <option value="">كل الحالات</option>
          {(Object.keys(STATUS_LABEL) as BookingStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select className={selectCls} value={teacher} onChange={(e) => { setTeacher(e.target.value); setPage(1); }}>
          <option value="">كل المعلمين</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <Btn variant="outline" onClick={exportCSV}><Download className="h-4 w-4" /> Excel</Btn>
      </div>

      <p className="mb-2 px-1 text-xs font-bold text-navy-400">{rows.length} حجزاً</p>

      {rows.length === 0 ? (
        <EmptyState icon={Search} title="لا توجد نتائج" text="جرّب تغيير عوامل التصفية." />
      ) : (
        <div className="overflow-hidden rounded-xl2 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-right text-sm">
              <thead className="bg-navy-50 text-xs font-extrabold text-navy-600">
                <tr>
                  <th className="px-4 py-3.5">التاريخ والحصة</th>
                  <th className="px-3 py-3.5">المعلم</th>
                  <th className="px-3 py-3.5">الصف</th>
                  <th className="px-3 py-3.5">النوع</th>
                  <th className="px-3 py-3.5">الحالة</th>
                  <th className="px-4 py-3.5 text-left">إدارة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {shown.map((b) => (
                  <tr key={b.id} className="hover:bg-sky-page/60">
                    <td className="px-4 py-3">
                      <div className="font-extrabold text-navy-800">{formatDayDate(b.date)}</div>
                      <div className="text-xs font-semibold text-navy-400">{periodText(b)}</div>
                    </td>
                    <td className="px-3 py-3 font-bold text-navy-700">{b.teacherName}</td>
                    <td className="px-3 py-3 font-bold text-navy-700">{b.grade}/{b.section}</td>
                    <td className="px-3 py-3 font-semibold text-navy-600">{typeText(b)}</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={b.status} />
                      {b.status === 'rejected' && b.rejectionReason && <div className="mt-1 max-w-[220px] text-xs font-semibold text-navy-400">{b.rejectionReason}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        {b.status === 'pending' && (
                          <>
                            <button disabled={busy} onClick={() => act(() => repo.approveBookings([b.id], actor), 'تم اعتماد الحجز')} className="rounded-lg p-2 text-slot-free ring-1 ring-slot-freeBd hover:bg-slot-freeBg" title="اعتماد" aria-label="اعتماد"><Check className="h-4 w-4" /></button>
                            <button disabled={busy} onClick={() => setRejectId(b.id)} className="rounded-lg p-2 text-slot-busy ring-1 ring-slot-busyBd hover:bg-slot-busyBg" title="رفض" aria-label="رفض"><X className="h-4 w-4" /></button>
                          </>
                        )}
                        {canCancel(b) && (
                          <button disabled={busy} onClick={() => setToCancel(b)} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-navy-500 ring-1 ring-navy-100 hover:text-slot-busy hover:ring-slot-busyBd" title="إلغاء">
                            <XCircle className="h-4 w-4" /> إلغاء
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {shown.length < rows.length && (
            <button onClick={() => setPage((p) => p + 1)} className="w-full border-t border-navy-50 py-3 text-sm font-bold text-navy-600 hover:bg-navy-50">
              عرض المزيد ({rows.length - shown.length})
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!toCancel}
        danger
        busy={busy}
        title="إلغاء الحجز"
        confirmLabel="إلغاء الحجز"
        onClose={() => setToCancel(null)}
        onConfirm={async () => { const b = toCancel!; setToCancel(null); await act(() => repo.cancelBooking(b.id, actor), 'تم إلغاء الحجز'); }}
        message={toCancel && <>إلغاء حجز <b>{toCancel.teacherName}</b> يوم <b>{formatDayDate(toCancel.date)}</b> ({periodText(toCancel)})؟</>}
      />
      <RejectDialog
        open={!!rejectId}
        count={1}
        busy={busy}
        onClose={() => setRejectId(null)}
        onConfirm={async (reason) => { const id = rejectId!; setRejectId(null); await act(() => repo.rejectBookings([id], reason, actor), 'تم رفض الحجز'); }}
      />
    </div>
  );
}
