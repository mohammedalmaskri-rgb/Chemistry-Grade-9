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
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, DISPLAY.digits === "arab" ? "٬" : ",");
  return digits(dec ? `${grouped}.${dec}` : grouped);
};

export const pct = (n: number, decimals = 2): string => `${num(n, decimals)}٪`;

export const pageRef = (p: number | number[]): string => {
  const arr = Array.isArray(p) ? p : [p];
  return `${arr.length > 1 ? "الصفحات" : "صفحة"} ${arr.map((x) => digits(x)).join("، ")}`;
};
