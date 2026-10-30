-- اختبار 20261030_07_add_move_own_classes — على نسخة محلية فقط، بعد تطبيق 20261030_02.
\set QUIET on
set client_min_messages = warning;
create temp table t_fns as select p.oid::regprocedure fn, md5(pg_get_functiondef(p.oid)) h from pg_proc p
where p.oid in ('public.portal_teacher_add_student(text,text,text,text,text)'::regprocedure, 'public.portal_teacher_move_student(text,bigint,text)'::regprocedure);
create temp table t_tok as select tid, gen_random_uuid() tok from (values (1),(5),(7)) v(tid);
insert into public.teacher_sessions(token, teacher_id, expires_at) select tok, tid, now() + interval '1 hour' from t_tok;
create or replace function pg_temp.tok(t int) returns text language sql as $$ select tok::text from t_tok where tid = t $$;
create or replace function pg_temp.stu(c text) returns bigint language sql as $$ select id from public.students where class_name = c and is_active order by id limit 1 $$;
create or replace function pg_temp.err(q text) returns text language plpgsql as $$ begin execute q; return ''; exception when others then return sqlerrm; end $$;

create temp table t_before as select
  pg_temp.err(format('select public.portal_teacher_add_student(%L,%L,%L,%L,%L)', pg_temp.tok(5), 'طالب تجريبي أ', '7/4', 'zz_e_before', 'Test123456')) add74,
  pg_temp.err(format('select public.portal_teacher_move_student(%L,%s,%L)', pg_temp.tok(7), pg_temp.stu('9/9'), '9/10')) move_9_10;

\i :migration
create temp table t_r(check_name text, ok boolean, detail text default '');
insert into t_r select 'before: grade-7 teacher could not add to his own 7/4', (select add74 from t_before) like '%الشعبة غير صحيحة%';
create temp table t_add as select public.portal_teacher_add_student(pg_temp.tok(5), 'طالب تجريبي ب', '7/4', 'zz_e_1', 'Test123456') id;
insert into t_r select 'grade-7 teacher now adds a student to his own 7/4',
  (select id from t_add) is not null and (select class_name from public.students where username = 'zz_e_1') = '7/4';
insert into t_r select 'grade-7 teacher still cannot add to 9/3 or 8/1',
  pg_temp.err(format('select public.portal_teacher_add_student(%L,%L,%L,%L,%L)', pg_temp.tok(5), 'طالب تجريبي ج', '9/3', 'zz_e_2', 'Test123456')) like '%غير مسندة%'
  and pg_temp.err(format('select public.portal_teacher_add_student(%L,%L,%L,%L,%L)', pg_temp.tok(5), 'طالب تجريبي ج', '8/1', 'zz_e_2', 'Test123456')) like '%غير مسندة%';
insert into t_r select 'a made-up class is refused', pg_temp.err(format('select public.portal_teacher_add_student(%L,%L,%L,%L,%L)', pg_temp.tok(5), 'طالب تجريبي د', '7/99', 'zz_e_3', 'Test123456')) like '%غير مسندة%';
insert into t_r select 'duplicate username still refused',
  pg_temp.err(format('select public.portal_teacher_add_student(%L,%L,%L,%L,%L)', pg_temp.tok(5), 'طالب تجريبي هـ', '7/5', 'zz_e_1', 'Test123456')) like '%مستخدم لطالب آخر%';
insert into t_r select 'biology teacher now moves his 9/9 student to his 9/10', public.portal_teacher_move_student(pg_temp.tok(7), pg_temp.stu('9/9'), '9/10');
insert into t_r select 'biology teacher still cannot move into 9/1', pg_temp.err(format('select public.portal_teacher_move_student(%L,%s,%L)', pg_temp.tok(7), pg_temp.stu('9/8'), '9/1')) like '%غير مسندة%';
insert into t_r select 'grade-7 teacher cannot move a 9/x student', pg_temp.err(format('select public.portal_teacher_move_student(%L,%s,%L)', pg_temp.tok(5), pg_temp.stu('9/2'), '7/4')) like '%ليس ضمن%';
insert into t_r select 'chemistry teacher unchanged: add to 9/3 and move 9/1 → 9/2',
  public.portal_teacher_add_student(pg_temp.tok(1), 'طالب تجريبي و', '9/3', 'zz_e_4', 'Test123456') is not null
  and public.portal_teacher_move_student(pg_temp.tok(1), pg_temp.stu('9/1'), '9/2');
\i :rollback
insert into t_r select 'rollback restores both definitions (post-#4)', not exists (select 1 from t_fns where md5(pg_get_functiondef(fn)) <> h);
select case when ok is true then 'PASS' else 'FAIL' end as result, check_name, detail from t_r;
select case when bool_and(coalesce(ok, false)) then 'ALL PASSED' else 'FAILURES' end as summary, count(*) as checks from t_r;
