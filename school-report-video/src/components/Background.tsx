import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C } from "../theme";

/** نجمة ثمانية هندسية (نقش مستوحى من الزخرفة الإسلامية) */
const star8 = (cx: number, cy: number, r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI / 8) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.62;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
};

const TILE = 120;

/**
 * خلفية متحركة متعددة الطبقات: تدرج عميق + شبكة نجوم هندسية تنجرف ببطء
 * + أضواء ناعمة متحركة + حزم ضوئية + تظليل الأطراف.
 */
export const Background: React.FC<{ hue?: "green" | "gold"; intensity?: number }> = ({ hue = "green", intensity = 1 }) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const driftX = (t * 6) % TILE;
  const driftY = (t * 3) % TILE;
  const orbA = { x: 70 + Math.sin(t * 0.13) * 12, y: 30 + Math.cos(t * 0.11) * 10 };
  const orbB = { x: 22 + Math.cos(t * 0.09) * 10, y: 75 + Math.sin(t * 0.12) * 8 };
  const beam = interpolate(Math.sin(t * 0.25), [-1, 1], [0.04, 0.1]);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 40%, ${C.bg2} 0%, ${C.bg1} 45%, ${C.bg0} 100%)` }}>
      {/* أضواء ناعمة */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(38% 45% at ${orbA.x}% ${orbA.y}%, ${hue === "gold" ? "rgba(233,207,138,0.16)" : "rgba(63,163,126,0.20)"} 0%, transparent 70%),
                       radial-gradient(30% 38% at ${orbB.x}% ${orbB.y}%, rgba(201,162,75,${0.1 * intensity}) 0%, transparent 70%)`,
        }}
      />
      {/* شبكة النجوم الهندسية */}
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.11 * intensity }}>
        <defs>
          <pattern id="stars" width={TILE} height={TILE} patternUnits="userSpaceOnUse" patternTransform={`translate(${-driftX} ${driftY})`}>
            <polygon points={star8(TILE / 2, TILE / 2, 30)} fill="none" stroke={C.goldLight} strokeWidth={1} />
            <rect x={TILE / 2 - 15} y={TILE / 2 - 15} width={30} height={30} fill="none" stroke={C.goldLight} strokeWidth={0.6} transform={`rotate(45 ${TILE / 2} ${TILE / 2})`} />
            <path d={`M0 0 L${TILE} ${TILE} M${TILE} 0 L0 ${TILE}`} stroke={C.mint} strokeWidth={0.35} opacity={0.6} />
            <circle cx={0} cy={0} r={3} fill={C.goldLight} opacity={0.6} />
          </pattern>
          <radialGradient id="fadeMask" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#fff" stopOpacity={0.25} />
            <stop offset="70%" stopColor="#fff" stopOpacity={1} />
          </radialGradient>
          <mask id="m">
            <rect width="100%" height="100%" fill="url(#fadeMask)" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#stars)" mask="url(#m)" />
      </svg>
      {/* حزم ضوئية مائلة */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(115deg, transparent 30%, rgba(233,207,138,${beam}) 45%, transparent 55%, transparent 62%, rgba(255,255,255,${beam * 0.5}) 68%, transparent 74%)`,
          transform: `translateX(${Math.sin(t * 0.07) * 120}px)`,
        }}
      />
      {/* تظليل الأطراف */}
      <AbsoluteFill style={{ background: "radial-gradient(85% 75% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
      {/* إطار ذهبي رفيع */}
      <AbsoluteFill style={{ border: "1px solid rgba(233,207,138,0.12)", margin: 28, borderRadius: 4 }} />
    </AbsoluteFill>
  );
};
