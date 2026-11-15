import { DISPLAY } from "../config";

const AR = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/** تحويل الأرقام إلى الأرقام العربية المشرقية (حسب الإعداد) */
export const digits = (s: string | number): string => {
  const str = String(s);
  if (DISPLAY.digits === "latn") return str;
  return str.replace(/[0-9]/g, (d) => AR[Number(d)]).replace(/\./g, "٫");
};

/** تنسيق رقم بعدد منازل عشرية ثابت — حتمي (لا يعتمد على إعدادات المتصفح) */
export const num = (n: number, decimals = 0): string => {
  const fixed = n.toFixed(decimals);
  const [int, dec] = fixed.split(".");
  // فاصل الآلاف للأعداد الكبيرة فقط (١٣١٩ تُكتب دون فاصل كما في التقارير المدرسية)
  const grouped = Math.abs(n) < 10000 ? int : int.replace(/\B(?=(\d{3})+(?!\d))/g, DISPLAY.digits === "arab" ? "٬" : ",");
  return digits(dec ? `${grouped}.${dec}` : grouped);
};

export const pct = (n: number, decimals = 2): string => `${num(n, decimals)}٪`;

export const pageRef = (p: number | number[] | string): string => {
  if (typeof p === "string") return digits(p);
  const arr = Array.isArray(p) ? p : [p];
  return `${arr.length > 1 ? "الصفحات" : "صفحة"} ${arr.map((x) => digits(x)).join("، ")}`;
};

/** صيغة "شعبة" الصحيحة بعد العدد */
export const sectionsWord = (n: number): string =>
  n === 1 ? "شعبة واحدة" : n === 2 ? "شعبتان" : n <= 10 ? `${digits(n)} شعب` : `${digits(n)} شعبة`;

/** حجم خط متكيف مع طول النص (للعناوين الطويلة كأسماء المدارس) */
export const fitSize = (text: string, base: number, maxChars: number, min = base * 0.6): number =>
  text.length <= maxChars ? base : Math.max(min, Math.round((base * maxChars) / text.length));
