-- =====================================================================
-- 20261030_12_soft_delete_student
-- [C1] حذف الطالب من حساب المعلم كان DELETE فعليًا، وحساب الطالب مشترك بين المواد،
--      فيمسح (ON DELETE CASCADE) درجاته ونقاطه وأسئلته عند كل المعلمين.
-- بعد: (1) دالة المعلم تعطّل الحساب (is_active=false) وتنهي جلساته فقط، بلا مسح بيانات.
--      (2) دالتان جديدتان للمشرف: portal_admin_set_student_active و portal_admin_move_student.
-- لا يتغير شيء آخر؛ واجهة المعلم تعمل كما هي. الاسترجاع: is_active=true.
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

commit;
