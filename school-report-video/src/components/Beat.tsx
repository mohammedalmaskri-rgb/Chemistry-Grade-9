import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { easeInOut } from "../lib/anim";

/**
 * مقطع فرعي داخل المشهد يظهر بين إطارين (نسبةً إلى بداية المشهد)
 * مع تلاشٍ وانزلاق خفيف عند الدخول والخروج.
 */
export const Beat: React.FC<{
  from: number;
  to: number;
  children: React.ReactNode;
  fadeIn?: number;
  fadeOut?: number;
  style?: React.CSSProperties;
}> = ({ from, to, children, fadeIn = 18, fadeOut = 16, style }) => {
  const frame = useCurrentFrame();
  if (frame < from - 1 || frame > to + 1) return null;
  const i = interpolate(frame, [from, from + fadeIn], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  const o = interpolate(frame, [to - fadeOut, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  return (
    <AbsoluteFill
      style={{
        opacity: i * (1 - o),
        transform: `translateY(${(1 - i) * 30 - o * 20}px)`,
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
