import { useEffect, useState } from 'react';
import { Coffee } from 'lucide-react';
import type { Period, SlotView } from '../types';
import { PERIODS, slotKey, toISODate, type WeekDay } from '../lib/schedule';
import { SlotCell, SlotIcon } from './SlotCell';
import { slotInfo } from './slotStyle';

interface Props {
  days: WeekDay[];
  slots: Map<string, SlotView>;
  selected: Set<string>;
  onToggle: (key: string) => void;
}

export function ScheduleGrid(props: Props) {
  return (
    <>
      <DesktopTable {...props} />
      <MobileDay {...props} />
    </>
  );
}

/* ───────── كمبيوتر وآيباد: جدول كامل ───────── */
function DesktopTable({ days, slots, selected, onToggle }: Props) {
  const today = toISODate(new Date());
  return (
    <div className="hidden overflow-x-auto rounded-xl2 bg-white p-3 shadow-card md:block">
      <table className="w-full min-w-[920px] table-fixed border-separate border-spacing-1.5">
        <colgroup>
          <col className="w-[104px]" />
          {PERIODS.map((p) => <col key={p.id} />)}
        </colgroup>
        <thead>
          <tr>
            <th className="rounded-xl bg-navy-800 px-3 py-3 text-sm font-extrabold text-white">اليوم</th>
            {PERIODS.map((p) => (
              <th key={p.id} className={`rounded-xl px-1.5 py-2.5 ${p.isBreak ? 'bg-amber-50 ring-1 ring-inset ring-amber-200' : 'bg-navy-50'}`}>
                <div className={`flex items-center justify-center gap-1 text-[13px] font-extrabold ${p.isBreak ? 'text-amber-800' : 'text-navy-800'}`}>
                  {p.isBreak && <Coffee className="h-3.5 w-3.5" />}
                  {p.isBreak ? 'الاستراحة' : p.label.replace('الحصة ', 'الحصة ')}
                </div>
                <div className={`text-[11px] font-semibold ${p.isBreak ? 'text-amber-700/80' : 'text-navy-400'}`} dir="ltr">{p.start} – {p.end}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((d) => {
            const isToday = d.date === today;
            return (
              <tr key={d.date}>
                <th className={`rounded-xl px-3 py-2 text-right ${isToday ? 'bg-navy-700 text-white' : 'bg-sky-soft text-navy-800'}`}>
                  <div className="text-sm font-extrabold">{d.dayName}</div>
                  <div className={`text-xs font-semibold ${isToday ? 'text-navy-100' : 'text-navy-400'}`}>
                    {d.dayNum} {d.monthName}{isToday && ' · اليوم'}
                  </div>
                </th>
                {PERIODS.map((p) => {
                  const k = slotKey(d.date, p.id);
                  return (
                    <td key={p.id}>
                      <SlotCell
                        slot={slots.get(k)!}
                        selected={selected.has(k)}
                        onToggle={() => onToggle(k)}
                        isBreak={p.isBreak}
                        ariaContext={`${d.dayName} ${d.dayNum} ${d.monthName}، ${p.label}`}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ───────── الهاتف: اختيار اليوم ثم قائمة حصص كبيرة ───────── */
const ROW_CLS = {
  selected: 'border-navy-700 bg-navy-700 text-white shadow-lift',
  available: 'border-slot-freeBd bg-white active:scale-[.99] hover:border-slot-free',
  pending: 'border-slot-pendBd bg-slot-pendBg',
  approved: 'border-slot-busyBd bg-slot-busyBg',
  past: 'border-dashed border-navy-100 bg-navy-50/40 opacity-70',
};
const PILL_CLS = {
  selected: 'bg-white text-navy-800',
  available: 'bg-slot-freeBg text-slot-free ring-1 ring-slot-freeBd',
  pending: 'bg-white/70 text-slot-pend ring-1 ring-slot-pendBd',
  approved: 'bg-white/70 text-slot-busy ring-1 ring-slot-busyBd',
  past: 'bg-transparent text-navy-300',
};

function MobileDay({ days, slots, selected, onToggle }: Props) {
  const today = toISODate(new Date());
  const firstOpen = () => {
    const i = days.findIndex((d) => PERIODS.some((p) => slots.get(slotKey(d.date, p.id))?.state !== 'past'));
    return i < 0 ? 0 : i;
  };
  const [dayIdx, setDayIdx] = useState(firstOpen);
  // عند تغيير الأسبوع نبدأ بأول يوم فيه حصص قادمة
  useEffect(() => { setDayIdx(firstOpen()); /* eslint-disable-next-line */ }, [days[0].date]);
  const day = days[dayIdx];

  return (
    <div className="md:hidden">
      {/* أزرار الأيام */}
      <div className="grid grid-cols-5 gap-1.5 rounded-xl2 bg-white p-1.5 shadow-card">
        {days.map((d, i) => {
          const free = PERIODS.filter((p) => slots.get(slotKey(d.date, p.id))?.state === 'available').length;
          const sel = PERIODS.filter((p) => selected.has(slotKey(d.date, p.id))).length;
          const active = i === dayIdx;
          return (
            <button
              key={d.date}
              onClick={() => setDayIdx(i)}
              aria-pressed={active}
              className={`relative flex flex-col items-center rounded-xl py-2 transition ${active ? 'bg-navy-800 text-white shadow-lift' : 'text-navy-700 hover:bg-navy-50'}`}
            >
              <span className="text-[13px] font-extrabold">{d.dayName}</span>
              <span className={`text-lg font-extrabold leading-tight ${active ? '' : d.date === today ? 'text-navy-500' : ''}`}>{d.dayNum}</span>
              <span className={`text-[10px] font-bold ${active ? 'text-navy-200' : free ? 'text-slot-free' : 'text-navy-300'}`}>
                {free ? `${free} متاحة` : 'ممتلئ'}
              </span>
              {sel > 0 && (
                <span className="absolute -top-1 left-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#E9B10A] px-1 text-[11px] font-extrabold text-navy-900">{sel}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-baseline justify-between px-1">
        <h3 className="text-base font-extrabold text-navy-800">
          {day.dayName} {day.dayNum} {day.monthName}
          {day.date === today && <span className="mr-2 rounded-full bg-navy-100 px-2 py-0.5 text-xs text-navy-700">اليوم</span>}
        </h3>
        <span className="text-xs font-semibold text-navy-400">اضغط على الحصة لاختيارها</span>
      </div>

      <ul className="mt-2 grid gap-2">
        {PERIODS.map((p) => {
          const k = slotKey(day.date, p.id);
          return <MobileRow key={p.id} p={p} slot={slots.get(k)!} selected={selected.has(k)} onToggle={() => onToggle(k)} />;
        })}
      </ul>
    </div>
  );
}

function MobileRow({ p, slot, selected, onToggle }: { p: Period; slot: SlotView; selected: boolean; onToggle: () => void }) {
  const info = slotInfo(slot, selected);
  const clickable = slot.state === 'available';
  const isSel = info.kind === 'selected';
  return (
    <li>
      <button
        type="button"
        onClick={clickable ? onToggle : undefined}
        aria-disabled={!clickable}
        aria-pressed={clickable ? selected : undefined}
        aria-label={`${p.label}: ${info.title}`}
        className={`flex min-h-[68px] w-full items-center gap-3 rounded-xl2 border-2 px-3 py-2.5 text-right transition ${ROW_CLS[info.kind]} ${
          p.isBreak && !isSel ? 'border-dashed' : ''
        } ${clickable ? '' : 'cursor-not-allowed'}`}
      >
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-base font-extrabold ${
            isSel ? 'bg-white/15 text-white' : p.isBreak ? 'bg-amber-100 text-amber-800' : 'bg-navy-50 text-navy-700'
          }`}
        >
          {p.isBreak ? <Coffee className="h-5 w-5" /> : p.short}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-[15px] font-extrabold ${isSel ? 'text-white' : 'text-navy-800'}`}>{p.label}</span>
          <span className={`block text-xs font-semibold ${isSel ? 'text-navy-100' : 'text-navy-400'}`}>
            <span dir="ltr">{p.start} – {p.end}</span>
            {info.sub && <> · {info.sub}</>}
          </span>
        </span>
        <span className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-extrabold ${PILL_CLS[info.kind]}`}>
          <SlotIcon kind={info.kind} className="h-3.5 w-3.5" />
          {info.title}
        </span>
      </button>
    </li>
  );
}
