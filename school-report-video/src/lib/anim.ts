import { Easing, interpolate, spring } from "remotion";
import { report, VIDEO, voiceDurations, voiceWords } from "../config";

export const FPS = VIDEO.fps;
export const sec = (s: number) => Math.round(s * FPS);

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

/** قيمة من 0 إلى 1 بين إطارين مع تخفيف */
export const progress = (frame: number, start: number, dur: number, ease = easeOut) =>
  interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

export const pop = (frame: number, start: number, damping = 16) =>
  spring({ frame: frame - start, fps: FPS, config: { damping, mass: 0.8, stiffness: 120 } });

/** وقت بدء مقطع التعليق (بالثواني المطلقة) */
export const cueSec = (id: string): number => {
  const seg = report.narration.find((n) => n.id === id);
  if (!seg) throw new Error(`Unknown narration cue ${id}`);
  return seg.start;
};

/** إطار بدء المقطع نسبةً إلى بداية المشهد */
export const cue = (id: string, sceneFromSec: number) => sec(cueSec(id) - sceneFromSec);

/** مدة المقطع المنطوق إن توفرت، وإلا تقدير من عدد الكلمات */
export const voiceDuration = (id: string): number => {
  if (voiceDurations[id]) return voiceDurations[id];
  const seg = report.narration.find((n) => n.id === id);
  return seg ? seg.text.split(/\s+/).length / 1.9 : 0;
};

/** دخول/خروج قياسي لعنصر: يعيد opacity و translateY */
export const enter = (frame: number, start: number, dur = 22, dist = 40) => {
  const p = progress(frame, start, dur);
  return { opacity: p, transform: `translateY(${(1 - p) * dist}px)` };
};

const normalize = (w: string) =>
  w
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "") // التشكيل والتطويل
    .replace(/[أإآ]/g, "ا")
    .replace(/[^\p{L}\p{N}]/gu, "");

/**
 * وقت علامة مزامنة (بالثواني المطلقة): يبحث عن الكلمة المحددة في توقيت الكلمات المولّد،
 * وإن لم يجدها يستخدم موضعها التقريبي في النص، ثم الكسر الاحتياطي `fallback` من مدة المقطع.
 */
export const markSec = (id: string, mark: string, fallback = 0.5): number => {
  const seg = report.narration.find((n) => n.id === id);
  if (!seg) throw new Error(`Unknown narration cue ${id}`);
  const spec = seg.marks?.[mark];
  const dur = voiceDuration(id);
  if (!spec) return seg.start + dur * fallback;
  const [word, occ] = spec.split("#");
  const nth = Number(occ ?? 1);
  const target = normalize(word);
  const words = voiceWords[id] ?? [];
  let count = 0;
  for (const w of words) {
    if (normalize(w.w) === target && ++count === nth) return seg.start + w.t;
  }
  // تقدير من موضع الكلمة في النص
  const tokens = seg.text.split(/\s+/).map(normalize);
  count = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === target && ++count === nth) return seg.start + (i / tokens.length) * dur;
  }
  return seg.start + dur * fallback;
};

/** إطار علامة المزامنة نسبةً إلى بداية المشهد */
export const mark = (id: string, name: string, sceneFromSec: number, fallback = 0.5) =>
  sec(markSec(id, name, fallback) - sceneFromSec);
