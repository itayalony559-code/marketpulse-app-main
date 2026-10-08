import type { Currency } from '@/types';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  HKD: 'HK$',
  INR: '₹',
  KRW: '₩',
  CHF: 'CHF ',
  AUD: 'A$',
  CAD: 'C$',
  CNY: '¥',
  BRL: 'R$',
  MXN: 'MX$',
  ZAR: 'R ',
  SGD: 'S$',
  TWD: 'NT$',
  SEK: 'kr ',
  TRY: '₺',
  ILS: '₪',
};

export function currencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOLS[currency] ?? '$';
}

export function formatPrice(n: number, currency: Currency = 'USD'): string {
  const decimals = currency === 'JPY' || currency === 'KRW' ? 0 : 2;
  return `${currencySymbol(currency)}${n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatPriceRaw(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatChange(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPercent(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

export function formatVolume(n: number): string {
  if (n > 0 && n < 1_000) return `${n.toFixed(2)}M`;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return String(n);
}

export function formatMarketCap(n: number, currency: Currency = 'USD'): string {
  const sym = currencySymbol(currency);
  if (n >= 1_000_000_000_000) return `${sym}${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000) return `${sym}${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(2)}M`;
  return `${sym}${n}`;
}

export function formatRevenue(n: number, currency: Currency = 'USD'): string {
  const sym = currencySymbol(currency);
  if (n >= 1_000_000_000_000) return `${sym}${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000) return `${sym}${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(2)}M`;
  return `${sym}${n.toLocaleString('en-US')}`;
}

export function changeColor(n: number): string {
  return n > 0 ? 'text-bull' : n < 0 ? 'text-bear' : 'text-slate-400';
}

export function changeBg(n: number): string {
  return n > 0 ? 'bg-bull/10 text-bull' : n < 0 ? 'bg-bear/10 text-bear' : 'bg-ink-700 text-slate-400';
}
