// Dashboard Routes
// Aggregated stats: today/month sales & purchases, VAT summary, low stock, recent sales

import express from 'express';
import db from '../db.js';
import { getTodayAD } from '../utils/nepaliDate.js';

const router = express.Router();

// GET / - Return dashboard statistics
router.get('/', async (req, res) => {
  try {
    const todayStr = getTodayAD(); // YYYY-MM-DD local date
    const yearMonth = todayStr.substring(0, 7); // YYYY-MM
    const monthStart = yearMonth + '-01';
    const monthEnd = yearMonth + '-31'; // safe upper bound for BETWEEN

    const [
      todaySalesRow,
      monthSalesRow,
      todayPurchasesRow,
      monthPurchasesRow,
      vatCollectedRow,
      vatPaidRow,
      totalProductsRow,
      totalCustomersRow,
      lowStockProducts,
      recentSales,
    ] = await Promise.all([
      db.get(`
        SELECT COALESCE(SUM(total_amount), 0) AS total
        FROM sales
        WHERE date_ad = ? AND is_cancelled = 0
      `, [todayStr]),
      db.get(`
        SELECT COALESCE(SUM(total_amount), 0) AS total
        FROM sales
        WHERE date_ad BETWEEN ? AND ? AND is_cancelled = 0
      `, [monthStart, monthEnd]),
      db.get(`
        SELECT COALESCE(SUM(total_amount), 0) AS total
        FROM purchases
        WHERE date_ad = ? AND is_cancelled = 0
      `, [todayStr]),
      db.get(`
        SELECT COALESCE(SUM(total_amount), 0) AS total
        FROM purchases
        WHERE date_ad BETWEEN ? AND ? AND is_cancelled = 0
      `, [monthStart, monthEnd]),
      db.get(`
        SELECT COALESCE(SUM(vat_amount), 0) AS total
        FROM sales
        WHERE date_ad BETWEEN ? AND ? AND is_cancelled = 0
      `, [monthStart, monthEnd]),
      db.get(`
        SELECT COALESCE(SUM(vat_amount), 0) AS total
        FROM purchases
        WHERE date_ad BETWEEN ? AND ? AND is_cancelled = 0
      `, [monthStart, monthEnd]),
      db.get('SELECT COUNT(*) AS count FROM products WHERE is_active = 1'),
      db.get('SELECT COUNT(*) AS count FROM customers'),
      db.all(`
        SELECT id, name, code, stock_quantity, min_stock_level, unit
        FROM products
        WHERE stock_quantity <= min_stock_level AND is_active = 1
        ORDER BY stock_quantity ASC
      `),
      db.all(`
        SELECT id, invoice_no, date_ad, date_bs, customer_name, total_amount,
               payment_method, payment_status, is_cancelled
        FROM sales
        ORDER BY created_at DESC
        LIMIT 10
      `),
    ]);

    const vatCollected = vatCollectedRow.total;
    const vatPaid = vatPaidRow.total;
    const netVat = Math.round((vatCollected - vatPaid) * 100) / 100;

    res.json({
      todaySales: todaySalesRow.total,
      monthSales: monthSalesRow.total,
      todayPurchases: todayPurchasesRow.total,
      monthPurchases: monthPurchasesRow.total,
      vatCollected,
      vatPaid,
      netVat,
      totalProducts: totalProductsRow.count,
      totalCustomers: totalCustomersRow.count,
      lowStockProducts,
      recentSales,
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
