import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './_utils.js';

let memoryProducts: any[] = [
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
        const response = await fetch(`${supabaseUrl}/rest/v1/products?select=*`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          // Map to match frontend format if necessary
          const mapped = data.map((p: any) => ({
            ...p,
            mixtureRatios: typeof p.mixtureRatios === 'string' ? JSON.parse(p.mixtureRatios) : p.mixtureRatios || []
          }));
          return res.status(200).json(mapped);
        }
      } catch (err) {
        // Fallback
      }
    }
    return res.status(200).json(memoryProducts);
  }

  if (req.method === 'POST') {
    const { id, name, englishName, targetUph, colorHex, isActive, manualFileName, nominalBatchDurationSec, mixtureRatios } = req.body;
    
    if (supabaseUrl && supabaseKey) {
      try {
        const payload = {
          id,
          name,
          englishName,
          targetUph: targetUph || 1200,
          colorHex: colorHex || '#00875A',
          isActive: isActive !== false,
          manualFileName,
          nominalBatchDurationSec: nominalBatchDurationSec || 480,
          mixtureRatios: mixtureRatios || []
        };

        const response = await fetch(`${supabaseUrl}/rest/v1/products`, {
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
    const existingIndex = memoryProducts.findIndex(p => p.id === id);
    const newProd = {
      id, name, englishName,
      targetUph: targetUph || 1200,
      colorHex: colorHex || '#00875A',
      isActive: isActive !== false,
      manualFileName,
      nominalBatchDurationSec: nominalBatchDurationSec || 480,
      mixtureRatios: mixtureRatios || []
    };

    if (existingIndex > -1) {
      memoryProducts[existingIndex] = newProd;
    } else {
      memoryProducts.push(newProd);
    }
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method Not Allowed' });
}
