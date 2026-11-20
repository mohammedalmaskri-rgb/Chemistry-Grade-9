-- 20261120_19_topic_support
-- «مواضيع تحتاج دعم» للمعلم + «أنصحك بمراجعة» للطالب، من محاولات بنك الأسئلة.
-- المشكلة: النظام كان يسجّل الإجابة الصحيحة فقط (portal_mt_bank_awards) ولا يسجّل المحاولات الخاطئة،
--          فلا يمكن معرفة أين يخطئ الطلاب. هنا نسجّل كل محاولة (صح/خطأ) من الآن فصاعدًا.
-- التغييرات:
--   1) جدول جديد portal_mt_bank_attempts (محاولات الطلاب، سقف 20 محاولة لكل طالب وسؤال).
--   2) portal_student_mt_answer_bank: نفس المنطق تمامًا + سطر واحد يسجّل المحاولة (لا تغيير في النقاط أو التصحيح).
--   3) ربط سؤال البنك بموضوع المنهج تلقائيًا من اسم الدرس في عنوانه («الدرس | 04 - ...») بمطابقة نصية عربية.
--   4) تقرير المعلم: دقة المحاولة الأولى لكل موضوع + مَن يحتاج دعمًا. توصيات الطالب: دروس وأسئلة تناسبه.
-- كله داخل قاعدة البيانات، بلا خدمة خارجية، ولا يخرج نص أي طالب.
-- الدقة تعتمد على «المحاولة الأولى» لكل طالب وسؤال حتى لا تؤثر إعادة المحاولة. أقل من 10 محاولات = بيانات غير كافية.
-- Rollback: supabase/rollback/20261120_19_topic_support.sql

-- 1) سجل المحاولات ---------------------------------------------------------
create table if not exists public.portal_mt_bank_attempts (
  id bigint generated always as identity primary key,
  question_id bigint not null,
  student_id bigint not null,
  teacher_id bigint not null,
  subject_id bigint not null,
  is_correct boolean not null,
  attempted_at timestamptz not null default now()
);
create index if not exists portal_mt_bank_attempts_scope_idx
  on public.portal_mt_bank_attempts (teacher_id, subject_id, question_id);
create index if not exists portal_mt_bank_attempts_student_idx
  on public.portal_mt_bank_attempts (student_id, question_id, attempted_at);
alter table public.portal_mt_bank_attempts enable row level security;
revoke all on table public.portal_mt_bank_attempts from public, anon, authenticated;

-- 2) تصحيح الإجابة: كما كان، مع تسجيل المحاولة ------------------------------
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

  -- تسجيل المحاولة (جديد): صحيحة أو خاطئة، بسقف 20 محاولة لكل طالب وسؤال
  IF v_graded AND v_student IS NOT NULL AND v_teacher IS NOT NULL THEN
    INSERT INTO public.portal_mt_bank_attempts(question_id, student_id, teacher_id, subject_id, is_correct)
    SELECT p_question_id, v_student, v_teacher, v_subject, v_correct
    WHERE (SELECT count(*) FROM public.portal_mt_bank_attempts a
            WHERE a.student_id = v_student AND a.question_id = p_question_id) < 20;
  END IF;

  -- نصف نقطة لأول إجابة صحيحة فقط
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

-- 3) ربط سؤال البنك بموضوع المنهج ------------------------------------------
-- جذوع الكلمات: نزيل التشكيل ونوحّد الألف والتاء المربوطة، ونحذف «ال» و«و» البادئة، ونأخذ أول 3 حروف.
create or replace function public.portal__stems(p text)
returns text[]
language sql
immutable
set search_path to 'pg_catalog', 'public'
as $function$
  select coalesce(array_agg(distinct left(t, 3)) filter (where length(t) >= 2), array[]::text[])
  from (
    select regexp_replace(regexp_replace(w, '^و(?=..)', ''), '^ال', '') as t
    from regexp_split_to_table(
      lower(translate(regexp_replace(coalesce(p, ''), '[ً-ْـ]', '', 'g'), 'أإآىة', 'ااايه')),
      '[^ء-ي]+') as w
    where w not in ('في', 'من', 'على', 'عن', 'الى', 'او', 'ما', 'هو', 'هي')
  ) x;
$function$;

-- اسم الدرس = ما قبل «|» في عنوان السؤال. أفضل موضوع بنسبة تشابه (جاكارد) لا تقل عن 0.5، وإلا يبقى السؤال بلا موضوع.
create or replace function public.portal__bank_topic_map(p_teacher_id bigint, p_subject_id bigint)
returns table(question_id bigint, topic_id bigint)
language sql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
  with q as (
    select b.id, public.portal__stems(split_part(b.title, '|', 1)) as ls
      from public.portal_mt_question_bank b
     where b.teacher_id = p_teacher_id and b.subject_id = p_subject_id and position('|' in b.title) > 0
  ),
  t as (
    select tp.id, tp.sort_order, public.portal__stems(tp.title) as ts
      from public.portal_mt_topics tp
     where tp.teacher_id = p_teacher_id and tp.subject_id = p_subject_id and tp.is_active
  ),
  sc as (
    select q.id as qid, t.id as tid, t.sort_order,
           (select count(*) from unnest(q.ls) x where x = any(t.ts))::numeric
           / nullif(cardinality(array(select unnest(q.ls) union select unnest(t.ts))), 0) as s
      from q cross join t
  )
  select distinct on (qid) qid, tid
    from sc where s >= 0.5
   order by qid, s desc, sort_order, tid;
$function$;

-- هل السؤال قابل للتصحيح آليًا؟ (QB2/3/4 من نوع اختيار من متعدد أو صح/خطأ أو توصيل)
create or replace function public.portal__bank_gradable(p_solution text)
returns boolean
language plpgsql
immutable
set search_path to 'pg_catalog', 'public'
as $function$
declare v_b64 text; v_type text;
begin
  v_b64 := (regexp_match(coalesce(p_solution, ''), '^__QB[234]__([A-Za-z0-9+/=]+)__'))[1];
  if v_b64 is null then return false; end if;
  v_type := convert_from(decode(v_b64, 'base64'), 'UTF8')::jsonb ->> 'type';
  return v_type in ('mcq', 'tf', 'matching');
exception when others then
  return false;
end
$function$;

-- 4) تقرير المعلم: دقة المحاولة الأولى لكل موضوع ----------------------------
create or replace function public.portal__topic_support_core(
  p_teacher_id bigint, p_subject_id bigint, p_class text, p_asof timestamptz default now())
returns table(
  topic_id bigint, unit_no integer, unit_title text, title text, sort_order integer,
  questions_n integer, students_n integer, opened_n integer, tried_n integer,
  first_try_n integer, first_try_wrong_n integer, accuracy numeric, level text)
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
  tm as (select * from public.portal__bank_topic_map(p_teacher_id, p_subject_id)),
  first_try as (
    select distinct on (a.student_id, a.question_id) a.student_id, a.question_id, a.is_correct
      from public.portal_mt_bank_attempts a
      join roster r on r.id = a.student_id
     where a.teacher_id = p_teacher_id and a.subject_id = p_subject_id and a.attempted_at <= p_asof
     order by a.student_id, a.question_id, a.attempted_at, a.id
  ),
  att as (
    select tm.topic_id, count(*)::int as n, count(*) filter (where not f.is_correct)::int as wrong,
           count(distinct f.student_id)::int as students
      from first_try f join tm on tm.question_id = f.question_id group by tm.topic_id
  ),
  qn as (
    select tm.topic_id, count(*)::int as n
      from tm join public.portal_mt_question_bank b on b.id = tm.question_id
     where b.is_visible = true and public.portal__bank_gradable(b.solution_text)
     group by tm.topic_id
  ),
  vis as (
    select v.topic_id, count(distinct v.student_id)::int as n
      from public.portal_mt_lesson_visits v join roster r on r.id = v.student_id
     where v.teacher_id = p_teacher_id and v.subject_id = p_subject_id and v.first_opened_at <= p_asof
     group by v.topic_id
  ),
  rc as (select count(*)::int as n from roster)
  select tp.id, tp.unit_no, tp.unit_title, tp.title, tp.sort_order,
         coalesce(qn.n, 0), (select n from rc), coalesce(vis.n, 0),
         coalesce(att.students, 0), coalesce(att.n, 0), coalesce(att.wrong, 0),
         case when coalesce(att.n, 0) > 0 then round(100.0 * (att.n - att.wrong) / att.n, 1) end,
         case when coalesce(qn.n, 0) = 0 then 'no_questions'
              when coalesce(att.n, 0) < 10 then 'low_data'
              when 100.0 * (att.n - att.wrong) / att.n < 60 then 'need'
              when 100.0 * (att.n - att.wrong) / att.n < 75 then 'watch'
              else 'ok' end
    from public.portal_mt_topics tp
    left join qn on qn.topic_id = tp.id
    left join att on att.topic_id = tp.id
    left join vis on vis.topic_id = tp.id
   where tp.teacher_id = p_teacher_id and tp.subject_id = p_subject_id and tp.is_active
     and (coalesce(qn.n, 0) > 0 or coalesce(vis.n, 0) > 0);
$function$;

create or replace function public.portal_teacher_mt_topic_support(p_token uuid, p_subject_code text, p_class text default 'ALL')
returns table(
  topic_id bigint, unit_no integer, unit_title text, title text, sort_order integer,
  questions_n integer, students_n integer, opened_n integer, tried_n integer,
  first_try_n integer, first_try_wrong_n integer, accuracy numeric, level text)
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
    select c.* from public.portal__topic_support_core(tid, sid, coalesce(nullif(trim(p_class), ''), 'ALL'), now()) c
     order by case c.level when 'need' then 0 when 'watch' then 1 when 'ok' then 2 when 'low_data' then 3 else 4 end,
              c.accuracy nulls last, c.sort_order;
end
$function$;

-- طلاب أخطؤوا في المحاولة الأولى داخل موضوع معيّن (للمعلم، من طلابه فقط)
create or replace function public.portal__topic_students_core(
  p_teacher_id bigint, p_subject_id bigint, p_topic_id bigint, p_class text, p_asof timestamptz default now())
returns table(student_id bigint, full_name text, class_name text, tried_n integer, wrong_n integer)
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
  tm as (select * from public.portal__bank_topic_map(p_teacher_id, p_subject_id) where topic_id = p_topic_id),
  first_try as (
    select distinct on (a.student_id, a.question_id) a.student_id, a.question_id, a.is_correct
      from public.portal_mt_bank_attempts a join tm on tm.question_id = a.question_id
     where a.teacher_id = p_teacher_id and a.subject_id = p_subject_id and a.attempted_at <= p_asof
     order by a.student_id, a.question_id, a.attempted_at, a.id
  )
  select r.id, r.full_name, r.class_name, count(*)::int, count(*) filter (where not f.is_correct)::int
    from first_try f join roster r on r.id = f.student_id
   group by r.id, r.full_name, r.class_name
  having count(*) filter (where not f.is_correct) > 0
   order by 5 desc, 4 desc, r.class_name, r.full_name;
$function$;

create or replace function public.portal_teacher_mt_topic_students(p_token uuid, p_subject_code text, p_topic_id bigint, p_class text default 'ALL')
returns table(student_id bigint, full_name text, class_name text, tried_n integer, wrong_n integer)
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
    select c.* from public.portal__topic_students_core(tid, sid, p_topic_id, coalesce(nullif(trim(p_class), ''), 'ALL'), now()) c;
end
$function$;

-- عدد الأسئلة بصياغة عربية سليمة: سؤال واحد / سؤالين / 3 أسئلة / 11 سؤالًا
create or replace function public.portal__ar_questions(n integer)
returns text
language sql
immutable
set search_path to 'pg_catalog', 'public'
as $function$
  select case when n = 1 then 'سؤال واحد' when n = 2 then 'سؤالين'
              when n between 3 and 10 then n || ' أسئلة' else n || ' سؤالًا' end;
$function$;

-- 5) توصيات الطالب: دروس وأسئلة تناسبه (يرى بياناته هو فقط) -----------------
create or replace function public.portal_student_mt_recommendations(p_token uuid, p_subject_code text)
returns table(
  topic_id bigint, topic_title text, unit_title text, reason text,
  questions_left integer, wrong_n integer, tried_n integer, lesson_opened boolean, priority integer)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare v_student bigint; v_teacher bigint; v_subject bigint; v_class text;
begin
  v_student := public._portal_mt_student_id(p_token);
  if v_student is null then return; end if;
  v_teacher := public._portal_mt_student_teacher_id(p_token, p_subject_code);
  v_subject := public._portal_mt_subject_id(p_subject_code);
  if v_teacher is null or v_subject is null then return; end if;
  select st.class_name into v_class from public.students st where st.id = v_student;

  return query
  with tm as (select * from public.portal__bank_topic_map(v_teacher, v_subject)),
  qs as (
    select b.id as qid, tm.topic_id as tid
      from public.portal_mt_question_bank b join tm on tm.question_id = b.id
     where b.teacher_id = v_teacher and b.subject_id = v_subject and b.is_visible = true
       and public.portal__bank_gradable(b.solution_text)
       and (b.target_class = 'ALL' or b.target_class = v_class)
  ),
  done as (select a.question_id as qid from public.portal_mt_bank_awards a where a.student_id = v_student and a.teacher_id = v_teacher and a.subject_id = v_subject),
  ft as (
    select distinct on (a.question_id) a.question_id as qid, a.is_correct
      from public.portal_mt_bank_attempts a
     where a.student_id = v_student and a.teacher_id = v_teacher and a.subject_id = v_subject
     order by a.question_id, a.attempted_at, a.id
  ),
  agg as (
    select qs.tid,
           count(*)::int as total,
           count(*) filter (where qs.qid not in (select qid from done))::int as left_n,
           count(*) filter (where qs.qid in (select qid from ft) or qs.qid in (select qid from done))::int as tried,
           count(*) filter (where qs.qid in (select qid from ft where not is_correct)
                              and qs.qid not in (select qid from done))::int as wrong
      from qs group by qs.tid
  ),
  opened as (
    select v.topic_id as tid from public.portal_mt_lesson_visits v
     where v.student_id = v_student and v.teacher_id = v_teacher and v.subject_id = v_subject
  )
  select tp.id, tp.title, tp.unit_title,
         case when g.wrong > 0 then 'أخطأت في ' || public.portal__ar_questions(g.wrong) || ' من هذا الدرس، أعد المحاولة'
              when g.tried = 0 then 'لم تجرّب أسئلة هذا الدرس بعد (' || public.portal__ar_questions(g.left_n) || ')'
              else 'بقي لك ' || public.portal__ar_questions(g.left_n) || ' من هذا الدرس' end,
         g.left_n, g.wrong, g.tried,
         exists (select 1 from opened o where o.tid = tp.id),
         case when g.wrong > 0 then 1 when g.tried = 0 then 2 else 3 end
    from agg g join public.portal_mt_topics tp on tp.id = g.tid
   where g.left_n > 0
   order by 9, g.wrong desc, tp.sort_order
   limit 5;
end
$function$;

revoke all on function public.portal__stems(text) from public, anon, authenticated;
revoke all on function public.portal__ar_questions(integer) from public, anon, authenticated;
revoke all on function public.portal__bank_gradable(text) from public, anon, authenticated;
revoke all on function public.portal__bank_topic_map(bigint, bigint) from public, anon, authenticated;
revoke all on function public.portal__topic_support_core(bigint, bigint, text, timestamptz) from public, anon, authenticated;
revoke all on function public.portal__topic_students_core(bigint, bigint, bigint, text, timestamptz) from public, anon, authenticated;
revoke all on function public.portal_teacher_mt_topic_support(uuid, text, text) from public;
revoke all on function public.portal_teacher_mt_topic_students(uuid, text, bigint, text) from public;
revoke all on function public.portal_student_mt_recommendations(uuid, text) from public;
grant execute on function public.portal_teacher_mt_topic_support(uuid, text, text) to anon, authenticated, service_role;
grant execute on function public.portal_teacher_mt_topic_students(uuid, text, bigint, text) to anon, authenticated, service_role;
grant execute on function public.portal_student_mt_recommendations(uuid, text) to anon, authenticated, service_role;
