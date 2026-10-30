-- 20261030_09_assign_teachers_8_13_9_13
-- الشعبتان 8/13 (7 طلاب) و9/13 (4 طلاب) بلا معلمين. تُسند لهما المواد نفسها بمعلمي الشعبتين 8/12 و9/12.
-- يضيف صفوفًا جديدة في teacher_class_subjects فقط، ولا يغيّر أي إسناد موجود.
begin;
do $$ begin
  if exists (select 1 from public.teacher_class_subjects where class_name in ('8/13','9/13')) then
    raise exception 'assign_8_13_9_13: the classes already have assignments — nothing changed'; end if;
  if (select count(*) from public.teacher_class_subjects where is_active and class_name in ('8/12','9/12')) <> 4 then
    raise exception 'assign_8_13_9_13: 8/12 or 9/12 assignments changed since review'; end if;
end $$;

insert into public.teacher_class_subjects(teacher_id, subject_id, class_name, is_active)
select teacher_id, subject_id, case class_name when '8/12' then '8/13' else '9/13' end, true
from public.teacher_class_subjects
where is_active and class_name in ('8/12','9/12')
order by class_name, subject_id;
commit;
