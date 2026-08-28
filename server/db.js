import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.resolve(__dirname, '../nexus.db');

export const db = new sqlite3.Database(DB_FILE);

// Enable WAL (Write-Ahead Logging) for crash/power-cut safety.
// WAL writes to a separate log file and only merges on checkpoint, so a power cut
// mid-write cannot corrupt the main DB file. FULL synchronous ensures OS flushes to disk.
db.serialize(() => {
  db.run('PRAGMA journal_mode = WAL;');
  db.run('PRAGMA synchronous = FULL;');
  db.run('PRAGMA wal_autocheckpoint = 100;'); // checkpoint every 100 pages (~400KB)
  db.run('PRAGMA busy_timeout = 5000;');      // wait up to 5s on DB lock instead of failing
});

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
      requiresGrinding INTEGER DEFAULT 0,
      stage TEXT DEFAULT 'mixer',
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
      targetUnits INTEGER,
      feedbackQuality TEXT,
      feedbackTexture TEXT,
      feedbackNotes TEXT,
      feedbackRating INTEGER DEFAULT 5
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS station_tokens (
      token TEXT PRIMARY KEY,
      stationId TEXT NOT NULL,
      stationType TEXT DEFAULT 'mixer',
      issuedAt INTEGER,
      expiresAt INTEGER,
      isOnBreak INTEGER DEFAULT 0,
      breakStartedAt INTEGER DEFAULT 0
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'inventory-manager',
      name TEXT NOT NULL,
      nameHi TEXT,
      stationType TEXT,
      stationId TEXT,
      createdAt INTEGER
    )
  `);

  // Auto-seed default users if empty
  try {
    const userCount = await get(`SELECT COUNT(*) as count FROM users`);
    if (!userCount || userCount.count === 0) {
      await run(
        `INSERT INTO users (id, username, password, role, name, nameHi, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['USR-ADMIN', 'admin', 'admin123', 'admin', 'Plant Administrator', 'संयंत्र व्यवस्थापक', Date.now()]
      );
      await run(
        `INSERT INTO users (id, username, password, role, name, nameHi, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['USR-INV-01', 'inventory', 'inv123', 'inventory-manager', 'Inventory Manager', 'इन्वेंटरी प्रबंधक', Date.now()]
      );
      await run(
        `INSERT INTO users (id, username, password, role, name, nameHi, stationType, stationId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['USR-GRIND-01', 'grinder', '1111', 'operator', 'Grinder Operator', 'पिसाई ऑपरेटर', 'grinder', 'GRINDER-01', Date.now()]
      );
      await run(
        `INSERT INTO users (id, username, password, role, name, nameHi, stationType, stationId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['USR-MIX-01', 'mixer', '2222', 'operator', 'Mixer Operator', 'मिश्रण ऑपरेटर', 'mixer', 'MIXER-01', Date.now()]
      );
    }
  } catch (err) {
    console.error('Error initializing users table:', err);
  }

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
    await run(`ALTER TABLE inventory ADD COLUMN requiresGrinding INTEGER DEFAULT 0`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE inventory ADD COLUMN stage TEXT DEFAULT 'mixer'`);
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
  try {
    await run(`ALTER TABLE station_tokens ADD COLUMN stationType TEXT DEFAULT 'mixer'`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE batch_logs ADD COLUMN feedbackQuality TEXT`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE batch_logs ADD COLUMN feedbackTexture TEXT`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE batch_logs ADD COLUMN feedbackNotes TEXT`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE batch_logs ADD COLUMN feedbackRating INTEGER DEFAULT 5`);
  } catch (e) {}

  // Auto-migrate: ensure Maize (ING-006) exists in inventory
  const maizeItem = await get(`SELECT * FROM inventory WHERE itemId = 'ING-006'`);
  if (!maizeItem) {
    await run(
      `INSERT INTO inventory (itemId, name, hindiName, type, stock, unit, minStock, requiresGrinding, stage, lastUpdated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['ING-006', 'Raw Maize (Corn)', 'साबुत मक्का', 'raw_material', 8500, 'kg', 1500, 1, 'grinder', Date.now()]
    );
  }

  // Auto-migrate: ensure Grinder and Mixer station tokens exist
  const grinderToken = await get(`SELECT * FROM station_tokens WHERE stationId = 'GRINDER-01'`);
  if (!grinderToken) {
    await run(
      `INSERT INTO station_tokens (token, stationId, stationType, issuedAt, expiresAt) VALUES (?, ?, ?, ?, ?)`,
      ['TOKEN-GRINDER-STATION', 'GRINDER-01', 'grinder', Date.now(), Date.now() + 100 * 365 * 24 * 60 * 60 * 1000]
    );
  }
  const mixerToken = await get(`SELECT * FROM station_tokens WHERE stationId = 'MIXER-01'`);
  if (!mixerToken) {
    await run(
      `INSERT INTO station_tokens (token, stationId, stationType, issuedAt, expiresAt) VALUES (?, ?, ?, ?, ?)`,
      ['TOKEN-MIXER-STATION', 'MIXER-01', 'mixer', Date.now(), Date.now() + 100 * 365 * 24 * 60 * 60 * 1000]
    );
  }

  // Update existing products with maize grinding ratios if they don't have ING-006 yet
  const prd1 = await get(`SELECT * FROM products WHERE id = 'PRD-001'`);
  if (prd1 && !prd1.mixtureRatios.includes('ING-006')) {
    const updatedRatios1 = JSON.stringify([
      { ingredientId: "ING-006", percentage: 120, stage: "grinder", requiresGrinding: true },
      { ingredientId: "ING-001", percentage: 200, stage: "mixer", requiresGrinding: false },
      { ingredientId: "ING-002", percentage: 150, stage: "mixer", requiresGrinding: false },
      { ingredientId: "ING-003", percentage: 80, stage: "mixer", requiresGrinding: false },
      { ingredientId: "ING-004", percentage: 50, stage: "mixer", requiresGrinding: false }
    ]);
    await run(`UPDATE products SET mixtureRatios = ? WHERE id = 'PRD-001'`, [updatedRatios1]);
  }
  const prd2 = await get(`SELECT * FROM products WHERE id = 'PRD-002'`);
  if (prd2 && !prd2.mixtureRatios.includes('ING-006')) {
    const updatedRatios2 = JSON.stringify([
      { ingredientId: "ING-006", percentage: 150, stage: "grinder", requiresGrinding: true },
      { ingredientId: "ING-001", percentage: 180, stage: "mixer", requiresGrinding: false },
      { ingredientId: "ING-002", percentage: 150, stage: "mixer", requiresGrinding: false },
      { ingredientId: "ING-003", percentage: 70, stage: "mixer", requiresGrinding: false },
      { ingredientId: "ING-005", percentage: 50, stage: "mixer", requiresGrinding: false }
    ]);
    await run(`UPDATE products SET mixtureRatios = ? WHERE id = 'PRD-002'`, [updatedRatios2]);
  }

  // Safe first-boot seed: only insert entities that don't already exist.
  // This NEVER deletes any existing data, so restarts/power-cuts are safe.
  const prodCount = await get(`SELECT COUNT(*) as count FROM products`);
  if (prodCount.count === 0) {
    await seedProductsOnly();
  }
  const invCount = await get(`SELECT COUNT(*) as count FROM inventory`);
  if (invCount.count === 0) {
    await seedInventoryOnly();
  }
  const ordCount = await get(`SELECT COUNT(*) as count FROM orders`);
  if (ordCount.count === 0) {
    await seedOrdersOnly();
  }

  // Register graceful shutdown to checkpoint the WAL before the process exits,
  // so no data is left only in the WAL log on a clean stop or power-cut recovery.
  let isClosed = false;
  const checkpointOnExit = () => {
    if (isClosed) return;
    isClosed = true;
    try {
      db.run('PRAGMA wal_checkpoint(TRUNCATE);', () => {
        try { db.close(); } catch {}
      });
    } catch {}
  };
  process.once('SIGTERM', checkpointOnExit);
  process.once('SIGINT',  checkpointOnExit);
}

// ─── Safe per-entity seeders (used on first boot, never delete existing data) ───

async function seedProductsOnly() {
  const initialProducts = [
    {
      id: "PRD-001",
      name: "क्रीम स्पेशल",
      englishName: "Cream Special",
      targetUph: 1200,
      colorHex: "#00F0FF",
      isActive: 1,
      manualFileName: "Cream_Special_Ops_v2.pdf",
      nominalBatchDurationSec: 480,
      mixtureRatios: JSON.stringify([
        { ingredientId: "ING-006", percentage: 120, stage: "grinder", requiresGrinding: true },
        { ingredientId: "ING-001", percentage: 200, stage: "mixer", requiresGrinding: false },
        { ingredientId: "ING-002", percentage: 150, stage: "mixer", requiresGrinding: false },
        { ingredientId: "ING-003", percentage: 80,  stage: "mixer", requiresGrinding: false },
        { ingredientId: "ING-004", percentage: 50,  stage: "mixer", requiresGrinding: false }
      ])
    },
    {
      id: "PRD-002",
      name: "प्रीमियम प्लस",
      englishName: "Premium Plus",
      targetUph: 1500,
      colorHex: "#FF6B00",
      isActive: 1,
      manualFileName: "Premium_Plus_Standard_v4.pdf",
      nominalBatchDurationSec: 600,
      mixtureRatios: JSON.stringify([
        { ingredientId: "ING-006", percentage: 150, stage: "grinder", requiresGrinding: true },
        { ingredientId: "ING-001", percentage: 180, stage: "mixer", requiresGrinding: false },
        { ingredientId: "ING-002", percentage: 150, stage: "mixer", requiresGrinding: false },
        { ingredientId: "ING-003", percentage: 70,  stage: "mixer", requiresGrinding: false },
        { ingredientId: "ING-005", percentage: 50,  stage: "mixer", requiresGrinding: false }
      ])
    },
    {
      id: "PRD-003",
      name: "मानक मिश्रण",
      englishName: "Standard Blend",
      targetUph: 2500,
      colorHex: "#10B981",
      isActive: 1,
      manualFileName: null,
      nominalBatchDurationSec: 360,
      mixtureRatios: JSON.stringify([
        { ingredientId: "ING-001", percentage: 350, stage: "mixer", requiresGrinding: false },
        { ingredientId: "ING-002", percentage: 150, stage: "mixer", requiresGrinding: false },
        { ingredientId: "ING-003", percentage: 100, stage: "mixer", requiresGrinding: false }
      ])
    }
  ];
  for (const p of initialProducts) {
    await run(
      `INSERT OR IGNORE INTO products (id, name, englishName, targetUph, colorHex, isActive, manualFileName, nominalBatchDurationSec, mixtureRatios)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.name, p.englishName, p.targetUph, p.colorHex, p.isActive, p.manualFileName, p.nominalBatchDurationSec, p.mixtureRatios]
    );
  }
}

async function seedInventoryOnly() {
  const initialInventory = [
    { itemId: "ING-006", name: "Raw Maize (Corn)",   hindiName: "साबुत मक्का",      type: "raw_material",  stock: 8500,  unit: "kg",     minStock: 1500, requiresGrinding: 1, stage: "grinder" },
    { itemId: "ING-001", name: "Wheat Flour",         hindiName: "गेंहू का आटा",     type: "raw_material",  stock: 12500, unit: "kg",     minStock: 2000, requiresGrinding: 0, stage: "mixer" },
    { itemId: "ING-002", name: "Refined Sugar",       hindiName: "चीनी",             type: "raw_material",  stock: 5400,  unit: "kg",     minStock: 1000, requiresGrinding: 0, stage: "mixer" },
    { itemId: "ING-003", name: "Vegetable Fats",      hindiName: "वनस्पति वसा",      type: "raw_material",  stock: 3200,  unit: "kg",     minStock: 800,  requiresGrinding: 0, stage: "mixer" },
    { itemId: "ING-004", name: "Cream Flavoring",     hindiName: "क्रीम फ्लेवर",     type: "raw_material",  stock: 650,   unit: "kg",     minStock: 150,  requiresGrinding: 0, stage: "mixer" },
    { itemId: "ING-005", name: "Premium Additive",    hindiName: "प्रीमियम एडिटिव", type: "raw_material",  stock: 450,   unit: "kg",     minStock: 100,  requiresGrinding: 0, stage: "mixer" },
    { itemId: "FIN-001", name: "Cream Special",       hindiName: "क्रीम स्पेशल",    type: "finished_good", stock: 4,     unit: "batches",minStock: 2,    requiresGrinding: 0, stage: "mixer" },
    { itemId: "FIN-002", name: "Premium Plus",        hindiName: "प्रीमियम प्लस",   type: "finished_good", stock: 2,     unit: "batches",minStock: 1,    requiresGrinding: 0, stage: "mixer" },
    { itemId: "FIN-003", name: "Standard Blend",      hindiName: "मानक मिश्रण",     type: "finished_good", stock: 0,     unit: "batches",minStock: 1,    requiresGrinding: 0, stage: "mixer" }
  ];
  for (const i of initialInventory) {
    await run(
      `INSERT OR IGNORE INTO inventory (itemId, name, hindiName, type, stock, unit, minStock, requiresGrinding, stage, lastUpdated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [i.itemId, i.name, i.hindiName, i.type, i.stock, i.unit, i.minStock, i.requiresGrinding || 0, i.stage || 'mixer', Date.now()]
    );
  }
}

async function seedOrdersOnly() {
  const initialOrders = [
    {
      id: "ORD-1001", productKey: "PRD-001",
      productNameEnglish: "Cream Special", productNameHindi: "क्रीम स्पेशल",
      totalBatchesScheduled: 14, completedBatches: 0,
      status: "ACTIVE", colorHex: "#00875A", queueOrder: 0
    },
    {
      id: "ORD-1002", productKey: "PRD-002",
      productNameEnglish: "Premium Plus", productNameHindi: "प्रीमियम प्लस",
      totalBatchesScheduled: 8, completedBatches: 0,
      status: "PENDING", colorHex: "#E65100", queueOrder: 1
    }
  ];
  for (const o of initialOrders) {
    await run(
      `INSERT OR IGNORE INTO orders (id, productKey, productNameEnglish, productNameHindi, totalBatchesScheduled, completedBatches, status, timestamp, colorHex, queueOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [o.id, o.productKey, o.productNameEnglish, o.productNameHindi, o.totalBatchesScheduled, o.completedBatches, o.status, Date.now(), o.colorHex, o.queueOrder]
    );
  }
}

// ─── Full reset (called only via /api/reseed — manual admin action) ───────────
export async function seedData() {
  // Clear tables
  await run(`DELETE FROM products`);
  await run(`DELETE FROM inventory`);
  await run(`DELETE FROM orders`);
  await run(`DELETE FROM batch_logs`);
  await run(`DELETE FROM station_tokens`);

  await run(
    `INSERT INTO station_tokens (token, stationId, stationType, issuedAt, expiresAt) VALUES (?, ?, ?, ?, ?)`,
    ['TOKEN-GRINDER-STATION', 'GRINDER-01', 'grinder', Date.now(), Date.now() + 100 * 365 * 24 * 60 * 60 * 1000]
  );
  await run(
    `INSERT INTO station_tokens (token, stationId, stationType, issuedAt, expiresAt) VALUES (?, ?, ?, ?, ?)`,
    ['TOKEN-MIXER-STATION', 'MIXER-01', 'mixer', Date.now(), Date.now() + 100 * 365 * 24 * 60 * 60 * 1000]
  );
  await run(
    `INSERT INTO station_tokens (token, stationId, stationType, issuedAt, expiresAt) VALUES (?, ?, ?, ?, ?)`,
    ['DASHBOARD-DEV-TOKEN', 'WEB-DASHBOARD', 'mixer', Date.now(), Date.now() + 365 * 24 * 60 * 60 * 1000]
  );

  // Seed Products with Stage 1 (Grinder) and Stage 2 (Mixer) mixture formulas
  const initialProducts = [
    {
      id: "PRD-001",
      name: "क्रीम स्पेशल",
      englishName: "Cream Special",
      targetUph: 1200,
      colorHex: "#00F0FF",
      isActive: 1,
      manualFileName: "Cream_Special_Ops_v2.pdf",
      nominalBatchDurationSec: 480,
      mixtureRatios: JSON.stringify([
        { ingredientId: "ING-006", percentage: 120, stage: "grinder", requiresGrinding: true },
        { ingredientId: "ING-001", percentage: 200, stage: "mixer", requiresGrinding: false },
        { ingredientId: "ING-002", percentage: 150, stage: "mixer", requiresGrinding: false },
        { ingredientId: "ING-003", percentage: 80, stage: "mixer", requiresGrinding: false },
        { ingredientId: "ING-004", percentage: 50, stage: "mixer", requiresGrinding: false }
      ])
    },
    {
      id: "PRD-002",
      name: "प्रीमियम प्लस",
      englishName: "Premium Plus",
      targetUph: 1500,
      colorHex: "#FF6B00",
      isActive: 1,
      manualFileName: "Premium_Plus_Standard_v4.pdf",
      nominalBatchDurationSec: 600,
      mixtureRatios: JSON.stringify([
        { ingredientId: "ING-006", percentage: 150, stage: "grinder", requiresGrinding: true },
        { ingredientId: "ING-001", percentage: 180, stage: "mixer", requiresGrinding: false },
        { ingredientId: "ING-002", percentage: 150, stage: "mixer", requiresGrinding: false },
        { ingredientId: "ING-003", percentage: 70, stage: "mixer", requiresGrinding: false },
        { ingredientId: "ING-005", percentage: 50, stage: "mixer", requiresGrinding: false }
      ])
    },
    {
      id: "PRD-003",
      name: "मानक मिश्रण",
      englishName: "Standard Blend",
      targetUph: 2500,
      colorHex: "#10B981",
      isActive: 1,
      manualFileName: null,
      nominalBatchDurationSec: 360,
      mixtureRatios: JSON.stringify([
        { ingredientId: "ING-001", percentage: 350, stage: "mixer", requiresGrinding: false },
        { ingredientId: "ING-002", percentage: 150, stage: "mixer", requiresGrinding: false },
        { ingredientId: "ING-003", percentage: 100, stage: "mixer", requiresGrinding: false }
      ])
    }
  ];

  for (const p of initialProducts) {
    await run(
      `INSERT OR REPLACE INTO products (id, name, englishName, targetUph, colorHex, isActive, manualFileName, nominalBatchDurationSec, mixtureRatios)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.name, p.englishName, p.targetUph, p.colorHex, p.isActive, p.manualFileName, p.nominalBatchDurationSec, p.mixtureRatios]
    );
  }

  // Seed Inventory including Maize (requiresGrinding: 1, stage: 'grinder')
  const initialInventory = [
    { itemId: "ING-006", name: "Raw Maize (Corn)", hindiName: "साबुत मक्का", type: "raw_material", stock: 8500, unit: "kg", minStock: 1500, requiresGrinding: 1, stage: "grinder" },
    { itemId: "ING-001", name: "Wheat Flour", hindiName: "गेंहू का आटा", type: "raw_material", stock: 12500, unit: "kg", minStock: 2000, requiresGrinding: 0, stage: "mixer" },
    { itemId: "ING-002", name: "Refined Sugar", hindiName: "चीनी", type: "raw_material", stock: 5400, unit: "kg", minStock: 1000, requiresGrinding: 0, stage: "mixer" },
    { itemId: "ING-003", name: "Vegetable Fats", hindiName: "वनस्पति वसा", type: "raw_material", stock: 3200, unit: "kg", minStock: 800, requiresGrinding: 0, stage: "mixer" },
    { itemId: "ING-004", name: "Cream Flavoring", hindiName: "क्रीम फ्लेवर", type: "raw_material", stock: 650, unit: "kg", minStock: 150, requiresGrinding: 0, stage: "mixer" },
    { itemId: "ING-005", name: "Premium Additive", hindiName: "प्रीमियम एडिटिव", type: "raw_material", stock: 450, unit: "kg", minStock: 100, requiresGrinding: 0, stage: "mixer" },
    { itemId: "FIN-001", name: "Cream Special", hindiName: "क्रीम स्पेशल", type: "finished_good", stock: 4, unit: "batches", minStock: 2, requiresGrinding: 0, stage: "mixer" },
    { itemId: "FIN-002", name: "Premium Plus", hindiName: "प्रीमियम प्लस", type: "finished_good", stock: 2, unit: "batches", minStock: 1, requiresGrinding: 0, stage: "mixer" },
    { itemId: "FIN-003", name: "Standard Blend", hindiName: "मानक मिश्रण", type: "finished_good", stock: 0, unit: "batches", minStock: 1, requiresGrinding: 0, stage: "mixer" }
  ];

  for (const i of initialInventory) {
    await run(
      `INSERT INTO inventory (itemId, name, hindiName, type, stock, unit, minStock, requiresGrinding, stage, lastUpdated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [i.itemId, i.name, i.hindiName, i.type, i.stock, i.unit, i.minStock, i.requiresGrinding || 0, i.stage || 'mixer', Date.now()]
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
