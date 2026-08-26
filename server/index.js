import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { run, get, all, initDb, seedData } from './db.js';
import os from 'os';

// Translation helper using Google's free translation API
async function translateToHindi(text) {
  if (!text) return '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0] && data[0][0] && data[0][0][0]) {
        return data[0][0][0];
      }
    }
  } catch (err) {
    console.error("Translation error:", err);
  }
  return text; // Fallback to English input
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Basic Authentication for Non-API (web/dashboard) paths
function basicAuth(req, res, next) {
  // Exempt API paths from basic auth (handled by API token validation)
  if (req.path.startsWith('/api')) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Industrial Nexus Dashboard"');
    return res.status(401).send('Authentication required.');
  }

  const parts = authHeader.split(' ');
  if (parts[0] !== 'Basic') {
    res.setHeader('WWW-Authenticate', 'Basic realm="Industrial Nexus Dashboard"');
    return res.status(401).send('Authentication required.');
  }

  const credentials = Buffer.from(parts[1], 'base64').toString().split(':');
  const user = credentials[0];
  const pass = credentials[1];

  const expectedUser = process.env.DASHBOARD_USER || 'admin';
  const expectedPass = process.env.DASHBOARD_PASSWORD || 'nexus123';

  if (user === expectedUser && pass === expectedPass) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Industrial Nexus Dashboard"');
  return res.status(401).send('Authentication required.');
}

app.use(basicAuth);
app.use(express.static(path.join(__dirname, '../dist')));

// Token verification middleware
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token || req.body?.token;

  if (!token) {
    return res.status(401).json({ error: 'Missing station token. Scan pairing QR.' });
  }

  const masterApiKey = process.env.MASTER_API_KEY || 'sb_publishable_XpvCTqc8gmJOxp0Rrwlyng_Sl3GEN1O';
  if (token === masterApiKey) {
    req.stationId = req.headers['x-station-id'] || 'KIOSK-01';
    return next();
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
    req.stationType = validToken.stationType || (validToken.stationId?.toLowerCase().includes('grind') ? 'grinder' : 'mixer');
    next();
  } catch (err) {
    res.status(500).json({ error: 'Authentication internal error.' });
  }
}

// 1. Auth endpoints
app.post('/api/auth/token', async (req, res) => {
  const { stationId, stationType } = req.body;
  if (!stationId) {
    return res.status(400).json({ error: 'stationId is required' });
  }
  const finalStationType = stationType || (stationId.toLowerCase().includes('grind') ? 'grinder' : 'mixer');
  const token = 'TOKEN-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  const expiresAt = Date.now() + 100 * 365 * 24 * 60 * 60 * 1000; // 100 years

  try {
    await run(
      'INSERT INTO station_tokens (token, stationId, stationType, issuedAt, expiresAt) VALUES (?, ?, ?, ?, ?)',
      [token, stationId, finalStationType, Date.now(), expiresAt]
    );
    res.json({ token, stationId, stationType: finalStationType, expiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/validate', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

  if (!token) return res.json({ valid: false, reason: 'no_token' });

  const masterApiKey = process.env.MASTER_API_KEY || 'sb_publishable_XpvCTqc8gmJOxp0Rrwlyng_Sl3GEN1O';
  if (token === masterApiKey) {
    const stationId = req.headers['x-station-id'] || 'KIOSK-01';
    const stationType = req.headers['x-station-type'] || (stationId.toLowerCase().includes('grind') ? 'grinder' : 'mixer');
    return res.json({ valid: true, stationId, stationType });
  }

  try {
    const validToken = await get('SELECT * FROM station_tokens WHERE token = ?', [token]);
    if (!validToken) return res.json({ valid: false, reason: 'unknown_token' });
    if (Date.now() > validToken.expiresAt) return res.json({ valid: false, reason: 'expired' });
    const stationType = validToken.stationType || (validToken.stationId?.toLowerCase().includes('grind') ? 'grinder' : 'mixer');
    res.json({ valid: true, stationId: validToken.stationId, stationType });
  } catch (err) {
    res.json({ valid: false, reason: 'db_error' });
  }
});

app.post('/api/stations/break', authenticateToken, async (req, res) => {
  const { isOnBreak } = req.body;
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token || req.body?.token;
  try {
    const status = isOnBreak ? 1 : 0;
    const breakStarted = isOnBreak ? Date.now() : 0;
    const existing = await get('SELECT * FROM station_tokens WHERE token = ? OR stationId = ?', [token, req.stationId]);
    if (existing) {
      await run(
        'UPDATE station_tokens SET isOnBreak = ?, breakStartedAt = ? WHERE token = ? OR stationId = ?',
        [status, breakStarted, token, req.stationId]
      );
    } else {
      const expiresAt = Date.now() + 100 * 365 * 24 * 60 * 60 * 1000;
      await run(
        'INSERT INTO station_tokens (token, stationId, issuedAt, expiresAt, isOnBreak, breakStartedAt) VALUES (?, ?, ?, ?, ?, ?)',
        [token || ('TOKEN-' + req.stationId), req.stationId, Date.now(), expiresAt, status, breakStarted]
      );
    }
    res.json({ success: true, isOnBreak: status, breakStartedAt: breakStarted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/station/break', authenticateToken, async (req, res) => {
  const { isOnBreak } = req.body;
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token || req.body?.token;
  try {
    const status = isOnBreak ? 1 : 0;
    const breakStarted = isOnBreak ? Date.now() : 0;
    const existing = await get('SELECT * FROM station_tokens WHERE token = ? OR stationId = ?', [token, req.stationId]);
    if (existing) {
      await run(
        'UPDATE station_tokens SET isOnBreak = ?, breakStartedAt = ? WHERE token = ? OR stationId = ?',
        [status, breakStarted, token, req.stationId]
      );
    } else {
      const expiresAt = Date.now() + 100 * 365 * 24 * 60 * 60 * 1000;
      await run(
        'INSERT INTO station_tokens (token, stationId, issuedAt, expiresAt, isOnBreak, breakStartedAt) VALUES (?, ?, ?, ?, ?, ?)',
        [token || ('TOKEN-' + req.stationId), req.stationId, Date.now(), expiresAt, status, breakStarted]
      );
    }
    res.json({ success: true, isOnBreak: !!status, breakStartedAt: breakStarted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/station/status', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;
  try {
    const st = await get('SELECT * FROM station_tokens WHERE token = ?', [token]);
    if (!st) return res.status(404).json({ error: 'Station not found' });
    res.json({
      stationId: st.stationId,
      stationType: st.stationType || (st.stationId?.toLowerCase().includes('grind') ? 'grinder' : 'mixer'),
      isOnBreak: st.isOnBreak === 1,
      breakStartedAt: st.breakStartedAt
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stations/breaks', async (req, res) => {
  try {
    const breaks = await all('SELECT stationId, isOnBreak, breakStartedAt FROM station_tokens WHERE isOnBreak = 1');
    res.json(breaks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/translate', async (req, res) => {
  const { text } = req.query;
  if (!text) {
    return res.status(400).json({ error: 'text query parameter is required' });
  }
  try {
    const translated = await translateToHindi(text);
    res.json({ translated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 2. Products endpoints
app.get('/api/products', async (req, res) => {
  try {
    const products = await all('SELECT * FROM products');
    const invItems = await all('SELECT * FROM inventory');
    const invMap = {};
    invItems.forEach(i => { invMap[i.itemId] = i; });

    // Parse ratios from string to JSON and enrich with stage & requiresGrinding
    const parsedProducts = products.map(p => {
      const rawRatios = JSON.parse(p.mixtureRatios || '[]');
      const enrichedRatios = rawRatios.map(r => {
        const inv = invMap[r.ingredientId];
        const isGrind = r.stage === 'grinder' || r.requiresGrinding === true || (inv && (inv.requiresGrinding === 1 || inv.stage === 'grinder'));
        return {
          ...r,
          stage: isGrind ? 'grinder' : 'mixer',
          requiresGrinding: !!isGrind,
          name: inv ? inv.name : r.ingredientId,
          hindiName: inv ? inv.hindiName : ''
        };
      });
      return {
        ...p,
        isActive: p.isActive === 1,
        mixtureRatios: enrichedRatios,
        ingredients: enrichedRatios
      };
    });
    res.json(parsedProducts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  let { id, name, englishName, targetUph, colorHex, isActive, manualFileName, nominalBatchDurationSec, mixtureRatios } = req.body;
  try {
    if (!name || name.trim() === '') {
      name = await translateToHindi(englishName);
    }
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

    // Auto-create finished product inventory entry if it doesn't exist
    const finishedProdId = id.replace('PRD-', 'FIN-');
    const existingInv = await get('SELECT * FROM inventory WHERE itemId = ?', [finishedProdId]);
    if (!existingInv) {
      const translatedFinGood = await translateToHindi(englishName);
      await run(
        `INSERT INTO inventory (itemId, name, stock, unit, lastUpdated, type, hindiName, minStock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [finishedProdId, englishName, 0, 'batches', Date.now(), 'finished_good', translatedFinGood, 1.0]
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Orders endpoints
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await all("SELECT * FROM orders ORDER BY CASE WHEN status = 'ACTIVE' THEN 0 WHEN status = 'PENDING' THEN 1 ELSE 2 END, queueOrder ASC, timestamp ASC");
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  let { id, productKey, productNameEnglish, productNameHindi, recipeId, recipeName, recipeHindiName, totalBatchesScheduled, completedBatches, targetUnits, unitsProduced, status, colorHex } = req.body;
  id = id || ('ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase());
  productKey = productKey || recipeId || 'PRD-001';
  productNameEnglish = productNameEnglish || recipeName || 'Cream Special';
  productNameHindi = productNameHindi || recipeHindiName || 'क्रीम स्पेशल';
  totalBatchesScheduled = totalBatchesScheduled || (targetUnits ? Math.ceil(targetUnits / 600) : 1);
  completedBatches = completedBatches || (unitsProduced ? Math.floor(unitsProduced / 600) : 0);

  try {
    const activeOrder = await get("SELECT * FROM orders WHERE status = 'ACTIVE' LIMIT 1");
    const finalStatus = status || (activeOrder ? 'PENDING' : 'ACTIVE');
    
    // Find maximum queueOrder in existing orders and add 1
    const maxQResult = await get("SELECT MAX(queueOrder) as maxQ FROM orders");
    const nextQ = (maxQResult?.maxQ || 0) + 1;

    await run(
      `INSERT INTO orders (id, productKey, productNameEnglish, productNameHindi, totalBatchesScheduled, completedBatches, status, timestamp, colorHex, queueOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         completedBatches=excluded.completedBatches,
         status=excluded.status`,
      [id, productKey, productNameEnglish, productNameHindi, totalBatchesScheduled, completedBatches, finalStatus, Date.now(), colorHex || '#FF6B00', nextQ]
    );

    if (finalStatus === 'ACTIVE') {
      await run("UPDATE orders SET status = 'PENDING' WHERE id != ? AND status = 'ACTIVE'", [id]);
    }

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders/:id/move', async (req, res) => {
  const { id } = req.params;
  const { direction } = req.body; // 'up' or 'down'
  try {
    // Select all orders that are ACTIVE or PENDING, ordered by queueOrder ASC, timestamp ASC
    const activeOrders = await all("SELECT * FROM orders WHERE status IN ('ACTIVE', 'PENDING') ORDER BY queueOrder ASC, timestamp ASC");
    const index = activeOrders.findIndex(o => o.id === id);
    if (index === -1) {
      return res.status(400).json({ error: 'Order not found or not active/pending' });
    }

    if (direction === 'up' && index > 0) {
      const current = activeOrders[index];
      const target = activeOrders[index - 1];
      const tempQ = current.queueOrder;
      
      let newCurrentQ = target.queueOrder;
      let newTargetQ = tempQ;
      if (newCurrentQ === newTargetQ) {
        newCurrentQ = target.queueOrder;
        newTargetQ = target.queueOrder + 1;
      }
      
      await run('UPDATE orders SET queueOrder = ? WHERE id = ?', [newCurrentQ, current.id]);
      await run('UPDATE orders SET queueOrder = ? WHERE id = ?', [newTargetQ, target.id]);
    } else if (direction === 'down' && index < activeOrders.length - 1) {
      const current = activeOrders[index];
      const target = activeOrders[index + 1];
      const tempQ = current.queueOrder;
      
      let newCurrentQ = target.queueOrder;
      let newTargetQ = tempQ;
      if (newCurrentQ === newTargetQ) {
        newCurrentQ = target.queueOrder;
        newTargetQ = target.queueOrder - 1;
      }
      
      await run('UPDATE orders SET queueOrder = ? WHERE id = ?', [newCurrentQ, current.id]);
      await run('UPDATE orders SET queueOrder = ? WHERE id = ?', [newTargetQ, target.id]);
    }

    // Normalize queueOrder to be sequential (0, 1, 2...) for all active/pending orders
    const updated = await all("SELECT * FROM orders WHERE status IN ('ACTIVE', 'PENDING') ORDER BY queueOrder ASC, timestamp ASC");
    for (let i = 0; i < updated.length; i++) {
      await run('UPDATE orders SET queueOrder = ? WHERE id = ?', [i, updated[i].id]);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders/reorder', async (req, res) => {
  const { orderIds } = req.body;
  if (!Array.isArray(orderIds)) {
    return res.status(400).json({ error: 'orderIds must be an array' });
  }
  try {
    // Safety check: check if any order is ACTIVE (In Progress)
    const activeOrder = await get("SELECT id FROM orders WHERE status = 'ACTIVE' LIMIT 1");
    if (activeOrder) {
      const activeIndex = orderIds.indexOf(activeOrder.id);
      if (activeIndex !== -1 && activeIndex !== 0) {
        return res.status(400).json({ error: 'Cannot reorder or move another order before the active processing order.' });
      }
    }

    for (let i = 0; i < orderIds.length; i++) {
      await run('UPDATE orders SET queueOrder = ? WHERE id = ?', [i, orderIds[i]]);
    }
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

    if (status === 'ACTIVE') {
      await run("UPDATE orders SET status = 'PENDING' WHERE id != ? AND status = 'ACTIVE'", [id]);
    } else if (status === 'COMPLETED' || status === 'CANCELLED') {
      const activeOrder = await get("SELECT * FROM orders WHERE status = 'ACTIVE' LIMIT 1");
      if (!activeOrder) {
        const nextPending = await get("SELECT * FROM orders WHERE status = 'PENDING' ORDER BY queueOrder ASC, timestamp ASC LIMIT 1");
        if (nextPending) {
          await run("UPDATE orders SET status = 'ACTIVE' WHERE id = ?", [nextPending.id]);
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const targetOrder = await get("SELECT * FROM orders WHERE id = ?", [id]);
    await run('DELETE FROM orders WHERE id = ?', [id]);

    if (targetOrder && targetOrder.status === 'ACTIVE') {
      const activeOrder = await get("SELECT * FROM orders WHERE status = 'ACTIVE' LIMIT 1");
      if (!activeOrder) {
        const nextPending = await get("SELECT * FROM orders WHERE status = 'PENDING' ORDER BY queueOrder ASC, timestamp ASC LIMIT 1");
        if (nextPending) {
          await run("UPDATE orders SET status = 'ACTIVE' WHERE id = ?", [nextPending.id]);
        }
      }
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

app.post('/api/inventory', async (req, res) => {
  let { itemId, name, hindiName, type, stock, unit, minStock } = req.body;
  if (!itemId || !name || !type) {
    return res.status(400).json({ error: 'itemId, name, and type are required' });
  }
  try {
    if (!hindiName || hindiName.trim() === '') {
      hindiName = await translateToHindi(name);
    }
    await run(
      `INSERT INTO inventory (itemId, name, hindiName, type, stock, unit, minStock, lastUpdated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(itemId) DO UPDATE SET
         name=excluded.name,
         hindiName=excluded.hindiName,
         type=excluded.type,
         stock=excluded.stock,
         unit=excluded.unit,
         minStock=excluded.minStock,
         lastUpdated=excluded.lastUpdated`,
      [itemId.toUpperCase(), name, hindiName, type, stock || 0.0, unit || 'kg', minStock || 0.0, Date.now()]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper for core inventory deduction & order progress logging
async function processBatchLogDeductions(log) {
  const batchId = log.batchId || log.id || ('LOG-' + Date.now());

  // 1. Deduplicate check
  const existingLog = await get('SELECT * FROM batch_logs WHERE batchId = ?', [batchId]);
  if (existingLog) {
    return { duplicate: true, success: true };
  }

  // 2. Write log
  const productNameEnglish = log.productNameEnglish || log.productName || 'Cream Special';
  const productNameHindi = log.productNameHindi || '';
  const unitsProduced = log.unitsProduced || 0;
  const status = log.status || 'Success';
  const line = log.line || 'Line A';
  const targetUnits = log.targetUnits || 0;
  const feedbackQuality = log.feedbackQuality || (log.stage === 'mixer' ? 'Grade A - Optimal' : null);
  const feedbackTexture = log.feedbackTexture || null;
  const feedbackNotes = log.feedbackNotes || null;
  const feedbackRating = log.feedbackRating != null ? parseInt(log.feedbackRating) : 5;

  await run(
    `INSERT INTO batch_logs (batchId, productNameHindi, productNameEnglish, line, unitsProduced, status, timestamp, targetUnits, feedbackQuality, feedbackTexture, feedbackNotes, feedbackRating)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [batchId, productNameHindi, productNameEnglish, line, unitsProduced, status, log.timestamp || Date.now(), targetUnits, feedbackQuality, feedbackTexture, feedbackNotes, feedbackRating]
  );

  if (status !== 'Success') {
    return { success: true, status: 'failed_logged' }; // No inventory/order changes on failure logs
  }

  // 3. Find matching product formulas
  const product = await get(
    'SELECT * FROM products WHERE englishName = ? OR name = ? OR id = ?',
    [productNameEnglish, productNameHindi, log.recipeId || log.productKey || '']
  );

  const isGrinderStage = log.stage === 'grinder' || log.isGrinderStage || (log.stationId && log.stationId.toLowerCase().includes('grind'));
  const batchesMultiplier = (log.bulkGrind && log.batchesCount && log.batchesCount > 1) 
    ? parseInt(log.batchesCount) 
    : (log.batchesCount ? parseInt(log.batchesCount) : 1);

  // If this log is from the Grinder station (Stage 1), deduct only grinder raw materials (e.g. Maize) and record pipeline transfer
  if (isGrinderStage) {
    if (product) {
      const ratios = JSON.parse(product.mixtureRatios || '[]');
      const grindIngredients = ratios.filter(r => r.stage === 'grinder' || r.requiresGrinding);
      for (const ing of grindIngredients) {
        const totalDeducted = ing.percentage * batchesMultiplier;
        await run(
          'UPDATE inventory SET stock = MAX(0, stock - ?), lastUpdated = ? WHERE itemId = ?',
          [totalDeducted, Date.now(), ing.ingredientId]
        );
      }
    }
    return { success: true, stage: 'grinder', batchesPulverized: batchesMultiplier };
  }

  if (product) {
    const ratios = JSON.parse(product.mixtureRatios || '[]');

    // Deduct ingredients: Mixer stage skips raw grains already ground and transferred via pipeline
    for (const ing of ratios) {
      const isGrind = ing.stage === 'grinder' || ing.requiresGrinding;
      if (isGrind) continue; // raw grain was deducted at grinder stage
      const amountDeducted = ing.percentage;
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

  // 4. Update the targeted order's completed batch count
  const targetOrder = log.orderId 
    ? await get("SELECT * FROM orders WHERE id = ?", [log.orderId])
    : await get("SELECT * FROM orders WHERE (productNameEnglish = ? OR productNameHindi = ?) AND (status = 'ACTIVE' OR status = 'In Progress' OR status = 'Pending') LIMIT 1", [productNameEnglish, productNameHindi]);

  if (targetOrder) {
    const newCompleted = (targetOrder.completedBatches || 0) + 1;
    let newStatus = targetOrder.status;
    if (newCompleted >= targetOrder.totalBatchesScheduled) {
      newStatus = 'COMPLETED';
    } else if (newStatus === 'PENDING' || newStatus === 'Pending') {
      newStatus = 'In Progress';
    }
    await run(
      'UPDATE orders SET completedBatches = ?, status = ? WHERE id = ?',
      [newCompleted, newStatus, targetOrder.id]
    );

    if (newStatus === 'COMPLETED') {
      const nextPending = await get("SELECT * FROM orders WHERE status = 'PENDING' ORDER BY queueOrder ASC, timestamp ASC LIMIT 1");
      if (nextPending) {
        await run("UPDATE orders SET status = 'ACTIVE' WHERE id = ?", [nextPending.id]);
      }
    }
  }

  return { success: true, stage: 'mixer' };
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
    const logData = { ...req.body, stationType: req.body.stage || req.stationType };
    const result = await processBatchLogDeductions(logData);
    if (result && typeof result === 'object') {
      res.json(result);
    } else {
      res.json({ success: !!result });
    }
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

function getNetworkInfo() {
  const interfaces = os.networkInterfaces();
  let tailscaleIp = process.env.TAILSCALE_IP || null;
  let lanIp = null;
  const ipList = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const iface of addrs) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ipList.push({ name, address: iface.address });
        if (!tailscaleIp && (name.toLowerCase().includes('tailscale') || iface.address.startsWith('100.'))) {
          tailscaleIp = iface.address;
        } else if (!lanIp && !iface.address.startsWith('100.')) {
          lanIp = iface.address;
        }
      }
    }
  }

  // Prioritize Tailscale IP for remote cross-network connectivity, then LAN IP, then localhost
  const hostIp = process.env.HOST_IP || tailscaleIp || lanIp || 'localhost';
  return {
    localIp: hostIp,
    preferredIp: hostIp,
    tailscaleIp: tailscaleIp || null,
    lanIp: lanIp || 'localhost',
    interfaces: ipList,
    port: PORT
  };
}

app.get('/api/info', (req, res) => {
  res.json(getNetworkInfo());
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
  const HOST = process.env.HOST || '0.0.0.0';
  const server = app.listen(PORT, HOST, () => {
    console.log(`Production Nexus server listening on http://${HOST}:${PORT}`);
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
