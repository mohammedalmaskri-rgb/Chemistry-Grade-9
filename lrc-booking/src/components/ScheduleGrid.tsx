import { Coffee } from 'lucide-react';
import type { SlotView } from '../types';
import { BOOKABLE_PERIODS, PERIODS, slotKey, toISODate, type WeekDay } from '../lib/schedule';
import { SlotCell } from './SlotCell';

interface Props {
  days: WeekDay[];
  slots: Map<string, SlotView>;
  selected: Set<string>;
  onToggle: (key: string) => void;
}

export function ScheduleGrid({ days, slots, selected, onToggle }: Props) {
  const today = toISODate(new Date());

  return (
    <>
      {/* كمبيوتر وآيباد أفقي: جدول */}
      <div className="hidden overflow-x-auto rounded-xl2 bg-white p-3 shadow-card md:block">
        <table className="w-full min-w-[860px] border-separate border-spacing-1.5">
          <thead>
            <tr>
              <th className="w-[110px] rounded-xl bg-navy-800 px-3 py-3 text-sm font-extrabold text-white">اليوم</th>
              {PERIODS.map((p) =>
                p.isBreak ? (
                  <th key={p.id} className="w-12 rounded-xl bg-navy-50 px-1 py-3 text-xs font-bold text-navy-400">
                    <Coffee className="mx-auto h-4 w-4" />
                  </th>
                ) : (
                  <th key={p.id} className="rounded-xl bg-navy-50 px-2 py-2.5">
                    <div className="text-sm font-extrabold text-navy-800">الحصة {p.label}</div>
                    <div className="text-[11px] font-semibold text-navy-400" dir="ltr">{p.start} – {p.end}</div>
                  </th>
                ),
              )}
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
                  {PERIODS.map((p) =>
                    p.isBreak ? (
                      <td key={p.id} className="rounded-xl bg-[repeating-linear-gradient(135deg,#EEF3FA_0_6px,#F7F9FD_6px_12px)]">
                        {d === days[2] && <span className="block text-center text-[11px] font-bold text-navy-400 [writing-mode:vertical-rl]">استراحة</span>}
                      </td>
                    ) : (
                      <td key={p.id}>
                        <SlotCell
                          slot={slots.get(slotKey(d.date, p.id))!}
                          selected={selected.has(slotKey(d.date, p.id))}
                          onToggle={() => onToggle(slotKey(d.date, p.id))}
                          ariaContext={`${d.dayName} ${d.dayNum} ${d.monthName}، الحصة ${p.label}`}
                        />
                      </td>
                    ),
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* هاتف وآيباد عمودي: بطاقات الأيام */}
      <div className="grid gap-4 md:hidden">
        {days.map((d) => {
          const isToday = d.date === today;
          return (
            <section key={d.date} className="overflow-hidden rounded-xl2 bg-white shadow-card">
              <header className={`flex items-center justify-between px-4 py-3 ${isToday ? 'bg-navy-700 text-white' : 'bg-navy-800 text-white'}`}>
                <h3 className="text-base font-extrabold">{d.dayName}</h3>
                <span className="text-sm font-semibold text-navy-100">
                  {d.dayNum} {d.monthName}{isToday && ' · اليوم'}
                </span>
              </header>
              <div className="grid grid-cols-2 gap-2 p-3 min-[480px]:grid-cols-4">
                {PERIODS.map((p) =>
                  p.isBreak ? (
                    <div key={p.id} className="col-span-full flex items-center gap-2 py-0.5 text-xs font-bold text-navy-400">
                      <span className="h-px flex-1 bg-navy-100" />
                      <Coffee className="h-3.5 w-3.5" /> الاستراحة <span dir="ltr">{p.start}–{p.end}</span>
                      <span className="h-px flex-1 bg-navy-100" />
                    </div>
                  ) : (
                    <SlotCell
                      key={p.id}
                      slot={slots.get(slotKey(d.date, p.id))!}
                      selected={selected.has(slotKey(d.date, p.id))}
                      onToggle={() => onToggle(slotKey(d.date, p.id))}
                      ariaContext={`${d.dayName}، الحصة ${p.label}`}
                      compactLabel={`الحصة ${p.label} · ${p.start}`}
                    />
                  ),
                )}
              </div>
            </section>
          );
        })}
      </div>
      <span className="sr-only">{BOOKABLE_PERIODS.length} حصص يومياً</span>
    </>
  );
}
