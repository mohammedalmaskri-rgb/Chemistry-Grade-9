import type { Booking, User } from '../../types';
import type { DataRepository } from '../repository';
import { DEMO_USERS, seedBookings } from './seed';

const SESSION_KEY = 'lrc-demo-session';
const STATE_KEY = 'lrc-demo-state-v2';
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));
const isActive = (b: Booking) => b.status === 'pending' || b.status === 'approved';

interface State { bookings: Booking[]; users: User[]; seq: number }

/**
 * تنفيذ تجريبي — البيانات وهمية وتُحفظ مؤقتاً في جلسة المتصفح فقط
 * (تُمسح عند إغلاق التبويب) حتى يمكن تجربة الدور بين المعلم والمسؤول.
 */
export class MockRepository implements DataRepository {
  private s: State = this.load();

  private fresh(): State {
    return { bookings: seedBookings(), users: DEMO_USERS.map((u) => ({ ...u })), seq: 5000 };
  }
  private load(): State {
    try {
      const raw = sessionStorage.getItem(STATE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* تجاهل */ }
    return this.fresh();
  }
  private save() {
    try { sessionStorage.setItem(STATE_KEY, JSON.stringify(this.s)); } catch { /* تجاهل */ }
  }
  private id(p: string) { return `${p}${++this.s.seq}`; }

  async demoSignIn(employeeNo: string): Promise<User> {
    await delay(350);
    const user = this.s.users.find((u) => u.employeeNo === employeeNo.trim());
    if (!user) throw new Error('الرقم غير موجود في الحسابات التجريبية');
    if (!user.active) throw new Error('هذا الحساب موقوف، يرجى مراجعة مسؤول المصادر');
    try { sessionStorage.setItem(SESSION_KEY, user.id); } catch { /* تجاهل */ }
    return user;
  }
  async signOut() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* تجاهل */ }
  }
  async getCurrentUser(): Promise<User | null> {
    let id: string | null = null;
    try { id = sessionStorage.getItem(SESSION_KEY); } catch { /* تجاهل */ }
    return this.s.users.find((u) => u.id === id && u.active) ?? null;
  }

  async listActiveBookings(fromDate: string, toDate: string) {
    await delay();
    return this.s.bookings.filter((b) => isActive(b) && b.date >= fromDate && b.date <= toDate).map((b) => ({ ...b }));
  }
  async listMyBookings(teacherId: string) {
    await delay();
    return this.s.bookings.filter((b) => b.teacherId === teacherId).map((b) => ({ ...b }));
  }
  async createBookingRequest({ teacher, items, wantsDocumentation }: Parameters<DataRepository['createBookingRequest']>[0]) {
    await delay(500);
    const taken = items.find((it) => this.s.bookings.some((b) => isActive(b) && b.date === it.date && b.periodId === it.periodId));
    if (taken) throw new Error('إحدى الحصص المختارة لم تعد متاحة، يرجى تحديث الجدول');
    const requestId = this.id('r');
    const created = items.map<Booking>((it) => ({
      ...it,
      id: this.id('b'),
      requestId,
      teacherId: teacher.id,
      teacherName: teacher.name,
      employeeNo: teacher.employeeNo,
      typeOther: it.type === 'other' ? it.typeOther : undefined,
      wantsDocumentation,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }));
    this.s.bookings.push(...created);
    this.save();
    return created;
  }
  async cancelBooking(bookingId: string, actor: User) {
    await delay();
    const b = this.s.bookings.find((x) => x.id === bookingId);
    if (!b) return;
    if (actor.role === 'teacher' && b.teacherId !== actor.id) throw new Error('لا تملك صلاحية إلغاء هذا الحجز');
    b.status = 'cancelled';
    b.cancelledByRole = actor.role;
    this.save();
  }

  async listAllBookings() {
    await delay();
    return this.s.bookings.map((b) => ({ ...b }));
  }
  private decide(ids: string[], actor: User, patch: Partial<Booking>) {
    if (actor.role === 'teacher') throw new Error('لا تملك صلاحية اتخاذ هذا الإجراء');
    for (const b of this.s.bookings)
      if (ids.includes(b.id) && b.status === 'pending') Object.assign(b, patch, { decidedBy: actor.name });
    this.save();
  }
  async approveBookings(ids: string[], actor: User) {
    await delay();
    this.decide(ids, actor, { status: 'approved' });
  }
  async rejectBookings(ids: string[], reason: string, actor: User) {
    await delay();
    this.decide(ids, actor, { status: 'rejected', rejectionReason: reason.trim() || undefined });
  }
  async setDocumented(id: string, documented: boolean) {
    await delay(120);
    const b = this.s.bookings.find((x) => x.id === id);
    if (b) { b.documented = documented; this.save(); }
  }
  async listUsers() {
    await delay();
    return this.s.users.map((u) => ({ ...u }));
  }
  async saveUser(input: Omit<User, 'id'> & { id?: string }) {
    await delay(250);
    const dup = this.s.users.find((u) => u.employeeNo === input.employeeNo && u.id !== input.id);
    if (dup) throw new Error('الرقم الوظيفي مستخدم لحساب آخر');
    if (input.id) {
      const u = this.s.users.find((x) => x.id === input.id)!;
      Object.assign(u, input);
      this.save();
      return { ...u };
    }
    const u: User = { ...input, id: this.id('u') };
    this.s.users.push(u);
    this.save();
    return { ...u };
  }
  async resetDemo() {
    this.s = this.fresh();
    this.save();
  }
}
