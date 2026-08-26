# 📘 INDUSTRIAL NEXUS & SAFE-INVENTORY — TECHNICAL SYSTEM MANUAL
**System Version**: 1.2.0  
**Target Platform**: Dual-Station Android Tablet Kiosks + Node.js Express REST Engine + React 18 Admin Console  
**Database**: SQLite (`nexus.db`) + Android Room Database (Offline Cache)

---

## 1. System Architecture & Tech Stack

```
+-------------------------------------------------------------------------------+
|                             CLIENT APPS & TERMINALS                           |
+------------------------------------+------------------------------------------+
|  1. Web Administration Portal     |  2. Android Tablet Kiosks (Offline-first)|
|     • React 18 + TailwindCSS       |     • Kotlin + Jetpack Compose 1.7.0     |
|     • Lucide Industrial Icons      |     • Room Database 2.6.1 + KSP          |
|     • RBAC View Layer & Modals     |     • EncryptedSharedPreferences Crypto  |
|     • Port: 3005                   |     • MLKit Camera Barcode Scanning      |
+------------------------------------+------------------------------------------+
                                     |
                       HTTP / JSON REST & WebSockets
                                     |
+------------------------------------+------------------------------------------+
|                             CENTRAL BACKEND ENGINE                            |
+-------------------------------------------------------------------------------+
|  • Node.js + Express 4.x REST Server (Port: 3001)                             |
|  • Better-SQLite3 Embedded Database Engine (`nexus.db`)                       |
|  • Dual-Station Token Validator Middleware (`Authorization: Bearer <TOKEN>`)  |
|  • Idempotent Deduplication Engine for Offline Batch Syncs                    |
+------------------------------------+------------------------------------------+
```

---

## 2. Authentication, User Credentials & RBAC

The system employs a multi-tiered Role-Based Access Control (RBAC) model.

### 🔑 Active User Credentials Directory

| Role | Username | Password / PIN | Permitted Modules | Gating Logic |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | **`admin123`** *(PIN: `1234`)* | All Tabs: 📟 Live Control, 🥞 Recipes, 📜 Logs, 🌾 Inventory, 👥 Users, 🔌 Links | Unrestricted full access. |
| **Inventory Manager** | `inventory` | **`inv123`** *(PIN: `1234`)* | **Only 🌾 Inventory Management** | All other tabs hidden. Automatic navigation lock to inventory page. |
| **Floor Supervisor** | `supervisor` | **`5678`** | Shift Management & Anomaly Overrides | Intermediate administrative tier. |
| **Grinder Operator** | `grinder` | **`1111`** *(or 1-Click)* | Stage 1 Grinder Terminal | Auto-routes to Grinder milling UI. |
| **Mixer Operator** | `mixer` | **`2222`** *(or 1-Click)* | Stage 2 Mixer Terminal | Auto-routes to Mixer compounding UI. |

---

## 3. Database Schema Mapping (`nexus.db`)

### 3.1 `users` Table
```sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'supervisor', 'operator', 'inventory-manager')),
    name TEXT NOT NULL,
    nameHi TEXT,
    stationType TEXT CHECK(stationType IN ('grinder', 'mixer', NULL)),
    stationId TEXT,
    createdAt INTEGER NOT NULL
);
```

### 3.2 `inventory` Table
```sql
CREATE TABLE IF NOT EXISTS inventory (
    itemId TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    hindiName TEXT NOT NULL,
    stock REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'kg',
    minStock REAL NOT NULL DEFAULT 100,
    type TEXT NOT NULL CHECK(type IN ('raw_material', 'packaging', 'finished_good')),
    stage TEXT DEFAULT 'mixer' CHECK(stage IN ('grinder', 'mixer')),
    requiresGrinding INTEGER DEFAULT 0,
    lastUpdated INTEGER NOT NULL
);
```

### 3.3 `products` Table (Recipe Master)
```sql
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    hindiName TEXT NOT NULL,
    batchSize REAL NOT NULL,
    batchUnit TEXT NOT NULL DEFAULT 'kg',
    mixingTimeMinutes REAL NOT NULL DEFAULT 8.0,
    ingredients TEXT NOT NULL, -- JSON Array of IngredientRatio [{ingredientId, percentage, stage, requiresGrinding}]
    isActive INTEGER NOT NULL DEFAULT 1,
    createdAt INTEGER NOT NULL
);
```

### 3.4 `batch_logs` Table (Immutable Audit Vault)
```sql
CREATE TABLE IF NOT EXISTS batch_logs (
    batchId TEXT PRIMARY KEY,
    orderId TEXT,
    productName TEXT,
    productHindiName TEXT,
    line TEXT,
    stationId TEXT,
    stage TEXT,
    status TEXT NOT NULL,
    unitsProduced REAL NOT NULL,
    timestamp INTEGER NOT NULL,
    targetUnits REAL,
    operatorFeedback TEXT, -- JSON Object: { quality, texture, rating, notes }
    bulkGrind INTEGER DEFAULT 0,
    batchesCount INTEGER DEFAULT 1
);
```

---

## 4. API Reference Documentation

### 4.1 Authentication & User Management
- `POST /api/auth/login`
  - **Body**: `{ "username": "admin", "password": "admin123" }` or `{ "stationType": "grinder" }`
  - **Response**: `{ "success": true, "token": "TOKEN-ADMIN-XYZ", "user": { ... } }`
- `GET /api/users`
  - **Response**: Array of all registered user records.
- `POST /api/users`
  - **Body**: `{ "username": "inv2", "password": "pin", "role": "inventory-manager", "name": "..." }`
- `PUT /api/users/:id`
  - **Body**: Update fields (`name`, `password`, `role`).
- `DELETE /api/users/:id`
  - **Description**: Deletes a user (protected from deleting primary `admin`).

### 4.2 Production Orders & Telemetry
- `GET /api/orders/queue`: Returns current active order and queued orders.
- `POST /api/orders`: Dispatch a new production run.
- `POST /api/logs`: Submit completed batch with operator feedback and automatic ingredient depletion.
- `POST /api/station/break`: Toggle lunch/tea break state for a specific kiosk.

### 4.3 Inventory
- `GET /api/inventory`: Returns current stock, units, and minimum alert thresholds.
- `POST /api/inventory/adjust`: Manual adjustment or shipment replenishment.
  - **Body**: `{ "itemId": "ING-006", "adjustment": 5000, "reason": "Supplier Delivery Batch #482" }`

---

## 5. Android Build & Deployment Guide

### 5.1 Per-ABI Split Release APKs
Release binaries are available in [`release-apks/`](file:///home/suzaykid/Projects/SAFE-inventory/release-apks/):

| Binary Name | Architecture | Size | Installation Command |
| :--- | :--- | :--- | :--- |
| `app-arm64-v8a-release.apk` | 64-bit ARM | **17 MB** | `adb install release-apks/app-arm64-v8a-release.apk` |
| `app-armeabi-v7a-release.apk` | 32-bit ARM | **15 MB** | `adb install release-apks/app-armeabi-v7a-release.apk` |
| `app-x86_64-release.apk` | 64-bit x86 | **18 MB** | `adb install release-apks/app-x86_64-release.apk` |
| `app-x86-release.apk` | 32-bit x86 | **18 MB** | `adb install release-apks/app-x86-release.apk` |
| `app-universal-release.apk` | All ABIs | **32 MB** | `adb install release-apks/app-universal-release.apk` |

### 5.2 Compiling from Source
```bash
# Clean and compile all ABI release splits
./gradlew assembleRelease

# Run unit and integration tests
pnpm test
```
