import pg from 'pg';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env file manually
let supabaseUrl = '';
try {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = (match[2] || '').trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.substring(1, value.length - 1);
        if (key === 'SUPABASE_URL') supabaseUrl = value;
      }
    });
  }
} catch (e) {
  console.error("Failed to load .env manually", e);
}

if (!supabaseUrl) {
  console.error("Error: SUPABASE_URL not found in root .env file!");
  process.exit(1);
}

// Extract project reference ID from SUPABASE_URL (e.g., https://yzxikzlrhjgjymuwqnsl.supabase.co)
const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!match) {
  console.error("Error: Invalid SUPABASE_URL format in .env!");
  process.exit(1);
}
const projId = match[1];
const host = `db.${projId}.supabase.co`;

console.log("--------------------------------------------------");
console.log(`Supabase Project Host: ${host}`);
console.log("--------------------------------------------------");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Please enter your Supabase Database Password: ', async (password) => {
  rl.close();
  
  if (!password) {
    console.error("Password cannot be empty!");
    process.exit(1);
  }

  const connectionString = `postgres://postgres:${encodeURIComponent(password)}@${host}:5432/postgres`;
  
  const client = new pg.Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log("Connecting to Supabase PostgreSQL database...");
    await client.connect();
    console.log("Connected successfully!");

    console.log("Executing SQL schema setup script...");
    
    const sql = `
      -- 1. Drop existing tables if they mismatch
      drop table if exists public.batch_logs cascade;
      drop table if exists public.orders cascade;
      drop table if exists public.inventory cascade;
      drop table if exists public.products cascade;
      drop table if exists public.station_tokens cascade;

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
    `;

    await client.query(sql);
    console.log("SQL Schema initialized successfully in Supabase!");

    console.log("Seeding baseline database records...");
    
    // 1. Seed Station Token
    await client.query(
      `INSERT INTO public.station_tokens (token, "stationId", "issuedAt", "expiresAt") VALUES ($1, $2, $3, $4)`,
      ['DASHBOARD-DEV-TOKEN', 'WEB-DASHBOARD', Date.now(), Date.now() + 365 * 24 * 60 * 60 * 1000]
    );

    // 2. Seed Products
    const products = [
      {
        id: "PRD-001",
        name: "क्रीम स्पेशल",
        englishName: "Cream Special",
        targetUph: 1200,
        colorHex: "#00875A",
        isActive: true,
        manualFileName: "Cream_Special_Ops_v2.pdf",
        nominalBatchDurationSec: 480,
        mixtureRatios: JSON.stringify([
          { ingredientId: "ING-001", percentage: 40 },
          { ingredientId: "ING-002", percentage: 35 },
          { ingredientId: "ING-003", percentage: 15 },
          { ingredientId: "ING-004", percentage: 10 }
        ])
      },
      {
        id: "PRD-002",
        name: "प्रीमियम प्लस",
        englishName: "Premium Plus",
        targetUph: 1500,
        colorHex: "#E65100",
        isActive: true,
        manualFileName: "Premium_Plus_Standard_v4.pdf",
        nominalBatchDurationSec: 600,
        mixtureRatios: JSON.stringify([
          { ingredientId: "ING-001", percentage: 30 },
          { ingredientId: "ING-002", percentage: 45 },
          { ingredientId: "ING-003", percentage: 15 },
          { ingredientId: "ING-005", percentage: 10 }
        ])
      }
    ];

    for (const p of products) {
      await client.query(
        `INSERT INTO public.products (id, name, "englishName", "targetUph", "colorHex", "isActive", "manualFileName", "nominalBatchDurationSec", "mixtureRatios")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [p.id, p.name, p.englishName, p.targetUph, p.colorHex, p.isActive, p.manualFileName, p.nominalBatchDurationSec, p.mixtureRatios]
      );
    }

    // 3. Seed Inventory
    const inventory = [
      { itemId: "ING-001", name: "Wheat Flour", stock: 12500, unit: "kg" },
      { itemId: "ING-002", name: "Refined Sugar", stock: 5400, unit: "kg" },
      { itemId: "ING-003", name: "Vegetable Fats", stock: 3200, unit: "kg" },
      { itemId: "ING-004", name: "Cream Flavoring", stock: 650, unit: "kg" },
      { itemId: "ING-005", name: "Premium Additive", stock: 450, unit: "kg" },
      { itemId: "FIN-001", name: "Cream Special", stock: 4, unit: "batches" },
      { itemId: "FIN-002", name: "Premium Plus", stock: 2, unit: "batches" },
      { itemId: "FIN-003", name: "Standard Blend", stock: 0, unit: "batches" }
    ];

    for (const i of inventory) {
      await client.query(
        `INSERT INTO public.inventory ("itemId", name, stock, unit, "lastUpdated") VALUES ($1, $2, $3, $4, $5)`,
        [i.itemId, i.name, i.stock, i.unit, Date.now()]
      );
    }

    // 4. Seed Orders
    const orders = [
      {
        id: "ORD-1001",
        productKey: "PRD-001",
        productNameEnglish: "Cream Special",
        productNameHindi: "क्रीम स्पेशल",
        totalBatchesScheduled: 14,
        completedBatches: 4,
        status: "ACTIVE",
        timestamp: Date.now() - 3 * 3600000,
        colorHex: "#00875A"
      },
      {
        id: "ORD-1002",
        productKey: "PRD-002",
        productNameEnglish: "Premium Plus",
        productNameHindi: "प्रीमियम प्लस",
        totalBatchesScheduled: 8,
        completedBatches: 0,
        status: "PENDING",
        timestamp: Date.now() - 1.5 * 3600000,
        colorHex: "#E65100"
      }
    ];

    for (const o of orders) {
      await client.query(
        `INSERT INTO public.orders (id, "productKey", "productNameEnglish", "productNameHindi", "totalBatchesScheduled", "completedBatches", status, timestamp, "colorHex")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [o.id, o.productKey, o.productNameEnglish, o.productNameHindi, o.totalBatchesScheduled, o.completedBatches, o.status, o.timestamp, o.colorHex]
      );
    }

    // 5. Seed Batch Logs
    const logs = [
      {
        batchId: "ORD-1001-B1",
        productNameHindi: "क्रीम स्पेशल",
        productNameEnglish: "Cream Special",
        line: "Line A",
        unitsProduced: 600,
        status: "Success",
        timestamp: Date.now() - 3 * 3600000,
        targetUnits: 600
      },
      {
        batchId: "ORD-1001-B2",
        productNameHindi: "क्रीम स्पेशल",
        productNameEnglish: "Cream Special",
        line: "Line A",
        unitsProduced: 600,
        status: "Success",
        timestamp: Date.now() - 2.5 * 3600000,
        targetUnits: 600
      },
      {
        batchId: "ORD-1001-B3",
        productNameHindi: "क्रीम स्पेशल",
        productNameEnglish: "Cream Special",
        line: "Line A",
        unitsProduced: 600,
        status: "Success",
        timestamp: Date.now() - 2 * 3600000,
        targetUnits: 600
      },
      {
        batchId: "ORD-1001-B4",
        productNameHindi: "क्रीम स्पेशल",
        productNameEnglish: "Cream Special",
        line: "Line A",
        unitsProduced: 600,
        status: "Success",
        timestamp: Date.now() - 1.5 * 3600000,
        targetUnits: 600
      }
    ];

    for (const l of logs) {
      await client.query(
        `INSERT INTO public.batch_logs ("batchId", "productNameHindi", "productNameEnglish", line, "unitsProduced", status, timestamp, "targetUnits")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [l.batchId, l.productNameHindi, l.productNameEnglish, l.line, l.unitsProduced, l.status, l.timestamp, l.targetUnits]
      );
    }

    console.log("Supabase seeding completed successfully!");

  } catch (err) {
    console.error("Database operation failed:", err.message);
  } finally {
    await client.end();
    console.log("Database connection closed.");
    process.exit(0);
  }
});
