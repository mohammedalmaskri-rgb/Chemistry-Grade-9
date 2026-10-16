-- تشغيل مرة واحدة في Supabase SQL Editor
create or replace function public.portal_teacher_update_grade(
    p_token text,
    p_grade_id bigint,
    p_score numeric,
    p_max_score numeric,
    p_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $function$
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

revoke all on function public.portal_teacher_update_grade(text,bigint,numeric,numeric,text) from public;
grant execute on function public.portal_teacher_update_grade(text,bigint,numeric,numeric,text) to anon, authenticated;
