-- Rollback لـ 20261126_22_role_logout — يحذف دالتي الخروج المضافتين.
begin;
drop function if exists public.portal_student_logout(uuid);
drop function if exists public.portal_teacher_logout(uuid);
commit;
