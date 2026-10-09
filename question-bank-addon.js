/*
  بنك الأسئلة المتسلسل
  - الوحدة الأولى: حالات المادة / فصل وتنقية المواد
  - سؤال واحد كل مرة، بلا رجوع للسؤال السابق
  - 10 نقاط داخل التحدي لكل إجابة صحيحة (النتيجة من 150 عند وجود 15 سؤالًا)
  - +0.5 نقطة في رصيد المنصة لأول إجابة صحيحة على السؤال، عبر RPC الحالي
*/
(() => {
  'use strict';

  const ROOT_ID='qbChallengeRoot';
  const OBJECTIVE_TYPES=new Set(['mcq','tf','matching']);
  const LESSONS=[
    {key:'states',name:'حالات المادة',icon:'🧊',aliases:['حالات المادة']},
    {key:'separation',name:'فصل وتنقية المواد',icon:'🧪',aliases:['فصل وتنقية المواد','فصل المواد وتنقيتها','تنقية المواد وفصلها','فصل وتنقية المواد وتصفيتها','تنقية المواد']}
  ];
  let rows=[];
  let active=null;

  const el=id=>document.getElementById(id);
  const htmlEsc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=s=>String(s??'').trim().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/\s+/g,' ');
  const fmt=n=>Number(n||0).toLocaleString('ar-OM',{maximumFractionDigits:1});

  function lessonFor(q){
    try{
      const p=unpackBank(q); // من app.js الحالي
      const name=norm(p?.meta?.lessonName||'');
      return LESSONS.find(l=>l.aliases.some(a=>name.includes(norm(a))))||null;
    }catch(_e){return null}
  }

  function objective(q){
    try{return OBJECTIVE_TYPES.has(unpackBank(q)?.meta?.type)}catch(_e){return false}
  }

  async function fetchRows(){
    if(!studentToken) return [];
    const d=await rpc('portal_student_question_bank',{p_token:studentToken});
    rows=(d||[]).filter(objective);
    return rows;
  }

  function lessonRows(lesson){return rows.filter(q=>lessonFor(q)?.key===lesson.key)}

  function shuffle(a){
    const b=[...a];
    for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}
    return b;
  }

  function renderHome(){
    const root=el(ROOT_ID); if(!root)return;
    root.innerHTML=`<div class="qb-home">
      <div class="qb-unit-card">
        <div class="qb-unit-head"><div><div class="qb-unit-title">📘 الوحدة الأولى</div><div class="muted">اختر الدرس وابدأ الأسئلة مباشرة</div></div><span class="badge">سؤال بعد سؤال</span></div>
        <div class="qb-lessons-grid">
          ${LESSONS.map(l=>{const n=lessonRows(l).length;return `<button type="button" class="qb-lesson-card" data-qb-lesson="${l.key}" ${n?'':'disabled'}><span class="qb-lesson-icon">${l.icon}</span><span class="qb-lesson-name">${htmlEsc(l.name)}</span><span class="qb-lesson-meta">${n?`${Math.min(n,15)} سؤالًا جاهزًا للتحدي`:'لا توجد أسئلة منشورة لهذا الدرس بعد'}</span></button>`}).join('')}
        </div>
      </div>
    </div>`;
    root.querySelectorAll('[data-qb-lesson]').forEach(b=>b.addEventListener('click',()=>startLesson(b.dataset.qbLesson)));
  }

  async function openHome(){
    const root=el(ROOT_ID); if(!root)return;
    root.innerHTML='<div class="lesson-empty">جاري تجهيز بنك الأسئلة...</div>';
    try{await fetchRows();renderHome()}catch(e){root.innerHTML=`<div class="msg err">تعذر تحميل بنك الأسئلة: ${htmlEsc(e?.message||'خطأ غير معروف')}</div>`}
  }

  function startLesson(key){
    const lesson=LESSONS.find(l=>l.key===key); if(!lesson)return;
    const qs=lessonRows(lesson).sort((a,b)=>String(a.title||'').localeCompare(String(b.title||''),'ar',{numeric:true})).slice(0,15);
    if(!qs.length)return;
    active={lesson,questions:qs,index:0,correct:0,wrong:0,score:0,addedPoints:0,answeredIds:new Set()};
    renderQuestion();
  }

  function overlayBase(inner){
    let ov=el('qbChallengeOverlay');
    if(!ov){ov=document.createElement('div');ov.id='qbChallengeOverlay';ov.className='qb-challenge-overlay';document.body.appendChild(ov)}
    ov.innerHTML=`<div class="qb-challenge-wrap">${inner}</div>`;
    document.body.style.overflow='hidden';
    return ov;
  }

  function closeOverlay(){const ov=el('qbChallengeOverlay');if(ov)ov.remove();document.body.style.overflow='';active=null;openHome()}

  function questionControls(q,meta){
    const id=q.id;
    if(meta.type==='mcq'){
      const options=meta.answer?.options||[];
      return `<div class="qb-answer-grid">${options.map((x,i)=>`<label class="qb-answer-option"><input type="radio" name="qbc-${id}" value="${i}"><span><b>${String.fromCharCode(65+i)}.</b> ${htmlEsc(x)}</span></label>`).join('')}</div>`;
    }
    if(meta.type==='tf'){
      return `<div class="qb-answer-grid"><label class="qb-answer-option"><input type="radio" name="qbc-${id}" value="true"> صح</label><label class="qb-answer-option"><input type="radio" name="qbc-${id}" value="false"> خطأ</label></div>`;
    }
    if(meta.type==='matching'){
      const pairs=meta.answer?.pairs||[];
      const rights=shuffle(pairs.map(p=>p[1]));
      return `<div class="qb-match-grid">${pairs.map((p,i)=>`<div class="qb-match-row-dark"><b>${htmlEsc(p[0])}</b><select id="qbc-match-${id}-${i}"><option value="">اختر الإجابة</option>${rights.map(x=>`<option value="${htmlEsc(x)}">${htmlEsc(x)}</option>`).join('')}</select></div>`).join('')}</div>`;
    }
    return '<div class="qb-challenge-msg qb-msg-err">نوع السؤال غير مدعوم في التحدي.</div>';
  }

  function renderQuestion(){
    if(!active)return;
    const q=active.questions[active.index];
    if(!q){finish();return}
    const {meta}=unpackBank(q);
    const total=active.questions.length, current=active.index+1, pct=((active.index)/total)*100;
    const image=safeImageData?.(q.question_image)||'';
    const ov=overlayBase(`
      <div class="qb-challenge-top"><div><div class="qb-challenge-title">${active.lesson.icon} ${htmlEsc(active.lesson.name)}</div><div class="qb-challenge-progress">السؤال ${current} من ${total}</div></div><button id="qbExitBtn" class="qb-exit" type="button">خروج</button></div>
      <div class="qb-progress-track-dark"><div class="qb-progress-fill-dark" style="width:${pct}%"></div></div>
      <div class="qb-question-card">
        <div class="qb-q-kicker"><span>⭐ الصحيح = 10 درجات + 0.5 نقطة في رصيدك لأول مرة</span><span>${fmt(active.score)} / ${total*10}</span></div>
        <h3 class="qb-q-title">${htmlEsc(q.question_text||q.title||`السؤال ${current}`).replace(/\n/g,'<br>')}</h3>
        ${image?`<img class="qb-q-image" src="${image}" alt="صورة السؤال">`:''}
        ${questionControls(q,meta)}
        <div class="qb-challenge-actions"><button id="qbSubmitBtn" class="qb-submit-dark" type="button">إرسال الإجابة</button></div>
        <div id="qbChallengeMsg" class="qb-challenge-msg"></div>
      </div>`);
    ov.querySelectorAll('.qb-answer-option input').forEach(inp=>inp.addEventListener('change',()=>{ov.querySelectorAll('.qb-answer-option').forEach(x=>x.classList.remove('selected'));inp.closest('.qb-answer-option')?.classList.add('selected')}));
    el('qbSubmitBtn')?.addEventListener('click',submitCurrent);
    el('qbExitBtn')?.addEventListener('click',()=>{if(confirm('هل تريد الخروج من التحدي؟ لن تستطيع الرجوع للأسئلة السابقة في هذه الجولة.'))closeOverlay()});
  }

  function readAnswer(q,meta){
    const id=q.id;
    if(meta.type==='mcq'){
      const x=document.querySelector(`input[name="qbc-${id}"]:checked`);return x?Number(x.value):null;
    }
    if(meta.type==='tf'){
      const x=document.querySelector(`input[name="qbc-${id}"]:checked`);return x?(x.value==='true'):null;
    }
    if(meta.type==='matching'){
      const vals=(meta.answer?.pairs||[]).map((_,i)=>el(`qbc-match-${id}-${i}`)?.value||'');return vals.some(v=>!v)?null:vals;
    }
    return null;
  }

  async function submitCurrent(){
    if(!active)return;
    const q=active.questions[active.index], {meta}=unpackBank(q), msg=el('qbChallengeMsg'), btn=el('qbSubmitBtn');
    const answer=readAnswer(q,meta);
    if(answer===null){if(msg){msg.className='qb-challenge-msg qb-msg-err';msg.textContent='اختر إجابتك أولًا.'}return}
    btn.disabled=true;
    if(msg){msg.className='qb-challenge-msg';msg.textContent='جاري حفظ الإجابة...'}
    try{
      const d=await rpc('portal_student_answer_bank',{p_token:studentToken,p_question_id:q.id,p_answer:answer});
      const r=d?.[0]; if(!r)throw new Error('لم تصل نتيجة التصحيح');
      const correct=!!r.is_correct;
      if(correct){active.correct++;active.score+=10;active.addedPoints+=Number(r.awarded_points||0);if(msg){msg.className='qb-challenge-msg qb-msg-ok';msg.textContent='✅ إجابة صحيحة'}}
      else{active.wrong++;if(msg){msg.className='qb-challenge-msg qb-msg-err';msg.textContent='❌ إجابة غير صحيحة'}}
      if(el('studentPoints')&&r.total_points!=null)el('studentPoints').textContent=fmt(r.total_points);
      active.answeredIds.add(q.id);
      setTimeout(()=>{active.index++;if(active.index>=active.questions.length)finish();else renderQuestion()},650);
    }catch(e){btn.disabled=false;if(msg){msg.className='qb-challenge-msg qb-msg-err';msg.textContent=e?.message||'تعذر حفظ الإجابة. حاول مرة أخرى.'}}
  }

  function finish(){
    if(!active)return;
    const a=active,total=a.questions.length,max=total*10;
    const ov=overlayBase(`<div class="qb-result-card">
      <div style="font-size:44px">🏆</div>
      <h2>انتهى تحدي ${htmlEsc(a.lesson.name)}</h2>
      <div class="qb-result-score">${a.score}</div>
      <div class="qb-result-sub">نقطة من ${max}</div>
      <div class="qb-result-grid">
        <div class="qb-result-box"><b>✅ ${a.correct}</b><span>إجابة صحيحة</span></div>
        <div class="qb-result-box"><b>❌ ${a.wrong}</b><span>إجابة خاطئة</span></div>
        <div class="qb-result-box"><b>⭐ +${fmt(a.addedPoints)}</b><span>نقاط جديدة للرصد</span></div>
      </div>
      <button id="qbResultBack" class="qb-result-btn" type="button">العودة إلى بنك الأسئلة</button>
      <div class="qb-result-note">نصف النقطة في رصيد المنصة تُحتسب مرة واحدة فقط لكل سؤال. إعادة نفس السؤال لا تضيف نصف نقطة ثانية.</div>
    </div>`);
    el('qbResultBack')?.addEventListener('click',closeOverlay);
  }


  // ===== تنظيم بنك الأسئلة في حساب المعلم حسب اسم الدرس =====
  const teacherLessonNorm=s=>String(s??'').trim().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/\s+/g,' ');

  function teacherLessonNameFromRow(q){
    if(!q)return '';
    try{return String(unpackBank(q)?.meta?.lessonName||'').trim()}catch(_e){return ''}
  }

  function teacherQuestionRowForItem(item){
    const id=item?.querySelector('[data-action="edit-bank-question"]')?.dataset?.id;
    return id && window.__teacherBankRows ? window.__teacherBankRows[id] : null;
  }

  function applyTeacherLessonFilter(){
    const list=el('teacherBankList'),select=el('teacherBankLessonFilter'),hint=el('teacherBankLessonFilterHint');
    if(!list||!select)return;
    const value=select.value;
    const items=[...list.querySelectorAll(':scope > .item')];
    let shown=0;
    items.forEach(item=>{
      const row=teacherQuestionRowForItem(item);
      const lesson=teacherLessonNameFromRow(row);
      const visible=value==='__ALL__' ? true : (!!value && teacherLessonNorm(lesson)===teacherLessonNorm(value));
      item.classList.toggle('hide',!visible);
      if(visible)shown++;
    });
    if(hint){
      if(!items.length) hint.textContent='لا توجد أسئلة محفوظة حاليًا.';
      else if(!value) hint.textContent='اختر اسم الدرس لعرض أسئلته.';
      else if(value==='__ALL__') hint.textContent=`عرض كل الأسئلة المحفوظة (${shown} سؤال).`;
      else hint.textContent=`${value}: ${shown} سؤال.`;
    }
  }

  function populateTeacherLessonFilter(){
    const select=el('teacherBankLessonFilter');
    if(!select)return;
    const previous=select.value;
    const rows=Object.values(window.__teacherBankRows||{});
    const map=new Map();
    rows.forEach(q=>{
      const name=teacherLessonNameFromRow(q);
      if(name){const key=teacherLessonNorm(name);if(!map.has(key))map.set(key,name)}
    });
    const lessons=[...map.values()].sort((a,b)=>a.localeCompare(b,'ar'));
    select.innerHTML='<option value="">اختر اسم الدرس</option><option value="__ALL__">كل الدروس</option>'+lessons.map(name=>`<option value="${htmlEsc(name)}">${htmlEsc(name)}</option>`).join('');
    if([...select.options].some(o=>o.value===previous))select.value=previous;
    else select.value='';
    applyTeacherLessonFilter();
  }

  function bindTeacherBankFilter(){
    const select=el('teacherBankLessonFilter'),list=el('teacherBankList');
    if(!select||!list)return;
    if(!select.dataset.bound){
      select.dataset.bound='1';
      select.addEventListener('change',applyTeacherLessonFilter);
    }
    if(!list.dataset.lessonObserver){
      list.dataset.lessonObserver='1';
      const observer=new MutationObserver(()=>setTimeout(populateTeacherLessonFilter,0));
      observer.observe(list,{childList:true});
    }
    const navBtn=document.querySelector('#teacherNav [data-sec="t-bank"]');
    if(navBtn&&!navBtn.dataset.lessonFilterBound){
      navBtn.dataset.lessonFilterBound='1';
      navBtn.addEventListener('click',()=>setTimeout(populateTeacherLessonFilter,80));
    }
    setTimeout(populateTeacherLessonFilter,0);
  }

  function bind(){
    const navBtn=document.querySelector('#studentNav [data-sec="s-bank"]');
    if(navBtn)navBtn.addEventListener('click',()=>setTimeout(openHome,0));
    const sec=el('s-bank');
    if(sec && sec.classList.contains('active'))openHome();
    bindTeacherBankFilter();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
