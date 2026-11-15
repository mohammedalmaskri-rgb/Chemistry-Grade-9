// أنواع النطاق (Domain) — مستقلة تماماً عن مصدر البيانات
export type Role = 'teacher' | 'lrc_admin' | 'management';

export interface User {
  id: string;
  employeeNo: string; // رقم وظيفي تجريبي فقط
  name: string;
  role: Role;
  subject?: string;
  active: boolean;
}

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type BookingType = 'lesson' | 'activity' | 'workshop' | 'initiative' | 'awareness' | 'other';

/** حصة/فترة في اليوم الدراسي (الاستراحة فترة قابلة للحجز أيضاً) */
export interface Period {
  id: string; // 'p1'...'p8' أو 'break'
  label: string; // "الحصة الأولى" / "الاستراحة"
  short: string; // "1" / "استراحة"
  start: string; // "07:30"
  end: string;
  isBreak?: boolean;
}

/** مفتاح خانة في الجدول: التاريخ + الحصة */
export interface SlotKey {
  date: string; // YYYY-MM-DD
  periodId: string;
}

/** حصة واحدة داخل طلب الحجز — لكل حصة صفها وشعبتها ونوعها */
export interface BookingItem extends SlotKey {
  grade: string;
  section: string;
  type: BookingType;
  typeOther?: string;
}

export interface Booking extends BookingItem {
  id: string;
  requestId: string; // عدة حصص قد تُرسل في طلب واحد
  teacherId: string;
  teacherName: string;
  employeeNo: string;
  wantsDocumentation: boolean;
  documented?: boolean;
  status: BookingStatus;
  rejectionReason?: string;
  cancelledByRole?: Role;
  decidedBy?: string;
  createdAt: string;
}

/** حالة الخانة كما تُعرض في الجدول */
export type SlotState = 'available' | 'pending' | 'approved' | 'past';

export interface SlotView extends SlotKey {
  state: SlotState;
  booking?: Booking; // الحجز الذي يشغل الخانة (إن وجد)
  isMine: boolean;
}
