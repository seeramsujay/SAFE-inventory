# Industrial Nexus — Walkthrough & System Architecture

Welcome to **Industrial Nexus**, a high-visibility, dual-system industrial automation and control terminal. This suite is engineered for resilient manufacturing operations, featuring a robust offline-first Android Tablet App for the assembly floor and a centralized React Cloud Companion Admin Dashboard for supervision.

---

## 🏗️ System Architecture Overview

Industrial Nexus is structured as a **hybrid edge-cloud architecture** consisting of two main elements:

```
┌─────────────────────────────────┐        ┌─────────────────────────────────┐
│     Tablet Terminal App         │        │    Centralized Companion UI     │
│   (Kotlin / Compose / Room)     │        │    (React / Vite / Tailwind)    │
├─────────────────────────────────┤        ├─────────────────────────────────┤
│ ● Offline-first SQLite Storage  │        │ ● Centralized System Overview   │
│ ● High-visibility UI Controls  │◄───────►│ ● Real-time SVG Telemetry Flux  │
│ ● Standardized Safety Checklists│  Sync  │ ● Dynamic Recipe Management     │
│ ● Interactive Machine Extruder  │        │ ● Offline-to-Cloud Bridge Docs  │
└─────────────────────────────────┘        └─────────────────────────────────┘
```

1. **Tablet Terminal Android Application** (`/app`): A native Android app written in **Kotlin** with **Jetpack Compose** (Material 3). It utilizes a local **Room SQLite Database** for database persistence on the factory floor, ensuring seamless operation even during high-frequency industrial Wi-Fi dropouts.
2. **Administrative Cloud Companion Web Portal** (`/src`): A high-performance web dashboard built with **React**, **TypeScript**, and **Tailwind CSS**. It serves as an executive supervisor station, mapping Room schemas to SQL structures, offering custom high-precision SVG graphs, and executing real-time extruder state simulation.

---

## 📱 PART I: Tablet Terminal Android App

The native Android app operates under strict safety protocols and manages active shifts. It is partitioned into five canonical screen layouts:

### 1. Shift Authentication & Mandate Security Screen (`LoginScreen.kt`)
* **Purpose**: Secures the device, authenticates operators, and enforces strict physical compliance checks before enabling machines.
* **Key Features**:
  * Numeric worker PIN keyboard input matching Room shift authentication entries.
  * **Mandatory Safety Checklist**: Operators must manually confirm compliance with three critical checklists:
    1. Helmet checklist verified.
    2. Workplace hygiene inspection.
    3. Host machinery pre-flight logs.
  * *Bypass Mode*: Allows instant administrative testing of telemetry views without locking down credentials.

### 2. Active Shift Dashboard Timer (`WorkerTimerScreen.kt`)
* **Purpose**: Serves as the operator's primary monitoring area during steady-state cycles.
* **Key Features**:
  * Real-time localized clock with duration tracking since shift login.
  * Custom dynamic shift timer showing progress toward daily quotas.
  * Shift termination controls and quick-access administrative navigation.

### 3. High-Frequency Unit Extruder Screen (`WorkerExtruderScreen.kt`)
* **Purpose**: Acts as the interface connected to physical extruder telemetry sensors on active lines.
* **Key Features**:
  * High-visibility, high-contrast digital unit counters.
  * Dynamic formula selectors loaded directly from SQLite Room arrays.
  * Direct manual batch-completion trigger (`Complete & Log Batch`), writing record sets into local SQLite files synchronously.
  * Direct-access alarm control (`EMERGENCY STOP`) to initiate instant machine shutdown.

### 4. Critical Alarm Interface (`EmergencyScreen.kt`)
* **Purpose**: Triggered automatically on hardware error exceptions, blockages, or mechanical jams.
* **Key Features**:
  * High-visibility flashing hazard panels conforming to international industrial color palettes.
  * Prompt window requesting fault description, which is appended directly to subsequent fail-state logs.
  * Locked control flow requiring supervisor override clearance or reset confirmations to restore normal machine operations.

### 5. Administrative SQLite Terminal Screen (`AdminDashboardScreen.kt`)
* **Purpose**: Provides administrative tools to inspect the active states of the Room tables directly on the device.
* **Key Features**:
  * Complete data tables for registered product recipes and batch transaction records.
  * Clear logs option, performing deep SQLite drops through Room DAOs.
  * Seed mechanism to restored corrupted or missing data rows to template defaults.

---

## 💻 PART II: Administrative Companion Web Portal

The web application replicates the industrial tablet's state loops so that you can preview, validate, and manage factory metrics directly in a browser. It is fully responsive, optimized for desktop displays, and is styled with a highly specialized **Carbon-Steel Cyberpunk Color Palette**.

### 1. Live Control Panel Telemetry (📟 Tab)
Allows full-scale machine simulation:
* **Simulated Extruder Feedback**: Emulates operational drift and high-speed units outflow. Updates every 1 second based on the active recipe's target units/hour (UPH).
* **Live Flux Visualizer**: A custom, high-durability SVG graph mapping recent production yield levels against the constant batch requirements threshold. Relies on zero bloated charting libraries to guarantee high performance.
* **Mock Operator Shift Manager**: Lets you log workers in and out to verify safety status codes in real-time.
* **Simulated Fault Injector**: Allows administrators to trigger mechanical alarms, registering downtime events in the central transaction registry.

### 2. Product Recipes Catalog Manager (🥞 Tab)
Maps to your Room Entity properties on-floor:
* Let you add, edit, or delete mixture specs with localization support:
  * **English Technical Name** (e.g. `Premium Plus`)
  * **Hindi Translation Label** (e.g. `प्रीमियम प्लस`)
* Configure precise Target Output Frequency levels (UPH limits) and hex color channels for line-routing identification.

### 3. Secure Log Registry Vault (📜 Tab)
Provides an immediate window into database tables:
* Fully searchable by Batch ID or product name (either Hindi or English).
* Line-routing filtering (e.g. Line A Manual, Line B Auto-injection, Line C Extrusion Sinter).
* Detailed metadata display: batch status flags (Success running vs Alarm breakdown), units produced, and high-precision unix timestamp translation.

### 4. Bridge Protocols & Live Docs (🔌 Tab)
Displays source code and integration mappings showing you how to wire the native Android Room SQLite database to a central web server:
* Includes Kotlin Ktor HTTP replication scripts.
* Outlines database synchronization architectures (Websockets, Firestore, Ktor background pollers).
* Includes ready-to-run PostgreSQL/SQLite compatible DDL statements for effortless cloud hosting setups.

---

## 📊 Shared Room SQLite & SQL Schema

The central entity structures shared between the client-side local cache and the server-side tables:

| Attribute | TypeScript (Web) | Kotlin (Android Room) | SQL Mapping | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Batch ID** | `batchId: string` | `@PrimaryKey batchId: String` | `VARCHAR(32)` | Unique barcode identifying the logged shift batch. |
| **Product Hindi** | `productNameHindi` | `productNameHindi: String` | `TEXT` | Hindi UI labels matching floor sheets. |
| **Product English**| `productNameEnglish` | `productNameEnglish: String`| `TEXT` | Technical English naming conventions. |
| **Outflow Line** | `line: string` | `line: String` | `VARCHAR(16)` | Assembly line segment tag. |
| **Units Produced**| `unitsProduced: number`| `unitsProduced: Int` | `INT` | Total unit output count on register trigger. |
| **Status State** | `'Success' \| 'Failed'` | `status: String` | `VARCHAR(16)` | Compliance target verification flag. |
| **Timestamp** | `timestamp: number` | `timestamp: Long` | `BIGINT` | UNIX time of event registration. |
| **Target Units** | `targetUnits: number` | `targetUnits: Int` | `INT` | Production target baseline at run start. |
