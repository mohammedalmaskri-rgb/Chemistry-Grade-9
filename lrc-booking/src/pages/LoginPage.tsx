import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, CalendarCheck, IdCard, Info, Loader2, LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEMO_USERS } from '../data';
import { LogoMark } from '../components/Logo';
import { APP_NAME, APP_SUBTITLE, ROLE_LABEL, SCHOOL_NAME } from '../lib/labels';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [employeeNo, setEmployeeNo] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{4,10}$/.test(employeeNo.trim())) {
      setError('يرجى إدخال رقم وظيفي صحيح (أرقام فقط)');
      return;
    }
    setBusy(true);
    try {
      await signIn(employeeNo);
      navigate('/', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-sky-page lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* عمود النموذج */}
      <main className="flex min-h-screen flex-col px-4 py-6 sm:px-10 lg:py-10">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div className="mb-8 flex flex-col items-center text-center">
            <LogoMark className="h-20 w-20 drop-shadow-md" />
            <h1 className="mt-4 text-2xl font-extrabold text-navy-800 sm:text-3xl">{APP_NAME}</h1>
            <p className="mt-1 text-base font-bold text-navy-500">{APP_SUBTITLE}</p>
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-navy-700 shadow-card">
              <span className="h-2 w-2 rounded-full bg-navy-500" />
              {SCHOOL_NAME}
            </p>
          </div>

          {/* صورة مصغرة للهاتف والآيباد */}
          <div className="mb-6 overflow-hidden rounded-xl2 shadow-card lg:hidden">
            <img src="./library.jpg" alt="مركز مصادر التعلم" className="h-44 w-full object-cover sm:h-56" />
          </div>

          <form onSubmit={submit} className="rounded-xl2 bg-white p-6 shadow-card sm:p-8" noValidate>
            <h2 className="text-xl font-extrabold text-navy-800">تسجيل الدخول</h2>
            <p className="mt-1 text-sm text-navy-400">أدخل رقمك الوظيفي للوصول إلى نظام الحجز</p>

            <label htmlFor="emp" className="mt-6 block text-sm font-bold text-navy-700">
              الرقم الوظيفي
            </label>
            <div className="relative mt-2">
              <IdCard className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-navy-300" />
              <input
                id="emp"
                inputMode="numeric"
                autoComplete="off"
                dir="ltr"
                value={employeeNo}
                onChange={(e) => setEmployeeNo(e.target.value.replace(/[^\d٠-٩]/g, '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))))}
                placeholder="مثال: 100100"
                className="h-14 w-full rounded-xl border border-navy-100 bg-sky-page pr-12 pl-4 text-right text-lg font-bold tracking-wider text-navy-800 placeholder:font-medium placeholder:tracking-normal placeholder:text-navy-300 focus:border-navy-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-navy-100"
              />
            </div>
            {error && <p role="alert" className="mt-2 text-sm font-semibold text-slot-busy">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-navy-800 text-lg font-bold text-white shadow-lift transition hover:bg-navy-700 focus:outline-none focus:ring-4 focus:ring-navy-200 disabled:opacity-70"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5 -scale-x-100" />}
              دخول
            </button>

            {/* حسابات تجريبية — تُزال في مرحلة الربط */}
            <div className="mt-6 rounded-xl border border-dashed border-navy-200 bg-sky-page/70 p-4">
              <p className="flex items-center gap-2 text-xs font-bold text-navy-600">
                <Info className="h-4 w-4" /> نسخة تجريبية — اختر حساباً للتجربة:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(['teacher', 'lrc_admin', 'management'] as const).map((r) => DEMO_USERS.find((x) => x.role === r)!).map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setEmployeeNo(u.employeeNo)}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-navy-700 ring-1 ring-navy-100 transition hover:ring-navy-400"
                  >
                    {ROLE_LABEL[u.role]} · <span dir="ltr">{u.employeeNo}</span>
                  </button>
                ))}
              </div>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-navy-400">
            © {new Date().getFullYear()} {APP_NAME} – {SCHOOL_NAME}
          </p>
        </div>
      </main>

      {/* عمود الصورة (كمبيوتر) */}
      <aside className="relative hidden overflow-hidden bg-navy-800 lg:block">
        <img src="./library.jpg" alt="مركز مصادر التعلم" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 via-navy-900/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white xl:p-14">
          <h2 className="text-3xl font-extrabold leading-snug xl:text-4xl">
            احجز مركز مصادر التعلم
            <br />
            بسهولة وسرعة
          </h2>
          <p className="mt-3 max-w-lg text-base font-medium text-navy-100">
            اطّلع على الحصص المتاحة لثلاثة أسابيع، واختر أكثر من حصة في طلب واحد، وتابع حالة طلباتك لحظة بلحظة.
          </p>
          <ul className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
            {[
              { icon: CalendarCheck, t: 'جدول أسبوعي واضح' },
              { icon: BadgeCheck, t: 'اعتماد إلكتروني' },
              { icon: ShieldCheck, t: 'صلاحيات حسب المستخدم' },
            ].map(({ icon: I, t }) => (
              <li key={t} className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur">
                <I className="h-4 w-4" /> {t}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
