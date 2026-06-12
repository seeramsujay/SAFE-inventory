# Industrial Nexus — Antigravity Onboarding Guide

Welcome to the **Industrial Nexus Onboarding & Deployment Manual**. This document details how to initialize, package, test, and host the Industrial Nexus codebase.

---

## 📁 Repository Layout Map

The workspace contains both the client-side tablet terminal code (Android) and the server-side Companion dashboard code (Vite React Web) side-by-side in a unified repository:

```
├── app/                        <-- Android Application Module (Kotlin / Jetpack Compose)
│   ├── src/
│   │   ├── main/
│   │   │   ├── AndroidManifest.xml
│   │   │   ├── java/com/example/
│   │   │   │   ├── MainActivity.kt
│   │   │   │   ├── data/       <-- Database Entities, DAOs, and Room database
│   │   │   │   └── ui/         <-- Screens, M3 colors theme, ViewModels
│   │   │   └── res/            <-- Standard layouts drawables, layout strings.xml
│   └── build.gradle.kts
├── src/                        <-- Admin Cloud Companion Web Source (React / TSX)
│   ├── App.tsx                 <-- High-fidelity system controller dashboard
│   ├── main.tsx
│   └── index.css               <-- Tailwind utilities styling
├── build.gradle.kts            <-- Root Gradle project file
├── settings.gradle.kts          <-- Root Gradle settings configuration
├── package.json                <-- Npm package configuration (Vite + React)
├── tailwind.config.js          <-- Tailwind theme colors matching hardware terminals
├── tsconfig.json               <-- TypeScript type checking configurations
└── vite.config.ts              <-- Vite build target configurations
```

---

## ⚙️ Setting Up Local Development

### 1. Web Portal Setup (Vite / React)
To boot up the live Companion Dashboard on your local network:
```bash
# 1. Install required web dependencies
npm install

# 2. Boot up local Vite dev server (by default binds to port 3000)
npm run dev

# 3. Compile high-performance static files ready for deployment (HTML / JS / CSS)
npm run build
```

The web dashboard uses optimized, robust TypeScript settings that compile reliably without strict unused-variable blockages, ensuring swift CI/CD builds on Vercel or other hosts.

---

## 🛠️ Compiling & Testing the Android App

This workspace includes standard Android build tools. You can run all Gradle commands directly through your command line or Antigravity terminal interface.

### 1. Verification & Compilation
To verify the syntax, check Kotlin components, and perform an end-to-end Gradle build on the Android app module:
```bash
# Compile and sync references
gradle assembleDebug
```
This generates your development APK inside `/app/build/outputs/apk/debug/`.

### 2. Local Unit Tests
To run unit and database logic assertions locally:
```bash
gradle :app:testDebugUnitTest
```

---

## 🚀 Easy Vercel Web Deployment Guide

Since the Companion Portal is optimized as an offline-first serverless application with instant client-side responsive state fallback (`localStorage`), deploying it to Vercel takes less than a minute:

1. **Push your code to GitHub**: Connect your repository to your GitHub account.
2. **Import into Vercel**:
   * Click **Add New** -> **Project** on your Vercel Dashboard.
   * Import your `industrial-nexus-web` repository.
3. **Configure Project Settings**:
   * Vercel will auto-detect the Vite / React framework.
   * **Root Directory**: Select `/` (the root directory contains the `package.json`).
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. **Deploy**: Click **Deploy**. Vercel will compile the TypeScript definitions and output the highly polished, dark-themed cyber admin portal with zero backend setup costs.

---

## 🔋 Synchronizing Floor Tablets to the Cloud

Once the web companion is deployed to your custom Vercel address:
1. Copy the URL of your Vercel app (e.g. `https://industrial-nexus.vercel.app`).
2. Open your Android `mock` directory or integration layer scripts.
3. Update the `serverUrl` inside your background worker syncer (`CentralDatabaseSynchronizer` class constructor):
   ```kotlin
   val centralSyncer = CentralDatabaseSynchronizer(
       client = httpClient,
       batchLogDao = database.batchLogDao(),
       serverUrl = "https://your-vercel-deployment.app/api/sync"
   )
   ```
4. This class will automatically serialize offline-first Room SQLite arrays into JSON payloads and post them to your Vercel edge routes when connectivity is restored!
