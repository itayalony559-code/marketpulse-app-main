import { Link } from 'react-router-dom';
import { ChevronRight, Wifi, WifiOff } from 'lucide-react';
import { IndexCard } from '@/components/IndexCard';
import { AssetRow } from '@/components/AssetRow';
import { NewsCard } from '@/components/NewsCard';
import { CardSkeleton, NewsCardSkeleton, RowSkeleton } from '@/components/Skeletons';
import { useWatchlist } from '@/context/WatchlistContext';
import { useLanguage } from '@/context/LanguageContext';
import { getMarketIndexes, getNews, getAsset } from '@/services/marketService';
import { useLiveQuotes } from '@/hooks/useLiveQuotes';
import { hasApiKey } from '@/api';
import { useEffect, useMemo, useState } from 'react';

export function HomePage() {
  const { watchlist } = useWatchlist();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  // Fetch live quotes for watchlist symbols
  const { assets: liveAssets, loading: quotesLoading, live } = useLiveQuotes(watchlist);

  const indexes = getMarketIndexes();
  const news = getNews();

  const watchlistAssets = watchlist
    .map((s) => liveAssets.find((a) => a.symbol === s) ?? getAsset(s))
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .slice(0, 4);

  const showLoading = loading || quotesLoading;

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{t('markets')}</h1>
          <p className="mt-0.5 text-xs text-slate-500">{t('marketOverview')}</p>
        </div>
      </div>

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

      {/* Market overview */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t('marketOverview')}
          </h2>
        </div>
        {loading ? (
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="min-w-[180px] flex-1">
                <CardSkeleton />
              </div>
            ))}
          </div>
        ) : (
          <div className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4">
            {indexes.map((idx) => (
              <IndexCard key={idx.symbol} index={idx} />
            ))}
          </div>
        )}
      </section>

      {/* Watchlist preview */}
      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-700/60 px-4 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t('myWatchlist')}
          </h2>
          <Link
            to="/markets"
            className="inline-flex items-center text-xs font-semibold text-bull hover:text-bull-400"
          >
            {t('viewAll')}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {showLoading ? (
          <div>
            {Array.from({ length: 3 }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        ) : watchlistAssets.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-slate-400">{t('yourWatchlistIsEmpty')}</p>
            <Link
              to="/explore"
              className="mt-2 inline-block text-xs font-semibold text-bull hover:text-bull-400"
            >
              {t('exploreMarkets')}
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-ink-700/40">
            {watchlistAssets.map((a) => (
              <AssetRow key={a.symbol} asset={a} />
            ))}
          </div>
        )}
      </section>

      {/* Latest news */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t('latestNews')}
          </h2>
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <NewsCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {news.map((n) => (
              <NewsCard key={n.id} article={n} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
