# Industrial Workflow Automation & State Synchronization
**Version 1.0.0** · Antigravity · June 2026 · SAFE-inventory Specifications

---

## AI READING INSTRUCTION

Read `[SPEC]` and `[BUG]` blocks for authoritative system facts and rules.
Read `[NOTE]` only if additional operational context is needed.
`[?]` blocks are unverified.

---

## 1. Client Conversation Analysis & Key Paradigms

**[SPEC]**
* **Asynchronous & Batch-Driven:** Production is batch-driven in discrete atomic units ($600\text{ kg}$ or $1\text{ Ton}$). The system tracks integer batch counts ($N$ batches done) instead of continuous mass flow metrics.
* **Volatile Setup Contexts:** Production setups change dynamically mid-shift (e.g., 5 batches of *Cream Special*, switch to 3 batches of *Premium Plus*, switch back to *Cream Special*). The UI must support rapid, non-linear context switching.
* **Nominal Weight Tolerances:** Discrepancies (e.g., $\pm 0.1\text{ kg}$ per batch) are ignored on the shop floor. Every confirmed batch is recorded at its exact nominal weight ($600\text{ kg}$ or $1000\text{ kg}$).

| Persona | Environment | Tech Literacy | Primary Core Interaction |
| --- | --- | --- | --- |
| **Admin** | Web Desktop Platform | High | Input aggregate demand (Tons), add raw material arrivals, adjust inventory offsets. |
| **Factory Worker** | Tablet App (Wide/Fixed) | Low (Hindi-Speaking) | View active target, trigger absolute "Batch Done" confirmation. |
| **Tally ERP (System)** | Automated Sync Plug-in | N/A (Data Layer) | Emit invoice/dispatch volumes to automatically deplete final goods stock. |

**[NOTE]**
Workers frequently switch between products mid-run based on raw material availability or shift changes. Fractional discrepancies are corrected via administrative offsets later rather than halting the shop floor velocity.

---

## 2. Device & Form-Factor Decision

**[SPEC]**
* **Target Hardware:** Dedicated 10-inch widescreen Android Tablet in a rugged casing.
* **UI Viewport Resolution:** Fixed viewport (e.g., $1280 \times 800$).
* **UI Layout Layout:** Split-pane design (Left: production queue; Right: confirmation action area).

**[NOTE]**
Mobile devices are rejected because wet, dusty, or gloved hands make small touch targets error-prone. In addition, mobile screens cannot display scheduled batches, current progress, and actions simultaneously.

---

## 3. System Functional Requirements & Logic

**[SPEC]**
* **Batch Demultiplication:**
  $$\text{Total Batches} = \left\lceil \frac{\text{Target Demand (kg)}}{\text{Nominal Batch Size (kg)}} \right\rceil$$
  *Example:* $8000\text{ kg} / 600\text{ kg} = 13.33 \rightarrow$ Automatically schedules **14 batches** and flags the excess $400\text{ kg}$ yield.
* **Admin Features:** CRUD interface to log raw material receipts, and a Monthly Nullification screen to input positive/negative stock take offsets.
* **Worker Tablet UI Specifications:**
  * **Language:** 100% Devanagari Hindi font. Absolutely no English technical terms.
  * **Color-Over-Text:** High-contrast background color tokens mapped to product lines (e.g., *Cream Special* = Deep Emerald Green, *Premium Plus* = Bright Amber).
  * **The "No-Regrets" Action Valve:** Swipe-to-Confirm slider or multi-step confirmation to prevent accidental double-clicks.
  * **State Finality:** Batch confirmations are immutable on the tablet. Once swiped "Done," state updates, packet dispatches, and count increments with no worker-facing "Undo" option.
* **Inventory Deduction Vectors:**
  * **Vector A (Raw Materials):** Triggered on tablet batch confirmation. Pulls Recipe Bill of Materials (BOM) formulas and decrements ingredients from DB based on nominal batch weight.
  * **Vector B (Final Goods Dispatch):** Triggered by Tally ERP. Pushes dispatch feed volumes to API web-hook upon truck departure, decrementing finished warehouse inventory.

---

## 4. Data Architecture & Pipeline Blueprint

**[SPEC]**

```
[Products Master]
  ├── product_key (PK)
  ├── name_hindi (String)
  ├── hex_color_code (String)
  └── nominal_batch_weight_kg (Int: 600 or 1000)

[Production Jobs]
  ├── job_id (PK)
  ├── product_key (FK)
  ├── total_batches_scheduled (Int)
  ├── batches_completed (Int)
  └── status (Enum: PENDING, ACTIVE, COMPLETED)

[Batch Logs]
  ├── batch_id (PK)
  ├── job_id (FK)
  ├── timestamp_completed (DateTime)
  └── operator_id (Int)

[Inventory Ledgers]
  ├── item_id (PK)
  ├── item_type (Enum: RAW_MATERIAL, FINISHED_GOOD)
  ├── current_stock_kg (Float)
  └── last_offset_adjustment (DateTime)
```

```
[ ADMIN WEB DASHBOARD ]
       │
       ▼ (Inputs 8 Tons Demand)
[ BACKEND ENGINE ] ───► Calculates: 8000kg / 600kg = 14 Atomic Batches
       │
       ▼ (Pushes Scheduled Jobs Queue)
[ WORKER TABLET APP ]
       │
       ├─► [UI Display]: High-contrast color cards + Hindi labels
       ▼
 [ Worker Performs "Swipe to Confirm" on Batch #1 ]
       │
       ├──► (Local UI Updates): Increments completed count; locks state
       │
       ▼ (Asynchronous API Packet Sent)
[ BACKEND ENGINE ]
       │
       ├──► Logs entry into [Batch Logs] table
       └──► Decrements [Inventory Ledgers] using nominal Recipe BOM formula
                               ▲
                               │ (Syncs Dispatch Volumes)
                       [ TALLY ERP PLUG-IN ]
```

---

## 5. Edge-Case Engineering Strategy

**[SPEC]**
* **Network Resilience:** Tablet app must cache batch confirmations locally in SQLite/IndexedDB if network connection is lost.
* **Background Synchronization:** App must automatically attempt background syncing of cached transactions upon network restoration.
* **Intermittent Production Jump:** UI queue must allow operators to pause/switch active production jobs and start batches for a secondary product using a color-coded grid matrix.
* **Mid-Batch Modification Check:** The tablet app must verify if active job parameters have been changed by the admin at the end of each batch sequence before enabling the confirmation action.

**[BUG] Offline Synchronization Sync Loop Hang**
* **Symptom:** Sync worker locks or fails to resume background transmissions on network restoration.
* **Cause:** Stale socket/connection handles in network polling interceptors.
* **Fix:** Reinitialize connection handlers on network state transition and implement exponential backoff retry loops.

---

## 6. Changelog

**[SPEC]**
* **Version 1.0.0:** Initial draft of the industrial workflow specification document conforming to HADS format.
