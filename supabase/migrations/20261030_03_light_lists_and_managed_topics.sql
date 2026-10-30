-- =====================================================================
-- 20261030_03_light_lists_and_managed_topics
-- قوائم خفيفة لملفات الدروس + دالة «دروسي» المفقودة
--
-- 1) portal_teacher_mt_lesson_materials_list
--    قائمة ملفات المعلم بدون محتوى المرفقات (اسم الملف وحجمه فقط).
--    الدالة الحالية ترسل كل المرفقات (حوالي 25MB) لعرض الأسماء، فتنتهي
--    مهلة الـ 3 ثوانٍ وتفشل القائمة.
-- 2) portal_student_mt_material_topics
--    أنواع المحتوى المتاح لكل درس عند الطالب، بدون المرفقات. تستبدل فحص
--    الواجهة الذي كان يحمّل مرفقات كل دروس الوحدة لمعرفة ما المتاح.
-- 3) portal_teacher_mt_managed_topics
--    الدالة التي تستدعيها الواجهة لصندوق «دروسي» وكانت غير موجودة (404).
--
-- كلها دوال قراءة جديدة. لا تعديل لأي دالة أو جدول أو بيانات قائمة.
-- نفس شروط الصلاحية للدوال المقابلة الحالية.
-- التراجع: supabase/rollback/20261030_03_light_lists_and_managed_topics.sql
-- =====================================================================

begin;

-- 1) قائمة ملفات المعلم (نفس شروط portal_teacher_mt_lesson_materials بدون attachment_data)
create or replace function public.portal_teacher_mt_lesson_materials_list(p_token uuid, p_subject_code text, p_topic_id bigint default null)
 returns table(id bigint, topic_id bigint, topic_title text, material_type text, title text, note text,
               has_attachment boolean, attachment_name text, attachment_mime text, attachment_bytes integer,
               target_class text, is_visible boolean, created_at timestamp with time zone)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select m.id, m.topic_id, coalesce(t.title, m.lesson_name), m.material_type, m.title, m.note,
         coalesce(length(m.attachment_data), 0) > 0, m.attachment_name, m.attachment_mime,
         coalesce(octet_length(m.attachment_data), 0),
         m.target_class, m.is_visible, m.created_at
  from public.portal_mt_materials m
  left join public.portal_mt_topics t on t.id = m.topic_id and t.teacher_id = m.teacher_id and t.subject_id = m.subject_id
  where m.teacher_id = public._portal_teacher_id(p_token)
    and m.subject_id = public._portal_mt_subject_id(p_subject_code)
    and (p_topic_id is null or m.topic_id = p_topic_id)
  order by m.created_at desc
$function$;

-- 2) أنواع المحتوى المتاح لكل درس للطالب (نفس شروط portal_student_mt_lesson_materials)
create or replace function public.portal_student_mt_material_topics(p_token uuid, p_subject_code text)
 returns table(topic_id bigint, material_type text, items bigint)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select m.topic_id, m.material_type, count(*)::bigint
  from public.students st
  join public.teacher_class_subjects tcs on tcs.class_name = st.class_name and tcs.is_active = true
  join public.subjects s on s.id = tcs.subject_id and s.code = p_subject_code
  join public.portal_mt_topics t on t.teacher_id = tcs.teacher_id and t.subject_id = tcs.subject_id and t.is_active = true
  join public.portal_mt_materials m on m.teacher_id = t.teacher_id and m.subject_id = t.subject_id and m.topic_id = t.id
  where st.id = public._portal_mt_student_id(p_token)
    and m.is_visible = true and (m.target_class = 'ALL' or m.target_class = st.class_name)
  group by m.topic_id, m.material_type
$function$;

-- 3) «دروسي»: الدروس التي أضافها المعلم بنفسه أو استخدمها فعلًا
--    is_used     = للدرس ملفات أو خطة أو تقدم أو زيارات أو ربط بدرس قديم
--    منهج        = نفس الرمز والعنوان موجود عند معلم آخر للمادة نفسها (المنهج مُدخل
--                  دفعة واحدة لكل معلم، فيتكرر بين معلمي المادة)
--    تظهر: المستخدَمة + غير المنهجية. is_manual = غير منهجي وغير مستخدم (يمكن إخفاؤه).
create or replace function public.portal_teacher_mt_managed_topics(p_token uuid, p_subject_code text)
 returns table(id bigint, unit_no integer, unit_title text, section_code text, title text, page_no integer,
               is_used boolean, is_manual boolean)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  with tt as (
    select t.*
    from public.portal_mt_topics t
    where t.teacher_id = public._portal_teacher_id(p_token)
      and t.subject_id = public._portal_mt_subject_id(p_subject_code)
      and t.is_active = true
      and public._portal_mt_has_subject(p_token, p_subject_code)
  ), used as (
    select tt.id,
      exists (select 1 from public.portal_mt_materials x where x.topic_id = tt.id and x.teacher_id = tt.teacher_id and x.subject_id = tt.subject_id)
      or exists (select 1 from public.portal_mt_lesson_plans x where x.topic_id = tt.id and x.teacher_id = tt.teacher_id and x.subject_id = tt.subject_id)
      or exists (select 1 from public.portal_mt_progress x where x.topic_id = tt.id and x.teacher_id = tt.teacher_id and x.subject_id = tt.subject_id)
      or exists (select 1 from public.portal_mt_lesson_visits x where x.topic_id = tt.id and x.teacher_id = tt.teacher_id and x.subject_id = tt.subject_id)
      or exists (select 1 from public.portal_mt_legacy_topic_map x where x.mt_topic_id = tt.id) as is_used,
      exists (select 1 from public.portal_mt_topics o
              where o.subject_id = tt.subject_id and o.teacher_id <> tt.teacher_id
                and coalesce(o.section_code, '') = coalesce(tt.section_code, '') and o.title = tt.title) as is_curriculum
    from tt
  )
  select tt.id, tt.unit_no, tt.unit_title, tt.section_code, tt.title, tt.page_no, u.is_used, (not u.is_used and not u.is_curriculum)
  from tt join used u on u.id = tt.id
  where u.is_used or not u.is_curriculum
  order by tt.sort_order, tt.id
$function$;

revoke all on function public.portal_teacher_mt_lesson_materials_list(uuid, text, bigint) from public;
revoke all on function public.portal_student_mt_material_topics(uuid, text) from public;
revoke all on function public.portal_teacher_mt_managed_topics(uuid, text) from public;
grant execute on function public.portal_teacher_mt_lesson_materials_list(uuid, text, bigint) to anon, authenticated, service_role;
grant execute on function public.portal_student_mt_material_topics(uuid, text) to anon, authenticated, service_role;
grant execute on function public.portal_teacher_mt_managed_topics(uuid, text) to anon, authenticated, service_role;

commit;
