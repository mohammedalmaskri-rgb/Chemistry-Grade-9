import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { DISPLAY } from "../config";
import { easeOut, progress } from "../lib/anim";
import { digits, num, pageRef } from "../lib/format";
import { C, F } from "../theme";

/** عداد رقمي متحرك — حتمي ومبني على الإطارات */
export const Counter: React.FC<{
  value: number;
  start: number;
  dur?: number;
  decimals?: number;
  suffix?: string;
  style?: React.CSSProperties;
}> = ({ value, start, dur = 45, decimals = 0, suffix = "", style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  return (
    <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>
      {num(value * p, decimals)}
      {suffix}
    </span>
  );
};

/** عنوان المشهد: رقم الفصل + عنوان + خط ذهبي يُرسم */
export const SceneHeader: React.FC<{ index: number; title: string; subtitle?: string; start?: number }> = ({
  index,
  title,
  subtitle,
  start = 0,
}) => {
  const frame = useCurrentFrame();
  const p = progress(frame, start, 26);
  const line = progress(frame, start + 8, 30);
  const sub = progress(frame, start + 16, 24);
  return (
    <div style={{ position: "absolute", top: 70, right: 110, left: 110, display: "flex", alignItems: "center", gap: 28 }}>
      <div
        style={{
          fontFamily: F.display,
          fontWeight: 800,
          fontSize: 30,
          color: C.bg0,
          background: `linear-gradient(135deg, ${C.goldLight}, ${C.gold})`,
          width: 74,
          height: 74,
          borderRadius: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${0.6 + 0.4 * p}) rotate(${(1 - p) * -20}deg)`,
          opacity: p,
          boxShadow: "0 10px 30px rgba(201,162,75,0.35)",
        }}
      >
        {digits(String(index).padStart(2, "0"))}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: F.display,
            fontWeight: 800,
            fontSize: 50,
            color: C.white,
            lineHeight: 1.25,
            opacity: p,
            transform: `translateX(${(1 - p) * -40}px)`,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 6 }}>
          <div style={{ height: 3, width: 220 * line, background: `linear-gradient(90deg, transparent, ${C.gold})`, borderRadius: 2 }} />
          {subtitle && (
            <div style={{ fontFamily: F.body, fontSize: 24, color: C.grey2, opacity: sub, fontWeight: 400 }}>{subtitle}</div>
          )}
        </div>
      </div>
    </div>
  );
};

/** بطاقة زجاجية */
export const Card: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  glow?: boolean;
}> = ({ children, style, glow }) => (
  <div
    style={{
      background: `linear-gradient(160deg, rgba(255,255,255,0.085), rgba(255,255,255,0.025))`,
      border: `1px solid ${C.cardBorder}`,
      borderRadius: 26,
      boxShadow: glow ? `0 0 0 1px rgba(233,207,138,0.25), 0 20px 60px rgba(0,0,0,0.35), 0 0 60px rgba(201,162,75,0.15)` : "0 20px 50px rgba(0,0,0,0.30)",
      backdropFilter: "blur(6px)",
      position: "relative",
      ...style,
    }}
  >
    {children}
  </div>
);

/** مرجع صفحة التقرير */
export const SourceTag: React.FC<{ page: number | number[] | string; style?: React.CSSProperties; opacity?: number }> = ({
  page,
  style,
  opacity = 1,
}) => {
  if (!DISPLAY.sourceTags) return null;
  return (
    <div
      style={{
        fontFamily: F.body,
        fontSize: 17,
        color: C.grey2,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        opacity: opacity * 0.9,
        ...style,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 3, background: C.gold, display: "inline-block" }} />
      المصدر: التقرير، {pageRef(page)}
    </div>
  );
};

/** شارة صغيرة */
export const Pill: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({
  children,
  color = C.gold,
  style,
}) => (
  <span
    style={{
      fontFamily: F.body,
      fontWeight: 600,
      fontSize: 20,
      color,
      border: `1px solid ${color}55`,
      background: `${color}18`,
      padding: "6px 16px",
      borderRadius: 999,
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      ...style,
    }}
  >
    {children}
  </span>
);
