import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getChartData, FREE_RANGES, PREMIUM_RANGES, ALL_RANGES } from '@/services/marketService';
import { getHistoricalPrices } from '@/api';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatPrice, formatPercent, changeColor } from '@/utils/format';
import type { ChartRange } from '@/types';

type Props = {
  symbol: string;
  endPrice: number;
  baselinePrice: number;
};

export function calculatePeriodChange(startPrice: number | undefined, endPrice: number | undefined): number {
  if (!Number.isFinite(startPrice) || startPrice <= 0 || !Number.isFinite(endPrice)) return 0;
  return ((endPrice - startPrice) / startPrice) * 100;
}

export function PriceChart({ symbol, endPrice, baselinePrice }: Props) {
  const { isPremium } = useSubscription();
  const { t } = useLanguage();
  const [range, setRange] = useState<ChartRange>('1D');
  const [data, setData] = useState<{ time: string; price: number }[]>([]);

  const lockedRange = PREMIUM_RANGES.includes(range) && !isPremium;
  const effectiveRange = lockedRange ? '1M' : range;
  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      const points = await getHistoricalPrices(symbol, effectiveRange);
      if (cancelled) return;

      const nextData = points.length > 0
        ? points
        : getChartData(symbol, effectiveRange, endPrice, baselinePrice);
      nextData[nextData.length - 1] = { ...nextData[nextData.length - 1], price: endPrice };
      setData(nextData);
    }

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [symbol, effectiveRange, endPrice, baselinePrice]);

  const timeframeChangePercent = calculatePeriodChange(data[0]?.price, data[data.length - 1]?.price);
  const positive = timeframeChangePercent >= 0;
  const color = positive ? '#16c784' : '#ea3943';
  const prices = data.map((point) => point.price).filter(Number.isFinite);
  const dataMin = prices.length > 0 ? Math.min(...prices) : 0;
  const dataMax = prices.length > 0 ? Math.max(...prices) : 0;
  const padding = Math.max((dataMax - dataMin) * 0.02, 0.01);
  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Price Chart
        </h3>
        <span className={`tabular text-xs font-semibold ${changeColor(timeframeChangePercent)}`}>
          {formatPercent(timeframeChangePercent)}
        </span>
      </div>

      <div className="mt-4 h-64 w-full">
        {lockedRange ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex items-center gap-2 text-gold-400">
              <Lock className="h-5 w-5" />
              <span className="text-sm font-medium text-slate-200">
                {range} {t('premium').toLowerCase()} feature.
              </span>
            </div>
            <Link
              to="/upgrade"
              className="rounded-lg border border-gold-500/50 bg-gold-500/15 px-4 py-2 text-sm font-semibold text-gold-400 transition-all hover:bg-gold-500/25"
            >
              {t('unlockPremium')}
            </Link>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`chart-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1a1e29" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                minTickGap={30}
              />
              <YAxis
                domain={[dataMin - padding, dataMax + padding]}
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v: number) => formatPrice(Number(v))}
                orientation="right"
              />
              <Tooltip
                contentStyle={{
                  background: '#101218',
                  border: '1px solid #222734',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ display: 'none' }}
                formatter={(v) => [formatPrice(Number(v)), 'Price']}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={color}
                strokeWidth={2}
                fill={`url(#chart-${symbol})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Timeframe buttons */}
      <div className="mt-4 flex gap-1.5">
        {ALL_RANGES.map((r) => {
          const isLocked = PREMIUM_RANGES.includes(r) && !isPremium;
          const isActive = range === r;
          return (
            <button
              key={r}
              onClick={() => {
                setRange(r);
              }}
              className={`relative flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-ink-700 text-white'
                  : 'text-slate-500 hover:bg-ink-800 hover:text-slate-300'
              }`}
            >
              {r}
              {isLocked && (
                <Lock className="absolute right-1 top-1 h-2.5 w-2.5 text-gold-500/70" />
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[10px] text-slate-600">
        {FREE_RANGES.join(', ')} free · {PREMIUM_RANGES.join(', ')} with Premium
      </p>
    </div>
  );
}
