// Categories Routes
// CRUD operations for product categories

import express from 'express';
import db from '../db.js';

const router = express.Router();

// GET / - List all categories
router.get('/', async (req, res) => {
  try {
    const categories = await db.all('SELECT * FROM categories ORDER BY name ASC');
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST / - Create a new category
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const result = await db.run(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name.trim(), description || '']
    );

    const category = await db.get('SELECT * FROM categories WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /:id - Update a category
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const existing = await db.get('SELECT * FROM categories WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await db.run(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [
        name !== undefined ? name.trim() : existing.name,
        description !== undefined ? description : existing.description,
        id,
      ]
    );

    const updated = await db.get('SELECT * FROM categories WHERE id = ?', [id]);
    res.json(updated);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /:id - Delete a category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.get('SELECT * FROM categories WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if any products use this category
    const productCount = await db.get(
      'SELECT COUNT(*) AS count FROM products WHERE category_id = ?',
      [id]
    );

    if (productCount.count > 0) {
      return res.status(400).json({
        error: `Cannot delete category: ${productCount.count} product(s) are using it`,
      });
    }

    await db.run('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
