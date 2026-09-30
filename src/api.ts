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
import type {
  HistoricalPrice,
  LiveNewsItem,
  LiveQuote,
  NewsArticle,
  StockSearchResult,
} from '@/types';
export type { LiveNewsItem, LiveQuote } from '@/types';

type CacheEntry<T> = { value: T; expiresAt: number };
type FinnhubNews = {
  id?: number;
  headline?: string;
  summary?: string;
  source?: string;
  url?: string;
  datetime?: number;
  related?: string;
};
type FinnhubSearchResult = { symbol: string; displaySymbol: string; description: string };

const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY ?? '';
const QUOTE_CACHE_TTL_MS = 60_000;
const NEWS_CACHE_TTL_MS = 180_000;
const COMPANY_NEWS_CACHE_TTL_MS = 180_000;
const HISTORICAL_CACHE_TTL_MS = 300_000;
const quoteCache = new Map<string, CacheEntry<LiveQuote | null>>();
const quoteRequests = new Map<string, Promise<LiveQuote | null>>();
const newsCache = new Map<number, CacheEntry<LiveNewsItem[]>>();
const newsRequests = new Map<number, Promise<LiveNewsItem[]>>();
const companyNewsCache = new Map<string, CacheEntry<LiveNewsItem[]>>();
const companyNewsRequests = new Map<string, Promise<LiveNewsItem[]>>();
const historicalCache = new Map<string, CacheEntry<HistoricalPrice[]>>();
const historicalRequests = new Map<string, Promise<HistoricalPrice[]>>();

/** Build a Finnhub-compatible symbol for international stocks. */
function toFinnhubSymbol(symbol: string): string {
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
export async function fetchQuote(symbol: string): Promise<LiveQuote | null> {
  if (!FINNHUB_KEY) return null;
  try {
    const fhSymbol = toFinnhubSymbol(symbol);
    const url = `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(fhSymbol)}&token=${FINNHUB_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as Record<string, number | null | undefined>;
    if (!data || !Number.isFinite(Number(data.c)) || Number(data.c) <= 0) return null;
    const profile = await fetch(
      `${FINNHUB_BASE}/stock/profile2?symbol=${encodeURIComponent(fhSymbol)}&token=${FINNHUB_KEY}`,
    )
      .then((response) => response.ok
        ? response.json() as Promise<{ marketCapitalization?: number }>
        : null)
      .catch(() => null);
    return {
      symbol,
      price: Number(data.c),
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
export async function fetchQuotes(symbols: string[]): Promise<Record<string, LiveQuote>> {
  if (!FINNHUB_KEY || symbols.length === 0) return {};
  const now = Date.now();
  const results = await Promise.all(symbols.map(async (symbol) => {
    const cached = quoteCache.get(symbol);
    if (cached && cached.expiresAt > now) return cached.value ? [symbol, cached.value] as const : null;

    let request = quoteRequests.get(symbol);
    if (!request) {
      request = fetchQuote(symbol).then((quote) => {
        quoteCache.set(symbol, { value: quote, expiresAt: Date.now() + QUOTE_CACHE_TTL_MS });
        return quote;
      }).finally(() => quoteRequests.delete(symbol));
      quoteRequests.set(symbol, request);
    }
    const quote = await request;
    return quote ? [symbol, quote] as const : null;
  }));
  const map: Record<string, LiveQuote> = {};
  for (const r of results) {
    if (r) map[r[0]] = r[1];
  }
  return map;
}

function toLiveNews(article: NewsArticle): LiveNewsItem {
  return {
    id: article.id,
    headline: article.headline,
    summary: article.summary,
    body: article.body,
    source: article.source,
    url: '',
    publishedAt: article.publishedAt,
    minutesAgo: article.publishedAt
      ? Math.max(0, Math.floor((Date.now() - new Date(article.publishedAt).getTime()) / 60000))
      : 0,
    tickers: article.tickers,
    premium: false,
    category: article.category,
    sentiment: article.sentiment,
  };
}

function fallbackNews(limit: number): LiveNewsItem[] {
  const articles = staticNews.slice(0, limit).map(toLiveNews);
  newsCache.set(limit, { value: articles, expiresAt: Date.now() + NEWS_CACHE_TTL_MS });
  return articles;
}

/**
 * Fetch general market news from Finnhub.
 * Falls back to static news when the API is unavailable.
 */
export async function fetchMarketNews(limit = 20): Promise<LiveNewsItem[]> {
  if (!FINNHUB_KEY) return staticNews.slice(0, limit).map(toLiveNews);
  const cached = newsCache.get(limit);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const pending = newsRequests.get(limit);
  if (pending) return pending;

  const request = loadMarketNews(limit);
  newsRequests.set(limit, request);
  try {
    return await request;
  } finally {
    newsRequests.delete(limit);
  }
}

async function loadMarketNews(limit: number): Promise<LiveNewsItem[]> {
  try {
    const url = `${FINNHUB_BASE}/news?category=general&token=${FINNHUB_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return fallbackNews(limit);
    const data = await res.json() as FinnhubNews[];
    if (!Array.isArray(data) || data.length === 0) return fallbackNews(limit);
    const articles: LiveNewsItem[] = data.slice(0, limit).map((item) => ({
      id: String(item.id ?? item.url ?? `${item.datetime ?? 0}-${item.headline ?? ''}`),
      headline: item.headline ?? '',
      summary: item.summary ?? '',
      body: [],
      source: item.source ?? 'Unknown',
      url: item.url ?? '',
      publishedAt: new Date((item.datetime ?? 0) * 1000).toISOString(),
      minutesAgo: item.datetime ? Math.max(0, Math.floor((Date.now() - item.datetime * 1000) / 60000)) : 0,
      tickers: typeof item.related === 'string' ? item.related.split(',').filter(Boolean).slice(0, 5) : [],
      premium: false,
      category: 'Markets',
      sentiment: 'neutral',
    }));
    newsCache.set(limit, { value: articles, expiresAt: Date.now() + NEWS_CACHE_TTL_MS });
    return articles;
  } catch {
    return fallbackNews(limit);
  }
}

export async function getCompanyNews(symbol: string, limit = 20): Promise<LiveNewsItem[]> {
  const key = `${symbol.toUpperCase()}:${limit}`;
  const fallback = () => staticNews
    .filter((article) => article.tickers.includes(symbol))
    .slice(0, limit)
    .map(toLiveNews);
  if (!FINNHUB_KEY) return fallback();

  const cached = companyNewsCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const pending = companyNewsRequests.get(key);
  if (pending) return pending;

  const request = loadCompanyNews(symbol, limit, fallback);
  companyNewsRequests.set(key, request);
  try {
    const articles = await request;
    companyNewsCache.set(key, { value: articles, expiresAt: Date.now() + COMPANY_NEWS_CACHE_TTL_MS });
    return articles;
  } finally {
    companyNewsRequests.delete(key);
  }
}

async function loadCompanyNews(
  symbol: string,
  limit: number,
  fallback: () => LiveNewsItem[],
): Promise<LiveNewsItem[]> {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 7);
  const formatDate = (date: Date) => date.toISOString().slice(0, 10);

  try {
    const fhSymbol = toFinnhubSymbol(symbol);
    const url = `${FINNHUB_BASE}/company-news?symbol=${encodeURIComponent(fhSymbol)}&from=${formatDate(start)}&to=${formatDate(end)}&token=${FINNHUB_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return fallback();
    const data = await res.json() as FinnhubNews[];
    if (!Array.isArray(data)) return [];

    return data.slice(0, limit).map((item): LiveNewsItem => {
      const publishedAt = item.datetime ? new Date(item.datetime * 1000).toISOString() : '';
      return {
        id: String(item.id ?? item.url ?? `${item.datetime ?? 0}-${item.headline ?? ''}`),
        headline: item.headline ?? '',
        summary: item.summary ?? '',
        body: [],
        source: item.source ?? 'Unknown',
        url: item.url ?? '',
        publishedAt,
        minutesAgo: publishedAt ? Math.max(0, Math.floor((Date.now() - Date.parse(publishedAt)) / 60_000)) : 0,
        tickers: [symbol],
        premium: false,
        category: 'Markets',
        sentiment: 'neutral',
      };
    });
  } catch {
    return fallback();
  }
}

export function hasApiKey() {
  return Boolean(FINNHUB_KEY);
}
export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  if (!query || query.trim() === '') return [];
  const normalizedQuery = query.trim().toUpperCase();
  if (!FINNHUB_KEY) {
    return [{ symbol: normalizedQuery, displaySymbol: normalizedQuery, description: normalizedQuery }];
  }
  try {
    const res = await fetch(`${FINNHUB_BASE}/search?q=${encodeURIComponent(query)}&token=${FINNHUB_KEY}`);
    const data = await res.json() as { result?: FinnhubSearchResult[] };
    return data.result || [];
  } catch (error) {
    console.error('Error searching stocks:', error);
    return [];
  }
}

export async function getStockQuote(symbol: string): Promise<LiveQuote | null> {
  return fetchQuote(symbol);
}

export async function getHistoricalPrices(symbol: string, range: string): Promise<HistoricalPrice[]> {
  if (!FINNHUB_KEY) return [];
  const cacheKey = `${symbol}:${range}`;
  const cached = historicalCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const pending = historicalRequests.get(cacheKey);
  if (pending) return pending;

  const request = loadHistoricalPrices(symbol, range);
  historicalRequests.set(cacheKey, request);
  try {
    const points = await request;
    if (points.length > 0) {
      historicalCache.set(cacheKey, { value: points, expiresAt: Date.now() + HISTORICAL_CACHE_TTL_MS });
    }
    return points;
  } finally {
    historicalRequests.delete(cacheKey);
  }
}

async function loadHistoricalPrices(symbol: string, range: string): Promise<HistoricalPrice[]> {
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
    const data = await res.json() as { s?: string; c?: number[]; t?: number[] };
    const prices = data.c;
    const timestamps = data.t;
    if (data.s !== 'ok' || !Array.isArray(prices) || !Array.isArray(timestamps)) return [];

    return prices
      .map((price, index) => ({
        time: new Date(timestamps[index] * 1000).toLocaleDateString('en-US', {
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