-- Rollback for 20261120_18_grade_thresholds: drops only the two functions it created. No table or row is touched.
drop function if exists public.portal_teacher_mt_grade_flags(uuid, text, text);
drop function if exists public.portal__grade_flags_core(bigint, bigint, text, timestamptz);
