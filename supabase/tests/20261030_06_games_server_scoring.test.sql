-- اختبار 20261030_06_games_server_scoring — على نسخة محلية فقط.
\set QUIET on
set client_min_messages = warning;

create temp table t_fns as select p.oid::regprocedure fn, md5(pg_get_functiondef(p.oid)) h from pg_proc p
where p.oid in ('public.portal_student_mt_games(uuid,text)'::regprocedure, 'public.portal_student_mt_save_game_result(uuid,text,bigint,numeric,boolean)'::regprocedure);

\i :migration

create or replace function pg_temp.err(q text) returns text language plpgsql as $$ begin execute q; return ''; exception when others then return sqlerrm; end $$;
create temp table t_tok as select 'T1'::text who, gen_random_uuid() tok;
insert into public.teacher_sessions(token, teacher_id, expires_at) select tok, 1, now() + interval '1 hour' from t_tok;
create temp table t_stu as select c, gen_random_uuid() tok, (select id from public.students where class_name = c and is_active order by id limit 1) sid
from (values ('9/1'),('9/2'),('7/4')) v(c);
insert into public.student_sessions(token, student_id, expires_at) select tok, sid, now() + interval '1 hour' from t_stu;
create or replace function pg_temp.tt() returns uuid language sql as $$ select tok from t_tok $$;
create or replace function pg_temp.st(c text) returns uuid language sql as $$ select tok from t_stu where t_stu.c = $1 $$;
create or replace function pg_temp.mk(tpl text, payload jsonb, attempts int default 2, reward numeric default 0.5) returns bigint language sql as $$
  select public.portal_teacher_mt_save_game(pg_temp.tt(), 'chemistry', null, tpl, 'اختبار ' || tpl, 'درس', 'ALL', payload, 10, attempts, reward, true) $$;

create temp table t_g as select * from (values
 ('esc',   pg_temp.mk('esc',   '{"rows":[["ما عاصمة عُمان؟","مسقط","تبدأ بالميم"],["ما السائل الذي نشربه؟","ANS_ESC/ماء",""]]}')),
 ('det',   pg_temp.mk('det',   '{"rows":[["ANS_DET","دليل أ","دليل ب","دليل ج"]]}')),
 ('water', pg_temp.mk('water', '{"rows":[["سؤال الماء","ANS_WATER","خطأ1","خطأ2"],["سؤال 2","ANS_W2","x","y"]]}')),
 ('liar',  pg_temp.mk('liar',  '{"rows":[["صحيحة1","صحيحة2","ANS_LIAR"]]}')),
 ('bet',   pg_temp.mk('bet',   '{"rows":[["سؤال الرهان","ANS_BET","خطأ1","خطأ2"]]}')),
 ('fire',  pg_temp.mk('fire',  '{"rows":[["سؤال النار","ANS_FIRE","خطأ1","خطأ2"]]}')),
 ('pic',   pg_temp.mk('pic',   '{"h":["🦁","ANS_PIC_IMAGE"],"rows":[["سؤال الصورة","ANS_PIC_Q"]]}')),
 ('treasure', pg_temp.mk('treasure', '{"rows":[["س","ج"]]}')),
 ('bomb',  pg_temp.mk('bomb',  '{"h":["علي، سالم"],"rows":[["س","ج"]]}'))
) v(tpl, gid);
create or replace function pg_temp.gid(t text) returns bigint language sql as $$ select gid from t_g where tpl = t $$;
create temp table t_r(check_name text, ok boolean, detail text default '');

-- 1) nothing leaks before answering
insert into t_r select 'list: no game content sent to the student',
  not exists (select 1 from public.portal_student_mt_games(pg_temp.st('9/1'), 'chemistry') x where x.payload::text like '%ANS_%' or x.payload ? 'rows'),
  (select count(*) from public.portal_student_mt_games(pg_temp.st('9/1'), 'chemistry'))::text || ' games listed';
create temp table t_start as select tpl, public.portal_student_mt_game_start(pg_temp.st('9/1'), 'chemistry', gid) s from t_g where tpl not in ('treasure','bomb');
insert into t_r select 'start: no question carries an answer field (7 templates)',
  not exists (select 1 from t_start, jsonb_array_elements(s->'questions') q where q ? 'answer' or q ? 'correct'), '';
insert into t_r select 'start: text games (escape, detective, picture) never contain the answer text',
  bool_and(s::text not like '%ANS_%' and s::text not like '%مسقط%'), string_agg(tpl, ',') filter (where s::text like '%ANS_%' or s::text like '%مسقط%')
  from t_start where tpl in ('esc','det','pic');
insert into t_r select 'start: multiple-choice/liar answer only appears as one unmarked option',
  bool_and((select count(*) from jsonb_array_elements(s->'questions') q where (q->'opts')::text like '%ANS_%') = jsonb_array_length(s->'questions')
           and (select count(*) from jsonb_array_elements(s->'questions') q where (q->>'q') like '%ANS_%') = 0), '' from t_start where tpl in ('water','liar','bet','fire');
insert into t_r select 'start: multiple-choice options still complete (shuffled, answer among them)',
  (select jsonb_array_length(s->'questions'->0->'opts') from t_start where tpl = 'water') = 3,
  (select (s->'questions'->0->'opts')::text from t_start where tpl = 'water');
insert into t_r select 'start: classroom games cannot be played individually',
  pg_temp.err(format('select public.portal_student_mt_game_start(%L,%L,%s)', pg_temp.st('9/1'), 'chemistry', pg_temp.gid('treasure'))) like '%جماعية%'
  and pg_temp.err(format('select public.portal_student_mt_game_start(%L,%L,%s)', pg_temp.st('9/1'), 'chemistry', pg_temp.gid('bomb'))) like '%جماعية%';
insert into t_r select 'start again while playing resumes the same attempt',
  (public.portal_student_mt_game_start(pg_temp.st('9/1'), 'chemistry', pg_temp.gid('water'))->>'attempt_id') = (select s->>'attempt_id' from t_start where tpl = 'water');
create or replace function pg_temp.att(t text) returns bigint language sql as $$ select (s->>'attempt_id')::bigint from t_start where tpl = t $$;
create or replace function pg_temp.ans(t text, i int, v text, k text default 'q', c text default '9/1') returns jsonb language sql as $$
  select public.portal_student_mt_game_answer(pg_temp.st(c), 'chemistry', pg_temp.att(t), i, v, k) $$;

-- 2) answer checking on the server
insert into t_r select 'mc: wrong option → wrong, locked, correct answer revealed only now',
  (select r->>'ok' = 'false' and r->>'locked' = 'true' and r->>'answer' = 'ANS_WATER' from (select pg_temp.ans('water', 0, 'خطأ1') r) z);
insert into t_r select 'mc: cannot answer the same question again (no fishing)',
  (select r->>'repeat' = 'true' and r->>'ok' = 'false' from (select pg_temp.ans('water', 0, 'ANS_WATER') r) z);
insert into t_r select 'mc: correct option → correct',
  (select r->>'ok' = 'true' from (select pg_temp.ans('water', 1, 'ANS_W2') r) z);
insert into t_r select 'text: answer hidden while tries remain',
  (select r->>'ok' = 'false' and r->>'locked' = 'false' and r->>'answer' is null and r->>'tries_left' = '2' from (select pg_temp.ans('esc', 0, 'صلالة') r) z);
insert into t_r select 'text: Arabic normalisation (tashkeel, hamza) accepted',
  (select r->>'ok' = 'true' from (select pg_temp.ans('esc', 0, '  مَسقَط ') r) z);
insert into t_r select 'text: alternatives separated by / accepted',
  (select r->>'ok' = 'true' from (select pg_temp.ans('esc', 1, 'ماء') r) z);
insert into t_r select 'det: tries = number of clues, then locked with answer',
  (select (select r->>'locked' from (select pg_temp.ans('det', 0, 'x') r) a) = 'false'
      and (select r->>'locked' from (select pg_temp.ans('det', 0, 'y') r) b) = 'false'
      and (select r->>'locked' = 'true' and r->>'answer' = 'ANS_DET' from (select pg_temp.ans('det', 0, 'z') r) c));
insert into t_r select 'skip (time out / give up) locks the question as wrong',
  (select r->>'ok' = 'false' and r->>'locked' = 'true' and r->>'answer' = 'ANS_FIRE' from (select pg_temp.ans('fire', 0, '', 'skip') r) z);
insert into t_r select 'pic: image guess checked on the server',
  (select r->>'ok' = 'true' from (select pg_temp.ans('pic', -1, 'ans_pic_image', 'image') r) z);
insert into t_r select 'another student cannot answer this attempt',
  pg_temp.err(format('select public.portal_student_mt_game_answer(%L,%L,%s,0,%L)', pg_temp.st('9/2'), 'chemistry', pg_temp.att('bet'), 'ANS_BET')) like '%غير موجودة%';
insert into t_r select 'a 7/4 student cannot even see/start the chemistry game',
  pg_temp.err(format('select public.portal_student_mt_game_start(%L,%L,%s)', pg_temp.st('7/4'), 'chemistry', pg_temp.gid('bet'))) <> '';

-- 3) finish: server score, completion, reward
create temp table t_pts0 as select coalesce((select quiz_points from public.portal_mt_points where teacher_id = 1 and subject_id = 2 and student_id = (select sid from t_stu where c = '9/1')), 0) q;
create temp table t_f1 as select * from public.portal_student_mt_game_finish(pg_temp.st('9/1'), 'chemistry', pg_temp.att('bet'));
insert into t_r select 'finish without answering: not completed, score 0, no reward',
  (select not completed and score = 0 and awarded_points = 0 and correct = 0 and total = 1 from t_f1);
create temp table t_f2 as select * from public.portal_student_mt_game_finish(pg_temp.st('9/1'), 'chemistry', pg_temp.att('water'));
insert into t_r select 'finish after answering all: completed, score = correct × 10, reward once',
  (select completed and score = 10 and correct = 1 and total = 2 and awarded_points = 0.5 from t_f2),
  (select format('score %s, correct %s/%s, reward %s', score, correct, total, awarded_points) from t_f2);
insert into t_r select 'reward added to the subject points exactly once',
  coalesce((select quiz_points from public.portal_mt_points where teacher_id = 1 and subject_id = 2 and student_id = (select sid from t_stu where c = '9/1')), 0) = (select q from t_pts0) + 0.5;
insert into t_r select 'finish twice does not reward twice',
  (select awarded_points = 0 and completed from public.portal_student_mt_game_finish(pg_temp.st('9/1'), 'chemistry', pg_temp.att('water')));
insert into t_r select 'answering after finish is refused',
  pg_temp.err(format('select public.portal_student_mt_game_answer(%L,%L,%s,1,%L)', pg_temp.st('9/1'), 'chemistry', pg_temp.att('water'), 'ANS_W2')) like '%انتهت%';
insert into t_r select 'esc: all doors opened → completed with full score',
  (select completed and score = 20 from public.portal_student_mt_game_finish(pg_temp.st('9/1'), 'chemistry', pg_temp.att('esc')));
insert into t_r select 'pic: image guessed adds one question''s points',
  (select (pg_temp.ans('pic', 0, 'ANS_PIC_Q'))->>'ok' = 'true')
  and (select score = 20 and completed from public.portal_student_mt_game_finish(pg_temp.st('9/1'), 'chemistry', pg_temp.att('pic')));
-- second attempt on water (max 2), then the limit
create temp table t_s2 as select public.portal_student_mt_game_start(pg_temp.st('9/1'), 'chemistry', pg_temp.gid('water')) s;
insert into t_r select 'second attempt allowed and gets a new attempt number',
  (select (s->>'attempt_no')::int = 2 from t_s2);
select public.portal_student_mt_game_finish(pg_temp.st('9/1'), 'chemistry', (select (s->>'attempt_id')::bigint from t_s2)) \g /dev/null
insert into t_r select 'third attempt refused (max 2)',
  pg_temp.err(format('select public.portal_student_mt_game_start(%L,%L,%s)', pg_temp.st('9/1'), 'chemistry', pg_temp.gid('water'))) like '%استنفدت%';
insert into t_r select 'list shows attempts and best server score',
  (select attempts_count = 2 and best_score = 10 from public.portal_student_mt_games(pg_temp.st('9/1'), 'chemistry') where id = pg_temp.gid('water'));

-- 4) the old save path is closed; teacher side still works
insert into t_r select 'old save function refused (cannot submit any score)',
  pg_temp.err(format('select * from public.portal_student_mt_save_game_result(%L,%L,%s,100000,true)', pg_temp.st('9/1'), 'chemistry', pg_temp.gid('liar'))) like '%تحديث نظام الألعاب%';
insert into t_r select 'teacher results show server scores',
  (select bool_and(score in (0, 10)) and count(*) = 2 from public.portal_teacher_mt_game_results(pg_temp.tt(), 'chemistry', pg_temp.gid('water')));
create temp table t_del as select public.portal_teacher_mt_delete_game(pg_temp.tt(), 'chemistry', pg_temp.gid('bet')) ok;
insert into t_r select 'teacher delete removes the game and its attempts',
  (select ok from t_del) and not exists (select 1 from public.portal_mt_game_attempts where game_id = pg_temp.gid('bet'))
  and not exists (select 1 from public.portal_mt_games where id = pg_temp.gid('bet'));
insert into t_r select 'helpers not callable by the site; new RPCs are',
  not has_function_privilege('anon', 'public._rg_questions(text,jsonb)', 'execute')
  and has_function_privilege('anon', 'public.portal_student_mt_game_answer(uuid,text,bigint,integer,text,text)', 'execute');

\i :rollback
insert into t_r select 'rollback restores the 2 original functions', not exists (select 1 from t_fns where md5(pg_get_functiondef(fn)) <> h);
insert into t_r select 'rollback removes new functions and columns',
  to_regprocedure('public.portal_student_mt_game_start(uuid,text,bigint)') is null
  and not exists (select 1 from information_schema.columns where table_name = 'portal_mt_game_attempts' and column_name in ('status','answers'));

select case when ok then 'PASS' else 'FAIL' end as result, check_name, left(coalesce(detail,''), 120) detail from t_r;
select case when bool_and(ok) then 'ALL PASSED' else 'FAILURES' end as summary, count(*) as checks from t_r;
