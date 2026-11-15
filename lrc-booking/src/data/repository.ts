import type { Booking, BookingItem, User } from '../types';

/**
 * واجهة مصدر البيانات. الواجهات (UI) تتعامل مع هذه الواجهة فقط.
 * التنفيذ الحالي تجريبي (Mock)، وفي مرحلة الربط نضيف تنفيذاً لـ Supabase
 * بنفس التوقيعات دون تعديل الصفحات. التحقق من الصلاحيات سيكون في الخادم (RLS).
 */
export interface DataRepository {
  // ── الحساب ──
  /** دخول تجريبي — سيُستبدل بوسيلة تحقق آمنة في مرحلة ربط الحسابات */
  demoSignIn(employeeNo: string): Promise<User>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;

  // ── الحجوزات ──
  /** الحجوزات النشطة (معلقة/معتمدة) ضمن نطاق تاريخ — لرسم الجدول */
  listActiveBookings(fromDate: string, toDate: string): Promise<Booking[]>;
  listMyBookings(teacherId: string): Promise<Booking[]>;
  createBookingRequest(input: { teacher: User; items: BookingItem[]; wantsDocumentation: boolean }): Promise<Booking[]>;
  cancelBooking(bookingId: string, actor: User): Promise<void>;

  // ── المسؤول والإدارة ──
  listAllBookings(): Promise<Booking[]>;
  approveBookings(ids: string[], actor: User): Promise<void>;
  rejectBookings(ids: string[], reason: string, actor: User): Promise<void>;
  setDocumented(id: string, documented: boolean): Promise<void>;
  listUsers(): Promise<User[]>;
  saveUser(user: Omit<User, 'id'> & { id?: string }): Promise<User>;

  /** إعادة البيانات التجريبية لوضعها الأصلي */
  resetDemo(): Promise<void>;
}
