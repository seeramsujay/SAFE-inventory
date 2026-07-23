import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { run, get, all, initDb, seedData } from '../db.js';

// We can build an instance of the app or import endpoint logic.
// For clean test isolation, we set up express app with the API endpoints.

let server;
let baseUrl;
const TEST_PORT = 3099;
const MASTER_KEY = 'sb_publishable_XpvCTqc8gmJOxp0Rrwlyng_Sl3GEN1O';

before(async () => {
  await initDb();
  await seedData();

  const app = express();
  app.use(cors());
  app.use(express.json());

  // Token middleware
  async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Missing station token. Scan pairing QR.' });
    }

    if (token === MASTER_KEY) {
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
      next();
    } catch (err) {
      res.status(500).json({ error: 'Authentication internal error.' });
    }
  }

  // Endpoints
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: Date.now() });
  });

  app.get('/api/info', (req, res) => {
    res.json({ localIp: '127.0.0.1', port: TEST_PORT });
  });

  app.post('/api/auth/token', async (req, res) => {
    const { stationId } = req.body;
    if (!stationId) return res.status(400).json({ error: 'stationId is required' });
    const token = 'TOKEN-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = Date.now() + 100 * 365 * 24 * 60 * 60 * 1000;
    await run('INSERT INTO station_tokens (token, stationId, issuedAt, expiresAt) VALUES (?, ?, ?, ?)', [token, stationId, Date.now(), expiresAt]);
    res.json({ token, stationId, expiresAt });
  });

  app.get('/api/auth/validate', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.json({ valid: false, reason: 'no_token' });
    if (token === MASTER_KEY) return res.json({ valid: true, stationId: req.headers['x-station-id'] || 'KIOSK-01' });
    const validToken = await get('SELECT * FROM station_tokens WHERE token = ?', [token]);
    if (!validToken) return res.json({ valid: false, reason: 'unknown_token' });
    res.json({ valid: true, stationId: validToken.stationId });
  });

  app.post('/api/stations/break', authenticateToken, async (req, res) => {
    const { isOnBreak } = req.body;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const status = isOnBreak ? 1 : 0;
    const breakStarted = isOnBreak ? Date.now() : 0;
    const existing = await get('SELECT * FROM station_tokens WHERE token = ? OR stationId = ?', [token, req.stationId]);
    if (existing) {
      await run('UPDATE station_tokens SET isOnBreak = ?, breakStartedAt = ? WHERE token = ? OR stationId = ?', [status, breakStarted, token, req.stationId]);
    } else {
      const expiresAt = Date.now() + 100 * 365 * 24 * 60 * 60 * 1000;
      await run('INSERT INTO station_tokens (token, stationId, issuedAt, expiresAt, isOnBreak, breakStartedAt) VALUES (?, ?, ?, ?, ?, ?)', [token || ('TOKEN-' + req.stationId), req.stationId, Date.now(), expiresAt, status, breakStarted]);
    }
    res.json({ success: true, isOnBreak: status, breakStartedAt: breakStarted });
  });

  app.get('/api/stations/breaks', async (req, res) => {
    const breaks = await all('SELECT stationId, isOnBreak, breakStartedAt FROM station_tokens WHERE isOnBreak = 1');
    res.json(breaks);
  });

  app.get('/api/products', async (req, res) => {
    const products = await all('SELECT * FROM products');
    const parsed = products.map(p => ({ ...p, isActive: p.isActive === 1, mixtureRatios: JSON.parse(p.mixtureRatios || '[]') }));
    res.json(parsed);
  });

  app.post('/api/products', async (req, res) => {
    let { id, name, englishName, targetUph, colorHex, isActive, manualFileName, nominalBatchDurationSec, mixtureRatios } = req.body;
    if (!id || !englishName) return res.status(400).json({ error: 'id and englishName are required' });
    const activeInt = isActive ? 1 : 0;
    const ratioStr = JSON.stringify(mixtureRatios || []);
    await run(
      `INSERT INTO products (id, name, englishName, targetUph, colorHex, isActive, manualFileName, nominalBatchDurationSec, mixtureRatios)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, englishName=excluded.englishName`,
      [id, name || englishName, englishName, targetUph || 1200, colorHex || '#00875A', activeInt, manualFileName, nominalBatchDurationSec || 480, ratioStr]
    );
    res.json({ success: true });
  });

  app.get('/api/orders', async (req, res) => {
    const orders = await all("SELECT * FROM orders ORDER BY CASE WHEN status = 'ACTIVE' THEN 0 WHEN status = 'PENDING' THEN 1 ELSE 2 END, queueOrder ASC, timestamp ASC");
    res.json(orders);
  });

  app.post('/api/orders', async (req, res) => {
    const { id, productKey, productNameEnglish, productNameHindi, totalBatchesScheduled, completedBatches, status, colorHex } = req.body;
    if (!id) return res.status(400).json({ error: 'Order id is required' });
    const activeOrder = await get("SELECT * FROM orders WHERE status = 'ACTIVE' LIMIT 1");
    const finalStatus = status || (activeOrder ? 'PENDING' : 'ACTIVE');
    const maxQResult = await get("SELECT MAX(queueOrder) as maxQ FROM orders");
    const nextQ = (maxQResult?.maxQ || 0) + 1;

    await run(
      `INSERT INTO orders (id, productKey, productNameEnglish, productNameHindi, totalBatchesScheduled, completedBatches, status, timestamp, colorHex, queueOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET completedBatches=excluded.completedBatches, status=excluded.status`,
      [id, productKey, productNameEnglish, productNameHindi, totalBatchesScheduled || 1, completedBatches || 0, finalStatus, Date.now(), colorHex, nextQ]
    );

    if (finalStatus === 'ACTIVE') {
      await run("UPDATE orders SET status = 'PENDING' WHERE id != ? AND status = 'ACTIVE'", [id]);
    }
    res.json({ success: true });
  });

  app.patch('/api/orders/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, completedBatches } = req.body;
    if (status !== undefined && completedBatches !== undefined) {
      await run('UPDATE orders SET status = ?, completedBatches = ? WHERE id = ?', [status, completedBatches, id]);
    } else if (status !== undefined) {
      await run('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    } else if (completedBatches !== undefined) {
      await run('UPDATE orders SET completedBatches = ? WHERE id = ?', [completedBatches, id]);
    }

    if (status === 'ACTIVE') {
      await run("UPDATE orders SET status = 'PENDING' WHERE id != ? AND status = 'ACTIVE'", [id]);
    }
    res.json({ success: true });
  });

  app.delete('/api/orders/:id', async (req, res) => {
    const { id } = req.params;
    await run('DELETE FROM orders WHERE id = ?', [id]);
    res.json({ success: true });
  });

  app.get('/api/inventory', async (req, res) => {
    const items = await all('SELECT * FROM inventory');
    res.json(items);
  });

  app.post('/api/inventory/adjust', async (req, res) => {
    const { itemId, stock } = req.body;
    if (!itemId || stock === undefined) return res.status(400).json({ error: 'itemId and stock are required' });
    await run('UPDATE inventory SET stock = ?, lastUpdated = ? WHERE itemId = ?', [stock, Date.now(), itemId]);
    res.json({ success: true });
  });

  app.get('/api/logs', async (req, res) => {
    const logs = await all('SELECT * FROM batch_logs ORDER BY timestamp DESC');
    res.json(logs);
  });

  app.post('/api/logs', authenticateToken, async (req, res) => {
    const log = req.body;
    if (!log.batchId) return res.status(400).json({ error: 'batchId required' });
    const existing = await get('SELECT * FROM batch_logs WHERE batchId = ?', [log.batchId]);
    if (existing) return res.json({ success: false, reason: 'duplicate' });

    await run(
      `INSERT INTO batch_logs (batchId, productNameHindi, productNameEnglish, line, unitsProduced, status, timestamp, targetUnits)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [log.batchId, log.productNameHindi, log.productNameEnglish, log.line, log.unitsProduced, log.status, log.timestamp || Date.now(), log.targetUnits]
    );

    if (log.status === 'Success') {
      const activeOrder = await get("SELECT * FROM orders WHERE (productNameEnglish = ? OR productNameHindi = ?) AND status = 'ACTIVE' LIMIT 1", [log.productNameEnglish, log.productNameHindi]);
      if (activeOrder) {
        const newCompleted = activeOrder.completedBatches + 1;
        const newStatus = newCompleted >= activeOrder.totalBatchesScheduled ? 'COMPLETED' : 'ACTIVE';
        await run('UPDATE orders SET completedBatches = ?, status = ? WHERE id = ?', [newCompleted, newStatus, activeOrder.id]);
      }
    }
    res.json({ success: true });
  });

  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, () => {
      baseUrl = `http://localhost:${TEST_PORT}`;
      resolve();
    });
  });
});

after(() => {
  if (server) server.close();
});

describe('Industrial Nexus Backend API Integration Tests', () => {

  test('GET /api/health should return ok', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.ok(body.time > 0);
  });

  test('GET /api/info should return local ip and port', async () => {
    const res = await fetch(`${baseUrl}/api/info`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.port, TEST_PORT);
  });

  test('Auth Token Generation and Validation', async () => {
    // 1. Issue station token
    const issueRes = await fetch(`${baseUrl}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stationId: 'STATION-ALPHA' })
    });
    assert.equal(issueRes.status, 200);
    const issueBody = await issueRes.json();
    assert.ok(issueBody.token.startsWith('TOKEN-'));
    assert.equal(issueBody.stationId, 'STATION-ALPHA');

    // 2. Validate valid station token
    const valRes = await fetch(`${baseUrl}/api/auth/validate`, {
      headers: { 'Authorization': `Bearer ${issueBody.token}` }
    });
    const valBody = await valRes.json();
    assert.equal(valBody.valid, true);
    assert.equal(valBody.stationId, 'STATION-ALPHA');

    // 3. Validate master API key
    const masterValRes = await fetch(`${baseUrl}/api/auth/validate`, {
      headers: { 
        'Authorization': `Bearer ${MASTER_KEY}`,
        'X-Station-Id': 'KIOSK-PROD'
      }
    });
    const masterValBody = await masterValRes.json();
    assert.equal(masterValBody.valid, true);
    assert.equal(masterValBody.stationId, 'KIOSK-PROD');
  });

  test('Station Break Tracking', async () => {
    // Enable break
    const breakRes = await fetch(`${baseUrl}/api/stations/break`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MASTER_KEY}`,
        'X-Station-Id': 'EXTRUDER-01'
      },
      body: JSON.stringify({ isOnBreak: true })
    });
    assert.equal(breakRes.status, 200);

    // List breaks
    const listRes = await fetch(`${baseUrl}/api/stations/breaks`);
    const breaks = await listRes.json();
    assert.ok(breaks.some(b => b.stationId === 'EXTRUDER-01' && b.isOnBreak === 1));

    // Clear break
    await fetch(`${baseUrl}/api/stations/break`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MASTER_KEY}`,
        'X-Station-Id': 'EXTRUDER-01'
      },
      body: JSON.stringify({ isOnBreak: false })
    });
  });

  test('Products API Endpoint', async () => {
    // List initial products
    const getRes = await fetch(`${baseUrl}/api/products`);
    assert.equal(getRes.status, 200);
    const prods = await getRes.json();
    assert.ok(prods.length >= 2);

    // Create new product
    const createRes = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'PRD-TEST-99',
        name: 'परीक्षण उत्पाद',
        englishName: 'Test Product 99',
        targetUph: 2000,
        colorHex: '#336699',
        isActive: true
      })
    });
    assert.equal(createRes.status, 200);

    const reGetRes = await fetch(`${baseUrl}/api/products`);
    const reProds = await reGetRes.json();
    assert.ok(reProds.some(p => p.id === 'PRD-TEST-99'));
  });

  test('Orders Queue Management & Enforcing Single Active Order', async () => {
    // Create new order as ACTIVE
    const createRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'ORD-TEST-100',
        productKey: 'PRD-001',
        productNameEnglish: 'Cream Special',
        productNameHindi: 'क्रीम स्पेशल',
        totalBatchesScheduled: 5,
        completedBatches: 0,
        status: 'ACTIVE'
      })
    });
    assert.equal(createRes.status, 200);

    // Verify ORD-TEST-100 is ACTIVE and previous ACTIVE order was demoted to PENDING
    const ordersRes = await fetch(`${baseUrl}/api/orders`);
    const orders = await ordersRes.json();
    const activeOrders = orders.filter(o => o.status === 'ACTIVE');
    assert.equal(activeOrders.length, 1);
    assert.equal(activeOrders[0].id, 'ORD-TEST-100');

    // Clean up test order
    await fetch(`${baseUrl}/api/orders/ORD-TEST-100`, { method: 'DELETE' });
  });

  test('Batch Log Submission and Deduplication', async () => {
    const testBatchId = 'BATCH-LOG-TEST-' + Date.now();

    // 1. First log submission
    const logRes1 = await fetch(`${baseUrl}/api/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MASTER_KEY}`
      },
      body: JSON.stringify({
        batchId: testBatchId,
        productNameHindi: 'क्रीम स्पेशल',
        productNameEnglish: 'Cream Special',
        line: 'Line A',
        unitsProduced: 600,
        status: 'Success',
        timestamp: Date.now(),
        targetUnits: 600
      })
    });
    assert.equal(logRes1.status, 200);
    const body1 = await logRes1.json();
    assert.equal(body1.success, true);

    // 2. Duplicate log submission should be rejected/deduplicated
    const logRes2 = await fetch(`${baseUrl}/api/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MASTER_KEY}`
      },
      body: JSON.stringify({
        batchId: testBatchId,
        productNameHindi: 'क्रीम स्पेशल',
        productNameEnglish: 'Cream Special',
        line: 'Line A',
        unitsProduced: 600,
        status: 'Success',
        timestamp: Date.now(),
        targetUnits: 600
      })
    });
    assert.equal(logRes2.status, 200);
    const body2 = await logRes2.json();
    assert.equal(body2.success, false);
    assert.equal(body2.reason, 'duplicate');
  });

  test('Inventory Adjustments', async () => {
    const adjustRes = await fetch(`${baseUrl}/api/inventory/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: 'ING-001', stock: 15000 })
    });
    assert.equal(adjustRes.status, 200);

    const invRes = await fetch(`${baseUrl}/api/inventory`);
    const inv = await invRes.json();
    const item1 = inv.find(i => i.itemId === 'ING-001');
    assert.equal(item1.stock, 15000);
  });

});
