import type { Booking, User } from '../../types';
import type { DataRepository } from '../repository';
import { DEMO_USERS, seedBookings } from './seed';

const SESSION_KEY = 'lrc-demo-session';
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

/** تنفيذ تجريبي في الذاكرة — لا يحفظ أي بيانات حقيقية */
export class MockRepository implements DataRepository {
  private bookings: Booking[] = seedBookings();
  private seq = 1000;

  async demoSignIn(employeeNo: string): Promise<User> {
    await delay(400);
    const user = DEMO_USERS.find((u) => u.employeeNo === employeeNo.trim());
    if (!user) throw new Error('الرقم غير موجود في الحسابات التجريبية');
    try { sessionStorage.setItem(SESSION_KEY, user.id); } catch { /* تجاهل */ }
    return user;
  }

  async signOut() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* تجاهل */ }
  }

  async getCurrentUser(): Promise<User | null> {
    let id: string | null = null;
    try { id = sessionStorage.getItem(SESSION_KEY); } catch { /* تجاهل */ }
    return DEMO_USERS.find((u) => u.id === id) ?? null;
  }

  async listActiveBookings(fromDate: string, toDate: string) {
    await delay();
    return this.bookings.filter(
      (b) => (b.status === 'pending' || b.status === 'approved') && b.date >= fromDate && b.date <= toDate,
    );
  }

  async listMyBookings(teacherId: string) {
    await delay();
    return this.bookings.filter((b) => b.teacherId === teacherId);
  }

  async createBookingRequest(input: Parameters<DataRepository['createBookingRequest']>[0]) {
    await delay(500);
    const taken = input.items.find((it) =>
      this.bookings.some(
        (b) => b.date === it.date && b.periodId === it.periodId && (b.status === 'pending' || b.status === 'approved'),
      ),
    );
    if (taken) throw new Error('إحدى الحصص المختارة لم تعد متاحة، يرجى تحديث الجدول');
    const requestId = `r${++this.seq}`;
    const created = input.items.map<Booking>((it) => ({
      id: `b${++this.seq}`,
      requestId,
      teacherId: input.teacher.id,
      teacherName: input.teacher.name,
      date: it.date,
      periodId: it.periodId,
      grade: it.grade,
      section: it.section,
      type: input.type,
      typeOther: input.typeOther,
      wantsDocumentation: input.wantsDocumentation,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }));
    this.bookings.push(...created);
    return created;
  }

  async cancelBooking(bookingId: string) {
    await delay();
    const b = this.bookings.find((x) => x.id === bookingId);
    if (b) b.status = 'cancelled';
  }
}
