import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { easeInOut } from "../lib/anim";
import { C } from "../theme";

/** غلاف المشهد: دخول سينمائي (تكبير + ضبابية) وخروج ناعم */
export const SceneFrame: React.FC<{ children: React.ReactNode; enter?: number; exit?: number }> = ({
  children,
  enter = 20,
  exit = 16,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const inP = interpolate(frame, [0, enter], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  const outP = interpolate(frame, [durationInFrames - exit, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeInOut,
  });
  const opacity = inP * (1 - outP);
  const scale = 1.035 - 0.035 * inP - 0.02 * outP;
  const blur = (1 - inP) * 10 + outP * 8;
  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})`, filter: blur > 0.05 ? `blur(${blur}px)` : undefined }}>
      {children}
    </AbsoluteFill>
  );
};

/** وميض انتقالي ذهبي عند الفواصل بين المشاهد */
export const LightSweep: React.FC = () => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  const x = interpolate(p, [0, 1], [120, -60]);
  const o = interpolate(p, [0, 0.3, 0.7, 1], [0, 0.85, 0.5, 0]);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen", opacity: o }}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(105deg, transparent ${x - 12}%, rgba(233,207,138,0.0) ${x - 8}%, rgba(233,207,138,0.55) ${x}%, rgba(255,255,255,0.35) ${x + 1.5}%, transparent ${x + 9}%)`,
        }}
      />
      <AbsoluteFill style={{ background: `radial-gradient(60% 60% at 50% 50%, ${C.gold}22, transparent 70%)` }} />
    </AbsoluteFill>
  );
};
