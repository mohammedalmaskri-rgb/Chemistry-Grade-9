-- =====================================================================
-- إخفاء حلول بنك الأسئلة عن الطلاب قبل أن يُظهرها المعلم
-- Hide question-bank answers from students until the teacher reveals them
--
-- المشكلة: portal_student_mt_question_bank كانت تعيد solution_text و
-- solution_image كما هما، وsolution_text يحتوي الإجابة الصحيحة
-- (answer.correct / answer.pairs). أي طالب يستطيع رؤيتها من أدوات المتصفح.
--
-- الإصلاح: نفس منطق الدالة القديمة portal_student_question_bank:
--   * show_solution = true  -> الحل كاملًا مع صورة الحل (لا تغيير في السلوك)
--   * show_solution = false -> _portal_student_safe_bank_solution(...)
--       يبقي نوع السؤال والخيارات والدرجة واسم الدرس، ويحذف الإجابة
--       الصحيحة، ويخلط أزواج التوصيل، ويحذف نص الحل؛ وصورة الحل = null
--
-- لا يتغير: توقيع الدالة، أعمدة النتيجة، الصلاحيات، التصحيح في
-- portal_student_mt_answer_bank (يقرأ الجدول مباشرة)، أي بيانات.
-- التراجع: supabase/rollback/20261030_01_hide_bank_solutions.sql
-- =====================================================================

begin;

create or replace function public.portal_student_mt_question_bank(p_token uuid, p_subject_code text)
 returns table(id bigint, title text, question_text text, question_image text, solution_text text, solution_image text, target_class text, is_visible boolean, show_solution boolean, created_at timestamp with time zone)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select q.id,
         q.title,
         q.question_text,
         q.question_image,
         case when q.show_solution = true
              then q.solution_text
              else public._portal_student_safe_bank_solution(q.solution_text)
         end as solution_text,
         case when q.show_solution = true
              then q.solution_image
              else null
         end as solution_image,
         q.target_class,
         q.is_visible,
         coalesce(q.show_solution, false) as show_solution,
         q.created_at
  from public.students st
  join public.teacher_class_subjects tcs on tcs.class_name=st.class_name and tcs.is_active=true
  join public.subjects s on s.id=tcs.subject_id and s.code=p_subject_code
  join public.portal_mt_question_bank q on q.teacher_id=tcs.teacher_id and q.subject_id=tcs.subject_id
  where st.id=public._portal_mt_student_id(p_token) and q.is_visible=true and (q.target_class='ALL' or q.target_class=st.class_name)
  order by q.created_at desc
$function$;

-- create or replace يحافظ على الصلاحيات الحالية؛ نعيد تأكيدها كما هي.
revoke all on function public.portal_student_mt_question_bank(uuid, text) from public;
grant execute on function public.portal_student_mt_question_bank(uuid, text) to anon, authenticated, service_role;

commit;
