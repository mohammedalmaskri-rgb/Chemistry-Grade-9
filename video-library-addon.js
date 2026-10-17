(() => {
  'use strict';

  const ID = x => document.getElementById(x);
  const h = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let studentRows = [];
  let teacherRows = [];

  function addStyles(){
    if(ID('videoLibraryStyles')) return;
    const st=document.createElement('style');
    st.id='videoLibraryStyles';
    st.textContent=`
      .video-library-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:14px}
      .video-card{border:1px solid #d7ebe7;border-radius:18px;background:linear-gradient(145deg,#fff,#f7fcfb);padding:14px;box-shadow:0 8px 24px #0f766e0c}
      .video-card h3{margin:8px 0 6px}.video-frame{position:relative;width:100%;aspect-ratio:16/9;border-radius:14px;overflow:hidden;background:#0f172a;margin-top:12px}
      .video-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}.video-placeholder{padding:26px 14px;text-align:center;background:#f8fbfb;border-radius:14px;color:#678;margin-top:12px}
      .video-admin-form{background:linear-gradient(135deg,#f0fdfa,#eff6ff);border:1px solid #cde9e3;border-radius:20px;padding:18px;margin-bottom:18px}
      .video-admin-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.video-admin-actions .btn{flex:0 0 auto}
      .video-note{padding:12px 14px;border-radius:14px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;margin:10px 0}
      @media(max-width:700px){.video-library-grid{grid-template-columns:1fr}.video-admin-actions .btn{width:100%}}
    `;
    document.head.appendChild(st);
  }

  function activate(nav, view, button, sectionId){
    nav.querySelectorAll('button[data-sec]').forEach(b=>b.classList.toggle('active',b===button));
    view.querySelectorAll('.section').forEach(s=>s.classList.toggle('active',s.id===sectionId));
  }

  function youtubeId(raw){
    try{
      const u=new URL(String(raw||''));
      const host=u.hostname.replace(/^www\./,'').toLowerCase();
      if(host==='youtu.be') return u.pathname.split('/').filter(Boolean)[0]||'';
      if(host==='youtube.com'||host==='m.youtube.com'||host==='music.youtube.com'){
        if(u.pathname==='/watch') return u.searchParams.get('v')||'';
        const parts=u.pathname.split('/').filter(Boolean);
        if(['embed','shorts','live'].includes(parts[0])) return parts[1]||'';
      }
    }catch(_e){}
    return '';
  }

  function renderPlayer(url,title){
    const yid=youtubeId(url);
    if(yid && /^[A-Za-z0-9_-]{6,20}$/.test(yid)){
      const thumb=`https://i.ytimg.com/vi/${h(yid)}/hqdefault.jpg`;
      return `<button type="button" class="video-frame video-lazy" data-yid="${h(yid)}" data-title="${h(title)}" aria-label="تشغيل ${h(title)}" style="border:0;padding:0;cursor:pointer;background:#0f172a"><img src="${thumb}" alt="${h(title)}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"><span style="position:absolute;inset:0;display:grid;place-items:center"><span style="display:grid;place-items:center;width:72px;height:52px;border-radius:16px;background:#ff0033;color:#fff;font-size:28px;box-shadow:0 8px 30px #0006">▶</span></span></button>`;
    }
    const safe=typeof safeWebUrl==='function'?safeWebUrl(url):'';
    return safe?`<div class="video-placeholder">هذا الرابط لا يدعم التشغيل داخل المنصة حاليًا.<br><br><a class="link" href="${h(safe)}" target="_blank" rel="noopener noreferrer">فتح الفيديو</a></div>`:'<div class="video-placeholder">رابط الفيديو غير صالح.</div>';
  }

  function activateLazyVideo(ev){
    const box=ev.target.closest('.video-lazy'); if(!box)return;
    const yid=box.dataset.yid||''; if(!/^[A-Za-z0-9_-]{6,20}$/.test(yid))return;
    const title=box.dataset.title||'فيديو الشرح';
    const wrap=document.createElement('div'); wrap.className='video-frame';
    wrap.innerHTML=`<iframe src="https://www.youtube-nocookie.com/embed/${h(yid)}?autoplay=1" title="${h(title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    box.replaceWith(wrap);
  }

  function ensureUI(){
    addStyles();
    const sNav=ID('studentNav'), sView=ID('studentView');
    if(sNav&&sView&&!ID('studentVideosNavBtn')){
      const b=document.createElement('button');
      b.id='studentVideosNavBtn'; b.dataset.sec='s-videos'; b.textContent='🎥 فيديوهات الشرح';
      const bank=sNav.querySelector('[data-sec="s-bank"]');
      sNav.insertBefore(b,bank||null);
      const sec=document.createElement('section');
      sec.id='s-videos'; sec.className='section card';
      sec.innerHTML='<h2>🎥 فيديوهات الشرح</h2><p class="muted">شروحات الدروس المسجلة من المعلم. اختر الفيديو وشاهده مباشرة من داخل البوابة.</p><div id="studentVideoList" class="video-library-grid"><div class="lesson-empty">اضغط «فيديوهات الشرح» لتحميل الفيديوهات.</div></div>';
      sView.appendChild(sec);
      b.addEventListener('click',()=>{activate(sNav,sView,b,'s-videos');loadStudentVideos();});
      ID('studentVideoList')?.addEventListener('click',activateLazyVideo);
    }

    const tNav=ID('teacherNav'), tView=ID('teacherView');
    if(tNav&&tView&&!ID('teacherVideosNavBtn')){
      const b=document.createElement('button');
      b.id='teacherVideosNavBtn'; b.dataset.sec='t-videos'; b.textContent='🎬 فيديوهات الشرح';
      const content=tNav.querySelector('[data-sec="t-content"]');
      tNav.insertBefore(b,content||null);
      const sec=document.createElement('section');
      sec.id='t-videos'; sec.className='section card';
      sec.innerHTML=`
        <h2>🎬 إدارة فيديوهات الشرح</h2>
        <p class="muted">ارفع شرحك في YouTube كـ «غير مدرج / Unlisted»، ثم الصق الرابط هنا. لن يظهر الفيديو في نتائج بحث YouTube، والطلاب يشاهدونه من داخل البوابة.</p>
        <div class="video-note">يفضل للفيديوهات الطويلة مثل 15 دقيقة استخدام YouTube غير مدرج بدل رفع ملف الفيديو داخل GitHub.</div>
        <div class="video-admin-form">
          <div class="row3">
            <div class="field"><label>عنوان الفيديو</label><input id="videoTitle" placeholder="مثال: شرح التقطير التجزيئي"></div>
            <div class="field"><label>اسم الدرس</label><input id="videoLesson" placeholder="مثال: فصل وتنقية المواد"></div>
            <div class="field"><label>الشعبة</label><select id="videoClass"><option value="ALL">كل الشعب</option></select></div>
          </div>
          <div class="field"><label>رابط الفيديو</label><input id="videoUrl" type="url" placeholder="https://youtu.be/... أو رابط YouTube غير مدرج"></div>
          <div class="field"><label>وصف مختصر - اختياري</label><textarea id="videoDesc" rows="3" placeholder="مثال: شرح خطوات الجهاز وفكرة عمود التجزئة"></textarea></div>
          <label><input id="videoVisible" type="checkbox"> إظهار الفيديو للطلاب مباشرة</label><br><br>
          <button id="videoAddBtn" class="btn primary">➕ إضافة الفيديو</button>
          <div id="videoMsg"></div>
        </div>
        <h3>الفيديوهات المضافة</h3>
        <div id="teacherVideoList"></div>`;
      tView.appendChild(sec);
      const cls=ID('videoClass');
      if(cls && typeof classes!=='undefined') classes.forEach(c=>cls.insertAdjacentHTML('beforeend',`<option value="${h(c)}">${h(c)}</option>`));
      b.addEventListener('click',()=>{activate(tNav,tView,b,'t-videos');loadTeacherVideos();});
      ID('videoAddBtn')?.addEventListener('click',addVideo);
      ID('teacherVideoList')?.addEventListener('click',teacherVideoAction);
      ID('teacherVideoList')?.addEventListener('click',activateLazyVideo);
    }
  }

  async function loadStudentVideos(){
    const list=ID('studentVideoList'); if(!list)return;
    if(typeof studentToken==='undefined'||!studentToken){list.innerHTML='<div class="lesson-empty">سجّل الدخول أولًا.</div>';return;}
    list.innerHTML='<div class="lesson-empty">جاري تحميل الفيديوهات...</div>';
    try{
      studentRows=await rpc('portal_student_videos',{p_token:studentToken})||[];
      if(!studentRows.length){list.innerHTML='<div class="lesson-empty">لا توجد فيديوهات شرح منشورة لك حاليًا.</div>';return;}
      list.innerHTML=studentRows.map(v=>`<article class="video-card"><span class="badge">🎥 ${h(v.lesson_name||'شرح كيمياء')}</span><h3>${h(v.title)}</h3>${v.description?`<p>${h(v.description)}</p>`:''}${renderPlayer(v.video_url,v.title)}<div class="muted" style="margin-top:9px">${new Date(v.created_at).toLocaleDateString('ar-OM')}</div></article>`).join('');
    }catch(e){list.innerHTML=`<div class="msg err">تعذر تحميل الفيديوهات: ${h(e?.message||'خطأ غير معروف')}</div>`;}
  }

  async function addVideo(){
    const btn=ID('videoAddBtn');
    try{
      if(typeof teacherToken==='undefined'||!teacherToken)throw new Error('سجّل دخول المعلم أولًا');
      const title=ID('videoTitle').value.trim();
      const lesson=ID('videoLesson').value.trim();
      const url=ID('videoUrl').value.trim();
      const desc=ID('videoDesc').value.trim();
      if(title.length<3)throw new Error('اكتب عنوان الفيديو');
      if(!url)throw new Error('ألصق رابط الفيديو');
      if(typeof safeWebUrl==='function'&&!safeWebUrl(url))throw new Error('استخدم رابط HTTPS صحيح');
      btn.disabled=true;
      const id=await rpc('portal_teacher_add_video',{
        p_token:teacherToken,
        p_title:title,
        p_lesson_name:lesson,
        p_description:desc,
        p_video_url:url,
        p_target_class:ID('videoClass').value,
        p_is_visible:ID('videoVisible').checked
      });
      if(!id)throw new Error('تعذر إضافة الفيديو');
      if(typeof msg==='function')msg('videoMsg','تمت إضافة الفيديو ✅');
      ID('videoTitle').value='';ID('videoLesson').value='';ID('videoUrl').value='';ID('videoDesc').value='';ID('videoVisible').checked=false;
      await loadTeacherVideos();
    }catch(e){if(typeof msg==='function')msg('videoMsg',e?.message||'تعذر إضافة الفيديو',false);}
    finally{if(btn)btn.disabled=false;}
  }

  async function loadTeacherVideos(){
    const list=ID('teacherVideoList'); if(!list)return;
    list.innerHTML='<div class="lesson-empty">جاري تحميل الفيديوهات...</div>';
    try{
      teacherRows=await rpc('portal_teacher_videos',{p_token:teacherToken})||[];
      if(!teacherRows.length){list.innerHTML='<div class="lesson-empty">ما أضفت فيديوهات للحين.</div>';return;}
      list.innerHTML=teacherRows.map(v=>`<div class="item" data-video-id="${Number(v.id)}"><span class="badge">${v.is_visible?'👁️ ظاهر':'🙈 مخفي'} • ${h(v.target_class==='ALL'?'كل الشعب':v.target_class)}</span><h3>${h(v.title)}</h3><div class="muted">${h(v.lesson_name||'بدون اسم درس')}</div>${v.description?`<p>${h(v.description)}</p>`:''}${renderPlayer(v.video_url,v.title)}<div class="video-admin-actions"><button class="btn secondary" data-video-action="toggle" data-id="${Number(v.id)}">${v.is_visible?'🙈 إخفاء عن الطلاب':'👁️ إظهار للطلاب'}</button><button class="btn danger" data-video-action="delete" data-id="${Number(v.id)}">🗑️ حذف</button></div></div>`).join('');
    }catch(e){list.innerHTML=`<div class="msg err">تعذر تحميل الفيديوهات: ${h(e?.message||'خطأ غير معروف')}</div>`;}
  }

  async function teacherVideoAction(ev){
    const b=ev.target.closest('[data-video-action]'); if(!b)return;
    const id=Number(b.dataset.id); const row=teacherRows.find(x=>Number(x.id)===id); if(!row)return;
    try{
      b.disabled=true;
      if(b.dataset.videoAction==='toggle'){
        await rpc('portal_teacher_set_video_visibility',{p_token:teacherToken,p_video_id:id,p_is_visible:!row.is_visible});
      }else if(b.dataset.videoAction==='delete'){
        if(!confirm(`حذف فيديو «${row.title}»؟`))return;
        await rpc('portal_teacher_delete_video',{p_token:teacherToken,p_video_id:id});
      }
      await loadTeacherVideos();
    }catch(e){alert(e?.message||'تعذر تنفيذ العملية');}
    finally{b.disabled=false;}
  }

  function boot(){ensureUI();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
