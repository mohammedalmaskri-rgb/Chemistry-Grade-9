-- اختبار 20261126_22_role_logout — على نسخة محلية أو قاعدة اختبار فقط. لا يُشغَّل على الإنتاج.
-- Run ONLY against a local copy, AFTER applying migrations/20261126_22_role_logout.sql. Rolls back.
\set QUIET on
\set ON_ERROR_STOP on
set client_min_messages = warning;
begin;
insert into public.students(username, full_name, class_name, password_hash, is_active, must_change_password, points)
  values ('zz_lo_s1','طالب خروج','9/1', extensions.crypt('StdPass1', extensions.gen_salt('bf')), true, false, 0);
insert into public.teacher_users(username, full_name, password_hash, is_active, must_change_password)
  values ('zz_lo_t1','معلم خروج', extensions.crypt('TchPass1', extensions.gen_salt('bf')), true, false);
create temp table t_r(n serial, check_name text, ok boolean);
create or replace function pg_temp.chk(name text, ok boolean) returns void language sql as $$ insert into t_r(check_name, ok) values (name, ok) $$;

-- الطالب: سجّل الدخول ثم الخروج، يجب أن تُحذف الجلسة من الخادم
do $$ declare tk uuid; begin
  select token into tk from public.portal_student_login('zz_lo_s1','StdPass1');
  perform pg_temp.chk('student session exists after login', exists(select 1 from public.student_sessions where token=tk));
  perform public.portal_student_logout(tk);
  perform pg_temp.chk('student session gone after logout', not exists(select 1 from public.student_sessions where token=tk));
end $$;

-- المعلم: نفس الشيء
do $$ declare tk uuid; begin
  select token into tk from public.portal_teacher_login('zz_lo_t1','TchPass1');
  perform pg_temp.chk('teacher session exists after login', exists(select 1 from public.teacher_sessions where token=tk));
  perform public.portal_teacher_logout(tk);
  perform pg_temp.chk('teacher session gone after logout', not exists(select 1 from public.teacher_sessions where token=tk));
end $$;

select pg_temp.chk('logout with random token is harmless', public.portal_student_logout(extensions.gen_random_uuid()) = true);

\set QUIET off
select case when ok is true then 'PASS' else 'FAIL' end as result, check_name from t_r order by n;
select case when bool_and(coalesce(ok,false)) then 'ALL PASSED' else 'FAILURES' end as summary, count(*) as checks from t_r;
rollback;
