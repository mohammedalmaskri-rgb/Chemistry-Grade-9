import { useEffect, type ReactNode } from 'react';
import { Ban, CheckCircle2, Clock3, X, XCircle } from 'lucide-react';
import type { BookingStatus } from '../types';
import { STATUS_LABEL } from '../lib/labels';

/** نافذة منبثقة — تتحول إلى ورقة سفلية على الهاتف */
export function Modal({
  open, onClose, title, subtitle, children, footer, size = 'md',
}: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  const w = size === 'sm' ? 'sm:max-w-md' : size === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-xl';
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/45 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-xl2 bg-white shadow-lift sm:rounded-xl2 ${w}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-navy-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-extrabold text-navy-800">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm font-medium text-navy-400">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-navy-400 hover:bg-navy-50 hover:text-navy-800" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <footer className="border-t border-navy-100 bg-sky-page/60 px-5 py-4 sm:px-6">{footer}</footer>}
      </div>
    </div>
  );
}

const STATUS_STYLE: Record<BookingStatus, { cls: string; icon: typeof Clock3 }> = {
  pending: { cls: 'bg-slot-pendBg text-slot-pend ring-slot-pendBd', icon: Clock3 },
  approved: { cls: 'bg-slot-busyBg text-slot-busy ring-slot-busyBd', icon: CheckCircle2 },
  rejected: { cls: 'bg-navy-50 text-navy-700 ring-navy-200', icon: XCircle },
  cancelled: { cls: 'bg-gray-100 text-gray-500 ring-gray-200', icon: Ban },
};

/** شارة الحالة: الأصفر بانتظار الموافقة، الأحمر معتمد ومحجوز (مطابق لألوان الجدول) */
export function StatusBadge({ status }: { status: BookingStatus }) {
  const { cls, icon: I } = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${cls}`}>
      <I className="h-3.5 w-3.5" /> {STATUS_LABEL[status]}
    </span>
  );
}

export function Btn({
  children, variant = 'primary', className = '', ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'success' | 'outline' }) {
  const v = {
    primary: 'bg-navy-800 text-white hover:bg-navy-700 shadow-lift',
    outline: 'border border-navy-200 bg-white text-navy-700 hover:border-navy-400',
    ghost: 'text-navy-600 hover:bg-navy-50',
    danger: 'border border-slot-busyBd bg-white text-slot-busy hover:bg-slot-busyBg',
    success: 'bg-slot-free text-white hover:bg-green-700',
  }[variant];
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-navy-200 disabled:cursor-not-allowed disabled:opacity-50 ${v} ${className}`}
    >
      {children}
    </button>
  );
}

export function ConfirmDialog({
  open, title, message, confirmLabel, onConfirm, onClose, danger, busy, children,
}: {
  open: boolean; title: string; message: ReactNode; confirmLabel: string; onConfirm: () => void; onClose: () => void; danger?: boolean; busy?: boolean; children?: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex gap-2">
          <Btn variant={danger ? 'danger' : 'primary'} className={`flex-1 ${danger ? '!bg-slot-busy !text-white hover:!bg-red-700' : ''}`} onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Btn>
          <Btn variant="outline" className="flex-1" onClick={onClose}>تراجع</Btn>
        </div>
      }
    >
      <div className="text-sm font-medium leading-7 text-navy-600">{message}</div>
      {children}
    </Modal>
  );
}

export function EmptyState({ icon: I, title, text }: { icon: typeof Clock3; title: string; text?: string }) {
  return (
    <div className="rounded-xl2 bg-white px-6 py-14 text-center shadow-card">
      <I className="mx-auto h-10 w-10 text-navy-300" />
      <h3 className="mt-3 text-base font-extrabold text-navy-800">{title}</h3>
      {text && <p className="mt-1 text-sm font-medium text-navy-400">{text}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold text-navy-800 sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm font-medium text-navy-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export const selectCls =
  'h-11 w-full rounded-xl border border-navy-100 bg-white px-3 text-sm font-bold text-navy-800 focus:border-navy-500 focus:outline-none focus:ring-4 focus:ring-navy-100';
