import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { report, TIMELINE } from "../config";
import { Beat } from "../components/Beat";
import { GroupedBars, LineTrend, YearLegend } from "../components/charts";
import { Icon } from "../components/Icon";
import { Card, Counter, Pill, SceneHeader, SourceTag } from "../components/ui";
import { cue, mark, pop, progress, sec } from "../lib/anim";
import { digits, num } from "../lib/format";
import { C, F } from "../theme";

const FROM = TIMELINE[2].from;
const END = sec(TIMELINE[2].to - TIMELINE[2].from);

export const Achievement: React.FC = () => {
  const frame = useCurrentFrame();
  const a = report.achievement;
  const tA = cue("n07", FROM) - 10;
  const tB = cue("n08", FROM) - 10;
  const tC = cue("n09", FROM) - 10;
  const tD = cue("n10", FROM) - 10;
  const tE = cue("n11", FROM) - 10;
  const n08 = cue("n08", FROM);
  const n09 = cue("n09", FROM);

  // مزامنة نقاط المنحنى مع ذكر كل رقم في التعليق
  const pointStarts = [mark("n08", "p1", FROM, 0.17), mark("n08", "p2", FROM, 0.42), mark("n08", "p3", FROM, 0.66)];
  const verdictAt = mark("n08", "verdict", FROM, 0.95);

  // إبراز المواد المذكورة في التعليق n09
  const subjectIdx = (name: string) => a.subjects.findIndex((s) => s.name === name);
  const highlights: Record<number, number> = {};
  // اسم المادة ← علامة المزامنة في المقطع n09
  const hlPlan: [string, string, number][] = [
    ["التربية الإسلامية", "s1", 0.12],
    ["الرياضيات", "s2", 0.55],
    ["اللغة الإنجليزية", "s3", 0.93],
  ];
  hlPlan.forEach(([n, m, fb]) => {
    const i = subjectIdx(n);
    if (i >= 0) highlights[i] = Math.max(n09, mark("n09", m, FROM, fb) - 6);
  });

  const lastYear = a.years[a.years.length - 1];

  return (
    <AbsoluteFill>
      <SceneHeader index={3} title="التحصيل الدراسي" subtitle={a.metricLabel} start={4} />

      {/* A: تعريف المؤشر */}
      <Beat from={tA} to={tB}>
        <div style={{ position: "absolute", top: 290, right: 110, left: 110, display: "flex", alignItems: "center", gap: 70 }}>
          {(() => {
            const s = pop(frame, tA + 14, 14);
            return (
              <div
                style={{
                  width: 400,
                  height: 400,
                  borderRadius: 200,
                  border: `2px solid ${C.gold}`,
                  boxShadow: `0 0 80px ${C.gold}44, inset 0 0 60px ${C.gold}22`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${s})`,
                  background: `radial-gradient(circle, rgba(201,162,75,0.18), transparent 70%)`,
                }}
              >
                <div style={{ fontFamily: F.display, fontWeight: 900, fontSize: 130, color: C.goldLight, lineHeight: 1.1 }}>
                  <Counter value={75} start={tA + 14} dur={40} />٪
                </div>
                <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 40, color: C.white }}>فأعلى</div>
              </div>
            );
          })()}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 52, color: C.white, lineHeight: 1.5, opacity: progress(frame, tA + 24, 26) }}>
              نسبة الإتقان
            </div>
            <div style={{ fontFamily: F.body, fontSize: 34, color: C.grey1, lineHeight: 1.7, marginTop: 10, opacity: progress(frame, tA + 34, 26) }}>
              {a.metricLabel}
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 36 }}>
              {a.years.map((y, i) => (
                <Pill key={y} style={{ fontSize: 30, padding: "10px 30px", opacity: progress(frame, tA + sec(5) + i * 10, 18) }}>
                  العام الدراسي {digits(y)}م
                </Pill>
              ))}
            </div>
            <SourceTag page={a.overall.page} style={{ marginTop: 30 }} opacity={progress(frame, tA + 50, 20)} />
          </div>
        </div>
      </Beat>

      {/* B: نسبة الإتقان العامة */}
      <Beat from={tB} to={tC}>
        <div style={{ position: "absolute", top: 230, right: 110, left: 110, display: "flex", gap: 40 }}>
          <Card style={{ flex: 1, padding: "26px 30px 10px" }} glow>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 38, color: C.white }}>نسبة الإتقان العامة</div>
              <SourceTag page={a.overall.page} />
            </div>
            <LineTrend values={a.overall.values} labels={a.years} start={tB} width={1080} height={600} min={50} max={100} pointStarts={pointStarts} />
          </Card>
          <div style={{ width: 520, display: "flex", flexDirection: "column", gap: 26 }}>
            {(() => {
              const at = verdictAt - sec(1.4);
              const s = pop(frame, at, 12);
              const gain = a.overall.values[a.overall.values.length - 1] - a.overall.values[0];
              return (
                <>
                  <Card style={{ padding: 34, opacity: s, transform: `translateX(${(1 - s) * -40}px)` }}>
                    <div style={{ fontFamily: F.body, fontSize: 24, color: C.grey2 }}>
                      التغير بين {digits(a.years[0])}م و{digits(lastYear)}م
                    </div>
                    <div style={{ fontFamily: F.display, fontWeight: 900, fontSize: 82, color: C.positive, lineHeight: 1.3, display: "flex", alignItems: "center", gap: 14 }}>
                      <Icon name="arrowUp" size={64} color={C.positive} stroke={2.4} draw={s} />
                      <Counter value={gain} start={at} decimals={2} dur={40} />
                    </div>
                    <div style={{ fontFamily: F.body, fontSize: 24, color: C.grey1 }}>نقطة مئوية</div>
                  </Card>
                  {(() => {
                    const v = pop(frame, verdictAt - 4, 10);
                    return (
                      <Card glow style={{ padding: 34, opacity: v, transform: `scale(${0.8 + 0.2 * v})`, textAlign: "center" }}>
                        <div style={{ fontFamily: F.body, fontSize: 26, color: C.grey2 }}>الحكم العام على نسبة الإتقان</div>
                        <div style={{ fontFamily: F.display, fontWeight: 900, fontSize: 92, color: C.goldLight, lineHeight: 1.4, textShadow: `0 0 30px ${C.gold}66` }}>
                          {a.overall.verdict}
                        </div>
                      </Card>
                    );
                  })()}
                  <div style={{ opacity: progress(frame, pointStarts[2] + 20, 20) }}>
                    <div style={{ fontFamily: F.body, fontSize: 21, color: C.grey2, marginBottom: 8 }}>عدد الطالبات الحاصلات على ٧٥٪ فأعلى</div>
                    <div style={{ display: "flex", gap: 12 }}>
                      {a.overall.counts.map((c, i) => (
                        <div key={i} style={{ flex: 1, textAlign: "center", border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: "8px 4px" }}>
                          <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 32, color: C.white }}>{num(c)}</div>
                          <div style={{ fontFamily: F.body, fontSize: 18, color: C.grey2 }}>{digits(a.years[i])}م</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </Beat>

      {/* C: المواد الدراسية عبر السنوات */}
      <Beat from={tC} to={tD}>
        <div style={{ position: "absolute", top: 230, right: 110, left: 110 }}>
          <Card style={{ padding: "28px 40px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 36, color: C.white }}>نسب الإتقان حسب المادة · جميع الصفوف</div>
              <YearLegend years={a.years} opacity={progress(frame, tC + 10, 20)} />
            </div>
            <GroupedBars groups={a.subjects} years={a.years} start={tC + 10} width={1620} height={580} highlights={highlights} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: F.body, fontSize: 19, color: C.grey2 }}>
                القيم نسب مئوية (٪) · الفرق محسوب بين {digits(a.years[0])}م و{digits(lastYear)}م
              </div>
              <SourceTag page={[18, 19, 20]} />
            </div>
          </Card>
        </div>
      </Beat>

      {/* D: الصف التاسع + ما يحتاج إلى تطوير */}
      <Beat from={tD} to={tE}>
        <div style={{ position: "absolute", top: 230, right: 110, left: 110, display: "flex", gap: 34 }}>
          <Card style={{ flex: 1.15, padding: "26px 32px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 32, color: C.white }}>
                {a.focus.title} · {a.focus.grade}
              </div>
              <YearLegend years={a.years} />
            </div>
            <GroupedBars
              groups={a.focus.subjects}
              years={a.years}
              start={tD + 10}
              width={900}
              height={540}
              highlights={{ 0: mark("n10", "chem", FROM, 0.25) - 6, 1: mark("n10", "watch", FROM, 0.5) + sec(2.6), 2: mark("n10", "watch", FROM, 0.5) + sec(2.6), 3: mark("n10", "watch", FROM, 0.5) + sec(2.6) }}
              valueFontSize={20}
            />
            <SourceTag page={[18, 19, 20]} />
          </Card>
          <Card style={{ flex: 0.85, padding: "30px 34px", borderColor: `${C.warn}55` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
              <Icon name="target" size={46} color={C.warn} draw={progress(frame, tD + 20, 30)} />
              <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 32, color: C.warn }}>ما يحتاج إلى تطوير</div>
            </div>
            {a.needsDevelopment.map((s, i) => {
              const at = mark("n10", "watch", FROM, 0.5) + i * sec(1.3);
              const p = progress(frame, at, 22);
              return (
                <div key={i} style={{ display: "flex", gap: 14, padding: "14px 0", borderTop: i ? "1px solid rgba(255,255,255,0.07)" : undefined, opacity: p, transform: `translateX(${(1 - p) * -30}px)` }}>
                  <div style={{ width: 10, height: 10, borderRadius: 5, background: C.warn, marginTop: 16, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: F.body, fontWeight: 500, fontSize: 25, color: C.white, lineHeight: 1.55 }}>{s.text}</div>
                    <SourceTag page={s.page} style={{ fontSize: 14 }} />
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      </Beat>

      {/* E: الاختبارات الدولية */}
      <Beat from={tE} to={END}>
        <div style={{ position: "absolute", top: 240, right: 110, left: 110 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 26 }}>
            <Icon name="globe" size={54} color={C.goldLight} draw={progress(frame, tE + 6, 30)} />
            <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 40, color: C.white }}>{a.benchmark.title}</div>
            <Pill style={{ marginInlineStart: 10 }}>{a.benchmark.note}</Pill>
          </div>
          <div style={{ display: "flex", gap: 40 }}>
            {a.benchmark.pairs.map((p, i) => {
              const at = mark("n11", i === 0 ? "sci" : "math", FROM, i === 0 ? 0.4 : 0.75);
              const s = pop(frame, at - 10);
              // محور يبدأ من الصفر لتجنب تضخيم الفروق بصريًا
              const hi = Math.ceil((Math.max(p.school, p.reference) * 1.15) / 100) * 100;
              const w = (v: number) => (v / hi) * 100;
              const bp = progress(frame, at, 40);
              const col = p.positive ? C.positive : C.warn;
              return (
                <Card key={p.label} glow={p.positive} style={{ flex: 1, padding: 40, opacity: s, transform: `translateY(${(1 - s) * 40}px)`, borderColor: `${col}55` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 44, color: C.white }}>{p.label}</div>
                    <Pill color={col} style={{ fontSize: 24 }}>{p.verdict}</Pill>
                  </div>
                  <div style={{ fontFamily: F.display, fontWeight: 900, fontSize: 120, color: col, lineHeight: 1.3 }}>
                    <Counter value={p.school} start={at} dur={40} />
                  </div>
                  <div style={{ fontFamily: F.body, fontSize: 24, color: C.grey1, marginTop: -6 }}>نتيجة المدرسة</div>
                  <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 14 }}>
                    {[
                      { l: "المدرسة", v: p.school, c: col },
                      { l: p.referenceLabel, v: p.reference, c: C.grey2 },
                    ].map((r) => (
                      <div key={r.l} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ width: 120, fontFamily: F.body, fontSize: 22, color: C.grey1 }}>{r.l}</div>
                        <div style={{ flex: 1, height: 20, background: "rgba(255,255,255,0.06)", borderRadius: 10 }}>
                          <div style={{ width: `${w(r.v) * bp}%`, height: 20, background: r.c, borderRadius: 10, opacity: 0.9 }} />
                        </div>
                        <div style={{ width: 70, fontFamily: F.display, fontWeight: 700, fontSize: 26, color: C.white }}>{num(r.v)}</div>
                      </div>
                    ))}
                  </div>
                  <SourceTag page={p.page} style={{ marginTop: 22 }} />
                </Card>
              );
            })}
          </div>
        </div>
      </Beat>
    </AbsoluteFill>
  );
};
