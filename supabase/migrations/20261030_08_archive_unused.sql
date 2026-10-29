-- 20261030_08_archive_unused — تنظيف قابل للتراجع الكامل (لا حذف نهائي لأي جدول أو دالة)
-- يُنقل كل ما هو غير مستخدم إلى مخطط مؤرشف مغلق: archive_20261030
--   • 5 جداول قديمة غير مستخدمة (لا تستدعيها أي دالة ولا الواجهة)
--   • 5 دوال قديمة غير مستخدمة (لا تستدعيها الواجهة ولا أي دالة أخرى)
--   • الجلسات المنتهية للطلاب (تُنسخ إلى الأرشيف ثم تُحذف من الجدول الفعّال)
--   • فهرس مكرر على portal_student_login_events (له توأم بنفس الأعمدة)
--   • إيقاف الحساب التجريبي teacher_test (id 2): بلا شعب، لم يُستخدم
-- الحذف النهائي للأرشيف لاحقًا في ملف منفصل وبموافقة منفصلة.
begin;

-- حماية: نتوقف إن تغيّر أي شيء عمّا فُحص
do $$
declare r record; exp jsonb := '{
  "portal_admin_students(uuid,text)": "c8015d78d1c3b42344526bdfb7ea48ac",
  "portal_teacher_add_student_auto(uuid,text,text)": "d90913beb589a459adc3760969a7c247",
  "portal_teacher_move_student_class(uuid,bigint,text)": "251cae05366e082865248d4323571438",
  "portal_teacher_student_logins(text,text)": "a78a9772789668d719e62274c3f772e0",
  "portal_teacher_students(uuid,text)": "bc9f96b0ea5eedc44e61c7eaf4ef1205"}';
begin
  for r in select key, value #>> '{}' h from jsonb_each(exp) loop
    if md5(pg_get_functiondef(('public.' || r.key)::regprocedure)) <> r.h then
      raise exception 'archive_unused: % changed since review', r.key; end if;
    if exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace
               and p.oid <> ('public.' || r.key)::regprocedure
               and p.prosrc ~ ('\m' || split_part(r.key, '(', 1) || '\M')) then
      raise exception 'archive_unused: % is called by another function', r.key; end if;
  end loop;
  if exists (select 1 from pg_depend d join pg_rewrite w on w.oid = d.objid
             where d.refobjid in ('public.grade_cleanup_backup_oral1'::regclass, 'public.grade_cleanup_backup_quiz1'::regclass,
               'public.rawafid_materials_backup_20261027'::regclass, 'public.teacher_student_subjects'::regclass, 'public.teacher_subjects'::regclass)
               and w.ev_class not in ('public.grade_cleanup_backup_oral1'::regclass, 'public.grade_cleanup_backup_quiz1'::regclass,
               'public.rawafid_materials_backup_20261027'::regclass, 'public.teacher_student_subjects'::regclass, 'public.teacher_subjects'::regclass)) then
    raise exception 'archive_unused: a view depends on an archived table'; end if;
  if exists (select 1 from pg_constraint where confrelid in ('public.teacher_student_subjects'::regclass, 'public.teacher_subjects'::regclass,
               'public.grade_cleanup_backup_oral1'::regclass, 'public.grade_cleanup_backup_quiz1'::regclass, 'public.rawafid_materials_backup_20261027'::regclass)) then
    raise exception 'archive_unused: a foreign key points to an archived table'; end if;
  if exists (select 1 from public.teacher_class_subjects where teacher_id = 2)
     or (select username from public.teacher_users where id = 2) is distinct from 'teacher_test' then
    raise exception 'archive_unused: teacher id 2 is not the unused test account'; end if;
end $$;

create schema archive_20261030;
revoke all on schema archive_20261030 from public, anon, authenticated;

alter table public.grade_cleanup_backup_oral1        set schema archive_20261030;
alter table public.grade_cleanup_backup_quiz1        set schema archive_20261030;
alter table public.rawafid_materials_backup_20261027 set schema archive_20261030;
alter table public.teacher_student_subjects          set schema archive_20261030;
alter table public.teacher_subjects                  set schema archive_20261030;

alter function public.portal_admin_students(uuid,text)                   set schema archive_20261030;
alter function public.portal_teacher_add_student_auto(uuid,text,text)    set schema archive_20261030;
alter function public.portal_teacher_move_student_class(uuid,bigint,text) set schema archive_20261030;
alter function public.portal_teacher_student_logins(text,text)           set schema archive_20261030;
alter function public.portal_teacher_students(uuid,text)                 set schema archive_20261030;

create table archive_20261030.student_sessions_expired as
  select * from public.student_sessions where expires_at < now();
delete from public.student_sessions s
  using archive_20261030.student_sessions_expired a where a.token = s.token;

drop index public.idx_portal_student_login_events_student_time;

update public.teacher_users set is_active = false where id = 2 and username = 'teacher_test';
delete from public.teacher_sessions where teacher_id = 2;

commit;
