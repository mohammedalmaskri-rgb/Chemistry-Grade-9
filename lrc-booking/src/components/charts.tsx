/** مخططات خفيفة بدون مكتبات — سلسلة واحدة بالكحلي، مع تلميح عند المرور */

export interface BarDatum { label: string; value: number; tip: string; tone?: 'current' | 'future' | 'normal' }

function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

export function ColumnChart({ data, height = 200, unit = 'حجز' }: { data: BarDatum[]; height?: number; unit?: string }) {
  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const ticks = [max, max / 2, 0];
  return (
    <div className="flex gap-2" dir="rtl">
      {/* محور القيم */}
      <div className="flex flex-col justify-between pb-6 text-[11px] font-semibold text-navy-300" style={{ height }}>
        {ticks.map((t) => <span key={t} className="leading-none">{t}</span>)}
      </div>
      <div className="relative flex-1">
        <div className="absolute inset-x-0 top-0 flex flex-col justify-between" style={{ height: height - 24 }}>
          {ticks.map((t) => <div key={t} className={`border-t ${t === 0 ? 'border-navy-200' : 'border-dashed border-navy-100'}`} />)}
        </div>
        <div className="relative flex items-end gap-1 sm:gap-2" style={{ height }}>
          {data.map((d, i) => {
            const h = ((height - 24) * d.value) / max;
            const color = d.tone === 'current' ? 'bg-navy-800' : d.tone === 'future' ? 'bg-navy-300' : 'bg-navy-500';
            return (
              <div key={i} tabIndex={0} className="group relative flex h-full flex-1 flex-col items-center justify-end outline-none" aria-label={`${d.label}: ${d.value} ${unit}`}>
                <div className="pointer-events-none absolute z-10 -translate-y-2 whitespace-nowrap rounded-lg bg-navy-900 px-2.5 py-1.5 text-[11px] font-bold text-white opacity-0 shadow-lift transition group-hover:opacity-100 group-focus:opacity-100" style={{ bottom: h + 24 }}>
                  {d.tip}: <span className="text-sm">{d.value}</span>
                </div>
                <div className={`w-full max-w-[38px] rounded-t-[4px] transition group-hover:brightness-125 ${color}`} style={{ height: Math.max(h, d.value ? 3 : 0) }} />
                <div className={`mt-1.5 h-[18px] truncate text-[10px] font-bold sm:text-[11px] ${d.tone === 'current' ? 'text-navy-800' : 'text-navy-400'}`}>{d.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function BarList({ data, unit = 'حجز' }: { data: { label: string; value: number; sub?: string }[]; unit?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <ul className="grid gap-3">
      {data.map((d) => (
        <li key={d.label} className="group" title={`${d.label}: ${d.value} ${unit}`}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-bold text-navy-800">{d.label}{d.sub && <span className="mr-1.5 text-xs font-semibold text-navy-400">{d.sub}</span>}</span>
            <span className="shrink-0 font-extrabold text-navy-800">{d.value} <span className="text-xs font-semibold text-navy-400">({Math.round((d.value / total) * 100)}%)</span></span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-navy-50">
            <div className="h-full rounded-full bg-navy-600 transition-all group-hover:bg-navy-800" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
