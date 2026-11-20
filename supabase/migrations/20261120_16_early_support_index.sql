-- 20261120_16_early_support_index
-- «مؤشر الدعم المبكر»: لكل معلم، ترتيب طلابه حسب حاجتهم للمتابعة، مع ذكر السبب بوضوح.
-- القراءة فقط: لا جدول ولا عمود ولا دالة موجودة تتغير. دالتان جديدتان فقط.
--   * portal__support_index_core  (داخلية: لا أحد يستدعيها مباشرة، تُستدعى من الدالة العامة فقط)
--   * portal_teacher_mt_support_index (العامة: تتحقق من جلسة المعلم وتُظهر طلابه هو فقط)
-- المؤشر تحليل شفاف (ليس نموذجًا مدرَّبًا). المكوّنات والأوزان (مجموعها 100):
--   مستوى التحصيل 40  | تراجع الأداء 20 | الانقطاع عن المنصة 20 | السلوك المفتوح 20
-- التحصيل = متوسط نسب الاختبارات والواجبات (الحوار الشفوي لا يدخل في التحصيل؛ تقريبًا الكل ينال الدرجة الكاملة فيه فلا يميّز).
-- التراجع = (متوسط التقييمات السابقة) − (آخر تقييم). الانقطاع = أيام منذ آخر دخول للمنصة.
-- الفئات: 50 فأكثر «تحتاج متابعة» ، 30–49 «راقب» ، أقل «مستقر» ، وبلا أي تقييم «بيانات غير كافية».
-- Rollback: supabase/rollback/20261120_16_early_support_index.sql

create or replace function public.portal__support_index_core(
  p_teacher_id bigint, p_subject_id bigint, p_class text, p_asof timestamptz default now())
returns table(
  student_id bigint, full_name text, class_name text,
  risk_score integer, level text, reasons text[],
  academic_pct numeric, last_pct numeric, drop_pts numeric,
  days_since_login integer, open_behavior integer, academic_n integer)
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
    select x.student_id, x.created_at,
           round(x.score / x.max_score * 100, 1) as pct,
           (x.assessment_title ~ 'حوار|شفو') as is_oral
      from public.portal_mt_grades x
     where x.teacher_id = p_teacher_id and x.subject_id = p_subject_id
       and x.max_score > 0 and x.score is not null and x.created_at <= p_asof
  ),
  acad as (
    select student_id, pct, created_at,
           row_number() over (partition by student_id order by created_at desc, pct) as rn
      from g where not is_oral
  ),
  acad_agg as (
    select a.student_id,
           count(*)::int as n,
           round(avg(a.pct), 1) as avg_pct,
           max(a.pct) filter (where a.rn = 1) as last_pct,
           round(avg(a.pct) filter (where a.rn > 1), 1) as prior_avg
      from acad a group by a.student_id
  ),
  any_grade as (select student_id, count(*)::int as n from g group by student_id),
  logins as (
    select e.student_id, floor(extract(epoch from (p_asof - max(e.logged_in_at))) / 86400)::int as days
      from public.portal_student_login_events e where e.logged_in_at <= p_asof group by e.student_id
  ),
  beh as (
    select b.student_id,
           count(*) filter (where not b.is_resolved or b.resolved_at > p_asof)::int as open_n,
           count(*) filter (where (not b.is_resolved or b.resolved_at > p_asof) and b.level = 'repeated')::int as open_rep
      from public.portal_mt_behavior b
     where b.teacher_id = p_teacher_id and b.subject_id = p_subject_id and b.created_at <= p_asof
     group by b.student_id
  ),
  scored as (
    select r.id as student_id, r.full_name, r.class_name,
           aa.avg_pct, aa.last_pct, coalesce(aa.n, 0) as acad_n, coalesce(ag.n, 0) as any_n,
           case when aa.prior_avg is not null then round(aa.prior_avg - aa.last_pct, 1) end as drop_pts,
           lg.days as login_days, coalesce(bh.open_n, 0) as open_n, coalesce(bh.open_rep, 0) as open_rep,
           case when aa.avg_pct is null then 0
                when aa.avg_pct < 50 then 40 when aa.avg_pct < 60 then 30
                when aa.avg_pct < 70 then 18 when aa.avg_pct < 80 then 8 else 0 end as s_low,
           case when aa.prior_avg is null then 0
                when aa.prior_avg - aa.last_pct >= 20 then 20
                when aa.prior_avg - aa.last_pct >= 10 then 12
                when aa.prior_avg - aa.last_pct >= 5 then 6 else 0 end as s_drop,
           case when lg.days is null then 20 when lg.days > 14 then 20 when lg.days > 7 then 10 else 0 end as s_gap,
           case when coalesce(bh.open_rep, 0) > 0 then 20 when coalesce(bh.open_n, 0) > 0 then 10 else 0 end as s_beh
      from roster r
      left join acad_agg aa on aa.student_id = r.id
      left join any_grade ag on ag.student_id = r.id
      left join logins lg on lg.student_id = r.id
      left join beh bh on bh.student_id = r.id
  )
  select s.student_id, s.full_name, s.class_name,
         case when s.any_n = 0 then null else (s.s_low + s.s_drop + s.s_gap + s.s_beh) end as risk_score,
         case when s.any_n = 0 then 'no_data'
              when (s.s_low + s.s_drop + s.s_gap + s.s_beh) >= 50 then 'high'
              when (s.s_low + s.s_drop + s.s_gap + s.s_beh) >= 30 then 'watch'
              else 'stable' end as level,
         case when s.any_n = 0 then array['لا توجد درجات مسجّلة بعد']::text[]
              else array_remove(array[
                case when s.s_low >= 18 then 'متوسط الاختبارات والواجبات ' || trim(to_char(s.avg_pct, 'FM990.0')) || ' من 100' end,
                case when s.s_drop >= 6 then 'تراجع ' || trim(to_char(s.drop_pts, 'FM990.0')) || ' نقطة في آخر تقييم' end,
                case when s.login_days is null then 'لم يدخل المنصة'
                     when s.s_gap >= 10 then 'لم يدخل المنصة منذ ' || s.login_days || ' يومًا' end,
                case when s.open_rep > 0 then 'مخالفة سلوكية متكررة غير محلولة'
                     when s.open_n > 0 then 'ملاحظة سلوكية مفتوحة' end
              ]::text[], null) end as reasons,
         s.avg_pct, s.last_pct, s.drop_pts, s.login_days, s.open_n, s.acad_n
    from scored s;
$function$;

create or replace function public.portal_teacher_mt_support_index(p_token uuid, p_subject_code text, p_class text default 'ALL')
returns table(
  student_id bigint, full_name text, class_name text,
  risk_score integer, level text, reasons text[],
  academic_pct numeric, last_pct numeric, drop_pts numeric,
  days_since_login integer, open_behavior integer, academic_n integer)
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
    select c.* from public.portal__support_index_core(tid, sid, coalesce(nullif(trim(p_class), ''), 'ALL'), now()) c
     order by case c.level when 'high' then 0 when 'watch' then 1 when 'stable' then 2 else 3 end,
              c.risk_score desc nulls last, c.class_name, c.full_name;
end
$function$;

revoke all on function public.portal__support_index_core(bigint, bigint, text, timestamptz) from public, anon, authenticated;
revoke all on function public.portal_teacher_mt_support_index(uuid, text, text) from public;
grant execute on function public.portal_teacher_mt_support_index(uuid, text, text) to anon, authenticated, service_role;
