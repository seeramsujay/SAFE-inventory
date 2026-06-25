import type { VercelRequest, VercelResponse } from '@vercel/node';

export function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Bypass-Tunnel-Reminder, ngrok-skip-browser-warning, serveo-skip-browser-warning, X-Station-Id'
  );
}

export async function authenticateToken(req: VercelRequest, res: VercelResponse): Promise<string | null> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Missing station token. Scan pairing QR.' });
    return null;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  const masterApiKey = 'sb_publishable_XpvCTqc8gmJOxp0Rrwlyng_Sl3GEN1O';
  if (token === masterApiKey || (supabaseKey && token === supabaseKey)) {
    return (req.headers['x-station-id'] as string) || 'KIOSK-01';
  }

  if (supabaseUrl && supabaseKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/station_tokens?token=eq.${token}&select=*`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      if (response.ok) {
        const tokens = await response.json();
        if (tokens && tokens.length > 0) {
          const validToken = tokens[0];
          if (Date.now() <= Number(validToken.expiresAt)) {
            return validToken.stationId;
          } else {
            res.status(403).json({ error: 'Station token expired. Re-pair station.' });
            return null;
          }
        }
      }
    } catch (err) {
      res.status(500).json({ error: 'Authentication internal error.' });
      return null;
    }
  }

  // Fallback for demo token
  if (token === 'DASHBOARD-DEV-TOKEN') {
    return 'WEB-DASHBOARD';
  }

  res.status(403).json({ error: 'Invalid token. Unrecognized station.' });
  return null;
}
