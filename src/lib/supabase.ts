import { createClient } from '@supabase/supabase-js';

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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;