import React from "react";
import { Composition, Folder, Still } from "remotion";
import { SCHOOLS, VIDEO } from "./config";
import { SchoolReportVideo } from "./SchoolReportVideo";

/**
 * لكل مدرسة مسجّلة في SCHOOLS ثلاث تركيبات:
 *   SchoolReport-<slug>         الفيديو الكامل بالصوت والموسيقى
 *   SchoolReportSilent-<slug>   نسخة صامتة للمعاينة السريعة
 *   Poster-<slug>               لقطة ثابتة
 */
export const RemotionRoot: React.FC = () => (
  <>
    {Object.keys(SCHOOLS).map((slug) => (
      <Folder key={slug} name={slug}>
        <Composition
          id={`SchoolReport-${slug}`}
          component={SchoolReportVideo}
          durationInFrames={VIDEO.durationInSeconds * VIDEO.fps}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
          defaultProps={{ school: slug, withVoice: true, withMusic: true }}
        />
        <Composition
          id={`SchoolReportSilent-${slug}`}
          component={SchoolReportVideo}
          durationInFrames={VIDEO.durationInSeconds * VIDEO.fps}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
          defaultProps={{ school: slug, withVoice: false, withMusic: false }}
        />
        <Still
          id={`Poster-${slug}`}
          component={SchoolReportVideo}
          width={VIDEO.width}
          height={VIDEO.height}
          defaultProps={{ school: slug, withVoice: false, withMusic: false }}
        />
      </Folder>
    ))}
  </>
);
