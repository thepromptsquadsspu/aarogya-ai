import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import { registerRoutes } from './routes.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5173'] }));
app.use(express.json({ limit: '2mb' }));

// Init database
initDb();

// Register routes
registerRoutes(app);

// Global error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Aarogya AI backend running on http://localhost:${PORT}`);
});
