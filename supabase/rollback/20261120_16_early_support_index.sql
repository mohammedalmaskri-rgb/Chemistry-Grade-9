-- Rollback for 20261120_16_early_support_index: drops only the two functions it created. No table or row is touched.
drop function if exists public.portal_teacher_mt_support_index(uuid, text, text);
drop function if exists public.portal__support_index_core(bigint, bigint, text, timestamptz);
