import { Check, Clock3, Lock, Plus } from 'lucide-react';
import type { SlotView } from '../types';
import { BOOKING_TYPE_LABEL } from '../lib/labels';

interface Props {
  slot: SlotView;
  selected: boolean;
  onToggle: () => void;
  /** نص إضافي للقارئ الآلي (اليوم والحصة) */
  ariaContext: string;
  compactLabel?: string; // يظهر في عرض الهاتف (اسم الحصة والوقت)
}

const base =
  'group relative flex w-full flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-1.5 text-center transition focus:outline-none focus-visible:ring-4 focus-visible:ring-navy-200';

export function SlotCell({ slot, selected, onToggle, ariaContext, compactLabel }: Props) {
  const b = slot.booking;
  const sub = b ? (slot.isMine ? 'حجزك' : `${b.grade ?? ''}${b.section ? '/' + b.section : ''} · ${BOOKING_TYPE_LABEL[b.type]}`) : '';

  let cls = '';
  let icon = null;
  let title = '';
  if (selected) {
    cls = 'border-navy-700 bg-navy-700 text-white shadow-lift';
    icon = <Check className="h-4 w-4" strokeWidth={3} />;
    title = 'تم الاختيار';
  } else if (slot.state === 'available') {
    cls = 'border-slot-freeBd bg-slot-freeBg text-slot-free hover:-translate-y-0.5 hover:border-slot-free hover:shadow-card';
    icon = <Plus className="h-4 w-4 transition group-hover:scale-110" strokeWidth={3} />;
    title = 'متاح';
  } else if (slot.state === 'pending') {
    cls = 'border-slot-pendBd bg-slot-pendBg text-slot-pend cursor-not-allowed';
    icon = <Clock3 className="h-4 w-4" />;
    title = 'بانتظار الموافقة';
  } else if (slot.state === 'approved') {
    cls = 'border-slot-busyBd bg-slot-busyBg text-slot-busy cursor-not-allowed';
    icon = <Lock className="h-4 w-4" />;
    title = 'محجوز';
  } else {
    cls = 'border-dashed border-navy-100 bg-navy-50/50 text-navy-300 cursor-not-allowed';
    title = 'انتهت';
  }

  const clickable = slot.state === 'available';
  return (
    <button
      type="button"
      onClick={clickable ? onToggle : undefined}
      aria-disabled={!clickable}
      aria-pressed={clickable ? selected : undefined}
      aria-label={`${ariaContext}: ${title}${sub ? ' – ' + sub : ''}`}
      className={`${base} ${cls} ${compactLabel ? 'min-h-[76px] py-2' : 'min-h-[64px] py-1.5'}`}
    >
      {compactLabel && <span className={`text-[11px] font-bold ${selected ? 'text-navy-100' : 'text-navy-500'}`}>{compactLabel}</span>}
      <span className="flex items-center gap-1 text-[13px] font-extrabold leading-none">
        {icon}
        {title}
      </span>
      {sub && !selected && <span className="max-w-full truncate text-[11px] font-semibold opacity-80">{sub}</span>}
    </button>
  );
}
