import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { PremiumBadge, PremiumLock } from '@/components/Premium';
import { SentimentBadge } from '@/components/SentimentBadge';
import { useSubscription } from '@/context/SubscriptionContext';
import type { NewsArticle } from '@/types';

export function NewsCard({ article }: { article: NewsArticle }) {
  const navigate = useNavigate();
  const { isPremium } = useSubscription();
  const locked = article.premium && !isPremium;

  const open = () => {
    if (locked) {
      navigate('/upgrade');
    } else {
      navigate(`/news/${article.id}`);
    }
  };

  return (
    <article
      onClick={open}
      className={`surface group relative cursor-pointer overflow-hidden p-4 transition-all hover:border-ink-600 ${
        locked ? 'hover:bg-ink-850/60' : 'hover:bg-ink-850'
      }`}
    >
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-500">
        <span className="font-semibold text-slate-400">{article.source}</span>
        <span>·</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          {article.minutesAgo} min ago
        </span>
        {article.premium && <PremiumBadge className="ml-auto" />}
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <SentimentBadge sentiment={article.sentiment} />
      </div>

      <h3
        className={`mt-2.5 text-sm font-semibold leading-snug text-slate-100 ${
          locked ? 'blur-[1px] select-none' : 'group-hover:text-white'
        }`}
      >
        {article.headline}
      </h3>
      <p
        className={`mt-1.5 text-xs leading-relaxed text-slate-400 ${
          locked ? 'blur-[2px] select-none' : ''
        }`}
      >
        {article.summary}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {article.tickers.map((t) => (
          <span
            key={t}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/markets/${t}`);
            }}
            className="rounded-md border border-ink-700 bg-ink-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300 transition-colors hover:border-ink-600 hover:text-white"
          >
            {t}
          </span>
        ))}
        {locked && <PremiumLock className="ml-auto" />}
      </div>
    </article>
  );
}
