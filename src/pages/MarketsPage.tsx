import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, TrendingUp, TrendingDown, Activity, Wifi, WifiOff } from 'lucide-react';
import { AssetRow } from '@/components/AssetRow';
import { EmptyState } from '@/components/States';
import { RowSkeleton } from '@/components/Skeletons';
import { useWatchlist } from '@/context/WatchlistContext';
import {
  searchAssets,
  getTopGainers,
  getTopLosers,
  getMostActive,
} from '@/services/marketService';
import { useLiveQuotes } from '@/hooks/useLiveQuotes';
// @ts-ignore
import { getStockQuote, hasApiKey, searchStocks } from '@/api';
import { formatPrice, formatPercent, changeColor } from '@/utils/format';
import { useLanguage } from '@/context/LanguageContext';

export function MarketsPage() {
  const navigate = useNavigate();
  const { watchlist } = useWatchlist();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

useEffect(() => {
  let cancelled = false;
  if (!query.trim()) {
    setSearchResults([]);
    setSearchLoading(false);
    return;
  }
  setSearchLoading(true);
  const timer = setTimeout(async () => {
    const data = await searchStocks(query);
    const searchItems = Array.isArray(data) ? data : [];
    const enrichedResults = await Promise.all(
      searchItems.map(async (item) => {
        const symbol = item?.symbol ?? item?.displaySymbol;
        if (typeof symbol !== 'string' || !symbol) return null;

        const quote = await getStockQuote(symbol);
        return { ...item, ...(quote ?? {}) };
      }),
    );
    if (cancelled) return;
    setSearchResults(enrichedResults.filter(Boolean));
    setSearchLoading(false);
  }, 300);
  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}, [query]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const timer = setTimeout(() => setLoading(false), 400);
  return () => clearTimeout(timer);
}, []);

  // Fetch live quotes for watchlist + movers
  const liveSymbols = useMemo(() => {
    const gainers = getTopGainers(3).map((a) => a.symbol);
    const losers = getTopLosers(3).map((a) => a.symbol);
    const active = getMostActive(4).map((a) => a.symbol);
    return [...new Set([...watchlist, ...gainers, ...losers, ...active])];
  }, [watchlist]);

  const { assets: liveAssets, loading: quotesLoading, live } = useLiveQuotes(liveSymbols);

const results = query.trim() ? searchResults : [];

  const getLiveAsset = (symbol: string) =>
    liveAssets.find((a) => a.symbol === symbol) ??
    // fall back to static search for symbols not in liveAssets
    liveAssets.find((a) => a.symbol.toLowerCase() === symbol.toLowerCase());

  const watchlistAssets = watchlist
    .map((s) => getLiveAsset(s))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  const gainers = getTopGainers(3).map((g) => getLiveAsset(g.symbol) ?? g);
  const losers = getTopLosers(3).map((g) => getLiveAsset(g.symbol) ?? g);
  const active = getMostActive(4).map((g) => getLiveAsset(g.symbol) ?? g);

  const showLoading = loading || quotesLoading;

  return (
    <div className="space-y-6">
      {/* Live status indicator */}
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
        {live ? (
          <>
            <Wifi className="h-3 w-3 text-bull" />
            <span className="text-bull">Live data</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3 text-slate-600" />
            <span>{hasApiKey() ? 'Connecting...' : 'Static data'}</span>
          </>
        )}
      </div>

      {/* Search */}
      <div>
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
          <div className="mt-3 surface overflow-hidden animate-slide-up">
            {results.length === 0 ? (
              <EmptyState title={t('noResultsFound')} message={`No results for "${query}".`} />
            ) : (
              <div className="divide-y divide-ink-700/40">
                {results.map((asset) => {
                  if (!asset) return null;

                  const symbol = asset.symbol ?? asset.displaySymbol;
                  if (typeof symbol !== 'string' || !symbol) return null;

                  const liveA = { ...(getLiveAsset(symbol) ?? {}), ...asset };
                  const changePercent = liveA?.changePercent;
                  return (
                    <div
                      key={symbol}
                      onClick={() => navigate(`/markets/${symbol}`)}
                      className="flex cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-ink-850"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-white">{symbol}</p>
                          <span className="rounded border border-ink-700 bg-ink-800 px-1 py-0.5 text-[8px] font-medium uppercase text-slate-500">
                            {liveA?.exchange ?? 'N/A'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{liveA?.name ?? asset.description ?? 'N/A'}</p>
                      </div>
                      <div className="w-24 text-right">
                        <p className="tabular text-sm font-semibold text-white">
                          {searchLoading
                            ? 'Loading...'
                            : liveA?.price
                              ? formatPrice(liveA.price, liveA.currency)
                              : 'N/A'}
                        </p>
                        <p className={`tabular text-xs font-medium ${typeof changePercent === 'number' ? changeColor(changePercent) : 'text-slate-400'}`}>
                          {searchLoading
                            ? '...'
                            : typeof changePercent === 'number'
                              ? formatPercent(changePercent)
                              : 'N/A'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Watchlist */}
      <section className="surface overflow-hidden">
        <div className="flex items-center gap-2 border-b border-ink-700/60 px-4 py-3">
          <Star className="h-3.5 w-3.5 text-gold-400" fill="currentColor" />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t('myWatchlist')}
          </h2>
          <span className="ml-auto text-xs text-slate-500">{watchlist.length}</span>
        </div>
        {showLoading ? (
          <div>
            {Array.from({ length: 3 }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        ) : watchlistAssets.length === 0 ? (
          <EmptyState
            title={t('yourWatchlistIsEmpty')}
            message="Start tracking stocks you care about."
            actionLabel={t('exploreMarkets')}
            onAction={() => navigate('/explore')}
          />
        ) : (
          <div className="divide-y divide-ink-700/40">
            {watchlistAssets.map((a) => (
              <AssetRow key={a.symbol} asset={a} />
            ))}
          </div>
        )}
      </section>

      {/* Movers */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MoversCard title={t('gainers')} icon={TrendingUp} assets={gainers} loading={showLoading} />
        <MoversCard title={t('losers')} icon={TrendingDown} assets={losers} loading={showLoading} />
      </section>

      {/* Most active */}
      <section className="surface overflow-hidden">
        <div className="flex items-center gap-2 border-b border-ink-700/60 px-4 py-3">
          <Activity className="h-3.5 w-3.5 text-slate-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t('mostActive')}
          </h2>
        </div>
        {showLoading ? (
          <div>
            {Array.from({ length: 4 }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-ink-700/40">
            {active.map((a) => (
              <AssetRow key={a.symbol} asset={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MoversCard({
  title,
  icon: Icon,
  assets,
  loading,
}: {
  title: string;
  icon: typeof TrendingUp;
  assets: ReturnType<typeof getTopGainers>;
  loading: boolean;
}) {
  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center gap-2 border-b border-ink-700/60 px-4 py-3">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      </div>
      {loading ? (
        <div>
          {Array.from({ length: 3 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-ink-700/40">
          {assets.map((a) => (
            <AssetRow key={a.symbol} asset={a} compact />
          ))}
        </div>
      )}
    </div>
  );
}
