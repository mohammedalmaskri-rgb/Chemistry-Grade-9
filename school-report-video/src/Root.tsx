import React from "react";
import { Composition, Still } from "remotion";
import { report, VIDEO } from "./config";
import { SchoolReportVideo, type VideoProps } from "./SchoolReportVideo";

const defaults: VideoProps = { withVoice: true, withMusic: true };

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="SchoolReport"
      component={SchoolReportVideo}
      durationInFrames={VIDEO.durationInSeconds * VIDEO.fps}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
      defaultProps={defaults}
    />
    {/* نسخة صامتة للمعاينة السريعة أو عند عدم توفر ملفات الصوت */}
    <Composition
      id="SchoolReportSilent"
      component={SchoolReportVideo}
      durationInFrames={VIDEO.durationInSeconds * VIDEO.fps}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
      defaultProps={{ withVoice: false, withMusic: false }}
    />
    <Still id="Poster" component={() => <SchoolReportVideo withVoice={false} withMusic={false} />} width={VIDEO.width} height={VIDEO.height} />
  </>
);

// اسم المدرسة يظهر في عنوان المعاينة
if (typeof document !== "undefined") document.title = `${report.meta.schoolLabel} · ${report.meta.reportTitle}`;
