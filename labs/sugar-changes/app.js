(function(){
'use strict';
const {$,anim,wait,lerp,mix,svg}=Lab;
const cap=$('caption'),cr=$('crystals'),water=$('water');
let xs=[];
function puff(group,x,y,color,ms,spread){
  const c=svg('circle',{cx:x,cy:y,r:4,fill:color,opacity:.0},group);const dx=(Math.random()-.5)*spread;
  anim(ms,(t,raw)=>{c.setAttribute('cy',y-raw*90);c.setAttribute('cx',x+dx*raw);c.setAttribute('r',4+raw*14);c.setAttribute('opacity',Math.sin(raw*Math.PI)*.55);}).then(()=>c.remove());
}
function loop(flag,fn,every){let on=true;(function f(){if(!on)return;fn();setTimeout(f,every+Math.random()*every);})();return ()=>{on=false;};}

Lab.steps([
  {title:'أضف السكّر إلى الماء',text:'ضع ملعقة سكّر في كأس الماء.',btn:'🥄 أضف السكّر',
   run:async()=>{cap.textContent='بلّورات السكّر في الماء';
     xs=[];for(let i=0;i<46;i++){const tx=145+Math.random()*70,ty=255+Math.random()*9;const r=svg('rect',{x:tx,y:120,width:4,height:4,fill:'#ffffff',transform:`rotate(${Math.random()*90} ${tx} ${ty})`},cr);xs.push({r,tx,ty,d:Math.random()*.4});}
     await anim(1300,(t,raw)=>xs.forEach(p=>{const k=Math.max(0,Math.min(1,(raw-p.d)/.6));p.r.setAttribute('y',lerp(120,p.ty,k*k));p.r.setAttribute('x',p.tx);}));
     return '<b>ملاحظة:</b> بلّورات السكّر البيضاء استقرّت في قاع الكأس.';}},
  {title:'حرّك بالساق الزجاجية',text:'حرّك حتى يذوب السكّر.',btn:'🌀 حرّك المحلول',
   run:async()=>{const rod=$('rod');rod.setAttribute('opacity',1);cap.textContent='التحريك…';
     await anim(2600,(t,raw)=>{rod.setAttribute('transform',`translate(${Math.sin(raw*Math.PI*8)*16},0)`);xs.forEach(p=>{p.r.setAttribute('opacity',Math.max(0,1-raw*1.25));const s=Math.max(.1,1-raw);p.r.setAttribute('width',4*s);p.r.setAttribute('height',4*s);});});
     await anim(400,t=>rod.setAttribute('opacity',1-t));cap.textContent='ذاب السكّر — المحلول شفاف';
     return '<b>ملاحظة:</b> اختفت البلّورات وأصبح المحلول شفافًا. السكّر لم يختفِ، بل <b>ذاب</b>: انتشرت جزيئاته بين جزيئات الماء، ولم تتكوّن مادة جديدة.';}},
  {title:'سخّن المحلول حتى يتبخّر الماء',text:'راقب ما يبقى في الكأس.',btn:'🔥 سخّن حتى التبخّر',
   run:async()=>{const f=$('flame1');await anim(500,t=>f.setAttribute('opacity',t));f.classList.add('pulse');cap.textContent='يتبخّر الماء…';
     const stop=loop(true,()=>puff($('steam'),150+Math.random()*60,196,'#e2f3ff',1800,30),140);
     const res=$('residue');const bits=[];for(let i=0;i<70;i++){const x=142+Math.random()*76;bits.push(svg('rect',{x,y:262-Math.random()*5,width:3.4,height:3.4,fill:'#ffffff',opacity:0,transform:`rotate(${Math.random()*90} ${x} 262)`},res));}
     await anim(5200,t=>{const top=lerp(200,264,t);water.setAttribute('y',top);bits.forEach((b,i)=>b.setAttribute('opacity',Math.max(0,Math.min(1,(t-.55-i/400)*3))));});
     stop();f.classList.remove('pulse');await anim(500,t=>f.setAttribute('opacity',1-t));cap.textContent='عادت بلّورات السكّر!';
     return '<b>ملاحظة:</b> تبخّر الماء وظهرت <b>بلّورات السكّر</b> من جديد في قاع الكأس.<br>ذوبان السكّر <b>تغيّر فيزيائي</b>: يمكن استعادة المادة الأصلية بسهولة.';}},
  {title:'سخّن السكّر الجاف بقوة',text:'في جفنة خزفية، وراقب لونه وما يتصاعد منه.',btn:'🔥 سخّن السكّر الجاف',
   run:async()=>{const f=$('flame2'),s=$('sugar2');await anim(500,t=>f.setAttribute('opacity',t));f.classList.add('pulse');
     const stops=[['#ffffff','#f6dd8a','ينصهر السكّر…'],['#f6dd8a','#a05a24','يتحوّل إلى اللون البني (كراميل)…'],['#a05a24','#141110','يسودّ ويتصاعد بخار ودخان!']];
     let stopSmoke=null;
     for(const [a,b,txt] of stops){cap.textContent=txt;if(b==='#141110')stopSmoke=loop(true,()=>puff($('smoke'),450+Math.random()*40,232,'#9ca3af',2200,40),110);
       else if(b==='#a05a24')stopSmoke=loop(true,()=>puff($('smoke'),455+Math.random()*30,232,'#e5e7eb',2000,30),260);
       await anim(2100,t=>{s.setAttribute('fill',mix(a,b,t));s.setAttribute('ry',lerp(8,b==='#141110'?10:7,t));});
       if(stopSmoke&&b!=='#141110'){stopSmoke();stopSmoke=null;}}
     await wait(1200);if(stopSmoke)stopSmoke();f.classList.remove('pulse');await anim(500,t=>f.setAttribute('opacity',1-t));
     cap.textContent='بقيت مادة سوداء (كربون)';
     return '<b>ملاحظة:</b> انصهر السكّر ثم أصبح بنيًّا ثم <b>أسود</b>، وتصاعد بخار ماء ودخان. المادة السوداء هي <b>الكربون</b>، ولا يمكن إرجاعها سكّرًا.<br>هذا <b>تغيّر كيميائي</b> تكوّنت فيه مواد جديدة.';}},
  {title:'قارن بين التغيّرين',text:'ما الفرق بين ما حدث في الكأس وما حدث في الجفنة؟',btn:'📋 اعرض المقارنة',
   run:async()=>{cap.textContent='فيزيائي ↔ كيميائي';
     return '<b>المقارنة:</b><br>🔹 <b>ذوبان السكّر:</b> تغيّر فيزيائي — لا تتكوّن مادة جديدة، ويمكن استعادة السكّر بالتبخير.<br>🔸 <b>تسخين السكّر بقوة:</b> تغيّر كيميائي — تتكوّن مواد جديدة (كربون وبخار ماء)، ولا يمكن إرجاع السكّر بسهولة.';}}
],{
  intro:'اضغط الزر الأخضر لبدء التجربة خطوة بخطوة.',
  quiz:[
    {q:'ذوبان السكّر في الماء مثال على:',opts:['تغيّر كيميائي','تغيّر فيزيائي','تفاعل تفكّك','تفاعل تكوين'],correct:1,why:'لم تتكوّن مادة جديدة، واستعدنا السكّر بتبخير الماء.'},
    {q:'كيف استعدنا السكّر من المحلول؟',opts:['بالترشيح','بالمغناطيس','بتبخير الماء','بإضافة ماء أكثر'],correct:2,why:'عند تبخّر الماء تبقى بلّورات السكّر الذائبة في الكأس.'},
    {q:'ما الدليل على أن تسخين السكّر الجاف بقوة تغيّر كيميائي؟',opts:['انصهار السكّر فقط','تكوّن مادة سوداء جديدة لا يمكن إرجاعها سكّرًا','بقاء السكّر أبيض اللون','تبخّر الماء من الكأس'],correct:1,why:'تكوّن الكربون وبخار الماء مواد جديدة، ولا يسهل إرجاع المادة الأصلية.'}
  ]
});
})();
