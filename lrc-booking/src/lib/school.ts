// إعدادات المدرسة — تُعدّل هنا فقط
export const GRADES = ['5', '6', '7', '8', '9', '10', '11', '12'];
export const SECTIONS = ['1', '2', '3', '4', '5', '6'];
export const gradeLabel = (g?: string, s?: string) => (g ? `${g}/${s ?? '-'}` : '—');
