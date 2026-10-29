-- التراجع عن 20261030_05_legacy_owner_and_points_cap: يعيد الدوال الـ 41 حرفيًا كما كانت في 2026-10-30 ثم يحذف الدالة المساعدة.

begin;

-- portal_teacher_add_announcement
CREATE OR REPLACE FUNCTION public.portal_teacher_add_announcement(p_token uuid, p_title text, p_body text, p_target_class text DEFAULT 'ALL'::text, p_is_popup boolean DEFAULT true)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare tid bigint; rid bigint;
begin tid:=public._portal_teacher_id(p_token); if tid is null then return null; end if;
 insert into public.announcements(title,body,target_class,is_popup,created_by) values(p_title,p_body,p_target_class,p_is_popup,tid) returning id into rid; return rid; end $function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_add_behavior_record(p_token text, p_student_id bigint, p_behavior_type text, p_level text, p_details text, p_action_taken text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_id bigint;
begin

  -- التحقق من جلسة المعلم
  if not exists (
    select 1
    from public.teacher_sessions ts
    where ts.token = p_token::uuid
      and ts.expires_at > now()
  ) then
    return null;
  end if;

  -- التحقق من وجود الطالب
  if not exists (
    select 1
    from public.students s
    where s.id = p_student_id
  ) then
    return null;
  end if;

  -- تسجيل الملاحظة
  insert into public.portal_behavior_records (
    student_id,
    behavior_type,
    level,
    details,
    action_taken,
    is_resolved,
    created_at
  )
  values (
    p_student_id,
    p_behavior_type,
    p_level,
    nullif(trim(p_details),''),
    nullif(trim(p_action_taken),''),
    false,
    now()
  )
  returning id into v_id;

  return v_id;

end;
$function$;
revoke all on function public.portal_teacher_add_announcement(p_token uuid, p_title text, p_body text, p_target_class text, p_is_popup boolean) from public, anon, authenticated;
grant execute on function public.portal_teacher_add_announcement(p_token uuid, p_title text, p_body text, p_target_class text, p_is_popup boolean) to authenticated;
grant execute on function public.portal_teacher_add_announcement(p_token uuid, p_title text, p_body text, p_target_class text, p_is_popup boolean) to anon;
grant execute on function public.portal_teacher_add_announcement(p_token uuid, p_title text, p_body text, p_target_class text, p_is_popup boolean) to service_role;

-- portal_teacher_add_behavior_record
CREATE OR REPLACE FUNCTION public.portal_teacher_add_behavior_record(p_token text, p_student_id bigint, p_behavior_type text, p_level text, p_details text, p_action_taken text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_id bigint;
begin

  -- التحقق من جلسة المعلم
  if not exists (
    select 1
    from public.teacher_sessions ts
    where ts.token = p_token::uuid
      and ts.expires_at > now()
  ) then
    return null;
  end if;

  -- التحقق من وجود الطالب
  if not exists (
    select 1
    from public.students s
    where s.id = p_student_id
  ) then
    return null;
  end if;

  -- تسجيل الملاحظة
  insert into public.portal_behavior_records (
    student_id,
    behavior_type,
    level,
    details,
    action_taken,
    is_resolved,
    created_at
  )
  values (
    p_student_id,
    p_behavior_type,
    p_level,
    nullif(trim(p_details),''),
    nullif(trim(p_action_taken),''),
    false,
    now()
  )
  returning id into v_id;

  return v_id;

end;
$function$;
revoke all on function public.portal_teacher_add_behavior_record(p_token text, p_student_id bigint, p_behavior_type text, p_level text, p_details text, p_action_taken text) from public, anon, authenticated;
grant execute on function public.portal_teacher_add_behavior_record(p_token text, p_student_id bigint, p_behavior_type text, p_level text, p_details text, p_action_taken text) to authenticated;
grant execute on function public.portal_teacher_add_behavior_record(p_token text, p_student_id bigint, p_behavior_type text, p_level text, p_details text, p_action_taken text) to anon;
grant execute on function public.portal_teacher_add_behavior_record(p_token text, p_student_id bigint, p_behavior_type text, p_level text, p_details text, p_action_taken text) to service_role;

-- portal_teacher_add_content
CREATE OR REPLACE FUNCTION public.portal_teacher_add_content(p_token uuid, p_kind text, p_title text, p_body text DEFAULT NULL::text, p_link_url text DEFAULT NULL::text, p_solution_url text DEFAULT NULL::text, p_target_class text DEFAULT 'ALL'::text, p_due_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare tid bigint; rid bigint;
begin tid:=public._portal_teacher_id(p_token); if tid is null then return null; end if;
 insert into public.content_items(kind,title,body,link_url,solution_url,target_class,due_at,created_by)
 values(p_kind,p_title,p_body,nullif(trim(p_link_url),''),nullif(trim(p_solution_url),''),p_target_class,p_due_at,tid) returning id into rid; return rid; end $function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_add_experiment(p_token uuid, p_title text, p_description text, p_experiment_url text, p_target_class text DEFAULT 'ALL'::text, p_is_visible boolean DEFAULT false)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare tid bigint; rid bigint;
begin
  tid := public._portal_teacher_id(p_token);
  if tid is null then return null; end if;
  if nullif(trim(p_title),'') is null or nullif(trim(p_experiment_url),'') is null then return null; end if;
  if p_target_class not in ('ALL','9/1','9/2','9/3','9/4','9/5','9/6','9/7') then return null; end if;
  insert into public.portal_experiments(title,description,experiment_url,target_class,is_visible,created_by)
  values(trim(p_title),nullif(trim(p_description),''),trim(p_experiment_url),p_target_class,p_is_visible,tid)
  returning id into rid;
  return rid;
end $function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_add_grade(p_token uuid, p_student_id bigint, p_title text, p_score numeric, p_max_score numeric, p_note text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  tid bigint;
  rid bigint;
  clean_title text;
  clean_note text;
begin
  tid := public._portal_teacher_id(p_token);

  if tid is null then
    return null;
  end if;

  if not exists (
    select 1
    from public.students s
    where s.id = p_student_id
      and s.is_active = true
  ) then
    return null;
  end if;

  clean_title := btrim(coalesce(p_title, ''));
  clean_note := nullif(btrim(coalesce(p_note, '')), '');

  if clean_title = ''
     or char_length(clean_title) > 200
     or (clean_note is not null and char_length(clean_note) > 2000)
     or p_score is null
     or p_max_score is null
     or p_score::text in ('NaN', 'Infinity', '-Infinity')
     or p_max_score::text in ('NaN', 'Infinity', '-Infinity')
     or p_max_score <= 0
     or p_score < 0
     or p_score > p_max_score
  then
    return null;
  end if;

  insert into public.student_grades(
    student_id,
    assessment_title,
    score,
    max_score,
    note,
    created_by
  )
  values(
    p_student_id,
    clean_title,
    p_score,
    p_max_score,
    clean_note,
    tid
  )
  returning id into rid;

  return rid;
end
$function$;
revoke all on function public.portal_teacher_add_content(p_token uuid, p_kind text, p_title text, p_body text, p_link_url text, p_solution_url text, p_target_class text, p_due_at timestamp with time zone) from public, anon, authenticated;
grant execute on function public.portal_teacher_add_content(p_token uuid, p_kind text, p_title text, p_body text, p_link_url text, p_solution_url text, p_target_class text, p_due_at timestamp with time zone) to authenticated;
grant execute on function public.portal_teacher_add_content(p_token uuid, p_kind text, p_title text, p_body text, p_link_url text, p_solution_url text, p_target_class text, p_due_at timestamp with time zone) to anon;
grant execute on function public.portal_teacher_add_content(p_token uuid, p_kind text, p_title text, p_body text, p_link_url text, p_solution_url text, p_target_class text, p_due_at timestamp with time zone) to service_role;

-- portal_teacher_add_experiment
CREATE OR REPLACE FUNCTION public.portal_teacher_add_experiment(p_token uuid, p_title text, p_description text, p_experiment_url text, p_target_class text DEFAULT 'ALL'::text, p_is_visible boolean DEFAULT false)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare tid bigint; rid bigint;
begin
  tid := public._portal_teacher_id(p_token);
  if tid is null then return null; end if;
  if nullif(trim(p_title),'') is null or nullif(trim(p_experiment_url),'') is null then return null; end if;
  if p_target_class not in ('ALL','9/1','9/2','9/3','9/4','9/5','9/6','9/7') then return null; end if;
  insert into public.portal_experiments(title,description,experiment_url,target_class,is_visible,created_by)
  values(trim(p_title),nullif(trim(p_description),''),trim(p_experiment_url),p_target_class,p_is_visible,tid)
  returning id into rid;
  return rid;
end $function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_add_grade(p_token uuid, p_student_id bigint, p_title text, p_score numeric, p_max_score numeric, p_note text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  tid bigint;
  rid bigint;
  clean_title text;
  clean_note text;
begin
  tid := public._portal_teacher_id(p_token);

  if tid is null then
    return null;
  end if;

  if not exists (
    select 1
    from public.students s
    where s.id = p_student_id
      and s.is_active = true
  ) then
    return null;
  end if;

  clean_title := btrim(coalesce(p_title, ''));
  clean_note := nullif(btrim(coalesce(p_note, '')), '');

  if clean_title = ''
     or char_length(clean_title) > 200
     or (clean_note is not null and char_length(clean_note) > 2000)
     or p_score is null
     or p_max_score is null
     or p_score::text in ('NaN', 'Infinity', '-Infinity')
     or p_max_score::text in ('NaN', 'Infinity', '-Infinity')
     or p_max_score <= 0
     or p_score < 0
     or p_score > p_max_score
  then
    return null;
  end if;

  insert into public.student_grades(
    student_id,
    assessment_title,
    score,
    max_score,
    note,
    created_by
  )
  values(
    p_student_id,
    clean_title,
    p_score,
    p_max_score,
    clean_note,
    tid
  )
  returning id into rid;

  return rid;
end
$function$;
revoke all on function public.portal_teacher_add_experiment(p_token uuid, p_title text, p_description text, p_experiment_url text, p_target_class text, p_is_visible boolean) from public, anon, authenticated;
grant execute on function public.portal_teacher_add_experiment(p_token uuid, p_title text, p_description text, p_experiment_url text, p_target_class text, p_is_visible boolean) to authenticated;
grant execute on function public.portal_teacher_add_experiment(p_token uuid, p_title text, p_description text, p_experiment_url text, p_target_class text, p_is_visible boolean) to anon;
grant execute on function public.portal_teacher_add_experiment(p_token uuid, p_title text, p_description text, p_experiment_url text, p_target_class text, p_is_visible boolean) to service_role;

-- portal_teacher_add_grade
CREATE OR REPLACE FUNCTION public.portal_teacher_add_grade(p_token uuid, p_student_id bigint, p_title text, p_score numeric, p_max_score numeric, p_note text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  tid bigint;
  rid bigint;
  clean_title text;
  clean_note text;
begin
  tid := public._portal_teacher_id(p_token);

  if tid is null then
    return null;
  end if;

  if not exists (
    select 1
    from public.students s
    where s.id = p_student_id
      and s.is_active = true
  ) then
    return null;
  end if;

  clean_title := btrim(coalesce(p_title, ''));
  clean_note := nullif(btrim(coalesce(p_note, '')), '');

  if clean_title = ''
     or char_length(clean_title) > 200
     or (clean_note is not null and char_length(clean_note) > 2000)
     or p_score is null
     or p_max_score is null
     or p_score::text in ('NaN', 'Infinity', '-Infinity')
     or p_max_score::text in ('NaN', 'Infinity', '-Infinity')
     or p_max_score <= 0
     or p_score < 0
     or p_score > p_max_score
  then
    return null;
  end if;

  insert into public.student_grades(
    student_id,
    assessment_title,
    score,
    max_score,
    note,
    created_by
  )
  values(
    p_student_id,
    clean_title,
    p_score,
    p_max_score,
    clean_note,
    tid
  )
  returning id into rid;

  return rid;
end
$function$;
revoke all on function public.portal_teacher_add_grade(p_token uuid, p_student_id bigint, p_title text, p_score numeric, p_max_score numeric, p_note text) from public, anon, authenticated;
grant execute on function public.portal_teacher_add_grade(p_token uuid, p_student_id bigint, p_title text, p_score numeric, p_max_score numeric, p_note text) to authenticated;
grant execute on function public.portal_teacher_add_grade(p_token uuid, p_student_id bigint, p_title text, p_score numeric, p_max_score numeric, p_note text) to anon;
grant execute on function public.portal_teacher_add_grade(p_token uuid, p_student_id bigint, p_title text, p_score numeric, p_max_score numeric, p_note text) to service_role;

-- portal_teacher_add_lesson_material
CREATE OR REPLACE FUNCTION public.portal_teacher_add_lesson_material(p_token uuid, p_topic_id bigint, p_material_type text, p_title text, p_note text DEFAULT NULL::text, p_attachment_data text DEFAULT NULL::text, p_attachment_name text DEFAULT NULL::text, p_attachment_mime text DEFAULT NULL::text, p_target_class text DEFAULT 'ALL'::text, p_is_visible boolean DEFAULT false)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  tid bigint;
  nid bigint;
BEGIN
  tid := public._portal_teacher_id(p_token);

  IF tid IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_material_type NOT IN (
    'summary',
    'questions',
    'activity_solution',
    'studentbook_solution'
  ) THEN
    RETURN NULL;
  END IF;

  IF p_topic_id IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM public.curriculum_topics t
       WHERE t.id = p_topic_id
     )
  THEN
    RETURN NULL;
  END IF;

  IF COALESCE(TRIM(p_title), '') = '' THEN
    RETURN NULL;
  END IF;

  IF p_target_class <> 'ALL'
     AND p_target_class NOT IN (
       '9/1','9/2','9/3','9/4','9/5','9/6','9/7'
     )
  THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.lesson_materials(
    topic_id,
    material_type,
    title,
    note,
    attachment_data,
    attachment_name,
    attachment_mime,
    target_class,
    is_visible,
    created_by
  )
  VALUES(
    p_topic_id,
    p_material_type,
    TRIM(p_title),
    NULLIF(TRIM(p_note), ''),
    p_attachment_data,
    p_attachment_name,
    p_attachment_mime,
    p_target_class,
    p_is_visible,
    tid
  )
  RETURNING id INTO nid;

  RETURN nid;
END;
$function$;
revoke all on function public.portal_teacher_add_lesson_material(p_token uuid, p_topic_id bigint, p_material_type text, p_title text, p_note text, p_attachment_data text, p_attachment_name text, p_attachment_mime text, p_target_class text, p_is_visible boolean) from public, anon, authenticated;
grant execute on function public.portal_teacher_add_lesson_material(p_token uuid, p_topic_id bigint, p_material_type text, p_title text, p_note text, p_attachment_data text, p_attachment_name text, p_attachment_mime text, p_target_class text, p_is_visible boolean) to authenticated;
grant execute on function public.portal_teacher_add_lesson_material(p_token uuid, p_topic_id bigint, p_material_type text, p_title text, p_note text, p_attachment_data text, p_attachment_name text, p_attachment_mime text, p_target_class text, p_is_visible boolean) to anon;
grant execute on function public.portal_teacher_add_lesson_material(p_token uuid, p_topic_id bigint, p_material_type text, p_title text, p_note text, p_attachment_data text, p_attachment_name text, p_attachment_mime text, p_target_class text, p_is_visible boolean) to service_role;

-- portal_teacher_add_question_bank
CREATE OR REPLACE FUNCTION public.portal_teacher_add_question_bank(p_token uuid, p_title text, p_question_text text DEFAULT NULL::text, p_question_image text DEFAULT NULL::text, p_solution_text text DEFAULT NULL::text, p_solution_image text DEFAULT NULL::text, p_target_class text DEFAULT 'ALL'::text, p_is_visible boolean DEFAULT false, p_show_solution boolean DEFAULT false)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare tid bigint; rid bigint;
begin
  tid := public._portal_teacher_id(p_token);
  if tid is null then return null; end if;
  if nullif(trim(p_title),'') is null then return null; end if;
  if p_target_class not in ('ALL','9/1','9/2','9/3','9/4','9/5','9/6','9/7') then return null; end if;
  if p_question_image is not null and length(p_question_image) > 3000000 then return null; end if;
  if p_solution_image is not null and length(p_solution_image) > 3000000 then return null; end if;
  insert into public.portal_question_bank(
    title,question_text,question_image,solution_text,solution_image,target_class,is_visible,show_solution,created_by
  ) values(
    trim(p_title),nullif(trim(p_question_text),''),nullif(p_question_image,''),nullif(trim(p_solution_text),''),nullif(p_solution_image,''),
    p_target_class,p_is_visible,p_show_solution,tid
  ) returning id into rid;
  return rid;
end $function$
;

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
revoke all on function public.portal_teacher_add_question_bank(p_token uuid, p_title text, p_question_text text, p_question_image text, p_solution_text text, p_solution_image text, p_target_class text, p_is_visible boolean, p_show_solution boolean) from public, anon, authenticated;
grant execute on function public.portal_teacher_add_question_bank(p_token uuid, p_title text, p_question_text text, p_question_image text, p_solution_text text, p_solution_image text, p_target_class text, p_is_visible boolean, p_show_solution boolean) to authenticated;
grant execute on function public.portal_teacher_add_question_bank(p_token uuid, p_title text, p_question_text text, p_question_image text, p_solution_text text, p_solution_image text, p_target_class text, p_is_visible boolean, p_show_solution boolean) to anon;
grant execute on function public.portal_teacher_add_question_bank(p_token uuid, p_title text, p_question_text text, p_question_image text, p_solution_text text, p_solution_image text, p_target_class text, p_is_visible boolean, p_show_solution boolean) to service_role;

-- portal_teacher_add_video
CREATE OR REPLACE FUNCTION public.portal_teacher_add_video(p_token uuid, p_title text, p_lesson_name text, p_description text, p_video_url text, p_target_class text DEFAULT 'ALL'::text, p_is_visible boolean DEFAULT false)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_teacher_id bigint;
  v_id bigint;
  v_title text := trim(coalesce(p_title,''));
  v_lesson text := nullif(trim(coalesce(p_lesson_name,'')), '');
  v_desc text := nullif(trim(coalesce(p_description,'')), '');
  v_url text := trim(coalesce(p_video_url,''));
  v_class text := coalesce(nullif(trim(p_target_class),''),'ALL');
BEGIN
  v_teacher_id := public._portal_teacher_id(p_token);
  IF v_teacher_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF char_length(v_title) < 3 OR char_length(v_title) > 200 THEN
    RAISE EXCEPTION 'عنوان الفيديو يجب أن يكون بين 3 و200 حرف';
  END IF;
  IF v_lesson IS NOT NULL AND char_length(v_lesson) > 160 THEN
    RAISE EXCEPTION 'اسم الدرس طويل جدًا';
  END IF;
  IF v_desc IS NOT NULL AND char_length(v_desc) > 2000 THEN
    RAISE EXCEPTION 'وصف الفيديو طويل جدًا';
  END IF;
  IF char_length(v_url) > 2048 OR v_url !~* '^https://[^[:space:]]+$' THEN
    RAISE EXCEPTION 'استخدم رابط HTTPS صحيح للفيديو';
  END IF;
  IF v_class NOT IN ('ALL','9/1','9/2','9/3','9/4','9/5','9/6','9/7') THEN
    RAISE EXCEPTION 'الشعبة غير صحيحة';
  END IF;

  INSERT INTO public.portal_videos(
    title, lesson_name, description, video_url,
    target_class, is_visible, created_by
  )
  VALUES (
    v_title, v_lesson, v_desc, v_url,
    v_class, coalesce(p_is_visible,false), v_teacher_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END
$function$;
revoke all on function public.portal_teacher_add_video(p_token uuid, p_title text, p_lesson_name text, p_description text, p_video_url text, p_target_class text, p_is_visible boolean) from public, anon, authenticated;
grant execute on function public.portal_teacher_add_video(p_token uuid, p_title text, p_lesson_name text, p_description text, p_video_url text, p_target_class text, p_is_visible boolean) to authenticated;
grant execute on function public.portal_teacher_add_video(p_token uuid, p_title text, p_lesson_name text, p_description text, p_video_url text, p_target_class text, p_is_visible boolean) to anon;
grant execute on function public.portal_teacher_add_video(p_token uuid, p_title text, p_lesson_name text, p_description text, p_video_url text, p_target_class text, p_is_visible boolean) to service_role;

-- portal_teacher_adjust_points
CREATE OR REPLACE FUNCTION public.portal_teacher_adjust_points(p_token uuid, p_student_id bigint, p_delta integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  tid bigint;
  oldp integer;
  newp integer;
begin
  tid := public._portal_teacher_id(p_token);

  if tid is null then
    return null;
  end if;

  if p_delta is null or p_delta < -100 or p_delta > 100 then
    return null;
  end if;

  select coalesce(s.points, 0)
    into oldp
  from public.students s
  where s.id = p_student_id
    and s.is_active = true
  for update;

  if not found then
    return null;
  end if;

  newp := greatest(0, oldp + p_delta);

  update public.students
  set points = newp
  where id = p_student_id;

  insert into public.portal_points_audit(
    teacher_id,
    student_id,
    delta,
    old_points,
    new_points
  )
  values(
    tid,
    p_student_id,
    p_delta,
    oldp,
    newp
  );

  return newp;
end
$function$;
revoke all on function public.portal_teacher_adjust_points(p_token uuid, p_student_id bigint, p_delta integer) from public, anon, authenticated;
grant execute on function public.portal_teacher_adjust_points(p_token uuid, p_student_id bigint, p_delta integer) to authenticated;
grant execute on function public.portal_teacher_adjust_points(p_token uuid, p_student_id bigint, p_delta integer) to anon;
grant execute on function public.portal_teacher_adjust_points(p_token uuid, p_student_id bigint, p_delta integer) to service_role;

-- portal_teacher_announcements
CREATE OR REPLACE FUNCTION public.portal_teacher_announcements(p_token uuid)
 RETURNS TABLE(id bigint, title text, body text, target_class text, is_popup boolean, created_at timestamp with time zone, read_count bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
 select a.id,a.title,a.body,a.target_class,a.is_popup,a.created_at,count(r.student_id)
 from public.announcements a left join public.announcement_reads r on r.announcement_id=a.id
 where public._portal_teacher_id(p_token) is not null group by a.id order by a.created_at desc;
$function$;
revoke all on function public.portal_teacher_announcements(p_token uuid) from public, anon, authenticated;
grant execute on function public.portal_teacher_announcements(p_token uuid) to authenticated;
grant execute on function public.portal_teacher_announcements(p_token uuid) to anon;
grant execute on function public.portal_teacher_announcements(p_token uuid) to service_role;

-- portal_teacher_behavior_records
CREATE OR REPLACE FUNCTION public.portal_teacher_behavior_records(p_token text, p_class text DEFAULT 'ALL'::text, p_query text DEFAULT ''::text)
 RETURNS TABLE(id bigint, student_id bigint, full_name text, class_name text, username text, behavior_type text, level text, details text, action_taken text, is_resolved boolean, created_at timestamp with time zone, resolved_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin

  if not exists (
    select 1
    from public.teacher_sessions ts
    where ts.token = p_token::uuid
      and ts.expires_at > now()
  ) then
    return;
  end if;

  return query
  select
    b.id,
    b.student_id,
    s.full_name::text,
    s.class_name::text,
    s.username::text,
    b.behavior_type::text,
    b.level::text,
    b.details::text,
    b.action_taken::text,
    b.is_resolved,
    b.created_at,
    b.resolved_at
  from public.portal_behavior_records b
  join public.students s
    on s.id = b.student_id
  where
    (p_class = 'ALL' or s.class_name::text = p_class)
    and (
      coalesce(trim(p_query),'') = ''
      or s.full_name::text ilike '%' || trim(p_query) || '%'
      or s.username::text ilike '%' || trim(p_query) || '%'
    )
  order by b.created_at desc;

end;
$function$;
revoke all on function public.portal_teacher_behavior_records(p_token text, p_class text, p_query text) from public, anon, authenticated;
grant execute on function public.portal_teacher_behavior_records(p_token text, p_class text, p_query text) to authenticated;
grant execute on function public.portal_teacher_behavior_records(p_token text, p_class text, p_query text) to anon;
grant execute on function public.portal_teacher_behavior_records(p_token text, p_class text, p_query text) to service_role;

-- portal_teacher_content
CREATE OR REPLACE FUNCTION public.portal_teacher_content(p_token uuid, p_kind text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, kind text, title text, body text, link_url text, solution_url text, target_class text, due_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
 select c.id,c.kind,c.title,c.body,c.link_url,c.solution_url,c.target_class,c.due_at,c.created_at from public.content_items c
 where public._portal_teacher_id(p_token) is not null and (p_kind is null or c.kind=p_kind) order by c.created_at desc;
$function$;
revoke all on function public.portal_teacher_content(p_token uuid, p_kind text) from public, anon, authenticated;
grant execute on function public.portal_teacher_content(p_token uuid, p_kind text) to authenticated;
grant execute on function public.portal_teacher_content(p_token uuid, p_kind text) to anon;
grant execute on function public.portal_teacher_content(p_token uuid, p_kind text) to service_role;

-- portal_teacher_delete_behavior_record
CREATE OR REPLACE FUNCTION public.portal_teacher_delete_behavior_record(p_token text, p_record_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin

  if not exists (
    select 1
    from public.teacher_sessions ts
    where ts.token = p_token::uuid
      and ts.expires_at > now()
  ) then
    return false;
  end if;

  delete from public.portal_behavior_records
  where id = p_record_id;

  return found;

end;
$function$;
revoke all on function public.portal_teacher_delete_behavior_record(p_token text, p_record_id bigint) from public, anon, authenticated;
grant execute on function public.portal_teacher_delete_behavior_record(p_token text, p_record_id bigint) to authenticated;
grant execute on function public.portal_teacher_delete_behavior_record(p_token text, p_record_id bigint) to anon;
grant execute on function public.portal_teacher_delete_behavior_record(p_token text, p_record_id bigint) to service_role;

-- portal_teacher_delete_experiment
CREATE OR REPLACE FUNCTION public.portal_teacher_delete_experiment(p_token uuid, p_experiment_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if public._portal_teacher_id(p_token) is null then return false; end if;
  delete from public.portal_experiments where id=p_experiment_id;
  return found;
end $function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_delete_lesson_material(p_token uuid, p_material_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if public._portal_teacher_id(p_token) is null then return false; end if;
  delete from public.lesson_materials where id=p_material_id;
  return found;
end;$function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_delete_question_bank(p_token uuid, p_question_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if public._portal_teacher_id(p_token) is null then return false; end if;
  delete from public.portal_question_bank where id=p_question_id;
  return found;
end $function$
;

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
revoke all on function public.portal_teacher_delete_experiment(p_token uuid, p_experiment_id bigint) from public, anon, authenticated;
grant execute on function public.portal_teacher_delete_experiment(p_token uuid, p_experiment_id bigint) to authenticated;
grant execute on function public.portal_teacher_delete_experiment(p_token uuid, p_experiment_id bigint) to anon;
grant execute on function public.portal_teacher_delete_experiment(p_token uuid, p_experiment_id bigint) to service_role;

-- portal_teacher_delete_lesson_material
CREATE OR REPLACE FUNCTION public.portal_teacher_delete_lesson_material(p_token uuid, p_material_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if public._portal_teacher_id(p_token) is null then return false; end if;
  delete from public.lesson_materials where id=p_material_id;
  return found;
end;$function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_delete_question_bank(p_token uuid, p_question_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if public._portal_teacher_id(p_token) is null then return false; end if;
  delete from public.portal_question_bank where id=p_question_id;
  return found;
end $function$
;

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
revoke all on function public.portal_teacher_delete_lesson_material(p_token uuid, p_material_id bigint) from public, anon, authenticated;
grant execute on function public.portal_teacher_delete_lesson_material(p_token uuid, p_material_id bigint) to authenticated;
grant execute on function public.portal_teacher_delete_lesson_material(p_token uuid, p_material_id bigint) to anon;
grant execute on function public.portal_teacher_delete_lesson_material(p_token uuid, p_material_id bigint) to service_role;

-- portal_teacher_delete_question_bank
CREATE OR REPLACE FUNCTION public.portal_teacher_delete_question_bank(p_token uuid, p_question_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if public._portal_teacher_id(p_token) is null then return false; end if;
  delete from public.portal_question_bank where id=p_question_id;
  return found;
end $function$
;

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
revoke all on function public.portal_teacher_delete_question_bank(p_token uuid, p_question_id bigint) from public, anon, authenticated;
grant execute on function public.portal_teacher_delete_question_bank(p_token uuid, p_question_id bigint) to authenticated;
grant execute on function public.portal_teacher_delete_question_bank(p_token uuid, p_question_id bigint) to anon;
grant execute on function public.portal_teacher_delete_question_bank(p_token uuid, p_question_id bigint) to service_role;

-- portal_teacher_delete_video
CREATE OR REPLACE FUNCTION public.portal_teacher_delete_video(p_token uuid, p_video_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF public._portal_teacher_id(p_token) IS NULL THEN
    RETURN false;
  END IF;

  DELETE FROM public.portal_videos
  WHERE id = p_video_id;

  RETURN FOUND;
END
$function$;
revoke all on function public.portal_teacher_delete_video(p_token uuid, p_video_id bigint) from public, anon, authenticated;
grant execute on function public.portal_teacher_delete_video(p_token uuid, p_video_id bigint) to authenticated;
grant execute on function public.portal_teacher_delete_video(p_token uuid, p_video_id bigint) to anon;
grant execute on function public.portal_teacher_delete_video(p_token uuid, p_video_id bigint) to service_role;

-- portal_teacher_experiments
CREATE OR REPLACE FUNCTION public.portal_teacher_experiments(p_token uuid)
 RETURNS TABLE(id bigint, title text, description text, experiment_url text, target_class text, is_visible boolean, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select e.id,e.title,e.description,e.experiment_url,e.target_class,e.is_visible,e.created_at
  from public.portal_experiments e
  where public._portal_teacher_id(p_token) is not null
  order by e.created_at desc;
$function$;
revoke all on function public.portal_teacher_experiments(p_token uuid) from public, anon, authenticated;
grant execute on function public.portal_teacher_experiments(p_token uuid) to authenticated;
grant execute on function public.portal_teacher_experiments(p_token uuid) to anon;
grant execute on function public.portal_teacher_experiments(p_token uuid) to service_role;

-- portal_teacher_grade_report
CREATE OR REPLACE FUNCTION public.portal_teacher_grade_report(p_token text, p_class text DEFAULT 'ALL'::text, p_assessment text DEFAULT NULL::text)
 RETURNS TABLE(grade_id bigint, student_id bigint, full_name text, class_name text, assessment_title text, score numeric, max_score numeric, note text, created_at timestamp with time zone)
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
        return;
    end if;

    return query
    select
        g.id,
        s.id,
        s.full_name,
        s.class_name,
        g.assessment_title,
        g.score,
        g.max_score,
        g.note,
        g.created_at
    from public.student_grades g
    join public.students s
      on s.id = g.student_id
    where
        (p_class = 'ALL' or s.class_name = p_class)
        and
        (
            p_assessment is null
            or trim(p_assessment) = ''
            or p_assessment = 'ALL'
            or g.assessment_title = p_assessment
        )
    order by
        s.class_name,
        s.full_name,
        g.created_at desc;
end;
$function$;
revoke all on function public.portal_teacher_grade_report(p_token text, p_class text, p_assessment text) from public, anon, authenticated;
grant execute on function public.portal_teacher_grade_report(p_token text, p_class text, p_assessment text) to authenticated;
grant execute on function public.portal_teacher_grade_report(p_token text, p_class text, p_assessment text) to anon;
grant execute on function public.portal_teacher_grade_report(p_token text, p_class text, p_assessment text) to service_role;

-- portal_teacher_lesson_materials
CREATE OR REPLACE FUNCTION public.portal_teacher_lesson_materials(p_token uuid, p_topic_id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(id bigint, topic_id bigint, unit_no integer, unit_title text, section_code text, topic_title text, material_type text, title text, note text, attachment_name text, attachment_mime text, target_class text, is_visible boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if public._portal_teacher_id(p_token) is null then return; end if;
  return query
  select m.id,m.topic_id,t.unit_no,t.unit_title,t.section_code,t.title,m.material_type,m.title,m.note,
         m.attachment_name,m.attachment_mime,m.target_class,m.is_visible,m.created_at
  from public.lesson_materials m
  join public.curriculum_topics t on t.id=m.topic_id
  where p_topic_id is null or m.topic_id=p_topic_id
  order by t.sort_order,m.created_at desc;
end;$function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_lesson_nonvisitors(p_token uuid, p_topic_id bigint, p_class text DEFAULT 'ALL'::text)
 RETURNS TABLE(student_id bigint, full_name text, class_name text, username text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if public._portal_teacher_id(p_token) is null then return; end if;
  return query
  select s.id,s.full_name,s.class_name,s.username
  from public.students s
  where s.is_active=true
    and (p_class='ALL' or s.class_name=p_class)
    and not exists(
      select 1 from public.lesson_visits v where v.student_id=s.id and v.topic_id=p_topic_id
    )
  order by s.class_name,s.full_name;
end;$function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_lesson_plan(p_token uuid, p_class text, p_topic_id bigint)
 RETURNS TABLE(objectives text, teacher_note text, requirements text, experiment_title text, experiment_url text, updated_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select lp.objectives,lp.teacher_note,lp.requirements,lp.experiment_title,lp.experiment_url,lp.updated_at
  from public.class_lesson_plans lp
  where public._portal_teacher_id(p_token) is not null and lp.class_name=p_class and lp.topic_id=p_topic_id;
$function$;
revoke all on function public.portal_teacher_lesson_materials(p_token uuid, p_topic_id bigint) from public, anon, authenticated;
grant execute on function public.portal_teacher_lesson_materials(p_token uuid, p_topic_id bigint) to authenticated;
grant execute on function public.portal_teacher_lesson_materials(p_token uuid, p_topic_id bigint) to anon;
grant execute on function public.portal_teacher_lesson_materials(p_token uuid, p_topic_id bigint) to service_role;

-- portal_teacher_lesson_nonvisitors
CREATE OR REPLACE FUNCTION public.portal_teacher_lesson_nonvisitors(p_token uuid, p_topic_id bigint, p_class text DEFAULT 'ALL'::text)
 RETURNS TABLE(student_id bigint, full_name text, class_name text, username text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if public._portal_teacher_id(p_token) is null then return; end if;
  return query
  select s.id,s.full_name,s.class_name,s.username
  from public.students s
  where s.is_active=true
    and (p_class='ALL' or s.class_name=p_class)
    and not exists(
      select 1 from public.lesson_visits v where v.student_id=s.id and v.topic_id=p_topic_id
    )
  order by s.class_name,s.full_name;
end;$function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_lesson_plan(p_token uuid, p_class text, p_topic_id bigint)
 RETURNS TABLE(objectives text, teacher_note text, requirements text, experiment_title text, experiment_url text, updated_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select lp.objectives,lp.teacher_note,lp.requirements,lp.experiment_title,lp.experiment_url,lp.updated_at
  from public.class_lesson_plans lp
  where public._portal_teacher_id(p_token) is not null and lp.class_name=p_class and lp.topic_id=p_topic_id;
$function$;
revoke all on function public.portal_teacher_lesson_nonvisitors(p_token uuid, p_topic_id bigint, p_class text) from public, anon, authenticated;
grant execute on function public.portal_teacher_lesson_nonvisitors(p_token uuid, p_topic_id bigint, p_class text) to authenticated;
grant execute on function public.portal_teacher_lesson_nonvisitors(p_token uuid, p_topic_id bigint, p_class text) to anon;
grant execute on function public.portal_teacher_lesson_nonvisitors(p_token uuid, p_topic_id bigint, p_class text) to service_role;

-- portal_teacher_lesson_plan
CREATE OR REPLACE FUNCTION public.portal_teacher_lesson_plan(p_token uuid, p_class text, p_topic_id bigint)
 RETURNS TABLE(objectives text, teacher_note text, requirements text, experiment_title text, experiment_url text, updated_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select lp.objectives,lp.teacher_note,lp.requirements,lp.experiment_title,lp.experiment_url,lp.updated_at
  from public.class_lesson_plans lp
  where public._portal_teacher_id(p_token) is not null and lp.class_name=p_class and lp.topic_id=p_topic_id;
$function$;
revoke all on function public.portal_teacher_lesson_plan(p_token uuid, p_class text, p_topic_id bigint) from public, anon, authenticated;
grant execute on function public.portal_teacher_lesson_plan(p_token uuid, p_class text, p_topic_id bigint) to authenticated;
grant execute on function public.portal_teacher_lesson_plan(p_token uuid, p_class text, p_topic_id bigint) to anon;
grant execute on function public.portal_teacher_lesson_plan(p_token uuid, p_class text, p_topic_id bigint) to service_role;

-- portal_teacher_lesson_visits
CREATE OR REPLACE FUNCTION public.portal_teacher_lesson_visits(p_token uuid, p_topic_id bigint, p_class text DEFAULT 'ALL'::text)
 RETURNS TABLE(student_id bigint, full_name text, class_name text, username text, first_opened_at timestamp with time zone, last_opened_at timestamp with time zone, open_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if public._portal_teacher_id(p_token) is null then return; end if;
  return query
  select s.id,s.full_name,s.class_name,s.username,v.first_opened_at,v.last_opened_at,v.open_count
  from public.lesson_visits v
  join public.students s on s.id=v.student_id
  where v.topic_id=p_topic_id
    and s.is_active=true
    and (p_class='ALL' or s.class_name=p_class)
  order by v.last_opened_at desc,s.full_name;
end;$function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_login(p_username text, p_password text)
 RETURNS TABLE(token uuid, teacher_id bigint, full_name text, username text, must_change_password boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v public.teacher_users%rowtype;
  v_token uuid;
  v_now timestamptz := now();
  g public.teacher_login_guard%rowtype;
  u text := trim(coalesce(p_username,''));
begin
  -- لا تكشف هل اسم المستخدم موجود أم لا
  if u = '' or coalesce(p_password,'') = '' then
    return;
  end if;

  -- اقرأ حالة الحماية الحالية
  select * into g
  from public.teacher_login_guard
  where teacher_login_guard.username = u;

  -- إذا انتهى الحظر، صفّر العداد
  if g.username is not null and g.locked_until is not null and g.locked_until <= v_now then
    update public.teacher_login_guard
       set failed_count = 0,
           first_failed_at = null,
           last_failed_at = null,
           locked_until = null
     where teacher_login_guard.username = u;
    g := null;
  end if;

  -- حظر مؤقت بعد عدد كبير من المحاولات الفاشلة
  if g.username is not null and g.locked_until is not null and g.locked_until > v_now then
    return;
  end if;

  select * into v
  from public.teacher_users t
  where trim(t.username) = u
    and t.is_active = true
    and t.password_hash = extensions.crypt(p_password, t.password_hash)
  limit 1;

  if v.id is null then
    insert into public.teacher_login_guard(username, failed_count, first_failed_at, last_failed_at, locked_until)
    values (u, 1, v_now, v_now, null)
    on conflict (username) do update
      set failed_count = case
            when public.teacher_login_guard.first_failed_at is null
              or public.teacher_login_guard.first_failed_at < v_now - interval '10 minutes'
            then 1
            else public.teacher_login_guard.failed_count + 1
          end,
          first_failed_at = case
            when public.teacher_login_guard.first_failed_at is null
              or public.teacher_login_guard.first_failed_at < v_now - interval '10 minutes'
            then v_now
            else public.teacher_login_guard.first_failed_at
          end,
          last_failed_at = v_now,
          locked_until = case
            when (
              case
                when public.teacher_login_guard.first_failed_at is null
                  or public.teacher_login_guard.first_failed_at < v_now - interval '10 minutes'
                then 1
                else public.teacher_login_guard.failed_count + 1
              end
            ) >= 10
            then v_now + interval '15 minutes'
            else null
          end;
    return;
  end if;

  -- نجاح الدخول: امسح سجل المحاولات الفاشلة لهذا الحساب
  delete from public.teacher_login_guard where teacher_login_guard.username = u;

  -- نفس سلوك الدالة الأصلية: حذف الجلسات القديمة وإنشاء جلسة جديدة
  delete from public.teacher_sessions ts
   where ts.teacher_id = v.id
      or ts.expires_at <= v_now;

  v_token := extensions.gen_random_uuid();
  insert into public.teacher_sessions(token, teacher_id)
  values (v_token, v.id);

  return query
  select v_token,
         v.id,
         v.full_name,
         v.username,
         coalesce(v.must_change_password, true);
end
$function$;
revoke all on function public.portal_teacher_lesson_visits(p_token uuid, p_topic_id bigint, p_class text) from public, anon, authenticated;
grant execute on function public.portal_teacher_lesson_visits(p_token uuid, p_topic_id bigint, p_class text) to authenticated;
grant execute on function public.portal_teacher_lesson_visits(p_token uuid, p_topic_id bigint, p_class text) to anon;
grant execute on function public.portal_teacher_lesson_visits(p_token uuid, p_topic_id bigint, p_class text) to service_role;

-- portal_teacher_overview
CREATE OR REPLACE FUNCTION public.portal_teacher_overview(p_token uuid)
 RETURNS TABLE(total_students bigint, new_questions bigint, announcements bigint, content_items bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
 select (select count(*) from public.students where is_active=true),
        (select count(*) from public.student_questions where status='new'),
        (select count(*) from public.announcements),
        (select count(*) from public.content_items where is_published=true)
 where public._portal_teacher_id(p_token) is not null;
$function$;
revoke all on function public.portal_teacher_overview(p_token uuid) from public, anon, authenticated;
grant execute on function public.portal_teacher_overview(p_token uuid) to authenticated;
grant execute on function public.portal_teacher_overview(p_token uuid) to anon;
grant execute on function public.portal_teacher_overview(p_token uuid) to service_role;

-- portal_teacher_progress
CREATE OR REPLACE FUNCTION public.portal_teacher_progress(p_token uuid)
 RETURNS TABLE(class_name text, topic_id bigint, section_code text, topic_title text, page_no integer, note text, updated_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
 select cp.class_name,cp.topic_id,ct.section_code,ct.title,ct.page_no,cp.note,cp.updated_at
 from public.class_progress cp left join public.curriculum_topics ct on ct.id=cp.topic_id
 where public._portal_teacher_id(p_token) is not null order by cp.class_name;
$function$;
revoke all on function public.portal_teacher_progress(p_token uuid) from public, anon, authenticated;
grant execute on function public.portal_teacher_progress(p_token uuid) to authenticated;
grant execute on function public.portal_teacher_progress(p_token uuid) to anon;
grant execute on function public.portal_teacher_progress(p_token uuid) to service_role;

-- portal_teacher_question_bank
CREATE OR REPLACE FUNCTION public.portal_teacher_question_bank(p_token uuid)
 RETURNS TABLE(id bigint, title text, question_text text, question_image text, solution_text text, solution_image text, target_class text, is_visible boolean, show_solution boolean, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select q.id,q.title,q.question_text,q.question_image,q.solution_text,q.solution_image,
         q.target_class,q.is_visible,q.show_solution,q.created_at
  from public.portal_question_bank q
  where public._portal_teacher_id(p_token) is not null
  order by q.created_at desc;
$function$;
revoke all on function public.portal_teacher_question_bank(p_token uuid) from public, anon, authenticated;
grant execute on function public.portal_teacher_question_bank(p_token uuid) to authenticated;
grant execute on function public.portal_teacher_question_bank(p_token uuid) to anon;
grant execute on function public.portal_teacher_question_bank(p_token uuid) to service_role;

-- portal_teacher_questions
CREATE OR REPLACE FUNCTION public.portal_teacher_questions(p_token uuid, p_status text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, student_id bigint, full_name text, class_name text, question_text text, attachment_url text, teacher_reply text, status text, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
 select q.id,q.student_id,s.full_name,s.class_name,q.question_text,q.attachment_url,q.teacher_reply,q.status,q.created_at
 from public.student_questions q join public.students s on s.id=q.student_id
 where public._portal_teacher_id(p_token) is not null and (p_status is null or q.status=p_status)
 order by case when q.status='new' then 0 else 1 end,q.created_at desc;
$function$;
revoke all on function public.portal_teacher_questions(p_token uuid, p_status text) from public, anon, authenticated;
grant execute on function public.portal_teacher_questions(p_token uuid, p_status text) to authenticated;
grant execute on function public.portal_teacher_questions(p_token uuid, p_status text) to anon;
grant execute on function public.portal_teacher_questions(p_token uuid, p_status text) to service_role;

-- portal_teacher_reply_question
CREATE OR REPLACE FUNCTION public.portal_teacher_reply_question(p_token uuid, p_question_id bigint, p_reply text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin if public._portal_teacher_id(p_token) is null then return false; end if;
 update public.student_questions set teacher_reply=p_reply,status='answered',answered_at=now() where id=p_question_id; return found; end $function$
;

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
revoke all on function public.portal_teacher_reply_question(p_token uuid, p_question_id bigint, p_reply text) from public, anon, authenticated;
grant execute on function public.portal_teacher_reply_question(p_token uuid, p_question_id bigint, p_reply text) to authenticated;
grant execute on function public.portal_teacher_reply_question(p_token uuid, p_question_id bigint, p_reply text) to anon;
grant execute on function public.portal_teacher_reply_question(p_token uuid, p_question_id bigint, p_reply text) to service_role;

-- portal_teacher_resolve_behavior_record
CREATE OR REPLACE FUNCTION public.portal_teacher_resolve_behavior_record(p_token text, p_record_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin

  if not exists (
    select 1
    from public.teacher_sessions ts
    where ts.token = p_token::uuid
      and ts.expires_at > now()
  ) then
    return false;
  end if;

  update public.portal_behavior_records
  set
    is_resolved = true,
    resolved_at = now()
  where id = p_record_id;

  return found;

end;
$function$;
revoke all on function public.portal_teacher_resolve_behavior_record(p_token text, p_record_id bigint) from public, anon, authenticated;
grant execute on function public.portal_teacher_resolve_behavior_record(p_token text, p_record_id bigint) to authenticated;
grant execute on function public.portal_teacher_resolve_behavior_record(p_token text, p_record_id bigint) to anon;
grant execute on function public.portal_teacher_resolve_behavior_record(p_token text, p_record_id bigint) to service_role;

-- portal_teacher_save_lesson_plan
CREATE OR REPLACE FUNCTION public.portal_teacher_save_lesson_plan(p_token uuid, p_class text, p_topic_id bigint, p_objectives text DEFAULT NULL::text, p_teacher_note text DEFAULT NULL::text, p_requirements text DEFAULT NULL::text, p_experiment_title text DEFAULT NULL::text, p_experiment_url text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare tid bigint;
begin
  tid:=public._portal_teacher_id(p_token); if tid is null then return false; end if;
  if p_class not in ('9/1','9/2','9/3','9/4','9/5','9/6','9/7') then return false; end if;
  insert into public.class_lesson_plans(class_name,topic_id,objectives,teacher_note,requirements,experiment_title,experiment_url,updated_at,updated_by)
  values(p_class,p_topic_id,nullif(trim(p_objectives),''),nullif(trim(p_teacher_note),''),nullif(trim(p_requirements),''),nullif(trim(p_experiment_title),''),nullif(trim(p_experiment_url),''),now(),tid)
  on conflict(class_name,topic_id) do update set
    objectives=excluded.objectives,teacher_note=excluded.teacher_note,requirements=excluded.requirements,
    experiment_title=excluded.experiment_title,experiment_url=excluded.experiment_url,updated_at=now(),updated_by=tid;
  return true;
end;$function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_set_experiment_visibility(p_token uuid, p_experiment_id bigint, p_is_visible boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if public._portal_teacher_id(p_token) is null then return false; end if;
  update public.portal_experiments
  set is_visible=p_is_visible, updated_at=now()
  where id=p_experiment_id;
  return found;
end $function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_set_lesson_material_visibility(p_token uuid, p_material_id bigint, p_is_visible boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if public._portal_teacher_id(p_token) is null then return false; end if;
  update public.lesson_materials set is_visible=p_is_visible where id=p_material_id;
  return found;
end;$function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_set_progress(p_token uuid, p_class text, p_topic_id bigint, p_note text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare tid bigint;
begin tid:=public._portal_teacher_id(p_token); if tid is null or p_class not in ('9/1','9/2','9/3','9/4','9/5','9/6','9/7') then return false; end if;
 insert into public.class_progress(class_name,topic_id,note,updated_at,updated_by) values(p_class,p_topic_id,p_note,now(),tid)
 on conflict(class_name) do update set topic_id=excluded.topic_id,note=excluded.note,updated_at=now(),updated_by=tid;
 return true; end $function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_set_question_state(p_token uuid, p_question_id bigint, p_is_visible boolean, p_show_solution boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if public._portal_teacher_id(p_token) is null then return false; end if;
  update public.portal_question_bank
  set is_visible=p_is_visible, show_solution=p_show_solution, updated_at=now()
  where id=p_question_id;
  return found;
end $function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_set_video_visibility(p_token uuid, p_video_id bigint, p_is_visible boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF public._portal_teacher_id(p_token) IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.portal_videos
  SET is_visible = coalesce(p_is_visible,false), updated_at = now()
  WHERE id = p_video_id;

  RETURN FOUND;
END
$function$;
revoke all on function public.portal_teacher_save_lesson_plan(p_token uuid, p_class text, p_topic_id bigint, p_objectives text, p_teacher_note text, p_requirements text, p_experiment_title text, p_experiment_url text) from public, anon, authenticated;
grant execute on function public.portal_teacher_save_lesson_plan(p_token uuid, p_class text, p_topic_id bigint, p_objectives text, p_teacher_note text, p_requirements text, p_experiment_title text, p_experiment_url text) to authenticated;
grant execute on function public.portal_teacher_save_lesson_plan(p_token uuid, p_class text, p_topic_id bigint, p_objectives text, p_teacher_note text, p_requirements text, p_experiment_title text, p_experiment_url text) to anon;
grant execute on function public.portal_teacher_save_lesson_plan(p_token uuid, p_class text, p_topic_id bigint, p_objectives text, p_teacher_note text, p_requirements text, p_experiment_title text, p_experiment_url text) to service_role;

-- portal_teacher_set_experiment_visibility
CREATE OR REPLACE FUNCTION public.portal_teacher_set_experiment_visibility(p_token uuid, p_experiment_id bigint, p_is_visible boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if public._portal_teacher_id(p_token) is null then return false; end if;
  update public.portal_experiments
  set is_visible=p_is_visible, updated_at=now()
  where id=p_experiment_id;
  return found;
end $function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_set_lesson_material_visibility(p_token uuid, p_material_id bigint, p_is_visible boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if public._portal_teacher_id(p_token) is null then return false; end if;
  update public.lesson_materials set is_visible=p_is_visible where id=p_material_id;
  return found;
end;$function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_set_progress(p_token uuid, p_class text, p_topic_id bigint, p_note text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare tid bigint;
begin tid:=public._portal_teacher_id(p_token); if tid is null or p_class not in ('9/1','9/2','9/3','9/4','9/5','9/6','9/7') then return false; end if;
 insert into public.class_progress(class_name,topic_id,note,updated_at,updated_by) values(p_class,p_topic_id,p_note,now(),tid)
 on conflict(class_name) do update set topic_id=excluded.topic_id,note=excluded.note,updated_at=now(),updated_by=tid;
 return true; end $function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_set_question_state(p_token uuid, p_question_id bigint, p_is_visible boolean, p_show_solution boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if public._portal_teacher_id(p_token) is null then return false; end if;
  update public.portal_question_bank
  set is_visible=p_is_visible, show_solution=p_show_solution, updated_at=now()
  where id=p_question_id;
  return found;
end $function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_set_video_visibility(p_token uuid, p_video_id bigint, p_is_visible boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF public._portal_teacher_id(p_token) IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.portal_videos
  SET is_visible = coalesce(p_is_visible,false), updated_at = now()
  WHERE id = p_video_id;

  RETURN FOUND;
END
$function$;
revoke all on function public.portal_teacher_set_experiment_visibility(p_token uuid, p_experiment_id bigint, p_is_visible boolean) from public, anon, authenticated;
grant execute on function public.portal_teacher_set_experiment_visibility(p_token uuid, p_experiment_id bigint, p_is_visible boolean) to authenticated;
grant execute on function public.portal_teacher_set_experiment_visibility(p_token uuid, p_experiment_id bigint, p_is_visible boolean) to anon;
grant execute on function public.portal_teacher_set_experiment_visibility(p_token uuid, p_experiment_id bigint, p_is_visible boolean) to service_role;

-- portal_teacher_set_lesson_material_visibility
CREATE OR REPLACE FUNCTION public.portal_teacher_set_lesson_material_visibility(p_token uuid, p_material_id bigint, p_is_visible boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if public._portal_teacher_id(p_token) is null then return false; end if;
  update public.lesson_materials set is_visible=p_is_visible where id=p_material_id;
  return found;
end;$function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_set_progress(p_token uuid, p_class text, p_topic_id bigint, p_note text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare tid bigint;
begin tid:=public._portal_teacher_id(p_token); if tid is null or p_class not in ('9/1','9/2','9/3','9/4','9/5','9/6','9/7') then return false; end if;
 insert into public.class_progress(class_name,topic_id,note,updated_at,updated_by) values(p_class,p_topic_id,p_note,now(),tid)
 on conflict(class_name) do update set topic_id=excluded.topic_id,note=excluded.note,updated_at=now(),updated_by=tid;
 return true; end $function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_set_question_state(p_token uuid, p_question_id bigint, p_is_visible boolean, p_show_solution boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if public._portal_teacher_id(p_token) is null then return false; end if;
  update public.portal_question_bank
  set is_visible=p_is_visible, show_solution=p_show_solution, updated_at=now()
  where id=p_question_id;
  return found;
end $function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_set_video_visibility(p_token uuid, p_video_id bigint, p_is_visible boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF public._portal_teacher_id(p_token) IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.portal_videos
  SET is_visible = coalesce(p_is_visible,false), updated_at = now()
  WHERE id = p_video_id;

  RETURN FOUND;
END
$function$;
revoke all on function public.portal_teacher_set_lesson_material_visibility(p_token uuid, p_material_id bigint, p_is_visible boolean) from public, anon, authenticated;
grant execute on function public.portal_teacher_set_lesson_material_visibility(p_token uuid, p_material_id bigint, p_is_visible boolean) to authenticated;
grant execute on function public.portal_teacher_set_lesson_material_visibility(p_token uuid, p_material_id bigint, p_is_visible boolean) to anon;
grant execute on function public.portal_teacher_set_lesson_material_visibility(p_token uuid, p_material_id bigint, p_is_visible boolean) to service_role;

-- portal_teacher_set_progress
CREATE OR REPLACE FUNCTION public.portal_teacher_set_progress(p_token uuid, p_class text, p_topic_id bigint, p_note text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare tid bigint;
begin tid:=public._portal_teacher_id(p_token); if tid is null or p_class not in ('9/1','9/2','9/3','9/4','9/5','9/6','9/7') then return false; end if;
 insert into public.class_progress(class_name,topic_id,note,updated_at,updated_by) values(p_class,p_topic_id,p_note,now(),tid)
 on conflict(class_name) do update set topic_id=excluded.topic_id,note=excluded.note,updated_at=now(),updated_by=tid;
 return true; end $function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_set_question_state(p_token uuid, p_question_id bigint, p_is_visible boolean, p_show_solution boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if public._portal_teacher_id(p_token) is null then return false; end if;
  update public.portal_question_bank
  set is_visible=p_is_visible, show_solution=p_show_solution, updated_at=now()
  where id=p_question_id;
  return found;
end $function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_set_video_visibility(p_token uuid, p_video_id bigint, p_is_visible boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF public._portal_teacher_id(p_token) IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.portal_videos
  SET is_visible = coalesce(p_is_visible,false), updated_at = now()
  WHERE id = p_video_id;

  RETURN FOUND;
END
$function$;
revoke all on function public.portal_teacher_set_progress(p_token uuid, p_class text, p_topic_id bigint, p_note text) from public, anon, authenticated;
grant execute on function public.portal_teacher_set_progress(p_token uuid, p_class text, p_topic_id bigint, p_note text) to authenticated;
grant execute on function public.portal_teacher_set_progress(p_token uuid, p_class text, p_topic_id bigint, p_note text) to anon;
grant execute on function public.portal_teacher_set_progress(p_token uuid, p_class text, p_topic_id bigint, p_note text) to service_role;

-- portal_teacher_set_question_state
CREATE OR REPLACE FUNCTION public.portal_teacher_set_question_state(p_token uuid, p_question_id bigint, p_is_visible boolean, p_show_solution boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if public._portal_teacher_id(p_token) is null then return false; end if;
  update public.portal_question_bank
  set is_visible=p_is_visible, show_solution=p_show_solution, updated_at=now()
  where id=p_question_id;
  return found;
end $function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_set_video_visibility(p_token uuid, p_video_id bigint, p_is_visible boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF public._portal_teacher_id(p_token) IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.portal_videos
  SET is_visible = coalesce(p_is_visible,false), updated_at = now()
  WHERE id = p_video_id;

  RETURN FOUND;
END
$function$;
revoke all on function public.portal_teacher_set_question_state(p_token uuid, p_question_id bigint, p_is_visible boolean, p_show_solution boolean) from public, anon, authenticated;
grant execute on function public.portal_teacher_set_question_state(p_token uuid, p_question_id bigint, p_is_visible boolean, p_show_solution boolean) to authenticated;
grant execute on function public.portal_teacher_set_question_state(p_token uuid, p_question_id bigint, p_is_visible boolean, p_show_solution boolean) to anon;
grant execute on function public.portal_teacher_set_question_state(p_token uuid, p_question_id bigint, p_is_visible boolean, p_show_solution boolean) to service_role;

-- portal_teacher_set_video_visibility
CREATE OR REPLACE FUNCTION public.portal_teacher_set_video_visibility(p_token uuid, p_video_id bigint, p_is_visible boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF public._portal_teacher_id(p_token) IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.portal_videos
  SET is_visible = coalesce(p_is_visible,false), updated_at = now()
  WHERE id = p_video_id;

  RETURN FOUND;
END
$function$;
revoke all on function public.portal_teacher_set_video_visibility(p_token uuid, p_video_id bigint, p_is_visible boolean) from public, anon, authenticated;
grant execute on function public.portal_teacher_set_video_visibility(p_token uuid, p_video_id bigint, p_is_visible boolean) to authenticated;
grant execute on function public.portal_teacher_set_video_visibility(p_token uuid, p_video_id bigint, p_is_visible boolean) to anon;
grant execute on function public.portal_teacher_set_video_visibility(p_token uuid, p_video_id bigint, p_is_visible boolean) to service_role;

-- portal_teacher_topics
CREATE OR REPLACE FUNCTION public.portal_teacher_topics(p_token uuid)
 RETURNS TABLE(id bigint, unit_no integer, unit_title text, section_code text, title text, page_no integer, sort_order integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
 select c.id,c.unit_no,c.unit_title,c.section_code,c.title,c.page_no,c.sort_order
 from public.curriculum_topics c where public._portal_teacher_id(p_token) is not null and c.is_active=true order by c.sort_order;
$function$;
revoke all on function public.portal_teacher_topics(p_token uuid) from public, anon, authenticated;
grant execute on function public.portal_teacher_topics(p_token uuid) to authenticated;
grant execute on function public.portal_teacher_topics(p_token uuid) to anon;
grant execute on function public.portal_teacher_topics(p_token uuid) to service_role;

-- portal_teacher_update_grade
CREATE OR REPLACE FUNCTION public.portal_teacher_update_grade(p_token text, p_grade_id bigint, p_score numeric, p_max_score numeric, p_note text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
    if not exists (
        select 1 from public.teacher_sessions ts
        where ts.token = p_token::uuid
          and ts.expires_at > now()
    ) then
        return false;
    end if;

    if p_score is null or p_max_score is null
       or p_max_score <= 0 or p_score < 0 or p_score > p_max_score then
        return false;
    end if;

    update public.student_grades
       set score = p_score,
           max_score = p_max_score,
           note = nullif(trim(coalesce(p_note,'')), '')
     where id = p_grade_id;

    return found;
end;
$function$;
revoke all on function public.portal_teacher_update_grade(p_token text, p_grade_id bigint, p_score numeric, p_max_score numeric, p_note text) from public, anon, authenticated;
grant execute on function public.portal_teacher_update_grade(p_token text, p_grade_id bigint, p_score numeric, p_max_score numeric, p_note text) to service_role;

-- portal_teacher_update_grade_value
CREATE OR REPLACE FUNCTION public.portal_teacher_update_grade_value(p_token text, p_grade_id bigint, p_score numeric)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_ok boolean := false;
begin
  if p_token is null or p_grade_id is null or p_score is null or p_score < 0 then
    return false;
  end if;

  if not exists (
    select 1
    from public.teacher_sessions ts
    where ts.token::text = p_token
      and ts.expires_at > now()
  ) then
    return false;
  end if;

  update public.student_grades
     set score = p_score
   where id = p_grade_id
     and p_score <= max_score;

  get diagnostics v_ok = row_count;
  return v_ok;
end;
$function$;
revoke all on function public.portal_teacher_update_grade_value(p_token text, p_grade_id bigint, p_score numeric) from public, anon, authenticated;
grant execute on function public.portal_teacher_update_grade_value(p_token text, p_grade_id bigint, p_score numeric) to authenticated;
grant execute on function public.portal_teacher_update_grade_value(p_token text, p_grade_id bigint, p_score numeric) to anon;
grant execute on function public.portal_teacher_update_grade_value(p_token text, p_grade_id bigint, p_score numeric) to service_role;

-- portal_teacher_update_question_bank
CREATE OR REPLACE FUNCTION public.portal_teacher_update_question_bank(p_token uuid, p_question_id bigint, p_title text, p_question_text text, p_question_image text, p_solution_text text, p_solution_image text, p_target_class text, p_is_visible boolean, p_show_solution boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  tid bigint;
begin
  tid := public._portal_teacher_id(p_token);

  if tid is null then
    return false;
  end if;

  update public.portal_question_bank
  set
    title = p_title,
    question_text = p_question_text,
    question_image = p_question_image,
    solution_text = p_solution_text,
    solution_image = p_solution_image,
    target_class = p_target_class,
    is_visible = p_is_visible,
    show_solution = p_show_solution
  where id = p_question_id;

  return found;
end
$function$;
revoke all on function public.portal_teacher_update_question_bank(p_token uuid, p_question_id bigint, p_title text, p_question_text text, p_question_image text, p_solution_text text, p_solution_image text, p_target_class text, p_is_visible boolean, p_show_solution boolean) from public, anon, authenticated;
grant execute on function public.portal_teacher_update_question_bank(p_token uuid, p_question_id bigint, p_title text, p_question_text text, p_question_image text, p_solution_text text, p_solution_image text, p_target_class text, p_is_visible boolean, p_show_solution boolean) to authenticated;
grant execute on function public.portal_teacher_update_question_bank(p_token uuid, p_question_id bigint, p_title text, p_question_text text, p_question_image text, p_solution_text text, p_solution_image text, p_target_class text, p_is_visible boolean, p_show_solution boolean) to anon;
grant execute on function public.portal_teacher_update_question_bank(p_token uuid, p_question_id bigint, p_title text, p_question_text text, p_question_image text, p_solution_text text, p_solution_image text, p_target_class text, p_is_visible boolean, p_show_solution boolean) to service_role;

-- portal_teacher_videos
CREATE OR REPLACE FUNCTION public.portal_teacher_videos(p_token uuid)
 RETURNS TABLE(id bigint, title text, lesson_name text, description text, video_url text, target_class text, is_visible boolean, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT
    v.id, v.title, v.lesson_name, v.description, v.video_url,
    v.target_class, v.is_visible, v.created_at
  FROM public.portal_videos v
  WHERE public._portal_teacher_id(p_token) IS NOT NULL
  ORDER BY v.created_at DESC, v.id DESC;
$function$;
revoke all on function public.portal_teacher_videos(p_token uuid) from public, anon, authenticated;
grant execute on function public.portal_teacher_videos(p_token uuid) to authenticated;
grant execute on function public.portal_teacher_videos(p_token uuid) to anon;
grant execute on function public.portal_teacher_videos(p_token uuid) to service_role;

-- portal_teacher_mt_adjust_points
CREATE OR REPLACE FUNCTION public.portal_teacher_mt_adjust_points(p_token uuid, p_subject_code text, p_student_id bigint, p_delta numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v numeric;
begin
 if not public._portal_mt_has_student(p_token,p_subject_code,p_student_id) then return null; end if;
 insert into public.portal_mt_points(teacher_id,subject_id,student_id,points,updated_at)
 values(public._portal_teacher_id(p_token),public._portal_mt_subject_id(p_subject_code),p_student_id,coalesce(p_delta,0),now())
 on conflict(teacher_id,subject_id,student_id) do update set points=public.portal_mt_points.points+excluded.points,updated_at=now()
 returning points into v; return v;
end $function$
;

CREATE OR REPLACE FUNCTION public.portal_teacher_mt_announcements(p_token uuid, p_subject_code text)
 RETURNS TABLE(id bigint, title text, body text, target_class text, is_popup boolean, read_count bigint, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select a.id,a.title,a.body,a.target_class,a.is_popup,
         (a.legacy_read_count + count(r.student_id))::bigint,a.created_at
  from public.portal_mt_announcements a
  left join public.portal_mt_announcement_reads r on r.announcement_id=a.id
  where a.teacher_id=public._portal_teacher_id(p_token)
    and a.subject_id=public._portal_mt_subject_id(p_subject_code)
  group by a.id,a.title,a.body,a.target_class,a.is_popup,a.legacy_read_count,a.created_at
  order by a.created_at desc
$function$;
revoke all on function public.portal_teacher_mt_adjust_points(p_token uuid, p_subject_code text, p_student_id bigint, p_delta numeric) from public, anon, authenticated;
grant execute on function public.portal_teacher_mt_adjust_points(p_token uuid, p_subject_code text, p_student_id bigint, p_delta numeric) to authenticated;
grant execute on function public.portal_teacher_mt_adjust_points(p_token uuid, p_subject_code text, p_student_id bigint, p_delta numeric) to anon;
grant execute on function public.portal_teacher_mt_adjust_points(p_token uuid, p_subject_code text, p_student_id bigint, p_delta numeric) to service_role;

drop function if exists public._portal_is_legacy_owner(text);

commit;
