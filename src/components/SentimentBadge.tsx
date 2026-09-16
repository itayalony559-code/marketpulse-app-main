import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { NewsSentiment } from '@/types';

const CONFIG: Record<NewsSentiment, { label: string; icon: typeof TrendingUp; classes: string }> = {
  positive: {
    label: 'Bullish',
    icon: TrendingUp,
    classes: 'border-bull/40 bg-bull/10 text-bull',
  },
  negative: {
    label: 'Bearish',
    icon: TrendingDown,
    classes: 'border-bear/40 bg-bear/10 text-bear',
  },
  neutral: {
    label: 'Neutral',
    icon: Minus,
    classes: 'border-slate-600/40 bg-slate-700/30 text-slate-400',
  },
};

export function SentimentBadge({ sentiment }: { sentiment: NewsSentiment }) {
  const { label, icon: Icon, classes } = CONFIG[sentiment];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${classes}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}
