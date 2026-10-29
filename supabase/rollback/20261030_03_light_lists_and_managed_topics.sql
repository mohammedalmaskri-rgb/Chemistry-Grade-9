-- التراجع عن 20261030_03_light_lists_and_managed_topics
-- يحذف الدوال الثلاث الجديدة فقط. لم تُعدَّل أي دالة قائمة، فلا شيء آخر يُستعاد.
-- الواجهة تعود تلقائيًا للدوال القديمة عند فشل الجديدة (انظر app.js).
begin;
drop function if exists public.portal_teacher_mt_lesson_materials_list(uuid, text, bigint);
drop function if exists public.portal_student_mt_material_topics(uuid, text);
drop function if exists public.portal_teacher_mt_managed_topics(uuid, text);
commit;
