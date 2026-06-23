# Industrial Nexus — Cloud Sync & Factory Inventory Controller

Industrial Nexus is a next-generation cyber-physical manufacturing suite that bridges shop-floor operations with administrative control. The system comprises a **native Android tablet app** (Kotlin, Jetpack Compose) for factory operators and a **React-based cloud companion dashboard** (Vite, TypeScript, TailwindCSS) for administrators.

---

## 🚀 Key Features

### 1. Native Android Tablet Application (Shop-Floor)
* **Interactive Station Views**: High-contrast, industrial-grade Compose UI optimized for tablet viewport ratios.
* **Worker Queue Controls**: Simple, login-free operation using long-lived onboarding tokens with physical QR-code pairing.
* **Swipe-to-Confirm Slider**: Operational safety guardrails preventing accidental batch completion triggers.
* **Real-time Batch Sync**: Integrated OkHttp client signaling completion logs directly to the admin middleware.

### 2. Admin Web Companion Dashboard (Control Room)
* **Factory Floor Overview**: Real-time batch progression tracking, uptime statistics, and line-specific analytics.
* **Mixture Formulas Catalog**: Manage mixture formulas translated dynamically to the Android database.
* **Interactive Ingredient Sliders**: Granular ingredient ratio adjustment with real-time percentage summation and validation.
* **Real-time Inventory Tracking**: Automated consumption tracking of raw material inputs and output stocks based on batch logging.
* **Persistent Dev Middleware**: Custom Vite dev server intercepting endpoints for automatic state preservation in `api_logs.json`.

---

## 📂 Repository Structure

```
├── app/                      # Native Kotlin Android tablet application
│   ├── src/main/java/        # Jetpack Compose UI screens & ViewModel logic
│   └── build.gradle.kts      # Kotlin/Android compilation config
├── src/                      # Admin Companion Web Dashboard
│   ├── App.tsx               # Main dashboard controller interface
│   ├── index.css             # Industrial styling theme configurations
│   └── main.tsx              # React mounting root
├── vite.config.ts            # Vite config with integrated dev server API middleware
├── package.json              # Web app dependencies & build scripts
└── settings.gradle.kts       # Gradle project settings
```

---

## 🛠️ Getting Started & Local Development

### Prerequisites
* **Java Development Kit (JDK)**: Version 17 or higher
* **Node.js**: Version 18+ (with `npm` or `pnpm`)
* **Android SDK / Studio** (optional, for compiling the tablet application)

### Running the Web Dashboard (Companion Portal)
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the Vite development server with the integrated API middleware:
   ```bash
   npm run dev
   ```
   *The server will boot at `http://localhost:3000/`.*

3. To build the production web bundle:
   ```bash
   npm run build
   ```

### Compiling the Native Android Application
1. To clean and build the debug APK directly from the command line:
   ```bash
   ./gradlew clean assembleDebug
   ```
2. The generated APK will be available at:
   ```
   app/build/outputs/apk/debug/app-debug.apk
   ```
3. Install the APK to a connected emulator or tablet device:
   ```bash
   adb install app/build/outputs/apk/debug/app-debug.apk
   ```

---

## 🔌 API Sync Endpoints
The Vite server features an embedded backend mocking layer which exposes:
* `GET /api/logs` - Retrieve the persistent batch logs history.
* `POST /api/logs` - Post a new batch log from the Android app.
* `POST /api/reset` - Clear all logs history.
* `POST /api/reseed` - Reseed the initial baseline datasets.

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
