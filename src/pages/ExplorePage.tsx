import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, TrendingDown, Flame, Layers } from 'lucide-react';
import { AssetRow } from '@/components/AssetRow';
import { EmptyState } from '@/components/States';
import { RowSkeleton } from '@/components/Skeletons';
import { Sparkline } from '@/components/Sparkline';
import {
  getTrending,
  getTopGainers,
  getTopLosers,
  getSectors,
  getAssets,
} from '@/services/marketService';
import { getStockQuote, searchStocks } from '@/api';
import type { LiveQuote } from '@/api';
import { formatPrice, formatPercent, changeColor } from '@/utils/format';
import { useLanguage } from '@/context/LanguageContext';
import type { Asset, Exchange } from '@/types';

const EXCHANGES: Exchange[] = [
  'NASDAQ', 'NYSE', 'LSE', 'TSE', 'HKEX', 'Euronext', 'DAX', 'SIX',
  'ASX', 'TSX', 'BSE', 'NSE', 'KRX', 'SSE', 'SZSE', 'BME', 'BMV', 'B3',
  'JSE', 'SGX', 'TWSE', 'OMX', 'BIST', 'TELAVIV',
];

type SearchItem = {
  symbol?: string;
  displaySymbol?: string;
  description?: string;
};

function toSearchAsset(item: SearchItem, quote: LiveQuote | null): Asset | null {
  const symbol = item?.symbol ?? item?.displaySymbol;
  if (typeof symbol !== 'string' || !symbol) return null;
  const seed = [...symbol].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const price = quote?.price && quote.price > 0 ? quote.price : 15 + (seed % 180);
  const changePercent = Number.isFinite(quote?.changePercent) ? quote.changePercent : ((seed % 500) - 250) / 100;
  const previousClose = quote?.previousClose && quote.previousClose > 0
    ? quote.previousClose
    : price / (1 + changePercent / 100);

  return {
    symbol,
    name: item.description ?? symbol,
    sector: 'Technology',
    exchange: 'NASDAQ',
    currency: 'USD',
    price,
    change: quote?.change ?? price - previousClose,
    changePercent,
    previousClose,
    preMarketPrice: quote?.preMarketPrice ?? price * 0.997,
    preMarketChangePercent: quote?.changePercent ?? -0.3,
    afterHoursPrice: quote?.afterHoursPrice ?? price * 1.003,
    afterHoursChangePercent: quote?.changePercent ?? 0.3,
    volume: quote?.volume ?? 1_000_000 + (seed % 90) * 100_000,
    marketCap: quote?.marketCap ?? price * (40_000_000 + (seed % 100) * 100_000),
    sparkline: [],
    earnings: [],
  };
}

export function ExplorePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<Asset[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<Exchange | 'ALL'>('ALL');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!query.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(async () => {
      const items = await searchStocks(query);
      const enriched = await Promise.all(
        (Array.isArray(items) ? items : []).map(async (item: SearchItem) => {
          const symbol = item?.symbol ?? item?.displaySymbol;
          const quote = typeof symbol === 'string' ? await getStockQuote(symbol) : null;
          return toSearchAsset(item, quote);
        }),
      );
      if (cancelled) return;
      setSearchResults(enriched.filter((asset): asset is Asset => Boolean(asset)));
      setSearchLoading(false);
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);
  const results = query.trim() ? searchResults : [];
  const trending = getTrending();
  const gainers = getTopGainers(3);
  const losers = getTopLosers(3);
  const sectors = getSectors();

  const allAssets = getAssets();
  const filteredAssets = useMemo(() => {
    if (selectedExchange === 'ALL') return allAssets;
    return allAssets.filter((a) => a.exchange === selectedExchange);
  }, [allAssets, selectedExchange]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">{t('explore')}</h1>
        <p className="mt-0.5 text-xs text-slate-500">{t('trending')}, {t('gainers')}, {t('losers')}, {t('sectors')}.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full rounded-xl border border-ink-700/60 bg-ink-850 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-bull/50 focus:bg-ink-800"
          aria-label={t('search')}
        />
      </div>

      {query && (
        <div className="surface overflow-hidden animate-slide-up">
          {searchLoading ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">Searching...</div>
          ) : results.length === 0 ? (
            <EmptyState title={t('noResultsFound')} message={`No results for "${query}".`} />
          ) : (
            <div className="divide-y divide-ink-700/40">
              {results.map((a) => (
                <AssetRow key={a.symbol} asset={a} />
              ))}
            </div>
          )}
        </div>
      )}

      {!query && (
        <>
          {/* Trending */}
          <section className="surface overflow-hidden">
            <div className="flex items-center gap-2 border-b border-ink-700/60 px-4 py-3">
              <Flame className="h-3.5 w-3.5 text-bull" />
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t('trending')}
              </h2>
            </div>
            {loading ? (
              <div>
                {Array.from({ length: 3 }).map((_, i) => (
                  <RowSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 py-3">
                {trending.map((a) => (
                  <button
                    key={a.symbol}
                    onClick={() => navigate(`/markets/${a.symbol}`)}
                    className="surface-2 min-w-[140px] shrink-0 p-3 text-left transition-all hover:border-ink-600"
                  >
                    <p className="text-sm font-bold text-white">{a.symbol}</p>
                    <p className="truncate text-[10px] text-slate-500">{a.name}</p>
                    <p className="tabular mt-1.5 text-sm font-semibold text-white">
                      {formatPrice(a.price, a.currency)}
                    </p>
                    <p className={`tabular text-xs font-medium ${changeColor(a.changePercent)}`}>
                      {formatPercent(a.changePercent)}
                    </p>
                    <div className="mt-2">
                      <Sparkline data={a.sparkline} positive={a.changePercent >= 0} width={116} height={28} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Gainers / Losers */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="surface overflow-hidden">
              <div className="flex items-center gap-2 border-b border-ink-700/60 px-4 py-3">
                <TrendingUp className="h-3.5 w-3.5 text-bull" />
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t('gainers')}
                </h2>
              </div>
              {loading ? (
                <div>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <RowSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-ink-700/40">
                  {gainers.map((a) => (
                    <AssetRow key={a.symbol} asset={a} compact />
                  ))}
                </div>
              )}
            </div>
            <div className="surface overflow-hidden">
              <div className="flex items-center gap-2 border-b border-ink-700/60 px-4 py-3">
                <TrendingDown className="h-3.5 w-3.5 text-bear" />
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t('losers')}
                </h2>
              </div>
              {loading ? (
                <div>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <RowSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-ink-700/40">
                  {losers.map((a) => (
                    <AssetRow key={a.symbol} asset={a} compact />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Sectors */}
          <section className="surface overflow-hidden">
            <div className="flex items-center gap-2 border-b border-ink-700/60 px-4 py-3">
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t('sectors')}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
              {sectors.map((s) => (
                <button
                  key={s.name}
                  onClick={() => navigate('/markets')}
                  className="surface-2 p-3 text-left transition-all hover:border-ink-600"
                >
                  <p className="text-sm font-semibold text-white">{s.name}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">{s.count} stocks</span>
                    <span className={`tabular text-xs font-medium ${changeColor(s.changePercent)}`}>
                      {formatPercent(s.changePercent)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* All Stocks by Exchange */}
          <section className="surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-700/60 px-4 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t('allStocks')}
              </h2>
              <span className="text-xs text-slate-500">{filteredAssets.length}</span>
            </div>

            {/* Exchange filter chips */}
            <div className="scrollbar-hide flex gap-2 overflow-x-auto border-b border-ink-700/40 px-3 py-2.5">
              <button
                onClick={() => setSelectedExchange('ALL')}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  selectedExchange === 'ALL'
                    ? 'bg-bull/15 text-bull'
                    : 'bg-ink-850 text-slate-400 hover:text-white'
                }`}
              >
                {t('allExchanges')}
              </button>
              {EXCHANGES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setSelectedExchange(ex)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    selectedExchange === ex
                      ? 'bg-bull/15 text-bull'
                      : 'bg-ink-850 text-slate-400 hover:text-white'
                  }`}
                >
                  {ex}
                </button>
              ))}
            </div>

            {/* Stock list */}
            {loading ? (
              <div>
                {Array.from({ length: 5 }).map((_, i) => (
                  <RowSkeleton key={i} />
                ))}
              </div>
            ) : (
              <>
                <div className="divide-y divide-ink-700/40">
                  {filteredAssets.slice(0, showAll ? undefined : 20).map((a) => (
                    <AssetRow key={a.symbol} asset={a} compact />
                  ))}
                </div>
                {!showAll && filteredAssets.length > 20 && (
                  <button
                    onClick={() => setShowAll(true)}
                    className="w-full border-t border-ink-700/40 py-3 text-xs font-semibold text-bull transition-colors hover:bg-ink-850"
                  >
                    {t('viewAll')} ({filteredAssets.length})
                  </button>
                )}
                {showAll && (
                  <button
                    onClick={() => setShowAll(false)}
                    className="w-full border-t border-ink-700/40 py-3 text-xs font-semibold text-slate-400 transition-colors hover:bg-ink-850"
                  >
                    {t('back')}
                  </button>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
