import { useState } from 'react';
import { ChevronDown, MessageCircle, HelpCircle } from 'lucide-react';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      q: '¿Cómo anulo una venta si me equivoqué?',
      a: 'Para anular una venta tenés que ir a la pestaña "ANÁLISIS > Reportes". Buscá la venta en la tabla y hacé clic en el ícono de la papelera roja. El sistema devolverá automáticamente los productos al inventario y registrará la salida del dinero de tu caja (si el pago fue en efectivo).'
    },
    {
      q: '¿Cómo cobro una deuda a un cliente o registro un pago a cuenta?',
      a: 'Andá al Punto de Venta (POS). Asegurate de que el carrito esté vacío. Seleccioná el nombre del cliente en la barra de la derecha y luego hacé clic en el botón "Agregar Monto" de la columna central. Poné el monto que el cliente te está entregando y hacé clic en "Abonar Deuda".'
    },
    {
      q: '¿Los cobros con tarjeta o transferencia suman al total de la Caja?',
      a: 'No. El saldo de la Caja Central (el número verde que ves arriba a la derecha) representa exclusivamente el dinero FÍSICO (Efectivo) que tenés en el cajón. Los pagos por transferencia o tarjeta se registran en los movimientos y en la facturación del día, pero no alteran el efectivo en caja.'
    },
    {
      q: 'Tengo productos que ya no vendo, ¿los borro?',
      a: 'Te recomendamos NO borrarlos, especialmente si ya tienen un historial de ventas, para no perder tus estadísticas. Lo ideal es ir a "CATÁLOGO > Productos" y simplemente apagar el switch (interruptor) de "Estado". Al desactivarlo, el producto dejará de aparecer en el Punto de Venta.'
    },
    {
      q: '¿Cómo configuro mi Tienda Online pública?',
      a: 'En "SISTEMA > Configuración", dentro de la pestaña "Negocio", podés definir el nombre de tu tienda y cargar el logo. Una vez hecho esto, los productos activos aparecerán en tu Tienda Online ("ANÁLISIS > Mi Tienda Online"), donde vas a poder copiar el link para enviárselo a tus clientes por WhatsApp.'
    },
    {
      q: '¿Cómo retiro dinero para pagar a un proveedor?',
      a: 'Hacé clic en el botón de tu Caja (arriba a la derecha), seleccioná "Retirar dinero", ingresá el monto y escribí el motivo (por ejemplo, "Pago a distribuidor de bebidas"). Esto descontará el saldo de la caja física y dejará el registro en tus movimientos.'
    }
  ];

  return (
    <div className="flex-1 bg-bg min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-surface p-3 rounded-2xl border border-border text-brand">
            <HelpCircle size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-text">Preguntas Frecuentes</h1>
            <p className="text-muted text-sm md:text-[15px] mt-1">Resolvé tus dudas rápidas sobre el uso del sistema.</p>
          </div>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div 
              key={idx} 
              className={`bg-surface border border-border rounded-2xl overflow-hidden transition-all duration-300 ${openIndex === idx ? 'ring-1 ring-brand' : ''}`}
            >
              <button 
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
              >
                <span className="font-bold text-text text-sm md:text-[15px]">{faq.q}</span>
                <ChevronDown 
                  size={18} 
                  className={`text-muted transition-transform duration-300 ${openIndex === idx ? 'rotate-180' : ''}`}
                />
              </button>
              
              <div 
                className={`transition-all duration-300 ease-in-out ${openIndex === idx ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <div className="p-5 pt-0 text-dim text-sm md:text-[15px] leading-relaxed border-t border-border/50 mt-2">
                  {faq.a}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-brand/10 border border-brand/30 rounded-2xl p-8 text-center animate-in fade-in slide-in-from-bottom-4">
          <MessageCircle size={40} className="text-brand mx-auto mb-4" />
          <h2 className="text-lg font-bold text-text mb-2">¿Seguís teniendo dudas?</h2>
          <p className="text-sm md:text-[15px] text-muted mb-6">Nuestro equipo de soporte técnico está disponible para ayudarte a configurar tu negocio o resolver cualquier problema.</p>
          <a 
            href="https://wa.me/5491100000000?text=Hola,%20necesito%20soporte%20con%20mipos" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-text font-bold py-3 px-6 rounded-xl transition-all shadow-[0_4px_15px_rgba(82,82,255,0.3)]"
          >
            <MessageCircle size={18} />
            Contactar Soporte por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
