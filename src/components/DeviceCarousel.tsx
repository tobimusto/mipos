import { useEffect, useRef, useState } from "react";

// Screen order: POS → Reportes → Tienda (loops back)
// Images are 1818×1280 (POS/Reportes, ~1.42:1) and 788×1184 (Tienda, portrait)
const SCREENS = [
  {
    src: "/ui_pos.png",
    alt: "Panel Punto de Venta — mipos",
    label: "Cobrá",
    sub: "Punto de Venta",
    hasSidebar: true,
  },
  {
    src: "/ui_reportes.png",
    alt: "Reportes del negocio — mipos",
    label: "Controlá",
    sub: "Reportes",
    hasSidebar: true,
  },
  {
    src: "/ui_tienda.png",
    alt: "Tienda online pública — mipos",
    label: "Vendé",
    sub: "Tienda online",
    hasSidebar: false,
  },
];

// Cursor target for the CLICK that takes us to the NEXT screen.
// Coordinates as % of the screen container (left %, top %).
// Sidebar occupies ~14% of width. Items are at these vertical positions
// derived from the actual 1818×1280 screenshot layout:
//   Mi Tienda Online ≈ y=24%   (CATÁLOGO section)
//   Reportes         ≈ y=41%   (ANÁLISIS section)
const NEXT_TARGETS: Array<{ x: number; y: number } | null> = [
  { x: 7, y: 41 },   // from POS     → click "Reportes"
  { x: 7, y: 24 },   // from Reportes → click "Mi Tienda Online"
  null,               // from Tienda   → no sidebar, just loop
];

// Resting position of the cursor on each screen (where the active item is)
const CURSOR_REST: Array<{ x: number; y: number }> = [
  { x: 7, y: 11 },  // "Punto de Venta" active position
  { x: 7, y: 41 },  // "Reportes" active position (just arrived)
  { x: 7, y: 24 },  // "Mi Tienda Online" (just arrived, then screen changes)
];

const DWELL   = 3200; // ms shown on each screen before cursor starts moving
const TRAVEL  = 560;  // ms cursor slides to target
const CLICK   = 200;  // ms click pause
const FADE    = 550;  // ms crossfade (matches CSS transition)

type Phase = "off" | "flash" | "on";

export default function DeviceCarousel() {
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const [phase,      setPhase]      = useState<Phase>("off");
  const [active,     setActive]     = useState(0);
  const [curX,       setCurX]       = useState(CURSOR_REST[0].x);
  const [curY,       setCurY]       = useState(CURSOR_REST[0].y);
  const [curVisible, setCurVisible] = useState(false);
  const [clicking,   setClicking]   = useState(false);

  const activeRef = useRef(0);
  const pausedRef = useRef(false);
  const timer     = useRef<ReturnType<typeof setTimeout>>();

  const clear = () => clearTimeout(timer.current);

  // ── Power-on ──────────────────────────────────────────────
  useEffect(() => {
    if (reduced.current) { setPhase("on"); return; }
    const t1 = setTimeout(() => setPhase("flash"), 180);
    const t2 = setTimeout(() => { setPhase("on"); setCurVisible(true); }, 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // ── Cycle ─────────────────────────────────────────────────
  const runCycle = (from: number) => {
    if (pausedRef.current) return;
    const next   = (from + 1) % 3;
    const target = NEXT_TARGETS[from];

    timer.current = setTimeout(() => {
      if (pausedRef.current) return;

      if (target) {
        // Move cursor to nav item
        setCurX(target.x);
        setCurY(target.y);

        // After travel, click
        timer.current = setTimeout(() => {
          if (pausedRef.current) return;
          setClicking(true);

          timer.current = setTimeout(() => {
            if (pausedRef.current) return;
            setClicking(false);
            setActive(next);
            activeRef.current = next;
            // Cursor stays at where it clicked (resting on the new active item)
            runCycle(next);
          }, CLICK + FADE * 0.5);
        }, TRAVEL + 80);

      } else {
        // Tienda → POS: no sidebar to click, fade cursor out then transition
        setCurVisible(false);
        timer.current = setTimeout(() => {
          if (pausedRef.current) return;
          setActive(next);
          activeRef.current = next;
          // Reposition cursor at new screen's rest position (POS nav item)
          setCurX(CURSOR_REST[next].x);
          setCurY(CURSOR_REST[next].y);
          timer.current = setTimeout(() => {
            if (pausedRef.current) return;
            setCurVisible(true);
            runCycle(next);
          }, FADE + 200);
        }, 600);
      }
    }, DWELL);
  };

  useEffect(() => {
    if (phase !== "on") return;
    setCurX(CURSOR_REST[0].x);
    setCurY(CURSOR_REST[0].y);
    timer.current = setTimeout(() => runCycle(0), 800);
    return clear;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const onEnter = () => { pausedRef.current = true; clear(); };
  const onLeave = () => {
    pausedRef.current = false;
    runCycle(activeRef.current);
  };

  const onDot = (i: number) => {
    clear();
    setActive(i);
    activeRef.current = i;
    if (i !== 2) {
      setCurX(CURSOR_REST[i].x);
      setCurY(CURSOR_REST[i].y);
      setCurVisible(true);
    } else {
      setCurVisible(false);
    }
    if (!pausedRef.current) {
      timer.current = setTimeout(() => runCycle(i), 80);
    }
  };

  const showCursor = curVisible && !reduced.current && SCREENS[active].hasSidebar;

  return (
    <div className="dc-wrap" onMouseEnter={onEnter} onMouseLeave={onLeave}>

      {/* ── iMac (real frame overlay) ────────────────── */}
      <div className="dc-imac" aria-hidden="true">
        {/* Screen content sits behind the frame image */}
        <div className="dc-frame-screen">
          <div className={`dc-screen dc-screen--${phase}`}>
            {SCREENS.map((s, i) => (
              <img
                key={s.src}
                src={s.src}
                alt={s.alt}
                width={i === 2 ? 788 : 1818}
                height={i === 2 ? 1184 : 1280}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                className={`dc-img${i === active ? " dc-img--on" : ""}`}
                draggable={false}
              />
            ))}
            {showCursor && (
              <div
                className={`dc-cursor${clicking ? " dc-cursor--click" : ""}`}
                style={{ left: `${curX}%`, top: `${curY}%` }}
                aria-hidden="true"
              />
            )}
            <div className="dc-gloss" aria-hidden="true" />
          </div>
        </div>
        {/* Real iMac frame PNG rendered on top */}
        <img
          src="/imac-frame.png"
          className="dc-frame-img"
          alt=""
          width={1200}
          height={1085}
          draggable={false}
        />
      </div>

      {/* ── Tablet (mobile) – iPad frame on top, screenshots behind ── */}
      <div className="dc-tablet" aria-hidden="true">
        <div className="dc-ipad-wrap">
          {/* Screenshots sit BEHIND the frame (z-index 1) */}
          <div className={`dc-ipad-screen dc-screen dc-screen--${phase}`}>
            {SCREENS.map((s, i) => (
              <img
                key={s.src}
                src={s.src}
                alt=""
                width={i === 2 ? 788 : 1818}
                height={i === 2 ? 1184 : 1280}
                loading="lazy"
                decoding="async"
                className={`dc-img${i === 2 ? " dc-img--pt" : " dc-img--ls"}${i === active ? " dc-img--on" : ""}`}
                draggable={false}
              />
            ))}
          </div>
          {/* iPad frame PNG with transparent screen cutout ON TOP (z-index 2) */}
          <img
            src="/ipad-frame.png"
            className="dc-ipad-img"
            alt=""
            width={1600}
            height={1200}
            loading="eager"
            decoding="async"
            draggable={false}
          />
        </div>
      </div>

      {/* ── Dots / labels ────────────────────────────── */}
      <div className="dc-dots" role="tablist" aria-label="Pantallas del producto">
        {SCREENS.map((s, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === active}
            aria-label={`Ver pantalla: ${s.sub}`}
            className={`dc-dot${i === active ? " dc-dot--on" : ""}`}
            onClick={() => onDot(i)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
