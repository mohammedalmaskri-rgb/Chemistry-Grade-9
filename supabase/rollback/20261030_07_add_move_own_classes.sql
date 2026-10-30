-- التراجع عن 20261030_07_add_move_own_classes: يعيد الدالتين كما هما بعد إصلاح #4 (مطابقتين للقاعدة في 2026-10-30).

begin;

-- portal_teacher_add_student
CREATE OR REPLACE FUNCTION public.portal_teacher_add_student(p_token text, p_full_name text, p_class text, p_username text, p_password text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    v_id bigint;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.teacher_sessions ts
        WHERE ts.token = p_token::uuid
          AND ts.expires_at > now()
    ) THEN
        RETURN NULL;
    END IF;

    IF length(trim(coalesce(p_full_name, ''))) < 3 THEN
        RAISE EXCEPTION 'اكتب اسم الطالب كاملاً';
    END IF;

    IF p_class NOT IN
       ('9/1','9/2','9/3','9/4','9/5','9/6','9/7') THEN
        RAISE EXCEPTION 'الشعبة غير صحيحة';
    END IF;

    -- [scope] الشعبة يجب أن تكون مسندة لهذا المعلم (إضافة لقائمة الشعب أعلاه)
    IF NOT public._portal_teacher_has_class(public._portal_teacher_id(p_token::uuid), p_class) THEN
        RAISE EXCEPTION 'هذه الشعبة غير مسندة لك';
    END IF;

    IF length(trim(coalesce(p_username, ''))) < 3 THEN
        RAISE EXCEPTION 'اسم المستخدم غير صحيح';
    END IF;

    IF length(coalesce(p_password, '')) < 6 THEN
        RAISE EXCEPTION 'كلمة المرور قصيرة';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.username = trim(p_username)
    ) THEN
        RAISE EXCEPTION 'اسم المستخدم مستخدم لطالب آخر';
    END IF;

    INSERT INTO public.students (
        full_name,
        class_name,
        username,
        password_hash,
        points,
        must_change_password
    )
    VALUES (
        trim(p_full_name),
        p_class,
        trim(p_username),
        extensions.crypt(
            p_password,
            extensions.gen_salt('bf')
        ),
        0,
        true
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$function$;
revoke all on function public.portal_teacher_add_student(p_token text, p_full_name text, p_class text, p_username text, p_password text) from public, anon, authenticated;
grant execute on function public.portal_teacher_add_student(p_token text, p_full_name text, p_class text, p_username text, p_password text) to authenticated;
grant execute on function public.portal_teacher_add_student(p_token text, p_full_name text, p_class text, p_username text, p_password text) to anon;
grant execute on function public.portal_teacher_add_student(p_token text, p_full_name text, p_class text, p_username text, p_password text) to service_role;

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

    -- السماح فقط بشعب الصف التاسع الموجودة
    if p_new_class not in (
        '9/1','9/2','9/3','9/4','9/5','9/6','9/7'
    ) then
        return false;
    end if;

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
