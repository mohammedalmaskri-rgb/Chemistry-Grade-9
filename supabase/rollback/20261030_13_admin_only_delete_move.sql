-- التراجع عن 20261030_13: يعيد دالة الحذف (تعطيل، من 12) ودالة النقل (نسخة 07 الحالية).
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

-- portal_teacher_move_student
CREATE OR REPLACE FUNCTION public.portal_teacher_move_student(p_token text, p_student_id bigint, p_new_class text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
    -- التأكد من جلسة المعلم
    if not exists (
        select 1
        from public.teacher_sessions ts
        where ts.token = p_token::uuid
          and ts.expires_at > now()
    ) then
        return false;
    end if;

    -- [classes] كانت هنا قائمة ثابتة 9/1-9/7؛ الآن أي شعبة مسندة للمعلم (الشرط التالي)

    -- [scope] الطالب في شعبة للمعلم، والشعبة الجديدة مسندة له أيضًا
    if not public._portal_teacher_has_student(public._portal_teacher_id(p_token::uuid), p_student_id) then
        raise exception 'هذا الطالب ليس ضمن الشعب المسندة لك';
    end if;
    if not public._portal_teacher_has_class(public._portal_teacher_id(p_token::uuid), p_new_class) then
        raise exception 'هذه الشعبة غير مسندة لك';
    end if;

    -- نغير الشعبة فقط
    update public.students
    set class_name = p_new_class,
        updated_at = now()
    where id = p_student_id;

    return found;
end;
$function$;
revoke all on function public.portal_teacher_move_student(p_token text, p_student_id bigint, p_new_class text) from public, anon, authenticated;
grant execute on function public.portal_teacher_move_student(p_token text, p_student_id bigint, p_new_class text) to authenticated;
grant execute on function public.portal_teacher_move_student(p_token text, p_student_id bigint, p_new_class text) to anon;
grant execute on function public.portal_teacher_move_student(p_token text, p_student_id bigint, p_new_class text) to service_role;

commit;
