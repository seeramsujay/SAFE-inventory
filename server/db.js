import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.resolve(__dirname, '../nexus.db');

const db = new sqlite3.Database(DB_FILE);

// Load environment variables from .env manually
let supabaseUrl = process.env.SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_ANON_KEY;

try {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = (match[2] || '').trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
    supabaseUrl = process.env.SUPABASE_URL || supabaseUrl;
    supabaseKey = process.env.SUPABASE_ANON_KEY || supabaseKey;
  }
} catch (e) {
  console.error("Failed to load .env manually in db.js", e);
}

const useSupabase = !!(supabaseUrl && supabaseKey);

if (useSupabase) {
  console.log(`[Database] Routing local API server calls to Supabase: ${supabaseUrl}`);
} else {
  console.log(`[Database] Routing local API server calls to local SQLite: ${DB_FILE}`);
}

async function executeSupabaseQuery(query, params = [], mode = 'run') {
  const cleaned = query.replace(/\s+/g, ' ').trim();
  const headers = {
    'apikey': supabaseKey || '',
    'Authorization': `Bearer ${supabaseKey || ''}`,
    'Content-Type': 'application/json'
  };

  try {
    // 1. SELECT * FROM station_tokens WHERE token = ?
    if (cleaned.includes('SELECT * FROM station_tokens WHERE token = ?')) {
      const res = await fetch(`${supabaseUrl}/rest/v1/station_tokens?token=eq.${encodeURIComponent(params[0])}&select=*`, { headers });
      if (!res.ok) throw new Error(await res.text());
      const rows = await res.json();
      return rows[0] || null;
    }

    // 2. INSERT INTO station_tokens
    if (cleaned.includes('INSERT INTO station_tokens')) {
      const payload = {
        token: params[0],
        stationId: params[1],
        issuedAt: params[2],
        expiresAt: params[3]
      };
      const res = await fetch(`${supabaseUrl}/rest/v1/station_tokens`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      return { changes: 1 };
    }

    // 3. SELECT * FROM products WHERE englishName = ? OR name = ?
    if (cleaned.includes('SELECT * FROM products WHERE englishName = ? OR name = ?')) {
      const res = await fetch(`${supabaseUrl}/rest/v1/products?or=(englishName.eq.${encodeURIComponent(params[0])},name.eq.${encodeURIComponent(params[1])})&select=*`, { headers });
      if (!res.ok) throw new Error(await res.text());
      const rows = await res.json();
      if (rows[0]) {
        rows[0].mixtureRatios = typeof rows[0].mixtureRatios === 'string' ? rows[0].mixtureRatios : JSON.stringify(rows[0].mixtureRatios || []);
      }
      return rows[0] || null;
    }

    // 4. SELECT * FROM products
    if (cleaned.includes('SELECT * FROM products')) {
      const res = await fetch(`${supabaseUrl}/rest/v1/products?select=*`, { headers });
      if (!res.ok) throw new Error(await res.text());
      const rows = await res.json();
      return rows.map(r => ({
        ...r,
        mixtureRatios: typeof r.mixtureRatios === 'string' ? r.mixtureRatios : JSON.stringify(r.mixtureRatios || [])
      }));
    }

    // 5. INSERT INTO products
    if (cleaned.includes('INSERT INTO products')) {
      const payload = {
        id: params[0],
        name: params[1],
        englishName: params[2],
        targetUph: params[3],
        colorHex: params[4],
        isActive: params[5] === 1,
        manualFileName: params[6],
        nominalBatchDurationSec: params[7],
        mixtureRatios: typeof params[8] === 'string' ? JSON.parse(params[8]) : params[8]
      };
      const res = await fetch(`${supabaseUrl}/rest/v1/products`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      return { changes: 1 };
    }

    // 5.5. SELECT * FROM orders WHERE status = 'ACTIVE' LIMIT 1
    if (cleaned === "SELECT * FROM orders WHERE status = 'ACTIVE' LIMIT 1") {
      const res = await fetch(`${supabaseUrl}/rest/v1/orders?status=eq.ACTIVE&limit=1`, { headers });
      if (!res.ok) throw new Error(await res.text());
      const rows = await res.json();
      return rows[0] || null;
    }

    // 5.6. SELECT * FROM orders WHERE status = 'PENDING' ORDER BY timestamp ASC LIMIT 1
    if (cleaned === "SELECT * FROM orders WHERE status = 'PENDING' ORDER BY timestamp ASC LIMIT 1") {
      const res = await fetch(`${supabaseUrl}/rest/v1/orders?status=eq.PENDING&order=timestamp.asc&limit=1`, { headers });
      if (!res.ok) throw new Error(await res.text());
      const rows = await res.json();
      return rows[0] || null;
    }

    // 5.7. UPDATE orders SET status = 'ACTIVE' WHERE id = ?
    if (cleaned === "UPDATE orders SET status = 'ACTIVE' WHERE id = ?") {
      const res = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${params[0]}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'ACTIVE' })
      });
      if (!res.ok) throw new Error(await res.text());
      return { changes: 1 };
    }

    // 5.8. UPDATE orders SET status = 'PENDING' WHERE id != ? AND status = 'ACTIVE'
    if (cleaned === "UPDATE orders SET status = 'PENDING' WHERE id != ? AND status = 'ACTIVE'") {
      const res = await fetch(`${supabaseUrl}/rest/v1/orders?id=neq.${params[0]}&status=eq.ACTIVE`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'PENDING' })
      });
      if (!res.ok) throw new Error(await res.text());
      return { changes: 1 };
    }

    // 5.9. DELETE FROM orders WHERE id = ?
    if (cleaned === "DELETE FROM orders WHERE id = ?") {
      const res = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${params[0]}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) throw new Error(await res.text());
      return { changes: 1 };
    }

    // 6. SELECT * FROM orders WHERE ... ACTIVE LIMIT 1
    if (cleaned.includes("status = 'ACTIVE' LIMIT 1") || cleaned.includes("status = 'ACTIVE' limit 1")) {
      const name = params[0];
      const res = await fetch(`${supabaseUrl}/rest/v1/orders?status=eq.ACTIVE&or=(productNameEnglish.eq.${encodeURIComponent(name)},productNameHindi.eq.${encodeURIComponent(name)})&limit=1`, { headers });
      if (!res.ok) throw new Error(await res.text());
      const rows = await res.json();
      return rows[0] || null;
    }

    // 7. SELECT * FROM orders
    if (cleaned.includes('SELECT * FROM orders')) {
      const res = await fetch(`${supabaseUrl}/rest/v1/orders?select=*`, { headers });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    }

    // 8. INSERT INTO orders
    if (cleaned.includes('INSERT INTO orders')) {
      const payload = {
        id: params[0],
        productKey: params[1],
        productNameEnglish: params[2],
        productNameHindi: params[3],
        totalBatchesScheduled: params[4],
        completedBatches: params[5],
        status: params[6],
        timestamp: params[7],
        colorHex: params[8]
      };
      const res = await fetch(`${supabaseUrl}/rest/v1/orders`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      return { changes: 1 };
    }

    // 9. UPDATE orders SET status = ?, completedBatches = ? WHERE id = ?
    if (cleaned.includes('UPDATE orders SET status = ?, completedBatches = ? WHERE id = ?')) {
      const payload = { status: params[0], completedBatches: params[1] };
      const res = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${params[2]}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      return { changes: 1 };
    }

    // 9b. UPDATE orders SET completedBatches = ?, status = ? WHERE id = ?
    if (cleaned.includes('UPDATE orders SET completedBatches = ?, status = ? WHERE id = ?')) {
      const payload = { completedBatches: params[0], status: params[1] };
      const res = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${params[2]}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      return { changes: 1 };
    }

    // 10. UPDATE orders SET status = ? WHERE id = ?
    if (cleaned.includes('UPDATE orders SET status = ? WHERE id = ?')) {
      const payload = { status: params[0] };
      const res = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${params[1]}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      return { changes: 1 };
    }

    // 11. UPDATE orders SET completedBatches = ? WHERE id = ?
    if (cleaned.includes('UPDATE orders SET completedBatches = ? WHERE id = ?')) {
      const payload = { completedBatches: params[0] };
      const res = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${params[1]}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      return { changes: 1 };
    }

    // 12. SELECT * FROM inventory
    if (cleaned.includes('SELECT * FROM inventory')) {
      const res = await fetch(`${supabaseUrl}/rest/v1/inventory?select=*`, { headers });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    }

    // 13. UPDATE inventory SET stock = ?, lastUpdated = ? WHERE itemId = ?
    if (cleaned.includes('UPDATE inventory SET stock = ?, lastUpdated = ? WHERE itemId = ?')) {
      const payload = { stock: params[0], lastUpdated: params[1] };
      const res = await fetch(`${supabaseUrl}/rest/v1/inventory?itemId=eq.${params[2]}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      return { changes: 1 };
    }

    // 14. UPDATE inventory SET stock = MAX(0, stock - ?)
    if (cleaned.includes('UPDATE inventory SET stock = MAX(0, stock - ?), lastUpdated = ? WHERE itemId = ?')) {
      const deduct = params[0];
      const time = params[1];
      const id = params[2];
      
      const getRes = await fetch(`${supabaseUrl}/rest/v1/inventory?itemId=eq.${id}&select=stock`, { headers });
      if (getRes.ok) {
        const data = await getRes.json();
        if (data && data.length > 0) {
          const newStock = Math.max(0, (data[0].stock || 0) - deduct);
          await fetch(`${supabaseUrl}/rest/v1/inventory?itemId=eq.${id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ stock: newStock, lastUpdated: time })
          });
        }
      }
      return { changes: 1 };
    }

    // 15. UPDATE inventory SET stock = stock + 1
    if (cleaned.includes('UPDATE inventory SET stock = stock + 1, lastUpdated = ? WHERE itemId = ?')) {
      const time = params[0];
      const id = params[1];
      
      const getRes = await fetch(`${supabaseUrl}/rest/v1/inventory?itemId=eq.${id}&select=stock`, { headers });
      if (getRes.ok) {
        const data = await getRes.json();
        if (data && data.length > 0) {
          const newStock = (data[0].stock || 0) + 1;
          await fetch(`${supabaseUrl}/rest/v1/inventory?itemId=eq.${id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ stock: newStock, lastUpdated: time })
          });
        }
      }
      return { changes: 1 };
    }

    // 16. SELECT * FROM batch_logs WHERE batchId = ?
    if (cleaned.includes('SELECT * FROM batch_logs WHERE batchId = ?')) {
      const res = await fetch(`${supabaseUrl}/rest/v1/batch_logs?batchId=eq.${params[0]}&select=*`, { headers });
      if (!res.ok) throw new Error(await res.text());
      const rows = await res.json();
      return rows[0] || null;
    }

    // 17. INSERT INTO batch_logs
    if (cleaned.includes('INSERT INTO batch_logs')) {
      const payload = {
        batchId: params[0],
        productNameHindi: params[1],
        productNameEnglish: params[2],
        line: params[3],
        unitsProduced: params[4],
        status: params[5],
        timestamp: params[6],
        targetUnits: params[7]
      };
      const res = await fetch(`${supabaseUrl}/rest/v1/batch_logs`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      return { changes: 1 };
    }

    // 18. SELECT * FROM batch_logs
    if (cleaned.includes('SELECT * FROM batch_logs')) {
      const res = await fetch(`${supabaseUrl}/rest/v1/batch_logs?select=*&order=timestamp.desc`, { headers });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    }

    // 19. DELETE FROM batch_logs
    if (cleaned.includes('DELETE FROM batch_logs')) {
      const res = await fetch(`${supabaseUrl}/rest/v1/batch_logs?select=*`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error(await res.text());
      return { changes: 1 };
    }

    // 20. Reset order 1001
    if (cleaned.includes("UPDATE orders SET completedBatches = 0, status = 'ACTIVE' WHERE id = 'ORD-1001'")) {
      const res = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.ORD-1001`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ completedBatches: 0, status: 'ACTIVE' })
      });
      if (!res.ok) throw new Error(await res.text());
      return { changes: 1 };
    }

    // 21. Reset order 1002
    if (cleaned.includes("UPDATE orders SET completedBatches = 0, status = 'PENDING' WHERE id = 'ORD-1002'")) {
      const res = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.ORD-1002`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ completedBatches: 0, status: 'PENDING' })
      });
      if (!res.ok) throw new Error(await res.text());
      return { changes: 1 };
    }

    console.warn("[Database] Unhandled Supabase query mapping:", cleaned);
    return null;
  } catch (err) {
    console.error("[Database] Supabase query execution failed:", err.message);
    throw err;
  }
}

// Helper to run queries with promises
export function run(query, params = []) {
  if (useSupabase) {
    return executeSupabaseQuery(query, params, 'run');
  }
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// Helper to get a single row
export function get(query, params = []) {
  if (useSupabase) {
    return executeSupabaseQuery(query, params, 'get');
  }
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Helper to get all rows
export function all(query, params = []) {
  if (useSupabase) {
    return executeSupabaseQuery(query, params, 'all');
  }
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Initialize tables
export async function initDb() {
  if (useSupabase) {
    console.log("[Database] Checking Supabase connectivity...");
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/products?select=id&limit=1`, {
        headers: {
          'apikey': supabaseKey || '',
          'Authorization': `Bearer ${supabaseKey || ''}`
        }
      });
      if (res.ok) {
        console.log("[Database] Supabase connection is healthy and tables are accessible!");
      } else {
        console.warn("[Database] Supabase connection returned status:", res.status);
      }
    } catch (e) {
      console.error("[Database] Supabase connection failed during init:", e.message);
    }
    return;
  }

  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      englishName TEXT NOT NULL,
      targetUph INTEGER DEFAULT 1200,
      colorHex TEXT DEFAULT '#00875A',
      isActive INTEGER DEFAULT 1,
      manualFileName TEXT,
      nominalBatchDurationSec INTEGER DEFAULT 480,
      mixtureRatios TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS inventory (
      itemId TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      stock REAL DEFAULT 0.0,
      unit TEXT DEFAULT 'kg',
      lastUpdated INTEGER
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      productKey TEXT,
      productNameEnglish TEXT,
      productNameHindi TEXT,
      totalBatchesScheduled INTEGER DEFAULT 1,
      completedBatches INTEGER DEFAULT 0,
      status TEXT DEFAULT 'PENDING',
      timestamp INTEGER,
      colorHex TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS batch_logs (
      batchId TEXT PRIMARY KEY,
      productNameHindi TEXT,
      productNameEnglish TEXT,
      line TEXT,
      unitsProduced INTEGER,
      status TEXT,
      timestamp INTEGER,
      targetUnits INTEGER
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS station_tokens (
      token TEXT PRIMARY KEY,
      stationId TEXT NOT NULL,
      issuedAt INTEGER,
      expiresAt INTEGER
    )
  `);

  // Seed baseline data if empty
  const prodCount = await get(`SELECT COUNT(*) as count FROM products`);
  if (prodCount.count === 0) {
    await seedData();
  }
}

export async function seedData() {
  if (useSupabase) {
    console.log("[Database] Seeding Supabase database...");
    const headers = {
      'apikey': supabaseKey || '',
      'Authorization': `Bearer ${supabaseKey || ''}`,
      'Content-Type': 'application/json'
    };

    try {
      // Clear tables
      const tables = ['batch_logs', 'orders', 'inventory', 'products', 'station_tokens'];
      for (const table of tables) {
        await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, { method: 'DELETE', headers });
      }

      // Seed baseline station token
      await fetch(`${supabaseUrl}/rest/v1/station_tokens`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          token: 'DASHBOARD-DEV-TOKEN',
          stationId: 'WEB-DASHBOARD',
          issuedAt: Date.now(),
          expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000
        })
      });

      // Seed Products
      const initialProducts = [
        {
          id: "PRD-001",
          name: "क्रीम स्पेशल",
          englishName: "Cream Special",
          targetUph: 1200,
          colorHex: "#00875A",
          isActive: true,
          manualFileName: "Cream_Special_Ops_v2.pdf",
          nominalBatchDurationSec: 480,
          mixtureRatios: [
            { ingredientId: "ING-001", percentage: 40 },
            { ingredientId: "ING-002", percentage: 35 },
            { ingredientId: "ING-003", percentage: 15 },
            { ingredientId: "ING-004", percentage: 10 }
          ]
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
          mixtureRatios: [
            { ingredientId: "ING-001", percentage: 30 },
            { ingredientId: "ING-002", percentage: 45 },
            { ingredientId: "ING-003", percentage: 15 },
            { ingredientId: "ING-005", percentage: 10 }
          ]
        }
      ];
      await fetch(`${supabaseUrl}/rest/v1/products`, { method: 'POST', headers, body: JSON.stringify(initialProducts) });

      // Seed Inventory
      const initialInventory = [
        { itemId: "ING-001", name: "Wheat Flour", stock: 12500, unit: "kg", lastUpdated: Date.now() },
        { itemId: "ING-002", name: "Refined Sugar", stock: 5400, unit: "kg", lastUpdated: Date.now() },
        { itemId: "ING-003", name: "Vegetable Fats", stock: 3200, unit: "kg", lastUpdated: Date.now() },
        { itemId: "ING-004", name: "Cream Flavoring", stock: 650, unit: "kg", lastUpdated: Date.now() },
        { itemId: "ING-005", name: "Premium Additive", stock: 450, unit: "kg", lastUpdated: Date.now() },
        { itemId: "FIN-001", name: "Cream Special", stock: 4, unit: "batches", lastUpdated: Date.now() },
        { itemId: "FIN-002", name: "Premium Plus", stock: 2, unit: "batches", lastUpdated: Date.now() },
        { itemId: "FIN-003", name: "Standard Blend", stock: 0, unit: "batches", lastUpdated: Date.now() }
      ];
      await fetch(`${supabaseUrl}/rest/v1/inventory`, { method: 'POST', headers, body: JSON.stringify(initialInventory) });

      // Seed Orders
      const initialOrders = [
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
      await fetch(`${supabaseUrl}/rest/v1/orders`, { method: 'POST', headers, body: JSON.stringify(initialOrders) });

      // Seed Batch Logs
      const initialLogs = [
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
      await fetch(`${supabaseUrl}/rest/v1/batch_logs`, { method: 'POST', headers, body: JSON.stringify(initialLogs) });
      
      console.log("[Database] Supabase seeding complete!");
    } catch (e) {
      console.error("[Database] Supabase seeding failed:", e.message);
    }
    return;
  }

  // Clear tables
  await run(`DELETE FROM products`);
  await run(`DELETE FROM inventory`);
  await run(`DELETE FROM orders`);
  await run(`DELETE FROM batch_logs`);
  await run(`DELETE FROM station_tokens`);

  await run(
    `INSERT INTO station_tokens (token, stationId, issuedAt, expiresAt) VALUES (?, ?, ?, ?)`,
    ['DASHBOARD-DEV-TOKEN', 'WEB-DASHBOARD', Date.now(), Date.now() + 365 * 24 * 60 * 60 * 1000]
  );

  // Seed Products
  const initialProducts = [
    {
      id: "PRD-001",
      name: "क्रीम स्पेशल",
      englishName: "Cream Special",
      targetUph: 1200,
      colorHex: "#00875A",
      isActive: 1,
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
      isActive: 1,
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

  for (const p of initialProducts) {
    await run(
      `INSERT INTO products (id, name, englishName, targetUph, colorHex, isActive, manualFileName, nominalBatchDurationSec, mixtureRatios)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.name, p.englishName, p.targetUph, p.colorHex, p.isActive, p.manualFileName, p.nominalBatchDurationSec, p.mixtureRatios]
    );
  }

  // Seed Inventory
  const initialInventory = [
    { itemId: "ING-001", name: "Wheat Flour", stock: 12500, unit: "kg" },
    { itemId: "ING-002", name: "Refined Sugar", stock: 5400, unit: "kg" },
    { itemId: "ING-003", name: "Vegetable Fats", stock: 3200, unit: "kg" },
    { itemId: "ING-004", name: "Cream Flavoring", stock: 650, unit: "kg" },
    { itemId: "ING-005", name: "Premium Additive", stock: 450, unit: "kg" },
    { itemId: "FIN-001", name: "Cream Special", stock: 4, unit: "batches" },
    { itemId: "FIN-002", name: "Premium Plus", stock: 2, unit: "batches" },
    { itemId: "FIN-003", name: "Standard Blend", stock: 0, unit: "batches" }
  ];

  for (const i of initialInventory) {
    await run(
      `INSERT INTO inventory (itemId, name, stock, unit, lastUpdated) VALUES (?, ?, ?, ?, ?)`,
      [i.itemId, i.name, i.stock, i.unit, Date.now()]
    );
  }

  // Seed default orders
  const initialOrders = [
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

  for (const o of initialOrders) {
    await run(
      `INSERT INTO orders (id, productKey, productNameEnglish, productNameHindi, totalBatchesScheduled, completedBatches, status, timestamp, colorHex)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [o.id, o.productKey, o.productNameEnglish, o.productNameHindi, o.totalBatchesScheduled, o.completedBatches, o.status, o.timestamp, o.colorHex]
    );
  }

  // Seed default batch logs
  const initialLogs = [
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

  for (const l of initialLogs) {
    await run(
      `INSERT INTO batch_logs (batchId, productNameHindi, productNameEnglish, line, unitsProduced, status, timestamp, targetUnits)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [l.batchId, l.productNameHindi, l.productNameEnglish, l.line, l.unitsProduced, l.status, l.timestamp, l.targetUnits]
    );
  }
}
