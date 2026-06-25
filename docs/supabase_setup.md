# Supabase Database Setup & Production Integration

This guide details how to link the **Industrial Nexus Web Dashboard** and the **Android Worker App** to a production-ready PostgreSQL database on Supabase.

---

## 1. Create the Schema in Supabase
Run the following SQL script in your Supabase project's **SQL Editor** to initialize the central database schema. This drops any existing conflicting tables and recreates them with correct datatypes matching the Room SQLite schemas:

```sql
-- 1. Drop existing tables if they mismatch
drop table if exists public.batch_logs;
drop table if exists public.orders;
drop table if exists public.inventory;
drop table if exists public.products;
drop table if exists public.station_tokens;

-- 2. Products Table
create table public.products (
  id text not null primary key,
  name text not null,
  "englishName" text not null,
  "targetUph" integer default 1200,
  "colorHex" text default '#00875A',
  "isActive" boolean default true,
  "manualFileName" text,
  "nominalBatchDurationSec" integer default 480,
  "mixtureRatios" jsonb default '[]'::jsonb
);

-- 3. Inventory Table
create table public.inventory (
  "itemId" text not null primary key,
  name text not null,
  stock double precision default 0.0,
  unit text default 'kg',
  "lastUpdated" bigint
);

-- 4. Orders Table
create table public.orders (
  id text not null primary key,
  "productKey" text,
  "productNameEnglish" text,
  "productNameHindi" text,
  "totalBatchesScheduled" integer default 1,
  "completedBatches" integer default 0,
  status text default 'PENDING',
  timestamp bigint,
  "colorHex" text
);

-- 5. Batch Logs Table
create table public.batch_logs (
  "batchId" text not null primary key,
  "productNameHindi" text not null,
  "productNameEnglish" text not null,
  line text not null,
  "unitsProduced" integer not null,
  status text not null,
  timestamp bigint not null,
  "targetUnits" integer not null
);

-- 6. Station Tokens Table
create table public.station_tokens (
  token text not null primary key,
  "stationId" text not null,
  "issuedAt" bigint,
  "expiresAt" bigint
);

-- 7. Enable row-level security (RLS) for all tables
alter table public.products enable row level security;
alter table public.inventory enable row level security;
alter table public.orders enable row level security;
alter table public.batch_logs enable row level security;
alter table public.station_tokens enable row level security;

-- 8. Policies to allow public read/write access (standard public API key access)
create policy "Allow public access" on public.products for all using (true) with check (true);
create policy "Allow public access" on public.inventory for all using (true) with check (true);
create policy "Allow public access" on public.orders for all using (true) with check (true);
create policy "Allow public access" on public.batch_logs for all using (true) with check (true);
create policy "Allow public access" on public.station_tokens for all using (true) with check (true);
```

---

## 2. Connect the Web Dashboard (Vercel & Local)
Add the following environment variables in your Vercel Project Settings (for production) or in your local `.env` file at the root of the project:

1. **`SUPABASE_URL`**: Your Supabase project URL (e.g. `https://your-project-id.supabase.co`).
2. **`SUPABASE_ANON_KEY`**: Your Supabase project public anonymous API key.

*Once set, both the local API Express server and the Vercel Serverless Functions (`/api/*`) will automatically route incoming tablet posts, pairing validation, and dashboard queries directly to your live Supabase database.*

---

## 3. How Out-of-the-Box Flow Works (No Configuration Needed)
* **Web App**: Runs serverless function proxies. If no environment variables are present, it falls back to an in-memory database. This allows the app to load and demo instantly upon a new deployment.
* **Android Tablet App**: Connects over the internet to the production site `https://safe-inventory.vercel.app/api`. It will automatically sync batches directly to the cloud without needing any local networking or VPN setups on the shop floor.
