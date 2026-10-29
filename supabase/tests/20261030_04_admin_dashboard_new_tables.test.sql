-- اختبار 20261030_04_admin_dashboard_new_tables — على نسخة محلية فقط.
\set QUIET on
set client_min_messages = warning;

create temp table t_fns as select p.oid::regprocedure fn, md5(pg_get_functiondef(p.oid)) h, has_function_privilege('anon', p.oid, 'execute') anon_x
from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in
 ('portal_admin_grades_filtered','portal_admin_behavior_records','portal_admin_overview','portal_admin_students_filtered');
create temp table t_tok as select gen_random_uuid() tok;
insert into public.portal_admin_sessions(token, admin_id, expires_at) select tok, 1, now() + interval '1 hour' from t_tok;
create or replace function pg_temp.tok() returns uuid language sql as $$ select tok from t_tok $$;

create temp table g0 as select * from public.portal_admin_grades_filtered(pg_temp.tok(), '', 'ALL');
create temp table b0 as select * from public.portal_admin_behavior_records(pg_temp.tok(), '');
create temp table o0 as select public.portal_admin_overview(pg_temp.tok()) o;
create temp table s0 as select * from public.portal_admin_students_filtered(pg_temp.tok(), '', 'ALL');

\i :migration

create temp table g1 as select * from public.portal_admin_grades_filtered(pg_temp.tok(), '', 'ALL');
create temp table b1 as select * from public.portal_admin_behavior_records(pg_temp.tok(), '');
create temp table o1 as select public.portal_admin_overview(pg_temp.tok()) o;
create temp table s1 as select * from public.portal_admin_students_filtered(pg_temp.tok(), '', 'ALL');
create temp table t_r(check_name text, ok boolean, detail text default '');

insert into t_r select 'grades: before, old copies were shown too',
  (select count(*) from g0 where source = 'general') > 0, (select count(*) from g0 where source = 'general')::text || ' old rows';
insert into t_r select 'grades: no old copies after',
  (select count(*) from g1 where source = 'general') = 0;
insert into t_r select 'grades: every grade in the new table still shown',
  (select count(*) from g1 where assessment_title is not null) = (select count(*) from public.portal_mt_grades g join public.students s on s.id = g.student_id),
  (select count(*) from g1 where assessment_title is not null)::text;
insert into t_r select 'grades: no student has the same assessment twice per subject',
  not exists (select 1 from g1 where assessment_title is not null group by student_id, subject_id, assessment_title having count(*) > 1);
insert into t_r select 'grades: subject names instead of «مادة #»',
  not exists (select 1 from g1 where subject_label like 'مادة #%')
  and exists (select 1 from g1 where subject_id = 2 and subject_label = (select name_ar from public.subjects where id = 2)),
  (select string_agg(distinct subject_label, '، ') from g1 where subject_label is not null);
insert into t_r select 'grades: students without grades still listed',
  (select count(*) from g1 where assessment_title is null) >= (select count(*) from public.students s where not exists (select 1 from public.portal_mt_grades g where g.student_id = s.id));
insert into t_r select 'grades: class filter still works',
  (select count(distinct class_name) from public.portal_admin_grades_filtered(pg_temp.tok(), '', 'CLASS:9/1')) = 1;

insert into t_r select 'behavior: before, records were doubled',
  (select count(*) from b0) = (select count(*) from public.portal_behavior_records) + (select count(*) from public.portal_mt_behavior),
  (select count(*) from b0)::text || ' rows';
insert into t_r select 'behavior: after = new table exactly',
  (select count(*) from b1) = (select count(*) from public.portal_mt_behavior) and not exists (select 1 from b1 where source = 'legacy'),
  (select count(*) from b1)::text || ' rows';
insert into t_r select 'behavior: no contradictory duplicates (same student+time twice)',
  not exists (select 1 from b1 group by student_id, created_at having count(*) > 1);
insert into t_r select 'behavior: repeat counts match the new table',
  not exists (select 1 from b1 where repeat_count <> (select count(*) from public.portal_mt_behavior m where m.student_id = b1.student_id));

insert into t_r select 'overview: behavior counters from the new table',
  ((select o from o1)->>'behavior_total')::int = (select count(*) from public.portal_mt_behavior)
  and ((select o from o1)->>'behavior_open')::int = (select count(*) from public.portal_mt_behavior where not is_resolved),
  ((select o from o0)->>'behavior_total') || ' → ' || ((select o from o1)->>'behavior_total');
insert into t_r select 'overview: other counters unchanged',
  ((select o from o0) - 'behavior_total' - 'behavior_open' - 'students_with_repeated_behavior') = ((select o from o1) - 'behavior_total' - 'behavior_open' - 'students_with_repeated_behavior');
insert into t_r select 'students: same rows, behavior counts from the new table',
  (select count(*) from s1) = (select count(*) from s0)
  and not exists (select 1 from s1 where behavior_count <> (select count(*) from public.portal_mt_behavior m where m.student_id = s1.student_id));
insert into t_r select 'expired/invalid admin token gets nothing',
  (select count(*) from public.portal_admin_grades_filtered(gen_random_uuid(), '', 'ALL')) = 0
  and (select count(*) from public.portal_admin_behavior_records(gen_random_uuid(), '')) = 0;
insert into t_r select 'grants unchanged', not exists (select 1 from t_fns where anon_x <> has_function_privilege('anon', fn, 'execute'));

\i :rollback
insert into t_r select 'rollback restores the 4 definitions', not exists (select 1 from t_fns where md5(pg_get_functiondef(fn)) <> h);
insert into t_r select 'rollback restores old output', (select count(*) from public.portal_admin_behavior_records(pg_temp.tok(), '')) = (select count(*) from b0);

select case when ok then 'PASS' else 'FAIL' end as result, check_name, detail from t_r;
select case when bool_and(ok) then 'ALL PASSED' else 'FAILURES' end as summary, count(*) as checks from t_r;
