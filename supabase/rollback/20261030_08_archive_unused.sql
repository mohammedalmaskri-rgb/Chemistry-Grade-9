-- تراجع 20261030_08_archive_unused: يعيد كل شيء كما كان (الجداول والدوال بتعريفاتها وصلاحياتها، والجلسات، والفهرس، والحساب).
begin;
alter table archive_20261030.grade_cleanup_backup_oral1        set schema public;
alter table archive_20261030.grade_cleanup_backup_quiz1        set schema public;
alter table archive_20261030.rawafid_materials_backup_20261027 set schema public;
alter table archive_20261030.teacher_student_subjects          set schema public;
alter table archive_20261030.teacher_subjects                  set schema public;

alter function archive_20261030.portal_admin_students(uuid,text)                   set schema public;
alter function archive_20261030.portal_teacher_add_student_auto(uuid,text,text)    set schema public;
alter function archive_20261030.portal_teacher_move_student_class(uuid,bigint,text) set schema public;
alter function archive_20261030.portal_teacher_student_logins(text,text)           set schema public;
alter function archive_20261030.portal_teacher_students(uuid,text)                 set schema public;

insert into public.student_sessions select * from archive_20261030.student_sessions_expired on conflict do nothing;

create index if not exists idx_portal_student_login_events_student_time
  on public.portal_student_login_events using btree (student_id, logged_in_at desc);

update public.teacher_users set is_active = true where id = 2 and username = 'teacher_test';

drop table archive_20261030.student_sessions_expired;
drop schema archive_20261030;
commit;
