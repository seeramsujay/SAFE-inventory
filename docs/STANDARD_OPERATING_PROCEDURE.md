# 🏭 INDUSTRIAL NEXUS — STANDARD OPERATING PROCEDURE (SOP)
**Document Ref**: `SOP-NEXUS-v1.2`  
**Applicability**: Plant Operations, Grinding Division, Mixing Division, Warehouse & Inventory, Factory Supervision  
**Revision**: 1.2.0 (Dual-Station Industrial Architecture)

---

## 1. System Overview & Role Matrix

Industrial Nexus operates an offline-first dual-station compounding and milling line linked with a central SQLite warehouse ledger.

```
+-----------------------------------------------------------------------------------+
|                           ADMINISTRATIVE CONSOLE (Web)                            |
|             [1. Production Order Dispatch]   [2. Real-time Telemetry]             |
|             [3. User Access Control]         [4. Recipe Formulation]              |
+------------------------------------------+----------------------------------------+
                                           | (LAN / Wi-Fi / Hotspot)
                     +---------------------+---------------------+
                     |                                           |
                     v                                           v
      +-----------------------------+             +-----------------------------+
      |    STAGE 1: GRINDER KIOSK   |             |     STAGE 2: MIXER KIOSK    |
      |   (स्टेशन १: मक्का पिसाई)   |             |   (स्टेशन २: सामग्री मिश्रण)  |
      +-----------------------------+             +-----------------------------+
      | • Raw Maize Pulverization   |             | • Flour & Additives Compound|
      | • Single / Bulk Milling     |  Dispatched | • Operator Feedback (Quality|
      | • Pipeline Push to Mixer    | ===========>|   Texture & 5-Star Rating)  |
      | • Slide-to-Confirm          |             | • Slide-to-Confirm Sign-off |
      +-----------------------------+             +-----------------------------+
                     |                                           |
                     +---------------------+---------------------+
                                           |
                                           v
                        +-------------------------------------+
                        |     INVENTORY MANAGEMENT PORTAL     |
                        |      (इन्वेंटरी स्टॉक प्रबंधन)      |
                        +-------------------------------------+
                        | • Real-time Ingredient Depletion    |
                        | • Stock Replenishment & Min Alerts  |
                        +-------------------------------------+
```

### System User Access Directory

| Role | Username | Default Password / PIN | Access Level | Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` *(PIN: `1234`)* | **Full System Access** | Dispatching orders, formula configuration, user management, machine pairing, system logs. |
| **Inventory Manager** | `inventory` | `inv123` *(PIN: `1234`)* | **Inventory Page Only** | Raw material stock receipt, stock audits, threshold configuration, manual weight adjustments. |
| **Grinder Operator** | `grinder` | `1111` *(or 1-Click)* | **Stage 1 Grinder Kiosk** | Raw maize grinding, bulk pulverization, dispatching ground maize to pneumatic transfer line. |
| **Mixer Operator** | `mixer` | `2222` *(or 1-Click)* | **Stage 2 Mixer Kiosk** | Mixing dry ingredients, moisture checks, logging batch completion and quality feedback. |
| **Floor Supervisor** | `supervisor` | `5678` | **Supervisory Access** | Shift sign-off, emergency escalation, anomaly review. |

---

## 2. Daily Plant Startup & Tablet Pairing

### 2.1 Factory Supervisor Startup Checklist (07:45 AM)
1. **Power On Central Server**: Ensure the host server running the Express API (`:3001`) and Web Console (`:3005`) is powered on and connected to the factory LAN.
2. **Access Web Console**: Open the browser and navigate to `http://localhost:3005` (or local LAN IP `http://100.99.115.49:3005`).
3. **Login as Admin**:
   - Username: `admin`
   - Password: `admin123`
4. **Generate Station Pairing QR**:
   - Navigate to the **📟 Live Control Panel** tab.
   - The screen will display two distinct pairing QR codes:
     - **QR 1: Grinder Station (पिसाई)** — Scoped to `GRINDER-01`.
     - **QR 2: Mixer Station (मिश्रण)** — Scoped to `MIXER-01`.

### 2.2 Kiosk Tablet Pairing
1. Open the **Industrial Nexus** Android app on the station tablet.
2. Tap **📷 स्कैन करें (Scan Pairing QR)** on the initial setup screen.
3. Align the camera with the corresponding QR code on the admin screen:
   - For Grinder tablet: Scan **QR 1 (Grinder)**.
   - For Mixer tablet: Scan **QR 2 (Mixer)**.
4. The tablet will store the secure encrypted auth token, station ID, and server endpoint locally in `EncryptedSharedPreferences`.

---

## 3. Standard Operating Procedure: Stage 1 — Grinder Station (पिसाई)

### 3.1 Individual Batch Milling (सामान्य बैच पिसाई)
1. **View Queue (Left 1/3rd)**:
   - The tablet screen displays upcoming batches requested by the production plan (e.g., *Batch #1, Batch #2, Batch #3*).
   - Tap any upcoming batch in the queue to load its formula into the center screen.
2. **Inspect Formula & Raw Material (Center 2/3rds)**:
   - Verify the raw material required: **साबुत मक्का (Raw Maize - ING-006)**.
   - The required weight for 1 batch is displayed (e.g., `120.0 kg`).
3. **Load Hopper**:
   - Measure 120 kg of raw maize into the primary pulverizer hopper.
   - Ensure safety grates and dust collector dampers are engaged.
4. **Execute Milling**:
   - Start the hammer mill / pulverizer. Run until particle fineness reaches mesh standard (< 500 microns).
5. **Slide to Confirm (पूर्ण करें)**:
   - Slide the on-screen slider from left to right: **`स्लाइड करके मक्का पिसाई पूर्ण करें (SLIDE TO FINISH)`**.
   - The app immediately logs the pulverization, deducts 120 kg raw maize from inventory, and dispatches the ground batch to the Stage 2 Mixer queue.

### 3.2 Bulk Pulverization Mode (थोक मक्का पिसाई)
*Use this procedure when grinding large quantities (e.g. 3, 5, or 10 batches) simultaneously in high-capacity mills.*

1. In the active batch formula center, tap the amber banner: **`⚡ थोक पिसाई मोड (BULK GRIND ALL BATCHES)`**.
2. The modal displays total pending batches (e.g., `3 Batches = 360 kg Raw Maize`).
3. Load the total combined raw maize into the industrial mill.
4. Slide the bulk confirmation slider: **`स्लाइड करके सभी बैच एक साथ पीसें (CONFIRM BULK GRIND)`**.
5. The system atomically logs all batches as milled, deducts the full weight (e.g., `360 kg`), and marks all pending batches ready for mixing.

---

## 4. Standard Operating Procedure: Stage 2 — Mixer Station (मिश्रण)

### 4.1 Batch Compounding & Mixing (सामग्री मिश्रण)
1. **Select Milled Batch**:
   - The Mixer tablet displays incoming ground batches dispatched from Stage 1.
   - Tap the active batch in the left queue.
2. **Weigh & Add Ingredients**:
   - Inspect the recipe formula on screen. Verify all dry and liquid ingredients:
     - **गेहूं का आटा (Wheat Flour - ING-001)**: e.g., 200 kg
     - **रिफाइंड चीनी (Refined Sugar - ING-002)**: e.g., 150 kg
     - **पाम तेल (Refined Palm Oil - ING-003)**: e.g., 80 kg
     - **सोडियम बाइकार्बोनेट (Sodium Bicarbonate - ING-004)**: e.g., 20 kg
     - **वेनिला एसेंस (Vanilla Essence - ING-005)**: e.g., 30 kg
     - **पिसी हुई मक्का (Ground Maize)**: *Already milled from Stage 1 (120 kg)*.
3. **Run Compounding Mixer**:
   - Seal mixer vessel. Run high-shear impeller for the prescribed mixing duration (e.g., 8.0 minutes).

### 4.2 Quality Feedback Sign-Off (गुणवत्ता प्रतिक्रिया)
1. Once mixing is complete, the Mixer operator **must fill the mandatory feedback section**:
   - **मिश्रण गुणवत्ता (Batch Quality)**: Select `Grade A - Optimal`, `Grade B - Acceptable`, or `Rework Required`.
   - **बनावट / टेक्सचर (Mixture Texture)**: Select `Smooth Homogeneous`, `Slightly Grainy`, `Too Dry`, or `Too Sticky`.
   - **स्टार रेटिंग (Rating)**: Tap to assign 1 to 5 stars.
   - **ऑपरेटर टिप्पणी (Notes)**: Confirm consistency remarks (e.g., *"मिश्रण 8.0 मिनट में सही एकसमान बना, मक्का अच्छी तरह घुल गया।"*).
2. **Slide to Confirm**:
   - Slide the emerald confirmation slider: **`स्लाइड करके अंतिम मिश्रण पूर्ण करें (FINISH BATCH)`**.
   - The batch is permanently logged in the central SQLite ledger (`batch_logs`), remaining ingredients are deducted from inventory, and the batch counter increments.

---

## 5. Shift Management, Breaks & Emergency Protocols

### 5.1 Operator Lunch & Tea Breaks
1. At the bottom of either kiosk tablet screen, tap **`लंच / ब्रेक (LUNCH / BREAK)`**.
2. Confirm the prompt. The tablet status updates to **⏸️ ON BREAK** and informs the supervisor console.
3. Upon return, tap **`▶️ काम शुरू करें (RESUME WORK)`** to reactivate the terminal.

### 5.2 Emergency Stop (आपातकालीन रोक)
1. In case of mechanical jamming, foreign object detection, or safety hazards:
   - Hit the physical hardware **E-STOP** button on the machine.
   - Tap the red **`आपातकालीन रोक (EMERGENCY)`** button on the tablet screen.
2. The server broadcasts a high-priority alert across all connected terminals and pauses automatic queue dispatches until supervisor clearance.

---

## 6. Inventory Manager SOP: Stock Audits & Replenishment

### 6.1 Logging In
1. Access `http://localhost:3005` (or factory URL).
2. Enter credentials:
   - Username: `inventory`
   - Password: `inv123`
3. The system automatically restricts the interface exclusively to the **🌾 Inventory Management** module.

### 6.2 Receiving Incoming Raw Materials (स्टॉक आवक)
1. Locate the material card (e.g., `ING-006 Raw Maize` or `ING-001 Wheat Flour`).
2. In the adjustment field, enter the received shipment quantity (e.g., `+5000 kg`).
3. Click **`अद्यतन करें (Update Stock)`**.
4. The system logs the receipt with an audit timestamp and resets low-stock warning banners if levels rise above the safety threshold.

### 6.3 Configuring Minimum Stock Warning Thresholds
1. Click **`Edit Threshold`** on the respective material.
2. Set the safety threshold (e.g., `1000 kg` for Raw Maize).
3. When stock falls below this level during active production, the system automatically highlights the item in yellow/red warnings.

---

## 7. Administrator SOP: User Management & System Control

### 7.1 Accessing User Management
1. Log in with `admin` / `admin123`.
2. Click the **`👥 User Management`** tab.

### 7.2 Creating a New Staff Member
1. Click **`+ नया उपयोगकर्ता जोड़ें (ADD USER)`**.
2. Enter:
   - **Username**: e.g., `inv_assistant`
   - **Password / PIN**: e.g., `pass9876` or `9876`
   - **Role**:
     - `inventory-manager` (Isolated to inventory page only).
     - `operator` (Assigned to Grinder or Mixer kiosk).
     - `admin` (Full administrative privileges).
   - **Full Name / Hindi Name**: e.g., `Ramesh Kumar / रमेश कुमार`.
3. Click **`सहेजें (SAVE)`**.

### 7.3 Password Resets & Access Revocation
- Click **Edit** (pencil icon) next to any user to change their PIN/password.
- Click **Delete** (trash icon) to revoke access immediately. (The primary `admin` account is permanently protected from deletion).
