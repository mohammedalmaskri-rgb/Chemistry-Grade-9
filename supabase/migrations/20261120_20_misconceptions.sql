-- 20261120_20_misconceptions
-- «كاشف المفاهيم الخاطئة»: لا يكفي أن نعرف أن الطالب أخطأ؛ المهم ما الفكرة الخاطئة التي اختارها.
-- 1) نسجّل الخيار الذي اختاره الطالب في أسئلة الاختيار من متعدد (عمود chosen في سجل المحاولات).
-- 2) جدول المفاهيم الخاطئة (مفهوم + نص تصحيحي) وجدول يربط كل خيار خاطئ بمفهوم (البيانات الأولية في supabase/seeds).
-- 3) المعلم يرى أكثر المفاهيم الخاطئة شيوعًا في شعبه ومن وقع فيها؛ الطالب يرى تصحيحًا فوريًا عند خطئه.
-- الطريقة: إحصاء شفاف على أول محاولة لكل طالب وسؤال. أقل من 5 طلاب معرَّضين للمفهوم = بيانات غير كافية.
-- المفاهيم والروابط مسودة يراجعها المعلم، وليست حكمًا نهائيًا على الطالب.
-- Rollback: supabase/rollback/20261120_20_misconceptions.sql

alter table public.portal_mt_bank_attempts add column if not exists chosen integer;

create table if not exists public.portal_mt_misconceptions (
  id bigint generated always as identity primary key,
  subject_id bigint not null,
  code text not null,
  label text not null,
  remedy text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (subject_id, code)
);
create table if not exists public.portal_mt_bank_option_tags (
  question_id bigint not null references public.portal_mt_question_bank(id) on delete cascade,
  option_index integer not null check (option_index between 0 and 9),
  concept_id bigint not null references public.portal_mt_misconceptions(id) on delete cascade,
  primary key (question_id, option_index)
);
create index if not exists portal_mt_bank_option_tags_concept_idx on public.portal_mt_bank_option_tags (concept_id);
alter table public.portal_mt_misconceptions enable row level security;
alter table public.portal_mt_bank_option_tags enable row level security;
revoke all on table public.portal_mt_misconceptions from public, anon, authenticated;
revoke all on table public.portal_mt_bank_option_tags from public, anon, authenticated;

-- تصحيح الإجابة: كما في الإصدار السابق + تسجيل الخيار المختار (chosen) في الاختيار من متعدد
create or replace function public.portal_student_mt_answer_bank(p_token uuid, p_subject_code text, p_question_id bigint, p_answer jsonb)
returns table(is_correct boolean, awarded_points numeric, quiz_points numeric, total_points numeric)
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_student bigint := public._portal_mt_student_id(p_token);
  v_teacher bigint := public._portal_mt_student_teacher_id(p_token, p_subject_code);
  v_subject bigint := public._portal_mt_subject_id(p_subject_code);

  v_raw text;
  v_b64 text;
  v_meta jsonb;
  v_type text;
  v_expected jsonb;

  v_correct boolean := false;
  v_graded boolean := false;
  v_chosen integer := null;
  v_awarded numeric := 0;
  v_quiz numeric := 0;
  v_base numeric := 0;
BEGIN
  SELECT q.solution_text INTO v_raw
  FROM public.portal_mt_question_bank AS q
  WHERE q.id = p_question_id AND q.teacher_id = v_teacher AND q.subject_id = v_subject AND q.is_visible = true
  LIMIT 1;

  IF v_raw IS NULL THEN RETURN; END IF;

  SELECT (regexp_match(v_raw, '^__QB[234]__([A-Za-z0-9+/=]+)__'))[1] INTO v_b64;

  IF v_b64 IS NULL THEN
    RETURN QUERY SELECT false, 0::numeric, 0::numeric, 0::numeric;
    RETURN;
  END IF;

  BEGIN
    v_meta := convert_from(decode(v_b64, 'base64'), 'UTF8')::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, 0::numeric, 0::numeric, 0::numeric;
    RETURN;
  END;

  v_type := v_meta->>'type';

  IF v_type = 'mcq' THEN
    v_expected := to_jsonb((v_meta #>> '{answer,correct}')::integer);
    v_correct := (p_answer = v_expected);
    v_graded := true;
    IF (p_answer #>> '{}') ~ '^[0-9]$' THEN v_chosen := (p_answer #>> '{}')::integer; END IF;
  ELSIF v_type = 'tf' THEN
    v_expected := to_jsonb((v_meta #>> '{answer,correct}')::boolean);
    v_correct := (p_answer = v_expected);
    v_graded := true;
  ELSIF v_type = 'matching' THEN
    SELECT jsonb_agg(e.value->1 ORDER BY e.ord) INTO v_expected
    FROM jsonb_array_elements(v_meta #> '{answer,pairs}') WITH ORDINALITY AS e(value, ord);
    v_correct := (p_answer = v_expected);
    v_graded := true;
  ELSE
    v_correct := false;
  END IF;

  IF v_graded AND v_student IS NOT NULL AND v_teacher IS NOT NULL THEN
    INSERT INTO public.portal_mt_bank_attempts(question_id, student_id, teacher_id, subject_id, is_correct, chosen)
    SELECT p_question_id, v_student, v_teacher, v_subject, v_correct, v_chosen
    WHERE (SELECT count(*) FROM public.portal_mt_bank_attempts a
            WHERE a.student_id = v_student AND a.question_id = p_question_id) < 20;
  END IF;

  IF v_correct THEN
    INSERT INTO public.portal_mt_bank_awards(question_id, student_id, teacher_id, subject_id)
    VALUES(p_question_id, v_student, v_teacher, v_subject)
    ON CONFLICT DO NOTHING;

    IF FOUND THEN
      v_awarded := 0.5;
      INSERT INTO public.portal_mt_points AS pt(teacher_id, subject_id, student_id, points, quiz_points, updated_at)
      VALUES(v_teacher, v_subject, v_student, 0, 0.5, now())
      ON CONFLICT(teacher_id, subject_id, student_id)
      DO UPDATE SET quiz_points = COALESCE(pt.quiz_points, 0) + 0.5, updated_at = now();
    END IF;
  END IF;

  SELECT COALESCE(pt.points, 0), COALESCE(pt.quiz_points, 0) INTO v_base, v_quiz
  FROM public.portal_mt_points AS pt
  WHERE pt.teacher_id = v_teacher AND pt.subject_id = v_subject AND pt.student_id = v_student;

  v_base := COALESCE(v_base, 0);
  v_quiz := COALESCE(v_quiz, 0);

  RETURN QUERY SELECT v_correct, v_awarded, v_quiz, (v_base + v_quiz);
END;
$function$;

-- تقرير المعلم: كل مفهوم خاطئ، كم طالبًا وقع فيه من المعرَّضين له (أول محاولة فقط)
create or replace function public.portal__misconceptions_core(
  p_teacher_id bigint, p_subject_id bigint, p_class text, p_asof timestamptz default now())
returns table(
  concept_id bigint, code text, label text, remedy text,
  exposed_n integer, affected_n integer, rate numeric, questions_n integer, topics text[], level text)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
  with roster as (
    select st.id
      from public.students st
     where st.is_active = true
       and (p_class is null or p_class = 'ALL' or st.class_name = p_class)
       and exists (select 1 from public.teacher_class_subjects t
                    where t.teacher_id = p_teacher_id and t.subject_id = p_subject_id
                      and t.is_active = true and t.class_name = st.class_name)
  ),
  c as (
    select m.id, m.code, m.label, m.remedy from public.portal_mt_misconceptions m
     where m.subject_id = p_subject_id and m.is_active
  ),
  cq as (  -- الأسئلة التي يظهر فيها المفهوم كخيار خاطئ (أسئلة المعلم فقط)
    select distinct o.concept_id, o.question_id
      from public.portal_mt_bank_option_tags o
      join public.portal_mt_question_bank b on b.id = o.question_id
     where b.teacher_id = p_teacher_id and b.subject_id = p_subject_id and b.is_visible = true
  ),
  ft as (
    select distinct on (a.student_id, a.question_id) a.student_id, a.question_id, a.chosen
      from public.portal_mt_bank_attempts a join roster r on r.id = a.student_id
     where a.teacher_id = p_teacher_id and a.subject_id = p_subject_id and a.attempted_at <= p_asof
     order by a.student_id, a.question_id, a.attempted_at, a.id
  ),
  exposed as (
    select cq.concept_id, count(distinct ft.student_id)::int as n
      from cq join ft on ft.question_id = cq.question_id group by cq.concept_id
  ),
  hit as (
    select o.concept_id, count(distinct ft.student_id)::int as n
      from ft join public.portal_mt_bank_option_tags o on o.question_id = ft.question_id and o.option_index = ft.chosen
     group by o.concept_id
  ),
  qn as (select concept_id, count(*)::int as n from cq group by concept_id),
  tp as (
    select cq.concept_id, array_agg(distinct t.title order by t.title) as titles
      from cq join public.portal__bank_topic_map(p_teacher_id, p_subject_id) tm on tm.question_id = cq.question_id
      join public.portal_mt_topics t on t.id = tm.topic_id
     group by cq.concept_id
  )
  select c.id, c.code, c.label, c.remedy,
         coalesce(e.n, 0), coalesce(h.n, 0),
         case when coalesce(e.n, 0) > 0 then round(100.0 * coalesce(h.n, 0) / e.n, 1) end,
         coalesce(qn.n, 0), coalesce(tp.titles, array[]::text[]),
         case when coalesce(e.n, 0) < 5 then 'low_data'
              when 100.0 * coalesce(h.n, 0) / e.n >= 40 then 'common'
              when 100.0 * coalesce(h.n, 0) / e.n >= 20 then 'some'
              else 'rare' end
    from c join qn on qn.concept_id = c.id
    left join exposed e on e.concept_id = c.id
    left join hit h on h.concept_id = c.id
    left join tp on tp.concept_id = c.id;
$function$;

create or replace function public.portal_teacher_mt_misconceptions(p_token uuid, p_subject_code text, p_class text default 'ALL')
returns table(
  concept_id bigint, code text, label text, remedy text,
  exposed_n integer, affected_n integer, rate numeric, questions_n integer, topics text[], level text)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare tid bigint; sid bigint;
begin
  tid := public._portal_teacher_id(p_token);
  if tid is null then return; end if;
  sid := public._portal_mt_subject_id(p_subject_code);
  if sid is null then return; end if;
  return query
    select c.* from public.portal__misconceptions_core(tid, sid, coalesce(nullif(trim(p_class), ''), 'ALL'), now()) c
     order by case c.level when 'common' then 0 when 'some' then 1 when 'rare' then 2 else 3 end,
              c.rate desc nulls last, c.label;
end
$function$;

-- طلاب وقعوا في مفهوم معيّن (أول محاولة)، للمعلم ولطلابه فقط
create or replace function public.portal__misconception_students_core(
  p_teacher_id bigint, p_subject_id bigint, p_concept_id bigint, p_class text, p_asof timestamptz default now())
returns table(student_id bigint, full_name text, class_name text, hits integer)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
  with roster as (
    select st.id, st.full_name, st.class_name
      from public.students st
     where st.is_active = true
       and (p_class is null or p_class = 'ALL' or st.class_name = p_class)
       and exists (select 1 from public.teacher_class_subjects t
                    where t.teacher_id = p_teacher_id and t.subject_id = p_subject_id
                      and t.is_active = true and t.class_name = st.class_name)
  ),
  ft as (
    select distinct on (a.student_id, a.question_id) a.student_id, a.question_id, a.chosen
      from public.portal_mt_bank_attempts a
      join public.portal_mt_question_bank b on b.id = a.question_id and b.teacher_id = p_teacher_id
     where a.teacher_id = p_teacher_id and a.subject_id = p_subject_id and a.attempted_at <= p_asof
     order by a.student_id, a.question_id, a.attempted_at, a.id
  )
  select r.id, r.full_name, r.class_name, count(*)::int
    from ft join public.portal_mt_bank_option_tags o on o.question_id = ft.question_id and o.option_index = ft.chosen and o.concept_id = p_concept_id
    join roster r on r.id = ft.student_id
   group by r.id, r.full_name, r.class_name
   order by 4 desc, r.class_name, r.full_name;
$function$;

create or replace function public.portal_teacher_mt_misconception_students(p_token uuid, p_subject_code text, p_concept_id bigint, p_class text default 'ALL')
returns table(student_id bigint, full_name text, class_name text, hits integer)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare tid bigint; sid bigint;
begin
  tid := public._portal_teacher_id(p_token);
  if tid is null then return; end if;
  sid := public._portal_mt_subject_id(p_subject_code);
  if sid is null then return; end if;
  return query
    select c.* from public.portal__misconception_students_core(tid, sid, p_concept_id, coalesce(nullif(trim(p_class), ''), 'ALL'), now()) c;
end
$function$;

-- تصحيح فوري للطالب: المفهوم المرتبط بخياره الخاطئ إن كانت آخر محاولة له في هذا السؤال خاطئة (يرى بياناته فقط)
create or replace function public.portal_student_mt_misconception_feedback(p_token uuid, p_subject_code text, p_question_id bigint)
returns table(label text, remedy text)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare v_student bigint; v_teacher bigint; v_subject bigint;
begin
  v_student := public._portal_mt_student_id(p_token);
  if v_student is null then return; end if;
  v_teacher := public._portal_mt_student_teacher_id(p_token, p_subject_code);
  v_subject := public._portal_mt_subject_id(p_subject_code);
  if v_teacher is null or v_subject is null then return; end if;
  return query
    select m.label, m.remedy
      from (select a.chosen, a.is_correct from public.portal_mt_bank_attempts a
             where a.student_id = v_student and a.teacher_id = v_teacher and a.subject_id = v_subject
               and a.question_id = p_question_id
             order by a.attempted_at desc, a.id desc limit 1) la
      join public.portal_mt_bank_option_tags o on o.question_id = p_question_id and o.option_index = la.chosen
      join public.portal_mt_misconceptions m on m.id = o.concept_id and m.is_active
     where la.is_correct = false and la.chosen is not null;
end
$function$;

revoke all on function public.portal__misconceptions_core(bigint, bigint, text, timestamptz) from public, anon, authenticated;
revoke all on function public.portal__misconception_students_core(bigint, bigint, bigint, text, timestamptz) from public, anon, authenticated;
revoke all on function public.portal_teacher_mt_misconceptions(uuid, text, text) from public;
revoke all on function public.portal_teacher_mt_misconception_students(uuid, text, bigint, text) from public;
revoke all on function public.portal_student_mt_misconception_feedback(uuid, text, bigint) from public;
grant execute on function public.portal_teacher_mt_misconceptions(uuid, text, text) to anon, authenticated, service_role;
grant execute on function public.portal_teacher_mt_misconception_students(uuid, text, bigint, text) to anon, authenticated, service_role;
grant execute on function public.portal_student_mt_misconception_feedback(uuid, text, bigint) to anon, authenticated, service_role;
