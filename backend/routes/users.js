const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const authenticateToken = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();

function logActivity(userId, activityType, description, req) {
  const ipAddress = req.ip || req.connection?.remoteAddress || null;
  const userAgent = req.get('user-agent') || null;

  db.run(
    `INSERT INTO user_activity (user_id, activity_type, description, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, activityType, description, ipAddress, userAgent]
  );
}

router.use(authenticateToken, requireAdmin);

// Get all users
router.get('/', (req, res) => {
  db.all(
    `SELECT id, email, name, role, active, last_login, created_at
     FROM users
     ORDER BY created_at DESC`,
    [],
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: 'Database error.' });
      }
      res.json(users);
    }
  );
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

    db.get('SELECT id FROM users WHERE email = ?', [email], async (lookupErr, user) => {
      if (lookupErr) {
        return res.status(500).json({ error: 'Database error.' });
      }

      if (user) {
        return res.status(400).json({ error: 'User already exists with this email.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      db.run(
        'INSERT INTO users (email, name, password) VALUES (?, ?, ?)',
        [email, name, hashedPassword],
        function (insertErr) {
          if (insertErr) {
            return res.status(500).json({ error: 'Failed to create user.' });
          }

          logActivity(req.user.id, 'USER_CREATE', `Created user ${email}`, req);

          res.status(201).json({
            message: 'User created successfully.',
            user: { id: this.lastID, email, name }
          });
        }
      );
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

    db.get('SELECT id, email FROM users WHERE id = ?', [id], async (lookupErr, user) => {
      if (lookupErr) {
        return res.status(500).json({ error: 'Database error.' });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      db.run(
        'UPDATE users SET password = ?, password_reset_token = NULL, token_expires = NULL WHERE id = ?',
        [hashedPassword, id],
        function (updateErr) {
          if (updateErr) {
            return res.status(500).json({ error: 'Failed to update password.' });
          }

          logActivity(req.user.id, 'PASSWORD_UPDATE', `Updated password for user ${user.email}`, req);
          res.json({ message: 'Password updated successfully.' });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Activate user (admin only)
router.put('/:id/activate', (req, res) => {
  const { id } = req.params;
  db.get('SELECT id, email FROM users WHERE id = ?', [id], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    db.run('UPDATE users SET active = 1 WHERE id = ?', [id], function (updateErr) {
      if (updateErr) return res.status(500).json({ error: 'Failed to activate user.' });
      logActivity(req.user.id, 'USER_ACTIVATE', `Activated user ${user.email}`, req);
      res.json({ message: 'User activated successfully.' });
    });
  });
});

// Deactivate user (admin only, cannot deactivate self)
router.put('/:id/deactivate', (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot deactivate yourself.' });
  }
  db.get('SELECT id, email FROM users WHERE id = ?', [id], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    db.run('UPDATE users SET active = 0 WHERE id = ?', [id], function (updateErr) {
      if (updateErr) return res.status(500).json({ error: 'Failed to deactivate user.' });
      logActivity(req.user.id, 'USER_DEACTIVATE', `Deactivated user ${user.email}`, req);
      res.json({ message: 'User deactivated successfully.' });
    });
  });
});

// Promote user to admin (admin only)
router.put('/:id/promote', (req, res) => {
  const { id } = req.params;
  db.get('SELECT id, email, role FROM users WHERE id = ?', [id], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.role === 'admin') return res.status(400).json({ error: 'User is already an admin.' });
    db.run('UPDATE users SET role = ? WHERE id = ?', ['admin', id], function (updateErr) {
      if (updateErr) return res.status(500).json({ error: 'Failed to promote user.' });
      logActivity(req.user.id, 'USER_PROMOTE', `Promoted user ${user.email} to admin`, req);
      res.json({ message: 'User promoted to admin successfully.' });
    });
  });
});

// Demote user to regular (admin cannot demote self)
router.put('/:id/demote', (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot demote yourself.' });
  }
  db.get('SELECT id, email, role FROM users WHERE id = ?', [id], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.role !== 'admin') return res.status(400).json({ error: 'User is not an admin.' });
    db.run('UPDATE users SET role = ? WHERE id = ?', ['regular', id], function (updateErr) {
      if (updateErr) return res.status(500).json({ error: 'Failed to demote user.' });
      logActivity(req.user.id, 'USER_DEMOTE', `Demoted user ${user.email} to regular`, req);
      res.json({ message: 'User demoted to regular successfully.' });
    });
  });
});

// Delete user (admin cannot delete self)
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself.' });
  }

  db.get('SELECT id, email FROM users WHERE id = ?', [id], (lookupErr, user) => {
    if (lookupErr) {
      return res.status(500).json({ error: 'Database error.' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    db.run('DELETE FROM users WHERE id = ?', [id], function (deleteErr) {
      if (deleteErr) {
        return res.status(500).json({ error: 'Failed to delete user.' });
      }

      logActivity(req.user.id, 'USER_DELETE', `Deleted user ${user.email}`, req);
      res.json({ message: 'User deleted successfully.' });
    });
  });
});

// Admin view of activity logs
router.get('/activity/logs', (req, res) => {
  db.all(
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
     LIMIT 200`,
    [],
    (err, logs) => {
      if (err) {
        return res.status(500).json({ error: 'Database error.' });
      }
      res.json(logs);
    }
  );
});

module.exports = router;