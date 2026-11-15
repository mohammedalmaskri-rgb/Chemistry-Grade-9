import { useId } from 'react';

/** رسم توضيحي لمركز مصادر التعلم (SVG داخلي — لا يحتاج اتصالاً خارجياً) */
const BOOK_COLORS = ['#1D3863', '#5677AE', '#F5C451', '#2F9E6B', '#E07A5F', '#86A2CC', '#26467A', '#F2A541'];

function Shelf({ x, y, w, seed }: { x: number; y: number; w: number; seed: number }) {
  const books: JSX.Element[] = [];
  let cx = x + 6;
  let i = 0;
  while (cx < x + w - 14) {
    const bw = 9 + ((seed * 7 + i * 5) % 8);
    const bh = 34 + ((seed * 3 + i * 11) % 18);
    const tilt = (i + seed) % 9 === 4;
    books.push(
      <rect
        key={i}
        x={cx}
        y={y - bh}
        width={bw}
        height={bh}
        rx="1.5"
        fill={BOOK_COLORS[(seed + i * 3) % BOOK_COLORS.length]}
        transform={tilt ? `rotate(-12 ${cx + bw} ${y})` : undefined}
      />,
    );
    cx += bw + (tilt ? 8 : 2);
    i++;
  }
  return (
    <g>
      {books}
      <rect x={x} y={y} width={w} height="7" rx="2" fill="#C9A27A" />
    </g>
  );
}

export function LibraryIllustration({ className = '' }: { className?: string }) {
  // معرّفات فريدة حتى لا تتعارض التدرجات عند وجود أكثر من نسخة في الصفحة
  const uid = useId().replace(/:/g, '');
  const wall = `wall${uid}`;
  const win = `win${uid}`;
  return (
    <svg viewBox="0 0 600 460" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="مركز مصادر التعلم">
      <defs>
        <linearGradient id={wall} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EAF1FB" />
          <stop offset="1" stopColor="#D7E3F4" />
        </linearGradient>
        <linearGradient id={win} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#BFE0FF" />
          <stop offset="1" stopColor="#F2F8FF" />
        </linearGradient>
      </defs>
      <rect width="600" height="460" fill={`url(#${wall})`} />
      {/* نافذة */}
      <path d="M240 60a60 60 0 0 1 120 0v130H240z" fill={`url(#${win})`} stroke="#fff" strokeWidth="8" />
      <path d="M300 4v186M240 110h120" stroke="#fff" strokeWidth="5" />
      <circle cx="330" cy="70" r="14" fill="#FFE7A3" opacity=".9" />
      {/* رفوف يمين ويسار */}
      <rect x="22" y="40" width="190" height="330" rx="8" fill="#B88B60" />
      <rect x="32" y="50" width="170" height="310" rx="4" fill="#F7EBDD" />
      {[110, 180, 250, 320].map((y, k) => <Shelf key={k} x={32} y={y} w={170} seed={k + 1} />)}
      <rect x="388" y="40" width="190" height="330" rx="8" fill="#B88B60" />
      <rect x="398" y="50" width="170" height="310" rx="4" fill="#F7EBDD" />
      {[110, 180, 250, 320].map((y, k) => <Shelf key={k} x={398} y={y} w={170} seed={k + 5} />)}
      {/* أرضية */}
      <rect y="370" width="600" height="90" fill="#C7D6EB" />
      <rect y="370" width="600" height="6" fill="#B1C4E0" />
      {/* طاولة القراءة */}
      <ellipse cx="300" cy="430" rx="150" ry="12" fill="#0F1F3A" opacity=".12" />
      <rect x="170" y="300" width="260" height="16" rx="6" fill="#1D3863" />
      <rect x="190" y="316" width="12" height="104" rx="4" fill="#162C4F" />
      <rect x="398" y="316" width="12" height="104" rx="4" fill="#162C4F" />
      {/* حاسوب */}
      <rect x="196" y="244" width="86" height="54" rx="5" fill="#26467A" />
      <rect x="202" y="250" width="74" height="42" rx="3" fill="#9CC3F5" />
      <path d="M210 262h40M210 271h56M210 280h32" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M186 300h106l-8-6h-90z" fill="#5677AE" />
      {/* كتب مكدسة */}
      <rect x="318" y="284" width="64" height="12" rx="2" fill="#F5C451" />
      <rect x="324" y="272" width="56" height="12" rx="2" fill="#2F9E6B" />
      <rect x="314" y="260" width="60" height="12" rx="2" fill="#E07A5F" />
      {/* مصباح */}
      <path d="M400 300v-46l-16-14" stroke="#162C4F" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M368 236l26-12 6 16-28 6z" fill="#F5C451" />
      <rect x="390" y="296" width="22" height="6" rx="3" fill="#162C4F" />
      {/* نبتة */}
      <path d="M520 370l-8-38h40l-8 38z" fill="#E07A5F" />
      <path d="M532 332c-18-20-22-44-8-58 4 22 10 34 8 58zM532 332c16-18 30-26 40-22-10 12-22 18-40 22zM532 332c-10-16-28-22-38-16 10 10 22 14 38 16z" fill="#2F9E6B" />
      {/* كرسيان */}
      <rect x="120" y="330" width="56" height="10" rx="4" fill="#5677AE" />
      <rect x="128" y="270" width="10" height="70" rx="4" fill="#5677AE" />
      <rect x="126" y="340" width="8" height="70" rx="3" fill="#26467A" />
      <rect x="162" y="340" width="8" height="70" rx="3" fill="#26467A" />
      <rect x="424" y="330" width="56" height="10" rx="4" fill="#5677AE" />
      <rect x="462" y="270" width="10" height="70" rx="4" fill="#5677AE" />
      <rect x="430" y="340" width="8" height="70" rx="3" fill="#26467A" />
      <rect x="466" y="340" width="8" height="70" rx="3" fill="#26467A" />
    </svg>
  );
}
