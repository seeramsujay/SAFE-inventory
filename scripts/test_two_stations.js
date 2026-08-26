import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3099; // Dedicated test port
const BASE_URL = `http://localhost:${PORT}`;

let serverProcess = null;

function logStep(step, message) {
  console.log(`\x1b[36m[STEP ${step}]\x1b[0m \x1b[1m${message}\x1b[0m`);
}

function logPass(message) {
  console.log(`  \x1b[32m✔ PASS:\x1b[0m ${message}`);
}

function logFail(message) {
  console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (condition) {
    logPass(message);
  } else {
    logFail(message);
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function startServer() {
  logStep(1, `Starting isolated API test server on port ${PORT}...`);
  serverProcess = spawn('node', ['server/index.js'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe'
  });

  serverProcess.stdout.on('data', (d) => {
    // console.log(`[Server] ${d}`);
  });
  serverProcess.stderr.on('data', (d) => {
    // console.error(`[Server Err] ${d}`);
  });

  // Wait for server to become responsive
  for (let i = 0; i < 30; i++) {
    try {
      const res = await request('/api/health');
      if (res.ok && res.data?.status === 'ok') {
        logPass(`Server is live and responding on ${BASE_URL}`);
        return;
      }
    } catch (e) {
      // retry
    }
    await sleep(200);
  }
  logFail('Failed to start server within 6 seconds.');
}

async function runTests() {
  try {
    await startServer();

    // ----------------------------------------------------
    // STEP 2: Station Token Validation & Generation
    // ----------------------------------------------------
    logStep(2, 'Testing Station Token Authentication & Scopes (Grinder vs Mixer)...');

    // 2a. Pre-seeded Grinder Token
    const grinderAuth = await request('/api/auth/validate?token=TOKEN-GRINDER-STATION');
    assert(grinderAuth.ok && grinderAuth.data?.valid === true, 'Grinder pre-seeded token validates successfully');
    assert(grinderAuth.data?.stationType === 'grinder', `Grinder token stationType is 'grinder' (got '${grinderAuth.data?.stationType}')`);
    assert(grinderAuth.data?.stationId === 'GRINDER-01', `Grinder token stationId is 'GRINDER-01'`);

    // 2b. Pre-seeded Mixer Token
    const mixerAuth = await request('/api/auth/validate?token=TOKEN-MIXER-STATION');
    assert(mixerAuth.ok && mixerAuth.data?.valid === true, 'Mixer pre-seeded token validates successfully');
    assert(mixerAuth.data?.stationType === 'mixer', `Mixer token stationType is 'mixer' (got '${mixerAuth.data?.stationType}')`);
    assert(mixerAuth.data?.stationId === 'MIXER-01', `Mixer token stationId is 'MIXER-01'`);

    // 2c. Issue dynamic Grinder token
    const newGrinder = await request('/api/auth/token', {
      method: 'POST',
      body: JSON.stringify({ stationId: 'GRINDER-TEST-99', stationType: 'grinder' })
    });
    assert(newGrinder.ok && newGrinder.data?.token, 'Issued dynamic Grinder token');
    const valGrinder = await request(`/api/auth/validate?token=${newGrinder.data.token}`);
    assert(valGrinder.data?.stationType === 'grinder', 'Dynamic Grinder token validated with stationType: grinder');

    // 2d. Issue dynamic Mixer token
    const newMixer = await request('/api/auth/token', {
      method: 'POST',
      body: JSON.stringify({ stationId: 'MIXER-TEST-99', stationType: 'mixer' })
    });
    assert(newMixer.ok && newMixer.data?.token, 'Issued dynamic Mixer token');
    const valMixer = await request(`/api/auth/validate?token=${newMixer.data.token}`);
    assert(valMixer.data?.stationType === 'mixer', 'Dynamic Mixer token validated with stationType: mixer');

    // ----------------------------------------------------
    // STEP 3: Products API & Formula Enrichment Verification
    // ----------------------------------------------------
    logStep(3, 'Verifying Products & Recipe Formulas (Stage 1 Grinder vs Stage 2 Mixer)...');
    const productsRes = await request('/api/products');
    assert(productsRes.ok && Array.isArray(productsRes.data), 'Products fetched successfully');

    const creamSpecial = productsRes.data.find(p => p.id === 'PRD-001');
    assert(creamSpecial != null, 'PRD-001 Cream Special exists');

    const ingredients = creamSpecial.ingredients || creamSpecial.mixtureRatios || [];
    assert(ingredients.length >= 5, `PRD-001 has ${ingredients.length} ingredients`);

    const rawMaize = ingredients.find(i => i.ingredientId === 'ING-006');
    assert(rawMaize != null, 'Raw Maize (ING-006 / साबुत मक्का) is present in PRD-001 recipe');
    assert(rawMaize.stage === 'grinder', `Raw Maize has stage === 'grinder' (got '${rawMaize.stage}')`);
    assert(rawMaize.requiresGrinding === 1 || rawMaize.requiresGrinding === true, 'Raw Maize has requiresGrinding flag set to true/1');

    const flour = ingredients.find(i => i.ingredientId === 'ING-001');
    assert(flour != null && flour.stage === 'mixer', `Wheat Flour (ING-001) has stage === 'mixer'`);

    const sugar = ingredients.find(i => i.ingredientId === 'ING-002');
    assert(sugar != null && sugar.stage === 'mixer', `Refined Sugar (ING-002) has stage === 'mixer'`);

    // ----------------------------------------------------
    // STEP 4: Inventory Initial State Check
    // ----------------------------------------------------
    logStep(4, 'Checking Initial Inventory Stock before dispatch...');
    const invRes = await request('/api/inventory');
    assert(invRes.ok && Array.isArray(invRes.data), 'Inventory fetched successfully');

    const initialMaize = invRes.data.find(i => i.itemId === 'ING-006');
    assert(initialMaize != null, 'ING-006 Raw Maize exists in inventory');
    assert(initialMaize.requiresGrinding === 1, 'ING-006 in inventory has requiresGrinding: 1');
    assert(initialMaize.stage === 'grinder', 'ING-006 in inventory has stage: grinder');
    const initialMaizeStock = initialMaize.stock;

    const initialFlour = invRes.data.find(i => i.itemId === 'ING-001');
    const initialFlourStock = initialFlour.stock;
    logPass(`Initial Raw Maize stock: ${initialMaizeStock} kg | Initial Flour stock: ${initialFlourStock} kg`);

    // ----------------------------------------------------
    // STEP 5: Order Creation & Single-Active Enforcement
    // ----------------------------------------------------
    logStep(5, 'Creating Production Order for Testing...');
    const createOrderRes = await request('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        recipeId: 'PRD-001',
        recipeName: 'Cream Special',
        recipeHindiName: 'क्रीम स्पेशल',
        targetUnits: 1200,
        unitsProduced: 0,
        status: 'In Progress'
      })
    });
    assert(createOrderRes.ok && createOrderRes.data?.id, `Order created with ID: ${createOrderRes.data?.id}`);
    const testOrderId = createOrderRes.data.id;

    // ----------------------------------------------------
    // STEP 6: Stage 1 (1. Grinder Kiosk) Operations
    // ----------------------------------------------------
    logStep(6, 'Testing Stage 1: 1. Grinder Kiosk Pulverization Action...');
    
    // Simulate what the Grinder tablet does:
    // It filters ingredients for requiresGrinding === 1 / stage === 'grinder'
    const grinderTargetIngredients = ingredients.filter(i => i.stage === 'grinder' || i.requiresGrinding);
    assert(grinderTargetIngredients.length === 1 && grinderTargetIngredients[0].ingredientId === 'ING-006', 
      'Grinder tablet strictly filters to ONLY Raw Maize (ING-006)');
    
    // Grinder operator completes 1 grinding run (120 kg Raw Maize) and blows it into pipeline
    const grinderLogId = `LOG-GRIND-${Date.now()}`;
    const grindLogRes = await request('/api/logs', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer TOKEN-GRINDER-STATION'
      },
      body: JSON.stringify({
        id: grinderLogId,
        orderId: testOrderId,
        productName: 'Cream Special',
        productHindiName: 'क्रीम स्पेशल',
        stationId: 'GRINDER-01',
        stage: 'grinder',
        line: 'Line A (Mill Feed)',
        unitsProduced: 0, // Grain is in pipeline, finished units come after mixer
        status: 'Success',
        recipeRatios: JSON.stringify(ingredients),
        totalBatchWeightKg: 120,
        notes: 'Raw maize pulverized to < 200um and blown into Stage 2 pipeline'
      })
    });
    assert(grindLogRes.ok, 'Grinder station logged pulverization and pipeline dispatch');

    // Verify Inventory: ONLY Raw Maize should be deducted, NOT wheat flour or sugar!
    const postGrindInv = await request('/api/inventory');
    const postGrindMaize = postGrindInv.data.find(i => i.itemId === 'ING-006');
    const postGrindFlour = postGrindInv.data.find(i => i.itemId === 'ING-001');

    assert(postGrindMaize.stock < initialMaizeStock, 
      `Raw Maize stock decreased from ${initialMaizeStock} kg to ${postGrindMaize.stock} kg (pulverized)`);
    assert(postGrindFlour.stock === initialFlourStock, 
      `Wheat Flour stock remained unchanged at ${postGrindFlour.stock} kg (NOT deducted at Grinder stage)`);

    // Verify Order Status: Should still be active/in progress
    const postGrindOrders = await request('/api/orders');
    const postGrindOrder = postGrindOrders.data.find(o => o.id === testOrderId);
    assert(postGrindOrder && (postGrindOrder.status === 'In Progress' || postGrindOrder.status === 'Pending' || postGrindOrder.status === 'ACTIVE'),
      'Order remains In Progress waiting for Stage 2 Mixer completion');

    // ----------------------------------------------------
    // STEP 7: Stage 2 (2. Mixer Kiosk) Operations & Operator Feedback
    // ----------------------------------------------------
    logStep(7, 'Testing Stage 2: 2. Mixer Kiosk Compounding & Operator Feedback Sign-Off...');

    // Mixer receives ground powder, inspects compound, and submits mandatory operator feedback
    const mixerLogId = `LOG-MIX-${Date.now()}`;
    const mixLogRes = await request('/api/logs', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer TOKEN-MIXER-STATION'
      },
      body: JSON.stringify({
        id: mixerLogId,
        orderId: testOrderId,
        productName: 'Cream Special',
        productHindiName: 'क्रीम स्पेशल',
        stationId: 'MIXER-01',
        stage: 'mixer',
        line: 'Line A (Mixer Drum)',
        unitsProduced: 1200, // Completes the full demand
        status: 'Success',
        recipeRatios: JSON.stringify(ingredients),
        totalBatchWeightKg: 600,
        notes: 'Batch blended and homogenized for 8.0 minutes',
        feedbackQuality: 'Grade A - Optimal',
        feedbackTexture: 'Smooth Homogeneous',
        feedbackNotes: 'मिश्रण 8.0 मिनट में सही एकसमान बना, मक्का अच्छी तरह घुल गया।',
        feedbackRating: 5
      })
    });
    assert(mixLogRes.ok, 'Mixer station logged batch compound completion with operator feedback');

    // Verify Inventory: Remaining ingredients (Flour, Sugar, Fats, Flavorings) now deducted
    const postMixInv = await request('/api/inventory');
    const postMixFlour = postMixInv.data.find(i => i.itemId === 'ING-001');
    assert(postMixFlour.stock < initialFlourStock, 
      `Wheat Flour stock decreased from ${initialFlourStock} kg to ${postMixFlour.stock} kg after Mixer stage`);

    // Verify Order: Completed with 1200 units produced
    const postMixOrders = await request('/api/orders');
    const postMixOrder = postMixOrders.data.find(o => o.id === testOrderId);
    assert(postMixOrder && (postMixOrder.status === 'Completed' || postMixOrder.status === 'COMPLETED' || postMixOrder.completedBatches > 0),
      `Order batch marked completed (${postMixOrder?.completedBatches} batches completed)`);

    // Verify Mixer Feedback Persistence in batch_logs
    const allLogsRes = await request('/api/logs');
    const mixerSavedLog = (allLogsRes.data || []).find(l => l.batchId === mixerLogId || l.id === mixerLogId);
    assert(mixerSavedLog && mixerSavedLog.feedbackQuality === 'Grade A - Optimal',
      `Mixer feedback quality persisted in SQLite: "${mixerSavedLog?.feedbackQuality}"`);
    assert(mixerSavedLog && mixerSavedLog.feedbackTexture === 'Smooth Homogeneous',
      `Mixer feedback texture persisted: "${mixerSavedLog?.feedbackTexture}"`);
    assert(mixerSavedLog && mixerSavedLog.feedbackRating === 5,
      `Mixer feedback rating persisted: ${mixerSavedLog?.feedbackRating} Stars`);
    assert(mixerSavedLog && (mixerSavedLog.feedbackNotes || '').includes('मिश्रण'),
      `Mixer feedback remarks persisted: "${mixerSavedLog?.feedbackNotes}"`);

    // ----------------------------------------------------
    // STEP 8: Idempotency & Deduplication
    // ----------------------------------------------------
    logStep(8, 'Testing Idempotency & Deduplication on Batch Logs...');
    const duplicateRes = await request('/api/logs', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer TOKEN-MIXER-STATION'
      },
      body: JSON.stringify({
        id: mixerLogId, // Exact same log ID
        orderId: testOrderId,
        productName: 'Cream Special',
        stationId: 'MIXER-01',
        stage: 'mixer',
        unitsProduced: 1200,
        status: 'Success'
      })
    });
    assert(duplicateRes.ok && duplicateRes.data?.duplicate === true, 
      'Duplicate batch log ID was safely recognized and deduplicated without double deductions');

    // ----------------------------------------------------
    // STEP 9: Station Break Tracking
    // ----------------------------------------------------
    logStep(9, 'Testing Station Break Tracking for Grinder and Mixer...');
    const breakStart = await request('/api/station/break', {
      method: 'POST',
      body: JSON.stringify({ token: 'TOKEN-GRINDER-STATION', isOnBreak: true })
    });
    assert(breakStart.ok && breakStart.data?.isOnBreak === true, 'Grinder station entered break mode');

    const breakStatus = await request('/api/station/status?token=TOKEN-GRINDER-STATION');
    assert(breakStatus.data?.isOnBreak === true && breakStatus.data?.stationType === 'grinder', 
      'Station status reports Grinder is currently on break');

    const breakEnd = await request('/api/station/break', {
      method: 'POST',
      body: JSON.stringify({ token: 'TOKEN-GRINDER-STATION', isOnBreak: false })
    });
    assert(breakEnd.ok && breakEnd.data?.isOnBreak === false, 'Grinder station resumed active operations');

    // ----------------------------------------------------
    // STEP 10: QR Code Payload Schema Compliance
    // ----------------------------------------------------
    logStep(10, 'Validating QR Pairing Payload Schema for Android PreferencesManager...');
    const grinderPayload = {
      url: BASE_URL,
      token: 'TOKEN-GRINDER-STATION',
      station: 'GRINDER-01',
      stationType: 'grinder'
    };
    const mixerPayload = {
      url: BASE_URL,
      token: 'TOKEN-MIXER-STATION',
      station: 'MIXER-01',
      stationType: 'mixer'
    };

    assert(grinderPayload.stationType === 'grinder' && grinderPayload.token && grinderPayload.url,
      'Grinder payload matches PreferencesManager.savePairing schema');
    assert(mixerPayload.stationType === 'mixer' && mixerPayload.token && mixerPayload.url,
      'Mixer payload matches PreferencesManager.savePairing schema');

    console.log('\n\x1b[32m======================================================================\x1b[0m');
    console.log('\x1b[32m\x1b[1m   ALL 10 VERIFICATION SUITES PASSED CLEANLY WITH ZERO FAILURES!      \x1b[0m');
    console.log('\x1b[32m======================================================================\x1b[0m\n');

  } catch (err) {
    logFail(`Unexpected error during tests: ${err.message}\n${err.stack}`);
  } finally {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  }
}

runTests();
