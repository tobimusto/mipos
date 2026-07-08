# mipos · Carrusel UI (solo pantallas) — 3 prompts detallados

Carrusel publicitario y **explicativo**, sin escena de kiosco: solo las vistas del software sobre fondo limpio de marca, con titular, mensaje de valor y llamadas (callouts) apuntando a elementos concretos de cada pantalla, para que cualquiera entienda qué hace mipos. Estilo *product showcase* SaaS (Shopify / Square / Linear).

**Qué es mipos (contexto para toda la campaña):** sistema de punto de venta y gestión para comercios chicos (kioscos, almacenes, autoservicios). Reemplaza el cuaderno y la calculadora: cobra, controla stock, mide ganancias y vende online por WhatsApp. Simple, en español, pensado para el comerciante.

**Regla de composite:** la IA genera fondo + mockup del dispositivo + los textos/callouts, con la **pantalla vacía**; después pegás encima el screenshot real (con perspectiva). La UI queda legible y verdadera.

- Slide 1 · POS → `mipos_pos_ui.png`
- Slide 2 · Reportes → `mipos_reportes_ui.png`
- Slide 3 · Tienda Online → `mipos_tienda_ui.png`

---

## ESTILO COMPARTIDO (pegar en los 3)

```
Render publicitario tipo product showcase de una app SaaS moderna, formato 1:1, alta
resolución. Fondo degradado azul→blanco (#2563EB a #EAF1FF) con formas geométricas suaves
y halo de luz difusa detrás del dispositivo. La interfaz va dentro de un mockup nítido
flotando en perspectiva 3/4, con sombra suave y realista. Arriba, franja limpia para el
titular (Sora, bold) y el subtítulo (DM Sans). Etiquetas explicativas = chips redondeados
blancos con ícono azul + texto corto, unidos a la pantalla con líneas finas tipo callout.
Isotipo mipos (cuadrado redondeado azul #2563EB con check blanco) arriba a la izquierda.
Aspecto profesional, confiable, ágil. Solo UI, fondo y texto: sin fotografía de local ni
personas.
```

Negative prompt (los 3):
```
fotografía de comercio, kiosco, personas, manos, mostrador, interfaz inventada o ilegible,
texto deforme, logos de otras marcas, estética de IA evidente, ruido, saturación,
sombras duras, mockups distorsionados, elementos de más.
```

Parámetros: `--ar 1:1`, pantalla del mockup **vacía** para incrustar el screenshot real.

---

## SLIDE 1 — POS · "Cobrá en segundos"

**Qué queremos comunicar:** cobrar es rápido y sin errores; sirve para cualquier forma de pago; el vueltito y el total salen solos. Es el corazón del sistema.

**Textos a renderizar:**
- Titular: **Cobrá en segundos**
- Subtítulo: *El punto de venta que cualquiera aprende a usar en un día.*
- Badge esquina: **Funciona sin internet** (píldora azul)
- CTA inferior: **Probá mipos gratis**

**Callouts (chips apuntando a la UI real):**
1. 🔍 *Buscá o escaneá el código* → apunta a la barra "Buscar producto o escanear código".
2. 🧾 *Carrito y total en vivo* → apunta a la lista del carrito / "Total $11.540".
3. 💳 *Efectivo, tarjeta, QR o fiado* → apunta a los 4 botones de método de pago.
4. ⚡ *Un toque para cobrar* → apunta al botón azul "mipos · Cobrar".

**Prompt (ES):**
```
[ESTILO COMPARTIDO] + Mockup de monitor/navegador de escritorio flotando en 3/4, pantalla
vacía para incrustar la pantalla de punto de venta de mipos. Titular grande arriba:
"Cobrá en segundos"; subtítulo: "El punto de venta que cualquiera aprende a usar en un
día.". Píldora azul arriba a la derecha: "Funciona sin internet". Cuatro chips blancos tipo
callout unidos con líneas finas a la pantalla: (1) lupa — "Buscá o escaneá el código";
(2) ticket — "Carrito y total en vivo"; (3) tarjeta — "Efectivo, tarjeta, QR o fiado";
(4) rayo — "Un toque para cobrar". Botón/etiqueta CTA abajo: "Probá mipos gratis".
Composición limpia, sensación de velocidad y simpleza. --ar 1:1
```
Componer: `mipos_pos_ui.png`.

---

## SLIDE 2 — REPORTES · "Sabé cuánto ganás, sin cuentas a mano"

**Qué queremos comunicar:** deja el cuaderno; mipos calcula ingresos, ganancia real y ticket promedio solo, y te muestra qué se vende más. Control del negocio sin ser contador.

**Textos a renderizar:**
- Titular: **Sabé cuánto ganás, sin hacer cuentas**
- Subtítulo: *Ingresos, ganancia y tus productos estrella, actualizados solos.*
- Badge esquina: **Sin planillas ni cuaderno**
- CTA inferior: **Empezá a medir tu negocio**

**Callouts (chips apuntando a la UI real):**
1. 📈 *Ingresos y ganancia del período* → apunta a las tarjetas KPI ("$1.284.500", "Ganancia 32%").
2. 🎟️ *Ticket promedio automático* → apunta al KPI "Ticket promedio $3.755".
3. 📊 *Ventas por día de un vistazo* → apunta al gráfico "Ingresos por día".
4. ⭐ *Tus productos más vendidos* → apunta a la lista "Top productos".

**Prompt (ES):**
```
[ESTILO COMPARTIDO] + Mockup de notebook flotando en 3/4, pantalla vacía para incrustar el
panel de reportes de mipos. Titular arriba: "Sabé cuánto ganás, sin hacer cuentas";
subtítulo: "Ingresos, ganancia y tus productos estrella, actualizados solos.". Píldora azul:
"Sin planillas ni cuaderno". Cuatro chips blancos tipo callout con líneas finas a la
pantalla: (1) flecha ↑ — "Ingresos y ganancia del período"; (2) ticket — "Ticket promedio
automático"; (3) barras — "Ventas por día de un vistazo"; (4) estrella — "Tus productos más
vendidos". Pequeños elementos de datos flotando sutilmente (mini-barras, "+12%"). CTA abajo:
"Empezá a medir tu negocio". Sensación de claridad y control. --ar 1:1
```
Componer: `mipos_reportes_ui.png`.

---

## SLIDE 3 — TIENDA ONLINE · "Vendé también por WhatsApp"

**Qué queremos comunicar:** con los mismos productos que ya cargaste, mipos te arma una tienda web pública con fotos y precios; los clientes eligen y el pedido te llega por WhatsApp. Vender sin depender del mostrador.

**Textos a renderizar:**
- Titular: **Tu tienda online, lista en minutos**
- Subtítulo: *Tus productos ya cargados, ahora también en la web. Los pedidos llegan por WhatsApp.*
- Badge esquina: **Sin comisiones por venta**
- CTA inferior: **Creá tu catálogo gratis**

**Callouts (chips apuntando a la UI real):**
1. 🖼️ *Catálogo con fotos y precios* → apunta a las tarjetas de producto con imagen.
2. 🗂️ *Ordenado por categorías* → apunta a las secciones (Lácteos / Snacks / Bebidas).
3. 🟢 *El pedido llega por WhatsApp* → apunta al botón inferior "Ver pedido · Enviar por WhatsApp".
4. 🔗 *Tu link para compartir* → apunta a la barra de dirección "mipos.com/c/kiosco-don-beto".

**Prompt (ES):**
```
[ESTILO COMPARTIDO] + Mockup de navegador de escritorio (opcional: un teléfono al lado con
la misma tienda) flotando en 3/4, pantalla vacía para incrustar la tienda online pública de
mipos. Titular arriba: "Tu tienda online, lista en minutos"; subtítulo: "Tus productos ya
cargados, ahora también en la web. Los pedidos llegan por WhatsApp.". Píldora azul: "Sin
comisiones por venta". Cuatro chips blancos tipo callout con líneas finas a la pantalla:
(1) imagen — "Catálogo con fotos y precios"; (2) etiquetas — "Ordenado por categorías";
(3) WhatsApp — "El pedido llega por WhatsApp"; (4) link — "Tu link para compartir". Globo de
chat verde de WhatsApp flotando cerca. CTA abajo: "Creá tu catálogo gratis". --ar 1:1
```
Componer: `mipos_tienda_ui.png`.

---

## Marca y consistencia
- Azul mipos **#2563EB**; isotipo (cuadrado redondeado azul con check blanco) arriba a la izquierda en los 3.
- Tipografías: **Sora** (títulos/CTA), **DM Sans** (subtítulos/chips).
- Mismo fondo, mismos estilos de chip y píldora en los 3 → se lee como una sola campaña.
- Portada opcional (slide 0): fondo azul + logo + claim **"Todo tu negocio, en una sola app."** + bajada *"Cobrá, controlá y vendé desde el celular o la compu."*
- Composite: pegá cada screenshot en la pantalla del mockup con Transformar → Perspectiva; opacidad 92-96% + leve brillo de pantalla.
