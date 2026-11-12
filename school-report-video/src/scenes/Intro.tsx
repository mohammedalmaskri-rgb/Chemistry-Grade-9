import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { report } from "../config";
import { cue, easeInOut, progress, sec } from "../lib/anim";
import { digits } from "../lib/format";
import { C, F } from "../theme";
import { Pill, SourceTag } from "../components/ui";

const FROM = 0;

/** شعار هندسي مرسوم (نجمة ثمانية متداخلة) — زخرفي وليس شعارًا رسميًا */
export const Emblem: React.FC<{ size: number; draw: number; spin?: number }> = ({ size, draw, spin = 0 }) => {
  const r = size / 2;
  const sq = (rot: number) => (
    <rect
      x={r - r * 0.62}
      y={r - r * 0.62}
      width={r * 1.24}
      height={r * 1.24}
      fill="none"
      stroke={C.goldLight}
      strokeWidth={2}
      transform={`rotate(${rot} ${r} ${r})`}
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - draw}
    />
  );
  return (
    <svg width={size} height={size} style={{ transform: `rotate(${spin}deg)`, overflow: "visible" }}>
      <circle cx={r} cy={r} r={r * 0.96} fill="none" stroke={C.gold} strokeWidth={1.2} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} opacity={0.7} />
      <circle cx={r} cy={r} r={r * 0.9} fill="none" stroke={C.gold} strokeWidth={0.6} strokeDasharray="2 10" opacity={0.6 * draw} />
      {sq(0)}
      {sq(45)}
      <circle cx={r} cy={r} r={r * 0.3} fill="none" stroke={C.goldLight} strokeWidth={1.5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
    </svg>
  );
};

/** لوحة الشعارات الرسمية (صور مستخرجة من التقرير نفسه — بلا إعادة رسم) */
export const LogoPlate: React.FC<{ opacity: number; scale?: number }> = ({ opacity, scale = 1 }) => {
  const { ministry, vision } = report.meta.logos;
  if (!ministry && !vision) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 38,
        background: "rgba(250,248,242,0.96)",
        padding: "14px 34px",
        borderRadius: 20,
        opacity,
        transform: `scale(${scale})`,
        boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
      }}
    >
      {ministry && <Img src={staticFile(ministry)} style={{ height: 96 }} />}
      {ministry && vision && <div style={{ width: 1, height: 70, background: "rgba(0,0,0,0.15)" }} />}
      {vision && <Img src={staticFile(vision)} style={{ height: 78 }} />}
    </div>
  );
};

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const m = report.meta;
  const emblemDraw = progress(frame, 5, 70, easeInOut);
  const logos = progress(frame, 30, 30);
  const kicker = progress(frame, 70, 26);
  const titleWipe = progress(frame, 85, 40, easeInOut);
  const school = progress(frame, 120, 34);
  const year = progress(frame, 165, 30);
  const purposeAt = cue("n02", FROM);
  const purpose = progress(frame, purposeAt, 30);
  const chips = [progress(frame, purposeAt + sec(2.2), 20), progress(frame, purposeAt + sec(4.2), 20), progress(frame, purposeAt + sec(6.5), 20)];
  const drift = interpolate(frame, [0, 900], [1.0, 1.05]);
  const settle = progress(frame, purposeAt - 20, 40, easeInOut);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {/* إشعاع خلفي */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(35% 45% at 50% 46%, rgba(233,207,138,${0.18 * emblemDraw}) 0%, transparent 70%)`,
        }}
      />
      <div style={{ position: "absolute", top: 540 - 330 - settle * 40, left: 960 - 330, opacity: 0.55 - settle * 0.2, transform: `scale(${drift})` }}>
        <Emblem size={660} draw={emblemDraw} spin={frame * 0.03} />
      </div>

      <div style={{ position: "absolute", top: 72, display: "flex", justifyContent: "center", width: "100%" }}>
        <LogoPlate opacity={logos} scale={0.9 + 0.1 * logos} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: `translateY(${-settle * 70 + 40}px)` }}>
        <div style={{ fontFamily: F.body, fontSize: 30, color: C.goldLight, opacity: kicker, transform: `translateY(${(1 - kicker) * 16}px)`, display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ width: 60 * kicker, height: 2, background: C.gold }} />
          {report.intro.kicker}
          <span style={{ width: 60 * kicker, height: 2, background: C.gold }} />
        </div>
        <div
          style={{
            fontFamily: F.display,
            fontWeight: 900,
            fontSize: 124,
            color: C.white,
            marginTop: 8,
            lineHeight: 1.35,
            clipPath: `inset(0 0 0 ${(1 - titleWipe) * 100}%)`,
            textShadow: "0 10px 40px rgba(0,0,0,0.4)",
          }}
        >
          {m.reportTitle}
        </div>
        <div
          style={{
            fontFamily: F.display,
            fontWeight: 800,
            fontSize: 72,
            background: `linear-gradient(90deg, ${C.goldDeep}, ${C.goldLight} 45%, ${C.gold})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            opacity: school,
            transform: `translateY(${(1 - school) * 30}px)`,
            lineHeight: 1.4,
          }}
        >
          {m.schoolLabel} <span style={{ fontWeight: 500, fontSize: 52 }}>{m.gradesLabel}</span>
        </div>
        <div
          style={{
            marginTop: 22,
            fontFamily: F.display,
            fontWeight: 600,
            fontSize: 34,
            color: C.ivory,
            border: `1px solid ${C.gold}88`,
            borderRadius: 999,
            padding: "10px 40px",
            opacity: year,
            transform: `scale(${0.85 + 0.15 * year})`,
            background: "rgba(201,162,75,0.08)",
          }}
        >
          العام الدراسي {digits(m.academicYear)}م
        </div>

        <div style={{ marginTop: 46, fontFamily: F.body, fontSize: 32, color: C.grey1, maxWidth: 1300, textAlign: "center", lineHeight: 1.7, opacity: purpose, transform: `translateY(${(1 - purpose) * 20}px)` }}>
          {report.intro.purpose}
        </div>
        <div style={{ display: "flex", gap: 22, marginTop: 26 }}>
          {["جوانب القوة", "جوانب تحتاج إلى تحسين", "أدلة من واقع المدرسة"].map((t, i) => (
            <Pill key={t} color={i === 1 ? C.warn : i === 0 ? C.positive : C.goldLight} style={{ opacity: chips[i], transform: `translateY(${(1 - chips[i]) * 14}px)`, fontSize: 24 }}>
              {t}
            </Pill>
          ))}
        </div>
      </div>
      <SourceTag page={report.intro.page} style={{ position: "absolute", bottom: 60, left: 110 }} opacity={purpose} />
    </AbsoluteFill>
  );
};
