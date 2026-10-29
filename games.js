/* Rawafid Science Games - integrated module
   Loads after app.js. Stores games/results in Supabase through RPC functions.
*/
(function(){
'use strict';
if(window.__rawafidGamesLoaded)return;
window.__rawafidGamesLoaded=true;

const RG={
  teacherGames:[],
  studentGames:[],
  draft:null,
  activeGame:null,
  subjectKey(){
    const k=String((typeof teacherToken!=='undefined'&&teacherToken?teacherSubjectCode:studentSubjectCode)||'science').toLowerCase();
    return ['chemistry','physics','biology','science'].includes(k)?k:'science';
  }
};
const H=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const B=(x,c,f)=>{const b=H('button',c||'btn secondary',x);b.type='button';b.onclick=f;return b};
const sh=a=>[...a].sort(()=>Math.random()-.5);
const norm=s=>(s||'').trim().replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[\u064B-\u0652]/g,'').toLowerCase();
const hit=(v,a)=>String(a||'').split('/').map(norm).includes(norm(v));
const fmt=t=>Math.floor(Math.max(0,t)/60)+':'+String(Math.max(t,0)%60).padStart(2,'0');
const ge=id=>document.getElementById(id);
let cur=null,sc=0,ivs=[],onEnd=()=>{},scoreHost=null;
const tick=(f,ms)=>{const v=setInterval(f,ms);ivs.push(v);return v};
const clr=()=>{ivs.forEach(clearInterval);ivs=[]};
const upd=()=>{if(scoreHost){scoreHost.style.display='inline-flex';scoreHost.textContent='النقاط: '+sc}};
function seq(st,items,draw){let i=0;const go=()=>{st.innerHTML='';if(i>=items.length){st.append(H('div','rg-end','🎉 انتهت اللعبة! مجموع النقاط: '+sc));onEnd();return}
 st.append(H('div','rg-muted',(i+1)+' / '+items.length));
 draw(items[i],(ok,p)=>{sc+=p!==undefined?p:(ok?1:0);upd();st.append(B(i+1<items.length?'التالي ◀':'النتيجة','btn primary',()=>{i++;go()}))})};go()}
function choose(st,q,opts,ans,done){st.append(H('div','rg-q',q));const w=H('div','rg-opts');
 opts.forEach(o=>{const b=B(o,'btn secondary rg-opt',()=>{[...w.children].forEach(c=>{c.disabled=true;if(c.textContent===ans)c.classList.add('rg-ok')});if(o!==ans)b.classList.add('rg-no');done(o===ans)});w.append(b)});st.append(w)}
function ask(st,q,ans,done){st.append(H('div','rg-q',q));const i=H('input','rg-input');i.placeholder='اكتب الإجابة';
 const b=B('تحقق','btn primary',()=>{if(!i.value.trim())return;const ok=hit(i.value,ans);i.disabled=b.disabled=true;st.append(H('div',ok?'rg-ok-t':'rg-bad-t',ok?'✅ صحيحة':'❌ الصحيح: '+ans));done(ok)});
 i.onkeydown=e=>e.key==='Enter'&&b.click();st.append(i,b);i.focus()}

const T={
esc:{n:'غرفة الهروب',i:'🚪',d:'أبواب مقفلة والوقت يمرّ',f:'السؤال | الإجابة | تلميح (اختياري)',
s:'ما عاصمة سلطنة عُمان؟|مسقط|تبدأ بحرف الميم\nكم ناتج 12 × 3؟|36|ثلاثون وستة\nما ضد كلمة قريب؟|بعيد|تبدأ بحرف الباء\nما الكوكب الأحمر؟|المريخ|قريب من الأرض',
run:(r,st)=>{r=r.filter(x=>x[1]);let i=0,l=3,t=r.length*40,over=0;const tm=H('b'),lv=H('b'),hud=H('div','rg-hud'),d=H('div','rg-doors'),c=H('div','rg-card');hud.append(tm,lv);st.append(hud,d,c);
 const dr=()=>{d.innerHTML='';r.forEach((_,k)=>d.append(H('span','door'+(k<i?' open':k===i?' cur':''),k<i?'🔓':'🔒')));tm.textContent='⏱ '+fmt(t);lv.textContent='❤️'.repeat(l)+'🖤'.repeat(3-l)};
 const fin=w=>{if(over)return;over=1;clearInterval(iv);if(w){sc+=r.length;upd()}onEnd();c.innerHTML='';dr();c.append(H('div','rg-big',w?'🎉':'😵'),H('div','rg-q',w?'هربت من الغرفة!':'فشل الهروب'))};
 const iv=tick(()=>{t--;dr();if(t<=0)fin(0)},1000);
 const show=()=>{c.innerHTML='';dr();const x=r[i],inp=H('input','rg-input'),m=H('div','rg-msg');inp.placeholder='كلمة السر...';
  const go=()=>{if(over||!inp.value.trim())return;if(hit(inp.value,x[1])){i++;m.textContent='🔓 انفتح الباب!';inp.disabled=true;dr();i>=r.length?fin(1):setTimeout(show,700)}
   else{l--;dr();m.textContent='❌ خطأ';c.classList.remove('shake');void c.offsetWidth;c.classList.add('shake');if(l<=0)fin(0)}};
  inp.onkeydown=e=>e.key==='Enter'&&go();c.append(H('div','rg-muted','الباب '+(i+1)),H('div','rg-q',x[0]),inp,B('افتح 🔑','btn primary',go));
  if(x[2]){const hb=B('💡 تلميح (−20ث)','',()=>{t=Math.max(t-20,1);hb.replaceWith(H('div','rg-msg','💡 '+x[2]))});c.append(hb)}c.append(m);inp.focus()};show()}},
det:{n:'المحقق',i:'🕵️',d:'أدلة تنكشف واحداً واحداً',f:'الإجابة | دليل 1 | دليل 2 | دليل 3 (حتى 5 أدلة)',
s:'مسقط|مدينة ساحلية|عاصمة بلد عربي|فيها قصر العلم|عاصمة سلطنة عُمان\nالقمر|يدور حول الأرض|يظهر في الليل|يتغير شكله خلال الشهر\nالنخلة|شجرة|تعطينا التمر|رمز للخير في الخليج',
run:(r,st)=>seq(st,r.filter(x=>x.length>2),(x,d)=>{const cl=x.slice(1);let k=1;const L=H('div'),inp=H('input','rg-input'),m=H('div','rg-msg');
 const dr=()=>{L.innerHTML='';cl.slice(0,k).forEach((z,j)=>L.append(H('div','clue','🔎 دليل '+(j+1)+': '+z)))};
 const fin=p=>{inp.disabled=g.disabled=mo.disabled=true;m.textContent=p?'🕵️ أحسنت! +'+p+' نقطة':'❌ الإجابة: '+x[0];d(p>0,p)};
 const g=B('خمّن','btn primary',()=>{if(!inp.value.trim())return;if(hit(inp.value,x[0]))fin(cl.length-k+1);else if(k<cl.length){k++;dr();m.textContent='❌ خطأ — ظهر دليل جديد'}else fin(0)});
 const mo=B('➕ دليل إضافي','',()=>{if(k<cl.length){k++;dr()}else fin(0)});
 inp.placeholder='ما هذا؟';inp.onkeydown=e=>e.key==='Enter'&&g.click();
 st.append(H('div','rg-q','🕵️ اكشف اللغز — كلما قلّت الأدلة زادت نقاطك'),L,inp,g,mo,m);dr()})},
water:{n:'ارتفاع الماء',i:'🌊',d:'تسلّق قبل أن يغرقك الماء',f:'السؤال | الصحيحة | خطأ 1 | خطأ 2',
s:'كم عدد أيام الأسبوع؟|7|5|6\nما ناتج 9 × 9؟|81|72|91\nما عاصمة مصر؟|القاهرة|الإسكندرية|أسوان\nأكبر محيط في العالم؟|الهادئ|الأطلسي|الهندي\nما جمع كلمة كتاب؟|كتب|كتابات|كتّاب',
run:(r,st)=>{r=r.filter(x=>x.length>2);const top=r.length+2;let i=0,p=2,w=0;const col=H('div','trk'),box=H('div');st.append(H('div','rg-muted','أجب صح لتتسلّق، وكل خطأ يرفع الماء!'),col,box);
 const dr=()=>{col.innerHTML='';for(let k=0;k<=top;k++)col.append(H('span','cl'+(k===p?' on':''),k<w?'🌊':k===p?'🧗':k===top?'🚁':'·'))};
 const nx=()=>{box.innerHTML='';dr();if(w>=p){box.append(H('div','rg-end','🌊 ابتلعك الماء!'));return}if(p>=top||i>=r.length){sc+=Math.max(0,r.length-w);upd();onEnd();box.append(H('div','rg-end','🚁 نجوت! وصلت لمروحية الإنقاذ'));return}
  const x=r[i++];choose(box,x[0],sh(x.slice(1)),x[1],ok=>{ok?p++:w++;dr();if(w>=p||p>=top||i>=r.length)setTimeout(nx,900);else box.append(B('التالي ◀','btn primary',nx))})};nx()}},
bomb:{n:'القنبلة المتنقلة',i:'💣',d:'مرّر القنبلة قبل أن تنفجر',f:'السطر الأول: أسماء اللاعبين بينها فاصلة (،) — ثم كل سطر: السؤال | الجواب',
s:'أحمد، سالم، خالد، يوسف\nما عاصمة اليابان؟|طوكيو\nكم ناتج 15 + 27؟|42\nما ضد كلمة طويل؟|قصير\nما لون السماء؟|أزرق\nكم عدد أيام السنة؟|365',
run:(r,st)=>{const nm=r[0][0].split(/[،,]/).map(s=>s.trim()).filter(Boolean),qs=sh(r.slice(1).filter(x=>x[1]));let al=[...nm],t=0,qi=0,iv;const box=H('div','rg-card');st.append(box);
 const boom=w=>{clearInterval(iv);box.innerHTML='';box.append(H('div','rg-big','💥'),H('div','rg-q',w+' خرج من اللعبة!'),B('التالي ◀','btn primary',turn));al=al.filter(z=>z!==w)};
 function turn(){clearInterval(iv);box.innerHTML='';if(al.length<2){box.append(H('div','rg-big','🏆'),H('div','rg-q','الفائز: '+(al[0]||'—')));return}
  t%=al.length;const who=al[t],x=qs[qi++%qs.length];let f=12;const fz=H('div','rg-big','💣 12');
  box.append(H('div','rg-muted','القنبلة عند:'),H('div','rg-q',who),fz,H('div','rg-q',x[0]));
  const a=B('أظهر الجواب','',()=>a.replaceWith(H('div','rg-ok-t','✅ '+x[1])));
  box.append(a,H('div'),B('✅ أجاب صح — مرّر القنبلة','btn primary',()=>{t++;turn()}),B('❌ أخطأ','',()=>boom(who)));
  iv=tick(()=>{fz.textContent='💣 '+(--f);if(f<=0)boom(who)},1000)}turn()}},
rocket:{n:'سباق الصواريخ',i:'🚀',d:'فريقان يتسابقان للوصول',f:'السطر الأول: أسماء الفرق (حتى 4) بينها فاصلة (،) — ثم كل سطر: السؤال | الجواب',
s:'فريق الصقور، فريق النمور\nما عاصمة الإمارات؟|أبوظبي\nكم ناتج 7 × 8؟|56\nما جمع كلمة قلم؟|أقلام\nما ضد كلمة سريع؟|بطيء\nكم عدد أضلاع المربع؟|4\nما أكبر كوكب؟|المشتري',
run:(r,st)=>{const tm=r[0][0].split(/[،,]/).map(s=>s.trim()).filter(Boolean).slice(0,4),qs=sh(r.slice(1).filter(x=>x[1])),G=6,pos=tm.map(()=>0);let i=0;const tr=H('div'),box=H('div','rg-card');st.append(tr,box);
 const dr=()=>{tr.innerHTML='';tm.forEach((n,k)=>{const row=H('div','trk');row.append(H('b','',n));for(let z=0;z<=G;z++)row.append(H('span','cl'+(z===pos[k]?' on':''),z===pos[k]?'🚀':z===G?'🏁':'·'));tr.append(row)})};
 const nx=()=>{dr();box.innerHTML='';const w=pos.findIndex(p=>p>=G);if(w>=0){box.append(H('div','rg-end','🏆 فاز '+tm[w]+'!'));return}
  const x=qs[i++%qs.length];box.append(H('div','rg-q',x[0]));const a=B('أظهر الجواب','',()=>a.replaceWith(H('div','rg-ok-t','✅ '+x[1])));box.append(a,H('div'));
  tm.forEach((n,k)=>box.append(B('✔ '+n,'btn primary',()=>{pos[k]++;nx()})));box.append(B('لا أحد','',nx))};nx()}},
treasure:{n:'صناديق الكنز',i:'📦',d:'كل صندوق يخبّئ جائزة',f:'السؤال | الجواب',
s:'ما عاصمة قطر؟|الدوحة\nكم ناتج 6 × 6؟|36\nما ضد كلمة حار؟|بارد\nما أصغر عدد أولي؟|2\nما لون الدم؟|أحمر\nكم شهراً في السنة؟|12',
run:(r,st)=>{const qs=r.filter(x=>x[1]),pr=sh(qs.map((_,i)=>[10,20,10,50,30][i%5])),g=H('div','tgrid'),pop=H('div','pop');
 qs.forEach((x,i)=>{const b=B('📦','cell',()=>{b.disabled=true;pop.innerHTML='';pop.append(H('div','rg-q',x[0]));
  const a=B('أظهر الجواب','',()=>{a.replaceWith(H('div','rg-ok-t','✅ '+x[1]));pop.append(B('أجاب صح 🎁','btn primary',()=>{sc+=pr[i];upd();b.textContent='💰'+pr[i];pop.innerHTML=''}),B('أخطأ','',()=>{b.textContent='💨';pop.innerHTML=''}))});pop.append(a)});g.append(b)});
 st.append(H('div','rg-muted','اختر صندوقاً — تظهر الجائزة بعد الإجابة الصحيحة'),g,pop)}},
liar:{n:'اكشف الكاذب',i:'🤥',d:'عبارتان صادقتان وواحدة كاذبة',f:'عبارة صحيحة | عبارة صحيحة | العبارة الكاذبة (الأخيرة دائماً الكاذبة)',
s:'الأرض تدور حول الشمس|الماء يتكون من هيدروجين وأكسجين|الشمس كوكب\nمسقط عاصمة عُمان|عدد أيام الأسبوع سبعة|القطة من الطيور\nالحوت من الثدييات|الذهب معدن|الخشب موصل جيد للكهرباء',
run:(r,st)=>seq(st,r.filter(x=>x.length>2),(x,d)=>choose(st,'🤥 أي عبارة من هذه كاذبة؟',sh(x),x[x.length-1],d))},
bet:{n:'راهن على إجابتك',i:'🎰',d:'ابدأ بـ 100 نقطة وراهن',f:'السؤال | الصحيحة | خطأ 1 | خطأ 2',
s:'ما ناتج 8 × 7؟|56|54|63\nما عاصمة السعودية؟|الرياض|جدة|مكة\nما ضد كلمة ظلام؟|نور|ليل|سواد\nكم عدد قارات العالم؟|7|5|9\nما أسرع حيوان بري؟|الفهد|الأسد|الحصان',
run:(r,st)=>{sc=100;upd();seq(st,r.filter(x=>x.length>2),(x,d)=>{const bx=H('div'),q=H('div');bx.append(H('div','rg-q','🎰 رصيدك '+sc+' — كم تراهن على إجابتك؟'));
 [10,20,50].forEach(v=>bx.append(B(v,'btn primary',()=>{bx.remove();choose(q,x[0],sh(x.slice(1)),x[1],ok=>d(ok,ok?v:-v))})));st.append(bx,q)})}},
pic:{n:'الصورة الغامضة',i:'🖼️',d:'كل إجابة تكشف جزءاً من الصورة',f:'السطر الأول: الرمز التعبيري | اسم الصورة — ثم كل سطر: السؤال | الجواب',
s:'🦁|أسد\nما عاصمة عُمان؟|مسقط\nكم ناتج 5 × 5؟|25\nما ضد كلمة كبير؟|صغير\nما لون الموز؟|أصفر\nكم عدد أيام الأسبوع؟|7|\nما اسم أكبر محيط؟|الهادئ',
run:(r,st)=>{const [e,nm]=r[0],qs=r.slice(1).filter(x=>x[1]),n=qs.length,cols=Math.ceil(Math.sqrt(n)),tl=[];let left=n;
 const box=H('div','pbox'),g=H('div','pgrid'),area=H('div'),gi=H('input','rg-input'),gm=H('div','rg-msg');
 g.style.gridTemplateColumns='repeat('+cols+',1fr)';g.style.gridTemplateRows='repeat('+Math.ceil(n/cols)+',1fr)';
 for(let k=0;k<n;k++){const c=H('div','tl');tl.push(c);g.append(c)}box.append(H('div','pemoji',e),g);gi.placeholder='هل عرفت الصورة؟ اكتبها هنا';
 const gb=B('🎯 خمّن الصورة','btn primary',()=>{if(!gi.value.trim())return;if(hit(gi.value,nm||'')){tl.forEach(c=>c.style.opacity=0);sc+=left+3;upd();gm.textContent='🎉 صحيح! +'+(left+3)+' نقطة';area.innerHTML='';gi.disabled=gb.disabled=true}else gm.textContent='❌ ليست هي'});
 st.append(box,gi,gb,gm,area);
 seq(area,qs,(x,d)=>ask(area,x[0],x[1],ok=>{if(ok){const c=tl.find(z=>z.style.opacity!=='0');if(c){c.style.opacity=0;left--}}d(ok)}))}},
fire:{n:'سلسلة النار',i:'🔥',d:'إجابات متتالية تضاعف نقاطك',f:'السؤال | الصحيحة | خطأ 1 | خطأ 2 (10 ثوانٍ لكل سؤال)',
s:'ما ناتج 9 + 6؟|15|14|16\nما عاصمة الكويت؟|الكويت|الدوحة|المنامة\nما ضد كلمة سعيد؟|حزين|فرحان|مسرور\nكم ناتج 4 × 4؟|16|12|8\nما لون العشب؟|أخضر|أزرق|أحمر\nكم ساعة في اليوم؟|24|12|60',
run:(r,st)=>{let sk=0;const stat=H('div','rg-hud'),area=H('div');st.append(stat,area);const up=()=>stat.textContent='🔥 سلسلة: '+sk+' — المضاعف ×'+(1+Math.floor(sk/2));up();
 seq(area,r.filter(x=>x.length>2),(x,d)=>{let t=10,fin=0;const tb=H('div','rg-muted','⏳ 10');area.append(tb);
  const end=ok=>{if(fin)return;fin=1;clearInterval(v);const p=ok?10*(1+Math.floor(sk/2)):0;sk=ok?sk+1:0;up();[...area.querySelectorAll('.rg-opt')].forEach(c=>{c.disabled=true;if(c.textContent===x[1])c.classList.add('rg-ok')});d(ok,p)};
  const v=tick(()=>{tb.textContent='⏳ '+(--t);if(t<=0)end(0)},1000);
  choose(area,x[0],sh(x.slice(1)),x[1],end)})}}
};

const SUB={
chem:{n:'⚗️ كيمياء',p:'🧪|أنبوب اختبار/مختبر',q:`ما الرمز الكيميائي للماء؟|H2O|CO2|O2|هيدروجين وأكسجين
ما الرمز الكيميائي للذهب؟|Au|Ag|Go|يبدأ بحرف A
كم عدد الإلكترونات في ذرة الكربون المتعادلة؟|6|12|4|عدده الذري 6
ما الغاز الذي نحتاجه في التنفس؟|الأكسجين|النيتروجين|الهيليوم|رمزه O
ما الصيغة الكيميائية لملح الطعام؟|NaCl|KCl|NaOH|صوديوم وكلور
ما قيمة pH للماء النقي؟|7|1|14|متعادل
ما اسم العنصر الذي رمزه Fe؟|الحديد|الفضة|الفلور|يصدأ
ما اسم تحول الماء السائل إلى بخار؟|التبخر|التجمد|الانصهار|يحدث بالتسخين`,
d:`الأكسجين|غاز لا لون له ولا رائحة|نحتاجه لنتنفس|رمزه O
الذهب|فلز أصفر لامع|رمزه Au|يُستخدم في صنع المجوهرات
الماء|مركب من هيدروجين وأكسجين|يغطي معظم سطح الأرض|يتجمد عند 0 درجة مئوية`,
l:`الماء يتكون من هيدروجين وأكسجين|ملح الطعام اسمه كلوريد الصوديوم|الذهب غاز في درجة حرارة الغرفة
الحديد يصدأ بوجود الماء والأكسجين|الأحماض لها طعم حامض|رمز الصوديوم هو Fe
الجدول الدوري يرتب العناصر حسب العدد الذري|الذرة فيها بروتونات ونيوترونات وإلكترونات|البروتون سالب الشحنة`},
phys:{n:'⚡ فيزياء',p:'🧲|مغناطيس',q:`ما وحدة قياس القوة؟|النيوتن|الجول|الواط|سُمّيت على اسم عالم
كم تبلغ سرعة الضوء تقريباً؟|300 ألف كيلومتر في الثانية|300 كيلومتر في الثانية|30 ألف كيلومتر في الثانية|أسرع شيء في الكون
ما اسم المسافة المقطوعة في اتجاه معين؟|الإزاحة|الكتلة|الزمن|كمية متجهة
ما وحدة قياس الطاقة؟|الجول|النيوتن|الأمبير|سُمّيت على اسم جول
القوة = الكتلة × ؟|التسارع|السرعة|الزمن|قانون نيوتن الثاني
ما الجهاز الذي يقيس التيار الكهربائي؟|الأميتر|الفولتميتر|الترمومتر|يوصل على التوالي
ما اسم ارتداد الموجات عن السطح؟|الانعكاس|الانكسار|الحيود|المرآة تفعله
ما وحدة قياس المقاومة الكهربائية؟|الأوم|الفولت|الواط|رمزها Ω`,
d:`المغناطيس|يجذب الحديد|له قطبان شمالي وجنوبي|تستخدمه البوصلة
الضوء|أسرع شيء في الكون|يأتينا من الشمس|يتكون من ألوان الطيف
الجاذبية|قوة تجذب الأجسام نحو الأرض|اكتشفها نيوتن|تجعل التفاحة تسقط`,
l:`الصوت لا ينتقل في الفراغ|وحدة القوة هي النيوتن|الضوء أبطأ من الصوت
الاحتكاك يقاوم الحركة|الجسم الساكن سرعته صفر|الكتلة تقاس بالنيوتن
المغناطيس يجذب الحديد|وحدة التيار الكهربائي الأمبير|الخشب موصل جيد للكهرباء`},
bio:{n:'🧬 أحياء',p:'🌱|نبات/شتلة',q:`ما العضية المسؤولة عن إنتاج الطاقة في الخلية؟|الميتوكوندريا|النواة|الريبوسوم|بيت الطاقة
ما الغاز الذي تمتصه النباتات في البناء الضوئي؟|ثاني أكسيد الكربون|الأكسجين|النيتروجين|رمزه CO2
ما المادة الوراثية في الخلية؟|DNA|ATP|الجلوكوز|توجد في النواة
كم عدد غرف القلب البشري؟|4|2|3|أذينان وبطينان
ما الصبغة الخضراء في النبات؟|الكلوروفيل|الهيموغلوبين|الميلانين|تمتص الضوء
ما العضو الذي يضخ الدم في الجسم؟|القلب|الكبد|الرئتان|ينبض دائماً
ما اسم عملية فقدان النبات للماء من أوراقه؟|النتح|الانتشار|التنفس|يحدث عبر الثغور
ما العظم الذي يحمي الدماغ؟|الجمجمة|القفص الصدري|العمود الفقري|في الرأس`,
d:`القلب|عضلة بحجم قبضة اليد|ينبض طوال حياتنا|يضخ الدم إلى الجسم
الخلية|وحدة بناء الكائنات الحية|لها نواة|لا نراها إلا بالمجهر
النبات|يصنع غذاءه بنفسه|يحتاج إلى الشمس والماء|يعطينا الأكسجين`,
l:`النبات يصنع غذاءه بالبناء الضوئي|القلب يضخ الدم|الإنسان يتنفس النيتروجين فقط
الميتوكوندريا تنتج الطاقة|DNA يحمل الصفات الوراثية|الخلايا النباتية ليس لها جدار خلوي
الأسماك تتنفس بالخياشيم|الفقاريات لها عمود فقري|النحل من الثدييات`},
sci:{n:'🔬 علوم عامة',p:'🔭|تلسكوب/منظار',q:`ما أقرب كوكب إلى الشمس؟|عطارد|الزهرة|المريخ|أصغر الكواكب
كم عدد كواكب المجموعة الشمسية؟|8|9|7|أقل من 10
ما أكبر كوكب في المجموعة الشمسية؟|المشتري|زحل|الأرض|عملاق غازي
ما الغاز الأكثر وجوداً في الغلاف الجوي؟|النيتروجين|الأكسجين|ثاني أكسيد الكربون|حوالي 78%
ما الجسم الطبيعي الذي يدور حول الأرض؟|القمر|الشمس|المريخ|تابع طبيعي
ما نوع الصخور التي تتكون من تبريد الماجما؟|النارية|الرسوبية|المتحولة|مصدرها البراكين
ما أقرب نجم إلى الأرض؟|الشمس|الزهرة|المشتري|مصدر الضوء
ما حالة المادة للجليد؟|صلبة|سائلة|غازية|ماء متجمد`,
d:`الشمس|نجم|في مركز مجموعتنا|مصدر الضوء والحرارة للأرض
القمر|تابع طبيعي|يدور حول الأرض|تتغير أشكاله خلال الشهر
المجهر|جهاز علمي|يكبّر الأشياء الصغيرة|نرى به الخلايا`,
l:`الأرض تدور حول الشمس|القمر يدور حول الأرض|الشمس كوكب
المشتري أكبر كواكب المجموعة الشمسية|الماء يغلي عند 100 درجة مئوية|الأرض مسطحة تماماً
الفصول تنتج عن ميل محور الأرض|الجليد ماء متجمد|الصوت أسرع من الضوء`}};

const mk=(k,s)=>{const b=SUB[s],q=b.q.split('\n').map(z=>z.split('|')),qa=q.map(x=>x[0]+'|'+x[1]).join('\n');
 if(k==='det')return b.d;if(k==='liar')return b.l;
 if(k==='esc')return q.map(x=>x[0]+'|'+x[1]+'|'+x[4]).join('\n');
 if(k==='treasure')return qa;
 if(k==='bomb')return 'أحمد، سالم، خالد، يوسف\n'+qa;
 if(k==='rocket')return 'فريق الصقور، فريق النمور\n'+qa;
 if(k==='pic')return b.p+'\n'+q.slice(0,6).map(x=>x[0]+'|'+x[1]).join('\n');
 return q.map(x=>x.slice(0,4).join('|')).join('\n')};


const SC={
 esc:{f:['السؤال','الإجابة','تلميح (اختياري)']},
 det:{f:['الإجابة','دليل 1','دليل 2','دليل 3']},
 water:{f:['السؤال','الإجابة الصحيحة','خطأ 1','خطأ 2']},
 bomb:{f:['السؤال','الجواب'],g:1,h:['أسماء اللاعبين بينها فاصلة (،)']},
 rocket:{f:['السؤال','الجواب'],g:1,h:['أسماء الفرق بينها فاصلة (،)']},
 treasure:{f:['السؤال','الجواب']},
 liar:{f:['عبارة صحيحة','عبارة صحيحة أخرى','العبارة الكاذبة']},
 bet:{f:['السؤال','الإجابة الصحيحة','خطأ 1','خطأ 2']},
 pic:{f:['السؤال','الجواب'],h:['الرمز التعبيري (مثل 🦁)','اسم الصورة']},
 fire:{f:['السؤال','الإجابة الصحيحة','خطأ 1','خطأ 2']}
};
const SUBJECT_LABEL={chemistry:'⚗️ كيمياء',physics:'⚡ فيزياء',biology:'🧬 أحياء',science:'🔬 علوم'};
const subjectLabel=code=>SUBJECT_LABEL[String(code||'').toLowerCase()]||String(code||'المادة');
const safeJson=v=>{if(v&&typeof v==='object')return v;try{return JSON.parse(v||'{}')}catch(_e){return {}}};
const payloadRows=g=>{const p=safeJson(g.payload);return Array.isArray(p.rows)?p.rows:[]};
const payloadHead=g=>{const p=safeJson(g.payload);return Array.isArray(p.h)?p.h:[]};
const toRowsText=g=>{
 const rows=payloadRows(g),h=payloadHead(g);
 return (h.length?h.join('|')+'\n':'')+rows.map(r=>(Array.isArray(r)?r:[]).join('|')).join('\n');
};
function addStyles(){
 if(ge('rawafidGamesStyles'))return;
 const s=document.createElement('style');s.id='rawafidGamesStyles';s.textContent=`
 #t-games,#s-games{--rg-ac:#0f766e;--rg-bd:#cfe2df;--rg-soft:#f7fbfa;--rg-ok:#15803d;--rg-no:#b91c1c}
 .rg-head{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.rg-head h2{margin:0}.rg-head .btn{margin-inline-start:auto}
 .rg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:10px}.rg-tile{min-height:118px;display:flex;flex-direction:column;gap:5px;align-items:center;justify-content:center;text-align:center;border:2px solid var(--rg-bd);border-radius:16px;background:#fff;padding:12px;cursor:pointer}.rg-tile.on{border-color:var(--rg-ac);box-shadow:0 0 0 2px rgba(15,118,110,.12)}.rg-ic{font-size:34px}.rg-muted{color:#64748b}.rg-card{border:1px solid var(--rg-bd);border-radius:16px;background:#fff;padding:14px;margin:10px 0}.rg-steps{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 14px}.rg-step{padding:4px 9px;border-radius:20px;border:1px solid var(--rg-bd);font-size:12px;color:#64748b}.rg-step.cur{background:var(--rg-ac);color:#fff}.rg-step.done{background:#dcfce7;color:#166534}.rg-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr)) auto;gap:7px;align-items:center;margin:7px 0}.rg-input,.rg-select{width:100%;padding:10px;border-radius:11px;border:1px solid var(--rg-bd);background:#fff;color:#0f172a;font:inherit}.rg-toolbar{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin:8px 0}.rg-score{display:none;margin-inline-start:auto;background:#fef3c7;padding:5px 10px;border-radius:18px;font-weight:800}.rg-stage{border:1px solid var(--rg-bd);border-radius:16px;padding:14px;min-height:170px;text-align:center;background:#fff}.rg-q{font-size:20px;font-weight:800;margin:10px 0}.rg-opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:7px}.rg-opt{margin:0!important}.rg-ok{background:#dcfce7!important;border-color:#15803d!important}.rg-no{background:#fee2e2!important;border-color:#b91c1c!important}.rg-ok-t{color:#15803d;font-weight:800;margin:8px}.rg-bad-t{color:#b91c1c;font-weight:800;margin:8px}.rg-end{font-size:21px;font-weight:800;padding:22px}.rg-big{font-size:50px}.rg-msg{min-height:26px;font-weight:700;margin-top:8px}.rg-hud{display:flex;justify-content:space-between;gap:8px;font-size:20px;font-weight:800;background:var(--rg-soft);border:1px solid var(--rg-bd);border-radius:13px;padding:8px 12px;margin-bottom:8px}.rg-doors{display:flex;gap:7px;justify-content:center;flex-wrap:wrap;margin:10px}.door{width:48px;height:60px;border-radius:9px;border:2px solid var(--rg-bd);display:flex;align-items:center;justify-content:center;font-size:22px}.door.cur{border-color:var(--rg-ac)}.door.open{background:#fef3c7}.clue{background:#fef3c7;border-radius:10px;padding:7px 10px;margin:6px;text-align:right}.trk{display:flex;align-items:center;gap:4px;margin:6px;flex-wrap:wrap;justify-content:center}.trk b{min-width:85px}.cl{width:36px;height:36px;border-radius:8px;border:1px solid var(--rg-bd);display:flex;align-items:center;justify-content:center}.cl.on{background:#fef3c7}.tgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(65px,1fr));gap:7px}.cell{font-size:22px;font-weight:800;background:#fef3c7}.pbox{position:relative;height:220px;border-radius:14px;overflow:hidden;background:#fef3c7;margin-bottom:8px}.pemoji{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:120px}.pgrid{position:absolute;inset:0;display:grid}.tl{background:var(--rg-ac);border:1px solid #fff;transition:opacity .5s}.pop{margin-top:10px}.shake{animation:rgsh .35s}@keyframes rgsh{25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}.rg-table{width:100%;border-collapse:collapse}.rg-table td,.rg-table th{padding:7px;border-bottom:1px solid var(--rg-bd);text-align:right}.rg-badge{display:inline-block;padding:3px 8px;border-radius:16px;background:#eef6f5;margin:2px;font-size:12px}.rg-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
 @media(max-width:600px){.rg-row{grid-template-columns:1fr}.rg-head .btn{margin-inline-start:0;width:100%}.rg-opts{grid-template-columns:1fr}}
 body.dark-mode .rg-card,body.dark-mode .rg-stage,body.dark-mode .rg-tile,body.dark-mode .rg-input,body.dark-mode .rg-select{background:#172033;color:#f8fafc;border-color:#334155}
 `;
 document.head.appendChild(s);
}
function addSection(navId,viewId,secId,label,loader){
 const nav=ge(navId),view=ge(viewId);if(!nav||!view||ge(secId))return;
 const btn=document.createElement('button');btn.type='button';btn.dataset.sec=secId;btn.textContent=label;nav.appendChild(btn);
 const sec=document.createElement('section');sec.id=secId;sec.className='section';view.appendChild(sec);
 btn.addEventListener('click',()=>{nav.querySelectorAll('button').forEach(x=>x.classList.remove('active'));btn.classList.add('active');document.querySelectorAll(`#${viewId} .section`).forEach(x=>x.classList.remove('active'));sec.classList.add('active');Promise.resolve(loader()).catch(e=>{sec.innerHTML=`<div class="msg err">${esc(e.message||'تعذر تحميل الألعاب')}</div>`})});
}
async function apiTeacherGames(){
 return await rpc('portal_teacher_mt_games',{p_token:teacherToken,p_subject_code:teacherSubjectCode})||[];
}
async function apiStudentGames(){
 return await rpc('portal_student_mt_games',{p_token:studentToken,p_subject_code:studentSubjectCode})||[];
}
function templateLabel(k){return T[k]?.i+' '+T[k]?.n}
function normalizeSubjectForSamples(code){
 const k=String(code||'').toLowerCase();
 return ['chemistry','physics','biology','science'].includes(k)?k:'science';
}
async function teacherHome(){
 const root=ge('t-games');if(!root)return;
 root.innerHTML='<div class="rg-head"><h2>🎮 الألعاب التعليمية</h2><button id="rgNewGame" class="btn primary">➕ إنشاء لعبة</button></div><div class="rg-muted">أنشئ لعبة لطلاب المادة الحالية، وحدد الشعبة والدرس والمحاولات ونقاط التحفيز.</div><div id="rgTeacherList" class="rg-card">جاري التحميل...</div><div id="rgTeacherResults"></div>';
 ge('rgNewGame').onclick=()=>{RG.draft={s:0,t:null,target:'ALL',lesson:'',h:[],rows:[[]],scoreUnit:10,maxAttempts:2,reward:0.5,visible:true};teacherWizard()};
 try{RG.teacherGames=await apiTeacherGames();renderTeacherList()}catch(e){ge('rgTeacherList').innerHTML=`<div class="msg err">${esc(e.message||'تعذر تحميل الألعاب. شغّل ملف SQL أولًا.')}</div>`}
}
function renderTeacherList(){
 const host=ge('rgTeacherList');if(!host)return;
 if(!RG.teacherGames.length){host.innerHTML='<div class="rg-muted">لا توجد ألعاب في هذه المادة بعد.</div>';return}
 host.innerHTML=RG.teacherGames.map(g=>`<div class="rg-card">
   <div><span class="rg-badge">${esc(templateLabel(g.template_code))}</span><span class="rg-badge">${g.target_class==='ALL'?'كل الشعب':esc(g.target_class)}</span><span class="rg-badge">${g.is_visible?'🟢 ظاهرة':'⚪ مخفية'}</span></div>
   <h3>${esc(g.title)}</h3><div class="rg-muted">📘 ${esc(g.lesson_name||'بدون درس')} • ${Number(g.results_count||0)} محاولة • ${Number(g.students_count||0)} طالب • أفضل نتيجة ${Number(g.best_score||0)}</div>
   <div class="rg-actions">
    <button class="btn secondary" data-rg-preview="${g.id}">👁 معاينة</button>
    <button class="btn secondary" data-rg-results="${g.id}">📊 النتائج</button>
    <button class="btn secondary" data-rg-toggle="${g.id}">${g.is_visible?'🙈 إخفاء':'👁️ إظهار'}</button>
    <button class="btn danger" data-rg-delete="${g.id}">🗑 حذف</button>
   </div></div>`).join('');
 host.querySelectorAll('[data-rg-preview]').forEach(b=>b.onclick=()=>{const g=RG.teacherGames.find(x=>Number(x.id)===Number(b.dataset.rgPreview));if(g)launchGame(g,teacherHome,true)});
 host.querySelectorAll('[data-rg-results]').forEach(b=>b.onclick=()=>loadTeacherResults(Number(b.dataset.rgResults)));
 host.querySelectorAll('[data-rg-toggle]').forEach(b=>b.onclick=async()=>{const g=RG.teacherGames.find(x=>Number(x.id)===Number(b.dataset.rgToggle));if(!g)return;await rpc('portal_teacher_mt_set_game_visibility',{p_token:teacherToken,p_subject_code:teacherSubjectCode,p_game_id:Number(g.id),p_is_visible:!g.is_visible});await teacherHome()});
 host.querySelectorAll('[data-rg-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('حذف اللعبة ونتائجها؟'))return;await rpc('portal_teacher_mt_delete_game',{p_token:teacherToken,p_subject_code:teacherSubjectCode,p_game_id:Number(b.dataset.rgDelete)});await teacherHome()});
}
async function loadTeacherResults(id){
 const host=ge('rgTeacherResults');if(!host)return;host.innerHTML='<div class="rg-card">جاري تحميل النتائج...</div>';
 try{
  const rows=await rpc('portal_teacher_mt_game_results',{p_token:teacherToken,p_subject_code:teacherSubjectCode,p_game_id:id})||[];
  host.innerHTML=`<div class="rg-card"><h3>📊 نتائج اللعبة</h3>${rows.length?`<div style="overflow:auto"><table class="rg-table"><thead><tr><th>الطالب</th><th>الشعبة</th><th>المحاولة</th><th>النتيجة</th><th>نقاط التحفيز</th><th>التاريخ</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.full_name)}</td><td>${esc(r.class_name)}</td><td>${Number(r.attempt_no||0)}</td><td><b>${Number(r.score||0)}</b></td><td>⭐ ${Number(r.awarded_points||0)}</td><td>${r.created_at?new Date(r.created_at).toLocaleString('ar-OM'):''}</td></tr>`).join('')}</tbody></table></div>`:'<div class="rg-muted">لا توجد نتائج حتى الآن.</div>'}</div>`;
 }catch(e){host.innerHTML=`<div class="msg err">${esc(e.message||'تعذر تحميل النتائج')}</div>`}
}
function teacherWizard(){
 const root=ge('t-games'),W=RG.draft;if(!root||!W)return;
 const steps=['القالب','الشعبة','الدرس','الأسئلة','النقاط','النشر'];
 root.innerHTML='<button id="rgCancelW" class="btn secondary">→ رجوع للألعاب</button><div id="rgSteps" class="rg-steps"></div><div id="rgWizardBox" class="rg-card"></div><div id="rgWMsg"></div><div id="rgWNav" class="rg-toolbar"></div>';
 ge('rgCancelW').onclick=teacherHome;
 const shost=ge('rgSteps');steps.forEach((x,i)=>shost.append(H('span','rg-step '+(i===W.s?'cur':i<W.s?'done':''),(i+1)+'. '+x)));
 const box=ge('rgWizardBox'),nav=ge('rgWNav');
 const spec=W.t?SC[W.t]:null;
 if(W.s===0){
  box.append(H('h3','', 'اختر قالب اللعبة'));const g=H('div','rg-grid');
  Object.keys(T).forEach(k=>{const b=H('button','rg-tile'+(W.t===k?' on':''));b.type='button';b.append(H('span','rg-ic',T[k].i),H('b','',T[k].n),H('small','rg-muted',SC[k].g?'👥 جماعية داخل الحصة':T[k].d));b.onclick=()=>{W.t=k;W.h=[];W.rows=[[]];teacherWizard()};g.append(b)});box.append(g)
 }
 if(W.s===1){
  box.append(H('h3','','حدد الشعبة'));const sel=H('select','rg-select');sel.innerHTML='<option value="ALL">🌐 كل الشعب</option>'+classes.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');sel.value=W.target;sel.onchange=()=>W.target=sel.value;box.append(sel)
 }
 if(W.s===2){
  box.append(H('h3','','اسم الدرس'));const i=H('input','rg-input');i.placeholder='مثال: حالات المادة';i.value=W.lesson;i.oninput=()=>W.lesson=i.value;box.append(i)
 }
 if(W.s===3&&spec){
  box.append(H('h3','','أضف الأسئلة'));
  (spec.h||[]).forEach((l,i)=>{const x=H('input','rg-input');x.placeholder=l;x.value=W.h[i]||'';x.oninput=()=>W.h[i]=x.value;box.append(x)});
  W.rows.forEach((r,ri)=>{const row=H('div','rg-row');spec.f.forEach((l,i)=>{const x=H('input','rg-input');x.placeholder=l;x.value=r[i]||'';x.oninput=()=>r[i]=x.value;row.append(x)});row.append(B('🗑','btn danger',()=>{W.rows.splice(ri,1);if(!W.rows.length)W.rows=[[]];teacherWizard()}));box.append(row)});
  const sub=normalizeSubjectForSamples(teacherSubjectCode);
  box.append(B('➕ إضافة سؤال','btn secondary',()=>{W.rows.push([]);teacherWizard()}),B('📚 تعبئة بأسئلة جاهزة: '+subjectLabel(sub),'btn secondary',()=>{const lines=mk(W.t,sub).split('\n').map(l=>l.split('|'));W.h=spec.h?lines.shift():[];W.rows=lines;teacherWizard()}))
 }
 if(W.s===4){
  const a=H('input','rg-input');a.type='number';a.min='1';a.max='100';a.value=W.scoreUnit;a.oninput=()=>W.scoreUnit=Math.max(1,Math.min(100,Number(a.value||10)));
  const b=H('select','rg-select');b.innerHTML='<option value="0">محاولات غير محدودة</option><option value="1">محاولة واحدة</option><option value="2">محاولتان</option><option value="3">3 محاولات</option>';b.value=String(W.maxAttempts);b.onchange=()=>W.maxAttempts=Number(b.value);
  const c=H('input','rg-input');c.type='number';c.step='0.5';c.min='0';c.max='5';c.value=W.reward;c.oninput=()=>W.reward=Math.max(0,Math.min(5,Number(c.value||0)));
  const lab=document.createElement('label');lab.style.display='flex';lab.style.gap='8px';lab.style.alignItems='center';const ck=document.createElement('input');ck.type='checkbox';ck.checked=W.visible;ck.onchange=()=>W.visible=ck.checked;lab.append(ck,H('span','','إظهار اللعبة للطلاب بعد النشر'));
  box.append(H('h3','','درجة اللعبة'),H('div','rg-muted','هذه درجة داخل اللعبة وليست رصيد الطالب العام.'),a,H('h3','','عدد المحاولات'),b,H('h3','','نقاط التحفيز في رصيد الطالب'),H('div','rg-muted','تُضاف مرة واحدة فقط عند إنهاء اللعبة.'),c,lab)
 }
 if(W.s===5){
  const n=W.rows.filter(r=>r[0]&&r[1]).length;
  box.innerHTML=`<h3>مراجعة ونشر</h3><p>🎮 ${esc(templateLabel(W.t))}</p><p>📚 ${esc(subjectLabel(teacherSubjectCode))} • ${W.target==='ALL'?'كل الشعب':esc(W.target)} • ${esc(W.lesson)}</p><p>📝 ${n} سؤال • معامل الدرجة ${W.scoreUnit} • ⭐ ${W.reward} نقطة تحفيزية</p><p>${W.maxAttempts?W.maxAttempts+' محاولة/محاولات':'محاولات غير محدودة'} • ${W.visible?'ظاهرة للطلاب':'مخفية'}</p>`;
  box.append(B('🚀 نشر اللعبة','btn primary',async()=>{const rows=W.rows.filter(r=>r[0]&&r[1]);const title=T[W.t].i+' '+T[W.t].n+' — '+W.lesson.trim();try{await rpc('portal_teacher_mt_save_game',{p_token:teacherToken,p_subject_code:teacherSubjectCode,p_game_id:null,p_template_code:W.t,p_title:title,p_lesson_name:W.lesson.trim(),p_target_class:W.target,p_payload:{h:W.h,rows},p_score_unit:W.scoreUnit,p_max_attempts:W.maxAttempts,p_reward_points:W.reward,p_is_visible:W.visible});await teacherHome()}catch(e){ge('rgWMsg').innerHTML=`<div class="msg err">${esc(e.message||'تعذر نشر اللعبة')}</div>`}}))
 }
 const valid=()=>{
  if(W.s===0&&!W.t)return 'اختر القالب';
  if(W.s===1&&!W.target)return 'اختر الشعبة';
  if(W.s===2&&!W.lesson.trim())return 'اكتب اسم الدرس';
  if(W.s===3&&(!W.rows.some(r=>r[0]&&r[1])||(spec.h&&!spec.h.every((_,i)=>String(W.h[i]||'').trim()))))return 'أكمل بيانات اللعبة وأضف سؤالاً واحدًا على الأقل';
  return '';
 };
 if(W.s>0)nav.append(B('▶ السابق','btn secondary',()=>{W.s--;teacherWizard()}));
 if(W.s<5)nav.append(B('التالي ◀','btn primary',()=>{const e=valid();if(e){ge('rgWMsg').innerHTML=`<div class="msg err">${esc(e)}</div>`;return}W.s++;teacherWizard()}))
}
async function studentHome(){
 const root=ge('s-games');if(!root)return;
 root.innerHTML='<div class="rg-head"><h2>🎮 ألعابي التعليمية</h2></div><div id="rgStudentList" class="rg-card">جاري التحميل...</div>';
 try{RG.studentGames=await apiStudentGames();renderStudentList()}catch(e){ge('rgStudentList').innerHTML=`<div class="msg err">${esc(e.message||'تعذر تحميل الألعاب. شغّل ملف SQL أولًا.')}</div>`}
}
function renderStudentList(){
 const host=ge('rgStudentList');if(!host)return;if(!RG.studentGames.length){host.innerHTML='<div class="rg-muted">لا توجد ألعاب منشورة لك في هذه المادة حاليًا.</div>';return}
 host.innerHTML=RG.studentGames.map(g=>{const left=Number(g.max_attempts||0)?Number(g.max_attempts)-Number(g.attempts_count||0):999;const group=!!SC[g.template_code]?.g;return `<div class="rg-card">
  <div><span class="rg-badge">${esc(templateLabel(g.template_code))}</span><span class="rg-badge">📘 ${esc(g.lesson_name||'')}</span></div><h3>${esc(g.title)}</h3>
  <div class="rg-muted">محاولاتك: ${Number(g.attempts_count||0)}${Number(g.max_attempts||0)?' من '+Number(g.max_attempts):''} • أفضل نتيجة: ${Number(g.best_score||0)} • ⭐ مكافأة الإكمال: ${Number(g.reward_points||0)}</div>
  ${group?'<div class="rg-muted">👥 لعبة جماعية تُلعب في الحصة بإشراف المعلم.</div>':left<=0?'<div class="msg err">استنفدت محاولاتك.</div>':`<button class="btn primary" data-rg-play="${g.id}">العب ▶</button>`}
 </div>`}).join('');
 host.querySelectorAll('[data-rg-play]').forEach(b=>b.onclick=()=>{const g=RG.studentGames.find(x=>Number(x.id)===Number(b.dataset.rgPlay));if(g)launchGame(g,studentHome,false)})
}
function launchGame(g,back,preview){
 clr();cur=g.template_code;sc=0;RG.activeGame=g;
 const root=preview?ge('t-games'):ge('s-games');if(!root)return;
 const rows=toRowsText(g).split('\n').map(l=>l.split('|').map(x=>x.trim())).filter(r=>r[0]);
 let saved=false;
 const save=async()=>{
  if(saved||preview||SC[g.template_code]?.g)return;saved=true;
  try{
   const r=await rpc('portal_student_mt_save_game_result',{p_token:studentToken,p_subject_code:studentSubjectCode,p_game_id:Number(g.id),p_score:Number(sc)*Number(g.score_unit||1),p_completed:true});
   const x=r?.[0];if(x){
    if(typeof quizPoints!=='undefined'&&x.new_quiz_points!=null)quizPoints=Number(x.new_quiz_points||0);
    if(ge('studentPoints')&&x.total_points!=null)ge('studentPoints').textContent=typeof fmtPoints==='function'?fmtPoints(x.total_points):String(x.total_points);
    const m=H('div','rg-ok-t',`✅ تم حفظ النتيجة: ${Number(sc)*Number(g.score_unit||1)}${Number(x.awarded_points||0)>0?' • ⭐ +'+Number(x.awarded_points)+' نقطة في رصيدك':''}`);
    root.append(m);
   }
  }catch(e){saved=false;root.append(H('div','msg err',e.message||'تعذر حفظ النتيجة'))}
 };
 onEnd=save;
 root.innerHTML='';const bar=H('div','rg-toolbar');scoreHost=H('span','rg-score');bar.append(B('→ رجوع','btn secondary',()=>{onEnd=()=>{};clr();back()}),B('🔄 من جديد','btn secondary',()=>launchGame(g,back,preview)));
 if(!preview&&!SC[g.template_code]?.g)bar.append(B('💾 إنهاء وحفظ النتيجة الحالية','btn primary',save));bar.append(scoreHost);
 const st=H('div','rg-stage');root.append(bar,H('h2','',g.title),preview?H('div','rg-muted','👁 معاينة — لا تحفظ نتيجة'):H('div','rg-muted','⭐ مكافأة الإكمال تضاف مرة واحدة فقط'),st);
 try{T[g.template_code].run(rows,st)}catch(e){st.innerHTML=`<div class="msg err">${esc(e.message||'تعذر تشغيل اللعبة')}</div>`}
}
function init(){
 addStyles();
 addSection('teacherNav','teacherView','t-games','🎮 الألعاب',teacherHome);
 addSection('studentNav','studentView','s-games','🎮 الألعاب',studentHome);
 document.addEventListener('click',e=>{
  if(e.target?.id==='teacherSwitchSubject')setTimeout(()=>{if(ge('t-games')?.classList.contains('active'))teacherHome()},900);
  if(e.target?.id==='studentSwitchSubject')setTimeout(()=>{if(ge('s-games')?.classList.contains('active'))studentHome()},900);
 },true);
}
let tries=0;const ready=setInterval(()=>{tries++;if(ge('teacherNav')&&ge('studentNav')){clearInterval(ready);init()}else if(tries>80)clearInterval(ready)},100);
})();
