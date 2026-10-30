-- =====================================================================
-- 20261030_06_games_server_scoring
-- الألعاب: الإجابات تبقى في الخادم، والتحقق والنتيجة والإكمال تُحسب في الخادم
--
-- قبل: لعبة الطالب تصله بكل إجاباتها، والمتصفح يحكم على الإجابة ويرسل النتيجة،
--      وزر «إنهاء وحفظ» يمنح مكافأة الإكمال فورًا دون لعب.
-- بعد:
--   portal_student_mt_game_start   يبدأ محاولة ويعيد الأسئلة بلا إجابات (الخيارات مخلوطة)
--   portal_student_mt_game_answer  يتحقق من إجابة سؤال واحد (محاولات محدودة)، ويكشف
--                                  الإجابة الصحيحة فقط بعد إغلاق السؤال
--   portal_student_mt_game_finish  ينهي المحاولة: النتيجة = الصحيحة × نقاط السؤال،
--                                  والإكمال = كل الأسئلة أُجيبت، والمكافأة للإكمال فقط
--   portal_student_mt_games        لم تعد تعيد محتوى اللعبة للطالب
--   portal_student_mt_save_game_result  معطّلة (كانت تقبل أي نتيجة)
--   «صناديق الكنز» صارت جماعية داخل الحصة (الطالب كان يصحح لنفسه)
--   portal_mt_game_attempts: أعمدة الحالة والإجابات + مفاتيح أجنبية (الجدول فارغ اليوم)
-- لا تغيير على دوال المعلم ولا على أي بيانات قائمة.
-- التراجع: supabase/rollback/20261030_06_games_server_scoring.sql
-- =====================================================================

begin;

-- ---------- الجدول ----------
alter table public.portal_mt_game_attempts
  add column if not exists status text not null default 'done',
  add column if not exists answers jsonb not null default '{}'::jsonb,
  add column if not exists questions_total integer,
  add column if not exists finished_at timestamp with time zone;
alter table public.portal_mt_game_attempts
  add constraint portal_mt_game_attempts_status_chk check (status in ('playing','done')),
  add constraint portal_mt_game_attempts_game_fk foreign key (game_id) references public.portal_mt_games(id) on delete cascade,
  add constraint portal_mt_game_attempts_student_fk foreign key (student_id) references public.students(id) on delete cascade;
create unique index if not exists portal_mt_game_attempts_one_playing
  on public.portal_mt_game_attempts(game_id, student_id) where status = 'playing';

-- ---------- مساعدات داخلية (غير متاحة للعموم) ----------
-- نفس توحيد النص في games.js: الهمزات، الألف المقصورة، التاء المربوطة، التشكيل، الحروف الكبيرة
create or replace function public._rg_norm(p text) returns text
 language sql immutable set search_path to 'pg_catalog'
as $function$
  select lower(regexp_replace(translate(btrim(coalesce(p, '')), 'أإآىة', 'ااايه'), '[ً-ْ]', '', 'g'))
$function$;

-- الإجابة الصحيحة قد تحتوي بدائل مفصولة بـ /
create or replace function public._rg_hit(p_value text, p_answer text) returns boolean
 language sql immutable set search_path to 'pg_catalog', 'public'
as $function$
  select public._rg_norm(p_value) <> '' and exists (
    select 1 from unnest(string_to_array(coalesce(p_answer, ''), '/')) a where public._rg_norm(a) = public._rg_norm(p_value))
$function$;

-- أسئلة اللعبة كما يبنيها games.js (نفس شروط تصفية الأسطر لكل قالب)
create or replace function public._rg_questions(p_template text, p_payload jsonb)
 returns table(i integer, q text, answer text, opts jsonb, hint text, clues jsonb, max_tries integer, mc boolean)
 language sql stable set search_path to 'pg_catalog', 'public'
as $function$
  with r as (
    select (o - 1)::int as i,
           array(select btrim(c) from jsonb_array_elements_text(x) c) as c
    from jsonb_array_elements(coalesce(p_payload -> 'rows', '[]'::jsonb)) with ordinality t(x, o)
    where jsonb_typeof(x) = 'array'
  )
  select r.i,
    case p_template when 'det' then '' when 'liar' then '🤥 أي عبارة من هذه كاذبة؟' else r.c[1] end,
    case p_template when 'det' then r.c[1] when 'liar' then r.c[cardinality(r.c)] else r.c[2] end,
    case when p_template in ('water','bet','fire') then to_jsonb(r.c[2:cardinality(r.c)])
         when p_template = 'liar' then to_jsonb(r.c) end,
    case when p_template = 'esc' then nullif(r.c[3], '') end,
    case when p_template = 'det' then to_jsonb(r.c[2:cardinality(r.c)]) end,
    case p_template when 'esc' then 3 when 'det' then greatest(cardinality(r.c) - 1, 1) else 1 end,
    p_template in ('water','bet','fire','liar')
  from r
  where case
    when p_template in ('esc','pic') then coalesce(r.c[2], '') <> ''
    when p_template in ('det','water','bet','fire','liar') then cardinality(r.c) > 2
    else false end
  order by r.i
$function$;

revoke all on function public._rg_norm(text) from public, anon, authenticated;
revoke all on function public._rg_hit(text, text) from public, anon, authenticated;
revoke all on function public._rg_questions(text, jsonb) from public, anon, authenticated;

-- ---------- قائمة ألعاب الطالب: بدون محتوى اللعبة ----------
create or replace function public.portal_student_mt_games(p_token uuid, p_subject_code text)
 returns table(id bigint, template_code text, title text, lesson_name text, payload jsonb, score_unit numeric, max_attempts integer, reward_points numeric, attempts_count bigint, best_score numeric)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
    jsonb_build_object('n', (select count(*) from public._rg_questions(g.template_code, g.payload))), -- [games] بلا أسئلة ولا إجابات
    g.score_unit,
    g.max_attempts,
    g.reward_points,
    count(a.id)::bigint,
    coalesce(max(a.score) filter (where a.status = 'done'),0)::numeric
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

-- ---------- بدء محاولة ----------
create or replace function public.portal_student_mt_game_start(p_token uuid, p_subject_code text, p_game_id bigint)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_student bigint := public._portal_mt_student_id(p_token);
  v_teacher bigint := public._portal_mt_student_teacher_id(p_token, p_subject_code);
  v_subject bigint := public._portal_mt_subject_id(p_subject_code);
  v_class text := public._rawafid_student_class(p_token);
  v_game public.portal_mt_games%rowtype;
  v_att public.portal_mt_game_attempts%rowtype;
  v_count integer;
  v_total integer;
  v_qs jsonb;
begin
  if v_student is null or v_teacher is null or v_subject is null or v_class is null then
    raise exception 'جلسة الطالب أو المادة غير صالحة';
  end if;
  select g.* into v_game from public.portal_mt_games g
  where g.id = p_game_id and g.teacher_id = v_teacher and g.subject_id = v_subject
    and g.is_visible = true and (g.target_class = 'ALL' or g.target_class = v_class);
  if v_game.id is null then raise exception 'اللعبة غير متاحة لهذا الطالب'; end if;
  if v_game.template_code in ('bomb','rocket','treasure') then
    raise exception 'هذه لعبة جماعية تُلعب في الحصة ولا تسجل نتيجة فردية';
  end if;

  select count(*) into v_total from public._rg_questions(v_game.template_code, v_game.payload);
  if v_total = 0 then raise exception 'لا توجد أسئلة صالحة في هذه اللعبة'; end if;

  -- استئناف محاولة مفتوحة بدل استهلاك محاولة جديدة
  select a.* into v_att from public.portal_mt_game_attempts a
  where a.game_id = v_game.id and a.student_id = v_student and a.status = 'playing' for update;
  if v_att.id is null then
    select count(*) into v_count from public.portal_mt_game_attempts a where a.game_id = v_game.id and a.student_id = v_student;
    if v_game.max_attempts > 0 and v_count >= v_game.max_attempts then
      raise exception 'استنفدت عدد المحاولات المسموحة لهذه اللعبة';
    end if;
    insert into public.portal_mt_game_attempts(game_id, student_id, teacher_id, subject_id, attempt_no, score, completed, awarded_points, status, answers, questions_total)
    values (v_game.id, v_student, v_teacher, v_subject, v_count + 1, 0, false, 0, 'playing', '{}'::jsonb, v_total)
    returning * into v_att;
  end if;

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
           'i', x.i, 'q', x.q, 'hint', x.hint, 'clues', x.clues, 'max_tries', x.max_tries, 'mc', x.mc,
           'opts', case when x.opts is null then null else (select jsonb_agg(o order by random()) from jsonb_array_elements(x.opts) o) end
         )) order by x.i), '[]'::jsonb)
  into v_qs from public._rg_questions(v_game.template_code, v_game.payload) x;

  return jsonb_build_object(
    'attempt_id', v_att.id, 'attempt_no', v_att.attempt_no, 'template', v_game.template_code, 'total', v_total,
    'emoji', case when v_game.template_code = 'pic' then v_game.payload -> 'h' ->> 0 end,
    'has_image', v_game.template_code = 'pic' and coalesce(btrim(v_game.payload -> 'h' ->> 1), '') <> '',
    'questions', v_qs);
end;
$function$;

-- ---------- التحقق من إجابة ----------
-- p_kind: 'q' إجابة سؤال · 'skip' استسلام/انتهاء الوقت (يغلق السؤال خطأ) · 'image' تخمين الصورة (لعبة الصورة)
create or replace function public.portal_student_mt_game_answer(p_token uuid, p_subject_code text, p_attempt_id bigint, p_index integer, p_answer text, p_kind text default 'q')
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_student bigint := public._portal_mt_student_id(p_token);
  v_att public.portal_mt_game_attempts%rowtype;
  v_game public.portal_mt_games%rowtype;
  v_key text;
  v_answer text;
  v_max integer;
  v_mc boolean;
  v_prev jsonb;
  v_tries integer;
  v_ok boolean;
  v_locked boolean;
begin
  if v_student is null then raise exception 'جلسة الطالب غير صالحة'; end if;
  select a.* into v_att from public.portal_mt_game_attempts a
  where a.id = p_attempt_id and a.student_id = v_student
    and a.teacher_id = public._portal_mt_student_teacher_id(p_token, p_subject_code)
    and a.subject_id = public._portal_mt_subject_id(p_subject_code)
  for update;
  if v_att.id is null then raise exception 'المحاولة غير موجودة'; end if;
  if v_att.status <> 'playing' then raise exception 'انتهت هذه المحاولة'; end if;
  select g.* into v_game from public.portal_mt_games g where g.id = v_att.game_id;

  if p_kind = 'image' then
    if v_game.template_code <> 'pic' then raise exception 'نوع إجابة غير صالح'; end if;
    v_key := 'img'; v_answer := btrim(coalesce(v_game.payload -> 'h' ->> 1, '')); v_max := 3; v_mc := false;
    if v_answer = '' then raise exception 'لا توجد صورة لتخمينها'; end if;
  elsif p_kind in ('q', 'skip') then
    select x.answer, x.max_tries, x.mc into v_answer, v_max, v_mc
    from public._rg_questions(v_game.template_code, v_game.payload) x where x.i = p_index;
    if not found then raise exception 'سؤال غير موجود'; end if;
    v_key := p_index::text;
  else
    raise exception 'نوع إجابة غير صالح';
  end if;

  v_prev := v_att.answers -> v_key;
  if coalesce((v_prev ->> 'l')::boolean, false) then
    return jsonb_build_object('ok', (v_prev ->> 'ok')::boolean, 'locked', true, 'answer', v_answer, 'repeat', true);
  end if;

  v_tries := coalesce((v_prev ->> 't')::int, 0);
  if p_kind = 'skip' then
    v_ok := false; v_locked := true;
  else
    v_tries := v_tries + 1;
    v_ok := case when v_mc then btrim(coalesce(p_answer, '')) = v_answer else public._rg_hit(p_answer, v_answer) end;
    v_locked := v_ok or v_tries >= v_max;
  end if;

  update public.portal_mt_game_attempts
     set answers = answers || jsonb_build_object(v_key, jsonb_build_object('t', v_tries, 'ok', v_ok, 'l', v_locked))
   where id = v_att.id;

  return jsonb_build_object('ok', v_ok, 'locked', v_locked, 'tries_left', greatest(v_max - v_tries, 0),
                            'answer', case when v_locked then v_answer end);
end;
$function$;

-- ---------- إنهاء المحاولة ----------
create or replace function public.portal_student_mt_game_finish(p_token uuid, p_subject_code text, p_attempt_id bigint)
 returns table(attempt_no integer, awarded_points numeric, new_quiz_points numeric, total_points numeric, score numeric, correct integer, total integer, completed boolean)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_student bigint := public._portal_mt_student_id(p_token);
  v_att public.portal_mt_game_attempts%rowtype;
  v_game public.portal_mt_games%rowtype;
  v_total integer; v_correct integer; v_answered integer;
  v_img boolean;
  v_completed boolean;
  v_score numeric;
  v_award numeric := 0;
  v_base numeric := 0; v_quiz numeric := 0;
begin
  if v_student is null then raise exception 'جلسة الطالب غير صالحة'; end if;
  select a.* into v_att from public.portal_mt_game_attempts a
  where a.id = p_attempt_id and a.student_id = v_student
    and a.teacher_id = public._portal_mt_student_teacher_id(p_token, p_subject_code)
    and a.subject_id = public._portal_mt_subject_id(p_subject_code)
  for update;
  if v_att.id is null then raise exception 'المحاولة غير موجودة'; end if;
  select g.* into v_game from public.portal_mt_games g where g.id = v_att.game_id;

  select count(*),
         count(*) filter (where coalesce((v_att.answers -> x.i::text ->> 'ok')::boolean, false)),
         count(*) filter (where coalesce((v_att.answers -> x.i::text ->> 'l')::boolean, false))
    into v_total, v_correct, v_answered
  from public._rg_questions(v_game.template_code, v_game.payload) x;
  v_img := coalesce((v_att.answers -> 'img' ->> 'ok')::boolean, false);

  if v_att.status = 'playing' then
    v_completed := v_total > 0 and v_answered = v_total;
    v_score := (v_correct + case when v_img then 1 else 0 end) * v_game.score_unit;
    if v_completed and v_game.reward_points > 0 and not exists (
         select 1 from public.portal_mt_game_attempts a
         where a.game_id = v_game.id and a.student_id = v_student and a.awarded_points > 0) then
      v_award := v_game.reward_points;
    end if;
    update public.portal_mt_game_attempts
       set status = 'done', finished_at = now(), score = v_score, completed = v_completed,
           awarded_points = v_award, questions_total = v_total
     where id = v_att.id;
    if v_award > 0 then
      insert into public.portal_mt_points as pt(teacher_id, subject_id, student_id, points, quiz_points, updated_at)
      values (v_att.teacher_id, v_att.subject_id, v_student, 0, v_award, now())
      on conflict (teacher_id, subject_id, student_id)
      do update set quiz_points = coalesce(pt.quiz_points, 0) + v_award, updated_at = now();
    end if;
  else
    v_completed := v_att.completed; v_score := v_att.score; v_award := 0;
  end if;

  select coalesce(pt.points, 0), coalesce(pt.quiz_points, 0) into v_base, v_quiz
  from public.portal_mt_points pt
  where pt.teacher_id = v_att.teacher_id and pt.subject_id = v_att.subject_id and pt.student_id = v_student;

  return query select v_att.attempt_no, v_award, coalesce(v_quiz, 0), coalesce(v_base, 0) + coalesce(v_quiz, 0),
                      v_score, v_correct, v_total, v_completed;
end;
$function$;

-- ---------- تعطيل دالة الحفظ القديمة (كانت تقبل أي نتيجة يرسلها المتصفح) ----------
create or replace function public.portal_student_mt_save_game_result(p_token uuid, p_subject_code text, p_game_id bigint, p_score numeric, p_completed boolean)
 returns table(attempt_no integer, awarded_points numeric, new_quiz_points numeric, total_points numeric)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  raise exception 'تم تحديث نظام الألعاب. حدّث الصفحة ثم العب من جديد.';
end;
$function$;

revoke all on function public.portal_student_mt_game_start(uuid, text, bigint) from public;
revoke all on function public.portal_student_mt_game_answer(uuid, text, bigint, integer, text, text) from public;
revoke all on function public.portal_student_mt_game_finish(uuid, text, bigint) from public;
grant execute on function public.portal_student_mt_game_start(uuid, text, bigint) to anon, authenticated, service_role;
grant execute on function public.portal_student_mt_game_answer(uuid, text, bigint, integer, text, text) to anon, authenticated, service_role;
grant execute on function public.portal_student_mt_game_finish(uuid, text, bigint) to anon, authenticated, service_role;

commit;
