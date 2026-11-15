import type { Period } from '../types';

/** إعداد اليوم الدراسي — يُعدّل هنا فقط */
export const PERIODS: Period[] = [
  { id: 'p1', label: 'الأولى', short: '1', start: '07:30', end: '08:10' },
  { id: 'p2', label: 'الثانية', short: '2', start: '08:10', end: '08:50' },
  { id: 'p3', label: 'الثالثة', short: '3', start: '08:50', end: '09:30' },
  { id: 'break', label: 'الاستراحة', short: 'استراحة', start: '09:30', end: '10:00', isBreak: true },
  { id: 'p4', label: 'الرابعة', short: '4', start: '10:00', end: '10:40' },
  { id: 'p5', label: 'الخامسة', short: '5', start: '10:40', end: '11:20' },
  { id: 'p6', label: 'السادسة', short: '6', start: '11:20', end: '12:00' },
  { id: 'p7', label: 'السابعة', short: '7', start: '12:00', end: '12:40' },
  { id: 'p8', label: 'الثامنة', short: '8', start: '12:40', end: '13:20' },
];

export const BOOKABLE_PERIODS = PERIODS.filter((p) => !p.isBreak);
export const periodById = (id: string) => PERIODS.find((p) => p.id === id);

export const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

export const WEEK_LABELS = ['الأسبوع الحالي', 'الأسبوع القادم', 'الأسبوع الذي يليه'];

const pad = (n: number) => String(n).padStart(2, '0');

/** تاريخ محلي بصيغة YYYY-MM-DD (بدون انزياح المنطقة الزمنية) */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** بداية الأسبوع الدراسي (الأحد). يومي الجمعة والسبت يُعتبران قبل الأسبوع القادم */
export function weekStart(ref: Date): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const dow = d.getDay(); // 0 = الأحد
  if (dow === 5 || dow === 6) d.setDate(d.getDate() + (7 - dow));
  else d.setDate(d.getDate() - dow);
  return d;
}

export interface WeekDay {
  date: string;
  dayName: string;
  dayNum: string;
  monthName: string;
}

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export function buildWeeks(today = new Date(), count = 3): WeekDay[][] {
  const start = weekStart(today);
  return Array.from({ length: count }, (_, w) =>
    DAY_NAMES.map((dayName, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + w * 7 + i);
      return { date: toISODate(d), dayName, dayNum: String(d.getDate()), monthName: MONTHS[d.getMonth()] };
    }),
  );
}

export function formatDateAr(iso: string): string {
  const d = fromISODate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function weekRangeLabel(days: WeekDay[]): string {
  const a = days[0];
  const b = days[days.length - 1];
  return a.monthName === b.monthName
    ? `${a.dayNum} – ${b.dayNum} ${b.monthName}`
    : `${a.dayNum} ${a.monthName} – ${b.dayNum} ${b.monthName}`;
}

/** هل انتهت الحصة؟ (تُمنع الحصص الماضية من الحجز) */
export function isPast(date: string, periodId: string, now = new Date()): boolean {
  const p = periodById(periodId);
  if (!p) return true;
  const [h, m] = p.start.split(':').map(Number);
  const d = fromISODate(date);
  d.setHours(h, m, 0, 0);
  return d.getTime() <= now.getTime();
}

export const slotKey = (date: string, periodId: string) => `${date}|${periodId}`;
