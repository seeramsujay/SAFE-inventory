# 🌐 USER MANUAL — WEB CONSOLE & CENTRAL SERVER
**System**: Industrial Nexus & SAFE-Inventory  
**Document**: `usermanual-web.md`  
**Target Audience**: Plant Supervisors, Administrators, Inventory Managers, IT/OT Engineers

---

## 1. Starting the Server & Web Application

### 1.1 Prerequisites
- **Node.js**: v18.0 or higher
- **Package Manager**: `pnpm` (run `pnpm install` if first time)

### 1.2 Quick Start (Development & Local Run)
To start both the API Backend (Port `3001`) and the Web Frontend (Port `3005`) simultaneously:

```bash
# Navigate to the project root directory
cd /path/to/SAFE-inventory

# Install dependencies (if not already installed)
pnpm install

# Start both backend API server and frontend Vite server concurrently
pnpm run dev
```

The system will display the active endpoints:
- **Web Administration Console**: [http://localhost:3005](http://localhost:3005)
- **API Server & SQLite Backend**: [http://localhost:3001](http://localhost:3001)
- **Network / LAN URL**: `http://<YOUR_LOCAL_IP>:3005` (e.g. `http://100.99.115.49:3005` via Tailscale/Wi-Fi)

---

### 1.3 Running in Production / Debian Server

To run the unified production build (static assets served directly by Express):

```bash
# Build the production bundle
pnpm run build

# Start the standalone production server on port 3001
pnpm run server
```

#### Systemd Background Service Setup
To keep the server permanently running on system boot:
```bash
sudo cp industrial-nexus.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable industrial-nexus
sudo systemctl start industrial-nexus
```

---

## 2. Logging In & User Roles

Access the web portal at `http://localhost:3005`. You will be greeted by the **Industrial Nexus Login Portal**.

```
+-----------------------------------------------------------------------------------+
|                        INDUSTRIAL NEXUS ACCESS PORTAL                             |
+-----------------------------------------------------------------------------------+
|  [Tab 1: प्रबंधन / SUPERVISOR & ADMIN]     [Tab 2: स्टेशन / OPERATOR FAST LAUNCH]|
+-----------------------------------------------------------------------------------+
```

### 2.1 Administrator Login
- **Username**: `admin`
- **Password**: `admin123` *(or PIN `1234`)*
- **Privileges**: Complete unrestricted access across all 6 modules:
  1. 📟 Live Control Panel
  2. 🥞 Product Recipes
  3. 📜 Log Vault
  4. 🌾 Inventory Management
  5. 👥 User Management
  6. 🔌 Link Integration Architecture

### 2.2 Inventory Manager Login
- **Username**: `inventory`
- **Password**: `inv123` *(or PIN `1234`)*
- **Privileges**: Strictly isolated to **only the 🌾 Inventory Management** page. All other administrative tabs are completely hidden and locked.

---

## 3. Web Console Modules Guide

### 3.1 📟 Live Control Panel (डैशबोर्ड)
*Used by Plant Supervisors to monitor operations and dispatch production orders.*

1. **Order Dispatch Station**:
   - **Select Formula**: Choose the product recipe (e.g., *PRD-001 Cream Special*).
   - **Production Mode**: Choose between **Target Weight** (e.g., `5,000 kg`) or **Number of Batches** (e.g., `10 Batches`).
   - Click **`उत्पादन आदेश भेजें (DISPATCH PRODUCTION ORDER)`**.
   - The order enters the active queue and broadcasts immediately to all connected tablet kiosks.
2. **Station Pairing QR Codes**:
   - **QR 1: Grinder Station (पिसाई)**: Point the Grinder tablet camera here to pair.
   - **QR 2: Mixer Station (मिश्रण)**: Point the Mixer tablet camera here to pair.
3. **Live Plant Metrics**:
   - Real-time success rate, completed units count, active extruder line telemetry, and active order countdown progress.

---

### 3.2 🥞 Product Recipes (रेसिपी प्रबंधन)
*Used to create, calibrate, and manage compounding formulas.*

1. **Registering a New Recipe**:
   - Click **`+ नई रेसिपी जोड़ें (NEW RECIPE)`**.
   - Enter Recipe Code (e.g., `PRD-002`), English Name, and Hindi Name.
   - Configure total batch size (e.g., `600 kg`) and mixing duration (e.g., `8.0 minutes`).
   - Use the ingredient sliders to set precise weight/percentages for each material.
   - The system automatically validates that total ingredients equal 100% or standard batch weight.
2. **Assigning Grinding Stages**:
   - Raw materials requiring preliminary pulverization (like *Raw Maize*) are marked with the grinding badge and routed to Stage 1.

---

### 3.3 📜 Log Vault (बैच लॉग्स)
*Permanent audit ledger recording every batch completed on the factory floor.*

1. **Audit Breakdown**:
   - View batch ID, product name, station ID (`GRINDER-01` / `MIXER-01`), timestamp, and units produced.
2. **Operator Feedback Inspection**:
   - Click on any completed Mixer batch to view the operator's sign-off report:
     - **Quality Rating**: (e.g., `Grade A - Optimal`)
     - **Texture**: (e.g., `Smooth Homogeneous`)
     - **Star Rating**: 1 to 5 Stars
     - **Operator Notes**: Full remarks submitted from the kiosk.
3. **CSV Export**: Click **`निर्यात (EXPORT CSV)`** to download logs for ERP accounting.

---

### 3.4 🌾 Inventory Management (स्टॉक प्रबंधन)
*Accessible by both Administrators and Inventory Managers.*

1. **Real-Time Stock Cards**:
   - Visual cards showing current kilograms in stock, metric unit, and safety threshold.
2. **Adjusting Stock / Receiving Shipments**:
   - Enter the received shipment quantity (e.g., `+5000`) or write-off amount (e.g., `-200`) in the input box.
   - Click **`अद्यतन करें (UPDATE)`**. Stock updates instantly in SQLite.
3. **Minimum Stock Alerts**:
   - If stock drops below the configured alert threshold, the card turns Amber/Red with an **`अल्प स्टॉक (LOW STOCK WARNING)`** banner.
4. **Registering New Raw Materials**:
   - Click **`+ नई सामग्री जोड़ें (ADD MATERIAL)`**.
   - Input Material Code (e.g., `ING-007`), Name, Initial Stock, Unit (`kg`/`tonnes`), and Warning Threshold.

---

### 3.5 👥 User Management (उपयोगकर्ता प्रबंधन — Admin Only)
*Used by Administrators to control staff accounts and credentials.*

1. **View Users Table**:
   - Shows all active users, their roles, station scopes, and passwords (with eye toggle).
2. **Creating a New Staff User**:
   - Click **`+ नया उपयोगकर्ता जोड़ें (ADD USER)`**.
   - Choose the role:
     - `inventory-manager`: Gated to inventory only.
     - `operator`: Assigned to Grinder or Mixer kiosk.
     - `admin`: Full administrative control.
   - Enter Username and Password/PIN.
3. **Editing Credentials**:
   - Click the pencil icon to update passwords or change staff roles.
4. **Revoking Access**:
   - Click the trash icon to delete an account. (Primary `admin` is protected from deletion).

---

### 3.6 🔌 Link Integration Architecture
*Technical reference tab explaining LAN bridging, WebSocket up-links, and local SQLite data replication protocols.*
