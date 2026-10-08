const SUPABASE_URL='https://axcfgpfcdrwnsryihulg.supabase.co';
const SUPABASE_KEY='sb_publishable_1BXmnOOKxAHxVvdMRi8QEw_pBlwX60T';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const classes=['9/1','9/2','9/3','9/4','9/5','9/6','9/7'];
let loginMode='student',studentToken=null,teacherToken=null,currentStudent=null,allStudents=[],topics=[],studentLearningTopics=[],quizPoints=0;
const $=id=>document.getElementById(id); const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

// ===== Security hardening =====
// The Supabase publishable key below is intentionally public. Never place a service_role/secret key in this file.
const SEC={studentMaxAge:12*60*60*1000,teacherMaxAge:8*60*60*1000,maxLoginAttempts:5,loginCooldownMs:60*1000,maxImageBytes:20*1024*1024,maxImagePixels:50_000_000,maxPdfBytes:6*1024*1024,maxText:10000,maxUrl:2048,rpcTimeoutMs:25000};
const safeEnc=v=>encodeURIComponent(String(v??'')).replace(/'/g,'%27');
function safeWebUrl(raw){
  const s=String(raw??'').trim(); if(!s||s.length>SEC.maxUrl||/[\u0000-\u001F\u007F]/.test(s))return '';
  try{const u=new URL(s,location.href);if(u.username||u.password)return '';if(u.protocol!=='https:' && !(u.protocol==='http:'&&(location.hostname==='localhost'||location.hostname==='127.0.0.1')))return '';return u.href}catch(_e){return ''}
}
function dataUrlByteLength(s){const i=String(s||'').indexOf(',');if(i<0)return Infinity;const b64=String(s).slice(i+1).replace(/\s/g,'');return Math.floor(b64.length*3/4)}
function safeImageData(raw){const s=String(raw??'');return /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(s)&&dataUrlByteLength(s)<=4*1024*1024?s:''}
function safePdfData(raw){const s=String(raw??'');return /^data:application\/pdf;base64,[a-z0-9+/=\s]+$/i.test(s)&&dataUrlByteLength(s)<=SEC.maxPdfBytes?s:''}
function safeAttachment(raw){return safeImageData(raw)||safeWebUrl(raw)}
function safeContentUrl(raw){return safePdfData(raw)||safeWebUrl(raw)}
function safeOpen(raw){const u=safeWebUrl(raw)||safePdfData(raw);if(!u)return false;const w=window.open(u,'_blank','noopener,noreferrer');if(w)try{w.opener=null}catch(_e){}return !!w}
function safeExternalLink(raw,label='فتح الرابط'){const u=safeWebUrl(raw);return u?`<a class="link" target="_blank" rel="noopener noreferrer" href="${esc(u)}">${esc(label)}</a>`:''}
function renderSafeAttachment(raw,label='فتح المرفق'){const img=safeImageData(raw);if(img)return `<img class="media-img" src="${img}" alt="مرفق">`;const u=safeWebUrl(raw);return u?`<a class="link" target="_blank" rel="noopener noreferrer" href="${esc(u)}">${esc(label)}</a>`:''}
function sessionSave(kind,token){const now=String(Date.now());if(kind==='teacher'){sessionStorage.setItem('chemTeacherToken',token);sessionStorage.setItem('chemTeacherTokenAt',now);localStorage.removeItem('chemTeacherToken');localStorage.removeItem('chemTeacherTokenAt')}else{localStorage.setItem('chemStudentToken',token);localStorage.setItem('chemStudentTokenAt',now)}}
function sessionRead(kind){const store=kind==='teacher'?sessionStorage:localStorage,key=kind==='teacher'?'chemTeacherToken':'chemStudentToken',ageKey=key+'At',maxAge=kind==='teacher'?SEC.teacherMaxAge:SEC.studentMaxAge;const tok=store.getItem(key),at=Number(store.getItem(ageKey)||0);if(!tok||!at||Date.now()-at>maxAge){store.removeItem(key);store.removeItem(ageKey);return null}return tok}
function sessionClear(){['chemStudentToken','chemStudentTokenAt','chemTeacherToken','chemTeacherTokenAt'].forEach(k=>localStorage.removeItem(k));['chemTeacherToken','chemTeacherTokenAt'].forEach(k=>sessionStorage.removeItem(k))}
try{localStorage.removeItem('chemTeacherToken');localStorage.removeItem('chemTeacherTokenAt')}catch(_e){} // migrate old builds: teacher sessions are no longer persistent
function loginGuardKey(){return 'chemLoginGuard_'+loginMode}
function loginGuard(){try{const x=JSON.parse(localStorage.getItem(loginGuardKey())||'{}');if(x.until&&Date.now()<x.until)return Math.ceil((x.until-Date.now())/1000)}catch(_e){}return 0}
function loginFailed(){try{const k=loginGuardKey(),x=JSON.parse(localStorage.getItem(k)||'{}'),n=(Number(x.n)||0)+1;if(n>=SEC.maxLoginAttempts)localStorage.setItem(k,JSON.stringify({n:0,until:Date.now()+SEC.loginCooldownMs}));else localStorage.setItem(k,JSON.stringify({n}))}catch(_e){}}
function loginSucceeded(){try{localStorage.removeItem(loginGuardKey())}catch(_e){}}
function secureLogout(note=''){studentToken=teacherToken=null;sessionClear();show('loginView');$('topSub').textContent='9/1 - 9/7';if(note)msg('loginMsg',note,false)}
function validTeacherUrlField(id,label){const v=$(id)?.value.trim()||'';if(!v)return '';const u=safeWebUrl(v);if(!u)throw new Error(`${label}: استخدم رابط HTTPS صحيح فقط.`);return u}
async function isRealPdf(file){if(!file||file.size<5)return false;const head=new Uint8Array(await file.slice(0,5).arrayBuffer());return String.fromCharCode(...head)==='%PDF-'}
async function isRealImage(file){if(!file||file.size<12)return false;const b=new Uint8Array(await file.slice(0,16).arrayBuffer());const png=b[0]===0x89&&b[1]===0x50&&b[2]===0x4e&&b[3]===0x47;const jpg=b[0]===0xff&&b[1]===0xd8&&b[2]===0xff;const gif=String.fromCharCode(...b.slice(0,6))==='GIF87a'||String.fromCharCode(...b.slice(0,6))==='GIF89a';const webp=String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP';return png||jpg||gif||webp}
function applyInputSecurity(){document.querySelectorAll('input[type="text"],input:not([type]),textarea').forEach(el=>{if(!el.maxLength||el.maxLength<0)el.maxLength=SEC.maxText});document.querySelectorAll('input[type="password"]').forEach(el=>{el.maxLength=200;el.autocomplete=el.id==='loginPass'?'current-password':'new-password'});document.querySelectorAll('input[type="url"]').forEach(el=>el.maxLength=SEC.maxUrl);const u=$('loginUser');if(u){u.maxLength=80;u.autocomplete='username'}window.name='';try{if(location.hash&&/token|session|password/i.test(location.hash))history.replaceState(null,'',location.pathname+location.search)}catch(_e){}}
// ===== End security hardening =====
const fixStudentName=n=>String(n??'').replace(/(^|\s)عبدا(?=\s|$)/g,'$1عبدالله').replace(/(^|\s)طلل(?=\s|$)/g,'$1طلال').replace(/(^|\s)هلل(?=\s|$)/g,'$1هلال').replace(/(^|\s)غلم(?=\s|$)/g,'$1غلام');
const studentName=n=>esc(fixStudentName(n));
const fmtPoints=n=>{const x=Number(n||0);return Number.isInteger(x)?String(x):x.toFixed(1)};
async function loadStudentQuizPoints(){try{const d=await rpc('portal_student_quiz_points',{p_token:studentToken});const x=d?.[0];quizPoints=Number(x?.quiz_points||0);if($('studentPoints'))$('studentPoints').textContent=fmtPoints(x?.total_points??((Number(currentStudent?.points||0))+quizPoints));}catch(_e){quizPoints=0;if($('studentPoints'))$('studentPoints').textContent=fmtPoints(currentStudent?.points||0)}}
function msg(id,t,ok=true){$(id).innerHTML=`<div class="msg ${ok?'ok':'err'}">${esc(t)}</div>`}
function show(view){['loginView','studentView','teacherView'].forEach(x=>$(x).classList.add('hide'));$(view).classList.remove('hide');$('logoutBtn').classList.toggle('hide',view==='loginView')}
function nav(root){root.querySelectorAll('button[data-sec]').forEach(b=>b.onclick=()=>{root.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.section').forEach(x=>x.classList.remove('active'));$(b.dataset.sec).classList.add('active')})}
nav($('studentNav'));nav($('teacherNav'));
const lessonsNavBtn=$('studentNav')?.querySelector('[data-sec="s-lessons"]');
if(lessonsNavBtn)lessonsNavBtn.addEventListener('click',()=>{if(!studentToken)return;loadMyLessons().catch(e=>{$('lessonList').innerHTML=`<div class="msg err">تعذر تحميل دروسك: ${esc(e.message||'خطأ غير معروف')}</div>`})});
classes.forEach(c=>{['annClass','contentClass','studentFilter','expClass','bankClass','studyClass','engClass'].forEach(id=>$(id).insertAdjacentHTML('beforeend',`<option value="${c}">${c}</option>`));['gradeClass','pointsClass'].forEach(id=>$(id).insertAdjacentHTML('beforeend',`<option value="${c}">${c}</option>`))});
$('pointsClass')&&$('pointsClass').insertAdjacentHTML('afterbegin','<option value="ALL">🌐 كل الشعب</option>');
document.querySelectorAll('[data-login]').forEach(b=>b.onclick=()=>{loginMode=b.dataset.login;document.querySelectorAll('[data-login]').forEach(x=>x.classList.toggle('active',x===b));$('teacherHint').style.display=loginMode==='teacher'?'block':'none';$('loginUser').placeholder=loginMode==='teacher'?'teacher':'مثال: 91001'});
async function rpc(fn,args={}){if(!/^portal_[a-z0-9_]{1,80}$/i.test(String(fn)))throw new Error('RPC غير مسموح');const req=sb.rpc(fn,args);let timer;try{const result=await Promise.race([req,new Promise((_,rej)=>{timer=setTimeout(()=>rej(new Error('انتهت مهلة الاتصال. حاول مرة أخرى.')),SEC.rpcTimeoutMs)})]);const {data,error}=result;if(error)throw error;return data}finally{clearTimeout(timer)}}
$('loginBtn').onclick=async()=>{try{const wait=loginGuard();if(wait)throw new Error(`محاولات كثيرة. انتظر ${wait} ثانية ثم حاول مرة أخرى.`);$('loginBtn').disabled=true;$('loginMsg').innerHTML='';const username=$('loginUser').value.trim(),password=$('loginPass').value;if(!username||!password)throw new Error('اكتب اسم المستخدم وكلمة المرور.');if(username.length>80||password.length>200)throw new Error('بيانات الدخول غير صالحة.');if(loginMode==='student'){const d=await rpc('portal_student_login',{p_username:username,p_password:password});if(!d?.length)throw new Error('بيانات الدخول غير صحيحة');studentToken=d[0].token;currentStudent=d[0];sessionSave('student',studentToken);loginSucceeded();await enterStudent(d[0])}else{const d=await rpc('portal_teacher_login',{p_username:username,p_password:password});if(!d?.length)throw new Error('بيانات الدخول غير صحيحة');teacherToken=d[0].token;sessionSave('teacher',teacherToken);loginSucceeded();if(d[0].must_change_password)await forceTeacherPasswordChange();await enterTeacher()}}catch(e){if(!String(e.message||'').startsWith('محاولات كثيرة')&&!String(e.message||'').startsWith('اكتب اسم'))loginFailed();const wait=loginGuard();msg('loginMsg',wait?`محاولات كثيرة. انتظر ${wait} ثانية ثم حاول مرة أخرى.`:(e.message==='بيانات الدخول غير صحيحة'?e.message:'تعذر تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.'),false)}finally{$('loginBtn').disabled=false}};
$('logoutBtn').onclick=()=>secureLogout();
async function enterStudent(s){currentStudent=s;quizPoints=0;show('studentView');$('topSub').textContent=`${fixStudentName(s.full_name)} — ${s.class_name}`;$('studentWelcome').textContent=`مرحبًا، ${fixStudentName(s.full_name)} 👋`;$('studentMeta').textContent=`الشعبة ${s.class_name} • اسم المستخدم ${s.username}`;$('studentPoints').textContent=fmtPoints(s.points??0);if(s.must_change_password) await forcePasswordChange();await loadStudentLearningTopics();await Promise.all([loadStudentProgress(),loadStudentAnnouncements(),loadStudentContent(),loadGrades(),loadQuestions(),loadStudentExperiments(),loadStudentBank(),loadMyLessons(),loadStudentQuizPoints()])}
async function forcePasswordChange(){return new Promise(resolve=>{const root=$('popupRoot');root.innerHTML=`<div class="popup"><div class="card"><h2>🔒 تغيير كلمة المرور</h2><p>هذه أول مرة تدخل فيها. غيّر كلمة المرور المؤقتة قبل متابعة استخدام البوابة.</p><div class="field"><input id="np1" type="password" placeholder="كلمة المرور الجديدة"></div><div class="field"><input id="np2" type="password" placeholder="تأكيد كلمة المرور"></div><div id="pm"></div><button id="saveNp" class="btn primary">حفظ والدخول</button></div></div>`;$('saveNp').onclick=async()=>{if($('np1').value.length<6||$('np1').value!==$('np2').value){msg('pm','تأكد من تطابق كلمتي المرور وأنها 6 أحرف على الأقل',false);return}const ok=await rpc('portal_student_change_password',{p_token:studentToken,p_new_password:$('np1').value});if(ok){root.innerHTML='';resolve()}else msg('pm','تعذر تغيير كلمة المرور',false)}})}
async function forceTeacherPasswordChange(){return new Promise(resolve=>{const root=$('popupRoot');root.innerHTML=`<div class="popup"><div class="card"><h2>🔐 تأمين حساب المعلم</h2><p>هذه أول مرة تدخل فيها بهذه النسخة. غيّر كلمة المرور الافتراضية قبل متابعة لوحة التحكم.</p><div class="field"><input id="tnp1" type="password" placeholder="كلمة المرور الجديدة - 8 أحرف على الأقل"></div><div class="field"><input id="tnp2" type="password" placeholder="تأكيد كلمة المرور"></div><div id="tpm"></div><button id="saveTnp" class="btn primary">حفظ والدخول</button></div></div>`;$('saveTnp').onclick=async()=>{if($('tnp1').value.length<8||$('tnp1').value!==$('tnp2').value){msg('tpm','تأكد من تطابق كلمتي المرور وأنها 8 أحرف على الأقل',false);return}const ok=await rpc('portal_teacher_change_password',{p_token:teacherToken,p_new_password:$('tnp1').value});if(ok){root.innerHTML='';resolve()}else msg('tpm','تعذر تغيير كلمة المرور',false)}})}
async function loadStudentProgress(){const d=await rpc('portal_student_progress',{p_token:studentToken});const p=d?.[0];if(p?.topic_title){$('progressTitle').textContent=p.topic_title;$('progressMeta').textContent=`${p.section_code} • صفحة ${p.page_no??'-'} • آخر تحديث ${new Date(p.updated_at).toLocaleString('ar')}${p.note?' • '+p.note:''}`}else{$('progressTitle').textContent='لم يتم تحديد الدرس بعد';$('progressMeta').textContent=''}}
function renderItems(list,el){$(el).innerHTML=list?.length?list.map(x=>{const link=safeContentUrl(x.link_url||'');const open=link?(safePdfData(link)?`<button class="btn secondary" data-action="open-study-file" data-v1="${safeEnc(link)}" data-v2="${safeEnc(x.title||'ملف PDF')}">📄 فتح ملف PDF</button>`:safeExternalLink(link,'فتح الرابط/الملف')):'';const sol=safeWebUrl(x.solution_url||'');return `<div class="item"><span class="badge">${esc(x.kind||'')}</span><h3>${esc(x.title)}</h3>${x.body?`<p>${esc(x.body)}</p>`:''}${open}${sol?`<br>${safeExternalLink(sol,'عرض الحل')}`:''}${x.due_at?`<div class="muted">موعد التسليم: ${new Date(x.due_at).toLocaleString('ar')}</div>`:''}</div>`}).join(''):'<div class="muted">لا يوجد محتوى حاليًا.</div>'}
async function loadStudentContent(){const kinds=[['homework','homeworkList'],['test','testList']];for(const [k,id] of kinds)renderItems(await rpc('portal_student_content',{p_token:studentToken,p_kind:k}),id);const f=[...(await rpc('portal_student_content',{p_token:studentToken,p_kind:'file'})),...(await rpc('portal_student_content',{p_token:studentToken,p_kind:'question_solution'}))].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));renderItems(f,'fileList')}
async function loadStudentAnnouncements(){const d=await rpc('portal_student_announcements',{p_token:studentToken});$('annList').innerHTML=d?.length?d.map(a=>`<div class="item"><h3>${esc(a.title)}</h3><p>${esc(a.body)}</p><div class="muted">${new Date(a.created_at).toLocaleString('ar')}</div></div>`).join(''):'<div class="muted">لا توجد إعلانات.</div>';const p=d?.find(a=>a.is_popup&&!a.is_read);if(p){$('popupRoot').innerHTML=`<div class="popup"><div class="card"><h2>📢 ${esc(p.title)}</h2><p>${esc(p.body)}</p><button id="popRead" class="btn primary">تم الاطلاع</button></div></div>`;$('popRead').onclick=async()=>{await rpc('portal_student_mark_announcement_read',{p_token:studentToken,p_announcement_id:p.id});$('popupRoot').innerHTML=''}}}
async function loadGrades(){const d=await rpc('portal_student_grades',{p_token:studentToken});$('gradeList').innerHTML=d?.length?d.map(g=>`<div class="item"><h3>${esc(g.assessment_title)}</h3><b>${g.score} / ${g.max_score}</b>${g.note?`<p>${esc(g.note)}</p>`:''}</div>`).join(''):'<div class="muted">لا توجد درجات مسجلة.</div>'}
async function loadQuestions(){const all=await rpc('portal_student_questions',{p_token:studentToken});const d=(all||[]).filter(q=>!String(q.question_text||'').startsWith('[[BANK_ESSAY:'));$('questionList').innerHTML=d.length?d.map(q=>`<div class="item"><span class="badge">${q.status==='answered'?'تمت الإجابة':'جديد'}</span><p><b>سؤالك:</b> ${esc(q.question_text)}</p>${q.attachment_url?renderSafeAttachment(q.attachment_url,'المرفق'):''}${q.teacher_reply?`<div class="msg ok"><b>رد المعلم:</b><br>${esc(q.teacher_reply)}</div>`:''}</div>`).join(''):'<div class="muted">لم ترسل أسئلة بعد.</div>'}

function safeMedia(src){return safeImageData(src)||safeWebUrl(src)}
async function compressImage(file,maxWidth=1500,quality=.78){
  if(!file)return null;
  if(!file.type.startsWith('image/'))throw new Error('اختر ملف صورة فقط');
  if(file.size>SEC.maxImageBytes)throw new Error('حجم الصورة كبير جدًا. الحد الأقصى 20 MB قبل الضغط.');
  if(!await isRealImage(file))throw new Error('ملف الصورة غير صالح أو نوعه غير مطابق لمحتواه.');
  const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)});
  const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('ملف الصورة غير صالح'));i.src=data});
  if(!img.width||!img.height||img.width*img.height>SEC.maxImagePixels)throw new Error('أبعاد الصورة كبيرة جدًا. اختر صورة أصغر.');
  const scale=Math.min(1,maxWidth/img.width);const w=Math.max(1,Math.round(img.width*scale));const h=Math.max(1,Math.round(img.height*scale));
  const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,w,h);
  const out=c.toDataURL('image/jpeg',quality);
  if(out.length>2800000)throw new Error('الصورة كبيرة جدًا حتى بعد الضغط. اختر صورة أصغر.');
  return out;
}
async function prepareStudyFile(file){
  if(!file)return {data:null,name:null,mime:null};
  if(file.type.startsWith('image/')){const data=await compressImage(file,1600,.78);return {data,name:file.name||'image.jpg',mime:'image/jpeg'}}
  if(file.type==='application/pdf'){
    if(file.size>SEC.maxPdfBytes)throw new Error('ملف PDF أكبر من 6 MB. قسّمه إلى ملف أصغر أو اضغطه أولًا.');
    if(!await isRealPdf(file))throw new Error('الملف لا يبدو PDF صالحًا.');
    const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)});
    return {data,name:file.name||'document.pdf',mime:'application/pdf'};
  }
  throw new Error('ارفع صورة أو ملف PDF فقط');
}
function materialAttachment(m){
  if(!m.attachment_data)return '';
  if((m.attachment_mime||'').startsWith('image/')){const img=safeImageData(m.attachment_data);return img?`<img class="media-img" src="${img}" alt="${esc(m.attachment_name||m.title)}">`:''}
  if(!safePdfData(m.attachment_data))return '';
  return `<button class="btn secondary" data-action="open-study-file" data-v1="${safeEnc(m.attachment_data)}" data-v2="${safeEnc(m.title)}">📄 فتح ${esc(m.attachment_name||'الملف')}</button>`;
}
window.openStudyFile=async(dataEnc,titleEnc)=>{
  const raw=decodeURIComponent(dataEnc),title=decodeURIComponent(titleEnc);
  const pdf=safePdfData(raw),img=safeImageData(raw),data=pdf||img;
  if(!data)return;
  const isPdf=!!pdf;
  if(!isPdf){
    $('popupRoot').innerHTML=`<div class="popup"><div class="iframe-wrap"><div class="iframe-bar"><b style="flex:1">🖼️ ${esc(title)}</b><button id="closeStudyFile" class="btn danger">إغلاق</button></div><div style="overflow:auto;padding:12px;text-align:center"><img src="${data}" style="max-width:100%;height:auto"></div></div></div>`;
    $('closeStudyFile').onclick=()=>$('popupRoot').innerHTML='';return;
  }
  let viewUrl='';
  try{
    const b64=data.split(',')[1]||'',bin=atob(b64),bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    viewUrl=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
    $('popupRoot').innerHTML=`<div class="popup"><div class="iframe-wrap"><div class="iframe-bar"><b style="flex:1">📄 ${esc(title)}</b><span id="pdfPageCount" class="muted">جاري تجهيز الصفحات...</span><button id="openStudyExternal" class="btn secondary">فتح الملف الأصلي</button><button id="closeStudyFile" class="btn danger">إغلاق</button></div><div id="pdfPages" style="flex:1;overflow:auto;-webkit-overflow-scrolling:touch;background:#dfe7ea;padding:10px"></div></div></div>`;
    $('openStudyExternal').onclick=()=>{const w=window.open(viewUrl,'_blank','noopener,noreferrer');if(w)try{w.opener=null}catch(_e){}};
    let closed=false, pageUrls=[];
    $('closeStudyFile').onclick=()=>{closed=true;pageUrls.forEach(u=>URL.revokeObjectURL(u));if(viewUrl)URL.revokeObjectURL(viewUrl);$('popupRoot').innerHTML=''};
    async function ensurePdfJs(){
      if(window.pdfjsLib)return window.pdfjsLib;
      const sources=[
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js'
      ];
      for(const src of sources){try{await new Promise((ok,bad)=>{const sc=document.createElement('script');sc.src=src;sc.onload=ok;sc.onerror=bad;document.head.appendChild(sc)});if(window.pdfjsLib)return window.pdfjsLib}catch(_e){}}
      throw new Error('تعذر تحميل عارض PDF. تأكد من اتصال الإنترنت.');
    }
    const pdfjs=await ensurePdfJs();
    // تعطيل العامل يمنع مشاكل Safari/iPad مع ملفات data/blob الكبيرة.
    const pdf=await pdfjs.getDocument({data:bytes,disableWorker:true,isEvalSupported:false}).promise;
    $('pdfPageCount').textContent=`${pdf.numPages} صفحة — مرّر للأسفل`;
    const host=$('pdfPages');
    const cssW=Math.min(1050,Math.max(300,host.clientWidth-20));
    for(let n=1;n<=pdf.numPages;n++){
      if(closed)break;
      const page=await pdf.getPage(n),base=page.getViewport({scale:1});
      const displayScale=cssW/base.width;
      // دقة 2.2x تجعل العربي واضحاً على Retina بدون استهلاك ذاكرة ضخم.
      const quality=Math.min(2.2,Math.max(1.7,window.devicePixelRatio||1));
      const renderViewport=page.getViewport({scale:displayScale*quality});
      const canvas=document.createElement('canvas');
      canvas.width=Math.ceil(renderViewport.width);canvas.height=Math.ceil(renderViewport.height);
      const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
      await page.render({canvasContext:ctx,viewport:renderViewport,intent:'display'}).promise;
      const blob=await new Promise(res=>canvas.toBlob(res,'image/jpeg',0.94));
      if(!blob)throw new Error(`تعذر تجهيز الصفحة ${n}`);
      const u=URL.createObjectURL(blob);pageUrls.push(u);
      const wrap=document.createElement('section');wrap.style='margin:0 auto 14px;max-width:1050px;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px #0002';
      const label=document.createElement('div');label.textContent=`صفحة ${n} من ${pdf.numPages}`;label.style='padding:7px 10px;text-align:center;color:#456;font-size:13px;border-bottom:1px solid #e5e7eb;background:#f8fafc';
      const img=document.createElement('img');img.src=u;img.alt=`صفحة ${n}`;img.style='display:block;width:100%;height:auto;background:white';
      wrap.append(label,img);host.appendChild(wrap);
      // تحرير ذاكرة Canvas فوراً مهم جداً للآيباد.
      canvas.width=1;canvas.height=1;page.cleanup();
      $('pdfPageCount').textContent=`${pdf.numPages} صفحة — تم تجهيز ${n}/${pdf.numPages}`;
      await new Promise(r=>setTimeout(r,0));
    }
    if(!closed)$('pdfPageCount').textContent=`${pdf.numPages} صفحة — مرّر للأسفل`;
  }catch(e){
    if(viewUrl)URL.revokeObjectURL(viewUrl);
    $('popupRoot').innerHTML=`<div class="popup"><div class="card" style="max-width:620px"><div class="msg err">تعذر عرض ملف PDF: ${esc(e.message||'خطأ غير معروف')}</div><button id="openPdfFallback" class="btn secondary">فتح الملف الأصلي</button><button id="closeStudyFile" class="btn danger">إغلاق</button></div></div>`;
    $('openPdfFallback').onclick=()=>{if(safePdfData(data)){const w=window.open(data,'_blank','noopener,noreferrer');if(w)try{w.opener=null}catch(_e){}}};$('closeStudyFile').onclick=()=>$('popupRoot').innerHTML='';
  }
};

function showImagePreview(inputId,imgId){$(inputId).onchange=async()=>{const f=$(inputId).files?.[0];if(!f){$(imgId).style.display='none';return}try{const d=await compressImage(f,700,.7);$(imgId).src=d;$(imgId).style.display='block'}catch(e){alert(e.message);$(inputId).value=''}}}
showImagePreview('bankQuestionImage','bankQuestionPreview');showImagePreview('bankSolutionImage','bankSolutionPreview');

async function loadStudentLearningTopics(){
  studentLearningTopics=await rpc('portal_student_learning_topics',{p_token:studentToken});
  const units=[...new Map(studentLearningTopics.map(t=>[t.unit_no,t.unit_title])).entries()];
  $('studentStudyUnit').innerHTML='<option value="">اختر الوحدة</option>'+units.map(([n,title])=>`<option value="${n}">الوحدة ${n} — ${esc(title)}</option>`).join('');
  $('studentStudyTopic').innerHTML='<option value="">اختر الدرس</option>';
  $('studentLessonMaterials').innerHTML='<div class="lesson-empty">اختر درسًا لعرض الملخص والأسئلة.</div>';
}
$('studentStudyUnit').onchange=()=>{const u=Number($('studentStudyUnit').value);const arr=studentLearningTopics.filter(t=>t.unit_no===u);$('studentStudyTopic').innerHTML='<option value="">اختر الدرس</option>'+arr.map(t=>`<option value="${t.id}">${esc(t.title)}${t.page_no?' — ص '+t.page_no:''}${t.has_summary?' • ملخص':''}${t.has_questions?' • أسئلة':''}</option>`).join('');$('studentLessonMaterials').innerHTML='<div class="lesson-empty">اختر درسًا لعرض محتواه.</div>'};
$('studentStudyTopic').onchange=async()=>{const id=Number($('studentStudyTopic').value);if(!id){$('studentLessonMaterials').innerHTML='<div class="lesson-empty">اختر درسًا لعرض محتواه.</div>';return}await loadStudentLessonMaterials(id)};
async function loadStudentLessonMaterials(topicId){
  $('studentLessonMaterials').innerHTML='<div class="lesson-empty">جاري تحميل محتوى الدرس...</div>';
  const d=await rpc('portal_student_lesson_materials',{p_token:studentToken,p_topic_id:topicId});
  if(!d?.length){$('studentLessonMaterials').innerHTML='<div class="lesson-empty">لا يوجد محتوى متاح لهذا الدرس حاليًا.</div>';return}
  const summaries=d.filter(x=>x.material_type==='summary'),questions=d.filter(x=>x.material_type==='questions');
  const render=(arr,type,label)=>arr.length?`<h3>${label}</h3>`+arr.map(m=>`<div class="material-card ${type}"><span class="badge">${type==='summary'?'ملخص':'أسئلة'}</span><h3>${esc(m.title)}</h3>${m.note?`<p>${esc(m.note)}</p>`:''}${materialAttachment(m)}</div>`).join(''):'';
  $('studentLessonMaterials').innerHTML=render(summaries,'summary','📖 ملخص الدرس')+render(questions,'questions','📝 أسئلة الدرس');
}


async function loadMyLessons(){
  const d=await rpc('portal_student_my_lessons',{p_token:studentToken});
  if(!d?.length){$('lessonList').innerHTML='<div class="lesson-empty-pro">لم يحدد المعلم مسار الدروس لهذه الشعبة بعد.</div>';return}
  const current=d.find(x=>x.is_current)||d[0], total=d.length;
  const allCount=studentLearningTopics?.length||topics?.length||total, pct=Math.max(1,Math.min(100,Math.round((total/allCount)*100)));
  const hero=`<div class="lessons-hero"><div class="lessons-kicker">📍 الدرس الحالي لشعبتك</div><div class="lessons-current-title">${esc(current.title)}</div><div class="lessons-current-meta">${esc(current.unit_title)} ${current.page_no?'• صفحة '+current.page_no:''}</div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><div class="lessons-current-meta">تقدمك في مسار الفصل: ${pct}%</div><div class="lessons-metrics"><span class="metric-pill">📚 ${total} درس متاح</span><span class="metric-pill">📖 ${d.filter(x=>x.has_summary).length} ملخص</span><span class="metric-pill">📝 ${d.filter(x=>x.has_questions).length} مجموعة أسئلة</span><span class="metric-pill">🧪 ${d.filter(x=>x.has_experiment).length} تجربة</span></div></div>`;
  const cards=d.map(x=>`<div class="lesson-card-pro ${x.is_current?'current':''}"><div class="lesson-head"><div><span class="badge">${x.is_current?'🟢 الدرس الحالي':'✅ درس سابق'}</span><h3 class="lesson-title-pro">${esc(x.title)}</h3><div class="muted">${esc(x.unit_title)} ${x.page_no?'• ص '+x.page_no:''} ${x.opened_before?'• فتحته '+x.open_count+' مرة':''}</div></div><span class="quick-stat">${x.section_code?esc(x.section_code):''}</span></div><div class="lesson-tools">${x.has_summary?'<span class="tool-chip">📖 ملخص</span>':''}${x.has_questions?'<span class="tool-chip">📝 أسئلة</span>':''}${x.has_experiment?'<span class="tool-chip">🧪 تجربة 3D</span>':''}${!x.has_summary&&!x.has_questions&&!x.has_experiment?'<span class="tool-chip">المحتوى قيد التجهيز</span>':''}</div>${x.objectives||x.requirements||x.teacher_note?`<div class="lesson-detail-grid">${x.objectives?`<div class="lesson-detail"><b>🎯 أهداف الدرس</b>${esc(x.objectives).replace(/\n/g,'<br>')}</div>`:''}${x.requirements?`<div class="lesson-detail"><b>📝 المطلوب</b>${esc(x.requirements).replace(/\n/g,'<br>')}</div>`:''}${x.teacher_note?`<div class="lesson-detail"><b>📚 توجيه المعلم</b>${esc(x.teacher_note).replace(/\n/g,'<br>')}</div>`:''}</div>`:''}<div class="lesson-actions"><button class="btn primary" data-action="open-lesson" data-id="${x.topic_id}" data-v1="${x.unit_no}">📖 الملخص والأسئلة</button>${x.has_experiment&&safeWebUrl(x.experiment_url)?`<button class="btn secondary" data-action="open-experiment" data-id="${x.topic_id}" data-v1="${safeEnc(safeWebUrl(x.experiment_url))}" data-v2="${safeEnc(x.title)}">🧪 تجربة الدرس</button>`:''}</div></div>`).join('');
  $('lessonList').innerHTML=hero+`<div class="lesson-timeline">${cards}</div>`;
}
window.openLessonFromMyLessons=async(topicId,unitNo)=>{
  try{await rpc('portal_student_open_my_lesson',{p_token:studentToken,p_topic_id:topicId})}catch(e){}
  document.querySelectorAll('#studentView .section').forEach(x=>x.classList.remove('active'));$('s-study').classList.add('active');
  document.querySelectorAll('#studentNav button').forEach(x=>x.classList.toggle('active',x.dataset.sec==='s-study'));
  $('studentStudyUnit').value=String(unitNo);$('studentStudyUnit').onchange();$('studentStudyTopic').value=String(topicId);await loadStudentLessonMaterials(topicId);
  $('s-study').scrollIntoView({behavior:'smooth',block:'start'});
};

async function loadLessonPlanEditor(){
  if(!$('planClass')||!$('planTopic'))return;
  const cls=$('planClass').value,topicId=Number($('planTopic').value);if(!cls||!topicId)return;
  const readClass=cls==='ALL'?classes[0]:cls;
  const d=await rpc('portal_teacher_lesson_plan',{p_token:teacherToken,p_class:readClass,p_topic_id:topicId});const x=d?.[0]||{};
  $('planObjectives').value=x.objectives||'';$('planRequirements').value=x.requirements||'';$('planNote').value=x.teacher_note||'';$('planExpTitle').value=x.experiment_title||'';$('planExpUrl').value=x.experiment_url||'';
}
async function initLessonPlanEditor(){
  if(!$('planClass'))return;
  $('planClass').innerHTML='<option value="ALL">🌐 كل الشعب (9/1 - 9/7)</option>'+classes.map(c=>`<option>${c}</option>`).join('');
  $('planTopic').innerHTML=topics.map(t=>`<option value="${t.id}">${esc(t.section_code)} — ${esc(t.title)}${t.page_no?' (ص '+t.page_no+')':''}</option>`).join('');
  await loadLessonPlanEditor();
}
$('planClass')&&($('planClass').onchange=loadLessonPlanEditor);$('planTopic')&&($('planTopic').onchange=loadLessonPlanEditor);
$('planSaveBtn')&&($('planSaveBtn').onclick=async()=>{try{
  $('planSaveBtn').disabled=true;
  const selected=$('planClass').value,targets=selected==='ALL'?[...classes]:[selected],topicId=Number($('planTopic').value);
  const planUrl=$('planExpUrl').value.trim()?validTeacherUrlField('planExpUrl','رابط التجربة'):'';
  const payload={p_topic_id:topicId,p_objectives:$('planObjectives').value,p_teacher_note:$('planNote').value,p_requirements:$('planRequirements').value,p_experiment_title:$('planExpTitle').value,p_experiment_url:planUrl};
  const failed=[];
  for(const cls of targets){
    const ok=await rpc('portal_teacher_save_lesson_plan',{p_token:teacherToken,p_class:cls,...payload});
    if(!ok){failed.push(cls);continue}
    const check=await rpc('portal_teacher_lesson_plan',{p_token:teacherToken,p_class:cls,p_topic_id:topicId});
    if(!check?.length)failed.push(cls);
  }
  if(failed.length)throw new Error('لم يتم الحفظ لهذه الشعب: '+failed.join('، '));
  msg('planMsg',targets.length>1?'تم حفظ بطاقة الدرس فعليًا للشعب السبع ✅':'تم حفظ بطاقة الدرس بنجاح ✅');
  if(selected!=='ALL')await loadLessonPlanEditor();
}catch(e){msg('planMsg',e.message,false)}finally{$('planSaveBtn').disabled=false}});
$('planStatsBtn')&&($('planStatsBtn').onclick=async()=>{const topicId=Number($('planTopic').value),cls=$('planClass').value;$('planStats').innerHTML='<div class="muted">جاري تحميل الإحصائية...</div>';const [v,n]=await Promise.all([rpc('portal_teacher_lesson_visits',{p_token:teacherToken,p_topic_id:topicId,p_class:cls}),rpc('portal_teacher_lesson_nonvisitors',{p_token:teacherToken,p_topic_id:topicId,p_class:cls})]);const total=(v?.length||0)+(n?.length||0),pct=total?Math.round((v.length/total)*100):0;$('planStats').innerHTML=`<div class="visit-summary"><div class="visit-box"><b>${v?.length||0}</b><br>دخلوا</div><div class="visit-box"><b>${n?.length||0}</b><br>لم يدخلوا</div><div class="visit-box"><b>${pct}%</b><br>نسبة الدخول</div></div><h3>✅ دخلوا الدرس</h3>${v?.length?`<div style="overflow:auto"><table class="eng-table"><thead><tr><th>الطالب</th><th>آخر دخول</th><th>مرات الفتح</th></tr></thead><tbody>${v.map(x=>`<tr><td>${studentName(x.full_name)}</td><td>${new Date(x.last_opened_at).toLocaleString('ar')}</td><td>${x.open_count}</td></tr>`).join('')}</tbody></table></div>`:'<div class="muted">لم يدخل أحد بعد.</div>'}<h3>⏳ لم يدخلوا بعد</h3>${n?.length?`<div class="grid">${n.map(x=>`<div class="item"><b>${studentName(x.full_name)}</b><div class="muted">${esc(x.username)}</div></div>`).join('')}</div>`:'<div class="msg ok">كل الطلاب دخلوا الدرس ✅</div>'}`});

async function loadStudentExperiments(){
  const d=await rpc('portal_student_experiments',{p_token:studentToken});
  $('labList').innerHTML=d?.length?d.map(e=>{const u=safeWebUrl(e.experiment_url);return `<div class="item"><span class="badge">3D</span><h3>${esc(e.title)}</h3>${e.description?`<p>${esc(e.description)}</p>`:''}<div class="inline-actions">${u?`<button class="btn primary" data-action="open-experiment" data-id="${e.id}" data-v1="${safeEnc(u)}" data-v2="${safeEnc(e.title)}">▶️ بدء التجربة</button>`:'<span class="msg err">رابط التجربة غير صالح.</span>'}</div></div>`}).join(''):'<div class="muted">لا توجد تجارب متاحة لك حاليًا.</div>';
}
window.openExperiment=(id,urlEnc,titleEnc)=>{const url=safeWebUrl(decodeURIComponent(urlEnc)),title=decodeURIComponent(titleEnc);if(!url){alert('رابط التجربة غير صالح.');return}$('popupRoot').innerHTML=`<div class="popup"><div class="iframe-wrap"><div class="iframe-bar"><b style="flex:1">🧪 ${esc(title)}</b><span class="badge">وضع آمن</span><button id="restartExp" class="btn secondary">↻ إعادة من البداية</button><button id="closeExp" class="btn danger">إغلاق</button></div><iframe id="expFrame" referrerpolicy="no-referrer" sandbox="allow-scripts allow-forms allow-pointer-lock" src="${esc(url)}" allow="fullscreen" allowfullscreen></iframe></div></div>`;$('closeExp').onclick=()=>$('popupRoot').innerHTML='';$('restartExp').onclick=()=>{$('expFrame').src='about:blank';setTimeout(()=>$('expFrame').src=url,80)}};


const BANK_ESSAY_PREFIX='[[BANK_ESSAY:';
const bankDraft={options:['','','',''],correct:0,tf:true,pairs:[['',''],['',''],['','']]};
function bankTypeLabel(t){return t==='mcq'?'اختيار من متعدد':t==='tf'?'صح أو خطأ':t==='matching'?'توصيل':t==='essay'?'مقالي':'سؤال قديم'}
function bankLetter(i){return ['أ','ب','ج','د','هـ','و','ز','ح'][i]||String(i+1)}
function resetBankDraft(){bankDraft.options=['','','',''];bankDraft.correct=0;bankDraft.tf=true;bankDraft.pairs=[['',''],['',''],['','']]}
function captureBankEditor(){
  const t=$('bankQuestionType')?.value;
  if(t==='mcq'){
    bankDraft.options=bankDraft.options.map((_,i)=>$('bankOpt'+i)?.value||'');
    const sel=document.querySelector('input[name="bankCorrect"]:checked');if(sel)bankDraft.correct=Number(sel.value);
  }else if(t==='tf'){
    const sel=document.querySelector('input[name="bankTF"]:checked');if(sel)bankDraft.tf=sel.value==='true';
  }else if(t==='matching'){
    bankDraft.pairs=bankDraft.pairs.map((_,i)=>[$('bankPairL'+i)?.value||'',$('bankPairR'+i)?.value||'']);
  }
}
function bankTypeEditor(){
  const t=$('bankQuestionType')?.value||'mcq',h=$('bankTypeEditor');if(!h)return;
  if(t==='mcq'){
    h.innerHTML=`<b>🔘 الخيارات</b><p class="muted">اكتب خيارين على الأقل وحدد الإجابة الصحيحة.</p>`+bankDraft.options.map((v,i)=>`<div class="qb-option-row"><input type="radio" name="bankCorrect" value="${i}" ${bankDraft.correct===i?'checked':''} aria-label="الإجابة الصحيحة"><input type="text" id="bankOpt${i}" value="${esc(v)}" placeholder="الخيار ${bankLetter(i)}"><span class="qb-letter">${bankLetter(i)}</span>${bankDraft.options.length>2?`<button type="button" class="btn danger" data-action="remove-bank-option" data-id="${i}">حذف</button>`:''}</div>`).join('')+`${bankDraft.options.length<8?'<button type="button" class="btn secondary" data-action="add-bank-option">+ إضافة خيار</button>':''}`;
  }else if(t==='tf'){
    h.innerHTML=`<b>✅ الإجابة الصحيحة</b><div class="inline-actions"><label class="qb-choice"><input type="radio" name="bankTF" value="true" ${bankDraft.tf?'checked':''}> صح</label><label class="qb-choice"><input type="radio" name="bankTF" value="false" ${!bankDraft.tf?'checked':''}> خطأ</label></div>`;
  }else if(t==='matching'){
    h.innerHTML=`<b>🔗 أزواج التوصيل</b><p class="muted">اكتب كل عنصر وما يقابله. سيظهر ترتيب الجهة الثانية للطالب بشكل مختلف.</p>`+bankDraft.pairs.map((p,i)=>`<div class="qb-match-row"><span class="qb-letter">${i+1}</span><input id="bankPairL${i}" value="${esc(p[0])}" placeholder="العنصر"><input id="bankPairR${i}" value="${esc(p[1])}" placeholder="ما يقابله">${bankDraft.pairs.length>2?`<button type="button" class="btn danger" data-action="remove-bank-pair" data-id="${i}">حذف</button>`:''}</div>`).join('')+`${bankDraft.pairs.length<8?'<button type="button" class="btn secondary" data-action="add-bank-pair">+ إضافة زوج</button>':''}`;
  }else{
    h.innerHTML=`<b>✍️ سؤال مقالي</b><p class="muted">الطالب يكتب إجابته ويرسلها. ستظهر لك أسفل هذه الصفحة لتصححها يدويًا.</p>`;
  }
}
window.addBankOption=()=>{captureBankEditor();if(bankDraft.options.length<8)bankDraft.options.push('');bankTypeEditor()};
window.removeBankOption=i=>{captureBankEditor();if(bankDraft.options.length<=2)return;bankDraft.options.splice(i,1);if(bankDraft.correct===i)bankDraft.correct=0;else if(bankDraft.correct>i)bankDraft.correct--;bankTypeEditor()};
window.addBankPair=()=>{captureBankEditor();if(bankDraft.pairs.length<8)bankDraft.pairs.push(['','']);bankTypeEditor()};
window.removeBankPair=i=>{captureBankEditor();if(bankDraft.pairs.length<=2)return;bankDraft.pairs.splice(i,1);bankTypeEditor()};
$('bankQuestionType')&&($('bankQuestionType').onchange=()=>{captureBankEditor();bankTypeEditor()});
bankTypeEditor();

function buildBankMeta(){
  captureBankEditor();const type=$('bankQuestionType').value,points=Math.max(.5,Number($('bankPoints').value||1)),lessonName=($('bankLessonName')?.value||'').trim();
  if(type==='mcq'){
    const kept=bankDraft.options.map((text,idx)=>({text:text.trim(),idx})).filter(x=>x.text);
    if(kept.length<2)throw new Error('أضف خيارين على الأقل.');
    const correct=kept.findIndex(x=>x.idx===bankDraft.correct);if(correct<0)throw new Error('حدد إجابة صحيحة من الخيارات المكتوبة.');
    return {v:4,type,points,lessonName,answer:{options:kept.map(x=>x.text),correct}};
  }
  if(type==='tf')return {v:4,type,points,lessonName,answer:{correct:!!bankDraft.tf}};
  if(type==='matching'){
    const pairs=bankDraft.pairs.map(p=>[p[0].trim(),p[1].trim()]).filter(p=>p[0]&&p[1]);
    if(pairs.length<2)throw new Error('أضف زوجين على الأقل في سؤال التوصيل.');
    return {v:4,type,points,lessonName,answer:{pairs}};
  }
  return {v:4,type:'essay',points,lessonName,answer:{}};
}
function packBankSolution(text,meta){return '__QB4__'+btoa(unescape(encodeURIComponent(JSON.stringify(meta))))+'__'+(text||'')}
function unpackBank(q){
  const raw=q?.solution_text||'';
  for(const prefix of ['__QB4__','__QB3__','__QB2__']){
    if(raw.startsWith(prefix)){
      const i=raw.indexOf('__',prefix.length);if(i<0)break;
      try{return {meta:JSON.parse(decodeURIComponent(escape(atob(raw.slice(prefix.length,i))))),solution:raw.slice(i+2)}}catch(_e){}
    }
  }
  return {meta:{type:'legacy',points:1},solution:raw};
}
function shuffled(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function bankStoreKey(id){return `chem-bank-${currentStudent?.username||'student'}-${id}`}
function getBankAttempt(id){try{return JSON.parse(localStorage.getItem(bankStoreKey(id))||'null')}catch(e){return null}}
function saveBankAttempt(id,x){try{localStorage.setItem(bankStoreKey(id),JSON.stringify(x))}catch(e){}}
function parseEssaySubmission(text){
  const m=String(text||'').match(/^\[\[BANK_ESSAY:(\d+)\]\]\nعنوان السؤال: ([^\n]*)\nالإجابة:\n([\s\S]*)$/);if(!m)return null;
  return {questionId:Number(m[1]),title:m[2],answer:m[3]};
}
function answerKeyHtml(q,meta,solution){
  let ans='';
  if(meta.type==='mcq')ans=meta.answer.options?.[Number(meta.answer.correct)]||'';
  else if(meta.type==='tf')ans=meta.answer.correct?'صح':'خطأ';
  else if(meta.type==='matching')ans=(meta.answer.pairs||[]).map(p=>`${p[0]} ← ${p[1]}`).join(' • ');
  else if(meta.type==='essay')ans=solution||'لا يوجد نموذج إجابة نصي.';
  return `<div class="qb-answer-key"><b>✅ ${meta.type==='essay'?'نموذج الإجابة':'الإجابة الصحيحة'}:</b> ${esc(ans)}${solution&&meta.type!=='essay'?`<div style="margin-top:7px">💡 ${esc(solution)}</div>`:''}${q.solution_image&&safeMedia(q.solution_image)?`<img class="media-img" src="${safeMedia(q.solution_image)}" alt="صورة الحل">`:''}</div>`;
}
function renderStudentInteractive(q,essayMap){
  const {meta,solution}=unpackBank(q),id=q.id;
  if(meta.type==='legacy')return q.show_solution?`<div class="qb-answer-key"><b>✅ الحل</b>${solution?`<p>${esc(solution)}</p>`:''}${q.solution_image&&safeMedia(q.solution_image)?`<img class="media-img" src="${safeMedia(q.solution_image)}" alt="صورة الحل">`:''}</div>`:'<div class="muted">هذا سؤال قديم للعرض فقط.</div>';
  if(meta.type==='essay'){
    const sub=essayMap?.get(id);
    if(sub){const parsed=parseEssaySubmission(sub.question_text);return `<div class="qb-student-answer"><div class="qb-pending">📨 تم إرسال إجابتك للمعلم.</div>${parsed?.answer?`<div class="qb-essay-answer"><b>إجابتك:</b><br>${esc(parsed.answer)}</div>`:''}${sub.teacher_reply?`<div class="msg ok"><b>تصحيح المعلم:</b><br>${esc(sub.teacher_reply)}</div>`:'<div class="muted">بانتظار تصحيح المعلم.</div>'}${q.show_solution?answerKeyHtml(q,meta,solution):''}</div>`}
    return `<div class="qb-student-answer"><textarea id="essay-${id}" rows="5" placeholder="اكتب إجابتك هنا..."></textarea><button id="submit-bank-${id}" class="btn primary" data-action="submit-bank-answer" data-id="${id}">📨 إرسال للمعلم</button><div id="qa-result-${id}" class="qb-result"></div></div>`;
  }
  let controls='';
  if(meta.type==='mcq')controls=(meta.answer.options||[]).map((x,i)=>`<label class="qb-choice"><input type="radio" name="qa${id}" value="${i}"> <b>${bankLetter(i)}.</b> ${esc(x)}</label>`).join('');
  if(meta.type==='tf')controls=`<label class="qb-choice"><input type="radio" name="qa${id}" value="true"> صح</label><label class="qb-choice"><input type="radio" name="qa${id}" value="false"> خطأ</label>`;
  if(meta.type==='matching'){
    const rights=shuffled((meta.answer.pairs||[]).map(p=>p[1]));
    controls=(meta.answer.pairs||[]).map((p,i)=>`<div class="qb-match-student"><b>${esc(p[0])}</b><select id="match-${id}-${i}"><option value="">اختر ما يناسب</option>${rights.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select></div>`).join('');
  }
  const prev=getBankAttempt(id);let prevHtml='';
  if(prev){prevHtml=`<div class="${prev.correct?'qb-correct':'qb-wrong'}">${prev.correct?'✅ آخر إجابة صحيحة':'❌ آخر إجابة غير صحيحة'} — ${prev.score}/${meta.points??1}</div>${q.show_solution?answerKeyHtml(q,meta,solution):''}`}
  return `<div class="qb-student-answer">${controls}<div class="qb-toolbar"><button id="submit-bank-${id}" class="btn primary" data-action="submit-bank-answer" data-id="${id}">تحقق من الإجابة</button><span class="muted">الدرجة: ${meta.points??1}</span></div><div id="qa-result-${id}" class="qb-result">${prevHtml}</div></div>`;
}
window.__bankQuestions={};
window.submitBankAnswer=async id=>{
  const q=window.__bankQuestions[id],parsed=unpackBank(q),meta=parsed.meta,solution=parsed.solution,out=$('qa-result-'+id);if(!q||!out)return;
  if(meta.type==='essay'){
    const answer=($('essay-'+id)?.value||'').trim();if(!answer){out.innerHTML='<div class="qb-wrong">اكتب إجابتك أولًا.</div>';return}
    try{
      const btn=$('submit-bank-'+id);if(btn)btn.disabled=true;out.innerHTML='<div class="muted">جاري إرسال الإجابة...</div>';
      const text=`${BANK_ESSAY_PREFIX}${id}]]\nعنوان السؤال: ${q.title||''}\nالإجابة:\n${answer}`;
      const sent=await rpc('portal_student_ask',{p_token:studentToken,p_question:text,p_attachment_url:null});if(!sent)throw new Error('تعذر إرسال الإجابة');
      out.innerHTML=`<div class="qb-pending">📨 تم إرسال إجابتك للمعلم لتصحيحها.</div>${q.show_solution?answerKeyHtml(q,meta,solution):''}`;
      await loadStudentBank();
    }catch(e){out.innerHTML=`<div class="qb-wrong">${esc(e.message||'تعذر الإرسال')}</div>`;const btn=$('submit-bank-'+id);if(btn)btn.disabled=false}
    return;
  }
  let answer=null;
  if(meta.type==='mcq'){
    const x=document.querySelector(`input[name="qa${id}"]:checked`);if(!x){out.innerHTML='<div class="qb-wrong">اختر إجابة أولًا.</div>';return}answer=Number(x.value);
  }else if(meta.type==='tf'){
    const x=document.querySelector(`input[name="qa${id}"]:checked`);if(!x){out.innerHTML='<div class="qb-wrong">اختر صح أو خطأ.</div>';return}answer=x.value==='true';
  }else if(meta.type==='matching'){
    answer=(meta.answer.pairs||[]).map((_,i)=>$('match-'+id+'-'+i)?.value||'');if(answer.some(x=>!x)){out.innerHTML='<div class="qb-wrong">أكمل جميع التوصيلات.</div>';return}
  }
  const btn=$('submit-bank-'+id);if(btn)btn.disabled=true;
  let correct=false,awarded=0,serverSaved=false;
  try{
    out.innerHTML='<div class="muted">جاري التحقق وحفظ النقاط...</div>';
    const d=await rpc('portal_student_answer_bank',{p_token:studentToken,p_question_id:id,p_answer:answer});
    const r=d?.[0];if(!r)throw new Error('لم يرجع النظام نتيجة التحقق');
    correct=!!r.is_correct;awarded=Number(r.awarded_points||0);quizPoints=Number(r.quiz_points||0);serverSaved=true;
    if($('studentPoints')&&r.total_points!=null)$('studentPoints').textContent=fmtPoints(r.total_points);
  }catch(e){
    out.innerHTML=`<div class="qb-wrong">${esc(e.message||'تعذر التحقق من الإجابة. حاول مرة أخرى.')}</div>`;
    return;
  }finally{if(btn)btn.disabled=false}
  const score=correct?Number(meta.points||1):0,old=getBankAttempt(id),attempts=(old?.attempts||0)+1;saveBankAttempt(id,{correct,score,attempts,awarded,at:Date.now()});
  const rewardMsg=correct?(serverSaved?(awarded>0?' • ⭐ +0.5 نقطة':' • ⭐ سبق احتساب نصف النقطة لهذا السؤال'):''):' • حاول مرة أخرى';
  out.innerHTML=`<div class="${correct?'qb-correct':'qb-wrong'}">${correct?'✅ إجابة صحيحة':'❌ إجابة غير صحيحة'} — الدرجة ${score}/${meta.points??1}${rewardMsg} <span class="small">(المحاولة ${attempts})</span></div>${q.show_solution?answerKeyHtml(q,meta,solution):''}`;
};

let studentBankRows=[],studentBankEssayMap=new Map();
async function loadStudentBank(){
  const [d,studentQs]=await Promise.all([rpc('portal_student_question_bank',{p_token:studentToken}),rpc('portal_student_questions',{p_token:studentToken}).catch(()=>[])]);
  studentBankRows=d||[];window.__bankQuestions={};studentBankRows.forEach(q=>window.__bankQuestions[q.id]=q);
  studentBankEssayMap=new Map();(studentQs||[]).forEach(x=>{const p=parseEssaySubmission(x.question_text);if(p&&!studentBankEssayMap.has(p.questionId))studentBankEssayMap.set(p.questionId,x)});
  const host=$('studentBankList');if(!host)return;
  host.innerHTML=studentBankRows.length?studentBankRows.map(q=>{const qi=safeMedia(q.question_image),{meta}=unpackBank(q);return `<div class="item"><div class="qb-meta">${meta.lessonName?`<span class="badge">📘 ${esc(meta.lessonName)}</span>`:''}<span class="badge">${bankTypeLabel(meta.type)}</span><span class="badge">${meta.points??1} درجة</span></div><h3>${esc(q.title)}</h3>${q.question_text?`<p>${esc(q.question_text).replace(/\n/g,'<br>')}</p>`:''}${qi?`<img class="media-img" src="${qi}" alt="صورة السؤال">`:''}${renderStudentInteractive(q,studentBankEssayMap)}</div>`}).join(''):'<div class="lesson-empty">لا توجد أسئلة متاحة لك حاليًا.</div>';
}

async function loadTeacherExperiments(){
  const d=await rpc('portal_teacher_experiments',{p_token:teacherToken});
  $('teacherExperimentList').innerHTML=d?.length?d.map(e=>{const u=safeWebUrl(e.experiment_url);return `<div class="item"><span class="badge ${e.is_visible?'state-on':'state-off'}">${e.is_visible?'ظاهر للطلاب':'مخفي'}</span> <span class="badge">${e.target_class==='ALL'?'كل الصفوف':esc(e.target_class)}</span><h3>${esc(e.title)}</h3>${e.description?`<p>${esc(e.description)}</p>`:''}<div class="inline-actions"><button class="btn ${e.is_visible?'secondary':'primary'}" data-action="toggle-experiment" data-id="${e.id}" data-bool="${!e.is_visible}">${e.is_visible?'🙈 إخفاء عن الطلاب':'👁️ إظهار للطلاب'}</button>${u?`<button class="btn secondary" data-action="open-experiment" data-id="${e.id}" data-v1="${safeEnc(u)}" data-v2="${safeEnc(e.title)}">تجربة الرابط بأمان</button>`:'<span class="badge state-off">رابط غير صالح</span>'}<button class="btn danger" data-action="delete-experiment" data-id="${e.id}">حذف</button></div></div>`}).join(''):'<div class="muted">لم تضف تجارب 3D بعد.</div>';
}
$('expAddBtn').onclick=async()=>{try{const u=validTeacherUrlField('expUrl','رابط التجربة');const id=await rpc('portal_teacher_add_experiment',{p_token:teacherToken,p_title:$('expTitle').value.trim(),p_description:$('expDesc').value,p_experiment_url:u,p_target_class:$('expClass').value,p_is_visible:$('expVisible').checked});if(!id)throw new Error('تأكد من اسم التجربة والرابط');['expTitle','expDesc','expUrl'].forEach(x=>$(x).value='');$('expVisible').checked=false;msg('expMsg','تم حفظ التجربة ✅');await loadTeacherExperiments()}catch(e){msg('expMsg',e.message,false)}};
window.toggleExperiment=async(id,v)=>{const ok=await rpc('portal_teacher_set_experiment_visibility',{p_token:teacherToken,p_experiment_id:id,p_is_visible:v});if(ok)await loadTeacherExperiments()};
window.deleteExperiment=async id=>{if(!confirm('حذف التجربة؟'))return;const ok=await rpc('portal_teacher_delete_experiment',{p_token:teacherToken,p_experiment_id:id});if(ok)await loadTeacherExperiments()};


let bankEditingId=null,bankEditingQuestionImage=null,bankEditingSolutionImage=null;
window.__teacherBankRows={};
function clearBankForm(){
  bankEditingId=null;bankEditingQuestionImage=null;bankEditingSolutionImage=null;
  ['bankLessonName','bankTitle','bankQuestionText','bankSolutionText','bankQuestionImage','bankSolutionImage'].forEach(x=>{if($(x))$(x).value=''});
  ['bankQuestionPreview','bankSolutionPreview'].forEach(x=>{if($(x)){$(x).src='';$(x).style.display='none'}});
  $('bankVisible').checked=false;$('bankShowSolution').checked=false;$('bankPoints').value='1';$('bankQuestionType').value='mcq';resetBankDraft();bankTypeEditor();
  if($('bankRemoveQuestionImage'))$('bankRemoveQuestionImage').checked=false;if($('bankRemoveSolutionImage'))$('bankRemoveSolutionImage').checked=false;
  $('bankRemoveQuestionImageWrap')?.classList.add('hide');$('bankRemoveSolutionImageWrap')?.classList.add('hide');
  $('bankEditBanner')?.classList.add('hide');$('bankCancelEditBtn')?.classList.add('hide');if($('bankAddBtn'))$('bankAddBtn').textContent='💾 حفظ السؤال';
}
window.editBankQuestion=id=>{
  const q=window.__teacherBankRows[id];if(!q)return;
  const parsed=unpackBank(q),meta=parsed.meta;if(meta.type==='legacy'){alert('هذا سؤال قديم للعرض فقط. أنشئ نسخة جديدة منه إذا أردت تحويله إلى سؤال تفاعلي.');return}
  bankEditingId=id;bankEditingQuestionImage=safeMedia(q.question_image)||null;bankEditingSolutionImage=safeMedia(q.solution_image)||null;
  $('bankLessonName').value=meta.lessonName||'';$('bankTitle').value=q.title||'';$('bankClass').value=q.target_class||'ALL';$('bankQuestionText').value=q.question_text||'';$('bankSolutionText').value=parsed.solution||'';
  $('bankVisible').checked=!!q.is_visible;$('bankShowSolution').checked=!!q.show_solution;$('bankPoints').value=meta.points??1;$('bankQuestionType').value=meta.type||'mcq';
  if(meta.type==='mcq'){bankDraft.options=[...(meta.answer?.options||[])];while(bankDraft.options.length<2)bankDraft.options.push('');bankDraft.correct=Number(meta.answer?.correct||0)}
  else if(meta.type==='tf'){bankDraft.tf=!!meta.answer?.correct}
  else if(meta.type==='matching'){bankDraft.pairs=(meta.answer?.pairs||[]).map(p=>[p[0]||'',p[1]||'']);while(bankDraft.pairs.length<2)bankDraft.pairs.push(['',''])}
  bankTypeEditor();
  if(bankEditingQuestionImage){$('bankQuestionPreview').src=bankEditingQuestionImage;$('bankQuestionPreview').style.display='block';$('bankRemoveQuestionImageWrap')?.classList.remove('hide')}else{$('bankQuestionPreview').src='';$('bankQuestionPreview').style.display='none';$('bankRemoveQuestionImageWrap')?.classList.add('hide')}
  if(bankEditingSolutionImage){$('bankSolutionPreview').src=bankEditingSolutionImage;$('bankSolutionPreview').style.display='block';$('bankRemoveSolutionImageWrap')?.classList.remove('hide')}else{$('bankSolutionPreview').src='';$('bankSolutionPreview').style.display='none';$('bankRemoveSolutionImageWrap')?.classList.add('hide')}
  $('bankQuestionImage').value='';$('bankSolutionImage').value='';$('bankEditBanner')?.classList.remove('hide');$('bankCancelEditBtn')?.classList.remove('hide');$('bankAddBtn').textContent='💾 حفظ التعديلات';
  document.querySelector('#t-bank .qb-builder')?.scrollIntoView({behavior:'smooth',block:'start'});
};
$('bankCancelEditBtn')&&($('bankCancelEditBtn').onclick=()=>{clearBankForm();msg('bankMsg','تم إلغاء التعديل.')});
async function loadTeacherBank(){
  const d=await rpc('portal_teacher_question_bank',{p_token:teacherToken});window.__teacherBankRows={};(d||[]).forEach(q=>window.__teacherBankRows[q.id]=q);
  $('teacherBankList').innerHTML=d?.length?d.map(q=>{const qi=safeMedia(q.question_image),si=safeMedia(q.solution_image),parsed=unpackBank(q),meta=parsed.meta;let key='';if(meta.type==='mcq')key=meta.answer?.options?.[meta.answer.correct]||'';else if(meta.type==='tf')key=meta.answer?.correct?'صح':'خطأ';else if(meta.type==='matching')key=(meta.answer?.pairs||[]).map(p=>`${p[0]} ← ${p[1]}`).join(' • ');else if(meta.type==='essay')key='تصحيح يدوي';return `<div class="item"><div class="qb-meta"><span class="badge ${q.is_visible?'state-on':'state-off'}">${q.is_visible?'ظاهر للطلاب':'مخفي'}</span><span class="badge ${q.show_solution?'state-on':'state-off'}">${q.show_solution?'إظهار الحل بعد الإجابة':'عدم إظهار الحل'}</span><span class="badge">${q.target_class==='ALL'?'كل الصفوف':esc(q.target_class)}</span>${meta.lessonName?`<span class="badge">📘 ${esc(meta.lessonName)}</span>`:''}<span class="badge">${bankTypeLabel(meta.type)}</span><span class="badge">${meta.points??1} درجة</span></div><h3>${esc(q.title)}</h3>${q.question_text?`<p>${esc(q.question_text).replace(/\n/g,'<br>')}</p>`:''}${qi?`<img class="media-img" src="${qi}" alt="السؤال">`:''}${meta.type!=='legacy'?`<div class="muted"><b>${meta.type==='essay'?'طريقة التصحيح':'الإجابة المحفوظة'}:</b> ${esc(key)}</div>`:''}${parsed.solution?`<div class="muted" style="margin-top:6px"><b>تفسير/ملاحظة:</b> ${esc(parsed.solution)}</div>`:''}${si?`<img class="media-img" src="${si}" alt="الحل">`:''}<div class="inline-actions"><button class="btn secondary" data-action="edit-bank-question" data-id="${q.id}">✏️ تعديل السؤال</button><button class="btn ${q.is_visible?'secondary':'primary'}" data-action="set-question-state" data-id="${q.id}" data-bool="${!q.is_visible}" data-bool2="${q.show_solution}">${q.is_visible?'🙈 إخفاء السؤال':'👁️ إظهار السؤال'}</button><button class="btn ${q.show_solution?'secondary':'primary'}" data-action="set-question-state" data-id="${q.id}" data-bool="${q.is_visible}" data-bool2="${!q.show_solution}">${q.show_solution?'🔒 عدم إظهار الحل بعد الإجابة':'✅ إظهار الحل بعد الإجابة'}</button><button class="btn danger" data-action="delete-bank-question" data-id="${q.id}">حذف</button></div></div>`}).join(''):'<div class="muted">لم تضف أسئلة بعد.</div>';
}
async function loadTeacherEssaySubmissions(){
  if(!$('teacherEssayList'))return;
  try{
    const all=await rpc('portal_teacher_questions',{p_token:teacherToken,p_status:null});
    const rows=(all||[]).map(q=>({q,p:parseEssaySubmission(q.question_text)})).filter(x=>x.p).sort((a,b)=>new Date(b.q.created_at)-new Date(a.q.created_at));
    $('teacherEssayList').innerHTML=rows.length?rows.map(({q,p})=>`<div class="item qb-essay-card"><div class="qb-meta"><span class="badge">${esc(q.class_name||'')}</span><span class="badge ${q.teacher_reply?'state-on':'state-off'}">${q.teacher_reply?'تم التصحيح':'بانتظار التصحيح'}</span></div><h3>${studentName(q.full_name)} — ${esc(p.title||'سؤال مقالي')}</h3><div class="muted">🕒 ${q.created_at?formatQuestionTime(q.created_at):''}</div><div class="qb-essay-answer"><b>إجابة الطالب:</b><br>${esc(p.answer)}</div><div class="field"><label>تصحيحك / الدرجة</label><textarea id="essayReply-${q.id}" rows="3" placeholder="مثال: 2/3 — الإجابة صحيحة لكن ينقصها تفسير...">${esc(q.teacher_reply||'')}</textarea></div><button class="btn primary" data-action="grade-essay-answer" data-id="${q.id}">💾 حفظ التصحيح</button></div>`).join(''):'<div class="muted">لا توجد إجابات مقالية مرسلة حتى الآن.</div>';
  }catch(e){$('teacherEssayList').innerHTML=`<div class="msg err">تعذر تحميل الإجابات المقالية: ${esc(e.message||'خطأ غير معروف')}</div>`}
}
window.gradeEssayAnswer=async id=>{const reply=($('essayReply-'+id)?.value||'').trim();if(!reply){alert('اكتب التصحيح أو الدرجة أولًا.');return}try{const ok=await rpc('portal_teacher_reply_question',{p_token:teacherToken,p_question_id:id,p_reply:reply});if(!ok)throw new Error('تعذر حفظ التصحيح');await loadTeacherEssaySubmissions();await loadOverview();alert('تم حفظ تصحيح الإجابة ✅')}catch(e){alert(e.message||'تعذر حفظ التصحيح')}};

$('bankAddBtn').onclick=async()=>{try{
  $('bankAddBtn').disabled=true;msg('bankMsg',bankEditingId?'جاري حفظ التعديلات...':'جاري تجهيز السؤال...');
  const meta=buildBankMeta(),newQiFile=$('bankQuestionImage').files?.[0],newSiFile=$('bankSolutionImage').files?.[0];
  let qi=newQiFile?await compressImage(newQiFile):bankEditingQuestionImage;
  let si=newSiFile?await compressImage(newSiFile):bankEditingSolutionImage;
  if(bankEditingId&&$('bankRemoveQuestionImage')?.checked&&!newQiFile)qi=null;if(bankEditingId&&$('bankRemoveSolutionImage')?.checked&&!newSiFile)si=null;
  const lessonName=($('bankLessonName')?.value||'').trim(),title=$('bankTitle').value.trim(),question=$('bankQuestionText').value.trim();if(!lessonName)throw new Error('اكتب اسم الدرس.');if(!title)throw new Error('اكتب عنوان السؤال.');if(!question&&!qi)throw new Error('اكتب نص السؤال أو أضف صورة للسؤال.');
  if(bankEditingId){
    const ok=await rpc('portal_teacher_update_question_bank',{p_token:teacherToken,p_question_id:bankEditingId,p_title:title,p_question_text:question,p_question_image:qi,p_solution_text:packBankSolution($('bankSolutionText').value.trim(),meta),p_solution_image:si,p_target_class:$('bankClass').value,p_is_visible:$('bankVisible').checked,p_show_solution:$('bankShowSolution').checked});
    if(!ok)throw new Error('تعذر تعديل السؤال. تأكد من تشغيل كود SQL الخاص بالتعديل.');msg('bankMsg','تم تعديل السؤال بنجاح ✅');
  }else{
    const id=await rpc('portal_teacher_add_question_bank',{p_token:teacherToken,p_title:title,p_question_text:question,p_question_image:qi,p_solution_text:packBankSolution($('bankSolutionText').value.trim(),meta),p_solution_image:si,p_target_class:$('bankClass').value,p_is_visible:$('bankVisible').checked,p_show_solution:$('bankShowSolution').checked});if(!id)throw new Error('تعذر حفظ السؤال. تأكد من البيانات وحجم الصور.');msg('bankMsg','تم حفظ السؤال بنجاح ✅');
  }
  clearBankForm();await loadTeacherBank();
}catch(e){msg('bankMsg',e.message,false)}finally{$('bankAddBtn').disabled=false}};
window.setQuestionState=async(id,v,sol)=>{const ok=await rpc('portal_teacher_set_question_state',{p_token:teacherToken,p_question_id:id,p_is_visible:v,p_show_solution:sol});if(ok)await loadTeacherBank()};
window.deleteBankQuestion=async id=>{if(!confirm('حذف السؤال؟'))return;const ok=await rpc('portal_teacher_delete_question_bank',{p_token:teacherToken,p_question_id:id});if(ok){await loadTeacherBank();await loadTeacherEssaySubmissions()}};

$('askImage').onchange=async()=>{const f=$('askImage').files?.[0];if(!f){$('askImagePreview').style.display='none';return}try{const d=await compressImage(f);$('askImagePreview').src=d;$('askImagePreview').style.display='block'}catch(e){msg('askMsg',e.message,false)}};
$('askBtn').onclick=async()=>{try{$('askBtn').disabled=true;const question=$('askText').value.trim();if(!question||question.length>4000)throw new Error('اكتب السؤال، وبحد أقصى 4000 حرف.');let attachment='';const raw=$('askUrl').value.trim();if(raw){attachment=safeWebUrl(raw);if(!attachment)throw new Error('الرابط غير صالح. استخدم رابط HTTPS فقط.')}const f=$('askImage').files?.[0];if(f){msg('askMsg','جاري تجهيز الصورة...');attachment=await compressImage(f)}const id=await rpc('portal_student_ask',{p_token:studentToken,p_question:question,p_attachment_url:attachment});if(!id)throw new Error('تعذر الإرسال');$('askText').value='';$('askUrl').value='';$('askImage').value='';$('askImagePreview').src='';$('askImagePreview').style.display='none';msg('askMsg','تم إرسال سؤالك للمعلم ✅');await loadQuestions()}catch(e){msg('askMsg',e.message||'تعذر الإرسال',false)}finally{$('askBtn').disabled=false}};
function fillStudyTopicSelects(){
  const html=topics.map(t=>`<option value="${t.id}">الوحدة ${t.unit_no} — ${esc(t.title)}${t.page_no?' (ص '+t.page_no+')':''}</option>`).join('');
  $('studyTopic').innerHTML=html;$('engTopic').innerHTML=html;
}
async function loadTeacherStudyMaterials(){
  const d=await rpc('portal_teacher_lesson_materials',{p_token:teacherToken,p_topic_id:null});
  $('teacherStudyList').innerHTML=d?.length?d.map(m=>`<div class="item"><span class="badge">${m.material_type==='summary'?'📖 ملخص':'📝 أسئلة'}</span> <span class="badge">${m.target_class==='ALL'?'كل الصفوف':esc(m.target_class)}</span> <span class="badge ${m.is_visible?'state-on':'state-off'}">${m.is_visible?'ظاهر':'مخفي'}</span><h3>${esc(m.topic_title)} — ${esc(m.title)}</h3>${m.attachment_name?`<div class="muted">📎 ${esc(m.attachment_name)}</div>`:''}<div class="material-actions"><button class="btn ${m.is_visible?'secondary':'primary'}" data-action="toggle-study-material" data-id="${m.id}" data-bool="${!m.is_visible}">${m.is_visible?'🙈 إخفاء':'👁️ إظهار للطلاب'}</button><button class="btn danger" data-action="delete-study-material" data-id="${m.id}">حذف</button></div></div>`).join(''):'<div class="muted">لم تضف ملخصات أو أسئلة بعد.</div>';
}
$('studyAddBtn').onclick=async()=>{try{$('studyAddBtn').disabled=true;msg('studyMsg','جاري تجهيز الملف...');const f=await prepareStudyFile($('studyFile').files?.[0]);const type=$('studyType').value;const topic=topics.find(t=>t.id===Number($('studyTopic').value));const typeLabels={summary:'ملخص',questions:'أسئلة',activity_solution:'حل كتاب النشاط وأوراق العمل',studentbook_solution:'حل كتاب الطالب'};const defaultTitle=`${typeLabels[type]||'محتوى'} ${topic?.title||'الدرس'}`;const id=await rpc('portal_teacher_add_lesson_material',{p_token:teacherToken,p_topic_id:Number($('studyTopic').value),p_material_type:type,p_title:$('studyTitle').value.trim()||defaultTitle,p_note:$('studyNote').value,p_attachment_data:f.data,p_attachment_name:f.name,p_attachment_mime:f.mime,p_target_class:$('studyClass').value,p_is_visible:$('studyVisible').checked});if(!id)throw new Error('تعذر حفظ المحتوى');$('studyTitle').value='';$('studyNote').value='';$('studyFile').value='';$('studyVisible').checked=false;msg('studyMsg','تم حفظ المحتوى ✅');await loadTeacherStudyMaterials()}catch(e){msg('studyMsg',e.message,false)}finally{$('studyAddBtn').disabled=false}};
window.toggleStudyMaterial=async(id,v)=>{const ok=await rpc('portal_teacher_set_lesson_material_visibility',{p_token:teacherToken,p_material_id:id,p_is_visible:v});if(ok)await loadTeacherStudyMaterials()};
window.deleteStudyMaterial=async id=>{if(!confirm('حذف هذا المحتوى؟'))return;const ok=await rpc('portal_teacher_delete_lesson_material',{p_token:teacherToken,p_material_id:id});if(ok)await loadTeacherStudyMaterials()};
$('engLoadBtn').onclick=async()=>{const topicId=Number($('engTopic').value),cls=$('engClass').value;$('engResults').innerHTML='<div class="muted">جاري تحميل الإحصائية...</div>';const [v,n]=await Promise.all([rpc('portal_teacher_lesson_visits',{p_token:teacherToken,p_topic_id:topicId,p_class:cls}),rpc('portal_teacher_lesson_nonvisitors',{p_token:teacherToken,p_topic_id:topicId,p_class:cls})]);const total=(v?.length||0)+(n?.length||0);$('engResults').innerHTML=`<div class="visit-summary"><div class="visit-box"><b>${v?.length||0}</b><br>دخلوا الدرس</div><div class="visit-box"><b>${n?.length||0}</b><br>لم يدخلوا</div><div class="visit-box"><b>${total?Math.round((v.length/total)*100):0}%</b><br>نسبة الدخول</div></div><h3>✅ الطلاب الذين دخلوا</h3>${v?.length?`<div style="overflow:auto"><table class="eng-table"><thead><tr><th>الطالب</th><th>الشعبة</th><th>أول دخول</th><th>آخر دخول</th><th>مرات الفتح</th></tr></thead><tbody>${v.map(x=>`<tr><td>${studentName(x.full_name)}</td><td>${esc(x.class_name)}</td><td>${new Date(x.first_opened_at).toLocaleString('ar')}</td><td>${new Date(x.last_opened_at).toLocaleString('ar')}</td><td>${x.open_count}</td></tr>`).join('')}</tbody></table></div>`:'<div class="muted">لم يدخل أحد بعد.</div>'}<h3>⏳ لم يدخلوا بعد</h3>${n?.length?`<div class="grid">${n.map(x=>`<div class="item"><b>${studentName(x.full_name)}</b><div class="muted">${esc(x.class_name)} • ${esc(x.username)}</div></div>`).join('')}</div>`:'<div class="msg ok">كل الطلاب المستهدفين دخلوا الدرس ✅</div>'}`};

async function searchRecoveryStudents(){
  try{
    const q=($('recoveryQuery').value||'').trim();
    if(q.length<2){msg('recoveryMsg','اكتب حرفين على الأقل من اسم الطالب أو اسم المستخدم.',false);return}
    $('recoverySearchBtn').disabled=true;msg('recoveryMsg','جاري البحث...');$('recoveryResults').innerHTML='';
    const d=await rpc('portal_teacher_find_student_account',{p_token:teacherToken,p_query:q,p_class:$('recoveryClass').value});
    if(!d?.length){msg('recoveryMsg','لم يتم العثور على طالب مطابق.',false);return}
    msg('recoveryMsg',`تم العثور على ${d.length} طالب ✅`);
    $('recoveryResults').innerHTML=d.map(x=>`<div class="item"><span class="badge">${esc(x.class_name)}</span><h3>${studentName(x.full_name)}</h3><div class="lesson-detail" style="margin:10px 0"><b>اسم المستخدم</b><div style="font-size:20px;font-weight:900;direction:ltr;text-align:right">${esc(x.username)}</div></div><div class="lesson-actions"><button class="btn secondary" data-action="copy-student-username" data-v1="${safeEnc(x.username)}">📋 نسخ اسم المستخدم</button><button class="btn primary" data-action="reset-student-password" data-id="${x.student_id}" data-v1="${safeEnc(x.full_name)}">🔑 إعادة تعيين كلمة المرور</button></div></div>`).join('');
  }catch(e){msg('recoveryMsg',e.message||'تعذر البحث',false)}finally{$('recoverySearchBtn').disabled=false}
}
window.copyStudentUsername=async u=>{try{await navigator.clipboard.writeText(u);alert('تم نسخ اسم المستخدم: '+u)}catch(e){prompt('انسخ اسم المستخدم:',u)}};
window.resetStudentPassword=async(id,nameEnc)=>{
  const name=decodeURIComponent(nameEnc);
  const custom=prompt('اكتب كلمة مرور مؤقتة جديدة للطالب '+name+' (6 أحرف/أرقام على الأقل).\nاتركها فارغة ليولد النظام رمزًا مؤقتًا تلقائيًا:','');
  if(custom===null)return;
  if(custom && custom.length<6){alert('كلمة المرور يجب أن تكون 6 أحرف/أرقام على الأقل.');return}
  if(!confirm('سيتم إلغاء جلسات الطالب الحالية وسيُطلب منه تغيير كلمة المرور بعد الدخول. متابعة؟'))return;
  try{
    const d=await rpc('portal_teacher_reset_student_password',{p_token:teacherToken,p_student_id:id,p_new_password:custom||null});
    const x=d?.[0]; if(!x?.temporary_password)throw new Error('تعذر إعادة تعيين كلمة المرور');
    const text=`اسم المستخدم: ${x.username}\nكلمة المرور المؤقتة: ${x.temporary_password}`;
    const root=$('popupRoot');root.innerHTML=`<div class="popup"><div class="card"><span class="badge">تم الاسترجاع بنجاح</span><h2>🔐 بيانات دخول ${studentName(x.full_name)}</h2><div class="lesson-detail-grid"><div class="lesson-detail"><b>اسم المستخدم</b><div style="font-size:22px;font-weight:900;direction:ltr">${esc(x.username)}</div></div><div class="lesson-detail"><b>كلمة المرور المؤقتة</b><div style="font-size:22px;font-weight:900;direction:ltr">${esc(x.temporary_password)}</div></div></div><p class="muted">سيُطلب من الطالب تغيير كلمة المرور بعد تسجيل الدخول. هذه الكلمة تظهر لك الآن لتسليمها للطالب.</p><div class="lesson-actions"><button id="copyRecoveryData" class="btn primary">📋 نسخ البيانات</button><button id="closeRecoveryPopup" class="btn secondary">إغلاق</button></div></div></div>`;
    $('copyRecoveryData').onclick=async()=>{try{await navigator.clipboard.writeText(text);alert('تم نسخ بيانات الدخول ✅')}catch(e){prompt('انسخ البيانات:',text)}};
    $('closeRecoveryPopup').onclick=()=>root.innerHTML='';
  }catch(e){alert(e.message||'تعذر إعادة التعيين')}
};
$('recoverySearchBtn')&&($('recoverySearchBtn').onclick=searchRecoveryStudents);
$('recoveryQuery')&&($('recoveryQuery').onkeydown=e=>{if(e.key==='Enter')searchRecoveryStudents()});

async function refreshBehaviorStudents(){
  const cls=$('behaviorClass').value||'9/1';
  const d=await rpc('portal_teacher_students',{p_token:teacherToken,p_class:cls});
  $('behaviorStudent').innerHTML=d.map(x=>`<option value="${x.id}">${studentName(x.full_name)}</option>`).join('');
}
async function loadBehaviorRecords(){
  try{
    const cls=$('behaviorFilterClass').value||'ALL',q=($('behaviorSearch').value||'').trim();
    const d=await rpc('portal_teacher_behavior_records',{p_token:teacherToken,p_class:cls,p_query:q||null});
    const open=(d||[]).filter(x=>!x.is_resolved).length,resolved=(d||[]).filter(x=>x.is_resolved).length;
    $('behaviorStats').innerHTML=`<div class="visit-box"><b>${d?.length||0}</b><br>إجمالي الملاحظات</div><div class="visit-box"><b>${open}</b><br>تحتاج متابعة</div><div class="visit-box"><b>${resolved}</b><br>تمت معالجتها</div>`;
    const level=x=>x==='simple'?'🟢 تنبيه بسيط':x==='note'?'🟠 ملاحظة':'🔴 مخالفة متكررة';
    $('behaviorList').innerHTML=d?.length?d.map(x=>`<div class="item"><div class="lesson-head"><div><span class="badge">${esc(x.class_name)}</span> <span class="badge">${level(x.level)}</span> ${x.is_resolved?'<span class="badge state-on">✓ تمت المعالجة</span>':'<span class="badge state-off">تحتاج متابعة</span>'}<h3>${studentName(x.full_name)}</h3><div class="muted">${new Date(x.created_at).toLocaleString('ar')}</div></div></div><p><b>الملاحظة:</b> ${esc(x.behavior_type)}</p>${x.details?`<p>${esc(x.details)}</p>`:''}<p><b>الإجراء:</b> ${esc(x.action_taken)}</p><div class="inline-actions">${!x.is_resolved?`<button class="btn primary" data-action="resolve-behavior" data-id="${x.id}">✓ تمت المعالجة</button>`:''}<button class="btn danger" data-action="delete-behavior" data-id="${x.id}">حذف</button></div></div>`).join(''):'<div class="muted">لا توجد ملاحظات سلوكية مطابقة.</div>';
  }catch(e){$('behaviorList').innerHTML=`<div class="msg err">${esc(e.message)}</div>`}
}
$('behaviorClass')&&($('behaviorClass').onchange=refreshBehaviorStudents);
$('behaviorFilterClass')&&($('behaviorFilterClass').onchange=loadBehaviorRecords);
$('behaviorSearch')&&($('behaviorSearch').oninput=()=>{clearTimeout(window.__bq);window.__bq=setTimeout(loadBehaviorRecords,250)});
$('behaviorSaveBtn')&&($('behaviorSaveBtn').onclick=async()=>{try{$('behaviorSaveBtn').disabled=true;const id=await rpc('portal_teacher_add_behavior_record',{p_token:teacherToken,p_student_id:Number($('behaviorStudent').value),p_behavior_type:$('behaviorType').value,p_level:$('behaviorLevel').value,p_details:$('behaviorDetails').value,p_action_taken:$('behaviorAction').value});if(!id)throw new Error('تعذر تسجيل الملاحظة');$('behaviorDetails').value='';msg('behaviorMsg','تم تسجيل الملاحظة السلوكية ✅');await loadBehaviorRecords()}catch(e){msg('behaviorMsg',e.message,false)}finally{$('behaviorSaveBtn').disabled=false}});
window.resolveBehavior=async id=>{const ok=await rpc('portal_teacher_resolve_behavior_record',{p_token:teacherToken,p_record_id:id});if(ok)await loadBehaviorRecords()};
window.deleteBehavior=async id=>{if(!confirm('حذف هذه الملاحظة السلوكية؟'))return;const ok=await rpc('portal_teacher_delete_behavior_record',{p_token:teacherToken,p_record_id:id});if(ok)await loadBehaviorRecords()};

async function enterTeacher(){show('teacherView');$('topSub').textContent='لوحة المعلم';if($('recoveryClass'))$('recoveryClass').innerHTML='<option value="ALL">كل الشعب</option>'+classes.map(c=>`<option value="${c}">${c}</option>`).join('');if($('behaviorClass'))$('behaviorClass').innerHTML=classes.map(c=>`<option value="${c}">${c}</option>`).join('');if($('behaviorFilterClass'))$('behaviorFilterClass').innerHTML='<option value="ALL">كل الشعب</option>'+classes.map(c=>`<option value="${c}">${c}</option>`).join('');if($('loginClass'))$('loginClass').innerHTML='<option value="ALL">كل الشعب</option>'+classes.map(c=>`<option value="${c}">${c}</option>`).join('');topics=await rpc('portal_teacher_topics',{p_token:teacherToken});fillStudyTopicSelects();await initLessonPlanEditor();await Promise.all([loadOverview(),loadProgressCards(),loadTeacherAnnouncements(),loadTeacherContent(),loadTeacherQuestions(),loadStudents('ALL'),loadTeacherExperiments(),loadTeacherBank(),loadTeacherEssaySubmissions(),loadTeacherStudyMaterials()]);await refreshStudentSelects();if($('behaviorClass')){await refreshBehaviorStudents();await loadBehaviorRecords()}}
async function loadOverview(){const d=await rpc('portal_teacher_overview',{p_token:teacherToken});const o=d?.[0]||{};$('teacherStats').innerHTML=`<div class="stat"><b>${o.total_students??0}</b>طالب</div><div class="stat"><b>${o.new_questions??0}</b>سؤال جديد</div><div class="stat"><b>${o.announcements??0}</b>إعلان</div><div class="stat"><b>${o.content_items??0}</b>محتوى منشور</div>`;if($('todaySummary'))$('todaySummary').innerHTML=`عندك اليوم <b>${o.new_questions??0}</b> سؤال جديد من الطلاب، و<b>${o.content_items??0}</b> محتوى منشور في البوابة. استخدم بطاقات تقدم الشعب تحت لتحديث آخر درس لكل شعبة، أو أرسل رسالة جماعية من تبويب الإعلانات.`}
async function loadProgressCards(){const p=await rpc('portal_teacher_progress',{p_token:teacherToken});$('progressCards').innerHTML=classes.map(c=>{const x=p.find(v=>v.class_name===c);return `<div class="class-card"><strong>${c}</strong><div class="muted" style="margin:6px 0">${x?.topic_title?esc(x.topic_title):'لم يحدد بعد'} ${x?.page_no?'— ص '+x.page_no:''}</div><select id="tp-${c.replace('/','-')}" style="width:100%;padding:9px;border-radius:10px;border:1px solid #cfe2df">${topics.map(t=>`<option value="${t.id}" ${x?.topic_id===t.id?'selected':''}>${esc(t.section_code)} — ${esc(t.title)}${t.page_no?' (ص '+t.page_no+')':''}</option>`).join('')}</select><input id="tn-${c.replace('/','-')}" value="${esc(x?.note||'')}" placeholder="ملاحظة اختيارية" style="width:100%;padding:9px;margin:7px 0;border:1px solid #cfe2df;border-radius:10px"><button class="btn primary" data-action="save-progress" data-v1="${safeEnc(c)}">حفظ التقدم</button></div>`}).join('')}
window.saveProgress=async c=>{const key=c.replace('/','-');const ok=await rpc('portal_teacher_set_progress',{p_token:teacherToken,p_class:c,p_topic_id:Number($('tp-'+key).value),p_note:$('tn-'+key).value});if(ok){await loadProgressCards();alert('تم حفظ تقدم '+c+' ✅')}};
$('annAddBtn').onclick=async()=>{try{const id=await rpc('portal_teacher_add_announcement',{p_token:teacherToken,p_title:$('annTitle').value,p_body:$('annBody').value,p_target_class:$('annClass').value,p_is_popup:$('annPopup').checked});if(!id)throw new Error('تعذر الإرسال');msg('annTeacherMsg','تم إرسال الرسالة ✅');$('annTitle').value='';$('annBody').value='';await loadTeacherAnnouncements();await loadOverview()}catch(e){msg('annTeacherMsg',e.message,false)}};
async function loadTeacherAnnouncements(){const d=await rpc('portal_teacher_announcements',{p_token:teacherToken});$('teacherAnnList').innerHTML=d?.length?d.map(a=>`<div class="item"><span class="badge">${a.target_class==='ALL'?'كل الصفوف':esc(a.target_class)}</span><h3>${esc(a.title)}</h3><p>${esc(a.body)}</p><div class="muted">شاهده ${a.read_count} طالب</div></div>`).join(''):'<div class="muted">لا توجد رسائل.</div>'}
$('contentAddBtn').onclick=async()=>{try{$('contentAddBtn').disabled=true;const due=$('contentDue').value?new Date($('contentDue').value).toISOString():null;let link='';const rawLink=$('contentLink').value.trim();if(rawLink){link=safeWebUrl(rawLink);if(!link)throw new Error('رابط الملف/السؤال غير صالح. استخدم HTTPS فقط.')}let solution='';const rawSol=$('contentSolution').value.trim();if(rawSol){solution=safeWebUrl(rawSol);if(!solution)throw new Error('رابط الحل غير صالح. استخدم HTTPS فقط.')}const pdf=$('contentPdf')?.files?.[0];if(pdf){if(pdf.type!=='application/pdf'||!await isRealPdf(pdf))throw new Error('اختر ملف PDF صالحًا فقط');if(pdf.size>SEC.maxPdfBytes)throw new Error('ملف PDF أكبر من 6 MB');msg('contentMsg','جاري تجهيز ملف PDF...');link=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(pdf)})}const id=await rpc('portal_teacher_add_content',{p_token:teacherToken,p_kind:$('contentKind').value,p_title:$('contentTitle').value.trim(),p_body:$('contentBody').value,p_link_url:link,p_solution_url:solution,p_target_class:$('contentClass').value,p_due_at:due});if(!id)throw new Error('تعذر النشر');msg('contentMsg','تم نشر المحتوى ✅');['contentTitle','contentBody','contentLink','contentSolution','contentDue','contentPdf'].forEach(x=>$(x).value='');await loadTeacherContent();await loadOverview()}catch(e){msg('contentMsg',e.message,false)}finally{$('contentAddBtn').disabled=false}};
async function loadTeacherContent(){const d=await rpc('portal_teacher_content',{p_token:teacherToken,p_kind:null});$('teacherContentList').innerHTML=d?.length?d.map(x=>`<div class="item"><span class="badge">${esc(x.kind)} • ${x.target_class==='ALL'?'كل الصفوف':esc(x.target_class)}</span><h3>${esc(x.title)}</h3>${x.body?`<p>${esc(x.body)}</p>`:''}</div>`).join(''):'<div class="muted">لا يوجد محتوى.</div>'}
let studentLoginRows=[];
function formatLoginTime(v){if(!v)return '—';try{return new Date(v).toLocaleString('ar-OM',{dateStyle:'short',timeStyle:'short'})}catch(e){return new Date(v).toLocaleString('ar')}}
function renderStudentLogins(){
  if(!$('loginTable'))return;
  const q=($('loginSearch')?.value||'').trim().toLowerCase();
  const rows=!q?studentLoginRows:studentLoginRows.filter(x=>String(x.full_name||'').toLowerCase().includes(q)||String(x.username||'').toLowerCase().includes(q));
  const entered=studentLoginRows.filter(x=>x.has_logged_in).length,total=studentLoginRows.length,notYet=total-entered;
  const totalLogins=studentLoginRows.reduce((sum,x)=>sum+Number(x.login_count||0),0);
  $('loginStats').innerHTML=`<div class="visit-box"><b>${entered}</b><br>دخلوا المنصة</div><div class="visit-box"><b>${notYet}</b><br>لم يدخلوا</div><div class="visit-box"><b>${total}</b><br>إجمالي الطلاب</div><div class="visit-box"><b>${totalLogins}</b><br>إجمالي مرات الدخول</div>`;
  $('loginTable').innerHTML=rows.length?rows.map(x=>`<tr><td>${x.has_logged_in?'<span class="badge state-on">🟢 دخل</span>':'<span class="badge state-off">⚪ لم يدخل</span>'}</td><td>${studentName(x.full_name)}</td><td>${esc(x.class_name)}</td><td>${esc(x.username)}</td><td>${x.has_logged_in?formatLoginTime(x.last_login):'—'}</td><td>${x.login_count??0}</td></tr>`).join(''):'<tr><td colspan="6" class="muted">لا توجد نتائج.</td></tr>';
}
async function loadStudentLogins(){
  if(!$('loginTable'))return;
  $('loginTable').innerHTML='<tr><td colspan="6" class="muted">جاري تحديث بيانات الدخول...</td></tr>';
  try{studentLoginRows=await rpc('portal_teacher_student_logins',{p_token:teacherToken,p_class:$('loginClass')?.value||'ALL'})||[];renderStudentLogins()}
  catch(e){$('loginTable').innerHTML=`<tr><td colspan="6"><div class="msg bad">تعذر تحميل سجل الدخول: ${esc(e.message||'خطأ غير معروف')}</div></td></tr>`}
}
$('loginLoadBtn')&&($('loginLoadBtn').onclick=loadStudentLogins);
$('loginClass')&&($('loginClass').onchange=loadStudentLogins);
$('loginSearch')&&($('loginSearch').oninput=renderStudentLogins);
const loginNavBtn=$('teacherNav')?.querySelector('[data-sec="t-logins"]');
loginNavBtn&&loginNavBtn.addEventListener('click',()=>{if(!studentLoginRows.length)loadStudentLogins()});
function renderStudentsTable(){const q=($('studentSearch')?.value||'').trim().toLowerCase();const list=!q?allStudents:allStudents.filter(s=>String(s.full_name).toLowerCase().includes(q)||String(s.username).toLowerCase().includes(q));$('studentsTable').innerHTML=list.map(s=>`<tr><td>${studentName(s.full_name)}</td><td>${esc(s.class_name)}</td><td>${esc(s.username)}</td><td>${s.points}</td><td><button class="btn secondary" data-action="edit-student-name" data-id="${s.id}" data-v1="${safeEnc(s.full_name)}">✏️ تعديل الاسم</button></td></tr>`).join('');if($('studentSearchCount'))$('studentSearchCount').textContent=`النتائج: ${list.length} طالب`;}
async function loadStudents(c='ALL'){allStudents=await rpc('portal_teacher_students',{p_token:teacherToken,p_class:c});renderStudentsTable()}
$('studentFilter').onchange=()=>loadStudents($('studentFilter').value);$('studentSearch').oninput=renderStudentsTable;
async function refreshStudentSelects(){const c=$('gradeClass').value||'9/1';const d=await rpc('portal_teacher_students',{p_token:teacherToken,p_class:c});$('gradeStudent').innerHTML=d.map(s=>`<option value="${s.id}">${studentName(s.full_name)}</option>`).join('');const pc=$('pointsClass').value||'9/1';const p=await rpc('portal_teacher_students',{p_token:teacherToken,p_class:pc});$('pointsStudent').innerHTML=p.map(s=>`<option value="${s.id}">${studentName(s.full_name)} — ${s.points} نقطة</option>`).join('');if($('pointsRanking')){const sorted=[...p].sort((a,b)=>(b.points||0)-(a.points||0));$('pointsRanking').innerHTML=sorted.length?`<div style="overflow:auto"><table><thead><tr><th>#</th><th>الطالب</th><th>الشعبة</th><th>النقاط</th></tr></thead><tbody>${sorted.map((s,i)=>`<tr><td>${i+1}</td><td>${studentName(s.full_name)}</td><td>${esc(s.class_name)}</td><td>⭐ ${s.points||0}</td></tr>`).join('')}</tbody></table></div>`:'<div class="muted">لا يوجد طلاب.</div>'}}
$('gradeClass').onchange=refreshStudentSelects;$('pointsClass').onchange=refreshStudentSelects;
$('gradeAddBtn').onclick=async()=>{try{const id=await rpc('portal_teacher_add_grade',{p_token:teacherToken,p_student_id:Number($('gradeStudent').value),p_title:$('gradeTitle').value,p_score:Number($('gradeScore').value),p_max_score:Number($('gradeMax').value),p_note:$('gradeNote').value});if(!id)throw new Error('تحقق من البيانات');msg('gradeMsg','تم حفظ الدرجة ✅');$('gradeScore').value='';$('gradeNote').value=''}catch(e){msg('gradeMsg',e.message,false)}};
function formatQuestionTime(v){if(!v)return '';try{return new Date(v).toLocaleString('ar-OM',{dateStyle:'short',timeStyle:'short'})}catch(e){return new Date(v).toLocaleString('ar')}}
async function loadTeacherQuestions(){const all=await rpc('portal_teacher_questions',{p_token:teacherToken,p_status:null});const d=(all||[]).filter(q=>!String(q.question_text||'').startsWith(BANK_ESSAY_PREFIX));$('teacherQuestionList').innerHTML=d.length?d.map(q=>`<div class="item"><span class="badge">${esc(q.class_name)} • ${q.status==='new'?'جديد':'تمت الإجابة'}</span><h3>${studentName(q.full_name)}</h3>${q.created_at?`<div class="muted" style="margin-top:-6px;margin-bottom:10px">🕒 أرسل السؤال: ${formatQuestionTime(q.created_at)}</div>`:''}<p>${esc(q.question_text)}</p>${q.attachment_url?renderSafeAttachment(q.attachment_url,'فتح المرفق'):''}<div class="field"><textarea id="reply-${q.id}" rows="3" placeholder="اكتب ردك...">${esc(q.teacher_reply||'')}</textarea></div><button class="btn primary" data-action="reply-question" data-id="${q.id}">إرسال الرد</button></div>`).join(''):'<div class="muted">لا توجد أسئلة.</div>'}
window.replyQ=async id=>{const ok=await rpc('portal_teacher_reply_question',{p_token:teacherToken,p_question_id:id,p_reply:$('reply-'+id).value});if(ok){await loadTeacherQuestions();await loadOverview()}};
async function applyPoints(delta=null){try{const d=delta===null?Number($('pointsDelta').value):delta;const p=await rpc('portal_teacher_adjust_points',{p_token:teacherToken,p_student_id:Number($('pointsStudent').value),p_delta:d});if(p===null)throw new Error('تعذر التعديل');msg('pointsMsg',(d<0?'تم خصم '+Math.abs(d)+' نقطة. ':'تمت إضافة '+d+' نقطة. ')+'الرصيد الجديد: '+p+' ⭐');await refreshStudentSelects()}catch(e){msg('pointsMsg',e.message,false)}}$('pointsBtn').onclick=()=>applyPoints();$('pointsPlusBtn')&&($('pointsPlusBtn').onclick=()=>applyPoints(1));$('pointsMinusBtn')&&($('pointsMinusBtn').onclick=()=>applyPoints(-1));
if($('newStudentClass'))$('newStudentClass').innerHTML=classes.map(c=>`<option value="${c}">${c}</option>`).join('');
$('addStudentBtn')&&($('addStudentBtn').onclick=async()=>{try{$('addStudentBtn').disabled=true;const id=await rpc('portal_teacher_add_student',{p_token:teacherToken,p_full_name:$('newStudentName').value.trim(),p_class:$('newStudentClass').value,p_username:$('newStudentUsername').value.trim(),p_password:$('newStudentPassword').value});if(!id)throw new Error('تعذر إضافة الطالب');msg('studentAdminMsg','تمت إضافة الطالب بنجاح ✅');['newStudentName','newStudentUsername','newStudentPassword'].forEach(x=>$(x).value='');await loadStudents($('studentFilter').value||'ALL');await refreshStudentSelects()}catch(e){msg('studentAdminMsg',e.message,false)}finally{$('addStudentBtn').disabled=false}});
window.editStudentName=async(id,nameEnc)=>{const old=decodeURIComponent(nameEnc),name=prompt('اكتب الاسم الصحيح للطالب:',old);if(name===null||!name.trim()||name.trim()===old)return;try{const ok=await rpc('portal_teacher_update_student_name',{p_token:teacherToken,p_student_id:id,p_full_name:name.trim()});if(!ok)throw new Error('تعذر تعديل الاسم');await loadStudents($('studentFilter').value||'ALL');await refreshStudentSelects();alert('تم تعديل اسم الطالب ✅')}catch(e){alert(e.message)}};
$('teacherPassBtn').onclick=async()=>{const ok=await rpc('portal_teacher_change_password',{p_token:teacherToken,p_new_password:$('teacherNewPass').value});if(ok){msg('teacherPassMsg','تم تغيير كلمة المرور ✅');$('teacherNewPass').value=''}else msg('teacherPassMsg','يجب أن تكون 8 أحرف على الأقل',false)};

// CSP-safe delegated actions for dynamically rendered buttons.
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b)return;
  const id=Number(b.dataset.id||0),v1=b.dataset.v1||'',v2=b.dataset.v2||'';
  const bool=v=>String(v)==='true';
  switch(b.dataset.action){
    case 'open-study-file': return window.openStudyFile(v1,v2);
    case 'open-lesson': return window.openLessonFromMyLessons(id,Number(v1));
    case 'open-experiment': return window.openExperiment(id,v1,v2);
    case 'remove-bank-option': return window.removeBankOption(id);
    case 'add-bank-option': return window.addBankOption();
    case 'remove-bank-pair': return window.removeBankPair(id);
    case 'add-bank-pair': return window.addBankPair();
    case 'submit-bank-answer': return window.submitBankAnswer(id);
    case 'toggle-experiment': return window.toggleExperiment(id,bool(b.dataset.bool));
    case 'delete-experiment': return window.deleteExperiment(id);
    case 'edit-bank-question': return window.editBankQuestion(id);
    case 'set-question-state': return window.setQuestionState(id,bool(b.dataset.bool),bool(b.dataset.bool2));
    case 'delete-bank-question': return window.deleteBankQuestion(id);
    case 'grade-essay-answer': return window.gradeEssayAnswer(id);
    case 'toggle-study-material': return window.toggleStudyMaterial(id,bool(b.dataset.bool));
    case 'delete-study-material': return window.deleteStudyMaterial(id);
    case 'copy-student-username': return window.copyStudentUsername(v1);
    case 'reset-student-password': return window.resetStudentPassword(id,v1);
    case 'resolve-behavior': return window.resolveBehavior(id);
    case 'delete-behavior': return window.deleteBehavior(id);
    case 'save-progress': return window.saveProgress(decodeURIComponent(v1));
    case 'edit-student-name': return window.editStudentName(id,v1);
    case 'reply-question': return window.replyQ(id);
  }
});
applyInputSecurity();

(async()=>{const st=sessionRead('student'),tt=sessionRead('teacher');try{if(st){const d=await rpc('portal_student_me',{p_token:st});if(d?.length){studentToken=st;currentStudent=d[0];await enterStudent(d[0]);return}else sessionClear()}if(tt){teacherToken=tt;const me=await rpc('portal_teacher_me',{p_token:tt});if(me?.length){if(me[0].must_change_password)await forceTeacherPasswordChange();await enterTeacher();return}else sessionClear()}}catch(e){sessionClear()}show('loginView')})();
setInterval(()=>{if(teacherToken&&!sessionRead('teacher'))secureLogout('انتهت جلسة المعلم لأسباب أمنية. سجّل الدخول من جديد.');else if(studentToken&&!sessionRead('student'))secureLogout('انتهت الجلسة. سجّل الدخول من جديد.')},60000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){if(teacherToken&&!sessionRead('teacher'))secureLogout('انتهت جلسة المعلم لأسباب أمنية. سجّل الدخول من جديد.');else if(studentToken&&!sessionRead('student'))secureLogout('انتهت الجلسة. سجّل الدخول من جديد.')}});
