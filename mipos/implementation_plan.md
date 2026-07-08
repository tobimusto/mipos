# Localización UY — Landing Page mipos

Adaptar la landing page para que usuarios de Uruguay vean precios en UYU y métodos de pago locales, sin afectar la experiencia AR.

---

## Resumen

Cuando alguien de Uruguay accede al link, la página debe:
1. Mostrar precios en pesos uruguayos (UYU) en vez de ARS
2. Reemplazar los métodos de pago (Rebill + MercadoPago → opciones UY)
3. Adaptar copies mínimos (referencias a "argentino", ARCA, etc.)

Todo esto en **dos archivos HTML separados** (`index.html` para AR, `indexuy.html` para UY), con routing automático vía Vercel Edge Middleware usando el header `x-vercel-ip-country` que inyecta la CDN de Vercel. Sin API externa, sin latencia adicional.

---

## Open Questions

> [!IMPORTANT]
> **Necesito que definas antes de implementar:**
>
> 1. **Precios UY** — ¿Cuánto vale cada plan en UYU?
>    - Hoy AR: Esencial $15.000 / Pro $25.000 / IA $28.500 (mensual)
>    - ¿Hacemos equivalente en USD o precio fijo en UYU?
>
> 2. **Método de pago UY** — ¿Qué opciones tenés disponibles?
>    - ¿Abitab / RedPagos? ¿Transferencia bancaria manual? ¿MercadoPago UY? ¿Stripe? ¿WhatsApp directo?
>
> 3. **¿Qué pasa al hacer clic en "Elegir plan"?** — ¿Redirige a un WhatsApp tuyo para cerrar la venta manualmente? ¿O hay un link de pago online UY?

---

## Propuesta Técnica

### Cómo detectamos el país

Vercel inyecta el header `x-vercel-ip-country` en cada request desde su Edge Network. No se consume ninguna API externa, no hay latencia adicional ni límite de requests.

**Flujo:**
```
request llega → Vercel Edge Middleware lee x-vercel-ip-country → UY → redirect a /indexuy.html
                                                                → AR (default) → sirve index.html
```

**Archivo:** `middleware.js` en la raíz del proyecto.

```js
export const config = { matcher: ['/', '/index.html'] };

export default function middleware(request) {
  const country = request.headers.get('x-vercel-ip-country');
  if (country === 'UY') {
    const url = new URL('/indexuy.html', request.url);
    return Response.redirect(url, 302);
  }
}
```

**Nota:** En localhost el header no existe → se sirve `index.html` (AR) por defecto. Para testear UY en local, abrí `indexuy.html` directamente.

---

## Cambios realizados

### ✅ `middleware.js` — Routing por país (NUEVO)

Lee el header `x-vercel-ip-country` inyectado por Vercel y redirige usuarios UY a `indexuy.html`. Sin API externa. Ver archivo en raíz del proyecto.

### ✅ `indexuy.html` — Contenido UY (IMPLEMENTADO)

Cambios bakeados directamente en el HTML (sin JS de detección):

- **Meta:** título y descripción apuntan a Uruguay
- **Hero lead:** copy orientado al comerciante uruguayo
- **Trust strip:** "Hecho en Argentina" → "Hecho en Latinoamérica"
- **Features:** item #06 ARCA → DGI/facturación electrónica
- **Precios:** `$U` como moneda, Esencial $U1.050 / Pro $U2.500 / IA $U3.500 (mensual)
- **Toggle anual:** override inline que muestra precios anuales en UYU ($U11.988 / $U25.188 / $U35.988)
- **Tabla comparativa:** precios actualizados a UYU, fila ARCA → DGI
- **FAQ:** pregunta ARCA → facturación electrónica UY con DGI
- **Footer:** tagline genérico latinoamericano

### ✅ Números de WhatsApp

| País | Número | Link |
|------|--------|------|
| AR | +5491124017714 | `https://wa.me/5491124017714` |
| UY | +59892220820 | `https://wa.me/59892220820` |

Ambos números ya están wireados en el botón "Escribinos por WhatsApp" de la sección de soporte de cada landing.

### 🔜 Pendiente — Modal de checkout UY

Cuando se construya el modal de pago, agregar en `submitCheckout()` de `indexuy.html`:

```js
if (method === 'whatsapp_uy') {
  const plan = document.getElementById('cksPlanName').textContent;
  window.open(`https://wa.me/59892220820?text=Hola, quiero contratar el ${plan} para Uruguay`, '_blank');
  return;
}
```

---

## Verificación

| Escenario | Resultado esperado |
|---|---|
| Usuario AR | Ve ARS, Rebill + MercadoPago, copies AR |
| Usuario UY | Ve UYU ($U), Transferencia + WhatsApp UY |
| API geoloc falla | Ve versión AR por defecto (fail-safe) |
| Usuario UY cambia toggle mensual↔anual | Precios UY cambian correctamente |
| Usuario UY hace clic "Elegir plan" | Modal muestra opciones de pago UY |
| Usuario UY elige WhatsApp | Abre WhatsApp con mensaje pre-armado |

---

## Preguntas abiertas antes de arrancar

> [!IMPORTANT]
> Antes de implementar necesito que me confirmes:
> 1. **Los precios exactos en UYU** para cada plan (o si preferís hacerlo en USD)
> 2. **El método de pago disponible en UY** (transferencia, Abitab, MercadoPago UY, Stripe, etc.)
> 3. **Tu número de WhatsApp UY** para los redirects del modal
