import { assets } from '@/data/assets';
import { news } from '@/data/news';
import { marketIndexes } from '@/data/marketIndexes';
import { getChartData as genChartData, FREE_RANGES, PREMIUM_RANGES, ALL_RANGES } from '@/data/chartData';
import type { Asset, ChartPoint, ChartRange, MarketIndex, NewsArticle } from '@/types';

export { FREE_RANGES, PREMIUM_RANGES, ALL_RANGES };

export function getAssets(): Asset[] {
  return assets;
}

export function getAsset(symbol: string): Asset | undefined {
  return assets.find((a) => a.symbol.toLowerCase() === symbol.toLowerCase());
}

export function searchAssets(query: string): Asset[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return assets.filter(
    (a) => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q),
  );
}

export function getMarketIndexes(): MarketIndex[] {
  return marketIndexes;
}

export function getNews(): NewsArticle[] {
  return news;
}

export function getNewsById(id: string): NewsArticle | undefined {
  return news.find((n) => n.id === id);
}

export function getNewsForSymbol(symbol: string): NewsArticle[] {
  return news.filter((n) =>
    n.tickers.some((t) => t.toLowerCase() === symbol.toLowerCase()),
  );
}

export function getChartData(
  symbol: string,
  range: ChartRange,
  endPrice: number,
  baselinePrice = endPrice,
): ChartPoint[] {
  return genChartData(symbol, range, endPrice, baselinePrice);
}

export function getTopGainers(limit = 5): Asset[] {
  return [...assets].sort((a, b) => b.changePercent - a.changePercent).slice(0, limit);
}

export function getTopLosers(limit = 5): Asset[] {
  return [...assets].sort((a, b) => a.changePercent - a.changePercent).slice(0, limit);
}

export function getMostActive(limit = 6): Asset[] {
  return [...assets].sort((a, b) => b.volume - a.volume).slice(0, limit);
}

export function getTrending(): Asset[] {
  const symbols = ['NVDA', 'TSLA', 'PLTR', 'AMD', 'COIN'];
  return symbols
    .map((s) => assets.find((a) => a.symbol === s))
    .filter((a): a is Asset => Boolean(a));
}

export function getSectors(): { name: string; changePercent: number; count: number }[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const a of assets) {
    const entry = map.get(a.sector) ?? { total: 0, count: 0 };
    entry.total += a.changePercent;
    entry.count += 1;
    map.set(a.sector, entry);
  }
  return Array.from(map.entries()).map(([name, v]) => ({
    name,
    changePercent: v.total / v.count,
    count: v.count,
  }));
}
