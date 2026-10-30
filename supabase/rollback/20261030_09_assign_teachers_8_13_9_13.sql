-- تراجع 20261030_09: يحذف إسنادات 8/13 و9/13 فقط (لم يكن لهما أي إسناد قبل التعديل).
delete from public.teacher_class_subjects where class_name in ('8/13','9/13');
