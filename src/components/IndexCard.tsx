import { useNavigate } from 'react-router-dom';
import { Sparkline } from '@/components/Sparkline';
import { formatPrice, formatChange, formatPercent, changeColor } from '@/utils/format';
import type { MarketIndex } from '@/types';

export function IndexCard({ index }: { index: MarketIndex }) {
  const navigate = useNavigate();
  const positive = index.changePercent >= 0;

  return (
    <button
      onClick={() => navigate('/markets')}
      className="surface min-w-[180px] shrink-0 p-4 text-left transition-all hover:border-ink-600 hover:bg-ink-850"
    >
      <p className="text-xs font-medium text-slate-400">{index.name}</p>
      <p className="tabular mt-1.5 text-xl font-bold text-white">{formatPrice(index.value)}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className={`tabular text-xs font-semibold ${changeColor(index.changePercent)}`}>
          {formatChange(index.change)}
        </span>
        <span className={`tabular text-xs font-semibold ${changeColor(index.changePercent)}`}>
          {formatPercent(index.changePercent)}
        </span>
      </div>
      <div className="mt-3">
        <Sparkline data={index.sparkline} positive={positive} width={148} height={32} />
      </div>
    </button>
  );
}
