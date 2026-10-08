import { createClient } from '@supabase/supabase-js';
import { supabaseAnonKey, supabaseUrl } from '@/lib/publicEnv';

type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          user_id: string;
          risk_level: 'conservative' | 'moderate' | 'aggressive';
          risk_score: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          risk_level: 'conservative' | 'moderate' | 'aggressive';
          risk_score: number;
          updated_at?: string;
        };
        Update: {
          risk_level?: 'conservative' | 'moderate' | 'aggressive';
          risk_score?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;