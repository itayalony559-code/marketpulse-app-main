// @ts-nocheck
/**
 * Real-time market data API module.
 *
 * Uses Finnhub's free-tier REST API to fetch live stock quotes and market news.
 * Falls back gracefully to the bundled static data when the API is unavailable
 * or no API key is configured.
 *
 * To enable live data, add VITE_FINNHUB_API_KEY to your .env file.
 * Get a free key at https://finnhub.io
 */

import { news as staticNews } from '@/data/news';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY ?? '';

/** Build a Finnhub-compatible symbol for international stocks. */
function toFinnhubSymbol(symbol) {
  if (symbol.endsWith('.L')) return symbol.slice(0, -2) + '.L';
  if (symbol.endsWith('.T')) return symbol.slice(0, -2) + '.T';
  if (symbol.endsWith('.HK')) return symbol.slice(0, -3) + '.HK';
  if (symbol.endsWith('.DE')) return symbol.slice(0, -3) + '.F';
  if (symbol.endsWith('.PA')) return symbol.slice(0, -3) + '.PA';
  if (symbol.endsWith('.SW')) return symbol.slice(0, -3) + '.SW';
  if (symbol.endsWith('.AX')) return symbol.slice(0, -3) + '.AX';
  if (symbol.endsWith('.TO')) return symbol.slice(0, -3) + '.TO';
  if (symbol.endsWith('.BSE')) return symbol.slice(0, -4) + '.BO';
  if (symbol.endsWith('.NS')) return symbol.slice(0, -3) + '.NS';
  if (symbol.endsWith('.KS')) return symbol.slice(0, -3) + '.KS';
  if (symbol.endsWith('.SS')) return symbol.slice(0, -3) + '.SS';
  if (symbol.endsWith('.SZ')) return symbol.slice(0, -3) + '.SZ';
  if (symbol.endsWith('.TW')) return symbol.slice(0, -3) + '.TW';
  if (symbol.endsWith('.ST')) return symbol.slice(0, -3) + '.ST';
  if (symbol.endsWith('.IS')) return symbol.slice(0, -3) + '.IS';
  if (symbol.endsWith('.JO')) return symbol.slice(0, -3) + '.JO';
  if (symbol.endsWith('.SI')) return symbol.slice(0, -3) + '.SI';
  if (symbol.endsWith('.MX')) return symbol.slice(0, -3) + '.MX';
  if (symbol.endsWith('.SA')) return symbol.slice(0, -3) + '.SA';
  if (symbol.endsWith('.MC')) return symbol.slice(0, -3) + '.MC';
  if (symbol.endsWith('.TA')) return symbol.slice(0, -3) + '.TA';
  return symbol;
}

/**
 * Fetch a live quote for a single stock symbol from Finnhub.
 * Returns null if the API is unavailable or the symbol is not found.
 */
export async function fetchQuote(symbol) {
  if (!FINNHUB_KEY) return null;
  try {
    const fhSymbol = toFinnhubSymbol(symbol);
    const url = `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(fhSymbol)}&token=${FINNHUB_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !Number.isFinite(Number(data.c)) || Number(data.c) <= 0) return null;
    const profile = await fetch(
      `${FINNHUB_BASE}/stock/profile2?symbol=${encodeURIComponent(fhSymbol)}&token=${FINNHUB_KEY}`,
    )
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
    return {
      symbol,
      price: data.c,
      change: data.d ?? 0,
      changePercent: data.dp ?? 0,
      previousClose: data.pc ?? 0,
      high: data.h ?? 0,
      low: data.l ?? 0,
      open: data.o ?? 0,
      preMarketPrice: data.preMarketPrice ?? data.preMarket ?? null,
      afterHoursPrice: data.afterHoursPrice ?? data.afterMarket ?? null,
      volume: data.v ?? 0,
      marketCap: profile?.marketCapitalization ? profile.marketCapitalization * 1000000 : 0,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch live quotes for multiple stock symbols in parallel.
 * Returns a map of symbol -> LiveQuote (only for symbols that succeeded).
 */
export async function fetchQuotes(symbols) {
  if (!FINNHUB_KEY || symbols.length === 0) return {};
  const results = await Promise.all(
    symbols.map(async (s) => {
      const q = await fetchQuote(s);
      return q ? [s, q] : null;
    }),
  );
  const map = {};
  for (const r of results) {
    if (r) map[r[0]] = r[1];
  }
  return map;
}

function toLiveNews(n) {
  return {
    id: n.id,
    headline: n.headline,
    summary: n.summary,
    body: n.body ?? [],
    source: n.source,
    url: '',
    publishedAt: n.publishedAt ?? '',
    minutesAgo: n.publishedAt
      ? Math.max(0, Math.floor((Date.now() - new Date(n.publishedAt).getTime()) / 60000))
      : 0,
    tickers: n.tickers ?? [],
    premium: false,
    category: n.category ?? 'Markets',
    sentiment: n.sentiment ?? 'neutral',
  };
}

/**
 * Fetch general market news from Finnhub.
 * Falls back to static news when the API is unavailable.
 */
export async function fetchMarketNews(limit = 20) {
  if (!FINNHUB_KEY) return staticNews.slice(0, limit).map(toLiveNews);
  try {
    const url = `${FINNHUB_BASE}/news?category=general&token=${FINNHUB_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return staticNews.slice(0, limit).map(toLiveNews);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return staticNews.slice(0, limit).map(toLiveNews);
    return data.slice(0, limit).map((item) => ({
      id: String(item.id ?? Math.random()),
      headline: item.headline ?? '',
      summary: item.summary ?? '',
      source: item.source ?? 'Unknown',
      url: item.url ?? '',
      publishedAt: new Date((item.datetime ?? 0) * 1000).toISOString(),
      tickers: Array.isArray(item.related) ? item.related.slice(0, 5) : [],
      category: 'Markets',
    }));
  } catch {
    return staticNews.slice(0, limit).map(toLiveNews);
  }
}

export async function getCompanyNews(symbol, limit = 20) {
  const fallback = () => staticNews.filter((article) => article.tickers.includes(symbol)).slice(0, limit);
  if (!FINNHUB_KEY) return fallback();

  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 7);
  const formatDate = (date) => date.toISOString().slice(0, 10);

  try {
    const fhSymbol = toFinnhubSymbol(symbol);
    const url = `${FINNHUB_BASE}/company-news?symbol=${encodeURIComponent(fhSymbol)}&from=${formatDate(start)}&to=${formatDate(end)}&token=${FINNHUB_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return fallback();
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.slice(0, limit).map((item) => toLiveNews({
      id: String(item.id ?? item.url ?? Math.random()),
      headline: item.headline ?? '',
      summary: item.summary ?? '',
      source: item.source ?? 'Unknown',
      publishedAt: item.datetime ? new Date(item.datetime * 1000).toISOString() : '',
      tickers: [symbol],
      category: 'Markets',
    }));
  } catch {
    return fallback();
  }
}

export function hasApiKey() {
  return Boolean(FINNHUB_KEY);
}
export async function searchStocks(query: string) {
  if (!query || query.trim() === '') return [];
  const normalizedQuery = query.trim().toUpperCase();
  if (!FINNHUB_KEY) {
    return [{ symbol: normalizedQuery, displaySymbol: normalizedQuery, description: normalizedQuery }];
  }
  try {
    const res = await fetch(`${FINNHUB_BASE}/search?q=${encodeURIComponent(query)}&token=${FINNHUB_KEY}`);
    const data = await res.json();
    return data.result || [];
  } catch (error) {
    console.error('Error searching stocks:', error);
    return [];
  }
}

export async function getStockQuote(symbol: string) {
  return fetchQuote(symbol);
}

export async function getHistoricalPrices(symbol: string, range: string) {
  if (!FINNHUB_KEY) return [];

  const now = Math.floor(Date.now() / 1000);
  const rangeConfig = {
    '1D': { resolution: '5', seconds: 24 * 60 * 60 },
    '1W': { resolution: '30', seconds: 7 * 24 * 60 * 60 },
    '1M': { resolution: '60', seconds: 30 * 24 * 60 * 60 },
    '3M': { resolution: 'D', seconds: 90 * 24 * 60 * 60 },
    '1Y': { resolution: 'D', seconds: 365 * 24 * 60 * 60 },
    '5Y': { resolution: 'W', seconds: 5 * 365 * 24 * 60 * 60 },
  }[range] ?? { resolution: 'D', seconds: 24 * 60 * 60 };

  try {
    const fhSymbol = toFinnhubSymbol(symbol);
    const url = `${FINNHUB_BASE}/stock/candle?symbol=${encodeURIComponent(fhSymbol)}&resolution=${rangeConfig.resolution}&from=${now - rangeConfig.seconds}&to=${now}&token=${FINNHUB_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (data?.s !== 'ok' || !Array.isArray(data.c) || !Array.isArray(data.t)) return [];

    return data.c
      .map((price, index) => ({
        time: new Date(data.t[index] * 1000).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        price: Number(price),
      }))
      .filter((point) => Number.isFinite(point.price));
  } catch {
    return [];
  }
}