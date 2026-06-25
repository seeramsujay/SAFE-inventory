# Developer Takeover & Machine Transfer Guide

This guide details how to clone, set up, and compile the **Industrial Nexus** workspace on your new, higher-performance development machine.

---

## 1. Prerequisites (To Install on the New Machine)

Before copying or cloning the project, ensure the following are installed:

* **Node.js** (v18 or v20 recommended)
* **pnpm** (preferred package manager):
  ```bash
  npm install -g pnpm
  ```
* **Java Development Kit (JDK) 17**: Required for building the Android application (Gradle 9.x compatible).
* **Android Studio & Android SDK**:
  * Set up `ANDROID_HOME` or `ANDROID_SDK_ROOT` environment variables mapping to your SDK path.
* **Tailscale** (If testing locally via VPN):
  * Install Tailscale and log in to the same tailnet as your testing tablet.

---

## 2. Setting Up the Workspace

1. **Clone/Copy the Project Directory** onto the new machine.
2. **Transfer Environment Settings**:
   * Ensure the [.env](file:///home/sunny/.Projects/SAFE-inventory/.env) file exists in the root directory:
     ```env
     SUPABASE_URL=https://yzxikzlrhjgjymuwqnsl.supabase.co
     SUPABASE_ANON_KEY=sb_publishable_XpvCTqc8gmJOxp0Rrwlyng_Sl3GEN1O
     ```
3. **Install Dependencies**:
   Run this command at the root of the project to fetch all node packages:
   ```bash
   pnpm install
   ```

---

## 3. Running the Web Admin Portal & Local Server

To launch the local Express API backend (Port 3001) and Vite development client (Port 3000) concurrently:
```bash
pnpm dev
```
* **Frontend Dashboard**: Accessible at `http://localhost:3000`
* **Local Backend API**: Accessible at `http://localhost:3001`

---

## 4. Compiling the Android Worker App

On your new high-performance CPU, compiling will be much faster. Run these commands from the project root:

### Compile the Native Kotlin Kiosk App
This produces the Android worker app APK (saved in `app/build/outputs/apk/debug/app-debug.apk`):
```bash
./gradlew :app:assembleDebug
```

### Compile & Sync the Capacitor Admin App Wrapper
If you want to compile and rebuild the web dashboard wrapped inside a native Android container:
```bash
pnpm cap:build
```
This builds the React project, copies static assets into the Android container, and prepares the platform files.

---

## 5. Connecting and Testing (Tailscale vs Cloud)

* **Cloud Sync (Live Production)**:
  By default, the Android app will try to sync directly to your live Supabase cloud database. If the tablet has internet, it will work immediately out of the box.
* **Local Development Sync (Tailscale)**:
  If you are testing changes locally, find the Tailscale IP of your *new* machine (`tailscale ip -4` or via Tailscale dashboard) and update the fallback URL inside [PreferencesManager.kt](file:///home/sunny/.Projects/SAFE-inventory/app/src/main/java/com/example/data/PreferencesManager.kt#L39-L41).
