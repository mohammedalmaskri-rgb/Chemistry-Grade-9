import { useEffect, useState } from 'react';
import { ConfirmDialog } from './ui';

const QUICK = ['المركز محجوز لفعالية مدرسية', 'تعارض مع اختبار مركزي', 'أعمال صيانة في المركز'];

/** رفض حصة أو طلب كامل مع كتابة السبب */
export function RejectDialog({ open, count, onClose, onConfirm, busy }: { open: boolean; count: number; onClose: () => void; onConfirm: (reason: string) => void; busy?: boolean }) {
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) setReason(''); }, [open]);
  return (
    <ConfirmDialog
      open={open}
      danger
      busy={busy}
      title={count > 1 ? `رفض ${count} حصص` : 'رفض الحجز'}
      confirmLabel="تأكيد الرفض"
      onClose={onClose}
      onConfirm={() => onConfirm(reason)}
      message="سيظهر سبب الرفض للمعلم في صفحة «حجوزاتي»."
    >
      <label className="mt-4 block text-sm font-bold text-navy-700" htmlFor="reason">سبب الرفض</label>
      <textarea
        id="reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        maxLength={200}
        placeholder="اكتب سبب الرفض (اختياري)"
        className="mt-2 w-full rounded-xl border border-navy-100 bg-sky-page p-3 text-sm font-semibold text-navy-800 focus:border-navy-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-navy-100"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {QUICK.map((q) => (
          <button key={q} type="button" onClick={() => setReason(q)} className="rounded-lg bg-navy-50 px-2.5 py-1 text-xs font-bold text-navy-600 hover:bg-navy-100">{q}</button>
        ))}
      </div>
    </ConfirmDialog>
  );
}
