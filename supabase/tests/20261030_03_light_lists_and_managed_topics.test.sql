-- اختبار 20261030_03_light_lists_and_managed_topics — على نسخة محلية فقط.
-- usage: psql -v ON_ERROR_STOP=1 -v migration=... -v rollback=... -f this_file
\set QUIET on
set client_min_messages = warning;

create temp table t_tok as select tid, gen_random_uuid() tok from (values (1),(4),(5)) v(tid);
insert into public.teacher_sessions(token, teacher_id, expires_at) select tok, tid, now() + interval '1 hour' from t_tok;
create or replace function pg_temp.tok(t int) returns uuid language sql as $$ select tok from t_tok where tid = t $$;
create temp table t_stu as select c, gen_random_uuid() tok,
  (select id from public.students where class_name = c and is_active order by id limit 1) sid from (values ('9/1'),('7/4')) v(c);
insert into public.student_sessions(token, student_id, expires_at) select tok, sid, now() + interval '1 hour' from t_stu;
create or replace function pg_temp.stok(c text) returns uuid language sql as $$ select tok from t_stu where t_stu.c = $1 $$;

\i :migration

create temp table t_r(check_name text, ok boolean, detail text default '');

-- 1) teacher materials list
create temp table t_old as select * from public.portal_teacher_mt_lesson_materials(pg_temp.tok(1), 'chemistry', null);
create temp table t_new as select * from public.portal_teacher_mt_lesson_materials_list(pg_temp.tok(1), 'chemistry', null);
insert into t_r select 'list: same materials, same order, same metadata',
  (select array_agg(id order by ord) from (select id, row_number() over () ord from t_old) a)
  = (select array_agg(id order by ord) from (select id, row_number() over () ord from t_new) b)
  and not exists (select o.id from t_old o join t_new n using (id)
                  where (o.topic_id, o.topic_title, o.material_type, o.title, o.note, o.attachment_name, o.attachment_mime, o.target_class, o.is_visible, o.created_at)
                        is distinct from (n.topic_id, n.topic_title, n.material_type, n.title, n.note, n.attachment_name, n.attachment_mime, n.target_class, n.is_visible, n.created_at)),
  (select count(*) from t_new)::text || ' materials';
insert into t_r select 'list: has_attachment and size match the real file',
  not exists (select 1 from t_old o join t_new n using (id)
              where n.has_attachment <> (coalesce(length(o.attachment_data), 0) > 0)
                 or n.attachment_bytes <> coalesce(octet_length(o.attachment_data), 0));
insert into t_r select 'list: response size before → after',
  (select sum(octet_length(t::text)) from t_new t) * 100 < (select sum(octet_length(t::text)) from t_old t),
  pg_size_pretty((select sum(octet_length(t::text)) from t_old t)::bigint) || ' → ' || pg_size_pretty((select sum(octet_length(t::text)) from t_new t)::bigint);
insert into t_r select 'list: filter by lesson works',
  (select count(*) from public.portal_teacher_mt_lesson_materials_list(pg_temp.tok(1), 'chemistry', (select topic_id from t_new where topic_id is not null limit 1)))
  = (select count(*) from t_new where topic_id = (select topic_id from t_new where topic_id is not null limit 1));
insert into t_r select 'list: another chemistry teacher sees none of these',
  not exists (select 1 from public.portal_teacher_mt_lesson_materials_list(pg_temp.tok(4), 'chemistry', null) x where x.id in (select id from t_new));
insert into t_r select 'list: wrong subject returns nothing',
  (select count(*) from public.portal_teacher_mt_lesson_materials_list(pg_temp.tok(1), 'physics', null)) = 0;

-- 2) student content check = what the old per-lesson calls would find
create temp table t_expect as
select lt.id topic_id, m.material_type, count(*) items
from public.portal_student_mt_learning_topics(pg_temp.stok('9/1'), 'chemistry') lt
cross join lateral public.portal_student_mt_lesson_materials(pg_temp.stok('9/1'), 'chemistry', lt.id) m
group by 1, 2;
create temp table t_got as select * from public.portal_student_mt_material_topics(pg_temp.stok('9/1'), 'chemistry');
insert into t_r select 'student: same lessons/types/counts as the old full check',
  not exists ((select topic_id, material_type, items from t_expect except select topic_id, material_type, items from t_got)
              union all (select topic_id, material_type, items from t_got except select topic_id, material_type, items from t_expect)),
  (select count(distinct topic_id) from t_got)::text || ' lessons with content';
insert into t_r select 'student: 7/4 science student sees no chemistry content',
  (select count(*) from public.portal_student_mt_material_topics(pg_temp.stok('7/4'), 'chemistry')) = 0;

-- 3) «دروسي»
insert into t_r select 'topics: chemistry teacher sees his used lessons',
  count(*) > 0 and bool_and(is_used) and not bool_or(is_manual), count(*)::text
  from public.portal_teacher_mt_managed_topics(pg_temp.tok(1), 'chemistry');
insert into t_r select 'topics: science teacher with nothing used sees an empty box',
  count(*) = 0, count(*)::text from public.portal_teacher_mt_managed_topics(pg_temp.tok(5), 'science');
create temp table t_new_topic as select public.portal_teacher_mt_add_topic(pg_temp.tok(5), 'science', 9, 'وحدة تجريبية', 'X-1', 'درس أضافه المعلم', 1) id;
insert into t_r select 'topics: a lesson the teacher adds appears and is deletable',
  exists (select 1 from public.portal_teacher_mt_managed_topics(pg_temp.tok(5), 'science') x where x.id = (select id from t_new_topic) and x.is_manual and not x.is_used);
insert into public.portal_mt_lesson_plans(teacher_id, subject_id, class_name, topic_id, objectives)
select 5, 1, '7/4', t.id, 'اختبار' from public.portal_mt_topics t where t.teacher_id = 5 and t.subject_id = 1 and t.is_active and t.id <> (select id from t_new_topic) order by t.id limit 1;
insert into t_r select 'topics: a curriculum lesson appears once used, not deletable',
  exists (select 1 from public.portal_teacher_mt_managed_topics(pg_temp.tok(5), 'science') x where x.is_used and not x.is_manual);
select public.portal_teacher_mt_deactivate_topic(pg_temp.tok(5), 'science', (select id from t_new_topic)) \g /dev/null
insert into t_r select 'topics: hidden lesson disappears',
  not exists (select 1 from public.portal_teacher_mt_managed_topics(pg_temp.tok(5), 'science') x where x.id = (select id from t_new_topic));
insert into t_r select 'topics: other teacher sees none of T5 lessons',
  not exists (select 1 from public.portal_teacher_mt_managed_topics(pg_temp.tok(4), 'science') x
              join public.portal_mt_topics t on t.id = x.id where t.teacher_id = 5);

-- 4) grants
insert into t_r select 'grants: callable by the site, not by public',
  has_function_privilege('anon', 'public.portal_teacher_mt_lesson_materials_list(uuid,text,bigint)', 'execute')
  and has_function_privilege('anon', 'public.portal_student_mt_material_topics(uuid,text)', 'execute')
  and has_function_privilege('anon', 'public.portal_teacher_mt_managed_topics(uuid,text)', 'execute')
  and not has_function_privilege('public', 'public.portal_teacher_mt_managed_topics(uuid,text)', 'execute');

-- 5) rollback
\i :rollback
insert into t_r select 'rollback removes the 3 new functions',
  to_regprocedure('public.portal_teacher_mt_lesson_materials_list(uuid,text,bigint)') is null
  and to_regprocedure('public.portal_student_mt_material_topics(uuid,text)') is null
  and to_regprocedure('public.portal_teacher_mt_managed_topics(uuid,text)') is null;
insert into t_r select 'rollback leaves the old functions working',
  (select count(*) from public.portal_teacher_mt_lesson_materials(pg_temp.tok(1), 'chemistry', null)) = (select count(*) from t_old);

select case when ok then 'PASS' else 'FAIL' end as result, check_name, detail from t_r;
select case when bool_and(ok) then 'ALL PASSED' else 'FAILURES' end as summary, count(*) as checks from t_r;
