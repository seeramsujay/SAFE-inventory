import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const LOGS_FILE = path.resolve(__dirname, 'api_logs.json');

function readLogs() {
  if (!fs.existsSync(LOGS_FILE)) {
    const initialLogs = [
      { batchId: "ORD-1001", productNameHindi: "क्रीम स्पेशल", productNameEnglish: "Cream Special", line: "Line A", unitsProduced: 5000, status: "Success", timestamp: Date.now() - 3 * 3600000, targetUnits: 5000 },
      { batchId: "ORD-1002", productNameHindi: "प्रीमियम प्लस", productNameEnglish: "Premium Plus", line: "Line B", unitsProduced: 2500, status: "Success", timestamp: Date.now() - 1.5 * 3600000, targetUnits: 2500 }
    ];
    fs.writeFileSync(LOGS_FILE, JSON.stringify(initialLogs, null, 2), 'utf-8');
    return initialLogs;
  }
  try {
    return JSON.parse(fs.readFileSync(LOGS_FILE, 'utf-8'));
  } catch (e) {
    return [];
  }
}

function writeLogs(logs) {
  fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf-8');
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-server',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/logs') {
            if (req.method === 'GET') {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(readLogs()));
              return;
            }
            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', () => {
                try {
                  const newLog = JSON.parse(body);
                  const logs = readLogs();
                  if (!logs.some(l => l.batchId === newLog.batchId)) {
                    logs.push(newLog);
                    writeLogs(logs);
                  }
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true }));
                } catch (e) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
              });
              return;
            }
          }
          if (req.url === '/api/reset' && req.method === 'POST') {
            writeLogs([]);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
            return;
          }
          if (req.url === '/api/reseed' && req.method === 'POST') {
            const initialLogs = [
              { batchId: "ORD-1001", productNameHindi: "क्रीम स्पेशल", productNameEnglish: "Cream Special", line: "Line A", unitsProduced: 5000, status: "Success", timestamp: Date.now() - 3 * 3600000, targetUnits: 5000 },
              { batchId: "ORD-1002", productNameHindi: "प्रीमियम प्लस", productNameEnglish: "Premium Plus", line: "Line B", unitsProduced: 2500, status: "Success", timestamp: Date.now() - 1.5 * 3600000, targetUnits: 2500 }
            ];
            writeLogs(initialLogs);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
            return;
          }
          next();
        });
      }
    }
  ],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 3000,
    host: true,
  }
});
