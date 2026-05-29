const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const rawPath = process.env.DB_PATH || './database.sqlite';
// If the path is already absolute (e.g. /data/database.sqlite), use it directly.
// Otherwise, resolve relative to this file's directory.
const dbPath = path.isAbsolute(rawPath)
  ? rawPath
  : path.resolve(__dirname, rawPath);

// Ensure the parent directory exists
const dbDir = path.dirname(dbPath);
const fs = require('fs');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Initialize database tables
db.exec(`
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
  );

  CREATE TABLE IF NOT EXISTS user_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    activity_type TEXT NOT NULL,
    description TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS bread_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    expiration_days INTEGER NOT NULL
  );
`);

// Run migrations for existing DB (ignore errors if columns already exist)
const migrations = [
  `ALTER TABLE users ADD COLUMN name TEXT DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'regular'`,
];
for (const sql of migrations) {
  try { db.exec(sql); } catch (e) { /* column already exists */ }
}

// Seed bread types (clear and re-insert)
db.exec('DELETE FROM bread_types');

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

const insertBread = db.prepare('INSERT INTO bread_types (sku, name, expiration_days) VALUES (?, ?, ?)');
for (const [sku, name, days] of newBreadTypes) {
  insertBread.run(sku, name, days);
}

// Ensure admin user exists
const adminEmail = 'boykekp@yahoo.com';
const defaultPassword = 'admin123';

const existingAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);

if (!existingAdmin) {
  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
  db.prepare('INSERT INTO users (email, password, role, active) VALUES (?, ?, ?, ?)')
    .run(adminEmail, hashedPassword, 'admin', 1);
  console.log(`Admin user created: ${adminEmail} with default password: ${defaultPassword}`);
} else {
  console.log(`Admin user already exists: ${adminEmail}`);
}

module.exports = db;