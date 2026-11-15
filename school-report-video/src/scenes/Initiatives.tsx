import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { report, TIMELINE } from "../config";
import { Beat } from "../components/Beat";
import { HBars } from "../components/charts";
import { Icon } from "../components/Icon";
import { Card, Counter, Pill, SceneHeader, SourceTag } from "../components/ui";
import { cue, mark, pop, progress, sec } from "../lib/anim";
import { digits } from "../lib/format";
import { C, F } from "../theme";

const FROM = TIMELINE[3].from;
const END = sec(TIMELINE[3].to - TIMELINE[3].from);

export const Initiatives: React.FC = () => {
  const frame = useCurrentFrame();
  const ini = report.initiatives;
  const tA = cue("n12", FROM) - 10;
  const tB = cue("n14", FROM) - 10;
  const tC = cue("n15", FROM) - 10;
  const n13 = cue("n13", FROM);

  // توقيت إبراز المشروعات المذكورة بالاسم (بالترتيب)
  const highlighted = ini.projects.map((p, i) => ({ p, i })).filter((x) => x.p.highlight);
  const hlAt: Record<number, number> = {};
  highlighted.forEach((x, k) => (hlAt[x.i] = mark("n13", `h${k + 1}`, FROM, 0.1 + k * 0.18) - 4));
  const cols = 5;

  return (
    <AbsoluteFill>
      <SceneHeader index={4} title="المبادرات والأنشطة" subtitle={`${digits(ini.projects.length)} مشروعات مدرسية · الأنشطة الداعمة كما وردت في التقرير`} start={4} />

      {/* A: شبكة المشروعات */}
      <Beat from={tA} to={tB}>
        <div
          style={{
            position: "absolute",
            top: 250,
            right: 110,
            left: 110,
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 22,
          }}
        >
          {ini.projects.map((p, i) => {
            const s = pop(frame, tA + 16 + i * 6, 15);
            const h = hlAt[i] !== undefined ? progress(frame, hlAt[i], 16) : 0;
            const anyHl = frame >= n13;
            const dim = anyHl && h === 0 ? 0.55 : 1;
            return (
              <Card
                key={p.title}
                glow={h > 0.5}
                style={{
                  padding: "26px 22px",
                  height: ini.projects.length <= cols ? 560 : 330,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  opacity: s * dim,
                  transform: `translateY(${(1 - s) * 50}px) scale(${1 + 0.04 * h})`,
                  borderColor: h > 0 ? `rgba(233,207,138,${0.25 + 0.5 * h})` : undefined,
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 20,
                    background: h > 0 ? `linear-gradient(135deg, ${C.goldLight}, ${C.gold})` : "rgba(143,211,182,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={p.icon} size={44} color={h > 0 ? C.bg0 : C.mint} draw={s} stroke={1.8} />
                </div>
                <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 29, color: C.white, lineHeight: 1.4, direction: /[a-z]/i.test(p.title) ? "ltr" : "rtl", textAlign: "right" }}>
                  {p.title}
                </div>
                <div style={{ fontFamily: F.body, fontSize: 21, color: C.grey1, lineHeight: 1.55, flex: 1 }}>{p.description}</div>
                <Pill color={C.mint} style={{ fontSize: 17, alignSelf: "flex-start", padding: "4px 12px" }}>
                  {p.period}
                </Pill>
              </Card>
            );
          })}
        </div>
        <SourceTag page={ini.projects[0]?.page ?? report.meta.page} style={{ position: "absolute", bottom: 64, left: 110 }} />
      </Beat>

      {/* B: الموهوبات والدعم */}
      <Beat from={tB} to={tC}>
        <div style={{ position: "absolute", top: 260, right: 110, left: 110, display: "flex", gap: 40 }}>
          <Card style={{ flex: 1.3, padding: "36px 44px" }} glow>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
              <Icon name="star" size={50} color={C.goldLight} draw={progress(frame, tB + 10, 30)} />
              <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 36, color: C.white }}>{report.meta.terms.giftedPlural} حسب المجال</div>
            </div>
            <HBars
              items={ini.gifted.map((g) => ({ label: g.field, value: g.count, extra: <Icon name={g.icon} size={32} color={C.mint} /> }))}
              start={tB + 20}
              width={1000}
              max={Math.max(...ini.gifted.map((g) => g.count)) * 1.1}
              rowH={ini.gifted.length > 5 ? 70 : 84}
              stagger={8}
            />
            <div style={{ fontFamily: F.body, fontSize: 19, color: C.grey2, marginTop: 10 }}>{ini.giftedNote ?? "عدد الموهوبين في كل مجال كما ورد في التقرير"}</div>
            <SourceTag page={ini.giftedPage} style={{ marginTop: 6 }} />
          </Card>
          <div style={{ flex: 0.8, display: "flex", flexDirection: "column", gap: 30 }}>
            {ini.support.map((s, i) => {
              const at = mark("n14", "support", FROM, 0.7) - 10 + i * sec(1.8);
              const p = pop(frame, at);
              const n = s.figure ?? null;
              return (
                <Card key={i} style={{ padding: 36, opacity: p, transform: `translateX(${(1 - p) * -40}px)` }}>
                  <Icon name={s.icon ?? "book"} size={50} color={C.goldLight} draw={p} />
                  {n !== null && (
                    <div style={{ fontFamily: F.display, fontWeight: 900, fontSize: 96, color: C.goldLight, lineHeight: 1.25 }}>
                      <Counter value={n} start={at} />
                    </div>
                  )}
                  <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 29, color: C.white, lineHeight: 1.55, marginTop: 8 }}>{s.text}</div>
                  <SourceTag page={s.page} style={{ marginTop: 10 }} />
                </Card>
              );
            })}
          </div>
        </div>
      </Beat>

      {/* C: الشواهد والمشاركات */}
      <Beat from={tC} to={END}>
        {ini.achievementsTitle && (
          <div style={{ position: "absolute", top: 240, right: 110, display: "flex", alignItems: "center", gap: 16, opacity: progress(frame, tC + 6, 20) }}>
            <Icon name="trophy" size={46} color={C.goldLight} draw={progress(frame, tC + 6, 30)} />
            <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 36, color: C.white }}>{ini.achievementsTitle}</div>
          </div>
        )}
        <div style={{ position: "absolute", top: ini.achievementsTitle ? 330 : 270, right: 110, left: 110, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }}>
          {ini.achievements.map((s, i) => {
            const at = i < 2 ? mark("n15", `a${i + 1}`, FROM, 0.3 + 0.4 * i) - 8 : mark("n15", "a2", FROM, 0.7) + sec(2 + (i - 2) * 1.6);
            const p = pop(frame, at);
            const n = s.figure ?? null;
            const big = n !== null;
            return (
              <Card key={i} glow={i === 1} style={{ padding: "32px 40px", display: "flex", alignItems: "center", gap: 34, opacity: p, transform: `scale(${0.85 + 0.15 * p})`, minHeight: 230 }}>
                {big ? (
                  <div style={{ fontFamily: F.display, fontWeight: 900, fontSize: 130, color: C.goldLight, minWidth: 170, textAlign: "center", lineHeight: 1 }}>
                    <Counter value={n!} start={at} dur={30} />
                  </div>
                ) : (
                  <div style={{ minWidth: 170, display: "flex", justifyContent: "center" }}>
                    <Icon name={s.icon ?? "star"} size={110} color={C.mint} draw={p} stroke={1.3} />
                  </div>
                )}
                <div>
                  <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 33, color: C.white, lineHeight: 1.55 }}>{s.text}</div>
                  <SourceTag page={s.page} style={{ marginTop: 10 }} />
                </div>
              </Card>
            );
          })}
        </div>
      </Beat>
    </AbsoluteFill>
  );
};
