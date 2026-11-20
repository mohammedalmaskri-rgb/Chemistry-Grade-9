-- اختبار 20261120_19_topic_support — على نسخة محلية أو قاعدة اختبار فقط. لا يُشغَّل على الإنتاج.
\set QUIET on
\set ON_ERROR_STOP on
set client_min_messages = warning;
begin;
create temp table t_r(n serial, check_name text, ok boolean);
create or replace function pg_temp.chk(name text, ok boolean) returns void language sql as $$ insert into t_r(check_name, ok) values (name, coalesce(ok, false)) $$;
insert into public.teacher_users(username, full_name, password_hash, is_active, must_change_password) values ('zz_ts_t1', 'م1', 'x', true, false), ('zz_ts_t2', 'م2', 'x', true, false);
insert into public.students(full_name, class_name, username, password_hash, is_active, must_change_password, points)
  select 'zz_ts_' || n, case when n = 12 then '9/92' else '9/91' end, 'zz_ts_s' || n, 'x', true, false, 0 from generate_series(1, 12) n;
create temp table ids as select (select id from public.teacher_users where username = 'zz_ts_t1') t1, (select id from public.teacher_users where username = 'zz_ts_t2') t2,
  (select id from public.subjects where code = 'chemistry') chem, gen_random_uuid() u1, gen_random_uuid() u2, gen_random_uuid() uold,
  gen_random_uuid() st1, gen_random_uuid() st2, gen_random_uuid() st12;
create temp table s as select n, (select id from public.students where username = 'zz_ts_s' || n) id from generate_series(1, 12) n;
insert into public.teacher_sessions(token, teacher_id, expires_at) select u1, t1, now() + interval '1 hour' from ids;
insert into public.teacher_sessions(token, teacher_id, expires_at) select u2, t2, now() + interval '1 hour' from ids;
insert into public.teacher_sessions(token, teacher_id, created_at, expires_at) select uold, t1, now() - interval '2 hours', now() - interval '1 hour' from ids;
insert into public.student_sessions(token, student_id, expires_at) select st1, (select id from s where n = 1), now() + interval '1 hour' from ids;
insert into public.student_sessions(token, student_id, expires_at) select st2, (select id from s where n = 2), now() + interval '1 hour' from ids;
insert into public.student_sessions(token, student_id, expires_at) select st12, (select id from s where n = 12), now() + interval '1 hour' from ids;
insert into public.teacher_class_subjects(teacher_id, subject_id, class_name, is_active) select t1, chem, '9/91', true from ids;
insert into public.teacher_class_subjects(teacher_id, subject_id, class_name, is_active) select t2, chem, '9/92', true from ids;

-- منهج المعلم 1: ثلاثة مواضيع (أسماء مطابقة لمنهج الكيمياء الحقيقي)
insert into public.portal_mt_topics(teacher_id, subject_id, unit_no, unit_title, title, sort_order, is_active)
  select t1, chem, 1, 'طبيعة المادة', 'حالات المادة', 1, true from ids union all
  select t1, chem, 1, 'طبيعة المادة', 'فصل المواد وتنقيتها', 2, true from ids union all
  select t1, chem, 2, 'التركيب الذري', 'الذرات والجزيئات', 3, true from ids union all
  select t1, chem, 2, 'التركيب الذري', 'تغيرات لا علاقة لها', 4, true from ids;
create temp table tp as select t.title, t.id from public.portal_mt_topics t, ids where t.teacher_id = ids.t1 and t.subject_id = ids.chem;

-- أسئلة البنك بصيغة QB4 (اختيار من متعدد، الإجابة الصحيحة = 1)
create or replace function pg_temp.sol(typ text) returns text language sql as $$
  select '__QB4__' || replace(encode(convert_to('{"type":"' || typ || '","answer":{"correct":1}}', 'UTF8'), 'base64'), E'\n', '') || '__' $$;
create or replace function pg_temp.q(ttl text, typ text default 'mcq', vis boolean default true) returns void language sql as $$
  insert into public.portal_mt_question_bank(teacher_id, subject_id, title, question_text, solution_text, target_class, is_visible, show_solution)
  select t1, chem, ttl, 'سؤال', pg_temp.sol(typ), 'ALL', vis, false from ids $$;
select pg_temp.q('حالات المادة | 01 - مفهوم المادة');           -- qA1
select pg_temp.q('حالات المادة | 02 - حالات المادة');           -- qA2
select pg_temp.q('فصل وتنقية المواد | 01 - أساس طرق الفصل');   -- qB1 (اسم الدرس يختلف عن عنوان الموضوع لكن يُطابَق)
select pg_temp.q('فصل وتنقية المواد | 02 - الترويق');          -- qB2
select pg_temp.q('الذرات والجزيئات | 01 - العنصر');            -- qC1
select pg_temp.q('سؤال بلا اسم درس');                          -- بلا «|» => بلا موضوع
select pg_temp.q('حالات المادة | 03 - مخفي', 'mcq', false);     -- مخفي عن الطلاب
select pg_temp.q('حالات المادة | 04 - نوع غير مصحَّح', 'essay'); -- نوع غير معروف: لا يُسجَّل
create temp table qs as select b.id, b.title from public.portal_mt_question_bank b, ids where b.teacher_id = ids.t1 and b.subject_id = ids.chem;
create or replace function pg_temp.qid(prefix text) returns bigint language sql as $$ select id from qs where title like prefix || '%' $$;
create or replace function pg_temp.ans(tok uuid, qid bigint, a int) returns void language sql as $$
  select public.portal_student_mt_answer_bank(tok, 'chemistry', qid, to_jsonb(a)) $$;
create or replace function pg_temp.ans_s(sn int, qid bigint, a int) returns void language plpgsql as $$
declare t uuid;
begin
  insert into public.student_sessions(token, student_id, expires_at) select gen_random_uuid(), (select id from s where n = sn), now() + interval '1 hour' returning token into t;
  perform public.portal_student_mt_answer_bank(t, 'chemistry', qid, to_jsonb(a));
end $$;

-- موضوع «حالات المادة»: 10 طلاب يخطئون أول محاولة في السؤال 1 ويصيبون السؤال 2  => 20 محاولة أولى، 10 خطأ = 50%
select pg_temp.ans_s(n, pg_temp.qid('حالات المادة | 01'), 0) from generate_series(1, 10) n;
select pg_temp.ans_s(n, pg_temp.qid('حالات المادة | 02'), 1) from generate_series(1, 10) n;
-- الطالب 1 يعيد السؤال 1 ويصيبه: إعادة المحاولة لا تغيّر دقة المحاولة الأولى
select pg_temp.ans(st1, pg_temp.qid('حالات المادة | 01'), 1) from ids;
-- موضوع «فصل المواد»: 4 طلاب يصيبون السؤال 1 فقط => 4 محاولات (أقل من 10)
select pg_temp.ans_s(n, pg_temp.qid('فصل وتنقية المواد | 01'), 1) from generate_series(1, 4) n;
-- سقف المحاولات: الطالب 3 يكرر 25 مرة
select pg_temp.ans_s(3, pg_temp.qid('فصل وتنقية المواد | 02'), 0) from generate_series(1, 25) n;
-- سؤال نوعه غير معروف وسؤال بلا موضوع
select pg_temp.ans_s(5, pg_temp.qid('حالات المادة | 04'), 1);
select pg_temp.ans_s(5, pg_temp.qid('سؤال بلا'), 1);

select pg_temp.chk('mapping: lesson name matches the topic even when the wording differs (فصل وتنقية المواد -> فصل المواد وتنقيتها)',
  (select count(*) = 2 and bool_and(m.topic_id = (select id from tp where title = 'فصل المواد وتنقيتها')) from ids, lateral public.portal__bank_topic_map(t1, chem) m where m.question_id in (pg_temp.qid('فصل وتنقية المواد | 01'), pg_temp.qid('فصل وتنقية المواد | 02'))));
select pg_temp.chk('mapping: a question without "|" in the title has no topic', (select count(*) = 0 from ids, lateral public.portal__bank_topic_map(t1, chem) m where m.question_id = pg_temp.qid('سؤال بلا')));
select pg_temp.chk('mapping: exact lesson name maps to its own topic', (select m.topic_id = (select id from tp where title = 'حالات المادة') from ids, lateral public.portal__bank_topic_map(t1, chem) m where m.question_id = pg_temp.qid('حالات المادة | 01')));

create temp table r as select x.* from ids, lateral public.portal_teacher_mt_topic_support(u1, 'chemistry', 'ALL') x;
select pg_temp.chk('attempts: wrong answers are now recorded (10 wrong first tries on Q1)', (select count(*) filter (where not is_correct) >= 10 from public.portal_mt_bank_attempts a, ids where a.teacher_id = ids.t1 and a.question_id = pg_temp.qid('حالات المادة | 01')));
select pg_temp.chk('attempt cap: 25 tries by one student are stored as 20', (select count(*) = 20 from public.portal_mt_bank_attempts a, s where a.student_id = s.id and s.n = 3 and a.question_id = pg_temp.qid('فصل وتنقية المواد | 02')));
select pg_temp.chk('ungraded question type is not logged as an attempt', (select count(*) = 0 from public.portal_mt_bank_attempts a where a.question_id = pg_temp.qid('حالات المادة | 04')));
select pg_temp.chk('first-try accuracy: 20 first tries, 10 wrong => 50%, level need (retry by S1 does not change it)', (select first_try_n = 20 and first_try_wrong_n = 10 and accuracy = 50.0 and level = 'need' and tried_n = 10 and questions_n = 2 from r where title = 'حالات المادة'));
select pg_temp.chk('low sample (fewer than 10 first tries) => low_data, never need', (select level = 'low_data' and tried_n = 4 from r where title = 'فصل المواد وتنقيتها') );
select pg_temp.chk('topic with questions but no attempts => low_data, accuracy null', (select level = 'low_data' and accuracy is null and first_try_n = 0 from r where title = 'الذرات والجزيئات'));
select pg_temp.chk('topic with no questions and no lesson visits is not listed', (select count(*) = 0 from r where title = 'تغيرات لا علاقة لها'));
select pg_temp.chk('ordering: need first', (select title = 'حالات المادة' from ids, lateral public.portal_teacher_mt_topic_support(u1, 'chemistry', 'ALL') x limit 1));
select pg_temp.chk('students_n counts only the teacher''s active class students', (select students_n = 11 from r where title = 'حالات المادة'));

create temp table ws as select x.* from ids, tp, lateral public.portal_teacher_mt_topic_students(u1, 'chemistry', tp.id, 'ALL') x where tp.title = 'حالات المادة';
select pg_temp.chk('weak students: the 10 who missed first try, with counts', (select count(*) = 10 and bool_and(wrong_n = 1 and tried_n = 2) from ws));
select pg_temp.chk('weak students includes S1 (first try wrong even though they retried correctly)', (select count(*) = 1 from ws where full_name = 'zz_ts_1'));
select pg_temp.chk('weak students excludes the 9/92 student', (select count(*) = 0 from ws where full_name = 'zz_ts_12'));

-- الدرجات والنقاط لم تتغير: الطالب 1 صحيح في السؤالين 1(إعادة) و2 وفي سؤال فصل => 1.5 نقطة
select pg_temp.chk('points unchanged: 0.5 per first correct answer only (S1 = 1.5)', (select coalesce(quiz_points, 0) = 1.5 from public.portal_mt_points p, ids, s where p.teacher_id = ids.t1 and p.subject_id = ids.chem and p.student_id = s.id and s.n = 1));
select pg_temp.chk('wrong answers give no award', (select count(*) = 0 from public.portal_mt_bank_awards a, s where a.student_id = s.id and s.n = 3 and a.question_id = pg_temp.qid('فصل وتنقية المواد | 02')));

-- توصيات الطالب 1: حالات المادة منتهية؛ الذرات لم يجرّبها (أولوية 2)؛ فصل المواد بقي سؤال (أولوية 3)
create temp table rec1 as select x.* from ids, lateral public.portal_student_mt_recommendations(st1, 'chemistry') x;
select pg_temp.chk('S1 recommendations: untried topic first, then partly done; finished topic omitted',
  (select array_agg(topic_title order by priority, topic_title) = array['الذرات والجزيئات', 'فصل المواد وتنقيتها'] from rec1));
select pg_temp.chk('S1 reason sentences', (select reason = 'لم تجرّب أسئلة هذا الدرس بعد (سؤال واحد)' from rec1 where topic_title = 'الذرات والجزيئات') and (select reason = 'بقي لك سؤال واحد من هذا الدرس' from rec1 where topic_title = 'فصل المواد وتنقيتها'));
-- الطالب 2: أخطأ في سؤال 1 من حالات المادة ولم يصححه => أولوية 1
create temp table rec2 as select x.* from ids, lateral public.portal_student_mt_recommendations(st2, 'chemistry') x;
select pg_temp.chk('S2 wrong-first-try topic is recommended first with a clear reason', (select topic_title = 'حالات المادة' and priority = 1 and wrong_n = 1 and reason = 'أخطأت في سؤال واحد من هذا الدرس، أعد المحاولة' from rec2 order by priority limit 1));
select pg_temp.chk('hidden / ungraded / unmapped questions are never counted as left', (select questions_left = 1 from rec2 where topic_title = 'حالات المادة'));
select pg_temp.chk('recommendations capped at 5 rows', (select count(*) <= 5 from rec2));
select pg_temp.chk('student of another class / teacher gets nothing from teacher 1', (select count(*) = 0 from ids, lateral public.portal_student_mt_recommendations(st12, 'chemistry') x));

-- عزل المعلمين والصلاحيات
select pg_temp.chk('teacher 2 sees nothing of teacher 1', (select count(*) = 0 from ids, lateral public.portal_teacher_mt_topic_support(u2, 'chemistry', 'ALL') x));
select pg_temp.chk('bad / expired / student / null token and bad subject => nothing',
  (select count(*) = 0 from public.portal_teacher_mt_topic_support(gen_random_uuid(), 'chemistry', 'ALL'))
  and (select count(*) = 0 from ids, lateral public.portal_teacher_mt_topic_support(uold, 'chemistry', 'ALL'))
  and (select count(*) = 0 from ids, lateral public.portal_teacher_mt_topic_support(st1, 'chemistry', 'ALL'))
  and (select count(*) = 0 from public.portal_teacher_mt_topic_support(null, 'chemistry', 'ALL'))
  and (select count(*) = 0 from ids, lateral public.portal_teacher_mt_topic_support(u1, 'nope', 'ALL'))
  and (select count(*) = 0 from public.portal_student_mt_recommendations(gen_random_uuid(), 'chemistry'))
  and (select count(*) = 0 from ids, lateral public.portal_student_mt_recommendations(u1, 'chemistry')));
select pg_temp.chk('teacher 2 cannot read weak students of teacher 1 topics', (select count(*) = 0 from ids, tp, lateral public.portal_teacher_mt_topic_students(u2, 'chemistry', tp.id, 'ALL') x where tp.title = 'حالات المادة'));
-- تحديث حي: محاولة جديدة تغيّر التقرير فورًا
select pg_temp.ans_s(n, pg_temp.qid('حالات المادة | 01'), 1) from generate_series(11, 11) n;
select pg_temp.chk('LIVE: a new first-try correct answer by S11 moves accuracy at once (21 tries, 10 wrong)', (select first_try_n = 21 and first_try_wrong_n = 10 from ids, lateral public.portal_teacher_mt_topic_support(u1, 'chemistry', 'ALL') x where x.title = 'حالات المادة'));
select pg_temp.chk('privileges: cores closed, wrappers open, table closed to anon/authenticated',
  (select bool_and(not has_function_privilege('anon', p.oid, 'execute') and not has_function_privilege('authenticated', p.oid, 'execute')) from pg_proc p where p.proname in ('portal__stems', 'portal__bank_topic_map', 'portal__topic_support_core', 'portal__topic_students_core', 'portal__ar_questions', 'portal__bank_gradable'))
  and (select bool_and(has_function_privilege('anon', p.oid, 'execute')) from pg_proc p where p.proname in ('portal_teacher_mt_topic_support', 'portal_teacher_mt_topic_students', 'portal_student_mt_recommendations'))
  and not has_table_privilege('anon', 'public.portal_mt_bank_attempts', 'select') and not has_table_privilege('authenticated', 'public.portal_mt_bank_attempts', 'select')
  and (select relrowsecurity from pg_class where relname = 'portal_mt_bank_attempts'));
select check_name, ok from t_r where not ok order by n;
select 'FAILED: ' || count(*) filter (where not ok) || ' of ' || count(*) as summary from t_r;
rollback;
