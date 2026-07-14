# Brief de refactor — Landing mipos → Astro

Prompt/brief completo para pasarle a un agente de código. Objetivo: **migrar la landing actual (indexuy.html) a Astro** conservando toda la información y textos, pero con una estética más impactante, premium y con carácter — y animaciones sutiles con propósito. Adjuntá al agente: `indexuy.html` (contenido actual) y las capturas reales de UI (`mipos_pos_ui.png`, `mipos_reportes_ui.png`, `mipos_tienda_ui.png`).

---

## 0) Rol y objetivo

Actuá como **diseñador de producto + dev front-end senior**. Rediseñá y migrá la landing de mipos a un proyecto **Astro** moderno, componentizado y performante. Mantené la MISMA información, secciones y textos del index actual; cambiá la piel: más impacto visual, jerarquía fuerte, detalles con carácter y micro-animaciones. Nada de "template básico" ni estética de IA.

Antes de escribir código, **describí la propuesta visual sección por sección y esperá mi OK.** Después implementá.

---

## 1) Identidad de marca (respetar sí o sí)

- **Quiénes somos:** mipos, un punto de venta y gestión **uruguayo/rioplatense** para comercios minoristas (kioscos, almacenes, autoservicios, indumentaria). Reemplaza la libreta, el cuaderno de fiados y el Excel.
- **Personalidad:** confiable, directo, de mostrador. De igual a igual con el comerciante. NO es "startup de juguete" ni tech de Silicon Valley.
- **Anti-referencias:** NADA de estética crypto/fintech/neón; nada de rojos/naranjas de alarma; nada de degradados mesh, glow o halos (se ve "hecho por IA").
- **Color:** azul de marca `#2563EB` + neutros; acentos azules (no alarmas).
- **Tipografías:** `Sora` (display/títulos) y `DM Sans` (texto). Mono opcional `Outfit`.
- **Modo oscuro** incluido. **WCAG AA** (contraste de texto ≥ 4.5:1).
- **Principio clave:** *el panel real es el mejor argumento de venta* → mostrar el producto grande y nítido con las capturas reales (no inventar UI).

---

## 2) Stack y arquitectura

- **Astro 5 + Tailwind CSS.** HTML semántico. Mobile-first, responsive.
- **Componentes** (`src/components/`): `Nav.astro`, `Hero.astro`, `StatsBar.astro`, `ScreensShowcase.astro`, `Features.astro`, `Pricing.astro`, `Testimonials.astro`, `FAQ.astro`, `CTA.astro`, `Footer.astro`. Layout base en `src/layouts/Base.astro`.
- **Cero JS por defecto.** Usar Astro islands solo donde haga falta interacción (contadores, acordeón FAQ, scrollytelling).
- **Animaciones:** una lib liviana — **Motion One** (preferido) o **GSAP + ScrollTrigger** — cargada solo en las islands que la usen. **Astro View Transitions** para navegación entre páginas. **Todas** las animaciones respetan `prefers-reduced-motion` (si está activo, se muestran los estados finales sin movimiento).
- **Imágenes:** `astro:assets` `<Image />`, lazy, formatos modernos (AVIF/WebP), con `width/height` para evitar CLS.
- **SEO:** meta title/description, Open Graph, favicon, `lang="es"`, sitemap.
- **Deploy-ready para Vercel.** Objetivo **Lighthouse ≥ 95** en Performance y Accesibilidad.

---

## 3) Design tokens (Tailwind) — pegar en `tailwind.config.mjs`

```js
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          soft: 'rgba(37,99,235,0.08)',
          600: '#2563EB', 700: '#1D4ED8', 400: '#60A5FA',
        },
        ink: '#101828',        // texto principal
        muted: '#475467',      // texto secundario
        dim: '#98A2B3',        // texto terciario
        surface: '#FFFFFF',
        surface2: '#F4F6FB',   // fondos claros
        line: '#E3EAF3',       // bordes
        ok: '#047857',         // éxito (verde sobrio, NO alarma)
        // dark mode
        'd-bg': '#0B1220', 'd-surface': '#111A2E', 'd-line': '#1E2A44',
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['Outfit', 'monospace'],
      },
      borderRadius: { xl: '14px', '2xl': '18px', '3xl': '24px' },
      boxShadow: {
        soft: '0 2px 8px rgba(16,24,40,0.06)',
        card: '0 10px 30px rgba(16,24,40,0.08)',
        float: '0 30px 60px rgba(16,24,40,0.14)',
      },
      maxWidth: { content: '1200px' },
    },
  },
  plugins: [],
}
```

Cargá las fuentes con `@fontsource` o `<link>` de Google Fonts (Sora 400/600/700/800, DM Sans 400/500/700).

---

## 4) Contenido y secciones (misma info que el index actual)

Mantené estos textos/ideas (podés pulir redacción, no cambiar el sentido):

1. **Nav sticky** — logo mipos (cuadrado azul con check) + wordmark; links: Funciones, Demo, Precios, Tienda online; botón CTA **"Probar 7 días gratis"**. Al scrollear, nav con fondo sólido y sombra `soft`.
2. **Hero** — Título: **"Ventas, stock y fiados para tu comercio."** Subtítulo corto explicando qué es (punto de venta uruguayo que reemplaza la libreta y el Excel). CTA primario **"Abrí tu caja gratis"** + secundario **"Ver demo"**. A un lado, mockup grande con la captura real del **POS**.
3. **Barra de métricas** — tarjetas con **contadores animados**: "Negocios activos", "Minutos en cerrar la caja por día", "7 días de prueba gratis". (Usar cifras del index; si son de ejemplo, dejar nota.)
4. **Showcase de las 3 pantallas** (scrollytelling, ver §6): **POS** ("Cobrá"), **Reportes** ("Controlá"), **Tienda online** Kiosco Don Beto ("Vendé por WhatsApp"). Cada una con su captura real y 2-3 bullets.
5. **Features** — con el claim *"Cada función reemplaza algo que hoy hacés a mano"*:
   - Venta rápida: escáner de código de barras, búsqueda por nombre o monto; ticket impreso o por WhatsApp.
   - Stock en tiempo real y reposición.
   - Cierre de caja y reportes: cuánto vendiste, con qué medios de pago, qué productos vuelan; la caja cuadra sola.
   - Fiados / cuenta corriente de clientes.
   - Apertura y cierre de caja.
6. **Pricing** — "Empezás gratis. Si tu comercio crece, escalás cuando quieras." Plan con precio por mes + **7 días de prueba gratis**. Botón "Probar 7 días gratis".
7. **Testimonios / prueba social.**
8. **FAQ** (acordeón accesible) + **CTA final** ("Abrí tu caja gratis") + **Footer** (links, redes @mipos.online, legal).

> Los screenshots reales van dentro de frames de dispositivo prolijos. Dejá comentado en el código dónde se reemplazan por mis imágenes.

---

## 5) Dirección estética (elevar, no complicar)

- Escala tipográfica grande y segura; hero con un titular de gran peso (Sora extrabold) y buen tracking. Mucho **aire** y grilla ordenada (`max-w-content`, secciones con ritmo vertical consistente).
- **Profundidad honesta:** sombras suaves y realistas (`card`/`float`), bordes finos `line`, esquinas redondeadas coherentes. Nada de glow/mesh.
- **Detalles con carácter:** una grilla/patrón de líneas MUY sutil de fondo en el hero (no degradado), un acento tipográfico o un subrayado a mano en una palabra clave, íconos de línea consistentes (Lucide).
- **Dispositivos:** frames limpios (browser/notebook/teléfono) con las capturas reales grandes y nítidas — el producto manda.
- **Dark mode** cuidado (no solo invertir): superficies `d-surface`, texto legible, el azul sigue destacando.

---

## 6) Animaciones (sutiles, con propósito, reduce-motion safe)

- **Reveal on-scroll** con *stagger* en secciones y cards (fade + subida corta).
- **Hero:** entrada en cascada del texto; leve *float*/parallax del mockup al mover el mouse o al scrollear.
- **Contadores animados** en la barra de métricas (al entrar en viewport).
- **Scrollytelling del showcase (island):** una sección `sticky` donde el dispositivo queda fijo centrado y, a medida que scrolleás, **cambian la captura (POS → Reportes → Tienda) y el copy** con transición suave; barra de progreso o dots al costado. En mobile, degradá a un carrusel simple.
- **Marquee** lento e infinito con rubros: "kioscos · almacenes · autoservicios · indumentaria".
- **Microinteracciones:** hover lift en cards, subrayado animado en links, estados de foco visibles (a11y).
- **View Transitions** entre páginas (ej. a la vista de precios o al catálogo demo).
- Transiciones suaves (200–500 ms, easing natural), nunca estridentes ni con autoplay ruidoso.

---

## 7) Accesibilidad y performance

- HTML semántico (`header/nav/main/section/footer`, headings en orden), `alt` en imágenes, foco visible, navegación por teclado, acordeón FAQ accesible (aria).
- Contraste AA; respetar `prefers-reduced-motion` y `prefers-color-scheme`.
- Cero JS de más; islands mínimas; lazy-loading de imágenes; sin dependencia de JS para el contenido crítico.
- Lighthouse ≥ 95 en Performance y Accesibilidad.

---

## 8) Evitar

Estética de IA, degradados mesh/glow/halo, neón, look crypto/fintech, rojos/naranjas de alarma, animaciones que mareen, autoplay ruidoso, librerías pesadas, JS innecesario, romper contraste/legibilidad, inventar pantallas de UI.

---

## 9) Entregables

1. Propuesta visual descrita sección por sección (esperar OK).
2. Proyecto Astro con la estructura de componentes, `tailwind.config.mjs` con los tokens de arriba, fuentes cargadas, y la landing armada, responsive y con dark mode.
3. Comentarios `{/* PEGAR CAPTURA: mipos_pos_ui.png */}` etc. donde van mis imágenes reales.
4. Animaciones implementadas según §6, con fallback reduce-motion.
5. Notas de deploy en Vercel.
```
