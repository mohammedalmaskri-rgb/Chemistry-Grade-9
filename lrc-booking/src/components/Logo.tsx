import { APP_NAME } from '../lib/labels';

/** شعار مركز مصادر التعلم (كتاب مفتوح مع شعاع معرفة) */
export function LogoMark({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#162C4F" />
      <circle cx="32" cy="17" r="5" fill="#F5C451" />
      <path d="M32 9v-3M24.5 12l-2-2M39.5 12l2-2" stroke="#F5C451" strokeWidth="2" strokeLinecap="round" />
      <path d="M11 27c7-3.5 14-3.2 21 1.2V52c-7-4.4-14-4.7-21-1.2z" fill="#fff" />
      <path d="M53 27c-7-3.5-14-3.2-21 1.2V52c7-4.4 14-4.7 21-1.2z" fill="#B6C8E3" />
      <path d="M16 33c4-1.4 8-1.2 12 .6M16 39c4-1.4 8-1.2 12 .6M36 33.6c4-1.8 8-2 12-.6M36 39.6c4-1.8 8-2 12-.6" stroke="#5677AE" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark className={compact ? 'h-10 w-10' : 'h-14 w-14'} />
      <div className="leading-tight">
        <div className={`font-extrabold text-navy-800 ${compact ? 'text-base' : 'text-xl'}`}>{APP_NAME}</div>
        <div className={`font-semibold text-navy-400 ${compact ? 'text-xs' : 'text-sm'}`}>نظام الحجز الإلكتروني</div>
      </div>
    </div>
  );
}
