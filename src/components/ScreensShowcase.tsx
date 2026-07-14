import { useState, useEffect, useRef } from 'react';

const screens = [
  {
    id: 'pos',
    label: 'Cobrá',
    image: '/ui_pos.png',
    title: 'Cobrar nunca fue tan rápido.',
    subtitle: 'Escaneás, seleccionás, cobrado.',
    bullets: [
      'Escáner de código de barras integrado',
      'Búsqueda por nombre, código o monto rápido',
      'Ticket impreso o por WhatsApp al instante',
    ],
  },
  {
    id: 'reportes',
    label: 'Controlá',
    image: '/ui_reportes.png',
    title: 'Tu negocio, de un vistazo.',
    subtitle: 'La caja cuadra sola al final del día.',
    bullets: [
      'Reportes de ventas por día, semana y mes',
      'Qué productos vendés más y cuáles no',
      'Cierre de caja automático: sin calculadora',
    ],
  },
  {
    id: 'tienda',
    label: 'Vendé online',
    image: '/ui_tienda.png',
    title: 'Tu tienda online, sin saber de tecnología.',
    subtitle: 'Compartís el catálogo, llegan los pedidos.',
    bullets: [
      'Catálogo online listo en minutos',
      'Pedidos directo en tu sistema, listos para preparar',
      'Gestionás desde el mismo panel de siempre',
    ],
  },
];

const AUTOPLAY_MS = 3800;

// ── Sub-components ────────────────────────────────────────────────────

function DeviceFrame({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="rounded-2xl shadow-float border border-line dark:border-d-line overflow-hidden bg-surface dark:bg-d-surface w-full max-w-[560px]">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-surface2 dark:bg-d-bg border-b border-line dark:border-d-line">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
          <div className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>
        <div className="flex-1 bg-surface dark:bg-d-bg rounded-md px-3 py-1.5 text-[12px] text-dim text-center border border-line dark:border-d-line">
          {screens[activeIndex].id === 'tienda'
            ? 'mipos.com/c/kiosco-don-beto'
            : `app.mipos.online/${screens[activeIndex].id}`}
        </div>
      </div>
      {/* Screenshot crossfade */}
      <div className="relative aspect-[4/3] overflow-hidden bg-surface2 dark:bg-d-surface2">
        {screens.map((s, i) => (
          <img
            key={s.id}
            src={s.image}
            alt={s.title}
            className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-500 ${
              i === activeIndex ? 'opacity-100' : 'opacity-0'
            }`}
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
          />
        ))}
      </div>
    </div>
  );
}

function CopyPanel({ activeIndex }: { activeIndex: number }) {
  const screen = screens[activeIndex];
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="font-display text-3xl lg:text-4xl font-bold text-ink dark:text-white leading-tight">
          {screen.title}
        </h3>
        <p className="mt-2 text-lg text-muted dark:text-d-muted">{screen.subtitle}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {screen.bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-brand flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-base text-muted dark:text-d-muted">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Vertical progress dots (desktop)
function ProgressDots({
  activeIndex,
  onSelect,
}: {
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 flex-shrink-0" role="tablist" aria-label="Pantalla activa">
      {screens.map((s, i) => (
        <button
          key={s.id}
          role="tab"
          aria-selected={i === activeIndex}
          aria-label={`Ver ${s.label}`}
          onClick={() => onSelect(i)}
          className={`w-2 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            i === activeIndex ? 'h-8 bg-brand' : 'h-2 bg-line dark:bg-d-line hover:bg-muted'
          }`}
        />
      ))}
    </div>
  );
}

// Mobile card
function MobileCard({ screen }: { screen: (typeof screens)[0] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl shadow-card border border-line dark:border-d-line overflow-hidden bg-surface dark:bg-d-surface w-full">
        <div className="flex items-center gap-2 px-3 py-2.5 bg-surface2 dark:bg-d-bg border-b border-line dark:border-d-line">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex-1 bg-surface dark:bg-d-bg rounded px-2 py-1 text-[11px] text-dim text-center border border-line dark:border-d-line">
            {screen.id === 'tienda' ? 'mipos.com/c/kiosco' : `app.mipos.online/${screen.id}`}
          </div>
        </div>
        <div className="aspect-[4/3] overflow-hidden">
          <img src={screen.image} alt={screen.title} className="w-full h-full object-cover object-top" loading="lazy" />
        </div>
      </div>
      <div className="flex flex-col gap-3 px-1">
        <div>
          <h3 className="font-display text-xl font-bold text-ink dark:text-white leading-snug">{screen.title}</h3>
          <p className="mt-1 text-base text-muted dark:text-d-muted">{screen.subtitle}</p>
        </div>
        <ul className="flex flex-col gap-2">
          {screen.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-brand flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-sm text-muted dark:text-d-muted">{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────

export default function ScreensShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [mobileTab, setMobileTab]     = useState(0);
  const [paused, setPaused]           = useState(false);
  const pausedRef                     = useRef(false);

  pausedRef.current = paused;

  // Auto-advance (desktop): cycles screens every AUTOPLAY_MS while not paused
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const id = setInterval(() => {
      if (!pausedRef.current) {
        setActiveIndex(i => (i + 1) % screens.length);
      }
    }, AUTOPLAY_MS);

    return () => clearInterval(id);
  }, []);

  const handleSelect = (i: number) => {
    setActiveIndex(i);
    // Pause autoplay for a bit after manual selection, then resume
    setPaused(true);
    setTimeout(() => setPaused(false), AUTOPLAY_MS * 2);
  };

  return (
    <section aria-label="Pantallas del producto" className="bg-surface dark:bg-d-bg">

      {/* ── DESKTOP: auto-rotating tabs, ~1 viewport tall ── */}
      <div className="hidden md:block py-20">
        <div className="max-w-[1180px] mx-auto px-7">

          {/* Section header */}
          <div className="mb-14 text-center">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-ink dark:text-white leading-tight text-balance mx-auto max-w-2xl">
              Pensado para vos.{' '}
              <span className="text-muted dark:text-d-muted font-normal">
                Tres pantallas que vas a usar todos los días.
              </span>
            </h2>
          </div>

          {/* Content: copy (left) + device (right) */}
          <div
            className="grid grid-cols-[2fr_3fr] gap-12 lg:gap-20 items-center"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* Left: copy + vertical dots */}
            <div className="flex items-center gap-6">
              <div className="flex-1 min-w-0">
                <CopyPanel activeIndex={activeIndex} />
              </div>
              <ProgressDots activeIndex={activeIndex} onSelect={handleSelect} />
            </div>

            {/* Right: device frame */}
            <div className="flex justify-center">
              <DeviceFrame activeIndex={activeIndex} />
            </div>
          </div>

        </div>
      </div>

      {/* ── MOBILE: tabs + stacked cards ── */}
      <div className="md:hidden py-12 px-4">
        <div className="mb-8 text-center">
          <h2 className="font-display text-2xl font-bold text-ink dark:text-white leading-tight">
            Pensado para vos.
          </h2>
          <p className="mt-1 text-base text-muted dark:text-d-muted">
            Tres pantallas que vas a usar todos los días.
          </p>
        </div>

        {/* Tab pills */}
        <div role="tablist" aria-label="Pantallas del producto" className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {screens.map((s, i) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={i === mobileTab}
              aria-controls={`mobile-panel-${s.id}`}
              id={`mobile-tab-${s.id}`}
              onClick={() => setMobileTab(i)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                i === mobileTab
                  ? 'bg-brand text-white'
                  : 'bg-surface2 dark:bg-d-surface text-muted dark:text-d-muted border border-line dark:border-d-line'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Panels */}
        {screens.map((s, i) => (
          <div
            key={s.id}
            id={`mobile-panel-${s.id}`}
            role="tabpanel"
            aria-labelledby={`mobile-tab-${s.id}`}
            hidden={i !== mobileTab}
          >
            <MobileCard screen={s} />
          </div>
        ))}
      </div>

    </section>
  );
}
