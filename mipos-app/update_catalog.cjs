const fs = require('fs');
const path = require('path');

const file = 'E:/ANTIGRAVITY/COBRAR-APP-FINAL/mipos-app/src/pages/Catalog.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update WaPreview
content = content.replace(
  /cart\.forEach\(i => { msg \+= `• \$\{i\.name\} x\$\{i\.qty\} · \$\{formatCurrency\(i\.price \* i\.qty\)\}\\n`; }\);/,
  `cart.forEach(i => {
    msg += \`• \${i.name} x\${i.qty} · \${formatCurrency((i.price + (i.addonTotal || 0)) * i.qty)}\\n\`;
    if (i.selectedAddons && i.selectedAddons.length > 0) {
      msg += \`  ↳ \${i.selectedAddons.map(a => '+' + a.name).join(', ')}\\n\`;
    }
  });`
);
content = content.replace(
  /const total = cart\.reduce\(\(s,i\) => s \+ i\.price \* i\.qty, 0\);/,
  `const total = cart.reduce((s,i) => s + (i.price + (i.addonTotal || 0)) * i.qty, 0);`
);

// 2. Update sendToWhatsApp
content = content.replace(
  /cart\.forEach\(i => { msg \+= `• \$\{i\.name\} \*x\$\{i\.qty\}\* · \$\{formatCurrency\(i\.price\*i\.qty\)\}\\n`; }\);/,
  `cart.forEach(i => {
      msg += \`• \${i.name} *x\${i.qty}* · \${formatCurrency((i.price + (i.addonTotal || 0)) * i.qty)}\\n\`;
      if (i.selectedAddons && i.selectedAddons.length > 0) {
        msg += \`  ↳ \${i.selectedAddons.map(a => '+' + a.name).join(', ')}\\n\`;
      }
    });`
);

// 3. Update addToCart & removeFromCart
content = content.replace(
  /const addToCart = \(product\) => setCart\(prev => {[\s\S]*?}\);/,
  `const addToCart = (product, selectedAddonIds = []) => setCart(prev => {
    const activeAddons = (product.addons || []).filter(a => selectedAddonIds.includes(a.id));
    const addonTotal = activeAddons.reduce((s, a) => s + Number(a.price), 0);
    const addonsKey = selectedAddonIds.sort().join(',');
    const cartItemId = \`\${product.id}-\${addonsKey}\`;
    const ex = prev.find(i => i.cartItemId === cartItemId);
    if (ex) { if (ex.qty >= product.stock) return prev; return prev.map(i => i.cartItemId === cartItemId ? {...i, qty: i.qty+1} : i); }
    return [...prev, { ...product, cartItemId, selectedAddons: activeAddons, addonTotal, qty: 1 }];
  });`
);

content = content.replace(
  /const removeFromCart = \(id\) => setCart\(prev => {[\s\S]*?}\);/,
  `const removeFromCart = (cartItemId) => setCart(prev => {
    const ex = prev.find(i => i.cartItemId === cartItemId || i.id === cartItemId); // fallback for grid buttons
    if (ex && ex.qty > 1) return prev.map(i => i.cartItemId === ex.cartItemId ? {...i, qty: i.qty-1} : i);
    return prev.filter(i => i.cartItemId !== ex?.cartItemId);
  });`
);

// 4. Update cart total calculation in Catalog
content = content.replace(
  /const cartTotal = cart\.reduce\(\(s,i\) => s \+ i\.price \* i\.qty, 0\);/,
  `const cartTotal = cart.reduce((s,i) => s + (i.price + (i.addonTotal || 0)) * i.qty, 0);`
);

// 5. Update Grid and Row interactions (we want to use onProductClick(p) for Add button if there are addons)
content = content.replace(
  /onClick=\{e => { e\.stopPropagation\(\); onAdd\(p\); }\}/g,
  `onClick={e => { e.stopPropagation(); if (p.addons?.length > 0) { onProductClick(p); } else { onAdd(p); } }}`
);
content = content.replace(
  /onClick=\{e => { e\.stopPropagation\(\); addToCart\(p\); }\}/g,
  `onClick={e => { e.stopPropagation(); if (p.addons?.length > 0) { setSelectedProduct(p); } else { addToCart(p); } }}`
);

// 6. Update Drawer Cart Display
content = content.replace(
  /<span className="cat-drawer-item-unit">\{formatCurrency\(item\.price\)\} c\/u<\/span>/g,
  `{item.selectedAddons?.length > 0 && (
                      <span className="cat-drawer-item-addons block text-xs text-muted leading-tight mt-0.5">
                        {item.selectedAddons.map(a => '+' + a.name).join(', ')}
                      </span>
                    )}
                    <span className="cat-drawer-item-unit">{formatCurrency(item.price + (item.addonTotal || 0))} c/u</span>`
);
content = content.replace(
  /<span className="cat-drawer-item-price">\{formatCurrency\(item\.price \* item\.qty\)\}<\/span>/g,
  `<span className="cat-drawer-item-price">{formatCurrency((item.price + (item.addonTotal || 0)) * item.qty)}</span>`
);

// Also need to fix the plus/minus buttons in the cart drawer to use cartItemId
content = content.replace(
  /onClick=\{\(\) => removeFromCart\(item\.id\)\} className="cat-qty-btn"/g,
  `onClick={() => removeFromCart(item.cartItemId)} className="cat-qty-btn"`
);
content = content.replace(
  /onClick=\{\(\) => addToCart\(item\)\} className="cat-qty-btn"/g,
  `onClick={() => addToCart(item, item.selectedAddons?.map(a => a.id) || [])} className="cat-qty-btn"`
);


// 7. Add Addon State to Catalog
content = content.replace(
  /const \[selectedProduct, setSelectedProduct\] = useState\(null\);/,
  `const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);`
);

// Reset addons when selected product changes (we can hack this in by modifying the setter, or just handle it)
// We will just replace setSelectedProduct with a wrapper function inside Catalog
content = content.replace(
  /const \[selectedProduct, setSelectedProduct\] = useState\(null\);/,
  `const [selectedProduct, _setSelectedProduct] = useState(null);
  const setSelectedProduct = (p) => { _setSelectedProduct(p); setSelectedAddons([]); };`
);

// 8. Product Modal UI Additions
const modalBodyReplacement = `
              <div className="cat-modal-hdr">
                <h2 className="cat-modal-name">{selectedProduct.name}</h2>
                <span className="cat-modal-price">{formatCurrency(selectedProduct.price + (selectedAddons.reduce((s, id) => s + Number(selectedProduct.addons?.find(a => a.id === id)?.price || 0), 0)))}</span>
              </div>
              <p className="cat-modal-desc">{selectedProduct.description || 'Sin descripción detallada.'}</p>
              
              {selectedProduct.addons && selectedProduct.addons.length > 0 && (
                <div className="cat-modal-addons mt-4 border-t border-border pt-4">
                  <h3 className="text-[15px] font-bold text-text mb-3">Opcionales</h3>
                  <div className="space-y-2">
                    {selectedProduct.addons.map(addon => (
                      <label key={addon.id} className="flex items-center justify-between p-3 border border-border rounded-xl cursor-pointer hover:bg-surface-2 transition-colors">
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded-md border-border text-brand focus:ring-brand accent-brand"
                            checked={selectedAddons.includes(addon.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedAddons([...selectedAddons, addon.id]);
                              else setSelectedAddons(selectedAddons.filter(id => id !== addon.id));
                            }}
                          />
                          <span className="text-text font-medium">{addon.name}</span>
                        </div>
                        {Number(addon.price) > 0 && <span className="text-muted text-sm">+{formatCurrency(addon.price)}</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button className="cat-modal-add-btn mt-6" onClick={() => { addToCart(selectedProduct, selectedAddons); setSelectedProduct(null); }}>
                <Plus size={18}/> Agregar al carrito
              </button>

              {selectedProduct.recommended && selectedProduct.recommended.length > 0 && (
                <div className="cat-modal-recommended mt-6 border-t border-border pt-6">
                  <h3 className="text-[15px] font-bold text-text mb-3">Te puede interesar...</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedProduct.recommended.map(recId => {
                      const recProd = products.find(p => p.id === recId);
                      if (!recProd) return null;
                      return (
                        <div key={recId} className="border border-border rounded-xl p-2 flex items-center gap-2 cursor-pointer hover:bg-surface-2 transition-colors" onClick={() => setSelectedProduct(recProd)}>
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-surface-2 flex items-center justify-center">
                            {(recProd.icon?.startsWith('http') || recProd.icon?.startsWith('products/')) ? (
                              <img src={recProd.icon?.startsWith('http') ? recProd.icon : \`https://images.openfoodfacts.org/images/\${recProd.icon}\`} alt={recProd.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                            ) : ( <span className="text-xl">{recProd.icon || '📦'}</span> )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-text truncate">{recProd.name}</p>
                            <p className="text-xs text-muted">{formatCurrency(recProd.price)}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
`;

content = content.replace(
  /<div className="cat-modal-hdr">[\s\S]*?<\/button>/,
  modalBodyReplacement
);

// 9. Update the grid/row display qty calculations to sum by product.id instead of just taking the first matching cart item.
// CategoryRow already does: `const inCart = cart.find(c => c.id === p.id);`
// Let's replace `const inCart = cart.find(c => c.id === p.id);` with `const inCartCount = cart.filter(c => c.id === p.id).reduce((s,c)=>s+c.qty, 0); const inCart = inCartCount > 0 ? {qty: inCartCount} : null;`
content = content.replace(
  /const inCart = cart\.find\(c => c\.id === p\.id\);/g,
  `const inCartCount = cart.filter(c => c.id === p.id).reduce((s,c)=>s+c.qty, 0);
            const inCart = inCartCount > 0 ? {qty: inCartCount} : null;`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Catalog.jsx updated successfully.');
