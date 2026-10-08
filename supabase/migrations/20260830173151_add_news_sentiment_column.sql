/*
# Add sentiment column to news_articles

1. Modified Tables
- `news_articles` — added `sentiment` column (text, nullable) to store the
  article's market sentiment classification: 'positive', 'negative', or 'neutral'.

2. Security
- No security changes. The existing anon+authenticated CRUD policies already
  cover the new column (updatable_columns / insertable_columns are 'all').

3. Data Update
- Backfills the `sentiment` value for the 8 existing seeded articles based on
  their headline/summary content.
*/

ALTER TABLE news_articles
  ADD COLUMN IF NOT EXISTS sentiment text;

UPDATE news_articles SET sentiment = 'positive' WHERE headline LIKE 'Technology stocks rally%';
UPDATE news_articles SET sentiment = 'positive' WHERE headline LIKE 'NVIDIA extends gains%';
UPDATE news_articles SET sentiment = 'negative' WHERE headline LIKE 'Tesla slips%';
UPDATE news_articles SET sentiment = 'neutral'  WHERE headline LIKE 'Fed officials signal%';
UPDATE news_articles SET sentiment = 'positive' WHERE headline LIKE 'Coinbase jumps%';
UPDATE news_articles SET sentiment = 'positive' WHERE headline LIKE 'Palantir wins%';
UPDATE news_articles SET sentiment = 'negative' WHERE headline LIKE 'Netflix retreats%';
UPDATE news_articles SET sentiment = 'positive' WHERE headline LIKE 'AMD surges%';
