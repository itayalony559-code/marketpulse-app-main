import { Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Sparkline } from '@/components/Sparkline';
import { useWatchlist } from '@/context/WatchlistContext';
import { formatPrice, formatPercent, changeColor } from '@/utils/format';
import type { Asset } from '@/types';

export function AssetRow({ asset, compact = false }: { asset: Asset; compact?: boolean }) {
  const navigate = useNavigate();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const inList = isInWatchlist(asset.symbol);
  const positive = asset.changePercent >= 0;

  return (
    <div
      onClick={() => navigate(`/markets/${asset.symbol}`)}
      className="group flex cursor-pointer items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-ink-850/60"
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWatchlist(asset.symbol);
          }}
          aria-label={inList ? 'Remove from watchlist' : 'Add to watchlist'}
          className={`shrink-0 transition-transform active:scale-90 ${
            inList ? 'text-gold-400' : 'text-slate-600 hover:text-slate-400'
          }`}
        >
          <Star className="h-4 w-4" fill={inList ? 'currentColor' : 'none'} />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-white">{asset.symbol}</p>
            <span className="rounded border border-ink-700 bg-ink-800 px-1 py-0.5 text-[8px] font-medium uppercase text-slate-500">
              {asset.exchange}
            </span>
          </div>
          <p className="truncate text-xs text-slate-500">{asset.name}</p>
        </div>
      </div>

      {!compact && (
        <div className="hidden sm:block">
          <Sparkline data={asset.sparkline} positive={positive} width={80} height={32} />
        </div>
      )}

      <div className="text-right">
        <p className="tabular text-sm font-semibold text-white">{formatPrice(asset.price, asset.currency)}</p>
        <p className={`tabular text-xs font-medium ${changeColor(asset.changePercent)}`}>
          {formatPercent(asset.changePercent)}
        </p>
      </div>
    </div>
  );
}
