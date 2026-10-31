-- التراجع عن 20261030_12_soft_delete_student
-- يعيد الدوال الأربع بتعريفاتها في الإنتاج حرفيًا (مأخوذة بـ pg_get_functiondef يوم 2026-10-31)
-- ويحذف دالتي المشرف. صلاحيات الدوال الثلاث الأخرى لا تتغير بـ CREATE OR REPLACE.
begin;

CREATE OR REPLACE FUNCTION public.portal_teacher_delete_student(p_token uuid, p_student_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  tid bigint;
BEGIN
  tid := public._portal_teacher_id(p_token);

  IF tid IS NULL THEN
    RETURN false;
  END IF;

  -- [scope]
  IF NOT public._portal_teacher_has_student(tid, p_student_id) THEN
    RAISE EXCEPTION 'هذا الطالب ليس ضمن الشعب المسندة لك';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.students AS s
    WHERE s.id = p_student_id
  ) THEN
    RETURN false;
  END IF;

  DELETE FROM public.students AS s
  WHERE s.id = p_student_id;

  RETURN FOUND;
END;
$function$;
revoke all on function public.portal_teacher_delete_student(p_token uuid, p_student_id bigint) from public, anon, authenticated;
grant execute on function public.portal_teacher_delete_student(p_token uuid, p_student_id bigint) to service_role;
grant execute on function public.portal_teacher_delete_student(p_token uuid, p_student_id bigint) to authenticated;
grant execute on function public.portal_teacher_delete_student(p_token uuid, p_student_id bigint) to anon;

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
    (select count(*) from public.students st where exists(
      select 1 from public.teacher_class_subjects tcs join public.subjects s on s.id=tcs.subject_id
      where tcs.teacher_id=public._portal_teacher_id(p_token) and tcs.is_active and s.code=p_subject_code and tcs.class_name=st.class_name)),
    (select count(*) from public.portal_mt_questions q where q.teacher_id=public._portal_teacher_id(p_token) and q.subject_id=public._portal_mt_subject_id(p_subject_code) and q.status='new'),
    (select count(*) from public.portal_mt_announcements a where a.teacher_id=public._portal_teacher_id(p_token) and a.subject_id=public._portal_mt_subject_id(p_subject_code)),
    (select count(*) from public.portal_mt_content c where c.teacher_id=public._portal_teacher_id(p_token) and c.subject_id=public._portal_mt_subject_id(p_subject_code))
  where public._portal_mt_has_subject(p_token,p_subject_code)
$function$;

drop function if exists public.portal_admin_set_student_active(uuid, bigint, boolean);
drop function if exists public.portal_admin_move_student(uuid, bigint, text);

commit;
