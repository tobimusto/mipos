# mipos · Carrusel Instagram (3 slides) — Kit de generación

Carrusel B2B mostrando el **funcionamiento de las pantallas** de mipos en un comercio real.
Orden narrativo: **1) Reportes → 2) Tienda Online → 3) POS** (podés reordenar).

**Regla de oro (igual que el aviso anterior):** la IA genera la **escena fotográfica** con la pantalla del dispositivo **vacía/apagada**; después **pegás encima el screenshot real** de cada pantalla con corrección de perspectiva. Así la UI queda **real y legible**, sin interfaces inventadas.

Screenshots a componer (incluidos en la carpeta):
- Slide 1 · Reportes → `mipos_reportes_ui.png` (3840×2160, 16:9 → monitor/notebook)
- Slide 2 · Tienda Online → `mipos_tienda_ui.png` (vista pública "Kiosco Don Beto" con banner y fotos → notebook o tablet)
- Slide 3 · POS → `mipos_pos_ui.png` (3840×2160, 16:9 → monitor del mostrador)

---

## ESTILO COMPARTIDO (pegar en TODOS los slides)

Para que el carrusel se vea como una sola campaña, mantené constante: mismo kiosco, misma luz cálida diurna, misma paleta y tratamiento.

```
Fotografía comercial B2B de alta gama, formato cuadrado 1:1, estilo campaña de
Square / Shopify / Toast POS. Un mismo kiosco de barrio real, auténtico y en
funcionamiento, en pleno día. Luz natural cálida entrando de forma lateral desde la
puerta/ventana del local, sombras suaves y difusas, sin flash. Profundidad de campo
media, colores calibrados, aspecto editorial, alta nitidez. Paleta con azules y blancos
integrados de forma sutil y natural en la escena (packaging, detalles, reflejos fríos),
nunca forzada. Ambiente profesional, moderno, confiable y ágil: "esto simplifica mi
negocio". Amplio espacio negativo limpio en la zona superior del cuadro para copy y logo.
El dispositivo se ve claramente en uso pero no domina toda la imagen.
Fotorrealista, lente 35mm, sensor full-frame, sin estética de IA. --ar 1:1 --style raw
```

Negative prompt (para todos):
```
estética IA evidente, interfaz inventada o ilegible, texto deforme en pantalla, pantallas
flotantes, manos con dedos deformes o de más, brillos irreales, HDR exagerado, oficina
corporativa fría, fondo genérico de stock, marca de agua, logos ajenos, saturación excesiva,
look de render 3D, personas mirando a cámara.
```

---

## SLIDE 1 — REPORTES ("Entendé tu negocio")

**Subject (sumar al estilo compartido):**
```
Sobre el mostrador del kiosco, una notebook moderna de marco fino es el foco, ligeramente
descentrada, con la PANTALLA VACÍA/APAGADA (para incrustar la UI después). El comerciante
—plano medio, sin rostro protagónico— la mira mientras revisa el día; una taza de café,
un anotador y una calculadora al costado. Al fondo, borroso, el exhibidor de golosinas y
las botellas. Ángulo over-the-shoulder. Espacio negativo arriba para el copy.
```
- Componer: `mipos_reportes_ui.png` en la pantalla de la notebook.
- Copy sugerido: **"Sabé cuánto ganás, todos los días."**

## SLIDE 2 — TIENDA ONLINE ("Vendé también online")

**Subject (sumar al estilo compartido):**
```
Primer plano de las manos del comerciante sosteniendo una notebook/tablet moderna sobre
el mostrador, PANTALLA VACÍA/APAGADA, mostrando su catálogo público. Un smartphone al lado
con WhatsApp abierto insinuado (sin UI legible). Detrás, en foco suave, el kiosco real con
sus productos. Sensación de "recibí pedidos sin estar en el local". Ángulo semi cenital.
Espacio negativo arriba para el copy.
```
- Componer: `mipos_tienda_ui.png` (la tienda pública "Kiosco Don Beto" con banner y fotos de productos).
- Copy sugerido: **"Tu kiosco online, pedidos por WhatsApp."**

## SLIDE 3 — POS ("Cobrá en segundos")

**Subject (sumar al estilo compartido):**
```
Momento de venta: monitor de escritorio moderno sobre el mostrador como foco, PANTALLA
VACÍA/APAGADA, en el instante de cobrar. Alrededor, detalles reales del rubro: terminal de
pago (posnet), impresora de tickets con un recibo saliendo, billete y monedas, exhibidor de
golosinas, atados de cigarrillos y gaseosas al fondo (desenfoque suave). Ángulo
over-the-shoulder, como si el cajero estuviera finalizando la venta. Espacio negativo arriba.
```
- Componer: `mipos_pos_ui.png` en la pantalla del monitor.
- Copy sugerido: **"Cobrá en segundos, sin errores."**

---

## Composite (idéntico para los 3)

1. Generá cada foto con la pantalla **vacía/apagada** (o color plano azulado).
2. En Photoshop/Figma/Canva/GIMP, colocá el screenshot correspondiente sobre la pantalla.
3. **Transformar → Distorsionar/Perspectiva**: calzá las 4 esquinas del screenshot con las 4 del dispositivo.
4. Opacidad 90–95% + leve reflejo/brillo + sombra sutil para integrarlo.
5. Capa muy tenue de la luz cálida de la escena sobre la pantalla para que "pertenezca".

## Marca (para copy y logo)
- Azul mipos `#2563EB` · isotipo: cuadrado redondeado azul con check blanco.
- Tipografías UI: Sora (títulos), DM Sans (texto).
- Portada del carrusel opcional: fondo azul `#2563EB` + logo + claim general **"Todo tu negocio, en una sola pantalla."**

_Assets: `mipos_reportes_ui.png`, `mipos_tienda_ui.png`, `mipos_pos_ui.png` y los `.html` editables de cada pantalla._
