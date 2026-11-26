// Customers Routes
// CRUD operations with search support

import express from 'express';
import db from '../db.js';

const router = express.Router();

// GET / - List all customers with optional search
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;

    let sql = 'SELECT * FROM customers';
    const params = [];

    if (search) {
      sql += ' WHERE LOWER(name) LIKE LOWER(?) OR LOWER(phone) LIKE LOWER(?) OR LOWER(pan_no) LIKE LOWER(?) OR LOWER(address) LIKE LOWER(?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY name ASC';

    const customers = await db.all(sql, params);
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET /:id - Get a single customer
router.get('/:id', async (req, res) => {
  try {
    const customer = await db.get('SELECT * FROM customers WHERE id = ?', [req.params.id]);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// POST / - Create a new customer
router.post('/', async (req, res) => {
  try {
    const { name, address, phone, email, pan_no, is_vat_registered, balance } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Customer name is required' });
    }

    const result = await db.run(`
      INSERT INTO customers (name, address, phone, email, pan_no, is_vat_registered, balance)
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

    const customer = await db.get('SELECT * FROM customers WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(customer);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// PUT /:id - Update a customer
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.get('SELECT * FROM customers WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' });
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

    const sql = `UPDATE customers SET ${updates.join(', ')} WHERE id = ?`;
    values.push(id);

    await db.run(sql, values);

    const updated = await db.get('SELECT * FROM customers WHERE id = ?', [id]);
    res.json(updated);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// DELETE /:id - Delete a customer
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.get('SELECT * FROM customers WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check if customer has any sales
    const salesCount = await db.get(
      'SELECT COUNT(*) AS count FROM sales WHERE customer_id = ?',
      [id]
    );

    if (salesCount.count > 0) {
      return res.status(400).json({
        error: `Cannot delete customer: ${salesCount.count} sale(s) are linked to this customer`,
      });
    }

    await db.run('DELETE FROM customers WHERE id = ?', [id]);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

export default router;
