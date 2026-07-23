# Debian Laptop Server Deployment Guide

This guide walks you through turning any Debian-based laptop into a production-grade, 24/7 **Industrial Nexus host server** for your factory floor operations and admin control room.

---

## 📋 Prerequisites

Ensure your Debian server has:
1. **Debian 11/12** installed (or Debian-based distros like Ubuntu Server / Linux Mint).
2. **Node.js (v18+)** installed.
3. **pnpm** installed (`npm install -g pnpm`).
4. **LAN / Wi-Fi Network Access** (or a Tailscale / WireGuard VPN connection for remote access).

---

## 🚀 Quick Automated Setup

Run the automated deployment script directly from your project directory:

```bash
chmod +x scripts/deploy-debian.sh
./scripts/deploy-debian.sh
```

This script will:
- Check Node.js and pnpm prerequisites.
- Initialize your `.env` configuration.
- Install node dependencies and compile the production React dashboard (`pnpm build`).
- Execute the backend API test suite (`pnpm test:server`).
- Generate the systemd service file `industrial-nexus.service`.

---

## ⚡ Step-by-Step Production Configuration

### 1. Enable Systemd Auto-Start Service

Move the generated service file to systemd and start the server:

```bash
sudo mv industrial-nexus.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now industrial-nexus.service
```

#### Service Management Commands
- **Check Status**: `sudo systemctl status industrial-nexus.service`
- **View Real-Time Logs**: `journalctl -u industrial-nexus.service -f`
- **Restart Server**: `sudo systemctl restart industrial-nexus.service`
- **Stop Server**: `sudo systemctl stop industrial-nexus.service`

---

### 2. Disable Laptop Lid Sleep (CRITICAL FOR LAPTOP SERVERS)

By default, Debian suspends/sleeps when the laptop lid is closed. To keep the server running 24/7 with the lid closed:

1. Open `/etc/systemd/logind.conf` with root privileges:
   ```bash
   sudo nano /etc/systemd/logind.conf
   ```
2. Find or uncomment the following lines and set them to `ignore`:
   ```ini
   HandleLidSwitch=ignore
   HandleLidSwitchExternalPower=ignore
   HandleLidSwitchDocked=ignore
   ```
3. Save the file (`Ctrl+O`, `Enter`, `Ctrl+X`).
4. Restart the logind service to apply changes:
   ```bash
   sudo systemctl restart systemd-logind
   ```

---

### 3. Firewall & Local Network Access

Allow incoming connections on port `3001` (and port `80`/`443` if using Nginx/Reverse Proxy):

```bash
sudo ufw allow 3001/tcp
```

Find your server's local IP address:
```bash
ip addr show
```
*(Look for `inet` under `eth0` or `wlan0`, e.g., `192.168.1.150`)*.

---

### 4. Connecting Android Tablets & Web Dashboards

#### Web Dashboard Access
In any web browser on your LAN:
`http://<SERVER_IP>:3001` (e.g. `http://192.168.1.150:3001`)
- **Default Username**: `admin`
- **Default Password**: `nexus123`

#### Android Tablet App Pairing
1. Open the Admin Web Dashboard on the server or manager laptop.
2. Navigate to **Station Pairing QR** tab.
3. Scan the QR code with the Android Kiosk tablet camera.
4. The tablet automatically stores the server IP and station pairing token.

---

## 🔒 Security Best Practices for Production

1. **Change Default Credentials**: Edit `.env` on the server:
   ```env
   DASHBOARD_USER=your_custom_user
   DASHBOARD_PASSWORD=your_secure_password
   MASTER_API_KEY=your_custom_station_key
   ```
   Then restart the service: `sudo systemctl restart industrial-nexus.service`.

2. **Static IP**: Assign a static IP address to your laptop server in your router settings (DHCP reservation) so its IP address never changes after a reboot.
