-- 20261120_18_grade_thresholds
-- «تنبيهات الدرجات» بحدود واضحة يحددها المعلم لكل نوع تقييم (بدل المقارنات):
--   اختبار: أقل من 10 من 15  |  واجب: أقل من 3 من 5  |  حوار شفوي: أقل من 3 من 5
-- الحد محفوظ كنسبة (اختبار 10/15، واجب 3/5، حوار 3/5) ويُحوَّل لدرجة التقييم نفسه إن اختلفت الدرجة العظمى.
-- يُفحص آخر تقييم مسجّل من كل نوع؛ فإذا حسّن الطالب درجته في التقييم التالي يختفي التنبيه.
-- الدرجة غير المسجّلة لا تُحتسب. «red» إذا كان أكثر من نوع تحت الحد، «amber» إذا نوع واحد.
-- القراءة فقط؛ دالتان جديدتان ولا شيء موجود يتغير.
-- Rollback: supabase/rollback/20261120_18_grade_thresholds.sql

create or replace function public.portal__grade_flags_core(
  p_teacher_id bigint, p_subject_id bigint, p_class text, p_asof timestamptz default now())
returns table(
  student_id bigint, full_name text, class_name text, severity text, reasons text[], items jsonb, graded_n integer)
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
       and (
         exists (select 1 from public.teacher_class_subjects t
                  where t.teacher_id = p_teacher_id and t.subject_id = p_subject_id
                    and t.is_active = true and t.class_name = st.class_name)
         or exists (select 1 from public.portal_mt_grades g
                     where g.student_id = st.id and g.teacher_id = p_teacher_id and g.subject_id = p_subject_id)
       )
  ),
  g as (
    select x.id, x.student_id, x.created_at, x.assessment_title as title, x.score, x.max_score,
           case when x.assessment_title ~ 'حوار|شفو' then 'oral'
                when x.assessment_title ~ 'واجب' then 'hw'
                when x.assessment_title ~ 'اختبار|إختبار|امتحان' then 'test' end as typ
      from public.portal_mt_grades x
     where x.teacher_id = p_teacher_id and x.subject_id = p_subject_id
       and x.max_score > 0 and x.score is not null and x.created_at <= p_asof
  ),
  lastg as (
    select distinct on (g.student_id, g.typ) g.student_id, g.typ, g.title, g.score, g.max_score,
           case g.typ when 'test' then 10.0 * g.max_score / 15 else 3.0 * g.max_score / 5 end as limit_score
      from g where g.typ is not null
     order by g.student_id, g.typ, g.created_at desc, g.id desc
  ),
  cnt as (select student_id, count(*)::int as n from g where typ is not null group by student_id),
  agg as (
    select l.student_id,
           count(*) filter (where l.score < l.limit_score)::int as low_n,
           array_agg(
             (case l.typ when 'test' then 'الاختبار' when 'hw' then 'الواجب' else 'الحوار' end) || ' «' || l.title || '»: '
             || trim_scale(l.score)::text || ' من ' || trim_scale(l.max_score)::text
             || ' (الحد ' || trim_scale(round(l.limit_score, 1))::text || ')'
             order by case l.typ when 'test' then 0 when 'hw' then 1 else 2 end
           ) filter (where l.score < l.limit_score) as low_reasons,
           jsonb_agg(jsonb_build_object('type', l.typ, 'title', l.title, 'score', trim_scale(l.score), 'max', trim_scale(l.max_score),
                                        'limit', trim_scale(round(l.limit_score, 1)), 'low', l.score < l.limit_score)
                     order by case l.typ when 'test' then 0 when 'hw' then 1 else 2 end) as items
      from lastg l group by l.student_id
  )
  select r.id, r.full_name, r.class_name,
         case when coalesce(c.n, 0) = 0 then 'no_data'
              when coalesce(a.low_n, 0) >= 2 then 'red'
              when coalesce(a.low_n, 0) = 1 then 'amber'
              else 'ok' end,
         case when coalesce(c.n, 0) = 0 then array['لا توجد درجات مسجّلة بعد']::text[]
              else coalesce(a.low_reasons, array[]::text[]) end,
         coalesce(a.items, '[]'::jsonb),
         coalesce(c.n, 0)
    from roster r left join cnt c on c.student_id = r.id left join agg a on a.student_id = r.id;
$function$;

create or replace function public.portal_teacher_mt_grade_flags(p_token uuid, p_subject_code text, p_class text default 'ALL')
returns table(
  student_id bigint, full_name text, class_name text, severity text, reasons text[], items jsonb, graded_n integer)
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
    select c.* from public.portal__grade_flags_core(tid, sid, coalesce(nullif(trim(p_class), ''), 'ALL'), now()) c
     order by case c.severity when 'red' then 0 when 'amber' then 1 when 'ok' then 2 else 3 end,
              c.class_name, c.full_name;
end
$function$;

revoke all on function public.portal__grade_flags_core(bigint, bigint, text, timestamptz) from public, anon, authenticated;
revoke all on function public.portal_teacher_mt_grade_flags(uuid, text, text) from public;
grant execute on function public.portal_teacher_mt_grade_flags(uuid, text, text) to anon, authenticated, service_role;
