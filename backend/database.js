const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const dbPath = process.env.DB_PATH
    ? path.resolve(__dirname, process.env.DB_PATH)
    : path.join(__dirname, './database.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  // Users table with enhanced fields
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT DEFAULT '',
      active INTEGER DEFAULT 0,
      role TEXT DEFAULT 'regular',
      password TEXT NOT NULL,
      password_reset_token TEXT,
      token_expires DATETIME,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add 'name' column if it doesn't exist (migration for existing DB)
  db.run(`ALTER TABLE users ADD COLUMN name TEXT DEFAULT ''`, (err) => {});
  // Add 'active' column if it doesn't exist (migration for existing DB)
  db.run(`ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 0`, (err) => {});
  // Add 'role' column if it doesn't exist (migration for existing DB)
  db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'regular'`, (err) => {});

  // User activity logs table
  db.run(`
    CREATE TABLE IF NOT EXISTS user_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      activity_type TEXT NOT NULL,
      description TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Bread types reference table
  db.run(`
    CREATE TABLE IF NOT EXISTS bread_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      expiration_days INTEGER NOT NULL
    )
  `);

  // Clear existing bread_types and re-seed (clean slate)
  db.run('DELETE FROM bread_types');

  // Insert new bread types from PDF
  const newBreadTypes = [
    ['30010', 'Donut', 5],
    ['26382', 'Organic Whole Wheat', 6],
    ['38917', 'Strawberry Sheetcake', 5],
    ['43424', 'Ciabatta', 3],
    ['73267', 'Baguette', 3],
    ['67873', 'Half Moon Cake', 7],
    ['38473', 'French Brioche', 14],
    ['90843', 'Kringle', 4]
  ];

  const stmt = db.prepare(`
    INSERT INTO bread_types (sku, name, expiration_days) VALUES (?, ?, ?)
  `);

  newBreadTypes.forEach(([sku, name, days]) => {
    stmt.run(sku, name, days);
  });

  stmt.finalize();

  // Ensure admin user exists (boykekp@yahoo.com)
  const adminEmail = 'boykekp@yahoo.com';
  const defaultPassword = 'admin123'; // Should be changed on first login
  
  db.get('SELECT * FROM users WHERE email = ?', [adminEmail], (err, user) => {
    if (err) {
      console.error('Error checking admin user:', err);
      return;
    }
    
    if (!user) {
      // Hash the default password
      const bcrypt = require('bcryptjs');
      bcrypt.hash(defaultPassword, 10, (err, hashedPassword) => {
        if (err) {
          console.error('Error hashing admin password:', err);
          return;
        }
        
        db.run(
          'INSERT INTO users (email, password, role, active) VALUES (?, ?, ?, ?)',
          [adminEmail, hashedPassword, 'admin', 1],
          function (err) {
            if (err) {
              console.error('Error creating admin user:', err);
            } else {
              console.log(`Admin user created: ${adminEmail} with default password: ${defaultPassword}`);
            }
          }
        );
      });
    } else {
      console.log(`Admin user already exists: ${adminEmail}`);
    }
  });
});

module.exports = db;