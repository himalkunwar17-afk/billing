// Sales Routes
// Full invoice management: list, detail, create with stock deduction, cancel with stock restore

import express from 'express';
import db from '../db.js';
import { adToBs, getTodayAD } from '../utils/nepaliDate.js';
import { numberToWordsEnglish, numberToWordsNepali } from '../utils/numberToWords.js';

const router = express.Router();

/**
 * Generate next sequential invoice number based on settings prefix
 * e.g. INV-0001, INV-0002, etc.
 */
async function generateInvoiceNo(prefix) {
  const pattern = `${prefix}-%`;
  const row = await db.get(
    'SELECT invoice_no FROM sales WHERE invoice_no LIKE ? ORDER BY id DESC LIMIT 1',
    [pattern]
  );

  let nextNum = 1;
  if (row && row.invoice_no) {
    const parts = row.invoice_no.split('-');
    const num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num)) {
      nextNum = num + 1;
    }
  }

  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

// GET / - List sales with pagination, search, date range
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const { search, from, to } = req.query;

    const whereClauses = [];
    const params = [];

    if (search) {
      whereClauses.push('(LOWER(s.invoice_no) LIKE LOWER(?) OR LOWER(s.customer_name) LIKE LOWER(?))');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (from) {
      whereClauses.push('s.date_ad >= ?');
      params.push(from);
    }

    if (to) {
      whereClauses.push('s.date_ad <= ?');
      params.push(to);
    }

    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countRow = await db.get(`SELECT COUNT(*) AS total FROM sales s ${whereSQL}`, params);
    const total = countRow.total;

    const sales = await db.all(
      `SELECT s.*
       FROM sales s
       ${whereSQL}
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      data: sales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// GET /:id - Get sale with its items
router.get('/:id', async (req, res) => {
  try {
    const sale = await db.get('SELECT * FROM sales WHERE id = ?', [req.params.id]);

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const items = await db.all('SELECT * FROM sale_items WHERE sale_id = ?', [sale.id]);

    res.json({ ...sale, items });
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({ error: 'Failed to fetch sale' });
  }
});

// POST / - Create a new sale
router.post('/', async (req, res) => {
  try {
    const {
      date_ad,
      customer_id,
      customer_name,
      customer_pan,
      customer_address,
      items,
      discount_amount: headerDiscount,
      payment_method,
      payment_status,
      notes,
      created_by,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    const settings = await db.get('SELECT * FROM settings WHERE id = 1');
    const prefix = (settings && settings.invoice_prefix) || 'INV';
    const invoice_no = await generateInvoiceNo(prefix);

    const dateAd = date_ad || getTodayAD();
    let dateBs;
    try {
      dateBs = adToBs(dateAd);
    } catch {
      dateBs = '';
    }

    let subtotal = 0;
    let totalVat = 0;
    let totalTaxable = 0;

    const processedItems = items.map((item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const amount = quantity * rate;
      const discountPct = parseFloat(item.discount_pct) || 0;
      const discountAmt = amount * (discountPct / 100);
      const taxableAmount = amount - discountAmt;
      const vatPct = item.vat_pct !== undefined && item.vat_pct !== null ? parseFloat(item.vat_pct) : 13;
      const vatAmount = taxableAmount * (vatPct / 100);
      const total = taxableAmount + vatAmount;

      subtotal += amount;
      totalTaxable += taxableAmount;
      totalVat += vatAmount;

      return {
        product_id: item.product_id || null,
        product_name: item.product_name || '',
        hsn_code: item.hsn_code || '',
        quantity,
        unit: item.unit || 'pcs',
        rate,
        amount: Math.round(amount * 100) / 100,
        discount_pct: discountPct,
        discount_amount: Math.round(discountAmt * 100) / 100,
        taxable_amount: Math.round(taxableAmount * 100) / 100,
        vat_pct: vatPct,
        vat_amount: Math.round(vatAmount * 100) / 100,
        total: Math.round(total * 100) / 100,
      };
    });

    const discountAmount = parseFloat(headerDiscount) || 0;
    subtotal = Math.round(subtotal * 100) / 100;
    totalTaxable = Math.round(totalTaxable * 100) / 100;
    totalVat = Math.round(totalVat * 100) / 100;
    const totalAmount = Math.round((totalTaxable + totalVat) * 100) / 100;

    const amountInWords = numberToWordsEnglish(totalAmount) + ' | ' + numberToWordsNepali(totalAmount);

    const saleId = await db.transaction(async (tx) => {
      const saleResult = await tx.run(`
        INSERT INTO sales (
          invoice_no, date_ad, date_bs, customer_id, customer_name, customer_pan,
          customer_address, subtotal, discount_amount, taxable_amount, vat_amount,
          total_amount, amount_in_words, payment_method, payment_status, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        invoice_no,
        dateAd,
        dateBs,
        customer_id || null,
        customer_name || '',
        customer_pan || '',
        customer_address || '',
        subtotal,
        discountAmount,
        totalTaxable,
        totalVat,
        totalAmount,
        amountInWords,
        payment_method || 'cash',
        payment_status || 'paid',
        notes || '',
        created_by || 'admin',
      ]);

      const newSaleId = saleResult.lastInsertRowid;

      for (const item of processedItems) {
        await tx.run(`
          INSERT INTO sale_items (
            sale_id, product_id, product_name, hsn_code, quantity, unit,
            rate, amount, discount_pct, discount_amount, taxable_amount,
            vat_pct, vat_amount, total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          newSaleId, item.product_id, item.product_name, item.hsn_code,
          item.quantity, item.unit, item.rate, item.amount,
          item.discount_pct, item.discount_amount, item.taxable_amount,
          item.vat_pct, item.vat_amount, item.total,
        ]);

        if (item.product_id) {
          await tx.run(
            'UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [item.quantity, item.product_id]
          );
        }
      }

      return newSaleId;
    });

    const sale = await db.get('SELECT * FROM sales WHERE id = ?', [saleId]);
    const saleItems = await db.all('SELECT * FROM sale_items WHERE sale_id = ?', [saleId]);

    res.status(201).json({ ...sale, items: saleItems });
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({ error: 'Failed to create sale: ' + error.message });
  }
});

// PUT /:id/cancel - Cancel a sale and restore stock
router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    const sale = await db.get('SELECT * FROM sales WHERE id = ?', [id]);
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    if (sale.is_cancelled) {
      return res.status(400).json({ error: 'Sale is already cancelled' });
    }

    await db.transaction(async (tx) => {
      await tx.run('UPDATE sales SET is_cancelled = 1 WHERE id = ?', [id]);

      const items = await tx.all('SELECT * FROM sale_items WHERE sale_id = ?', [id]);
      for (const item of items) {
        if (item.product_id) {
          await tx.run(
            'UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [item.quantity, item.product_id]
          );
        }
      }
    });

    const updated = await db.get('SELECT * FROM sales WHERE id = ?', [id]);
    const items = await db.all('SELECT * FROM sale_items WHERE sale_id = ?', [id]);

    res.json({ ...updated, items });
  } catch (error) {
    console.error('Error cancelling sale:', error);
    res.status(500).json({ error: 'Failed to cancel sale' });
  }
});

export default router;
