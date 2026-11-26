// Products Routes
// Full CRUD with auto-generated product codes, search, category join, soft delete, stock adjustment

import express from 'express';
import db from '../db.js';

const router = express.Router();

/**
 * Generate next product code like PRD-001, PRD-002, etc.
 */
async function generateProductCode() {
  const row = await db.get(
    "SELECT code FROM products WHERE code LIKE 'PRD-%' ORDER BY code DESC LIMIT 1"
  );

  let nextNum = 1;
  if (row && row.code) {
    const parts = row.code.split('-');
    const num = parseInt(parts[1], 10);
    if (!isNaN(num)) {
      nextNum = num + 1;
    }
  }

  return `PRD-${String(nextNum).padStart(3, '0')}`;
}

// GET / - List all products with category name, support search & category_id filter
router.get('/', async (req, res) => {
  try {
    const { search, category_id } = req.query;

    let sql = `
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
    `;
    const params = [];

    if (search) {
      sql += ` AND (LOWER(p.name) LIKE LOWER(?) OR LOWER(p.code) LIKE LOWER(?) OR LOWER(p.description) LIKE LOWER(?))`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (category_id) {
      sql += ` AND p.category_id = ?`;
      params.push(category_id);
    }

    sql += ` ORDER BY p.name ASC`;

    const products = await db.all(sql, params);
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /:id - Get one product
router.get('/:id', async (req, res) => {
  try {
    const product = await db.get(`
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST / - Create a new product with auto-generated code
router.post('/', async (req, res) => {
  try {
    const {
      name, category_id, unit, purchase_price, selling_price,
      stock_quantity, min_stock_level, is_vat_applicable, hsn_code, description,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const code = await generateProductCode();

    const result = await db.run(`
      INSERT INTO products (name, code, category_id, unit, purchase_price, selling_price,
        stock_quantity, min_stock_level, is_vat_applicable, hsn_code, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name.trim(),
      code,
      category_id || null,
      unit || 'pcs',
      purchase_price || 0,
      selling_price || 0,
      stock_quantity || 0,
      min_stock_level || 0,
      is_vat_applicable !== undefined ? is_vat_applicable : 1,
      hsn_code || '',
      description || '',
    ]);

    const product = await db.get('SELECT * FROM products WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /:id - Update a product
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const fields = [
      'name', 'category_id', 'unit', 'purchase_price', 'selling_price',
      'stock_quantity', 'min_stock_level', 'is_vat_applicable', 'hsn_code', 'description',
    ];

    const updates = [];
    const values = [];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Always set updated_at
    updates.push('updated_at = CURRENT_TIMESTAMP');

    const sql = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;
    values.push(id);

    await db.run(sql, values);

    const updated = await db.get(`
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [id]);

    res.json(updated);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /:id - Soft delete (set is_active = 0)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await db.run('UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    res.json({ message: 'Product deactivated successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// PUT /:id/stock - Manual stock adjustment
router.put('/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { stock_quantity } = req.body;

    if (stock_quantity === undefined || stock_quantity === null) {
      return res.status(400).json({ error: 'stock_quantity is required' });
    }

    const existing = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await db.run(
      'UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [stock_quantity, id]
    );

    const updated = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    res.json(updated);
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

export default router;
