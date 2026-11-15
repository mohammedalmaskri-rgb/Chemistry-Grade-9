import type { Booking, BookingType } from '../types';
import { BOOKING_TYPE_LABEL } from './labels';
import { MONTHS, fromISODate, toISODate, weekStart, PERIODS } from './schedule';

/** حسابات الإحصائيات — دالة نقية يمكن نقلها للخادم لاحقاً */
export function computeStats(all: Booking[], rangeDays: number | null, now = new Date()) {
  const fromDate = rangeDays ? toISODate(new Date(now.getTime() - rangeDays * 86400000)) : '';
  const list = rangeDays ? all.filter((b) => b.date >= fromDate) : all;
  const used = list.filter((b) => b.status === 'approved' || b.status === 'pending');

  const count = (s: Booking['status']) => list.filter((b) => b.status === s).length;
  const teacherCounts = new Map<string, { name: string; n: number }>();
  used.forEach((b) => {
    const t = teacherCounts.get(b.teacherId) ?? { name: b.teacherName, n: 0 };
    t.n++;
    teacherCounts.set(b.teacherId, t);
  });
  const types = (Object.keys(BOOKING_TYPE_LABEL) as BookingType[])
    .map((t) => ({ label: BOOKING_TYPE_LABEL[t], value: used.filter((b) => b.type === t).length }))
    .sort((a, b) => b.value - a.value);
  const periods = PERIODS.map((p) => ({ label: p.isBreak ? 'الاستراحة' : p.label, value: used.filter((b) => b.periodId === p.id).length })).sort((a, b) => b.value - a.value);

  // أسبوعي: 9 أسابيع سابقة + الحالي + القادمان (من كل البيانات، غير متأثر بالفترة)
  const active = all.filter((b) => b.status === 'approved' || b.status === 'pending');
  const ws = weekStart(now);
  const weekly = Array.from({ length: 12 }, (_, i) => {
    const off = i - 9;
    const s = new Date(ws); s.setDate(ws.getDate() + off * 7);
    const e = new Date(s); e.setDate(s.getDate() + 6);
    const [a, b] = [toISODate(s), toISODate(e)];
    return {
      label: `${s.getDate()}/${s.getMonth() + 1}`,
      tip: off === 0 ? 'الأسبوع الحالي' : `أسبوع ${s.getDate()} ${MONTHS[s.getMonth()]}`,
      value: active.filter((x) => x.date >= a && x.date <= b).length,
      tone: (off === 0 ? 'current' : off > 0 ? 'future' : 'normal') as 'current' | 'future' | 'normal',
    };
  });
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = toISODate(d).slice(0, 7);
    return {
      label: MONTHS[d.getMonth()],
      tip: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      value: active.filter((x) => x.date.startsWith(key)).length,
      tone: (i === 5 ? 'current' : 'normal') as 'current' | 'normal',
    };
  });

  return {
    total: list.length,
    approved: count('approved'),
    pending: count('pending'),
    rejected: count('rejected'),
    cancelled: count('cancelled'),
    teachersUsing: teacherCounts.size,
    topTeachers: [...teacherCounts.values()].sort((a, b) => b.n - a.n).slice(0, 5).map((t) => ({ label: t.name, value: t.n })),
    types,
    periods: periods.slice(0, 5),
    weekly,
    monthly,
    approvalRate: list.length ? Math.round((count('approved') / Math.max(1, count('approved') + count('rejected'))) * 100) : 0,
    fromLabel: fromDate ? `${fromISODate(fromDate).getDate()} ${MONTHS[fromISODate(fromDate).getMonth()]}` : '',
  };
}
