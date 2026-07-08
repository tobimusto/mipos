import { Clock } from 'lucide-react';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

export default function TimePicker({ value = '', onChange, className = '' }) {
  const parts = (value || '09:00').split(':');
  const hour = parts[0] || '09';
  const rawMin = parts[1] || '00';
  const minute = MINUTES.includes(rawMin) ? rawMin : '00';

  return (
    <div
      className={`flex items-center gap-2 bg-surface-2 border border-border rounded-xl py-3 px-4 focus-within:border-brand transition-colors ${className}`}
    >
      <Clock size={15} className="text-muted shrink-0" />
      <select
        value={hour}
        onChange={(e) => onChange(`${e.target.value}:${minute}`)}
        className="bg-transparent focus:outline-none text-text text-sm md:text-[15px] cursor-pointer"
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-muted font-bold text-base select-none">:</span>
      <select
        value={minute}
        onChange={(e) => onChange(`${hour}:${e.target.value}`)}
        className="bg-transparent focus:outline-none text-text text-sm md:text-[15px] cursor-pointer"
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
