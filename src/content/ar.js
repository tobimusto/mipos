export const ar = {
  country: 'AR',
  locale: 'es-AR',
  currency: { symbol: '$', code: 'ARS', format: (n) => '$' + Math.round(n).toLocaleString('es-AR') },
  plans: {
    basico:  { monthly: 15000, yearlyPerMonth: 12000, oldMonthly: '$15.000/mes' },
    esencial: { monthly: 25000, yearlyPerMonth: 20000, oldMonthly: '$25.000/mes' },
    pro:      { monthly: 28500, yearlyPerMonth: 22800, oldMonthly: '$28.500/mes', vatNote: '· IVA incluido' }
  },
  demoProducts: [
    { id: 'coca', name: 'Coca Cola 2.25L', price: 1900, stock: '24 und.', color: 'oklch(0.50 0.14 220)' },
    { id: 'alfa', name: 'Alfajor Havanna', price: 1200, stock: '15 und.', color: '#F59E0B' },
    { id: 'agua', name: 'Agua 1.5L', price: 800, stock: '38 und.', color: 'oklch(0.55 0.10 200)' },
    { id: 'bull', name: 'Red Bull 250ml', price: 2800, stock: '8 und.', color: 'oklch(0.58 0.16 30)' }
  ],
  stats: {
    volumeAmount: '$2.022M',
    volumeDesc: 'ARS procesados'
  },
  compare: {
    ourPriceRange: '$12.000 / $25.000',
    competitorPrice: 'Más de $40.000'
  },
  footer: {
    tagline: 'Ventas, stock y fiados para kioscos, almacenes, indumentarias y autoservicios. Hecho en Argentina para el comercio de verdad.'
  },
  legalHref: '/terminos',
  whatsapp: '5491124017714',
  transfer: { alias: 'tobiasmustolemon', titular: 'Tobias Musto Cayetano', hasBankInfo: true },
  meta: {
    title: 'mipos — Ventas, stock y fiados para tu comercio',
    description: 'Punto de venta para kioscos, almacenes y comercios de Argentina. Controlá ventas, stock y fiados sin libreta ni Excel. Probá 7 días gratis.'
  }
};
