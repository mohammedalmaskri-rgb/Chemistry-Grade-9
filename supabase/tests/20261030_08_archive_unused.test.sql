-- اختبار 20261030_08_archive_unused — على نسخة محلية فقط.
-- Run ONLY against a local copy restored from backup. Never against production.
\set QUIET on
set client_min_messages = warning;
create or replace function pg_temp.err(q text) returns text language plpgsql as
 $$ begin execute q; return ''; exception when others then return sqlerrm; end $$;

-- a fake expired session and a live one, so the test does not depend on the copy's dates
insert into public.student_sessions(token, student_id, created_at, expires_at)
select gen_random_uuid(), (select min(id) from public.students), now() - interval '2 days', now() - interval '1 day';
create temp table t_live as select gen_random_uuid() tok, (select min(id) from public.students where is_active) sid;
insert into public.student_sessions(token, student_id, expires_at) select tok, sid, now() + interval '1 hour' from t_live;
create temp table t_tok as select gen_random_uuid() tok;
insert into public.teacher_sessions(token, teacher_id, expires_at) select tok, 1, now() + interval '1 hour' from t_tok;

create temp table t_tabs(n text);
insert into t_tabs values ('grade_cleanup_backup_oral1'),('grade_cleanup_backup_quiz1'),('rawafid_materials_backup_20261027'),('teacher_student_subjects'),('teacher_subjects');
create temp table t_fns(sig text);
insert into t_fns values ('portal_admin_students(uuid,text)'),('portal_teacher_add_student_auto(uuid,text,text)'),
 ('portal_teacher_move_student_class(uuid,bigint,text)'),('portal_teacher_student_logins(text,text)'),('portal_teacher_students(uuid,text)');
create or replace function pg_temp.tabhash(sch text, n text) returns text language plpgsql as
 $$ declare h text; begin execute format('select md5(coalesce(string_agg(t::text, ''|'' order by t::text), '''')) from %I.%I t', sch, n) into h; return h; end $$;

create temp table t_before as
 select 't:' || n k, pg_temp.tabhash('public', n) v from t_tabs
 union all select 'f:' || sig, md5(pg_get_functiondef(('public.' || sig)::regprocedure)) || coalesce((select proacl::text from pg_proc where oid = ('public.' || sig)::regprocedure), '') from t_fns
 union all select 'sessions', pg_temp.tabhash('public', 'student_sessions')
 union all select 'index', (select pg_get_indexdef('public.idx_portal_student_login_events_student_time'::regclass))
 union all select 'teacher2', (select is_active::text from public.teacher_users where id = 2);
create temp table t_act as select id from public.teacher_users where is_active and id <> 2;
create temp table t_exp as select count(*) n from public.student_sessions where expires_at < now();

\i :migration

create temp table t_r(check_name text, ok boolean, detail text default '');
insert into t_r select 'tables moved out of public', bool_and(to_regclass('public.' || n) is null and to_regclass('archive_20261030.' || n) is not null) from t_tabs;
insert into t_r select 'archived table data unchanged', bool_and(pg_temp.tabhash('archive_20261030', n) = (select v from t_before where k = 't:' || n)) from t_tabs;
insert into t_r select 'functions moved out of public', bool_and(to_regprocedure('public.' || sig) is null and to_regprocedure('archive_20261030.' || sig) is not null) from t_fns;
insert into t_r select 'anon cannot reach archive schema',
  not has_schema_privilege('anon', 'archive_20261030', 'usage') and not has_schema_privilege('authenticated', 'archive_20261030', 'usage');
insert into t_r select 'expired sessions archived then removed',
  (select count(*) from archive_20261030.student_sessions_expired) = (select n from t_exp)
  and not exists (select 1 from public.student_sessions where expires_at < now()), (select n from t_exp)::text;
insert into t_r select 'live student session kept', exists (select 1 from public.student_sessions where token = (select tok from t_live));
insert into t_r select 'duplicate index dropped, twin kept',
  to_regclass('public.idx_portal_student_login_events_student_time') is null
  and to_regclass('public.portal_student_login_events_student_idx') is not null;
insert into t_r select 'teacher_test deactivated, other teachers untouched',
  (select not is_active from public.teacher_users where id = 2)
  and not exists (select id from t_act except select id from public.teacher_users where is_active)
  and not exists (select id from public.teacher_users where is_active except select id from t_act);
-- the app's real RPCs still work
insert into t_r select 'app: teacher students_v2 works',
  pg_temp.err(format('select * from public.portal_teacher_students_v2(%L, %L, %L)', (select tok from t_tok), 'chemistry', '9/1')) = '';
insert into t_r select 'app: student me works', (select count(*) = 1 from public.portal_student_me((select tok from t_live)));
insert into t_r select 'app: old names now give "not found"', pg_temp.err(format('select * from public.portal_teacher_students(%L,%L)', (select tok from t_tok), 'ALL')) like '%does not exist%';

\i :rollback
insert into t_r select 'rollback: everything back byte for byte', not exists (
 select 1 from t_before b where b.v is distinct from case
   when b.k like 't:%' then pg_temp.tabhash('public', substr(b.k, 3))
   when b.k like 'f:%' then md5(pg_get_functiondef(('public.' || substr(b.k, 3))::regprocedure)) || coalesce((select proacl::text from pg_proc where oid = ('public.' || substr(b.k, 3))::regprocedure), '')
   when b.k = 'sessions' then pg_temp.tabhash('public', 'student_sessions')
   when b.k = 'index' then (select pg_get_indexdef(to_regclass('public.idx_portal_student_login_events_student_time')))
   when b.k = 'teacher2' then (select is_active::text from public.teacher_users where id = 2) end);
insert into t_r select 'rollback: archive schema gone', to_regnamespace('archive_20261030') is null;

select case when ok is true then 'PASS' else 'FAIL' end as result, check_name, detail from t_r;
select case when bool_and(coalesce(ok, false)) then 'ALL PASSED' else 'FAILURES' end as summary, count(*) as checks from t_r;
