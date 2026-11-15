import { Check, Clock3, Lock, Plus } from 'lucide-react';
import type { SlotView } from '../types';
import { slotInfo } from './slotStyle';

interface Props {
  slot: SlotView;
  selected: boolean;
  onToggle: () => void;
  ariaContext: string;
  isBreak?: boolean;
}

const CLS = {
  selected: 'border-navy-700 bg-navy-700 text-white shadow-lift',
  available: 'border-slot-freeBd bg-slot-freeBg text-slot-free hover:-translate-y-0.5 hover:border-slot-free hover:shadow-card',
  pending: 'border-slot-pendBd bg-slot-pendBg text-slot-pend cursor-not-allowed',
  approved: 'border-slot-busyBd bg-slot-busyBg text-slot-busy cursor-not-allowed',
  past: 'border-dashed border-navy-100 bg-navy-50/50 text-navy-300 cursor-not-allowed',
};

export function SlotIcon({ kind, className = 'h-4 w-4' }: { kind: keyof typeof CLS; className?: string }) {
  if (kind === 'selected') return <Check className={className} strokeWidth={3} />;
  if (kind === 'available') return <Plus className={className} strokeWidth={3} />;
  if (kind === 'pending') return <Clock3 className={className} />;
  if (kind === 'approved') return <Lock className={className} />;
  return null;
}

/** خانة الجدول (عرض الكمبيوتر) */
export function SlotCell({ slot, selected, onToggle, ariaContext, isBreak }: Props) {
  const info = slotInfo(slot, selected);
  const clickable = slot.state === 'available';
  return (
    <button
      type="button"
      onClick={clickable ? onToggle : undefined}
      aria-disabled={!clickable}
      aria-pressed={clickable ? selected : undefined}
      aria-label={`${ariaContext}: ${info.title}${info.sub ? ' – ' + info.sub : ''}`}
      className={`group relative flex min-h-[64px] w-full flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-1.5 py-1.5 text-center transition focus:outline-none focus-visible:ring-4 focus-visible:ring-navy-200 ${CLS[info.kind]} ${
        isBreak && info.kind === 'available' ? 'border-dashed' : ''
      }`}
    >
      <SlotIcon kind={info.kind} className="h-4 w-4 shrink-0" />
      <span className="whitespace-nowrap text-[12.5px] font-extrabold leading-tight">{info.title}</span>
      {info.sub && <span className="max-w-full truncate text-[11px] font-semibold opacity-80">{info.sub}</span>}
    </button>
  );
}

export { CLS as SLOT_CLS };
