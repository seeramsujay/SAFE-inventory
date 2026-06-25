import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from '../_utils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { stationId } = req.body;
  if (!stationId) {
    return res.status(400).json({ error: 'stationId is required' });
  }

  const token = 'TOKEN-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  const expiresAt = Date.now() + 90 * 24 * 60 * 60 * 1000; // 90 days

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const payload = {
        token,
        stationId,
        issuedAt: Date.now(),
        expiresAt
      };

      const response = await fetch(`${supabaseUrl}/rest/v1/station_tokens`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        return res.json({ token, stationId, expiresAt });
      } else {
        const errText = await response.text();
        return res.status(500).json({ error: errText });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Fallback
  return res.json({ token, stationId, expiresAt });
}
