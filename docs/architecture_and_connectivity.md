# Industrial Nexus: Local-First Architecture & Connectivity Documentation

This document explains the architectural layout and connectivity design of the **Industrial Nexus** system, focusing on its transition to a self-hosted, local-first model optimized for factory floor environments.

---

## 1. Architectural Evolution

Previously, the codebase used a split-brain model:
* **Dashboard client**: Deployed to Vercel (stateless serverless edge).
* **Worker database**: Supabase cloud database instance.
* **Local instance fallback**: Express server with an in-memory database.

This introduced multiple single points of failure (cloud outages, local network socket timeouts, out-of-sync states when offline).

### The Local-First Solution (Option A)
The system has been refactored into a unified, **Self-Hosted Express + SQLite** backend:
* **Single Source of Truth**: A local SQLite database (`nexus.db`) stored on the host computer.
* **Unified API Engine**: Express server handles dashboard routing, static React asset delivery, and worker tablet APIs.
* **Offline Resilience**: The Android application operates offline-first, syncing queued data when connectivity is available.

```mermaid
graph TD
    subgraph Host Computer (Server)
        Express[Express API Server (Port 3001)]
        SQLite[(Local SQLite: nexus.db)]
        Vite[Vite Dev Server (Port 3005)]
    end

    subgraph Factory Floor (Local Network / Tailscale)
        Android[Android Kiosk Tablet App]
    end

    Android -- "JSON Pull/Push API" --> Express
    Express -- "Read/Write" --> SQLite
    Vite -- "Proxy /api" --> Express
```

---

## 2. Connectivity & Network Infrastructure

The system is optimized to operate on local area networks (LAN) and virtual private networks (VPN) like **Tailscale**.

### Tailscale Integration
Tailscale allows devices to connect in a secure overlay network without port forwarding or complex DNS setups:
* **Global Binding**: The Express server binds to `0.0.0.0`, listening on all active interfaces (including `tailscale0`).
* **Auto-IP Pairing**: The dashboard detects hostnames starting with `100.` (CGNAT Tailscale IPs) and formats pairing QR codes to point to `http://<tailscale-ip>:3001`.
* **Zero Cloud Dependence**: Communication stays local/peer-to-peer.

### Tablet Pairing Lifecycle
1. **Unpaired State**: On fresh install, the Android app has an empty server URL default, forcing the pairing screen.
2. **Pairing**: Scanning the admin portal QR code updates the tablet's encrypted shared preferences with the target server URL and secure station token.
3. **Polling Loop**: Once paired, a background poll loop fetches active orders and products from the server every 2 seconds.

---

## 3. Core Reliability Features

### Atomic Queue Promotion
To prevent queue blocks on the factory floor, order status changes and deletions are handled atomically on the server:
* When an active order is marked **Completed** (via logs post) or **Cancelled** (via PATCH), the server queries the `orders` table for the next **Pending** order.
* If found, the next order is automatically promoted to **Active** in a single database transaction.
* If an active order is **Deleted**, the promotion triggers immediately.

### Security Configurations
Network security policies are enforced dynamically based on compilation flags:
* **Debug Mode (`BuildConfig.DEBUG = true`)**: Bypasses SSL certificate verification to allow testing over local HTTP, dynamic loopbacks (`10.0.2.2`), and self-signed private tunnels.
* **Release Mode (`BuildConfig.DEBUG = false`)**: Enforces standard SSL/TLS hostname verification and certificate validation, safeguarding production data.
