import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, authenticateToken } from '../_utils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const stationId = await authenticateToken(req, res);
  if (!stationId) return;

  res.json({ success: true, stationId });
}
