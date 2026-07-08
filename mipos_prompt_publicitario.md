# mipos · Aviso Instagram (1:1) — Kit de generación

Sistema POS y gestión de ventas para comercios. Escena: mostrador real de kiosco con un monitor mostrando la UI real de mipos.

**Cómo usar este kit:** generá la foto con el prompt de abajo (Midjourney / DALL·E 3 / Firefly / Nano Banana / Ideogram). Pedí que **la pantalla del monitor quede vacía / apagada o con una imagen neutra**, y después **pegá encima el screenshot real** `mipos_pos_ui.png` con corrección de perspectiva (ver sección "Composite"). Así garantizás UI real y 100% legible, sin interfaces inventadas.

---

## 1) Prompt principal (español)

```
Fotografía comercial B2B de alta gama, formato cuadrado 1:1, estilo campaña de
Square / Shopify / Toast POS. Mostrador real de un kiosco de barrio en pleno día,
auténtico y en funcionamiento. Sobre el mostrador, un monitor de escritorio moderno
de marco fino es el foco visual, ubicado ligeramente descentrado. Ángulo
over-the-shoulder / semi cenital, como si el comerciante estuviera cobrando una venta.

Detalles reales del rubro alrededor, sin saturar: exhibidor de golosinas y alfajores,
botellas de gaseosa y agua, atados de cigarrillos en el fondo, un paquete de galletitas,
una terminal de pago (posnet) con lector de tarjetas, una pequeña impresora de tickets
(ticketera) con un recibo saliendo, un billete y monedas apoyados. Todo con desgaste
natural y creíble de un comercio en uso.

Iluminación natural cálida entrando de forma lateral desde una ventana o la puerta del
local, sombras suaves y difusas, temperatura diurna realista, sin flash. Profundidad de
campo media: el monitor y el mostrador nítidos, el fondo del kiosco levemente desenfocado.
Colores calibrados, aspecto editorial, alta nitidez.

Paleta con azules y blancos integrados de forma sutil y natural en la escena (packaging,
detalles del mostrador, reflejos fríos), nunca forzada. Ambiente profesional, moderno,
confiable y ágil, que transmita "esto simplifica mi negocio".

Composición pensada para publicidad: dejar amplio espacio negativo limpio en la zona
superior del cuadro para colocar copy y logo. La pantalla del monitor se ve claramente
en uso pero no domina toda la imagen.

Fotorrealista, lente 35mm, sensor full-frame, sin estética de IA.
```

## 2) Prompt principal (inglés — recomendado para Midjourney/DALL·E)

```
High-end B2B commercial photograph, 1:1 square format, in the style of a Square /
Shopify / Toast POS campaign. A real neighborhood convenience-store (kiosco) counter in
broad daylight, authentic and in use. A modern thin-bezel desktop monitor sits on the
counter as the visual focus, slightly off-center. Over-the-shoulder / slightly top-down
angle, as if the shop owner is ringing up a sale.

Authentic trade details around it, not cluttered: a candy and snack display, soda and
water bottles, cigarette packs on the back shelf, a pack of cookies, a card-payment
terminal, a small receipt printer with a receipt coming out, a banknote and coins on the
counter. Everything with the natural, believable wear of a working shop.

Warm natural light coming in from the side (a window or the shop door), soft diffused
shadows, realistic daytime color temperature, no flash. Medium depth of field: monitor
and counter sharp, kiosko background gently blurred. Calibrated colors, editorial look,
high sharpness.

Subtle blues and whites naturally integrated into the scene (packaging, counter details,
cool reflections), never forced. Professional, modern, trustworthy and efficient mood —
"this makes running my business easier".

Advertising composition: keep generous clean negative space in the TOP area of the frame
for copy and logo. The monitor screen is clearly in use but does not dominate the image.

Photorealistic, 35mm lens, full-frame sensor, no AI look.
--ar 1:1 --style raw
```

## 3) Negativos (negative prompt)

```
estética IA evidente, interfaz inventada o ilegible, texto deforme en pantalla, pantallas
flotantes, manos con dedos deformes o de más, brillos irreales, HDR exagerado, oficina
corporativa fría sin alma, fondo genérico de stock, marca de agua, logos ajenos, saturación
excesiva, look de render 3D, desenfoque de toda la imagen, personas mirando a cámara.
```

## 4) Parámetros sugeridos

- **Relación de aspecto:** 1:1 (1080×1080, o 1440×1440 para más resolución).
- **Foco:** el dispositivo (monitor) como protagonista visual, descentrado.
- **Ángulo:** over-the-shoulder / semi cenital.
- **Espacio negativo:** zona superior libre para copy + logo mipos.
- Generá **2–3 variantes** del fondo y elegí la que tenga el monitor con el ángulo más frontal (facilita el composite).

---

## 5) Composite — pegar la UI real en el monitor

Para cumplir "UI real y legible", no dejes que la IA dibuje la pantalla: componela vos.

1. Generá la foto pidiendo el **monitor con pantalla apagada / vacía** (o un color plano azulado).
2. Abrí la foto en Photoshop / Figma / Canva / GIMP.
3. Colocá `mipos_pos_ui.png` (3840×2160, 16:9) sobre el área de la pantalla.
4. Usá **Transformación libre → Distorsionar/Perspectiva** para calzar las 4 esquinas de la UI con las 4 esquinas del monitor.
5. Bajá la opacidad al 90–95% y agregá un leve **reflejo/brillo** y una sombra sutil para integrarla.
6. Opcional: una capa muy tenue de la luz cálida de la escena encima de la pantalla para que "pertenezca" a la foto.

> Tip: si tu herramienta de IA soporta **inpainting / image-to-image con referencia** (Nano Banana, Firefly, DALL·E editing), podés pasar `mipos_pos_ui.png` como referencia de lo que va en la pantalla y pedir que la incruste con la perspectiva del monitor. Igual conviene un repaso manual para dejarla nítida.

---

## 6) Sobre la marca (para copy y logo)

- **Color de marca mipos:** azul `#2563EB` (el mismo del botón *Cobrar* y del isotipo).
- **Isotipo:** cuadrado redondeado azul con un check blanco.
- **Tipografías de la UI:** Sora (títulos), DM Sans (texto).
- Ideas de copy para el espacio superior: *"Cobrá en segundos."* · *"Tu kiosco, bajo control."* · *"El punto de venta que simplifica tu negocio."*

_Assets incluidos: `mipos_pos_ui.png` (screenshot UI real) y `mipos_pos.html` (fuente editable del mockup)._
