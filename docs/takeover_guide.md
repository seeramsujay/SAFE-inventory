# Developer Takeover & Machine Transfer Guide

This guide details how to clone, set up, compile, and run the **Industrial Nexus** workspace.

---

## 1. Prerequisites (To Install on the New Machine)

Before copying or cloning the project, ensure the following are installed:

* **Node.js** (v18 or v20 recommended)
* **pnpm** (preferred package manager):
  ```bash
  npm install -g pnpm
  ```
* **Java Development Kit (JDK) 21**: Required for building the Android application (Gradle 9.x compatible).
* **Android Studio & Android SDK**:
  * Set up `ANDROID_HOME` or `ANDROID_SDK_ROOT` environment variables mapping to your SDK path.
* **Tailscale** (If testing locally via VPN on physical devices):
  * Install Tailscale and log in to the same tailnet as your testing tablet.

---

## 2. Setting Up the Workspace

1. **Clone/Copy the Project Directory** onto the new machine.
2. **Install Dependencies**:
   Run this command at the root of the project to fetch all node packages:
   ```bash
   pnpm install
   ```

---

## 3. Running the Web Admin Portal & Local Server

To launch the local Express API backend (Port 3001) and Vite development client (Port 3005) concurrently:
```bash
pnpm dev
```
* **Frontend Dashboard**: Accessible at `http://localhost:3005`
* **Local Backend API**: Accessible at `http://localhost:3001`

---

## 4. Compiling the Android Worker App

Run these commands from the project root:

### Compile the Native Kotlin Kiosk App
This produces the Android worker app APK (saved in `app/build/outputs/apk/debug/app-debug.apk`):
```bash
./gradlew :app:assembleDebug
```

---

## 5. Pairing the Tablet (LAN / Tailscale)

* **Emulator Development (Local Loopback)**:
  Launch the app on the Android emulator and tap **SIMULATE SCAN** to pair to the localhost endpoint (`http://10.0.2.2:3001`).
* **Physical Device Development (LAN / Tailscale)**:
  Ensure the tablet and development machine are on the same Wi-Fi network or connected to the same Tailscale network. In the Admin Dashboard pairing section, input the LAN or Tailscale IP of your host machine (e.g. `http://192.168.1.50:3001`) to generate the pairing QR code, then scan it using the tablet's camera.
