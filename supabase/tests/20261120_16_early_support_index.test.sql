-- اختبار 20261120_16_early_support_index — على نسخة محلية أو قاعدة اختبار فقط. لا يُشغَّل على الإنتاج.
-- Self-contained: creates fake teachers/students (prefix zz_si_) and rolls everything back.
\set QUIET on
\set ON_ERROR_STOP on
set client_min_messages = warning;
begin;
create temp table t_r(n serial, check_name text, ok boolean);
create or replace function pg_temp.chk(name text, ok boolean) returns void language sql as $$ insert into t_r(check_name, ok) values (name, coalesce(ok, false)) $$;

insert into public.teacher_users(username, full_name, password_hash, is_active, must_change_password)
  values ('zz_si_t1', 'معلم 1', 'x', true, false), ('zz_si_t2', 'معلم 2', 'x', true, false);
insert into public.students(full_name, class_name, username, password_hash, is_active, must_change_password, points)
  select 'zz_si_' || n, case when n = 7 then '9/2' else '9/1' end, 'zz_si_s' || n, 'x', n <> 6, false, 0 from generate_series(1, 7) n;

create temp table ids as select
  (select id from public.teacher_users where username = 'zz_si_t1') t1,
  (select id from public.teacher_users where username = 'zz_si_t2') t2,
  (select id from public.subjects where code = 'chemistry') chem,
  gen_random_uuid() u_t1, gen_random_uuid() u_t2, gen_random_uuid() u_t1_old, gen_random_uuid() u_st;
create temp table s as select n, (select id from public.students where username = 'zz_si_s' || n) id from generate_series(1, 7) n;
insert into public.teacher_sessions(token, teacher_id, expires_at) select u_t1, t1, now() + interval '1 hour' from ids;
insert into public.teacher_sessions(token, teacher_id, expires_at) select u_t2, t2, now() + interval '1 hour' from ids;
insert into public.teacher_sessions(token, teacher_id, created_at, expires_at) select u_t1_old, t1, now() - interval '2 hours', now() - interval '1 hour' from ids;
insert into public.student_sessions(token, student_id, expires_at) select u_st, (select id from s where n = 1), now() + interval '1 hour' from ids;
insert into public.teacher_class_subjects(teacher_id, subject_id, class_name, is_active) select t1, chem, '9/1', true from ids;
insert into public.teacher_class_subjects(teacher_id, subject_id, class_name, is_active) select t2, chem, '9/2', true from ids;

-- helpers
create or replace function pg_temp.g(sn int, title text, sc numeric, mx numeric, days_ago int) returns void language sql as $$
  insert into public.portal_mt_grades(teacher_id, subject_id, student_id, assessment_title, score, max_score, created_at)
  select t1, chem, (select id from s where n = sn), title, sc, mx, now() - make_interval(days => days_ago) from ids $$;
create or replace function pg_temp.lg(sn int, days_ago int) returns void language sql as $$
  insert into public.portal_student_login_events(student_id, logged_in_at) select id, now() - make_interval(days => days_ago) from s where n = sn $$;

-- S1: strong and active  -> stable, score 0
select pg_temp.g(1, 'الاختبار الأول', 18, 20, 40); select pg_temp.g(1, 'واجب 1', 19, 20, 10); select pg_temp.lg(1, 1);
-- S2: low average, active -> 'watch' (low 40 + tiny drop 6 = 46)
select pg_temp.g(2, 'الإختبار الأول', 9, 20, 40); select pg_temp.g(2, 'واجب 1', 8, 20, 10); select pg_temp.lg(2, 2);
-- S3: declining + away 20 days + open repeated behaviour -> high
select pg_temp.g(3, 'الاختبار الأول', 17, 20, 40); select pg_temp.g(3, 'واجب 1', 18, 20, 20); select pg_temp.g(3, 'اختبار قصير 1', 11, 20, 3); select pg_temp.lg(3, 20);
insert into public.portal_mt_behavior(teacher_id, subject_id, student_id, behavior_type, level, is_resolved)
  select t1, chem, (select id from s where n = 3), 'x', 'repeated', false from ids;
-- S4: no grades at all
select pg_temp.lg(4, 1);
-- S5: oral grade only (full marks), never logged in
select pg_temp.g(5, 'حوار شفوي 1', 10, 10, 5);
-- S6: inactive student with poor grades -> must not appear
select pg_temp.g(6, 'واجب 1', 1, 20, 5);
-- S7: class 9/2 (teacher 2's class) with a grade given by teacher 1 on a bad max_score row + a resolved behaviour
select pg_temp.g(7, 'واجب 1', 5, 0, 5);
insert into public.portal_mt_behavior(teacher_id, subject_id, student_id, behavior_type, level, is_resolved, resolved_at)
  select t1, chem, (select id from s where n = 7), 'x', 'repeated', true, now() from ids;

create temp table r as select x.* from ids, lateral public.portal_teacher_mt_support_index(u_t1, 'chemistry', 'ALL') x where x.full_name like 'zz_si_%';
create temp table r2 as select x.* from ids, lateral public.portal_teacher_mt_support_index(u_t2, 'chemistry', 'ALL') x where x.full_name like 'zz_si_%';

select pg_temp.chk('S1 strong+active => stable, score 0, no reasons', (select level = 'stable' and risk_score = 0 and cardinality(reasons) = 0 from r where full_name = 'zz_si_1'));
select pg_temp.chk('S2 low average => watch (46), reason mentions the average', (select level = 'watch' and risk_score = 46 and reasons[1] like '%من 100%' from r where full_name = 'zz_si_2'));
select pg_temp.chk('S2 typo title "الإختبار الأول" counts as academic', (select academic_n = 2 from r where full_name = 'zz_si_2'));
select pg_temp.chk('S3 decline+away+repeated behaviour => high', (select level = 'high' and risk_score >= 50 from r where full_name = 'zz_si_3'));
select pg_temp.chk('S3 gives the three reasons in plain Arabic', (select cardinality(reasons) = 3 and reasons::text like '%تراجع%' and reasons::text like '%منذ 20 يومًا%' and reasons::text like '%سلوكية%' from r where full_name = 'zz_si_3'));
select pg_temp.chk('S3 drop computed vs previous average (87.5 vs 55.0 => 32.5)', (select drop_pts = 32.5 and last_pct = 55.0 from r where full_name = 'zz_si_3'));
select pg_temp.chk('S4 no grades => no_data, null score', (select level = 'no_data' and risk_score is null from r where full_name = 'zz_si_4'));
select pg_temp.chk('S5 oral-only: oral not counted as academic, never logged in => reason shown', (select academic_n = 0 and academic_pct is null and reasons = array['لم يدخل المنصة'] from r where full_name = 'zz_si_5'));
select pg_temp.chk('S6 inactive student is excluded', (select count(*) = 0 from r where full_name = 'zz_si_6'));
select pg_temp.chk('S7 (other class) is not in teacher 1 roster via class, grade with max 0 ignored', (select count(*) = 1 and (select level from r where full_name = 'zz_si_7') = 'no_data' from r where full_name = 'zz_si_7'));
select pg_temp.chk('resolved behaviour does not count', (select open_behavior = 0 from r where full_name = 'zz_si_7'));
select pg_temp.chk('ordering: high first, no_data last', (select (array_agg(level order by ord))[1] = 'high' and (array_agg(level order by ord))[array_length(array_agg(level), 1)] = 'no_data'
   from (select level, row_number() over () ord from public.portal_teacher_mt_support_index((select u_t1 from ids), 'chemistry', 'ALL') x where x.full_name like 'zz_si_%') o));

-- isolation between teachers
select pg_temp.chk('teacher 2 does not see teacher 1 grades (S7 has none of his own)', (select count(*) = 1 and bool_and(level = 'no_data') from r2));
select pg_temp.chk('teacher 2 does not get S1..S5 (class 9/1 not his)', (select count(*) = 0 from r2 where full_name in ('zz_si_1','zz_si_2','zz_si_3','zz_si_4','zz_si_5')));
select pg_temp.chk('class filter works', (select count(*) = 5 from ids, lateral public.portal_teacher_mt_support_index(u_t1, 'chemistry', '9/1') x where x.full_name like 'zz_si_%'));

-- authentication
select pg_temp.chk('unknown token => nothing', (select count(*) = 0 from public.portal_teacher_mt_support_index(gen_random_uuid(), 'chemistry', 'ALL')));
select pg_temp.chk('expired teacher token => nothing', (select count(*) = 0 from ids, lateral public.portal_teacher_mt_support_index(u_t1_old, 'chemistry', 'ALL')));
select pg_temp.chk('student token => nothing', (select count(*) = 0 from ids, lateral public.portal_teacher_mt_support_index(u_st, 'chemistry', 'ALL')));
select pg_temp.chk('null token => nothing', (select count(*) = 0 from public.portal_teacher_mt_support_index(null, 'chemistry', 'ALL')));
select pg_temp.chk('unknown subject => nothing', (select count(*) = 0 from ids, lateral public.portal_teacher_mt_support_index(u_t1, 'nope', 'ALL')));

-- time travel: as-of in the past ignores later data
select pg_temp.chk('as-of 30 days ago: S3 has only the first grade, not yet high', (select level <> 'high' and academic_n = 1
   from ids, lateral public.portal__support_index_core(t1, chem, 'ALL', now() - interval '30 days') c where c.full_name = 'zz_si_3'));
select pg_temp.chk('as-of before any grade: everyone no_data', (select bool_and(level = 'no_data') from ids, lateral public.portal__support_index_core(t1, chem, '9/1', now() - interval '60 days') c where c.full_name like 'zz_si_%'));

-- grants
select pg_temp.chk('core not callable by anon/authenticated/PUBLIC', (select not has_function_privilege('anon', p.oid, 'execute') and not has_function_privilege('authenticated', p.oid, 'execute')
   and not coalesce((select bool_or(a.grantee = 0) from aclexplode(p.proacl) a), false) from pg_proc p where p.proname = 'portal__support_index_core'));
select pg_temp.chk('public wrapper callable by anon (like the other portal RPCs)', (select has_function_privilege('anon', p.oid, 'execute') from pg_proc p where p.proname = 'portal_teacher_mt_support_index'));
select pg_temp.chk('read-only: no table was changed by the functions (functions are stable)', (select bool_and(p.provolatile = 's') from pg_proc p where p.proname in ('portal__support_index_core', 'portal_teacher_mt_support_index')));

select check_name, ok from t_r where not ok order by n;
select 'FAILED: ' || count(*) filter (where not ok) || ' of ' || count(*) as summary from t_r;
rollback;
