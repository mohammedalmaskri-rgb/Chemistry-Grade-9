-- اختبار 20261030_12_soft_delete_student — على نسخة محلية أو قاعدة اختبار فقط. لا يُشغَّل على الإنتاج.
-- Run ONLY against a local copy / isolated test DB, AFTER applying migrations/20261030_12_soft_delete_student.sql.
-- Self-contained: creates its own fake subjects/teachers/admin/students (classes ZZ/*) and rolls everything back.
\set QUIET on
\set ON_ERROR_STOP on
set client_min_messages = warning;
begin;
create or replace function pg_temp.err(q text) returns text language plpgsql as
 $$ begin execute q; return ''; exception when others then return sqlerrm; end $$;

-- ---------- fixtures ----------
create temp table f_sub as
  with i as (insert into public.subjects(code, name, is_active) values ('zz_c1a', 'C1 مادة أ', true), ('zz_c1b', 'C1 مادة ب', true) returning id, code)
  select * from i;
create temp table f_t as
  with i as (insert into public.teacher_users(username, full_name, password_hash, is_active)
             values ('zz_c1_t1', 'معلم أ', extensions.crypt('x', extensions.gen_salt('bf')), true),
                    ('zz_c1_t2', 'معلم ب', extensions.crypt('x', extensions.gen_salt('bf')), true) returning id, username)
  select * from i;
create or replace function pg_temp.t(u text) returns bigint language sql as $$ select id from f_t where username = 'zz_c1_' || u $$;
create or replace function pg_temp.sub(c text) returns bigint language sql as $$ select id from f_sub where code = c $$;
-- t1 teaches subject a in ZZ/1 and ZZ/2; t2 teaches subject b in ZZ/1 only
insert into public.teacher_class_subjects(teacher_id, subject_id, class_name, is_active) values
  (pg_temp.t('t1'), pg_temp.sub('zz_c1a'), 'ZZ/1', true), (pg_temp.t('t1'), pg_temp.sub('zz_c1a'), 'ZZ/2', true),
  (pg_temp.t('t2'), pg_temp.sub('zz_c1b'), 'ZZ/1', true);
create temp table f_tok(k text, tok uuid);
insert into f_tok values ('t1', gen_random_uuid()), ('t2', gen_random_uuid()), ('adm', gen_random_uuid());
insert into public.teacher_sessions(token, teacher_id, expires_at)
  select tok, pg_temp.t(k), now() + interval '1 hour' from f_tok where k in ('t1', 't2');
create temp table f_a as
  with i as (insert into public.portal_admin_users(username, full_name, password_hash, is_active)
             values ('zz_c1_adm', 'مشرف', extensions.crypt('x', extensions.gen_salt('bf')), true) returning id)
  select * from i;
insert into public.portal_admin_sessions(token, admin_id, expires_at)
  select (select tok from f_tok where k = 'adm'), id, now() + interval '1 hour' from f_a;
create or replace function pg_temp.tok(k text) returns uuid language sql as $$ select tok from f_tok where k = $1 $$;
-- students: A active ZZ/1, B active ZZ/1 (teacher will deactivate), C already inactive ZZ/1, D active ZZ/2, E active ZZ/3 (nobody's)
create temp table f_s as
  with i as (insert into public.students(full_name, class_name, username, password_hash, is_active)
             values ('ZZ طالب أ', 'ZZ/1', 'zz_c1_a', 'x', true), ('ZZ طالب ب', 'ZZ/1', 'zz_c1_b', 'x', true),
                    ('ZZ طالب ج', 'ZZ/1', 'zz_c1_c', 'x', false), ('ZZ طالب د', 'ZZ/2', 'zz_c1_d', 'x', true),
                    ('ZZ طالب هـ', 'ZZ/3', 'zz_c1_e', 'x', true) returning id, username)
  select * from i;
create or replace function pg_temp.s(u text) returns bigint language sql as $$ select id from f_s where username = 'zz_c1_' || u $$;
-- linked data for A, B, C in BOTH subjects
insert into public.portal_mt_grades(teacher_id, subject_id, student_id, assessment_title, score, max_score)
  select t, sb, s, 'اختبار', 15, 20 from (values (pg_temp.t('t1'), pg_temp.sub('zz_c1a')), (pg_temp.t('t2'), pg_temp.sub('zz_c1b'))) v(t, sb),
    (select id s from f_s where username in ('zz_c1_a', 'zz_c1_b', 'zz_c1_c')) x;
insert into public.portal_mt_points(teacher_id, subject_id, student_id, points, quiz_points)
  select t, sb, s, 5, 1 from (values (pg_temp.t('t1'), pg_temp.sub('zz_c1a')), (pg_temp.t('t2'), pg_temp.sub('zz_c1b'))) v(t, sb),
    (select id s from f_s where username in ('zz_c1_a', 'zz_c1_b', 'zz_c1_c')) x;
insert into public.portal_mt_questions(teacher_id, subject_id, student_id, question_text, status)
  select t, sb, s, 'سؤال', 'new' from (values (pg_temp.t('t1'), pg_temp.sub('zz_c1a')), (pg_temp.t('t2'), pg_temp.sub('zz_c1b'))) v(t, sb),
    (select id s from f_s where username in ('zz_c1_a', 'zz_c1_b', 'zz_c1_c')) x;
insert into public.student_sessions(token, student_id, expires_at) select gen_random_uuid(), id, now() + interval '1 hour' from f_s;
create or replace function pg_temp.data(sid bigint) returns text language sql as $$
  select concat_ws('/', (select count(*) from public.portal_mt_grades where student_id = sid),
    (select count(*) from public.portal_mt_points where student_id = sid), (select count(*) from public.portal_mt_questions where student_id = sid)) $$;
create or replace function pg_temp.in_list(k text, sub text, sid bigint) returns boolean language sql as $$
  select exists (select 1 from public.portal_teacher_students_v2(pg_temp.tok(k), sub, 'ALL') x where x.id = sid) $$;
create or replace function pg_temp.in_report(k text, sub text, sid bigint) returns boolean language sql as $$
  select exists (select 1 from public.portal_teacher_mt_grade_report(pg_temp.tok(k), sub, 'ALL', 'ALL') x where x.student_id = sid) $$;
create or replace function pg_temp.total(k text, sub text) returns bigint language sql as $$
  select total_students from public.portal_teacher_mt_overview(pg_temp.tok(k), sub) $$;
create or replace function pg_temp.in_points(k text, sub text, sid bigint) returns boolean language sql as $$
  select exists (select 1 from public.portal_teacher_mt_points_overview(pg_temp.tok(k), sub, 'ALL') x where x.student_id = sid) $$;
create or replace function pg_temp.in_admin(sid bigint) returns boolean language sql as $$
  select exists (select 1 from public.portal_admin_students_filtered(pg_temp.tok('adm'), '', 'ALL') x where x.student_id = sid and x.is_active = false) $$;

create temp table t_r(n serial, check_name text, ok boolean);
-- ---------- read paths: an already-inactive student (C) ----------
insert into t_r(check_name, ok) select 'list (students_v2) shows active A, hides inactive C',
  pg_temp.in_list('t1', 'zz_c1a', pg_temp.s('a')) and not pg_temp.in_list('t1', 'zz_c1a', pg_temp.s('c'));
insert into t_r(check_name, ok) select 'grade report shows A, hides C (C''s grades still stored)',
  pg_temp.in_report('t1', 'zz_c1a', pg_temp.s('a')) and not pg_temp.in_report('t1', 'zz_c1a', pg_temp.s('c')) and pg_temp.data(pg_temp.s('c')) = '2/2/2';
insert into t_r(check_name, ok) select 'overview counts active students only (t1: A,B,D = 3)', pg_temp.total('t1', 'zz_c1a') = 3;
insert into t_r(check_name, ok) select 'points overview hides C', not pg_temp.in_points('t1', 'zz_c1a', pg_temp.s('c'));
insert into t_r(check_name, ok) select 'admin list still shows inactive C', pg_temp.in_admin(pg_temp.s('c'));

-- ---------- teacher "delete" = deactivate (B) ----------
create temp table t_before as select pg_temp.data(pg_temp.s('b')) d, (select count(*) from public.students) n;
create temp table t_call as select public.portal_teacher_delete_student(pg_temp.tok('t1'), pg_temp.s('b')) r;
insert into t_r(check_name, ok) select 'teacher delete returns true', (select r from t_call);
insert into t_r(check_name, ok) select 'B row kept and inactive; no row removed',
  exists (select 1 from public.students where id = pg_temp.s('b') and not is_active) and (select count(*) from public.students) = (select n from t_before);
insert into t_r(check_name, ok) select 'B grades/points/questions kept in BOTH subjects', pg_temp.data(pg_temp.s('b')) = (select d from t_before) and pg_temp.data(pg_temp.s('b')) = '2/2/2';
insert into t_r(check_name, ok) select 'B sessions ended, A sessions untouched',
  not exists (select 1 from public.student_sessions where student_id = pg_temp.s('b')) and exists (select 1 from public.student_sessions where student_id = pg_temp.s('a'));
insert into t_r(check_name, ok) select 'B hidden for BOTH teachers (list, report, points), overview t1 = 2',
  not pg_temp.in_list('t1', 'zz_c1a', pg_temp.s('b')) and not pg_temp.in_list('t2', 'zz_c1b', pg_temp.s('b'))
  and not pg_temp.in_report('t2', 'zz_c1b', pg_temp.s('b')) and not pg_temp.in_points('t2', 'zz_c1b', pg_temp.s('b')) and pg_temp.total('t1', 'zz_c1a') = 2;
insert into t_r(check_name, ok) select 'teacher cannot deactivate a student outside his classes (E)',
  pg_temp.err(format('select public.portal_teacher_delete_student(%L, %s)', pg_temp.tok('t2'), pg_temp.s('e'))) like '%ليس ضمن%'
  and (select is_active from public.students where id = pg_temp.s('e'));

-- ---------- admin: sees, reactivates, moves ----------
insert into t_r(check_name, ok) select 'admin list shows B as inactive', pg_temp.in_admin(pg_temp.s('b'));
create temp table t_call2 as select public.portal_admin_set_student_active(pg_temp.tok('adm'), pg_temp.s('b'), true) r;
insert into t_r(check_name, ok) select 'admin reactivates B -> back in lists and reports with all data',
  (select r from t_call2) and pg_temp.in_list('t1', 'zz_c1a', pg_temp.s('b')) and pg_temp.in_report('t2', 'zz_c1b', pg_temp.s('b')) and pg_temp.data(pg_temp.s('b')) = '2/2/2';
create temp table t_call3 as select public.portal_admin_move_student(pg_temp.tok('adm'), pg_temp.s('d'), 'ZZ/1') r;
insert into t_r(check_name, ok) select 'admin moves D ZZ/2 -> ZZ/1; now visible to t2',
  (select r from t_call3) and (select class_name from public.students where id = pg_temp.s('d')) = 'ZZ/1' and pg_temp.in_list('t2', 'zz_c1b', pg_temp.s('d'));
insert into t_r(check_name, ok) select 'admin move to unknown class rejected',
  pg_temp.err(format('select public.portal_admin_move_student(%L, %s, %L)', pg_temp.tok('adm'), pg_temp.s('d'), 'ZZ/404')) like '%غير موجودة%';
insert into t_r(check_name, ok) select 'teacher token cannot use admin functions',
  not public.portal_admin_set_student_active(pg_temp.tok('t1'), pg_temp.s('a'), false)
  and not public.portal_admin_move_student(pg_temp.tok('t1'), pg_temp.s('a'), 'ZZ/2');
insert into t_r(check_name, ok) select 'A untouched by the above', (select is_active and class_name = 'ZZ/1' from public.students where id = pg_temp.s('a'));

-- ---------- privileges / RLS ----------
insert into t_r(check_name, ok) select 'EXECUTE granted to anon on the 6 functions, not to PUBLIC', bool_and(
    has_function_privilege('anon', f, 'execute') and not exists (select 1 from aclexplode((select proacl from pg_proc where oid = f)) a where a.grantee = 0))
  from unnest(array['public.portal_teacher_delete_student(uuid,bigint)'::regprocedure, 'public.portal_admin_set_student_active(uuid,bigint,boolean)',
    'public.portal_admin_move_student(uuid,bigint,text)', 'public.portal_teacher_students_v2(uuid,text,text)',
    'public.portal_teacher_mt_grade_report(uuid,text,text,text)', 'public.portal_teacher_mt_overview(uuid,text)']) f;
insert into t_r(check_name, ok) select 'RLS enabled and anon has no direct SELECT on students / grades',
  (select bool_and(relrowsecurity) from pg_class where oid in ('public.students'::regclass, 'public.portal_mt_grades'::regclass))
  and not has_table_privilege('anon', 'public.students', 'select') and not has_table_privilege('anon', 'public.portal_mt_grades', 'select');
select pg_temp.tok('t1') as t1tok \gset
create temp table t_anon(e text, n bigint);
grant insert on t_anon to anon;
set local role anon;
insert into t_anon select pg_temp.err('select count(*) from public.students'),
  (select count(*) from public.portal_teacher_students_v2(:'t1tok', 'zz_c1a', 'ALL'));
reset role;
insert into t_r(check_name, ok) select 'as anon: direct table read denied, RPC works (returns A,B,D)',
  (select e like '%permission denied%' from t_anon) and (select n from t_anon) = 3;

select case when ok is true then 'PASS' else 'FAIL' end as result, check_name from t_r order by n;
select case when bool_and(coalesce(ok, false)) then 'ALL PASSED' else 'FAILURES' end as summary, count(*) as checks from t_r;
rollback;
