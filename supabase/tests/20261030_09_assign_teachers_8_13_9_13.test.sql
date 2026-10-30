-- اختبار 20261030_09 — على نسخة محلية فقط. Run ONLY against a local copy.
\set QUIET on
set client_min_messages = warning;
create temp table t_before as select id, teacher_id, subject_id, class_name, is_active from public.teacher_class_subjects;
create temp table t_tok as select tid, gen_random_uuid() tok from (values (4),(7),(14),(1)) v(tid);
insert into public.teacher_sessions(token, teacher_id, expires_at) select tok, tid, now() + interval '1 hour' from t_tok;
create or replace function pg_temp.tok(t int) returns uuid language sql as $$ select tok from t_tok where tid = t $$;
create or replace function pg_temp.sees(t int, subj text, cls text) returns bigint language plpgsql as
 $$ declare n bigint; begin select count(*) into n from public.portal_teacher_students_v2(pg_temp.tok(t), subj, cls) x where x.class_name = cls; return n;
    exception when others then return -1; end $$;
create temp table t_r(check_name text, ok boolean, detail text default '');
insert into t_r select 'before: teacher 14 sees no 8/13 students', pg_temp.sees(14, 'science', '8/13') <= 0, pg_temp.sees(14, 'science', '8/13')::text;

\i :migration

insert into t_r select 'exactly 4 new assignments', (select count(*) from public.teacher_class_subjects) = (select count(*) from t_before) + 4;
insert into t_r select 'existing assignments untouched', not exists (select * from t_before except select id, teacher_id, subject_id, class_name, is_active from public.teacher_class_subjects);
insert into t_r select '8/13 science -> teacher 14', exists (select 1 from public.teacher_class_subjects where class_name='8/13' and subject_id=1 and teacher_id=14 and is_active);
insert into t_r select '9/13 chem->4, phys->14, bio->7', (select count(*) from public.teacher_class_subjects where class_name='9/13' and is_active
   and (subject_id, teacher_id) in ((2,4),(3,14),(4,7))) = 3;
insert into t_r select 'teacher 14 now sees 8/13 (science)', pg_temp.sees(14, 'science', '8/13') = (select count(*) from public.students where class_name='8/13' and is_active), pg_temp.sees(14, 'science', '8/13')::text;
insert into t_r select 'teacher 4 sees 9/13 (chemistry)', pg_temp.sees(4, 'chemistry', '9/13') = (select count(*) from public.students where class_name='9/13' and is_active), pg_temp.sees(4, 'chemistry', '9/13')::text;
insert into t_r select 'teacher 7 sees 9/13 (biology)', pg_temp.sees(7, 'biology', '9/13') = (select count(*) from public.students where class_name='9/13' and is_active);
insert into t_r select 'teacher 1 still does NOT see 9/13', pg_temp.sees(1, 'chemistry', '9/13') <= 0;
insert into t_r select 'second run refuses', (select count(*) from public.teacher_class_subjects where class_name in ('8/13','9/13')) = 4;

\i :rollback
insert into t_r select 'rollback restores exactly', not exists (
  (select * from t_before except select id, teacher_id, subject_id, class_name, is_active from public.teacher_class_subjects)
  union all (select id, teacher_id, subject_id, class_name, is_active from public.teacher_class_subjects except select * from t_before));

select case when ok is true then 'PASS' else 'FAIL' end as result, check_name, detail from t_r;
select case when bool_and(coalesce(ok,false)) then 'ALL PASSED' else 'FAILURES' end as summary, count(*) checks from t_r;
