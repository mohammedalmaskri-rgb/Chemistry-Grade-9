-- =====================================================================
-- 20261030_12_soft_delete_student
-- [C1] حذف الطالب من حساب المعلم كان DELETE فعليًا، وحساب الطالب مشترك بين المواد،
--      فيمسح (ON DELETE CASCADE) درجاته ونقاطه وأسئلته عند كل المعلمين.
-- بعد: الدالة تعطّل الحساب (is_active=false) وتنهي جلساته فقط. لا تُمسح أي بيانات،
--      ويختفي الطالب من كل القوائم ولا يستطيع الدخول. الاسترجاع: is_active=true.
-- التراجع: supabase/rollback/20261030_12_soft_delete_student.sql
-- =====================================================================

begin;

-- portal_teacher_delete_student: تعطيل بدل الحذف النهائي
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

  -- [C1] تعطيل الحساب فقط؛ الدرجات والنقاط والأسئلة في كل المواد تبقى كما هي
  UPDATE public.students AS s
     SET is_active = false
   WHERE s.id = p_student_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  DELETE FROM public.student_sessions WHERE student_id = p_student_id;

  RETURN true;
END;
$function$;
revoke all on function public.portal_teacher_delete_student(p_token uuid, p_student_id bigint) from public, anon, authenticated;
grant execute on function public.portal_teacher_delete_student(p_token uuid, p_student_id bigint) to authenticated;
grant execute on function public.portal_teacher_delete_student(p_token uuid, p_student_id bigint) to anon;
grant execute on function public.portal_teacher_delete_student(p_token uuid, p_student_id bigint) to service_role;

commit;
