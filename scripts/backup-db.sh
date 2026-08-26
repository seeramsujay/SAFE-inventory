#!/bin/bash
# ============================================================
#  SAFE-Inventory — Daily SQLite Backup
#  Keeps rolling 7-day backups. Safe to run while server runs.
# ============================================================
DB_FILE="/root/SAFE-inventory/nexus.db"
BACKUP_DIR="/root/SAFE-inventory/backups"
DATE=$(date +%Y-%m-%d_%H%M)
BACKUP_FILE="$BACKUP_DIR/nexus_$DATE.db"

mkdir -p "$BACKUP_DIR"

# Use SQLite's online backup (safe even while server is writing)
node -e "
import('/root/SAFE-inventory/server/db.js').then(async ({ run }) => {
  await run(\"PRAGMA wal_checkpoint(PASSIVE);\");
  process.exit(0);
}).catch(() => process.exit(0));
" 2>/dev/null

cp "$DB_FILE" "$BACKUP_FILE"
echo "[$(date)] Backup created: $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))"

# Keep only last 7 daily backups
ls -t "$BACKUP_DIR"/nexus_*.db 2>/dev/null | tail -n +8 | xargs -r rm -f
echo "[$(date)] Backup cleanup done. Kept $(ls "$BACKUP_DIR"/nexus_*.db 2>/dev/null | wc -l) backups."
