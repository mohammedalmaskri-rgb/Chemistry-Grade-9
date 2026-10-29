-- =====================================================================
-- 20261030_02_scope_teacher_student_accounts
-- تقييد دوال حسابات الطلاب عند المعلم بالشعب المسندة له
-- Scope teacher student-account RPCs to the teacher's assigned classes
--
-- قبل: أي معلم (14 حسابًا) يستطيع، بأي توكن معلم صالح، إعادة تعيين كلمة مرور
--   أي طالب في المدرسة واستلامها، أو حذفه، أو نقله، أو تغيير اسمه، أو البحث
--   في حسابات المدرسة كلها.
-- بعد: كل هذه العمليات مقصورة على طلاب الشعب المسندة للمعلم في
--   teacher_class_subjects (أي مادة). الإضافة والنقل: الشعبة الهدف مسندة له
--   أيضًا، مع بقاء قائمة الشعب الحالية 9/1-9/7 كما هي (لا توسيع لأي صلاحية).
--
-- لا يتغير: توقيعات الدوال، أعمدة النتائج، صلاحيات التنفيذ، أي بيانات.
-- كل تعديل داخل الدوال معلَّم بـ [scope].
-- التراجع: supabase/rollback/20261030_02_scope_teacher_student_accounts.sql
-- =====================================================================

begin;

-- دالتان مساعدتان داخليتان (غير متاحتين للعموم)
create or replace function public._portal_teacher_has_class(p_teacher bigint, p_class text)
 returns boolean
 language sql
 stable security definer
 set search_path to 'pg_catalog', 'public'
as $function$
  select p_teacher is not null and exists (
    select 1 from public.teacher_class_subjects tcs
    where tcs.teacher_id = p_teacher and tcs.is_active = true and tcs.class_name = p_class)
$function$;

create or replace function public._portal_teacher_has_student(p_teacher bigint, p_student_id bigint)
 returns boolean
 language sql
 stable security definer
 set search_path to 'pg_catalog', 'public'
as $function$
  select p_teacher is not null and exists (
    select 1 from public.students st
    join public.teacher_class_subjects tcs on tcs.class_name = st.class_name and tcs.is_active = true
    where st.id = p_student_id and tcs.teacher_id = p_teacher)
$function$;

revoke all on function public._portal_teacher_has_class(bigint, text) from public, anon, authenticated;
revoke all on function public._portal_teacher_has_student(bigint, bigint) from public, anon, authenticated;

-- portal_teacher_reset_student_password
CREATE OR REPLACE FUNCTION public.portal_teacher_reset_student_password(p_token uuid, p_student_id bigint, p_new_password text DEFAULT NULL::text)
 RETURNS TABLE(student_id bigint, full_name text, username text, temporary_password text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  tid bigint;
  v public.students%rowtype;
  newpass text;
BEGIN
  tid := public._portal_teacher_id(p_token);

  IF tid IS NULL THEN
    RETURN;
  END IF;

  -- [scope] الطالب يجب أن يكون في شعبة مسندة لهذا المعلم
  IF NOT public._portal_teacher_has_student(tid, p_student_id) THEN
    RAISE EXCEPTION 'هذا الطالب ليس ضمن الشعب المسندة لك';
  END IF;

  SELECT s.*
  INTO v
  FROM public.students AS s
  WHERE s.id = p_student_id
    AND s.is_active = true
  LIMIT 1;

  IF v.id IS NULL THEN
    RETURN;
  END IF;

  IF nullif(btrim(coalesce(p_new_password, '')), '') IS NULL THEN
    newpass := upper(
      encode(extensions.gen_random_bytes(5), 'hex')
    );
  ELSE
    newpass := btrim(p_new_password);
  END IF;

  IF char_length(newpass) < 6
     OR octet_length(newpass) > 72 THEN
    RETURN;
  END IF;

  UPDATE public.students AS s
  SET password_hash = extensions.crypt(
        newpass,
        extensions.gen_salt('bf')
      ),
      must_change_password = false
  WHERE s.id = v.id;

  DELETE FROM public.student_sessions AS ss
  WHERE ss.student_id = v.id;

  RETURN QUERY
  SELECT
    v.id,
    v.full_name,
    v.username,
    newpass;
END;
$function$;
revoke all on function public.portal_teacher_reset_student_password(p_token uuid, p_student_id bigint, p_new_password text) from public, anon, authenticated;
grant execute on function public.portal_teacher_reset_student_password(p_token uuid, p_student_id bigint, p_new_password text) to authenticated;
grant execute on function public.portal_teacher_reset_student_password(p_token uuid, p_student_id bigint, p_new_password text) to anon;
grant execute on function public.portal_teacher_reset_student_password(p_token uuid, p_student_id bigint, p_new_password text) to service_role;

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

-- portal_teacher_move_student_class
CREATE OR REPLACE FUNCTION public.portal_teacher_move_student_class(p_token uuid, p_student_id bigint, p_new_class text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_teacher_id bigint;
  v_old_class text;
BEGIN
  v_teacher_id := public._portal_teacher_id(p_token);
  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'جلسة المعلم غير صالحة';
  END IF;

  p_new_class := btrim(coalesce(p_new_class, ''));
  IF p_new_class NOT IN ('9/1','9/2','9/3','9/4','9/5','9/6','9/7') THEN
    RAISE EXCEPTION 'الشعبة غير صحيحة';
  END IF;

  -- [scope]
  IF NOT public._portal_teacher_has_student(v_teacher_id, p_student_id) THEN
    RAISE EXCEPTION 'هذا الطالب ليس ضمن الشعب المسندة لك';
  END IF;
  IF NOT public._portal_teacher_has_class(v_teacher_id, p_new_class) THEN
    RAISE EXCEPTION 'هذه الشعبة غير مسندة لك';
  END IF;

  SELECT s.class_name
    INTO v_old_class
  FROM public.students s
  WHERE s.id = p_student_id
    AND s.is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الطالب غير موجود أو غير نشط';
  END IF;

  IF v_old_class = p_new_class THEN
    RETURN true;
  END IF;

  -- التغيير الوحيد: الشعبة الحالية للطالب.
  -- لا نغيّر student_id أو اسم المستخدم أو كلمة السر أو النقاط أو الدرجات.
  UPDATE public.students
  SET class_name = p_new_class
  WHERE id = p_student_id;

  RETURN true;
END
$function$;
revoke all on function public.portal_teacher_move_student_class(p_token uuid, p_student_id bigint, p_new_class text) from public, anon, authenticated;
grant execute on function public.portal_teacher_move_student_class(p_token uuid, p_student_id bigint, p_new_class text) to authenticated;
grant execute on function public.portal_teacher_move_student_class(p_token uuid, p_student_id bigint, p_new_class text) to anon;
grant execute on function public.portal_teacher_move_student_class(p_token uuid, p_student_id bigint, p_new_class text) to service_role;

-- portal_teacher_update_student_name
CREATE OR REPLACE FUNCTION public.portal_teacher_update_student_name(p_token text, p_student_id bigint, p_full_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if not exists (
    select 1 from public.teacher_sessions ts
    where ts.token = p_token::uuid and ts.expires_at > now()
  ) then return false; end if;
  if length(trim(coalesce(p_full_name,''))) < 3 then return false; end if;
  -- [scope]
  if not public._portal_teacher_has_student(public._portal_teacher_id(p_token::uuid), p_student_id) then raise exception 'هذا الطالب ليس ضمن الشعب المسندة لك'; end if;
  update public.students set full_name=trim(p_full_name) where id=p_student_id;
  return found;
end;
$function$;
revoke all on function public.portal_teacher_update_student_name(p_token text, p_student_id bigint, p_full_name text) from public, anon, authenticated;
grant execute on function public.portal_teacher_update_student_name(p_token text, p_student_id bigint, p_full_name text) to authenticated;
grant execute on function public.portal_teacher_update_student_name(p_token text, p_student_id bigint, p_full_name text) to anon;
grant execute on function public.portal_teacher_update_student_name(p_token text, p_student_id bigint, p_full_name text) to service_role;

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

-- portal_teacher_add_student_auto
CREATE OR REPLACE FUNCTION public.portal_teacher_add_student_auto(p_token uuid, p_full_name text, p_class text)
 RETURNS TABLE(student_id bigint, full_name text, class_name text, username text, temporary_password text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  tid bigint;
  new_username text;
  new_password text;
  new_id bigint;
  class_digit text;
  next_number integer;
BEGIN

  -- التأكد أن المستخدم معلم مسجل دخوله
  tid := public._portal_teacher_id(p_token);

  IF tid IS NULL THEN
    RETURN;
  END IF;

  -- التأكد من وجود اسم الطالب
  IF NULLIF(BTRIM(p_full_name), '') IS NULL THEN
    RETURN;
  END IF;

  -- السماح فقط بشعب الصف التاسع
  IF p_class NOT IN (
    '9/1',
    '9/2',
    '9/3',
    '9/4',
    '9/5',
    '9/6',
    '9/7'
  ) THEN
    RETURN;
  END IF;

  -- [scope]
  IF NOT public._portal_teacher_has_class(tid, p_class) THEN
    RETURN;
  END IF;

  -- استخراج رقم الشعبة
  class_digit := split_part(p_class, '/', 2);

  -- البحث عن أول اسم مستخدم غير مستخدم في هذه الشعبة
  SELECT g.n
  INTO next_number
  FROM generate_series(1,999) AS g(n)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.students AS s
    WHERE s.username =
      ('9' || class_digit || LPAD(g.n::text,3,'0'))
  )
  ORDER BY g.n
  LIMIT 1;

  IF next_number IS NULL THEN
    RAISE EXCEPTION 'لا يوجد اسم مستخدم متاح لهذه الشعبة';
  END IF;

  -- مثال:
  -- 9/1 = 91001
  -- 9/2 = 92001
  -- 9/7 = 97001
  new_username :=
    '9' || class_digit || LPAD(next_number::text,3,'0');

  -- إنشاء كلمة مرور مؤقتة عشوائية
  new_password :=
    UPPER(
      encode(
        extensions.gen_random_bytes(5),
        'hex'
      )
    );

  -- إنشاء الطالب
  INSERT INTO public.students (
    full_name,
    class_name,
    username,
    password_hash,
    must_change_password,
    is_active
  )
  VALUES (
    BTRIM(p_full_name),
    p_class,
    new_username,
    extensions.crypt(
      new_password,
      extensions.gen_salt('bf')
    ),
    false,
    true
  )
  RETURNING id INTO new_id;

  -- إرجاع بيانات الحساب الجديد للمعلم
  RETURN QUERY
  SELECT
    new_id,
    BTRIM(p_full_name),
    p_class,
    new_username,
    new_password;

END;
$function$;
revoke all on function public.portal_teacher_add_student_auto(p_token uuid, p_full_name text, p_class text) from public, anon, authenticated;
grant execute on function public.portal_teacher_add_student_auto(p_token uuid, p_full_name text, p_class text) to authenticated;
grant execute on function public.portal_teacher_add_student_auto(p_token uuid, p_full_name text, p_class text) to anon;
grant execute on function public.portal_teacher_add_student_auto(p_token uuid, p_full_name text, p_class text) to service_role;

-- portal_teacher_find_student_account
CREATE OR REPLACE FUNCTION public.portal_teacher_find_student_account(p_token uuid, p_query text, p_class text DEFAULT 'ALL'::text)
 RETURNS TABLE(student_id bigint, full_name text, class_name text, username text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select s.id,s.full_name,s.class_name,s.username
  from public.students s
  where public._portal_teacher_has_class(public._portal_teacher_id(p_token), s.class_name) -- [scope]
    and s.is_active=true
    and (coalesce(p_class,'ALL')='ALL' or s.class_name=p_class)
    and (
      s.full_name ilike '%'||trim(coalesce(p_query,''))||'%'
      or s.username ilike '%'||trim(coalesce(p_query,''))||'%'
    )
    and length(trim(coalesce(p_query,'')))>=2
  order by s.class_name,s.full_name
  limit 30;
$function$;
revoke all on function public.portal_teacher_find_student_account(p_token uuid, p_query text, p_class text) from public, anon, authenticated;
grant execute on function public.portal_teacher_find_student_account(p_token uuid, p_query text, p_class text) to authenticated;
grant execute on function public.portal_teacher_find_student_account(p_token uuid, p_query text, p_class text) to anon;
grant execute on function public.portal_teacher_find_student_account(p_token uuid, p_query text, p_class text) to service_role;

-- portal_teacher_students
CREATE OR REPLACE FUNCTION public.portal_teacher_students(p_token uuid, p_class text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, full_name text, class_name text, username text, points integer, is_active boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
 select s.id,s.full_name,s.class_name,s.username,coalesce(s.points,0),s.is_active
 from public.students s where public._portal_teacher_has_class(public._portal_teacher_id(p_token), s.class_name) /* [scope] */ and (p_class is null or p_class='ALL' or s.class_name=p_class)
 order by s.class_name,s.full_name;
$function$;
revoke all on function public.portal_teacher_students(p_token uuid, p_class text) from public, anon, authenticated;
grant execute on function public.portal_teacher_students(p_token uuid, p_class text) to authenticated;
grant execute on function public.portal_teacher_students(p_token uuid, p_class text) to anon;
grant execute on function public.portal_teacher_students(p_token uuid, p_class text) to service_role;

-- portal_teacher_student_logins_v2
CREATE OR REPLACE FUNCTION public.portal_teacher_student_logins_v2(p_token uuid, p_class text DEFAULT 'ALL'::text)
 RETURNS TABLE(full_name text, class_name text, username text, has_logged_in boolean, last_login timestamp with time zone, login_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_teacher_id bigint;
BEGIN
  v_teacher_id := public._portal_teacher_id(p_token);
  IF v_teacher_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH login_agg AS (
    SELECT
      e.student_id,
      max(e.logged_in_at) AS last_login,
      count(*)::bigint AS login_count
    FROM public.portal_student_login_events e
    GROUP BY e.student_id
  )
  SELECT
    s.full_name::text,
    s.class_name::text,
    s.username::text,
    (a.student_id IS NOT NULL) AS has_logged_in,
    a.last_login,
    coalesce(a.login_count, 0)::bigint AS login_count
  FROM public.students s
  LEFT JOIN login_agg a ON a.student_id = s.id
  WHERE s.is_active = true
    AND public._portal_teacher_has_class(v_teacher_id, s.class_name) -- [scope]
    AND (coalesce(p_class, 'ALL') = 'ALL' OR s.class_name = p_class)
  ORDER BY s.class_name, s.full_name;
END
$function$;
revoke all on function public.portal_teacher_student_logins_v2(p_token uuid, p_class text) from public, anon, authenticated;
grant execute on function public.portal_teacher_student_logins_v2(p_token uuid, p_class text) to authenticated;
grant execute on function public.portal_teacher_student_logins_v2(p_token uuid, p_class text) to anon;
grant execute on function public.portal_teacher_student_logins_v2(p_token uuid, p_class text) to service_role;

-- portal_teacher_points_overview
CREATE OR REPLACE FUNCTION public.portal_teacher_points_overview(p_token uuid, p_class text DEFAULT 'ALL'::text)
 RETURNS TABLE(student_id bigint, full_name text, class_name text, base_points numeric, quiz_points numeric, total_points numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if not exists (
    select 1
    from public.teacher_sessions ts
    join public.teacher_users tu on tu.id = ts.teacher_id
    where ts.token = p_token
      and ts.expires_at > now()
      and tu.is_active = true
  ) then
    return;
  end if;

  return query
  select
    st.id::bigint,
    st.full_name::text,
    st.class_name::text,
    coalesce(st.points, 0)::numeric as base_points,
    coalesce(st.quiz_points, 0)::numeric as quiz_points,
    (coalesce(st.points, 0)::numeric + coalesce(st.quiz_points, 0)::numeric) as total_points
  from public.students st
  where st.is_active = true
    and public._portal_teacher_has_class(public._portal_teacher_id(p_token), st.class_name) -- [scope]
    and (
      p_class is null
      or p_class = ''
      or p_class = 'ALL'
      or st.class_name = p_class
    )
  order by total_points desc, st.full_name asc;
end;
$function$;
revoke all on function public.portal_teacher_points_overview(p_token uuid, p_class text) from public, anon, authenticated;
grant execute on function public.portal_teacher_points_overview(p_token uuid, p_class text) to authenticated;
grant execute on function public.portal_teacher_points_overview(p_token uuid, p_class text) to anon;
grant execute on function public.portal_teacher_points_overview(p_token uuid, p_class text) to service_role;

-- portal_teacher_student_logins
CREATE OR REPLACE FUNCTION public.portal_teacher_student_logins(p_token text, p_class text DEFAULT 'ALL'::text)
 RETURNS TABLE(student_id bigint, full_name text, class_name text, username text, has_logged_in boolean, login_count bigint, last_login timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  has_created_at boolean;
begin
  if not exists (
    select 1
    from public.teacher_sessions ts
    where ts.token = p_token::uuid
      and ts.expires_at > now()
  ) then
    return;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'student_sessions'
      and column_name = 'created_at'
  ) into has_created_at;

  if has_created_at then
    return query execute $q$
      select
        s.id::bigint as student_id,
        s.full_name::text,
        s.class_name::text,
        s.username::text,
        (count(ss.token) > 0)::boolean as has_logged_in,
        count(ss.token)::bigint as login_count,
        max(ss.created_at)::timestamptz as last_login
      from public.students s
      left join public.student_sessions ss on ss.student_id = s.id
      where ($1 = 'ALL' or s.class_name = $1)
        and public._portal_teacher_has_class(public._portal_teacher_id($2::uuid), s.class_name) -- [scope]
      group by s.id, s.full_name, s.class_name, s.username
      order by s.class_name, s.full_name
    $q$ using p_class, p_token;
  else
    return query
      select
        s.id::bigint as student_id,
        s.full_name::text,
        s.class_name::text,
        s.username::text,
        (count(ss.token) > 0)::boolean as has_logged_in,
        count(ss.token)::bigint as login_count,
        null::timestamptz as last_login
      from public.students s
      left join public.student_sessions ss on ss.student_id = s.id
      where (p_class = 'ALL' or s.class_name = p_class)
        and public._portal_teacher_has_class(public._portal_teacher_id(p_token::uuid), s.class_name) -- [scope]
      group by s.id, s.full_name, s.class_name, s.username
      order by s.class_name, s.full_name;
  end if;
end;
$function$;
revoke all on function public.portal_teacher_student_logins(p_token text, p_class text) from public, anon, authenticated;
grant execute on function public.portal_teacher_student_logins(p_token text, p_class text) to authenticated;
grant execute on function public.portal_teacher_student_logins(p_token text, p_class text) to anon;
grant execute on function public.portal_teacher_student_logins(p_token text, p_class text) to service_role;

commit;
