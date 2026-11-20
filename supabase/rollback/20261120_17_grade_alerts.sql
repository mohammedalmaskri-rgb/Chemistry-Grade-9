-- Rollback for 20261120_17_grade_alerts: drops only the two functions it created. No table or row is touched.
drop function if exists public.portal_teacher_mt_grade_alerts(uuid, text, text);
drop function if exists public.portal__grade_alerts_core(bigint, bigint, text, timestamptz);
