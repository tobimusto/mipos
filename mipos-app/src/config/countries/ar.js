export default {
  code: 'AR',
  label: 'Argentina',
  locale: 'es-AR',
  currency: { code: 'ARS', symbol: '$' },
  tax: {
    name: 'IVA',
    defaultRate: 21,
    conditions: ['Consumidor Final', 'Responsable Inscripto', 'Monotributo', 'Exento'],
  },
  taxId: { label: 'CUIT' },
  personId: { label: 'DNI' },
  region: { label: 'Provincia', placeholder: 'Ej: Buenos Aires' },
  off: { domain: 'ar.openfoodfacts.org' },
  businessTypes: ['Kiosco', 'Almacén', 'Farmacia', 'Ferretería', 'Indumentaria', 'Otro'],
};
