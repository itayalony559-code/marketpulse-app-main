import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { RiskProfile, RiskProfileContextType } from '@/types';

const STORAGE_KEY = 'marketpulse_risk_profile';

const RiskProfileContext = createContext<RiskProfileContextType | undefined>(undefined);

function readStoredProfile(): RiskProfile | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<RiskProfile>;
    if (
      typeof parsed.score !== 'number' ||
      !['conservative', 'moderate', 'aggressive'].includes(parsed.level ?? '')
    ) return null;
    return {
      score: parsed.score,
      level: parsed.level as RiskProfile['level'],
      updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function RiskProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<RiskProfile | null>(readStoredProfile);

  const saveProfile = useCallback(async (nextProfile: RiskProfile) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProfile));
    } catch (error) {
      throw new Error(
        error instanceof Error ? `Risk profile could not be saved locally: ${error.message}` : 'Risk profile could not be saved locally.',
      );
    }
    setProfile(nextProfile);
  }, []);

  const clearProfile = useCallback(async () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      throw new Error(
        error instanceof Error ? `Risk profile could not be cleared locally: ${error.message}` : 'Risk profile could not be cleared locally.',
      );
    }
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ profile, saveProfile, clearProfile }),
    [profile, saveProfile, clearProfile],
  );
  return <RiskProfileContext.Provider value={value}>{children}</RiskProfileContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRiskProfile(): RiskProfileContextType {
  const context = useContext(RiskProfileContext);
  if (!context) throw new Error('useRiskProfile must be used within a RiskProfileProvider');
  return context;
}