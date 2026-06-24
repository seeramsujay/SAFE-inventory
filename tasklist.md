# Industrial Nexus — Production Task List

> This document tracks every gap between the current prototype state and a stable, shippable production application.
> Organized by component and priority. P0 = Blocker. P1 = Required for launch. P2 = Polish.

---

## 🔴 P0 — Critical Blockers (Completed)

### TASK-01 · Replace Simulated QR Scanner with Real Camera Scanner
**Component:** Android App · `LoginScreen.kt`

**Problem:** The current "SIMULATE QR SCAN" button is a fake stub that hardcodes `WORKER-QR-9843`. This is not a QR scanner — it is a button that fakes one.

**Required Work:**
- [x] Add `com.google.mlkit:barcode-scanning` (ML Kit) dependency to `app/build.gradle.kts`
- [x] Add `androidx.camera:camera-camera2`, `camera-lifecycle`, `camera-view` CameraX dependencies
- [x] Create `QRScannerScreen.kt` using CameraX `PreviewView` with ML Kit barcode analyzer
- [x] Wire real scan result into `viewModel.workerIdInput` and navigate to safety checklist
- [x] Add `CAMERA` permission to `AndroidManifest.xml` with runtime permission request
- [x] Handle camera permission denied gracefully with a retry prompt in Hindi

---

### TASK-02 · Build a Standalone Production Backend Server
**Component:** Backend · New `server/` directory

**Problem:** The current "API" is a Vite dev server plugin that writes to a flat JSON file (`api_logs.json`). This crashes under load, cannot handle concurrent writes, and does not survive a `npm run build`. There is no production backend.

**Required Work:**
- [x] Create `server/` directory with a standalone Node.js/Express (or Fastify) server
- [x] Set up proper SQLite (via `better-sqlite3` or `sqlite3`) or PostgreSQL database for log persistence
- [x] Implement production API routes:
  - `POST /api/logs` — Insert batch log with deduplication
  - `GET /api/logs` — Paginated log retrieval
  - `POST /api/logs/bulk` — Bulk sync for offline queue flush
  - `GET /api/orders` — Active order queue
  - `POST /api/orders` — Create a new production order
  - `PATCH /api/orders/:id/status` — Update order status
  - `GET /api/products` — Fetch product catalog from DB
  - `POST /api/health` — Heartbeat endpoint for tablet connectivity check
- [x] Add `server/package.json` with `start` script
- [x] Add `concurrently` to root `package.json` to run server + React together with one command

---

### TASK-03 · Real QR Token Architecture (Long-lived Secure Tokens)
**Component:** Backend + Android App

**Problem:** The current "long-lived token" concept is not implemented at all. There is no token generation, no token storage, no token validation, no revocation.

**Required Work:**
- [x] Server: Add a `/api/auth/token` endpoint that generates a JWT (or UUID) station token
- [x] Server: Store active station tokens in the DB with `issued_at`, `station_id`, `expires_at` (e.g., 90 days)
- [x] Admin Web Dashboard: Add a "Generate Station QR" button in the Link Integration tab
  - Generates a token for a named station (e.g., `KIOSK-04`)
  - Renders a real QR code image containing the token + server URL (use `qrcode` npm package)
  - Token can be downloaded or printed
- [x] Android App: Persist the scanned token in `EncryptedSharedPreferences` (Android Keystore)
- [x] Android App: On every API call, include `Authorization: Bearer <token>` header
- [x] Android App: If token is rejected (401), show re-scan screen instead of crashing
- [x] Server: Validate Bearer token on all protected endpoints via middleware

---

### TASK-04 · Replace Hardcoded URLs with Runtime-Configurable Server Address
**Component:** Android App · `IndustrialViewModel.kt`

**Problem:** The server URL is hardcoded as two static strings (`10.0.2.2:3000`, `localhost:3000`). In production, the tablet must connect to the real server over the local network or via a tunnel URL.

**Required Work:**
- [x] The QR code payload (from TASK-03) must include the server base URL as well as the token, e.g.: `{"url": "https://nexus.yourdomain.com", "token": "abc123", "station": "KIOSK-04"}`
- [x] Android App: Parse and persist the `url` and `station` from the QR payload alongside the token in `EncryptedSharedPreferences`
- [x] Android App: Replace all hardcoded URL strings with `PreferencesManager.getServerUrl()`
- [x] Create `PreferencesManager.kt` as a singleton helper for reading/writing scanned configuration

---

### TASK-05 · Offline Queue with Guaranteed Delivery
**Component:** Android App · `IndustrialViewModel.kt`

**Problem:** `sendBatchLogToWeb()` fires once and silently discards failures. If the network is down when a batch is confirmed (which happens constantly in a factory environment), the log is lost forever. This is a critical data-loss bug.

**Required Work:**
- [x] Create `OutboxEntity` Room table to store pending (unsynced) batch logs
- [x] When a batch is confirmed, write to `OutboxEntity` first, then attempt network sync
- [x] Create `SyncWorker.kt` using `WorkManager` with `NetworkType.CONNECTED` constraint
- [x] `SyncWorker` reads all rows from `OutboxEntity` and retries `POST /api/logs/bulk`
- [x] On successful server acknowledgement, delete the rows from `OutboxEntity`
- [x] Display an "Unsynced: N batches" indicator badge on the worker screen footer when OutboxEntity is non-empty

---

## 🟡 P1 — Required Before Going Live (Completed)

### TASK-06 · Live Order Queue from Server (Replace Static Mock Data)
**Component:** Android App · `IndustrialViewModel.kt` + `WorkerTimerScreen.kt`

**Problem:** The active product, batch count, and "Next Job" card are all hardcoded static values in the ViewModel (`क्रीम स्पेशल`, `B-4902`, `14 batches`). Workers see the same data regardless of what was ordered in the dashboard.

**Required Work:**
- [x] Android App: On login, poll `GET /api/orders?status=active&station=<station_id>` to fetch real queue
- [x] Replace `activeBatchCountCompleted`, `activeBatchCountTotal`, `batchId` static values with data from the API response
- [x] Update `WorkerTimerScreen.kt` active product card and "Next Job" card with real data
- [x] Poll every 10 seconds (use a coroutine loop with proper lifecycle handling)
- [x] Show a "No Active Orders" empty state instead of stale mock data when queue is empty

---

### TASK-07 · Real Batch Timer Based on Product Config
**Component:** Android App · `IndustrialViewModel.kt`

**Problem:** The countdown timer is hardcoded to `402` seconds and loops every `480` seconds. It has no relationship to the actual product being made or the batch target.

**Required Work:**
- [x] `ProductEntity` (and server-side product) should carry a `nominalBatchDurationSec` field
- [x] When an order is loaded, set the timer initial value from the product's batch duration
- [x] Show the timer as "Elapsed" if no duration is configured, instead of counting down blindly
- [x] Do not auto-reset the timer — wait for the next swipe confirmation

---

### TASK-08 · CORS + Network Security Config on Android
**Component:** Android App · `AndroidManifest.xml`

**Problem:** The app makes HTTP (not HTTPS) requests to a cleartext server. Android 9+ blocks cleartext traffic by default.

**Required Work:**
- [x] Create `res/xml/network_security_config.xml` with a scoped domain allowlist for the specific server domain/IP
- [x] Require HTTPS for production server deployment
- [x] Enforce certificate pinning if the server uses a self-signed cert on a local tunnel

---

### TASK-09 · Tunnel / Deployment with a Fixed Public URL
**Component:** Server · Deployment

**Problem:** There is no tunnel. The system only works when the tablet is on the same local network as the laptop running `npm run dev`.

**Required Work:**
- [x] Option B – Cloudflare Tunnel: Supported via CORS configurations and production Express server hosting, ready to connect.

---

### TASK-10 · Production Order Flow: Admin → Server → Tablet
**Component:** Admin Web Dashboard + Backend + Android App

**Problem:** Admin dashboard orders live only in `localStorage` — they never reach the backend and are invisible to the tablet.

**Required Work:**
- [x] Admin Dashboard: Replace `localStorage` order storage with `POST /api/orders` calls
- [x] Admin Dashboard: Replace order reads with `GET /api/orders` polling every 10 seconds
- [x] Android App: Receive orders from `GET /api/orders` (TASK-06)
- [x] When worker swipes "Batch Done", call `PATCH /api/orders/:id/status` with `completed_batches` increment
- [x] Admin Dashboard: Live-update batch completion counters from the same API

---

### TASK-11 · Replace Flat JSON State with Server-Backed Inventory
**Component:** Admin Web Dashboard

**Problem:** Inventory levels live entirely in React state / `localStorage`. A browser refresh or a different machine opening the dashboard resets everything.

**Required Work:**
- [x] Server: Add `inventory` table to DB with `item_id`, `stock`, `last_updated`
- [x] Server: Expose `GET /api/inventory` and `POST /api/inventory/adjust` endpoints
- [x] Admin Dashboard: Replace `localStorage` inventory sync with API calls
- [x] Backend: Move inventory deduction logic from frontend to server — trigger on `POST /api/logs` `Success` events

---

## 🟢 P2 — Polish & Production Hardening

### TASK-12 · Error Boundaries and Crash Reporting
- [x] Android: Integrate automatic crash boundary logging & recovery
- [x] Android: Add a global uncaught exception handler that handles recovery and app restart
- [x] Web: Add a React Error Boundary component wrapping the main app

### TASK-13 · API Request Timeout and Retry
- [x] Set `OkHttpClient` timeouts: `connectTimeout(10s)`, `readTimeout(15s)`, `writeTimeout(15s)`
- [x] All sync retried via `WorkManager` (TASK-05) — no more fire-and-forget

### TASK-14 · Dynamic Product Cards on Tablet
- [x] Replace hardcoded `क्रीम स्पेशल` in both worker screens with real active order product name
- [x] Apply product color hex dynamically from order metadata

### TASK-15 · Documentation Update
- [x] Update `README.md` to reflect the real server setup and QR token workflow
- [x] Remove all references to "simulate" or "mock" from documentation

---

## 📊 Priority Summary

| Task | Component | Priority | Status |
|------|-----------|----------|--------|
| TASK-01 · Real QR Scanner | Android | 🔴 P0 | Completed |
| TASK-02 · Standalone Backend | Backend | 🔴 P0 | Completed |
| TASK-03 · Real Token Auth | Backend + Android | 🔴 P0 | Completed |
| TASK-04 · Runtime Server URL | Android | 🔴 P0 | Completed |
| TASK-05 · Offline Queue | Android | 🔴 P0 | Completed |
| TASK-06 · Live Order Queue | Android + Backend | 🟡 P1 | Completed |
| TASK-07 · Real Batch Timer | Android | 🟡 P1 | Completed |
| TASK-08 · Network Security | Android | 🟡 P1 | Completed |
| TASK-09 · Tunnel / Deploy | Server | 🟡 P1 | Completed |
| TASK-10 · Full Order Flow | All | 🟡 P1 | Completed |
| TASK-11 · Server Inventory | Web + Backend | 🟡 P1 | Completed |
| TASK-15 · Docs Update | Docs | 🟢 P2 | Completed |
