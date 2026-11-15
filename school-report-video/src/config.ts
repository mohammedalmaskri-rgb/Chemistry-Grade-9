/**
 * نقطة التحكم في المدارس وإعدادات الإخراج.
 * لإضافة مدرسة: أنشئ ملف بيانات في src/data/schools/ ثم أضفه إلى SCHOOLS أدناه
 * (مع ملف صوتها المولّد src/data/generated/<slug>.voice.json).
 * تُسجَّل لكل مدرسة تركيبة مستقلة في Remotion باسم SchoolReport-<slug>.
 */
import { zahratQuraish } from "./data/schools/zahrat-quraish";
import { alHarthi } from "./data/schools/al-harthi";
import type { SchoolReport } from "./data/types";
import zahratVoice from "./data/generated/zahrat-quraish.voice.json";
import alHarthiVoice from "./data/generated/al-harthi.voice.json";

type Manifest = {
  school: string;
  voice: string;
  segments: Record<string, { duration: number; words?: { w: string; t: number }[] }>;
};

export const SCHOOLS: Record<string, { report: SchoolReport; voice: Manifest }> = {
  "zahrat-quraish": { report: zahratQuraish, voice: zahratVoice as Manifest },
  "al-harthi": { report: alHarthi, voice: alHarthiVoice as Manifest },
};

/** المدرسة الافتراضية (للسكربتات عند عدم تحديد SCHOOL) */
export const DEFAULT_SCHOOL = "zahrat-quraish";

/* المدرسة النشطة — تُضبط في بداية كل تركيبة عبر setSchool() */
export let SCHOOL_SLUG = DEFAULT_SCHOOL;
export let report: SchoolReport = SCHOOLS[DEFAULT_SCHOOL].report;
/** مدد مقاطع التعليق المولّدة (بالثواني) — فارغة إذا لم يُولَّد الصوت بعد */
export let voiceDurations: Record<string, number> = {};
/** توقيت الكلمات داخل كل مقطع (بالثواني من بداية المقطع) */
export let voiceWords: Record<string, { w: string; t: number }[]> = {};

export const setSchool = (slug: string) => {
  const entry = SCHOOLS[slug];
  if (!entry) throw new Error(`Unknown school "${slug}". Known: ${Object.keys(SCHOOLS).join(", ")}`);
  if (slug === SCHOOL_SLUG && loaded) return;
  loaded = true;
  SCHOOL_SLUG = slug;
  report = entry.report;
  const m = entry.voice.school === slug ? entry.voice.segments : {};
  voiceDurations = Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.duration]));
  voiceWords = Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.words ?? []]));
  AUDIO.voiceDir = `voiceover/${slug}`;
};
let loaded = false;

export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
  durationInSeconds: 300,
};

/** حدود المشاهد بالثواني — مطابقة لتقسيم الفيديو المطلوب */
export const TIMELINE = [
  { id: "intro", from: 0, to: 30 },
  { id: "basics", from: 30, to: 75 },
  { id: "achievement", from: 75, to: 150 },
  { id: "initiatives", from: 150, to: 210 },
  { id: "evaluation", from: 210, to: 270 },
  { id: "closing", from: 270, to: 300 },
] as const;

export type SceneId = (typeof TIMELINE)[number]["id"];

export const AUDIO = {
  /** موسيقى الخلفية داخل public/ */
  music: "audio/music.mp3",
  musicVolume: 0.22,
  /** مستوى الموسيقى أثناء التعليق الصوتي (Ducking) */
  musicDuckedVolume: 0.075,
  voiceVolume: 1,
  /** مجلد مقاطع التعليق داخل public/ — ملف لكل مقطع باسم id.mp3 */
  voiceDir: `voiceover/${DEFAULT_SCHOOL}`,
  /** بديل: ملف تعليق صوتي واحد كامل مسجّل خارجيًا (يبدأ من الثانية 0). اتركه null لاستخدام المقاطع. */
  externalVoiceFile: null as string | null,
};

export const DISPLAY = {
  /** ترجمة نصية أسفل الشاشة للتعليق الصوتي */
  subtitles: false,
  /** إظهار مرجع صفحة التقرير على كل رقم */
  sourceTags: true,
  /** "arab" أرقام عربية مشرقية (٠١٢) أو "latn" (012) */
  digits: "arab" as "arab" | "latn",
};

setSchool(DEFAULT_SCHOOL);
