import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const SERVER_URL = process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:3001';
const STATION_ID = 'KIOSK-EMU-01';

// Load Pairing Token from .env if available
let stationToken = 'sb_publishable_XpvCTqc8gmJOxp0Rrwlyng_Sl3GEN1O';
try {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        const value = (match[2] || '').trim();
        if (key === 'SUPABASE_ANON_KEY') {
          stationToken = value.replace(/['"]/g, '');
        }
      }
    });
  }
} catch (e) {
  // Silent fallback
}

// State variables
let activeOrder = null;
let statusMessage = '';
let statusTimeout = null;

// Initialize Keypress Listening
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

// Clear screen and draw terminal UI
function drawUI() {
  // Clear screen & home cursor
  process.stdout.write('\x1B[2J\x1B[H');

  console.log('\x1b[36m============================================================\x1b[0m');
  console.log('\x1b[1m\x1b[35m         INDUSTRIAL NEXUS - FLOOR TERMINAL EMULATOR         \x1b[0m');
  console.log('\x1b[36m============================================================\x1b[0m');
  console.log(`Station ID: \x1b[33m${STATION_ID}\x1b[0m | Server URL: \x1b[32m${SERVER_URL}\x1b[0m`);
  console.log('\x1b[36m------------------------------------------------------------\x1b[0m');

  if (activeOrder) {
    const completed = activeOrder.completedBatches;
    const total = activeOrder.totalBatchesScheduled;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Build brutalist progress bar
    const barWidth = 30;
    const completedWidth = Math.round((percent / 100) * barWidth);
    const remainingWidth = Math.max(0, barWidth - completedWidth);
    const progressBar = '█'.repeat(completedWidth) + '░'.repeat(remainingWidth);

    console.log(`Active Job ID:  \x1b[1m\x1b[33m${activeOrder.id}\x1b[0m`);
    console.log(`Product Name:   \x1b[1m\x1b[32m${activeOrder.productNameEnglish}\x1b[0m (${activeOrder.productNameHindi})`);
    console.log(`Batch Progress: \x1b[1m\x1b[37m${completed} / ${total}\x1b[0m batches completed`);
    console.log(`Progress Bar:   [${progressBar}] ${percent}%`);
    console.log('\x1b[36m------------------------------------------------------------\x1b[0m');
    console.log('\x1b[1m\x1b[32m  [C] Complete Current Batch\x1b[0m  |  \x1b[1m\x1b[31m[Q] Terminate Emulator\x1b[0m');
  } else {
    console.log('\x1b[1m\x1b[31mSTATUS: IDLE - NO ACTIVE ORDER ASSIGNED\x1b[0m');
    console.log('Awaiting recipe dispatches from the administrative console...');
    console.log('\x1b[36m------------------------------------------------------------\x1b[0m');
    console.log('\x1b[1m\x1b[31m  [Q] Terminate Emulator\x1b[0m');
  }

  if (statusMessage) {
    console.log('\n' + statusMessage);
  }
}

// Fetch active order from server
async function pollActiveOrder() {
  try {
    const res = await fetch(`${SERVER_URL}/api/orders`);
    if (res.ok) {
      const orders = await res.json();
      const currentActive = orders.find(o => o.status === 'ACTIVE');
      
      // Determine if active order changed or updated
      const prevActiveId = activeOrder ? activeOrder.id : null;
      const nextActiveId = currentActive ? currentActive.id : null;
      const prevCompleted = activeOrder ? activeOrder.completedBatches : 0;
      const nextCompleted = currentActive ? currentActive.completedBatches : 0;

      if (prevActiveId !== nextActiveId || prevCompleted !== nextCompleted) {
        activeOrder = currentActive || null;
        drawUI();
      }
    }
  } catch (err) {
    statusMessage = `\x1b[1m\x1b[31m[Error] Connection failed to ${SERVER_URL}: ${err.message}\x1b[0m`;
    drawUI();
  }
}

// Complete the active batch
async function completeBatch() {
  if (!activeOrder) return;

  const currentOrder = activeOrder;
  const newCompleted = currentOrder.completedBatches + 1;
  const nextBatchId = 'B-' + Math.floor(Math.random() * 900000 + 100000);
  const newStatus = newCompleted >= currentOrder.totalBatchesScheduled ? 'COMPLETED' : 'ACTIVE';

  // Optimistic UI update
  activeOrder.completedBatches = newCompleted;
  if (newStatus === 'COMPLETED') {
    activeOrder = null;
  }
  
  statusMessage = `\x1b[1m\x1b[33mPushed Batch Confirmation Log: ${nextBatchId} ...\x1b[0m`;
  drawUI();

  try {
    // 1. Send Batch Log
    const logRes = await fetch(`${SERVER_URL}/api/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${stationToken}`,
        'x-station-id': STATION_ID
      },
      body: JSON.stringify({
        batchId: nextBatchId,
        productNameHindi: currentOrder.productNameHindi,
        productNameEnglish: currentOrder.productNameEnglish,
        line: 'Line A',
        unitsProduced: 1250,
        status: 'Success',
        timestamp: Date.now(),
        targetUnits: 1250
      })
    });

    // 2. Patch Order Status
    const orderRes = await fetch(`${SERVER_URL}/api/orders/${currentOrder.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        completedBatches: newCompleted,
        status: newStatus
      })
    });

    if (logRes.ok && orderRes.ok) {
      statusMessage = `\x1b[1m\x1b[32m✔ BATCH ${nextBatchId} CONFIRMED & INVENTORY DEDUCTED SUCCESSFULLY!\x1b[0m`;
    } else {
      statusMessage = `\x1b[1m\x1b[31m✖ Failed updating server. Log status: ${logRes.status}, Order status: ${orderRes.status}\x1b[0m`;
    }
  } catch (err) {
    statusMessage = `\x1b[1m\x1b[31m✖ Error updating batch log: ${err.message}\x1b[0m`;
  }

  drawUI();

  // Reset status message after 2.5 seconds
  if (statusTimeout) clearTimeout(statusTimeout);
  statusTimeout = setTimeout(() => {
    statusMessage = '';
    drawUI();
  }, 2500);
}

// Handle terminal keypresses
process.stdin.on('keypress', (str, key) => {
  if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
    // Exit
    process.stdout.write('\x1B[2J\x1B[H');
    console.log('Nexus Floor Terminal Emulator shut down cleanly.');
    process.exit(0);
  }

  if (key.name === 'c' || str === 'c') {
    completeBatch();
  }
});

// Run Initial Draw
drawUI();

// Poll active order immediately and start interval
pollActiveOrder();
const pollInterval = setInterval(pollActiveOrder, 2000);
