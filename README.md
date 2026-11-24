# SETUP — CMC Growth Store v2.0 (vercel + supabase)

Conscious Mind Concepts (Pty) Ltd · fresh deployment 2026-11-24, own vercel
project and url, completely separate from the older
conscious-mind-concepts.vercel.app (which stays untouched)
Port of the PHP/SQLite build v1.3.0 — same behaviour, Ozow flow unchanged.

## What exists here

- Next.js 15 (App Router, TypeScript) storefront + admin
- Supabase Postgres (schema in supabase/migrations/) + private storage buckets
- Ozow PayRedirect checkout, hash + amount + status-API verified notifications
- Expiring single-use downloads from private buckets (PDF) + streaming media
- Newsletter freebie auto-delivery (v1.3 parity)
- Admin: dashboard, orders, products (upload PDF then publish), media library
  (magic-byte sniffed), newsletter, settings, first-run setup page
- `npm run verify` — 40 checks over security/parity invariants

## One-time setup (about 15 minutes)

1. supabase.com → New project (name it cmc-growth-store, pick a region near
   South Africa, eu-west-1/eu-central-1 is fine; set a DB password you keep).
2. In the Supabase SQL Editor run, in order:
     supabase/migrations/0001_init.sql
     supabase/migrations/0002_seed.sql
3. Project Settings → API: copy the Project URL and the service_role key
   (secret). Never the anon key — this app only uses the service role
   server-side; RLS blocks everything else.
4. github.com → create an empty repo, push this folder to it.
5. vercel.com → Add New Project → import the repo. Framework auto-detects
   Next.js. Before deploying, add Environment Variables (all environments):
     SUPABASE_URL          = https://<ref>.supabase.co
     SUPABASE_SERVICE_KEY  = <service_role key>
     SESSION_SECRET        = <openssl rand -hex 32>
     OZOW_PRIVATE_KEY      = (from admin.ozow.com)
     OZOW_API_KEY          = (from admin.ozow.com)
     SITE_URL              = https://conscious-mind-concepts.vercel.app
     MAIN_SITE_URL         = https://conscious-mind-concepts.vercel.app
   SMTP is optional at first — without it, fulfilment emails log to mail_log
   and downloads stay available in the buyer's library.
6. Deploy. Open <deployment>/admin/setup ONCE to create your admin user
   (the page locks itself forever after the first admin exists).
7. Ozow merchant admin: set the site's Notify URL to
     https://<the-new-vercel-url>/api/ozow/notify
   and copy the Site Code into Admin → Settings. Keep Test mode ON first.
8. Live URL (holder decision 2026-11-24): this project deploys as a NEW
   vercel project with its own url. Set SITE_URL and MAIN_SITE_URL to that
   new url. The older conscious-mind-concepts.vercel.app is a separate
   project and is NOT touched by this repo.

## Test checklist before going live (same as the PHP build)

1. Store loads, fonts/styles match the main site.
2. Add to cart works; totals correct in ZAR; LAUNCH10 applies (10%).
3. Checkout creates an order; redirect reaches pay.ozow.com (test mode).
4. Success/cancel/error land correctly; order status page honest.
5. Live R1 transaction: PAID in admin, entitlements created, download works,
   download limit respected, replayed notify does not double-fulfil.
6. Newsletter signup delivers freebies only once their PDF is uploaded.
7. Publishing a product without a file stays blocked.

## Local development

    npm install
    cp .env.example .env.local   # fill in
    npm run dev                  # http://localhost:3100

## Notes

- Every table has RLS denying anon/authenticated access; the app uses the
  service role server-side only. No Supabase key ships to the browser.
- Money is integer cents everywhere; amounts are always recalculated
  server-side from the DB at checkout. The browser never sends an amount.
- The notify endpoint responds 200 to everything (Ozow retry semantics) but
  only flips PAID after hash + amount + reference + status-API checks pass.
