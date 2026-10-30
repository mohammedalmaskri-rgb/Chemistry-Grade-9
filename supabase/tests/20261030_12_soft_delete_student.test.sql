-- اختبار 20261030_12_soft_delete_student — على نسخة محلية فقط.
-- Run ONLY against a local copy restored from backup. Never against production.
-- Usage: psql -f migrations/20261030_12_soft_delete_student.sql, then this file.
\set QUIET on
set client_min_messages = warning;
begin;
create or replace function pg_temp.err(q text) returns text language plpgsql as
 $$ begin execute q; return ''; exception when others then return sqlerrm; end $$;

-- one active teacher with an assigned class, one student of that class, one student of another class
create temp table t_t as
  select tcs.teacher_id tid, tcs.class_name cls from public.teacher_class_subjects tcs
  join public.teacher_users u on u.id = tcs.teacher_id and u.is_active
  where tcs.is_active order by tcs.teacher_id limit 1;
create temp table t_tok as select gen_random_uuid() tok;
insert into public.teacher_sessions(token, teacher_id, expires_at) select tok, tid, now() + interval '1 hour' from t_tok, t_t;
create temp table t_s as
  select id sid from public.students where is_active and class_name = (select cls from t_t) order by id limit 1;
create temp table t_other as
  select id sid from public.students where is_active
   and not public._portal_teacher_has_class((select tid from t_t), class_name) order by id limit 1;
insert into public.student_sessions(token, student_id, expires_at) select gen_random_uuid(), sid, now() + interval '1 hour' from t_s;

create temp table t_before as
  select (select count(*) from public.portal_mt_grades where student_id = (select sid from t_s)) g,
         (select count(*) from public.portal_mt_points where student_id = (select sid from t_s)) p,
         (select count(*) from public.portal_mt_questions where student_id = (select sid from t_s)) q,
         (select count(*) from public.students) n_students;

create temp table t_r(check_name text, ok boolean, detail text default '');
insert into t_r select 'teacher cannot touch a student outside his classes',
  pg_temp.err(format('select public.portal_teacher_delete_student(%L,%s)', (select tok from t_tok), (select sid from t_other))) like '%ليس ضمن%'
  and (select is_active from public.students where id = (select sid from t_other));
insert into t_r select 'delete returns true',
  public.portal_teacher_delete_student((select tok from t_tok), (select sid from t_s));
insert into t_r select 'student row still exists but inactive',
  exists (select 1 from public.students where id = (select sid from t_s) and not is_active);
insert into t_r select 'no student row was removed', (select count(*) from public.students) = (select n_students from t_before);
insert into t_r select 'grades, points, questions are intact',
  (select count(*) from public.portal_mt_grades where student_id = (select sid from t_s)) = (select g from t_before)
  and (select count(*) from public.portal_mt_points where student_id = (select sid from t_s)) = (select p from t_before)
  and (select count(*) from public.portal_mt_questions where student_id = (select sid from t_s)) = (select q from t_before);
insert into t_r select 'student sessions ended',
  not exists (select 1 from public.student_sessions where student_id = (select sid from t_s));
insert into t_r select 'student no longer in teacher list',
  not exists (select 1 from public.portal_teacher_students_v2((select tok from t_tok), null, 'ALL') x where x.id = (select sid from t_s));

select case when ok is true then 'PASS' else 'FAIL' end as result, check_name, detail from t_r;
select case when bool_and(coalesce(ok, false)) then 'ALL PASSED' else 'FAILURES' end as summary, count(*) as checks from t_r;
rollback;
