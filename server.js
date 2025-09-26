import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 5000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Handle SPA routing - Firebase rewrites all routes to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`PrestigePages server running on http://0.0.0.0:${port}`);
  console.log(`Serving static files from: ${path.join(__dirname, 'public')}`);
});