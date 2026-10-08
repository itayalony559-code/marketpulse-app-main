import { useNavigate } from 'react-router-dom';
import type { MarketSession } from '@/types';

const SESSION_LABELS: Record<MarketSession, string> = {
  'PRE-MARKET': 'Pre-Market',
  OPEN: 'Market Open',
  'AFTER-HOURS': 'After Hours',
  CLOSED: 'Market Closed',
};

const SESSION_DOT: Record<MarketSession, string> = {
  'PRE-MARKET': 'bg-amber-400',
  OPEN: 'bg-bull',
  'AFTER-HOURS': 'bg-indigo-400',
  CLOSED: 'bg-slate-500',
};

// Deterministic simulated session for the MVP
export function getMarketSession(): MarketSession {
  return 'OPEN';
}

export function MarketSessionBadge({ session }: { session: MarketSession }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-300">
      <span className={`h-2 w-2 rounded-full ${SESSION_DOT[session]} animate-pulse-soft`} />
      <span className="uppercase tracking-wide">{SESSION_LABELS[session]}</span>
    </div>
  );
}

export function HeaderMarketStatus() {
  const session = getMarketSession();
  return (
    <button
      onClick={() => {
        /* could open a status popover in the future */
      }}
      className="hidden items-center gap-2 rounded-full border border-ink-700/60 bg-ink-850 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-ink-600 sm:inline-flex"
      aria-label={`Market status: ${SESSION_LABELS[session]}`}
    >
      <span className={`h-2 w-2 rounded-full ${SESSION_DOT[session]} animate-pulse-soft`} />
      <span className="uppercase tracking-wide">{SESSION_LABELS[session]}</span>
    </button>
  );
}

export function useNavigateToSymbol() {
  const navigate = useNavigate();
  return (symbol: string) => navigate(`/markets/${symbol.toUpperCase()}`);
}
