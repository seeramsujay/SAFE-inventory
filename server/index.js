import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { run, get, all, initDb, seedData } from './db.js';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Token verification middleware
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Missing station token. Scan pairing QR.' });
  }

  try {
    const validToken = await get('SELECT * FROM station_tokens WHERE token = ?', [token]);
    if (!validToken) {
      return res.status(403).json({ error: 'Invalid token. Unrecognized station.' });
    }
    if (Date.now() > validToken.expiresAt) {
      return res.status(403).json({ error: 'Station token expired. Re-pair station.' });
    }
    req.stationId = validToken.stationId;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Authentication internal error.' });
  }
}

// 1. Auth endpoints
app.post('/api/auth/token', async (req, res) => {
  const { stationId } = req.body;
  if (!stationId) {
    return res.status(400).json({ error: 'stationId is required' });
  }
  const token = 'TOKEN-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  const expiresAt = Date.now() + 90 * 24 * 60 * 60 * 1000; // 90 days

  try {
    await run(
      'INSERT INTO station_tokens (token, stationId, issuedAt, expiresAt) VALUES (?, ?, ?, ?)',
      [token, stationId, Date.now(), expiresAt]
    );
    res.json({ token, stationId, expiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/validate', authenticateToken, (req, res) => {
  res.json({ success: true, stationId: req.stationId });
});

// 2. Products endpoints
app.get('/api/products', async (req, res) => {
  try {
    const products = await all('SELECT * FROM products');
    // Parse ratios from string to JSON
    const parsedProducts = products.map(p => ({
      ...p,
      isActive: p.isActive === 1,
      mixtureRatios: JSON.parse(p.mixtureRatios || '[]')
    }));
    res.json(parsedProducts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  const { id, name, englishName, targetUph, colorHex, isActive, manualFileName, nominalBatchDurationSec, mixtureRatios } = req.body;
  try {
    const activeInt = isActive ? 1 : 0;
    const ratioStr = JSON.stringify(mixtureRatios || []);
    
    await run(
      `INSERT INTO products (id, name, englishName, targetUph, colorHex, isActive, manualFileName, nominalBatchDurationSec, mixtureRatios)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name,
         englishName=excluded.englishName,
         targetUph=excluded.targetUph,
         colorHex=excluded.colorHex,
         isActive=excluded.isActive,
         manualFileName=excluded.manualFileName,
         nominalBatchDurationSec=excluded.nominalBatchDurationSec,
         mixtureRatios=excluded.mixtureRatios`,
      [id, name, englishName, targetUph || 1200, colorHex || '#00875A', activeInt, manualFileName, nominalBatchDurationSec || 480, ratioStr]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Orders endpoints
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await all('SELECT * FROM orders');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  const { id, productKey, productNameEnglish, productNameHindi, totalBatchesScheduled, completedBatches, status, colorHex } = req.body;
  try {
    await run(
      `INSERT INTO orders (id, productKey, productNameEnglish, productNameHindi, totalBatchesScheduled, completedBatches, status, timestamp, colorHex)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         completedBatches=excluded.completedBatches,
         status=excluded.status`,
      [id, productKey, productNameEnglish, productNameHindi, totalBatchesScheduled, completedBatches || 0, status || 'PENDING', Date.now(), colorHex]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, completedBatches } = req.body;
  try {
    if (status !== undefined && completedBatches !== undefined) {
      await run('UPDATE orders SET status = ?, completedBatches = ? WHERE id = ?', [status, completedBatches, id]);
    } else if (status !== undefined) {
      await run('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    } else if (completedBatches !== undefined) {
      await run('UPDATE orders SET completedBatches = ? WHERE id = ?', [completedBatches, id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Inventory endpoints
app.get('/api/inventory', async (req, res) => {
  try {
    const items = await all('SELECT * FROM inventory');
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory/adjust', async (req, res) => {
  const { itemId, stock } = req.body;
  try {
    await run('UPDATE inventory SET stock = ?, lastUpdated = ? WHERE itemId = ?', [stock, Date.now(), itemId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper for core inventory deduction & order progress logging
async function processBatchLogDeductions(log) {
  // 1. Deduplicate check
  const existingLog = await get('SELECT * FROM batch_logs WHERE batchId = ?', [log.batchId]);
  if (existingLog) {
    return false; // Skip
  }

  // 2. Write log
  await run(
    `INSERT INTO batch_logs (batchId, productNameHindi, productNameEnglish, line, unitsProduced, status, timestamp, targetUnits)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [log.batchId, log.productNameHindi, log.productNameEnglish, log.line, log.unitsProduced, log.status, log.timestamp, log.targetUnits]
  );

  if (log.status !== 'Success') {
    return true; // No inventory/order changes on failure logs
  }

  // 3. Find matching product formulas
  const product = await get(
    'SELECT * FROM products WHERE englishName = ? OR name = ?',
    [log.productNameEnglish, log.productNameHindi]
  );

  if (product) {
    const batchSizeKg = log.unitsProduced || 600; // default nominal weight is mapped from unitsProduced or 600
    const ratios = JSON.parse(product.mixtureRatios || '[]');

    // Deduct raw ingredients
    for (const ing of ratios) {
      const amountDeducted = (ing.percentage / 100) * batchSizeKg;
      await run(
        'UPDATE inventory SET stock = MAX(0, stock - ?), lastUpdated = ? WHERE itemId = ?',
        [amountDeducted, Date.now(), ing.ingredientId]
      );
    }

    // Increment finished product stock by 1 batch
    const finishedProdId = product.id.replace('PRD-', 'FIN-');
    await run(
      `UPDATE inventory SET stock = stock + 1, lastUpdated = ? WHERE itemId = ?`,
      [Date.now(), finishedProdId]
    );
  }

  // 4. Update the active order's completed batch count
  const activeOrder = await get(
    "SELECT * FROM orders WHERE (productNameEnglish = ? OR productNameHindi = ?) AND status = 'ACTIVE' LIMIT 1",
    [log.productNameEnglish, log.productNameHindi]
  );

  if (activeOrder) {
    const newCompleted = activeOrder.completedBatches + 1;
    let newStatus = 'ACTIVE';
    if (newCompleted >= activeOrder.totalBatchesScheduled) {
      newStatus = 'COMPLETED';
    }
    await run(
      'UPDATE orders SET completedBatches = ?, status = ? WHERE id = ?',
      [newCompleted, newStatus, activeOrder.id]
    );
  }

  return true;
}

// 5. Batch logs endpoints
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await all('SELECT * FROM batch_logs ORDER BY timestamp DESC');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/logs', authenticateToken, async (req, res) => {
  try {
    const success = await processBatchLogDeductions(req.body);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/logs/bulk', authenticateToken, async (req, res) => {
  const logs = req.body;
  if (!Array.isArray(logs)) {
    return res.status(400).json({ error: 'Request body must be an array of logs' });
  }

  try {
    let processCount = 0;
    for (const log of logs) {
      const processed = await processBatchLogDeductions(log);
      if (processed) processCount++;
    }
    res.json({ success: true, processedCount: processCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Reset & Reseed
app.post('/api/reset', async (req, res) => {
  try {
    await run('DELETE FROM batch_logs');
    await run("UPDATE orders SET completedBatches = 0, status = 'ACTIVE' WHERE id = 'ORD-1001'");
    await run("UPDATE orders SET completedBatches = 0, status = 'PENDING' WHERE id = 'ORD-1002'");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reseed', async (req, res) => {
  try {
    await seedData();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    for (const iface of interfaces[interfaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.get('/api/info', (req, res) => {
  res.json({
    localIp: getLocalIpAddress(),
    port: PORT
  });
});

// Fallback all non-API GET requests to index.html for SPA routing
app.get('/*splat', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start listening
initDb().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`Production Nexus server listening on port ${PORT}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`ERROR: Port ${PORT} is already in use by another process.`);
      process.exit(1);
    } else {
      console.error("Server error:", err);
    }
  });
}).catch(err => {
  console.error("Failed database init:", err);
});
