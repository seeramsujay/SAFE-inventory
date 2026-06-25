import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './_utils.js';

let memoryInventory: any[] = [
  { itemId: "ING-001", name: "Wheat Flour", stock: 12500, unit: "kg", lastUpdated: Date.now() },
  { itemId: "ING-002", name: "Refined Sugar", stock: 5400, unit: "kg", lastUpdated: Date.now() },
  { itemId: "ING-003", name: "Vegetable Fats", stock: 3200, unit: "kg", lastUpdated: Date.now() },
  { itemId: "ING-004", name: "Cream Flavoring", stock: 650, unit: "kg", lastUpdated: Date.now() },
  { itemId: "ING-005", name: "Premium Additive", stock: 450, unit: "kg", lastUpdated: Date.now() },
  { itemId: "FIN-001", name: "Cream Special", stock: 4, unit: "batches", lastUpdated: Date.now() },
  { itemId: "FIN-002", name: "Premium Plus", stock: 2, unit: "batches", lastUpdated: Date.now() },
  { itemId: "FIN-003", name: "Standard Blend", stock: 0, unit: "batches", lastUpdated: Date.now() }
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
        const response = await fetch(`${supabaseUrl}/rest/v1/inventory?select=*`, {
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
    return res.status(200).json(memoryInventory);
  }

  if (req.method === 'POST') {
    const { action } = req.query;
    const { itemId, stock } = req.body;

    if (action === 'adjust' || req.url?.includes('/adjust')) {
      if (!itemId || stock === undefined) {
        return res.status(400).json({ error: 'itemId and stock are required' });
      }

      if (supabaseUrl && supabaseKey) {
        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/inventory?itemId=eq.${itemId}`, {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ stock, lastUpdated: Date.now() })
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
      const itemIndex = memoryInventory.findIndex(i => i.itemId === itemId);
      if (itemIndex > -1) {
        memoryInventory[itemIndex].stock = stock;
        memoryInventory[itemIndex].lastUpdated = Date.now();
        return res.status(200).json({ success: true });
      } else {
        return res.status(404).json({ error: 'Inventory item not found' });
      }
    }

    // Default POST (insert new item if needed, though mostly adjustments are done)
    if (supabaseUrl && supabaseKey) {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/inventory`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({ itemId, stock, lastUpdated: Date.now() })
        });
        if (response.ok) {
          return res.status(200).json({ success: true });
        }
      } catch (err) {}
    }
  }

  res.status(405).json({ error: 'Method Not Allowed' });
}
