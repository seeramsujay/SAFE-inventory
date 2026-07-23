#!/usr/bin/env bash
set -e

echo "======================================================="
echo " Industrial Nexus — Debian Server Deployment Setup "
echo "======================================================="

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js (v18+) first."
    exit 1
fi

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo "pnpm not found. Installing pnpm globally..."
    npm install -g pnpm
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "[1/4] Environment setup..."
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
fi

echo "[2/4] Installing dependencies & building production bundle..."
pnpm install
pnpm build

echo "[3/4] Running automated backend test suite..."
pnpm test:server

USER_NAME="$(whoami)"
NODE_BIN="$(which node)"
SERVICE_PATH="/etc/systemd/system/industrial-nexus.service"

echo "[4/4] Generating systemd service unit file..."

cat << EOF > industrial-nexus.service
[Unit]
Description=Industrial Nexus Cyber-Physical Manufacturing Server
After=network.target

[Service]
Type=simple
User=${USER_NAME}
WorkingDirectory=${PROJECT_DIR}
ExecStart=${NODE_BIN} server/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=${PROJECT_DIR}/.env

[Install]
WantedBy=multi-user.target
EOF

echo ""
echo "======================================================="
echo " Deployment Files Generated Successfully! "
echo "======================================================="
echo ""
echo "To complete setup on your Debian server, run:"
echo ""
echo "1. Install systemd service:"
echo "   sudo mv industrial-nexus.service ${SERVICE_PATH}"
echo "   sudo systemctl daemon-reload"
echo "   sudo systemctl enable --now industrial-nexus.service"
echo ""
echo "2. Check server status:"
echo "   sudo systemctl status industrial-nexus.service"
echo "   journalctl -u industrial-nexus.service -f"
echo ""
echo "3. Prevent Laptop from Sleeping on Lid Close (CRITICAL FOR LAPTOPS):"
echo "   Edit /etc/systemd/logind.conf:"
echo "     sudo nano /etc/systemd/logind.conf"
echo "   Set:"
echo "     HandleLidSwitch=ignore"
echo "     HandleLidSwitchExternalPower=ignore"
echo "   Then apply:"
echo "     sudo systemctl restart systemd-logind"
echo ""
echo "4. Allow Firewall Traffic (Port 3001):"
echo "   sudo ufw allow 3001/tcp"
echo ""
