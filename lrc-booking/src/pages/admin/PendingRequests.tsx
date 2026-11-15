import { useMemo, useState } from 'react';
import { Camera, Check, CheckCheck, Clock3, Inbox, X } from 'lucide-react';
import type { Booking } from '../../types';
import { repo } from '../../data';
import { formatDayDate } from '../../lib/schedule';
import { periodText, periodTime, sortByDate, typeText } from '../../lib/bookingHelpers';
import { Btn, EmptyState } from '../../components/ui';
import { RejectDialog } from '../../components/RejectDialog';
import type { AdminData } from './AdminPage';

/** الطلبات المعلقة مجمّعة حسب الطلب (قد يضم الطلب عدة حصص) */
export function PendingRequests({ bookings, reload, actor, toast }: AdminData) {
  const [rejectIds, setRejectIds] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  const groups = useMemo(() => {
    const m = new Map<string, Booking[]>();
    bookings.filter((b) => b.status === 'pending').sort(sortByDate).forEach((b) => m.set(b.requestId, [...(m.get(b.requestId) ?? []), b]));
    return [...m.values()].sort((a, b) => a[0].createdAt.localeCompare(b[0].createdAt));
  }, [bookings]);

  const approve = async (ids: string[]) => {
    setBusy(true);
    await repo.approveBookings(ids, actor);
    await reload();
    setBusy(false);
    toast(ids.length > 1 ? `تم اعتماد ${ids.length} حصص` : 'تم اعتماد الحجز');
  };
  const reject = async (reason: string) => {
    if (!rejectIds) return;
    setBusy(true);
    await repo.rejectBookings(rejectIds, reason, actor);
    await reload();
    setBusy(false);
    toast('تم رفض الطلب وإشعار المعلم بالسبب');
    setRejectIds(null);
  };

  if (groups.length === 0) return <EmptyState icon={Inbox} title="لا توجد طلبات معلقة" text="تمت مراجعة جميع طلبات الحجز." />;

  return (
    <div className="grid gap-4">
      {groups.map((items) => {
        const f = items[0];
        const ids = items.map((i) => i.id);
        return (
          <article key={f.requestId} className="overflow-hidden rounded-xl2 bg-white shadow-card">
            <header className="flex flex-col gap-3 border-b border-navy-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-slot-pendBg text-slot-pend ring-1 ring-slot-pendBd">
                  <Clock3 className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-extrabold text-navy-800">{f.teacherName}</div>
                  <div className="text-xs font-semibold text-navy-400">
                    الرقم الوظيفي <span dir="ltr">{f.employeeNo}</span> · {items.length} {items.length === 1 ? 'حصة' : items.length === 2 ? 'حصتان' : 'حصص'}
                    {f.wantsDocumentation && <span className="mr-2 inline-flex items-center gap-1 rounded bg-sky-soft px-1.5 py-0.5 text-navy-600"><Camera className="h-3 w-3" /> يرغب في التوثيق</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Btn variant="success" disabled={busy} onClick={() => approve(ids)} className="flex-1 sm:flex-none">
                  <CheckCheck className="h-4 w-4" /> {items.length > 1 ? 'اعتماد الكل' : 'اعتماد'}
                </Btn>
                <Btn variant="danger" disabled={busy} onClick={() => setRejectIds(ids)} className="flex-1 sm:flex-none">
                  <X className="h-4 w-4" /> {items.length > 1 ? 'رفض الكل' : 'رفض'}
                </Btn>
              </div>
            </header>
            <ul className="divide-y divide-navy-50">
              {items.map((b) => (
                <li key={b.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                  <div className="min-w-[180px]">
                    <div className="text-sm font-extrabold text-navy-800">{formatDayDate(b.date)}</div>
                    <div className="text-xs font-semibold text-navy-400">{periodText(b)} · <span dir="ltr">{periodTime(b)}</span></div>
                  </div>
                  <div className="flex flex-1 flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-lg bg-navy-50 px-2.5 py-1 text-navy-700">الصف {b.grade} / {b.section}</span>
                    <span className="rounded-lg bg-navy-50 px-2.5 py-1 text-navy-700">{typeText(b)}</span>
                  </div>
                  {items.length > 1 && (
                    <div className="flex gap-1.5">
                      <button disabled={busy} onClick={() => approve([b.id])} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slot-free ring-1 ring-slot-freeBd hover:bg-slot-freeBg">
                        <Check className="h-3.5 w-3.5" /> اعتماد
                      </button>
                      <button disabled={busy} onClick={() => setRejectIds([b.id])} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slot-busy ring-1 ring-slot-busyBd hover:bg-slot-busyBg">
                        <X className="h-3.5 w-3.5" /> رفض
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </article>
        );
      })}
      <RejectDialog open={!!rejectIds} count={rejectIds?.length ?? 0} busy={busy} onClose={() => setRejectIds(null)} onConfirm={reject} />
    </div>
  );
}
