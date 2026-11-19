-- Rollback for 20261119_14: restores portal_teacher_login exactly as it was before (without the directive).
begin;
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
commit;
