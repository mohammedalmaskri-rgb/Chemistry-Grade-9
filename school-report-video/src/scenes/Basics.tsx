import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { report, TIMELINE } from "../config";
import { Beat } from "../components/Beat";
import { HBars, Ring } from "../components/charts";
import { Icon } from "../components/Icon";
import { Card, Counter, Pill, SceneHeader, SourceTag } from "../components/ui";
import { cue, mark, pop, progress, sec } from "../lib/anim";
import { digits, num } from "../lib/format";
import { C, F } from "../theme";

const FROM = TIMELINE[1].from;
const END = sec(TIMELINE[1].to - TIMELINE[1].from);

export const Basics: React.FC = () => {
  const frame = useCurrentFrame();
  const b = report.basics;
  const m = report.meta;
  const tA = cue("n03", FROM) - 10;
  const tB = cue("n04", FROM) - 8;
  const tC = cue("n05", FROM) - 8;
  const tD = cue("n06", FROM) - 8;

  return (
    <AbsoluteFill>
      <SceneHeader index={2} title="البيانات الأساسية" subtitle={`${m.schoolLabel} · ${m.wilayat} · ${m.governorate}`} start={4} />

      {/* A: هوية المدرسة */}
      <Beat from={tA} to={tB}>
        <div style={{ position: "absolute", top: 300, right: 110, left: 110, display: "flex", gap: 40, alignItems: "stretch" }}>
          <Card style={{ flex: 1.1, padding: 50, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }} glow>
            <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
              <Icon name="location" size={70} color={C.goldLight} draw={progress(frame, tA + 10, 40)} />
              <div>
                <div style={{ fontFamily: F.body, fontSize: 26, color: C.grey2 }}>محافظة {m.governorate}</div>
                <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 62, color: C.white }}>ولاية {m.wilayat}</div>
              </div>
            </div>
            <div style={{ height: 1, background: `linear-gradient(270deg, ${C.gold}88, transparent)` }} />
            <div style={{ fontFamily: F.display, fontSize: 34, color: C.goldLight, fontWeight: 600 }}>
              الصفوف {m.gradeRange}
            </div>
            <SourceTag page={[4, 12]} />
          </Card>
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {b.facts.map((f, i) => {
              const s = pop(frame, tA + 20 + i * 9);
              const icons = ["school", "location", "users", "clock"] as const;
              return (
                <Card key={i} style={{ padding: 30, display: "flex", flexDirection: "column", gap: 14, justifyContent: "center", opacity: s, transform: `scale(${0.8 + 0.2 * s})` }}>
                  <Icon name={icons[i % icons.length]} size={46} color={C.mint} draw={s} />
                  <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 30, color: C.white, lineHeight: 1.45 }}>{f.text}</div>
                  <SourceTag page={f.page} style={{ fontSize: 15 }} />
                </Card>
              );
            })}
          </div>
        </div>
      </Beat>

      {/* B: المؤشرات الرقمية */}
      <Beat from={tB} to={tC}>
        <div style={{ position: "absolute", top: 260, right: 110, left: 110, display: "flex", gap: 30 }}>
          {b.kpis.map((k, i) => {
            const at = Math.max(tB + 14, mark("n04", `kpi${i + 1}`, FROM, 0.1 + 0.22 * i) - 6);
            const s = pop(frame, at);
            return (
              <Card key={k.label} glow={i === 0} style={{ flex: 1, padding: "34px 30px", opacity: s, transform: `translateY(${(1 - s) * 40}px)` }}>
                <Icon name={k.icon} size={54} color={C.goldLight} draw={progress(frame, at, 40)} />
                <div style={{ fontFamily: F.display, fontWeight: 900, fontSize: 96, color: C.white, lineHeight: 1.2, marginTop: 10 }}>
                  <Counter value={k.value} start={at} dur={50} />
                </div>
                <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 32, color: C.goldLight }}>{k.label}</div>
                {k.sublabel && <div style={{ fontFamily: F.body, fontSize: 20, color: C.grey2, marginTop: 8, lineHeight: 1.5 }}>{k.sublabel}</div>}
                <SourceTag page={k.page} style={{ marginTop: 14, fontSize: 15 }} />
              </Card>
            );
          })}
        </div>
        {/* الشعب حسب الصف */}
        <div style={{ position: "absolute", bottom: 70, right: 110, left: 110, display: "flex", alignItems: "flex-end", gap: 26 }}>
          <div style={{ fontFamily: F.display, fontSize: 26, color: C.grey1, width: 230, lineHeight: 1.5 }}>
            الشعب ومتوسط الكثافة
            <br />
            <span style={{ fontFamily: F.body, fontSize: 19, color: C.grey2 }}>حسب الصف</span>
          </div>
          {b.sectionsByGrade.map((g, i) => {
            const p = progress(frame, tB + sec(4.2) + i * 6, 30);
            return (
              <div key={g.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 70 }}>
                  {Array.from({ length: g.sections }).map((_, j) => (
                    <div key={j} style={{ width: 22, height: 62 * Math.min(1, Math.max(0, p * 1.6 - j * 0.12)), background: `linear-gradient(0deg, ${C.green}, ${C.mint})`, borderRadius: 5 }} />
                  ))}
                </div>
                <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 22, color: C.white }}>
                  {g.label} · {g.sections === 2 ? "شعبتان" : `${digits(g.sections)} شعب`}
                </div>
                <div style={{ fontFamily: F.body, fontSize: 18, color: C.grey2, opacity: p }}>الكثافة {digits(g.density)}</div>
              </div>
            );
          })}
          <SourceTag page={b.sectionsPage} style={{ fontSize: 15, position: "absolute", left: 0, top: -34 }} />
        </div>
      </Beat>

      {/* C: الحضور */}
      <Beat from={tC} to={tD}>
        <div style={{ position: "absolute", top: 290, right: 150, left: 110, display: "flex", gap: 70, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <Ring value={b.attendance.total} start={tC + 16} size={470} stroke={32} label="نسبة الحضور الإجمالية" />
            <Pill color={C.mint} style={{ fontSize: 24, opacity: progress(frame, mark("n05", "absence", FROM, 0.55) - 6, 20) }}>
              نسبة الغياب الإجمالية {num(b.attendance.absence, 2)}٪
            </Pill>
          </div>
          <Card style={{ flex: 1, padding: "38px 44px" }}>
            <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 32, color: C.white, marginBottom: 16 }}>نسبة الحضور حسب الصف</div>
            <HBars
              items={b.attendance.byGrade.map((g) => ({ label: `الصف ${g.label}`, value: g.value }))}
              start={tC + 30}
              width={920}
              max={100}
              decimals={1}
              suffix="٪"
              rowH={84}
            />
            <div style={{ fontFamily: F.body, fontSize: 19, color: C.grey2, marginTop: 12 }}>
              من بداية دوام الطلبة حتى كتابة الوثيقة
            </div>
            <SourceTag page={b.attendance.page} style={{ marginTop: 8 }} />
          </Card>
        </div>
      </Beat>

      {/* D: التركيبة */}
      <Beat from={tD} to={END}>
        <div style={{ position: "absolute", top: 300, right: 110, left: 110, display: "flex", gap: 40 }}>
          <Card style={{ flex: 1.2, padding: 56, display: "flex", gap: 44, alignItems: "center" }} glow>
            <Ring value={b.nationality.omaniPct} start={tD + 12} size={400} stroke={38} color={C.greenLight} track={`${C.gold}55`} label="طالبات عمانيات" />
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <div style={{ fontFamily: F.display, fontWeight: 900, fontSize: 72, color: C.white }}>
                  <Counter value={b.nationality.omani} start={tD + 16} />
                </div>
                <div style={{ fontFamily: F.body, fontSize: 26, color: C.mint }}>طالبة عمانية · {num(b.nationality.omaniPct, 1)}٪</div>
              </div>
              <div>
                <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 52, color: C.grey1 }}>
                  <Counter value={b.nationality.nonOmani} start={tD + 26} />
                </div>
                <div style={{ fontFamily: F.body, fontSize: 24, color: C.goldLight }}>طالبة غير عمانية · {num(b.nationality.nonOmaniPct, 1)}٪</div>
              </div>
              <SourceTag page={b.nationality.page} />
            </div>
          </Card>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 30 }}>
            <Card style={{ padding: 36 }}>
              <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 28, color: C.white, marginBottom: 20 }}>نسبة الطلبة في كل مرحلة</div>
              {b.stages.map((s, i) => {
                const p = progress(frame, tD + 30 + i * 10, 36);
                return (
                  <div key={s.label} style={{ marginBottom: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.body, fontSize: 24, color: C.grey1, marginBottom: 8 }}>
                      <span>{s.label}</span>
                      <span style={{ color: C.goldLight, fontWeight: 700 }}>{num(s.value * p, 1)}٪</span>
                    </div>
                    <div style={{ height: 16, background: "rgba(255,255,255,0.07)", borderRadius: 8 }}>
                      <div style={{ height: 16, width: `${s.value * p}%`, background: `linear-gradient(270deg, ${C.gold}, ${C.goldLight})`, borderRadius: 8 }} />
                    </div>
                  </div>
                );
              })}
              <SourceTag page={5} />
            </Card>
            {(() => {
              const s = pop(frame, mark("n06", "grade10", FROM, 0.7) - 18);
              return (
                <Card glow style={{ padding: "28px 36px", display: "flex", alignItems: "center", gap: 24, opacity: s, transform: `scale(${0.85 + 0.15 * s})` }}>
                  <Icon name="arrowUp" size={58} color={C.goldLight} draw={s} />
                  <div>
                    <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 34, color: C.white }}>أُضيف الصف العاشر هذا العام</div>
                    <SourceTag page={13} />
                  </div>
                </Card>
              );
            })()}
          </div>
        </div>
      </Beat>
    </AbsoluteFill>
  );
};
