// Settings Routes
// GET / - return settings
// PUT / - update settings

import express from 'express';
import db from '../db.js';

const router = express.Router();

// GET / - Return settings row
router.get('/', async (req, res) => {
  try {
    const settings = await db.get('SELECT * FROM settings WHERE id = 1');
    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT / - Update settings
router.put('/', async (req, res) => {
  try {
    const fields = [
      'company_name', 'company_name_np', 'address', 'phone', 'email',
      'pan_no', 'bank_name', 'bank_account', 'logo_url', 'fiscal_year',
      'invoice_prefix',
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

    const sql = `UPDATE settings SET ${updates.join(', ')} WHERE id = 1`;
    await db.run(sql, values);

    const updated = await db.get('SELECT * FROM settings WHERE id = 1');
    res.json(updated);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
