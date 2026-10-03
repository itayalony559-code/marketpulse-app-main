# marketpulse-app

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-mvwmskmh)

## Supabase setup

This workspace is a Vite/React web app. Add these values to `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_FINNHUB_API_KEY=your-finnhub-api-key
```

Apply the migrations in `supabase/migrations`. In Supabase Authentication, enable the Google provider and add each app origin (local development and production) to the redirect URL allowlist. Existing anonymous risk-profile sessions can be linked to Google when anonymous sign-ins and manual identity linking are enabled. Risk profiles remain protected by row-level security. Deploy `send-premium-webhook` and set its `MAKE_WEBHOOK_URL` secret before expecting webhook delivery. The upgrade screen currently simulates checkout and does not process a real payment.
