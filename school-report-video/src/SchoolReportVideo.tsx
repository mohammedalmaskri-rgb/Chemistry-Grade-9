import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { setSchool, TIMELINE, VIDEO } from "./config";
import { Background } from "./components/Background";
import { LightSweep, SceneFrame } from "./components/SceneFrame";
import { Soundtrack, Subtitles } from "./components/Soundtrack";
import { loadFonts } from "./lib/fonts";
import { C } from "./theme";
import { Intro } from "./scenes/Intro";
import { Basics } from "./scenes/Basics";
import { Achievement } from "./scenes/Achievement";
import { Initiatives } from "./scenes/Initiatives";
import { Evaluation } from "./scenes/Evaluation";
import { Closing } from "./scenes/Closing";

loadFonts();

const SCENES: Record<(typeof TIMELINE)[number]["id"], React.FC> = {
  intro: Intro,
  basics: Basics,
  achievement: Achievement,
  initiatives: Initiatives,
  evaluation: Evaluation,
  closing: Closing,
};

export type VideoProps = { school: string; withVoice: boolean; withMusic: boolean };

export const SchoolReportVideo: React.FC<VideoProps> = ({ school, withVoice, withMusic }) => {
  // يضبط المدرسة النشطة قبل رسم المشاهد (كل المشاهد تقرأ البيانات منها)
  setSchool(school);
  const fps = VIDEO.fps;
  return (
    <AbsoluteFill style={{ direction: "rtl", backgroundColor: C.bg0, color: C.white }}>
      <Background />
      {TIMELINE.map((s, i) => {
        const Scene = SCENES[s.id];
        return (
          <Sequence key={s.id} from={s.from * fps} durationInFrames={(s.to - s.from) * fps} name={`${i + 1}. ${s.id}`}>
            <SceneFrame enter={i === 0 ? 30 : 20} exit={i === TIMELINE.length - 1 ? 1 : 16}>
              <Scene />
            </SceneFrame>
          </Sequence>
        );
      })}
      {TIMELINE.slice(1).map((s) => (
        <Sequence key={`sweep-${s.id}`} from={s.from * fps - 10} durationInFrames={30} name={`transition → ${s.id}`}>
          <LightSweep />
        </Sequence>
      ))}
      <Subtitles />
      <Soundtrack withVoice={withVoice} withMusic={withMusic} />
    </AbsoluteFill>
  );
};
