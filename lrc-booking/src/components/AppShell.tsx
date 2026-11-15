import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { CalendarDays, ClipboardList, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { ROLE_LABEL, SCHOOL_NAME } from '../lib/labels';

const NAV = [
  { to: '/', label: 'الجدول الأسبوعي', icon: CalendarDays, end: true },
  { to: '/my-bookings', label: 'حجوزاتي', icon: ClipboardList },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  const logout = async () => { await signOut(); navigate('/login', { replace: true }); };
  const initials = user.name.split(' ').filter((w) => !['بن', 'بنت'].includes(w)).slice(0, 2).map((w) => w[0]).join(' ');

  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
      isActive ? 'bg-navy-800 text-white shadow-lift' : 'text-navy-600 hover:bg-navy-50'
    }`;

  return (
    <div className="min-h-screen bg-sky-page">
      <header className="sticky top-0 z-30 border-b border-navy-100/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo compact />
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map(({ to, label, icon: I, end }) => (
                <NavLink key={to} to={to} end={end} className={link}>
                  <I className="h-4 w-4" /> {label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 sm:flex">
              <div className="text-left leading-tight" dir="rtl">
                <div className="text-sm font-bold text-navy-800">{user.name}</div>
                <div className="text-xs font-semibold text-navy-400">{ROLE_LABEL[user.role]}</div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-navy-100 text-sm font-extrabold text-navy-700">
                {initials}
              </div>
            </div>
            <button
              onClick={logout}
              className="hidden items-center gap-2 rounded-xl border border-navy-100 px-3 py-2 text-sm font-bold text-navy-600 transition hover:border-slot-busyBd hover:bg-slot-busyBg hover:text-slot-busy md:flex"
            >
              <LogOut className="h-4 w-4 -scale-x-100" /> خروج
            </button>
            <button onClick={() => setOpen((o) => !o)} className="rounded-xl p-2 text-navy-700 hover:bg-navy-50 md:hidden" aria-label="القائمة">
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-navy-100 bg-white px-4 pb-4 pt-3 md:hidden">
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-sky-page p-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-navy-100 text-sm font-extrabold text-navy-700">{initials}</div>
              <div>
                <div className="text-sm font-bold text-navy-800">{user.name}</div>
                <div className="text-xs font-semibold text-navy-400">{ROLE_LABEL[user.role]}</div>
              </div>
            </div>
            <nav className="grid gap-1">
              {NAV.map(({ to, label, icon: I, end }) => (
                <NavLink key={to} to={to} end={end} className={link} onClick={() => setOpen(false)}>
                  <I className="h-4 w-4" /> {label}
                </NavLink>
              ))}
              <button onClick={logout} className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slot-busy hover:bg-slot-busyBg">
                <LogOut className="h-4 w-4 -scale-x-100" /> تسجيل الخروج
              </button>
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>

      <footer className="pb-8 text-center text-xs font-medium text-navy-400">{SCHOOL_NAME} · مركز مصادر التعلم</footer>
    </div>
  );
}
