// Suppliers Routes
// CRUD operations with search support (same pattern as customers)

import express from 'express';
import db from '../db.js';

const router = express.Router();

// GET / - List all suppliers with optional search
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;

    let sql = 'SELECT * FROM suppliers';
    const params = [];

    if (search) {
      sql += ' WHERE LOWER(name) LIKE LOWER(?) OR LOWER(phone) LIKE LOWER(?) OR LOWER(pan_no) LIKE LOWER(?) OR LOWER(address) LIKE LOWER(?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY name ASC';

    const suppliers = await db.all(sql, params);
    res.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// GET /:id - Get a single supplier
router.get('/:id', async (req, res) => {
  try {
    const supplier = await db.get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json(supplier);
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ error: 'Failed to fetch supplier' });
  }
});

// POST / - Create a new supplier
router.post('/', async (req, res) => {
  try {
    const { name, address, phone, email, pan_no, is_vat_registered, balance } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Supplier name is required' });
    }

    const result = await db.run(`
      INSERT INTO suppliers (name, address, phone, email, pan_no, is_vat_registered, balance)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      name.trim(),
      address || '',
      phone || '',
      email || '',
      pan_no || '',
      is_vat_registered || 0,
      balance || 0,
    ]);

    const supplier = await db.get('SELECT * FROM suppliers WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(supplier);
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

// PUT /:id - Update a supplier
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.get('SELECT * FROM suppliers WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const fields = ['name', 'address', 'phone', 'email', 'pan_no', 'is_vat_registered', 'balance'];
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

    const sql = `UPDATE suppliers SET ${updates.join(', ')} WHERE id = ?`;
    values.push(id);

    await db.run(sql, values);

    const updated = await db.get('SELECT * FROM suppliers WHERE id = ?', [id]);
    res.json(updated);
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

// DELETE /:id - Delete a supplier
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.get('SELECT * FROM suppliers WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Check if supplier has any purchases
    const purchaseCount = await db.get(
      'SELECT COUNT(*) AS count FROM purchases WHERE supplier_id = ?',
      [id]
    );

    if (purchaseCount.count > 0) {
      return res.status(400).json({
        error: `Cannot delete supplier: ${purchaseCount.count} purchase(s) are linked to this supplier`,
      });
    }

    await db.run('DELETE FROM suppliers WHERE id = ?', [id]);
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

export default router;
