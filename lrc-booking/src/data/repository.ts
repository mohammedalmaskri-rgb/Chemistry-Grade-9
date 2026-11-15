import type { Booking, BookingItem, BookingType, User } from '../types';

/**
 * واجهة مصدر البيانات. الواجهات (UI) تتعامل مع هذه الواجهة فقط.
 * التنفيذ الحالي تجريبي (Mock) في الذاكرة، وفي مرحلة الربط
 * نضيف تنفيذاً لـ Supabase بنفس التوقيعات دون تعديل الصفحات.
 */
export interface DataRepository {
  /** دخول تجريبي — سيُستبدل بوسيلة تحقق آمنة في مرحلة ربط الحسابات */
  demoSignIn(employeeNo: string): Promise<User>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;

  /** الحجوزات النشطة (معلقة/معتمدة) ضمن نطاق تاريخ — لرسم الجدول */
  listActiveBookings(fromDate: string, toDate: string): Promise<Booking[]>;

  /** حجوزات معلم معيّن بكل حالاتها */
  listMyBookings(teacherId: string): Promise<Booking[]>;

  createBookingRequest(input: {
    teacher: User;
    items: BookingItem[];
    type: BookingType;
    typeOther?: string;
    wantsDocumentation: boolean;
  }): Promise<Booking[]>;

  cancelBooking(bookingId: string): Promise<void>;
}
