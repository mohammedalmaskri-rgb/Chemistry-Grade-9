-- 20261120_15_file_storage_access
-- Purpose: let the `portal-files` Edge Function authorise file uploads/downloads for the existing token login,
-- and move old inline (base64) files out of the tables into Supabase Storage.
-- ADDITIVE ONLY: five new functions. No table/column/function is changed or dropped.
-- Files are referenced from the SAME columns as before by the string  storage:<kind>/<owner_id>/<uuid>.<ext>
--   portal_mt_materials.attachment_data   (kind = materials, owner = teacher_id)
--   portal_mt_content.link_url            (kind = content,   owner = teacher_id)
--   portal_mt_questions.attachment_url    (kind = questions, owner = student_id)
-- Old rows keep their data: URL until the admin runs the migration button; nothing is deleted here.
-- All five functions are callable by service_role ONLY (the Edge Function), never by anon/authenticated.
-- Rollback: supabase/rollback/20261120_15_file_storage_access.sql

-- Who is this token? teacher | student | admin
create or replace function public.portal_file_principal(p_token uuid)
returns table(role text, user_id bigint)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
#variable_conflict use_column
declare v bigint;
begin
  if p_token is null then return; end if;
  v := public._portal_teacher_id(p_token);
  if v is not null then return query select 'teacher'::text, v; return; end if;
  v := public._portal_mt_student_id(p_token);
  if v is not null then return query select 'student'::text, v; return; end if;
  select a.admin_id into v from public.portal_admin_me(p_token) a limit 1;
  if v is not null then return query select 'admin'::text, v; return; end if;
end
$function$;

-- May this token read this file? Mirrors the visibility rules of the list functions.
-- Returns nothing unless the row exists, is allowed for the caller, and holds a storage: reference
-- whose path lives under the row owner's own folder (so a crafted reference cannot reach someone else's file).
create or replace function public.portal_file_read_info(p_token uuid, p_kind text, p_id bigint)
returns table(storage_path text, file_name text, mime text)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
#variable_conflict use_column
declare
  pr_role text; pr_id bigint;
  raw text; owner bigint; fname text; fmime text; allowed boolean := false;
begin
  select p.role, p.user_id into pr_role, pr_id from public.portal_file_principal(p_token) p limit 1;
  if pr_role is null or p_id is null then return; end if;

  if p_kind = 'materials' then
    select m.attachment_data, m.teacher_id, m.attachment_name, m.attachment_mime,
           case pr_role
             when 'admin' then true
             when 'teacher' then m.teacher_id = pr_id
             else exists (
               select 1 from public.students st
               join public.teacher_class_subjects tcs
                 on tcs.class_name = st.class_name and tcs.is_active = true
                and tcs.teacher_id = m.teacher_id and tcs.subject_id = m.subject_id
               join public.portal_mt_topics t
                 on t.id = m.topic_id and t.teacher_id = m.teacher_id and t.subject_id = m.subject_id and t.is_active = true
               where st.id = pr_id and st.is_active = true and m.is_visible = true
                 and (m.target_class = 'ALL' or m.target_class = st.class_name))
           end
      into raw, owner, fname, fmime, allowed
      from public.portal_mt_materials m where m.id = p_id;
  elsif p_kind = 'content' then
    select c.link_url, c.teacher_id, c.title, null::text,
           case pr_role
             when 'admin' then true
             when 'teacher' then c.teacher_id = pr_id
             else exists (
               select 1 from public.students st
               join public.teacher_class_subjects tcs
                 on tcs.class_name = st.class_name and tcs.is_active = true
                and tcs.teacher_id = c.teacher_id and tcs.subject_id = c.subject_id
               where st.id = pr_id and st.is_active = true
                 and (c.target_class = 'ALL' or c.target_class = st.class_name))
           end
      into raw, owner, fname, fmime, allowed
      from public.portal_mt_content c where c.id = p_id;
  elsif p_kind = 'questions' then
    select q.attachment_url, q.student_id, 'question-' || q.id, null::text,
           case pr_role
             when 'admin' then true
             when 'teacher' then q.teacher_id = pr_id
             else q.student_id = pr_id
           end
      into raw, owner, fname, fmime, allowed
      from public.portal_mt_questions q where q.id = p_id;
  else
    return;
  end if;

  if not coalesce(allowed, false) or raw is null or raw not like 'storage:%' then return; end if;
  raw := substring(raw from 9);
  if raw !~ ('^' || p_kind || '/' || owner::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{2,5}$') then
    return;
  end if;
  return query select raw, fname, fmime;
end
$function$;

-- Admin only: how many old inline files are still waiting to be moved?
create or replace function public.portal_file_legacy_pending(p_token uuid)
returns table(kind text, files bigint, bytes bigint)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
#variable_conflict use_column
declare pr_role text;
begin
  select p.role into pr_role from public.portal_file_principal(p_token) p limit 1;
  if pr_role is distinct from 'admin' then return; end if;
  return query
    select 'materials'::text, count(*)::bigint, coalesce(sum(length(m.attachment_data)), 0)::bigint
      from public.portal_mt_materials m where m.attachment_data like 'data:%'
    union all
    select 'content'::text, count(*)::bigint, coalesce(sum(length(c.link_url)), 0)::bigint
      from public.portal_mt_content c where c.link_url like 'data:%'
    union all
    select 'questions'::text, count(*)::bigint, coalesce(sum(length(q.attachment_url)), 0)::bigint
      from public.portal_mt_questions q where q.attachment_url like 'data:%';
end
$function$;

-- Admin only: the next few inline files (smallest first) so the Edge Function can upload them.
-- p_skip lets the caller step over files that could not be moved, so one bad file never blocks the others.
create or replace function public.portal_file_legacy_batch(p_token uuid, p_limit integer default 3, p_skip integer default 0)
returns table(kind text, id bigint, owner_id bigint, data text, file_name text, mime text)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
#variable_conflict use_column
declare pr_role text;
begin
  select p.role into pr_role from public.portal_file_principal(p_token) p limit 1;
  if pr_role is distinct from 'admin' then return; end if;
  return query
    select x.kind, x.id, x.owner_id, x.data, x.file_name, x.mime from (
      select 'materials'::text as kind, m.id, m.teacher_id as owner_id, m.attachment_data as data, m.attachment_name as file_name, m.attachment_mime as mime
        from public.portal_mt_materials m where m.attachment_data like 'data:%'
      union all
      select 'content'::text, c.id, c.teacher_id, c.link_url, c.title, null::text
        from public.portal_mt_content c where c.link_url like 'data:%'
      union all
      select 'questions'::text, q.id, q.student_id, q.attachment_url, 'question-' || q.id, null::text
        from public.portal_mt_questions q where q.attachment_url like 'data:%'
    ) x
    order by length(x.data) asc
    limit greatest(1, least(coalesce(p_limit, 3), 5))
    offset greatest(0, least(coalesce(p_skip, 0), 1000));
end
$function$;

-- Admin only: point a row at its uploaded file. Only if the row still holds the exact inline value that was uploaded
-- (compared by length), so a row edited in the meantime is never overwritten.
create or replace function public.portal_file_legacy_set(p_token uuid, p_kind text, p_id bigint, p_path text, p_expected_len integer)
returns boolean
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
#variable_conflict use_column
declare pr_role text; n integer := 0;
begin
  select p.role into pr_role from public.portal_file_principal(p_token) p limit 1;
  if pr_role is distinct from 'admin' then return false; end if;
  if p_path is null or p_path !~ ('^' || coalesce(p_kind, '') || '/[0-9]+/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{2,5}$') then
    return false;
  end if;
  if p_kind = 'materials' then
    update public.portal_mt_materials m set attachment_data = 'storage:' || p_path
     where m.id = p_id and m.attachment_data like 'data:%' and length(m.attachment_data) = p_expected_len
       and split_part(p_path, '/', 2) = m.teacher_id::text;
  elsif p_kind = 'content' then
    update public.portal_mt_content c set link_url = 'storage:' || p_path
     where c.id = p_id and c.link_url like 'data:%' and length(c.link_url) = p_expected_len
       and split_part(p_path, '/', 2) = c.teacher_id::text;
  elsif p_kind = 'questions' then
    update public.portal_mt_questions q set attachment_url = 'storage:' || p_path
     where q.id = p_id and q.attachment_url like 'data:%' and length(q.attachment_url) = p_expected_len
       and split_part(p_path, '/', 2) = q.student_id::text;
  else
    return false;
  end if;
  get diagnostics n = row_count;
  return n = 1;
end
$function$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.portal_file_principal(uuid)',
    'public.portal_file_read_info(uuid,text,bigint)',
    'public.portal_file_legacy_pending(uuid)',
    'public.portal_file_legacy_batch(uuid,integer,integer)',
    'public.portal_file_legacy_set(uuid,text,bigint,text,integer)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
