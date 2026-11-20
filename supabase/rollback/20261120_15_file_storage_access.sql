-- Rollback for 20261120_15_file_storage_access: drops ONLY the five functions this migration created.
-- It does not touch any table or row. Rows already switched to a storage: reference keep pointing at Storage;
-- the original inline data is in schema backup_20261120_before_storage (restore a row from there if ever needed).
drop function if exists public.portal_file_legacy_set(uuid, text, bigint, text, integer);
drop function if exists public.portal_file_legacy_batch(uuid, integer, integer);
drop function if exists public.portal_file_legacy_pending(uuid);
drop function if exists public.portal_file_read_info(uuid, text, bigint);
drop function if exists public.portal_file_principal(uuid);
