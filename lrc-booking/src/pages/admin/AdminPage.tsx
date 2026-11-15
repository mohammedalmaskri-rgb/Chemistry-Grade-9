import { useCallback, useEffect, useState } from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import { Camera, Inbox, ListChecks, RotateCcw, Users } from 'lucide-react';
import type { Booking, User } from '../../types';
import { repo } from '../../data';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Btn } from '../../components/ui';
import { PendingRequests } from './PendingRequests';
import { AllBookings } from './AllBookings';
import { DocumentationRequests } from './DocumentationRequests';
import { TeachersManager } from './TeachersManager';

const TABS = [
  { id: 'requests', label: 'الطلبات المعلقة', icon: Inbox },
  { id: 'bookings', label: 'جميع الحجوزات', icon: ListChecks },
  { id: 'documentation', label: 'طلبات التوثيق', icon: Camera },
  { id: 'teachers', label: 'المعلمون والصلاحيات', icon: Users },
] as const;

export type AdminData = {
  bookings: Booking[];
  users: User[];
  reload: () => Promise<void>;
  actor: User;
  toast: ReturnType<typeof useToast>;
};

export default function AdminPage() {
  const { tab = 'requests' } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [b, u] = await Promise.all([repo.listAllBookings(), repo.listUsers()]);
    setBookings(b);
    setUsers(u);
    setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  if (!TABS.some((t) => t.id === tab)) return <Navigate to="/admin/requests" replace />;
  const pending = bookings.filter((b) => b.status === 'pending').length;
  const docOpen = bookings.filter((b) => b.wantsDocumentation && b.status === 'approved' && !b.documented).length;
  const data: AdminData = { bookings, users, reload, actor: user!, toast };

  return (
    <div>
      <PageHeader
        title="لوحة مسؤول المصادر"
        subtitle="مراجعة الطلبات وإدارة الحجوزات والمعلمين"
        actions={
          <Btn variant="ghost" className="text-xs" onClick={async () => { await repo.resetDemo(); await reload(); toast('تمت إعادة البيانات التجريبية'); }}>
            <RotateCcw className="h-4 w-4" /> إعادة البيانات التجريبية
          </Btn>
        }
      />
      <nav className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {TABS.map(({ id, label, icon: I }) => {
          const badge = id === 'requests' ? pending : id === 'documentation' ? docOpen : 0;
          return (
            <NavLink
              key={id}
              to={`/admin/${id}`}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${isActive ? 'bg-navy-800 text-white shadow-lift' : 'bg-white text-navy-600 shadow-card hover:text-navy-800'}`
              }
            >
              <I className="h-4 w-4" /> {label}
              {badge > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#E9B10A] px-1.5 text-[11px] font-extrabold text-navy-900">{badge}</span>}
            </NavLink>
          );
        })}
      </nav>

      {loading ? (
        <div className="grid gap-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl2 bg-white/70" />)}</div>
      ) : tab === 'requests' ? <PendingRequests {...data} />
        : tab === 'bookings' ? <AllBookings {...data} />
        : tab === 'documentation' ? <DocumentationRequests {...data} />
        : <TeachersManager {...data} />}
    </div>
  );
}
