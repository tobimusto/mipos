import { useState } from 'react';

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  color: string;
};

const PRODUCTS: Product[] = [
  { id: 'coca', name: 'Coca Cola 2.25L', price: 1900, stock: 24, color: 'oklch(0.50 0.14 220)' },
  { id: 'alfa', name: 'Alfajor Havanna', price: 1200, stock: 15, color: '#F59E0B' },
  { id: 'agua', name: 'Agua 1.5L', price: 800, stock: 38, color: 'oklch(0.55 0.10 200)' },
  { id: 'bull', name: 'Red Bull 250ml', price: 2800, stock: 8, color: 'oklch(0.58 0.16 30)' },
];

export default function DemoPos({ currencySymbol = '$' }: { currencySymbol?: string }) {
  const [cart, setCart] = useState<{product: Product, qty: number}[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [pop, setPop] = useState(false);

  const total = cart.reduce((acc, item) => acc + (item.product.price * item.qty), 0);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product, qty: 1 }];
    });
    setPop(true);
    setTimeout(() => setPop(false), 300);
  };

  const removeOne = (id: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === id);
      if (existing && existing.qty > 1) {
        return prev.map(i => i.product.id === id ? { ...i, qty: i.qty - 1 } : i);
      }
      return prev.filter(i => i.product.id !== id);
    });
  };

  const handlePay = () => {
    if (cart.length === 0) return;
    setIsSuccess(true);
  };

  const reset = () => {
    setCart([]);
    setIsSuccess(false);
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(val).replace('ARS', currencySymbol).trim();
  };

  return (
    <section className="demo" id="demo">
      <div className="wrap demo-grid">
        <div className="demo-intro" data-reveal="true">
          <p className="sec-sub">El mismo sistema que usás en el mostrador. Tocá un producto y mirá cómo el stock se descuenta, la caja se actualiza y el ticket queda registrado.</p>
          <div className="demo-outcomes">
            <span className="demo-outcome">Stock descontado</span>
            <span className="demo-outcome">Caja actualizada</span>
            <span className="demo-outcome">Ticket generado</span>
          </div>
        </div>

        <div className="terminal" data-reveal="true">
          <div className="terminal-bar">
            <span className="td"></span><span className="td"></span><span className="td"></span>
            <div className="terminal-head-center">
              <div style={{width: 16, height: 16, borderRadius: 4, overflow: 'hidden', flexShrink: 0}}>
                <svg width="16" height="16" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="17" fill="#2563EB"/><polyline points="17,32 27,43 47,22" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <span className="terminal-title">mipos · Caja</span>
            </div>
            <span className="demo-indicator" id="demoIndicator">En vivo</span>
          </div>
          
          {!isSuccess ? (
            <div className="terminal-screen" id="demoScreen">
              <div className="demo-search">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                <input type="text" placeholder="Buscar producto o escanear código…" readOnly aria-label="Buscar producto"/>
              </div>
              <div className="demo-prods">
                {PRODUCTS.map(p => {
                  const inCart = cart.find(i => i.product.id === p.id)?.qty || 0;
                  return (
                    <button key={p.id} className="dprod" type="button" onClick={() => addToCart(p)}>
                      <div className="dp-top">
                        <span className="dp-cat" style={{'--cat': p.color} as React.CSSProperties}></span>
                        <span className="dp-stock">{p.stock - inCart} und.</span>
                      </div>
                      <span className="dp-name">{p.name}</span>
                      <span className="dp-price">{formatPrice(p.price)}</span>
                    </button>
                  );
                })}
              </div>
              <div className="demo-cart">
                <div className="demo-cart-head">Carrito</div>
                <div className="demo-cart-items">
                  {cart.length === 0 ? (
                    <span className="cart-empty">Tocá un producto para empezar…</span>
                  ) : (
                    cart.map(i => (
                      <div className="ci" key={i.product.id} onClick={() => removeOne(i.product.id)}>
                        <div className="ci-info">
                          <span className="ci-name">{i.product.name}</span>
                          <span className="ci-qty">×{i.qty}</span>
                        </div>
                        <span className="ci-price">{formatPrice(i.product.price * i.qty)}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className={`demo-total ${pop ? 'pop' : ''}`}>
                  <span>Total</span>
                  <span className="demo-total-val">{formatPrice(total)}</span>
                </div>
                <button 
                  className="btn btn-orange demo-mipos" 
                  type="button" 
                  onClick={handlePay}
                  disabled={cart.length === 0}
                  style={{ opacity: cart.length === 0 ? 0.5 : 1, cursor: cart.length === 0 ? 'not-allowed' : 'pointer' }}
                >
                  Cobrar venta
                </button>
              </div>
            </div>
          ) : (
            <div className="terminal-screen success">
              <div className="success-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
              </div>
              <p className="success-txt">¡Venta registrada!</p>
              <p className="success-amount">{formatPrice(total)}</p>
              <div className="success-chips">
                <span className="success-chip">Stock actualizado</span>
                <span className="success-chip">Ingreso anotado</span>
                <span className="success-chip">Ticket generado</span>
              </div>
              <button className="btn btn-ghost success-reset" type="button" onClick={reset}>Hacer otra venta</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
