const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

// Provide fallback JWT_SECRET if not set in environment (avoids undefined-var crashes)
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('WARNING: JWT_SECRET not set in environment. Using a random secret (sessions will be invalid on restart).');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (used by Railway to verify the app is running)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Load routes — wrapped in try/catch so startup failures are clearly logged
let authRoutes, breadRoutes, userRoutes;
try {
  authRoutes = require('./routes/auth');
  breadRoutes = require('./routes/bread');
  userRoutes = require('./routes/users');
} catch (err) {
  console.error('FATAL: Failed to load route modules:', err.message);
  process.exit(1);
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bread', breadRoutes);
app.use('/api/users', userRoutes);

// Serve frontend pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

module.exports = app;