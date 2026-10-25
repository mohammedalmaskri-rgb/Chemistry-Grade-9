const SUPABASE_URL='https://axcfgpfcdrwnsryihulg.supabase.co';
const SUPABASE_KEY='sb_publishable_1BXmnOOKxAHxVvdMRi8QEw_pBlwX60T';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const defaultClasses=['9/1','9/2','9/3','9/4','9/5','9/6','9/7'];
let classes=[...defaultClasses];
let loginMode='student',studentToken=null,teacherToken=null,adminToken=null,currentStudent=null,currentTeacher=null,currentAdmin=null,allStudents=[],topics=[],studentLearningTopics=[],quizPoints=0;
let teacherAssignments=[],teacherSubjectCode=null,teacherSubjectName='',teacherSubjects=[];
let studentSubjects=[],studentSubjectCode=null,studentSubjectName='',studentTeacherId=null,studentSubjectMode='mt';
const $=id=>document.getElementById(id); const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

// Improve contrast only for the student subject chooser.
(function(){
  const style=document.createElement('style');
  style.textContent=`
    #popupRoot .student-subject-overlay{background:rgba(2,6,23,.66)!important;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
    #popupRoot .student-subject-picker{background:#ffffff!important;color:#0f172a!important;border:1px solid #cbd5e1!important;box-shadow:0 24px 70px rgba(2,6,23,.35)!important}
    #popupRoot .student-subject-picker h2{color:#0f172a!important;text-shadow:none!important}
    #popupRoot .student-subject-picker .muted{color:#475569!important;opacity:1!important}
    #popupRoot .student-subject-picker .grid{gap:12px!important}
    #popupRoot .student-subject-picker .btn{background:#f8fafc!important;color:#0f172a!important;border:2px solid #cbd5e1!important;box-shadow:none!important;font-weight:800!important;opacity:1!important}
    #popupRoot .student-subject-picker .btn:hover,#popupRoot .student-subject-picker .btn:focus{background:#e2e8f0!important;border-color:#94a3b8!important}
    #popupRoot .student-subject-picker .btn.primary{background:#0f766e!important;color:#ffffff!important;border-color:#0f766e!important}
  `;
  document.head.appendChild(style);
})();


// Responsive login background: ONE layer only (prevents duplicate image on scroll).
(function(){
  const style=document.createElement('style');
  style.textContent=`
    html.login-bg-root{
      min-height:100%!important;
      background:#031a3d!important;
      background-image:none!important;
    }
    body.login-screen{
      position:relative!important;
      isolation:isolate!important;
      min-height:100vh!important;
      min-height:100svh!important;
      min-height:100dvh!important;
      background:#031a3d!important;
      background-image:none!important;
    }
    body.login-screen::before{
      content:none!important;
      display:none!important;
      background-image:none!important;
    }
    #portalLoginBg{
      display:none;
      position:fixed;
      inset:0;
      width:100vw;
      height:100vh;
      height:100dvh;
      z-index:-1;
      pointer-events:none;
      background-color:#031a3d;
      background-image:url('login-bg-desktop.jpeg');
      background-size:cover;
      background-position:center center;
      background-repeat:no-repeat;
      transform:translateZ(0);
      -webkit-transform:translateZ(0);
    }
    body.login-screen #portalLoginBg{display:block}
    @media (min-width:601px) and (max-width:1100px){
      #portalLoginBg{
        background-image:url('login-bg-ipad.jpg');
        background-size:cover;
        background-position:center center;
      }
    }
    @media (max-width:600px) and (orientation:portrait){
      html.login-bg-root,body.login-screen{
        background:#020b1f!important;
      }
      #portalLoginBg{
        top:0!important;
        right:0!important;
        bottom:auto!important;
        left:0!important;
        width:100vw!important;
        height:100svh!important;
        min-height:100svh!important;
        background-color:#020b1f!important;
        background-image:url('login-bg-phone.jpg')!important;
        background-size:contain!important;
        background-position:center center!important;
        background-repeat:no-repeat!important;
      }
    }
  `;
  document.head.appendChild(style);
  let bg=document.getElementById('portalLoginBg');
  if(!bg){
    bg=document.createElement('div');
    bg.id='portalLoginBg';
    bg.setAttribute('aria-hidden','true');
    document.body.prepend(bg);
  }
})();



// Mobile login card: shrink the whole existing card without changing its internal layout.
(function(){
  const applyMobileLoginScale=()=>{
    const view=document.getElementById('loginView');
    const btn=document.getElementById('loginBtn');
    if(!view||!btn)return;
    const card=btn.closest('.card,.login-card,.login-box,.auth-card');
    if(card&&view.contains(card))card.classList.add('portal-mobile-login-card');
  };
  const style=document.createElement('style');
  style.textContent=`
    @media (max-width:600px) and (orientation:portrait){
      body.login-screen .portal-mobile-login-card{
        transform:scale(.86)!important;
        transform-origin:center center!important;
      }
    }
  `;
  document.head.appendChild(style);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyMobileLoginScale,{once:true});
  else applyMobileLoginScale();
})();

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
function sessionSave(kind,token){const now=String(Date.now());if(kind==='teacher'){sessionStorage.setItem('chemTeacherToken',token);sessionStorage.setItem('chemTeacherTokenAt',now);localStorage.removeItem('chemTeacherToken');localStorage.removeItem('chemTeacherTokenAt')}else if(kind==='admin'){sessionStorage.setItem('rawafidAdminToken',token);sessionStorage.setItem('rawafidAdminTokenAt',now)}else{localStorage.setItem('chemStudentToken',token);localStorage.setItem('chemStudentTokenAt',now)}}
function sessionRead(kind){const admin=kind==='admin',store=(kind==='teacher'||admin)?sessionStorage:localStorage,key=admin?'rawafidAdminToken':kind==='teacher'?'chemTeacherToken':'chemStudentToken',ageKey=key+'At',maxAge=admin?8*60*60*1000:kind==='teacher'?SEC.teacherMaxAge:SEC.studentMaxAge;const tok=store.getItem(key),at=Number(store.getItem(ageKey)||0);if(!tok||!at||Date.now()-at>maxAge){store.removeItem(key);store.removeItem(ageKey);return null}return tok}
function sessionClear(){['chemStudentToken','chemStudentTokenAt','chemTeacherToken','chemTeacherTokenAt'].forEach(k=>localStorage.removeItem(k));['chemTeacherToken','chemTeacherTokenAt','rawafidAdminToken','rawafidAdminTokenAt'].forEach(k=>sessionStorage.removeItem(k))}
try{localStorage.removeItem('chemTeacherToken');localStorage.removeItem('chemTeacherTokenAt')}catch(_e){}
function loginGuardKey(){return 'chemLoginGuard_'+loginMode}
function loginGuard(){try{const x=JSON.parse(localStorage.getItem(loginGuardKey())||'{}');if(x.until&&Date.now()<x.until)return Math.ceil((x.until-Date.now())/1000)}catch(_e){}return 0}
function loginFailed(){try{const k=loginGuardKey(),x=JSON.parse(localStorage.getItem(k)||'{}'),n=(Number(x.n)||0)+1;if(n>=SEC.maxLoginAttempts)localStorage.setItem(k,JSON.stringify({n:0,until:Date.now()+SEC.loginCooldownMs}));else localStorage.setItem(k,JSON.stringify({n}))}catch(_e){}}
function loginSucceeded(){try{localStorage.removeItem(loginGuardKey())}catch(_e){}}
function secureLogout(note=''){studentToken=teacherToken=adminToken=null;currentStudent=currentTeacher=currentAdmin=null;teacherAssignments=[];teacherSubjects=[];teacherSubjectCode=null;teacherSubjectName='';studentSubjects=[];studentSubjectCode=null;studentSubjectName='';studentTeacherId=null;studentSubjectMode='mt';classes=[...defaultClasses];sessionClear();show('loginView');$('topSub').textContent='9/1 - 9/7';if(note)msg('loginMsg',note,false)}
function validTeacherUrlField(id,label){const v=$(id)?.value.trim()||'';if(!v)return '';const u=safeWebUrl(v);if(!u)throw new Error(`${label}: استخدم رابط HTTPS صحيح فقط.`);return u}
async function isRealPdf(file){if(!file||file.size<5)return false;const head=new Uint8Array(await file.slice(0,5).arrayBuffer());return String.fromCharCode(...head)==='%PDF-'}
async function isRealImage(file){if(!file||file.size<12)return false;const b=new Uint8Array(await file.slice(0,16).arrayBuffer());const png=b[0]===0x89&&b[1]===0x50&&b[2]===0x4e&&b[3]===0x47;const jpg=b[0]===0xff&&b[1]===0xd8&&b[2]===0xff;const gif=String.fromCharCode(...b.slice(0,6))==='GIF87a'||String.fromCharCode(...b.slice(0,6))==='GIF89a';const webp=String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP';return png||jpg||gif||webp}
function applyInputSecurity(){document.querySelectorAll('input[type="text"],input:not([type]),textarea').forEach(el=>{if(!el.maxLength||el.maxLength<0)el.maxLength=SEC.maxText});document.querySelectorAll('input[type="password"]').forEach(el=>{el.maxLength=200;el.autocomplete=el.id==='loginPass'?'current-password':'new-password'});document.querySelectorAll('input[type="url"]').forEach(el=>el.maxLength=SEC.maxUrl);const u=$('loginUser');if(u){u.maxLength=80;u.autocomplete='username'}window.name='';try{if(location.hash&&/token|session|password/i.test(location.hash))history.replaceState(null,'',location.pathname+location.search)}catch(_e){}}

const fixStudentName=n=>String(n??'').replace(/(^|\s)عبدا(?=\s|$)/g,'$1عبدالله').replace(/(^|\s)طلل(?=\s|$)/g,'$1طلال').replace(/(^|\s)هلل(?=\s|$)/g,'$1هلال').replace(/(^|\s)غلم(?=\s|$)/g,'$1غلام');
const studentName=n=>esc(fixStudentName(n));
const fmtPoints=n=>{const x=Number(n||0);return Number.isInteger(x)?String(x):x.toFixed(1)};
async function loadStudentQuizPoints(){try{const d=await rpc('portal_student_quiz_points',{p_token:studentToken});const x=d?.[0];quizPoints=Number(x?.quiz_points||0);if($('studentPoints'))$('studentPoints').textContent=fmtPoints(x?.total_points??((Number(currentStudent?.points||0))+quizPoints));}catch(_e){quizPoints=0;if($('studentPoints'))$('studentPoints').textContent=fmtPoints(currentStudent?.points||0)}}
function msg(id,t,ok=true){$(id).innerHTML=`<div class="msg ${ok?'ok':'err'}">${esc(t)}</div>`}
function show(view){['loginView','studentView','teacherView','adminView'].forEach(x=>$(x)?.classList.add('hide'));$(view)?.classList.remove('hide');$('logoutBtn').classList.toggle('hide',view==='loginView');const isLogin=view==='loginView';document.body.classList.toggle('login-screen',isLogin);document.documentElement.classList.toggle('login-bg-root',isLogin)}
function nav(root){root.querySelectorAll('button[data-sec]').forEach(b=>b.onclick=()=>{root.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.section').forEach(x=>x.classList.remove('active'));$(b.dataset.sec).classList.add('active')})}
nav($('studentNav'));nav($('teacherNav'));nav($('adminNav'));
const lessonsNavBtn=$('studentNav')?.querySelector('[data-sec="s-lessons"]');
if(lessonsNavBtn)lessonsNavBtn.addEventListener('click',()=>{if(!studentToken)return;loadMyLessons().catch(e=>{$('lessonList').innerHTML=`<div class="msg err">تعذر تحميل دروسك: ${esc(e.message||'خطأ غير معروف')}</div>`})});
classes.forEach(c=>{['annClass','contentClass','studentFilter','expClass','bankClass','studyClass','engClass'].forEach(id=>$(id).insertAdjacentHTML('beforeend',`<option value="${c}">${c}</option>`));['gradeClass','pointsClass'].forEach(id=>$(id).insertAdjacentHTML('beforeend',`<option value="${c}">${c}</option>`))});
if($('gradeReportClass'))$('gradeReportClass').innerHTML='<option value="ALL">كل الشعب</option>'+classes.map(c=>`<option value="${c}">${c}</option>`).join('');
$('pointsClass')&&$('pointsClass').insertAdjacentHTML('afterbegin','<option value="ALL">🌐 كل الشعب</option>');
document.querySelectorAll('[data-login]').forEach(b=>b.onclick=()=>{loginMode=b.dataset.login;document.querySelectorAll('[data-login]').forEach(x=>x.classList.toggle('active',x===b));$('teacherHint').style.display=loginMode==='teacher'?'block':'none';$('loginUser').placeholder=loginMode==='teacher'?'teacher':loginMode==='admin'?'rawafid_admin':'مثال: 91001'});
const MT_RPC_MAP={
'portal_teacher_overview':'portal_teacher_mt_overview','portal_teacher_topics':'portal_teacher_mt_topics','portal_teacher_progress':'portal_teacher_mt_progress','portal_teacher_set_progress':'portal_teacher_mt_set_progress','portal_teacher_lesson_plan':'portal_teacher_mt_lesson_plan','portal_teacher_save_lesson_plan':'portal_teacher_mt_save_lesson_plan','portal_teacher_lesson_visits':'portal_teacher_mt_lesson_visits','portal_teacher_lesson_nonvisitors':'portal_teacher_mt_lesson_nonvisitors','portal_teacher_announcements':'portal_teacher_mt_announcements','portal_teacher_add_announcement':'portal_teacher_mt_add_announcement','portal_teacher_content':'portal_teacher_mt_content','portal_teacher_add_content':'portal_teacher_mt_add_content','portal_teacher_experiments':'portal_teacher_mt_experiments','portal_teacher_add_experiment':'portal_teacher_mt_add_experiment','portal_teacher_set_experiment_visibility':'portal_teacher_mt_set_experiment_visibility','portal_teacher_delete_experiment':'portal_teacher_mt_delete_experiment','portal_teacher_question_bank':'portal_teacher_mt_question_bank','portal_teacher_add_question_bank':'portal_teacher_mt_add_question_bank','portal_teacher_update_question_bank':'portal_teacher_mt_update_question_bank','portal_teacher_set_question_state':'portal_teacher_mt_set_question_state','portal_teacher_delete_question_bank':'portal_teacher_mt_delete_question_bank','portal_teacher_lesson_materials':'portal_teacher_mt_lesson_materials','portal_teacher_add_lesson_material':'portal_teacher_mt_add_lesson_material','portal_teacher_set_lesson_material_visibility':'portal_teacher_mt_set_lesson_material_visibility','portal_teacher_delete_lesson_material':'portal_teacher_mt_delete_lesson_material','portal_teacher_add_grade':'portal_teacher_mt_add_grade','portal_teacher_grade_report':'portal_teacher_mt_grade_report','portal_teacher_update_grade_value':'portal_teacher_mt_update_grade_value','portal_teacher_points_overview':'portal_teacher_mt_points_overview','portal_teacher_adjust_points':'portal_teacher_mt_adjust_points','portal_teacher_questions':'portal_teacher_mt_questions','portal_teacher_reply_question':'portal_teacher_mt_reply_question','portal_teacher_behavior_records':'portal_teacher_mt_behavior_records','portal_teacher_add_behavior_record':'portal_teacher_mt_add_behavior_record','portal_teacher_resolve_behavior_record':'portal_teacher_mt_resolve_behavior_record','portal_teacher_delete_behavior_record':'portal_teacher_mt_delete_behavior_record','portal_teacher_student_logins_v2':'portal_teacher_mt_subject_logins'};
const MT_STUDENT_RPC_MAP={
'portal_student_progress':'portal_student_mt_progress','portal_student_announcements':'portal_student_mt_announcements','portal_student_mark_announcement_read':'portal_student_mt_mark_announcement_read','portal_student_content':'portal_student_mt_content','portal_student_grades':'portal_student_mt_grades','portal_student_questions':'portal_student_mt_questions','portal_student_ask':'portal_student_mt_ask','portal_student_experiments':'portal_student_mt_experiments','portal_student_question_bank':'portal_student_mt_question_bank','portal_student_answer_bank':'portal_student_mt_answer_bank','portal_student_quiz_points':'portal_student_mt_quiz_points','portal_student_learning_topics':'portal_student_mt_learning_topics','portal_student_lesson_materials':'portal_student_mt_lesson_materials','portal_student_my_lessons':'portal_student_mt_my_lessons','portal_student_open_my_lesson':'portal_student_mt_open_my_lesson'};
async function rpc(fn,args={}){if(!/^portal_[a-z0-9_]{1,80}$/i.test(String(fn)))throw new Error('RPC غير مسموح');if(studentToken&&studentSubjectMode==='mt'&&studentSubjectCode&&MT_STUDENT_RPC_MAP[fn]){fn=MT_STUDENT_RPC_MAP[fn];args={...args,p_subject_code:studentSubjectCode}}if(teacherToken&&currentTeacher&&teacherSubjectCode&&MT_RPC_MAP[fn]){fn=MT_RPC_MAP[fn];args={...args,p_subject_code:teacherSubjectCode}}const req=sb.rpc(fn,args);let timer;try{const result=await Promise.race([req,new Promise((_,rej)=>{timer=setTimeout(()=>rej(new Error('انتهت مهلة الاتصال. حاول مرة أخرى.')),SEC.rpcTimeoutMs)})]);const {data,error}=result;if(error)throw error;return data}finally{clearTimeout(timer)}}

function teacherIdentity(){return Number(currentTeacher?.teacher_id??currentTeacher?.id??0)}
function isPrimaryTeacher(){return teacherIdentity()===1||String(currentTeacher?.username||'')==='teacher'}
function classSort(a,b){const pa=String(a).split('/').map(Number),pb=String(b).split('/').map(Number);return (pa[0]||0)-(pb[0]||0)||(pa[1]||0)-(pb[1]||0)||String(a).localeCompare(String(b),'ar')}
function subjectIcon(code){return code==='chemistry'?'🧪':code==='physics'?'⚛️':code==='biology'?'🧬':'🔬'}
function subjectDisplayName(code,name=''){
  if(code==='biology')return 'الأحياء';
  if(code==='science')return 'العلوم';
  if(code==='chemistry')return 'الكيمياء';
  if(code==='physics')return 'الفيزياء';
  const n=String(name||'').trim();
  return n.startsWith('ال')?n:(n?'ال'+n:'');
}

function clearSubjectTransientMessages(){
  ['pointsMsg','gradeMsg','annTeacherMsg','contentMsg','askMsg','studyMsg','bankMsg','behaviorMsg','planMsg','recoveryMsg'].forEach(id=>{if($(id))$(id).innerHTML=''});
  if($('planStats'))$('planStats').innerHTML='';
}
function studentGradeTitle(){
  const grade=String(currentStudent?.class_name||'').split('/')[0];
  if(grade==='7')return 'الصف السابع';if(grade==='8')return 'الصف الثامن';if(grade==='9')return 'الصف التاسع';return '';
}
function teacherGradeTitle(){
  const grade=String(classes?.[0]||'').split('/')[0];
  if(grade==='7')return 'الصف السابع';
  if(grade==='8')return 'الصف الثامن';
  if(grade==='9')return 'الصف التاسع';
  return '';
}
function updateTeacherBranding(){
  const teacherName=currentTeacher?.full_name||'المعلم';
  const subject=subjectDisplayName(teacherSubjectCode,teacherSubjectName);
  const grade=teacherGradeTitle();
  document.title=`بوابة ${subject} | ${grade} | ${teacherName}`;
  const candidates=[...document.querySelectorAll('h1,h2,strong,.brand,.title')];
  const portalTitle=candidates.find(x=>/بوابة (?:ال)?(?:كيمياء|الكيمياء|أحياء|الأحياء|علوم|العلوم|فيزياء|الفيزياء)/.test(x.textContent||''));
  if(portalTitle)portalTitle.textContent=`${subjectIcon(teacherSubjectCode)} بوابة ${subject} | ${grade}`;
  const todayTitle=[...document.querySelectorAll('#teacherView h1,#teacherView h2,#teacherView h3')].find(x=>/اليوم في بوابة/.test(x.textContent||''));
  if(todayTitle)todayTitle.textContent=`☀️ اليوم في بوابة ${subject}`;
}
function rebuildTeacherClassControls(){
  const allLabel='<option value="ALL">🌐 كل الشعب</option>', opts=classes.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
  ['annClass','contentClass','studentFilter','expClass','bankClass','studyClass','engClass','recoveryClass','behaviorFilterClass','loginClass','gradeReportClass'].forEach(id=>{if($(id))$(id).innerHTML=allLabel+opts});
  ['gradeClass','behaviorClass','gradebookClass','newStudentClass'].forEach(id=>{if($(id))$(id).innerHTML=opts});
  if($('pointsClass'))$('pointsClass').innerHTML=allLabel+opts;
}
function renderTeacherContextBar(){
  const host=$('teacherView');if(!host)return;
  let bar=$('teacherContextBar');if(!bar){bar=document.createElement('div');bar.id='teacherContextBar';bar.style='margin:12px 0;padding:12px 14px;border:1px solid #cfe2df;border-radius:14px;background:#f7fbfa;display:flex;gap:10px;align-items:center;flex-wrap:wrap';host.prepend(bar)}
  const multi=teacherSubjects.length>1;
  const displaySubject=subjectDisplayName(teacherSubjectCode,teacherSubjectName);
  bar.innerHTML=`<div style="display:flex;flex-direction:column;gap:3px"><b>👨‍🏫 ${esc(currentTeacher?.full_name||'المعلم')}</b><span class="muted">${subjectIcon(teacherSubjectCode)} ${esc(displaySubject)} — ${esc(teacherGradeTitle())}</span></div><span class="badge">${classes.map(esc).join(' • ')}</span>${multi?'<button id="teacherSwitchSubject" class="btn secondary">🔄 تغيير المادة</button>':''}`;
  if($('teacherSwitchSubject'))$('teacherSwitchSubject').onclick=async()=>{await chooseTeacherSubject(true);clearSubjectTransientMessages();rebuildTeacherClassControls();renderTeacherContextBar();updateTeacherBranding();if(!isPrimaryTeacher())applyTeacherSafeMode();if(isPrimaryTeacher()&&teacherSubjectCode==='chemistry'){try{await rpc('portal_teacher_mt_migrate_legacy_chemistry',{p_token:teacherToken});await rpc('portal_teacher_mt_repair_legacy_chemistry_logins',{p_token:teacherToken})}catch(e){alert('تعذر تجهيز بيانات الكيمياء في النظام الجديد. بياناتك القديمة لم تتغير.\n\nسبب الخطأ:\n'+(e?.message||String(e)));throw e}}$('topSub').textContent=`${subjectDisplayName(teacherSubjectCode,teacherSubjectName)} — ${classes.join(' • ')}`;await reloadTeacherSubjectPanels()};
}
function applyTeacherSafeMode(){
  if(isPrimaryTeacher())return;
  const nav=$('teacherNav');
  if(nav)nav.querySelectorAll('button[data-sec]').forEach(b=>{b.style.display='';b.disabled=false});
  document.querySelectorAll('#teacherView .section').forEach(sec=>{
    sec.querySelectorAll('.subject-safety-note').forEach(x=>x.remove());
    sec.querySelectorAll('button,input,select,textarea').forEach(el=>el.disabled=false);
  });
}

async function chooseTeacherSubject(force=false){
  if(!teacherAssignments.length)teacherAssignments=await rpc('portal_teacher_assignments',{p_token:teacherToken})||[];
  const byCode=new Map();for(const r of teacherAssignments){if(!byCode.has(r.subject_code))byCode.set(r.subject_code,{code:r.subject_code,name:r.subject_name,rows:[]});byCode.get(r.subject_code).rows.push(r)}
  teacherSubjects=[...byCode.values()];if(!teacherSubjects.length)throw new Error('لم يتم إسناد مادة أو شعبة لهذا المعلم.');
  const apply=x=>{teacherSubjectCode=x.code;teacherSubjectName=x.name;classes=[...new Set(x.rows.map(r=>r.class_name).filter(Boolean))].sort(classSort)};
  if(!force&&teacherSubjects.length===1){apply(teacherSubjects[0]);return}
  await new Promise(resolve=>{const root=$('popupRoot');root.innerHTML=`<div class="popup"><div class="card"><h2>📚 اختر المادة / المنهج</h2><p class="muted">ستظهر لك فقط الشعب المسندة لهذه المادة.</p><div id="teacherSubjectChoices" class="grid">${teacherSubjects.map((x,i)=>`<button class="btn ${x.code===teacherSubjectCode?'primary':'secondary'}" data-teacher-subject="${i}">${subjectIcon(x.code)} ${esc(subjectDisplayName(x.code,x.name))}<br><span class="small">${[...new Set(x.rows.map(r=>r.class_name))].sort(classSort).map(esc).join(' • ')}</span></button>`).join('')}</div></div></div>`;root.querySelectorAll('[data-teacher-subject]').forEach(b=>b.onclick=()=>{apply(teacherSubjects[Number(b.dataset.teacherSubject)]);root.innerHTML='';resolve()})});
}
async function prepareTeacherContext(){teacherAssignments=[];teacherSubjects=[];await chooseTeacherSubject(false);rebuildTeacherClassControls()}

function updateStudentBranding(){
  const subject=subjectDisplayName(studentSubjectCode,studentSubjectName)||'المادة',grade=studentGradeTitle();
  document.title=`بوابة ${subject} | ${grade} | ${fixStudentName(currentStudent?.full_name||'طالب')}`;
  const candidates=[...document.querySelectorAll('h1,h2,strong,.brand,.title')];
  const portalTitle=candidates.find(x=>/بوابة (?:ال)?(?:كيمياء|الكيمياء|أحياء|الأحياء|علوم|العلوم|فيزياء|الفيزياء)/.test(x.textContent||''));
  if(portalTitle)portalTitle.textContent=`${subjectIcon(studentSubjectCode)} بوابة ${subject} | ${grade}`;
  $('topSub').textContent=`${subject} — ${currentStudent?.class_name||''}`;
}
function renderStudentContextBar(){
  const host=$('studentView');if(!host)return;
  let bar=$('studentContextBar');if(!bar){bar=document.createElement('div');bar.id='studentContextBar';bar.style='margin:12px 0;padding:12px 14px;border:1px solid #cfe2df;border-radius:14px;background:#f7fbfa;display:flex;gap:10px;align-items:center;flex-wrap:wrap';host.prepend(bar)}
  const multi=studentSubjects.length>1,subject=subjectDisplayName(studentSubjectCode,studentSubjectName);
  bar.innerHTML=`<b>${subjectIcon(studentSubjectCode)} ${esc(subject)}</b><span class="badge">${esc(currentStudent?.class_name||'')}</span>${multi?'<button id="studentSwitchSubject" class="btn secondary">🔄 تغيير المادة</button>':''}`;
  if($('studentSwitchSubject'))$('studentSwitchSubject').onclick=async()=>{await chooseStudentSubject(true);clearSubjectTransientMessages();renderStudentContextBar();updateStudentBranding();await reloadStudentSubjectPanels()};
}
async function chooseStudentSubject(force=false){
  let rows=[];try{rows=await rpc('portal_student_mt_subjects',{p_token:studentToken})||[]}catch(_e){}
  studentSubjects=rows.map(x=>({code:x.subject_code,name:x.subject_name,teacherId:Number(x.teacher_id||0),className:x.class_name}));
  if(!studentSubjects.length){studentSubjects=[{code:'chemistry',name:'الكيمياء',teacherId:1,className:currentStudent?.class_name||''}]}
  const apply=x=>{studentSubjectCode=x.code;studentSubjectName=x.name;studentTeacherId=x.teacherId;studentSubjectMode='mt';try{localStorage.setItem('portalStudentSubject',x.code)}catch(_e){}};
  const preferred=(()=>{try{return localStorage.getItem('portalStudentSubject')||''}catch(_e){return ''}})();
  const remembered=!force&&studentSubjects.find(x=>x.code===preferred);
  if(remembered)apply(remembered);
  else if(!force&&studentSubjects.length===1)apply(studentSubjects[0]);
  else await new Promise(resolve=>{const root=$('popupRoot');root.innerHTML=`<div class="popup student-subject-overlay"><div class="card student-subject-picker"><h2>📚 اختر المادة</h2><p class="muted">حسابك واحد، وكل مادة لها درجاتها ودروسها ونقاطها بشكل مستقل.</p><div class="grid">${studentSubjects.map((x,i)=>`<button class="btn ${x.code===studentSubjectCode?'primary':'secondary'}" data-student-subject="${i}">${subjectIcon(x.code)} ${esc(subjectDisplayName(x.code,x.name))}</button>`).join('')}</div></div></div>`;root.querySelectorAll('[data-student-subject]').forEach(b=>b.onclick=()=>{apply(studentSubjects[Number(b.dataset.studentSubject)]);root.innerHTML='';resolve()})});
  try{await rpc('portal_student_mt_open_subject',{p_token:studentToken,p_subject_code:studentSubjectCode})}catch(_e){}
}
async function prepareStudentContext(force=false){await chooseStudentSubject(force)}
async function reloadStudentSubjectPanels(){
  ensureStudentSubjectVideoUI();
  const tasks=[loadStudentProgress,loadStudentAnnouncements,loadStudentContent,loadGrades,loadQuestions,loadStudentExperiments,loadStudentBank,loadStudentQuizPoints];
  await Promise.allSettled(tasks.map(fn=>Promise.resolve().then(fn)));
  try{await loadStudentLearningTopics();await loadMyLessons()}catch(e){console.warn('Lessons unavailable',e)}
  await loadStudentSubjectVideos().catch(()=>{});
}
function activateDynamicSection(viewId,navId,secId){
  document.querySelectorAll(`#${viewId} .section`).forEach(x=>x.classList.remove('active'));const sec=$(secId);if(sec)sec.classList.add('active');
  const nav=$(navId);if(nav)nav.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x.dataset.sec===secId));
}
function ensureStudentSubjectVideoUI(){
  const nav=$('studentNav'),view=$('studentView');if(!nav||!view)return;
  const legacy=[...nav.querySelectorAll('button')].filter(b=>b.id!=='studentMtVideosNav'&&/فيديوهات الشرح/.test(b.textContent||''));
  legacy.forEach(b=>b.style.display=studentSubjectCode==='chemistry'?'':'none');
  let btn=$('studentMtVideosNav'),sec=$('s-mt-videos');
  if(!btn){btn=document.createElement('button');btn.id='studentMtVideosNav';btn.dataset.sec='s-mt-videos';btn.textContent='🎬 فيديوهات المادة';nav.appendChild(btn);btn.onclick=()=>{activateDynamicSection('studentView','studentNav','s-mt-videos');loadStudentSubjectVideos().catch(()=>{})}}
  btn.style.display='';
  if(!sec){sec=document.createElement('section');sec.id='s-mt-videos';sec.className='section card';sec.innerHTML='<h2>🎬 فيديوهات المادة</h2><div id="studentMtVideoList" class="grid"><div class="muted">لا توجد فيديوهات حاليًا.</div></div>';view.appendChild(sec)}
}
async function loadStudentSubjectVideos(){
  if(!$('studentMtVideoList'))return;
  const d=await rpc('portal_student_mt_videos',{p_token:studentToken,p_subject_code:studentSubjectCode})||[];
  $('studentMtVideoList').innerHTML=d.length?d.map(v=>{const u=safeWebUrl(v.video_url);return `<div class="item"><span class="badge">${esc(v.target_class==='ALL'?'كل الشعب':v.target_class)}</span><h3>${esc(v.title)}</h3>${v.description?`<p>${esc(v.description)}</p>`:''}${u?`<a class="btn primary" target="_blank" rel="noopener noreferrer" href="${esc(u)}">▶️ فتح الفيديو</a>`:'<div class="msg err">الرابط غير صالح.</div>'}</div>`}).join(''):'<div class="muted">لا توجد فيديوهات لهذه المادة حاليًا.</div>';
}
function ensureTeacherSubjectVideoUI(){
  const nav=$('teacherNav'),view=$('teacherView');if(!nav||!view)return;
  const legacy=[...nav.querySelectorAll('button')].filter(b=>b.id!=='teacherMtVideosNav'&&/فيديوهات الشرح/.test(b.textContent||''));
  let btn=$('teacherMtVideosNav'),sec=$('t-mt-videos');
  legacy.forEach(b=>{b.style.display=(isPrimaryTeacher()&&teacherSubjectCode==='chemistry')?'':'none';if(isPrimaryTeacher()&&teacherSubjectCode==='chemistry')b.textContent='🎞️ فيديوهات الكيمياء القديمة'});
  if(!btn){btn=document.createElement('button');btn.id='teacherMtVideosNav';btn.dataset.sec='t-mt-videos';btn.textContent='🎬 فيديوهات الشرح';nav.appendChild(btn);btn.onclick=()=>{activateDynamicSection('teacherView','teacherNav','t-mt-videos');loadTeacherSubjectVideos().catch(()=>{})}}
  btn.style.display='';
  if(!sec){sec=document.createElement('section');sec.id='t-mt-videos';sec.className='section card';sec.innerHTML=`<h2>🎬 فيديوهات الشرح</h2><div class="grid"><div class="field"><label>عنوان الفيديو</label><input id="mtVideoTitle" type="text" placeholder="عنوان الفيديو"></div><div class="field"><label>الرابط</label><input id="mtVideoUrl" type="url" placeholder="https://..."></div><div class="field"><label>الشعبة</label><select id="mtVideoClass"></select></div><div class="field"><label>وصف مختصر</label><textarea id="mtVideoDesc" rows="2"></textarea></div></div><label><input id="mtVideoVisible" type="checkbox"> إظهار الفيديو للطلاب مباشرة</label><div style="margin-top:10px"><button id="mtVideoAddBtn" class="btn primary">➕ إضافة الفيديو</button></div><div id="mtVideoMsg"></div><hr><h3>الفيديوهات المضافة</h3><div id="teacherMtVideoList"></div>`;view.appendChild(sec);$('mtVideoAddBtn').onclick=addTeacherSubjectVideo}
  if($('mtVideoClass'))$('mtVideoClass').innerHTML='<option value="ALL">🌐 كل الشعب</option>'+classes.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
}
async function addTeacherSubjectVideo(){
  try{const title=$('mtVideoTitle').value.trim(),url=safeWebUrl($('mtVideoUrl').value.trim());if(!title)throw new Error('اكتب عنوان الفيديو');if(!url)throw new Error('اكتب رابط HTTPS صحيح');$('mtVideoAddBtn').disabled=true;const id=await rpc('portal_teacher_mt_add_video',{p_token:teacherToken,p_subject_code:teacherSubjectCode,p_title:title,p_description:$('mtVideoDesc').value,p_video_url:url,p_target_class:$('mtVideoClass').value,p_is_visible:$('mtVideoVisible').checked});if(!id)throw new Error('تعذر حفظ الفيديو');$('mtVideoTitle').value='';$('mtVideoUrl').value='';$('mtVideoDesc').value='';$('mtVideoVisible').checked=false;msg('mtVideoMsg','تم حفظ الفيديو ✅');await loadTeacherSubjectVideos()}catch(e){msg('mtVideoMsg',e.message||'تعذر الحفظ',false)}finally{if($('mtVideoAddBtn'))$('mtVideoAddBtn').disabled=false}
}
async function loadTeacherSubjectVideos(){
  if(!$('teacherMtVideoList'))return;const d=await rpc('portal_teacher_mt_videos',{p_token:teacherToken,p_subject_code:teacherSubjectCode})||[];
  $('teacherMtVideoList').innerHTML=d.length?d.map(v=>{const u=safeWebUrl(v.video_url);return `<div class="item"><span class="badge ${v.is_visible?'state-on':'state-off'}">${v.is_visible?'ظاهر للطلاب':'مخفي'}</span> <span class="badge">${esc(v.target_class==='ALL'?'كل الشعب':v.target_class)}</span><h3>${esc(v.title)}</h3>${v.description?`<p>${esc(v.description)}</p>`:''}<div class="inline-actions">${u?`<a class="btn secondary" target="_blank" rel="noopener noreferrer" href="${esc(u)}">▶️ فتح</a>`:''}<button class="btn ${v.is_visible?'secondary':'primary'}" data-mt-video-toggle="${v.id}" data-next="${!v.is_visible}">${v.is_visible?'🙈 إخفاء':'👁️ إظهار'}</button><button class="btn danger" data-mt-video-delete="${v.id}">حذف</button></div></div>`}).join(''):'<div class="muted">لم تضف فيديوهات لهذه المادة بعد.</div>';
  $('teacherMtVideoList').querySelectorAll('[data-mt-video-toggle]').forEach(b=>b.onclick=async()=>{await rpc('portal_teacher_mt_set_video_visibility',{p_token:teacherToken,p_subject_code:teacherSubjectCode,p_video_id:Number(b.dataset.mtVideoToggle),p_is_visible:b.dataset.next==='true'});await loadTeacherSubjectVideos()});
  $('teacherMtVideoList').querySelectorAll('[data-mt-video-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('حذف الفيديو؟'))return;await rpc('portal_teacher_mt_delete_video',{p_token:teacherToken,p_subject_code:teacherSubjectCode,p_video_id:Number(b.dataset.mtVideoDelete)});await loadTeacherSubjectVideos()});
}
let managedTopics=[];
function ensureTeacherTopicManager(){
  const sec=$('planTopic')?.closest('.section');if(!sec)return;let box=$('mtTopicManager');
  if(!box){box=document.createElement('div');box.id='mtTopicManager';box.className='item';box.style.marginBottom='14px';box.innerHTML=`<h3>📚 دروسي</h3><p class="muted">هنا تظهر الدروس التي أضفتها أو استخدمتها فعليًا. قائمة المنهج تبقى منفصلة لتقدم الشعب ولا تظهر هنا.</p><div class="grid"><div class="field"><label>اسم الدرس</label><input id="mtTopicTitle" type="text" placeholder="مثال: الخلية"></div><div class="field"><label>رقم الوحدة</label><input id="mtTopicUnit" type="number" min="1" value="1"></div><div class="field"><label>اسم الوحدة</label><input id="mtTopicUnitTitle" type="text" placeholder="اختياري"></div><div class="field"><label>رمز الدرس</label><input id="mtTopicCode" type="text" placeholder="اختياري"></div><div class="field"><label>الصفحة</label><input id="mtTopicPage" type="number" min="1" placeholder="اختياري"></div></div><button id="mtTopicAddBtn" class="btn primary">➕ إضافة درس</button><div id="mtTopicMsg"></div><div id="mtTopicList" style="margin-top:10px"></div>`;sec.insertBefore(box,sec.children[1]||sec.firstChild);$('mtTopicAddBtn').onclick=addTeacherTopic}
  renderTeacherTopicManager();
}
async function loadManagedTeacherTopics(){
  managedTopics=await rpc('portal_teacher_mt_managed_topics',{p_token:teacherToken,p_subject_code:teacherSubjectCode})||[];
  renderTeacherTopicManager();
}
function renderTeacherTopicManager(){
  if(!$('mtTopicList'))return;
  $('mtTopicList').innerHTML=managedTopics.length?managedTopics.map(t=>`<div class="item" style="padding:10px"><b>${esc(t.title)}</b> ${t.section_code?`<span class="badge">${esc(t.section_code)}</span>`:''} <span class="muted">الوحدة ${t.unit_no}${t.page_no?' • ص '+t.page_no:''}</span>${t.is_manual?` <button class="btn danger" style="float:left" data-mt-topic-delete="${t.id}">حذف</button>`:' <span class="badge" style="float:left">درس مستخدم سابقًا</span>'}</div>`).join(''):'<div class="muted">لا توجد دروس مضافة أو مستخدمة بعد.</div>';
  $('mtTopicList').querySelectorAll('[data-mt-topic-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('إخفاء هذا الدرس من المادة؟'))return;await rpc('portal_teacher_mt_deactivate_topic',{p_token:teacherToken,p_subject_code:teacherSubjectCode,p_topic_id:Number(b.dataset.mtTopicDelete)});await refreshGenericTeacherTopics()});
}
async function addTeacherTopic(){try{const title=$('mtTopicTitle').value.trim();if(!title)throw new Error('اكتب اسم الدرس');$('mtTopicAddBtn').disabled=true;const page=$('mtTopicPage').value?Number($('mtTopicPage').value):null;const id=await rpc('portal_teacher_mt_add_topic',{p_token:teacherToken,p_subject_code:teacherSubjectCode,p_unit_no:Number($('mtTopicUnit').value||1),p_unit_title:$('mtTopicUnitTitle').value,p_section_code:$('mtTopicCode').value,p_title:title,p_page_no:page});if(!id)throw new Error('تعذر إضافة الدرس');$('mtTopicTitle').value='';$('mtTopicCode').value='';$('mtTopicPage').value='';msg('mtTopicMsg','تمت إضافة الدرس ✅');await refreshGenericTeacherTopics()}catch(e){msg('mtTopicMsg',e.message||'تعذر الإضافة',false)}finally{if($('mtTopicAddBtn'))$('mtTopicAddBtn').disabled=false}}
async function refreshGenericTeacherTopics(){topics=await rpc('portal_teacher_topics',{p_token:teacherToken})||[];fillStudyTopicSelects();await initLessonPlanEditor();await loadManagedTeacherTopics();await loadProgressCards();}

$('loginBtn').onclick=async()=>{try{const wait=loginGuard();if(wait)throw new Error(`محاولات كثيرة. انتظر ${wait} ثانية ثم حاول مرة أخرى.`);$('loginBtn').disabled=true;$('loginMsg').innerHTML='';const username=$('loginUser').value.trim(),password=$('loginPass').value;if(!username||!password)throw new Error('اكتب اسم المستخدم وكلمة المرور.');if(username.length>80||password.length>200)throw new Error('بيانات الدخول غير صالحة.');if(loginMode==='student'){const d=await rpc('portal_student_login',{p_username:username,p_password:password});if(!d?.length)throw new Error('بيانات الدخول غير صحيحة');sessionClear();studentToken=d[0].token;currentStudent=d[0];sessionSave('student',studentToken);loginSucceeded();if(d[0].must_change_password)await forcePasswordChange();await enterStudent(d[0],true)}else if(loginMode==='teacher'){const d=await rpc('portal_teacher_login',{p_username:username,p_password:password});if(!d?.length)throw new Error('بيانات الدخول غير صحيحة');sessionClear();teacherToken=d[0].token;currentTeacher=d[0];sessionSave('teacher',teacherToken);loginSucceeded();if(d[0].must_change_password)await forceTeacherPasswordChange();await enterTeacher()}else{const d=await rpc('portal_admin_login',{p_username:username,p_password:password});if(!d?.length)throw new Error('بيانات الدخول غير صحيحة');sessionClear();adminToken=d[0].token;currentAdmin=d[0];sessionSave('admin',adminToken);loginSucceeded();await enterAdmin()}}catch(e){if(!String(e.message||'').startsWith('محاولات كثيرة')&&!String(e.message||'').startsWith('اكتب اسم'))loginFailed();const wait=loginGuard();msg('loginMsg',wait?`محاولات كثيرة. انتظر ${wait} ثانية ثم حاول مرة أخرى.`:(e.message==='بيانات الدخول غير صحيحة'?e.message:'تعذر تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.'),false)}finally{$('loginBtn').disabled=false}};
async function enterAdmin(){adminAllStudentRows=null;show('adminView');$('adminWelcome').textContent=`مرحبًا، ${currentAdmin?.full_name||'مشرف المنصة'}`;activateDynamicSection('adminView','adminNav','a-overview');await Promise.allSettled([loadAdminOverview(),loadAdminStudents(),loadAdminTeachers(),loadAdminBehavior(true),loadAdminGrades()])}
async function loadAdminOverview(){try{const o=await rpc('portal_admin_overview',{p_token:adminToken});if(!o)throw new Error('انتهت جلسة المشرف');$('adminStats').innerHTML=`<div class="stat"><b>${Number(o.students_total||0)}</b>إجمالي الطلاب</div><div class="stat"><b>${Number(o.students_logged_in||0)}</b>طلاب دخلوا</div><div class="stat"><b>${Number(o.students_never_logged_in||0)}</b>طلاب لم يدخلوا</div><div class="stat"><b>${Number(o.teachers_total||0)}</b>إجمالي المعلمين</div><div class="stat"><b>${Number(o.teachers_logged_in||0)}</b>معلمون سجلوا الدخول</div><div class="stat"><b>${Number(o.teachers_never_logged_in||0)}</b>معلمون لم يسجلوا</div><div class="stat"><b>${Number(o.behavior_total||0)}</b>إجمالي الملاحظات</div><div class="stat"><b>${Number(o.behavior_open||0)}</b>ملاحظات تحتاج متابعة</div><div class="stat"><b>${Number(o.students_with_repeated_behavior||0)}</b>طلاب تكررت ملاحظاتهم</div>`;const st=Number(o.students_total||0),te=Number(o.teachers_total||0);$('adminSummary').textContent=`نسبة دخول الطلاب: ${st?Math.round(Number(o.students_logged_in||0)/st*100):0}% • نسبة دخول المعلمين: ${te?Math.round(Number(o.teachers_logged_in||0)/te*100):0}%. عدّاد دخول المعلمين يبدأ من تفعيل سجل المتابعة.`}catch(e){$('adminStats').innerHTML=`<div class="msg err">تعذر تحميل الإحصائيات: ${esc(e.message||'خطأ غير معروف')}</div>`}}
function adminClassSort(a,b){
  const parse=v=>{const m=String(v||'').match(/(\d+)\s*[/\-]\s*(\d+)/);return m?[Number(m[1]),Number(m[2])]:[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER]};
  const x=parse(a),y=parse(b);return x[0]-y[0]||x[1]-y[1]||String(a||'').localeCompare(String(b||''),'ar',{numeric:true});
}
function adminGradeLabel(g){return ({7:'الصف السابع',8:'الصف الثامن',9:'الصف التاسع'})[g]||`الصف ${g}`;}
function fillAdminClassFilter(rows, elementId='adminStudentClassFilter'){
  const el=$(elementId);if(!el)return;
  const previous=el.value||'ALL';
  const names=[...new Set((rows||[]).map(x=>String(x.class_name||'').trim()).filter(Boolean))].sort(adminClassSort);
  const grades=[...new Set(names.map(n=>{const m=n.match(/^(\d+)\s*[/\-]\s*(\d+)$/);return m?Number(m[1]):null}).filter(Number.isFinite))].sort((a,b)=>a-b);
  el.innerHTML='<option value="ALL">كل الصفوف والشعب</option>'+grades.map(g=>`<option value="GRADE:${g}">${adminGradeLabel(g)} — كل الشعب</option>`).join('')+names.map(n=>`<option value="CLASS:${esc(n)}">الشعبة ${esc(n)}</option>`).join('');
  el.value=[...el.options].some(o=>o.value===previous)?previous:'ALL';
}
// Each grade contains fewer than the Supabase default 1000-row response limit.
// Never request all 1322 students in one RPC call.
const ADMIN_GRADE_NUMBERS=[7,8,9];
let adminAllStudentRows=null;
async function adminStudentsAll(force=false){
  if(adminAllStudentRows&&!force)return adminAllStudentRows;
  const groups=await Promise.all(ADMIN_GRADE_NUMBERS.map(g=>rpc('portal_admin_students_filtered',{p_token:adminToken,p_query:'',p_class:`GRADE:${g}`})));
  const byId=new Map();groups.flat().forEach(s=>byId.set(String(s.student_id),s));
  const rows=[...byId.values()].sort((a,b)=>adminClassSort(a.class_name,b.class_name)||String(a.full_name||'').localeCompare(String(b.full_name||''),'ar'));
  // Do not cache partial results after a failed request.
  adminAllStudentRows=rows;
  return rows;
}
function adminFilteredStudents(rows,selected,q){
  const query=String(q||'').trim().toLocaleLowerCase('ar');
  return rows.filter(s=>{
    const cls=String(s.class_name||'').trim();
    if(selected.startsWith('GRADE:')&&cls.split('/')[0]!==selected.slice(6))return false;
    if(selected.startsWith('CLASS:')&&cls!==selected.slice(6))return false;
    return !query||[s.full_name,s.username,cls].some(v=>String(v||'').toLocaleLowerCase('ar').includes(query));
  });
}
async function loadAdminStudents(){try{
  const q=$('adminStudentSearch')?.value.trim()||'', selected=$('adminStudentClassFilter')?.value||'ALL';
  const all=await adminStudentsAll();
  fillAdminClassFilter(all);
  if($('adminStudentClassFilter'))$('adminStudentClassFilter').value=selected;
  const rows=adminFilteredStudents(all,selected,q);
  $('adminStudentsTable').innerHTML=rows.length?rows.map(s=>`<tr><td><button class="link" style="border:0;background:none;cursor:pointer;font-weight:800" data-action="admin-student-profile" data-id="${s.student_id}" data-v1="${safeEnc(s.username)}">${studentName(s.full_name)}</button></td><td>${esc(s.class_name)}</td><td>${esc(s.username)}</td><td>${s.is_active?'نشط':'موقوف'}</td><td>${Number(s.login_count||0)}</td><td>${s.last_login?formatLoginTime(s.last_login):'لم يدخل'}</td><td>${Number(s.behavior_count||0)}</td><td><button class="btn secondary" data-action="admin-reset-student" data-id="${s.student_id}" data-v1="${safeEnc(s.full_name)}">استرجاع الحساب</button></td></tr>`).join(''):'<tr><td colspan="8">لا توجد نتائج.</td></tr>';
}catch(e){$('adminStudentsTable').innerHTML=`<tr><td colspan="8">${esc(e.message||'تعذر التحميل')}</td></tr>`}}
function adminFilterValue(id){const v=$(id)?.value||'ALL';return v==='ALL'?'ALL':v.startsWith('GRADE:')?v:v.slice(6)}
async function loadAdminGrades(){
  const host=$('adminGradesTable');if(!host)return;
  const q=$('adminGradeSearch')?.value.trim()||'',selected=$('adminGradeClassFilter')?.value||'ALL';
  try{
    const students=await adminStudentsAll();
    fillAdminClassFilter(students,'adminGradeClassFilter');
    if($('adminGradeClassFilter'))$('adminGradeClassFilter').value=selected;
    const scope=adminFilterValue('adminGradeClassFilter');
    const matched=adminFilteredStudents(students,selected,q);
    const targetClasses=[...new Set(matched.map(s=>s.class_name).filter(Boolean))].sort(adminClassSort);
    // Request each class separately so grade-heavy classes never hide later classes.
    const chunks=[];
    for(let i=0;i<targetClasses.length;i+=5){
      const batch=await Promise.all(targetClasses.slice(i,i+5).map(cls=>rpc('portal_admin_grades_filtered',{p_token:adminToken,p_query:'',p_class:cls})));
      chunks.push(...batch.flat());
    }
    const ids=new Set(matched.map(s=>String(s.student_id)));
    const rows=chunks.filter(r=>ids.has(String(r.student_id)));
    const ordered=[...rows].sort((a,b)=>adminClassSort(a.class_name,b.class_name)||String(a.full_name||'').localeCompare(String(b.full_name||''),'ar',{numeric:true})||new Date(b.created_at||0)-new Date(a.created_at||0));
    const byStudent=new Map();
    for(const r of ordered){
      const id=String(r.student_id);
      if(!byStudent.has(id))byStudent.set(id,{student_id:r.student_id,full_name:r.full_name,class_name:r.class_name,username:r.username,grades:[]});
      if(r.assessment_title!=null || r.score!=null || r.max_score!=null)byStudent.get(id).grades.push(r);
    }
    const studentsList=[...byStudent.values()].sort((a,b)=>adminClassSort(a.class_name,b.class_name)||String(a.full_name||'').localeCompare(String(b.full_name||''),'ar',{numeric:true}));
    const gradeRecords=studentsList.reduce((n,s)=>n+s.grades.length,0);
    const withGrades=studentsList.filter(s=>s.grades.length>0).length;
    const assessments=new Set(studentsList.flatMap(s=>s.grades.map(g=>`${g.subject_label||'عام'}|${g.assessment_title||''}`)));
    if($('adminGradesStats'))$('adminGradesStats').innerHTML=`<div class="visit-box"><b>${studentsList.length}</b><br>طلاب في النطاق المحدد</div><div class="visit-box"><b>${withGrades}</b><br>طلاب لديهم درجات</div><div class="visit-box"><b>${gradeRecords}</b><br>سجلات الدرجات</div><div class="visit-box"><b>${assessments.size}</b><br>تقييمات مختلفة</div>`;
    host.innerHTML=studentsList.length?studentsList.map(st=>{
      const gradeHtml=st.grades.length?st.grades.map(g=>`<div style="padding:5px 0;border-bottom:1px solid var(--line,#ddd)"><b>${esc(g.subject_label||'عام')}</b> — ${esc(g.assessment_title||'تقييم')} : <b>${esc(g.score??'—')} / ${esc(g.max_score??'—')}</b>${g.note?`<div class="muted">${esc(g.note)}</div>`:''}<div class="muted">${g.created_at?formatLoginTime(g.created_at):''}</div></div>`).join(''):'<span class="muted">لا توجد درجات مسجلة بعد</span>';
      return `<tr><td><button class="link" style="border:0;background:none;cursor:pointer;font-weight:800" data-action="admin-student-profile" data-id="${st.student_id}" data-v1="${safeEnc(st.username)}">${studentName(st.full_name)}</button></td><td>${esc(st.class_name||'—')}</td><td>${gradeHtml}</td></tr>`;
    }).join(''):'<tr><td colspan="3">لا يوجد طلاب مطابقون للتصفية.</td></tr>';
  }catch(e){host.innerHTML=`<tr><td colspan="3"><div class="msg err">تعذر تحميل الدرجات: ${esc(e.message||'خطأ غير معروف')}</div></td></tr>`}
}
async function openAdminStudentProfile(studentId,usernameEnc){
  const username=decodeURIComponent(usernameEnc||'');
  const root=$('popupRoot');root.innerHTML='<div class="popup"><div class="card"><h2>جاري تحميل ملف الطالب...</h2></div></div>';
  try{
    const [students,behaviors,grades]=await Promise.all([
      rpc('portal_admin_students_filtered',{p_token:adminToken,p_query:username,p_class:'ALL'}),
      rpc('portal_admin_behavior_records',{p_token:adminToken,p_query:username}),
      rpc('portal_admin_grades_filtered',{p_token:adminToken,p_query:username,p_class:'ALL'})
    ]);
    const st=(students||[]).find(x=>Number(x.student_id)===Number(studentId))||(students||[])[0];
    if(!st)throw new Error('لم يتم العثور على ملف الطالب.');
    const br=(behaviors||[]).filter(x=>Number(x.student_id)===Number(studentId));
    const gr=(grades||[]).filter(x=>Number(x.student_id)===Number(studentId)&&(x.assessment_title!=null||x.score!=null||x.max_score!=null));
    root.innerHTML=`<div class="popup"><div class="card" style="max-width:1050px;max-height:88vh;overflow:auto"><div class="lesson-head"><div><h2>ملف الطالب: ${studentName(st.full_name)}</h2><p class="muted">الشعبة ${esc(st.class_name)} • المستخدم ${esc(st.username)}</p></div><button id="closeAdminStudentProfile" class="btn secondary">إغلاق</button></div><div class="visit-summary"><div class="visit-box"><b>${br.length}</b><br>إجمالي الإنذارات والملاحظات</div><div class="visit-box"><b>${br.filter(x=>!x.is_resolved).length}</b><br>تحتاج متابعة</div><div class="visit-box"><b>${gr.length}</b><br>سجلات الدرجات</div></div><h3>🔔 سجل الإنذارات والملاحظات</h3><div style="overflow:auto"><table><thead><tr><th>التاريخ</th><th>المعلم</th><th>الملاحظة</th><th>المستوى</th><th>التفاصيل</th><th>الإجراء</th><th>الحالة</th></tr></thead><tbody>${br.length?br.map(x=>`<tr><td>${formatLoginTime(x.created_at)}</td><td>${esc(x.teacher_name||'غير محدد')}</td><td>${esc(x.behavior_type||'')}</td><td>${esc(x.level||'')}</td><td>${esc(x.details||'')}</td><td>${esc(x.action_taken||'')}</td><td>${x.is_resolved?'تمت المعالجة':'تحتاج متابعة'}</td></tr>`).join(''):'<tr><td colspan="7">لا توجد ملاحظات مسجلة لهذا الطالب.</td></tr>'}</tbody></table></div><h3 style="margin-top:18px">📊 درجات الطالب</h3><div style="overflow:auto"><table><thead><tr><th>المادة</th><th>التقييم</th><th>الدرجة</th><th>من</th><th>ملاحظة</th><th>التاريخ</th></tr></thead><tbody>${gr.length?gr.map(g=>`<tr><td>${esc(g.subject_label||'عام')}</td><td>${esc(g.assessment_title||'')}</td><td>${esc(g.score)}</td><td>${esc(g.max_score)}</td><td>${esc(g.note||'')}</td><td>${g.created_at?formatLoginTime(g.created_at):'—'}</td></tr>`).join(''):'<tr><td colspan="6">لا توجد درجات مسجلة لهذا الطالب.</td></tr>'}</tbody></table></div></div></div>`;
    $('closeAdminStudentProfile').onclick=()=>root.innerHTML='';
  }catch(e){root.innerHTML=`<div class="popup"><div class="card"><div class="msg err">تعذر تحميل ملف الطالب: ${esc(e.message||'خطأ غير معروف')}</div><button id="closeAdminStudentProfile" class="btn secondary">إغلاق</button></div></div>`;$('closeAdminStudentProfile').onclick=()=>root.innerHTML=''}
}
$('adminGradeClassFilter')?.addEventListener('change',loadAdminGrades);
$('adminGradeSearch')?.addEventListener('input',()=>{clearTimeout(window.__adminGradeSearchTimer);window.__adminGradeSearchTimer=setTimeout(loadAdminGrades,250)});
$('adminGradesRefreshBtn')?.addEventListener('click',loadAdminGrades);
async function loadAdminTeachers(){try{const q=$('adminTeacherSearch')?.value.trim()||'';const d=await rpc('portal_admin_teachers',{p_token:adminToken,p_query:q})||[];$('adminTeachersTable').innerHTML=d.length?d.map(t=>`<tr><td>${esc(t.full_name)}</td><td>${esc(t.username)}</td><td>${t.is_active?'نشط':'موقوف'}</td><td>${Number(t.login_count||0)}</td><td>${t.last_login?formatLoginTime(t.last_login):'لم يدخل'}</td><td><button class="btn secondary" data-action="admin-reset-teacher" data-id="${t.teacher_id}" data-v1="${safeEnc(t.full_name)}">استرجاع الحساب</button></td></tr>`).join(''):'<tr><td colspan="6">لا توجد نتائج.</td></tr>'}catch(e){$('adminTeachersTable').innerHTML=`<tr><td colspan="6">${esc(e.message||'تعذر التحميل')}</td></tr>`}}
let adminBehaviorSeen=new Set(),adminBehaviorFirstLoad=true;
async function loadAdminBehavior(silent=false){try{const q=$('adminBehaviorSearch')?.value.trim()||'';const d=await rpc('portal_admin_behavior_records',{p_token:adminToken,p_query:q})||[];const fresh=d.filter(x=>!adminBehaviorSeen.has(`${x.source}-${x.record_id}`));if(adminBehaviorFirstLoad){d.forEach(x=>adminBehaviorSeen.add(`${x.source}-${x.record_id}`));adminBehaviorFirstLoad=false}else if(fresh.length&&!silent){fresh.forEach(x=>adminBehaviorSeen.add(`${x.source}-${x.record_id}`));$('adminBehaviorAlert').innerHTML=`<div class="msg err">🔔 وصل ${fresh.length} تنبيه سلوكي جديد. ${fresh.slice(0,3).map(x=>`${studentName(x.full_name)} (${esc(x.class_name)})`).join('، ')}</div>`}else{fresh.forEach(x=>adminBehaviorSeen.add(`${x.source}-${x.record_id}`))}$('adminBehaviorStats').innerHTML=`<div class="visit-box"><b>${d.length}</b><br>إجمالي الملاحظات المعروضة</div><div class="visit-box"><b>${d.filter(x=>!x.is_resolved).length}</b><br>تحتاج متابعة</div><div class="visit-box"><b>${d.filter(x=>Number(x.repeat_count||0)>=2).length}</b><br>ملاحظات لطلاب تكررت حالاتهم</div>`;$('adminBehaviorTable').innerHTML=d.length?d.map(x=>`<tr><td>${new Date(x.created_at).toLocaleString('ar-OM')}</td><td>${studentName(x.full_name)}</td><td>${esc(x.class_name)}</td><td>${esc(x.teacher_name||'المعلم غير محدد')}</td><td>${esc(x.behavior_type)}</td><td>${esc(x.level)}</td><td>${Number(x.repeat_count||0)}</td><td>${esc(x.details||'')}</td><td>${esc(x.action_taken||'')}</td><td>${x.is_resolved?'تمت المعالجة':'تحتاج متابعة'}</td></tr>`).join(''):'<tr><td colspan="10">لا توجد ملاحظات.</td></tr>'}catch(e){$('adminBehaviorTable').innerHTML=`<tr><td colspan="10">${esc(e.message||'تعذر التحميل')}</td></tr>`}}
async function adminResetAccount(kind,id,nameEnc){const name=decodeURIComponent(nameEnc);if(!confirm(`إعادة تعيين كلمة مرور ${kind==='student'?'الطالب':'المعلم'}: ${name}؟`))return;try{const fn=kind==='student'?'portal_admin_reset_student_password':'portal_admin_reset_teacher_password';const arg=kind==='student'?{p_token:adminToken,p_student_id:id,p_new_password:null}:{p_token:adminToken,p_teacher_id:id,p_new_password:null};const d=await rpc(fn,arg);const x=d?.[0];const pass=x?.temporary_password;if(!pass)throw new Error('تعذر استرجاع الحساب. تحقق من الجلسة وصلاحيات المشرف.');const user=x.username;const text=`اسم المستخدم: ${user}\nكلمة المرور المؤقتة: ${pass}`;$('popupRoot').innerHTML=`<div class="popup"><div class="card"><h2>تم إنشاء كلمة مرور مؤقتة</h2><p>أرسلها لصاحب الحساب عبر قناة آمنة. لن تظهر كلمة المرور القديمة.</p><div class="lesson-detail"><b>اسم المستخدم</b><div dir="ltr">${esc(user)}</div></div><div class="lesson-detail"><b>كلمة المرور المؤقتة</b><div dir="ltr" style="font-size:20px;font-weight:900">${esc(pass)}</div></div><div class="lesson-actions"><button id="adminCopyPass" class="btn primary">نسخ البيانات</button><button id="adminClosePass" class="btn secondary">إغلاق</button></div></div></div>`;$('adminCopyPass').onclick=async()=>{try{await navigator.clipboard.writeText(text);alert('تم نسخ البيانات')}catch(_e){prompt('انسخ البيانات:',text)}};$('adminClosePass').onclick=()=>{$('popupRoot').innerHTML=''};if(kind==='student')await loadAdminStudents();else await loadAdminTeachers()}catch(e){alert(e.message||'تعذر استرجاع الحساب')}}
$('adminRefreshBtn')?.addEventListener('click',()=>{adminAllStudentRows=null;return Promise.allSettled([loadAdminOverview(),loadAdminStudents(),loadAdminTeachers(),loadAdminBehavior(true),loadAdminGrades()])});
$('adminStudentSearch')?.addEventListener('input',()=>{clearTimeout(window.__adminStudentSearchTimer);window.__adminStudentSearchTimer=setTimeout(loadAdminStudents,250)});
$('adminStudentClassFilter')?.addEventListener('change',loadAdminStudents);
$('adminTeacherSearch')?.addEventListener('input',()=>{clearTimeout(window.__adminTeacherSearchTimer);window.__adminTeacherSearchTimer=setTimeout(loadAdminTeachers,250)});
$('adminBehaviorSearch')?.addEventListener('input',()=>{clearTimeout(window.__adminBehaviorSearchTimer);window.__adminBehaviorSearchTimer=setTimeout(()=>loadAdminBehavior(true),250)});
$('adminPassBtn')?.addEventListener('click',async()=>{const p=$('adminNewPass').value;if(p.length<12){msg('adminPassMsg','كلمة المرور يجب أن تكون 12 حرفًا على الأقل.',false);return}try{const ok=await rpc('portal_admin_change_password',{p_token:adminToken,p_new_password:p});if(!ok)throw new Error('تعذر تغيير كلمة المرور');$('adminNewPass').value='';msg('adminPassMsg','تم تغيير كلمة المرور بنجاح.')}catch(e){msg('adminPassMsg',e.message||'تعذر تغيير كلمة المرور',false)}});
$('logoutBtn').onclick=()=>secureLogout();
async function enterStudent(s,forceSubjectChoice=false){currentStudent=s;quizPoints=0;await prepareStudentContext(forceSubjectChoice);show('studentView');$('studentWelcome').textContent=`مرحبًا، ${fixStudentName(s.full_name)} 👋`;$('studentMeta').textContent=`الشعبة ${s.class_name} • اسم المستخدم ${s.username}`;$('studentPoints').textContent=fmtPoints(s.points??0);renderStudentContextBar();updateStudentBranding();await reloadStudentSubjectPanels()}
async function forcePasswordChange(){return new Promise(resolve=>{const root=$('popupRoot');root.innerHTML=`<div class="popup"><div class="card"><h2>🔒 تغيير كلمة المرور</h2><p>هذه أول مرة تدخل فيها. غيّر كلمة المرور الجديدة قبل متابعة استخدام البوابة.</p><div class="field"><input id="np1" type="password" placeholder="كلمة المرور الجديدة"></div><div class="field"><input id="np2" type="password" placeholder="تأكيد كلمة المرور"></div><div id="pm"></div><button id="saveNp" class="btn primary">حفظ والدخول</button></div></div>`;$('saveNp').onclick=async()=>{if($('np1').value.length<6||$('np1').value!==$('np2').value){msg('pm','تأكد من تطابق كلمتي المرور وأنها 6 أحرف على الأقل',false);return}const ok=await rpc('portal_student_change_password',{p_token:studentToken,p_new_password:$('np1').value});if(ok){root.innerHTML='';resolve()}else msg('pm','تعذر تغيير كلمة المرور',false)}})}
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
    const pdf=await pdfjs.getDocument({data:bytes,disableWorker:true,isEvalSupported:false}).promise;
    $('pdfPageCount').textContent=`${pdf.numPages} صفحة — مرّر للأسفل`;
    const host=$('pdfPages');
    const cssW=Math.min(1050,Math.max(300,host.clientWidth-20));
    for(let n=1;n<=pdf.numPages;n++){
      if(closed)break;
      const page=await pdf.getPage(n),base=page.getViewport({scale:1});
      const displayScale=cssW/base.width;
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
  const cards=d.map(x=>`<div class="lesson-card-pro ${x.is_current?'current':''}"><div class="lesson-head"><div><span class="badge">${x.is_current?'🟢 الدرس الحالي':'✅ درس سابق'}</span><h3 class="lesson-title-pro">${esc(x.title)}</h3><div class="muted">${esc(x.unit_title)} ${x.page_no?'• ص '+x.page_no:''} ${x.opened_before?'• فتحته '+x.open_count+' مرة':''}</div></div><span class="quick-stat">${x.section_code?esc(x.section_code):''}</span></div><div class="lesson-tools">${x.has_summary?'<span class="tool-chip">📖 ملخص</span>':''}${x.has_questions?'<span class="tool-chip">📝 أسئلة</span>':''}${x.has_experiment?'<span class="tool-chip">🧪 تجربة 3D</span>':''}${!x.has_summary&&!x.has_questions&&!x.has_experiment?'<span class="tool-chip">المحتوى قيد التجهيز</span>':''}</div>${x.objectives||x.requirements||x.teacher_note?`<div class="lesson-detail-grid">${x.objectives?`<div class="lesson-detail"><b>🎯 أهداف الدرس</b>${esc(x.objectives).replace(/\n/g,'<br>')}</div>`:''}${x.requirements?`<div class="lesson-detail"><b>📝 المطلوب</b>${esc(x.requirements).replace(/\n/g,'<br>')}</div>`:''}${x.teacher_note?`<div class="lesson-detail"><b>📚 توجيه المعلم</b>${esc(x.teacher_note).replace(/\n/g,'<br>')}</div>`:''}</div>`:''}<div class="lesson-actions"><button class="btn primary" data-action="open-lesson" data-id="${x.topic_id}" data-v1="${x.unit_no}">📖 الملخص والأسئلة</button>${x.has_experiment&&safeWebUrl(x.experiment_url)?`<a class="btn secondary" target="_blank" rel="noopener noreferrer" href="${esc(safeWebUrl(x.experiment_url))}">🧪 تجربة الدرس</a>`:''}</div></div>`).join('');
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
  $('planClass').innerHTML=`<option value="ALL">🌐 كل الشعب (${classes.map(esc).join(' • ')})</option>`+classes.map(c=>`<option>${c}</option>`).join('');
  $('planTopic').innerHTML=topics.length?topics.map(t=>`<option value="${t.id}">${esc(t.section_code||'')} ${t.section_code?'— ':''}${esc(t.title)}${t.page_no?' (ص '+t.page_no+')':''}</option>`).join(''):'<option value="">أضف درسًا أولًا</option>';
  if(!topics.length){['planObjectives','planRequirements','planNote','planExpTitle','planExpUrl'].forEach(id=>{if($(id))$(id).value=''});return}
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
$('planStatsBtn')&&($('planStatsBtn').onclick=async()=>{const topicId=Number($('planTopic').value),cls=$('planClass').value;if(!topicId){$('planStats').innerHTML='<div class="muted">أضف درسًا أولًا.</div>';return}$('planStats').innerHTML='<div class="muted">جاري تحميل الإحصائية...</div>';const [v,n]=await Promise.all([rpc('portal_teacher_lesson_visits',{p_token:teacherToken,p_topic_id:topicId,p_class:cls}),rpc('portal_teacher_lesson_nonvisitors',{p_token:teacherToken,p_topic_id:topicId,p_class:cls})]);const total=(v?.length||0)+(n?.length||0),pct=total?Math.round((v.length/total)*100):0;$('planStats').innerHTML=`<div class="visit-summary"><div class="visit-box"><b>${v?.length||0}</b><br>دخلوا</div><div class="visit-box"><b>${n?.length||0}</b><br>لم يدخلوا</div><div class="visit-box"><b>${pct}%</b><br>نسبة الدخول</div></div><h3>✅ دخلوا الدرس</h3>${v?.length?`<div style="overflow:auto"><table class="eng-table"><thead><tr><th>الطالب</th><th>آخر دخول</th><th>مرات الفتح</th></tr></thead><tbody>${v.map(x=>`<tr><td>${studentName(x.full_name)}</td><td>${new Date(x.last_opened_at).toLocaleString('ar')}</td><td>${x.open_count}</td></tr>`).join('')}</tbody></table></div>`:'<div class="muted">لم يدخل أحد بعد.</div>'}<h3>⏳ لم يدخلوا بعد</h3>${n?.length?`<div class="grid">${n.map(x=>`<div class="item"><b>${studentName(x.full_name)}</b><div class="muted">${esc(x.username)}</div></div>`).join('')}</div>`:'<div class="msg ok">كل الطلاب دخلوا الدرس ✅</div>'}`});

async function loadStudentExperiments(){
  const d=await rpc('portal_student_experiments',{p_token:studentToken});
  $('labList').innerHTML=d?.length?d.map(e=>{const u=safeWebUrl(e.experiment_url);return `<div class="item"><span class="badge">3D</span><h3>${esc(e.title)}</h3>${e.description?`<p>${esc(e.description)}</p>`:''}<div class="inline-actions">${u?`<button class="btn primary" data-action="open-experiment" data-id="${e.id}" data-v1="${safeEnc(u)}" data-v2="${safeEnc(e.title)}">▶️ بدء التجربة</button><a class="btn secondary" target="_blank" rel="noopener noreferrer" href="${esc(u)}">فتح في تبويب جديد</a>`:'<span class="msg err">رابط التجربة غير صالح.</span>'}</div></div>`}).join(''):'<div class="muted">لا توجد تجارب متاحة لك حاليًا.</div>';
}
window.openExperiment=(id,urlEnc,titleEnc)=>{const url=safeWebUrl(decodeURIComponent(urlEnc)),title=decodeURIComponent(titleEnc);if(!url){alert('رابط التجربة غير صالح.');return}$('popupRoot').innerHTML=`<div class="popup"><div class="iframe-wrap"><div class="iframe-bar"><b style="flex:1">🧪 ${esc(title)}</b><button id="restartExp" class="btn secondary">↻ إعادة من البداية</button><button id="closeExp" class="btn danger">إغلاق</button></div><iframe id="expFrame" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock" src="${esc(url)}" allow="fullscreen; accelerometer; gyroscope" allowfullscreen></iframe></div></div>`;$('closeExp').onclick=()=>$('popupRoot').innerHTML='';$('restartExp').onclick=()=>{$('expFrame').src='about:blank';setTimeout(()=>$('expFrame').src=url,80)}};

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
function bankStoreKey(id){return `portal-bank-${currentStudent?.username||'student'}-${studentSubjectCode||'chemistry'}-${id}`}
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
  $('teacherExperimentList').innerHTML=d?.length?d.map(e=>{const u=safeWebUrl(e.experiment_url);return `<div class="item"><span class="badge ${e.is_visible?'state-on':'state-off'}">${e.is_visible?'ظاهر للطلاب':'مخفي'}</span> <span class="badge">${e.target_class==='ALL'?'كل الصفوف':esc(e.target_class)}</span><h3>${esc(e.title)}</h3>${e.description?`<p>${esc(e.description)}</p>`:''}<div class="inline-actions"><button class="btn ${e.is_visible?'secondary':'primary'}" data-action="toggle-experiment" data-id="${e.id}" data-bool="${!e.is_visible}">${e.is_visible?'🙈 إخفاء عن الطلاب':'👁️ إظهار للطلاب'}</button>${u?`<button class="btn secondary" data-action="preview-teacher-experiment" data-id="${e.id}" data-v1="${safeEnc(u)}" data-v2="${safeEnc(e.title)}">▶️ فتح التجربة</button>`:'<span class="badge state-off">رابط غير صالح</span>'}<button class="btn danger" data-action="delete-experiment" data-id="${e.id}">حذف</button></div></div>`}).join(''):'<div class="muted">لم تضف تجارب 3D بعد.</div>';
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
  const html=topics.length?topics.map(t=>`<option value="${t.id}">الوحدة ${t.unit_no} — ${esc(t.title)}${t.page_no?' (ص '+t.page_no+')':''}</option>`).join(''):'<option value="">أضف درسًا أولًا</option>';
  if($('studyTopic'))$('studyTopic').innerHTML=html;if($('engTopic'))$('engTopic').innerHTML=html;
}
async function loadTeacherStudyMaterials(){
  const d=await rpc('portal_teacher_lesson_materials',{p_token:teacherToken,p_topic_id:null});
  $('teacherStudyList').innerHTML=d?.length?d.map(m=>`<div class="item"><span class="badge">${m.material_type==='summary'?'📖 ملخص':'📝 أسئلة'}</span> <span class="badge">${m.target_class==='ALL'?'كل الصفوف':esc(m.target_class)}</span> <span class="badge ${m.is_visible?'state-on':'state-off'}">${m.is_visible?'ظاهر':'مخفي'}</span><h3>${esc(m.topic_title)} — ${esc(m.title)}</h3>${m.attachment_name?`<div class="muted">📎 ${esc(m.attachment_name)}</div>`:''}<div class="material-actions"><button class="btn ${m.is_visible?'secondary':'primary'}" data-action="toggle-study-material" data-id="${m.id}" data-bool="${!m.is_visible}">${m.is_visible?'🙈 إخفاء':'👁️ إظهار للطلاب'}</button><button class="btn danger" data-action="delete-study-material" data-id="${m.id}">حذف</button></div></div>`).join(''):'<div class="muted">لم تضف ملخصات أو أسئلة بعد.</div>';
}
$('studyAddBtn').onclick=async()=>{try{$('studyAddBtn').disabled=true;msg('studyMsg','جاري تجهيز الملف...');const f=await prepareStudyFile($('studyFile').files?.[0]);const type=$('studyType').value;const topic=topics.find(t=>t.id===Number($('studyTopic').value));const typeLabels={summary:'ملخص',questions:'أسئلة',activity_solution:'حل كتاب النشاط وأوراق العمل',studentbook_solution:'حل كتاب الطالب'};const defaultTitle=`${typeLabels[type]||'محتوى'} ${topic?.title||'الدرس'}`;const id=await rpc('portal_teacher_add_lesson_material',{p_token:teacherToken,p_topic_id:Number($('studyTopic').value),p_material_type:type,p_title:$('studyTitle').value.trim()||defaultTitle,p_note:$('studyNote').value,p_attachment_data:f.data,p_attachment_name:f.name,p_attachment_mime:f.mime,p_target_class:$('studyClass').value,p_is_visible:$('studyVisible').checked});if(!id)throw new Error('تعذر حفظ المحتوى');$('studyTitle').value='';$('studyNote').value='';$('studyFile').value='';$('studyVisible').checked=false;msg('studyMsg','تم حفظ المحتوى ✅');await loadTeacherStudyMaterials()}catch(e){msg('studyMsg',e.message,false)}finally{$('studyAddBtn').disabled=false}};
window.toggleStudyMaterial=async(id,v)=>{const ok=await rpc('portal_teacher_set_lesson_material_visibility',{p_token:teacherToken,p_material_id:id,p_is_visible:v});if(ok)await loadTeacherStudyMaterials()};
window.deleteStudyMaterial=async id=>{if(!confirm('حذف هذا المحتوى؟'))return;const ok=await rpc('portal_teacher_delete_lesson_material',{p_token:teacherToken,p_material_id:id});if(ok)await loadTeacherStudyMaterials()};
$('engLoadBtn').onclick=async()=>{const topicId=Number($('engTopic').value),cls=$('engClass').value;if(!topicId){$('engResults').innerHTML='<div class="muted">أضف درسًا أولًا.</div>';return}$('engResults').innerHTML='<div class="muted">جاري تحميل الإحصائية...</div>';const [v,n]=await Promise.all([rpc('portal_teacher_lesson_visits',{p_token:teacherToken,p_topic_id:topicId,p_class:cls}),rpc('portal_teacher_lesson_nonvisitors',{p_token:teacherToken,p_topic_id:topicId,p_class:cls})]);const total=(v?.length||0)+(n?.length||0);$('engResults').innerHTML=`<div class="visit-summary"><div class="visit-box"><b>${v?.length||0}</b><br>دخلوا الدرس</div><div class="visit-box"><b>${n?.length||0}</b><br>لم يدخلوا</div><div class="visit-box"><b>${total?Math.round((v.length/total)*100):0}%</b><br>نسبة الدخول</div></div><h3>✅ الطلاب الذين دخلوا</h3>${v?.length?`<div style="overflow:auto"><table class="eng-table"><thead><tr><th>الطالب</th><th>الشعبة</th><th>أول دخول</th><th>آخر دخول</th><th>مرات الفتح</th></tr></thead><tbody>${v.map(x=>`<tr><td>${studentName(x.full_name)}</td><td>${esc(x.class_name)}</td><td>${new Date(x.first_opened_at).toLocaleString('ar')}</td><td>${new Date(x.last_opened_at).toLocaleString('ar')}</td><td>${x.open_count}</td></tr>`).join('')}</tbody></table></div>`:'<div class="muted">لم يدخل أحد بعد.</div>'}<h3>⏳ لم يدخلوا بعد</h3>${n?.length?`<div class="grid">${n.map(x=>`<div class="item"><b>${studentName(x.full_name)}</b><div class="muted">${esc(x.class_name)} • ${esc(x.username)}</div></div>`).join('')}</div>`:'<div class="msg ok">كل الطلاب المستهدفين دخلوا الدرس ✅</div>'}`;};

async function searchRecoveryStudents(){
  try{
    const q=($('recoveryQuery').value||'').trim();
    if(q.length<2){msg('recoveryMsg','اكتب حرفين على الأقل من اسم الطالب أو اسم المستخدم.',false);return}
    $('recoverySearchBtn').disabled=true;msg('recoveryMsg','جاري البحث...');$('recoveryResults').innerHTML='';
    let d;if(!isPrimaryTeacher()&&$('recoveryClass').value==='ALL'){const chunks=await Promise.all(classes.map(c=>rpc('portal_teacher_find_student_account',{p_token:teacherToken,p_query:q,p_class:c})));const by=new Map();chunks.flat().forEach(x=>by.set(x.student_id,x));d=[...by.values()]}else d=await rpc('portal_teacher_find_student_account',{p_token:teacherToken,p_query:q,p_class:$('recoveryClass').value});
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
  if(!confirm('سيتم إلغاء جلسات الطالب الحالية وتثبيت كلمة المرور الجديدة مباشرة. متابعة؟'))return;
  try{
    const d=await rpc('portal_teacher_reset_student_password',{p_token:teacherToken,p_student_id:id,p_new_password:custom||null});
    const x=d?.[0]; if(!x?.temporary_password)throw new Error('تعذر إعادة تعيين كلمة المرور');
    const text=`اسم المستخدم: ${x.username}\nكلمة المرور الجديدة: ${x.temporary_password}`;
    const root=$('popupRoot');root.innerHTML=`<div class="popup"><div class="card"><span class="badge">تم الاسترجاع بنجاح</span><h2>🔐 بيانات دخول ${studentName(x.full_name)}</h2><div class="lesson-detail-grid"><div class="lesson-detail"><b>اسم المستخدم</b><div style="font-size:22px;font-weight:900;direction:ltr">${esc(x.username)}</div></div><div class="lesson-detail"><b>كلمة المرور الجديدة</b><div style="font-size:22px;font-weight:900;direction:ltr">${esc(x.temporary_password)}</div></div></div><p class="muted">هذه هي كلمة المرور الجديدة للطالب، ولن يُطلب منه تغييرها بعد تسجيل الدخول.</p><div class="lesson-actions"><button id="copyRecoveryData" class="btn primary">📋 نسخ البيانات</button><button id="closeRecoveryPopup" class="btn secondary">إغلاق</button></div></div></div>`;
    $('copyRecoveryData').onclick=async()=>{try{await navigator.clipboard.writeText(text);alert('تم نسخ بيانات الدخول ✅')}catch(e){prompt('انسخ البيانات:',text)}};
    $('closeRecoveryPopup').onclick=()=>root.innerHTML='';
  }catch(e){alert(e.message||'تعذر إعادة التعيين')}
};
$('recoverySearchBtn')&&($('recoverySearchBtn').onclick=searchRecoveryStudents);
$('recoveryQuery')&&($('recoveryQuery').onkeydown=e=>{if(e.key==='Enter')searchRecoveryStudents()});

async function refreshBehaviorStudents(){
  const cls=$('behaviorClass').value||'9/1';
  const d=await rpc('portal_teacher_students_v2',{p_token:teacherToken,p_subject_code:teacherSubjectCode,p_class:cls});
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

async function reloadTeacherSubjectPanels(){
  topics=await rpc('portal_teacher_topics',{p_token:teacherToken})||[];
  fillStudyTopicSelects();
  await initLessonPlanEditor();
  ensureTeacherTopicManager();ensureTeacherSubjectVideoUI();
  await loadManagedTeacherTopics().catch(()=>{managedTopics=[];renderTeacherTopicManager()});
  const tasks=[loadOverview,loadProgressCards,loadTeacherAnnouncements,loadTeacherContent,loadTeacherQuestions,()=>loadStudents('ALL'),loadTeacherExperiments,loadTeacherBank,loadTeacherEssaySubmissions,loadTeacherStudyMaterials,refreshStudentSelects];
  await Promise.allSettled(tasks.map(fn=>Promise.resolve().then(fn)));
  await loadTeacherSubjectVideos().catch(()=>{});
  if($('behaviorClass'))await Promise.resolve().then(refreshBehaviorStudents).then(loadBehaviorRecords).catch(e=>console.warn('Behavior panel unavailable',e));
  if($('loginTable'))loadStudentLogins().catch(()=>{});
}

async function enterTeacher(){
  show('teacherView');$('topSub').textContent='جاري تحميل تكليفات المعلم...';
  await prepareTeacherContext();
  if(isPrimaryTeacher()&&teacherSubjectCode==='chemistry'){
    try{await rpc('portal_teacher_mt_migrate_legacy_chemistry',{p_token:teacherToken});await rpc('portal_teacher_mt_repair_legacy_chemistry_logins',{p_token:teacherToken})}catch(e){alert('تعذر تجهيز بيانات الكيمياء في النظام الجديد. بياناتك القديمة لم تتغير.\n\nسبب الخطأ:\n'+(e?.message||String(e)));throw e}
  }
  $('topSub').textContent=`${subjectDisplayName(teacherSubjectCode,teacherSubjectName)} — ${classes.join(' • ')}`;renderTeacherContextBar();updateTeacherBranding();
  if(!isPrimaryTeacher())applyTeacherSafeMode();
  await reloadTeacherSubjectPanels();
}
async function loadOverview(){
  const d=await rpc('portal_teacher_overview',{p_token:teacherToken});const o=d?.[0]||{};
  $('teacherStats').innerHTML=`<div class="stat"><b>${o.total_students??0}</b>طالب</div><div class="stat"><b>${o.new_questions??0}</b>سؤال جديد</div><div class="stat"><b>${o.announcements??0}</b>إعلان</div><div class="stat"><b>${o.content_items??0}</b>محتوى منشور</div>`;
  if($('todaySummary'))$('todaySummary').innerHTML=`أنت الآن في <b>${esc(subjectDisplayName(teacherSubjectCode,teacherSubjectName))}</b> — ${classes.map(esc).join(' • ')}. عندك <b>${o.new_questions??0}</b> سؤال جديد و<b>${o.content_items??0}</b> محتوى منشور.`;
}

async function loadProgressCards(){if(!$('progressCards'))return;if(!topics.length){$('progressCards').innerHTML='<div class="msg ok">أضف دروس المادة أولًا من «إدارة دروسي»، وبعدها حدد أين وصلت كل شعبة.</div>';return}const p=await rpc('portal_teacher_progress',{p_token:teacherToken})||[];$('progressCards').innerHTML=classes.map(c=>{const x=p.find(v=>v.class_name===c);return `<div class="class-card"><strong>${c}</strong><div class="muted" style="margin:6px 0">${x?.topic_title?esc(x.topic_title):'لم يحدد بعد'} ${x?.page_no?'— ص '+x.page_no:''}</div><select id="tp-${c.replace('/','-')}" style="width:100%;padding:9px;border-radius:10px;border:1px solid #cfe2df">${topics.map(t=>`<option value="${t.id}" ${Number(x?.topic_id)===Number(t.id)?'selected':''}>${esc(t.section_code||'')} ${t.section_code?'— ':''}${esc(t.title)}${t.page_no?' (ص '+t.page_no+')':''}</option>`).join('')}</select><input id="tn-${c.replace('/','-')}" value="${esc(x?.note||'')}" placeholder="ملاحظة اختيارية" style="width:100%;padding:9px;margin:7px 0;border:1px solid #cfe2df;border-radius:10px"><button class="btn primary" data-action="save-progress" data-v1="${safeEnc(c)}">حفظ التقدم</button></div>`}).join('')}
window.saveProgress=async c=>{const key=c.replace('/','-'),sel=$('tp-'+key);if(!sel?.value){alert('أضف درسًا أولًا.');return}const ok=await rpc('portal_teacher_set_progress',{p_token:teacherToken,p_class:c,p_topic_id:Number(sel.value),p_note:$('tn-'+key).value});if(ok){await loadProgressCards();alert('تم حفظ تقدم '+c+' ✅')}};
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
  const entryLabel='دخلوا المادة';$('loginStats').innerHTML=`<div class="visit-box"><b>${entered}</b><br>${entryLabel}</div><div class="visit-box"><b>${notYet}</b><br>لم يدخلوا</div><div class="visit-box"><b>${total}</b><br>إجمالي الطلاب</div><div class="visit-box"><b>${totalLogins}</b><br>إجمالي مرات دخول المادة</div>`;
  $('loginTable').innerHTML=rows.length?rows.map(x=>`<tr><td>${x.has_logged_in?'<span class="badge state-on">🟢 دخل</span>':'<span class="badge state-off">⚪ لم يدخل</span>'}</td><td>${studentName(x.full_name)}</td><td>${esc(x.class_name)}</td><td>${esc(x.username)}</td><td>${x.has_logged_in?formatLoginTime(x.last_login):'—'}</td><td>${x.login_count??0}</td></tr>`).join(''):'<tr><td colspan="6" class="muted">لا توجد نتائج.</td></tr>';
}
async function loadStudentLogins(){
  if(!$('loginTable'))return;
  const loginSec=$('loginTable').closest('.section');const loginTitle=loginSec?.querySelector('h2');if(loginTitle)loginTitle.textContent='👁️ دخول الطلاب للمادة';
  $('loginTable').innerHTML='<tr><td colspan="6" class="muted">جاري تحديث بيانات الدخول...</td></tr>';
  try{const lc=$('loginClass')?.value||'ALL';studentLoginRows=await rpc('portal_teacher_mt_subject_logins',{p_token:teacherToken,p_subject_code:teacherSubjectCode||'chemistry',p_class:lc})||[];renderStudentLogins()}
  catch(e){$('loginTable').innerHTML=`<tr><td colspan="6"><div class="msg bad">تعذر تحميل سجل الدخول: ${esc(e.message||'خطأ غير معروف')}</div></td></tr>`}
}
$('loginLoadBtn')&&($('loginLoadBtn').onclick=loadStudentLogins);
$('loginClass')&&($('loginClass').onchange=loadStudentLogins);
$('loginSearch')&&($('loginSearch').oninput=renderStudentLogins);
const loginNavBtn=$('teacherNav')?.querySelector('[data-sec="t-logins"]');
loginNavBtn&&loginNavBtn.addEventListener('click',()=>{if(!studentLoginRows.length)loadStudentLogins()});
function renderStudentsTable(){const q=($('studentSearch')?.value||'').trim().toLowerCase();const list=!q?allStudents:allStudents.filter(s=>String(s.full_name).toLowerCase().includes(q)||String(s.username).toLowerCase().includes(q));$('studentsTable').innerHTML=list.map(s=>`<tr><td>${studentName(s.full_name)}</td><td>${esc(s.class_name)}</td><td>${esc(s.username)}</td><td>${s.points}</td><td><button class="btn secondary" data-action="edit-student-name" data-id="${s.id}" data-v1="${safeEnc(s.full_name)}">✏️ تعديل الاسم</button> <button class="btn secondary" data-action="move-student" data-id="${s.id}" data-v1="${safeEnc(s.full_name)}" data-v2="${safeEnc(s.class_name)}">🔄 نقل الشعبة</button> <button class="btn danger" data-action="delete-student" data-id="${s.id}" data-v1="${safeEnc(s.full_name)}">🗑️ حذف الطالب</button></td></tr>`).join('');if($('studentSearchCount'))$('studentSearchCount').textContent=`النتائج: ${list.length} طالب`;}
async function loadStudents(c='ALL'){allStudents=await rpc('portal_teacher_students_v2',{p_token:teacherToken,p_subject_code:teacherSubjectCode,p_class:c});renderStudentsTable()}
$('studentFilter').onchange=()=>loadStudents($('studentFilter').value);$('studentSearch').oninput=renderStudentsTable;
async function refreshStudentSelects(){const c=$('gradeClass').value||'9/1';const d=await rpc('portal_teacher_students_v2',{p_token:teacherToken,p_subject_code:teacherSubjectCode,p_class:c});$('gradeStudent').innerHTML=d.map(s=>`<option value="${s.id}">${studentName(s.full_name)}</option>`).join('');const pc=$('pointsClass').value||'9/1';const p=await rpc('portal_teacher_points_overview',{p_token:teacherToken,p_class:pc});$('pointsStudent').innerHTML=p.map(s=>`<option value="${s.student_id}">${studentName(s.full_name)} — ${fmtPoints(s.total_points)} نقطة</option>`).join('');if($('pointsRanking')){const sorted=[...p].sort((a,b)=>Number(b.total_points||0)-Number(a.total_points||0));$('pointsRanking').innerHTML=sorted.length?`<div style="overflow:auto"><table><thead><tr><th>#</th><th>الطالب</th><th>الشعبة</th><th>نقاط المعلم</th><th>نقاط الأسئلة</th><th>المجموع</th></tr></thead><tbody>${sorted.map((s,i)=>`<tr><td>${i+1}</td><td>${studentName(s.full_name)}</td><td>${esc(s.class_name)}</td><td>${fmtPoints(s.base_points)}</td><td>+${fmtPoints(s.quiz_points)}</td><td><b>⭐ ${fmtPoints(s.total_points)}</b></td></tr>`).join('')}</tbody></table></div>`:'<div class="muted">لا يوجد طلاب.</div>'}}
$('gradeClass').onchange=refreshStudentSelects;$('pointsClass').onchange=refreshStudentSelects;
$('gradeAddBtn').onclick=async()=>{try{const id=await rpc('portal_teacher_add_grade',{p_token:teacherToken,p_student_id:Number($('gradeStudent').value),p_title:$('gradeTitle').value,p_score:Number($('gradeScore').value),p_max_score:Number($('gradeMax').value),p_note:$('gradeNote').value});if(!id)throw new Error('تحقق من البيانات');msg('gradeMsg','تم حفظ الدرجة ✅');$('gradeScore').value='';$('gradeNote').value=''}catch(e){msg('gradeMsg',e.message,false)}};
let gradeReportRows=[];
async function loadGradeReport(){
  if(!$('gradeReportTable'))return;
  $('gradeReportTable').innerHTML='<tr><td colspan="6" class="muted">جاري تحميل الدرجات...</td></tr>';
  try{
    const cls=$('gradeReportClass')?.value||'ALL';
    const d=await rpc('portal_teacher_grade_report',{p_token:teacherToken,p_class:cls,p_assessment:'ALL'});
    gradeReportRows=d||[];
    const assessments=[...new Set(gradeReportRows.map(x=>String(x.assessment_title||'')).filter(Boolean))].sort();
    const sel=$('gradeReportAssessment');
    const keep=sel?.value||'ALL';
    if(sel){sel.innerHTML='<option value="ALL">كل التقييمات</option>'+assessments.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');if([...sel.options].some(o=>o.value===keep))sel.value=keep}
    renderGradeReport();
  }catch(e){$('gradeReportTable').innerHTML=`<tr><td colspan="6"><div class="msg err">تعذر تحميل الدرجات: ${esc(e.message||'خطأ غير معروف')}</div></td></tr>`}
}
function renderGradeReport(){
  if(!$('gradeReportTable'))return;
  const assessment=$('gradeReportAssessment')?.value||'ALL';
  const rows=assessment==='ALL'?gradeReportRows:gradeReportRows.filter(x=>String(x.assessment_title||'')===assessment);
  const scores=rows.map(x=>Number(x.score)).filter(Number.isFinite),avg=scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length):0;
  if($('gradeReportStats'))$('gradeReportStats').innerHTML=`<div class="visit-box"><b>${rows.length}</b><br>درجة مسجلة</div><div class="visit-box"><b>${scores.length?avg.toFixed(1):'—'}</b><br>متوسط الدرجات</div><div class="visit-box"><b>${new Set(rows.map(x=>x.student_id)).size}</b><br>طالب</div>`;
  if($('gradeReportDistribution'))$('gradeReportDistribution').innerHTML='';
  $('gradeReportTable').innerHTML=rows.length?rows.map(x=>`<tr><td>${studentName(x.full_name)}</td><td>${esc(x.class_name)}</td><td>${esc(x.assessment_title)}</td><td>${esc(x.score)}</td><td>${esc(x.max_score)}</td><td>${esc(x.note||'')}</td></tr>`).join(''):'<tr><td colspan="6" class="muted">لا توجد درجات مطابقة.</td></tr>';
}
$('gradeReportLoadBtn')&&($('gradeReportLoadBtn').onclick=loadGradeReport);
$('gradeReportClass')&&($('gradeReportClass').onchange=()=>{gradeReportRows=[];if($('gradeReportAssessment'))$('gradeReportAssessment').innerHTML='<option value="ALL">كل التقييمات</option>'});
$('gradeReportAssessment')&&($('gradeReportAssessment').onchange=renderGradeReport);

const GRADEBOOK_SLOTS={
  hw1:['واجب 1','واجب1','الواجب الأول','الواجب الاول','واجب منزلي 1','الواجب المنزلي الأول','الواجب المنزلي الاول'],
  hw2:['واجب 2','واجب2','الواجب الثاني','واجب منزلي 2','الواجب المنزلي الثاني'],
  oral1:['حوار شفوي 1','الحوار الشفوي الأول','الحوار الشفوي الاول','شفوي 1','شفوي الأول','شفوي الاول'],
  oral2:['حوار شفوي 2','الحوار الشفوي الثاني','شفوي 2','شفوي الثاني'],
  practical:['النشاط العملي','نشاط عملي','عملي'],
  quiz1:['اختبار قصير 1','اختبار قصير الأول','اختبار قصير الاول','الاختبار القصير الأول','الاختبار القصير الاول','الاختبار الأول','الاختبار الاول'],
  quiz2:['اختبار قصير 2','اختبار قصير الثاني','الاختبار القصير الثاني','الاختبار الثاني'],
  final:['امتحان نهاية الفصل','اختبار نهاية الفصل','الامتحان النهائي','الاختبار النهائي','نهائي']
};
const GRADEBOOK_META={
  hw1:{title:'واجب 1',max:5},hw2:{title:'واجب 2',max:5},
  oral1:{title:'حوار شفوي 1',max:5},oral2:{title:'حوار شفوي 2',max:5},
  practical:{title:'النشاط العملي',max:10},
  quiz1:{title:'اختبار قصير 1',max:15},quiz2:{title:'اختبار قصير 2',max:15},
  final:{title:'امتحان نهاية الفصل',max:40}
};
let gradebookDirty=new Map();
let gradebookExisting=new Map();
function gradebookNorm(v){return String(v||'').trim().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/\s+/g,' ')}
function gradebookSlot(title){const n=gradebookNorm(title);for(const [k,names] of Object.entries(GRADEBOOK_SLOTS)){if(names.some(x=>gradebookNorm(x)===n))return k}return null}
function gradebookLevel(p){if(p==null)return '—';if(p>=90)return 'ممتاز';if(p>=80)return 'جيد جدًا';if(p>=70)return 'جيد';if(p>=60)return 'مقبول';return 'يحتاج متابعة'}
function gradebookInput(studentId,slot,value){const m=GRADEBOOK_META[slot];return `<input class="gradebook-input" type="number" inputmode="decimal" min="0" max="${m.max}" step="0.5" data-gb-student="${studentId}" data-gb-slot="${slot}" value="${value==null?'':esc(value)}" placeholder="—" style="width:68px;padding:7px 5px;text-align:center;border:1px solid #cfe2df;border-radius:9px;background:#fff">`}
function gbNum(el){if(!el||el.value==='')return null;const n=Number(el.value);return Number.isFinite(n)?n:null}
function recalcGradebookRow(tr){if(!tr)return;const get=k=>gbNum(tr.querySelector(`[data-gb-slot="${k}"]`));const sum=(...xs)=>xs.every(x=>x==null)?null:xs.reduce((a,x)=>a+(x==null?0:x),0);const hw=sum(get('hw1'),get('hw2')),oral=sum(get('oral1'),get('oral2')),quiz=sum(get('quiz1'),get('quiz2')),course=sum(hw,oral,get('practical'),quiz),grand=sum(course,get('final')),pct=grand==null?null:Math.max(0,Math.min(100,grand));const put=(k,v)=>{const x=tr.querySelector(`[data-gb-total="${k}"]`);if(x)x.textContent=v==null?'—':(Number(v)%1?Number(v).toFixed(1):String(Number(v)))};put('hw',hw);put('oral',oral);put('quiz',quiz);put('course',course);put('grand',grand);put('level',gradebookLevel(pct));put('pct',pct==null?'—':pct.toFixed(1)+'%')}
async function loadGradebook(){
  if(!$('gradebookTable'))return;
  gradebookDirty.clear();
  gradebookExisting.clear();
  const cls=$('gradebookClass')?.value||'9/1';$('gradebookTable').innerHTML='<tr><td colspan="17" class="muted">جاري تجهيز سجل الدرجات...</td></tr>';
  try{
    const [students,grades]=await Promise.all([rpc('portal_teacher_students_v2',{p_token:teacherToken,p_subject_code:teacherSubjectCode,p_class:cls}),rpc('portal_teacher_grade_report',{p_token:teacherToken,p_class:cls,p_assessment:'ALL'})]);
    const byStudent=new Map();(grades||[]).forEach(g=>{const slot=gradebookSlot(g.assessment_title);if(!slot)return;const id=Number(g.student_id),cur=byStudent.get(id)||{};const prev=cur[slot];if(!prev||new Date(g.created_at||0)>=new Date(prev.created_at||0))cur[slot]=g;byStudent.set(id,cur)});byStudent.forEach((slots,studentId)=>Object.entries(slots).forEach(([slot,g])=>{if(g?.grade_id!=null||g?.id!=null)gradebookExisting.set(studentId+':'+slot,{gradeId:Number(g.grade_id??g.id),title:String(g.assessment_title||'')})}));
    const rows=(students||[]).map((st,i)=>{const g=byStudent.get(Number(st.id))||{},v=k=>g[k]?Number(g[k].score):null;const hw1=v('hw1'),hw2=v('hw2'),oral1=v('oral1'),oral2=v('oral2'),pr=v('practical'),q1=v('quiz1'),q2=v('quiz2'),fin=v('final');const sum=(...xs)=>xs.every(x=>x==null)?null:xs.reduce((a,x)=>a+(x==null?0:x),0),hw=sum(hw1,hw2),oral=sum(oral1,oral2),quiz=sum(q1,q2),course=sum(hw,oral,pr,quiz),grand=sum(course,fin),pct=grand==null?null:Math.max(0,Math.min(100,grand));return `<tr data-gb-row="${st.id}"><td>${i+1}</td><td>${studentName(st.full_name)}</td><td>${gradebookInput(st.id,'hw1',hw1)}</td><td>${gradebookInput(st.id,'hw2',hw2)}</td><td class="gradebook-total" data-gb-total="hw">${hw??'—'}</td><td>${gradebookInput(st.id,'oral1',oral1)}</td><td>${gradebookInput(st.id,'oral2',oral2)}</td><td class="gradebook-total" data-gb-total="oral">${oral??'—'}</td><td>${gradebookInput(st.id,'practical',pr)}</td><td>${gradebookInput(st.id,'quiz1',q1)}</td><td>${gradebookInput(st.id,'quiz2',q2)}</td><td class="gradebook-total" data-gb-total="quiz">${quiz??'—'}</td><td class="gradebook-total" data-gb-total="course">${course??'—'}</td><td>${gradebookInput(st.id,'final',fin)}</td><td class="gradebook-grand" data-gb-total="grand">${grand??'—'}</td><td data-gb-total="level">${esc(gradebookLevel(pct))}</td><td data-gb-total="pct">${pct==null?'—':esc(pct.toFixed(1)+'%')}</td></tr>`});
    $('gradebookTable').innerHTML=rows.length?rows.join(''):'<tr><td colspan="17" class="muted">لا يوجد طلاب في هذه الشعبة.</td></tr>';
    if($('gradebookStats'))$('gradebookStats').innerHTML=`<div class="visit-box"><b>${students?.length||0}</b><br>طالب في ${esc(cls)}</div><div class="visit-box"><b>${grades?.length||0}</b><br>درجة مسجلة</div><div class="visit-box"><b>${new Set((grades||[]).map(x=>x.assessment_title)).size}</b><br>تقييم مختلف</div>`;
    if($('gradebookMsg'))$('gradebookMsg').innerHTML='<div class="msg ok">اضغط على أي خانة بيضاء واكتب الدرجة، ثم اضغط «💾 حفظ الدرجات».</div><button id="gradebookSaveBtn" class="btn primary" style="margin-top:8px">💾 حفظ الدرجات</button>';
    $('gradebookSaveBtn')?.addEventListener('click',saveGradebookChanges);
  }catch(e){$('gradebookTable').innerHTML=`<tr><td colspan="17"><div class="msg err">تعذر تحميل السجل: ${esc(e.message||'خطأ غير معروف')}</div></td></tr>`}
}
async function saveGradebookChanges(){const btn=$('gradebookSaveBtn');if(!gradebookDirty.size){alert('ما عدلت أي درجة بعد.');return}try{btn.disabled=true;btn.textContent='جاري الحفظ...';for(const x of gradebookDirty.values()){const m=GRADEBOOK_META[x.slot],key=x.studentId+':'+x.slot,existing=gradebookExisting.get(key);if(x.value<0||x.value>m.max)throw new Error(`${m.title}: الدرجة يجب أن تكون من 0 إلى ${m.max}`);if(existing?.gradeId){const ok=await rpc('portal_teacher_update_grade_value',{p_token:teacherToken,p_grade_id:existing.gradeId,p_score:x.value});if(!ok)throw new Error('تعذر تحديث الدرجة الموجودة')}else{const id=await rpc('portal_teacher_add_grade',{p_token:teacherToken,p_student_id:x.studentId,p_title:m.title,p_score:x.value,p_max_score:m.max,p_note:''});if(!id)throw new Error('تعذر إضافة الدرجة')}}gradebookDirty.clear();await loadGradebook();alert('تم تحديث الدرجات مباشرة بدون إنشاء نسخ مكررة ✅')}catch(e){alert(e.message||'تعذر حفظ الدرجات')}finally{if(btn){btn.disabled=false;btn.textContent='💾 حفظ الدرجات'}}}
if($('gradebookClass'))$('gradebookClass').innerHTML=classes.map(c=>`<option value="${c}">${c}</option>`).join('');
$('gradebookLoadBtn')&&($('gradebookLoadBtn').onclick=loadGradebook);
$('gradebookClass')&&($('gradebookClass').onchange=loadGradebook);
$('gradebookAddStudentBtn')&&($('gradebookAddStudentBtn').onclick=()=>{document.querySelectorAll('#teacherView .section').forEach(x=>x.classList.remove('active'));$('t-students').classList.add('active');document.querySelectorAll('#teacherNav button').forEach(x=>x.classList.toggle('active',x.dataset.sec==='t-students'));if($('newStudentClass'))$('newStudentClass').value=$('gradebookClass')?.value||'9/1';$('newStudentName')?.focus();$('t-students').scrollIntoView({behavior:'smooth',block:'start'})});
const gradebookNavBtn=$('teacherNav')?.querySelector('[data-sec="t-gradebook"]');gradebookNavBtn&&gradebookNavBtn.addEventListener('click',()=>loadGradebook());
document.addEventListener('input',e=>{const el=e.target.closest?.('.gradebook-input');if(!el)return;const value=gbNum(el),slot=el.dataset.gbSlot,studentId=Number(el.dataset.gbStudent),m=GRADEBOOK_META[slot];el.style.borderColor=(value!=null&&(value<0||value>m.max))?'#dc2626':'#0f766e';if(value==null)gradebookDirty.delete(studentId+':'+slot);else gradebookDirty.set(studentId+':'+slot,{studentId,slot,value});recalcGradebookRow(el.closest('tr'))});

function formatQuestionTime(v){if(!v)return '';try{return new Date(v).toLocaleString('ar-OM',{dateStyle:'short',timeStyle:'short'})}catch(e){return new Date(v).toLocaleString('ar')}}
async function loadTeacherQuestions(){const all=await rpc('portal_teacher_questions',{p_token:teacherToken,p_status:null});const d=(all||[]).filter(q=>!String(q.question_text||'').startsWith(BANK_ESSAY_PREFIX));$('teacherQuestionList').innerHTML=d.length?d.map(q=>`<div class="item"><span class="badge">${esc(q.class_name)} • ${q.status==='new'?'جديد':'تمت الإجابة'}</span><h3>${studentName(q.full_name)}</h3>${q.created_at?`<div class="muted" style="margin-top:-6px;margin-bottom:10px">🕒 أرسل السؤال: ${formatQuestionTime(q.created_at)}</div>`:''}<p>${esc(q.question_text)}</p>${q.attachment_url?renderSafeAttachment(q.attachment_url,'فتح المرفق'):''}<div class="field"><textarea id="reply-${q.id}" rows="3" placeholder="اكتب ردك...">${esc(q.teacher_reply||'')}</textarea></div><button class="btn primary" data-action="reply-question" data-id="${q.id}">إرسال الرد</button></div>`).join(''):'<div class="muted">لا توجد أسئلة.</div>'}
window.replyQ=async id=>{const ok=await rpc('portal_teacher_reply_question',{p_token:teacherToken,p_question_id:id,p_reply:$('reply-'+id).value});if(ok){await loadTeacherQuestions();await loadOverview()}};
async function applyPoints(delta=null){try{const d=delta===null?Number($('pointsDelta').value):delta;const sid=Number($('pointsStudent').value);const p=await rpc('portal_teacher_adjust_points',{p_token:teacherToken,p_student_id:sid,p_delta:d});if(p===null)throw new Error('تعذر التعديل');await refreshStudentSelects();const pc=$('pointsClass').value||'9/1';const rows=await rpc('portal_teacher_points_overview',{p_token:teacherToken,p_class:pc});const row=(rows||[]).find(x=>Number(x.student_id)===sid);const total=row?fmtPoints(row.total_points):fmtPoints(p);msg('pointsMsg',(d<0?'تم خصم '+Math.abs(d)+' نقطة. ':'تمت إضافة '+d+' نقطة. ')+'إجمالي رصيد الطالب الآن: '+total+' ⭐')}catch(e){msg('pointsMsg',e.message,false)}}$('pointsBtn').onclick=()=>applyPoints();$('pointsPlusBtn')&&($('pointsPlusBtn').onclick=()=>applyPoints(1));$('pointsMinusBtn')&&($('pointsMinusBtn').onclick=()=>applyPoints(-1));
if($('newStudentClass'))$('newStudentClass').innerHTML=classes.map(c=>`<option value="${c}">${c}</option>`).join('');
function renderStudentsTable(){const q=($('studentSearch')?.value||'').trim().toLowerCase();const list=!q?allStudents:allStudents.filter(s=>String(s.full_name).toLowerCase().includes(q)||String(s.username).toLowerCase().includes(q));const actions=s=>isPrimaryTeacher()?`<button class="btn secondary" data-action="edit-student-name" data-id="${s.id}" data-v1="${safeEnc(s.full_name)}">✏️ تعديل الاسم</button> <button class="btn secondary" data-action="move-student" data-id="${s.id}" data-v1="${safeEnc(s.full_name)}" data-v2="${safeEnc(s.class_name)}">🔄 نقل الشعبة</button> <button class="btn danger" data-action="delete-student" data-id="${s.id}" data-v1="${safeEnc(s.full_name)}">🗑️ حذف الطالب</button>`:'<span class="muted">حساب الطالب مشترك بين المواد</span>';$('studentsTable').innerHTML=list.map(s=>`<tr><td>${studentName(s.full_name)}</td><td>${esc(s.class_name)}</td><td>${esc(s.username)}</td><td>${s.points??'—'}</td><td>${actions(s)}</td></tr>`).join('');if($('studentSearchCount'))$('studentSearchCount').textContent=`النتائج: ${list.length} طالب`;}
window.editStudentName=async(id,nameEnc)=>{const old=decodeURIComponent(nameEnc),name=prompt('اكتب الاسم الصحيح للطالب:',old);if(name===null||!name.trim()||name.trim()===old)return;try{const ok=await rpc('portal_teacher_update_student_name',{p_token:teacherToken,p_student_id:id,p_full_name:name.trim()});if(!ok)throw new Error('تعذر تعديل الاسم');await loadStudents($('studentFilter').value||'ALL');await refreshStudentSelects();alert('تم تعديل اسم الطالب ✅')}catch(e){alert(e.message)}};
window.moveStudent=async(id,nameEnc,classEnc)=>{const name=decodeURIComponent(nameEnc),oldClass=decodeURIComponent(classEnc);const choices=classes.filter(c=>c!==oldClass);const next=prompt(`نقل ${name} من ${oldClass}.\nاكتب الشعبة الجديدة: ${choices.join('، ')}`,choices[0]||'');if(next===null)return;const cls=next.trim();if(!classes.includes(cls)){alert('الشعبة غير صحيحة. استخدم: '+classes.join('، '));return}if(cls===oldClass)return;if(!confirm(`تأكيد نقل ${name} من ${oldClass} إلى ${cls}؟\nلن يتم حذف درجاته أو نقاطه أو سجلاته.`))return;try{const ok=await rpc('portal_teacher_move_student',{p_token:teacherToken,p_student_id:id,p_new_class:cls});if(!ok)throw new Error('تعذر نقل الطالب');await loadStudents($('studentFilter').value||'ALL');await refreshStudentSelects();alert('تم نقل الطالب إلى '+cls+' ✅')}catch(e){alert(e.message||'تعذر نقل الطالب')}};
window.deleteStudent=async(id,nameEnc)=>{const name=decodeURIComponent(nameEnc);if(!confirm(`هل أنت متأكد من حذف الطالب:\n${name}\n\nسيتم حذف حسابه وبياناته المرتبطة نهائيًا.`))return;const check=prompt(`تأكيد نهائي لحذف ${name}\nاكتب كلمة: حذف`,'');if(check!=='حذف'){if(check!==null)alert('تم إلغاء الحذف لأن كلمة التأكيد غير صحيحة.');return}try{const ok=await rpc('portal_teacher_delete_student',{p_token:teacherToken,p_student_id:id});if(!ok)throw new Error('تعذر حذف الطالب');await loadStudents($('studentFilter').value||'ALL');await refreshStudentSelects();await loadOverview();alert('تم حذف الطالب نهائيًا ✅')}catch(e){alert(e.message||'تعذر حذف الطالب')}};
$('teacherPassBtn').onclick=async()=>{const ok=await rpc('portal_teacher_change_password',{p_token:teacherToken,p_new_password:$('teacherNewPass').value});if(ok){msg('teacherPassMsg','تم تغيير كلمة المرور ✅');$('teacherNewPass').value=''}else msg('teacherPassMsg','يجب أن تكون 8 أحرف على الأقل',false)};

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b)return;
  const id=Number(b.dataset.id||0),v1=b.dataset.v1||'',v2=b.dataset.v2||'';
  const bool=v=>String(v)==='true';
  switch(b.dataset.action){
    case 'open-study-file': return window.openStudyFile(v1,v2);
    case 'open-lesson': return window.openLessonFromMyLessons(id,Number(v1));
    case 'open-experiment': return window.openExperiment(id,v1,v2);
    case 'preview-teacher-experiment': return window.openExperiment(id,v1,v2);
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
    case 'delete-student': return window.deleteStudent(id,v1);
    case 'move-student': return window.moveStudent(id,v1,v2);
    case 'reply-question': return window.replyQ(id);
    case 'admin-student-profile': return openAdminStudentProfile(id,v1);
    case 'admin-reset-student': return adminResetAccount('student',id,v1);
    case 'admin-reset-teacher': return adminResetAccount('teacher',id,v1);
  }
});
applyInputSecurity();

(async()=>{const st=sessionRead('student'),tt=sessionRead('teacher'),at=sessionRead('admin');try{if(st){const d=await rpc('portal_student_me',{p_token:st});if(d?.length){studentToken=st;currentStudent=d[0];await enterStudent(d[0]);return}else sessionClear()}if(tt){teacherToken=tt;const me=await rpc('portal_teacher_me',{p_token:tt});if(me?.length){currentTeacher=me[0];if(me[0].must_change_password)await forceTeacherPasswordChange();await enterTeacher();return}else sessionClear()}if(at){const me=await rpc('portal_admin_me',{p_token:at});if(me?.length){adminToken=at;currentAdmin=me[0];await enterAdmin();return}else sessionClear()}}catch(e){sessionClear()}show('loginView')})();
setInterval(()=>{if(adminToken&&!sessionRead('admin'))secureLogout('انتهت جلسة المشرف لأسباب أمنية. سجّل الدخول من جديد.');else if(teacherToken&&!sessionRead('teacher'))secureLogout('انتهت جلسة المعلم لأسباب أمنية. سجّل الدخول من جديد.');else if(studentToken&&!sessionRead('student'))secureLogout('انتهت الجلسة. سجّل الدخول من جديد.');if(adminToken&&document.visibilityState==='visible')Promise.allSettled([loadAdminOverview(),loadAdminBehavior(false)])},60000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){if(teacherToken&&!sessionRead('teacher'))secureLogout('انتهت جلسة المعلم لأسباب أمنية. سجّل الدخول من جديد.');else if(studentToken&&!sessionRead('student'))secureLogout('انتهت الجلسة. سجّل الدخول من جديد.')}});
// ===== Rawafid Al-Uloom platform branding =====
(function applyRawafidBranding(){
  const login = document.getElementById('loginView');
  if(!login) return;

  document.title = 'منصة روافد العلوم';

  const heading = login.querySelector('h1');
  if(heading) heading.textContent = '🔬 منصة روافد العلوم';

  const paragraphs = Array.from(login.querySelectorAll('p'));
  const intro = paragraphs.find(p => /بوابة|كيمياء|محمد المسكري/.test((p.textContent || '').trim()));
  if(intro){
    intro.innerHTML = 'بوابة التعلم الرقمي للعلوم والكيمياء والفيزياء والأحياء<br><span style="opacity:.92">مدرسة الشيخ سعيد بن حمد الحارثي للبنين | الصفوف 7–9</span>';
  }

  const allTextEls = Array.from(login.querySelectorAll('small,p,div,span'));
  const motto = allTextEls.find(el => /نسأل الله أن يوفقك في رحلتك العلمية/.test((el.textContent || '').trim()));
  if(motto) motto.textContent = 'نتعلم • نكتشف • نجرّب • نبدع';
})();
