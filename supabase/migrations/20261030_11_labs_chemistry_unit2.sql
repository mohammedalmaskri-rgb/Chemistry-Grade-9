-- Adds 5 interactive experiments (hosted on the site under /labs/) to teacher 1's chemistry
-- experiment library, visible to all of the teacher's classes. Idempotent: skips a row whose URL already exists.
begin;
do $$ begin
  if not exists (select 1 from public.teacher_users where id = 1 and is_active)
     or (select code from public.subjects where id = 2) is distinct from 'chemistry' then
    raise exception 'labs_unit2: teacher 1 / chemistry not as expected';
  end if;
end $$;
insert into public.portal_mt_experiments(teacher_id, subject_id, title, description, experiment_url, target_class, is_visible, created_at)
select 1, 2, v.title, v.description, v.url, 'ALL', true, now() - make_interval(secs => v.ord)
from (values
 (0,'الحديد والكبريت: مخلوط أم مركّب؟','درس الذرات والجزيئات: افصل مخلوط الحديد والكبريت بالمغناطيس، ثم سخّنه ولاحظ تكوّن مركّب جديد هو كبريتيد الحديد (II).','https://rawafidedu.om/labs/iron-sulfur/'),
 (1,'تفكّك كربونات النحاس (II) بالحرارة','درس الذرات والجزيئات: سخّن كربونات النحاس الخضراء، واكشف عن غاز ثاني أكسيد الكربون بماء الجير، وقارن الكتلة قبل التسخين وبعده.','https://rawafidedu.om/labs/copper-carbonate/'),
 (2,'السكّر: تغيّر فيزيائي أم كيميائي؟','درس الذرات والجزيئات: أذب السكّر في الماء واستعده بالتبخير، ثم سخّن السكّر الجاف بقوة وقارن بين التغيّرين.','https://rawafidedu.om/labs/sugar-changes/'),
 (3,'ابنِ الذرّة','درسا تركيب الذرّة وترتيب الإلكترونات: ابنِ الذرّات بالبروتونات والنيوترونات والإلكترونات، وأنجز مهمات العدد الذرّي والكتلي والنظائر والتركيب الإلكتروني.','https://rawafidedu.om/labs/build-atom/'),
 (4,'اختبار اللهب','درس ترتيب الإلكترونات في الذرّات: اختبر أملاح عدة فلزات في اللهب، وفسّر الألوان بانتقال الإلكترونات، وتعرّف على عيّنة مجهولة.','https://rawafidedu.om/labs/flame-test/')
) as v(ord, title, description, url)
where not exists (select 1 from public.portal_mt_experiments x where x.teacher_id = 1 and x.subject_id = 2 and x.experiment_url = v.url);
commit;
