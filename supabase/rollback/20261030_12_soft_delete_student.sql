-- التراجع عن 20261030_12_soft_delete_student: يعيد الدالة الأصلية (حذف فعلي) حرفيًا من ملف 02.
begin;

-- portal_teacher_delete_student
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
grant execute on function public.portal_teacher_delete_student(p_token uuid, p_student_id bigint) to authenticated;
grant execute on function public.portal_teacher_delete_student(p_token uuid, p_student_id bigint) to anon;
grant execute on function public.portal_teacher_delete_student(p_token uuid, p_student_id bigint) to service_role;

commit;
