# Industrial Nexus — Architecture Document

This document provides a deep-dive into the system architecture, data flow, network topology, state management, and design decisions of the Industrial Nexus cyber-physical manufacturing suite.

---

## 1. System Overview

Industrial Nexus is a **local-first, self-hosted** manufacturing execution system (MES) composed of three subsystems:

| Subsystem | Technology | Role |
|-----------|-----------|------|
| Express API Server + SQLite | Node.js, Express 5, sqlite3 | Central data authority, business logic, API gateway |
| React Admin Dashboard | React 18, Vite, TailwindCSS, TypeScript | Administrative control room |
| Android Kiosk App | Kotlin, Jetpack Compose, Room, OkHttp | Factory floor operator terminal |

The system follows an **offline-first architecture** where the Android app operates independently of network connectivity, writing to a local Room SQLite database and syncing asynchronously when connectivity is restored.

---

## 2. Network Topology

```
                    ┌──────────────────────────────────────┐
                    │         HOST MACHINE (SERVER)         │
                    │                                      │
                    │  ┌──────────────────────────────────┐ │
                    │  │  Express Server (Port 3001)       │ │
                    │  │  - Serves dist/ (React SPA)      │ │
                    │  │  - REST API endpoints            │ │
                    │  │  - Basic Auth for dashboard      │ │
                    │  │  - Token Auth for tablets        │ │
                    │  └────────────┬─────────────────────┘ │
                    │               │                       │
                    │  ┌────────────▼─────────────────────┐ │
                    │  │  SQLite Database (nexus.db)       │ │
                    │  │  5 tables, promise-based driver   │ │
                    │  └──────────────────────────────────┘ │
                    │                                      │
                    │  ┌──────────────────────────────────┐ │
                    │  │  Vite Dev Server (Port 3005)      │ │
                    │  │  - Hot-reload HMR                │ │
                    │  │  - Proxies /api → localhost:3001 │ │
                    │  └──────────────────────────────────┘ │
                    └──────────────────────────────────────┘
                               │              ▲
                  ┌────────────┘              │
                  ▼                           │
          ┌──────────────────┐     ┌──────────────────────┐
          │  Admin Browser   │     │  Android Tablet App  │
          │  (LAN / WAN)     │     │  (LAN / Tailscale)   │
          │  Basic Auth      │     │  Bearer Token Auth   │
          │  HTTP/HTTPS      │     │  HTTP cleartext/dev  │
          └──────────────────┘     └──────────────────────┘
```

### Network Interfaces

The Express server binds to `0.0.0.0`, making it accessible on all active network interfaces:

- **Loopback**: `127.0.0.1:3001` — localhost access
- **LAN**: `192.168.x.x:3001` — local network access
- **Tailscale**: `100.x.x.x:3001` — VPN mesh network access
- **Tunnel**: Via localtunnel/ngrok — public internet access (dev only)

### Pairing Discovery

The admin dashboard auto-detects the host IP via `GET /api/info` and adjusts QR pairing URLs automatically. For LAN deployment:

1. Admin opens dashboard on the host machine (or via LAN IP)
2. Dashboard detects `serverLocalIp` from `/api/info` endpoint
3. Pairing QR encodes `{ url: "http://192.168.1.100:3001", token: "...", station: "KIOSK-01" }`
4. Tablet scans QR, stores credentials in encrypted SharedPreferences
5. Tablet begins polling `http://192.168.1.100:3001/api/orders` every 2 seconds

---

## 3. Data Flow Patterns

### 3.1 Batch Completion Flow (Happy Path)

```
┌──────────┐     ┌──────────────┐     ┌──────────┐     ┌───────────┐
│  Android │     │  Room SQLite │     │  Express │     │  nexus.db │
│  Tablet  │     │  (Local)     │     │  Server  │     │  (Server) │
└────┬─────┘     └──────┬───────┘     └────┬──────┘     └─────┬─────┘
     │                  │                  │                  │
     │ 1. Swipe Confirm │                  │                  │
     │─────────────────>│                  │                  │
     │                  │                  │                  │
     │ 2. Insert Batch  │                  │                  │
     │    Log Entity    │                  │                  │
     │─────────────────>│                  │                  │
     │                  │                  │                  │
     │ 3. Insert Outbox │                  │                  │
     │    Entity        │                  │                  │
     │─────────────────>│                  │                  │
     │                  │                  │                  │
     │ 4. PATCH /api/   │                  │                  │
     │    orders/:id/   │                  │                  │
     │    status        │─────────────────>│                  │
     │                  │                  │                  │
     │                  │            5. Update               │
     │                  │            completedBatches         │
     │                  │            ───────────────────────>│
     │                  │                  │                  │
     │                  │  6. If complete: │                  │
     │                  │     auto-promote │                  │
     │                  │     next pending │                  │
     │                  │     ────────────>│                  │
     │                  │                  │                  │
     │ 7. Response OK   │                  │                  │
     │<─────────────────│                  │                  │
     │                  │                  │                  │
```

### 3.2 Offline Sync Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────┐     ┌───────────┐
│  Android │     │  Room SQLite │     │  Express │     │  nexus.db │
│  Tablet  │     │  (Local)     │     │  Server  │     │  (Server) │
└────┬─────┘     └──────┬───────┘     └────┬──────┘     └─────┬─────┘
     │                  │                  │                  │
     │ 1. Swipe (offline)                  │                  │
     │─────────────────>│                  │                  │
     │                  │                  │                  │
     │ 2. BatchLog +    │                  │                  │
     │    Outbox saved  │                  │                  │
     │─────────────────>│                  │                  │
     │                  │                  │                  │
     │    ... network restored ...         │                  │
     │                  │                  │                  │
     │ 3. WorkManager   │                  │                  │
     │    SyncWorker    │                  │                  │
     │    triggered     │                  │                  │
     │─────────────────>│                  │                  │
     │                  │                  │                  │
     │ 4. POST /api/    │                  │                  │
     │    logs/bulk     │─────────────────>│                  │
     │                  │                  │                  │
     │                  │            5. processBatchLog       │
     │                  │            Deductions() for each    │
     │                  │            ───────────────────────>│
     │                  │                  │                  │
     │ 6. Delete synced │                  │                  │
     │    outbox items  │                  │                  │
     │<─────────────────│                  │                  │
     │                  │                  │                  │
```

### 3.3 Polling Loop (Android)

Every 2 seconds, the Android app runs a coroutine that:

1. **Sync Products** — `GET /api/products` → upsert into Room `ProductEntity`
2. **Fetch Orders** — `GET /api/orders` → parse JSON, find ACTIVE order, update ViewModel state flows (activeProductName, batch counts, next pending, queue list)
3. **Validate Token** — `GET /api/auth/validate` → if server returns `{ valid: false }`, clear pairing and force re-pair

This polling loop runs continuously and is the primary mechanism for keeping the tablet's state synchronized with the server.

### 3.4 Polling Loop (Admin Dashboard)

Every 2 seconds, the dashboard fetches:
- `GET /api/products` → product catalog
- `GET /api/orders` → order queue
- `GET /api/inventory` → stock levels
- `GET /api/logs` → batch history
- `GET /api/stations/breaks` → break alerts

All five requests fire in parallel and update React state via `useState` setters.

---

## 4. State Management Architecture

### 4.1 Android App (IndustrialViewModel)

The ViewModel is the central state hub, using Kotlin `StateFlow` for reactive UI bindings:

```
┌─────────────────────────────────────────────────┐
│              IndustrialViewModel                  │
├─────────────────────────────────────────────────┤
│  Persistent State (survives config changes):     │
│  ┌───────────────────────────────────────────┐  │
│  │  stationId: StateFlow<String>             │  │
│  │  activeShift: StateFlow<ActiveShiftEntity>│  │
│  │  products: StateFlow<List<ProductEntity>> │  │
│  │  batchLogs: StateFlow<List<BatchLogEntity>>│  │
│  │  pendingLogs: StateFlow<List<OutboxEntity>>│  │
│  │  ordersQueue: StateFlow<List<OrderInfo>>  │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  Ephemeral State:                                │
│  ┌───────────────────────────────────────────┐  │
│  │  timerRemainingSec: MutableStateFlow(Int) │  │
│  │  currentTemperature: MutableStateFlow(Int) │  │
│  │  activeBatchCountCompleted: StateFlow     │  │
│  │  activeBatchCountTotal: StateFlow         │  │
│  │  isOnBreak: StateFlow<Boolean>            │  │
│  │  selectedIssues: MutableStateFlow<Set>    │  │
│  │  commentsText: MutableStateFlow<String>   │  │
│  │  workerIdInput, pinInput, safety checks   │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  Concurrent Jobs:                                │
│  ┌───────────────────────────────────────────┐  │
│  │  pollJob: polling every 2s (IO)          │  │
│  │  timerJob: countdown tick (Default)       │  │
│  │  breakJob: break duration counter         │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Screen Navigation**: Managed by `_currentScreen: MutableStateFlow<String>` with values `"login"`, `"worker_timer"`, `"worker_extruder"`, `"emergency"`. Navigation is controlled by the ViewModel via `navigationTo()` calls from Compose callbacks.

### 4.2 Web Dashboard (React useState)

The dashboard uses plain React `useState` hooks (no external state library):

```
App.tsx State:
├── products: Product[]            ← /api/products
├── orders: Order[]                ← /api/orders
├── logs: BatchLog[]               ← /api/logs
├── inventory: InventoryItem[]     ← /api/inventory
├── activeTab                      ← 'dashboard' | 'products' | 'logs' | 'inventory' | 'link-integration'
├── workerToken: string | null     ← from URL query param or localStorage
├── Worker panel state             ← activeWorkerOrderId, workerUnitsProducedInput, workerProcessingLine
├── Product editor state           ← newProductId, newProductName, recipeIngredients, etc.
├── Order form state               ← selectedProductId, productionMode, orderTargetUnits/Batches
└── UI state                       ← searchLog, lineFilter, stationsOnBreak, copiedLink, etc.
```

The worker panel is rendered conditionally when `workerToken` is set (via `?workerToken=...` query param or localStorage). This allows the admin to test the worker experience directly in the browser.

### 4.3 Server (Express — Stateless)

The Express server is **stateless between requests** — all state lives in SQLite. Request handling:
1. Parse request (body, params, auth header)
2. Execute SQL queries via promise wrappers (`run`, `get`, `all`)
3. Return JSON response

The only in-memory state is the database connection object (`sqlite3.Database`) which persists for the lifetime of the server process.

---

## 5. Database Architecture

### 5.1 Schema Design Rationale

```
nexus.db
├── products          ← Master product catalog with Hindi/English names, mixture ratios
├── inventory         ← Dual-type: raw_material (kg) + finished_good (batches)
├── orders            ← Queue with status machine (PENDING → ACTIVE → COMPLETED/CANCELLED)
├── batch_logs        ← Immutable audit trail of every batch completion
└── station_tokens    ← Authentication registry for paired tablets
```

**Key Design Decisions:**

- **Denormalized names**: `orders` and `batch_logs` store `productNameEnglish` and `productNameHindi` directly rather than a FK to `products`. This ensures historical records remain readable even if product names change.
- **JSON for mixture ratios**: Stored as a TEXT JSON array to avoid a separate join table. Simple and sufficient for the fixed set of ingredients per product.
- **queueOrder for ordering**: Instead of relying on `timestamp` alone, a `queueOrder` integer column enables manual drag-to-reorder in the admin dashboard.
- **No foreign key constraints**: SQLite FK enforcement is optional. The app enforces referential integrity at the application layer.
- **Dual inventory types**: `raw_material` items are tracked in kg with min-stock thresholds. `finished_good` items are tracked in batches.

### 5.2 Migration Strategy

The `initDb()` function in `server/db.js` handles schema evolution gracefully:

```javascript
// Try to add new columns; silently ignore if they already exist
try { await run(`ALTER TABLE inventory ADD COLUMN hindiName TEXT`); } catch (e) {}
try { await run(`ALTER TABLE inventory ADD COLUMN type TEXT DEFAULT 'raw_material'`); } catch (e) {}
try { await run(`ALTER TABLE inventory ADD COLUMN minStock REAL DEFAULT 0.0`); } catch (e) {}
```

This pattern allows the schema to evolve across deployments without manual migration scripts. Columns are added incrementally and existing rows get default values.

### 5.3 Seed Data Lifecycle

On first startup (empty `products` table), the server runs `seedData()` which:

1. Clears all 5 tables
2. Inserts a dashboard dev token
3. Creates 2 products with mixture ratios
4. Creates 8 inventory items (5 raw + 3 finished)
5. Creates 2 orders (1 ACTIVE with 4/14 completed, 1 PENDING with 0/8)
6. Creates 4 batch logs matching the ACTIVE order's completed batches

Users can reset to seed via `POST /api/reseed` or by deleting `nexus.db` and restarting.

---

## 6. Security Architecture

### 6.1 Authentication Layers

```
┌────────────────────────────────────────────────────┐
│  Request arrives at Express                        │
│                                                    │
│  Is path /api/*?                                   │
│  ├── No → Basic Auth                               │
│  │       ├── Check Authorization header            │
│  │       ├── Compare user:pass against env vars    │
│  │       │   (default: admin:nexus123)             │
│  │       ├── Valid → serve static files / SPA      │
│  │       └── Invalid → 401 + WWW-Authenticate      │
│  │                                                 │
│  └── Yes → Route-specific auth                     │
│          ├── Public: GET /products, /orders,        │
│          │   /inventory, /logs, /health, /info      │
│          ├── Token-optional: POST /orders,          │
│          │   PATCH /orders/:id, POST /inventory    │
│          └── Token-required: POST /logs,            │
│              POST /logs/bulk, POST /stations/break  │
└────────────────────────────────────────────────────┘
```

### 6.2 Token Validation

```javascript
async function authenticateToken(req, res, next) {
  const token = authHeader.split(' ')[1];

  // Dev master key bypass
  if (token === MASTER_API_KEY) return next();

  // Look up in station_tokens table
  const validToken = await get('SELECT * FROM station_tokens WHERE token = ?', [token]);
  if (!validToken) return res.status(403).json({ error: 'Invalid token' });
  if (Date.now() > validToken.expiresAt) return res.status(403).json({ error: 'Expired' });

  req.stationId = validToken.stationId;
  next();
}
```

Tokens are generated with 100-year expiry for industrial environments where devices may run for years without administrator intervention.

### 6.3 Network Security (Android)

```kotlin
// Debug mode: trust all certificates, skip hostname verification
if (BuildConfig.DEBUG) {
  sslContext.init(null, trustAllCerts, SecureRandom())
  hostnameVerifier = { _, _ -> true }
  addInterceptor { chain ->
    chain.proceed(chain.request().newBuilder()
      .header("Bypass-Tunnel-Reminder", "true")
      .header("ngrok-skip-browser-warning", "true")
      .header("serveo-skip-browser-warning", "true")
      .build())
  }
}
```

In release builds, standard SSL/TLS validation is enforced. The `network_security_config.xml` permits cleartext HTTP to specific domains (localhost, 10.0.2.2, 192.168.x) for development.

### 6.4 Secure Storage (Android)

Pairing credentials are stored using `EncryptedSharedPreferences` (AES256-GCM encrypted):

```kotlin
val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
EncryptedSharedPreferences.create(
  PREFS_NAME,
  masterKeyAlias,
  context,
  PrefKeyEncryptionScheme.AES256_SIV,
  PrefValueEncryptionScheme.AES256_GCM
)
```

Falls back to plain SharedPreferences if encryption is unavailable.

---

## 7. Batch Processing Engine

The core business logic is `processBatchLogDeductions()` in `server/index.js`. This function is the single source of truth for inventory deduction and order progress.

### 7.1 Processing Pipeline

```
Input: { batchId, productNameHindi, productNameEnglish, line, unitsProduced, status, timestamp, targetUnits }

1. DEDUPLICATION
   ├── Check if batchId exists in batch_logs
   ├── If exists → return false (skip silently)
   └── If new → proceed

2. LOG INSERTION
   └── INSERT INTO batch_logs

3. STATUS CHECK
   ├── If status ≠ 'Success' → return true (no inventory/order changes)
   └── If status = 'Success' → proceed

4. INVENTORY DEDUCTION (Vector A)
   ├── Find product by englishName or name
   ├── Parse mixtureRatios JSON
   ├── For each ingredient:
   │     UPDATE inventory SET stock = MAX(0, stock - percentage)
   │     WHERE itemId = ingredientId
   └── Increment finished good:
         UPDATE inventory SET stock = stock + 1
         WHERE itemId = product.id.replace('PRD-', 'FIN-')

5. ORDER PROGRESS
   ├── Find ACTIVE order matching product name
   ├── Increment completedBatches += 1
   ├── If completed >= total → set status = 'COMPLETED'
   └── If COMPLETED:
         Find next PENDING order by queueOrder ASC
         Set status = 'ACTIVE' (queue promotion)

6. RETURN
   └── return true (processed successfully)
```

### 7.2 Deduplication Guarantees

The deduplication check prevents double-counting when:
- The Android app retries a failed network request
- The SyncWorker re-sends outbox items that were already received
- The admin manually replays logs

Batch IDs follow the pattern `{ORDER_ID}-B{N}` (e.g., `ORD-1001-B5`) generated by the admin dashboard worker panel, or `B-{RANDOM}` generated by the Android app and CLI emulator.

### 7.3 Queue Promotion Logic

Whenever an ACTIVE order transitions to COMPLETED or CANCELLED (via PATCH, DELETE, or batch log processing), the server checks:

```javascript
const nextPending = await get(
  "SELECT * FROM orders WHERE status = 'PENDING' ORDER BY queueOrder ASC, timestamp ASC LIMIT 1"
);
if (nextPending) {
  await run("UPDATE orders SET status = 'ACTIVE' WHERE id = ?", [nextPending.id]);
}
```

This ensures the production line never stalls — as soon as one order finishes, the next one automatically starts.

---

## 8. Offline-First Architecture (Android)

### 8.1 Local Database Hierarchy

```
Room Database (industrial_nexus_db)
├── products ✅         ← Synced from server (cache)
├── batch_logs ✅       ← Written locally, never modified by server
├── active_shift ✅     ← Local-only shift state
└── outbox ✅           ← Pending sync queue

Server Database (nexus.db)
├── products ✅         ← Source of truth
├── orders ✅           ← Source of truth
├── inventory ✅        ← Source of truth
├── batch_logs ✅       ← Authoritative log store (dedup check)
└── station_tokens ✅   ← Auth registry
```

### 8.2 Outbox Pattern

The Android app never directly writes to the server's batch_logs in a blocking manner:

1. **Write Local**: `repository.insertBatchLog(entity)` writes to Room `batch_logs`
2. **Enqueue**: `repository.insertPendingLog(outboxItem)` writes to Room `outbox_logs`
3. **Trigger Sync**: `WorkManager.enqueueUniqueWork("nexus_offline_sync", KEEP, syncWorkRequest)` triggers the SyncWorker
4. **SyncWorker**:
   - Reads all pending outbox items
   - Sends `POST /api/logs/bulk` with JSON array
   - On success: deletes synced items from outbox
   - On 401/403: clears pairing credentials
   - On network error: returns `Result.retry()` (WorkManager will retry with exponential backoff)

### 8.3 Conflict Resolution

Since the server deduplicates by `batchId`, retransmission is safe. The only conflict scenario is:

- Tablet A submits batch "B-1234" → success
- Tablet A retries (due to network timeout) → dedup check → skipped (no error)

There is no update conflict for batch logs because they are append-only immutable records. Order progress (completedBatches) is updated via PATCH requests from the tablet's active batch confirmation, which is idempotent because it sets the exact value rather than incrementing.

---

## 9. Component Interaction Diagrams

### 9.1 Android Navigation Graph

```
┌──────────────┐
│    Login     │ (Initial screen)
│  (QR Pair)  │
│  (Safety)   │
└──────┬───────┘
       │ completeShiftLogin()
       ▼
┌──────────────┐
│ Worker Timer │ ◄──────────────────────┐
│ (Countdown)  │                        │
│ (Swipe to    │   onNavigateToTimer()  │
│  Confirm)    │                        │
└──┬───────┬───┘                        │
   │       │                            │
   ▼       ▼                            │
┌────────┐ ┌──────────────┐             │
│Extruder│ │  Emergency   │             │
│Diagnos.│ │  (2x2 Grid)  ├─────────────┘
│(Temp)  │ │  (Swipe)     │ onNavigateBack()
└────────┘ └──────────────┘
```

### 9.2 Admin Dashboard Tab Structure

```
App.tsx
├── workerToken != null
│   └── Worker Terminal View
│       ├── Active Order Processing
│       ├── Pending Queue
│       └── Completed Today History
│
└── workerToken == null
    └── Admin Dashboard View
        ├── Header (clock, uplink status)
        ├── Tab Navigation
        ├── Tab 1: Dashboard (Live Control Panel)
        │   ├── Metrics Cards (time since update, batches done, ordered)
        │   ├── Recipe Dispatch Console
        │   ├── Active Floor Queue (table, drag-reorder)
        │   └── Admin Commands (clear, reseed)
        ├── Tab 2: Products (Recipe Catalog)
        │   ├── Product Cards Grid
        │   ├── Register New Product Modal
        │   └── Edit/Delete Actions
        ├── Tab 3: Logs (Batch History)
        │   ├── Search Bar + Line Filter
        │   ├── Logs Table
        │   └── Clear Logs Button
        ├── Tab 4: Inventory
        │   ├── Raw Materials Section
        │   ├── Finished Goods Section
        │   ├── Stock Adjustment Controls
        │   └── Add Material Modal
        └── Tab 5: Link Connection
            ├── QR Pairing Generator
            └── Worker Panel Preview
```

---

## 10. Error Handling Strategy

### 10.1 Android

| Layer | Mechanism |
|-------|-----------|
| Uncaught exceptions | `Thread.setDefaultUncaughtExceptionHandler` — restarts app via launch intent |
| Network failures | Caught in poll loop with `try/catch`, logged, silently ignored (poll retries in 2s) |
| Token invalidation | Detected in `GET /api/auth/validate` response → clears pairing → shows login screen |
| WorkManager failures | `Result.retry()` for transient errors, `Result.failure()` for auth errors |
| Camera permissions | Accompanist Permissions API with rationale dialog and retry button |

### 10.2 Web Dashboard

| Layer | Mechanism |
|-------|-----------|
| React render errors | `ErrorBoundary` component with Hindi/English message, stack trace toggle, refresh button |
| Network failures | `customFetch` wrapper — errors logged to console, UI shows stale data silently |
| API validation | `alert()` dialogs for validation failures (e.g., ingredient percentages not summing to 100) |
| User confirmations | `window.confirm()` for destructive actions (delete product, clear logs, reseed data) |

### 10.3 Server

| Scenario | Response |
|----------|----------|
| SQL error | `500 { error: err.message }` |
| Invalid/missing token | `401 { error: 'Missing station token.' }` or `403 { error: 'Invalid token.' }` |
| Port conflict | `console.error` with descriptive message → `process.exit(1)` |
| DB init failure | `console.error("Failed database init:", err)` → server exits |
| Missing required fields | `400 { error: 'field is required' }` |

---

## 11. Performance Considerations

### 11.1 Polling Overhead

- Android polls every 2 seconds with 3 sequential HTTP requests (products, orders, validate)
- Dashboard polls every 2 seconds with 5 parallel HTTP requests
- For a single tablet + single admin, this generates ~4 requests/second to the server
- SQLite handles this easily (sub-millisecond queries for small datasets)

### 11.2 Batch Size Limits

- `POST /api/logs/bulk` accepts an arbitrary array of logs. The SyncWorker typically sends 1-10 items at a time.
- No pagination is implemented — `GET /api/logs` returns all records. For high-volume production, this could be a concern (mitigated by the `clear logs` action).

### 11.3 Database File Location

The SQLite database is stored at the project root as `nexus.db`. For production, consider:
- Moving to a persistent volume
- Regular backups (simple file copy)
- Setting `journal_mode=WAL` for better concurrent read performance (not currently configured)

---

## 12. Deployment Architectures

### 12.1 Single Machine (Development)

```
[Server Machine]
├── Express (port 3001)
├── SQLite (nexus.db)
├── Vite Dev Server (port 3005) — OR — dist/ served by Express
└── Browser (admin dashboard)
    └── Android Emulator (10.0.2.2:3001)
```

### 12.2 LAN Deployment (Production)

```
[Server Machine]                    [Factory Floor]
├── Express (port 3001)             ├── Android Tablet 1
├── SQLite (nexus.db)               ├── Android Tablet 2
├── dist/ (served by Express)       └── ...
└── Admin Browser (any LAN device)     (polling :3001 over LAN)
```

### 12.3 Tailscale VPN (Recommended)

```
[Server Machine]                    [Remote Admin]          [Factory Floor]
├── Express (port 3001)             ├── Browser             ├── Android Tablet
├── Tailscale (100.x.x.x)           └── Tailscale           └── Tailscale
└── SQLite                              (100.x.x.x:3001)        (100.x.x.x:3001)
```

### 12.4 Public Tunnel (Development Only)

```
[Server Machine]                    [Internet]
├── Express (port 3001)             ├── localtunnel URL → https://xxx.loca.lt
├── localtunnel                     └── Admin/Tablet access via tunnel URL
└── SQLite
```

---

## 13. Key Architectural Decisions Summary

| Decision | Rationale |
|----------|-----------|
| **SQLite over PostgreSQL** | Zero configuration, file-based, no separate DB server. Sufficient for single-site deployment with low concurrency. |
| **Self-hosted over cloud** | Eliminates cloud dependencies, works fully offline, lower latency, no recurring costs. |
| **Polling over WebSockets** | Simpler to implement, debug, and reason about. 2s polling is adequate for batch production (not real-time control). |
| **Outbox pattern** | Guarantees no data loss on network interruption. Each batch log is persisted locally before any network attempt. |
| **Bearer tokens over QR** | Tokens can be long-lived (100 years), stored securely on device, and revoked server-side. |
| **Single-page React app** | No routing library needed (single view with tabs). Simpler than multi-page SPA with React Router. |
| **No ORM on server** | Direct SQLite driver calls keep queries explicit and performant. Schema is simple enough that ORM overhead isn't justified. |
| **Destructive Room migrations** | `fallbackToDestructiveMigration()` avoids complex migration code. Acceptable for controlled industrial devices. |
| **StateFlow over LiveData** | Modern Compose best practice. Better coroutine integration. |
| **Hindi-first UI** | Target operators are Hindi-speaking. English labels are secondary annotations. |
| **Swipe-to-confirm** | Prevents accidental batch completions in gloved-hand environments. Physical drag action is more deliberate than a tap. |
