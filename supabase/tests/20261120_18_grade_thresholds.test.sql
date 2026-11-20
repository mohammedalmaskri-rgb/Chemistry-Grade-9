-- اختبار 20261120_18_grade_thresholds — على نسخة محلية أو قاعدة اختبار فقط. لا يُشغَّل على الإنتاج.
\set QUIET on
\set ON_ERROR_STOP on
set client_min_messages = warning;
begin;
create temp table t_r(n serial, check_name text, ok boolean);
create or replace function pg_temp.chk(name text, ok boolean) returns void language sql as $$ insert into t_r(check_name, ok) values (name, coalesce(ok, false)) $$;
insert into public.teacher_users(username, full_name, password_hash, is_active, must_change_password) values ('zz_gt_t1', 'م1', 'x', true, false), ('zz_gt_t2', 'م2', 'x', true, false);
insert into public.students(full_name, class_name, username, password_hash, is_active, must_change_password, points)
  select 'zz_gt_' || n, case when n = 12 then '9/2' else '9/1' end, 'zz_gt_s' || n, 'x', n <> 11, false, 0 from generate_series(1, 12) n;
create temp table ids as select (select id from public.teacher_users where username = 'zz_gt_t1') t1, (select id from public.teacher_users where username = 'zz_gt_t2') t2,
  (select id from public.subjects where code = 'chemistry') chem, gen_random_uuid() u1, gen_random_uuid() u2, gen_random_uuid() uold, gen_random_uuid() ust;
create temp table s as select n, (select id from public.students where username = 'zz_gt_s' || n) id from generate_series(1, 12) n;
insert into public.teacher_sessions(token, teacher_id, expires_at) select u1, t1, now() + interval '1 hour' from ids;
insert into public.teacher_sessions(token, teacher_id, expires_at) select u2, t2, now() + interval '1 hour' from ids;
insert into public.teacher_sessions(token, teacher_id, created_at, expires_at) select uold, t1, now() - interval '2 hours', now() - interval '1 hour' from ids;
insert into public.student_sessions(token, student_id, expires_at) select ust, (select id from s where n = 1), now() + interval '1 hour' from ids;
insert into public.teacher_class_subjects(teacher_id, subject_id, class_name, is_active) select t1, chem, '9/1', true from ids;
insert into public.teacher_class_subjects(teacher_id, subject_id, class_name, is_active) select t2, chem, '9/2', true from ids;
create or replace function pg_temp.g(sn int, title text, sc numeric, mx numeric, days_ago int) returns void language sql as $$
  insert into public.portal_mt_grades(teacher_id, subject_id, student_id, assessment_title, score, max_score, created_at)
  select t1, chem, (select id from s where n = sn), title, sc, mx, now() - make_interval(days => days_ago) from ids $$;

-- S1 test 10/15 (exactly at the limit) -> ok            S2 test 9/15 -> amber         S3 homework 2/5 -> amber       S4 homework 3/5 -> ok
-- S5 oral 2/5 -> amber                                  S6 test 8 + hw 2 -> red       S7 test 8 then test 12 (improved) -> ok
-- S8 test 14/15, hw 5/5, oral 5/5 -> ok                 S9 nothing recorded -> no_data    S10 test with max 10: 6/10 (=60% < 66.7%) -> amber
select pg_temp.g(1, 'الاختبار الأول', 10, 15, 5);
select pg_temp.g(2, 'الاختبار الأول', 9, 15, 5);
select pg_temp.g(3, 'واجب 1', 2, 5, 5);
select pg_temp.g(4, 'واجب 1', 3, 5, 5);
select pg_temp.g(5, 'حوار شفوي 1', 2, 5, 5);
select pg_temp.g(6, 'الاختبار الأول', 8, 15, 5); select pg_temp.g(6, 'واجب 1', 2, 5, 4);
select pg_temp.g(7, 'الاختبار الأول', 8, 15, 20); select pg_temp.g(7, 'الاختبار الثاني', 12, 15, 5);
select pg_temp.g(8, 'الاختبار الأول', 14, 15, 5); select pg_temp.g(8, 'واجب 1', 5, 5, 4); select pg_temp.g(8, 'حوار شفوي 1', 5, 5, 3);
select pg_temp.g(10, 'اختبار قصير 1', 6, 10, 5);
select pg_temp.g(11, 'الاختبار الأول', 0, 15, 5);   -- inactive
select pg_temp.g(12, 'واجب 1', 0, 5, 5);            -- class 9/2 student graded by teacher 1 (shown only under ALL)
-- ignored rows: max 0, null score, other title
select pg_temp.g(9, 'واجب 1', 1, 0, 5); select pg_temp.g(9, 'نشاط إثرائي', 1, 15, 5);

create temp table r as select x.* from ids, lateral public.portal_teacher_mt_grade_flags(u1, 'chemistry', 'ALL') x where x.full_name like 'zz_gt_%';
create temp table r2 as select x.* from ids, lateral public.portal_teacher_mt_grade_flags(u2, 'chemistry', 'ALL') x where x.full_name like 'zz_gt_%';
create or replace function pg_temp.sv(n text) returns text language sql as $$ select severity from r where full_name = 'zz_gt_' || n $$;

select pg_temp.chk('S1 test exactly 10/15 is NOT flagged', pg_temp.sv('1') = 'ok');
select pg_temp.chk('S2 test 9/15 flagged with the exact sentence', pg_temp.sv('2') = 'amber' and (select reasons = array['الاختبار «الاختبار الأول»: 9 من 15 (الحد 10)'] from r where full_name = 'zz_gt_2'));
select pg_temp.chk('S3 homework 2/5 flagged (limit 3)', pg_temp.sv('3') = 'amber' and (select reasons[1] like 'الواجب%2 من 5 (الحد 3)' from r where full_name = 'zz_gt_3'));
select pg_temp.chk('S4 homework exactly 3/5 not flagged', pg_temp.sv('4') = 'ok');
select pg_temp.chk('S5 oral 2/5 flagged (limit 3)', pg_temp.sv('5') = 'amber' and (select reasons[1] like 'الحوار%2 من 5 (الحد 3)' from r where full_name = 'zz_gt_5'));
select pg_temp.chk('S6 two types below limit => red, two reasons, test first', pg_temp.sv('6') = 'red' and (select cardinality(reasons) = 2 and reasons[1] like 'الاختبار%' and reasons[2] like 'الواجب%' from r where full_name = 'zz_gt_6'));
select pg_temp.chk('S7 improved in the next test => no alert (latest per type is used)', pg_temp.sv('7') = 'ok');
select pg_temp.chk('S8 all good => ok, 3 items none low', pg_temp.sv('8') = 'ok' and (select jsonb_array_length(items) = 3 and not exists (select 1 from jsonb_array_elements(items) e where (e->>'low')::boolean) from r where full_name = 'zz_gt_8'));
select pg_temp.chk('S9 nothing valid recorded (max 0 / other title ignored) => no_data', pg_temp.sv('9') = 'no_data');
select pg_temp.chk('S10 max 10: 6/10 scaled limit 6.7 => flagged with the scaled limit', pg_temp.sv('10') = 'amber' and (select reasons[1] like '%6 من 10 (الحد 6.7)' from r where full_name = 'zz_gt_10'));
select pg_temp.chk('inactive student excluded', (select count(*) = 0 from r where full_name = 'zz_gt_11'));
select pg_temp.chk('items carry score/max/limit/low for the UI', (select (items->0->>'score') = '9' and (items->0->>'max') = '15' and (items->0->>'limit') = '10' and (items->0->>'low') = 'true' from r where full_name = 'zz_gt_2'));
select pg_temp.chk('ordering: red, amber, ok, no_data', (select array_agg(distinct severity) filter (where true) @> array['red','amber','ok','no_data'] and (array_agg(severity order by ord))[1] = 'red' and (array_agg(severity order by ord))[array_length(array_agg(severity), 1)] = 'no_data'
   from (select severity, row_number() over () ord from public.portal_teacher_mt_grade_flags((select u1 from ids), 'chemistry', 'ALL') x where x.full_name like 'zz_gt_%') o));
select pg_temp.chk('class filter 9/1 leaves out the 9/2 student', (select count(*) = 0 from ids, lateral public.portal_teacher_mt_grade_flags(u1, 'chemistry', '9/1') x where x.full_name = 'zz_gt_12'));
select pg_temp.chk('teacher 2 sees no grades of teacher 1', (select count(*) = 1 and bool_and(severity = 'no_data') from r2));
select pg_temp.chk('unknown / expired / student / null token and bad subject => nothing', (select count(*) = 0 from public.portal_teacher_mt_grade_flags(gen_random_uuid(), 'chemistry', 'ALL'))
  and (select count(*) = 0 from ids, lateral public.portal_teacher_mt_grade_flags(uold, 'chemistry', 'ALL')) and (select count(*) = 0 from ids, lateral public.portal_teacher_mt_grade_flags(ust, 'chemistry', 'ALL'))
  and (select count(*) = 0 from public.portal_teacher_mt_grade_flags(null, 'chemistry', 'ALL')) and (select count(*) = 0 from ids, lateral public.portal_teacher_mt_grade_flags(u1, 'nope', 'ALL')));
-- live change
insert into public.portal_mt_grades(teacher_id, subject_id, student_id, assessment_title, score, max_score) select t1, chem, (select id from s where n = 1), 'الاختبار الثاني', 4, 15 from ids;
select pg_temp.chk('LIVE: S1 enters a test below the limit => flagged at once', (select severity = 'amber' from ids, lateral public.portal_teacher_mt_grade_flags(u1, 'chemistry', 'ALL') x where x.full_name = 'zz_gt_1'));
select pg_temp.chk('core is closed to anon/authenticated/PUBLIC; wrapper open to anon; both STABLE', (select not has_function_privilege('anon', p.oid, 'execute') and not has_function_privilege('authenticated', p.oid, 'execute') and not coalesce((select bool_or(a.grantee = 0) from aclexplode(p.proacl) a), false) from pg_proc p where p.proname = 'portal__grade_flags_core')
  and (select has_function_privilege('anon', p.oid, 'execute') from pg_proc p where p.proname = 'portal_teacher_mt_grade_flags') and (select bool_and(p.provolatile = 's') from pg_proc p where p.proname in ('portal__grade_flags_core', 'portal_teacher_mt_grade_flags')));
select check_name, ok from t_r where not ok order by n;
select 'FAILED: ' || count(*) filter (where not ok) || ' of ' || count(*) as summary from t_r;
rollback;
