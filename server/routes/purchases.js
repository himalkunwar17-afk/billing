// Purchases Routes
// Full purchase management: list, detail, create with stock increase, cancel with stock decrease

import express from 'express';
import db from '../db.js';
import { adToBs, getTodayAD } from '../utils/nepaliDate.js';
import { numberToWordsEnglish, numberToWordsNepali } from '../utils/numberToWords.js';

const router = express.Router();

/**
 * Generate next sequential purchase number
 * e.g. PUR-0001, PUR-0002, etc.
 */
async function generatePurchaseNo() {
  const row = await db.get(
    "SELECT invoice_no FROM purchases WHERE invoice_no LIKE 'PUR-%' ORDER BY id DESC LIMIT 1"
  );

  let nextNum = 1;
  if (row && row.invoice_no) {
    const parts = row.invoice_no.split('-');
    const num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num)) {
      nextNum = num + 1;
    }
  }

  return `PUR-${String(nextNum).padStart(4, '0')}`;
}

// GET / - List purchases with pagination, search, date range
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const { search, from, to } = req.query;

    const whereClauses = [];
    const params = [];

    if (search) {
      whereClauses.push('(LOWER(p.invoice_no) LIKE LOWER(?) OR LOWER(p.supplier_name) LIKE LOWER(?) OR LOWER(p.supplier_invoice_no) LIKE LOWER(?))');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (from) {
      whereClauses.push('p.date_ad >= ?');
      params.push(from);
    }

    if (to) {
      whereClauses.push('p.date_ad <= ?');
      params.push(to);
    }

    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const countRow = await db.get(`SELECT COUNT(*) AS total FROM purchases p ${whereSQL}`, params);
    const total = countRow.total;

    const purchases = await db.all(
      `SELECT p.*
       FROM purchases p
       ${whereSQL}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      data: purchases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// GET /:id - Get purchase with its items
router.get('/:id', async (req, res) => {
  try {
    const purchase = await db.get('SELECT * FROM purchases WHERE id = ?', [req.params.id]);

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    const items = await db.all('SELECT * FROM purchase_items WHERE purchase_id = ?', [purchase.id]);

    res.json({ ...purchase, items });
  } catch (error) {
    console.error('Error fetching purchase:', error);
    res.status(500).json({ error: 'Failed to fetch purchase' });
  }
});

// POST / - Create a new purchase
router.post('/', async (req, res) => {
  try {
    const {
      supplier_invoice_no,
      date_ad,
      supplier_id,
      supplier_name,
      supplier_pan,
      supplier_address,
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

    const invoice_no = await generatePurchaseNo();
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

    const purchaseId = await db.transaction(async (tx) => {
      const purchaseResult = await tx.run(`
        INSERT INTO purchases (
          invoice_no, supplier_invoice_no, date_ad, date_bs, supplier_id,
          supplier_name, supplier_pan, supplier_address, subtotal, discount_amount,
          taxable_amount, vat_amount, total_amount, amount_in_words,
          payment_method, payment_status, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        invoice_no,
        supplier_invoice_no || '',
        dateAd,
        dateBs,
        supplier_id || null,
        supplier_name || '',
        supplier_pan || '',
        supplier_address || '',
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

      const newPurchaseId = purchaseResult.lastInsertRowid;

      for (const item of processedItems) {
        await tx.run(`
          INSERT INTO purchase_items (
            purchase_id, product_id, product_name, hsn_code, quantity, unit,
            rate, amount, discount_pct, discount_amount, taxable_amount,
            vat_pct, vat_amount, total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          newPurchaseId, item.product_id, item.product_name, item.hsn_code,
          item.quantity, item.unit, item.rate, item.amount,
          item.discount_pct, item.discount_amount, item.taxable_amount,
          item.vat_pct, item.vat_amount, item.total,
        ]);

        if (item.product_id) {
          await tx.run(
            'UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [item.quantity, item.product_id]
          );
        }
      }

      return newPurchaseId;
    });

    const purchase = await db.get('SELECT * FROM purchases WHERE id = ?', [purchaseId]);
    const purchaseItems = await db.all('SELECT * FROM purchase_items WHERE purchase_id = ?', [purchaseId]);

    res.status(201).json({ ...purchase, items: purchaseItems });
  } catch (error) {
    console.error('Error creating purchase:', error);
    res.status(500).json({ error: 'Failed to create purchase: ' + error.message });
  }
});

// PUT /:id/cancel - Cancel a purchase and decrease stock back
router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    const purchase = await db.get('SELECT * FROM purchases WHERE id = ?', [id]);
    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    if (purchase.is_cancelled) {
      return res.status(400).json({ error: 'Purchase is already cancelled' });
    }

    await db.transaction(async (tx) => {
      await tx.run('UPDATE purchases SET is_cancelled = 1 WHERE id = ?', [id]);

      const items = await tx.all('SELECT * FROM purchase_items WHERE purchase_id = ?', [id]);
      for (const item of items) {
        if (item.product_id) {
          await tx.run(
            'UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [item.quantity, item.product_id]
          );
        }
      }
    });

    const updated = await db.get('SELECT * FROM purchases WHERE id = ?', [id]);
    const items = await db.all('SELECT * FROM purchase_items WHERE purchase_id = ?', [id]);

    res.json({ ...updated, items });
  } catch (error) {
    console.error('Error cancelling purchase:', error);
    res.status(500).json({ error: 'Failed to cancel purchase' });
  }
});

export default router;
