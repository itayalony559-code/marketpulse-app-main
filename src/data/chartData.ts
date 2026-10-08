import type { ChartPoint, ChartRange } from '@/types';

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const RANGE_CONFIG: Record<ChartRange, { points: number; vol: number; labels: string[] }> = {
  '1D': { points: 78, vol: 0.004, labels: [] },
  '1W': { points: 35, vol: 0.012, labels: [] },
  '1M': { points: 30, vol: 0.02, labels: [] },
  '3M': { points: 65, vol: 0.03, labels: [] },
  '1Y': { points: 52, vol: 0.05, labels: [] },
  '5Y': { points: 60, vol: 0.12, labels: [] },
};

function hashSymbol(symbol: string): number {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) >>> 0;
  return h;
}

export function getChartData(
  symbol: string,
  range: ChartRange,
  endPrice: number,
  baselinePrice = endPrice,
): ChartPoint[] {
  const cfg = RANGE_CONFIG[range];
  const rand = seeded(hashSymbol(symbol) + range.length * 7);
  const pts: ChartPoint[] = [];
  let v = baselinePrice;
  for (let i = 0; i < cfg.points; i++) {
    const progress = i / Math.max(cfg.points - 1, 1);
    const noise = (rand() - 0.5) * Math.abs(endPrice) * cfg.vol * (1 - progress);
    v = baselinePrice + (endPrice - baselinePrice) * progress + noise;
    pts.push({ time: String(i), price: Number(v.toFixed(2)) });
  }
  pts[0].price = Number(baselinePrice.toFixed(2));
  pts[pts.length - 1].price = Number(endPrice.toFixed(2));
  return pts;
}

export const FREE_RANGES: ChartRange[] = ['1D', '1W', '1M'];
export const PREMIUM_RANGES: ChartRange[] = ['3M', '1Y', '5Y'];
export const ALL_RANGES: ChartRange[] = [...FREE_RANGES, ...PREMIUM_RANGES];
