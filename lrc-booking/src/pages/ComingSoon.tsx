import { Hammer } from 'lucide-react';

export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-xl2 bg-white p-10 text-center shadow-card">
      <Hammer className="mx-auto h-10 w-10 text-navy-400" />
      <h1 className="mt-4 text-xl font-extrabold text-navy-800">{title}</h1>
      <p className="mt-2 text-sm font-medium text-navy-400">هذه الصفحة ضمن الخطوة التالية بعد اعتماد واجهة الدخول والجدول الأسبوعي.</p>
    </div>
  );
}
