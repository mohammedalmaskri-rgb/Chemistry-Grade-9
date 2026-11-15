import random, sys
random.seed(7)
W,H=1600,1200
o=[]
a=o.append
a(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">')
a('''<defs>
<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E4ECF7"/><stop offset=".7" stop-color="#CBD8EA"/><stop offset="1" stop-color="#B9C9E0"/></linearGradient>
<radialGradient id="glow" cx=".5" cy=".22" r=".55"><stop offset="0" stop-color="#FFF8E8" stop-opacity=".95"/><stop offset=".5" stop-color="#FFF3DA" stop-opacity=".35"/><stop offset="1" stop-color="#FFF" stop-opacity="0"/></radialGradient>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8EC5F4"/><stop offset=".55" stop-color="#CFE7FB"/><stop offset="1" stop-color="#FFF7E6"/></linearGradient>
<linearGradient id="frame" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E9EEF5"/><stop offset=".5" stop-color="#FFFFFF"/><stop offset="1" stop-color="#D5DEEA"/></linearGradient>
<linearGradient id="ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFBEF" stop-opacity=".55"/><stop offset="1" stop-color="#FFFBEF" stop-opacity="0"/></linearGradient>
<filter id="wood" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="0.004 0.09" numOctaves="4" seed="3" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.29  0 0 0 0 0.16  0 0 0 1.2 -0.25" result="g"/>
  <feComposite in="g" in2="SourceGraphic" operator="in" result="gg"/>
  <feBlend in="gg" in2="SourceGraphic" mode="multiply"/>
</filter>
<filter id="woodH" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="0.09 0.004" numOctaves="4" seed="5" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.27  0 0 0 0 0.15  0 0 0 1.1 -0.25" result="g"/>
  <feComposite in="g" in2="SourceGraphic" operator="in" result="gg"/>
  <feBlend in="gg" in2="SourceGraphic" mode="multiply"/>
</filter>
<filter id="soft"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="blur2"><feGaussianBlur stdDeviation="1.6"/></filter>
<filter id="blur1"><feGaussianBlur stdDeviation=".7"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="9"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".09"/></feComponentTransfer></filter>
<radialGradient id="vig" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#0B1830" stop-opacity=".45"/></radialGradient>
<linearGradient id="shelfShadow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A1A0C" stop-opacity=".55"/><stop offset="1" stop-color="#2A1A0C" stop-opacity="0"/></linearGradient>
<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A8805C"/><stop offset="1" stop-color="#7A563A"/></linearGradient>
<linearGradient id="tableTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2C4B7E"/><stop offset=".25" stop-color="#1D3863"/><stop offset="1" stop-color="#132848"/></linearGradient>
<linearGradient id="metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0F1F3A"/><stop offset=".45" stop-color="#2B4673"/><stop offset="1" stop-color="#0F1F3A"/></linearGradient>
<linearGradient id="screen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#CFE4FF"/><stop offset="1" stop-color="#7FA9E0"/></linearGradient>
<radialGradient id="lampLight" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#FFE7A8" stop-opacity=".75"/><stop offset="1" stop-color="#FFE7A8" stop-opacity="0"/></radialGradient>
<linearGradient id="chair" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#365993"/><stop offset=".5" stop-color="#5677AE"/><stop offset="1" stop-color="#26467A"/></linearGradient>
<linearGradient id="pot" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#B85A3E"/><stop offset=".45" stop-color="#E88A6B"/><stop offset="1" stop-color="#9C4730"/></linearGradient>
<linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4CC08A"/><stop offset="1" stop-color="#1E7A4E"/></linearGradient>
<linearGradient id="bookShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset=".25" stop-color="#fff" stop-opacity=".18"/><stop offset=".45" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></linearGradient>
</defs>''')
# wall + glow
a(f'<rect width="{W}" height="{H}" fill="url(#wall)"/>')
a(f'<rect width="{W}" height="{H}" fill="url(#glow)"/>')
# wainscot
a(f'<rect y="840" width="{W}" height="140" fill="#B8C7DD"/><rect y="836" width="{W}" height="8" fill="#E9EFF8"/>')
# window
wx,ww,wtop,wbot=620,360,40,620
a(f'<path d="M{wx-26} {wbot+26}V{wtop+180}a{ww/2+26} {ww/2+26} 0 0 1 {ww+52} 0V{wbot+26}z" fill="url(#frame)"/>')
a(f'<path d="M{wx} {wbot}V{wtop+180}a{ww/2} {ww/2} 0 0 1 {ww} 0V{wbot}z" fill="url(#sky)"/>')
# clouds/trees outside
a(f'<g filter="url(#soft)" opacity=".8"><ellipse cx="{wx+90}" cy="250" rx="90" ry="26" fill="#fff"/><ellipse cx="{wx+260}" cy="190" rx="70" ry="20" fill="#fff"/></g>')
a(f'<g filter="url(#soft)" opacity=".85">'+''.join(f'<circle cx="{wx+x}" cy="{wbot-r*0.6}" r="{r}" fill="{c}"/>' for x,r,c in [(20,60,"#7DB88C"),(80,80,"#6CA97C"),(150,55,"#85C095"),(215,75,"#6FAE7E"),(290,65,"#7AB68A"),(345,70,"#68A578")])+'</g>'+f'<circle cx="{wx+250}" cy="150" r="34" fill="#FFF1C2" filter="url(#blur2)"/>')
a(f'<path d="M{wx+ww/2} {wtop}V{wbot}M{wx} {wtop+290}H{wx+ww}" stroke="url(#frame)" stroke-width="14"/>')
a(f'<rect x="{wx-50}" y="{wbot+20}" width="{ww+100}" height="22" rx="4" fill="#F4F7FB"/><rect x="{wx-50}" y="{wbot+42}" width="{ww+100}" height="8" fill="#9FB1CA" opacity=".6"/>')
# light rays
a(f'<g style="mix-blend-mode:screen" filter="url(#soft)"><polygon points="{wx},{wbot} {wx+ww},{wbot} {wx+ww+260},{H} {wx-260},{H}" fill="url(#ray)"/></g>')
# shelves
def shelf(x,w,seedoff):
    random.seed(seedoff)
    top,bot=110,1010
    g=[]
    g.append(f'<rect x="{x-22}" y="{top-30}" width="{w+44}" height="{bot-top+50}" rx="6" fill="#9A6A42" filter="url(#wood)"/>')
    g.append(f'<rect x="{x}" y="{top}" width="{w}" height="{bot-top}" fill="#5C3D24"/>')
    g.append(f'<rect x="{x}" y="{top}" width="{w}" height="{bot-top}" fill="#7B5434" filter="url(#wood)" opacity=".8"/>')
    cols=['#1D3863','#26467A','#365993','#5677AE','#86A2CC','#C9A23F','#E3B84E','#2F8A5E','#1F6B47','#C8664A','#A84B36','#F0E2C4','#3D3D52','#7A2E2E','#2C5F8A']
    levels=[290,470,650,830,1000]
    prev=top
    for ly in levels:
        # back shadow under shelf above
        g.append(f'<rect x="{x}" y="{prev}" width="{w}" height="46" fill="url(#shelfShadow)"/>')
        cx=x+8
        while cx<x+w-20:
            r=random.random()
            if r<0.06:  # gap with stack of lying books
                sw=random.randint(70,95); y=ly
                for k in range(random.randint(2,4)):
                    bh=random.randint(16,22); c=random.choice(cols)
                    g.append(f'<rect x="{cx}" y="{y-bh}" width="{sw-k*4}" height="{bh}" rx="2" fill="{c}"/><rect x="{cx}" y="{y-bh}" width="{sw-k*4}" height="4" fill="#fff" opacity=".18"/>')
                    y-=bh
                cx+=sw+8; continue
            bw=random.randint(18,34); bh=random.randint(118,160) if ly-prev>170 else random.randint(110,150)
            bh=min(bh,ly-prev-18)
            c=random.choice(cols)
            tilt = r>0.965 and cx<x+w-80
            tr=f' transform="rotate(-9 {cx+bw} {ly})"' if tilt else ''
            g.append(f'<g{tr}><rect x="{cx}" y="{ly-bh}" width="{bw}" height="{bh}" rx="2.5" fill="{c}"/>'
                     f'<rect x="{cx}" y="{ly-bh}" width="{bw}" height="{bh}" rx="2.5" fill="url(#bookShade)"/>')
            if random.random()<0.7:
                yy=ly-bh+random.randint(12,22)
                g.append(f'<rect x="{cx+2}" y="{yy}" width="{bw-4}" height="3" fill="#E9C46A" opacity=".85"/><rect x="{cx+2}" y="{ly-26}" width="{bw-4}" height="3" fill="#E9C46A" opacity=".7"/>')
            if random.random()<0.5:
                g.append(f'<rect x="{cx+bw/2-3}" y="{ly-bh+40}" width="6" height="{random.randint(30,60)}" rx="2" fill="#fff" opacity=".35"/>')
            g.append('</g>')
            cx+=bw+(14 if tilt else random.choice([0,1,1,2]))
        # shelf board
        g.append(f'<rect x="{x-4}" y="{ly}" width="{w+8}" height="22" fill="#B07C4E" filter="url(#woodH)"/><rect x="{x-4}" y="{ly}" width="{w+8}" height="4" fill="#E2B888" opacity=".7"/><rect x="{x-4}" y="{ly+22}" width="{w+8}" height="10" fill="#2A1A0C" opacity=".35"/>')
        prev=ly+22
    # side boards highlight
    g.append(f'<rect x="{x-22}" y="{top-30}" width="22" height="{bot-top+50}" fill="#fff" opacity=".08"/>')
    return f'<g filter="url(#blur1)">{"".join(g)}</g>'
a(shelf(60,440,11)); a(shelf(1100,440,23))
# floor
a(f'<rect y="980" width="{W}" height="{H-980}" fill="url(#floor)"/>')
a(f'<rect y="980" width="{W}" height="{H-980}" fill="#8B6342" filter="url(#woodH)" opacity=".6"/>')
for i in range(0,W+200,180):
    a(f'<path d="M{i} 980 L{(i-W/2)*1.6+W/2} {H}" stroke="#5A3B24" stroke-width="2" opacity=".35"/>')
a(f'<rect y="976" width="{W}" height="8" fill="#5A3B24" opacity=".5"/>')
a(f'<ellipse cx="{W/2}" cy="1010" rx="520" ry="80" fill="#FFF3D6" opacity=".18" filter="url(#soft)"/>')
# table shadow
a(f'<ellipse cx="{W/2}" cy="1130" rx="470" ry="38" fill="#1A1008" opacity=".45" filter="url(#soft)"/>')
# chairs
def chair(x,flip):
    s=-1 if flip else 1
    back_x = x+ (150 if flip else 0)
    return (f'<g><rect x="{back_x-6}" y="700" width="26" height="260" rx="10" fill="url(#chair)"/>'
            f'<rect x="{x-10}" y="890" width="190" height="30" rx="12" fill="url(#chair)"/><rect x="{x-10}" y="890" width="190" height="6" rx="3" fill="#fff" opacity=".2"/>'
            f'<rect x="{x+6}" y="918" width="18" height="200" rx="6" fill="url(#metal)"/><rect x="{x+136}" y="918" width="18" height="200" rx="6" fill="url(#metal)"/></g>')
a(chair(300,False)); a(chair(1130,True))
# table
a(f'<rect x="440" y="860" width="30" height="270" rx="8" fill="url(#metal)"/><rect x="1130" y="860" width="30" height="270" rx="8" fill="url(#metal)"/>')
a(f'<rect x="400" y="820" width="800" height="48" rx="12" fill="url(#tableTop)"/><rect x="408" y="822" width="784" height="5" rx="2" fill="#fff" opacity=".25"/>')
# laptop
a('<g><rect x="490" y="640" width="250" height="170" rx="12" fill="#1A2D4F"/><rect x="503" y="653" width="224" height="144" rx="6" fill="url(#screen)"/>'
  '<rect x="520" y="676" width="120" height="10" rx="5" fill="#fff" opacity=".9"/><rect x="520" y="700" width="180" height="8" rx="4" fill="#fff" opacity=".7"/><rect x="520" y="718" width="150" height="8" rx="4" fill="#fff" opacity=".7"/>'
  '<rect x="520" y="745" width="58" height="34" rx="6" fill="#16A34A" opacity=".8"/><rect x="586" y="745" width="58" height="34" rx="6" fill="#E9B10A" opacity=".85"/><rect x="652" y="745" width="58" height="34" rx="6" fill="#C53030" opacity=".8"/>'
  '<path d="M462 820h306l-22-14H484z" fill="#9FB3D1"/><ellipse cx="615" cy="760" rx="170" ry="90" fill="#BFD9FF" opacity=".15" filter="url(#soft)"/></g>')
# stacked books on table
a('<g><rect x="830" y="784" width="190" height="34" rx="4" fill="#C9A23F"/><rect x="830" y="784" width="190" height="6" fill="#fff" opacity=".25"/>'
  '<rect x="846" y="750" width="168" height="34" rx="4" fill="#2F8A5E"/><rect x="846" y="750" width="168" height="6" fill="#fff" opacity=".22"/>'
  '<rect x="824" y="716" width="178" height="34" rx="4" fill="#C8664A"/><rect x="824" y="716" width="178" height="6" fill="#fff" opacity=".22"/>'
  '<rect x="1002" y="720" width="6" height="96" fill="#F0E2C4"/></g>')
# open book
a('<g><path d="M780 812c30-10 60-10 90 0v8c-30-8-60-8-90 0z" fill="#F7F1E3"/></g>')
# lamp
a('<path d="M720 220 L560 1000 L1060 1000 Z" fill="url(#lampLight)" opacity="0" />')
a('<g><polygon points="1090,612 900,810 1200,810" fill="url(#lampLight)" opacity=".55" filter="url(#soft)"/>'
  '<path d="M1130 816V660l-50-50" stroke="url(#metal)" stroke-width="12" fill="none" stroke-linecap="round"/>'
  '<path d="M1030 590l80-40 22 52-84 20z" fill="#E3B84E"/><path d="M1030 590l18 32" stroke="#FFF5D1" stroke-width="5"/>'
  '<ellipse cx="1130" cy="816" rx="40" ry="8" fill="#0F1F3A"/></g>')
# plant (right front)
a('<g><path d="M1395 1090l-22-150h150l-22 150z" fill="url(#pot)"/><rect x="1366" y="932" width="164" height="18" rx="6" fill="#C96F51"/>')
random.seed(4)
for k in range(13):
    ang=random.uniform(-70,70); ln=random.randint(110,200)
    a(f'<path d="M1448 935 q{ang*0.6} {-ln*0.6} {ang*1.6} {-ln} q{-ang*0.3} {ln*0.5} {-ang*1.6} {ln}z" fill="url(#leaf)" opacity="{random.uniform(.8,1):.2f}"/>')
a('</g>')
# vignette + grain
a(f'<rect width="{W}" height="{H}" fill="url(#vig)"/>')
a(f'<rect width="{W}" height="{H}" filter="url(#grain)"/>')
a('</svg>')
open(sys.argv[1],'w').write(''.join(o))
