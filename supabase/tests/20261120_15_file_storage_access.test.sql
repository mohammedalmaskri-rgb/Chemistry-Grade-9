-- اختبار 20261120_15_file_storage_access — على نسخة محلية أو قاعدة اختبار فقط. لا يُشغَّل على الإنتاج.
-- Run ONLY against a local copy / isolated test DB, AFTER applying migrations/20261120_15_file_storage_access.sql.
-- Self-contained: creates its own fake admin/teachers/students/rows (prefix zz_fs_) and rolls everything back.
\set QUIET on
\set ON_ERROR_STOP on
set client_min_messages = warning;
begin;
create temp table t_r(n serial, check_name text, ok boolean);
create or replace function pg_temp.chk(name text, ok boolean) returns void language sql as $$ insert into t_r(check_name, ok) values (name, coalesce(ok, false)) $$;

insert into public.portal_admin_users(username, full_name, password_hash, is_active) values ('zz_fs_adm', 'مشرف', 'x', true);
insert into public.teacher_users(username, full_name, password_hash, is_active, must_change_password)
  values ('zz_fs_t1', 'معلم 1', 'x', true, false), ('zz_fs_t2', 'معلم 2', 'x', true, false);
insert into public.students(full_name, class_name, username, password_hash, is_active, must_change_password, points)
  values ('طالب 1', '9/1', 'zz_fs_s1', 'x', true, false, 0), ('طالب 2', '9/2', 'zz_fs_s2', 'x', true, false, 0), ('طالب موقوف', '9/1', 'zz_fs_s3', 'x', false, false, 0);

create temp table ids as select
  (select id from public.portal_admin_users where username = 'zz_fs_adm') adm,
  (select id from public.teacher_users where username = 'zz_fs_t1') t1,
  (select id from public.teacher_users where username = 'zz_fs_t2') t2,
  (select id from public.students where username = 'zz_fs_s1') s1,
  (select id from public.students where username = 'zz_fs_s2') s2,
  (select id from public.students where username = 'zz_fs_s3') s3,
  (select id from public.subjects where code = 'chemistry') chem,
  gen_random_uuid() u_adm, gen_random_uuid() u_t1, gen_random_uuid() u_t2, gen_random_uuid() u_t1_old,
  gen_random_uuid() u_s1, gen_random_uuid() u_s2, gen_random_uuid() u_s3,
  gen_random_uuid() f1, gen_random_uuid() f2, gen_random_uuid() f3, gen_random_uuid() f4, gen_random_uuid() f5, gen_random_uuid() f6;

insert into public.portal_admin_sessions(token, admin_id, expires_at) select u_adm, adm, now() + interval '1 hour' from ids;
insert into public.teacher_sessions(token, teacher_id, expires_at) select u_t1, t1, now() + interval '1 hour' from ids;
insert into public.teacher_sessions(token, teacher_id, expires_at) select u_t2, t2, now() + interval '1 hour' from ids;
insert into public.teacher_sessions(token, teacher_id, created_at, expires_at) select u_t1_old, t1, now() - interval '2 hours', now() - interval '1 hour' from ids;
insert into public.student_sessions(token, student_id, expires_at) select u_s1, s1, now() + interval '1 hour' from ids;
insert into public.student_sessions(token, student_id, expires_at) select u_s2, s2, now() + interval '1 hour' from ids;
insert into public.student_sessions(token, student_id, expires_at) select u_s3, s3, now() + interval '1 hour' from ids;

insert into public.teacher_class_subjects(teacher_id, subject_id, class_name, is_active) select t1, chem, '9/1', true from ids;
insert into public.teacher_class_subjects(teacher_id, subject_id, class_name, is_active) select t2, chem, '9/2', true from ids;
insert into public.portal_mt_topics(teacher_id, subject_id, unit_no, unit_title, title, is_active) select t1, chem, 1, 'u', 'zz_fs_topic', true from ids;

-- materials: M1 ok, M2 hidden, M3 for class 9/2 only, M4 still inline, M5 (teacher 2) crafted reference into teacher 1's folder
create temp table m as select 1 as n, 0::bigint as id;
truncate m;
insert into public.portal_mt_materials(teacher_id, subject_id, topic_id, material_type, title, attachment_data, attachment_name, attachment_mime, target_class, is_visible)
select t1, chem, (select id from public.portal_mt_topics where title = 'zz_fs_topic'), 'summary', 'zz_fs_m1', 'storage:materials/' || t1 || '/' || f1 || '.pdf', 'a.pdf', 'application/pdf', 'ALL', true from ids;
insert into public.portal_mt_materials(teacher_id, subject_id, topic_id, material_type, title, attachment_data, attachment_name, attachment_mime, target_class, is_visible)
select t1, chem, (select id from public.portal_mt_topics where title = 'zz_fs_topic'), 'summary', 'zz_fs_m2', 'storage:materials/' || t1 || '/' || f2 || '.pdf', 'b.pdf', 'application/pdf', 'ALL', false from ids;
insert into public.portal_mt_materials(teacher_id, subject_id, topic_id, material_type, title, attachment_data, attachment_name, attachment_mime, target_class, is_visible)
select t1, chem, (select id from public.portal_mt_topics where title = 'zz_fs_topic'), 'summary', 'zz_fs_m3', 'storage:materials/' || t1 || '/' || f3 || '.pdf', 'c.pdf', 'application/pdf', '9/2', true from ids;
insert into public.portal_mt_materials(teacher_id, subject_id, topic_id, material_type, title, attachment_data, attachment_name, attachment_mime, target_class, is_visible)
select t1, chem, (select id from public.portal_mt_topics where title = 'zz_fs_topic'), 'summary', 'zz_fs_m4', 'data:application/pdf;base64,QUJDREVGRw==', 'd.pdf', 'application/pdf', 'ALL', true from ids;
insert into public.portal_mt_materials(teacher_id, subject_id, topic_id, material_type, title, attachment_data, attachment_name, attachment_mime, target_class, is_visible)
select t2, chem, (select id from public.portal_mt_topics where title = 'zz_fs_topic'), 'summary', 'zz_fs_m5', 'storage:materials/' || t1 || '/' || f4 || '.pdf', 'e.pdf', 'application/pdf', 'ALL', true from ids;

insert into public.portal_mt_content(teacher_id, subject_id, kind, title, link_url, target_class)
select t1, chem, 'file', 'zz_fs_c1', 'storage:content/' || t1 || '/' || f5 || '.pdf', 'ALL' from ids;
insert into public.portal_mt_questions(teacher_id, subject_id, student_id, question_text, attachment_url, status)
select t1, chem, s1, 'zz_fs_q1', 'storage:questions/' || s1 || '/' || f6 || '.jpg', 'new' from ids;
insert into public.portal_mt_questions(teacher_id, subject_id, student_id, question_text, attachment_url, status)
select t1, chem, s1, 'zz_fs_q2', 'data:image/jpeg;base64,/9j/4AAQ', 'new' from ids;

create or replace function pg_temp.mid(t text) returns bigint language sql as $$ select id from public.portal_mt_materials where title = t $$;
create or replace function pg_temp.info(tok uuid, k text, i bigint) returns text language sql as $$ select storage_path from public.portal_file_read_info(tok, k, i) $$;

-- ---- principal
select pg_temp.chk('principal: teacher', (select role = 'teacher' and user_id = ids.t1 from ids, public.portal_file_principal(ids.u_t1)));
select pg_temp.chk('principal: student', (select role = 'student' and user_id = ids.s1 from ids, public.portal_file_principal(ids.u_s1)));
select pg_temp.chk('principal: admin', (select role = 'admin' and user_id = ids.adm from ids, public.portal_file_principal(ids.u_adm)));
select pg_temp.chk('principal: unknown token -> nothing', (select count(*) = 0 from public.portal_file_principal(gen_random_uuid())));
select pg_temp.chk('principal: null token -> nothing', (select count(*) = 0 from public.portal_file_principal(null)));
select pg_temp.chk('principal: expired teacher session -> nothing', (select count(*) = 0 from ids, public.portal_file_principal(ids.u_t1_old)));
select pg_temp.chk('principal: inactive student -> nothing', (select count(*) = 0 from ids, public.portal_file_principal(ids.u_s3)));

-- ---- materials
select pg_temp.chk('materials: owner teacher can read', (select pg_temp.info(u_t1, 'materials', pg_temp.mid('zz_fs_m1')) = 'materials/' || t1 || '/' || f1 || '.pdf' from ids));
select pg_temp.chk('materials: student of the class can read a visible one', (select pg_temp.info(u_s1, 'materials', pg_temp.mid('zz_fs_m1')) is not null from ids));
select pg_temp.chk('materials: hidden one is not readable by the student', (select pg_temp.info(u_s1, 'materials', pg_temp.mid('zz_fs_m2')) is null from ids));
select pg_temp.chk('materials: hidden one is still readable by its teacher', (select pg_temp.info(u_t1, 'materials', pg_temp.mid('zz_fs_m2')) is not null from ids));
select pg_temp.chk('materials: student of another class cannot read', (select pg_temp.info(u_s2, 'materials', pg_temp.mid('zz_fs_m1')) is null from ids));
select pg_temp.chk('materials: file for another class only is not readable by this class', (select pg_temp.info(u_s1, 'materials', pg_temp.mid('zz_fs_m3')) is null from ids));
select pg_temp.chk('materials: a class taught by ANOTHER teacher cannot read, even when target_class matches', (select pg_temp.info(u_s2, 'materials', pg_temp.mid('zz_fs_m3')) is null from ids));
select pg_temp.chk('materials: other teacher cannot read', (select pg_temp.info(u_t2, 'materials', pg_temp.mid('zz_fs_m1')) is null from ids));
select pg_temp.chk('materials: inactive student cannot read', (select pg_temp.info(u_s3, 'materials', pg_temp.mid('zz_fs_m1')) is null from ids));
select pg_temp.chk('materials: admin can read', (select pg_temp.info(u_adm, 'materials', pg_temp.mid('zz_fs_m1')) is not null from ids));
select pg_temp.chk('materials: row still holding inline data -> nothing (front end uses the data itself)', (select pg_temp.info(u_t1, 'materials', pg_temp.mid('zz_fs_m4')) is null from ids));
select pg_temp.chk('materials: crafted reference into another teacher''s folder -> nothing, even for its row owner and admin', (select pg_temp.info(u_t2, 'materials', pg_temp.mid('zz_fs_m5')) is null and pg_temp.info(u_adm, 'materials', pg_temp.mid('zz_fs_m5')) is null from ids));
select pg_temp.chk('materials: unknown token / expired token -> nothing', (select pg_temp.info(gen_random_uuid(), 'materials', pg_temp.mid('zz_fs_m1')) is null and pg_temp.info(u_t1_old, 'materials', pg_temp.mid('zz_fs_m1')) is null from ids));
select pg_temp.chk('materials: file name and mime come from the row', (select file_name = 'a.pdf' and mime = 'application/pdf' from ids, public.portal_file_read_info(ids.u_t1, 'materials', pg_temp.mid('zz_fs_m1'))));

-- ---- content
select pg_temp.chk('content: owner + class student + admin can read', (select pg_temp.info(u_t1, 'content', c.id) is not null and pg_temp.info(u_s1, 'content', c.id) is not null and pg_temp.info(u_adm, 'content', c.id) is not null from ids, public.portal_mt_content c where c.title = 'zz_fs_c1'));
select pg_temp.chk('content: other class / other teacher cannot read', (select pg_temp.info(u_s2, 'content', c.id) is null and pg_temp.info(u_t2, 'content', c.id) is null from ids, public.portal_mt_content c where c.title = 'zz_fs_c1'));

-- ---- questions
select pg_temp.chk('questions: asking student, its teacher and admin can read', (select pg_temp.info(u_s1, 'questions', q.id) is not null and pg_temp.info(u_t1, 'questions', q.id) is not null and pg_temp.info(u_adm, 'questions', q.id) is not null from ids, public.portal_mt_questions q where q.question_text = 'zz_fs_q1'));
select pg_temp.chk('questions: another student and another teacher cannot read', (select pg_temp.info(u_s2, 'questions', q.id) is null and pg_temp.info(u_t2, 'questions', q.id) is null from ids, public.portal_mt_questions q where q.question_text = 'zz_fs_q1'));
select pg_temp.chk('questions: inline image row -> nothing', (select pg_temp.info(u_s1, 'questions', q.id) is null from ids, public.portal_mt_questions q where q.question_text = 'zz_fs_q2'));

-- ---- bad input
select pg_temp.chk('read_info: unknown kind / null id / missing id -> nothing', (select pg_temp.info(u_adm, 'videos', 1) is null and pg_temp.info(u_adm, 'materials', null) is null and pg_temp.info(u_adm, 'materials', -5) is null from ids));

-- ---- legacy migration helpers
select pg_temp.chk('legacy_pending: only admin', (select (select count(*) from public.portal_file_legacy_pending(u_adm)) = 3 and (select count(*) from public.portal_file_legacy_pending(u_t1)) = 0 and (select count(*) from public.portal_file_legacy_pending(u_s1)) = 0 from ids));
select pg_temp.chk('legacy_pending: counts the inline test rows', (select coalesce(sum(files), 0) >= 2 from ids, public.portal_file_legacy_pending(ids.u_adm)));
select pg_temp.chk('legacy_batch: only admin, smallest first, capped at 5', (select (select count(*) from public.portal_file_legacy_batch(u_t1, 3)) = 0 and (select count(*) from public.portal_file_legacy_batch(u_adm, 100)) <= 5
  and (select length(data) from public.portal_file_legacy_batch(u_adm, 3) limit 1) = (select min(length(data)) from public.portal_file_legacy_batch(u_adm, 5)) from ids));
select pg_temp.chk('legacy_batch: p_skip steps over earlier files (and is capped)', (select (select count(*) from public.portal_file_legacy_pending(u_adm)) = 3
  and (select (kind, id)::text from public.portal_file_legacy_batch(u_adm, 1, 0)) <> (select (kind, id)::text from public.portal_file_legacy_batch(u_adm, 1, 1))
  and (select count(*) from public.portal_file_legacy_batch(u_adm, 3, 100000)) = 0 from ids));
select pg_temp.chk('legacy_set: non-admin refused', (select not public.portal_file_legacy_set(u_t1, 'materials', pg_temp.mid('zz_fs_m4'), 'materials/' || t1 || '/' || gen_random_uuid() || '.pdf', length(m.attachment_data)) from ids, public.portal_mt_materials m where m.title = 'zz_fs_m4'));
select pg_temp.chk('legacy_set: wrong expected length -> not changed', (select not public.portal_file_legacy_set(u_adm, 'materials', m.id, 'materials/' || t1 || '/' || gen_random_uuid() || '.pdf', 1) and m.attachment_data like 'data:%' from ids, public.portal_mt_materials m where m.title = 'zz_fs_m4'));
select pg_temp.chk('legacy_set: path in another owner''s folder -> refused', (select not public.portal_file_legacy_set(u_adm, 'materials', m.id, 'materials/' || t2 || '/' || gen_random_uuid() || '.pdf', length(m.attachment_data)) from ids, public.portal_mt_materials m where m.title = 'zz_fs_m4'));
select pg_temp.chk('legacy_set: malformed path -> refused', (select not public.portal_file_legacy_set(u_adm, 'materials', m.id, '../../etc/x.pdf', length(m.attachment_data)) and not public.portal_file_legacy_set(u_adm, 'materials', m.id, 'content/' || t1 || '/' || gen_random_uuid() || '.pdf', length(m.attachment_data)) from ids, public.portal_mt_materials m where m.title = 'zz_fs_m4'));
create temp table newp as select 'materials/' || t1 || '/' || gen_random_uuid() || '.pdf' as p from ids;
select pg_temp.chk('legacy_set: correct call switches the row', (select public.portal_file_legacy_set(u_adm, 'materials', m.id, newp.p, length(m.attachment_data)) from ids, newp, public.portal_mt_materials m where m.title = 'zz_fs_m4'));
select pg_temp.chk('legacy_set: row now holds storage:<path> and original metadata is kept', (select m.attachment_data = 'storage:' || newp.p and m.attachment_name = 'd.pdf' from newp, public.portal_mt_materials m where m.title = 'zz_fs_m4'));
select pg_temp.chk('legacy_set: second call is a no-op (row is no longer inline)', (select not public.portal_file_legacy_set(u_adm, 'materials', pg_temp.mid('zz_fs_m4'), newp.p, 10) from ids, newp));
select pg_temp.chk('read_info works on the migrated row', (select pg_temp.info(u_s1, 'materials', pg_temp.mid('zz_fs_m4')) = newp.p from ids, newp));
select pg_temp.chk('legacy_set: questions + content kinds', (select public.portal_file_legacy_set(u_adm, 'questions', q.id, 'questions/' || s1 || '/' || gen_random_uuid() || '.jpg', length(q.attachment_url)) from ids, public.portal_mt_questions q where q.question_text = 'zz_fs_q2'));

-- ---- grants: Edge Function (service_role) only
select pg_temp.chk('grants: service_role yes, anon/authenticated/PUBLIC no',
  (select bool_and(has_function_privilege('service_role', p.oid, 'execute') and not has_function_privilege('anon', p.oid, 'execute') and not has_function_privilege('authenticated', p.oid, 'execute')
                   and not coalesce((select bool_or(a.grantee = 0) from aclexplode(p.proacl) a), false))
   from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'portal\_file\_%'));
select pg_temp.chk('five functions exist', (select count(*) = 5 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'portal\_file\_%'));

select check_name, ok from t_r order by n;
select 'FAILED: ' || count(*) filter (where not ok) || ' of ' || count(*) as summary from t_r;
rollback;
