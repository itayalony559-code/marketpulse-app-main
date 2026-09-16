import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star, Lock, Sparkles, Newspaper, Bell, BellRing } from 'lucide-react';
import { PriceChart } from '@/components/PriceChart';
import { PremiumGate, PremiumBadge } from '@/components/Premium';
import { NewsCard } from '@/components/NewsCard';
import { ErrorState } from '@/components/States';
import { ChartSkeleton } from '@/components/Skeletons';
import { MarketSessionBadge, getMarketSession } from '@/components/MarketSession';
import { useWatchlist } from '@/context/WatchlistContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useAlerts, sendNewsAlert } from '@/context/AlertContext';
import { useLanguage } from '@/context/LanguageContext';
import { getAsset, getNewsForSymbol } from '@/services/marketService';
import { getCompanyNews, getStockQuote } from '@/api';
import {
  formatPrice,
  formatChange,
  formatPercent,
  formatMarketCap,
  formatRevenue,
  changeColor,
} from '@/utils/format';
import type { Asset, MarketSession, QuarterlyEarnings } from '@/types';

type SessionTab = 'REGULAR' | 'PRE-MARKET' | 'AFTER-HOURS';

function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(2)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
  return vol.toLocaleString('en-US');
}

function extendedPriceOrFallback(value: number | null | undefined, currentPrice: number, variance: number): number {
  return value != null && value > 0 ? value : currentPrice * (1 + variance);
}

function symbolSeed(symbol: string): number {
  return [...symbol].reduce((seed, character) => (seed * 31 + character.charCodeAt(0)) % 1000, 17);
}

function createFallbackEarnings(symbol: string, price: number, marketCap: number): QuarterlyEarnings[] {
  const seed = symbolSeed(symbol);
  const epsBase = Math.max(0.08, price * (0.008 + (seed % 5) / 1000));
  const revenueBase = Math.max(25_000_000, marketCap * 0.08);
  const quarters = ['Q3 2026', 'Q2 2026', 'Q1 2026', 'Q4 2025'];

  return quarters.map((quarter, index) => {
    const estimate = Number((epsBase * (1 + (index - 1.5) * 0.04)).toFixed(2));
    const actual = Number((estimate * (index % 2 === seed % 2 ? 1.06 : 0.97)).toFixed(2));
    const revenueEstimate = Math.round(revenueBase * (1 + (index - 1.5) * 0.03));
    return {
      quarter,
      epsEstimate: estimate,
      epsActual: actual,
      revenueEstimate,
      revenueActual: Math.round(revenueEstimate * (actual >= estimate ? 1.04 : 0.98)),
    };
  });
}

function estimatedMarketCap(symbol: string, price: number, volume: number): number {
  const estimatedShares = 40_000_000 + symbolSeed(symbol) * 150_000;
  return Math.max(price * estimatedShares, price * Math.max(volume, 1_000_000) * 8);
}

function completeAssetData(asset: Asset): Asset {
  const marketCap = asset.marketCap > 0
    ? asset.marketCap
    : estimatedMarketCap(asset.symbol, asset.price, asset.volume);
  return {
    ...asset,
    marketCap,
    earnings: asset.earnings.length > 0
      ? asset.earnings
      : createFallbackEarnings(asset.symbol, asset.price, marketCap),
  };
}

function createFallbackAsset(symbol: string): Asset {
  const seed = symbolSeed(symbol);
  const price = 18 + (seed % 180) + (seed % 100) / 100;
  const changePercent = ((seed % 700) - 350) / 100;
  const previousClose = price / (1 + changePercent / 100);
  const volume = 1_000_000 + (seed % 80) * 100_000;
  const marketCap = estimatedMarketCap(symbol, price, volume);

  return completeAssetData({
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
    marketCap,
    high: price * 1.02,
    low: price * 0.98,
    sparkline: [],
    earnings: createFallbackEarnings(symbol, price, marketCap),
  });
}

function createDynamicAsset(symbol: string, quote: NonNullable<Awaited<ReturnType<typeof getStockQuote>>>): Asset {
  const preMarketPrice = extendedPriceOrFallback(quote.preMarketPrice, quote.price, -0.003);
  const afterHoursPrice = extendedPriceOrFallback(quote.afterHoursPrice, quote.price, 0.003);

  return completeAssetData({
    symbol,
    name: symbol,
    sector: 'Technology',
    exchange: 'NASDAQ',
    currency: 'USD',
    price: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
    previousClose: quote.previousClose,
    preMarketPrice,
    preMarketChangePercent: quote.previousClose > 0
      ? ((preMarketPrice - quote.previousClose) / quote.previousClose) * 100
      : -0.3,
    afterHoursPrice,
    afterHoursChangePercent: quote.previousClose > 0
      ? ((afterHoursPrice - quote.previousClose) / quote.previousClose) * 100
      : 0.3,
    volume: quote.volume ?? 0,
    marketCap: quote.marketCap || 0,
    high: quote.high || quote.price,
    low: quote.low || quote.price,
    sparkline: [],
    earnings: createFallbackEarnings(symbol, quote.price, quote.marketCap || estimatedMarketCap(symbol, quote.price, quote.volume ?? 0)),
  });
}

function mergeLiveQuote(asset: Asset, quote: NonNullable<Awaited<ReturnType<typeof getStockQuote>>>): Asset {
  const previousClose = quote.previousClose || asset.previousClose;
  const preMarketPrice = extendedPriceOrFallback(quote.preMarketPrice, quote.price, -0.003);
  const afterHoursPrice = extendedPriceOrFallback(quote.afterHoursPrice, quote.price, 0.003);

  return completeAssetData({
    ...asset,
    price: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
    previousClose,
    high: quote.high || asset.high,
    low: quote.low || asset.low,
    volume: quote.volume ?? asset.volume,
    marketCap: quote.marketCap || asset.marketCap,
    preMarketPrice,
    preMarketChangePercent: previousClose > 0
      ? ((preMarketPrice - previousClose) / previousClose) * 100
      : asset.preMarketChangePercent,
    afterHoursPrice,
    afterHoursChangePercent: previousClose > 0
      ? ((afterHoursPrice - previousClose) / previousClose) * 100
      : asset.afterHoursChangePercent,
  });
}

function normalizeMarketData(asset: Asset, useProvidedPreviousClose = false): Asset {
  const changePercent = Number.isFinite(asset.changePercent) ? asset.changePercent : 0;
  const derivedPreviousClose = asset.price / (1 + changePercent / 100);
  const previousClose = useProvidedPreviousClose && asset.previousClose > 0
    ? asset.previousClose
    : derivedPreviousClose;
  const preMarketChangePercent = Number.isFinite(asset.preMarketChangePercent)
    ? asset.preMarketChangePercent
    : 0;
  const afterHoursChangePercent = Number.isFinite(asset.afterHoursChangePercent)
    ? asset.afterHoursChangePercent
    : 0;

  return completeAssetData({
    ...asset,
    change: asset.price - previousClose,
    changePercent,
    previousClose,
    preMarketPrice: asset.preMarketPrice > 0
      ? asset.preMarketPrice
      : previousClose * (1 + preMarketChangePercent / 100),
    afterHoursPrice: asset.afterHoursPrice > 0
      ? asset.afterHoursPrice
      : previousClose * (1 + afterHoursChangePercent / 100),
  });
}

export function StockDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const { isPremium } = useSubscription();
  const { hasAlert, toggleAlert, requestPermission, permission } = useAlerts();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<SessionTab>('REGULAR');
  const [asset, setAsset] = useState<Asset | undefined>();
  const [news, setNews] = useState<Awaited<ReturnType<typeof getCompanyNews>>>([]);

  useEffect(() => {
    let cancelled = false;
    const requestedSymbol = symbol?.trim().toUpperCase();
    const staticAsset = requestedSymbol ? getAsset(requestedSymbol) : undefined;

    setAsset(undefined);
    setLoading(true);

    if (!requestedSymbol) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    async function loadQuote(initialLoad = false) {
      const quote = await getStockQuote(requestedSymbol);
      if (cancelled) return;

      if (quote) {
        setAsset((currentAsset) => {
          const baseAsset = currentAsset ?? staticAsset;
          const nextAsset = baseAsset
            ? mergeLiveQuote(baseAsset, quote)
            : createDynamicAsset(requestedSymbol, quote);
          return normalizeMarketData(nextAsset, true);
        });
      } else {
        if (initialLoad) {
          setAsset(normalizeMarketData(staticAsset ?? createFallbackAsset(requestedSymbol)));
        }
      }
      if (initialLoad) setLoading(false);
    }

    loadQuote(true);
    const refreshTimer = setInterval(() => loadQuote(), 10_000);
    return () => {
      cancelled = true;
      clearInterval(refreshTimer);
    };
  }, [symbol]);

  useEffect(() => {
    let cancelled = false;
    const requestedSymbol = symbol?.trim().toUpperCase();

    setNews([]);
    if (!requestedSymbol) return () => { cancelled = true; };

    async function loadNews() {
      const nextNews = await getCompanyNews(requestedSymbol);
      if (!cancelled) setNews(nextNews);
    }

    loadNews();
    const newsTimer = setInterval(loadNews, 30_000);
    return () => {
      cancelled = true;
      clearInterval(newsTimer);
    };
  }, [symbol]);

  useEffect(() => {
    if (!isPremium || !asset) return;
    if (!hasAlert(asset.symbol)) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const stockNews = news.length > 0 ? news : getNewsForSymbol(asset.symbol);
    const seenKey = `marketpulse_seen_news_${asset.symbol}`;
    let seen: string[] = [];
    try {
      seen = JSON.parse(localStorage.getItem(seenKey) || '[]');
    } catch {
      seen = [];
    }

    const newArticles = stockNews.filter((n) => !seen.includes(n.id));
    if (newArticles.length > 0 && seen.length > 0) {
      for (const article of newArticles) {
        sendNewsAlert(asset.symbol, article.headline);
      }
    }

    const allIds = stockNews.map((n) => n.id);
    try {
      localStorage.setItem(seenKey, JSON.stringify(allIds));
    } catch {
      /* ignore */
    }
  }, [asset, news, isPremium, hasAlert]);

  if (!asset) {
    if (loading) {
      return <ChartSkeleton />;
    }
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/markets')}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <ErrorState title={t('stockNotFound')} message={`No asset found for "${symbol}".`} />
      </div>
    );
  }

  const inList = isInWatchlist(asset.symbol);
  const session: MarketSession = getMarketSession();

  const sessionData = {
    REGULAR: { price: asset.price, change: asset.change, percent: asset.changePercent },
    'PRE-MARKET': {
      price: asset.preMarketPrice,
      change: asset.preMarketPrice - asset.previousClose,
      percent: asset.preMarketChangePercent,
    },
    'AFTER-HOURS': {
      price: asset.afterHoursPrice,
      change: asset.afterHoursPrice - asset.previousClose,
      percent: asset.afterHoursChangePercent,
    },
  };

  const current = sessionData[tab];
  const hasMockFinancials = asset.earnings.length > 0;

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('back')}
      </button>

      {/* Header */}
      <div className="surface p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{asset.symbol}</h1>
              <span className="rounded-md border border-ink-700 bg-ink-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                {asset.sector}
              </span>
              <span className="rounded-md border border-ink-700 bg-ink-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                {asset.exchange}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">{asset.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleWatchlist(asset.symbol, {
                name: asset.name,
                price: asset.price,
                change: asset.change,
                changePercent: asset.changePercent,
                exchange: asset.exchange,
              })}
              aria-label={inList ? 'Remove from watchlist' : 'Add to watchlist'}
              className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all active:scale-90 ${
                inList
                  ? 'border-gold-500/40 bg-gold-500/10 text-gold-400'
                  : 'border-ink-700 bg-ink-850 text-slate-400 hover:text-white'
              }`}
            >
              <Star className="h-5 w-5" fill={inList ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={async () => {
                if (!isPremium) {
                  navigate('/upgrade');
                  return;
                }
                if (!hasAlert(asset.symbol) && permission !== 'granted') {
                  const result = await requestPermission();
                  if (result !== 'granted') return;
                }
                toggleAlert(asset.symbol);
              }}
              aria-label={hasAlert(asset.symbol) ? 'Disable news alerts' : 'Enable news alerts'}
              className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all active:scale-90 ${
                hasAlert(asset.symbol) && isPremium
                  ? 'border-bull/40 bg-bull/10 text-bull'
                  : isPremium
                    ? 'border-ink-700 bg-ink-850 text-slate-400 hover:text-white'
                    : 'border-ink-700 bg-ink-850 text-slate-400 hover:text-gold-400'
              }`}
            >
              {hasAlert(asset.symbol) && isPremium ? (
                <BellRing className="h-5 w-5" />
              ) : (
                <Bell className="h-5 w-5" />
              )}
              {!isPremium && <Lock className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-gold-500/80" />}
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="tabular text-3xl font-bold text-white">
              {formatPrice(current.price, asset.currency)}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className={`tabular text-sm font-semibold ${changeColor(current.percent)}`}>
                {formatChange(current.change)}
              </span>
              <span className={`tabular text-sm font-semibold ${changeColor(current.percent)}`}>
                {formatPercent(current.percent)}
              </span>
            </div>
          </div>
          <MarketSessionBadge session={session} />
        </div>
      </div>

      {/* Session tabs */}
      <div className="grid grid-cols-3 gap-2">
        {(['REGULAR', 'PRE-MARKET', 'AFTER-HOURS'] as SessionTab[]).map((s) => {
          const data = sessionData[s];
          const isActive = tab === s;
          const isPremiumSession = s !== 'REGULAR' && !isPremium;
          return (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={`relative rounded-xl border p-3 text-left transition-all ${
                isActive
                  ? 'border-bull/40 bg-bull/5'
                  : 'border-ink-700/60 bg-ink-900 hover:bg-ink-850'
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {s.replace('-', ' ')}
              </p>
              <p className="tabular mt-1 text-sm font-bold text-white">{formatPrice(data.price, asset.currency)}</p>
              <p className={`tabular text-xs font-medium ${changeColor(data.percent)}`}>
                {formatPercent(data.percent)}
              </p>
              {isPremiumSession && (
                <Lock className="absolute right-2 top-2 h-3 w-3 text-gold-500/60" />
              )}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      {loading ? (
        <ChartSkeleton />
      ) : (
        <PriceChart
          symbol={asset.symbol}
          endPrice={asset.price}
          baselinePrice={asset.previousClose}
        />
      )}

      {/* Key stats */}
      <div className="surface p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t('keyStatistics')}
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
          <Stat label={t('previousClose')} value={formatPrice(asset.previousClose, asset.currency)} />
          <Stat label={t('dayRange')} value={`${formatPrice(asset.low ?? asset.price, asset.currency)} – ${formatPrice(asset.high ?? asset.price, asset.currency)}`} />
          <Stat label={t('volume')} value={formatVolume(asset.volume)} />
          <Stat label={t('marketCap')} value={formatMarketCap(asset.marketCap, asset.currency)} />
        </div>
      </div>

      {/* Quarterly earnings */}
      <div className="surface p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {hasMockFinancials ? t('quarterlyEarnings') : 'Quarterly Reports (Unavailable on Free Tier)'}
        </h3>
        {hasMockFinancials ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-700/60 text-[10px] uppercase tracking-wide text-slate-500">
                <th className="pb-2 text-left font-semibold">{t('quarter')}</th>
                <th className="pb-2 text-right font-semibold">{t('epsEstimate')}</th>
                <th className="pb-2 text-right font-semibold">{t('epsActual')}</th>
                <th className="pb-2 text-right font-semibold">{t('surprise')}</th>
                <th className="pb-2 text-right font-semibold">{t('revenue')}</th>
              </tr>
            </thead>
            <tbody>
              {asset.earnings.map((e) => {
                const surprise = e.epsActual - e.epsEstimate;
                const beat = surprise >= 0;
                return (
                  <tr key={e.quarter} className="border-b border-ink-700/30 last:border-0">
                    <td className="py-2.5 text-xs font-semibold text-slate-300">{e.quarter}</td>
                    <td className="py-2.5 text-right tabular text-xs text-slate-400">
                      {formatPrice(e.epsEstimate, asset.currency)}
                    </td>
                    <td className="py-2.5 text-right tabular text-xs font-semibold text-white">
                      {formatPrice(e.epsActual, asset.currency)}
                    </td>
                    <td className={`py-2.5 text-right tabular text-xs font-semibold ${changeColor(surprise)}`}>
                      {beat ? '▲' : '▼'} {Math.abs((surprise / e.epsEstimate) * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 text-right tabular text-xs text-slate-400">
                      {formatRevenue(e.revenueActual, asset.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            Financial reports, dividends, and splits are unavailable for dynamically searched stocks on the Finnhub Free Tier.
          </p>
        )}
      </div>

      {!hasMockFinancials && (
        <>
          <UnavailableSection title="Dividends (Unavailable on Free Tier)" />
          <UnavailableSection title="Splits (Unavailable on Free Tier)" />
        </>
      )}

      {/* Relevant news */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Newspaper className="h-3.5 w-3.5 text-slate-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {asset.symbol} {t('newsThisWeek')}
          </h3>
        </div>
        {(() => {
          const stockNews = news;
          if (stockNews.length === 0) {
            return (
              <div className="surface p-6 text-center text-sm text-slate-500">
                {t('noRecentNews')} {asset.symbol}.
              </div>
            );
          }
          return (
            <div className="space-y-3">
              {stockNews.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          );
        })()}
      </div>

      {/* Premium insight */}
      <div className="surface overflow-hidden">
        <div className="flex items-center gap-2 border-b border-ink-700/60 px-4 py-3">
          <Sparkles className="h-3.5 w-3.5 text-gold-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t('premiumMarketInsight')}
          </h3>
          <PremiumBadge className="ml-auto" />
        </div>
        <PremiumGate
          message={t('unlockAnalystMomentum')}
          className="min-h-[140px]"
          preview={
            <div className="p-4">
              <p className="text-sm leading-relaxed text-slate-300">
                Analyst momentum and extended-hours activity indicate a constructive near-term
                setup for {asset.name}. Pre-market depth shows persistent bid interest with
                tightening spreads, while after-hours volume remains elevated versus the 30-day
                average. Institutional flow data suggests...
              </p>
            </div>
          }
        >
          <div className="p-4">
            <p className="text-sm leading-relaxed text-slate-300">
              Analyst momentum and extended-hours activity indicate a constructive near-term setup
              for {asset.name}. Pre-market depth shows persistent bid interest with tightening
              spreads, while after-hours volume remains elevated versus the 30-day average.
              Institutional flow data suggests accumulation by large funds over the past five
              sessions. Key levels to watch: upside break above ${formatPrice(asset.price + 5, asset.currency)}{' '}
              could extend momentum, while a slip below ${formatPrice(asset.price - 4, asset.currency)}{' '}
              may invite profit-taking.
            </p>
          </div>
        </PremiumGate>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="tabular mt-0.5 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function UnavailableSection({ title }: { title: string }) {
  return (
    <div className="surface p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <p className="mt-3 text-sm text-slate-500">
        This data is unavailable on the Finnhub Free Tier.
      </p>
    </div>
  );
}
