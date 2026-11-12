import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { report, TIMELINE } from "../config";
import { Beat } from "../components/Beat";
import { Icon } from "../components/Icon";
import { Card, Counter, SceneHeader, SourceTag } from "../components/ui";
import { cue, mark, pop, progress, sec } from "../lib/anim";
import { digits } from "../lib/format";
import { C, F } from "../theme";

const FROM = TIMELINE[4].from;
const END = sec(TIMELINE[4].to - TIMELINE[4].from);

export const Evaluation: React.FC = () => {
  const frame = useCurrentFrame();
  const ev = report.evaluation;
  const tA = cue("n16", FROM) - 10;
  const tB = cue("n17", FROM) - 10;
  const n16 = cue("n16", FROM);
  const n17 = cue("n17", FROM);
  const n18 = cue("n18", FROM);

  // أوقات ذكر المجالات الخمسة في المقطع n16
  const domainAt = [1, 2, 3, 4, 5].map((k) => mark("n16", `d${k}`, FROM, 0.3 + k * 0.13) - 4);
  const strengthAt = [1, 2, 3, 4].map((k) => mark("n17", `s${k}`, FROM, 0.05 + k * 0.22) - 4);
  const improveAt = [1, 2, 3, 4].map((k) => mark("n18", `i${k}`, FROM, 0.05 + k * 0.22) - 4);

  return (
    <AbsoluteFill>
      <SceneHeader index={5} title="التقويم الذاتي والتطوير" subtitle="نتائج التحليل الذاتي للمدرسة في مجالات إطار تقويم الأداء" start={4} />

      {/* A: المجالات الخمسة */}
      <Beat from={tA} to={tB}>
        <div style={{ position: "absolute", top: 270, right: 110, left: 110, display: "flex", gap: 24 }}>
          {ev.domains.map((d, i) => {
            const s = pop(frame, tA + 14 + i * 7);
            const h = progress(frame, domainAt[i] ?? tA, 14);
            return (
              <Card
                key={d.name}
                glow={h > 0.5}
                style={{
                  flex: 1,
                  padding: "34px 24px",
                  height: 560,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  opacity: s,
                  transform: `translateY(${(1 - s) * 60 - h * 14}px)`,
                  borderColor: `rgba(233,207,138,${0.2 + 0.5 * h})`,
                }}
              >
                <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 22, color: C.gold }}>المجال {digits(i + 1)}</div>
                <div
                  style={{
                    width: 104,
                    height: 104,
                    borderRadius: 52,
                    marginTop: 18,
                    background: h > 0 ? `linear-gradient(135deg, ${C.goldLight}, ${C.gold})` : "rgba(143,211,182,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={d.icon} size={58} color={h > 0 ? C.bg0 : C.mint} draw={s} />
                </div>
                <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 31, color: C.white, lineHeight: 1.45, marginTop: 22, minHeight: 92 }}>{d.name}</div>
                <div style={{ flex: 1 }} />
                <div style={{ display: "flex", gap: 14, width: "100%" }}>
                  <div style={{ flex: 1, background: "rgba(111,209,164,0.1)", borderRadius: 16, padding: "12px 6px" }}>
                    <div style={{ fontFamily: F.display, fontWeight: 900, fontSize: 46, color: C.positive, lineHeight: 1.2 }}>
                      <Counter value={d.strengths.length} start={tA + 30 + i * 7} dur={30} />
                    </div>
                    <div style={{ fontFamily: F.body, fontSize: 18, color: C.grey1 }}>جوانب إجادة</div>
                  </div>
                  <div style={{ flex: 1, background: "rgba(227,163,91,0.1)", borderRadius: 16, padding: "12px 6px" }}>
                    <div style={{ fontFamily: F.display, fontWeight: 900, fontSize: 46, color: C.warn, lineHeight: 1.2 }}>
                      <Counter value={d.improvements.length} start={tA + 36 + i * 7} dur={30} />
                    </div>
                    <div style={{ fontFamily: F.body, fontSize: 18, color: C.grey1 }}>تحتاج إلى تحسين</div>
                  </div>
                </div>
                <SourceTag page={d.page} style={{ marginTop: 14, fontSize: 14 }} />
              </Card>
            );
          })}
        </div>
      </Beat>

      {/* B + C: الإجادة ثم التحسين في عرض متوازن */}
      <Beat from={tB} to={END}>
        <div style={{ position: "absolute", top: 250, right: 110, left: 110, display: "flex", gap: 40 }}>
          {[
            { title: "أبرز جوانب الإجادة", items: ev.keyStrengths, at: strengthAt, color: C.positive, icon: "check" as const, head: n17 - 4 },
            { title: "أبرز الجوانب التي تحتاج إلى تحسين", items: ev.keyImprovements, at: improveAt, color: C.warn, icon: "target" as const, head: n18 - 4 },
          ].map((col) => {
            const hp = progress(frame, col.head, 22);
            return (
              <div key={col.title} style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22, opacity: Math.max(0.25, hp) }}>
                  <div style={{ width: 58, height: 58, borderRadius: 16, background: `${col.color}22`, border: `1px solid ${col.color}66`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={col.icon} size={36} color={col.color} draw={hp} stroke={2.2} />
                  </div>
                  <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 36, color: col.color }}>{col.title}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {col.items.map((s, i) => {
                    const p = pop(frame, col.at[i] ?? col.head + i * 30, 15);
                    return (
                      <Card
                        key={i}
                        style={{
                          padding: "22px 30px",
                          display: "flex",
                          alignItems: "center",
                          gap: 20,
                          opacity: 0.12 + 0.88 * p,
                          transform: `translateX(${(1 - p) * 40}px)`,
                          borderColor: `${col.color}${p > 0.5 ? "66" : "22"}`,
                          borderInlineStart: `5px solid ${col.color}`,
                          minHeight: 132,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 30, color: C.white, lineHeight: 1.5 }}>{s.text}</div>
                          <div style={{ display: "flex", gap: 18, alignItems: "center", marginTop: 6 }}>
                            {s.domain && <div style={{ fontFamily: F.body, fontSize: 19, color: C.grey2 }}>مجال: {s.domain}</div>}
                            <SourceTag page={s.page} style={{ fontSize: 15 }} />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Beat>
    </AbsoluteFill>
  );
};
