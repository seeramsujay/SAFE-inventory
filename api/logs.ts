import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory fallback cache for zero-config out-of-the-box demo
let memoryLogs: any[] = [
  { batchId: "ORD-1001", productNameHindi: "क्रीम स्पेशल", productNameEnglish: "Cream Special", line: "Line A", unitsProduced: 5000, status: "Success", timestamp: Date.now() - 3 * 3600000, targetUnits: 5000 },
  { batchId: "ORD-1002", productNameHindi: "प्रीमियम प्लस", productNameEnglish: "Premium Plus", line: "Line B", unitsProduced: 2500, status: "Success", timestamp: Date.now() - 1.5 * 3600000, targetUnits: 2500 }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers to allow direct sync requests from the Android app
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

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
    const newLog = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (supabaseUrl && supabaseKey) {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/batch_logs`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(newLog)
        });
        if (response.ok) {
          return res.status(200).json({ success: true });
        }
      } catch (err) {
        // Fallback on db error
      }
    }

    // Default local memory database fallback
    if (newLog && newLog.batchId) {
      if (!memoryLogs.some(l => l.batchId === newLog.batchId)) {
        memoryLogs.push(newLog);
      }
    }
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method Not Allowed' });
}
