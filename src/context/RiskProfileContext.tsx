import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { RiskProfile, RiskProfileContextType } from '@/types';
import { supabase } from '@/lib/supabase';

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

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!supabase) return;
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return;
      const { data, error: profileError } = await supabase
        .from('user_profiles')
        .select('risk_level, risk_score, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!active || profileError || !data) return;

      const remoteProfile: RiskProfile = {
        score: data.risk_score,
        level: data.risk_level,
        updatedAt: data.updated_at,
      };
      setProfile(remoteProfile);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteProfile));
      } catch {
        // The Supabase profile remains available on the next visit.
      }
    }
    void loadProfile().catch(() => undefined);
    return () => { active = false; };
  }, []);

  const saveProfile = useCallback(async (nextProfile: RiskProfile) => {
    setProfile(nextProfile);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProfile));
    } catch {
      // Supabase remains the durable store when browser storage is unavailable.
    }

    if (!supabase) throw new Error('Supabase is not configured.');

    let { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      const result = await supabase.auth.signInAnonymously();
      user = result.data.user;
      error = result.error;
    }
    if (error || !user) throw new Error(error?.message ?? 'Unable to create a profile session.');

    const { error: saveError } = await supabase.from('user_profiles').upsert({
      user_id: user.id,
      risk_level: nextProfile.level,
      risk_score: nextProfile.score,
      updated_at: nextProfile.updatedAt,
    });
    if (saveError) throw new Error(saveError.message);
  }, []);

  const clearProfile = useCallback(async () => {
    setProfile(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // The in-memory profile is still cleared for this session.
    }
    if (!supabase) return;
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return;
    const { error: deleteError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', user.id);
    if (deleteError) throw new Error(deleteError.message);
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