import { useMemo, useState } from 'react';
import { Pencil, Search, UserPlus } from 'lucide-react';
import type { Role, User } from '../../types';
import { repo } from '../../data';
import { ROLE_LABEL } from '../../lib/labels';
import { Btn, Modal, selectCls } from '../../components/ui';
import type { AdminData } from './AdminPage';

type Draft = Omit<User, 'id'> & { id?: string };
const EMPTY: Draft = { name: '', employeeNo: '', subject: '', role: 'teacher', active: true };

export function TeachersManager({ bookings, users, reload, actor, toast }: AdminData) {
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Draft | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const usage = useMemo(() => {
    const m = new Map<string, number>();
    bookings.filter((b) => b.status !== 'cancelled' && b.status !== 'rejected').forEach((b) => m.set(b.teacherId, (m.get(b.teacherId) ?? 0) + 1));
    return m;
  }, [bookings]);

  const list = users.filter((u) => !q || u.name.includes(q.trim()) || u.employeeNo.includes(q.trim()));

  const save = async (d: Draft, msg = 'تم حفظ بيانات الحساب') => {
    setBusy(true);
    setErr('');
    try { await repo.saveUser(d); await reload(); toast(msg); setEdit(null); }
    catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  const submitEdit = () => {
    if (!edit) return;
    if (!edit.name.trim() || !/^\d{4,10}$/.test(edit.employeeNo)) { setErr('يرجى إدخال الاسم ورقم وظيفي صحيح'); return; }
    save({ ...edit, name: edit.name.trim() });
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-80">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو الرقم الوظيفي" className={`${selectCls} pr-9 font-semibold`} />
        </div>
        <Btn onClick={() => { setErr(''); setEdit({ ...EMPTY }); }}><UserPlus className="h-4 w-4" /> إضافة معلم</Btn>
      </div>

      <div className="grid gap-3 md:hidden">
        {list.map((u) => (
          <article key={u.id} className={`rounded-xl2 bg-white p-4 shadow-card ${u.active ? '' : 'opacity-70'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-extrabold text-navy-800">{u.name}</div>
                <div className="text-xs font-semibold text-navy-400"><span dir="ltr">{u.employeeNo}</span>{u.subject && ` · ${u.subject}`}</div>
              </div>
              <button onClick={() => { setErr(''); setEdit({ ...u }); }} className="rounded-lg p-2 text-navy-400 hover:bg-navy-50" aria-label="تعديل"><Pencil className="h-4 w-4" /></button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <RoleSelect u={u} actor={actor} disabled={busy} onChange={(role) => save({ ...u, role }, 'تم تحديث الصلاحية')} />
              <ActiveToggle u={u} actor={actor} onChange={(active) => save({ ...u, active }, active ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب')} />
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl2 bg-white shadow-card md:block">
        <table className="w-full text-right text-sm">
          <thead className="bg-navy-50 text-xs font-extrabold text-navy-600">
            <tr>
              <th className="px-5 py-3.5">الاسم</th>
              <th className="px-3 py-3.5">الرقم الوظيفي</th>
              <th className="px-3 py-3.5">المادة</th>
              <th className="px-3 py-3.5">عدد الحجوزات</th>
              <th className="px-3 py-3.5">الصلاحية</th>
              <th className="px-3 py-3.5">الحساب</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {list.map((u) => (
              <tr key={u.id} className={`hover:bg-sky-page/60 ${u.active ? '' : 'text-navy-300'}`}>
                <td className="px-5 py-3 font-extrabold text-navy-800">{u.name}</td>
                <td className="px-3 py-3 font-bold text-navy-600" dir="ltr" style={{ textAlign: 'right' }}>{u.employeeNo}</td>
                <td className="px-3 py-3 font-semibold text-navy-600">{u.subject || '—'}</td>
                <td className="px-3 py-3 font-extrabold text-navy-700">{usage.get(u.id) ?? 0}</td>
                <td className="px-3 py-3 w-52"><RoleSelect u={u} actor={actor} disabled={busy} onChange={(role) => save({ ...u, role }, 'تم تحديث الصلاحية')} /></td>
                <td className="px-3 py-3"><ActiveToggle u={u} actor={actor} onChange={(active) => save({ ...u, active }, active ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب')} /></td>
                <td className="px-5 py-3 text-left">
                  <button onClick={() => { setErr(''); setEdit({ ...u }); }} className="rounded-lg p-2 text-navy-400 hover:bg-navy-50 hover:text-navy-800" aria-label="تعديل"><Pencil className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'تعديل بيانات الحساب' : 'إضافة معلم'}
        size="sm"
        footer={<div className="flex gap-2"><Btn className="flex-1" onClick={submitEdit} disabled={busy}>حفظ</Btn><Btn variant="outline" className="flex-1" onClick={() => setEdit(null)}>إلغاء</Btn></div>}
      >
        {edit && (
          <div className="grid gap-3">
            <L label="الاسم الكامل"><input className={`${selectCls} font-semibold`} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></L>
            <L label="الرقم الوظيفي"><input className={`${selectCls} font-semibold`} dir="ltr" inputMode="numeric" value={edit.employeeNo} onChange={(e) => setEdit({ ...edit, employeeNo: e.target.value.replace(/\D/g, '') })} /></L>
            <L label="المادة"><input className={`${selectCls} font-semibold`} value={edit.subject ?? ''} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} /></L>
            <L label="الصلاحية">
              <select className={selectCls} value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as Role })} disabled={edit.id === actor.id}>
                {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </L>
            {err && <p className="rounded-lg bg-slot-busyBg px-3 py-2 text-sm font-bold text-slot-busy">{err}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-bold text-navy-500">{label}</span>{children}</label>;
}

function RoleSelect({ u, actor, onChange, disabled }: { u: User; actor: User; onChange: (r: Role) => void; disabled?: boolean }) {
  return (
    <select
      className={`${selectCls} !h-9 text-xs`}
      value={u.role}
      disabled={disabled || u.id === actor.id}
      title={u.id === actor.id ? 'لا يمكنك تغيير صلاحية حسابك' : undefined}
      onChange={(e) => onChange(e.target.value as Role)}
    >
      {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
    </select>
  );
}

function ActiveToggle({ u, actor, onChange }: { u: User; actor: User; onChange: (v: boolean) => void }) {
  const self = u.id === actor.id;
  return (
    <button
      role="switch"
      aria-checked={u.active}
      disabled={self}
      onClick={() => onChange(!u.active)}
      className="flex items-center gap-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className={`relative h-6 w-11 rounded-full transition ${u.active ? 'bg-slot-free' : 'bg-navy-200'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${u.active ? 'right-0.5' : 'right-[22px]'}`} />
      </span>
      <span className={u.active ? 'text-slot-free' : 'text-navy-400'}>{u.active ? 'مفعّل' : 'موقوف'}</span>
    </button>
  );
}
