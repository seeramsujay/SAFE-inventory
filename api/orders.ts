import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './_utils.js';

let memoryOrders: any[] = [
  { id: "ORD-1001", productKey: "PRD-001", productNameEnglish: "Cream Special", productNameHindi: "क्रीम स्पेशल", totalBatchesScheduled: 14, completedBatches: 4, status: "ACTIVE", timestamp: Date.now() - 3 * 3600000, colorHex: "#00875A" },
  { id: "ORD-1002", productKey: "PRD-002", productNameEnglish: "Premium Plus", productNameHindi: "प्रीमियम प्लस", totalBatchesScheduled: 8, completedBatches: 0, status: "PENDING", timestamp: Date.now() - 1.5 * 3600000, colorHex: "#E65100" }
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
        const response = await fetch(`${supabaseUrl}/rest/v1/orders?select=*`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          return res.status(200).json(data);
        }
      } catch (err) {}
    }
    return res.status(200).json(memoryOrders);
  }

  if (req.method === 'POST') {
    const { id, productKey, productNameEnglish, productNameHindi, totalBatchesScheduled, completedBatches, status, colorHex } = req.body;
    
    if (supabaseUrl && supabaseKey) {
      try {
        const payload = {
          id,
          productKey,
          productNameEnglish,
          productNameHindi,
          totalBatchesScheduled,
          completedBatches: completedBatches || 0,
          status: status || 'PENDING',
          timestamp: Date.now(),
          colorHex
        };

        const response = await fetch(`${supabaseUrl}/rest/v1/orders`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          return res.status(200).json({ success: true });
        } else {
          const errText = await response.text();
          return res.status(500).json({ error: errText });
        }
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    }

    // Local fallback
    const newOrder = {
      id, productKey, productNameEnglish, productNameHindi,
      totalBatchesScheduled,
      completedBatches: completedBatches || 0,
      status: status || 'PENDING',
      timestamp: Date.now(),
      colorHex
    };
    memoryOrders.push(newOrder);
    return res.status(200).json({ success: true });
  }

  if (req.method === 'PATCH') {
    const { id } = req.query;
    const { status, completedBatches } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    if (supabaseUrl && supabaseKey) {
      try {
        const updateBody: any = {};
        if (status !== undefined) updateBody.status = status;
        if (completedBatches !== undefined) updateBody.completedBatches = completedBatches;

        const response = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${id}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateBody)
        });

        if (response.ok) {
          return res.status(200).json({ success: true });
        } else {
          const errText = await response.text();
          return res.status(500).json({ error: errText });
        }
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    }

    // Local fallback
    const orderIndex = memoryOrders.findIndex(o => o.id === id);
    if (orderIndex > -1) {
      if (status !== undefined) memoryOrders[orderIndex].status = status;
      if (completedBatches !== undefined) memoryOrders[orderIndex].completedBatches = completedBatches;
      return res.status(200).json({ success: true });
    } else {
      return res.status(404).json({ error: 'Order not found' });
    }
  }

  res.status(405).json({ error: 'Method Not Allowed' });
}
