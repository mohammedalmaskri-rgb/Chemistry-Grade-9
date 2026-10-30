-- التراجع عن 20261030_06_games_server_scoring
-- يعيد portal_student_mt_games وportal_student_mt_save_game_result حرفيًا كما كانتا في 2026-10-30،
-- ويحذف الدوال الجديدة والمساعدات، ويعيد جدول المحاولات لشكله السابق.
-- تحذير: يعيد الثغرة (الإجابات تصل للطالب والمكافأة بلا إكمال). مع التراجع أعد أيضًا games.js السابق.
-- ملاحظة: حذف الأعمدة يحذف حالة المحاولات المفتوحة وإجاباتها؛ الدرجات والنقاط المسجلة تبقى.

begin;

-- portal_student_mt_games
CREATE OR REPLACE FUNCTION public.portal_student_mt_games(p_token uuid, p_subject_code text)
 RETURNS TABLE(id bigint, template_code text, title text, lesson_name text, payload jsonb, score_unit numeric, max_attempts integer, reward_points numeric, attempts_count bigint, best_score numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_student bigint := public._portal_mt_student_id(p_token);
  v_teacher bigint := public._portal_mt_student_teacher_id(p_token,p_subject_code);
  v_subject bigint := public._portal_mt_subject_id(p_subject_code);
  v_class text := public._rawafid_student_class(p_token);
begin
  if v_student is null or v_teacher is null or v_subject is null or v_class is null then
    return;
  end if;

  return query
  select
    g.id,
    g.template_code,
    g.title,
    g.lesson_name,
    g.payload,
    g.score_unit,
    g.max_attempts,
    g.reward_points,
    count(a.id)::bigint,
    coalesce(max(a.score),0)::numeric
  from public.portal_mt_games g
  left join public.portal_mt_game_attempts a
    on a.game_id = g.id
   and a.student_id = v_student
  where g.teacher_id = v_teacher
    and g.subject_id = v_subject
    and g.is_visible = true
    and (g.target_class = 'ALL' or g.target_class = v_class)
  group by
    g.id,g.template_code,g.title,g.lesson_name,g.payload,
    g.score_unit,g.max_attempts,g.reward_points,g.created_at
  order by g.created_at desc;
end;
$function$;
revoke all on function public.portal_student_mt_games(p_token uuid, p_subject_code text) from public, anon, authenticated;
grant execute on function public.portal_student_mt_games(p_token uuid, p_subject_code text) to authenticated;
grant execute on function public.portal_student_mt_games(p_token uuid, p_subject_code text) to anon;
grant execute on function public.portal_student_mt_games(p_token uuid, p_subject_code text) to service_role;

-- portal_student_mt_save_game_result
CREATE OR REPLACE FUNCTION public.portal_student_mt_save_game_result(p_token uuid, p_subject_code text, p_game_id bigint, p_score numeric, p_completed boolean)
 RETURNS TABLE(attempt_no integer, awarded_points numeric, new_quiz_points numeric, total_points numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_student bigint := public._portal_mt_student_id(p_token);
  v_teacher bigint := public._portal_mt_student_teacher_id(p_token,p_subject_code);
  v_subject bigint := public._portal_mt_subject_id(p_subject_code);
  v_class text := public._rawafid_student_class(p_token);
  v_game public.portal_mt_games%rowtype;
  v_attempts integer := 0;
  v_attempt_no integer := 0;
  v_award numeric := 0;
  v_base numeric := 0;
  v_quiz numeric := 0;
  v_score numeric := greatest(-100000,least(coalesce(p_score,0),100000));
begin
  if v_student is null or v_teacher is null or v_subject is null or v_class is null then
    raise exception 'جلسة الطالب أو المادة غير صالحة';
  end if;

  select g.*
  into v_game
  from public.portal_mt_games g
  where g.id = p_game_id
    and g.teacher_id = v_teacher
    and g.subject_id = v_subject
    and g.is_visible = true
    and (g.target_class = 'ALL' or g.target_class = v_class)
  for update;

  if v_game.id is null then
    raise exception 'اللعبة غير متاحة لهذا الطالب';
  end if;

  if v_game.template_code in ('bomb','rocket') then
    raise exception 'هذه لعبة جماعية ولا تسجل نتيجة فردية';
  end if;

  select count(*)
  into v_attempts
  from public.portal_mt_game_attempts a
  where a.game_id = v_game.id
    and a.student_id = v_student;

  if v_game.max_attempts > 0 and v_attempts >= v_game.max_attempts then
    raise exception 'استنفدت عدد المحاولات المسموحة لهذه اللعبة';
  end if;

  v_attempt_no := v_attempts + 1;

  if coalesce(p_completed,false)
     and v_game.reward_points > 0
     and not exists (
       select 1
       from public.portal_mt_game_attempts a
       where a.game_id = v_game.id
         and a.student_id = v_student
         and a.awarded_points > 0
     ) then
    v_award := v_game.reward_points;
  end if;

  insert into public.portal_mt_game_attempts(
    game_id,student_id,teacher_id,subject_id,attempt_no,score,completed,awarded_points
  )
  values(
    v_game.id,v_student,v_teacher,v_subject,v_attempt_no,v_score,
    coalesce(p_completed,false),v_award
  );

  if v_award > 0 then
    insert into public.portal_mt_points as pt(
      teacher_id,subject_id,student_id,points,quiz_points,updated_at
    )
    values(v_teacher,v_subject,v_student,0,v_award,now())
    on conflict(teacher_id,subject_id,student_id)
    do update set
      quiz_points = coalesce(pt.quiz_points,0) + v_award,
      updated_at = now();
  end if;

  select
    coalesce(pt.points,0),
    coalesce(pt.quiz_points,0)
  into v_base,v_quiz
  from public.portal_mt_points pt
  where pt.teacher_id = v_teacher
    and pt.subject_id = v_subject
    and pt.student_id = v_student;

  v_base := coalesce(v_base,0);
  v_quiz := coalesce(v_quiz,0);

  return query
  select v_attempt_no,v_award,v_quiz,(v_base+v_quiz);
end;
$function$;
revoke all on function public.portal_student_mt_save_game_result(p_token uuid, p_subject_code text, p_game_id bigint, p_score numeric, p_completed boolean) from public, anon, authenticated;
grant execute on function public.portal_student_mt_save_game_result(p_token uuid, p_subject_code text, p_game_id bigint, p_score numeric, p_completed boolean) to authenticated;
grant execute on function public.portal_student_mt_save_game_result(p_token uuid, p_subject_code text, p_game_id bigint, p_score numeric, p_completed boolean) to anon;
grant execute on function public.portal_student_mt_save_game_result(p_token uuid, p_subject_code text, p_game_id bigint, p_score numeric, p_completed boolean) to service_role;

drop function if exists public.portal_student_mt_game_start(uuid, text, bigint);
drop function if exists public.portal_student_mt_game_answer(uuid, text, bigint, integer, text, text);
drop function if exists public.portal_student_mt_game_finish(uuid, text, bigint);
drop function if exists public._rg_questions(text, jsonb);
drop function if exists public._rg_hit(text, text);
drop function if exists public._rg_norm(text);

drop index if exists public.portal_mt_game_attempts_one_playing;
alter table public.portal_mt_game_attempts
  drop constraint if exists portal_mt_game_attempts_status_chk,
  drop constraint if exists portal_mt_game_attempts_game_fk,
  drop constraint if exists portal_mt_game_attempts_student_fk;
alter table public.portal_mt_game_attempts
  drop column if exists status,
  drop column if exists answers,
  drop column if exists questions_total,
  drop column if exists finished_at;

commit;
