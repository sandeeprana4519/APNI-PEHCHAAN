import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static assets from Vite build output directory
const distPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Health check endpoint for Hostinger deployment checks
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'APNI PEHCHAAN', timestamp: new Date().toISOString() });
});

// Fallback to index.html for all client-side routes (SPA support)
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>APNI PEHCHAAN</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>APNI PEHCHAAN Server is Running!</h2>
          <p>The build directory was not found. Please run <code>npm run build</code> to generate the client assets.</p>
        </body>
      </html>
    `);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`APNI PEHCHAAN server running on port ${PORT}`);
});

