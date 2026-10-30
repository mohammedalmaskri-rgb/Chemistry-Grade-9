-- اختبار 20261030_01_hide_bank_solutions — يُشغَّل على نسخة محلية فقط، لا على القاعدة الفعلية.
-- Run ONLY against a local copy restored from backup. Never against production.
-- usage: psql -v ON_ERROR_STOP=1 -v migration=... -v rollback=... -f this_file
\set QUIET on
\pset tuples_only on
set client_min_messages = warning;

-- helper: decode the __QBn__<base64>__<text> format
create or replace function pg_temp.qb_meta(p text) returns jsonb language sql immutable as $$
  select case when p ~ '^__QB[234]__[A-Za-z0-9+/=]+__'
              then convert_from(decode((regexp_match(p, '^__QB[234]__([A-Za-z0-9+/=]+)__'))[1], 'base64'), 'UTF8')::jsonb end
$$;
create or replace function pg_temp.qb_tail(p text) returns text language sql immutable as $$
  select substr(p, length((regexp_match(p, '^(__QB[234]__[A-Za-z0-9+/=]+__)'))[1]) + 1)
$$;

-- a test session for one active chemistry student of 9/1 (local copy only)
create temp table t_ctx as
select gen_random_uuid() as token,
       (select st.id from public.students st where st.class_name = '9/1' and st.is_active order by st.id limit 1) as student_id;
insert into public.student_sessions(token, student_id, expires_at)
select token, student_id, now() + interval '1 hour' from t_ctx;

-- BEFORE
create temp table t_before as
select * from public.portal_student_mt_question_bank((select token from t_ctx), 'chemistry');

\i :migration

-- AFTER
create temp table t_after as
select * from public.portal_student_mt_question_bank((select token from t_ctx), 'chemistry');

create temp table t_results(check_name text, ok boolean, detail text);

insert into t_results
select 'same rows returned', (select count(*) from t_before) = (select count(*) from t_after)
       and not exists (select id from t_before except select id from t_after),
       (select count(*) from t_after)::text || ' rows';

insert into t_results
select 'revealed questions unchanged', not exists (
         select 1 from t_before b join t_after a using (id)
         where b.show_solution and (a.solution_text is distinct from b.solution_text
                                    or a.solution_image is distinct from b.solution_image)),
       (select count(*) from t_after where show_solution)::text || ' revealed';

insert into t_results
select 'hidden: no correct answer for mcq/tf', not exists (
         select 1 from t_after a where not a.show_solution
           and pg_temp.qb_meta(a.solution_text)->>'type' in ('mcq','tf')
           and pg_temp.qb_meta(a.solution_text) #> '{answer,correct}' is not null),
       (select count(*) from t_after where not show_solution)::text || ' hidden';

insert into t_results
select 'hidden: no solution text or image', not exists (
         select 1 from t_after a where not a.show_solution
           and (coalesce(pg_temp.qb_tail(a.solution_text), '') <> '' or a.solution_image is not null)), '';

insert into t_results
select 'hidden: matching pairs not the real ones', not exists (
         select 1 from t_after a join public.portal_mt_question_bank q using (id)
         where not a.show_solution and pg_temp.qb_meta(a.solution_text)->>'type' = 'matching'
           and pg_temp.qb_meta(a.solution_text) #> '{answer,pairs}' = pg_temp.qb_meta(q.solution_text) #> '{answer,pairs}'), '';

insert into t_results
select 'hidden: type/options/points/lesson kept', not exists (
         select 1 from t_after a join public.portal_mt_question_bank q using (id)
         where not a.show_solution and (
              pg_temp.qb_meta(a.solution_text)->>'type'       is distinct from pg_temp.qb_meta(q.solution_text)->>'type'
           or pg_temp.qb_meta(a.solution_text)->>'points'     is distinct from pg_temp.qb_meta(q.solution_text)->>'points'
           or pg_temp.qb_meta(a.solution_text)->>'lessonName' is distinct from pg_temp.qb_meta(q.solution_text)->>'lessonName'
           or pg_temp.qb_meta(a.solution_text) #> '{answer,options}' is distinct from pg_temp.qb_meta(q.solution_text) #> '{answer,options}')), '';

-- grading still works from the real answer stored in the table
create temp table t_grade as
select q.id, pg_temp.qb_meta(q.solution_text)->>'type' as typ,
       case pg_temp.qb_meta(q.solution_text)->>'type'
         when 'mcq' then to_jsonb((pg_temp.qb_meta(q.solution_text) #>> '{answer,correct}')::int)
         when 'tf'  then to_jsonb((pg_temp.qb_meta(q.solution_text) #>> '{answer,correct}')::boolean)
         when 'matching' then (select jsonb_agg(e.value->1 order by e.ord)
                               from jsonb_array_elements(pg_temp.qb_meta(q.solution_text) #> '{answer,pairs}') with ordinality e(value, ord))
       end as right_answer
from t_after a join public.portal_mt_question_bank q using (id)
where not a.show_solution and pg_temp.qb_meta(q.solution_text)->>'type' in ('mcq','tf','matching');

insert into t_results
select 'grading: correct answers accepted', bool_and(r.is_correct), count(*)::text || ' graded'
from t_grade g cross join lateral public.portal_student_mt_answer_bank((select token from t_ctx), 'chemistry', g.id, g.right_answer) r;

insert into t_results
select 'grading: wrong answer rejected', not bool_or(r.is_correct), ''
from t_grade g cross join lateral public.portal_student_mt_answer_bank((select token from t_ctx), 'chemistry', g.id,
       case g.typ when 'mcq' then to_jsonb(99) when 'tf' then to_jsonb(not (g.right_answer)::text::boolean) else '["x"]'::jsonb end) r;

insert into t_results
select 'grants unchanged', has_function_privilege('anon', 'public.portal_student_mt_question_bank(uuid,text)', 'execute')
       and has_function_privilege('authenticated', 'public.portal_student_mt_question_bank(uuid,text)', 'execute')
       and not has_function_privilege('public', 'public.portal_student_mt_question_bank(uuid,text)', 'execute'), '';

-- ROLLBACK restores the exact previous output
\i :rollback
insert into t_results
select 'rollback restores old output', not exists (
         (select * from t_before except select * from public.portal_student_mt_question_bank((select token from t_ctx), 'chemistry'))
         union all
         (select * from public.portal_student_mt_question_bank((select token from t_ctx), 'chemistry') except select * from t_before)), '';

\pset tuples_only off
select case when ok is true then 'PASS' else 'FAIL' end as result, check_name, detail from t_results;
select case when bool_and(coalesce(ok, false)) then 'ALL PASSED' else 'FAILURES' end as summary from t_results;
