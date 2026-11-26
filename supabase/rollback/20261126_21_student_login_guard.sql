-- Rollback لـ 20261126_21_student_login_guard
-- يعيد portal_student_login إلى تعريفها السابق حرفيًا، ويحذف جدول الحماية.
begin;

create or replace function public.portal_student_login(p_username text, p_password text)
returns table(token uuid, student_id bigint, full_name text, class_name text,
              username text, points integer, must_change_password boolean)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v public.students%rowtype;
  v_token uuid;
begin

  select s.*
  into v
  from public.students as s
  where trim(s.username) = trim(p_username)
    and s.is_active = true
    and s.password_hash = extensions.crypt(
      p_password,
      s.password_hash
    )
  limit 1;

  if v.id is null then
    return;
  end if;

  v_token := extensions.gen_random_uuid();

  insert into public.student_sessions(
    token,
    student_id
  )
  values(
    v_token,
    v.id
  );

  return query
  select
    v_token,
    v.id,
    v.full_name,
    v.class_name,
    v.username,
    coalesce(v.points, 0),
    coalesce(v.must_change_password, false);

end;
$function$;

drop table if exists public.student_login_guard;

commit;
