import { ArrowLeft, Trash2, X } from 'lucide-react';
import { DAY_NAMES, fromISODate, periodById } from '../lib/schedule';

interface Props {
  keys: string[];
  onRemove: (key: string) => void;
  onClear: () => void;
  onContinue: () => void;
}

export function SelectionBar({ keys, onRemove, onClear, onContinue }: Props) {
  if (keys.length === 0) return null;
  const sorted = [...keys].sort();
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-6 sm:pb-5">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 rounded-xl2 bg-navy-900 p-3 text-white shadow-lift ring-1 ring-white/10 sm:flex-row sm:items-center sm:p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-lg font-extrabold text-navy-800">{keys.length}</span>
          <div className="leading-tight">
            <div className="font-extrabold">{keys.length === 1 ? 'حصة مختارة' : keys.length === 2 ? 'حصتان مختارتان' : 'حصص مختارة'}</div>
            <div className="text-xs font-semibold text-navy-200">تُرسل جميعها في طلب واحد</div>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 sm:pb-0">
          {sorted.map((k) => {
            const [date, pid] = k.split('|');
            const d = fromISODate(date);
            return (
              <span key={k} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 py-1 pr-2.5 pl-1 text-xs font-bold">
                {DAY_NAMES[d.getDay()]} {d.getDate()}/{d.getMonth() + 1} · {periodById(pid)?.isBreak ? 'الاستراحة' : `الحصة ${periodById(pid)?.short}`}
                <button onClick={() => onRemove(k)} className="rounded p-0.5 hover:bg-white/20" aria-label="إزالة">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            );
          })}
        </div>
        <div className="flex gap-2">
          <button onClick={onClear} className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold text-navy-100 hover:bg-white/10">
            <Trash2 className="h-4 w-4" /> مسح
          </button>
          <button
            onClick={onContinue}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-extrabold text-navy-800 transition hover:bg-navy-50 sm:flex-none"
          >
            متابعة الحجز <ArrowLeft className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
