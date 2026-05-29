const express = require('express');
const db = require('../database');
const authenticateToken = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();

// Get all bread types (public — anyone authenticated can browse)
router.get('/types', authenticateToken, (req, res) => {
  db.all('SELECT * FROM bread_types ORDER BY name', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error.' });
    }
    res.json(rows);
  });
});

// Create a new bread type (admin only)
router.post('/types', authenticateToken, requireAdmin, (req, res) => {
  const { sku, name, expiration_days } = req.body;

  if (!sku || !name || expiration_days === undefined) {
    return res.status(400).json({ error: 'SKU, name, and expiration_days are required.' });
  }

  db.run(
    'INSERT INTO bread_types (sku, name, expiration_days) VALUES (?, ?, ?)',
    [sku, name, expiration_days],
    function (err) {
      if (err) {
        if (err.message && err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'A bread type with that SKU already exists.' });
        }
        return res.status(500).json({ error: 'Failed to create bread type.' });
      }
      res.status(201).json({
        id: this.lastID,
        sku,
        name,
        expiration_days,
        message: 'Bread type created successfully.'
      });
    }
  );
});

// Update a bread type (admin only)
router.put('/types/:id', authenticateToken, requireAdmin, (req, res) => {
  const typeId = req.params.id;
  const { sku, name, expiration_days } = req.body;

  if (!sku || !name || expiration_days === undefined) {
    return res.status(400).json({ error: 'SKU, name, and expiration_days are required.' });
  }

  db.run(
    'UPDATE bread_types SET sku = ?, name = ?, expiration_days = ? WHERE id = ?',
    [sku, name, expiration_days, typeId],
    function (err) {
      if (err) {
        if (err.message && err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'A bread type with that SKU already exists.' });
        }
        return res.status(500).json({ error: 'Failed to update bread type.' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Bread type not found.' });
      }
      res.json({
        id: typeId,
        sku,
        name,
        expiration_days,
        message: 'Bread type updated successfully.'
      });
    }
  );
});

// Delete a bread type (admin only)
router.delete('/types/:id', authenticateToken, requireAdmin, (req, res) => {
  const typeId = req.params.id;

  db.run('DELETE FROM bread_types WHERE id = ?', [typeId], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete bread type.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Bread type not found.' });
    }
    res.json({ message: 'Bread type deleted successfully.' });
  });
});

module.exports = router;