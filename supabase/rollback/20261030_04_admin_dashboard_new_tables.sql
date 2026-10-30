-- التراجع عن 20261030_04_admin_dashboard_new_tables: يعيد دوال المشرف الأربع حرفيًا كما كانت في 2026-10-30.

begin;

-- portal_admin_grades_filtered
CREATE OR REPLACE FUNCTION public.portal_admin_grades_filtered(p_token uuid, p_query text DEFAULT ''::text, p_class text DEFAULT 'ALL'::text)
 RETURNS TABLE(source text, student_id bigint, full_name text, class_name text, username text, subject_id bigint, subject_label text, assessment_title text, score numeric, max_score numeric, note text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
#variable_conflict use_column
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.portal_admin_sessions AS ses
    JOIN public.portal_admin_users AS au ON au.id = ses.admin_id
    WHERE ses.token = p_token
      AND ses.expires_at > now()
      AND au.is_active = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH all_grades AS (
    SELECT
      'general'::text AS src,
      g.student_id,
      NULL::bigint AS subject_id,
      'عام'::text AS subject_label,
      g.assessment_title::text AS assessment_title,
      g.score::numeric AS score,
      g.max_score::numeric AS max_score,
      g.note::text AS note,
      g.created_at
    FROM public.student_grades AS g

    UNION ALL

    SELECT
      'subject'::text AS src,
      mg.student_id,
      mg.subject_id,
      ('مادة #' || mg.subject_id::text)::text AS subject_label,
      mg.assessment_title::text AS assessment_title,
      mg.score::numeric AS score,
      mg.max_score::numeric AS max_score,
      mg.note::text AS note,
      mg.created_at
    FROM public.portal_mt_grades AS mg
  )
  SELECT
    ag.src,
    st.id,
    st.full_name::text,
    st.class_name::text,
    st.username::text,
    ag.subject_id,
    ag.subject_label,
    ag.assessment_title,
    ag.score,
    ag.max_score,
    ag.note,
    ag.created_at
  FROM public.students AS st
  LEFT JOIN all_grades AS ag ON ag.student_id = st.id
  WHERE
    (COALESCE(trim(p_query), '') = ''
      OR st.full_name ILIKE '%' || trim(p_query) || '%'
      OR st.username ILIKE '%' || trim(p_query) || '%'
      OR st.class_name ILIKE '%' || trim(p_query) || '%')
    AND (
      COALESCE(p_class, 'ALL') = 'ALL'
      OR (p_class LIKE 'GRADE:%' AND split_part(st.class_name, '/', 1) = split_part(p_class, ':', 2))
      OR (p_class LIKE 'CLASS:%' AND st.class_name = substring(p_class FROM 7))
    )
  ORDER BY
    CASE WHEN st.class_name ~ '^\d+[/\-]\d+$' THEN split_part(regexp_replace(st.class_name, '-', '/', 'g'), '/', 1)::integer ELSE 999 END,
    CASE WHEN st.class_name ~ '^\d+[/\-]\d+$' THEN split_part(regexp_replace(st.class_name, '-', '/', 'g'), '/', 2)::integer ELSE 999 END,
    st.full_name,
    ag.created_at DESC NULLS LAST;
END;
$function$;
revoke all on function public.portal_admin_grades_filtered(p_token uuid, p_query text, p_class text) from public, anon, authenticated;
grant execute on function public.portal_admin_grades_filtered(p_token uuid, p_query text, p_class text) to authenticated;
grant execute on function public.portal_admin_grades_filtered(p_token uuid, p_query text, p_class text) to anon;
grant execute on function public.portal_admin_grades_filtered(p_token uuid, p_query text, p_class text) to service_role;

-- portal_admin_behavior_records
CREATE OR REPLACE FUNCTION public.portal_admin_behavior_records(p_token uuid, p_query text DEFAULT ''::text)
 RETURNS TABLE(source text, record_id bigint, student_id bigint, full_name text, class_name text, teacher_name text, behavior_type text, level text, details text, action_taken text, is_resolved boolean, created_at timestamp with time zone, repeat_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
#variable_conflict use_column
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.portal_admin_sessions AS s
    JOIN public.portal_admin_users AS a
      ON a.id = s.admin_id
    WHERE s.token = p_token
      AND s.expires_at > now()
      AND a.is_active = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH all_b AS (
    SELECT
      'legacy'::text AS src,
      b.id,
      b.student_id,
      NULL::bigint AS teacher_id,
      b.behavior_type::text AS behavior_type,
      b.level::text AS level,
      b.details::text AS details,
      b.action_taken::text AS action_taken,
      b.is_resolved,
      b.created_at
    FROM public.portal_behavior_records AS b

    UNION ALL

    SELECT
      'subject'::text AS src,
      b.id,
      b.student_id,
      b.teacher_id,
      b.behavior_type::text,
      b.level::text,
      b.details::text,
      b.action_taken::text,
      b.is_resolved,
      b.created_at
    FROM public.portal_mt_behavior AS b
  ),
  counts AS (
    SELECT
      ab.student_id,
      count(*)::bigint AS n
    FROM all_b AS ab
    GROUP BY ab.student_id
  )
  SELECT
    ab.src,
    ab.id,
    ab.student_id,
    st.full_name::text,
    st.class_name::text,
    tu.full_name::text,
    ab.behavior_type,
    ab.level,
    ab.details,
    ab.action_taken,
    ab.is_resolved,
    ab.created_at,
    c.n
  FROM all_b AS ab
  JOIN public.students AS st
    ON st.id = ab.student_id
  LEFT JOIN public.teacher_users AS tu
    ON tu.id = ab.teacher_id
  JOIN counts AS c
    ON c.student_id = ab.student_id
  WHERE
    COALESCE(trim(p_query), '') = ''
    OR st.full_name ILIKE '%' || trim(p_query) || '%'
    OR st.username ILIKE '%' || trim(p_query) || '%'
    OR st.class_name ILIKE '%' || trim(p_query) || '%'
  ORDER BY ab.created_at DESC;
END;
$function$;
revoke all on function public.portal_admin_behavior_records(p_token uuid, p_query text) from public, anon, authenticated;
grant execute on function public.portal_admin_behavior_records(p_token uuid, p_query text) to anon;
grant execute on function public.portal_admin_behavior_records(p_token uuid, p_query text) to service_role;

-- portal_admin_overview
CREATE OR REPLACE FUNCTION public.portal_admin_overview(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare result jsonb;
begin
  if not exists(select 1 from public.portal_admin_sessions s join public.portal_admin_users a on a.id=s.admin_id where s.token=p_token and s.expires_at>now() and a.is_active=true) then return null; end if;
  select jsonb_build_object(
    'students_total',(select count(*) from public.students),
    'students_active',(select count(*) from public.students where is_active),
    'students_logged_in',(select count(distinct e.student_id) from public.portal_student_login_events e join public.students s on s.id=e.student_id where s.is_active),
    'students_never_logged_in',(select count(*) from public.students s where s.is_active and not exists(select 1 from public.portal_student_login_events e where e.student_id=s.id)),
    'student_login_events',(select count(*) from public.portal_student_login_events),
    'teachers_total',(select count(*) from public.teacher_users),
    'teachers_active',(select count(*) from public.teacher_users where is_active),
    'teachers_logged_in',(select count(distinct e.teacher_id) from public.portal_admin_teacher_login_events e join public.teacher_users t on t.id=e.teacher_id where t.is_active),
    'teachers_never_logged_in',(select count(*) from public.teacher_users t where t.is_active and not exists(select 1 from public.portal_admin_teacher_login_events e where e.teacher_id=t.id)),
    'teacher_login_events',(select count(*) from public.portal_admin_teacher_login_events),
    'behavior_total',(select count(*) from public.portal_behavior_records)+(select count(*) from public.portal_mt_behavior),
    'behavior_open',(select count(*) from public.portal_behavior_records where not is_resolved)+(select count(*) from public.portal_mt_behavior where not is_resolved),
    'students_with_repeated_behavior',(select count(*) from (select student_id from (select student_id from public.portal_behavior_records union all select student_id from public.portal_mt_behavior) b group by student_id having count(*)>=2) repeated)
  ) into result;
  return result;
end;
$function$;
revoke all on function public.portal_admin_overview(p_token uuid) from public, anon, authenticated;
grant execute on function public.portal_admin_overview(p_token uuid) to anon;
grant execute on function public.portal_admin_overview(p_token uuid) to service_role;

-- portal_admin_students_filtered
CREATE OR REPLACE FUNCTION public.portal_admin_students_filtered(p_token uuid, p_query text DEFAULT ''::text, p_class text DEFAULT 'ALL'::text)
 RETURNS TABLE(student_id bigint, full_name text, class_name text, username text, is_active boolean, login_count bigint, last_login timestamp with time zone, behavior_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
#variable_conflict use_column
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.portal_admin_sessions AS ses
    JOIN public.portal_admin_users AS au ON au.id = ses.admin_id
    WHERE ses.token = p_token
      AND ses.expires_at > now()
      AND au.is_active = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    st.id,
    st.full_name::text,
    st.class_name::text,
    st.username::text,
    st.is_active,
    COALESCE(l.cnt, 0)::bigint,
    l.last_at,
    COALESCE(b.cnt, 0)::bigint
  FROM public.students AS st
  LEFT JOIN (
    SELECT e.student_id, count(*)::bigint AS cnt, max(e.logged_in_at) AS last_at
    FROM public.portal_student_login_events AS e
    GROUP BY e.student_id
  ) AS l ON l.student_id = st.id
  LEFT JOIN (
    SELECT x.student_id, count(*)::bigint AS cnt
    FROM (
      SELECT br.student_id FROM public.portal_behavior_records AS br
      UNION ALL
      SELECT mb.student_id FROM public.portal_mt_behavior AS mb
    ) AS x
    GROUP BY x.student_id
  ) AS b ON b.student_id = st.id
  WHERE
    (COALESCE(trim(p_query), '') = ''
      OR st.full_name ILIKE '%' || trim(p_query) || '%'
      OR st.username ILIKE '%' || trim(p_query) || '%'
      OR st.class_name ILIKE '%' || trim(p_query) || '%')
    AND (
      COALESCE(p_class, 'ALL') = 'ALL'
      OR (p_class LIKE 'GRADE:%' AND split_part(st.class_name, '/', 1) = split_part(p_class, ':', 2))
      OR (p_class LIKE 'CLASS:%' AND st.class_name = substring(p_class FROM 7))
    )
  ORDER BY
    CASE WHEN st.class_name ~ '^\d+[/\-]\d+$' THEN split_part(regexp_replace(st.class_name, '-', '/', 'g'), '/', 1)::integer ELSE 999 END,
    CASE WHEN st.class_name ~ '^\d+[/\-]\d+$' THEN split_part(regexp_replace(st.class_name, '-', '/', 'g'), '/', 2)::integer ELSE 999 END,
    st.full_name;
END;
$function$;
revoke all on function public.portal_admin_students_filtered(p_token uuid, p_query text, p_class text) from public, anon, authenticated;
grant execute on function public.portal_admin_students_filtered(p_token uuid, p_query text, p_class text) to authenticated;
grant execute on function public.portal_admin_students_filtered(p_token uuid, p_query text, p_class text) to anon;
grant execute on function public.portal_admin_students_filtered(p_token uuid, p_query text, p_class text) to service_role;

commit;
