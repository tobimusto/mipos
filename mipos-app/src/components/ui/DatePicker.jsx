import { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { format, parse, isValid } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import 'react-day-picker/style.css';

export default function DatePicker({
  value = '',
  onChange,
  placeholder = 'Seleccionar fecha',
  error = false,
  disabled = false,
  minDate,
  variant = 'default',
  size = 'md',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const parsed = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
  const selected = parsed && isValid(parsed) ? parsed : undefined;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (date) => {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'));
      setOpen(false);
    }
  };

  const disabledDays = minDate ? { before: minDate } : undefined;

  if (variant === 'ghost') {
    return (
      <div className={`relative ${className}`} ref={ref}>
        <button
          type="button"
          onClick={() => !disabled && setOpen(!open)}
          className="bg-transparent focus:outline-none text-muted hover:text-text transition-colors text-sm leading-none"
        >
          {selected ? format(selected, 'dd/MM/yy') : placeholder}
        </button>
        {open && (
          <CalendarPopover
            selected={selected}
            onSelect={handleSelect}
            disabledDays={disabledDays}
          />
        )}
      </div>
    );
  }

  const padding = size === 'sm' ? 'py-1.5 px-3' : 'py-2.5 px-4';
  const textSize = 'text-sm md:text-[15px]';

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`w-full flex items-center gap-2 bg-surface-2 border rounded-lg ${padding} ${textSize} text-left focus:outline-none transition-colors
          ${error ? 'border-red-500' : 'border-border hover:border-brand/40 focus:border-brand/50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <CalendarDays size={14} className="text-muted shrink-0" />
        <span className={selected ? 'text-text' : 'text-muted'}>
          {selected
            ? format(selected, "d 'de' MMMM yyyy", { locale: es })
            : placeholder}
        </span>
      </button>
      {open && (
        <CalendarPopover
          selected={selected}
          onSelect={handleSelect}
          disabledDays={disabledDays}
        />
      )}
    </div>
  );
}

function CalendarPopover({ selected, onSelect, disabledDays }) {
  return (
    <div className="absolute z-50 top-full mt-1.5 left-0 bg-surface border border-border rounded-2xl shadow-2xl p-3 mipos-calendar">
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={onSelect}
        locale={es}
        disabled={disabledDays}
        defaultMonth={selected ?? new Date()}
      />
    </div>
  );
}
