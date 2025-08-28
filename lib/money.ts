// lib/money.ts
const localeMap: Record<string, string> = {
  USD: 'en-US',
  INR: 'en-IN',
  EUR: 'de-DE',
  GBP: 'en-GB',
  AUD: 'en-AU',
  CAD: 'en-CA',
  SGD: 'en-SG',
  AED: 'en-AE', // or 'ar-AE' if you prefer Arabic script
};

const symbolFallback: Record<string, string> = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
  AED: 'د.إ',
};

export function formatMoney(amount: number, currencyCode: string = 'USD', locale?: string) {
  const cur = (currencyCode || 'USD').toUpperCase();
  const loc = locale || localeMap[cur];
  try {
    return new Intl.NumberFormat(loc, {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    const sym = symbolFallback[cur] || '$';
    return `${sym}${Math.round(amount).toLocaleString(loc || undefined)}`;
  }
}
