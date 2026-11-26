-- 20261126_21_student_login_guard
-- يضيف حماية من تخمين كلمات المرور لحسابات الطلاب على مستوى الخادم،
-- بنفس أسلوب teacher_login_guard الموجود (قفل بعد 10 محاولات فاشلة خلال 10 دقائق
-- لمدة 15 دقيقة). القفل في المتصفح (localStorage) يبقى كما هو، لكنه لم يعد الحاجز
-- الوحيد: الآن الخادم نفسه يفرض الحد حتى لو نُودِيت الدالة مباشرة أو مُسح المتصفح.
--
-- لا يغيّر مسار الدخول الناجح ولا توقيع الدالة ولا بيانات أي طالب. يضيف فقط:
--   1) جدول student_login_guard (عدّاد محاولات لكل اسم مستخدم، لا كلمات مرور).
--   2) منطق الحظر والتصفير داخل portal_student_login.
-- كما يضيف للدالة نفس فحوص الطول/الفراغ الموجودة في دالتي المشرف والمعلم، لأن
-- portal_student_login قابلة للاستدعاء مباشرة من دور anon.
--
-- Rollback: rollback/20261126_21_student_login_guard.sql (يعيد الدالة كما كانت ويحذف الجدول).
-- Security: اسم مستخدم غير موجود، كلمة مرور خاطئة، وحساب محظور — كلها تُرجع نتيجة فارغة.
begin;

-- 1) جدول الحماية (مطابق لبنية teacher_login_guard)
create table if not exists public.student_login_guard (
  username        text primary key,
  failed_count    integer not null default 0,
  first_failed_at timestamptz,
  last_failed_at  timestamptz,
  locked_until    timestamptz
);

-- نفس وضع teacher_login_guard: RLS مفعّل بلا سياسات، والوصول عبر الدالة
-- الـ SECURITY DEFINER فقط (service_role). لا صلاحيات لـ anon/authenticated.
alter table public.student_login_guard enable row level security;
revoke all on public.student_login_guard from anon, authenticated;
grant select, insert, update, delete on public.student_login_guard to service_role;

-- 2) النسخة المحمية من دالة دخول الطالب
create or replace function public.portal_student_login(p_username text, p_password text)
returns table(token uuid, student_id bigint, full_name text, class_name text,
              username text, points integer, must_change_password boolean)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
#variable_conflict use_column
declare
  v public.students%rowtype;
  v_token uuid;
  v_now timestamptz := now();
  g public.student_login_guard%rowtype;
  u text := trim(coalesce(p_username, ''));
begin
  -- لا تكشف هل اسم المستخدم موجود أم لا، وارفض المدخلات غير الصالحة مبكرًا
  if u = '' or coalesce(p_password, '') = '' or length(u) > 80 or length(p_password) > 200 then
    return;
  end if;

  -- اقرأ حالة الحماية الحالية لهذا الاسم
  select * into g
  from public.student_login_guard
  where student_login_guard.username = u;

  -- إذا انتهت مدة الحظر، صفّر العداد قبل المتابعة
  if g.username is not null and g.locked_until is not null and g.locked_until <= v_now then
    update public.student_login_guard
       set failed_count = 0,
           first_failed_at = null,
           last_failed_at = null,
           locked_until = null
     where student_login_guard.username = u;
    g := null;
  end if;

  -- حساب محظور حاليًا: أرجع فارغًا دون فحص كلمة المرور
  if g.username is not null and g.locked_until is not null and g.locked_until > v_now then
    return;
  end if;

  -- فحص بيانات الدخول (نفس منطق الدالة الأصلية)
  select s.*
  into v
  from public.students as s
  where trim(s.username) = u
    and s.is_active = true
    and s.password_hash = extensions.crypt(p_password, s.password_hash)
  limit 1;

  -- فشل الدخول: سجّل المحاولة واحسب الحظر عند تجاوز الحد
  if v.id is null then
    insert into public.student_login_guard(username, failed_count, first_failed_at, last_failed_at, locked_until)
    values (u, 1, v_now, v_now, null)
    on conflict (username) do update
      set failed_count = case
            when public.student_login_guard.first_failed_at is null
              or public.student_login_guard.first_failed_at < v_now - interval '10 minutes'
            then 1
            else public.student_login_guard.failed_count + 1
          end,
          first_failed_at = case
            when public.student_login_guard.first_failed_at is null
              or public.student_login_guard.first_failed_at < v_now - interval '10 minutes'
            then v_now
            else public.student_login_guard.first_failed_at
          end,
          last_failed_at = v_now,
          locked_until = case
            when (
              case
                when public.student_login_guard.first_failed_at is null
                  or public.student_login_guard.first_failed_at < v_now - interval '10 minutes'
                then 1
                else public.student_login_guard.failed_count + 1
              end
            ) >= 10
            then v_now + interval '15 minutes'
            else null
          end;
    return;
  end if;

  -- نجاح الدخول: امسح سجل المحاولات الفاشلة لهذا الحساب
  delete from public.student_login_guard where student_login_guard.username = u;

  -- نظافة خفيفة: احذف الجلسات المنتهية فقط (لا يسجّل الطالب خروجًا من أجهزته الأخرى الفعّالة)
  delete from public.student_sessions ss
   where ss.student_id = v.id
     and ss.expires_at <= v_now;

  v_token := extensions.gen_random_uuid();
  insert into public.student_sessions(token, student_id)
  values (v_token, v.id);

  return query
  select
    v_token,
    v.id,
    v.full_name,
    v.class_name,
    v.username,
    coalesce(v.points, 0),
    coalesce(v.must_change_password, false);
end;
$function$;

commit;
