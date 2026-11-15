import type { Booking, BookingType, User } from '../../types';
import { buildWeeks } from '../../lib/schedule';

// ⚠️ بيانات تجريبية بالكامل — أسماء وأرقام وظيفية وهمية
export const DEMO_USERS: User[] = [
  { id: 'u1', employeeNo: '100100', name: 'أحمد بن سالم الهنائي', role: 'teacher', subject: 'العلوم' },
  { id: 'u2', employeeNo: '100200', name: 'مريم بنت خالد البلوشية', role: 'teacher', subject: 'اللغة العربية' },
  { id: 'u3', employeeNo: '100300', name: 'يوسف بن علي الكندي', role: 'teacher', subject: 'الرياضيات' },
  { id: 'u4', employeeNo: '100400', name: 'سارة بنت حمد الريامية', role: 'teacher', subject: 'اللغة الإنجليزية' },
  { id: 'u8', employeeNo: '200100', name: 'فاطمة بنت ناصر العبرية', role: 'lrc_admin' },
  { id: 'u9', employeeNo: '300100', name: 'خالد بن سعيد الحارثي', role: 'management' },
];

/** حجوزات أولية موزعة على الأسابيع الثلاثة نسبةً لتاريخ اليوم */
export function seedBookings(): Booking[] {
  const weeks = buildWeeks();
  const t = (w: number, d: number) => weeks[w][d].date;
  const rows: Array<[number, number, string, string, Booking['status'], BookingType, string, string]> = [
    // [week, day, period, teacherId, status, type, grade, section]
    [0, 0, 'p2', 'u2', 'approved', 'lesson', '7', '2'],
    [0, 1, 'p4', 'u3', 'pending', 'activity', '8', '1'],
    [0, 2, 'p1', 'u4', 'approved', 'lesson', '9', '3'],
    [0, 2, 'p5', 'u1', 'pending', 'lesson', '9', '1'],
    [0, 3, 'p3', 'u2', 'approved', 'workshop', '6', '2'],
    [0, 3, 'p6', 'u3', 'approved', 'lesson', '8', '4'],
    [0, 4, 'p2', 'u1', 'approved', 'initiative', '7', '1'],
    [0, 4, 'p7', 'u4', 'pending', 'awareness', '9', '2'],
    [1, 0, 'p1', 'u3', 'approved', 'lesson', '8', '2'],
    [1, 1, 'p3', 'u1', 'pending', 'lesson', '9', '2'],
    [1, 1, 'p4', 'u1', 'pending', 'lesson', '9', '2'],
    [1, 2, 'p6', 'u2', 'approved', 'activity', '7', '3'],
    [1, 3, 'p2', 'u4', 'pending', 'lesson', '6', '1'],
    [1, 4, 'p5', 'u3', 'approved', 'workshop', '8', '3'],
    [2, 0, 'p4', 'u2', 'pending', 'lesson', '7', '1'],
    [2, 2, 'p2', 'u4', 'approved', 'lesson', '9', '4'],
    [2, 3, 'p7', 'u1', 'approved', 'activity', '9', '3'],
  ];
  const name = (id: string) => DEMO_USERS.find((u) => u.id === id)!.name;
  return rows.map(([w, d, periodId, teacherId, status, type, grade, section], i) => ({
    id: `b${i + 1}`,
    requestId: `r${i + 1}`,
    teacherId,
    teacherName: name(teacherId),
    date: t(w, d),
    periodId,
    grade,
    section,
    type,
    wantsDocumentation: i % 3 === 0,
    status,
    createdAt: new Date().toISOString(),
  }));
}
