const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const authenticateToken = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();

function logActivity(userId, activityType, description, req) {
  const ipAddress = req.ip || req.connection?.remoteAddress || null;
  const userAgent = req.get('user-agent') || null;

  db.prepare(
    `INSERT INTO user_activity (user_id, activity_type, description, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?)`
  ).run(userId, activityType, description, ipAddress, userAgent);
}

router.use(authenticateToken, requireAdmin);

// Get all users
router.get('/', (req, res) => {
  const users = db.prepare(
    `SELECT id, email, name, role, active, last_login, created_at
     FROM users
     ORDER BY created_at DESC`
  ).all();
  res.json(users);
});

// Create user
router.post('/', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (user) {
      return res.status(400).json({ error: 'User already exists with this email.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = db.prepare(
      'INSERT INTO users (email, name, password) VALUES (?, ?, ?)'
    ).run(email, name, hashedPassword);

    logActivity(req.user.id, 'USER_CREATE', `Created user ${email}`, req);

    res.status(201).json({
      message: 'User created successfully.',
      user: { id: result.lastInsertRowid, email, name }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Update user password
router.put('/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    db.prepare(
      'UPDATE users SET password = ?, password_reset_token = NULL, token_expires = NULL WHERE id = ?'
    ).run(hashedPassword, id);

    logActivity(req.user.id, 'PASSWORD_UPDATE', `Updated password for user ${user.email}`, req);
    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Activate user (admin only)
router.put('/:id/activate', (req, res) => {
  const { id } = req.params;
  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  db.prepare('UPDATE users SET active = 1 WHERE id = ?').run(id);
  logActivity(req.user.id, 'USER_ACTIVATE', `Activated user ${user.email}`, req);
  res.json({ message: 'User activated successfully.' });
});

// Deactivate user (admin only, cannot deactivate self)
router.put('/:id/deactivate', (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot deactivate yourself.' });
  }
  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(id);
  logActivity(req.user.id, 'USER_DEACTIVATE', `Deactivated user ${user.email}`, req);
  res.json({ message: 'User deactivated successfully.' });
});

// Promote user to admin (admin only)
router.put('/:id/promote', (req, res) => {
  const { id } = req.params;
  const user = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (user.role === 'admin') return res.status(400).json({ error: 'User is already an admin.' });
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', id);
  logActivity(req.user.id, 'USER_PROMOTE', `Promoted user ${user.email} to admin`, req);
  res.json({ message: 'User promoted to admin successfully.' });
});

// Demote user to regular (admin cannot demote self)
router.put('/:id/demote', (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot demote yourself.' });
  }
  const user = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (user.role !== 'admin') return res.status(400).json({ error: 'User is not an admin.' });
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run('regular', id);
  logActivity(req.user.id, 'USER_DEMOTE', `Demoted user ${user.email} to regular`, req);
  res.json({ message: 'User demoted to regular successfully.' });
});

// Delete user (admin cannot delete self)
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself.' });
  }

  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id);

  logActivity(req.user.id, 'USER_DELETE', `Deleted user ${user.email}`, req);
  res.json({ message: 'User deleted successfully.' });
});

// Admin view of activity logs
router.get('/activity/logs', (req, res) => {
  const logs = db.prepare(
    `SELECT
       ua.id,
       ua.activity_type,
       ua.description,
       ua.ip_address,
       ua.user_agent,
       ua.created_at,
       u.email AS actor_email
     FROM user_activity ua
     JOIN users u ON ua.user_id = u.id
     ORDER BY ua.created_at DESC
     LIMIT 200`
  ).all();
  res.json(logs);
});

module.exports = router;