import { supabase } from './supabase';
import { PAYMENT_METHODS } from '../constants/enums';

const QUEUE_KEY = 'mipos_offline_queue';

/**
 * Agrega una acción a la cola offline.
 * @param {string} type 'SALE' | 'CASH_MOVEMENT'
 * @param {object} payload Datos de la transacción
 */
export const enqueueOfflineAction = (type, payload) => {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  queue.push({
    id: Date.now().toString(),
    type,
    payload,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  
  // Disparar evento para que la UI sepa que hay pendientes
  window.dispatchEvent(new Event('offline-queue-updated'));
};

export const getOfflineQueue = () => {
  return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
};

export const clearOfflineQueue = () => {
  localStorage.setItem(QUEUE_KEY, '[]');
  window.dispatchEvent(new Event('offline-queue-updated'));
};

/**
 * Intenta procesar toda la cola.
 * Debe ser llamado cuando vuelve internet.
 */
export const syncOfflineQueue = async () => {
  if (!navigator.onLine) return;
  
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  console.log(`Syncing ${queue.length} offline actions...`);
  
  const failed = [];
  
  for (const action of queue) {
    try {
      if (action.type === 'CASH_MOVEMENT') {
        const { error } = await supabase.from('cash_movements').insert([action.payload]);
        if (error) throw error;
      } 
      else if (action.type === 'SALE') {
        const {
          cart,
          finalTotal,
          subtotal,
          discountAmount,
          surchargeAmount,
          discountSource,
          discountReason,
          paymentMethod,
          selectedClientId,
          owner_id,
          user_id, // employee_id
          cashAmount // current cash amount to calculate new saldo
        } = action.payload;

        // Si es pago de deuda sin productos
        if (cart.length === 0 && selectedClientId && finalTotal > 0) {
          const { data: client } = await supabase.from('clients').select('deuda, nombre').eq('id', selectedClientId).single();
          const currentDebt = Number(client?.deuda || 0);
          const paid = Math.min(finalTotal, currentDebt);
          const newDebt = Math.max(0, currentDebt - finalTotal);
          
          await supabase.from('clients').update({ deuda: newDebt }).eq('id', selectedClientId);
          
          const newCash = cashAmount + paid;
          await supabase.from('cash_movements').insert([{
            user_id: owner_id,
            employee_id: user_id,
            tipo: 'ingreso',
            monto: paid,
            motivo: `Abono de deuda (Sincronizado) - ${client?.nombre || 'Cliente'}`,
            saldo_anterior: cashAmount,
            saldo_nuevo: newCash
          }]);
          continue;
        }

        // 1. Registrar Venta
        const { data: saleData, error: saleError } = await supabase
          .from('sales')
          .insert([{
            total: finalTotal,
            subtotal: subtotal || finalTotal,
            discount_amount: discountAmount || 0,
            surcharge_amount: surchargeAmount || 0,
            discount_source: discountSource || null,
            discount_reason: discountReason || null,
            payment_method: paymentMethod,
            user_id: owner_id,
            employee_id: user_id,
            created_at: action.timestamp // Mantener la hora original
          }])
          .select()
          .single();
          
        if (saleError) throw saleError;
        
        // 2. Items
        const saleItems = cart.map(item => ({
          sale_id: saleData.id,
          product_id: item.product.id,
          qty: item.qty,
          price: item.product.price,
          user_id: owner_id
        }));
        
        await supabase.from('sale_items').insert(saleItems);

        // 3. Restar stock y registrar movimientos
        for (const item of cart) {
          if (item.product.id.startsWith('custom-')) continue;
          const { data: prodData } = await supabase.from('products').select('stock').eq('id', item.product.id).single();
          if (prodData) {
            const stockActual = prodData.stock || 0;
            const newStock = stockActual - item.qty;
            if (newStock < 0) {
              console.warn(`[Sync] Stock insuficiente para "${item.product.name}". Stock actual: ${stockActual}, requerido: ${item.qty}. Se dejó en 0.`);
            }
            await supabase.from('products').update({ stock: Math.max(0, newStock) }).eq('id', item.product.id);
            await supabase.from('stock_movements').insert([{
              user_id: owner_id,
              product_id: item.product.id,
              tipo: 'salida',
              cantidad: item.qty,
              motivo: `Venta #${String(saleData.id).split('-')[0]} (Sync)`
            }]);
          }
        }
        
        // 4. Caja
        if (paymentMethod === PAYMENT_METHODS.EFECTIVO) {
          const newCash = cashAmount + finalTotal;
          await supabase.from('cash_movements').insert([{
            user_id: owner_id,
            employee_id: user_id,
            tipo: 'ingreso',
            monto: finalTotal,
            motivo: `Venta #${saleData.id.split('-')[0]} (Sync)`,
            saldo_anterior: cashAmount,
            saldo_nuevo: newCash
          }]);
        } else if (paymentMethod === PAYMENT_METHODS.FIADO && selectedClientId) {
          const { data: clientData } = await supabase.from('clients').select('deuda').eq('id', selectedClientId).single();
          if (clientData) {
            await supabase.from('clients').update({ deuda: Number(clientData.deuda || 0) + finalTotal }).eq('id', selectedClientId);
          }
        } else if (paymentMethod === PAYMENT_METHODS.TARJETA || paymentMethod === PAYMENT_METHODS.TRANSFERENCIA) {
          await supabase.from('bank_movements').insert([{
            user_id: owner_id,
            employee_id: user_id,
            tipo: 'ingreso',
            monto: finalTotal,
            metodo: paymentMethod,
            motivo: `Venta #${saleData.id.split('-')[0]} (Sync)`
          }]);
        }
      }
    } catch (err) {
      console.error('Error syncing action:', action, err);
      failed.push(action); // Si falla, lo guardamos para reintentar luego
    }
  }
  
  // Guardamos solo los que fallaron
  localStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
  window.dispatchEvent(new Event('offline-queue-updated'));
  
  return failed.length === 0; // True si se sincronizó todo sin errores
};

/**
 * Hook para escuchar cambios en la conectividad
 */
export const initOfflineSync = () => {
  window.addEventListener('online', () => {
    console.log('Conexión recuperada. Sincronizando cola offline...');
    syncOfflineQueue();
  });
};
