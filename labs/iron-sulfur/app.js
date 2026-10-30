(function(){
'use strict';
const {$,anim,wait,lerp,mix,svg}=Lab;
const dish=$('dishParts'),stuck=$('stuck'),magnet=$('magnet'),cap=$('caption');
const parts=[];
const bottom=x=>300+26*(1-Math.pow((x-210)/124,2));
let mag={x:720,y:60};
function setMag(x,y){mag={x,y};magnet.setAttribute('transform',`translate(${x},${y})`);}
function heapPoint(){const x=210+(Math.random()+Math.random()-1)*92;const h=13*Math.max(0,1-Math.pow((x-210)/100,2));return {x,y:bottom(x)-3-Math.random()*h};}
function addParticles(n,type){
  const list=[];
  for(let i=0;i<n;i++){
    const t=heapPoint();
    const el=svg(type==='fe'?'rect':'circle',type==='fe'?{width:5,height:2.6,rx:.8,fill:['#8d969c','#6b747a','#a7b0b6'][i%3]}:{r:2.7,fill:['#facc15','#fde047','#eab308'][i%3]},dish);
    const p={el,type,x:t.x,y:150,tx:t.x,ty:t.y,delay:Math.random()*.55};
    place(p);parts.push(p);list.push(p);
  }
  return list;
}
function place(p){if(p.el.tagName==='rect'){p.el.setAttribute('x',p.x-2.5);p.el.setAttribute('y',p.y-1.3);}else{p.el.setAttribute('cx',p.x);p.el.setAttribute('cy',p.y);}}
async function fall(list){const from=list.map(p=>({x:p.x,y:p.y}));
  await anim(1300,(t,raw)=>list.forEach((p,i)=>{const k=Math.max(0,Math.min(1,(raw-p.delay)/(1-p.delay||1)));const e=k*k;p.x=lerp(from[i].x,p.tx,k);p.y=lerp(from[i].y,p.ty,e);place(p);}));}
async function moveMag(x,y,ms){const a={...mag};await anim(ms,t=>setMag(lerp(a.x,x,t),lerp(a.y,y,t)));}
async function stir(){const from=parts.map(p=>({x:p.x,y:p.y}));const to=parts.map(()=>heapPoint());
  await anim(900,t=>parts.forEach((p,i)=>{p.x=lerp(from[i].x,to[i].x,t);p.y=lerp(from[i].y,to[i].y,t)-Math.sin(t*Math.PI)*6;place(p);}));}

Lab.steps([
  {title:'أضف برادة الحديد',text:'ضع برادة الحديد الرمادية في الطبق.',btn:'🧲 أضف برادة الحديد',
   run:async()=>{cap.textContent='برادة الحديد Fe';await fall(addParticles(110,'fe'));
     return '<b>ملاحظة:</b> برادة الحديد صلبة رمادية اللون، والحديد <b>عنصر</b> ينجذب إلى المغناطيس.';}},
  {title:'أضف مسحوق الكبريت واخلط',text:'أضف الكبريت الأصفر وحرّك الخليط.',btn:'🟡 أضف الكبريت واخلط',
   run:async()=>{cap.textContent='مسحوق الكبريت S';await fall(addParticles(110,'s'));await stir();cap.textContent='مخلوط الحديد والكبريت';
     return '<b>ملاحظة:</b> تكوّن <b>مخلوط</b>؛ ما زلنا نرى حبيبات الحديد الرمادية وحبيبات الكبريت الصفراء متمايزة، ولم تتكوّن مادة جديدة.';}},
  {title:'قرّب المغناطيس من المخلوط',text:'حرّك المغناطيس فوق الطبق.',btn:'🧲 قرّب المغناطيس',
   run:async()=>{cap.textContent='';await moveMag(210,262,1100);
     const fe=parts.filter(p=>p.type==='fe');const from=fe.map(p=>({x:p.x,y:p.y}));
     const to=fe.map((p,i)=>{const side=i%2?-29:29;return {x:210+side+(Math.random()-.5)*20,y:262+Math.random()*9};});
     await anim(1100,t=>fe.forEach((p,i)=>{p.x=lerp(from[i].x,to[i].x,t);p.y=lerp(from[i].y,to[i].y,t);place(p);}));
     fe.forEach(p=>{p.x-=210;p.y-=262;stuck.appendChild(p.el);place(p);});
     await moveMag(210,200,700);cap.textContent='انفصل الحديد عن الكبريت';
     return '<b>ملاحظة:</b> انجذبت برادة الحديد إلى المغناطيس وبقي الكبريت في الطبق.<br>استطعنا <b>فصل المخلوط بطريقة فيزيائية</b> لأن كل مادة في المخلوط تحتفظ بخصائصها.';}},
  {title:'سخّن المخلوط في أنبوب الاختبار',text:'أعد الحديد للمخلوط، ثم انقله إلى الأنبوب وسخّنه.',btn:'🔥 انقل المخلوط وسخّنه',
   run:async()=>{
     const fe=parts.filter(p=>p.type==='fe');
     await moveMag(210,262,600);
     fe.forEach(p=>{p.x+=210;p.y+=262;dish.appendChild(p.el);place(p);});
     const to1=fe.map(()=>heapPoint());const f1=fe.map(p=>({x:p.x,y:p.y}));
     await Promise.all([anim(700,t=>fe.forEach((p,i)=>{p.x=lerp(f1[i].x,to1[i].x,t);p.y=lerp(f1[i].y,to1[i].y,t);place(p);})),moveMag(720,60,900)]);
     cap.textContent='نقل المخلوط إلى أنبوب الاختبار';
     const from=parts.map(p=>({x:p.x,y:p.y}));const mixRect=$('tubeMix');
     await anim(1400,(t,raw)=>{parts.forEach((p,i)=>{const k=Math.min(1,Math.max(0,raw*1.3-p.delay*.5));const ty=lerp(from[i].y,90,Math.sin(k*Math.PI/2));p.x=lerp(from[i].x,470,k);p.y=k<.6?lerp(from[i].y,90,k/.6):lerp(90,250,(k-.6)/.4);p.el.setAttribute('opacity',k>.85?0:1);place(p);});
       const h=45*raw;mixRect.setAttribute('y',283-h);mixRect.setAttribute('height',h);});
     const sp=$('tubeSpeck');for(let i=0;i<60;i++)svg('circle',{cx:456+Math.random()*28,cy:240+Math.random()*42,r:1.2,fill:i%2?'#facc15':'#7b858b'},sp);
     cap.textContent='التسخين…';const flame=$('flame');await anim(500,t=>flame.setAttribute('opacity',t));flame.classList.add('pulse');
     await wait(900);const glow=$('tubeGlow');
     await anim(2200,t=>{glow.setAttribute('opacity',t);glow.setAttribute('cy',lerp(275,250,t));glow.setAttribute('r',lerp(16,46,t));});
     cap.textContent='إبعاد اللهب… التوهّج مستمر!';flame.classList.remove('pulse');await anim(500,t=>flame.setAttribute('opacity',1-t));
     await anim(2200,t=>{mixRect.setAttribute('fill',mix('#a39a62','#1d1d1f',t));sp.setAttribute('opacity',1-t);glow.setAttribute('opacity',1-t*.95);});
     cap.textContent='تكوّنت مادة صلبة سوداء';
     return '<b>ملاحظة:</b> توهّج الخليط واستمر التوهّج حتى بعد إبعاد اللهب، أي أن التفاعل <b>طارد للحرارة</b>، ونتج صلب أسود هو <b>كبريتيد الحديد (II)</b>.<span class="eq">Fe + S → FeS</span>';}},
  {title:'اختبر الناتج بالمغناطيس',text:'قرّب المغناطيس من المادة السوداء.',btn:'🧲 قرّب المغناطيس من الناتج',
   run:async()=>{cap.textContent='';await moveMag(400,262,1100);
     await anim(900,(t,raw)=>setMag(400+Math.sin(raw*Math.PI*4)*8,262));
     cap.textContent='الناتج لا ينجذب للمغناطيس';
     return '<b>ملاحظة:</b> لم تنجذب المادة السوداء إلى المغناطيس. تكوّن <b>مركّب جديد</b> خصائصه تختلف عن خصائص الحديد والكبريت، ولا يمكن فصل عناصره بالمغناطيس.';}}
],{
  intro:'اضغط الزر الأخضر لبدء التجربة خطوة بخطوة.',
  quiz:[
    {q:'لماذا انجذب الحديد إلى المغناطيس في الخطوة الثالثة؟',opts:['لأن الحديد في المخلوط يحتفظ بخصائصه','لأن الحديد والكبريت تفاعلا معًا','لأن الكبريت ينجذب للمغناطيس','لأن المخلوط مركّب'],correct:0,why:'مكوّنات المخلوط غير مترابطة كيميائيًا، فيبقى الحديد حديدًا وينجذب للمغناطيس.'},
    {q:'ما الدليل على حدوث تغيّر كيميائي عند التسخين؟',opts:['تغيّر لون المخلوط فقط عند خلطه','تكوّن مادة سوداء جديدة لا تنجذب للمغناطيس مع توهّج','بقاء الحديد والكبريت متمايزين','انصهار الكبريت ثم تجمّده'],correct:1,why:'تكوّن مادة جديدة بخصائص مختلفة وانطلاق حرارة دليلان على التفاعل الكيميائي.'},
    {q:'ما الصيغة الكيميائية لناتج التفاعل؟',opts:['FeO','Fe₂S₃','FeS','SO₂'],correct:2,why:'الحديد + الكبريت ← كبريتيد الحديد (II) وصيغته FeS.'}
  ]
});
})();
