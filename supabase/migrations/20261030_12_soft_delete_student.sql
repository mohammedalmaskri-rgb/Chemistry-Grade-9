-- =====================================================================
-- 20261030_12_soft_delete_student
-- [C1] حذف الطالب من حساب المعلم كان DELETE فعليًا، وحساب الطالب مشترك بين المواد،
--      فيمسح (ON DELETE CASCADE) درجاته ونقاطه وأسئلته عند كل المعلمين.
-- بعد: (1) دالة المعلم ترفض الحذف/التعطيل دائمًا (لا تغيير على أي صف).
--      (2) دالتان جديدتان للمشرف: portal_admin_set_student_active و portal_admin_move_student.
--      (3) قائمة طلاب المعلم وتقرير الدرجات وعدد الطلاب في النظرة العامة تستبعد المعطّلين؛
--          الصفوف والدرجات نفسها لا تُمسّ. CREATE OR REPLACE يُبقي صلاحيات الدوال الثلاث كما هي.
-- لا يتغير شيء آخر. الاسترجاع: is_active=true.
-- التراجع: supabase/rollback/20261030_12_soft_delete_student.sql
-- =====================================================================

begin;

-- portal_teacher_delete_student: المعلم لا يحذف ولا يعطّل أي طالب (صلاحية المشرف فقط)
CREATE OR REPLACE FUNCTION public.portal_teacher_delete_student(p_token uuid, p_student_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'حذف الطلاب أو تعطيلهم من صلاحية المشرف فقط';
END;
$function$;
revoke all on function public.portal_teacher_delete_student(p_token uuid, p_student_id bigint) from public, anon, authenticated;
grant execute on function public.portal_teacher_delete_student(p_token uuid, p_student_id bigint) to authenticated;
grant execute on function public.portal_teacher_delete_student(p_token uuid, p_student_id bigint) to anon;
grant execute on function public.portal_teacher_delete_student(p_token uuid, p_student_id bigint) to service_role;

-- portal_admin_set_student_active: المشرف يعطّل الطالب أو يفعّله (بدل الحذف)
CREATE OR REPLACE FUNCTION public.portal_admin_set_student_active(p_token uuid, p_student_id bigint, p_active boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.portal_admin_sessions s JOIN public.portal_admin_users a ON a.id = s.admin_id
                 WHERE s.token = p_token AND s.expires_at > now() AND a.is_active = true) THEN
    RETURN false;
  END IF;
  IF p_active IS NULL THEN
    RETURN false;
  END IF;
  UPDATE public.students SET is_active = p_active, updated_at = now() WHERE id = p_student_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF NOT p_active THEN
    DELETE FROM public.student_sessions WHERE student_id = p_student_id;
  END IF;
  RETURN true;
END;
$function$;
revoke all on function public.portal_admin_set_student_active(p_token uuid, p_student_id bigint, p_active boolean) from public, anon, authenticated;
grant execute on function public.portal_admin_set_student_active(p_token uuid, p_student_id bigint, p_active boolean) to anon;
grant execute on function public.portal_admin_set_student_active(p_token uuid, p_student_id bigint, p_active boolean) to authenticated;
grant execute on function public.portal_admin_set_student_active(p_token uuid, p_student_id bigint, p_active boolean) to service_role;

-- portal_admin_move_student: المشرف ينقل الطالب إلى أي شعبة موجودة
CREATE OR REPLACE FUNCTION public.portal_admin_move_student(p_token uuid, p_student_id bigint, p_new_class text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_class text := btrim(coalesce(p_new_class, ''));
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.portal_admin_sessions s JOIN public.portal_admin_users a ON a.id = s.admin_id
                 WHERE s.token = p_token AND s.expires_at > now() AND a.is_active = true) THEN
    RETURN false;
  END IF;
  IF v_class = '' OR NOT (
       EXISTS (SELECT 1 FROM public.teacher_class_subjects t WHERE t.class_name = v_class AND t.is_active)
    OR EXISTS (SELECT 1 FROM public.students s WHERE s.class_name = v_class)) THEN
    RAISE EXCEPTION 'الشعبة غير موجودة';
  END IF;
  UPDATE public.students SET class_name = v_class, updated_at = now() WHERE id = p_student_id;
  RETURN FOUND;
END;
$function$;
revoke all on function public.portal_admin_move_student(p_token uuid, p_student_id bigint, p_new_class text) from public, anon, authenticated;
grant execute on function public.portal_admin_move_student(p_token uuid, p_student_id bigint, p_new_class text) to anon;
grant execute on function public.portal_admin_move_student(p_token uuid, p_student_id bigint, p_new_class text) to authenticated;
grant execute on function public.portal_admin_move_student(p_token uuid, p_student_id bigint, p_new_class text) to service_role;

-- [C1] استبعاد المعطّلين من القوائم والتقارير والإحصاء (تعريفات الإنتاج حرفيًا + شرط is_active فقط)
CREATE OR REPLACE FUNCTION public.portal_teacher_students_v2(p_token uuid, p_subject_code text, p_class text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, full_name text, class_name text, username text, is_active boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$

    SELECT DISTINCT
        st.id,
        st.full_name,
        st.class_name,
        st.username,
        st.is_active

    FROM public.students st

    JOIN public.teacher_class_subjects tcs
        ON tcs.class_name = st.class_name
       AND tcs.is_active = true

    JOIN public.subjects s
        ON s.id = tcs.subject_id
       AND s.is_active = true

    WHERE tcs.teacher_id = public._portal_teacher_id(p_token)

      AND s.code = p_subject_code

      AND st.is_active = true  -- [C1] المعطّلون لا يظهرون

      AND (
          p_class IS NULL
          OR p_class = 'ALL'
          OR st.class_name = p_class
      )

    ORDER BY
        st.class_name,
        st.full_name;

$function$;

CREATE OR REPLACE FUNCTION public.portal_teacher_mt_grade_report(p_token uuid, p_subject_code text, p_class text, p_assessment text)
 RETURNS TABLE(grade_id bigint, student_id bigint, full_name text, class_name text, assessment_title text, score numeric, max_score numeric, note text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select g.id,g.student_id,st.full_name,st.class_name,g.assessment_title,g.score,g.max_score,g.note,g.created_at
 from public.portal_mt_grades g join public.students st on st.id=g.student_id
 where g.teacher_id=public._portal_teacher_id(p_token) and g.subject_id=public._portal_mt_subject_id(p_subject_code)
   and st.is_active=true  -- [C1] درجات المعطّلين محفوظة لكن لا تُعرض
   and (p_class='ALL' or st.class_name=p_class)
   and (p_assessment='ALL' or g.assessment_title=p_assessment)
 order by st.class_name,st.full_name,g.created_at desc
$function$;

CREATE OR REPLACE FUNCTION public.portal_teacher_mt_overview(p_token uuid, p_subject_code text)
 RETURNS TABLE(total_students bigint, new_questions bigint, announcements bigint, content_items bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    (select count(*) from public.students st where st.is_active and exists(
      select 1 from public.teacher_class_subjects tcs join public.subjects s on s.id=tcs.subject_id
      where tcs.teacher_id=public._portal_teacher_id(p_token) and tcs.is_active and s.code=p_subject_code and tcs.class_name=st.class_name)),
    (select count(*) from public.portal_mt_questions q where q.teacher_id=public._portal_teacher_id(p_token) and q.subject_id=public._portal_mt_subject_id(p_subject_code) and q.status='new'),
    (select count(*) from public.portal_mt_announcements a where a.teacher_id=public._portal_teacher_id(p_token) and a.subject_id=public._portal_mt_subject_id(p_subject_code)),
    (select count(*) from public.portal_mt_content c where c.teacher_id=public._portal_teacher_id(p_token) and c.subject_id=public._portal_mt_subject_id(p_subject_code))
  where public._portal_mt_has_subject(p_token,p_subject_code)
$function$;

commit;
