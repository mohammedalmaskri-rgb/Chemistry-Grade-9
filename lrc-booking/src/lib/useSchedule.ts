import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Booking, SlotView } from '../types';
import { repo } from '../data';
import { BOOKABLE_PERIODS, buildWeeks, isPast, slotKey } from './schedule';

/** يجلب الحجوزات للأسابيع الثلاثة ويحوّلها إلى حالات خانات */
export function useSchedule(currentUserId: string) {
  const weeks = useMemo(() => buildWeeks(), []);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const from = weeks[0][0].date;
    const to = weeks[weeks.length - 1][4].date;
    setBookings(await repo.listActiveBookings(from, to));
    setLoading(false);
  }, [weeks]);

  useEffect(() => { refresh(); }, [refresh]);

  const slots = useMemo(() => {
    const byKey = new Map(bookings.map((b) => [slotKey(b.date, b.periodId), b]));
    const map = new Map<string, SlotView>();
    const now = new Date();
    for (const week of weeks)
      for (const day of week)
        for (const p of BOOKABLE_PERIODS) {
          const k = slotKey(day.date, p.id);
          const b = byKey.get(k);
          const state: SlotView['state'] = b ? (b.status === 'approved' ? 'approved' : 'pending') : isPast(day.date, p.id, now) ? 'past' : 'available';
          map.set(k, { date: day.date, periodId: p.id, state, booking: b, isMine: b?.teacherId === currentUserId });
        }
    return map;
  }, [bookings, weeks, currentUserId]);

  return { weeks, slots, loading, refresh };
}
