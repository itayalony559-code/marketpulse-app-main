/// <reference types="vite/client" />

declare module '@/api' {
  export type LiveQuote = {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    previousClose: number;
    high: number;
    low: number;
    open: number;
    preMarketPrice?: number | null;
    afterHoursPrice?: number | null;
    volume?: number;
    marketCap?: number;
  };

  export type LiveNewsItem = {
    id: string;
    headline: string;
    summary: string;
    source: string;
    url: string;
    publishedAt: string;
    tickers: string[];
    category: string;
  };

  export function fetchQuote(symbol: string): Promise<LiveQuote | null>;
  export function getStockQuote(symbol: string): Promise<LiveQuote | null>;
  export function getHistoricalPrices(symbol: string, range: string): Promise<{ time: string; price: number }[]>;
  export function fetchQuotes(symbols: string[]): Promise<Record<string, LiveQuote>>;
  export function fetchMarketNews(limit?: number): Promise<LiveNewsItem[]>;
  export function hasApiKey(): boolean;
}
