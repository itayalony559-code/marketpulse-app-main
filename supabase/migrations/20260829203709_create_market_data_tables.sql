/*
# Create core market data tables

Creates the database schema for the MarketPulse financial market tracking app.
This is a single-tenant MVP with no authentication — all data is publicly
readable and writable by the anon-key frontend client.

## 1. New Tables

### `assets`
Stores stock/asset reference data (the 13 tracked stocks).
- `symbol` (text, primary key) — ticker symbol, e.g. "AAPL"
- `name` (text, not null) — company name, e.g. "Apple Inc."
- `sector` (text, not null) — business sector
- `price` (numeric, not null) — current price
- `change` (numeric, not null) — daily absolute change
- `change_percent` (numeric, not null) — daily percentage change
- `previous_close` (numeric, not null) — previous day closing price
- `pre_market_price` (numeric) — pre-market session price
- `pre_market_change_percent` (numeric) — pre-market percentage change
- `after_hours_price` (numeric) — after-hours session price
- `after_hours_change_percent` (numeric) — after-hours percentage change
- `volume` (bigint) — trading volume
- `market_cap` (bigint) — market capitalization
- `sparkline` (jsonb) — array of recent prices for sparkline rendering
- `updated_at` (timestamptz) — last data update timestamp

### `market_indexes`
Stores major market index values (S&P 500, Nasdaq, etc.).
- `symbol` (text, primary key) — index symbol, e.g. "SPX"
- `name` (text, not null) — index name, e.g. "S&P 500"
- `value` (numeric, not null) — current index value
- `change` (numeric, not null) — absolute change
- `change_percent` (numeric, not null) — percentage change
- `sparkline` (jsonb) — array of recent values for sparkline
- `updated_at` (timestamptz) — last update timestamp

### `news_articles`
Stores financial news articles.
- `id` (uuid, primary key) — article identifier
- `headline` (text, not null) — article headline
- `summary` (text, not null) — short summary
- `source` (text, not null) — publication source
- `published_at` (timestamptz, not null) — publication timestamp
- `minutes_ago` (integer) — minutes since publication (for display)
- `tickers` (text[]) — array of related ticker symbols
- `premium` (boolean, not null, default false) — whether article is premium-only
- `category` (text, not null) — news category
- `created_at` (timestamptz) — record creation timestamp

### `watchlist_items`
Stores watchlist entries (single-tenant, shared across all visitors).
- `id` (uuid, primary key) — entry identifier
- `symbol` (text, not null) — ticker symbol being watched
- `created_at` (timestamptz) — when added to watchlist
- Unique constraint on `symbol` to prevent duplicates

## 2. Security
- RLS enabled on all tables.
- All tables allow anon + authenticated CRUD (single-tenant, no auth, intentionally public data).
- `USING (true)` is acceptable here because the data is intentionally shared/public with no sign-in.

## 3. Indexes
- `news_articles` indexed on `published_at` for chronological queries.
- `watchlist_items` unique index on `symbol`.
*/

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
  symbol text PRIMARY KEY,
  name text NOT NULL,
  sector text NOT NULL,
  price numeric NOT NULL,
  change numeric NOT NULL,
  change_percent numeric NOT NULL,
  previous_close numeric NOT NULL,
  pre_market_price numeric,
  pre_market_change_percent numeric,
  after_hours_price numeric,
  after_hours_change_percent numeric,
  volume bigint,
  market_cap bigint,
  sparkline jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_assets" ON assets;
CREATE POLICY "anon_select_assets" ON assets FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_assets" ON assets;
CREATE POLICY "anon_insert_assets" ON assets FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_assets" ON assets;
CREATE POLICY "anon_update_assets" ON assets FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_assets" ON assets;
CREATE POLICY "anon_delete_assets" ON assets FOR DELETE
  TO anon, authenticated USING (true);

-- Market indexes table
CREATE TABLE IF NOT EXISTS market_indexes (
  symbol text PRIMARY KEY,
  name text NOT NULL,
  value numeric NOT NULL,
  change numeric NOT NULL,
  change_percent numeric NOT NULL,
  sparkline jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE market_indexes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_market_indexes" ON market_indexes;
CREATE POLICY "anon_select_market_indexes" ON market_indexes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_market_indexes" ON market_indexes;
CREATE POLICY "anon_insert_market_indexes" ON market_indexes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_market_indexes" ON market_indexes;
CREATE POLICY "anon_update_market_indexes" ON market_indexes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_market_indexes" ON market_indexes;
CREATE POLICY "anon_delete_market_indexes" ON market_indexes FOR DELETE
  TO anon, authenticated USING (true);

-- News articles table
CREATE TABLE IF NOT EXISTS news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  headline text NOT NULL,
  summary text NOT NULL,
  source text NOT NULL,
  published_at timestamptz NOT NULL,
  minutes_ago integer,
  tickers text[] DEFAULT '{}',
  premium boolean NOT NULL DEFAULT false,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_news" ON news_articles;
CREATE POLICY "anon_select_news" ON news_articles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_news" ON news_articles;
CREATE POLICY "anon_insert_news" ON news_articles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_news" ON news_articles;
CREATE POLICY "anon_update_news" ON news_articles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_news" ON news_articles;
CREATE POLICY "anon_delete_news" ON news_articles FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_news_articles_published_at
  ON news_articles (published_at DESC);

-- Watchlist items table
CREATE TABLE IF NOT EXISTS watchlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT watchlist_items_symbol_unique UNIQUE (symbol)
);

ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_watchlist" ON watchlist_items;
CREATE POLICY "anon_select_watchlist" ON watchlist_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_watchlist" ON watchlist_items;
CREATE POLICY "anon_insert_watchlist" ON watchlist_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_watchlist" ON watchlist_items;
CREATE POLICY "anon_update_watchlist" ON watchlist_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_watchlist" ON watchlist_items;
CREATE POLICY "anon_delete_watchlist" ON watchlist_items FOR DELETE
  TO anon, authenticated USING (true);
