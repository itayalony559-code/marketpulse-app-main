import { useEffect, useState } from 'react';
import { fetchQuotes, type LiveQuote } from '@/api';
import type { Asset } from '@/types';
import { assets as staticAssets } from '@/data/assets';

/**
 * Merges a static asset with a live quote, returning an updated copy.
 */
function mergeWithQuote(asset: Asset, quote: LiveQuote | undefined): Asset {
  if (!quote) return asset;
  return {
    ...asset,
    price: quote.price || asset.price,
    change: quote.change || asset.change,
    changePercent: quote.changePercent || asset.changePercent,
    previousClose: quote.previousClose || asset.previousClose,
  };
}

function fallbackAsset(symbol: string): Asset {
  const seed = [...symbol].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const price = 15 + (seed % 180);
  const changePercent = ((seed % 500) - 250) / 100;
  const previousClose = price / (1 + changePercent / 100);
  const volume = 1_000_000 + (seed % 90) * 100_000;

  return {
    symbol,
    name: symbol,
    sector: 'Technology',
    exchange: 'NASDAQ',
    currency: 'USD',
    price,
    change: price - previousClose,
    changePercent,
    previousClose,
    preMarketPrice: price * 0.997,
    preMarketChangePercent: -0.3,
    afterHoursPrice: price * 1.003,
    afterHoursChangePercent: 0.3,
    volume,
    marketCap: price * 50_000_000,
    high: price * 1.02,
    low: price * 0.98,
    sparkline: [],
    earnings: [],
  };
}

function assetForSymbol(symbol: string, quote: LiveQuote | undefined): Asset {
  const staticAsset = staticAssets.find((asset) => asset.symbol === symbol);
  if (staticAsset) return mergeWithQuote(staticAsset, quote);

  const fallback = fallbackAsset(symbol);
  if (!quote) return fallback;
  return {
    ...fallback,
    price: quote.price || fallback.price,
    change: quote.change || fallback.change,
    changePercent: quote.changePercent || fallback.changePercent,
    previousClose: quote.previousClose || fallback.previousClose,
    high: quote.high || fallback.high,
    low: quote.low || fallback.low,
    volume: quote.volume || fallback.volume,
    marketCap: quote.marketCap || fallback.marketCap,
  };
}

/**
 * Hook that fetches live quotes for the given symbols on mount and at a
 * configurable interval, merging them with the bundled static asset data.
 * Falls back to static data when no API key is configured or the fetch fails.
 */
export function useLiveQuotes(symbols: string[], refreshMs = 30_000): {
  assets: Asset[];
  loading: boolean;
  live: boolean;
} {
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const result = await fetchQuotes(symbols);
      if (cancelled) return;
      setQuotes(result);
      setLoading(false);
    }

    load();
    const timer = setInterval(load, refreshMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(','), refreshMs]);

  const merged = symbols.map((symbol) => assetForSymbol(symbol, quotes[symbol]));

  return { assets: merged, loading, live: Object.keys(quotes).length > 0 };
}

/**
 * Hook that fetches a live quote for a single symbol, merging it with the
 * static asset data for that symbol.
 */
export function useLiveQuote(symbol: string, refreshMs = 30_000): {
  asset: Asset | undefined;
  loading: boolean;
  live: boolean;
} {
  const { assets, loading, live } = useLiveQuotes([symbol], refreshMs);
  return {
    asset: assets.find((a) => a.symbol === symbol),
    loading,
    live,
  };
}
