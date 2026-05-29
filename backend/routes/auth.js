const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../database');
const authenticateToken = require('../middleware/auth');
require('dotenv').config();

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

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Check if user already exists by email
    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error.' });
      }

      if (user) {
        return res.status(400).json({ error: 'User already exists with this email.' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      db.run(
        'INSERT INTO users (email, name, password) VALUES (?, ?, ?)',
        [email, name, hashedPassword],
        function (err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to create user.' });
          }

          res.status(201).json({
            message: 'Registration successful. Please wait for admin activation.'
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Login user
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user by email
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error.' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      if (!user.active) {
        return res.status(403).json({ error: 'Account not yet activated. Please wait for admin approval.' });
      }

      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err || !isMatch) {
          return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const token = jwt.sign(
          { id: user.id, email: user.email, name: user.name, role: user.role || 'regular' },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.json({
          message: 'Login successful.',
          token,
          user: { id: user.id, email: user.email, name: user.name, role: user.role || 'regular', isAdmin: user.role === 'admin' }
        });

        db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
        logActivity(user.id, 'LOGIN', `User logged in: ${user.email}`, req);
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Verify token (for checking if user is still logged in)
router.get('/verify', authenticateToken, (req, res) => {
  db.get('SELECT id, email, name, role FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user) {
      return res.json({
        valid: true,
        user: { id: req.user.id, email: req.user.email, name: req.user.name || '', role: req.user.role || 'regular', isAdmin: req.user.role === 'admin' }
      });
    }
    res.json({
      valid: true,
      user: { id: user.id, email: user.email, name: user.name || '', role: user.role || 'regular', isAdmin: user.role === 'admin' }
    });
  });
});

// Change password for authenticated user
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    db.get('SELECT id, email, password FROM users WHERE id = ?', [req.user.id], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error.' });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id], function (updateErr) {
        if (updateErr) {
          return res.status(500).json({ error: 'Failed to update password.' });
        }

        logActivity(user.id, 'PASSWORD_CHANGE', `User changed password: ${user.email}`, req);
        res.json({ message: 'Password updated successfully.' });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Forgot password (returns reset token in response for local/dev flow)
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  db.get('SELECT id, email FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error.' });
    }

    if (!user) {
      return res.json({ message: 'If an account exists for that email, a reset link has been generated.' });
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    db.run(
      'UPDATE users SET password_reset_token = ?, token_expires = ? WHERE id = ?',
      [resetToken, expiresAt, user.id],
      function (updateErr) {
        if (updateErr) {
          return res.status(500).json({ error: 'Failed to generate reset token.' });
        }

        logActivity(user.id, 'PASSWORD_RESET_REQUEST', `Password reset requested for ${user.email}`, req);

        res.json({
          message: 'If an account exists for that email, a reset link has been generated.',
          resetToken
        });
      }
    );
  });
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    db.get(
      'SELECT id, email, token_expires FROM users WHERE password_reset_token = ?',
      [token],
      async (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Database error.' });
        }

        if (!user) {
          return res.status(400).json({ error: 'Invalid reset token.' });
        }

        if (!user.token_expires || new Date(user.token_expires) < new Date()) {
          return res.status(400).json({ error: 'Reset token has expired.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        db.run(
          `UPDATE users
           SET password = ?, password_reset_token = NULL, token_expires = NULL
           WHERE id = ?`,
          [hashedPassword, user.id],
          function (updateErr) {
            if (updateErr) {
              return res.status(500).json({ error: 'Failed to reset password.' });
            }

            logActivity(user.id, 'PASSWORD_RESET_COMPLETE', `Password reset completed for ${user.email}`, req);
            res.json({ message: 'Password has been reset successfully.' });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;