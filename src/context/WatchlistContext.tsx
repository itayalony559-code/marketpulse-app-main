import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'marketpulse_watchlist';
const DEFAULT_WATCHLIST = ['NVDA', 'AAPL', 'TSLA'];

export type WatchlistItem = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  exchange: string;
};

type WatchlistContextType = {
  watchlist: string[];
  isInWatchlist: (symbol: string) => boolean;
  toggleWatchlist: (symbol: string, details?: Omit<WatchlistItem, 'symbol'>) => void;
  addToWatchlist: (symbol: string, details?: Omit<WatchlistItem, 'symbol'>) => void;
  removeFromWatchlist: (symbol: string) => void;
};

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

function toWatchlistItem(value: unknown): WatchlistItem | undefined {
  if (typeof value === 'string') {
    const symbol = value.trim().toUpperCase();
    return symbol ? { symbol, name: symbol, price: 0, change: 0, changePercent: 0, exchange: 'NASDAQ' } : undefined;
  }
  if (!value || typeof value !== 'object') return undefined;
  const item = value as Partial<WatchlistItem>;
  if (typeof item.symbol !== 'string' || !item.symbol.trim()) return undefined;
  return {
    symbol: item.symbol.trim().toUpperCase(),
    name: typeof item.name === 'string' && item.name ? item.name : item.symbol,
    price: Number.isFinite(item.price) ? Number(item.price) : 0,
    change: Number.isFinite(item.change) ? Number(item.change) : 0,
    changePercent: Number.isFinite(item.changePercent) ? Number(item.changePercent) : 0,
    exchange: typeof item.exchange === 'string' && item.exchange ? item.exchange : 'NASDAQ',
  };
}

function readStored(): WatchlistItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WATCHLIST.map((symbol) => toWatchlistItem(symbol)!);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_WATCHLIST.map((symbol) => toWatchlistItem(symbol)!);
    return parsed.map(toWatchlistItem).filter((item): item is WatchlistItem => Boolean(item));
  } catch {
    return DEFAULT_WATCHLIST.map((symbol) => toWatchlistItem(symbol)!);
  }
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WatchlistItem[]>(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const watchlist = useMemo(() => items.map((item) => item.symbol), [items]);

  const makeItem = useCallback((symbol: string, details?: Omit<WatchlistItem, 'symbol'>): WatchlistItem => ({
    symbol: symbol.trim().toUpperCase(),
    name: details?.name || symbol.trim().toUpperCase(),
    price: details?.price ?? 0,
    change: details?.change ?? 0,
    changePercent: details?.changePercent ?? 0,
    exchange: details?.exchange || 'NASDAQ',
  }), []);

  const addToWatchlist = useCallback(
    (symbol: string, details?: Omit<WatchlistItem, 'symbol'>) => setItems((prev) => {
      const item = makeItem(symbol, details);
      const index = prev.findIndex((saved) => saved.symbol === item.symbol);
      if (index < 0) return [...prev, item];
      const next = [...prev];
      next[index] = { ...next[index], ...item };
      return next;
    }),
    [makeItem],
  );

  const removeFromWatchlist = useCallback(
    (symbol: string) => setItems((prev) => prev.filter((item) => item.symbol !== symbol.trim().toUpperCase())),
    [],
  );

  const toggleWatchlist = useCallback(
    (symbol: string, details?: Omit<WatchlistItem, 'symbol'>) => setItems((prev) => {
      const normalizedSymbol = symbol.trim().toUpperCase();
      return prev.some((item) => item.symbol === normalizedSymbol)
        ? prev.filter((item) => item.symbol !== normalizedSymbol)
        : [...prev, makeItem(normalizedSymbol, details)];
    }),
    [makeItem],
  );

  const isInWatchlist = useCallback(
    (symbol: string) => items.some((item) => item.symbol === symbol.trim().toUpperCase()),
    [items],
  );

  const value = useMemo<WatchlistContextType>(
    () => ({ watchlist, isInWatchlist, toggleWatchlist, addToWatchlist, removeFromWatchlist }),
    [watchlist, isInWatchlist, toggleWatchlist, addToWatchlist, removeFromWatchlist],
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWatchlist(): WatchlistContextType {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error('useWatchlist must be used within a WatchlistProvider');
  return ctx;
}
