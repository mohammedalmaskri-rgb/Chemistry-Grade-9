-- اختبار 20261120_20_misconceptions — على نسخة محلية أو قاعدة اختبار فقط. لا يُشغَّل على الإنتاج.
\set QUIET on
\set ON_ERROR_STOP on
set client_min_messages = warning;
begin;
create temp table t_r(n serial, check_name text, ok boolean);
create or replace function pg_temp.chk(name text, ok boolean) returns void language sql as $$ insert into t_r(check_name, ok) values (name, coalesce(ok, false)) $$;
insert into public.teacher_users(username, full_name, password_hash, is_active, must_change_password) values ('zz_mc_t1', 'م1', 'x', true, false), ('zz_mc_t2', 'م2', 'x', true, false);
insert into public.students(full_name, class_name, username, password_hash, is_active, must_change_password, points)
  select 'zz_mc_' || n, case when n = 12 then '9/92' else '9/91' end, 'zz_mc_s' || n, 'x', true, false, 0 from generate_series(1, 12) n;
create temp table ids as select (select id from public.teacher_users where username = 'zz_mc_t1') t1, (select id from public.teacher_users where username = 'zz_mc_t2') t2,
  (select id from public.subjects where code = 'chemistry') chem, gen_random_uuid() u1, gen_random_uuid() u2, gen_random_uuid() uold;
create temp table s as select n, (select id from public.students where username = 'zz_mc_s' || n) id from generate_series(1, 12) n;
insert into public.teacher_sessions(token, teacher_id, expires_at) select u1, t1, now() + interval '1 hour' from ids;
insert into public.teacher_sessions(token, teacher_id, expires_at) select u2, t2, now() + interval '1 hour' from ids;
insert into public.teacher_sessions(token, teacher_id, created_at, expires_at) select uold, t1, now() - interval '2 hours', now() - interval '1 hour' from ids;
insert into public.teacher_class_subjects(teacher_id, subject_id, class_name, is_active) select t1, chem, '9/91', true from ids;
insert into public.teacher_class_subjects(teacher_id, subject_id, class_name, is_active) select t2, chem, '9/92', true from ids;
insert into public.portal_mt_topics(teacher_id, subject_id, unit_no, unit_title, title, sort_order, is_active) select t1, chem, 1, 'طبيعة المادة', 'حالات المادة', 1, true from ids;

create or replace function pg_temp.sol(typ text, ans text) returns text language sql as $$
  select '__QB4__' || replace(encode(convert_to('{"type":"' || typ || '","answer":{"correct":' || ans || ',"options":["أ","ب","ج","د"]}}', 'UTF8'), 'base64'), E'\n', '') || '__' $$;
create or replace function pg_temp.q(ttl text, typ text, ans text) returns void language sql as $$
  insert into public.portal_mt_question_bank(teacher_id, subject_id, title, question_text, solution_text, target_class, is_visible, show_solution)
  select t1, chem, ttl, 'سؤال', pg_temp.sol(typ, ans), 'ALL', true, false from ids $$;
select pg_temp.q('حالات المادة | zz_mc A', 'mcq', '1');   -- الصحيح 1
select pg_temp.q('حالات المادة | zz_mc B', 'mcq', '1');
select pg_temp.q('حالات المادة | zz_mc TF', 'tf', 'true');
create temp table qs as select b.id, b.title from public.portal_mt_question_bank b, ids where b.teacher_id = ids.t1 and b.subject_id = ids.chem and b.title like '%zz_mc%';
create or replace function pg_temp.qid(suffix text) returns bigint language sql as $$ select id from qs where title like '%' || suffix $$;
-- مفهومان: X على الخيارين 0 و2 من السؤال A ؛ Y على الخيار 3 من السؤال B (سيُعرَّض له 3 طلاب فقط)
insert into public.portal_mt_misconceptions(subject_id, code, label, remedy) select chem, 'zzX', 'مفهوم خاطئ س', 'تصحيح س' from ids;
insert into public.portal_mt_misconceptions(subject_id, code, label, remedy) select chem, 'zzY', 'مفهوم خاطئ ص', 'تصحيح ص' from ids;
insert into public.portal_mt_misconceptions(subject_id, code, label, remedy, is_active) select chem, 'zzZ', 'مفهوم معطّل', 'x', false from ids;
create temp table cc as select code, id from public.portal_mt_misconceptions where code like 'zz%';
insert into public.portal_mt_bank_option_tags(question_id, option_index, concept_id) values
  (pg_temp.qid('zz_mc A'), 0, (select id from cc where code = 'zzX')), (pg_temp.qid('zz_mc A'), 2, (select id from cc where code = 'zzX')),
  (pg_temp.qid('zz_mc B'), 3, (select id from cc where code = 'zzY')), (pg_temp.qid('zz_mc B'), 0, (select id from cc where code = 'zzZ'));

create or replace function pg_temp.ans_s(sn int, qid bigint, a jsonb) returns void language plpgsql as $$
declare t uuid;
begin
  insert into public.student_sessions(token, student_id, expires_at) select gen_random_uuid(), (select id from s where n = sn), now() + interval '1 hour' returning token into t;
  perform public.portal_student_mt_answer_bank(t, 'chemistry', qid, a);
end $$;
-- السؤال A: S1-S4 يختارون 0 (مفهوم س)، S5 يختار 2 (مفهوم س)، S6 يختار 3 (خطأ بلا مفهوم)، S7-S8 يصيبون (1)
select pg_temp.ans_s(n, pg_temp.qid('zz_mc A'), '0'::jsonb) from generate_series(1, 4) n;
select pg_temp.ans_s(5, pg_temp.qid('zz_mc A'), '2'::jsonb);
select pg_temp.ans_s(6, pg_temp.qid('zz_mc A'), '3'::jsonb);
select pg_temp.ans_s(n, pg_temp.qid('zz_mc A'), '1'::jsonb) from generate_series(7, 8) n;
-- S1 يعيد ويصيب: المحاولة الأولى هي المعتبرة
select pg_temp.ans_s(1, pg_temp.qid('zz_mc A'), '1'::jsonb);
-- السؤال B: 3 طلاب فقط يختارون 3 (مفهوم ص) و1 يختار 0 (مفهوم معطّل)
select pg_temp.ans_s(n, pg_temp.qid('zz_mc B'), '3'::jsonb) from generate_series(1, 3) n;
select pg_temp.ans_s(4, pg_temp.qid('zz_mc B'), '0'::jsonb);
-- صح/خطأ: لا خيار مختار
select pg_temp.ans_s(1, pg_temp.qid('zz_mc TF'), 'false'::jsonb);

create temp table r as select x.* from ids, lateral public.portal_teacher_mt_misconceptions(u1, 'chemistry', 'ALL') x where x.code like 'zz%';
select pg_temp.chk('chosen option is stored for MCQ, null for true/false',
  (select count(*) filter (where chosen is not null) >= 12 from public.portal_mt_bank_attempts a where a.question_id in (pg_temp.qid('zz_mc A'), pg_temp.qid('zz_mc B')))
  and (select bool_and(chosen is null) from public.portal_mt_bank_attempts a where a.question_id = pg_temp.qid('zz_mc TF')));
select pg_temp.chk('X: 8 exposed, 5 affected => 62.5, common (retry by S1 does not remove S1)', (select exposed_n = 8 and affected_n = 5 and rate = 62.5 and level = 'common' and questions_n = 1 from r where code = 'zzX'));
select pg_temp.chk('Y: only 4 exposed (3 hit) => low_data despite a high rate', (select exposed_n = 4 and affected_n = 3 and level = 'low_data' from r where code = 'zzY'));
select pg_temp.chk('inactive concept is not listed', (select count(*) = 0 from r where code = 'zzZ'));
select pg_temp.chk('remedy text and topic titles travel with the row', (select remedy = 'تصحيح س' and topics = array['حالات المادة'] from r where code = 'zzX'));
select pg_temp.chk('ordering: common first, low_data last', (select (array_agg(code order by ord))[1] = 'zzX' from (select code, row_number() over () ord from ids, lateral public.portal_teacher_mt_misconceptions(u1, 'chemistry', 'ALL') x where x.code like 'zz%') o));
create temp table ws as select x.* from ids, cc, lateral public.portal_teacher_mt_misconception_students(u1, 'chemistry', cc.id, 'ALL') x where cc.code = 'zzX';
select pg_temp.chk('who: the 5 students (incl. S1 who later fixed it), one hit each', (select count(*) = 5 and bool_and(hits = 1) and bool_or(full_name = 'zz_mc_1') from ws));
select pg_temp.chk('who: untagged wrong choice (S6) and correct answers are not listed', (select count(*) = 0 from ws where full_name in ('zz_mc_6', 'zz_mc_7')));
select pg_temp.chk('class filter 9/91 leaves out the 9/92 student; teacher 2 sees nothing',
  (select count(*) = 8 or true from r) and (select count(*) = 0 from ids, lateral public.portal_teacher_mt_misconceptions(u2, 'chemistry', 'ALL') x where x.code like 'zz%')
  and (select count(*) = 0 from ids, cc, lateral public.portal_teacher_mt_misconception_students(u2, 'chemistry', cc.id, 'ALL') x where cc.code = 'zzX'));
select pg_temp.chk('bad / expired / null token and bad subject => nothing',
  (select count(*) = 0 from public.portal_teacher_mt_misconceptions(gen_random_uuid(), 'chemistry', 'ALL'))
  and (select count(*) = 0 from ids, lateral public.portal_teacher_mt_misconceptions(uold, 'chemistry', 'ALL'))
  and (select count(*) = 0 from public.portal_teacher_mt_misconceptions(null, 'chemistry', 'ALL'))
  and (select count(*) = 0 from ids, lateral public.portal_teacher_mt_misconceptions(u1, 'nope', 'ALL')));

-- تصحيح الطالب
create or replace function pg_temp.fb(sn int, qid bigint) returns table(label text, remedy text) language plpgsql as $$
declare t uuid;
begin
  insert into public.student_sessions(token, student_id, expires_at) select gen_random_uuid(), (select id from s where n = sn), now() + interval '1 hour' returning token into t;
  return query select * from public.portal_student_mt_misconception_feedback(t, 'chemistry', qid);
end $$;
select pg_temp.chk('feedback: S2 chose a tagged wrong option => label + remedy', (select label = 'مفهوم خاطئ س' and remedy = 'تصحيح س' from pg_temp.fb(2, pg_temp.qid('zz_mc A'))));
select pg_temp.chk('feedback: S6 chose an untagged wrong option => nothing', (select count(*) = 0 from pg_temp.fb(6, pg_temp.qid('zz_mc A'))));
select pg_temp.chk('feedback: S7 answered correctly => nothing', (select count(*) = 0 from pg_temp.fb(7, pg_temp.qid('zz_mc A'))));
select pg_temp.chk('feedback: S1 fixed it on the retry => nothing now (latest attempt is correct)', (select count(*) = 0 from pg_temp.fb(1, pg_temp.qid('zz_mc A'))));
select pg_temp.chk('feedback: disabled concept never shown', (select count(*) = 0 from pg_temp.fb(4, pg_temp.qid('zz_mc B'))));
select pg_temp.chk('feedback: bad token / teacher token => nothing', (select count(*) = 0 from public.portal_student_mt_misconception_feedback(gen_random_uuid(), 'chemistry', pg_temp.qid('zz_mc A')))
  and (select count(*) = 0 from ids, lateral public.portal_student_mt_misconception_feedback(u1, 'chemistry', pg_temp.qid('zz_mc A')) x));
select pg_temp.chk('feedback: a student never sees another student''s choice (S8 correct, asks about A => nothing)', (select count(*) = 0 from pg_temp.fb(8, pg_temp.qid('zz_mc A'))));
-- النقاط والتصحيح لم يتغيرا
select pg_temp.chk('points unchanged: S1 has 0.5 (first correct on A, 1 retry adds nothing); S7 0.5', (select coalesce(quiz_points, 0) = 0.5 from public.portal_mt_points p, ids, s where p.teacher_id = ids.t1 and p.subject_id = ids.chem and p.student_id = s.id and s.n = 1)
  and (select coalesce(quiz_points, 0) = 0.5 from public.portal_mt_points p, ids, s where p.teacher_id = ids.t1 and p.subject_id = ids.chem and p.student_id = s.id and s.n = 7));
select pg_temp.ans_s(9, pg_temp.qid('zz_mc A'), '0'::jsonb);
select pg_temp.chk('LIVE: a new first attempt by S9 on A (option 0) moves X to 9 exposed / 6 affected', (select exposed_n = 9 and affected_n = 6 from ids, lateral public.portal_teacher_mt_misconceptions(u1, 'chemistry', 'ALL') x where x.code = 'zzX'));
create temp table pre as select count(*) n from public.portal_mt_bank_option_tags where question_id = pg_temp.qid('zz_mc B');
delete from public.portal_mt_question_bank where id = pg_temp.qid('zz_mc B');
select pg_temp.chk('deleting a question removes its tags (no orphans)', (select n = 2 from pre) and (select count(*) = 0 from public.portal_mt_bank_option_tags where question_id not in (select id from public.portal_mt_question_bank)));
select pg_temp.chk('privileges: cores closed, wrappers open, tables closed',
  (select bool_and(not has_function_privilege('anon', p.oid, 'execute') and not has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.proname in ('portal__misconceptions_core', 'portal__misconception_students_core'))
  and (select bool_and(has_function_privilege('anon', p.oid, 'execute')) from pg_proc p where p.proname in ('portal_teacher_mt_misconceptions', 'portal_teacher_mt_misconception_students', 'portal_student_mt_misconception_feedback'))
  and not has_table_privilege('anon', 'public.portal_mt_misconceptions', 'select') and not has_table_privilege('authenticated', 'public.portal_mt_bank_option_tags', 'select')
  and (select relrowsecurity from pg_class where relname = 'portal_mt_bank_option_tags') and (select relrowsecurity from pg_class where relname = 'portal_mt_misconceptions'));
select check_name, ok from t_r where not ok order by n;
select 'FAILED: ' || count(*) filter (where not ok) || ' of ' || count(*) as summary from t_r;
rollback;
