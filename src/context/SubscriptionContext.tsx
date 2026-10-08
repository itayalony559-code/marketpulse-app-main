import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SubscriptionContextType } from '@/types';
import { supabaseAnonKey, supabaseUrl } from '@/lib/publicEnv';

const STORAGE_KEY = 'marketpulse_is_premium';

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState<boolean>(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isPremium));
    } catch {
      /* ignore */
    }
  }, [isPremium]);

  const activatePremium = useCallback(async (email: string, plan: 'Monthly' | 'Yearly') => {
    setIsPremium(true);

    try {
      if (!supabaseUrl || !supabaseAnonKey) return false;
      const functionUrl = `${supabaseUrl}/functions/v1/send-premium-webhook`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          email,
          plan,
          amount: plan === 'Monthly' ? 19 : 190,
          currency: 'USD',
          timestamp: new Date().toISOString(),
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  const resetPremium = useCallback(() => setIsPremium(false), []);

  const value = useMemo<SubscriptionContextType>(
    () => ({ isPremium, activatePremium, resetPremium }),
    [isPremium, activatePremium, resetPremium],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSubscription(): SubscriptionContextType {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within a SubscriptionProvider');
  return ctx;
}
