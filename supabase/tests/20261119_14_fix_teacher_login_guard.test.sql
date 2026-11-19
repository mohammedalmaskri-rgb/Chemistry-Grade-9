-- اختبار 20261119_14_fix_teacher_login_guard — على نسخة محلية أو قاعدة اختبار فقط. لا يُشغَّل على الإنتاج.
-- Run ONLY against a local copy, AFTER applying migrations/20261119_14_fix_teacher_login_guard.sql. Rolls back.
\set QUIET on
\set ON_ERROR_STOP on
set client_min_messages = warning;
begin;
insert into public.teacher_users(username, full_name, password_hash, is_active, must_change_password)
  values ('zz_tg_t1', 'معلم اختبار', extensions.crypt('TchPass1', extensions.gen_salt('bf')), true, false);
create temp table t_r(n serial, check_name text, ok boolean);
create or replace function pg_temp.chk(name text, ok boolean) returns void language sql as $$ insert into t_r(check_name, ok) values (name, ok) $$;
select pg_temp.chk('correct password logs in', (select count(*) = 1 from public.portal_teacher_login('zz_tg_t1', 'TchPass1')));
select pg_temp.chk('wrong password -> empty result, no error', (select count(*) = 0 from public.portal_teacher_login('zz_tg_t1', 'bad')));
select pg_temp.chk('failure is recorded in the guard', exists (select 1 from public.teacher_login_guard where username = 'zz_tg_t1' and failed_count = 1));
select pg_temp.chk('login after a failure succeeds', (select count(*) = 1 from public.portal_teacher_login('zz_tg_t1', 'TchPass1')));
select pg_temp.chk('success clears the guard', not exists (select 1 from public.teacher_login_guard where username = 'zz_tg_t1'));
do $$ begin for i in 1..9 loop perform public.portal_teacher_login('zz_tg_t1', 'bad'); end loop; end $$;
select pg_temp.chk('9 failures: not locked yet', (select count(*) = 1 from public.portal_teacher_login('zz_tg_t1', 'TchPass1')));
do $$ begin for i in 1..10 loop perform public.portal_teacher_login('zz_tg_t1', 'bad'); end loop; end $$;
select pg_temp.chk('10 failures: locked (right password refused)', (select count(*) = 0 from public.portal_teacher_login('zz_tg_t1', 'TchPass1')) and exists (select 1 from public.teacher_login_guard where username = 'zz_tg_t1' and locked_until > now()));
select pg_temp.chk('unknown username -> empty, no error', (select count(*) = 0 from public.portal_teacher_login('zz_tg_nobody', 'x')));
select pg_temp.chk('unified login also works for teachers after the fix', (select count(*) = 0 from public.portal_login('zz_tg_t1', 'TchPass1')) /* still locked */);
\set QUIET off
select case when ok is true then 'PASS' else 'FAIL' end as result, check_name from t_r order by n;
select case when bool_and(coalesce(ok, false)) then 'ALL PASSED' else 'FAILURES' end as summary, count(*) as checks from t_r;
rollback;
