# Step 1: Run the deployment script
./scripts/deploy-debian.sh

# Step 2: Install and enable the systemd service (auto-starts on boot)
sudo mv industrial-nexus.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now industrial-nexus.service

# Step 3: Prevent Debian from sleeping when closing the laptop lid (CRITICAL FOR LAPTOPS)
sudo nano /etc/systemd/logind.conf
# Set:
#   HandleLidSwitch=ignore
#   HandleLidSwitchExternalPower=ignore
# Then restart logind:
sudo systemctl restart systemd-logind

# Step 4: Allow firewall traffic on port 3001
sudo ufw allow 3001/tcp
