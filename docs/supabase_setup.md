# Supabase Database Setup & Production Integration

This guide details how to link the **Industrial Nexus Web Dashboard** and the **Android Worker App** to a production-ready PostgreSQL database on Supabase.

---

## 1. Create the `batch_logs` Table in Supabase
Run the following SQL script in your Supabase project's **SQL Editor** to initialize the central database schema:

```sql
create table public.batch_logs (
  batch_id text not null primary key,
  product_name_hindi text not null,
  product_name_english text not null,
  line text not null,
  units_produced integer not null,
  status text not null,
  timestamp bigint not null,
  target_units integer not null
);

-- Enable row-level security (RLS) if required, or disable for public anonymous inserts
alter table public.batch_logs enable row level security;

-- Policy to allow anonymous read/write (standard public API key access)
create policy "Allow public read access" on public.batch_logs
  for select using (true);

create policy "Allow public write access" on public.batch_logs
  for insert with check (true);
```

---

## 2. Connect the Web Dashboard (Vercel)
When deploying the website to **Vercel**, add the following environment variables in your Vercel Project Settings:

1. **`SUPABASE_URL`**: Your Supabase project URL (e.g. `https://your-project-id.supabase.co`).
2. **`SUPABASE_ANON_KEY`**: Your Supabase project public anonymous API key.

*Once set, the Vercel Serverless Functions (`/api/logs`) will automatically route incoming tablet posts and dashboard reads directly to your live SQL database.*

---

## 3. How Out-of-the-Box Flow Works (No Configuration Needed)
* **Web App (Vercel)**: Runs a serverless function proxy. If no environment variables are present, it falls back to an in-memory database. This allows the app to load and demo instantly upon a new deployment.
* **Android Tablet App**: Connects over the internet to the production site `https://safe-inventory.vercel.app/api/logs`. It will automatically sync batches directly to the cloud without needing any local networking or VPN setups on the shop floor.
