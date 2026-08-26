# 📱 USER MANUAL — ANDROID TABLET KIOSK APPLICATION
**App Name**: Industrial Nexus (SAFE-Inventory)  
**Document**: `usermanual-app.md`  
**Target Audience**: Grinder Operators, Mixer Operators, Floor Supervisors, Maintenance Engineers

---

## 1. Installing the Tablet Application

The application is distributed as lightweight, pre-signed release APKs optimized for specific hardware architectures.

### 1.1 Selecting the Right APK Binary
All APK files are located in the [`release-apks/`](file:///home/suzaykid/Projects/SAFE-inventory/release-apks/) directory:

| Architecture | APK File | Size | Suitable Devices |
| :--- | :--- | :--- | :--- |
| **ARM64 (64-bit)** | `app-arm64-v8a-release.apk` | **17 MB** | Modern Android Tablets (Lenovo, Samsung, Realme) |
| **ARMv7 (32-bit)** | `app-armeabi-v7a-release.apk` | **15 MB** | Standard & Budget Industrial Tablets |
| **x86_64** | `app-x86_64-release.apk` | **18 MB** | 64-bit Intel/AMD Kiosks & Emulators |
| **x86** | `app-x86-release.apk` | **18 MB** | 32-bit Intel Kiosks & Emulators |
| **Universal** | `app-universal-release.apk` | **32 MB** | All Android devices (contains all native libs) |

### 1.2 Installing via USB (ADB)
```bash
# Connect the tablet via USB with USB Debugging enabled
adb devices

# Install the optimized 64-bit APK
adb install release-apks/app-arm64-v8a-release.apk
```

### 1.3 Installing Directly on Tablet via Browser / Flash Drive
1. Copy the APK onto a USB drive or download it on the tablet browser from GitHub releases:
   `https://github.com/seeramsujay/SAFE-inventory/releases/tag/v1.2.0`
2. Open the **Files / Downloads** app on the tablet.
3. Tap the APK file and select **Install** (Enable *"Install unknown apps"* if prompted).

---

## 2. Initial Setup & Station QR Pairing

When the app is launched for the first time, the **Station Pairing Screen** appears.

```
+-----------------------------------------------------------------------------------+
|                        INDUSTRIAL NEXUS TABLET SETUP                              |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                   [ 📷 स्कैन करें (SCAN PAIRING QR) ]                              |
|                                                                                   |
|           • Align camera with the Station QR Code on the Web Console              |
|           • GRINDER TABLET: Scan QR 1 (पिसाई स्टेशन)                              |
|           • MIXER TABLET: Scan QR 2 (मिश्रण स्टेशन)                               |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### Pairing Steps:
1. On the central supervisor computer, open the Web Console (`http://localhost:3005`) and go to the **📟 Live Control Panel**.
2. On the tablet, tap **`📷 स्कैन करें (Scan Pairing QR)`**.
3. Point the tablet camera at the appropriate QR code:
   - For Grinding Station: Scan **QR 1 (Grinder)**.
   - For Mixing Station: Scan **QR 2 (Mixer)**.
4. The tablet will automatically store the station ID, endpoint address, and auth token in secure storage (`EncryptedSharedPreferences`).

---

## 3. Operator Interface Layout

The tablet kiosk interface is divided into two primary zones designed for industrial touchscreens:

```
+-----------------------------------------------------------------------------------+
| HEADER: [Station Badge: GRINDER-01]  [Order: PRD-001]  [LAN: Connected 🟢] [Logout]|
+------------------------------------+----------------------------------------------+
| LEFT 1/3RD: UPCOMING QUEUE         | RIGHT 2/3RDS: FORMULA & EXECUTION CENTER     |
| (आगामी बैच सूची)                   | (सक्रिय बैच फॉर्मूला और नियंत्रण)             |
|                                    |                                              |
| • [BATCH #1 - Active 🔵]           | 🥞 PRODUCT: Cream Special (क्रीम स्पेशल)    |
| • [BATCH #2 - Pending ⏳]          | ⚖️ STAGE: 1. Grinder Pulverization          |
| • [BATCH #3 - Pending ⏳]          | 🌾 MATERIAL: Raw Maize (साबुत मक्का)        |
|                                    | 📊 WEIGHT: 120.0 kg                          |
| (Tap any batch in the next 3 to    |                                              |
|  switch formula immediately)       | [=====> SLIDE TO COMPLETE BATCH =====>]      |
+------------------------------------+----------------------------------------------+
| FOOTER: [ ☕ लंच/ब्रेक (BREAK) ]  [ 🏁 शिफ्ट समाप्त (END SHIFT) ] [ 🚨 आपातकालीन ]|
+-----------------------------------------------------------------------------------+
```

---

## 4. Operator Step-by-Step Workflows

### 4.1 Stage 1: Grinder Station (पिसाई स्टेशन)

#### Regular Batch Pulverization:
1. Tap on the upcoming batch in the left queue.
2. The center panel displays the required **साबुत मक्का (Raw Maize - ING-006)** and quantity (e.g., `120.0 kg`).
3. Load the raw maize into the grinder hopper.
4. Run the mill. Once pulverization is complete, slide the confirmation bar from left to right:
   **`>>> स्लाइड करके मक्का पिसाई पूर्ण करें (SLIDE TO FINISH) >>>`**.
5. The batch is logged, raw maize is deducted, and the pulverized material is pushed to the Stage 2 Mixer queue.

#### Bulk Pulverization Mode (थोक मक्का पिसाई):
*For large mills that can grind multiple batches simultaneously.*
1. In the formula center, tap the amber **`⚡ थोक पिसाई मोड (BULK GRIND ALL BATCHES)`** button.
2. Confirm the total pending weight (e.g., `3 Batches x 120 kg = 360 kg`).
3. Slide the bulk confirmation slider:
   **`>>> स्लाइड करके सभी बैच एक साथ पीसें (CONFIRM BULK GRIND) >>>`**.
4. All pending batches are simultaneously completed and pushed to Stage 2.

---

### 4.2 Stage 2: Mixer Station (मिश्रण स्टेशन)

#### Compounding & Feedback Sign-Off:
1. Tap the incoming batch in the left queue.
2. Inspect the recipe formula on screen and add the designated ingredients:
   - **गेहूं का आटा (Wheat Flour)**: 200 kg
   - **रिफाइंड चीनी (Refined Sugar)**: 150 kg
   - **पाम तेल (Palm Oil)**: 80 kg
   - **सोडियम बाइकार्बोनेट (Baking Soda)**: 20 kg
   - **वेनिला एसेंस (Vanilla Essence)**: 30 kg
   - **पिसी हुई मक्का (Ground Maize)**: 120 kg *(from Stage 1)*
3. Seal mixer and run for the designated time (e.g., 8.0 minutes).
4. **Fill Mandatory Operator Feedback**:
   - **Quality**: Select `Grade A - Optimal` or `Grade B - Acceptable`.
   - **Texture**: Select `Smooth Homogeneous` or `Slightly Grainy`.
   - **Star Rating**: Tap 1 to 5 stars.
   - **Remarks**: Confirm batch consistency notes.
5. Slide the emerald slider to finish:
   **`>>> स्लाइड करके अंतिम मिश्रण पूर्ण करें (FINISH BATCH) >>>`**.
6. The completed batch increments the factory total and logs into the central database.

---

## 5. Shift, Breaks & Emergency Controls

- **Taking a Break**: Tap **`☕ लंच / ब्रेक (LUNCH/BREAK)`** at the bottom. The tablet enters standby mode and informs the supervisor dashboard. Tap **`काम शुरू करें (RESUME)`** when returning.
- **Emergency Halt**: Tap the red **`🚨 आपातकालीन रोक (EMERGENCY)`** button to flag an emergency stoppage across the whole plant.
- **End Shift**: Tap **`🏁 शिफ्ट समाप्त (END SHIFT)`** to generate the shift summary report.

---

## 6. Offline-First Operation & Re-Sync

- The tablet operates **100% offline-first**.
- If factory Wi-Fi disconnects, the tablet continues to allow operators to mill, mix, and slide-confirm batches without interruption.
- All actions are stored locally in the tablet's **Android Room Database**.
- As soon as Wi-Fi reconnects, a background sync service automatically uploads all pending logs to the central SQLite server without duplicates.
