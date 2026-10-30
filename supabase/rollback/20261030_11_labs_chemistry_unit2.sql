-- Rollback for 20261030_11: removes exactly the 5 experiments added by that migration (matched by URL).
begin;
delete from public.portal_mt_experiments
where teacher_id = 1 and subject_id = 2 and experiment_url in (
 'https://rawafidedu.om/labs/iron-sulfur/','https://rawafidedu.om/labs/copper-carbonate/','https://rawafidedu.om/labs/sugar-changes/',
 'https://rawafidedu.om/labs/build-atom/','https://rawafidedu.om/labs/flame-test/');
commit;
