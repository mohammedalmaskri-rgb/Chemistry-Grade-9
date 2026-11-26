-- 20261126_22_role_logout
-- يضيف دالتي خروج للطالب والمعلم تُنهيان الجلسة على الخادم (حذف التوكن)، على نمط
-- portal_admin_logout الموجودة. قبل هذا التعديل كان تسجيل الخروج يمسح التوكن من
-- المتصفح فقط، بينما تبقى جلسة الطالب صالحة على الخادم حتى 30 يومًا (والمعلم 12 ساعة).
--
-- لا يغيّر شيئًا قائمًا. تُرجع كل دالة true دائمًا (لا تكشف هل كان التوكن صالحًا).
-- Rollback: rollback/20261126_22_role_logout.sql
begin;

create or replace function public.portal_student_logout(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
begin
  delete from public.student_sessions where token = p_token;
  return true;
end;
$function$;

create or replace function public.portal_teacher_logout(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
begin
  delete from public.teacher_sessions where token = p_token;
  return true;
end;
$function$;

revoke all on function public.portal_student_logout(uuid) from public;
revoke all on function public.portal_teacher_logout(uuid) from public;
grant execute on function public.portal_student_logout(uuid) to anon, authenticated, service_role;
grant execute on function public.portal_teacher_logout(uuid) to anon, authenticated, service_role;

commit;
