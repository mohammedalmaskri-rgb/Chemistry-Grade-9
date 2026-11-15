import type { Booking } from '../types';
import { BOOKING_TYPE_LABEL } from './labels';
import { isPast, periodById } from './schedule';

export const typeText = (b: Booking) => (b.type === 'other' && b.typeOther ? `أخرى: ${b.typeOther}` : BOOKING_TYPE_LABEL[b.type]);
export const periodText = (b: Booking) => periodById(b.periodId)?.label ?? b.periodId;
export const periodTime = (b: Booking) => {
  const p = periodById(b.periodId);
  return p ? `${p.start} – ${p.end}` : '';
};
/** يمكن إلغاء الحجز إذا كان معلقاً أو معتمداً ولم يبدأ وقته بعد */
export const canCancel = (b: Booking) => (b.status === 'pending' || b.status === 'approved') && !isPast(b.date, b.periodId);
export const sortByDate = (a: Booking, b: Booking) => (a.date + a.periodId).localeCompare(b.date + b.periodId);

/** تصدير CSV متوافق مع Excel (UTF-8 BOM) */
export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
