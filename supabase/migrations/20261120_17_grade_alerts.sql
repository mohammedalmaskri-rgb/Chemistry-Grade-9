-- 20261120_17_grade_alerts
-- «تنبيهات الدرجات»: لكل معلم، الطلاب الذين نزلت درجتهم أو جاءت أقل من المتوقع، اعتمادًا على الدرجات المسجّلة فقط
-- (لا دخول ولا سلوك). القراءة فقط؛ دالتان جديدتان، ولا شيء موجود يتغير.
-- القواعد على آخر درجة تحصيل للطالب (الحوار الشفوي لا يدخل). الدرجة غير المسجلة لا تُحتسب أبدًا:
--   1) نزول: آخر درجة أقل من درجته السابقة من نفس النوع (اختبار مع اختبار، واجب مع واجب) بـ 10 نقاط فأكثر
--   2) أقل من الشعبة: أقل من متوسط الشعبة في نفس التقييم بـ 15 نقطة فأكثر (يلزم 5 طلاب فأكثر في المقارنة)
--   3) درجة ضعيفة: أقل من 60
-- الشدة: «red» إذا نزل 25 نقطة فأكثر أو الدرجة أقل من 50 ، «amber» لأي تنبيه آخر ، «ok» بلا تنبيه ، «no_data» بلا درجات تحصيل.
-- Rollback: supabase/rollback/20261120_17_grade_alerts.sql

create or replace function public.portal__grade_alerts_core(
  p_teacher_id bigint, p_subject_id bigint, p_class text, p_asof timestamptz default now())
returns table(
  student_id bigint, full_name text, class_name text, severity text, reasons text[], grades jsonb,
  last_title text, last_pct numeric, prev_pct numeric, drop_pts numeric, class_avg numeric, graded_n integer)
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
    select x.id, x.student_id, x.created_at, round(x.score / x.max_score * 100, 1) as pct, x.assessment_title as title,
           translate(regexp_replace(trim(x.assessment_title), '\s+', ' ', 'g'), 'إأآ', 'ااا') as tkey,
           case when x.assessment_title ~ 'واجب' then 'hw'
                when x.assessment_title ~ 'اختبار|إختبار|امتحان' then 'test' else 'other' end as typ
      from public.portal_mt_grades x
     where x.teacher_id = p_teacher_id and x.subject_id = p_subject_id
       and x.max_score > 0 and x.score is not null and x.created_at <= p_asof
       and not (x.assessment_title ~ 'حوار|شفو')
  ),
  ranked as (
    select g.*, row_number() over (partition by g.student_id order by g.created_at desc, g.id desc) as rn from g
  ),
  lastg as (select * from ranked where rn = 1),
  cnt as (select student_id, count(*)::int as n from g group by student_id),
  seq as (
    select r.student_id, jsonb_agg(jsonb_build_object('t', r.title, 'p', r.pct) order by r.created_at, r.id) as grades
      from ranked r where r.rn <= 4 group by r.student_id
  ),
  cls as (
    select ro.class_name, g.tkey, avg(g.pct) as avg_pct, count(*)::int as n
      from g join roster ro on ro.id = g.student_id group by ro.class_name, g.tkey
  ),
  calc as (
    select ro.id as student_id, ro.full_name, ro.class_name,
           l.title as last_title, l.pct as last_pct, l.typ,
           (select r2.pct from ranked r2 where r2.student_id = ro.id and r2.rn > 1 and r2.typ = l.typ order by r2.rn limit 1) as prev_pct,
           (select r2.title from ranked r2 where r2.student_id = ro.id and r2.rn > 1 and r2.typ = l.typ order by r2.rn limit 1) as prev_title,
           case when c.n >= 5 then round(c.avg_pct, 1) end as class_avg,
           coalesce(ct.n, 0) as graded_n, sq.grades
      from roster ro
      left join lastg l on l.student_id = ro.id
      left join cnt ct on ct.student_id = ro.id
      left join seq sq on sq.student_id = ro.id
      left join cls c on c.class_name = ro.class_name and c.tkey = l.tkey
  )
  select k.student_id, k.full_name, k.class_name,
         case when k.last_pct is null then 'no_data'
              when coalesce(k.prev_pct - k.last_pct, 0) >= 25 or k.last_pct < 50 then 'red'
              when coalesce(k.prev_pct - k.last_pct, 0) >= 10 or coalesce(k.class_avg - k.last_pct, 0) >= 15 or k.last_pct < 60 then 'amber'
              else 'ok' end as severity,
         case when k.last_pct is null then array['لا توجد درجات تحصيل مسجّلة بعد']::text[]
              else array_remove(array[
                case when coalesce(k.prev_pct - k.last_pct, 0) >= 10 then
                  'نزل من ' || trim_scale(k.prev_pct)::text || ' في ' || k.prev_title || ' إلى ' || trim_scale(k.last_pct)::text || ' في ' || k.last_title end,
                case when coalesce(k.class_avg - k.last_pct, 0) >= 15 then
                  'أقل من متوسط الشعبة بـ ' || trim(to_char(k.class_avg - k.last_pct, 'FM990')) || ' نقطة في ' || k.last_title || ' (متوسط الشعبة ' || trim(to_char(k.class_avg, 'FM990')) || ')' end,
                case when k.last_pct < 60 then 'درجته ' || trim_scale(k.last_pct)::text || ' في ' || k.last_title end
              ]::text[], null) end as reasons,
         coalesce(k.grades, '[]'::jsonb) as grades,
         k.last_title, k.last_pct, k.prev_pct,
         case when k.prev_pct is not null then round(k.prev_pct - k.last_pct, 1) end as drop_pts,
         k.class_avg, k.graded_n
    from calc k;
$function$;

create or replace function public.portal_teacher_mt_grade_alerts(p_token uuid, p_subject_code text, p_class text default 'ALL')
returns table(
  student_id bigint, full_name text, class_name text, severity text, reasons text[], grades jsonb,
  last_title text, last_pct numeric, prev_pct numeric, drop_pts numeric, class_avg numeric, graded_n integer)
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
    select c.* from public.portal__grade_alerts_core(tid, sid, coalesce(nullif(trim(p_class), ''), 'ALL'), now()) c
     order by case c.severity when 'red' then 0 when 'amber' then 1 when 'ok' then 2 else 3 end,
              greatest(coalesce(c.drop_pts, 0), 100 - coalesce(c.last_pct, 100)) desc, c.class_name, c.full_name;
end
$function$;

revoke all on function public.portal__grade_alerts_core(bigint, bigint, text, timestamptz) from public, anon, authenticated;
revoke all on function public.portal_teacher_mt_grade_alerts(uuid, text, text) from public;
grant execute on function public.portal_teacher_mt_grade_alerts(uuid, text, text) to anon, authenticated, service_role;
