import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './_utils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      // 1. Clear tables
      const tables = ['batch_logs', 'orders', 'inventory', 'products', 'station_tokens'];
      for (const table of tables) {
        await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
          method: 'DELETE',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });
      }

      // 2. Insert Token
      await fetch(`${supabaseUrl}/rest/v1/station_tokens`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: 'DASHBOARD-DEV-TOKEN',
          stationId: 'WEB-DASHBOARD',
          issuedAt: Date.now(),
          expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000
        })
      });

      // 3. Seed Products
      const initialProducts = [
        {
          id: "PRD-001",
          name: "क्रीम स्पेशल",
          englishName: "Cream Special",
          targetUph: 1200,
          colorHex: "#00875A",
          isActive: true,
          manualFileName: "Cream_Special_Ops_v2.pdf",
          nominalBatchDurationSec: 480,
          mixtureRatios: [
            { ingredientId: "ING-001", percentage: 40 },
            { ingredientId: "ING-002", percentage: 35 },
            { ingredientId: "ING-003", percentage: 15 },
            { ingredientId: "ING-004", percentage: 10 }
          ]
        },
        {
          id: "PRD-002",
          name: "प्रीमियम प्लस",
          englishName: "Premium Plus",
          targetUph: 1500,
          colorHex: "#E65100",
          isActive: true,
          manualFileName: "Premium_Plus_Standard_v4.pdf",
          nominalBatchDurationSec: 600,
          mixtureRatios: [
            { ingredientId: "ING-001", percentage: 30 },
            { ingredientId: "ING-002", percentage: 45 },
            { ingredientId: "ING-003", percentage: 15 },
            { ingredientId: "ING-005", percentage: 10 }
          ]
        }
      ];

      await fetch(`${supabaseUrl}/rest/v1/products`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(initialProducts)
      });

      // 4. Seed Inventory
      const initialInventory = [
        { itemId: "ING-001", name: "Wheat Flour", stock: 12500, unit: "kg", lastUpdated: Date.now() },
        { itemId: "ING-002", name: "Refined Sugar", stock: 5400, unit: "kg", lastUpdated: Date.now() },
        { itemId: "ING-003", name: "Vegetable Fats", stock: 3200, unit: "kg", lastUpdated: Date.now() },
        { itemId: "ING-004", name: "Cream Flavoring", stock: 650, unit: "kg", lastUpdated: Date.now() },
        { itemId: "ING-005", name: "Premium Additive", stock: 450, unit: "kg", lastUpdated: Date.now() },
        { itemId: "FIN-001", name: "Cream Special", stock: 4, unit: "batches", lastUpdated: Date.now() },
        { itemId: "FIN-002", name: "Premium Plus", stock: 2, unit: "batches", lastUpdated: Date.now() },
        { itemId: "FIN-003", name: "Standard Blend", stock: 0, unit: "batches", lastUpdated: Date.now() }
      ];

      await fetch(`${supabaseUrl}/rest/v1/inventory`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(initialInventory)
      });

      // 5. Seed Orders
      const initialOrders = [
        {
          id: "ORD-1001",
          productKey: "PRD-001",
          productNameEnglish: "Cream Special",
          productNameHindi: "क्रीम स्पेशल",
          totalBatchesScheduled: 14,
          completedBatches: 4,
          status: "ACTIVE",
          timestamp: Date.now() - 3 * 3600000,
          colorHex: "#00875A"
        },
        {
          id: "ORD-1002",
          productKey: "PRD-002",
          productNameEnglish: "Premium Plus",
          productNameHindi: "प्रीमियम प्लस",
          totalBatchesScheduled: 8,
          completedBatches: 0,
          status: "PENDING",
          timestamp: Date.now() - 1.5 * 3600000,
          colorHex: "#E65100"
        }
      ];

      await fetch(`${supabaseUrl}/rest/v1/orders`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(initialOrders)
      });

      // 6. Seed Batch Logs
      const initialLogs = [
        {
          batchId: "ORD-1001-B1",
          productNameHindi: "क्रीम स्पेशल",
          productNameEnglish: "Cream Special",
          line: "Line A",
          unitsProduced: 600,
          status: "Success",
          timestamp: Date.now() - 3 * 3600000,
          targetUnits: 600
        },
        {
          batchId: "ORD-1001-B2",
          productNameHindi: "क्रीम स्पेशल",
          productNameEnglish: "Cream Special",
          line: "Line A",
          unitsProduced: 600,
          status: "Success",
          timestamp: Date.now() - 2.5 * 3600000,
          targetUnits: 600
        },
        {
          batchId: "ORD-1001-B3",
          productNameHindi: "क्रीम स्पेशल",
          productNameEnglish: "Cream Special",
          line: "Line A",
          unitsProduced: 600,
          status: "Success",
          timestamp: Date.now() - 2 * 3600000,
          targetUnits: 600
        },
        {
          batchId: "ORD-1001-B4",
          productNameHindi: "क्रीम स्पेशल",
          productNameEnglish: "Cream Special",
          line: "Line A",
          unitsProduced: 600,
          status: "Success",
          timestamp: Date.now() - 1.5 * 3600000,
          targetUnits: 600
        }
      ];

      await fetch(`${supabaseUrl}/rest/v1/batch_logs`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(initialLogs)
      });

    } catch (err) {
      // Fallback
    }
  }

  res.status(200).json({ success: true });
}
