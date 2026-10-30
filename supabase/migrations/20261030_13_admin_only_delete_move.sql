-- =====================================================================
-- 20261030_13_admin_only_delete_move
-- حذف الطلاب ونقلهم من صلاحية المشرف فقط. دالتا المعلم ترفضان الطلب برسالة واضحة.
-- ⚠ لا تُطبَّق إلا بعد نشر واجهة المشرف التي تستدعي دوال 12، وإلا يتعطل النقل عند الجميع.
-- التراجع: supabase/rollback/20261030_13_admin_only_delete_move.sql
-- =====================================================================

begin;

CREATE OR REPLACE FUNCTION public.portal_teacher_delete_student(p_token uuid, p_student_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'هذا الإجراء من صلاحية المشرف فقط';
END;
$function$;
CREATE OR REPLACE FUNCTION public.portal_teacher_move_student(p_token text, p_student_id bigint, p_new_class text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'هذا الإجراء من صلاحية المشرف فقط';
END;
$function$;
revoke all on function public.portal_teacher_delete_student(p_token uuid, p_student_id bigint) from public, anon, authenticated;
grant execute on function public.portal_teacher_delete_student(p_token uuid, p_student_id bigint) to anon;
grant execute on function public.portal_teacher_delete_student(p_token uuid, p_student_id bigint) to authenticated;
grant execute on function public.portal_teacher_delete_student(p_token uuid, p_student_id bigint) to service_role;
revoke all on function public.portal_teacher_move_student(p_token text, p_student_id bigint, p_new_class text) from public, anon, authenticated;
grant execute on function public.portal_teacher_move_student(p_token text, p_student_id bigint, p_new_class text) to anon;
grant execute on function public.portal_teacher_move_student(p_token text, p_student_id bigint, p_new_class text) to authenticated;
grant execute on function public.portal_teacher_move_student(p_token text, p_student_id bigint, p_new_class text) to service_role;

commit;
