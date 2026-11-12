import React from "react";
import { AbsoluteFill, Html5Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { AUDIO, DISPLAY, report, VIDEO } from "../config";
import { sec, voiceDuration } from "../lib/anim";
import { C, F } from "../theme";

const total = VIDEO.durationInSeconds * VIDEO.fps;

/** هل يتحدث المعلّق عند الإطار f؟ (يُستخدم لخفض الموسيقى) */
const speakingWeight = (f: number) => {
  let w = 0;
  for (const n of report.narration) {
    const s = sec(n.start);
    const e = sec(n.start + voiceDuration(n.id));
    // منحدر 12 إطارًا قبل وبعد الكلام
    const v = interpolate(f, [s - 12, s, e, e + 18], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    w = Math.max(w, v);
  }
  return w;
};

export const Soundtrack: React.FC<{ withVoice: boolean; withMusic: boolean }> = ({ withVoice, withMusic }) => (
  <>
    {withMusic && (
      <Html5Audio
        src={staticFile(AUDIO.music)}
        volume={(f) => {
          const duck = interpolate(speakingWeight(f), [0, 1], [AUDIO.musicVolume, AUDIO.musicDuckedVolume]);
          const fadeIn = interpolate(f, [0, 45], [0, 1], { extrapolateRight: "clamp" });
          const fadeOut = interpolate(f, [total - 120, total - 6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return duck * fadeIn * fadeOut;
        }}
      />
    )}
    {withVoice && AUDIO.externalVoiceFile && <Html5Audio src={staticFile(AUDIO.externalVoiceFile)} volume={AUDIO.voiceVolume} />}
    {withVoice &&
      !AUDIO.externalVoiceFile &&
      report.narration.map((n) => (
        <Sequence key={n.id} from={sec(n.start)} durationInFrames={sec(voiceDuration(n.id) + 0.5)} name={`voice ${n.id}`}>
          <Html5Audio src={staticFile(`${AUDIO.voiceDir}/${n.id}.mp3`)} volume={AUDIO.voiceVolume} />
        </Sequence>
      ))}
  </>
);

/** ترجمة نصية اختيارية للتعليق الصوتي */
export const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  if (!DISPLAY.subtitles) return null;
  const t = frame / VIDEO.fps;
  const seg = report.narration.find((n) => t >= n.start && t <= n.start + voiceDuration(n.id) + 0.3);
  if (!seg) return null;
  const local = t - seg.start;
  const o = interpolate(local, [0, 0.25, voiceDuration(seg.id), voiceDuration(seg.id) + 0.3], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 54, pointerEvents: "none" }}>
      <div
        style={{
          maxWidth: 1500,
          fontFamily: F.body,
          fontSize: 30,
          lineHeight: 1.6,
          color: C.white,
          background: "rgba(3,22,17,0.72)",
          padding: "12px 28px",
          borderRadius: 14,
          textAlign: "center",
          opacity: o,
        }}
      >
        {seg.text}
      </div>
    </AbsoluteFill>
  );
};
