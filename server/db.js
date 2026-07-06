import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.resolve(__dirname, '../nexus.db');

const db = new sqlite3.Database(DB_FILE);

console.log(`[Database] Routing local API server calls to local SQLite: ${DB_FILE}`);

// Helper to run queries with promises
export function run(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// Helper to get a single row
export function get(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Helper to get all rows
export function all(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Initialize tables
export async function initDb() {
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
      hindiName TEXT,
      type TEXT DEFAULT 'raw_material',
      stock REAL DEFAULT 0.0,
      unit TEXT DEFAULT 'kg',
      minStock REAL DEFAULT 0.0,
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
      colorHex TEXT,
      queueOrder INTEGER DEFAULT 0
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
      expiresAt INTEGER,
      isOnBreak INTEGER DEFAULT 0,
      breakStartedAt INTEGER DEFAULT 0
    )
  `);

  // Run database migrations to dynamically add missing columns to existing tables
  try {
    await run(`ALTER TABLE inventory ADD COLUMN hindiName TEXT`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE inventory ADD COLUMN type TEXT DEFAULT 'raw_material'`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE inventory ADD COLUMN minStock REAL DEFAULT 0.0`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE orders ADD COLUMN queueOrder INTEGER DEFAULT 0`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE station_tokens ADD COLUMN isOnBreak INTEGER DEFAULT 0`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE station_tokens ADD COLUMN breakStartedAt INTEGER DEFAULT 0`);
  } catch (e) {}

  // Seed baseline data if empty
  const prodCount = await get(`SELECT COUNT(*) as count FROM products`);
  if (prodCount.count === 0) {
    await seedData();
  }
}

export async function seedData() {
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
    { itemId: "ING-001", name: "Wheat Flour", hindiName: "गेंहू का आटा", type: "raw_material", stock: 12500, unit: "kg", minStock: 2000 },
    { itemId: "ING-002", name: "Refined Sugar", hindiName: "चीनी", type: "raw_material", stock: 5400, unit: "kg", minStock: 1000 },
    { itemId: "ING-003", name: "Vegetable Fats", hindiName: "वनस्पति वसा", type: "raw_material", stock: 3200, unit: "kg", minStock: 800 },
    { itemId: "ING-004", name: "Cream Flavoring", hindiName: "क्रीम फ्लेवर", type: "raw_material", stock: 650, unit: "kg", minStock: 150 },
    { itemId: "ING-005", name: "Premium Additive", hindiName: "प्रीमियम एडिटिव", type: "raw_material", stock: 450, unit: "kg", minStock: 100 },
    { itemId: "FIN-001", name: "Cream Special", hindiName: "क्रीम स्पेशल", type: "finished_good", stock: 4, unit: "batches", minStock: 2 },
    { itemId: "FIN-002", name: "Premium Plus", hindiName: "प्रीमियम प्लस", type: "finished_good", stock: 2, unit: "batches", minStock: 1 },
    { itemId: "FIN-003", name: "Standard Blend", hindiName: "मानक मिश्रण", type: "finished_good", stock: 0, unit: "batches", minStock: 1 }
  ];

  for (const i of initialInventory) {
    await run(
      `INSERT INTO inventory (itemId, name, hindiName, type, stock, unit, minStock, lastUpdated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [i.itemId, i.name, i.hindiName, i.type, i.stock, i.unit, i.minStock, Date.now()]
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
      colorHex: "#00875A",
      queueOrder: 0
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
      colorHex: "#E65100",
      queueOrder: 1
    }
  ];

  for (const o of initialOrders) {
    await run(
      `INSERT INTO orders (id, productKey, productNameEnglish, productNameHindi, totalBatchesScheduled, completedBatches, status, timestamp, colorHex, queueOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [o.id, o.productKey, o.productNameEnglish, o.productNameHindi, o.totalBatchesScheduled, o.completedBatches, o.status, o.timestamp, o.colorHex, o.queueOrder]
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
