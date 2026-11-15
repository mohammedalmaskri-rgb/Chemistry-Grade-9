import type { Booking, BookingStatus, BookingType, User } from '../../types';
import { BOOKABLE_PERIODS, toISODate, weekStart } from '../../lib/schedule';
import { GRADES, SECTIONS } from '../../lib/school';

// ⚠️ بيانات تجريبية بالكامل — أسماء وأرقام وظيفية وهمية
export const DEMO_USERS: User[] = [
  { id: 'u1', employeeNo: '100100', name: 'أحمد بن سالم الهنائي', role: 'teacher', subject: 'العلوم', active: true },
  { id: 'u2', employeeNo: '100200', name: 'مريم بنت خالد البلوشية', role: 'teacher', subject: 'اللغة العربية', active: true },
  { id: 'u3', employeeNo: '100300', name: 'يوسف بن علي الكندي', role: 'teacher', subject: 'الرياضيات', active: true },
  { id: 'u4', employeeNo: '100400', name: 'سارة بنت حمد الريامية', role: 'teacher', subject: 'اللغة الإنجليزية', active: true },
  { id: 'u5', employeeNo: '100500', name: 'عبدالله بن راشد السيابي', role: 'teacher', subject: 'الدراسات الاجتماعية', active: true },
  { id: 'u6', employeeNo: '100600', name: 'هدى بنت سيف المعمرية', role: 'teacher', subject: 'التربية الإسلامية', active: true },
  { id: 'u7', employeeNo: '100700', name: 'سالم بن محمد الشكيلي', role: 'teacher', subject: 'تقنية المعلومات', active: false },
  { id: 'u8', employeeNo: '200100', name: 'فاطمة بنت ناصر العبرية', role: 'lrc_admin', active: true },
  { id: 'u9', employeeNo: '300100', name: 'خالد بن سعيد الحارثي', role: 'management', active: true },
];

const REJECT_REASONS = ['المركز محجوز لفعالية مدرسية', 'تعارض مع اختبار مركزي', 'أعمال صيانة في المركز'];

/** مولّد أرقام شبه عشوائي ثابت حتى تكون البيانات متطابقة في كل مرة */
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

/** حجوزات أولية: تاريخ سابق (12 أسبوعاً) للإحصائيات + الأسابيع الثلاثة القادمة */
export function seedBookings(): Booking[] {
  const r = rng(42);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const teachers = DEMO_USERS.filter((u) => u.role === 'teacher');
  const weights: BookingType[] = ['lesson', 'lesson', 'lesson', 'lesson', 'activity', 'activity', 'workshop', 'initiative', 'awareness', 'other'];
  const busyTeachers = [teachers[0], teachers[0], teachers[1], teachers[1], teachers[2], teachers[3], teachers[4], teachers[5], teachers[6]];
  const start = weekStart(new Date());
  const today = toISODate(new Date());
  const out: Booking[] = [];
  const used = new Set<string>();
  let n = 0;

  for (let w = -12; w <= 2; w++) {
    let reqId = '';
    let reqTeacher = teachers[0];
    const perWeek = w < 0 ? 6 + Math.floor(r() * 9) : 6 + Math.floor(r() * 4);
    for (let k = 0; k < perWeek; k++) {
      const d = new Date(start);
      d.setDate(start.getDate() + w * 7 + Math.floor(r() * 5));
      const date = toISODate(d);
      const periodId = pick(BOOKABLE_PERIODS).id;
      const key = `${date}|${periodId}`;
      if (used.has(key)) continue;
      used.add(key);
      // بعض الطلبات تضم أكثر من حصة لنفس المعلم
      if (!reqId || r() > 0.35) { reqId = `r${++n}`; reqTeacher = pick(busyTeachers); }
      const past = date < today;
      const x = r();
      const status: BookingStatus = past
        ? x < 0.78 ? 'approved' : x < 0.9 ? 'rejected' : 'cancelled'
        : x < 0.5 ? 'approved' : x < 0.88 ? 'pending' : x < 0.95 ? 'rejected' : 'cancelled';
      const type = pick(weights);
      const wantsDocumentation = r() < 0.3;
      out.push({
        id: `b${++n}`,
        requestId: reqId,
        teacherId: reqTeacher.id,
        teacherName: reqTeacher.name,
        employeeNo: reqTeacher.employeeNo,
        date,
        periodId,
        grade: pick(GRADES),
        section: pick(SECTIONS.slice(0, 4)),
        type,
        typeOther: type === 'other' ? 'مسابقة ثقافية' : undefined,
        wantsDocumentation,
        documented: wantsDocumentation && past && status === 'approved' && r() < 0.7,
        status,
        rejectionReason: status === 'rejected' ? pick(REJECT_REASONS) : undefined,
        cancelledByRole: status === 'cancelled' ? (r() < 0.7 ? 'teacher' : 'lrc_admin') : undefined,
        createdAt: new Date(d.getTime() - 3 * 86400000).toISOString(),
      });
    }
  }
  return out.sort((a, b) => (a.date + a.periodId).localeCompare(b.date + b.periodId));
}
