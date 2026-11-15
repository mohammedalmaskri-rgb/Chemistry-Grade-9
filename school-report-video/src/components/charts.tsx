import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { easeInOut, easeOut, pop, progress } from "../lib/anim";
import { digits, num } from "../lib/format";
import { C, F, yearColors } from "../theme";

/** اتجاه محور الزمن: true = الأقدم على اليمين (متسق مع القراءة العربية) */
export const TIME_RTL = true;

/* ------------------------------------------------------------------ */
/* مخطط خطي لاتجاه زمني                                               */
/* ------------------------------------------------------------------ */
export const LineTrend: React.FC<{
  values: number[];
  labels: string[];
  start: number;
  width: number;
  height: number;
  min?: number;
  max?: number;
  decimals?: number;
  /** إطارات بدء ظهور كل نقطة (لمزامنتها مع التعليق) */
  pointStarts?: number[];
}> = ({ values, labels, start, width, height, min = 0, max = 100, decimals = 2, pointStarts }) => {
  const frame = useCurrentFrame();
  const padX = 90;
  const padTop = 90;
  const padBottom = 70;
  const n = values.length;
  const xs = values.map((_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    return padX + (TIME_RTL ? 1 - t : t) * (width - padX * 2);
  });
  const ys = values.map((v) => padTop + (1 - (v - min) / (max - min)) * (height - padTop - padBottom));
  const starts = pointStarts ?? values.map((_, i) => start + 20 + i * 30);

  // تقدم رسم الخط: يصل إلى كل نقطة عند موعدها
  const segProgress = (i: number) => (i === 0 ? 1 : progress(frame, starts[i] - 18, 26, easeInOut));
  let d = `M ${xs[0]} ${ys[0]}`;
  let area = `M ${xs[0]} ${height - padBottom} L ${xs[0]} ${ys[0]}`;
  for (let i = 1; i < n; i++) {
    const p = segProgress(i);
    if (p <= 0) break;
    const x = xs[i - 1] + (xs[i] - xs[i - 1]) * p;
    const y = ys[i - 1] + (ys[i] - ys[i - 1]) * p;
    d += ` L ${x} ${y}`;
    area += ` L ${x} ${y}`;
    if (p < 1) {
      area += ` L ${x} ${height - padBottom}`;
      break;
    }
    if (i === n - 1) area += ` L ${x} ${height - padBottom}`;
  }
  if (n > 1 && segProgress(1) <= 0) area += ` L ${xs[0]} ${height - padBottom}`;
  area += " Z";

  const gridIn = progress(frame, start, 30);
  const gridLines = [0, 25, 50, 75, 100].filter((g) => g >= min && g <= max);

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="lt-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.gold} stopOpacity={0.35} />
          <stop offset="100%" stopColor={C.gold} stopOpacity={0} />
        </linearGradient>
        <filter id="lt-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {gridLines.map((g) => {
        const y = padTop + (1 - (g - min) / (max - min)) * (height - padTop - padBottom);
        return (
          <g key={g} opacity={gridIn * 0.9}>
            <line x1={padX - 30} x2={padX - 30 + (width - padX * 2 + 60) * gridIn} y1={y} y2={y} stroke="rgba(255,255,255,0.09)" strokeDasharray="4 8" />
            <text x={width - 20} y={y + 7} fill={C.grey3} fontSize={20} fontFamily={F.body} textAnchor="end">
              {digits(g)}٪
            </text>
          </g>
        );
      })}
      <path d={area} fill="url(#lt-area)" />
      <path d={d} fill="none" stroke={C.goldLight} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" filter="url(#lt-glow)" />
      {values.map((v, i) => {
        const s = pop(frame, starts[i], 12);
        const cnt = interpolate(frame, [starts[i], starts[i] + 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
        const isLast = i === n - 1;
        return (
          <g key={i} opacity={Math.min(1, s * 1.5)}>
            <line x1={xs[i]} x2={xs[i]} y1={ys[i]} y2={height - padBottom} stroke="rgba(233,207,138,0.25)" strokeDasharray="3 6" />
            <circle cx={xs[i]} cy={ys[i]} r={22 * s} fill={C.gold} opacity={0.18} />
            <circle cx={xs[i]} cy={ys[i]} r={11 * s} fill={isLast ? C.goldLight : C.bg1} stroke={C.goldLight} strokeWidth={4} />
            <text
              x={xs[i]}
              y={ys[i] - 36}
              fill={isLast ? C.goldLight : C.white}
              fontSize={isLast ? 54 : 44}
              fontWeight={800}
              fontFamily={F.display}
              textAnchor="middle"
            >
              {num(v * cnt, decimals)}٪
            </text>
            <text x={xs[i]} y={height - padBottom + 48} fill={C.grey1} fontSize={28} fontFamily={F.display} fontWeight={600} textAnchor="middle">
              {digits(labels[i])}م
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* أعمدة مجمّعة: مادة × سنوات                                          */
/* ------------------------------------------------------------------ */
export const GroupedBars: React.FC<{
  groups: { name: string; values: number[]; status?: "improved" | "watch" | "neutral" }[];
  years: string[];
  start: number;
  width: number;
  height: number;
  max?: number;
  stagger?: number;
  /** إطارات تبدأ عندها إضاءة مجموعات معينة (index -> frame) */
  highlights?: Record<number, number>;
  valueFontSize?: number;
}> = ({ groups, years, start, width, height, max = 100, stagger = 7, highlights = {}, valueFontSize = 22 }) => {
  const frame = useCurrentFrame();
  const padBottom = 92;
  const padTop = 56;
  const chartH = height - padBottom - padTop;
  const gw = width / groups.length;
  const barW = Math.min(46, (gw * 0.72) / years.length);
  const gap = 8;
  const highlightActive = Object.keys(highlights).length > 0 && Object.values(highlights).some((f) => frame >= f);

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <line x1={0} x2={width} y1={padTop + chartH} y2={padTop + chartH} stroke="rgba(255,255,255,0.18)" />
      {[25, 50, 75].map((g) => (
        <line key={g} x1={0} x2={width} y1={padTop + chartH * (1 - g / max)} y2={padTop + chartH * (1 - g / max)} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 8" />
      ))}
      {groups.map((g, gi) => {
        // RTL: أول مجموعة على اليمين
        const cx = width - (gi + 0.5) * gw;
        const totalW = years.length * barW + (years.length - 1) * gap;
        const hl = highlights[gi];
        const isHl = hl !== undefined && frame >= hl;
        const dim = highlightActive && !isHl ? 0.35 : 1;
        const hlP = hl !== undefined ? progress(frame, hl, 18) : 0;
        const first = g.values[0];
        const last = g.values[g.values.length - 1];
        const delta = last - first;
        const deltaIn = progress(frame, start + 40 + gi * stagger + years.length * 6, 20);
        return (
          <g key={gi} opacity={interpolate(dim, [0, 1], [0, 1])} style={{ transition: "none" }}>
            {isHl && (
              <rect x={cx - totalW / 2 - 18} y={padTop - 46} width={totalW + 36} height={chartH + 46 + 80} rx={18} fill="rgba(233,207,138,0.07)" stroke="rgba(233,207,138,0.35)" opacity={hlP} />
            )}
            {g.values.map((v, yi) => {
              const idx = TIME_RTL ? years.length - 1 - yi : yi;
              const x = cx - totalW / 2 + idx * (barW + gap);
              const p = progress(frame, start + gi * stagger + yi * 6, 34);
              const h = (v / max) * chartH * p;
              const y = padTop + chartH - h;
              return (
                <g key={yi}>
                  <rect x={x} y={y} width={barW} height={h} rx={6} fill={yearColors[Math.max(0, yearColors.length - years.length + yi)]} opacity={yi === years.length - 1 ? 1 : 0.85} />
                  <text
                    x={x + barW / 2}
                    y={y - 10}
                    fill={yi === years.length - 1 ? C.goldLight : C.grey1}
                    fontSize={valueFontSize}
                    fontFamily={F.body}
                    fontWeight={600}
                    textAnchor="middle"
                    opacity={p}
                  >
                    {num(v, v >= 100 ? 0 : 1)}
                  </text>
                </g>
              );
            })}
            <text x={cx} y={padTop + chartH + 40} fill={C.white} fontSize={24} fontFamily={F.display} fontWeight={700} textAnchor="middle">
              {g.name}
            </text>
            <g opacity={deltaIn}>
              <text
                x={cx}
                y={padTop + chartH + 74}
                fill={delta >= 0 ? C.positive : C.warn}
                fontSize={21}
                fontFamily={F.body}
                fontWeight={700}
                textAnchor="middle"
                direction="rtl"
              >
                {`${delta >= 0 ? "▲" : "▼"} ${num(Math.abs(delta), 2)} نقطة`}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* حلقة نسبة مئوية                                                     */
/* ------------------------------------------------------------------ */
export const Ring: React.FC<{
  value: number;
  start: number;
  size: number;
  stroke?: number;
  color?: string;
  track?: string;
  decimals?: number;
  label?: string;
  dur?: number;
}> = ({ value, start, size, stroke = 22, color = C.gold, track = "rgba(255,255,255,0.08)", decimals = 1, label, dur = 50 }) => {
  const frame = useCurrentFrame();
  const p = progress(frame, start, dur);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg) scaleY(-1)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - (value / 100) * p)}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: size * 0.2, color: C.white, lineHeight: 1.1 }}>
          {num(value * p, decimals)}٪
        </div>
        {label && <div style={{ fontFamily: F.body, fontSize: Math.max(18, size * 0.075), color: C.grey2, marginTop: 6 }}>{label}</div>}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* أعمدة أفقية                                                         */
/* ------------------------------------------------------------------ */
export const HBars: React.FC<{
  items: { label: string; value: number; color?: string; extra?: React.ReactNode }[];
  start: number;
  width: number;
  max: number;
  rowH?: number;
  decimals?: number;
  suffix?: string;
  stagger?: number;
}> = ({ items, start, width, max, rowH = 64, decimals = 0, suffix = "", stagger = 6 }) => {
  const frame = useCurrentFrame();
  const labelW = 230;
  const barMax = width - labelW - 120;
  return (
    <div style={{ width }}>
      {items.map((it, i) => {
        const p = progress(frame, start + i * stagger, 32);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", height: rowH, opacity: Math.min(1, p * 2) }}>
            <div style={{ width: labelW, fontFamily: F.display, fontWeight: 600, fontSize: 25, color: C.white, display: "flex", alignItems: "center", gap: 12 }}>
              {it.extra}
              {it.label}
            </div>
            <div style={{ flex: 1, height: 18, position: "relative" }}>
              <div style={{ position: "absolute", insetInlineStart: 0, top: 0, height: 18, width: barMax, background: "rgba(255,255,255,0.06)", borderRadius: 9 }} />
              <div
                style={{
                  position: "absolute",
                  insetInlineStart: 0,
                  top: 0,
                  height: 18,
                  width: (it.value / max) * barMax * p,
                  background: `linear-gradient(270deg, ${it.color ?? C.gold}, ${C.goldLight})`,
                  borderRadius: 9,
                  boxShadow: `0 0 20px ${it.color ?? C.gold}55`,
                }}
              />
            </div>
            <div style={{ width: 110, fontFamily: F.display, fontWeight: 800, fontSize: 32, color: C.goldLight, textAlign: "left" }}>
              {num(it.value * p, decimals)}
              {suffix}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** مفتاح ألوان السنوات */
export const YearLegend: React.FC<{ years: string[]; opacity?: number }> = ({ years, opacity = 1 }) => (
  <div style={{ display: "flex", gap: 26, opacity, fontFamily: F.body, fontSize: 22, color: C.grey1 }}>
    {years.map((y, i) => (
      <div key={y} style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 18, height: 18, borderRadius: 5, background: yearColors[Math.max(0, yearColors.length - years.length + i)], display: "inline-block" }} />
        {digits(y)}م
      </div>
    ))}
  </div>
);

/* ------------------------------------------------------------------ */
/* أعمدة اتجاه بسيطة (قيمة واحدة لكل فترة)                              */
/* ------------------------------------------------------------------ */
export const ColumnTrend: React.FC<{
  values: number[];
  labels: string[];
  start: number;
  width: number;
  height: number;
  stagger?: number;
}> = ({ values, labels, start, width, height, stagger = 10 }) => {
  const frame = useCurrentFrame();
  const n = values.length;
  const max = Math.max(...values) * 1.12;
  const padTop = 60;
  const padBottom = 60;
  const chartH = height - padTop - padBottom;
  const slot = width / n;
  const bw = Math.min(120, slot * 0.5);
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <line x1={0} x2={width} y1={padTop + chartH} y2={padTop + chartH} stroke="rgba(255,255,255,0.18)" />
      {values.map((v, i) => {
        const idx = TIME_RTL ? n - 1 - i : i;
        const cx = slot * (idx + 0.5);
        const p = progress(frame, start + i * stagger, 36);
        const h = (v / max) * chartH * p;
        const last = i === n - 1;
        return (
          <g key={i}>
            <rect x={cx - bw / 2} y={padTop + chartH - h} width={bw} height={h} rx={10} fill={last ? C.goldLight : yearColors[Math.min(i, yearColors.length - 2)]} opacity={last ? 1 : 0.85} />
            <text x={cx} y={padTop + chartH - h - 14} fill={last ? C.goldLight : C.white} fontSize={34} fontWeight={800} fontFamily={F.display} textAnchor="middle" opacity={p}>
              {num(v * p)}
            </text>
            <text x={cx} y={padTop + chartH + 40} fill={C.grey1} fontSize={22} fontFamily={F.display} fontWeight={600} textAnchor="middle" direction="rtl">
              {digits(labels[i])}م
            </text>
          </g>
        );
      })}
    </svg>
  );
};
