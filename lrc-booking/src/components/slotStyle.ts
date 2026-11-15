import type { SlotView } from '../types';
import { BOOKING_TYPE_LABEL } from '../lib/labels';

/** نص ولون الخانة — مشترك بين عرض الكمبيوتر والهاتف */
export function slotInfo(slot: SlotView, selected: boolean) {
  const b = slot.booking;
  const sub = b
    ? slot.isMine
      ? 'حجزك'
      : `${b.grade}/${b.section} · ${b.type === 'other' && b.typeOther ? b.typeOther : BOOKING_TYPE_LABEL[b.type]}`
    : '';
  if (selected) return { kind: 'selected' as const, title: 'تم الاختيار', sub: '' };
  if (slot.state === 'available') return { kind: 'available' as const, title: 'متاح', sub: '' };
  if (slot.state === 'pending') return { kind: 'pending' as const, title: 'بانتظار الموافقة', sub };
  if (slot.state === 'approved') return { kind: 'approved' as const, title: 'محجوز', sub };
  return { kind: 'past' as const, title: 'انتهت', sub: '' };
}
