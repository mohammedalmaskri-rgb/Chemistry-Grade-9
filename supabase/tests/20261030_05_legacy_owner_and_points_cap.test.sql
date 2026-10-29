-- اختبار 20261030_05_legacy_owner_and_points_cap — على نسخة محلية فقط.
\set QUIET on
set client_min_messages = warning;

create temp table t_tok as select tid, gen_random_uuid() tok from (values (1),(5)) v(tid);
insert into public.teacher_sessions(token, teacher_id, expires_at) select tok, tid, now() + interval '1 hour' from t_tok;
create or replace function pg_temp.tok(t int) returns uuid language sql as $$ select tok from t_tok where tid = t $$;

-- the 40 legacy functions (same selection as the migration)
create temp table t_fns as
select p.oid::regprocedure fn, p.proname, p.proretset is_set, p.prolang = (select oid from pg_language where lanname='plpgsql') is_pl,
       md5(pg_get_functiondef(p.oid)) h, has_function_privilege('anon', p.oid, 'execute') anon_x,
       p.proname ~ '_(add|delete|set|update|save|reply|resolve|adjust)_' or p.proname ~ '^portal_teacher_(add|delete|set|update|save|reply|resolve|adjust)_' as writes
from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'portal_teacher\_%' and p.proname not like '%\_mt\_%'
  and p.proname not in ('portal_teacher_reset_student_password','portal_teacher_delete_student','portal_teacher_move_student','portal_teacher_move_student_class',
   'portal_teacher_update_student_name','portal_teacher_add_student','portal_teacher_add_student_auto','portal_teacher_find_student_account','portal_teacher_students',
   'portal_teacher_student_logins','portal_teacher_student_logins_v2','portal_teacher_points_overview','portal_teacher_login','portal_teacher_me',
   'portal_teacher_change_password','portal_teacher_assignments','portal_teacher_students_v2');
insert into t_fns select p.oid::regprocedure, p.proname, p.proretset, true, md5(pg_get_functiondef(p.oid)), has_function_privilege('anon', p.oid, 'execute'), true
from pg_proc p where p.oid = 'public.portal_teacher_mt_adjust_points(uuid,text,bigint,numeric)'::regprocedure;

-- build a call from the signature: token, real ids, '9/1', etc.
create or replace function pg_temp.args(f regprocedure, t int) returns text language plpgsql as $$
declare a text; n text; ty text; out text[] := '{}';
begin
  for n, ty in select unnest(p.proargnames[1:p.pronargs]), format_type(unnest(p.proargtypes::oid[]), null) from pg_proc p where p.oid = f loop
    a := case
      when n = 'p_token' then quote_literal(pg_temp.tok(t)) || '::' || ty
      when n = 'p_subject_code' then quote_literal('chemistry')
      when n in ('p_class','p_target_class') then quote_literal('9/1')
      when n in ('p_kind','p_status') then 'null::text'
      when n = 'p_query' then quote_literal('')
      when n = 'p_topic_id' then (select id::text from public.curriculum_topics order by id limit 1)
      when n = 'p_student_id' then (select id::text from public.students where class_name = '9/1' order by id limit 1)
      when ty in ('bigint','integer','numeric') then '1::' || ty
      when ty = 'boolean' then 'true'
      when ty like 'timestamp%' then 'now()'
      else quote_literal('اختبار') || '::' || ty end;
    out := out || a;
  end loop;
  return array_to_string(out, ', ');
end $$;
create or replace function pg_temp.call(f regprocedure, is_set boolean, t int) returns text language plpgsql as $$
declare r text;
begin
  if is_set then execute format('select coalesce(md5(string_agg(to_jsonb(x)::text, %L)), %L) from %s(%s) x', '|', 'EMPTY', f::oid::regproc, pg_temp.args(f, t)) into r;
  else execute format('select coalesce(to_jsonb(%s(%s))::text, %L)', f::oid::regproc, pg_temp.args(f, t), 'NULL') into r; end if;
  return r;
exception when others then return 'ERR:' || sqlerrm;
end $$;

-- fingerprint of every old chemistry table (lesson files by id+length to keep it light)
create or replace function pg_temp.legacy_fp() returns text language sql as $$
  select md5(concat_ws('#',
    (select md5(string_agg(x::text, '' order by x.id)) from public.announcements x),
    (select count(*) from public.announcement_reads),
    (select md5(string_agg(x::text, '' order by x.id)) from public.content_items x),
    (select md5(string_agg(x::text, '' order by x.id)) from public.portal_experiments x),
    (select md5(string_agg(id || ':' || coalesce(length(attachment_data),0) || ':' || is_visible, '' order by id)) from public.lesson_materials),
    (select md5(string_agg(x::text, '' order by x.id)) from public.portal_question_bank x),
    (select md5(string_agg(x::text, '' order by x.id)) from public.student_grades x),
    (select md5(string_agg(id || ':' || coalesce(points,0), '' order by id)) from public.students),
    (select count(*) from public.portal_points_audit),
    (select md5(string_agg(x::text, '' order by x.id)) from public.student_questions x),
    (select md5(string_agg(x::text, '' order by x.id)) from public.portal_behavior_records x),
    (select md5(string_agg(x::text, '' order by x.class_name, x.topic_id)) from public.class_lesson_plans x),
    (select md5(string_agg(x::text, '' order by x.class_name)) from public.class_progress x),
    (select md5(string_agg(x::text, '' order by x.id)) from public.portal_videos x),
    (select md5(string_agg(x::text, '' order by x.id)) from public.curriculum_topics x)))
$$;

-- BEFORE: chemistry teacher read outputs
create temp table t_before as select fn, pg_temp.call(fn, is_set, 1) r from t_fns where not writes;

\i :migration

create temp table t_r(check_name text, ok boolean, detail text default '');
insert into t_r select 'all 40 legacy functions + points function carry the guard',
  (select count(*) from t_fns where proname <> 'portal_teacher_mt_adjust_points'
     and pg_get_functiondef(fn::regprocedure) like '%_portal_is_legacy_owner%') = 40, '';

-- grade-7 teacher: every function returns nothing and no old table changes
create temp table t_fp0 as select pg_temp.legacy_fp() fp;
create temp table t_t5 as select proname, writes, pg_temp.call(fn, is_set, 5) r from t_fns where proname <> 'portal_teacher_mt_adjust_points';
insert into t_r select 'grade-7 teacher: all 40 return empty/null (no data, no error)',
  bool_and(r in ('EMPTY','NULL')), string_agg(proname || '=' || r, '; ') filter (where r not in ('EMPTY','NULL')) from t_t5;
insert into t_r select 'grade-7 teacher: old chemistry tables unchanged after calling all write functions',
  pg_temp.legacy_fp() = (select fp from t_fp0);

-- chemistry teacher: identical read outputs
insert into t_r select 'chemistry teacher: all read functions return the same as before',
  bool_and(b.r = pg_temp.call(b.fn, f.is_set, 1)), count(*)::text || ' read functions'
  from t_before b join t_fns f using (fn);
insert into t_r select 'chemistry teacher: old video library still works (add + list)',
  public.portal_teacher_add_video(pg_temp.tok(1), 'فيديو اختبار', 'درس', '', 'https://www.youtube.com/watch?v=ccccccccccc', 'ALL', false) is not null
  and exists (select 1 from public.portal_teacher_videos(pg_temp.tok(1)) v where v.title = 'فيديو اختبار');
insert into t_r select 'helper not callable by the site',
  not has_function_privilege('anon', 'public._portal_is_legacy_owner(text)', 'execute');
insert into t_r select 'invalid token text is simply rejected',
  not public._portal_is_legacy_owner('not-a-uuid') and not public._portal_is_legacy_owner(null);

-- points cap
create or replace function pg_temp.err(q text) returns text language plpgsql as $$ begin execute q; return ''; exception when others then return sqlerrm; end $$;
create temp table t_s as select id from public.students where class_name = '9/1' and is_active order by id limit 1;
insert into t_r select 'points: +101 refused with a clear message',
  pg_temp.err(format('select public.portal_teacher_mt_adjust_points(%L,%L,%s,101)', pg_temp.tok(1), 'chemistry', (select id from t_s))) like '%100 نقطة%';
insert into t_r select 'points: -101 refused', pg_temp.err(format('select public.portal_teacher_mt_adjust_points(%L,%L,%s,-101)', pg_temp.tok(1), 'chemistry', (select id from t_s))) <> '';
insert into t_r select 'points: +5 and -100 still work',
  public.portal_teacher_mt_adjust_points(pg_temp.tok(1), 'chemistry', (select id from t_s), 5) is not null
  and public.portal_teacher_mt_adjust_points(pg_temp.tok(1), 'chemistry', (select id from t_s), -100) is not null;
insert into t_r select 'points: still blocked for a student outside the teacher''s classes',
  public.portal_teacher_mt_adjust_points(pg_temp.tok(5), 'science', (select id from t_s), 5) is null;

insert into t_r select 'grants unchanged', not exists (select 1 from t_fns where anon_x <> has_function_privilege('anon', fn, 'execute'));
\i :rollback
insert into t_r select 'rollback restores all 41 definitions', not exists (select 1 from t_fns where md5(pg_get_functiondef(fn)) <> h), '';
insert into t_r select 'rollback removes the helper', to_regprocedure('public._portal_is_legacy_owner(text)') is null;
insert into t_r select 'after rollback the grade-7 teacher can read old data again (test is meaningful)',
  pg_temp.call('public.portal_teacher_question_bank(uuid)'::regprocedure, true, 5) <> 'EMPTY';

select case when ok then 'PASS' else 'FAIL' end as result, check_name, left(coalesce(detail,''), 300) detail from t_r;
select case when bool_and(ok) then 'ALL PASSED' else 'FAILURES' end as summary, count(*) as checks from t_r;
