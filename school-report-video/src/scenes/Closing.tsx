import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { report, TIMELINE } from "../config";
import { Beat } from "../components/Beat";
import { Icon } from "../components/Icon";
import { SourceTag } from "../components/ui";
import { cue, easeInOut, mark, pop, progress, sec } from "../lib/anim";
import { digits, fitSize } from "../lib/format";
import { C, F } from "../theme";
import { Emblem, LogoPlate } from "./Intro";

const FROM = TIMELINE[5].from;
const END = sec(TIMELINE[5].to - TIMELINE[5].from);

export const Closing: React.FC = () => {
  const frame = useCurrentFrame();
  const cl = report.closing;
  const m = report.meta;
  const tA = cue("n19", FROM) - 10;
  const tB = cue("n20", FROM) - 14;
  const icons = ["arrowUp", "flag", "target"] as const;

  const plate = progress(frame, tB, 40, easeInOut);
  const finalFade = interpolate(frame, [END - 30, END], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      {/* A: الرسائل الختامية */}
      <Beat from={tA} to={tB} fadeOut={20}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 30 }}>
          {cl.messages.map((msg, i) => {
            const p = pop(frame, tA + 12 + i * sec(1.6), 15);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 26, opacity: p, transform: `translateY(${(1 - p) * 30}px)`, width: 1640 }}>
                <div style={{ width: 80, height: 80, borderRadius: 22, background: `linear-gradient(135deg, ${C.goldLight}, ${C.gold})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name={icons[i % icons.length]} size={46} color={C.bg0} stroke={2} draw={p} />
                </div>
                <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 44, color: C.white, lineHeight: 1.45 }}>{msg.text}</div>
              </div>
            );
          })}
          {(() => {
            const v = progress(frame, mark("n19", "vision", FROM, 0.4) - 10, 40);
            return (
              <div style={{ marginTop: 40, width: 1640, borderTop: `1px solid ${C.gold}55`, paddingTop: 34, opacity: v, transform: `translateY(${(1 - v) * 20}px)` }}>
                <div style={{ fontFamily: F.body, fontSize: 24, color: C.gold, marginBottom: 10 }}>رؤية المدرسة</div>
                <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 38, color: C.ivory, lineHeight: 1.7 }}>«{cl.vision.text}»</div>
                <SourceTag page={cl.vision.page} style={{ marginTop: 12 }} />
              </div>
            );
          })()}
        </AbsoluteFill>
      </Beat>

      {/* B: اللوحة الختامية الرسمية */}
      <Beat from={tB} to={END + 5} fadeIn={30}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", top: 540 - 300, left: 960 - 300, opacity: 0.35 * plate }}>
            <Emblem size={600} draw={plate} spin={frame * 0.04} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <LogoPlate opacity={plate} scale={0.95 + 0.05 * plate} />
            <div style={{ height: 2, width: 520 * plate, background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`, marginTop: 34 }} />
            <div style={{ fontFamily: F.display, fontWeight: 900, fontSize: fitSize(m.schoolLabel, 100, 16, 66), color: C.white, lineHeight: 1.4, textAlign: "center", opacity: progress(frame, tB + 18, 30) }}>
              {m.schoolLabel}
            </div>
            <div style={{ fontFamily: F.display, fontWeight: 600, fontSize: 44, color: C.goldLight, opacity: progress(frame, tB + 30, 30) }}>
              {m.reportTitle} · العام الدراسي {digits(m.academicYear)}م
            </div>
            <div style={{ fontFamily: F.body, fontSize: 26, color: C.grey2, marginTop: 10, opacity: progress(frame, tB + 44, 30) }}>
              {m.wilayat} · محافظة {m.governorate} · سلطنة عُمان
            </div>
            <div style={{ height: 2, width: 520 * plate, background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`, marginTop: 18 }} />
          </div>
        </AbsoluteFill>
      </Beat>
      <AbsoluteFill style={{ background: "#000", opacity: finalFade }} />
    </AbsoluteFill>
  );
};
