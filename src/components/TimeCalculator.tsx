import { useState, useEffect, useRef } from 'react';

// ── Calculations (pure, derived from sliders) ─────────────────────────────
function calc(ventas: number, cierre: number, stock: number) {
  const hVentas = (ventas * 30 * 0.7) / 60;
  const hCierre = (cierre * 0.85 * 30) / 60;
  const hStock  = stock * 0.6 * 4.33;
  const hRep    = 3;
  const total   = hVentas + hCierre + hStock + hRep;
  return { hVentas, hCierre, hStock, hRep, total, days: (total * 12) / 8 };
}

// ── Animated breakdown bar ────────────────────────────────────────────────
function BreakdownBar({
  label, hours, total, index, visible, reduced,
}: {
  label: string; hours: number; total: number;
  index: number; visible: boolean; reduced: boolean;
}) {
  const pct = total > 0 ? Math.max((hours / total) * 100, 0) : 0;
  const displayPct = (visible || reduced) ? pct : 0;

  return (
    <li
      className="cr-bar-item"
      style={!reduced ? { animationDelay: `${index * 70}ms` } as React.CSSProperties : undefined}
    >
      <span className="cr-bar-label">{label}</span>
      <div className="cr-bar-track" role="presentation" aria-hidden="true">
        <div
          className="cr-bar-fill"
          style={{
            width: `${displayPct}%`,
            transitionDuration: reduced ? '0ms' : visible ? '550ms' : '350ms',
          }}
        />
      </div>
      <span className="cr-bar-val">+{Math.round(hours)}&thinsp;h</span>
    </li>
  );
}

// ── Slider field ──────────────────────────────────────────────────────────
function SliderField({
  id, label, value, min, max, step, unit, onChange,
}: {
  id: string; label: string; value: number;
  min: number; max: number; step: number;
  unit?: string; onChange: (v: number) => void;
}) {
  const p = ((value - min) / (max - min)) * 100;
  return (
    <div className="calc-field">
      <label htmlFor={id}>
        {label}{' '}
        <output>{value}{unit ? ` ${unit}` : ''}</output>
      </label>
      <input
        type="range" id={id} className="slider"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ '--p': `${p}%` } as React.CSSProperties}
        aria-valuenow={value} aria-valuemin={min} aria-valuemax={max}
      />
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────
export default function TimeCalculator() {
  const [ventas,  setVentas]  = useState(120);
  const [cierre,  setCierre]  = useState(25);
  const [stock,   setStock]   = useState(6);
  const [visible, setVisible] = useState(false);
  const [pop,     setPop]     = useState(false);

  const sectionRef  = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);
  const reduced = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  const { hVentas, hCierre, hStock, hRep, total, days } = calc(ventas, cierre, stock);

  // Viewport entry — trigger bar animations once
  useEffect(() => {
    if (reduced) { setVisible(true); return; }
    const el = sectionRef.current;
    if (!el || !('IntersectionObserver' in window)) { setVisible(true); return; }
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Pop animation on total change (skip first render)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (reduced) return;
    setPop(true);
    const t = setTimeout(() => setPop(false), 340);
    return () => clearTimeout(t);
  }, [Math.round(total)]);

  const items = [
    { label: 'Ventas en caja',   hours: hVentas },
    { label: 'Cierre de caja',   hours: hCierre },
    { label: 'Inventario',       hours: hStock  },
    { label: 'Reportes auto.',   hours: hRep    },
  ];

  return (
    <section className="calc-section" id="ahorro" ref={sectionRef}>
      <div className="wrap calc-grid">

        {/* ── LEFT: sliders ── */}
        <div className="calc-intro" data-reveal>
          <h2>¿Cuánto tiempo<br /><span className="hl">recuperás por mes?</span></h2>
          <p className="sec-sub">
            Movés las barras con los números de tu comercio y calculás las horas
            que dejás de perder en tareas manuales.
          </p>
          <div className="calc-controls">
            <SliderField id="rngVentas" label="Ventas por día"
              value={ventas} min={20} max={500} step={10}
              onChange={setVentas} />
            <SliderField id="rngCierre" label="Minutos en cerrar la caja por día"
              value={cierre} min={5} max={60} step={5} unit="min"
              onChange={setCierre} />
            <SliderField id="rngStock" label="Horas de inventario por semana"
              value={stock} min={1} max={25} step={1} unit="h"
              onChange={setStock} />
          </div>
        </div>

        {/* ── RIGHT: result + bars ── */}
        <div className="calc-result" data-reveal aria-live="polite">
          <p className="cr-label">Recuperás cada mes</p>

          <p className="cr-hours">
            <span className={`cr-total-num num${pop && !reduced ? ' cr-pop' : ''}`}>
              {Math.round(total)}
            </span>
            <span className="cr-unit">horas</span>
          </p>

          <p className="cr-year">
            Equivale a{' '}
            <strong className="num">{Math.round(days)}</strong>{' '}
            jornadas de 8&thinsp;h al año.
          </p>

          {/* Animated breakdown bars */}
          <ul className="cr-bars" aria-label="Desglose de horas recuperadas">
            {items.map((item, i) => (
              <BreakdownBar
                key={item.label}
                label={item.label}
                hours={item.hours}
                total={total}
                index={i}
                visible={visible}
                reduced={reduced}
              />
            ))}
          </ul>

          <a
            href="https://app.mipos.online/login"
            className="btn btn-orange btn-lg cr-cta"
          >
            Empezar a ahorrar tiempo
          </a>
          <p className="cr-fine">
            Estimación según promedios de comercios que ya usan mipos.
          </p>
        </div>

      </div>
    </section>
  );
}
