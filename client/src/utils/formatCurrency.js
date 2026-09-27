export const formatCurrency = (amount, currency = 'INR') => {
  if (amount === undefined || amount === null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatPaise = (paise, currency = 'INR') =>
  formatCurrency(paise / 100, currency);
