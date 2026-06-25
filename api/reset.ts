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
      // Clear batch logs
      await fetch(`${supabaseUrl}/rest/v1/batch_logs?select=*`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });

      // Reset orders
      await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.ORD-1001`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ completedBatches: 0, status: 'ACTIVE' })
      });

      await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.ORD-1002`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ completedBatches: 0, status: 'PENDING' })
      });
      
      // Update inventory finished goods to initial state if needed
      await fetch(`${supabaseUrl}/rest/v1/inventory?itemId=eq.FIN-001`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stock: 4, lastUpdated: Date.now() })
      });
      await fetch(`${supabaseUrl}/rest/v1/inventory?itemId=eq.FIN-002`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stock: 2, lastUpdated: Date.now() })
      });
      await fetch(`${supabaseUrl}/rest/v1/inventory?itemId=eq.FIN-003`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stock: 0, lastUpdated: Date.now() })
      });

    } catch (err) {}
  }

  res.status(200).json({ success: true });
}
