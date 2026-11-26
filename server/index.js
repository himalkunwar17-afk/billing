// Main Express Server Entry Point
import './env.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, isPostgres } from './db.js';

// Route imports
import settingsRoutes from './routes/settings.js';
import categoriesRoutes from './routes/categories.js';
import productsRoutes from './routes/products.js';
import customersRoutes from './routes/customers.js';
import suppliersRoutes from './routes/suppliers.js';
import salesRoutes from './routes/sales.js';
import purchasesRoutes from './routes/purchases.js';
import dashboardRoutes from './routes/dashboard.js';
import { adToBs, convertAdToBs, convertBsToAd, getTodayNepaliDate } from './utils/nepaliDate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/settings', settingsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Date conversion endpoints (compatible with existing /api/convert-date and npdates.org API spec)
app.get('/api/convert-date', (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    const bsDate = adToBs(date);
    res.json({ ad: date, bs: bsDate });
  } catch (error) {
    res.status(400).json({ error: 'Invalid date: ' + error.message });
  }
});

app.get('/api/convert/ad-to-bs', (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10);
    const day = parseInt(req.query.day, 10);
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
      return res.status(400).json({ error: 'Valid year, month, and day query parameters are required' });
    }
    res.json(convertAdToBs(year, month, day));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/convert/bs-to-ad', (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10);
    const day = parseInt(req.query.day, 10);
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
      return res.status(400).json({ error: 'Valid year, month, and day query parameters are required' });
    }
    res.json(convertBsToAd(year, month, day));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/today', (req, res) => {
  res.json(getTodayNepaliDate());
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start server after database initialization
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🇳🇵 Nepal VAT Billing Server running on http://localhost:${PORT} [${process.env.NODE_ENV || 'development'} | ${isPostgres ? 'Neon PostgreSQL' : 'SQLite'}]`);
      console.log(`   नेपाल भ्याट बिलिङ सर्भर चालु भयो\n`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
