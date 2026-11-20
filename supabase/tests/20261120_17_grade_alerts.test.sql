-- اختبار 20261120_17_grade_alerts — على نسخة محلية أو قاعدة اختبار فقط. لا يُشغَّل على الإنتاج.
-- Self-contained: fake teachers/students (prefix zz_ga_), rolls everything back.
\set QUIET on
\set ON_ERROR_STOP on
set client_min_messages = warning;
begin;
create temp table t_r(n serial, check_name text, ok boolean);
create or replace function pg_temp.chk(name text, ok boolean) returns void language sql as $$ insert into t_r(check_name, ok) values (name, coalesce(ok, false)) $$;

insert into public.teacher_users(username, full_name, password_hash, is_active, must_change_password)
  values ('zz_ga_t1', 'معلم 1', 'x', true, false), ('zz_ga_t2', 'معلم 2', 'x', true, false);
-- students 1..9 are the named scenarios (9/1), 10..15 are the class-comparison group (9/1), 16 inactive, 17 in class 9/2
insert into public.students(full_name, class_name, username, password_hash, is_active, must_change_password, points)
  select 'zz_ga_' || n, case when n = 17 then '9/2' else '9/1' end, 'zz_ga_s' || n, 'x', n <> 16, false, 0 from generate_series(1, 17) n;
create temp table ids as select
  (select id from public.teacher_users where username = 'zz_ga_t1') t1, (select id from public.teacher_users where username = 'zz_ga_t2') t2,
  (select id from public.subjects where code = 'chemistry') chem,
  gen_random_uuid() u_t1, gen_random_uuid() u_t2, gen_random_uuid() u_old, gen_random_uuid() u_st;
create temp table s as select n, (select id from public.students where username = 'zz_ga_s' || n) id from generate_series(1, 17) n;
insert into public.teacher_sessions(token, teacher_id, expires_at) select u_t1, t1, now() + interval '1 hour' from ids;
insert into public.teacher_sessions(token, teacher_id, expires_at) select u_t2, t2, now() + interval '1 hour' from ids;
insert into public.teacher_sessions(token, teacher_id, created_at, expires_at) select u_old, t1, now() - interval '2 hours', now() - interval '1 hour' from ids;
insert into public.student_sessions(token, student_id, expires_at) select u_st, (select id from s where n = 1), now() + interval '1 hour' from ids;
insert into public.teacher_class_subjects(teacher_id, subject_id, class_name, is_active) select t1, chem, '9/1', true from ids;
insert into public.teacher_class_subjects(teacher_id, subject_id, class_name, is_active) select t2, chem, '9/2', true from ids;
create or replace function pg_temp.g(sn int, title text, sc numeric, mx numeric, days_ago int) returns void language sql as $$
  insert into public.portal_mt_grades(teacher_id, subject_id, student_id, assessment_title, score, max_score, created_at)
  select t1, chem, (select id from s where n = sn), title, sc, mx, now() - make_interval(days => days_ago) from ids $$;

-- S1 small dip (5) -> ok            S2 dip 20 -> amber           S3 dip 40 and weak -> red
select pg_temp.g(1, 'الاختبار الأول', 18, 20, 40); select pg_temp.g(1, 'الاختبار الثاني', 17, 20, 10);
select pg_temp.g(2, 'الاختبار الأول', 18, 20, 40); select pg_temp.g(2, 'الاختبار الثاني', 14, 20, 10);
select pg_temp.g(3, 'الاختبار الأول', 18, 20, 40); select pg_temp.g(3, 'الاختبار الثاني', 10, 20, 10);
-- S4 single zero homework -> red (below 50)   S5 test 90 then homework 55 (different types: NO drop, but weak) -> amber, no "نزل"
select pg_temp.g(4, 'واجب 1', 0, 10, 5);
select pg_temp.g(5, 'الاختبار الأول', 18, 20, 40); select pg_temp.g(5, 'واجب 1', 11, 20, 10);
-- S6 oral only -> no_data         S7 no grades -> no_data         S8 improved (60 -> 90) -> ok
select pg_temp.g(6, 'حوار شفوي 1', 10, 10, 5);
select pg_temp.g(8, 'واجب 1', 12, 20, 40); select pg_temp.g(8, 'واجب 2', 18, 20, 10);
-- S9: max_score 0 and null score are ignored -> no_data
select pg_temp.g(9, 'واجب 1', 5, 0, 5);
-- class comparison group: 10..14 score 80 on "الاختبار الأول" (mixed spelling), 15 scores 60 (just not weak) -> class avg 76.7, gap 16.7 -> amber with class reason
select pg_temp.g(10, 'اختبار الوحدة', 16, 20, 5); select pg_temp.g(11, 'إختبار الوحدة', 16, 20, 5); select pg_temp.g(12, 'اختبار الوحدة', 16, 20, 5);
select pg_temp.g(13, 'إختبار الوحدة', 16, 20, 5); select pg_temp.g(14, 'اختبار الوحدة', 16, 20, 5); select pg_temp.g(15, 'اختبار الوحدة', 12, 20, 5);
-- inactive S16 weak -> must not appear
select pg_temp.g(16, 'واجب 1', 1, 20, 5);

create temp table r as select x.* from ids, lateral public.portal_teacher_mt_grade_alerts(u_t1, 'chemistry', 'ALL') x where x.full_name like 'zz_ga_%';
create temp table r2 as select x.* from ids, lateral public.portal_teacher_mt_grade_alerts(u_t2, 'chemistry', 'ALL') x where x.full_name like 'zz_ga_%';
create or replace function pg_temp.sv(n text) returns text language sql as $$ select severity from r where full_name = 'zz_ga_' || n $$;

select pg_temp.chk('S1 dip of 5 => ok, no reasons', pg_temp.sv('1') = 'ok' and (select cardinality(reasons) = 0 from r where full_name = 'zz_ga_1'));
select pg_temp.chk('S2 dip of 20 => amber with the exact sentence', pg_temp.sv('2') = 'amber' and (select reasons[1] = 'نزل من 90 في الاختبار الأول إلى 70 في الاختبار الثاني' from r where full_name = 'zz_ga_2'));
select pg_temp.chk('S3 dip of 40 => red; drop_pts = 40', pg_temp.sv('3') = 'red' and (select drop_pts = 40.0 and last_pct = 50.0 and prev_pct = 90.0 from r where full_name = 'zz_ga_3'));
select pg_temp.chk('S3 also weak? 50 is not below 50, but below 60 => weak reason present', (select reasons::text like '%درجته 50 %' from r where full_name = 'zz_ga_3'));
select pg_temp.chk('S4 zero homework only => red, no "نزل" (nothing to compare)', pg_temp.sv('4') = 'red' and (select reasons::text not like '%نزل%' and reasons::text like '%درجته 0 %' from r where full_name = 'zz_ga_4'));
select pg_temp.chk('S5 test then homework: NOT compared across types, weak => amber', pg_temp.sv('5') = 'amber' and (select reasons::text not like '%نزل%' and prev_pct is null from r where full_name = 'zz_ga_5'));
select pg_temp.chk('S6 oral only => no_data', pg_temp.sv('6') = 'no_data');
select pg_temp.chk('S7 no grades at all => no_data (missing grade is not penalised)', pg_temp.sv('7') = 'no_data');
select pg_temp.chk('S8 improved => ok', pg_temp.sv('8') = 'ok');
select pg_temp.chk('S9 max_score 0 ignored => no_data', pg_temp.sv('9') = 'no_data');
select pg_temp.chk('S15 below class average (typos in title grouped) => amber with class sentence', pg_temp.sv('15') = 'amber' and (select reasons::text like '%أقل من متوسط الشعبة%' and class_avg = 76.7 from r where full_name = 'zz_ga_15'));
select pg_temp.chk('S10 at class average => ok', pg_temp.sv('10') = 'ok');
select pg_temp.chk('inactive student excluded', (select count(*) = 0 from r where full_name = 'zz_ga_16'));
select pg_temp.chk('S17 (class 9/2, no grades by this teacher) listed only through grade rule => not for teacher 1 via class', (select count(*) = 0 from r where full_name = 'zz_ga_17'));
select pg_temp.chk('grades sequence returned oldest->newest, max 4', (select jsonb_array_length(grades) = 2 and grades->0->>'t' = 'الاختبار الأول' and (grades->1->>'p')::numeric = 70.0 from r where full_name = 'zz_ga_2'));
select pg_temp.chk('ordering: red first, no_data last', (select (array_agg(severity order by ord))[1] = 'red' and (array_agg(severity order by ord))[array_length(array_agg(severity), 1)] = 'no_data'
   from (select severity, row_number() over () ord from public.portal_teacher_mt_grade_alerts((select u_t1 from ids), 'chemistry', 'ALL') x where x.full_name like 'zz_ga_%') o));
select pg_temp.chk('class filter 9/2 returns nobody of teacher 1', (select count(*) = 0 from ids, lateral public.portal_teacher_mt_grade_alerts(u_t1, 'chemistry', '9/2') x where x.full_name like 'zz_ga_%'));

-- isolation + auth
select pg_temp.chk('teacher 2 sees only class 9/2 student (no grades => no_data), none of teacher 1 data', (select count(*) = 1 and bool_and(severity = 'no_data') from r2));
select pg_temp.chk('unknown token => nothing', (select count(*) = 0 from public.portal_teacher_mt_grade_alerts(gen_random_uuid(), 'chemistry', 'ALL')));
select pg_temp.chk('expired token => nothing', (select count(*) = 0 from ids, lateral public.portal_teacher_mt_grade_alerts(u_old, 'chemistry', 'ALL')));
select pg_temp.chk('student token => nothing', (select count(*) = 0 from ids, lateral public.portal_teacher_mt_grade_alerts(u_st, 'chemistry', 'ALL')));
select pg_temp.chk('null token / bad subject => nothing', (select count(*) = 0 from public.portal_teacher_mt_grade_alerts(null, 'chemistry', 'ALL')) and (select count(*) = 0 from ids, lateral public.portal_teacher_mt_grade_alerts(u_t1, 'nope', 'ALL')));

-- time travel
select pg_temp.chk('as-of 20 days ago: S3 only had the first grade (no drop yet)', (select drop_pts is null and last_pct = 90.0 from ids, lateral public.portal__grade_alerts_core(t1, chem, 'ALL', now() - interval '20 days') c where c.full_name = 'zz_ga_3'));
-- live update: new lower grade immediately changes the alert
insert into public.portal_mt_grades(teacher_id, subject_id, student_id, assessment_title, score, max_score)
  select t1, chem, (select id from s where n = 1), 'الاختبار الثالث', 8, 20 from ids;
select pg_temp.chk('LIVE: S1 enters a lower test => ok becomes red at once', (select severity = 'red' and drop_pts = 45.0 from ids, lateral public.portal_teacher_mt_grade_alerts(u_t1, 'chemistry', 'ALL') x where x.full_name = 'zz_ga_1'));

-- grants / read-only
select pg_temp.chk('core not callable by anon/authenticated/PUBLIC', (select not has_function_privilege('anon', p.oid, 'execute') and not has_function_privilege('authenticated', p.oid, 'execute')
   and not coalesce((select bool_or(a.grantee = 0) from aclexplode(p.proacl) a), false) from pg_proc p where p.proname = 'portal__grade_alerts_core'));
select pg_temp.chk('wrapper callable by anon; both functions are STABLE (read-only)', (select has_function_privilege('anon', p.oid, 'execute') from pg_proc p where p.proname = 'portal_teacher_mt_grade_alerts')
   and (select bool_and(p.provolatile = 's') from pg_proc p where p.proname in ('portal__grade_alerts_core', 'portal_teacher_mt_grade_alerts')));

select check_name, ok from t_r where not ok order by n;
select 'FAILED: ' || count(*) filter (where not ok) || ' of ' || count(*) as summary from t_r;
rollback;
