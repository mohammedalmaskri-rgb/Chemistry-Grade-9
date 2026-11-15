const ITEMS = [
  { label: 'متاح للحجز', dot: 'bg-slot-free', ring: 'ring-slot-freeBd' },
  { label: 'بانتظار الموافقة', dot: 'bg-[#E9B10A]', ring: 'ring-slot-pendBd' },
  { label: 'محجوز ومعتمد', dot: 'bg-slot-busy', ring: 'ring-slot-busyBd' },
  { label: 'اختيارك الحالي', dot: 'bg-navy-700', ring: 'ring-navy-200' },
];

export function StatusLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-navy-700">
      {ITEMS.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          <span className={`h-3.5 w-3.5 rounded-full ${i.dot} ring-4 ${i.ring}`} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
