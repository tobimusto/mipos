export function makeCurrencyFormatter(locale, currencyCode) {
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const nfFull = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const nfCents = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return {
    format: (n) => `$${nf.format(Number(n) || 0)}`,
    formatFull: (n) => `$${nfFull.format(Number(n) || 0)} ${currencyCode}`,
    formatCents: (n) => `$${nfCents.format(Number(n) || 0)}`,
  };
}

export function makeDateFormatter(locale) {
  const dateF = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  const dateShortF = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' });
  const dateTimeF = new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' });
  const timeF = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  return {
    formatDate: (d) => dateF.format(d instanceof Date ? d : new Date(d)),
    formatDateShort: (d) => dateShortF.format(d instanceof Date ? d : new Date(d)),
    formatDateTime: (d) => dateTimeF.format(d instanceof Date ? d : new Date(d)),
    formatTime: (d) => timeF.format(d instanceof Date ? d : new Date(d)),
  };
}
