import { useMemo, useState } from 'react';
import { Camera, CheckCircle2, Circle } from 'lucide-react';
import { repo } from '../../data';
import { formatDayDate, toISODate } from '../../lib/schedule';
import { periodText, sortByDate, typeText } from '../../lib/bookingHelpers';
import { EmptyState, StatusBadge } from '../../components/ui';
import type { AdminData } from './AdminPage';

/** الحجوزات التي طلب أصحابها توثيقها */
export function DocumentationRequests({ bookings, reload, toast }: AdminData) {
  const [show, setShow] = useState<'open' | 'done'>('open');
  const today = toISODate(new Date());
  const list = useMemo(
    () => bookings
      .filter((b) => b.wantsDocumentation && (b.status === 'approved' || b.status === 'pending'))
      .filter((b) => (show === 'open' ? !b.documented : b.documented))
      .sort(sortByDate),
    [bookings, show],
  );

  const toggle = async (id: string, v: boolean) => {
    await repo.setDocumented(id, v);
    await reload();
    toast(v ? 'تم تسجيل التوثيق' : 'أُعيد إلى طلبات التوثيق');
  };

  return (
    <div>
      <div className="mb-4 inline-flex rounded-xl bg-white p-1 shadow-card">
        {(['open', 'done'] as const).map((s) => (
          <button key={s} onClick={() => setShow(s)} className={`rounded-lg px-4 py-2 text-sm font-bold ${show === s ? 'bg-navy-800 text-white' : 'text-navy-600'}`}>
            {s === 'open' ? 'بحاجة إلى توثيق' : 'تم توثيقها'}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState icon={Camera} title="لا توجد طلبات" text={show === 'open' ? 'لا توجد حجوزات بانتظار التوثيق.' : 'لم يُوثّق أي حجز بعد.'} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((b) => (
            <article key={b.id} className="flex flex-col rounded-xl2 bg-white p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-extrabold text-navy-800">{formatDayDate(b.date)}</div>
                  <div className="text-xs font-semibold text-navy-400">{periodText(b)}{b.date === today && ' · اليوم'}</div>
                </div>
                <StatusBadge status={b.status} />
              </div>
              <div className="mt-3 text-sm font-bold text-navy-700">{b.teacherName}</div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-lg bg-navy-50 px-2.5 py-1 text-navy-700">الصف {b.grade} / {b.section}</span>
                <span className="rounded-lg bg-navy-50 px-2.5 py-1 text-navy-700">{typeText(b)}</span>
              </div>
              <button
                onClick={() => toggle(b.id, !b.documented)}
                disabled={b.status !== 'approved'}
                className={`mt-4 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${b.documented ? 'bg-slot-freeBg text-slot-free ring-1 ring-slot-freeBd' : 'bg-navy-800 text-white hover:bg-navy-700'}`}
              >
                {b.documented ? <><CheckCircle2 className="h-4 w-4" /> تم التوثيق</> : <><Circle className="h-4 w-4" /> {b.status === 'approved' ? 'تسجيل التوثيق' : 'بانتظار اعتماد الحجز'}</>}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
