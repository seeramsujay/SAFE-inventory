import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, authenticateToken } from './_utils.js';

// In-memory fallback cache for zero-config out-of-the-box demo
let memoryLogs: any[] = [
  { batchId: "ORD-1001-B1", productNameHindi: "क्रीम स्पेशल", productNameEnglish: "Cream Special", line: "Line A", unitsProduced: 600, status: "Success", timestamp: Date.now() - 3 * 3600000, targetUnits: 600 },
  { batchId: "ORD-1001-B2", productNameHindi: "क्रीम स्पेशल", productNameEnglish: "Cream Special", line: "Line A", unitsProduced: 600, status: "Success", timestamp: Date.now() - 2.5 * 3600000, targetUnits: 600 }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (req.method === 'GET') {
    if (supabaseUrl && supabaseKey) {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/batch_logs?select=*&order=timestamp.desc`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          return res.status(200).json(data);
        }
      } catch (err) {
        // Fallback on db error
      }
    }
    return res.status(200).json(memoryLogs);
  }

  if (req.method === 'POST') {
    const stationId = await authenticateToken(req, res);
    if (!stationId) return;

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const logs = Array.isArray(payload) ? payload : [payload];

    if (supabaseUrl && supabaseKey) {
      try {
        let processedCount = 0;
        for (const log of logs) {
          if (!log || !log.batchId) continue;

          // 1. Check if log already exists
          const checkRes = await fetch(`${supabaseUrl}/rest/v1/batch_logs?batchId=eq.${log.batchId}&select=batchId`, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          });
          if (checkRes.ok) {
            const existing = await checkRes.json();
            if (existing && existing.length > 0) {
              continue; // Skip duplicate
            }
          }

          // 2. Insert the log
          const insertRes = await fetch(`${supabaseUrl}/rest/v1/batch_logs`, {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(log)
          });

          if (!insertRes.ok) continue;
          processedCount++;

          if (log.status !== 'Success') continue;

          // 3. Process inventory deductions
          // Get product by Hindi or English name
          const prodRes = await fetch(`${supabaseUrl}/rest/v1/products?or=(englishName.eq.${encodeURIComponent(log.productNameEnglish)},name.eq.${encodeURIComponent(log.productNameHindi)})&select=*`, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          });

          if (prodRes.ok) {
            const products = await prodRes.json();
            if (products && products.length > 0) {
              const product = products[0];
              const batchSizeKg = log.unitsProduced || 600;
              const ratios = typeof product.mixtureRatios === 'string' ? JSON.parse(product.mixtureRatios) : product.mixtureRatios || [];

              // Deduct raw ingredients
              for (const ing of ratios) {
                const amountDeducted = (ing.percentage / 100) * batchSizeKg;
                
                // Get current stock
                const invRes = await fetch(`${supabaseUrl}/rest/v1/inventory?itemId=eq.${ing.ingredientId}&select=stock`, {
                  headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                  }
                });
                if (invRes.ok) {
                  const invData = await invRes.json();
                  if (invData && invData.length > 0) {
                    const currentStock = invData[0].stock || 0;
                    const newStock = Math.max(0, currentStock - amountDeducted);
                    
                    // Update stock
                    await fetch(`${supabaseUrl}/rest/v1/inventory?itemId=eq.${ing.ingredientId}`, {
                      method: 'PATCH',
                      headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ stock: newStock, lastUpdated: Date.now() })
                    });
                  }
                }
              }

              // Increment finished product stock by 1 batch
              const finishedProdId = product.id.replace('PRD-', 'FIN-');
              const finInvRes = await fetch(`${supabaseUrl}/rest/v1/inventory?itemId=eq.${finishedProdId}&select=stock`, {
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`
                }
              });
              if (finInvRes.ok) {
                const finInvData = await finInvRes.json();
                if (finInvData && finInvData.length > 0) {
                  const currentStock = finInvData[0].stock || 0;
                  await fetch(`${supabaseUrl}/rest/v1/inventory?itemId=eq.${finishedProdId}`, {
                    method: 'PATCH',
                    headers: {
                      'apikey': supabaseKey,
                      'Authorization': `Bearer ${supabaseKey}`,
                      'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ stock: currentStock + 1, lastUpdated: Date.now() })
                  });
                }
              }
            }
          }

          // 4. Update the active order's completed batch count
          const orderRes = await fetch(`${supabaseUrl}/rest/v1/orders?status=eq.ACTIVE&or=(productNameEnglish.eq.${encodeURIComponent(log.productNameEnglish)},productNameHindi.eq.${encodeURIComponent(log.productNameHindi)})&limit=1&select=*`, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          });

          if (orderRes.ok) {
            const orders = await orderRes.json();
            if (orders && orders.length > 0) {
              const activeOrder = orders[0];
              const newCompleted = activeOrder.completedBatches + 1;
              const newStatus = newCompleted >= activeOrder.totalBatchesScheduled ? 'COMPLETED' : 'ACTIVE';

              await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${activeOrder.id}`, {
                method: 'PATCH',
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ completedBatches: newCompleted, status: newStatus })
              });
            }
          }
        }
        return res.status(200).json({ success: true, processedCount });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    }

    // Default local memory database fallback
    for (const log of logs) {
      if (log && log.batchId) {
        if (!memoryLogs.some(l => l.batchId === log.batchId)) {
          memoryLogs.push(log);
        }
      }
    }
    return res.status(200).json({ success: true, processedCount: logs.length });
  }

  res.status(405).json({ error: 'Method Not Allowed' });
}
