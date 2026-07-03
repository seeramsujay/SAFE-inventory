# Self-Hosted Express & SQLite Database Setup

This guide details the self-hosted Express API backend and SQLite database structure used by the **Industrial Nexus** system (Option A). All system logic, configurations, and inventory transactions are stored locally inside the project's SQLite database file (`nexus.db`).

---

## 1. Database File Location
The database is instantiated inside a single file:
* **File path**: `<project-root>/nexus.db`
* **Driver**: Node `sqlite3` driver.

---

## 2. Table Schemas
The database contains 5 primary tables initialized in [server/db.js](file:///home/suzaykid/Projects/SAFE-inventory/server/db.js):

### `products`
Stores product mixtures, nominal batch timings, and assembly guidelines.
```sql
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,                  -- Hindi name
  englishName TEXT NOT NULL,           -- English name
  targetUph INTEGER DEFAULT 1200,      -- Target Units Per Hour
  colorHex TEXT DEFAULT '#00875A',     -- Color representation in UI
  isActive INTEGER DEFAULT 1,          -- 1 = Active, 0 = Inactive
  manualFileName TEXT,                 -- PDF file name of manual guide
  nominalBatchDurationSec INTEGER,     -- Standard batch time
  mixtureRatios TEXT                   -- JSON string of ingredients and percentage
);
```

### `inventory`
Tracks active raw ingredients and finished goods inventory on the shop floor.
```sql
CREATE TABLE IF NOT EXISTS inventory (
  itemId TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  stock REAL DEFAULT 0.0,              -- Quantity remaining
  unit TEXT DEFAULT 'kg',              -- Unit of measurement (e.g. kg, batches)
  lastUpdated INTEGER                  -- Epoch timestamp
);
```

### `orders`
Manages the sequence of batch orders scheduled for assembly.
```sql
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  productKey TEXT,
  productNameEnglish TEXT,
  productNameHindi TEXT,
  totalBatchesScheduled INTEGER,
  completedBatches INTEGER DEFAULT 0,
  status TEXT DEFAULT 'PENDING',        -- ACTIVE, PENDING, COMPLETED, CANCELLED
  timestamp INTEGER,
  colorHex TEXT
);
```

### `batch_logs`
Saves verified shift records sent from the Android worker kiosk app.
```sql
CREATE TABLE IF NOT EXISTS batch_logs (
  batchId TEXT PRIMARY KEY,
  productNameHindi TEXT,
  productNameEnglish TEXT,
  line TEXT,
  unitsProduced INTEGER,
  status TEXT,                         -- Success, Failure
  timestamp INTEGER,
  targetUnits INTEGER
);
```

### `station_tokens`
Pairs Android worker kiosks to the Express server using short-lived tokens.
```sql
CREATE TABLE IF NOT EXISTS station_tokens (
  token TEXT PRIMARY KEY,
  stationId TEXT NOT NULL,
  issuedAt INTEGER,
  expiresAt INTEGER
);
```

---

## 3. Database Initialization & Seeding
The database initializes automatically when the Express server starts.
* If `nexus.db` does not exist, the file is created.
* Tables are structured via SQL `CREATE TABLE IF NOT EXISTS` commands.
* If the `products` table has 0 rows, the server seeds initial products, default inventory, and active orders.

To force-reset the database to seeds, delete the `nexus.db` file and restart the Express server:
```bash
rm nexus.db
pnpm dev
```

---

## 4. Verifying Synchronization
You can monitor synchronization status via the Express server log console output.
* **GET `/api/orders`**: Polled every 2 seconds by the tablet to get the current assembly queue.
* **POST `/api/logs/bulk`**: Used by the tablet to push completed batch records and deduct ingredients from the inventory table.
