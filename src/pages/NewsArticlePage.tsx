import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Crown, Lock } from 'lucide-react';
import { SentimentBadge } from '@/components/SentimentBadge';
import { PremiumBadge } from '@/components/Premium';
import { ErrorState } from '@/components/States';
import { useSubscription } from '@/context/SubscriptionContext';
import { getNewsById } from '@/services/marketService';

export function NewsArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isPremium } = useSubscription();
  const article = id ? getNewsById(id) : undefined;

  if (!article) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <ErrorState title="Article not found" message="This article could not be located." />
      </div>
    );
  }

  const locked = article.premium && !isPremium;

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <article className="surface p-5 sm:p-6">
        {/* Meta */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-slate-500">
          <span className="font-semibold text-slate-400">{article.source}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {article.minutesAgo} min ago
          </span>
          <span>·</span>
          <span>{article.category}</span>
          {article.premium && <PremiumBadge className="ml-auto" />}
        </div>

        {/* Sentiment */}
        <div className="mt-3">
          <SentimentBadge sentiment={article.sentiment} />
        </div>

        {/* Headline */}
        <h1 className="mt-4 text-xl font-bold leading-tight text-white sm:text-2xl">
          {article.headline}
        </h1>

        {/* Summary */}
        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-300">
          {article.summary}
        </p>

        {/* Body or paywall */}
        {locked ? (
          <div className="relative mt-5">
            <div className="space-y-3 blur-[3px] select-none">
              {article.body.slice(0, 2).map((para, i) => (
                <p key={i} className="text-sm leading-relaxed text-slate-400">
                  {para}
                </p>
              ))}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950/70 backdrop-blur-[2px]">
              <div className="flex items-center gap-2 text-gold-400">
                <Lock className="h-4 w-4" />
                <span className="text-sm font-medium text-slate-200">
                  This is a Premium article.
                </span>
              </div>
              <button
                onClick={() => navigate('/upgrade')}
                className="inline-flex items-center gap-2 rounded-lg border border-gold-500/50 bg-gold-500/15 px-4 py-2 text-sm font-semibold text-gold-400 transition-all hover:bg-gold-500/25 hover:shadow-lg hover:shadow-gold-500/10"
              >
                <Crown className="h-4 w-4" />
                Unlock Premium
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {article.body.map((para, i) => (
              <p key={i} className="text-sm leading-relaxed text-slate-400">
                {para}
              </p>
            ))}
          </div>
        )}

        {/* Related tickers */}
        <div className="mt-6 flex flex-wrap items-center gap-1.5 border-t border-ink-700/60 pt-4">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Related:
          </span>
          {article.tickers.map((t) => (
            <button
              key={t}
              onClick={() => navigate(`/markets/${t}`)}
              className="rounded-md border border-ink-700 bg-ink-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300 transition-colors hover:border-ink-600 hover:text-white"
            >
              {t}
            </button>
          ))}
        </div>
      </article>
    </div>
  );
}
