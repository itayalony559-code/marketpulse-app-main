import { Lock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSubscription } from '@/context/SubscriptionContext';

export function PremiumBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-gold-500/40 bg-gold-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-400 ${className}`}
    >
      <Sparkles className="h-2.5 w-2.5" />
      Premium
    </span>
  );
}

export function PremiumLock({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-ink-600 bg-ink-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 ${className}`}
    >
      <Lock className="h-2.5 w-2.5" />
      Locked
    </span>
  );
}

type PremiumGateProps = {
  children?: React.ReactNode;
  preview?: React.ReactNode;
  message?: string;
  cta?: string;
  className?: string;
};

export function PremiumGate({
  children,
  preview,
  message = 'Unlock Premium to access this content.',
  cta = 'Unlock Premium',
  className = '',
}: PremiumGateProps) {
  const { isPremium } = useSubscription();

  if (isPremium) return <>{children}</>;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {preview && <div className="pointer-events-none select-none blur-sm opacity-60">{preview}</div>}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950/70 backdrop-blur-[2px]">
        <div className="flex items-center gap-2 text-gold-400">
          <Lock className="h-4 w-4" />
          <span className="text-sm font-medium text-slate-200">{message}</span>
        </div>
        <Link
          to="/upgrade"
          className="inline-flex items-center gap-2 rounded-lg border border-gold-500/50 bg-gold-500/15 px-4 py-2 text-sm font-semibold text-gold-400 transition-all hover:bg-gold-500/25 hover:shadow-lg hover:shadow-gold-500/10"
        >
          <Sparkles className="h-4 w-4" />
          {cta}
        </Link>
      </div>
    </div>
  );
}
