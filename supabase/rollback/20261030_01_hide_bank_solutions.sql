-- التراجع عن 20261030_01_hide_bank_solutions.sql
-- يعيد الدالة حرفيًا كما كانت في القاعدة الفعلية بتاريخ 2026-10-30
-- (مأخوذة من النسخة الاحتياطية rawafid-backup-20261030/supabase/schema/03_functions.sql).
-- تحذير: هذه النسخة تعيد الثغرة (الحلول تصل للطالب). استخدمها فقط عند عطل طارئ.

begin;

create or replace function public.portal_student_mt_question_bank(p_token uuid, p_subject_code text)
 returns table(id bigint, title text, question_text text, question_image text, solution_text text, solution_image text, target_class text, is_visible boolean, show_solution boolean, created_at timestamp with time zone)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select q.id,q.title,q.question_text,q.question_image,q.solution_text,q.solution_image,q.target_class,q.is_visible,q.show_solution,q.created_at
  from public.students st
  join public.teacher_class_subjects tcs on tcs.class_name=st.class_name and tcs.is_active=true
  join public.subjects s on s.id=tcs.subject_id and s.code=p_subject_code
  join public.portal_mt_question_bank q on q.teacher_id=tcs.teacher_id and q.subject_id=tcs.subject_id
  where st.id=public._portal_mt_student_id(p_token) and q.is_visible=true and (q.target_class='ALL' or q.target_class=st.class_name)
  order by q.created_at desc
$function$;

revoke all on function public.portal_student_mt_question_bank(uuid, text) from public;
grant execute on function public.portal_student_mt_question_bank(uuid, text) to anon, authenticated, service_role;

commit;
