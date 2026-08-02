---
name: Supabase migration — manual apply required
description: The full schema is in a migration file that must be manually run in Supabase; it is not auto-applied on deploy.
---

## The rule
The schema, RLS, RPCs (`process_sepay_webhook`, `auto_cancel_expired_orders`), indexes, and seed data all live in `supabase/migrations/00001_init_schema.sql`. This file is NOT auto-applied — the user must run it manually.

**Why:** The project uses Supabase (cloud-managed Postgres), not a local database. Without running the migration, the API crashes with `Could not find the table 'public.products' in the schema cache` and `auto_cancel_expired_orders not found`.

**How to apply:** Paste the file contents into Supabase Dashboard → SQL Editor → New query → Run. Or use `supabase db push` via the CLI after `supabase link`. See `DEPLOYMENT.md §1` for full steps.
