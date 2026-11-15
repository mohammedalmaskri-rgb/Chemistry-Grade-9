/**
 * مخطط بيانات تقرير التقويم الذاتي — مستقل تمامًا عن التصميم والحركة.
 * لإنتاج فيديو لمدرسة أخرى: انسخ ملف المدرسة في src/data/schools/ وعدّل القيم فقط.
 * كل رقم يحمل `page` = رقم صفحة التقرير المصدر (للتوثيق والمراجعة).
 */

/** مرجع المصدر: رقم صفحة (أو أرقام) في PDF، أو اسم القسم/الجدول في ملفات Word التي لا تثبت ترقيمها */
export type PageRef = number | number[] | string;

export type IconName =
  | "students" | "teacher" | "classes" | "calendar" | "location" | "school"
  | "phone" | "star" | "chart" | "check" | "clock" | "book" | "cart" | "flask"
  | "heart" | "handshake" | "trophy" | "pen" | "users" | "shield" | "bulb"
  | "target" | "flag" | "leaf" | "arrowUp" | "globe" | "music" | "mask" | "ball";

export interface Kpi {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string; // مثل "٪"
  sublabel?: string;
  icon: IconName;
  page: PageRef;
}

export interface LabeledValue {
  label: string;
  value: number;
  decimals?: number;
  page: PageRef;
}

export interface SubjectSeries {
  name: string;
  /** القيم بالترتيب نفسه لـ achievement.years */
  values: number[];
  page: PageRef;
  /** تمييز بصري: improved = تحسن، watch = يحتاج إلى تطوير، neutral */
  status?: "improved" | "watch" | "neutral";
  /** علامة مزامنة (في مقطع التعليق الخاص بالمخطط) يُبرَز عندها هذا العمود */
  mark?: string;
}

export interface ComparePair {
  label: string; // مثل "العلوم"
  school: number;
  reference: number; // المتوسط المرجعي
  referenceLabel: string;
  verdict: string; // كما ورد في التقرير حرفيًا
  positive: boolean;
  page: PageRef;
}

export interface Initiative {
  title: string;
  description: string; // كما ورد في التقرير (الأنشطة الداعمة)
  period: string;
  icon: IconName;
  highlight?: boolean; // تُبرز عند ذكرها في التعليق الصوتي
  page: PageRef;
}

export interface Domain {
  name: string;
  icon: IconName;
  strengths: string[];
  improvements: string[];
  page: PageRef;
}

export interface Statement {
  text: string;
  domain?: string;
  /** رقم بارز يُعرض بجانب العبارة (اختياري) */
  figure?: number;
  icon?: IconName;
  page: PageRef;
}

/** صيغ الإشارة إلى الطلبة (تختلف بين مدارس البنين والبنات) */
export interface Terms {
  /** بعد عدد كبير (تمييز): "طالبة" / "طالبًا" */
  studentCount: string;
  /** الجمع: "الطالبات" / "الطلبة" */
  studentsDef: string;
  /** "طالبة عمانية" / "طالب عماني" */
  omaniOne: string;
  nonOmaniOne: string;
  /** "طالبات عمانيات" / "طلبة عمانيون" */
  omaniMany: string;
  /** "معلمة" / "معلمًا" */
  teacherCount: string;
  /** "الموهوبات" / "الموهوبون" */
  giftedPlural: string;
}

export interface NarrationSegment {
  id: string;
  /** وقت البدء بالثواني من بداية الفيديو */
  start: number;
  /** النص المنطوق (الأرقام مكتوبة بالحروف لضمان نطق صحيح) */
  text: string;
  /** مراجع الصفحات للمعلومات الواردة في المقطع */
  pages: PageRef;
  /**
   * علامات مزامنة: اسم العلامة ← الكلمة المنطوقة التي تُطلق الحركة عندها.
   * أضف "#2" للظهور الثاني للكلمة. تُحسب الأوقات تلقائيًا من توقيت الكلمات في الصوت المولّد.
   */
  marks?: Record<string, string>;
}

export interface SchoolReport {
  meta: {
    schoolName: string;       // "زهرة قريش"
    schoolLabel: string;      // "مدرسة زهرة قريش"
    gradesLabel: string;      // "(٦–١٠)"
    reportTitle: string;
    academicYear: string;     // "2025 / 2026"
    governorate: string;
    wilayat: string;
    schoolType: string;
    shift: string;
    gradeRange: string;
    logos: { ministry?: string; vision?: string }; // مسارات داخل public/
    terms: Terms;
    page: PageRef;
  };
  intro: {
    kicker: string;
    purpose: string; // سطر يلخص غاية التقرير كما ورد في المقدمة
    page: PageRef;
  };
  basics: {
    kpis: Kpi[];
    /** إن لم يرد الحضور في التقرير يُعرض `growth` بدلًا منه */
    attendance?: { total: number; absence: number; byGrade: LabeledValue[]; page: PageRef };
    growth?: { title: string; labels: string[]; values: number[]; note?: string; page: PageRef };
    sectionsByGrade: { label: string; sections: number; density: number }[];
    sectionsPage: PageRef;
    nationality: { omani: number; omaniPct: number; nonOmani: number; nonOmaniPct: number; page: PageRef };
    stages: LabeledValue[];
    facts: Statement[];
    /** بطاقة إبراز في نهاية المشهد */
    highlight?: Statement;
  };
  achievement: {
    metricLabel: string;
    years: string[];
    overall: {
      values: number[];
      counts: number[];
      /** وصف الأعداد: "عدد الطالبات الحاصلات على ٧٥٪ فأعلى" أو "عدد النتائج…" */
      countsLabel: string;
      verdict: string;
      verdictNote?: string;
      verdictTone?: "positive" | "neutral" | "warn";
      page: PageRef;
    };
    subjects: SubjectSeries[];
    focus: { title: string; grade: string; subjects: SubjectSeries[]; years?: string[]; page?: PageRef };
    needsDevelopment: Statement[];
    /** مقارنة بمرجع خارجي (مثل تيمز) — وإن غابت يُعرض `distribution` */
    benchmark?: { title: string; pairs: ComparePair[]; note: string; page: PageRef };
    distribution?: {
      title: string;
      bands: { label: string; range: string; value: number; count: number }[];
      note?: string;
      page: PageRef;
    };
  };
  initiatives: {
    projects: Initiative[];
    gifted: { field: string; count: number; icon: IconName }[];
    giftedPage: PageRef;
    giftedNote?: string;
    support: Statement[];
    achievements: Statement[];
    achievementsTitle?: string;
  };
  evaluation: {
    domains: Domain[];
    keyStrengths: Statement[];
    keyImprovements: Statement[];
  };
  closing: {
    messages: Statement[];
    vision: Statement;
  };
  narration: NarrationSegment[];
}
