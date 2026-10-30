-- اختبار 20261030_02_scope_teacher_student_accounts — على نسخة محلية فقط.
-- Run ONLY against a local copy restored from backup. Never against production.
-- usage: psql -v ON_ERROR_STOP=1 -v migration=... -v rollback=... -f this_file
\set QUIET on
set client_min_messages = warning;

-- fingerprints of the 12 functions before anything changes
create temp table t_fns(fn regprocedure);
insert into t_fns select p.oid::regprocedure from pg_proc p
where p.pronamespace = 'public'::regnamespace and p.proname in (
 'portal_teacher_reset_student_password','portal_teacher_delete_student','portal_teacher_move_student',
 'portal_teacher_move_student_class','portal_teacher_update_student_name','portal_teacher_add_student',
 'portal_teacher_add_student_auto','portal_teacher_find_student_account','portal_teacher_students',
 'portal_teacher_student_logins','portal_teacher_student_logins_v2','portal_teacher_points_overview');
create temp table t_def_before as select fn::text, md5(pg_get_functiondef(fn)) h,
  has_function_privilege('anon', fn, 'execute') anon_x from t_fns;

-- actors: real teachers in the local copy, by their assignments (no names printed)
--   T1 = chemistry 9/1-9/7 · T5 = science 7/4-7/6 · T7 = biology 9/5-9/12 · T2 = no assignment
create temp table t_tok as
select tid, gen_random_uuid() tok from (values (1),(2),(5),(7)) v(tid);
insert into public.teacher_sessions(token, teacher_id, expires_at) select tok, tid, now() + interval '1 hour' from t_tok;
create or replace function pg_temp.tok(t int) returns uuid language sql as $$ select tok from t_tok where tid = t $$;
create or replace function pg_temp.stu(c text, n int default 1) returns bigint language sql as
 $$ select id from public.students where class_name = c and is_active order by id offset n - 1 limit 1 $$;
create or replace function pg_temp.hash(s bigint) returns text language sql as $$ select password_hash from public.students where id = s $$;
-- run a statement, return the error text ('' if it succeeded)
create or replace function pg_temp.err(q text) returns text language plpgsql as
 $$ begin execute q; return ''; exception when others then return sqlerrm; end $$;

\i :migration

create temp table t_r(check_name text, ok boolean, detail text default '');

-- 1) password reset
create temp table t_h as select pg_temp.hash(pg_temp.stu('9/1')) h91, pg_temp.hash(pg_temp.stu('7/4')) h74;
insert into t_r select 'reset: T5 (7th grade) cannot reset a 9/1 student',
  pg_temp.err(format('select * from public.portal_teacher_reset_student_password(%L,%s,%L)', pg_temp.tok(5), pg_temp.stu('9/1'), 'Test123456')) like '%ليس ضمن%'
  and pg_temp.hash(pg_temp.stu('9/1')) = (select h91 from t_h);
insert into t_r select 'reset: T2 (no classes) cannot reset anyone',
  pg_temp.err(format('select * from public.portal_teacher_reset_student_password(%L,%s,%L)', pg_temp.tok(2), pg_temp.stu('7/4'), 'Test123456')) <> ''
  and pg_temp.hash(pg_temp.stu('7/4')) = (select h74 from t_h);
insert into t_r select 'reset: T1 resets own 9/1 student',
  (select count(*) = 1 from public.portal_teacher_reset_student_password(pg_temp.tok(1), pg_temp.stu('9/1'), 'Test123456'))
  and pg_temp.hash(pg_temp.stu('9/1')) <> (select h91 from t_h);
insert into t_r select 'reset: T5 resets own 7/4 student',
  (select count(*) = 1 from public.portal_teacher_reset_student_password(pg_temp.tok(5), pg_temp.stu('7/4'), null));

-- 2) rename
insert into t_r select 'rename: T5 cannot rename a 9/1 student',
  pg_temp.err(format('select public.portal_teacher_update_student_name(%L,%s,%L)', pg_temp.tok(5)::text, pg_temp.stu('9/1'), 'اسم اختبار')) like '%ليس ضمن%';
insert into t_r select 'rename: T1 renames own student',
  public.portal_teacher_update_student_name(pg_temp.tok(1)::text, pg_temp.stu('9/2'), 'اسم اختبار للطالب');

-- 3) move
insert into t_r select 'move: T5 cannot move a 9/1 student',
  pg_temp.err(format('select public.portal_teacher_move_student(%L,%s,%L)', pg_temp.tok(5)::text, pg_temp.stu('9/1', 2), '9/2')) like '%ليس ضمن%'
  and (select class_name from public.students where id = pg_temp.stu('9/1', 2)) = '9/1';
insert into t_r select 'move: T7 cannot move own 9/5 student into 9/1 (not his class)',
  pg_temp.err(format('select public.portal_teacher_move_student(%L,%s,%L)', pg_temp.tok(7)::text, pg_temp.stu('9/5'), '9/1')) like '%غير مسندة%';
insert into t_r select 'move: T7 moves own 9/5 student to own 9/6',
  public.portal_teacher_move_student(pg_temp.tok(7)::text, pg_temp.stu('9/5'), '9/6');
insert into t_r select 'move: T1 moves own 9/1 student to 9/2',
  public.portal_teacher_move_student(pg_temp.tok(1)::text, pg_temp.stu('9/1', 3), '9/2');
insert into t_r select 'move_student_class: T5 blocked on a 9/3 student',
  pg_temp.err(format('select public.portal_teacher_move_student_class(%L,%s,%L)', pg_temp.tok(5), pg_temp.stu('9/3'), '9/4')) like '%ليس ضمن%';
insert into t_r select 'move: existing 9/1-9/7 rule kept (T7 cannot move to own 9/8)',
  public.portal_teacher_move_student(pg_temp.tok(7)::text, pg_temp.stu('9/6'), '9/8') = false;

-- 4) add
insert into t_r select 'add: T5 cannot add to 9/3',
  pg_temp.err(format('select public.portal_teacher_add_student(%L,%L,%L,%L,%L)', pg_temp.tok(5)::text, 'طالب اختبار أ', '9/3', 'zz_test_a', 'Test123456')) like '%غير مسندة%'
  and not exists (select 1 from public.students where username = 'zz_test_a');
insert into t_r select 'add: T1 adds to own 9/3',
  public.portal_teacher_add_student(pg_temp.tok(1)::text, 'طالب اختبار ب', '9/3', 'zz_test_b', 'Test123456') is not null;
insert into t_r select 'add: existing 9/1-9/7 rule kept (T5 cannot add to own 7/4)',
  pg_temp.err(format('select public.portal_teacher_add_student(%L,%L,%L,%L,%L)', pg_temp.tok(5)::text, 'طالب اختبار ج', '7/4', 'zz_test_c', 'Test123456')) like '%الشعبة غير صحيحة%';
insert into t_r select 'add_auto: T5 cannot auto-add to 9/3',
  (select count(*) = 0 from public.portal_teacher_add_student_auto(pg_temp.tok(5), 'طالب اختبار د', '9/3'));

-- 5) delete
insert into t_r select 'delete: T5 cannot delete a 9/4 student',
  pg_temp.err(format('select public.portal_teacher_delete_student(%L,%s)', pg_temp.tok(5), pg_temp.stu('9/4'))) like '%ليس ضمن%'
  and exists (select 1 from public.students where id = pg_temp.stu('9/4'));
insert into t_r select 'delete: T1 deletes the test student he added',
  public.portal_teacher_delete_student(pg_temp.tok(1), (select id from public.students where username = 'zz_test_b'));

-- 6) lists only return the teacher's own classes
create temp table t_cls as select tid, array_agg(distinct tcs.class_name) cls
  from t_tok join public.teacher_class_subjects tcs on tcs.teacher_id = tid and tcs.is_active group by tid;
create or replace function pg_temp.mine(t int, c text) returns boolean language sql as
 $$ select c = any(coalesce((select cls from t_cls where tid = t), '{}')) $$;
insert into t_r select 'students list: T5 sees only own classes, all of them',
  bool_and(pg_temp.mine(5, class_name)) and count(*) = (select count(*) from public.students where pg_temp.mine(5, class_name)), count(*)::text
  from public.portal_teacher_students(pg_temp.tok(5), 'ALL');
insert into t_r select 'students list: T2 sees nothing', count(*) = 0 from public.portal_teacher_students(pg_temp.tok(2), 'ALL');
insert into t_r select 'search: T5 finds only own classes',
  coalesce(bool_and(pg_temp.mine(5, class_name)), true) and count(*) > 0, count(*)::text
  from public.portal_teacher_find_student_account(pg_temp.tok(5), left((select username from public.students where id = pg_temp.stu('7/4')), 2), 'ALL');
insert into t_r select 'search: T5 cannot find a 9/1 student by exact username',
  count(*) = 0 from public.portal_teacher_find_student_account(pg_temp.tok(5), (select username from public.students where id = pg_temp.stu('9/1', 4)), 'ALL');
insert into t_r select 'logins_v2: T5 only own classes',
  bool_and(pg_temp.mine(5, class_name)) and count(*) > 0, count(*)::text from public.portal_teacher_student_logins_v2(pg_temp.tok(5), 'ALL');
insert into t_r select 'logins (old): T5 only own classes',
  bool_and(pg_temp.mine(5, class_name)) and count(*) > 0, count(*)::text from public.portal_teacher_student_logins(pg_temp.tok(5)::text, 'ALL');
insert into t_r select 'points (old): T7 only own classes',
  bool_and(pg_temp.mine(7, class_name)) and count(*) > 0, count(*)::text from public.portal_teacher_points_overview(pg_temp.tok(7), 'ALL');

-- 7) grants & helpers
insert into t_r select 'grants unchanged on the 12 functions',
  not exists (select 1 from t_def_before b where b.anon_x <> has_function_privilege('anon', b.fn::regprocedure, 'execute'));
insert into t_r select 'helpers not callable by anon/authenticated',
  not has_function_privilege('anon', 'public._portal_teacher_has_class(bigint,text)', 'execute')
  and not has_function_privilege('authenticated', 'public._portal_teacher_has_student(bigint,bigint)', 'execute');

-- 8) rollback restores every definition byte for byte
\i :rollback
insert into t_r select 'rollback restores all 12 definitions',
  not exists (select 1 from t_def_before b where md5(pg_get_functiondef(b.fn::regprocedure)) <> b.h), '';
insert into t_r select 'rollback removes the helpers',
  to_regprocedure('public._portal_teacher_has_class(bigint,text)') is null
  and to_regprocedure('public._portal_teacher_has_student(bigint,bigint)') is null;
insert into t_r select 'after rollback the hole is back (proves the test is meaningful)',
  pg_temp.err(format('select * from public.portal_teacher_reset_student_password(%L,%s,%L)', pg_temp.tok(5), pg_temp.stu('9/7'), 'Test123456')) = '';

select case when ok is true then 'PASS' else 'FAIL' end as result, check_name, detail from t_r;
select case when bool_and(coalesce(ok, false)) then 'ALL PASSED' else 'FAILURES' end as summary, count(*) as checks from t_r;
