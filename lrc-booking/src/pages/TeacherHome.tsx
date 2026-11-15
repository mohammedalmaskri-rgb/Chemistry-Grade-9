import { useMemo, useState } from 'react';
import { CalendarCheck2, CalendarClock, CalendarRange, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSchedule } from '../lib/useSchedule';
import { WEEK_LABELS, weekRangeLabel } from '../lib/schedule';
import { ScheduleGrid } from '../components/ScheduleGrid';
import { StatusLegend } from '../components/StatusLegend';
import { SelectionBar } from '../components/SelectionBar';
import { BookingFormModal } from '../components/BookingFormModal';

export default function TeacherHome() {
  const { user } = useAuth();
  const { weeks, slots, loading, refresh } = useSchedule(user!.id);
  const [week, setWeek] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);

  const toggle = (k: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  const stats = useMemo(() => {
    let available = 0, myPending = 0, myApproved = 0;
    for (const s of slots.values()) {
      if (s.state === 'available') available++;
      if (s.isMine && s.state === 'pending') myPending++;
      if (s.isMine && s.state === 'approved') myApproved++;
    }
    return { available, myPending, myApproved };
  }, [slots]);

  const selectedPerWeek = weeks.map((w) => [...selected].filter((k) => w.some((d) => k.startsWith(d.date))).length);

  return (
    <div className={selected.size ? 'pb-40 sm:pb-28' : ''}>
      {/* الترحيب */}
      <section className="relative overflow-hidden rounded-xl2 bg-navy-800 p-6 text-white shadow-lift sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-20 left-40 h-48 w-48 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-navy-200">مرحباً بك،</p>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{user!.name}</h1>
            <p className="mt-2 text-sm font-medium text-navy-100">
              {user!.subject ? `معلم ${user!.subject} · ` : ''}اختر الحصص المناسبة من الجدول ثم اضغط «متابعة الحجز».
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { icon: CalendarRange, n: stats.available, t: 'حصة متاحة' },
              { icon: CalendarClock, n: stats.myPending, t: 'بانتظار الموافقة' },
              { icon: CalendarCheck2, n: stats.myApproved, t: 'حجوزات معتمدة' },
            ].map(({ icon: I, n, t }) => (
              <div key={t} className="rounded-xl bg-white/10 px-3 py-3 text-center backdrop-blur sm:min-w-[120px] sm:px-4">
                <I className="mx-auto h-5 w-5 text-navy-200" />
                <div className="mt-1 text-2xl font-extrabold">{loading ? '–' : n}</div>
                <div className="text-[11px] font-semibold text-navy-100 sm:text-xs">{t}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* رأس الجدول */}
      <section className="mt-6 sm:mt-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-navy-800 sm:text-2xl">جدول حجز مركز مصادر التعلم</h2>
            <p className="mt-1 text-sm font-medium text-navy-400">يمكنك اختيار أكثر من حصة (بما فيها الاستراحة)، ولو في أيام أو أسابيع مختلفة، وإرسالها في طلب واحد.</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusLegend />
            <button onClick={refresh} className="hidden rounded-xl border border-navy-100 bg-white p-2.5 text-navy-500 transition hover:text-navy-800 sm:block" aria-label="تحديث الجدول" title="تحديث">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* تبويبات الأسابيع */}
        <div role="tablist" className="mt-5 grid grid-cols-3 gap-2 rounded-xl2 bg-white p-1.5 shadow-card sm:inline-grid sm:min-w-[620px]">
          {weeks.map((w, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={week === i}
              onClick={() => setWeek(i)}
              className={`relative rounded-xl px-2 py-2.5 text-center transition ${week === i ? 'bg-navy-800 text-white shadow-lift' : 'text-navy-600 hover:bg-navy-50'}`}
            >
              <div className="text-sm font-extrabold sm:text-base">{WEEK_LABELS[i]}</div>
              <div className={`text-[11px] font-semibold sm:text-xs ${week === i ? 'text-navy-200' : 'text-navy-400'}`}>{weekRangeLabel(w)}</div>
              {selectedPerWeek[i] > 0 && (
                <span className="absolute -top-1.5 left-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#E9B10A] px-1 text-[11px] font-extrabold text-navy-900">
                  {selectedPerWeek[i]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className={`mt-4 transition-opacity ${loading ? 'opacity-50' : ''}`}>
          <ScheduleGrid days={weeks[week]} slots={slots} selected={selected} onToggle={toggle} />
        </div>
      </section>

      <BookingFormModal
        open={formOpen}
        user={user!}
        keys={[...selected]}
        onClose={() => setFormOpen(false)}
        onRemove={toggle}
        onSubmitted={() => { setSelected(new Set()); refresh(); }}
      />

      <SelectionBar
        keys={formOpen ? [] : [...selected]}
        onRemove={toggle}
        onClear={() => setSelected(new Set())}
        onContinue={() => setFormOpen(true)}
      />
    </div>
  );
}
