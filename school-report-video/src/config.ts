/**
 * نقطة التحكم الوحيدة لاختيار المدرسة وإعدادات الإخراج.
 * لتغيير المدرسة: أنشئ ملف بيانات جديدًا في src/data/schools/ ثم غيّر السطرين أدناه.
 */
import { zahratQuraish } from "./data/schools/zahrat-quraish";
import type { SchoolReport } from "./data/types";
import voiceManifest from "./data/generated/voiceover.json";

export const SCHOOL_SLUG = "zahrat-quraish";
export const report: SchoolReport = zahratQuraish;

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
  voiceDir: `voiceover/${SCHOOL_SLUG}`,
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

type Manifest = {
  school: string;
  voice: string;
  segments: Record<string, { duration: number; words?: { w: string; t: number }[] }>;
};
const manifest = voiceManifest as Manifest;
/** مدد مقاطع التعليق المولّدة (بالثواني) — فارغة إذا لم يُولَّد الصوت بعد */
export const voiceDurations: Record<string, number> =
  manifest.school === SCHOOL_SLUG
    ? Object.fromEntries(Object.entries(manifest.segments).map(([k, v]) => [k, v.duration]))
    : {};

/** توقيت الكلمات داخل كل مقطع (بالثواني من بداية المقطع) */
export const voiceWords: Record<string, { w: string; t: number }[]> =
  manifest.school === SCHOOL_SLUG
    ? Object.fromEntries(Object.entries(manifest.segments).map(([k, v]) => [k, v.words ?? []]))
    : {};
