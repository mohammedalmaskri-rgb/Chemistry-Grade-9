-- Rollback for 20261119_13_unified_login: removes only the new function.
-- The three original login functions were never changed, so nothing else needs restoring.
-- Deploy the previous front end (two-step login with tabs) together with this rollback.
begin;
drop function if exists public.portal_login(text, text);
commit;
