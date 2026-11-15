import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Coffee, Copy, IdCard, Loader2, Send, Trash2, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { BookingItem, BookingType, User } from '../types';
import { repo } from '../data';
import { BOOKING_TYPE_LABEL } from '../lib/labels';
import { GRADES, SECTIONS } from '../lib/school';
import { formatDayDate, periodById } from '../lib/schedule';
import { Btn, Modal, selectCls } from './ui';

const TYPES = Object.keys(BOOKING_TYPE_LABEL) as BookingType[];

type Draft = { date: string; periodId: string; grade: string; section: string; type: BookingType | ''; typeOther: string };

interface Props {
  open: boolean;
  user: User;
  keys: string[]; // "date|periodId"
  onClose: () => void;
  onRemove: (key: string) => void;
  onSubmitted: () => void;
}

export function BookingFormModal({ open, user, keys, onClose, onRemove, onSubmitted }: Props) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [doc, setDoc] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tried, setTried] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  const sorted = useMemo(() => [...keys].sort(), [keys]);

  // مزامنة المسودات مع الحصص المختارة (الاحتفاظ بما أُدخل سابقاً)
  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, Draft> = {};
      for (const k of sorted) {
        const [date, periodId] = k.split('|');
        next[k] = prev[k] ?? { date, periodId, grade: '', section: '', type: '', typeOther: '' };
      }
      return next;
    });
  }, [sorted]);

  useEffect(() => { if (open) { setError(''); setTried(false); setDone(null); } }, [open]);

  const set = (k: string, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [k]: { ...d[k], ...patch } }));

  const copyFirstToAll = () => {
    const f = drafts[sorted[0]];
    if (!f) return;
    setDrafts((d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, { ...v, grade: f.grade, section: f.section, type: f.type, typeOther: f.typeOther }])));
  };

  const invalid = (d?: Draft) => !d || !d.grade || !d.section || !d.type || (d.type === 'other' && !d.typeOther.trim());
  const invalidCount = sorted.filter((k) => invalid(drafts[k])).length;

  const submit = async () => {
    setTried(true);
    setError('');
    if (invalidCount) { setError('يرجى إكمال الصف والشعبة ونوع الحجز لكل حصة'); return; }
    setBusy(true);
    try {
      const items: BookingItem[] = sorted.map((k) => {
        const d = drafts[k];
        return { date: d.date, periodId: d.periodId, grade: d.grade, section: d.section, type: d.type as BookingType, typeOther: d.type === 'other' ? d.typeOther.trim() : undefined };
      });
      await repo.createBookingRequest({ teacher: user, items, wantsDocumentation: doc });
      setDone(items.length);
      setDoc(false);
      onSubmitted();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (done !== null) {
    return (
      <Modal open={open} onClose={onClose} title="تم إرسال الطلب" size="sm">
        <div className="py-4 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-slot-freeBg">
            <CheckCircle2 className="h-9 w-9 text-slot-free" />
          </span>
          <h3 className="mt-4 text-xl font-extrabold text-navy-800">تم إرسال طلب الحجز بنجاح</h3>
          <p className="mt-2 text-sm font-medium leading-7 text-navy-500">
            أُرسل طلبك ({done} {done === 1 ? 'حصة' : done === 2 ? 'حصتان' : 'حصص'}) إلى مسؤول مركز مصادر التعلم، وستظهر الحصص باللون الأصفر حتى تتم الموافقة.
          </p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Link to="/my-bookings" onClick={onClose} className="rounded-xl bg-navy-800 py-3 text-sm font-bold text-white hover:bg-navy-700">عرض حجوزاتي</Link>
            <Btn variant="outline" onClick={onClose}>العودة للجدول</Btn>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="استمارة طلب الحجز"
      subtitle="حدّد الصف والشعبة ونوع الحجز لكل حصة، ثم أرسل الطلب"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-navy-100 bg-white px-4 py-3 text-sm font-bold text-navy-800 has-[:checked]:border-navy-500 has-[:checked]:bg-navy-50">
            <input type="checkbox" checked={doc} onChange={(e) => setDoc(e.target.checked)} className="h-5 w-5 rounded accent-[#162C4F]" />
            أرغب في توثيق الحجز
          </label>
          <Btn onClick={submit} disabled={busy || sorted.length === 0} className="h-12 px-6 text-base">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 -scale-x-100" />}
            إرسال طلب الحجز
          </Btn>
        </div>
      }
    >
      {/* بيانات المعلم تلقائياً */}
      <div className="grid gap-3 sm:grid-cols-2">
        <ReadOnly icon={UserRound} label="اسم المعلم" value={user.name} />
        <ReadOnly icon={IdCard} label="الرقم الوظيفي" value={user.employeeNo} ltr />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-extrabold text-navy-800">
          <CalendarDays className="h-5 w-5 text-navy-500" />
          الحصص المختارة
          <span className="rounded-full bg-navy-100 px-2.5 py-0.5 text-xs text-navy-700">{sorted.length}</span>
        </h3>
        {sorted.length > 1 && (
          <button onClick={copyFirstToAll} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-navy-600 hover:bg-navy-50">
            <Copy className="h-3.5 w-3.5" /> تطبيق بيانات الحصة الأولى على الجميع
          </button>
        )}
      </div>

      {sorted.length === 0 && <p className="mt-4 rounded-xl bg-sky-page p-4 text-center text-sm font-semibold text-navy-400">لم تعد هناك حصص مختارة.</p>}

      <ol className="mt-3 grid gap-3">
        {sorted.map((k, i) => {
          const d = drafts[k];
          if (!d) return null;
          const p = periodById(d.periodId)!;
          const bad = tried && invalid(d);
          const err = (v: string) => (tried && !v ? '!border-slot-busy ring-2 ring-slot-busyBg' : '');
          return (
            <li key={k} className={`rounded-xl2 border p-4 ${bad ? 'border-slot-busyBd bg-slot-busyBg/30' : 'border-navy-100 bg-sky-page/50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl text-sm font-extrabold ${p.isBreak ? 'bg-amber-100 text-amber-800' : 'bg-navy-800 text-white'}`}>
                    {p.isBreak ? <Coffee className="h-5 w-5" /> : i + 1}
                  </span>
                  <div>
                    <div className="text-[15px] font-extrabold text-navy-800">{formatDayDate(d.date)}</div>
                    <div className="text-xs font-semibold text-navy-500">
                      {p.label} · <span dir="ltr">{p.start} – {p.end}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => onRemove(k)} className="rounded-lg p-2 text-navy-300 hover:bg-slot-busyBg hover:text-slot-busy" aria-label="إزالة الحصة">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1.6fr]">
                <Field label="الصف">
                  <select className={`${selectCls} ${err(d.grade)}`} value={d.grade} onChange={(e) => set(k, { grade: e.target.value })}>
                    <option value="">اختر</option>
                    {GRADES.map((g) => <option key={g} value={g}>الصف {g}</option>)}
                  </select>
                </Field>
                <Field label="الشعبة">
                  <select className={`${selectCls} ${err(d.section)}`} value={d.section} onChange={(e) => set(k, { section: e.target.value })}>
                    <option value="">اختر</option>
                    {SECTIONS.map((s) => <option key={s} value={s}>الشعبة {s}</option>)}
                  </select>
                </Field>
                <Field label="نوع الحجز" className="col-span-2 sm:col-span-1">
                  <select className={`${selectCls} ${err(d.type)}`} value={d.type} onChange={(e) => set(k, { type: e.target.value as BookingType })}>
                    <option value="">اختر نوع الحجز</option>
                    {TYPES.map((t) => <option key={t} value={t}>{BOOKING_TYPE_LABEL[t]}</option>)}
                  </select>
                </Field>
                {d.type === 'other' && (
                  <Field label="اكتب نوع الحجز" className="col-span-2 sm:col-span-3">
                    <input
                      autoFocus
                      value={d.typeOther}
                      onChange={(e) => set(k, { typeOther: e.target.value })}
                      maxLength={60}
                      placeholder="مثال: مسابقة ثقافية"
                      className={`${selectCls} font-semibold ${tried && !d.typeOther.trim() ? '!border-slot-busy ring-2 ring-slot-busyBg' : ''}`}
                    />
                  </Field>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {error && <p role="alert" className="mt-4 rounded-xl bg-slot-busyBg px-4 py-3 text-sm font-bold text-slot-busy">{error}</p>}
    </Modal>
  );
}

function ReadOnly({ icon: I, label, value, ltr }: { icon: typeof UserRound; label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-navy-100 bg-sky-page px-4 py-3">
      <I className="h-5 w-5 text-navy-400" />
      <div>
        <div className="text-[11px] font-bold text-navy-400">{label} <span className="font-semibold">(تلقائي)</span></div>
        <div className="text-sm font-extrabold text-navy-800" dir={ltr ? 'ltr' : undefined}>{value}</div>
      </div>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-bold text-navy-500">{label}</span>
      {children}
    </label>
  );
}
