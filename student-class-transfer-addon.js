(()=>{
  'use strict';

  const validClasses=['9/1','9/2','9/3','9/4','9/5','9/6','9/7'];

  function addMoveButtons(){
    const table=document.getElementById('studentsTable');
    if(!table)return;
    table.querySelectorAll('tr').forEach(tr=>{
      if(tr.querySelector('[data-transfer-added="1"]'))return;
      const cells=tr.querySelectorAll('td');
      if(cells.length<5)return;
      const editBtn=tr.querySelector('[data-action="edit-student-name"]');
      if(!editBtn)return;
      const id=Number(editBtn.dataset.id||0);
      if(!id)return;
      const className=(cells[1]?.textContent||'').trim();
      const studentName=(cells[0]?.textContent||'').trim();
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='btn secondary';
      btn.textContent='🔄 نقل الشعبة';
      btn.dataset.transferAdded='1';
      btn.dataset.studentId=String(id);
      btn.dataset.currentClass=className;
      btn.dataset.studentName=studentName;
      btn.style.marginInlineStart='6px';
      editBtn.insertAdjacentElement('afterend',btn);
    });
  }

  async function moveStudent(id,currentClass,studentName){
    const oldClass=String(currentClass||'').trim();
    const name=String(studentName||'الطالب').trim();
    const next=prompt(`نقل الطالب: ${name}\nالشعبة الحالية: ${oldClass}\n\nاكتب الشعبة الجديدة من 9/1 إلى 9/7:`,oldClass);
    if(next===null)return;
    const newClass=String(next).trim();
    if(!validClasses.includes(newClass)){
      alert('الشعبة غير صحيحة. اختر من 9/1 إلى 9/7.');
      return;
    }
    if(newClass===oldClass){
      alert('الطالب موجود أصلًا في هذه الشعبة.');
      return;
    }
    const ok=confirm(`تأكيد نقل ${name} من ${oldClass} إلى ${newClass}؟\n\nلن تتغير نقاطه أو درجاته أو اسم المستخدم أو كلمة السر أو الباركود.`);
    if(!ok)return;

    try{
      const result=await rpc('portal_teacher_move_student_class',{
        p_token:teacherToken,
        p_student_id:Number(id),
        p_new_class:newClass
      });
      if(!result)throw new Error('تعذر نقل الطالب');

      const selectedClass=document.getElementById('studentFilter')?.value||'ALL';
      if(typeof loadStudents==='function')await loadStudents(selectedClass);
      if(typeof refreshStudentSelects==='function')await refreshStudentSelects();
      if(typeof loadOverview==='function')await loadOverview();
      if(typeof loadStudentLogins==='function' && Array.isArray(window.studentLoginRows) && window.studentLoginRows.length){
        try{await loadStudentLogins()}catch(_e){}
      }
      addMoveButtons();
      alert(`تم نقل ${name} إلى ${newClass} ✅`);
    }catch(e){
      alert(e?.message||'تعذر نقل الطالب');
    }
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-transfer-added="1"]');
    if(!btn)return;
    moveStudent(btn.dataset.studentId,btn.dataset.currentClass,btn.dataset.studentName);
  });

  const table=document.getElementById('studentsTable');
  if(table){
    const observer=new MutationObserver(addMoveButtons);
    observer.observe(table,{childList:true,subtree:true});
  }

  document.addEventListener('DOMContentLoaded',addMoveButtons,{once:true});
  setTimeout(addMoveButtons,1200);
})();
