export const uy = {
  country: 'UY',
  locale: 'es-UY',
  currency: { symbol: '$U', code: 'UYU', format: (n) => '$U ' + Math.round(n).toLocaleString('es-UY') },
  plans: {
    basico:  { monthly: 1050, yearlyPerMonth: 999,  oldMonthly: '$U 1.050/mes' },
    esencial: { monthly: 2500, yearlyPerMonth: 2099, oldMonthly: '$U 2.500/mes' },
    pro:      { monthly: 3500, yearlyPerMonth: 2399, oldMonthly: '$U 3.500/mes', vatNote: '' }
  },
  demoProducts: [
    { id: 'coca', name: 'Coca Cola 2.25L', price: 55, stock: '24 und.', color: 'oklch(0.50 0.14 220)' },
    { id: 'alfa', name: 'Alfajor Portezuelo', price: 35, stock: '15 und.', color: '#F59E0B' },
    { id: 'agua', name: 'Agua 1.5L', price: 23, stock: '38 und.', color: 'oklch(0.55 0.10 200)' },
    { id: 'bull', name: 'Red Bull 250ml', price: 80, stock: '8 und.', color: 'oklch(0.58 0.16 30)' }
  ],
  stats: {
    volumeAmount: '$U 520K',
    volumeDesc: 'UYU procesados'
  },
  compare: {
    ourPriceRange: '$U 999 / $U 2.099',
    competitorPrice: 'Más de $U 3.500'
  },
  footer: {
    tagline: 'Ventas, stock y fiados para kioscos, almacenes, indumentarias y autoservicios. Hecho en Uruguay para el comercio de verdad.'
  },
  legalHref: '/terminos-uy',
  whatsapp: '59892220820',
  transfer: { hasBankInfo: false },
  meta: {
    title: 'mipos — Ventas, stock y fiados para tu comercio',
    description: 'Punto de venta uruguayo para kioscos, almacenes y comercios. Vendé, controlá el stock y llevá fiados sin papeles. Probá 7 días gratis.'
  }
};
