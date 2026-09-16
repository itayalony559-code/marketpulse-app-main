import type { MarketIndex } from '@/types';

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function spark(seed: number, start: number, drift: number): number[] {
  const rand = seeded(seed);
  const pts: number[] = [];
  let v = start;
  for (let i = 0; i < 24; i++) {
    v += (rand() - 0.5) * start * 0.004 + drift / 24;
    pts.push(Number(v.toFixed(2)));
  }
  return pts;
}

export const marketIndexes: MarketIndex[] = [
  {
    symbol: 'SPX',
    name: 'S&P 500',
    value: 5982.44,
    change: 42.18,
    changePercent: 0.71,
    sparkline: spark(11, 5940, 42),
  },
  {
    symbol: 'IXIC',
    name: 'Nasdaq',
    value: 19448.82,
    change: 218.94,
    changePercent: 1.14,
    sparkline: spark(22, 19230, 220),
  },
  {
    symbol: 'DJI',
    name: 'Dow Jones',
    value: 43821.55,
    change: -86.32,
    changePercent: -0.2,
    sparkline: spark(33, 43908, -87),
  },
  {
    symbol: 'RUT',
    name: 'Russell 2000',
    value: 2406.17,
    change: 12.74,
    changePercent: 0.53,
    sparkline: spark(44, 2393, 13),
  },
];
