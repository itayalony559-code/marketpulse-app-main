BEGIN;

CREATE TABLE IF NOT EXISTS public.assets (
  symbol text PRIMARY KEY,
  name text NOT NULL,
  sector text NOT NULL,
  exchange text NOT NULL DEFAULT 'NASDAQ',
  currency text NOT NULL DEFAULT 'USD',
  price numeric NOT NULL,
  change numeric NOT NULL,
  change_percent numeric NOT NULL,
  previous_close numeric NOT NULL,
  pre_market_price numeric,
  pre_market_change_percent numeric,
  after_hours_price numeric,
  after_hours_change_percent numeric,
  volume bigint,
  market_cap numeric,
  high numeric,
  low numeric,
  sparkline jsonb NOT NULL DEFAULT '[]'::jsonb,
  earnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS exchange text NOT NULL DEFAULT 'NASDAQ',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS high numeric,
  ADD COLUMN IF NOT EXISTS low numeric,
  ADD COLUMN IF NOT EXISTS earnings jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.assets SET sparkline = '[]'::jsonb WHERE sparkline IS NULL;
ALTER TABLE public.assets
  ALTER COLUMN sparkline SET DEFAULT '[]'::jsonb,
  ALTER COLUMN sparkline SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.market_indexes (
  symbol text PRIMARY KEY,
  name text NOT NULL,
  value numeric NOT NULL,
  change numeric NOT NULL,
  change_percent numeric NOT NULL,
  sparkline jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

UPDATE public.market_indexes SET sparkline = '[]'::jsonb WHERE sparkline IS NULL;
ALTER TABLE public.market_indexes
  ALTER COLUMN sparkline SET DEFAULT '[]'::jsonb,
  ALTER COLUMN sparkline SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.news_articles (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  headline text NOT NULL,
  summary text NOT NULL,
  body text[] NOT NULL DEFAULT '{}',
  source text NOT NULL,
  url text NOT NULL DEFAULT '',
  published_at timestamptz NOT NULL,
  minutes_ago integer NOT NULL DEFAULT 0,
  tickers text[] NOT NULL DEFAULT '{}',
  premium boolean NOT NULL DEFAULT false,
  category text NOT NULL,
  sentiment text NOT NULL DEFAULT 'neutral'
    CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT news_articles_category_check
    CHECK (category IN ('Markets', 'Technology', 'Earnings', 'Economy', 'Crypto'))
);

ALTER TABLE public.news_articles
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id TYPE text USING id::text,
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS body text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sentiment text DEFAULT 'neutral';

UPDATE public.news_articles SET sentiment = 'neutral' WHERE sentiment IS NULL;
ALTER TABLE public.news_articles
  ALTER COLUMN sentiment SET DEFAULT 'neutral',
  ALTER COLUMN sentiment SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  risk_level text NOT NULL CHECK (risk_level IN ('conservative', 'moderate', 'aggressive')),
  risk_score integer NOT NULL CHECK (risk_score BETWEEN 0 AND 12),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.watchlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  symbol text NOT NULL,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  change numeric NOT NULL DEFAULT 0,
  change_percent numeric NOT NULL DEFAULT 0,
  exchange text NOT NULL DEFAULT 'NASDAQ',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.watchlist_items
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS change numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS change_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exchange text NOT NULL DEFAULT 'NASDAQ';

ALTER TABLE public.watchlist_items
  DROP CONSTRAINT IF EXISTS watchlist_items_symbol_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlist_items_user_symbol
  ON public.watchlist_items (user_id, symbol);
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at
  ON public.news_articles (published_at DESC);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_indexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_assets" ON public.assets;
DROP POLICY IF EXISTS "anon_insert_assets" ON public.assets;
DROP POLICY IF EXISTS "anon_update_assets" ON public.assets;
DROP POLICY IF EXISTS "anon_delete_assets" ON public.assets;
DROP POLICY IF EXISTS "public_read_assets" ON public.assets;
CREATE POLICY "public_read_assets" ON public.assets
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_market_indexes" ON public.market_indexes;
DROP POLICY IF EXISTS "anon_insert_market_indexes" ON public.market_indexes;
DROP POLICY IF EXISTS "anon_update_market_indexes" ON public.market_indexes;
DROP POLICY IF EXISTS "anon_delete_market_indexes" ON public.market_indexes;
DROP POLICY IF EXISTS "public_read_market_indexes" ON public.market_indexes;
CREATE POLICY "public_read_market_indexes" ON public.market_indexes
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_news" ON public.news_articles;
DROP POLICY IF EXISTS "anon_insert_news" ON public.news_articles;
DROP POLICY IF EXISTS "anon_update_news" ON public.news_articles;
DROP POLICY IF EXISTS "anon_delete_news" ON public.news_articles;
DROP POLICY IF EXISTS "public_read_free_news" ON public.news_articles;
CREATE POLICY "public_read_free_news" ON public.news_articles
  FOR SELECT TO anon, authenticated USING (premium = false);

DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile" ON public.user_profiles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete own profile" ON public.user_profiles
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "anon_select_watchlist" ON public.watchlist_items;
DROP POLICY IF EXISTS "anon_insert_watchlist" ON public.watchlist_items;
DROP POLICY IF EXISTS "anon_update_watchlist" ON public.watchlist_items;
DROP POLICY IF EXISTS "anon_delete_watchlist" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can read own watchlist" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can insert own watchlist" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can update own watchlist" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can delete own watchlist" ON public.watchlist_items;
CREATE POLICY "Users can read own watchlist" ON public.watchlist_items
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert own watchlist" ON public.watchlist_items
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update own watchlist" ON public.watchlist_items
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete own watchlist" ON public.watchlist_items
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
REVOKE ALL ON public.assets, public.market_indexes, public.news_articles
  FROM anon, authenticated;
GRANT SELECT ON public.assets, public.market_indexes, public.news_articles
  TO anon, authenticated;
REVOKE ALL ON public.user_profiles, public.watchlist_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.user_profiles, public.watchlist_items TO authenticated;
GRANT ALL PRIVILEGES ON public.assets, public.market_indexes, public.news_articles,
  public.user_profiles, public.watchlist_items TO service_role;

COMMIT;