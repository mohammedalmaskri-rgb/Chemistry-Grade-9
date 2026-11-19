-- اختبار 20261119_13_unified_login — على نسخة محلية أو قاعدة اختبار فقط. لا يُشغَّل على الإنتاج.
-- Run ONLY against a local copy / isolated test DB, AFTER applying migrations/20261119_13_unified_login.sql.
-- Self-contained: creates its own fake admin/teacher/students (usernames zz_ul_*, class 9/1) and rolls everything back.
\set QUIET on
\set ON_ERROR_STOP on
set client_min_messages = warning;
begin;
insert into public.portal_admin_users(username, full_name, password_hash, is_active)
  values ('zz_ul_adm', 'مشرف اختبار', extensions.crypt('AdmPass1', extensions.gen_salt('bf')), true);
insert into public.teacher_users(username, full_name, password_hash, is_active, must_change_password)
  values ('zz_ul_t1', 'معلم اختبار', extensions.crypt('TchPass1', extensions.gen_salt('bf')), true, false),
         ('zz_ul_t_off', 'معلم موقوف', extensions.crypt('TchPass1', extensions.gen_salt('bf')), false, false);
insert into public.students(full_name, class_name, username, password_hash, is_active, must_change_password, points)
  values ('طالب اختبار', '9/1', 'zz_ul_s1', extensions.crypt('StdPass1', extensions.gen_salt('bf')), true, true, 7),
         ('طالب موقوف', '9/1', 'zz_ul_s_off', extensions.crypt('StdPass1', extensions.gen_salt('bf')), false, false, 0);
create temp table t_r(n serial, check_name text, ok boolean);
create or replace function pg_temp.chk(name text, ok boolean) returns void language sql as $$ insert into t_r(check_name, ok) values (name, ok) $$;
create temp table r as select * from public.portal_login('zz_ul_s1', 'StdPass1');
select pg_temp.chk('student logs in: role=student, class, points, must_change', (select count(*) = 1 and bool_and(role = 'student' and class_name = '9/1' and points = 7 and must_change_password and token is not null) from r));
select pg_temp.chk('student session row created', exists (select 1 from public.student_sessions ss join r on ss.token = r.token));
select pg_temp.chk('student login with spaces around username', (select count(*) = 1 from public.portal_login('  zz_ul_s1 ', 'StdPass1')));
truncate r; insert into r select * from public.portal_login('zz_ul_t1', 'TchPass1');
select pg_temp.chk('teacher logs in: role=teacher', (select count(*) = 1 and bool_and(role = 'teacher' and token is not null and class_name is null) from r));
select pg_temp.chk('teacher session row created', exists (select 1 from public.teacher_sessions ts join r on ts.token = r.token));
truncate r; insert into r select * from public.portal_login('zz_ul_adm', 'AdmPass1');
select pg_temp.chk('admin logs in: role=admin', (select count(*) = 1 and bool_and(role = 'admin' and token is not null) from r));
select pg_temp.chk('admin session row created', exists (select 1 from public.portal_admin_sessions s join r on s.token = r.token));
select pg_temp.chk('wrong student password -> empty', (select count(*) = 0 from public.portal_login('zz_ul_s1', 'nope')));
select pg_temp.chk('unknown username -> empty', (select count(*) = 0 from public.portal_login('zz_ul_nobody', 'StdPass1')));
select pg_temp.chk('empty / oversized input -> empty', (select count(*) = 0 from public.portal_login('', 'x')) and (select count(*) = 0 from public.portal_login(repeat('a', 81), 'x')) and (select count(*) = 0 from public.portal_login('zz_ul_s1', '')));
select pg_temp.chk('inactive student / teacher -> empty', (select count(*) = 0 from public.portal_login('zz_ul_s_off', 'StdPass1')) and (select count(*) = 0 from public.portal_login('zz_ul_t_off', 'TchPass1')));
select pg_temp.chk('a teacher password does not open a student account', (select count(*) = 0 from public.portal_login('zz_ul_s1', 'TchPass1')));
select pg_temp.chk('student failures never touch teacher/admin lockout tables',
  not exists (select 1 from public.teacher_login_guard where username like 'zz_ul_%') and not exists (select 1 from public.portal_admin_login_guard where username like 'zz_ul_%'));
select pg_temp.chk('wrong teacher password -> empty, no error (old function errors here)', (select count(*) = 0 from public.portal_login('zz_ul_t1', 'bad')));
select pg_temp.chk('teacher can still log in right after a failed attempt', (select count(*) = 1 from public.portal_login('zz_ul_t1', 'TchPass1')));
select pg_temp.chk('wrong teacher password never touches the admin guard', not exists (select 1 from public.portal_admin_login_guard where username = 'zz_ul_t1'));
do $$ begin for i in 1..5 loop perform public.portal_login('zz_ul_adm', 'bad'); end loop; end $$;
select pg_temp.chk('admin lockout still applies after 5 failures (same as old login)', (select count(*) = 0 from public.portal_login('zz_ul_adm', 'AdmPass1')));
select pg_temp.chk('anon may execute; PUBLIC may not', has_function_privilege('anon', 'public.portal_login(text,text)', 'execute') and not (select coalesce(bool_or(a.grantee = 0), false) from pg_proc p, aclexplode(p.proacl) a where p.oid = 'public.portal_login(text,text)'::regprocedure));
\set QUIET off
select case when ok is true then 'PASS' else 'FAIL' end as result, check_name from t_r order by n;
select case when bool_and(coalesce(ok, false)) then 'ALL PASSED' else 'FAILURES' end as summary, count(*) as checks from t_r;
rollback;
