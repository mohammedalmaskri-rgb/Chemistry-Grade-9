-- 20261119_13_unified_login
-- One login box for everyone: the server decides whether the username belongs to the
-- supervisor (admin), a teacher or a student, then calls that role's EXISTING login
-- function unchanged (same password check, same lockout guards, same sessions).
-- Nothing existing is modified or dropped. Rollback: rollback/20261119_13_unified_login.sql
-- Security: an unknown username, a wrong password and a locked account all return the
-- same empty result, so the function never reveals whether an account exists or its role.
begin;

create or replace function public.portal_login(p_username text, p_password text)
returns table(role text, token uuid, user_id bigint, full_name text, class_name text,
              username text, points integer, must_change_password boolean)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
#variable_conflict use_column
declare
  u text := trim(coalesce(p_username, ''));
begin
  if u = '' or coalesce(p_password, '') = '' or length(u) > 80 or length(p_password) > 200 then
    return;
  end if;

  -- Each lookup mirrors the matching comparison used inside that role's login function.
  -- Order admin → teacher → student only matters if one username ever exists in two tables.
  if exists (select 1 from public.portal_admin_users a where a.username = u) then
    return query
      select 'admin'::text, x.token, x.admin_id, x.full_name, null::text, x.username, null::integer,
             coalesce(x.must_change_password, false)
      from public.portal_admin_login(u, p_password) x;
    if found then return; end if;
  end if;

  if exists (select 1 from public.teacher_users t where trim(t.username) = u) then
    -- portal_teacher_login currently raises "column reference username is ambiguous" on any
    -- failed attempt (pre-existing bug, see 20261119_14). Treat that as a normal failure so the
    -- user sees "wrong credentials". A successful login never reaches the failing statement.
    begin
      return query
        select 'teacher'::text, x.token, x.teacher_id, x.full_name, null::text, x.username, null::integer,
               coalesce(x.must_change_password, true)
        from public.portal_teacher_login(u, p_password) x;
    exception when others then
      return;
    end;
    if found then return; end if;
  end if;

  if exists (select 1 from public.students s where trim(s.username) = u) then
    return query
      select 'student'::text, x.token, x.student_id, x.full_name, x.class_name, x.username, x.points,
             coalesce(x.must_change_password, false)
      from public.portal_student_login(u, p_password) x;
  end if;
end
$function$;

revoke all on function public.portal_login(text, text) from public;
grant execute on function public.portal_login(text, text) to anon, authenticated, service_role;

commit;
