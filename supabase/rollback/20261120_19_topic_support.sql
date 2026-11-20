-- Rollback for 20261120_19_topic_support: يعيد portal_student_mt_answer_bank كما كانت (بلا تسجيل محاولات) ويحذف الدوال الجديدة والجدول.
-- تحذير: حذف الجدول يحذف سجل المحاولات المسجّل. لا يمس portal_mt_bank_awards ولا النقاط.
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
  ELSIF v_type = 'tf' THEN
    v_expected := to_jsonb((v_meta #>> '{answer,correct}')::boolean);
    v_correct := (p_answer = v_expected);
  ELSIF v_type = 'matching' THEN
    SELECT jsonb_agg(e.value->1 ORDER BY e.ord) INTO v_expected
    FROM jsonb_array_elements(v_meta #> '{answer,pairs}') WITH ORDINALITY AS e(value, ord);
    v_correct := (p_answer = v_expected);
  ELSE
    v_correct := false;
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

drop function if exists public.portal_student_mt_recommendations(uuid, text);
drop function if exists public.portal_teacher_mt_topic_students(uuid, text, bigint, text);
drop function if exists public.portal__topic_students_core(bigint, bigint, bigint, text, timestamptz);
drop function if exists public.portal_teacher_mt_topic_support(uuid, text, text);
drop function if exists public.portal__topic_support_core(bigint, bigint, text, timestamptz);
drop function if exists public.portal__bank_topic_map(bigint, bigint);
drop function if exists public.portal__bank_gradable(text);
drop function if exists public.portal__ar_questions(integer);
drop function if exists public.portal__stems(text);
drop table if exists public.portal_mt_bank_attempts;
