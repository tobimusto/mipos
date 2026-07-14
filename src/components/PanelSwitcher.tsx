import { useState, useEffect, useRef, useLayoutEffect } from 'react';

const TABS = [
  { id: 'panel-rep',   label: 'Reportes',        icon: 'M3 3v18h18M18 17V9M13 17V5M8 17v-3' },
  { id: 'panel-pos',   label: 'Punto de Venta',  icon: 'M2 3h20v14H2zM8 21h8M12 17v4' },
  { id: 'panel-store', label: 'Tienda Online',    icon: 'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function PanelSwitcher() {
  const [active, setActive] = useState<TabId>('panel-rep');
  const [indicator, setIndicator] = useState<{ left: number; width: number; top: number; height: number } | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const navRef  = useRef<HTMLDivElement>(null);

  const measure = () => {
    const idx = TABS.findIndex(t => t.id === active);
    const btn = tabRefs.current[idx];
    if (!btn) return;
    setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth, top: btn.offsetTop, height: btn.offsetHeight });
  };

  useLayoutEffect(measure, [active]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Show/hide panel-window divs in the static HTML via DOM refs
  useEffect(() => {
    TABS.forEach(tab => {
      const el = document.getElementById(tab.id);
      if (!el) return;
      const show = tab.id === active;
      el.classList.toggle('panel-w-hidden', !show);
      if (show) {
        el.classList.remove('panel-w-in');
        void el.offsetWidth; // force reflow to restart animation
        el.classList.add('panel-w-in');
      }
    });
  }, [active]);

  return (
    <div ref={navRef} className="psw" aria-label="Vistas del producto">
      {/* Sliding pill indicator */}
      {indicator && (
        <span
          className="psw-indicator"
          style={{
            left:   indicator.left,
            top:    indicator.top,
            width:  indicator.width,
            height: indicator.height,
          }}
          aria-hidden="true"
        />
      )}

      {TABS.map((tab, i) => (
        <button
          key={tab.id}
          ref={el => { tabRefs.current[i] = el; }}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          aria-controls={tab.id}
          className={`psw-btn${active === tab.id ? ' psw-active' : ''}`}
          onClick={() => setActive(tab.id)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d={tab.icon} />
          </svg>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
